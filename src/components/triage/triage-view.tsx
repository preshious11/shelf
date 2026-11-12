'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Bookmark, Category } from '@/types/database';
import { formatDate } from '@/lib/utils';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Check,
  SkipForward,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  ListFilter,
  Play,
} from 'lucide-react';

interface TriageViewProps {
  bookmarks: Bookmark[];
  categories: Category[];
  onAcceptSuggestion: (id: string, categoryId: string) => Promise<void>;
  onAssignCategory: (id: string, categoryId: string) => Promise<void>;
  onBulkAccept: (confidenceThreshold: number) => Promise<void>;
  onExitTriage: () => void;
  onTriggerSuggestions?: () => Promise<void>;
  isSuggesting?: boolean;
  suggestionNotice?: string | null;
}

export function TriageView({
  bookmarks,
  categories,
  onAcceptSuggestion,
  onAssignCategory,
  onBulkAccept,
  onExitTriage,
  onTriggerSuggestions,
  isSuggesting = false,
  suggestionNotice,
}: TriageViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Keep index in range
  const total = bookmarks.length;
  const currentBookmark = total > 0 ? bookmarks[Math.min(currentIndex, total - 1)] : null;

  const handleNext = useCallback(() => {
    if (currentIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, total]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleAcceptCurrent = useCallback(async () => {
    if (!currentBookmark || actionLoading) return;
    const catId = currentBookmark.suggested_category_id || currentBookmark.category_id;
    if (!catId) return;

    setActionLoading(true);
    try {
      await onAcceptSuggestion(currentBookmark.id, catId);
      // currentIndex stays same because the item was removed from the to_sort list
    } finally {
      setActionLoading(false);
    }
  }, [currentBookmark, actionLoading, onAcceptSuggestion]);

  const handleAssignCategory = useCallback(
    async (categoryId: string) => {
      if (!currentBookmark || actionLoading) return;
      setActionLoading(true);
      try {
        await onAssignCategory(currentBookmark.id, categoryId);
      } finally {
        setActionLoading(false);
      }
    },
    [currentBookmark, actionLoading, onAssignCategory]
  );

  // Global Keyboard Shortcuts for Triage
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Enter -> Accept suggestion
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAcceptCurrent();
        return;
      }

      // 's' or 'S' -> Skip to next
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleNext();
        return;
      }

      // Left arrow -> Previous
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
        return;
      }

      // Right arrow -> Next
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
        return;
      }

      // Number keys 1-9 -> Assign category by position
      if (/^[1-9]$/.test(e.key)) {
        const catIdx = parseInt(e.key, 10) - 1;
        if (catIdx < categories.length) {
          e.preventDefault();
          handleAssignCategory(categories[catIdx].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleAcceptCurrent,
    handleNext,
    handlePrev,
    handleAssignCategory,
    categories,
  ]);

  // High confidence items available for bulk action
  const highConfidenceCount = bookmarks.filter(
    (b) =>
      b.suggested_category_id &&
      b.suggestion_confidence &&
      b.suggestion_confidence >= 0.8
  ).length;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-sm">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-semibold text-[#18181B] dark:text-[#F4F4F5]">
          All sorted
        </h2>
        <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] max-w-sm mt-1.5 leading-relaxed">
          You have reviewed every bookmark in your triage queue.
        </p>
        <button
          onClick={onExitTriage}
          className="mt-6 px-4 py-2 text-xs font-medium rounded-lg bg-[#18181B] dark:bg-[#F4F4F5] text-white dark:text-[#18181B] hover:bg-[#27272A] dark:hover:bg-white transition-colors"
        >
          Return to Library
        </button>
      </div>
    );
  }

  const suggestedCat = categories.find(
    (c) => c.id === currentBookmark?.suggested_category_id
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onExitTriage}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Library</span>
        </button>

        <div className="flex items-center gap-3">
          {onTriggerSuggestions && (
            <button
              onClick={onTriggerSuggestions}
              disabled={isSuggesting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E5E3] dark:border-[#26262B] bg-white dark:bg-[#16161A] text-[#18181B] dark:text-[#F4F4F5] hover:bg-[#F4F4F3] dark:hover:bg-[#26262B] transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>{isSuggesting ? 'Thinking...' : 'AI Suggest Categories'}</span>
            </button>
          )}

          <div className="text-xs font-mono text-[#71717A] dark:text-[#A1A1AA]">
            {currentIndex + 1} of {total}
          </div>
        </div>
      </div>

      {/* Quiet notice when AI suggestions fail or are unavailable */}
      {suggestionNotice && (
        <div className="px-3.5 py-2 rounded-lg border border-[#E5E5E3] dark:border-[#26262B] bg-[#F4F4F3]/60 dark:bg-[#1A1A20] text-xs text-[#71717A] dark:text-[#A1A1AA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-400 dark:bg-stone-500" />
            <span>{suggestionNotice}</span>
          </div>
          <span className="text-[11px] font-mono">Manual sorting active</span>
        </div>
      )}

      {/* Main Focus Card */}
      {currentBookmark && (
        <div className="bg-white dark:bg-[#16161A] border border-[#E5E5E3] dark:border-[#26262B] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Author bar */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E3]/60 dark:border-[#26262B]/60">
            <div className="flex items-center gap-3">
              {currentBookmark.author_avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentBookmark.author_avatar_url}
                  alt={currentBookmark.author_name}
                  className="w-10 h-10 rounded-full object-cover border border-[#E5E5E3] dark:border-[#26262B]"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#F4F4F3] dark:bg-[#26262B] text-[#71717A] dark:text-[#A1A1AA] flex items-center justify-center font-medium text-xs">
                  {currentBookmark.author_name?.charAt(0) || 'X'}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[#18181B] dark:text-[#F4F4F5]">
                    {currentBookmark.author_name}
                  </span>
                  <span className="text-xs text-[#71717A] dark:text-[#A1A1AA]">
                    @{currentBookmark.author_handle}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                  <span>{formatDate(currentBookmark.posted_at || currentBookmark.saved_at)}</span>
                  {currentBookmark.is_thread && (
                    <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium">
                      <MessageSquare className="w-2.5 h-2.5" />
                      <span>Thread</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <a
              href={currentBookmark.tweet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#71717A] dark:text-[#A1A1AA] hover:text-sky-600 dark:hover:text-sky-400"
            >
              <span>x.com</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Tweet body */}
          <div className="text-base leading-relaxed text-[#18181B] dark:text-[#F4F4F5] whitespace-pre-wrap break-words max-w-reading">
            {currentBookmark.text}
          </div>

          {/* Media previews */}
          {Array.isArray(currentBookmark.media) && currentBookmark.media.length > 0 && (
            <div
              className={`grid gap-2 rounded-xl overflow-hidden ${
                currentBookmark.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
              }`}
            >
              {currentBookmark.media.map((m, idx) => {
                const isVideo =
                  m.type === 'video' ||
                  m.type === 'gif' ||
                  m.url?.includes('.mp4') ||
                  m.url?.includes('video.twimg.com') ||
                  m.url?.includes('/vid/');

                return (
                  <div
                    key={idx}
                    className="aspect-video bg-[#F4F4F3] dark:bg-[#26262B] rounded-lg overflow-hidden border border-[#E5E5E3] dark:border-[#26262B] relative group/media"
                  >
                    {isVideo ? (
                      m.preview_url && !m.preview_url.includes('.mp4') ? (
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full h-full block relative"
                          title="Watch video"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={m.preview_url}
                            alt={m.alt_text || 'Video thumbnail'}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/30 group-hover/media:bg-black/45 transition-colors flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center shadow">
                              <Play className="w-5 h-5 fill-white translate-x-0.5" />
                            </div>
                          </div>
                        </a>
                      ) : (
                        <video
                          src={m.url}
                          controls
                          preload="metadata"
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                      )
                    ) : (
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-full block"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.preview_url || m.url}
                          alt={m.alt_text || 'Media attachment'}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Gemini AI Suggestion Box */}
          {suggestedCat ? (
            <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span className="text-xs font-semibold text-sky-950 dark:text-sky-200">
                    Suggested: {suggestedCat.name}
                  </span>
                  {currentBookmark.suggestion_confidence && (
                    <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-sky-200/60 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200">
                      {Math.round(currentBookmark.suggestion_confidence * 100)}% confidence
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-sky-900 dark:text-sky-300 font-mono">
                  <span>Press</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#16161A] border border-sky-300 dark:border-sky-800 shadow-xs font-semibold">
                    ↵ Enter
                  </kbd>
                  <span>to accept</span>
                </div>
              </div>

              {currentBookmark.suggestion_reason && (
                <p className="text-xs text-sky-900/80 dark:text-sky-300/80 leading-relaxed">
                  {currentBookmark.suggestion_reason}
                </p>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-[#E5E5E3] dark:border-[#26262B] bg-[#F4F4F3]/50 dark:bg-[#1F1F24]/50 flex items-center justify-between text-xs text-[#71717A] dark:text-[#A1A1AA]">
              <span>No AI suggestion available for this tweet yet.</span>
              <span className="text-[11px] font-mono">Pick 1-9 below</span>
            </div>
          )}

          {/* Actions & Hotkeys Bar */}
          <div className="pt-4 border-t border-[#E5E5E3]/60 dark:border-[#26262B]/60 space-y-4">
            {/* Primary actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {suggestedCat && (
                  <button
                    onClick={handleAcceptCurrent}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept {suggestedCat.name} (↵)</span>
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[#E5E5E3] dark:border-[#26262B] bg-white dark:bg-[#16161A] text-[#18181B] dark:text-[#F4F4F5] hover:bg-[#F4F4F3] dark:hover:bg-[#26262B] transition-colors"
                >
                  <SkipForward className="w-3.5 h-3.5 text-[#71717A]" />
                  <span>Skip (S)</span>
                </button>
              </div>

              {/* Prev / Next arrows */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="p-2 rounded-lg border border-[#E5E5E3] dark:border-[#26262B] bg-white dark:bg-[#16161A] text-[#18181B] dark:text-[#F4F4F5] disabled:opacity-40 hover:bg-[#F4F4F3] dark:hover:bg-[#26262B]"
                  title="Previous (←)"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentIndex >= total - 1}
                  className="p-2 rounded-lg border border-[#E5E5E3] dark:border-[#26262B] bg-white dark:bg-[#16161A] text-[#18181B] dark:text-[#F4F4F5] disabled:opacity-40 hover:bg-[#F4F4F3] dark:hover:bg-[#26262B]"
                  title="Next (→)"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick 1-9 Category Picker */}
            <div>
              <div className="text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-wider mb-2">
                Or assign category directly (keys 1-9):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                {categories.slice(0, 9).map((cat, idx) => (
                  <button
                    key={cat.id}
                    onClick={() => handleAssignCategory(cat.id)}
                    disabled={actionLoading}
                    className="flex items-center justify-between p-2 rounded-lg border border-[#E5E5E3] dark:border-[#26262B] hover:border-sky-500/50 bg-[#FBFBFA] dark:bg-[#121215] text-left transition-colors group"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs text-[#18181B] dark:text-[#F4F4F5] truncate">
                        {cat.name}
                      </span>
                    </div>
                    <kbd className="text-[10px] font-mono px-1 rounded bg-[#E5E5E3]/80 dark:bg-[#26262B] text-[#71717A] dark:text-[#A1A1AA] group-hover:text-[#18181B] dark:group-hover:text-white">
                      {idx + 1}
                    </kbd>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Accept Option */}
      {highConfidenceCount > 0 && (
        <div className="p-4 rounded-xl border border-[#E5E5E3] dark:border-[#26262B] bg-white dark:bg-[#16161A] flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-[#18181B] dark:text-[#F4F4F5]">
              Bulk Triage
            </div>
            <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
              {highConfidenceCount} {highConfidenceCount === 1 ? 'bookmark has' : 'bookmarks have'} AI confidence of 80% or higher.
            </p>
          </div>

          <button
            onClick={async () => {
              setBulkLoading(true);
              try {
                await onBulkAccept(0.8);
              } finally {
                setBulkLoading(false);
              }
            }}
            disabled={bulkLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[#18181B] dark:bg-[#F4F4F5] text-white dark:text-[#18181B] hover:bg-[#27272A] dark:hover:bg-white transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{bulkLoading ? 'Applying...' : `Accept all above 80% (${highConfidenceCount})`}</span>
          </button>
        </div>
      )}
    </div>
  );
}

