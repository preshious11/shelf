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
async function fetchKnownBookmarkIds(): Promise<{ success: boolean; knownIds?: string[]; error?: string }> {
  const { appUrl, apiToken } = await getStoredSettings();
  if (!apiToken) {
    return { success: false, error: 'API Token not configured in extension options' };
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
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errorText = await response.text();
        const parsed = JSON.parse(errorText);
        errorMsg = parsed.error || errorMsg;
      } catch {
        // Keep fallback
      }
      return { success: false, error: errorMsg };
    }

    const data = await response.json();
    return { success: true, knownIds: data.existing_ids || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return { success: false, error: msg };
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

// Ingest batch to Shelf web app
async function sendBatchToShelf(batch: unknown[]): Promise<{ added: number; skipped: number }> {
  const { appUrl, apiToken } = await getStoredSettings();

  if (!apiToken) {
    throw new Error('API Token not configured. Please open extension options and add your token.');
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
    const errorText = await response.text();
    let msg = `HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(errorText);
      msg = parsed.error || msg;
    } catch {
      msg = errorText || msg;
    }
    throw new Error(`Ingest failed: ${msg}`);
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
        .catch((err: unknown) => {
          const errorMsg = err instanceof Error ? err.message : 'Unknown ingest error';
          console.error('[shelf] Ingest error:', errorMsg);
          sendResponse({ success: false, error: errorMsg });
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
