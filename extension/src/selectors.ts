/**
 * Centralized DOM Selectors for X (Twitter)
 *
 * All selectors live in this single file so when X alters their markup,
 * only this file needs adjustment. data-testid attributes are strongly preferred.
 */

export const SELECTORS = {
  // Main timeline container
  timeline: [
    'div[data-testid="primaryColumn"] section',
    'main[role="main"] section',
    'div[aria-label="Timeline: Bookmarks"]',
  ],

  // Tweet card container
  tweet: [
    'article[data-testid="tweet"]',
    'article[role="article"]',
  ],

  // Tweet content text
  tweetText: [
    'div[data-testid="tweetText"]',
    'div[lang]',
  ],

  // Author information block
  userNameContainer: [
    'div[data-testid="User-Name"]',
  ],

  // User avatar container & image
  avatarImage: [
    'div[data-testid="Tweet-User-Avatar"] img',
    'img[src*="profile_images"]',
  ],

  // Status / timestamp link containing the tweet ID (/status/123456789)
  statusLink: [
    'a[href*="/status/"]',
  ],

  // Posted timestamp tag
  timeTag: [
    'time',
  ],

  // Media attachments (photos / videos / gifs)
  tweetPhoto: [
    'div[data-testid="tweetPhoto"] img',
  ],
  tweetVideo: [
    'div[data-testid="videoPlayer"] video',
    'div[data-testid="videoComponent"] video',
  ],

  // Embedded card previews (links / articles)
  cardWrapper: [
    'div[data-testid="card.wrapper"]',
    'div[data-testid="card.layoutLarge.media"]',
  ],

  // Social context (e.g. "Replying to @...", "Pinned Tweet")
  socialContext: [
    'span[data-testid="socialContext"]',
  ],
};

/**
 * Helper to query element trying selectors in order
 */
export function querySelectorFirst<T extends Element = HTMLElement>(
  parent: Element | Document,
  selectorList: string[]
): T | null {
  for (const selector of selectorList) {
    const el = parent.querySelector<T>(selector);
    if (el) return el;
  }
  return null;
}

/**
 * Helper to query all elements matching the first working selector
 */
export function querySelectorAllFirst<T extends Element = HTMLElement>(
  parent: Element | Document,
  selectorList: string[]
): T[] {
  for (const selector of selectorList) {
    const els = parent.querySelectorAll<T>(selector);
    if (els.length > 0) return Array.from(els);
  }
  return [];
}

