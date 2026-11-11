'use client';

import React from 'react';
import Link from 'next/link';
import { Bookmark, Sparkles, Inbox, Download, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  type: 'no_bookmarks' | 'no_search_results' | 'no_to_sort' | 'no_filter_results';
  searchQuery?: string;
  onClearFilters?: () => void;
  onOpenImport?: () => void;
}

export function EmptyState({
  type,
  searchQuery,
  onClearFilters,
  onOpenImport,
}: EmptyStateProps) {
  if (type === 'no_to_sort') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
          <Inbox className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-[#18181B] dark:text-[#F4F4F5]">
          All sorted
        </h3>
        <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] max-w-sm mt-1.5 leading-relaxed">
          Your triage queue is completely clear. Newly captured bookmarks from your browser extension will land here.
        </p>
      </div>
    );
  }

  if (type === 'no_search_results') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <h3 className="text-base font-semibold text-[#18181B] dark:text-[#F4F4F5]">
          No bookmarks match &ldquo;{searchQuery}&rdquo;
        </h3>
        <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] max-w-sm mt-1.5 leading-relaxed">
          Try different keywords, search by author handle, or clear your search query.
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="mt-4 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E5E3] dark:border-[#26262B] bg-white dark:bg-[#16161A] text-[#18181B] dark:text-[#F4F4F5] hover:bg-[#F4F4F3] dark:hover:bg-[#26262B]"
          >
            Clear search
          </button>
        )}
      </div>
    );
  }

  if (type === 'no_filter_results') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <h3 className="text-base font-semibold text-[#18181B] dark:text-[#F4F4F5]">
          No bookmarks match the active filters
        </h3>
        <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] max-w-sm mt-1.5 leading-relaxed">
          Adjust or reset your category, tag, media, or thread filters to view your saved items.
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="mt-4 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E5E3] dark:border-[#26262B] bg-white dark:bg-[#16161A] text-[#18181B] dark:text-[#F4F4F5] hover:bg-[#F4F4F3] dark:hover:bg-[#26262B]"
          >
            Reset filters
          </button>
        )}
      </div>
    );
  }

  // no_bookmarks (Initial empty library)
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg mx-auto">
      <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-4">
        <Bookmark className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-[#18181B] dark:text-[#F4F4F5]">
        Your library is empty
      </h3>
      <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-1.5 leading-relaxed">
        Start saving your X bookmarks using the Chrome extension or import a JSON export.
      </p>

      {/* Guidance Cards */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 text-left">
        <div className="p-4 rounded-xl border border-[#E5E5E3] dark:border-[#26262B] bg-white dark:bg-[#16161A]">
          <div className="text-xs font-semibold text-[#18181B] dark:text-[#F4F4F5] mb-1">
            1. Install Chrome Extension
          </div>
          <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] leading-normal mb-3">
            Load the extension in Developer Mode, paste your API token from Settings, and capture directly on x.com/i/bookmarks.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline"
          >
            <span>Generate API Token</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="p-4 rounded-xl border border-[#E5E5E3] dark:border-[#26262B] bg-white dark:bg-[#16161A]">
          <div className="text-xs font-semibold text-[#18181B] dark:text-[#F4F4F5] mb-1">
            2. Import Existing Data
          </div>
          <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] leading-normal mb-3">
            Already have bookmarks in a JSON export? Import them directly with one click.
          </p>
          {onOpenImport ? (
            <button
              onClick={onOpenImport}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline"
            >
              <Download className="w-3 h-3" />
              <span>Import JSON</span>
            </button>
          ) : (
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline"
            >
              <span>Go to Settings</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

