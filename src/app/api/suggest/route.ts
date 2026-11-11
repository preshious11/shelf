import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import type { Category, Bookmark } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        updated: 0,
        error: 'Suggestions unavailable right now',
        message: 'GEMINI_API_KEY is not configured',
      });
    }

    // Read model name from GEMINI_MODEL env var, defaulting to gemini-2.5-flash
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    // 1. Fetch user's categories
    const { data: categoriesData, error: catError } = await supabase
      .from('categories')
      .select('id, name, description')
      .eq('user_id', user.id);

    if (catError || !categoriesData || categoriesData.length === 0) {
      return NextResponse.json({
        updated: 0,
        error: 'Suggestions unavailable right now',
        message: 'No categories available for suggestions',
      });
    }

    const categories: Category[] = categoriesData as Category[];
    const categoryMap = new Map<string, string>(); // lowercase name -> category id
    categories.forEach((c) => categoryMap.set(c.name.toLowerCase().trim(), c.id));

    // 2. Fetch up to 20 bookmarks that are unsorted and don't yet have an AI suggestion
    const { data: bookmarksData, error: bookError } = await supabase
      .from('bookmarks')
      .select('id, tweet_id, text, author_handle')
      .eq('user_id', user.id)
      .eq('status', 'to_sort')
      .is('suggested_category_id', null)
      .limit(20);

    if (bookError) {
      console.error('Error fetching unsuggested bookmarks:', bookError);
      return NextResponse.json({ updated: 0, error: 'Suggestions unavailable right now' });
    }

    const bookmarks = (bookmarksData as Bookmark[]) || [];
    if (bookmarks.length === 0) {
      return NextResponse.json({ updated: 0, message: 'All bookmarks already have suggestions or are sorted' });
    }

    // 3. Prepare the Gemini prompt with categories and tweets
    const categoryDescriptions = categories
      .map((c) => `- "${c.name}": ${c.description || 'General topic'}`)
      .join('\n');

    const tweetList = bookmarks.map((b) => ({
      tweet_id: b.tweet_id,
      author: b.author_handle,
      text: b.text.slice(0, 500),
    }));

    const systemPrompt = `You are an expert librarian categorizing saved tweets for a personal library.
You are given a list of available categories with descriptions, and a list of tweets.
Your job is to recommend the single most fitting category for each tweet.

Available Categories:
${categoryDescriptions}

Rules:
1. Recommend ONLY category names from the list above. If unsure, pick the closest one or "Other".
2. Set "confidence" between 0.0 and 1.0 (e.g. 0.95 for clear matches, 0.50 for ambiguous).
3. "reason" MUST be a single short sentence explaining why this category fits.
4. Output STRICT JSON only. An array of objects matching this exact schema:
[
  {
    "tweet_id": "string",
    "category_name": "string",
    "confidence": number,
    "reason": "string"
  }
]`;

    // 4. Initialize Gemini with specified model
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const result = await model.generateContent([
      systemPrompt,
      `Categorize these tweets:\n${JSON.stringify(tweetList, null, 2)}`,
    ]);

    const responseText = result.response.text();
    let suggestions: Array<{
      tweet_id: string;
      category_name: string;
      confidence: number;
      reason: string;
    }> = [];

    try {
      suggestions = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse Gemini response as JSON:', responseText);
      return NextResponse.json({ updated: 0, error: 'Suggestions unavailable right now' });
    }

    if (!Array.isArray(suggestions)) {
      return NextResponse.json({ updated: 0, error: 'Suggestions unavailable right now' });
    }

    // 5. Map suggestions to category IDs and update bookmarks in database
    let updatedCount = 0;
    for (const sug of suggestions) {
      const catName = String(sug.category_name || '').toLowerCase().trim();
      const matchedCategoryId = categoryMap.get(catName);

      if (!matchedCategoryId) {
        continue;
      }

      const conf = typeof sug.confidence === 'number' ? Math.min(Math.max(sug.confidence, 0), 1) : 0.7;
      const reason = String(sug.reason || '').trim().slice(0, 300);

      const { error: updateError } = await supabase
        .from('bookmarks')
        .update({
          suggested_category_id: matchedCategoryId,
          suggestion_confidence: conf,
          suggestion_reason: reason,
        })
        .eq('user_id', user.id)
        .eq('tweet_id', String(sug.tweet_id))
        .eq('status', 'to_sort');

      if (!updateError) {
        updatedCount++;
      }
    }

    // Count remaining unsuggested
    const { count: remainingCount } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'to_sort')
      .is('suggested_category_id', null);

    return NextResponse.json({
      updated: updatedCount,
      remaining: remainingCount || 0,
      total_in_batch: bookmarks.length,
    });
  } catch (error: unknown) {
    console.error('Suggest route error:', error);
    // Return quiet failure notice
    return NextResponse.json({
      updated: 0,
      error: 'Suggestions unavailable right now',
    }, { status: 200 });
  }
}
