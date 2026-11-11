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
        appUrl: res.shelf_app_url || 'http://localhost:3000',
        apiToken: res.shelf_api_token || '',
      });
    });
  });
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

  return await response.json();
}

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'INGEST_BATCH') {
    sendBatchToShelf(message.batch)
      .then((result) => {
        sendResponse({ success: true, ...result });
      })
      .catch((err: unknown) => {
        const errorMsg = err instanceof Error ? err.message : 'Unknown ingest error';
        console.error('Background ingest error:', errorMsg);
        sendResponse({ success: false, error: errorMsg });
      });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'GET_SETTINGS') {
    getStoredSettings().then((settings) => {
      sendResponse(settings);
    });
    return true;
  }

  if (message.type === 'OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return true;
  }
});
