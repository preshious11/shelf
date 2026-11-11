import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export const DEFAULT_CATEGORIES = [
  { name: 'AI & Tech', description: 'Artificial intelligence, machine learning, and tech breakthroughs', color: '#0284c7', position: 0 },
  { name: 'Programming', description: 'Software engineering, tools, web development, and systems', color: '#2563eb', position: 1 },
  { name: 'Startups & Business', description: 'Founders, venture capital, growth, and business models', color: '#0d9488', position: 2 },
  { name: 'Design', description: 'UI/UX, visual craft, typography, and product design', color: '#8b5cf6', position: 3 },
  { name: 'Career', description: 'Career advice, professional development, and hiring', color: '#f59e0b', position: 4 },
  { name: 'Finance', description: 'Markets, economics, investing, and wealth building', color: '#10b981', position: 5 },
  { name: 'Health', description: 'Physical fitness, longevity, nutrition, and mental health', color: '#ec4899', position: 6 },
  { name: 'News', description: 'Current affairs, journalism, and industry events', color: '#64748b', position: 7 },
  { name: 'Threads to Read', description: 'Long-form deep dives, multi-tweet analyses, and guides', color: '#6366f1', position: 8 },
  { name: 'Funny', description: 'Memes, satire, humor, and entertaining posts', color: '#f97316', position: 9 },
  { name: 'Other', description: 'General bookmarks and eclectic discoveries', color: '#71717a', position: 10 },
];

export async function ensureUserProfileAndCategories(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<Database, any, any>,
  userId: string,
  email?: string
) {
  try {
    // 1. Ensure profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      await supabase.from('profiles').insert({
        id: userId,
        display_name: email ? email.split('@')[0] : 'User',
      });
    }

    // 2. Ensure default categories exist
    const { data: categories } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (!categories || categories.length === 0) {
      const rowsToInsert = DEFAULT_CATEGORIES.map((cat) => ({
        user_id: userId,
        name: cat.name,
        description: cat.description,
        color: cat.color,
        position: cat.position,
      }));

      await supabase.from('categories').insert(rowsToInsert);
    }
  } catch (err) {
    console.error('Error ensuring profile and categories:', err);
  }
}
