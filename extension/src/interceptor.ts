/**
 * Shelf Network Interceptor
 * Runs in the page's MAIN world at document_start on x.com and twitter.com.
 * Wraps window.fetch and XMLHttpRequest to capture X's Bookmarks API requests and responses.
 * SECURITY: Never logs authorization or csrf values.
 */

(function () {
  // Prevent duplicate execution
  if ((window as any).__shelf_interceptor_installed__) return;
  (window as any).__shelf_interceptor_installed__ = true;

  const BOOKMARKS_GRAPHQL_REGEX = /\/i\/api\/graphql\/[^/]+\/Bookmarks/i;
  const DELETE_BOOKMARK_REGEX = /\/i\/api\/graphql\/([^/]+)\/DeleteBookmark/i;

  let lastCapturedAuth = '';
  let lastCapturedCsrf = '';
  let lastDeleteBookmarkQueryId = 'Wlmlj2-xzyS1GN3a6cj-mQ';

  // Helper to extract clean lowercase headers from various header types
  function extractHeaders(input: any): Record<string, string> {
    const headers: Record<string, string> = {};
    if (!input) return headers;

    try {
      if (typeof input.forEach === 'function') {
        input.forEach((val: string, key: string) => {
          if (key) headers[key.toLowerCase()] = String(val);
        });
      } else if (Array.isArray(input)) {
        for (const [k, v] of input) {
          if (k) headers[String(k).toLowerCase()] = String(v);
        }
      } else if (typeof input === 'object') {
        for (const k of Object.keys(input)) {
          headers[k.toLowerCase()] = String(input[k]);
        }
      }
    } catch {
      // Ignore header extraction issues
    }
    return headers;
  }

  // 1. Wrap window.fetch
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const resource = args[0];
    const config = args[1] || {};

    let url = '';
    if (typeof resource === 'string') {
      url = resource;
    } else if (resource instanceof Request) {
      url = resource.url;
    } else if (resource && typeof (resource as any).href === 'string') {
      url = (resource as any).href;
    }

    const isBookmarksApi = BOOKMARKS_GRAPHQL_REGEX.test(url);

    // Capture auth/csrf headers and DeleteBookmark query ID from any X API request
    if (url.includes('/i/api/')) {
      try {
        let reqHeaders: Record<string, string> = {};
        if (resource instanceof Request) {
          reqHeaders = extractHeaders(resource.headers);
        }
        if (config.headers) {
          reqHeaders = { ...reqHeaders, ...extractHeaders(config.headers) };
        }
        if (reqHeaders['authorization']) lastCapturedAuth = reqHeaders['authorization'];
        if (reqHeaders['x-csrf-token']) lastCapturedCsrf = reqHeaders['x-csrf-token'];

        const deleteMatch = url.match(DELETE_BOOKMARK_REGEX);
        if (deleteMatch && deleteMatch[1]) {
          lastDeleteBookmarkQueryId = deleteMatch[1];
        }
      } catch {}
    }

    // Call original fetch without modifying the caller's request
    const response = await originalFetch.apply(this, args);

    if (isBookmarksApi) {
      try {
        const method = (
          config.method ||
          (resource instanceof Request ? resource.method : 'GET')
        ).toUpperCase();

        let headers: Record<string, string> = {};
        if (resource instanceof Request) {
          headers = extractHeaders(resource.headers);
        }
        if (config.headers) {
          headers = { ...headers, ...extractHeaders(config.headers) };
        }

        const body =
          config.body ||
          (resource instanceof Request ? (resource as any)._bodyInit : undefined);

        // Clone response to read JSON without consuming caller's stream
        const clone = response.clone();
        clone
          .json()
          .then((jsonData) => {
            window.postMessage(
              {
                type: 'SHELF_BOOKMARKS_INTERCEPTED',
                url,
                method,
                headers,
                body: typeof body === 'string' ? body : undefined,
                response: jsonData,
              },
              '*'
            );
          })
          .catch(() => {
            // Non-JSON response, ignore
          });
      } catch {
        // Silently continue, never disrupt X
      }
    }

    return response;
  };

  // 2. Wrap XMLHttpRequest (XHR)
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    ...rest: any[]
  ) {
    (this as any).__shelf_url = typeof url === 'string' ? url : url.href;
    (this as any).__shelf_method = method;
    (this as any).__shelf_headers = {};
    return originalOpen.apply(this, [method, url, ...rest] as any);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (
    name: string,
    value: string
  ) {
    if ((this as any).__shelf_headers && name) {
      (this as any).__shelf_headers[name.toLowerCase()] = String(value);
    }
    return originalSetRequestHeader.apply(this, [name, value]);
  };

  XMLHttpRequest.prototype.send = function (body?: any) {
    const url = (this as any).__shelf_url || '';

    // Capture auth/csrf headers and DeleteBookmark query ID from any XHR request
    if (url.includes('/i/api/')) {
      try {
        const xhrHeaders = (this as any).__shelf_headers || {};
        if (xhrHeaders['authorization']) lastCapturedAuth = xhrHeaders['authorization'];
        if (xhrHeaders['x-csrf-token']) lastCapturedCsrf = xhrHeaders['x-csrf-token'];

        const deleteMatch = url.match(DELETE_BOOKMARK_REGEX);
        if (deleteMatch && deleteMatch[1]) {
          lastDeleteBookmarkQueryId = deleteMatch[1];
        }
      } catch {}
    }

    if (BOOKMARKS_GRAPHQL_REGEX.test(url)) {
      this.addEventListener('load', function () {
        try {
          if (this.status >= 200 && this.status < 300 && this.responseText) {
            const jsonData = JSON.parse(this.responseText);
            window.postMessage(
              {
                type: 'SHELF_BOOKMARKS_INTERCEPTED',
                url,
                method: (this as any).__shelf_method || 'GET',
                headers: (this as any).__shelf_headers || {},
                body: typeof body === 'string' ? body : undefined,
                response: jsonData,
              },
              '*'
            );
          }
        } catch {
          // Ignore
        }
      });
    }
    return originalSend.apply(this, [body]);
  };

  // 3. Listen for pagination request from isolated content script
  window.addEventListener('message', async (event) => {
    if (event.data?.type === 'SHELF_FETCH_NEXT_BOOKMARKS_PAGE') {
      const { requestId, url, method, headers, body } = event.data;

      try {
        const fetchOptions: RequestInit = {
          method: method || 'GET',
          headers: headers || {},
          credentials: 'include',
        };
        if (body && method !== 'GET' && method !== 'HEAD') {
          fetchOptions.body = body;
        }

        const res = await originalFetch(url, fetchOptions);
        const resetHeader = res.headers.get('x-rate-limit-reset');
        const remainingHeader = res.headers.get('x-rate-limit-remaining');

        if (!res.ok) {
          let errorText = '';
          try {
            errorText = await res.text();
          } catch {}

          window.postMessage(
            {
              type: 'SHELF_NEXT_PAGE_RESPONSE',
              requestId,
              success: false,
              status: res.status,
              rateLimitReset: resetHeader ? parseInt(resetHeader, 10) : undefined,
              rateLimitRemaining: remainingHeader
                ? parseInt(remainingHeader, 10)
                : undefined,
              error: `HTTP ${res.status}: ${errorText.slice(0, 200)}`,
            },
            '*'
          );
          return;
        }

        const json = await res.json();
        window.postMessage(
          {
            type: 'SHELF_NEXT_PAGE_RESPONSE',
            requestId,
            success: true,
            status: res.status,
            rateLimitReset: resetHeader ? parseInt(resetHeader, 10) : undefined,
            rateLimitRemaining: remainingHeader
              ? parseInt(remainingHeader, 10)
              : undefined,
            response: json,
          },
          '*'
        );
      } catch (fetchErr: any) {
        window.postMessage(
          {
            type: 'SHELF_NEXT_PAGE_RESPONSE',
            requestId,
            success: false,
            error: fetchErr?.message || 'Network error fetching next bookmarks page',
          },
          '*'
        );
      }
    }
  });

  // Helper: dynamically discover live DeleteBookmark queryId from active Webpack module cache
  function getDeleteBookmarkQueryId(): string {
    try {
      const chunk = (window as any).webpackChunk_twitter_responsive_web;
      if (chunk && Array.isArray(chunk)) {
        let modules: any = null;
        chunk.push([
          ['shelf_extract_' + Date.now()],
          {},
          (e: any) => {
            modules = e.c;
          },
        ]);
        if (modules) {
          for (const key of Object.keys(modules)) {
            const mod = modules[key]?.exports;
            if (mod && typeof mod === 'object') {
              if (mod.operationName === 'DeleteBookmark' && mod.queryId) {
                lastDeleteBookmarkQueryId = mod.queryId;
                return mod.queryId;
              }
              if (mod.default?.operationName === 'DeleteBookmark' && mod.default?.queryId) {
                lastDeleteBookmarkQueryId = mod.default.queryId;
                return mod.default.queryId;
              }
            }
          }
        }
      }
    } catch {
      // Ignore extraction failures
    }
    return lastDeleteBookmarkQueryId || 'Wlmlj2-xzyS1GN3a6cj-mQ';
  }

  // 4. Listen for unbookmark request from isolated content script
  window.addEventListener('message', async (event) => {
    if (event.data?.type === 'SHELF_EXECUTE_UNBOOKMARK') {
      const { tweetId } = event.data;
      if (!tweetId) return;

      try {
        const queryId = getDeleteBookmarkQueryId();
        const url = `https://x.com/i/api/graphql/${queryId}/DeleteBookmark`;

        // Extract CSRF token from document.cookie (ct0) or fallback to lastCapturedCsrf
        let csrf = '';
        const cookieMatch = document.cookie.match(/(?:^|;\s*)ct0=([^;]+)/);
        if (cookieMatch) {
          csrf = decodeURIComponent(cookieMatch[1]);
        }
        if (!csrf) {
          csrf = lastCapturedCsrf;
        }

        const auth =
          lastCapturedAuth ||
          'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

        const headers: Record<string, string> = {
          authorization: auth,
          'content-type': 'application/json',
          'x-twitter-active-user': 'yes',
          'x-twitter-auth-type': 'OAuth2Session',
        };
        if (csrf) {
          headers['x-csrf-token'] = csrf;
        }

        const payload = {
          variables: {
            tweet_id: String(tweetId),
          },
          queryId,
        };

        const res = await originalFetch(url, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          console.log(`[shelf] Successfully unbookmarked tweet ${tweetId} on X via GraphQL mutation.`);
        } else {
          const errText = await res.text().catch(() => '');
          console.warn(`[shelf] DeleteBookmark returned HTTP ${res.status}:`, errText.slice(0, 100));
        }
      } catch (err) {
        console.error('[shelf] Error executing DeleteBookmark in MAIN world:', err);
      }
    }
  });

  console.log('[shelf] Network interceptor initialized in MAIN world.');
})();

