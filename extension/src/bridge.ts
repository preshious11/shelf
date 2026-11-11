/**
 * Bridge script running on Shelf web application tabs.
 * Relays real-time sync events from the Chrome Extension background worker
 * directly into the running Next.js web application.
 */

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
