'use client';

import React, { useEffect, useRef } from 'react';
import { Search, X, Image as ImageIcon, MessageSquare, Circle, Pin, ArrowUpDown, LayoutGrid, List } from 'lucide-react';

export type SortOption = 'saved_desc' | 'saved_asc' | 'posted_desc' | 'posted_asc' | 'author_asc';

interface SearchHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  mediaFilter: boolean;
  onToggleMediaFilter: () => void;
  threadsFilter: boolean;
  onToggleThreadsFilter: () => void;
  unreadFilter: boolean;
  onToggleUnreadFilter: () => void;
  pinnedFilter: boolean;
  onTogglePinnedFilter: () => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  activeCategoryName?: string | null;
  onClearCategory?: () => void;
  activeTagName?: string | null;
  onClearTag?: () => void;
  totalFiltered: number;
}

export function SearchHeader({
  searchQuery,
  onSearchChange,
  mediaFilter,
  onToggleMediaFilter,
  threadsFilter,
  onToggleThreadsFilter,
  unreadFilter,
  onToggleUnreadFilter,
  pinnedFilter,
  onTogglePinnedFilter,
  sortOption,
  onSortChange,
  viewMode,
  onViewModeChange,
  activeCategoryName,
  onClearCategory,
  activeTagName,
  onClearTag,
  totalFiltered,
}: SearchHeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global '/' keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-[#FBFBFA]/90 dark:bg-[#0C0C0E]/90 backdrop-blur-md border-b border-[#E5E5E3] dark:border-[#26262B] px-6 py-3.5 space-y-3">
      {/* Top row: Search input & Active tags */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A] dark:text-[#A1A1AA] pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                if (searchQuery) {
                  onSearchChange('');
                } else {
                  searchInputRef.current?.blur();
                }
              }
            }}
            placeholder="Search your bookmarks... (Press '/' to focus)"
            className="w-full pl-10 pr-9 py-2 text-sm bg-white dark:bg-[#16161A] border border-[#E5E5E3] dark:border-[#26262B] rounded-lg text-[#18181B] dark:text-[#F4F4F5] placeholder-[#A1A1AA] dark:placeholder-[#71717A] focus:border-sky-600 dark:focus:border-sky-400 focus:outline-none transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
          />
          {searchQuery ? (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-[#71717A] dark:text-[#A1A1AA] bg-[#F4F4F3] dark:bg-[#26262B] border border-[#E5E5E3] dark:border-[#383840] rounded pointer-events-none">
              /
            </div>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="relative flex items-center">
          <select
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="appearance-none pl-8 pr-7 py-2 text-xs font-medium bg-white dark:bg-[#16161A] border border-[#E5E5E3] dark:border-[#26262B] rounded-lg text-[#18181B] dark:text-[#F4F4F5] focus:outline-none focus:border-sky-600 dark:focus:border-sky-400 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
          >
            <option value="saved_desc">Saved (Newest)</option>
            <option value="saved_asc">Saved (Oldest)</option>
            <option value="posted_desc">Tweet Date (Newest)</option>
            <option value="posted_asc">Tweet Date (Oldest)</option>
            <option value="author_asc">Author (A-Z)</option>
          </select>
          <ArrowUpDown className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#71717A] dark:text-[#A1A1AA] pointer-events-none" />
        </div>
      </div>

      {/* Filter Row: Pills & Active Category/Tag */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Active Category badge */}
          {activeCategoryName && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 border border-sky-200 dark:border-sky-800/60 font-medium">
              <span>Category: {activeCategoryName}</span>
              {onClearCategory && (
                <button
                  onClick={onClearCategory}
                  className="hover:text-sky-600 dark:hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          )}

          {/* Active Tag badge */}
          {activeTagName && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-200 border border-[#E5E5E3] dark:border-[#383840] font-medium">
              <span>#{activeTagName}</span>
              {onClearTag && (
                <button onClick={onClearTag} className="hover:text-stone-600 dark:hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          )}

          {/* Has Media Pill */}
          <button
            onClick={onToggleMediaFilter}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium transition-colors ${
              mediaFilter
                ? 'bg-[#18181B] dark:bg-[#F4F4F5] text-white dark:text-[#18181B] border-[#18181B] dark:border-[#F4F4F5]'
                : 'bg-white dark:bg-[#16161A] text-[#71717A] dark:text-[#A1A1AA] border-[#E5E5E3] dark:border-[#26262B] hover:text-[#18181B] dark:hover:text-[#F4F4F5]'
            }`}
          >
            <ImageIcon className="w-3 h-3" />
            <span>Media</span>
          </button>

          {/* Threads Pill */}
          <button
            onClick={onToggleThreadsFilter}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium transition-colors ${
              threadsFilter
                ? 'bg-[#18181B] dark:bg-[#F4F4F5] text-white dark:text-[#18181B] border-[#18181B] dark:border-[#F4F4F5]'
                : 'bg-white dark:bg-[#16161A] text-[#71717A] dark:text-[#A1A1AA] border-[#E5E5E3] dark:border-[#26262B] hover:text-[#18181B] dark:hover:text-[#F4F4F5]'
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            <span>Threads</span>
          </button>

          {/* Unread Pill */}
          <button
            onClick={onToggleUnreadFilter}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium transition-colors ${
              unreadFilter
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white dark:bg-[#16161A] text-[#71717A] dark:text-[#A1A1AA] border-[#E5E5E3] dark:border-[#26262B] hover:text-[#18181B] dark:hover:text-[#F4F4F5]'
            }`}
          >
            <Circle className="w-3 h-3" />
            <span>Unread</span>
          </button>

          {/* Pinned Pill */}
          <button
            onClick={onTogglePinnedFilter}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium transition-colors ${
              pinnedFilter
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white dark:bg-[#16161A] text-[#71717A] dark:text-[#A1A1AA] border-[#E5E5E3] dark:border-[#26262B] hover:text-[#18181B] dark:hover:text-[#F4F4F5]'
            }`}
          >
            <Pin className="w-3 h-3" />
            <span>Pinned</span>
          </button>
        </div>

        {/* Layout Toggle & Count summary */}
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-[#E5E5E3] dark:border-[#26262B] rounded-lg p-0.5 bg-white dark:bg-[#16161A]">
            <button
              onClick={() => onViewModeChange('grid')}
              title="3-column Grid View"
              className={`p-1 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#18181B] dark:bg-[#F4F4F5] text-white dark:text-[#18181B]'
                  : 'text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              title="Single Column View"
              className={`p-1 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#18181B] dark:bg-[#F4F4F5] text-white dark:text-[#18181B]'
                  : 'text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="text-[11px] font-mono text-[#71717A] dark:text-[#A1A1AA]">
            {totalFiltered} {totalFiltered === 1 ? 'bookmark' : 'bookmarks'}
          </span>
        </div>
      </div>
    </header>
  );
}

