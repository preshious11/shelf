document.addEventListener('DOMContentLoaded', () => {
  const lastSyncTimeEl = document.getElementById('last-sync-time') as HTMLElement;
  const lastSyncCountEl = document.getElementById('last-sync-count') as HTMLElement;
  const openLibraryBtn = document.getElementById('open-library-btn') as HTMLAnchorElement;
  const openBookmarksBtn = document.getElementById('open-bookmarks-btn') as HTMLAnchorElement;
  const openOptionsBtn = document.getElementById('open-options-btn') as HTMLAnchorElement;

  chrome.storage.sync.get(
    ['shelf_last_sync_time', 'shelf_last_sync_count', 'shelf_app_url'],
    (data) => {
      const appUrl = data.shelf_app_url || 'http://localhost:3005';

      if (data.shelf_last_sync_time) {
        const d = new Date(data.shelf_last_sync_time);
        lastSyncTimeEl.textContent = d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } else {
        lastSyncTimeEl.textContent = 'Never';
      }

      lastSyncCountEl.textContent = String(data.shelf_last_sync_count || 0);

      openLibraryBtn.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: appUrl });
      });
    }
  );

  openBookmarksBtn.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.url && activeTab.url.includes('bookmarks')) {
        chrome.tabs.sendMessage(activeTab.id!, { action: 'START_CAPTURE' }, () => {
          window.close();
        });
      } else {
        chrome.tabs.create({ url: 'https://x.com/i/bookmarks' });
        window.close();
      }
    });
  });

  openOptionsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});

