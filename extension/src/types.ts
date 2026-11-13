/**
 * Shelf Extension Data Models
 */

export interface TweetMediaItem {
  type: 'image' | 'video' | 'gif';
  url: string;
  preview_url?: string;
  alt_text?: string;
}

export interface TweetLinkItem {
  url: string;
  expanded_url: string;
  display_url: string;
  title?: string;
  description?: string;
  thumbnail_url?: string;
  domain?: string;
}

export interface ExtractedTweet {
  tweet_id: string;
  tweet_url: string;
  author_name: string;
  author_handle: string;
  author_avatar_url: string | null;
  text: string;
  posted_at: string | null;
  media: TweetMediaItem[];
  links: TweetLinkItem[];
  is_thread: boolean;
}

export interface StoredSettings {
  appUrl: string;
  apiToken: string;
  autoSyncOnOpen: boolean;
}

