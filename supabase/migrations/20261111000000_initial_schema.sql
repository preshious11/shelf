-- Migration: 20261111000000_initial_schema.sql
-- Shelf: Private, fast library for X (Twitter) bookmarks
-- Follows Supabase Best Practices: Strict RLS, indexed foreign keys, optimized (select auth.uid())

-- 1. Enable required extensions
create extension if not exists "pg_trgm";
create extension if not exists "uuid-ossp";

-- 2. Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- 3. Categories table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#71717a',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint categories_user_id_name_unique unique (user_id, name)
);

-- 4. Bookmarks table
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tweet_id text not null,
  tweet_url text not null,
  author_name text not null default '',
  author_handle text not null default '',
  author_avatar_url text,
  text text not null default '',
  posted_at timestamptz,
  saved_at timestamptz not null default now(),
  media jsonb not null default '[]'::jsonb,
  links jsonb not null default '[]'::jsonb,
  is_thread boolean not null default false,
  is_read boolean not null default false,
  is_pinned boolean not null default false,
  note text,
  category_id uuid references public.categories(id) on delete set null,
  suggested_category_id uuid references public.categories(id) on delete set null,
  suggestion_confidence numeric(4,3),
  suggestion_reason text,
  status text not null default 'to_sort' check (status in ('to_sort', 'sorted')),
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(author_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(author_handle, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(text, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(note, '')), 'C')
  ) stored,
  constraint bookmarks_user_id_tweet_id_unique unique (user_id, tweet_id)
);

-- 5. Tags table
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint tags_user_id_name_unique unique (user_id, name)
);

