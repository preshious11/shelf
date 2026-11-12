/**
 * Background Service Worker for Shelf Chrome Extension (Manifest V3)
 *
 * Handles cross-origin network communication to the Shelf App URL,
 * ensuring content scripts are not blocked by page-level CSP or cross-origin restrictions.
 */

// Helper to get stored settings
async function getStoredSettings(): Promise<{ appUrl: string; apiToken: string }> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['shelf_app_url', 'shelf_api_token'], (res) => {
      resolve({
        appUrl: res.shelf_app_url || 'https://shelf-drab-kappa.vercel.app',
        apiToken: res.shelf_api_token || '',
      });
    });
  });
}

// Fetch all known tweet_ids already saved in Shelf
async function fetchKnownBookmarkIds(): Promise<{
  success: boolean;
  knownIds?: string[];
  isAuthError?: boolean;
  status?: number;
  error?: string;
}> {
  const { appUrl, apiToken } = await getStoredSettings();
  if (!apiToken) {
    return {
      success: false,
      isAuthError: true,
      status: 401,
      error: 'Not connected to Shelf. Please reconnect your API token',
    };
  }

  const endpoint = `${appUrl.replace(/\/$/, '')}/api/ingest`;
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      const isAuth = response.status === 401;
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errorText = await response.text();
        const parsed = JSON.parse(errorText);
        errorMsg = parsed.error || errorMsg;
      } catch {
        // Keep fallback
      }
      return {
        success: false,
        isAuthError: isAuth,
        status: response.status,
        error: isAuth ? 'Not connected to Shelf. Please reconnect your API token' : errorMsg,
      };
    }

    const data = await response.json();
    return { success: true, isAuthError: false, knownIds: data.existing_ids || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return { success: false, isAuthError: false, status: 0, error: msg };
  }
}

// Delete a bookmark from Shelf web app
async function deleteBookmarkFromShelf(tweetId: string): Promise<{ success: boolean; deleted_tweet_id?: string; error?: string }> {
  const { appUrl, apiToken } = await getStoredSettings();

  if (!apiToken) {
    throw new Error('API Token not configured in extension options.');
  }

  const endpoint = `${appUrl.replace(/\/$/, '')}/api/ingest?tweet_id=${encodeURIComponent(tweetId)}`;

  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let msg = `HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(errorText);
      msg = parsed.error || msg;
    } catch {
      msg = errorText || msg;
    }
    throw new Error(`Delete failed: ${msg}`);
  }

  const data = await response.json();
  notifyShelfTabs();
  return data;
}

// Notify all open Shelf web tabs that bookmarks changed
async function notifyShelfTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      const url = (tab.url || '').toLowerCase();
      if (
        url.includes('shelf-drab-kappa.vercel.app') ||
        url.includes('localhost:3005') ||
        url.includes('localhost:3000') ||
        url.includes('127.0.0.1')
      ) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'SHELF_BOOKMARKS_CHANGED' }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn('[Shelf Background] Could not notify web tabs:', err);
  }
}

// Unbookmark directly via X GraphQL API if no X tab is currently active
async function unbookmarkTweetDirectly(tweetId: string): Promise<boolean> {
  try {
    let ct0: string | undefined;
    try {
      const cookie = await chrome.cookies.get({ url: 'https://x.com', name: 'ct0' });
      ct0 = cookie?.value;
    } catch {
      // Cookies API might fail or not be permitted
    }

    if (!ct0) {
      console.log('[shelf background] No ct0 cookie found for x.com (user might not be logged in)');
      return false;
    }

    const queryId = 'Wlmlj2-xzyS1GN3a6cj-mQ';
    const endpoint = `https://x.com/i/api/graphql/${queryId}/DeleteBookmark`;
    const defaultAuth =
      'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization: defaultAuth,
        'x-csrf-token': ct0,
        'x-twitter-active-user': 'yes',
        'x-twitter-auth-type': 'OAuth2Session',
        'content-type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        variables: { tweet_id: String(tweetId) },
        queryId,
      }),
    });

    if (res.ok) {
      console.log(`[shelf background] Direct DeleteBookmark succeeded on X for tweet: ${tweetId}`);
      return true;
    } else {
      const text = await res.text().catch(() => '');
      console.warn(`[shelf background] Direct DeleteBookmark returned HTTP ${res.status}:`, text.slice(0, 100));
      return false;
    }
  } catch (err) {
    console.warn('[shelf background] Direct DeleteBookmark failed:', err);
    return false;
  }
}

