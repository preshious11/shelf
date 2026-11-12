'use client';

import React, { useState, useTransition, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Bookmark, Category, Tag } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from '@/components/layout/sidebar';
import { SearchHeader, type SortOption } from '@/components/library/search-header';
import { TweetCard } from '@/components/library/tweet-card';
import { EmptyState } from '@/components/library/empty-state';
import { TriageView } from '@/components/triage/triage-view';
import { CategoryModal } from '@/components/library/category-modal';
import { ImportModal } from '@/components/library/import-modal';
import { CommandPalette } from '@/components/palette/command-palette';
import { Menu, X, Sparkles, LayoutList, SplitSquareVertical } from 'lucide-react';

interface LibraryViewProps {
  initialBookmarks: Bookmark[];
  initialCategories: Category[];
  initialTags: Tag[];
  userEmail?: string;
  userId: string;
}

export function LibraryView({
  initialBookmarks,
  initialCategories,
  initialTags,
  userEmail,
  userId,
}: LibraryViewProps) {
  const router = useRouter();
  const supabase = createClient();

  // Local state
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [tags, setTags] = useState<Tag[]>(initialTags);

  // Active view & filters
  const [currentView, setCurrentView] = useState<'all' | 'to_sort' | 'pinned' | 'unread'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaFilter, setMediaFilter] = useState(false);
  const [threadsFilter, setThreadsFilter] = useState(false);
  const [unreadFilter, setUnreadFilter] = useState(false);
  const [pinnedFilter, setPinnedFilter] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('saved_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // UI Modals & modes
  const [triageMode, setTriageMode] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionNotice, setSuggestionNotice] = useState<string | null>(null);

  // Non-blocking search transition
  const [, startTransition] = useTransition();

  // Initialize from URL params if present (useful for deep-links, previews and screenshots)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'to_sort') {
        setCurrentView('to_sort');
        if (params.get('triage') === '1') {
          setTriageMode(true);
        }
      }
      if (params.get('palette') === '1') {
        setIsPaletteOpen(true);
      }
      if (params.get('theme') === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (params.get('theme') === 'light') {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  // Refresh bookmarks from database silently and merge changes
  const refreshBookmarks = useCallback(async () => {
    if (!userId || userId === 'demo-user') return;
    try {
      const { data: latestBookmarks, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false });

      if (error) {
        console.warn('[Library] Failed to refresh bookmarks:', error);
        return;
      }

      if (latestBookmarks) {
        setBookmarks((prev) => {
          // If counts differ or IDs differ, update immediately
          if (prev.length !== latestBookmarks.length) {
            return latestBookmarks as Bookmark[];
          }
          const hasChange = latestBookmarks.some((nb, i) => {
            const ob = prev[i];
            return (
              !ob ||
              ob.id !== nb.id ||
              ob.category_id !== nb.category_id ||
              ob.status !== nb.status ||
              ob.is_read !== nb.is_read ||
              ob.is_pinned !== nb.is_pinned ||
              ob.suggested_category_id !== nb.suggested_category_id
            );
          });
          if (hasChange) {
            return latestBookmarks as Bookmark[];
          }
          return prev;
        });
      }
    } catch (err) {
      console.warn('[Library] Error refreshing bookmarks:', err);
    }
  }, [supabase, userId]);

  // Real-time synchronization: Supabase Realtime + Tab Focus + Visibility + Polling Heartbeat
  useEffect(() => {
    if (!userId || userId === 'demo-user') return;

    // 1. Supabase Postgres Changes Channel
    const channel = supabase
      .channel(`library-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refreshBookmarks();
        }
      )
      .subscribe();

    // 2. Window Focus & Visibility Change:
    // When the user switches back from X to the Shelf tab, instantly update
    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshBookmarks();
      }
    };
    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);

    // 3. Cross-Tab BroadcastChannel
    let broadcastChannel: BroadcastChannel | null = null;
    try {
      broadcastChannel = new BroadcastChannel('shelf_sync_channel');
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'BOOKMARKS_CHANGED' || event.data?.type === 'SHELF_BOOKMARKS_CHANGED') {
          refreshBookmarks();
        }
      };
    } catch {
      // Ignored if unsupported
    }

    // 4. Window Message Listener (for direct postMessage from extension bridge)
    const handleWindowMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SHELF_BOOKMARKS_CHANGED') {
        refreshBookmarks();
      }
    };
    window.addEventListener('message', handleWindowMessage);

    // 5. Lightweight background polling heartbeat (every 3 seconds when tab is active)
    let lastBookmarkCount = bookmarks.length;
    let lastLatestId = bookmarks[0]?.id || '';

    const heartbeatTimer = setInterval(async () => {
      if (document.hidden) return; // Save resources when tab is backgrounded

      try {
        const { count, error: countErr } = await supabase
          .from('bookmarks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (!countErr && typeof count === 'number' && count !== lastBookmarkCount) {
          lastBookmarkCount = count;
          refreshBookmarks();
          return;
        }

        const { data: latest, error: latestErr } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('user_id', userId)
          .order('saved_at', { ascending: false })
          .limit(1);

        if (!latestErr && latest && latest.length > 0) {
          if (latest[0].id !== lastLatestId) {
            lastLatestId = latest[0].id;
            refreshBookmarks();
          }
        }
      } catch {
        // Silent catch for background heartbeat
      }
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
      window.removeEventListener('message', handleWindowMessage);
      if (broadcastChannel) {
        broadcastChannel.close();
      }
      clearInterval(heartbeatTimer);
    };
  }, [userId, supabase, refreshBookmarks, bookmarks]);

  // Global keyboard shortcuts (Cmd+K for palette, T for triage)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
        return;
      }

      // 't' or 'T' for triage mode when not typing
      if (
        (e.key === 't' || e.key === 'T') &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        !isPaletteOpen &&
        !isCategoryModalOpen &&
        !isImportModalOpen
      ) {
        e.preventDefault();
        setCurrentView('to_sort');
        setTriageMode(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaletteOpen, isCategoryModalOpen, isImportModalOpen]);

  // Derived counts for sidebar
  const counts = useMemo(() => {
    let to_sort = 0;
    let all = 0;
    let pinned = 0;
    let unread = 0;
    const byCategory: Record<string, number> = {};
    const byTag: Record<string, number> = {};

    categories.forEach((c) => {
      byCategory[c.id] = 0;
    });

    tags.forEach((t) => {
      byTag[t.id] = 0;
    });

    bookmarks.forEach((b) => {
      all++;
      if (b.status === 'to_sort') to_sort++;
      if (b.is_pinned) pinned++;
      if (!b.is_read) unread++;
      if (b.category_id && byCategory[b.category_id] !== undefined) {
        byCategory[b.category_id]++;
      }
      if (Array.isArray(b.tags)) {
        b.tags.forEach((tag) => {
          if (byTag[tag.id] !== undefined) {
            byTag[tag.id]++;
          }
        });
      }
    });

    return { to_sort, all, pinned, unread, byCategory, byTag };
  }, [bookmarks, categories, tags]);

  // Filter and sort logic
  const filteredBookmarks = useMemo(() => {
    let list = [...bookmarks];

    // 1. Primary view filtering
    if (currentView === 'to_sort') {
      list = list.filter((b) => b.status === 'to_sort');
    } else if (currentView === 'pinned') {
      list = list.filter((b) => b.is_pinned);
    } else if (currentView === 'unread') {
      list = list.filter((b) => !b.is_read);
    }

    // 2. Category filter
    if (selectedCategoryId) {
      list = list.filter((b) => b.category_id === selectedCategoryId);
    }

    // 3. Tag filter
    if (selectedTagId) {
      list = list.filter(
        (b) => Array.isArray(b.tags) && b.tags.some((t) => t.id === selectedTagId)
      );
    }

    // 4. Feature filters
    if (mediaFilter) {
      list = list.filter((b) => Array.isArray(b.media) && b.media.length > 0);
    }
    if (threadsFilter) {
      list = list.filter((b) => b.is_thread);
    }
    if (unreadFilter) {
      list = list.filter((b) => !b.is_read);
    }
    if (pinnedFilter) {
      list = list.filter((b) => b.is_pinned);
    }

    // 5. Search query matching (matches text, author name, handle, notes, and tags)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((b) => {
        const textMatch = b.text.toLowerCase().includes(q);
        const authorMatch = b.author_name.toLowerCase().includes(q);
        const handleMatch = b.author_handle.toLowerCase().includes(q);
        const noteMatch = b.note ? b.note.toLowerCase().includes(q) : false;
        const tagMatch = Array.isArray(b.tags)
          ? b.tags.some((t) => t.name.toLowerCase().includes(q))
          : false;
        return textMatch || authorMatch || handleMatch || noteMatch || tagMatch;
      });
    }

    // 6. Sorting
    list.sort((a, b) => {
      if (sortOption === 'saved_desc') {
        return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime();
      }
      if (sortOption === 'saved_asc') {
        return new Date(a.saved_at).getTime() - new Date(b.saved_at).getTime();
      }
      if (sortOption === 'posted_desc') {
        const timeA = a.posted_at ? new Date(a.posted_at).getTime() : 0;
        const timeB = b.posted_at ? new Date(b.posted_at).getTime() : 0;
        return timeB - timeA;
      }
      if (sortOption === 'posted_asc') {
        const timeA = a.posted_at ? new Date(a.posted_at).getTime() : 0;
        const timeB = b.posted_at ? new Date(b.posted_at).getTime() : 0;
        return timeA - timeB;
      }
      if (sortOption === 'author_asc') {
        return a.author_name.localeCompare(b.author_name);
      }
      return 0;
    });

    return list;
  }, [
    bookmarks,
    currentView,
    selectedCategoryId,
    selectedTagId,
    mediaFilter,
    threadsFilter,
    unreadFilter,
    pinnedFilter,
    searchQuery,
    sortOption,
  ]);

  // Handlers for Bookmark Actions
  const handleTogglePin = async (id: string, isPinned: boolean) => {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, is_pinned: isPinned } : b))
    );
    await supabase.from('bookmarks').update({ is_pinned: isPinned }).eq('id', id);
  };

  const handleToggleRead = async (id: string, isRead: boolean) => {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, is_read: isRead } : b))
    );
    await supabase.from('bookmarks').update({ is_read: isRead }).eq('id', id);
  };

  const handleUpdateCategory = async (id: string, categoryId: string | null) => {
    setBookmarks((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              category_id: categoryId,
              status: categoryId ? 'sorted' : b.status,
            }
          : b
      )
    );
    await supabase
      .from('bookmarks')
      .update({
        category_id: categoryId,
        status: categoryId ? 'sorted' : 'to_sort',
      })
      .eq('id', id);
  };

  const handleUpdateNote = async (id: string, note: string) => {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, note: note || null } : b))
    );
    await supabase.from('bookmarks').update({ note: note || null }).eq('id', id);
  };

  const handleDeleteBookmark = async (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    await supabase.from('bookmarks').delete().eq('id', id);
  };

  // Handlers for Triage Flow
  const handleAcceptSuggestion = async (id: string, categoryId: string) => {
    setBookmarks((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              category_id: categoryId,
              status: 'sorted',
            }
          : b
      )
    );
    await supabase
      .from('bookmarks')
      .update({
        category_id: categoryId,
        status: 'sorted',
      })
      .eq('id', id);
  };

  const handleBulkAccept = async (confidenceThreshold: number) => {
    const toUpdate = bookmarks.filter(
      (b) =>
        b.status === 'to_sort' &&
        b.suggested_category_id &&
        b.suggestion_confidence &&
        b.suggestion_confidence >= confidenceThreshold
    );

    if (toUpdate.length === 0) return;

    setBookmarks((prev) =>
      prev.map((b) => {
        if (
          b.status === 'to_sort' &&
          b.suggested_category_id &&
          b.suggestion_confidence &&
          b.suggestion_confidence >= confidenceThreshold
        ) {
          return {
            ...b,
            category_id: b.suggested_category_id,
            status: 'sorted',
          };
        }
        return b;
      })
    );

    // Update in database in parallel batches
    for (const item of toUpdate) {
      if (item.suggested_category_id) {
        await supabase
          .from('bookmarks')
          .update({
            category_id: item.suggested_category_id,
            status: 'sorted',
          })
          .eq('id', item.id);
      }
    }
  };

  // Trigger Gemini category suggestions via API
  const handleTriggerSuggestions = async () => {
    setIsSuggesting(true);
    setSuggestionNotice(null);
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (data.error) {
        setSuggestionNotice('Suggestions unavailable: ' + (data.message || data.error));
      } else if (data.updated > 0) {
        setSuggestionNotice(`Generated ${data.updated} AI category suggestion${data.updated > 1 ? 's' : ''}`);
        // Refresh bookmarks to reflect new suggestions
        const { data: updatedBookmarks } = await supabase
          .from('bookmarks')
          .select('*')
          .order('saved_at', { ascending: false });

        if (updatedBookmarks) {
          setBookmarks(updatedBookmarks as Bookmark[]);
        }
      } else {
        setSuggestionNotice(data.message || 'All bookmarks already have suggestions');
      }
    } catch (err) {
      console.error('Error getting AI suggestions:', err);
      setSuggestionNotice('Suggestions unavailable right now');
    } finally {
      setIsSuggesting(false);
    }
  };

  // Category Management Handlers
  const handleSaveCategory = async (catData: {
    id?: string;
    name: string;
    description: string;
    color: string;
  }) => {
    if (catData.id) {
      // Update
      const { data } = await supabase
        .from('categories')
        .update({
          name: catData.name,
          description: catData.description || null,
          color: catData.color,
        })
        .eq('id', catData.id)
        .select()
        .single();

      if (data) {
        setCategories((prev) =>
          prev.map((c) => (c.id === catData.id ? (data as Category) : c))
        );
      }
    } else {
      // Insert
      const { data } = await supabase
        .from('categories')
        .insert({
          user_id: userId,
          name: catData.name,
          description: catData.description || null,
          color: catData.color,
          position: categories.length,
        })
        .select()
        .single();

      if (data) {
        setCategories((prev) => [...prev, data as Category]);
      }
    }
  };

  const handleDeleteCategory = async (id: string) => {
    // Delete category; database foreign key is on delete set null
    await supabase.from('categories').delete().eq('id', id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    // Set bookmarks that had this category to status 'to_sort' as per requirements
    setBookmarks((prev) =>
      prev.map((b) =>
        b.category_id === id ? { ...b, category_id: null, status: 'to_sort' } : b
      )
    );
    if (selectedCategoryId === id) {
      setSelectedCategoryId(null);
    }
  };

  // JSON Export Handler
  const handleExportData = () => {
    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      categories,
      tags,
      bookmarks,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shelf-bookmarks-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // JSON Import Handler
  const handleImportBookmarks = async (importedItems: unknown[]) => {
    let added = 0;
    let updated = 0;

    const rowsToUpsert = importedItems.map((item: any) => {
      const tweetId = String(item.tweet_id || item.id || '').trim();
      const tweetUrl = item.tweet_url || item.url || `https://x.com/i/web/status/${tweetId}`;
      const authorName = item.author_name || item.author || item.name || '';
      const authorHandle = item.author_handle || item.handle || item.screen_name || '';
      const authorAvatar = item.author_avatar_url || item.avatar || null;
      const text = item.text || item.full_text || '';
      const postedAt = item.posted_at || item.created_at || null;
      const media = Array.isArray(item.media) ? item.media : [];
      const links = Array.isArray(item.links) ? item.links : [];
      const isThread = Boolean(item.is_thread || item.thread);
      const isPinned = Boolean(item.is_pinned);
      const isRead = Boolean(item.is_read);
      const note = item.note || null;
      const status = item.status === 'sorted' ? 'sorted' : 'to_sort';

      return {
        user_id: userId,
        tweet_id: tweetId,
        tweet_url: tweetUrl,
        author_name: authorName,
        author_handle: authorHandle,
        author_avatar_url: authorAvatar,
        text,
        posted_at: postedAt,
        saved_at: item.saved_at || new Date().toISOString(),
        media,
        links,
        is_thread: isThread,
        is_pinned: isPinned,
        is_read: isRead,
        note,
        status,
      };
    }).filter((r) => r.tweet_id);

    if (rowsToUpsert.length === 0) {
      throw new Error('No valid tweet records found in the JSON file.');
    }

    // Upsert into Supabase
    const { data, error } = await supabase
      .from('bookmarks')
      .upsert(rowsToUpsert, { onConflict: 'user_id,tweet_id' })
      .select();

    if (error) {
      throw error;
    }

    if (data) {
      added = data.length;
      // Refresh bookmarks list
      const { data: refreshed } = await supabase
        .from('bookmarks')
        .select('*')
        .order('saved_at', { ascending: false });
      if (refreshed) {
        setBookmarks(refreshed as Bookmark[]);
      }
    }

    return { added, updated };
  };

  const activeCategory = categories.find((c) => c.id === selectedCategoryId);
  const activeTag = tags.find((t) => t.id === selectedTagId);
  const toSortBookmarks = bookmarks.filter((b) => b.status === 'to_sort');

  return (
    <div className="flex h-screen overflow-hidden bg-[#FBFBFA] dark:bg-[#0C0C0E]">
      {/* Desktop Sidebar */}
      <Sidebar
        currentView={currentView}
        selectedCategoryId={selectedCategoryId}
        selectedTagId={selectedTagId}
        onSelectView={(view) => {
          setCurrentView(view);
          if (view === 'to_sort') {
            setTriageMode(true);
          } else {
            setTriageMode(false);
          }
        }}
        onSelectCategory={(id) => {
          setSelectedCategoryId(id);
          setTriageMode(false);
        }}
        onSelectTag={(id) => {
          setSelectedTagId(id);
          setTriageMode(false);
        }}
        onOpenNewCategoryModal={() => {
          setCategoryToEdit(null);
          setIsCategoryModalOpen(true);
        }}
        categories={categories}
        tags={tags}
        counts={counts}
        userEmail={userEmail}
        className="hidden md:flex"
      />

      {/* Mobile Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-full bg-[#FBFBFA] dark:bg-[#121215] shadow-xl">
            <Sidebar
              currentView={currentView}
              selectedCategoryId={selectedCategoryId}
              selectedTagId={selectedTagId}
              onSelectView={(view) => {
                setCurrentView(view);
                setTriageMode(view === 'to_sort');
                setMobileSidebarOpen(false);
              }}
              onSelectCategory={(id) => {
                setSelectedCategoryId(id);
                setTriageMode(false);
                setMobileSidebarOpen(false);
              }}
              onSelectTag={(id) => {
                setSelectedTagId(id);
                setTriageMode(false);
                setMobileSidebarOpen(false);
              }}
              onOpenNewCategoryModal={() => {
                setCategoryToEdit(null);
                setIsCategoryModalOpen(true);
                setMobileSidebarOpen(false);
              }}
              categories={categories}
              tags={tags}
              counts={counts}
              userEmail={userEmail}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header Bar */}
        <div className="flex md:hidden items-center justify-between px-4 py-2.5 border-b border-[#E5E5E3] dark:border-[#26262B] bg-[#FBFBFA] dark:bg-[#0C0C0E]">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-1.5 rounded-lg border border-[#E5E5E3] dark:border-[#26262B] text-[#71717A] dark:text-[#A1A1AA]"
          >
            <Menu className="w-4 h-4" />
          </button>
          <span className="font-semibold text-xs text-[#18181B] dark:text-[#F4F4F5]">
            Shelf
          </span>
          <div className="w-7" />
        </div>

        {/* View Switcher Banner for "To sort" */}
        {currentView === 'to_sort' && (
          <div className="px-6 py-2 bg-sky-50/80 dark:bg-sky-950/30 border-b border-sky-100 dark:border-sky-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sky-950 dark:text-sky-200">
                To sort triage queue ({toSortBookmarks.length} remaining)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTriggerSuggestions}
                disabled={isSuggesting}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-sky-300 dark:border-sky-800 bg-white dark:bg-[#16161A] text-sky-800 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3 text-sky-500" />
                <span>{isSuggesting ? 'AI Thinking...' : 'AI Suggest Categories'}</span>
              </button>
              <button
                onClick={() => setTriageMode(true)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  triageMode
                    ? 'bg-sky-600 text-white'
                    : 'text-sky-900 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-900/50'
                }`}
              >
                <SplitSquareVertical className="w-3 h-3" />
                <span>Focus Triage</span>
              </button>
              <button
                onClick={() => setTriageMode(false)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  !triageMode
                    ? 'bg-sky-600 text-white'
                    : 'text-sky-900 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-900/50'
                }`}
              >
                <LayoutList className="w-3 h-3" />
                <span>List View</span>
              </button>
            </div>
          </div>
        )}

        {/* If in Triage Focus Mode, render TriageView */}
        {currentView === 'to_sort' && triageMode ? (
          <div className="flex-1 overflow-y-auto">
            <TriageView
              bookmarks={toSortBookmarks}
              categories={categories}
              onAcceptSuggestion={handleAcceptSuggestion}
              onAssignCategory={handleAcceptSuggestion}
              onBulkAccept={handleBulkAccept}
              onExitTriage={() => setTriageMode(false)}
              onTriggerSuggestions={handleTriggerSuggestions}
              isSuggesting={isSuggesting}
              suggestionNotice={suggestionNotice}
            />
          </div>
        ) : (
          /* Normal Library View with SearchHeader and Tweet Stream */
          <>
            <SearchHeader
              searchQuery={searchQuery}
              onSearchChange={(q) => startTransition(() => setSearchQuery(q))}
              mediaFilter={mediaFilter}
              onToggleMediaFilter={() => setMediaFilter(!mediaFilter)}
              threadsFilter={threadsFilter}
              onToggleThreadsFilter={() => setThreadsFilter(!threadsFilter)}
              unreadFilter={unreadFilter}
              onToggleUnreadFilter={() => setUnreadFilter(!unreadFilter)}
              pinnedFilter={pinnedFilter}
              onTogglePinnedFilter={() => setPinnedFilter(!pinnedFilter)}
              sortOption={sortOption}
              onSortChange={setSortOption}
              activeCategoryName={activeCategory?.name}
              onClearCategory={() => setSelectedCategoryId(null)}
              activeTagName={activeTag?.name}
              onClearTag={() => setSelectedTagId(null)}
              totalFiltered={filteredBookmarks.length}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />

            {/* Bookmarks Stream */}
            <main className="flex-1 overflow-y-auto px-6 py-6">
              <div className={viewMode === 'grid' ? 'max-w-7xl mx-auto' : 'max-w-3xl mx-auto'}>
                {bookmarks.length === 0 ? (
                  <EmptyState
                    type="no_bookmarks"
                    onOpenImport={() => setIsImportModalOpen(true)}
                  />
                ) : filteredBookmarks.length === 0 ? (
                  searchQuery.trim() ? (
                    <EmptyState
                      type="no_search_results"
                      searchQuery={searchQuery}
                      onClearFilters={() => setSearchQuery('')}
                    />
                  ) : currentView === 'to_sort' ? (
                    <EmptyState type="no_to_sort" />
                  ) : (
                    <EmptyState
                      type="no_filter_results"
                      onClearFilters={() => {
                        setSelectedCategoryId(null);
                        setSelectedTagId(null);
                        setMediaFilter(false);
                        setThreadsFilter(false);
                        setUnreadFilter(false);
                        setPinnedFilter(false);
                      }}
                    />
                  )
                ) : (
                  <div
                    className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                        : 'space-y-4'
                    }
                  >
                    {filteredBookmarks.map((bookmark) => (
                      <TweetCard
                        key={bookmark.id}
                        bookmark={bookmark}
                        categories={categories}
                        onTogglePin={handleTogglePin}
                        onToggleRead={handleToggleRead}
                        onUpdateCategory={handleUpdateCategory}
                        onUpdateNote={handleUpdateNote}
                        onDelete={handleDeleteBookmark}
                        onSelectTag={(tagName) => {
                          const matched = tags.find(
                            (t) => t.name.toLowerCase() === tagName.toLowerCase()
                          );
                          if (matched) {
                            setSelectedTagId(matched.id);
                          }
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </main>
          </>
        )}
      </div>

      {/* Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categoryToEdit={categoryToEdit}
        onSave={handleSaveCategory}
        onDelete={categoryToEdit ? handleDeleteCategory : undefined}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportBookmarks}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        categories={categories}
        tags={tags}
        onSelectView={(v) => {
          setCurrentView(v);
          setTriageMode(v === 'to_sort');
        }}
        onSelectCategory={(catId) => {
          setSelectedCategoryId(catId);
          setTriageMode(false);
        }}
        onSelectTag={(tagId) => {
          setSelectedTagId(tagId);
          setTriageMode(false);
        }}
        onOpenNewCategory={() => {
          setCategoryToEdit(null);
          setIsCategoryModalOpen(true);
        }}
        onTriggerSuggestions={handleTriggerSuggestions}
        onExportData={handleExportData}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenSettings={() => router.push('/settings')}
        onToggleTheme={() => {
          const isDark = document.documentElement.classList.toggle('dark');
          localStorage.setItem('shelf_theme', isDark ? 'dark' : 'light');
        }}
      />
    </div>
  );
}

