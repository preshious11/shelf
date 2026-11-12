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
        preview_url?: string;
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
                preview_url: url,
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
            const thumbUrl = m.media_url_https || m.media_url;
            if (videoUrl) {
              mediaList.push({
                type: 'video',
                url: videoUrl,
                preview_url: thumbUrl,
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
        title?: string;
        description?: string;
        thumbnail_url?: string;
        domain?: string;
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

      // Card / Link thumbnail extraction from X's card object (summary, summary_large_image, player, promo)
      let cardThumbnailUrl: string | undefined = undefined;
      let cardTitle: string | undefined = undefined;
      let cardDescription: string | undefined = undefined;
      let cardDomain: string | undefined = undefined;
      let cardUrl: string | undefined = undefined;

      const rawCard = tweetObj.card || tweetObj.unified_card;
      if (rawCard) {
        const bindingValues =
          rawCard.legacy?.binding_values ||
          rawCard.binding_values ||
          [];

        const bindingsMap: Record<string, any> = {};
        if (Array.isArray(bindingValues)) {
          for (const bv of bindingValues) {
            if (bv && bv.key) {
              bindingsMap[bv.key] = bv.value;
            }
          }
        } else if (typeof bindingValues === 'object') {
          Object.assign(bindingsMap, bindingValues);
        }

        const imgKeys = [
          'photo_image_full_size_large',
          'thumbnail_image_original',
          'thumbnail_image',
          'thumbnail_image_large',
          'card_image',
          'summary_photo_image',
          'player_image_large',
          'promo_image',
        ];

        for (const k of imgKeys) {
          const val = bindingsMap[k];
          const imgUrl =
            val?.image_value?.url ||
            val?.string_value ||
            (typeof val === 'string' && val.startsWith('http') ? val : undefined);
          if (imgUrl) {
            cardThumbnailUrl = imgUrl;
            break;
          }
        }

        if (bindingsMap.title?.string_value) {
          cardTitle = bindingsMap.title.string_value;
        }
        if (bindingsMap.description?.string_value) {
          cardDescription = bindingsMap.description.string_value;
        }
        if (bindingsMap.domain?.string_value) {
          cardDomain = bindingsMap.domain.string_value;
        } else if (bindingsMap.vanity_url?.string_value) {
          cardDomain = bindingsMap.vanity_url.string_value;
        }
        if (bindingsMap.card_url?.string_value) {
          cardUrl = bindingsMap.card_url.string_value;
        }
      }

      // If card has an image and mediaList is empty, add it to mediaList so it immediately renders
      if (cardThumbnailUrl && mediaList.length === 0) {
        mediaList.push({
          type: 'image',
          url: cardThumbnailUrl,
          preview_url: cardThumbnailUrl,
          alt_text: cardTitle || 'Link preview',
        });
      }

      // Attach card metadata to linksList[0]
      if (linksList.length > 0) {
        if (cardThumbnailUrl) linksList[0].thumbnail_url = cardThumbnailUrl;
        if (cardTitle) linksList[0].title = cardTitle;
        if (cardDescription) linksList[0].description = cardDescription;
        if (cardDomain) linksList[0].domain = cardDomain;
      } else if (cardUrl || cardThumbnailUrl) {
        linksList.push({
          url: cardUrl || '',
          expanded_url: cardUrl || '',
          display_url: cardDomain || 'link',
          title: cardTitle,
          description: cardDescription,
          thumbnail_url: cardThumbnailUrl,
          domain: cardDomain,
        });
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