// Handle unbookmarking a tweet on X when user deletes it in the Shelf web application
async function handleDeleteBookmarkOnX(tweetId: string): Promise<{ success: boolean; unbookmarkedOnX: boolean }> {
  console.log('[shelf background] Handling bookmark removal for tweet:', tweetId);

  // 1. Remove from local storage shelf_saved_tweet_ids so it won't be treated as already saved
  try {
    chrome.storage.local.get(['shelf_saved_tweet_ids'], (data) => {
      if (data?.shelf_saved_tweet_ids && Array.isArray(data.shelf_saved_tweet_ids)) {
        const updated = data.shelf_saved_tweet_ids.filter((id: string) => id !== tweetId);
        chrome.storage.local.set({ shelf_saved_tweet_ids: updated });
        console.log(`[shelf background] Removed tweet ${tweetId} from shelf_saved_tweet_ids local storage`);
      }
    });
  } catch (err) {
    console.warn('[shelf background] Could not update shelf_saved_tweet_ids in storage:', err);
  }

  // 2. Query open X tabs and message them to unbookmark via authenticated page context
  let notifiedTabs = false;
  try {
    const tabs = await chrome.tabs.query({
      url: ['https://x.com/*', 'https://twitter.com/*'],
    });

    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'UNBOOKMARK_TWEET_ON_X',
          tweetId: String(tweetId),
        }).catch(() => {});
        notifiedTabs = true;
      }
    }
  } catch (tabErr) {
    console.warn('[shelf background] Could not query X tabs:', tabErr);
  }

  // 3. If no X tab was open or to ensure completion, call direct API
  let directSuccess = false;
  if (!notifiedTabs) {
    directSuccess = await unbookmarkTweetDirectly(tweetId);
  }

  return { success: true, unbookmarkedOnX: notifiedTabs || directSuccess };
}

// Ingest batch to Shelf web app
async function sendBatchToShelf(batch: unknown[]): Promise<{ added: number; skipped: number }> {
  const { appUrl, apiToken } = await getStoredSettings();

  if (!apiToken) {
    const err = new Error('Not connected to Shelf. Please reconnect your API token');
    (err as any).isAuthError = true;
    (err as any).status = 401;
    throw err;
  }

  const endpoint = `${appUrl.replace(/\/$/, '')}/api/ingest`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({ bookmarks: batch }),
  });

  if (!response.ok) {
    const isAuth = response.status === 401;
    const errorText = await response.text();
    let msg = `HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(errorText);
      msg = parsed.error || msg;
    } catch {
      msg = errorText || msg;
    }
    const err = new Error(
      isAuth ? 'Not connected to Shelf. Please reconnect your API token' : `Ingest failed: ${msg}`
    );
    (err as any).isAuthError = isAuth;
    (err as any).status = response.status;
    throw err;
  }

  const data = await response.json();
  notifyShelfTabs();
  return data;
}

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === 'INGEST_BATCH') {
      sendBatchToShelf(message.batch)
        .then((result) => {
          sendResponse({ success: true, ...result });
        })
        .catch((err: any) => {
          const isAuth = Boolean(
            err?.isAuthError ||
              err?.status === 401 ||
              (err?.message &&
                (err.message.includes('401') ||
                  err.message.includes('Not connected to Shelf') ||
                  err.message.includes('API Token not configured')))
          );
          const errorMsg = isAuth
            ? 'Not connected to Shelf. Please reconnect your API token'
            : err instanceof Error
            ? err.message
            : 'Unknown ingest error';
          console.error('[shelf] Ingest error:', errorMsg);
          sendResponse({
            success: false,
            isAuthError: isAuth,
            status: isAuth ? 401 : err?.status || 500,
            error: errorMsg,
          });
        });
      return true; // Keep message channel open for async response
    }

    if (message.type === 'DELETE_BOOKMARK') {
      deleteBookmarkFromShelf(message.tweetId)
        .then((result) => {
          sendResponse(result);
        })
        .catch((err: unknown) => {
          const errorMsg = err instanceof Error ? err.message : 'Failed to delete bookmark';
          console.error('[shelf] Delete error:', errorMsg);
          sendResponse({ success: false, error: errorMsg });
        });
      return true;
    }

    if (message.type === 'DELETE_BOOKMARK_ON_X') {
      handleDeleteBookmarkOnX(message.tweetId)
        .then((result) => {
          sendResponse(result);
        })
        .catch((err: unknown) => {
          const errorMsg = err instanceof Error ? err.message : 'Failed to unbookmark on X';
          console.error('[shelf] Error unbookmarking on X:', errorMsg);
          sendResponse({ success: false, error: errorMsg });
        });
      return true;
    }

    if (message.type === 'GET_KNOWN_IDS') {
      fetchKnownBookmarkIds()
        .then((result) => {
          sendResponse(result);
        })
        .catch((err: unknown) => {
          const errorMsg = err instanceof Error ? err.message : 'Failed to get known IDs';
          console.error('[shelf] Known IDs error:', errorMsg);
          sendResponse({ success: false, error: errorMsg });
        });
      return true;
    }

    if (message.type === 'GET_SETTINGS') {
      getStoredSettings()
        .then((settings) => {
          sendResponse(settings);
        })
        .catch((err: unknown) => {
          const errorMsg = err instanceof Error ? err.message : 'Failed to get settings';
          console.error('[shelf] Settings error:', errorMsg);
          sendResponse({ appUrl: 'https://shelf-drab-kappa.vercel.app', apiToken: '', error: errorMsg });
        });
      return true;
    }

    if (message.type === 'OPEN_OPTIONS') {
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
      return true;
    }

    // Fallback for unhandled message
    sendResponse({ success: false, error: `Unhandled message type: ${message.type}` });
    return false;
  } catch (syncErr: unknown) {
    const errorMsg = syncErr instanceof Error ? syncErr.message : 'Synchronous error';
    console.error('[shelf] onMessage handler error:', errorMsg);
    sendResponse({ success: false, error: errorMsg });
    return true;
  }
});
