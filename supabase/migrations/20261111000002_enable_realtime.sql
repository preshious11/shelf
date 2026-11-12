-- Migration: 20261111000002_enable_realtime.sql
-- Enables Supabase Realtime publication for bookmarks and categories

begin;
  -- Enable publication on bookmarks and categories
  alter publication supabase_realtime add table public.bookmarks;
  alter publication supabase_realtime add table public.categories;

  -- Ensure replica identity full so deleted/updated rows are fully broadcast
  alter table public.bookmarks replica identity full;
  alter table public.categories replica identity full;
commit;

