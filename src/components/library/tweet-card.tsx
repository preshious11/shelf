'use client';

import React, { useState } from 'react';
import type { Bookmark, Category } from '@/types/database';
import { formatDate } from '@/lib/utils';
import {
  Pin,
  Circle,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  FileText,
  Trash2,
  Folder,
  Tag as TagIcon,
  ChevronDown,
} from 'lucide-react';

interface TweetCardProps {
  bookmark: Bookmark;
  categories: Category[];
  onTogglePin: (id: string, isPinned: boolean) => void;
  onToggleRead: (id: string, isRead: boolean) => void;
  onUpdateCategory: (id: string, categoryId: string | null) => void;
  onUpdateNote: (id: string, note: string) => void;
  onDelete: (id: string) => void;
  onSelectTag?: (tagName: string) => void;
}

export function TweetCard({
  bookmark,
  categories,
  onTogglePin,
  onToggleRead,
  onUpdateCategory,
  onUpdateNote,
  onDelete,
  onSelectTag,
}: TweetCardProps) {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(bookmark.note || '');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const currentCategory = categories.find((c) => c.id === bookmark.category_id);

  const handleSaveNote = () => {
    onUpdateNote(bookmark.id, noteText.trim());
    setIsEditingNote(false);
  };

  return (
    <article className="group bg-white dark:bg-[#16161A] border border-[#E5E5E3] dark:border-[#26262B] hover:border-[#D4D4D1] dark:hover:border-[#383840] rounded-xl p-5 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
      <div>
        {/* Header: Author info & Action buttons */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {bookmark.author_avatar_url && !avatarError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bookmark.author_avatar_url}
                alt={bookmark.author_name}
                onError={() => setAvatarError(true)}
                className="w-9 h-9 rounded-full object-cover border border-[#E5E5E3] dark:border-[#26262B] flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#F4F4F3] dark:bg-[#26262B] text-[#71717A] dark:text-[#A1A1AA] flex items-center justify-center font-medium text-xs border border-[#E5E5E3] dark:border-[#26262B] flex-shrink-0">
                {bookmark.author_name ? bookmark.author_name.charAt(0).toUpperCase() : 'X'}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-semibold text-xs text-[#18181B] dark:text-[#F4F4F5] truncate">
                  {bookmark.author_name || 'Anonymous'}
                </span>
                <span className="text-xs text-[#71717A] dark:text-[#A1A1AA] truncate">
                  @{bookmark.author_handle || 'unknown'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                <span>{formatDate(bookmark.posted_at || bookmark.saved_at)}</span>
                {bookmark.is_thread && (
                  <span className="inline-flex items-center gap-0.5 text-sky-600 dark:text-sky-400 font-medium">
                    <MessageSquare className="w-2.5 h-2.5" />
                    <span>Thread</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
            {/* Toggle Read */}
            <button
              onClick={() => onToggleRead(bookmark.id, !bookmark.is_read)}
              title={bookmark.is_read ? 'Mark as unread' : 'Mark as read'}
              className="p-1.5 rounded-md text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5] hover:bg-[#F4F4F3] dark:hover:bg-[#26262B] transition-colors"
            >
              {bookmark.is_read ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </button>

            {/* Toggle Pin */}
            <button
              onClick={() => onTogglePin(bookmark.id, !bookmark.is_pinned)}
              title={bookmark.is_pinned ? 'Unpin bookmark' : 'Pin bookmark'}
              className="p-1.5 rounded-md text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5] hover:bg-[#F4F4F3] dark:hover:bg-[#26262B] transition-colors"
            >
              <Pin
                className={`w-4 h-4 ${
                  bookmark.is_pinned
                    ? 'text-amber-500 fill-amber-500'
                    : ''
                }`}
              />
            </button>

            {/* External link to x.com */}
            <a
              href={bookmark.tweet_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open tweet on x.com"
              className="p-1.5 rounded-md text-[#71717A] dark:text-[#A1A1AA] hover:text-sky-600 dark:hover:text-sky-400 hover:bg-[#F4F4F3] dark:hover:bg-[#26262B] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Delete button */}
            <button
              onClick={() => {
                if (window.confirm('Delete this bookmark from your library?')) {
                  onDelete(bookmark.id);
                }
              }}
              title="Delete bookmark"
              className="p-1.5 rounded-md text-[#71717A] dark:text-[#A1A1AA] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tweet Body Content */}
        <div className="text-sm leading-relaxed text-[#18181B] dark:text-[#F4F4F5] whitespace-pre-wrap break-words max-w-reading mb-4 font-normal">
          {bookmark.text}
        </div>

        {/* Media Attachments Preview */}
        {Array.isArray(bookmark.media) && bookmark.media.length > 0 && (
          <div
            className={`grid gap-2 mb-4 rounded-lg overflow-hidden ${
              bookmark.media.length === 1
                ? 'grid-cols-1'
                : bookmark.media.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-2'
            }`}
          >
            {bookmark.media.slice(0, 4).map((m, index) => (
              <a
                key={index}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative aspect-video bg-[#F4F4F3] dark:bg-[#26262B] overflow-hidden rounded-md border border-[#E5E5E3] dark:border-[#26262B] group/img"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt={m.alt_text || 'Tweet media attachment'}
                  className="w-full h-full object-cover transition-transform group-hover/img:scale-105"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        )}

        {/* Embedded External Links */}
        {Array.isArray(bookmark.links) && bookmark.links.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {bookmark.links.map((link, idx) => (
              <a
                key={idx}
                href={link.expanded_url || link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-[#F4F4F3] dark:bg-[#1F1F24] border border-[#E5E5E3] dark:border-[#26262B] text-sky-700 dark:text-sky-300 hover:underline max-w-full truncate"
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{link.title || link.display_url || link.url}</span>
              </a>
            ))}
          </div>
        )}

        {/* Note section */}
        {isEditingNote ? (
          <div className="mb-3 p-2.5 rounded-lg border border-[#E5E5E3] dark:border-[#26262B] bg-[#FBFBFA] dark:bg-[#121215]">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a personal note..."
              rows={2}
              className="w-full p-1.5 text-xs bg-transparent border-0 focus:outline-none text-[#18181B] dark:text-[#F4F4F5] resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-1">
              <button
                onClick={() => {
                  setNoteText(bookmark.note || '');
                  setIsEditingNote(false);
                }}
                className="px-2 py-1 text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="px-2.5 py-1 text-[11px] font-medium rounded bg-[#18181B] dark:bg-[#F4F4F5] text-white dark:text-[#18181B]"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          bookmark.note && (
            <div
              onClick={() => setIsEditingNote(true)}
              className="mb-3 p-2.5 rounded-lg border border-[#E5E5E3] dark:border-[#26262B] bg-[#FBFBFA] dark:bg-[#121215] text-xs text-[#71717A] dark:text-[#A1A1AA] cursor-pointer hover:border-sky-500/50 transition-colors flex items-start gap-2"
            >
              <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 mt-0.5 flex-shrink-0" />
              <p className="leading-relaxed text-[#18181B] dark:text-[#E4E4E7]">
                {bookmark.note}
              </p>
            </div>
          )
        )}
      </div>

      {/* Footer: Category Selector, Tags & Note trigger */}
      <div className="pt-3 border-t border-[#E5E5E3]/60 dark:border-[#26262B]/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Chip / Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-[#E5E5E3] dark:border-[#26262B] bg-[#F4F4F3]/60 dark:bg-[#1F1F24] hover:bg-[#E5E5E3]/60 dark:hover:bg-[#26262B] text-[11px] font-medium transition-colors"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: currentCategory?.color || '#71717A' }}
              />
              <span className="text-[#18181B] dark:text-[#F4F4F5]">
                {currentCategory?.name || 'Uncategorized'}
              </span>
              <ChevronDown className="w-2.5 h-2.5 text-[#71717A]" />
            </button>

            {showCategoryMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowCategoryMenu(false)}
                />
                <div className="absolute left-0 bottom-full mb-1 z-40 w-48 max-h-56 overflow-y-auto bg-white dark:bg-[#16161A] border border-[#E5E5E3] dark:border-[#26262B] rounded-lg shadow-lg py-1">
                  <button
                    onClick={() => {
                      onUpdateCategory(bookmark.id, null);
                      setShowCategoryMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-[#71717A] dark:text-[#A1A1AA] hover:bg-[#F4F4F3] dark:hover:bg-[#26262B]"
                  >
                    No category
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onUpdateCategory(bookmark.id, c.id);
                        setShowCategoryMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#18181B] dark:text-[#F4F4F5] hover:bg-[#F4F4F3] dark:hover:bg-[#26262B]"
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Tags */}
          {Array.isArray(bookmark.tags) &&
            bookmark.tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => onSelectTag?.(tag.name)}
                className="inline-flex items-center gap-1 text-[11px] text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5]"
              >
                <span>#{tag.name}</span>
              </button>
            ))}
        </div>

        {/* Add Note trigger if no note exists */}
        {!bookmark.note && !isEditingNote && (
          <button
            onClick={() => setIsEditingNote(true)}
            className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5] flex items-center gap-1"
          >
            <FileText className="w-3 h-3" />
            <span>Add note</span>
          </button>
        )}
      </div>
    </article>
  );
}

