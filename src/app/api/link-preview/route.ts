import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory cache for link previews to prevent redundant external fetches
const memoryCache = new Map<string, { data: LinkPreviewData; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface LinkPreviewData {
  url: string;
  domain: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
}

// Decode basic HTML entities
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
}

// Resolve relative URL against base
function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string {
  try {
    return new URL(relativeOrAbsolute, baseUrl).toString();
  } catch {
    return relativeOrAbsolute;
  }
}

// Extract meta tag content matching property or name
function extractMeta(html: string, propertyNames: string[]): string | undefined {
  for (const name of propertyNames) {
    // 1. Tag where property/name comes before content: <meta property="og:image" content="..." />
    const pattern1 = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`,
      'i'
    );
    const match1 = html.match(pattern1);
    if (match1 && match1[1]) return decodeHtmlEntities(match1[1].trim());

    // 2. Tag where content comes before property/name: <meta content="..." property="og:image" />
    const pattern2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`,
      'i'
    );
    const match2 = html.match(pattern2);
    if (match2 && match2[1]) return decodeHtmlEntities(match2[1].trim());
  }
  return undefined;
}

// Special handler for popular services
function getFastPreview(targetUrl: URL): Partial<LinkPreviewData> | null {
  const hostname = targetUrl.hostname.toLowerCase().replace(/^www\./, '');

  // YouTube
  if (hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'youtu.be') {
    let videoId = '';
    if (hostname === 'youtu.be') {
      videoId = targetUrl.pathname.slice(1).split(/[?#&]/)[0];
    } else if (targetUrl.pathname.includes('/watch')) {
      videoId = targetUrl.searchParams.get('v') || '';
    } else if (targetUrl.pathname.startsWith('/shorts/')) {
      videoId = targetUrl.pathname.split('/shorts/')[1]?.split(/[?#&]/)[0] || '';
    }

    if (videoId) {
      return {
        domain: 'youtube.com',
        image: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        title: 'YouTube Video',
        favicon: 'https://www.youtube.com/s/desktop/f6bb02d5/img/favicon.ico',
      };
    }
  }

  // GitHub repository
  if (hostname === 'github.com') {
    const parts = targetUrl.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const owner = parts[0];
      const repo = parts[1];
      return {
        domain: 'github.com',
        image: `https://opengraph.githubassets.com/1/${owner}/${repo}`,
        title: `${owner}/${repo}`,
        favicon: 'https://github.githubassets.com/favicons/favicon.svg',
      };
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(urlParam);
    if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Only http and https URLs supported' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  const rawUrl = targetUrl.toString();

  // Check in-memory cache
  const cached = memoryCache.get(rawUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  }

  // Fast handler for known platforms
  const fast = getFastPreview(targetUrl);
  if (fast && fast.image) {
    const previewData: LinkPreviewData = {
      url: rawUrl,
      domain: fast.domain || targetUrl.hostname.replace(/^www\./, ''),
      title: fast.title,
      description: fast.description,
      image: fast.image,
      favicon: fast.favicon,
    };
    memoryCache.set(rawUrl, { data: previewData, timestamp: Date.now() });
    return NextResponse.json(previewData, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  }

  // Fetch HTML metadata from destination site
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500); // 4.5s max

    const response = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (compatible; ShelfBot/1.0)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const fallback: LinkPreviewData = {
        url: rawUrl,
        domain: targetUrl.hostname.replace(/^www\./, ''),
      };
      return NextResponse.json(fallback);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      // If direct image URL was passed
      if (contentType.startsWith('image/')) {
        const imgData: LinkPreviewData = {
          url: rawUrl,
          domain: targetUrl.hostname.replace(/^www\./, ''),
          image: rawUrl,
        };
        memoryCache.set(rawUrl, { data: imgData, timestamp: Date.now() });
        return NextResponse.json(imgData);
      }
      return NextResponse.json({
        url: rawUrl,
        domain: targetUrl.hostname.replace(/^www\./, ''),
      });
    }

    // Read only the first ~80KB of HTML to find <head> meta tags quickly
    const reader = response.body?.getReader();
    let htmlChunk = '';
    if (reader) {
      const decoder = new TextDecoder();
      let bytesRead = 0;
      while (bytesRead < 80000) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          bytesRead += value.length;
          htmlChunk += decoder.decode(value, { stream: true });
          if (htmlChunk.includes('</head>')) break;
        }
      }
      reader.cancel().catch(() => {});
    } else {
      const fullText = await response.text();
      htmlChunk = fullText.slice(0, 80000);
    }

    const finalUrl = response.url || rawUrl;
    const finalDomain = new URL(finalUrl).hostname.replace(/^www\./, '');

    // Extract Open Graph & Twitter Card Image
    const rawImage =
      extractMeta(htmlChunk, [
        'og:image',
        'og:image:url',
        'og:image:secure_url',
        'twitter:image',
        'twitter:image:src',
      ]) || undefined;

    // Extract Title
    let rawTitle =
      extractMeta(htmlChunk, ['og:title', 'twitter:title']) || undefined;
    if (!rawTitle) {
      const titleMatch = htmlChunk.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        rawTitle = decodeHtmlEntities(titleMatch[1].trim());
      }
    }

    // Extract Description
    const rawDescription =
      extractMeta(htmlChunk, ['og:description', 'twitter:description', 'description']) ||
      undefined;

    // Extract Favicon
    let rawFavicon: string | undefined = undefined;
    const iconMatch = htmlChunk.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i);
    if (iconMatch && iconMatch[1]) {
      rawFavicon = resolveUrl(iconMatch[1].trim(), finalUrl);
    } else {
      rawFavicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(finalDomain)}&sz=64`;
    }

    const previewData: LinkPreviewData = {
      url: finalUrl,
      domain: finalDomain,
      title: rawTitle,
      description: rawDescription,
      image: rawImage ? resolveUrl(rawImage, finalUrl) : undefined,
      favicon: rawFavicon,
    };

    memoryCache.set(rawUrl, { data: previewData, timestamp: Date.now() });

    return NextResponse.json(previewData, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (fetchErr) {
    console.warn('[link-preview] Error fetching preview for:', rawUrl, fetchErr);
    const fallback: LinkPreviewData = {
      url: rawUrl,
      domain: targetUrl.hostname.replace(/^www\./, ''),
      favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(targetUrl.hostname)}&sz=64`,
    };
    return NextResponse.json(fallback);
  }
}
