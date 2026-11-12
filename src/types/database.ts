export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BookmarkStatus = 'to_sort' | 'sorted';

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  position: number;
  created_at: string;
}

export interface TweetMedia {
  type: 'image' | 'video' | 'gif';
  url: string;
  preview_url?: string;
  alt_text?: string;
}

export interface TweetLink {
  url: string;
  expanded_url: string;
  display_url: string;
  title?: string;
  description?: string;
  thumbnail_url?: string;
  domain?: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  tweet_id: string;
  tweet_url: string;
  author_name: string;
  author_handle: string;
  author_avatar_url: string | null;
  text: string;
  posted_at: string | null;
  saved_at: string;
  media: TweetMedia[];
  links: TweetLink[];
  is_thread: boolean;
  is_read: boolean;
  is_pinned: boolean;
  note: string | null;
  category_id: string | null;
  suggested_category_id: string | null;
  suggestion_confidence: number | null;
  suggestion_reason: string | null;
  status: BookmarkStatus;
  created_at?: string;
  // Joined relations
  category?: Category | null;
  suggested_category?: Category | null;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface BookmarkTag {
  bookmark_id: string;
  tag_id: string;
  user_id: string;
}

export interface ApiToken {
  id: string;
  user_id: string;
  token_hash: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: Category;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          color?: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      bookmarks: {
        Row: Bookmark;
        Insert: {
          id?: string;
          user_id: string;
          tweet_id: string;
          tweet_url: string;
          author_name?: string;
          author_handle?: string;
          author_avatar_url?: string | null;
          text?: string;
          posted_at?: string | null;
          saved_at?: string;
          media?: Json;
          links?: Json;
          is_thread?: boolean;
          is_read?: boolean;
          is_pinned?: boolean;
          note?: string | null;
          category_id?: string | null;
          suggested_category_id?: string | null;
          suggestion_confidence?: number | null;
          suggestion_reason?: string | null;
          status?: BookmarkStatus;
        };
        Update: {
          id?: string;
          user_id?: string;
          tweet_id?: string;
          tweet_url?: string;
          author_name?: string;
          author_handle?: string;
          author_avatar_url?: string | null;
          text?: string;
          posted_at?: string | null;
          saved_at?: string;
          media?: Json;
          links?: Json;
          is_thread?: boolean;
          is_read?: boolean;
          is_pinned?: boolean;
          note?: string | null;
          category_id?: string | null;
          suggested_category_id?: string | null;
          suggestion_confidence?: number | null;
          suggestion_reason?: string | null;
          status?: BookmarkStatus;
        };
        Relationships: [];
      };
      tags: {
        Row: Tag;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      bookmark_tags: {
        Row: BookmarkTag;
        Insert: {
          bookmark_id: string;
          tag_id: string;
          user_id: string;
        };
        Update: {
          bookmark_id?: string;
          tag_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      api_tokens: {
        Row: ApiToken;
        Insert: {
          id?: string;
          user_id: string;
          token_hash: string;
          name?: string;
          last_used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token_hash?: string;
          name?: string;
          last_used_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
