import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [categoriesRes, tagsRes, bookmarksRes] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true }),
    supabase.from('tags').select('*').eq('user_id', user.id),
    supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false }),
  ]);

  return NextResponse.json({
    version: '1.0',
    exported_at: new Date().toISOString(),
    categories: categoriesRes.data || [],
    tags: tagsRes.data || [],
    bookmarks: bookmarksRes.data || [],
  });
}

