'use client';

import React, { useState } from 'react';
import type { Bookmark, Category, TweetMedia } from '@/types/database';
import { formatDate } from '@/lib/utils';
import { LinkThumbnail } from './link-thumbnail';
import {
  Pin,
  Circle,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  FileText,
  Trash2,
  ChevronDown,
  Sparkles,
  Play,
  Globe,
} from 'lucide-react';

interface TweetCardProps {
  bookmark: Bookmark;
  categories: Category[];
  onTogglePin: (id: string, isPinned: boolean) => void;
  onToggleRead: (id: string, isRead: boolean) => void;
  onUpdateCategory: (id: string, categoryId: string | null) => void;
  onUpdateNote: (id: string, note: string) => void;
  onDelete: (id: string, tweetId?: string) => void;
  onSelectTag?: (tagName: string) => void;
}

function MediaAttachment({ media }: { media: TweetMedia }) {
  const [hasError, setHasError] = useState(false);
  const isVideo =
    media.type === 'video' ||
    media.type === 'gif' ||
    media.url?.includes('.mp4') ||
    media.url?.includes('video.twimg.com') ||
    media.url?.includes('/vid/');

  if (hasError) {
    return (
      <div className="w-full h-full bg-[#F4F4F3] dark:bg-[#26262B] flex items-center justify-center text-[#71717A] text-[11px]">
        <span>Media unavailable</span>
      </div>
    );
  }

  if (isVideo) {
    if (media.preview_url && !media.preview_url.includes('.mp4')) {
      return (
        <a
          href={media.url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative w-full h-full block bg-black group/video overflow-hidden"
          title="Watch video on X"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media.preview_url}
            alt={media.alt_text || 'Video thumbnail'}
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
            className="w-full h-full object-cover transition-transform group-hover/video:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/25 group-hover/video:bg-black/40 transition-colors flex items-center justify-center">
            <div className="w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center shadow backdrop-blur-sm">
              <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />
            </div>
          </div>
        </a>
      );
    }

    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
        <video
          src={media.url}
          poster={media.preview_url}
          controls
          preload="metadata"
          playsInline
          muted
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  // Photo
  const imgSrc = media.preview_url || media.url;
  return (
    <a
      href={media.url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative w-full h-full block bg-[#F4F4F3] dark:bg-[#26262B] overflow-hidden group/img"
      title={media.alt_text || 'View full image'}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt={media.alt_text || 'Tweet media attachment'}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className="w-full h-full object-cover transition-transform group-hover/img:scale-105"
        loading="lazy"
      />
    </a>
  );
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
  const suggestedCategory = categories.find((c) => c.id === bookmark.suggested_category_id);

  const handleSaveNote = () => {
    onUpdateNote(bookmark.id, noteText.trim());
    setIsEditingNote(false);
  };

  const hasMedia = Array.isArray(bookmark.media) && bookmark.media.length > 0;
  const primaryLink =
    Array.isArray(bookmark.links) && bookmark.links.length > 0
      ? bookmark.links[0]
      : null;
  const rawExtractedUrl = !primaryLink
    ? bookmark.text?.match(/https?:\/\/[^\s]+/i)?.[0]
    : null;
  const targetLinkUrl = primaryLink?.expanded_url || primaryLink?.url || rawExtractedUrl;
  const hasLinkPreview = !hasMedia && Boolean(targetLinkUrl);
  const hasVisual = hasMedia || hasLinkPreview;

  const authorHandleClean = bookmark.author_handle?.replace(/^@/, '') || '';
  const authorProfileUrl = authorHandleClean
    ? `https://x.com/${authorHandleClean}`
    : bookmark.tweet_url;

  return (
    <article className="group bg-white dark:bg-[#16161A] border border-[#E5E5E3] dark:border-[#26262B] hover:border-[#D4D4D1] dark:hover:border-[#383840] rounded-xl p-4 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between h-[390px] w-full overflow-hidden select-text">
      {/* Top Content Area (Scroll-free, fixed bounds) */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header: Author info & Action buttons */}
        <div className="flex items-start justify-between gap-2.5 mb-2.5 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Account Profile Image Link */}
            <a
              href={authorProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={authorHandleClean ? `@${authorHandleClean} on X` : 'View profile on X'}
              className="relative block flex-shrink-0 rounded-full group/avatar focus:outline-none"
            >
              {bookmark.author_avatar_url && !avatarError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bookmark.author_avatar_url}
                  alt={bookmark.author_name}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  onError={() => setAvatarError(true)}
                  className="w-9 h-9 rounded-full object-cover border border-[#E5E5E3] dark:border-[#26262B] group-hover/avatar:ring-2 group-hover/avatar:ring-sky-500/50 transition-all flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#F4F4F3] dark:bg-[#26262B] text-[#71717A] dark:text-[#A1A1AA] flex items-center justify-center font-medium text-xs border border-[#E5E5E3] dark:border-[#26262B] group-hover/avatar:ring-2 group-hover/avatar:ring-sky-500/50 transition-all flex-shrink-0">
                  {bookmark.author_name ? bookmark.author_name.charAt(0).toUpperCase() : 'X'}
                </div>
              )}
            </a>

            <div className="min-w-0">
              {/* Account Name & Handle Link */}
              <a
                href={authorProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={authorHandleClean ? `@${authorHandleClean} on X` : 'View profile on X'}
                className="group/author flex items-center gap-1.5 truncate focus:outline-none"
              >
                <span className="font-semibold text-xs text-[#18181B] dark:text-[#F4F4F5] truncate group-hover/author:text-sky-600 dark:group-hover/author:text-sky-400 transition-colors">
                  {bookmark.author_name || 'Anonymous'}
                </span>
                <span className="text-xs text-[#71717A] dark:text-[#A1A1AA] truncate group-hover/author:underline">
                  @{authorHandleClean || 'unknown'}
                </span>
              </a>
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
          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {/* Toggle Read */}
            <button
              onClick={() => onToggleRead(bookmark.id, !bookmark.is_read)}
              title={bookmark.is_read ? 'Mark as unread' : 'Mark as read'}
              className="p-1 rounded-md text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5] hover:bg-[#F4F4F3] dark:hover:bg-[#26262B] transition-colors"
            >
              {bookmark.is_read ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Toggle Pin */}
            <button
              onClick={() => onTogglePin(bookmark.id, !bookmark.is_pinned)}
              title={bookmark.is_pinned ? 'Unpin bookmark' : 'Pin bookmark'}
              className="p-1 rounded-md text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5] hover:bg-[#F4F4F3] dark:hover:bg-[#26262B] transition-colors"
            >
              <Pin
                className={`w-3.5 h-3.5 ${
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
              className="p-1 rounded-md text-[#71717A] dark:text-[#A1A1AA] hover:text-sky-600 dark:hover:text-sky-400 hover:bg-[#F4F4F3] dark:hover:bg-[#26262B] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Delete button */}
            <button
              onClick={() => {
                if (window.confirm('Delete this bookmark from your library?')) {
                  onDelete(bookmark.id, bookmark.tweet_id);
                }
              }}
              title="Delete bookmark"
              className="p-1 rounded-md text-[#71717A] dark:text-[#A1A1AA] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tweet Body Content (Truncated to fixed size) */}
        <div
          title={bookmark.text}
          className={`text-sm leading-relaxed text-[#18181B] dark:text-[#F4F4F5] break-words font-normal ${
            hasVisual ? 'line-clamp-2 md:line-clamp-3' : 'line-clamp-6'
          }`}
          style={{
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: hasVisual ? 3 : 6,
            overflow: 'hidden',
          }}
        >
          {bookmark.text}
        </div>

        {/* Visual Preview: Native Media or Link Thumbnail (Fixed 150px container size) */}
        {hasMedia ? (
          <div className="h-[150px] w-full rounded-lg overflow-hidden border border-[#E5E5E3] dark:border-[#26262B] flex-shrink-0 mt-2 bg-[#F4F4F3] dark:bg-[#26262B]">
            {bookmark.media.length === 1 ? (
              <MediaAttachment media={bookmark.media[0]} />
            ) : bookmark.media.length === 2 ? (
              <div className="grid grid-cols-2 gap-1 h-full w-full">
                <MediaAttachment media={bookmark.media[0]} />
                <MediaAttachment media={bookmark.media[1]} />
              </div>
            ) : (
              <div className="grid grid-cols-2 grid-rows-2 gap-1 h-full w-full">
                {bookmark.media.slice(0, 4).map((m, index) => (
                  <div key={index} className="relative w-full h-full overflow-hidden">
                    <MediaAttachment media={m} />
                    {index === 3 && bookmark.media.length > 4 && (
                      <div className="absolute inset-0 bg-black/60 text-white font-medium text-xs flex items-center justify-center pointer-events-none">
                        +{bookmark.media.length - 3}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : hasLinkPreview && targetLinkUrl ? (
          <LinkThumbnail
            link={primaryLink}
            url={targetLinkUrl}
            bookmarkId={bookmark.id}
            variant="card"
          />
        ) : null}

        {/* Embedded External Links (Compact single line if media present or multiple links) */}
        {hasMedia && Array.isArray(bookmark.links) && bookmark.links.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5 max-w-full flex-shrink-0">
            <a
              href={bookmark.links[0].expanded_url || bookmark.links[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded bg-[#F4F4F3] dark:bg-[#1F1F24] border border-[#E5E5E3] dark:border-[#26262B] text-sky-700 dark:text-sky-300 hover:underline max-w-full truncate"
              title={bookmark.links[0].expanded_url || bookmark.links[0].url}
            >
              <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{bookmark.links[0].title || bookmark.links[0].display_url || bookmark.links[0].url}</span>
            </a>
            {bookmark.links.length > 1 && (
              <span className="text-[10px] text-[#71717A] dark:text-[#A1A1AA] flex-shrink-0">
                +{bookmark.links.length - 1}
              </span>
            )}
          </div>
        )}

        {/* Additional links indicator if link preview is shown and there are multiple links */}
        {hasLinkPreview && bookmark.links && bookmark.links.length > 1 && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-[#71717A] dark:text-[#A1A1AA] flex-shrink-0">
            <span>+{bookmark.links.length - 1} more link{bookmark.links.length > 2 ? 's' : ''}</span>
          </div>
        )}

        {/* Note section */}
        {isEditingNote ? (
          <div className="mt-2 p-2 rounded-lg border border-[#E5E5E3] dark:border-[#26262B] bg-[#FBFBFA] dark:bg-[#121215] flex-shrink-0">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a personal note..."
              rows={2}
              className="w-full p-1 text-xs bg-transparent border-0 focus:outline-none text-[#18181B] dark:text-[#F4F4F5] resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-1">
              <button
                onClick={() => {
                  setNoteText(bookmark.note || '');
                  setIsEditingNote(false);
                }}
                className="px-2 py-0.5 text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="px-2.5 py-0.5 text-[11px] font-medium rounded bg-[#18181B] dark:bg-[#F4F4F5] text-white dark:text-[#18181B]"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          bookmark.note && (
            <div
              onClick={() => setIsEditingNote(true)}
              className="mt-2 p-1.5 rounded-lg border border-[#E5E5E3] dark:border-[#26262B] bg-[#FBFBFA] dark:bg-[#121215] text-[11px] text-[#71717A] dark:text-[#A1A1AA] cursor-pointer hover:border-sky-500/50 transition-colors flex items-center gap-1.5 truncate flex-shrink-0"
              title={bookmark.note}
            >
              <FileText className="w-3 h-3 text-sky-600 dark:text-sky-400 flex-shrink-0" />
              <p className="truncate text-[#18181B] dark:text-[#E4E4E7]">
                {bookmark.note}
              </p>
            </div>
          )
        )}
      </div>

      {/* Footer: Category Selector, Tags & Note trigger */}
      <div className="pt-2.5 mt-auto border-t border-[#E5E5E3]/60 dark:border-[#26262B]/60 flex items-center justify-between gap-2 text-xs flex-shrink-0">
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          {/* Category Chip / Dropdown */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-[#E5E5E3] dark:border-[#26262B] bg-[#F4F4F3]/60 dark:bg-[#1F1F24] hover:bg-[#E5E5E3]/60 dark:hover:bg-[#26262B] text-[11px] font-medium transition-colors"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: currentCategory?.color || '#71717A' }}
              />
              <span className="text-[#18181B] dark:text-[#F4F4F5] truncate max-w-[100px]">
                {currentCategory?.name || 'Uncategorized'}
              </span>
              <ChevronDown className="w-2.5 h-2.5 text-[#71717A] flex-shrink-0" />
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

          {/* AI Category Suggestion Pill */}
          {suggestedCategory && bookmark.suggested_category_id !== bookmark.category_id && (
            <div
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-[10px] text-sky-700 dark:text-sky-300 transition-colors flex-shrink-0 truncate max-w-[130px]"
              title={bookmark.suggestion_reason || 'AI recommendation'}
            >
              <Sparkles className="w-2.5 h-2.5 text-sky-500 flex-shrink-0" />
              <span className="truncate">
                {suggestedCategory.name}
              </span>
              <button
                onClick={() => onUpdateCategory(bookmark.id, suggestedCategory.id)}
                className="ml-0.5 font-semibold text-sky-600 dark:text-sky-400 hover:underline flex-shrink-0"
              >
                Accept
              </button>
            </div>
          )}

          {/* Tags */}
          {Array.isArray(bookmark.tags) &&
            bookmark.tags.slice(0, 2).map((tag) => (
              <button
                key={tag.id}
                onClick={() => onSelectTag?.(tag.name)}
                className="inline-flex items-center gap-0.5 text-[11px] text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5] truncate flex-shrink-0"
              >
                <span>#{tag.name}</span>
              </button>
            ))}
        </div>

        {/* Add Note trigger if no note exists */}
        {!bookmark.note && !isEditingNote && (
          <button
            onClick={() => setIsEditingNote(true)}
            className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5] flex items-center gap-1 flex-shrink-0 ml-auto"
          >
            <FileText className="w-3 h-3" />
            <span>Note</span>
          </button>
        )}
      </div>
    </article>
  );
}
