document.addEventListener('DOMContentLoaded', () => {
  const appUrlInput = document.getElementById('appUrl') as HTMLInputElement;
  const apiTokenInput = document.getElementById('apiToken') as HTMLInputElement;
  const autoSyncInput = document.getElementById('autoSync') as HTMLInputElement;
  const form = document.getElementById('options-form') as HTMLFormElement;
  const testBtn = document.getElementById('test-btn') as HTMLButtonElement;
  const statusBox = document.getElementById('status-box') as HTMLDivElement;

  // Load existing settings
  chrome.storage.sync.get(['shelf_app_url', 'shelf_api_token', 'shelf_auto_sync_on_open'], (data) => {
    if (data.shelf_app_url) {
      appUrlInput.value = data.shelf_app_url;
    } else {
      appUrlInput.value = 'https://shelf-drab-kappa.vercel.app';
    }
    if (data.shelf_api_token) {
      apiTokenInput.value = data.shelf_api_token;
    }
    if (autoSyncInput) {
      autoSyncInput.checked = data.shelf_auto_sync_on_open !== false;
    }
  });

  function showStatus(message: string, isError = false) {
    statusBox.textContent = message;
    statusBox.style.display = 'block';
    statusBox.className = `status-msg ${isError ? 'status-error' : 'status-success'}`;
  }

  // Save settings & request host permissions if needed
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawAppUrl = appUrlInput.value.trim().replace(/\/$/, '');
    const apiToken = apiTokenInput.value.trim();

    if (!rawAppUrl) {
      showStatus('App URL cannot be empty', true);
      return;
    }

    try {
      const parsedUrl = new URL(rawAppUrl);
      const originPattern = `${parsedUrl.origin}/*`;

      // Request host permission for the user's custom Shelf URL
      if (chrome.permissions && chrome.permissions.request) {
        try {
          await new Promise<boolean>((resolve) => {
            chrome.permissions.request({ origins: [originPattern] }, (granted) => {
              resolve(granted);
            });
          });
        } catch (permErr) {
          console.warn('Optional permissions request error:', permErr);
        }
      }

      chrome.storage.sync.set(
        {
          shelf_app_url: rawAppUrl,
          shelf_api_token: apiToken,
          shelf_auto_sync_on_open: autoSyncInput ? autoSyncInput.checked : true,
        },
        () => {
          showStatus('Configuration saved successfully and host permissions updated.');
        }
      );
    } catch {
      showStatus('Invalid App URL. Please enter a valid URL (e.g. https://shelf-drab-kappa.vercel.app).', true);
    }
  });

  // Test connection to /api/ingest
  testBtn.addEventListener('click', async () => {
    const appUrl = appUrlInput.value.trim().replace(/\/$/, '');
    const apiToken = apiTokenInput.value.trim();

    if (!appUrl || !apiToken) {
      showStatus('Please provide both the App URL and an API token to test.', true);
      return;
    }

    testBtn.textContent = 'Testing...';
    testBtn.disabled = true;

    try {
      const res = await fetch(`${appUrl}/api/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({ bookmarks: [] }),
      });

      if (res.status === 401) {
        showStatus('Connection failed: Invalid API Token (401 Unauthorized)', true);
      } else if (!res.ok) {
        showStatus(`Connection failed: HTTP ${res.status}`, true);
      } else {
        await res.json();
        showStatus('Connection verified! Shelf accepted the token successfully.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      showStatus(`Connection failed: ${msg}. Check if your app is running and URL is reachable.`, true);
    } finally {
      testBtn.textContent = 'Test Connection';
      testBtn.disabled = false;
    }
  });
});
