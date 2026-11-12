'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/theme-provider';
import type { Category, Tag } from '@/types/database';
import {
  Inbox,
  Bookmark,
  Pin,
  Circle,
  Plus,
  Settings,
  Tag as TagIcon,
  Sun,
  Moon,
  CheckCircle2,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  selectedCategoryId: string | null;
  selectedTagId: string | null;
  onSelectView: (view: 'all' | 'to_sort' | 'pinned' | 'unread') => void;
  onSelectCategory: (categoryId: string | null) => void;
  onSelectTag: (tagId: string | null) => void;
  onOpenNewCategoryModal: () => void;
  categories: Category[];
  tags: Tag[];
  counts: {
    to_sort: number;
    all: number;
    pinned: number;
    unread: number;
    byCategory: Record<string, number>;
    byTag: Record<string, number>;
  };
  userEmail?: string;
  className?: string;
}

export function Sidebar({
  currentView,
  selectedCategoryId,
  selectedTagId,
  onSelectView,
  onSelectCategory,
  onSelectTag,
  onOpenNewCategoryModal,
  categories,
  tags,
  counts,
  userEmail,
  className = '',
}: SidebarProps) {
  const pathname = usePathname();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <aside
      className={`w-64 flex-shrink-0 flex flex-col justify-between border-r border-[#E5E5E3] dark:border-[#26262B] bg-[#FBFBFA] dark:bg-[#121215] h-screen select-none ${className}`}
    >
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Header / Brand */}
        <div className="flex items-center justify-between px-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#18181B] dark:bg-[#F4F4F5] text-white dark:text-[#18181B] flex items-center justify-center shadow-sm">
              <Bookmark className="w-4 h-4 text-sky-400 dark:text-sky-600" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-[#18181B] dark:text-[#F4F4F5]">
              Shelf
            </span>
          </div>

          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="p-1.5 rounded-md text-[#71717A] dark:text-[#A1A1AA] hover:bg-[#E5E5E3]/60 dark:hover:bg-[#26262B]/60 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Primary Views Navigation */}
        <div className="space-y-0.5">
          {/* To Sort */}
          <button
            onClick={() => {
              onSelectCategory(null);
              onSelectTag(null);
              onSelectView('to_sort');
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              currentView === 'to_sort' && !selectedCategoryId && !selectedTagId
                ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200'
                : 'text-[#18181B] dark:text-[#F4F4F5] hover:bg-[#E5E5E3]/50 dark:hover:bg-[#26262B]/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Inbox className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>To sort</span>
            </div>
            {counts.to_sort > 0 ? (
              <span className="px-1.5 py-0.5 text-[11px] font-mono font-medium rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200">
                {counts.to_sort}
              </span>
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#71717A] dark:text-[#A1A1AA]" />
            )}
          </button>

          {/* All Bookmarks */}
          <button
            onClick={() => {
              onSelectCategory(null);
              onSelectTag(null);
              onSelectView('all');
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              currentView === 'all' && !selectedCategoryId && !selectedTagId
                ? 'bg-[#E5E5E3]/70 dark:bg-[#26262B] text-[#18181B] dark:text-[#F4F4F5]'
                : 'text-[#18181B] dark:text-[#F4F4F5] hover:bg-[#E5E5E3]/50 dark:hover:bg-[#26262B]/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Bookmark className="w-4 h-4 text-[#71717A] dark:text-[#A1A1AA]" />
              <span>All saved</span>
            </div>
            <span className="text-[11px] font-mono text-[#71717A] dark:text-[#A1A1AA]">
              {counts.all}
            </span>
          </button>

          {/* Pinned */}
          <button
            onClick={() => {
              onSelectCategory(null);
              onSelectTag(null);
              onSelectView('pinned');
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              currentView === 'pinned' && !selectedCategoryId && !selectedTagId
                ? 'bg-[#E5E5E3]/70 dark:bg-[#26262B] text-[#18181B] dark:text-[#F4F4F5]'
                : 'text-[#18181B] dark:text-[#F4F4F5] hover:bg-[#E5E5E3]/50 dark:hover:bg-[#26262B]/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Pin className="w-4 h-4 text-[#71717A] dark:text-[#A1A1AA]" />
              <span>Pinned</span>
            </div>
            <span className="text-[11px] font-mono text-[#71717A] dark:text-[#A1A1AA]">
              {counts.pinned}
            </span>
          </button>

          {/* Unread */}
          <button
            onClick={() => {
              onSelectCategory(null);
              onSelectTag(null);
              onSelectView('unread');
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              currentView === 'unread' && !selectedCategoryId && !selectedTagId
                ? 'bg-[#E5E5E3]/70 dark:bg-[#26262B] text-[#18181B] dark:text-[#F4F4F5]'
                : 'text-[#18181B] dark:text-[#F4F4F5] hover:bg-[#E5E5E3]/50 dark:hover:bg-[#26262B]/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Circle className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
              <span>Unread</span>
            </div>
            <span className="text-[11px] font-mono text-[#71717A] dark:text-[#A1A1AA]">
              {counts.unread}
            </span>
          </button>
        </div>

        {/* Categories Section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2.5 py-1">
            <span className="text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-wider">
              Categories
            </span>
            <button
              onClick={onOpenNewCategoryModal}
              title="Add category"
              className="p-1 rounded text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5] hover:bg-[#E5E5E3]/60 dark:hover:bg-[#26262B]/60 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              const count = counts.byCategory[cat.id] || 0;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    onSelectTag(null);
                    onSelectCategory(isSelected ? null : cat.id);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-[#E5E5E3]/80 dark:bg-[#26262B] text-[#18181B] dark:text-[#F4F4F5]'
                      : 'text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5] hover:bg-[#E5E5E3]/40 dark:hover:bg-[#26262B]/40'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color || '#71717A' }}
                    />
                    <span className="truncate">{cat.name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#71717A] dark:text-[#A1A1AA] flex-shrink-0">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags Section */}
        {tags.length > 0 && (
          <div className="space-y-1">
            <div className="px-2.5 py-1">
              <span className="text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-wider">
                Tags
              </span>
            </div>

            <div className="space-y-0.5">
              {tags.map((tag) => {
                const isSelected = selectedTagId === tag.id;
                const count = counts.byTag[tag.id] || 0;
                return (
                  <button
                    key={tag.id}
                    onClick={() => {
                      onSelectCategory(null);
                      onSelectTag(isSelected ? null : tag.id);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-[#E5E5E3]/80 dark:bg-[#26262B] text-[#18181B] dark:text-[#F4F4F5]'
                        : 'text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5] hover:bg-[#E5E5E3]/40 dark:hover:bg-[#26262B]/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <TagIcon className="w-3 h-3 text-[#71717A] dark:text-[#A1A1AA]" />
                      <span className="truncate">#{tag.name}</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#71717A] dark:text-[#A1A1AA]">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Account & Settings */}
      <div className="border-t border-[#E5E5E3] dark:border-[#26262B] p-3 space-y-2">
        <Link
          href="/settings"
          className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            pathname === '/settings'
              ? 'bg-[#E5E5E3]/80 dark:bg-[#26262B] text-[#18181B] dark:text-[#F4F4F5]'
              : 'text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5] hover:bg-[#E5E5E3]/40 dark:hover:bg-[#26262B]/40'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Settings className="w-4 h-4 text-[#71717A] dark:text-[#A1A1AA]" />
            <span className="truncate">{userEmail || 'Settings'}</span>
          </div>
        </Link>

        {/* Keyboard shortcut hint */}
        <div className="px-2 pt-1 flex items-center justify-between text-[10px] font-mono text-[#71717A] dark:text-[#A1A1AA]">
          <span>/ Search</span>
          <span>⌘K Commands</span>
        </div>
      </div>
    </aside>
  );
}

