import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { LibraryView } from '@/components/library/library-view';
import type { Bookmark, Category, Tag } from '@/types/database';

export const dynamic = 'force-dynamic';

const DEMO_CATEGORIES: Category[] = [
  { id: 'cat-1', user_id: 'demo-user', name: 'AI & Tech', description: 'Artificial intelligence and tech', color: '#0284c7', position: 0, created_at: '' },
  { id: 'cat-2', user_id: 'demo-user', name: 'Programming', description: 'Software engineering & systems', color: '#2563eb', position: 1, created_at: '' },
  { id: 'cat-3', user_id: 'demo-user', name: 'Startups & Business', description: 'Founders and venture', color: '#0d9488', position: 2, created_at: '' },
  { id: 'cat-4', user_id: 'demo-user', name: 'Design', description: 'UI/UX craft & typography', color: '#8b5cf6', position: 3, created_at: '' },
  { id: 'cat-5', user_id: 'demo-user', name: 'Finance', description: 'Markets & economics', color: '#10b981', position: 4, created_at: '' },
];

const DEMO_TAGS: Tag[] = [
  { id: 'tag-1', user_id: 'demo-user', name: 'llm', created_at: '' },
  { id: 'tag-2', user_id: 'demo-user', name: 'systems', created_at: '' },
  { id: 'tag-3', user_id: 'demo-user', name: 'craft', created_at: '' },
  { id: 'tag-4', user_id: 'demo-user', name: 'typescript', created_at: '' },
];

const DEMO_BOOKMARKS: Bookmark[] = [
  {
    id: 'bm-1',
    user_id: 'demo-user',
    tweet_id: '1790123456789',
    tweet_url: 'https://x.com/karpathy/status/1790123456789',
    author_name: 'Andrej Karpathy',
    author_handle: 'karpathy',
    author_avatar_url: null,
    text: 'LLM OS is a useful mental model for modern systems. The CPU is the LLM, RAM is the context window, and secondary storage is disk / web search. Everything is converging on this architecture.',
    posted_at: '2024-05-14T18:22:00Z',
    saved_at: '2024-05-14T19:00:00Z',
    media: [],
    links: [],
    is_thread: false,
    is_read: false,
    is_pinned: true,
    note: 'Revisit for system design talk and architecture notes.',
    category_id: 'cat-1',
    suggested_category_id: 'cat-1',
    suggestion_confidence: 0.96,
    suggestion_reason: 'Discusses LLM operating system mental model and AI computing architecture.',
    status: 'sorted',
    tags: [DEMO_TAGS[0], DEMO_TAGS[1]],
  },
  {
    id: 'bm-2',
    user_id: 'demo-user',
    tweet_id: '1780987654321',
    tweet_url: 'https://x.com/shadcn/status/1780987654321',
    author_name: 'shadcn',
    author_handle: 'shadcn',
    author_avatar_url: null,
    text: 'Craft isn’t about adding decoration; it’s about eliminating distraction until only the essential remains.',
    posted_at: '2024-04-02T14:10:00Z',
    saved_at: '2024-04-02T15:30:00Z',
    media: [],
    links: [],
    is_thread: false,
    is_read: true,
    is_pinned: false,
    note: null,
    category_id: 'cat-4',
    suggested_category_id: 'cat-4',
    suggestion_confidence: 0.92,
    suggestion_reason: 'Reflections on interface design craft and minimalism.',
    status: 'sorted',
    tags: [DEMO_TAGS[2]],
  },
  {
    id: 'bm-3',
    user_id: 'demo-user',
    tweet_id: '1801234567890',
    tweet_url: 'https://x.com/geoffreyhinton/status/1801234567890',
    author_name: 'Geoffrey Hinton',
    author_handle: 'geoffreyhinton',
    author_avatar_url: null,
    text: 'A brief reflection on neural network scaling limits and inductive biases in biological vs artificial systems. Biological brains use spike-timing and local plasticity, which might be fundamentally more energy efficient.',
    posted_at: '2024-06-10T11:05:00Z',
    saved_at: '2024-06-10T11:30:00Z',
    media: [],
    links: [],
    is_thread: true,
    is_read: false,
    is_pinned: false,
    note: null,
    category_id: null,
    suggested_category_id: 'cat-1',
    suggestion_confidence: 0.94,
    suggestion_reason: 'Post discusses neural network architectures, biological learning, and scaling limits.',
    status: 'to_sort',
    tags: [DEMO_TAGS[0]],
  },
  {
    id: 'bm-4',
    user_id: 'demo-user',
    tweet_id: '1812345678901',
    tweet_url: 'https://x.com/paulg/status/1812345678901',
    author_name: 'Paul Graham',
    author_handle: 'paulg',
    author_avatar_url: null,
    text: 'The best startup ideas usually look like bad ideas to most people, but you have a secret insight that makes it plausible.',
    posted_at: '2024-07-01T09:00:00Z',
    saved_at: '2024-07-01T10:00:00Z',
    media: [],
    links: [],
    is_thread: false,
    is_read: true,
    is_pinned: false,
    note: null,
    category_id: 'cat-3',
    suggested_category_id: 'cat-3',
    suggestion_confidence: 0.89,
    suggestion_reason: 'Advice on evaluating early-stage startup ideas.',
    status: 'sorted',
    tags: [],
  },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const isDemo = params?.demo === '1' || params?.preview === '1';

  const headerList = await headers();
  const headerUserId = headerList.get('x-user-id');
  const headerUserEmail = headerList.get('x-user-email');

  const supabase = await createClient();

  let user: { id: string; email?: string } | null = null;
  if (headerUserId) {
    user = { id: headerUserId, email: headerUserEmail || undefined };
  } else {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  }

  if (!user && !isDemo) {
    redirect('/login');
  }

  if (isDemo || !user) {
    return (
      <LibraryView
        initialBookmarks={DEMO_BOOKMARKS}
        initialCategories={DEMO_CATEGORIES}
        initialTags={DEMO_TAGS}
        userEmail="demo@shelf.local"
        userId="demo-user"
      />
    );
  }

  // Fetch categories, tags, and bookmarks in parallel
  const [categoriesRes, tagsRes, bookmarksRes] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true }),
    supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true }),
    supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false }),
  ]);

  const categories: Category[] = (categoriesRes.data as Category[]) || [];
  const tags: Tag[] = (tagsRes.data as Tag[]) || [];
  const bookmarks: Bookmark[] = (bookmarksRes.data as Bookmark[]) || [];

  return (
    <LibraryView
      initialBookmarks={bookmarks}
      initialCategories={categories}
      initialTags={tags}
      userEmail={user.email}
      userId={user.id}
    />
  );
}
