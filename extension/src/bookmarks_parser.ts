import type { ExtractedTweet } from './extractor';

export interface ParsedBookmarksPage {
  tweets: ExtractedTweet[];
  bottomCursor: string | null;
  topCursor?: string | null;
}

/**
 * Parses Twitter/X GraphQL Bookmarks API response into normalized ExtractedTweet records.
 * Robustly inspects data.bookmark_timeline_v2.timeline.instructions (and fallbacks).
 */
export function parseBookmarksApiResponse(data: any): ParsedBookmarksPage {
  const tweets: ExtractedTweet[] = [];
  let bottomCursor: string | null = null;
  let topCursor: string | null = null;

  if (!data || typeof data !== 'object') {
    return { tweets, bottomCursor };
  }

  // 1. Locate timeline instructions
  let instructions: any[] = [];
  const rootTimeline =
    data?.data?.bookmark_timeline_v2?.timeline ||
    data?.data?.bookmark_timeline?.timeline ||
    data?.data?.user?.result?.timeline?.timeline ||
    data?.data?.timeline?.timeline;

  if (Array.isArray(rootTimeline?.instructions)) {
    instructions = rootTimeline.instructions;
  } else if (Array.isArray(data?.data?.instructions)) {
    instructions = data.data.instructions;
  } else if (Array.isArray(data?.instructions)) {
    instructions = data.instructions;
  }

  // 2. Iterate through all instructions
  for (const instr of instructions) {
    if (!instr || typeof instr !== 'object') continue;

    // Direct cursor in instruction (e.g. TimelineTerminateTimeline)
    if (
      instr.direction === 'Bottom' ||
      instr.cursorType === 'Bottom' ||
      instr.entryType === 'TimelineTimelineCursor'
    ) {
      if (instr.value) bottomCursor = instr.value;
    }

    // Extract entries list
    let entries: any[] = [];
    if (Array.isArray(instr.entries)) {
      entries = instr.entries;
    } else if (instr.entry && typeof instr.entry === 'object') {
      entries = [instr.entry];
    }

    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue;
      const entryId = String(entry.entryId || '');

      // Check for bottom cursor
      const cursorType =
        entry.content?.cursorType || entry.content?.cursorContent?.cursorType;
      const cursorVal =
        entry.content?.value || entry.content?.cursorContent?.value;

      if (
        entryId.startsWith('cursor-bottom') ||
        cursorType === 'Bottom' ||
        cursorType === 'bottom'
      ) {
        if (cursorVal) {
          bottomCursor = cursorVal;
        }
        continue;
      }

      if (
        entryId.startsWith('cursor-top') ||
        cursorType === 'Top' ||
        cursorType === 'top'
      ) {
        if (cursorVal) {
          topCursor = cursorVal;
        }
        continue;
      }

      // Check for tweet item
      // Structure: content.itemContent.tweet_results.result
      const itemContent = entry.content?.itemContent;
      const rawResult = itemContent?.tweet_results?.result;
      if (!rawResult) continue;

      // Handle "TweetWithVisibilityResults" wrapper
      let tweetObj = rawResult;
      if (
        (rawResult.__typename === 'TweetWithVisibilityResults' ||
          rawResult.__typename === 'TweetWithVisibility') &&
        rawResult.tweet
      ) {
        tweetObj = rawResult.tweet;
      }

      // Skip tombstones, unavailable, or deleted tweets without crashing
      const typename = String(tweetObj.__typename || '');
      if (
        typename === 'TweetTombstone' ||
        typename === 'TweetUnavailable' ||
        !tweetObj.legacy
      ) {
        continue;
      }

      const tweetId = String(
        tweetObj.rest_id || tweetObj.id_str || tweetObj.legacy?.id_str || ''
      ).trim();
      if (!tweetId) continue;

      // Author extraction
      const userResult =
        tweetObj.core?.user_results?.result ||
        tweetObj.core?.user_result?.result;
      const legacyUser = userResult?.legacy || {};
      const coreUser = userResult?.core || {};

      const authorName = String(
        legacyUser.name || coreUser.name || userResult?.name || 'Unknown'
      ).trim();

      const authorHandle = String(
        legacyUser.screen_name ||
          coreUser.screen_name ||
          userResult?.screen_name ||
          ''
      )
        .replace(/^@/, '')
        .trim();

      const authorAvatar =
        legacyUser.profile_image_url_https ||
        userResult?.avatar_image_url ||
        undefined;

      // Full text extraction: prefer note_tweet for long-form posts
      const noteTweetText =
        tweetObj.note_tweet?.note_tweet_results?.result?.text;
      const fullText = String(
        noteTweetText ||
          tweetObj.legacy?.full_text ||
          tweetObj.legacy?.text ||
          ''
      ).trim();

      // Created at timestamp
      let postedAt: string | undefined = undefined;
      if (tweetObj.legacy?.created_at) {
        try {
          const d = new Date(tweetObj.legacy.created_at);
          postedAt = isNaN(d.getTime())
            ? tweetObj.legacy.created_at
            : d.toISOString();
        } catch {
          postedAt = tweetObj.legacy.created_at;
        }
      }

      // Media extraction
      const mediaList: {
        type: 'image' | 'video';
        url: string;
        alt_text?: string;
      }[] = [];
      const rawMedia =
        tweetObj.legacy?.extended_entities?.media ||
        tweetObj.legacy?.entities?.media ||
        [];

      if (Array.isArray(rawMedia)) {
        for (const m of rawMedia) {
          if (!m) continue;
          if (m.type === 'photo') {
            const url = m.media_url_https || m.media_url;
            if (url) {
              mediaList.push({
                type: 'image',
                url,
                alt_text: m.ext_alt_text || undefined,
              });
            }
          } else if (m.type === 'video' || m.type === 'animated_gif') {
            // Find highest bitrate MP4 variant
            const variants = Array.isArray(m.video_info?.variants)
              ? m.video_info.variants
              : [];
            const mp4s = variants
              .filter((v: any) => v && v.content_type === 'video/mp4' && v.url)
              .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

            const videoUrl =
              mp4s[0]?.url || m.media_url_https || m.media_url;
            if (videoUrl) {
              mediaList.push({
                type: 'video',
                url: videoUrl,
                alt_text: m.ext_alt_text || undefined,
              });
            }
          }
        }
      }

      // Links extraction
      const linksList: {
        url: string;
        expanded_url: string;
        display_url: string;
      }[] = [];
      const rawUrls = tweetObj.legacy?.entities?.urls || [];
      if (Array.isArray(rawUrls)) {
        for (const u of rawUrls) {
          if (u && u.url) {
            linksList.push({
              url: u.url,
              expanded_url: u.expanded_url || u.url,
              display_url: u.display_url || u.url,
            });
          }
        }
      }

      // Thread detection
      const isThread = Boolean(
        tweetObj.legacy?.in_reply_to_status_id_str ||
          tweetObj.legacy?.in_reply_to_user_id_str
      );

      const tweetUrl = authorHandle
        ? `https://x.com/${authorHandle}/status/${tweetId}`
        : `https://x.com/i/web/status/${tweetId}`;

      tweets.push({
        tweet_id: tweetId,
        tweet_url: tweetUrl,
        author_name: authorName,
        author_handle: authorHandle,
        author_avatar_url: authorAvatar,
        text: fullText,
        posted_at: postedAt,
        media: mediaList,
        links: linksList,
        is_thread: isThread,
      });
    }
  }

  return { tweets, bottomCursor, topCursor };
}

