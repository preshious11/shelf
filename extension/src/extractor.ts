import { SELECTORS, querySelectorFirst, querySelectorAllFirst } from './selectors';

export interface ExtractedTweet {
  tweet_id: string;
  tweet_url: string;
  author_name: string;
  author_handle: string;
  author_avatar_url: string | null;
  text: string;
  posted_at: string | null;
  media: Array<{
    type: 'image' | 'video' | 'gif';
    url: string;
    alt_text?: string;
  }>;
  links: Array<{
    url: string;
    expanded_url: string;
    display_url: string;
    title?: string;
    description?: string;
    thumbnail_url?: string;
    domain?: string;
  }>;
  is_thread: boolean;
}

export function extractTweetFromElement(tweetEl: Element): ExtractedTweet | null {
  try {
    let tweetId = '';
    let tweetUrl = '';

    // Primary: Find status link via time tag's parent anchor
    const timeEl = querySelectorFirst(tweetEl, SELECTORS.timeTag);
    if (timeEl) {
      const parentLink = timeEl.closest('a');
      if (parentLink) {
        const href = parentLink.getAttribute('href') || '';
        const match = href.match(/\/status\/(\d+)/);
        if (match && match[1]) {
          tweetId = match[1];
          tweetUrl = href.startsWith('http') ? href : `https://x.com${href}`;
        }
      }
    }

    // Fallback: search all links in the tweet container
    if (!tweetId) {
      const statusLinks = querySelectorAllFirst<HTMLAnchorElement>(tweetEl, SELECTORS.statusLink);
      for (const link of statusLinks) {
        const href = link.getAttribute('href') || '';
        const match = href.match(/\/status\/(\d+)/);
        if (match && match[1]) {
          tweetId = match[1];
          tweetUrl = href.startsWith('http') ? href : `https://x.com${href}`;
          break;
        }
      }
    }

    if (!tweetId) {
      return null;
    }

    // 2. Extract author name and handle from User-Name container
    let authorName = '';
    let authorHandle = '';
    const userNameEl = querySelectorFirst(tweetEl, SELECTORS.userNameContainer);

    if (userNameEl) {
      const fullText = (userNameEl as HTMLElement).innerText || '';
      const lines = fullText.split('\n').map((s) => s.trim()).filter(Boolean);

      if (lines.length > 0) {
        authorName = lines[0];
      }

      for (const line of lines) {
        if (line.startsWith('@')) {
          authorHandle = line.replace(/^@/, '');
          break;
        }
      }
    }

    // 3. Extract author avatar
    let authorAvatarUrl: string | null = null;
    const avatarImg = querySelectorFirst<HTMLImageElement>(tweetEl, SELECTORS.avatarImage);
    if (avatarImg && avatarImg.src) {
      authorAvatarUrl = avatarImg.src;
    }

    // 4. Extract tweet text
    let text = '';
    const textEl = querySelectorFirst(tweetEl, SELECTORS.tweetText);
    if (textEl) {
      text = (textEl as HTMLElement).innerText || '';
    }

    // 5. Extract posted_at timestamp
    let postedAt: string | null = null;
    const postedTimeEl = querySelectorFirst(tweetEl, SELECTORS.timeTag);
    if (postedTimeEl) {
      const dt = postedTimeEl.getAttribute('datetime');
      if (dt) {
        postedAt = dt;
      }
    }

    // 6. Extract media (photos & videos)
    const media: ExtractedTweet['media'] = [];
    const photoImgs = querySelectorAllFirst<HTMLImageElement>(tweetEl, SELECTORS.tweetPhoto);
    photoImgs.forEach((img) => {
      if (img.src && !img.src.includes('emoji') && !img.src.includes('profile_images')) {
        media.push({
          type: 'image',
          url: img.src,
          alt_text: img.alt || undefined,
        });
      }
    });

    const videos = querySelectorAllFirst<HTMLVideoElement>(tweetEl, SELECTORS.tweetVideo);
    videos.forEach((video) => {
      const src = video.currentSrc || video.src || video.poster;
      if (src) {
        media.push({
          type: 'video',
          url: src,
        });
      }
    });

    // 7. Extract links
    const links: ExtractedTweet['links'] = [];
    if (textEl) {
      const anchorTags = textEl.querySelectorAll('a');
      anchorTags.forEach((a) => {
        const href = a.getAttribute('href');
        if (href && (href.startsWith('http') || href.includes('t.co'))) {
          links.push({
            url: href,
            expanded_url: href,
            display_url: a.innerText || href,
          });
        }
      });
    }

    // 8. Detect if reply or thread
    let isThread = false;
    const contextEl = querySelectorFirst(tweetEl, SELECTORS.socialContext);
    if (contextEl && contextEl.textContent?.toLowerCase().includes('replying to')) {
      isThread = true;
    }

    return {
      tweet_id: tweetId,
      tweet_url: tweetUrl,
      author_name: authorName,
      author_handle: authorHandle,
      author_avatar_url: authorAvatarUrl,
      text,
      posted_at: postedAt,
      media,
      links,
      is_thread: isThread,
    };
  } catch (err) {
    console.error('[shelf] Error extracting tweet element:', err);
    return null;
  }
}

