'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Category, Tag } from '@/types/database';
import {
  Search,
  Inbox,
  Bookmark,
  Pin,
  Circle,
  Folder,
  Tag as TagIcon,
  Sparkles,
  Download,
  Upload,
  Settings,
  Sun,
  Moon,
  Plus,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  tags: Tag[];
  onSelectView: (view: 'all' | 'to_sort' | 'pinned' | 'unread') => void;
  onSelectCategory: (categoryId: string) => void;
  onSelectTag: (tagId: string) => void;
  onOpenNewCategory: () => void;
  onTriggerSuggestions: () => void;
  onExportData: () => void;
  onOpenImport: () => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  categories,
  tags,
  onSelectView,
  onSelectCategory,
  onSelectTag,
  onOpenNewCategory,
  onTriggerSuggestions,
  onExportData,
  onOpenImport,
  onOpenSettings,
  onToggleTheme,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build items list based on query
  const q = query.toLowerCase().trim();

  const standardActions = [
    {
      id: 'view_to_sort',
      title: 'Go to To sort (Triage)',
      category: 'Views',
      icon: Inbox,
      action: () => onSelectView('to_sort'),
    },
    {
      id: 'view_all',
      title: 'Go to All Saved Bookmarks',
      category: 'Views',
      icon: Bookmark,
      action: () => onSelectView('all'),
    },
    {
      id: 'view_pinned',
      title: 'Go to Pinned Bookmarks',
      category: 'Views',
      icon: Pin,
      action: () => onSelectView('pinned'),
    },
    {
      id: 'view_unread',
      title: 'Go to Unread Bookmarks',
      category: 'Views',
      icon: Circle,
      action: () => onSelectView('unread'),
    },
    {
      id: 'ai_suggest',
      title: 'AI Suggest Categories for Unsorted',
      category: 'Actions',
      icon: Sparkles,
      action: onTriggerSuggestions,
    },
    {
      id: 'new_category',
      title: 'Create New Category',
      category: 'Actions',
      icon: Plus,
      action: onOpenNewCategory,
    },
    {
      id: 'export_json',
      title: 'Export All Bookmarks as JSON',
      category: 'Actions',
      icon: Download,
      action: onExportData,
    },
    {
      id: 'import_json',
      title: 'Import Bookmarks from JSON',
      category: 'Actions',
      icon: Upload,
      action: onOpenImport,
    },
    {
      id: 'toggle_theme',
      title: 'Toggle Dark / Light Theme',
      category: 'Preferences',
      icon: Sun,
      action: onToggleTheme,
    },
    {
      id: 'open_settings',
      title: 'Open Settings (API Tokens & Account)',
      category: 'Navigation',
      icon: Settings,
      action: onOpenSettings,
    },
  ];

  const categoryItems = categories.map((c) => ({
    id: `cat_${c.id}`,
    title: `Category: ${c.name}`,
    category: 'Categories',
    icon: Folder,
    color: c.color,
    action: () => onSelectCategory(c.id),
  }));

  const tagItems = tags.map((t) => ({
    id: `tag_${t.id}`,
    title: `Tag: #${t.name}`,
    category: 'Tags',
    icon: TagIcon,
    action: () => onSelectTag(t.id),
  }));

  const allItems = [...standardActions, ...categoryItems, ...tagItems];

  const filteredItems = q
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      )
    : allItems;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-xs">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-[#16161A] border border-[#E5E5E3] dark:border-[#26262B] rounded-xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        {/* Input box */}
        <div className="flex items-center px-4 py-3 border-b border-[#E5E5E3] dark:border-[#26262B]">
          <Search className="w-4 h-4 text-[#71717A] dark:text-[#A1A1AA] mr-3 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or jump to category..."
            className="w-full bg-transparent border-0 text-sm text-[#18181B] dark:text-[#F4F4F5] placeholder-[#A1A1AA] dark:placeholder-[#71717A] focus:outline-none"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F4F4F3] dark:bg-[#26262B] text-[#71717A] dark:text-[#A1A1AA] border border-[#E5E5E3] dark:border-[#383840]">
            Esc
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#71717A] dark:text-[#A1A1AA]">
              No commands found.
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left ${
                    isSelected
                      ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-950 dark:text-sky-200'
                      : 'text-[#18181B] dark:text-[#F4F4F5] hover:bg-[#F4F4F3] dark:hover:bg-[#1F1F24]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className="w-4 h-4 flex-shrink-0 text-[#71717A] dark:text-[#A1A1AA]"
                      style={'color' in item && typeof item.color === 'string' ? { color: item.color } : undefined}
                    />
                    <span className="truncate">{item.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#71717A] dark:text-[#A1A1AA] flex-shrink-0">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#E5E5E3] dark:border-[#26262B] bg-[#FBFBFA] dark:bg-[#121215] flex items-center justify-between text-[11px] font-mono text-[#71717A] dark:text-[#A1A1AA]">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <span>Shelf Palette</span>
        </div>
      </div>
    </div>
  );
}
