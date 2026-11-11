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
    if (!apiKey || apiKey === 'dummy_key') {
      return NextResponse.json({
        updated: 0,
        error: 'Suggestions unavailable right now',
        message: 'GEMINI_API_KEY is not configured or invalid',
      });
    }

    // Check optional body flags (e.g. force: true)
    let force = false;
    try {
      const body = await request.json();
      if (body && body.force === true) {
        force = true;
      }
    } catch {
      // Body may be empty
    }

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

    // 2. Fetch bookmarks that need suggestions
    // Prioritize bookmarks with status 'to_sort'
    let bookmarksQuery = supabase
      .from('bookmarks')
      .select('id, tweet_id, text, author_handle')
      .eq('user_id', user.id);

    if (!force) {
      bookmarksQuery = bookmarksQuery.is('suggested_category_id', null);
    }

    let { data: bookmarksData, error: bookError } = await bookmarksQuery
      .eq('status', 'to_sort')
      .limit(25);

    // Fallback: if no 'to_sort' bookmarks found, look for bookmarks without an assigned category
    if (!bookmarksData || bookmarksData.length === 0) {
      let unassignedQuery = supabase
        .from('bookmarks')
        .select('id, tweet_id, text, author_handle')
        .eq('user_id', user.id)
        .is('category_id', null);

      if (!force) {
        unassignedQuery = unassignedQuery.is('suggested_category_id', null);
      }

      const { data: unassignedData } = await unassignedQuery.limit(25);
      if (unassignedData && unassignedData.length > 0) {
        bookmarksData = unassignedData;
      }
    }

    if (bookError) {
      console.error('[Suggest] Error fetching unsuggested bookmarks:', bookError);
      return NextResponse.json({ updated: 0, error: 'Database query failed' });
    }

    const bookmarks = (bookmarksData as Bookmark[]) || [];
    if (bookmarks.length === 0) {
      return NextResponse.json({
        updated: 0,
        message: 'All bookmarks already have suggestions or are sorted',
      });
    }

    // 3. Prepare the Gemini prompt with categories and tweets
    const categoryDescriptions = categories
      .map((c) => `- "${c.name}": ${c.description || 'General topic'}`)
      .join('\n');

    const tweetList = bookmarks.map((b) => ({
      tweet_id: b.tweet_id,
      author: b.author_handle,
      text: (b.text || '').slice(0, 500),
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

    // 4. Initialize Gemini with resilient fallback
    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = [
      process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
    ];

    let result: any = null;
    let usedModel = '';
    let lastError: any = null;

    for (const modelCandidate of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelCandidate,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        result = await model.generateContent([
          systemPrompt,
          `Categorize these tweets:\n${JSON.stringify(tweetList, null, 2)}`,
        ]);
        usedModel = modelCandidate;
        break;
      } catch (err: any) {
        console.warn(`[Suggest] Gemini model ${modelCandidate} failed (${err?.status || err?.message}). Trying fallback...`);
        lastError = err;
      }
    }

    if (!result) {
      console.error('[Suggest] All Gemini candidate models failed:', lastError);
      return NextResponse.json({
        updated: 0,
        error: 'Suggestions unavailable right now',
        message: lastError?.message || 'Gemini API call failed',
      });
    }

    const responseText = result.response.text();
    let suggestions: Array<{
      tweet_id: string;
      category_name: string;
      confidence: number;
      reason: string;
    }> = [];

    try {
      const cleaned = responseText.replace(/```json\s*|\s*```/g, '').trim();
      suggestions = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[Suggest] Failed to parse Gemini response as JSON:', responseText);
      return NextResponse.json({ updated: 0, error: 'Suggestions unavailable right now' });
    }

    if (!Array.isArray(suggestions)) {
      return NextResponse.json({ updated: 0, error: 'Suggestions format invalid' });
    }

    // 5. Map suggestions to category IDs and update bookmarks in database
    let updatedCount = 0;
    for (const sug of suggestions) {
      const catName = String(sug.category_name || '').toLowerCase().trim();
      const matchedCategoryId = categoryMap.get(catName);

      if (!matchedCategoryId) {
        continue;
      }

      const conf = typeof sug.confidence === 'number' ? Math.min(Math.max(sug.confidence, 0), 1) : 0.8;
      const reason = String(sug.reason || '').trim().slice(0, 300);

      const { error: updateError } = await supabase
        .from('bookmarks')
        .update({
          suggested_category_id: matchedCategoryId,
          suggestion_confidence: conf,
          suggestion_reason: reason,
        })
        .eq('user_id', user.id)
        .eq('tweet_id', String(sug.tweet_id));

      if (!updateError) {
        updatedCount++;
      }
    }

    return NextResponse.json({
      updated: updatedCount,
      model_used: usedModel,
      total_in_batch: bookmarks.length,
    });
  } catch (error: unknown) {
    console.error('[Suggest] Route unexpected error:', error);
    return NextResponse.json({
      updated: 0,
      error: 'Suggestions unavailable right now',
    });
  }
}
