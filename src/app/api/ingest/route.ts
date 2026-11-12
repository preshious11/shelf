import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function verifyApiToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid Authorization header. Expected Bearer <token>', status: 401 };
  }

  const rawToken = authHeader.replace('Bearer ', '').trim();
  if (!rawToken) {
    return { error: 'API token cannot be empty', status: 401 };
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const supabase = createAdminClient();

  // Database-backed rate limiting
  try {
    const { data: rateLimitResult } = await supabase.rpc(
      'check_token_rate_limit',
      {
        p_token_hash: tokenHash,
        p_max_requests: 120,
      }
    );

    if (rateLimitResult && (rateLimitResult as any).allowed === false) {
      return { error: 'Rate limit exceeded. Please wait a moment.', status: 429 };
    }
  } catch (rateErr) {
    console.warn('[Ingest] Rate limit check fallback:', rateErr);
  }

  const { data: tokenRecord, error: tokenError } = await supabase
    .from('api_tokens')
    .select('id, user_id, name')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (tokenError) {
    console.error('[Ingest] Database error verifying API token:', tokenError);
    return {
      error: `Database error verifying API token: ${tokenError.message}. Check SUPABASE_SERVICE_ROLE_KEY in .env.`,
      status: 500,
    };
  }

  if (!tokenRecord) {
    return { error: 'Invalid or revoked API token', status: 401 };
  }

  const userId = (tokenRecord as any).user_id as string;

  // Update last_used_at non-blockingly
  supabase
    .from('api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', (tokenRecord as any).id)
    .then();

  return { userId, supabase };
}

// GET /api/ingest: Fetch all known tweet_ids already saved for this user
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyApiToken(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId, supabase } = auth;

    const { data: existingRows, error } = await supabase
      .from('bookmarks')
      .select('tweet_id')
      .eq('user_id', userId);

    if (error) {
      console.error('[Ingest GET] Error fetching existing tweet IDs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const existingIds = (existingRows || []).map((r: any) => String(r.tweet_id));

    return NextResponse.json({
      success: true,
      count: existingIds.length,
      existing_ids: existingIds,
    });
  } catch (err: unknown) {
    console.error('[Ingest GET] Unexpected error:', err);
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/ingest: Auto-remove bookmark from Shelf when unbookmarked on X
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyApiToken(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId, supabase } = auth;

    // Check tweet_id from query params or request body
    const { searchParams } = new URL(request.url);
    let tweetId = searchParams.get('tweet_id') || searchParams.get('id');

    if (!tweetId) {
      try {
        const body = await request.json();
        tweetId = body?.tweet_id || body?.id;
      } catch {
        // Body may not be JSON
      }
    }

    if (!tweetId) {
      return NextResponse.json(
        { error: 'Missing tweet_id parameter' },
        { status: 400 }
      );
    }

    const { error, count } = await supabase
      .from('bookmarks')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .eq('tweet_id', String(tweetId).trim());

    if (error) {
      console.error('[Ingest DELETE] Failed to delete bookmark:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[Ingest DELETE] Removed tweet ${tweetId} from Shelf (rows affected: ${count})`);
    return NextResponse.json({
      success: true,
      deleted_tweet_id: String(tweetId),
      count: count || 0,
    });
  } catch (err: unknown) {
    console.error('[Ingest DELETE] Unexpected error:', err);
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/ingest: Ingest batch of new bookmarks
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyApiToken(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId, supabase } = auth;

    // Parse and validate bookmark payload
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

    // Query existing bookmarks for this user to avoid re-sorting or duplicate rows
    const { data: existingBookmarks } = await supabase
      .from('bookmarks')
      .select('tweet_id')
      .eq('user_id', userId)
      .in('tweet_id', tweetIds);

    const existingIdSet = new Set(((existingBookmarks as any[]) || []).map((b) => String(b.tweet_id)));

    const newRowsToInsert = validItems.filter((item) => !existingIdSet.has(item.tweet_id));
    const skipped = validItems.length - newRowsToInsert.length;

    let added = 0;
    if (newRowsToInsert.length > 0) {
      // Upsert on unique constraint (user_id, tweet_id) with ignoreDuplicates to guarantee no duplicates or race conditions
      const { data: inserted, error: insertError } = await supabase
        .from('bookmarks')
        .upsert(newRowsToInsert, {
          onConflict: 'user_id,tweet_id',
          ignoreDuplicates: true,
        })
        .select('id');

      if (insertError) {
        console.error('[Ingest POST] Error inserting bookmarks:', insertError);
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
    console.error('[Ingest POST] Ingest error:', error);
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
