'use client';

import React, { useState, useEffect } from 'react';
import type { TweetLink } from '@/types/database';
import { ExternalLink, Globe } from 'lucide-react';

interface LinkThumbnailProps {
  link?: TweetLink | null;
  url: string;
  bookmarkId?: string;
  variant?: 'card' | 'triage';
}

interface PreviewState {
  image?: string;
  title?: string;
  domain?: string;
  description?: string;
  favicon?: string;
}

// Client-side cache across component re-renders
const linkPreviewCache = new Map<string, PreviewState>();
const inFlightRequests = new Map<string, Promise<PreviewState | null>>();

export function LinkThumbnail({
  link,
  url,
  variant = 'card',
}: LinkThumbnailProps) {
  // Initial state check
  const [preview, setPreview] = useState<PreviewState | null>(() => {
    if (link?.thumbnail_url) {
      return {
        image: link.thumbnail_url,
        title: link.title,
        domain: link.domain || (link.display_url ? link.display_url.split('/')[0] : undefined),
        description: link.description,
      };
    }
    if (url && linkPreviewCache.has(url)) {
      return linkPreviewCache.get(url)!;
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(!preview && Boolean(url));
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    // If we already have a thumbnail from link or cache, don't fetch
    if (link?.thumbnail_url) {
      setPreview({
        image: link.thumbnail_url,
        title: link.title,
        domain: link.domain || (link.display_url ? link.display_url.split('/')[0] : undefined),
        description: link.description,
      });
      setIsLoading(false);
      return;
    }

    if (!url) {
      setIsLoading(false);
      return;
    }

    if (linkPreviewCache.has(url)) {
      setPreview(linkPreviewCache.get(url)!);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    // Reuse or create in-flight promise to avoid duplicate concurrent fetches
    let requestPromise = inFlightRequests.get(url);
    if (!requestPromise) {
      requestPromise = fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: PreviewState | null) => {
          if (data) {
            linkPreviewCache.set(url, data);
          }
          inFlightRequests.delete(url);
          return data;
        })
        .catch(() => {
          inFlightRequests.delete(url);
          return null;
        });

      inFlightRequests.set(url, requestPromise);
    }

    requestPromise.then((data) => {
      if (!isMounted) return;
      if (data) {
        setPreview({
          image: data.image,
          title: data.title || link?.title,
          domain: data.domain || link?.display_url,
          description: data.description,
          favicon: data.favicon,
        });
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [url, link?.thumbnail_url, link?.title, link?.display_url, link?.domain, link?.description]);

  const displayDomain =
    preview?.domain ||
    link?.domain ||
    (link?.display_url ? link.display_url.split('/')[0] : '') ||
    (() => {
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch {
        return '';
      }
    })();

  const displayTitle =
    preview?.title ||
    link?.title ||
    link?.display_url ||
    displayDomain ||
    'External Link';

  const containerHeightClass = variant === 'triage' ? 'aspect-video w-full' : 'h-[150px] w-full';

  // 1. Loading Skeleton state
  if (isLoading) {
    return (
      <div
        className={`${containerHeightClass} rounded-lg overflow-hidden border border-[#E5E5E3] dark:border-[#26262B] flex-shrink-0 mt-2 bg-[#F4F4F3] dark:bg-[#26262B] animate-pulse flex flex-col justify-between p-3.5`}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#E5E5E3] dark:bg-[#3F3F46]" />
          <div className="w-24 h-3 rounded bg-[#E5E5E3] dark:bg-[#3F3F46]" />
        </div>
        <div className="space-y-1.5">
          <div className="w-3/4 h-3.5 rounded bg-[#E5E5E3] dark:bg-[#3F3F46]" />
          <div className="w-1/2 h-2.5 rounded bg-[#E5E5E3] dark:bg-[#3F3F46]" />
        </div>
      </div>
    );
  }

  // 2. Rich Thumbnail image loaded
  if (preview?.image && !hasImageError) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={displayTitle}
        className={`group/link-thumb relative ${containerHeightClass} rounded-lg overflow-hidden border border-[#E5E5E3] dark:border-[#26262B] flex-shrink-0 mt-2 bg-[#18181B] block`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview.image}
          alt={displayTitle}
          referrerPolicy="no-referrer"
          onError={() => setHasImageError(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover/link-thumb:scale-105"
          loading="lazy"
        />
        {/* Gradient overlay for domain pill & title readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-2.5 pointer-events-none">
          {displayDomain && (
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-white/90 tracking-wide uppercase">
              <ExternalLink className="w-3 h-3 text-sky-400 flex-shrink-0" />
              <span className="truncate">{displayDomain}</span>
            </div>
          )}
          <div className="text-xs font-medium text-white truncate drop-shadow-sm mt-0.5">
            {displayTitle}
          </div>
        </div>
      </a>
    );
  }

  // 3. Fallback preview banner when no thumbnail is available
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={displayTitle}
      className={`group/link-thumb relative ${containerHeightClass} rounded-lg overflow-hidden border border-[#E5E5E3] dark:border-[#26262B] flex-shrink-0 mt-2 bg-gradient-to-br from-[#F4F4F3] to-[#EAEAE8] dark:from-[#1F1F24] dark:to-[#18181B] flex flex-col justify-between p-3.5 hover:border-sky-500/50 transition-colors block`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-sky-600 dark:text-sky-400 truncate">
          <Globe className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="font-semibold uppercase tracking-wider text-[10px] truncate">
            {displayDomain || 'Website'}
          </span>
        </div>
        <div className="p-1 rounded-full bg-white dark:bg-[#26262B] text-[#71717A] dark:text-[#A1A1AA] group-hover/link-thumb:text-sky-600 dark:group-hover/link-thumb:text-sky-400 shadow-xs transition-colors flex-shrink-0">
          <ExternalLink className="w-3 h-3" />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-[#18181B] dark:text-[#F4F4F5] line-clamp-2 leading-snug group-hover/link-thumb:text-sky-600 dark:group-hover/link-thumb:text-sky-400 transition-colors">
          {displayTitle}
        </h4>
        {preview?.description && (
          <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] line-clamp-1 mt-1">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}
