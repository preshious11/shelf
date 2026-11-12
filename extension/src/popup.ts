document.addEventListener('DOMContentLoaded', () => {
  const lastSyncTimeEl = document.getElementById('last-sync-time') as HTMLElement;
  const lastSyncCountEl = document.getElementById('last-sync-count') as HTMLElement;
  const openLibraryBtn = document.getElementById('open-library-btn') as HTMLAnchorElement;
  const openBookmarksBtn = document.getElementById('open-bookmarks-btn') as HTMLAnchorElement;
  const openOptionsBtn = document.getElementById('open-options-btn') as HTMLAnchorElement;

  const syncProgressCard = document.getElementById('sync-progress-card') as HTMLElement;
  const syncStatusVal = document.getElementById('sync-status-val') as HTMLElement;
  const syncProgressCount = document.getElementById('sync-progress-count') as HTMLElement;
  const stopSyncBtn = document.getElementById('stop-sync-btn') as HTMLButtonElement;

  // Load initial settings and last sync stats
  chrome.storage.sync.get(
    ['shelf_last_sync_time', 'shelf_last_sync_count', 'shelf_app_url'],
    (data) => {
      const appUrl = data.shelf_app_url || 'https://shelf-drab-kappa.vercel.app';

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

  // Check current sync state from storage
  chrome.storage.local.get(['shelf_sync_state'], (data) => {
    const state = data?.shelf_sync_state;
    if (state && state.isCapturing) {
      if (syncProgressCard) syncProgressCard.style.display = 'block';
      if (syncStatusVal) {
        syncStatusVal.textContent = state.status === 'rate_limited' ? 'Rate limited' : 'Syncing…';
        syncStatusVal.style.color = state.status === 'rate_limited' ? '#F59E0B' : '#38BDF8';
      }
      if (syncProgressCount) syncProgressCount.textContent = String(state.savedCount || 0);
      if (stopSyncBtn) stopSyncBtn.style.display = 'flex';
    } else if (state && state.isDone) {
      if (syncProgressCard) syncProgressCard.style.display = 'block';
      if (syncStatusVal) {
        if (state.unsavedCount && state.unsavedCount > 0) {
          syncStatusVal.textContent = `Done (${state.unsavedCount} unsaved)`;
          syncStatusVal.style.color = '#F59E0B';
        } else {
          syncStatusVal.textContent = 'Done';
          syncStatusVal.style.color = '#10B981';
        }
      }
      if (syncProgressCount) syncProgressCount.textContent = String(state.savedCount || 0);
      if (stopSyncBtn) stopSyncBtn.style.display = 'none';
    }
  });

  // Listen for real-time progress messages from content script
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SYNC_PROGRESS') {
      if (msg.isCapturing) {
        if (syncProgressCard) syncProgressCard.style.display = 'block';
        if (syncStatusVal) {
          syncStatusVal.textContent = msg.status === 'rate_limited' ? 'Rate limited' : 'Syncing…';
          syncStatusVal.style.color = msg.status === 'rate_limited' ? '#F59E0B' : '#38BDF8';
        }
        if (syncProgressCount) syncProgressCount.textContent = String(msg.savedCount || 0);
        if (stopSyncBtn) stopSyncBtn.style.display = 'flex';
      } else if (msg.isDone) {
        if (syncProgressCard) syncProgressCard.style.display = 'block';
        if (syncStatusVal) {
          if (msg.unsavedCount && msg.unsavedCount > 0) {
            syncStatusVal.textContent = `Done (${msg.unsavedCount} unsaved)`;
            syncStatusVal.style.color = '#F59E0B';
          } else {
            syncStatusVal.textContent = 'Done';
            syncStatusVal.style.color = '#10B981';
          }
        }
        if (syncProgressCount) syncProgressCount.textContent = String(msg.savedCount || 0);
        if (stopSyncBtn) stopSyncBtn.style.display = 'none';
      } else if (msg.status === 'idle') {
        if (syncProgressCard) syncProgressCard.style.display = 'none';
        if (stopSyncBtn) stopSyncBtn.style.display = 'none';
      }
    }
  });

  // Stop button handler
  if (stopSyncBtn) {
    stopSyncBtn.addEventListener('click', (e) => {
      e.preventDefault();
      stopSyncBtn.textContent = 'Stopping...';
      stopSyncBtn.disabled = true;

      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          if (tab.id && tab.url && (tab.url.includes('x.com') || tab.url.includes('twitter.com'))) {
            chrome.tabs.sendMessage(tab.id, { action: 'STOP_CAPTURE' }).catch(() => {});
          }
        }
      });
    });
  }

  // Start / Open bookmarks handler
  openBookmarksBtn.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      const url = (activeTab?.url || '').toLowerCase();
      if (activeTab && activeTab.id && (url.includes('x.com') || url.includes('twitter.com'))) {
        chrome.tabs.sendMessage(activeTab.id, { action: 'START_CAPTURE' }, () => {
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
