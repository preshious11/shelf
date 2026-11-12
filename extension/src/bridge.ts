/**
 * Bridge script running on Shelf web application tabs.
 * Relays real-time sync events between the Chrome Extension background worker
 * and the running Next.js web application.
 */

// 1. Listen for messages from Chrome Extension background worker -> web app
chrome.runtime.onMessage.addListener((message) => {
  if (message && message.type === 'SHELF_BOOKMARKS_CHANGED') {
    // Notify the React application via window.postMessage
    window.postMessage({ type: 'SHELF_BOOKMARKS_CHANGED' }, '*');

    // Also broadcast across all open tabs via BroadcastChannel
    try {
      const bc = new BroadcastChannel('shelf_sync_channel');
      bc.postMessage({ type: 'BOOKMARKS_CHANGED' });
      bc.close();
    } catch {
      // BroadcastChannel unsupported fallback
    }
  }
});

// 2. Listen for messages from Shelf web application -> Chrome Extension background worker
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  if (event.data && event.data.type === 'SHELF_DELETE_BOOKMARK_ON_X') {
    const tweetId = event.data.tweetId;
    if (tweetId) {
      console.log('[shelf bridge] Forwarding bookmark deletion on X for tweet:', tweetId);
      chrome.runtime.sendMessage(
        {
          type: 'DELETE_BOOKMARK_ON_X',
          tweetId: String(tweetId),
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn('[shelf bridge] Extension response error:', chrome.runtime.lastError.message);
          } else if (response?.success) {
            console.log('[shelf bridge] Extension unbookmarked tweet on X successfully:', tweetId);
          }
        }
      );
    }
  }
});

