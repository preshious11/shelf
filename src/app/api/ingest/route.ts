import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    // 1. Validate Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header. Expected Bearer <token>' },
        { status: 401 }
      );
    }

    const rawToken = authHeader.replace('Bearer ', '').trim();
    if (!rawToken) {
      return NextResponse.json(
        { error: 'API token cannot be empty' },
        { status: 401 }
      );
    }

    // 2. Hash token and verify against api_tokens table
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const supabase = createAdminClient();

    // 3. Database-backed rate limiting check stored in Supabase
    try {
      const { data: rateLimitResult } = await supabase.rpc(
        'check_token_rate_limit',
        {
          p_token_hash: tokenHash,
          p_max_requests: 60,
        }
      );

      if (rateLimitResult && (rateLimitResult as any).allowed === false) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Maximum 60 requests per minute.' },
          { status: 429 }
        );
      }
    } catch (rateErr) {
      console.warn('Rate limit check fallback:', rateErr);
      // If RPC is temporarily unavailable, continue with token auth
    }

    // 4. Verify token existence and ownership
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('api_tokens')
      .select('id, user_id, name')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (tokenError || !tokenRecord) {
      return NextResponse.json(
        { error: 'Invalid or revoked API token' },
        { status: 401 }
      );
    }

    const userId = (tokenRecord as any).user_id;

    // Update last_used_at non-blockingly
    supabase
      .from('api_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', (tokenRecord as any).id)
      .then();

    // 5. Parse and validate bookmark payload
    const body = await request.json();
    const rawBookmarks: unknown[] = Array.isArray(body)
      ? body
      : Array.isArray(body.bookmarks)
      ? body.bookmarks
      : [];

    if (rawBookmarks.length === 0) {
      return NextResponse.json({ added: 0, skipped: 0, message: 'No bookmarks in payload' });
    }

    // Extract tweet IDs to check for existing records
    const tweetIds: string[] = [];
    const validItems: any[] = [];

    for (const item of rawBookmarks as any[]) {
      const tweetId = String(item.tweet_id || item.id || '').trim();
      if (!tweetId) continue;

      tweetIds.push(tweetId);
      validItems.push({
        user_id: userId,
        tweet_id: tweetId,
        tweet_url: item.tweet_url || item.url || `https://x.com/i/web/status/${tweetId}`,
        author_name: String(item.author_name || item.author || 'Unknown').trim(),
        author_handle: String(item.author_handle || item.handle || '').replace(/^@/, '').trim(),
        author_avatar_url: item.author_avatar_url || item.avatar || null,
        text: String(item.text || item.full_text || '').trim(),
        posted_at: item.posted_at || null,
        saved_at: item.saved_at || new Date().toISOString(),
        media: Array.isArray(item.media) ? item.media : [],
        links: Array.isArray(item.links) ? item.links : [],
        is_thread: Boolean(item.is_thread),
        status: 'to_sort', // New bookmarks land in 'to_sort'
      });
    }

    if (validItems.length === 0) {
      return NextResponse.json({ added: 0, skipped: 0, message: 'No valid tweets with IDs found' });
    }

    // 6. Query existing bookmarks for this user to avoid re-sorting or re-adding
    const { data: existingBookmarks } = await supabase
      .from('bookmarks')
      .select('tweet_id')
      .eq('user_id', userId)
      .in('tweet_id', tweetIds);

    const existingIdSet = new Set(((existingBookmarks as any[]) || []).map((b) => b.tweet_id));

    const newRowsToInsert = validItems.filter((item) => !existingIdSet.has(item.tweet_id));
    const skipped = validItems.length - newRowsToInsert.length;

    let added = 0;
    if (newRowsToInsert.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('bookmarks')
        .insert(newRowsToInsert)
        .select('id');

      if (insertError) {
        console.error('Error inserting bookmarks:', insertError);
        return NextResponse.json(
          { error: 'Database insert failed: ' + insertError.message },
          { status: 500 }
        );
      }

      added = inserted ? (inserted as any[]).length : newRowsToInsert.length;
    }

    return NextResponse.json({
      added,
      skipped,
      total_in_batch: validItems.length,
    });
  } catch (error: unknown) {
    console.error('Ingest error:', error);
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