-- 6. Bookmark Tags junction table
create table if not exists public.bookmark_tags (
  bookmark_id uuid not null references public.bookmarks(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (bookmark_id, tag_id)
);

-- 7. API Tokens table (for Chrome Extension ingestion)
create table if not exists public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  name text not null default 'Extension Token',
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

-- 8. Indexes for performance and RLS
-- Foreign keys and user_id indexes
create index if not exists profiles_created_at_idx on public.profiles(created_at);

create index if not exists categories_user_id_idx on public.categories(user_id);
create index if not exists categories_user_position_idx on public.categories(user_id, position);

create index if not exists bookmarks_user_id_idx on public.bookmarks(user_id);
create index if not exists bookmarks_user_status_idx on public.bookmarks(user_id, status);
create index if not exists bookmarks_user_saved_at_idx on public.bookmarks(user_id, saved_at desc);
create index if not exists bookmarks_user_posted_at_idx on public.bookmarks(user_id, posted_at desc);
create index if not exists bookmarks_category_id_idx on public.bookmarks(category_id);
create index if not exists bookmarks_suggested_category_id_idx on public.bookmarks(suggested_category_id);

-- Full text search and trigram indexes
create index if not exists bookmarks_search_vector_idx on public.bookmarks using gin(search_vector);
create index if not exists bookmarks_text_trgm_idx on public.bookmarks using gin(text gin_trgm_ops);
create index if not exists bookmarks_author_name_trgm_idx on public.bookmarks using gin(author_name gin_trgm_ops);
create index if not exists bookmarks_author_handle_trgm_idx on public.bookmarks using gin(author_handle gin_trgm_ops);

create index if not exists tags_user_id_idx on public.tags(user_id);

create index if not exists bookmark_tags_user_id_idx on public.bookmark_tags(user_id);
create index if not exists bookmark_tags_tag_id_idx on public.bookmark_tags(tag_id);
create index if not exists bookmark_tags_bookmark_id_idx on public.bookmark_tags(bookmark_id);

create index if not exists api_tokens_user_id_idx on public.api_tokens(user_id);
create index if not exists api_tokens_token_hash_idx on public.api_tokens(token_hash);

-- 9. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.bookmarks enable row level security;
alter table public.tags enable row level security;
alter table public.bookmark_tags enable row level security;
alter table public.api_tokens enable row level security;

-- 10. RLS Policies (Optimized with scalar subqueries and authenticated role target)

-- Profiles
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- Categories
create policy "Users can view their own categories"
  on public.categories for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own categories"
  on public.categories for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own categories"
  on public.categories for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own categories"
  on public.categories for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Bookmarks
create policy "Users can view their own bookmarks"
  on public.bookmarks for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own bookmarks"
  on public.bookmarks for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own bookmarks"
  on public.bookmarks for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own bookmarks"
  on public.bookmarks for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Tags
create policy "Users can view their own tags"
  on public.tags for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own tags"
  on public.tags for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own tags"
  on public.tags for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own tags"
  on public.tags for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Bookmark Tags
create policy "Users can view their own bookmark tags"
  on public.bookmark_tags for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can link tags to their own bookmarks"
  on public.bookmark_tags for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can remove tags from their own bookmarks"
  on public.bookmark_tags for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- API Tokens
create policy "Users can view their own api tokens"
  on public.api_tokens for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own api tokens"
  on public.api_tokens for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own api tokens"
  on public.api_tokens for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own api tokens"
  on public.api_tokens for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- 11. Trigger function for new user onboarding (seeds profile and default categories)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Create user profile
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  -- Seed default categories
  insert into public.categories (user_id, name, description, color, position)
  values
    (new.id, 'AI & Tech', 'Artificial intelligence, machine learning, and tech breakthroughs', '#0284c7', 0),
    (new.id, 'Programming', 'Software engineering, tools, web development, and systems', '#2563eb', 1),
    (new.id, 'Startups & Business', 'Founders, venture capital, growth, and business models', '#0d9488', 2),
    (new.id, 'Design', 'UI/UX, visual craft, typography, and product design', '#8b5cf6', 3),
    (new.id, 'Career', 'Career advice, professional development, and hiring', '#f59e0b', 4),
    (new.id, 'Finance', 'Markets, economics, investing, and wealth building', '#10b981', 5),
    (new.id, 'Health', 'Physical fitness, longevity, nutrition, and mental health', '#ec4899', 6),
    (new.id, 'News', 'Current affairs, journalism, and industry events', '#64748b', 7),
    (new.id, 'Threads to Read', 'Long-form deep dives, multi-tweet analyses, and guides', '#6366f1', 8),
    (new.id, 'Funny', 'Memes, satire, humor, and entertaining posts', '#f97316', 9),
    (new.id, 'Other', 'General bookmarks and eclectic discoveries', '#71717a', 10)
  on conflict (user_id, name) do nothing;

  return new;
end;
$$;

-- Trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 12. Rate limiting table & RPC for Extension Ingest
create table if not exists public.api_token_rate_limits (
  token_hash text not null,
  bucket_minute timestamptz not null default date_trunc('minute', now()),
  request_count integer not null default 1,
  primary key (token_hash, bucket_minute)
);

create index if not exists api_token_rate_limits_bucket_idx
  on public.api_token_rate_limits (bucket_minute);

alter table public.api_token_rate_limits enable row level security;

create or replace function public.check_token_rate_limit(
  p_token_hash text,
  p_max_requests integer default 60
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_minute timestamptz := date_trunc('minute', now());
  v_count integer;
  v_allowed boolean;
begin
  -- Prune old entries older than 5 minutes to keep table lean
  delete from public.api_token_rate_limits
  where bucket_minute < now() - interval '5 minutes';

  -- Upsert current minute count atomically
  insert into public.api_token_rate_limits (token_hash, bucket_minute, request_count)
  values (p_token_hash, v_minute, 1)
  on conflict (token_hash, bucket_minute)
  do update set request_count = public.api_token_rate_limits.request_count + 1
  returning request_count into v_count;

  if v_count > p_max_requests then
    v_allowed := false;
  else
    v_allowed := true;
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'count', v_count,
    'limit', p_max_requests
  );
end;
$$;
