import { extractTweetFromElement, type ExtractedTweet } from './extractor';
import { SELECTORS, querySelectorAllFirst } from './selectors';

// Global state
let isCapturing = false;
let shouldStop = false;
let newlySavedCount = 0;
let alreadySavedCount = 0;
let floatingWidget: HTMLElement | null = null;

// Helper to delay with randomized pacing
function randomDelay(minMs = 1200, maxMs = 2200): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Detect if current page is bookmarks, history, or has tweets
function isBookmarksOrHistoryPage(): boolean {
  const url = window.location.href.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  return (
    url.includes('bookmark') ||
    url.includes('history') ||
    path.startsWith('/i/bookmarks') ||
    path.startsWith('/i/history') ||
    path.includes('/bookmarks') ||
    path.includes('/history')
  );
}

// Fetch existing tweet IDs already saved in Shelf
async function fetchKnownIdsViaBackground(): Promise<{ success: boolean; ids: Set<string>; error?: string }> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_KNOWN_IDS' }, (res) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, ids: new Set(), error: chrome.runtime.lastError.message });
        return;
      }
      if (!res || !res.success) {
        resolve({
          success: false,
          ids: new Set(),
          error: res?.error || 'Failed to connect to Shelf web app',
        });
        return;
      }
      const ids = new Set<string>((res.knownIds || []).map((id: any) => String(id)));
      resolve({ success: true, ids });
    });
  });
}

// Send batch via Background Service Worker
async function sendBatchViaBackground(
  batch: ExtractedTweet[]
): Promise<{ added: number; skipped: number }> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: 'INGEST_BATCH',
        batch,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response || !response.success) {
          reject(new Error(response?.error || 'Ingest failed via background worker'));
          return;
        }
        resolve({ added: response.added || 0, skipped: response.skipped || 0 });
      }
    );
  });
}

// Find all tweet containers on the page with multiple fallback strategies
function findTweetElements(doc: Document): Element[] {
  // Strategy 1: Direct tweet articles
  const articles = Array.from(
    doc.querySelectorAll('article[data-testid="tweet"], article[role="article"]')
  );
  if (articles.length > 0) {
    return articles;
  }

  // Strategy 2: CellInnerDiv containing status link or time
  const cells = Array.from(doc.querySelectorAll('div[data-testid="cellInnerDiv"]')).filter(
    (cell) =>
      cell.querySelector('a[href*="/status/"]') ||
      cell.querySelector('time') ||
      cell.querySelector('[data-testid="tweetText"]')
  );
  if (cells.length > 0) {
    return cells;
  }

  // Strategy 3: Status-link traversal fallback
  const statusLinks = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href*="/status/"]'));
  const containers = new Set<Element>();

  for (const a of statusLinks) {
    const href = a.getAttribute('href') || '';
    if (!href.match(/\/status\/\d+/)) continue;

    const card =
      a.closest('article') ||
      a.closest('div[data-testid="cellInnerDiv"]') ||
      a.closest('div[role="article"]') ||
      a.closest('section > div > div > div');

    if (card) {
      containers.add(card);
    }
  }

  return Array.from(containers);
}

// Check if Twitter is actively loading the next batch of tweets
function isTwitterLoading(): boolean {
  return !!(
    document.querySelector('div[role="progressbar"]') ||
    document.querySelector('[aria-label="Loading…"]') ||
    document.querySelector('[aria-label="Loading"]') ||
    document.querySelector('svg[aria-label="Loading"]')
  );
}

// Check and click any "Retry" / "Try again" buttons rendered by Twitter on error or rate-limit
function checkAndClickRetry(): boolean {
  const candidates = Array.from(document.querySelectorAll('button, div[role="button"]'));
  for (const el of candidates) {
    const txt = (el.textContent || '').trim().toLowerCase();
    if (txt === 'retry' || txt === 'try again') {
      console.log('[Shelf] Twitter retry button detected, clicking...');
      (el as HTMLElement).click();
      return true;
    }
  }
  return false;
}

// Trigger deep scroll and re-intersection for Twitter's virtualized infinite feed
function triggerDeepScroll(): void {
  checkAndClickRetry();

  // Dispatch synthetic wheel & scroll events
  window.dispatchEvent(new Event('scroll'));
  window.dispatchEvent(new WheelEvent('wheel', { deltaY: 350, bubbles: true }));

  const scrollHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight
  );
  const currentY = window.scrollY || window.pageYOffset;
  const isNearBottom = currentY + window.innerHeight >= scrollHeight - 350;

  if (isNearBottom) {
    // Micro-bounce: scroll up 450px then back to absolute bottom to trigger Twitter's bottom sentinel
    window.scrollBy({ top: -450, behavior: 'auto' });
    setTimeout(() => {
      window.scrollTo({
        top: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
        behavior: 'smooth',
      });
      window.dispatchEvent(new Event('scroll'));
    }, 180);
  } else {
    window.scrollBy({
      top: window.innerHeight * 0.9,
      behavior: 'smooth',
    });
  }

  // Also check and scroll container elements if Twitter uses an internal scroll container
  const scrollables = [
    document.querySelector('main'),
    document.querySelector('div[data-testid="primaryColumn"]'),
    document.querySelector('section[role="region"]'),
  ];
  for (const el of scrollables) {
    if (el && el.scrollHeight > el.clientHeight && el.clientHeight > 0) {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 250) {
        el.scrollBy({ top: -350, behavior: 'auto' });
        setTimeout(() => {
          el.scrollTop = el.scrollHeight;
        }, 150);
      } else {
        el.scrollBy({ top: window.innerHeight * 0.9, behavior: 'smooth' });
      }
    }
  }
}

// Create and inject the floating widget
function createFloatingWidget() {
  if (!document.body) return;

  const existing = document.getElementById('shelf-floating-widget');
  if (existing && document.body.contains(existing)) return;
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'shelf-floating-widget';
  container.style.cssText = `
    position: fixed !important;
    bottom: 32px !important;
    right: 32px !important;
    z-index: 2147483647 !important;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    user-select: none !important;
  `;

  renderWidgetContent(container, 'idle');
  document.body.appendChild(container);
  floatingWidget = container;
  console.log('[Shelf] Floating widget anchored to document.body');
}

function renderWidgetContent(
  container: HTMLElement,
  state: 'idle' | 'capturing' | 'done' | 'error',
  info?: { newCount?: number; existingCount?: number; message?: string }
) {
  if (state === 'idle') {
    const isSpecialPage = isBookmarksOrHistoryPage();
    const subLabel = isSpecialPage ? 'Sync bookmarks & history' : 'Sync visible posts';

    container.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        gap: 10px;
        background: #18181B;
        color: #F4F4F5;
        padding: 8px 18px;
        border-radius: 9999px;
        box-shadow: 0 4px 22px rgba(0,0,0,0.45);
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        border: 1px solid #38BDF8;
        transition: transform 0.15s ease, background 0.15s ease;
      " id="shelf-btn-start">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        <div style="display: flex; flex-direction: column; text-align: left; line-height: 1.25;">
          <span id="shelf-btn-label" style="font-weight: 600; font-size: 13px; color: #F4F4F5;">Save to Shelf</span>
          <span id="shelf-btn-sub" style="font-size: 10px; color: #38BDF8; font-weight: 500;">${subLabel}</span>
        </div>
      </div>
    `;

    const startBtn = container.querySelector('#shelf-btn-start');
    startBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      startCapture();
    });
  } else if (state === 'capturing') {
    const newCount = info?.newCount || 0;
    const existingCount = info?.existingCount || 0;

    container.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        gap: 12px;
        background: #18181B;
        color: #F4F4F5;
        padding: 10px 18px;
        border-radius: 9999px;
        box-shadow: 0 4px 22px rgba(0,0,0,0.45);
        font-size: 13px;
        font-weight: 500;
        border: 1px solid #0284C7;
      ">
        <div style="
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #38BDF8;
          box-shadow: 0 0 10px #38BDF8;
          animation: pulse 1.5s infinite;
        "></div>
        <div style="display: flex; flex-direction: column; line-height: 1.2;">
          <span>Saving: <strong>${newCount} new</strong></span>
          ${existingCount > 0 ? `<span style="font-size: 10px; color: #A1A1AA;">${existingCount} already in Shelf</span>` : `<span style="font-size: 10px; color: #38BDF8;">Scanning timeline...</span>`}
        </div>
        <button id="shelf-btn-stop" style="
          background: #27272A;
          color: #F4F4F5;
          border: 1px solid #3F3F46;
          border-radius: 6px;
          padding: 3px 8px;
          font-size: 11px;
          cursor: pointer;
        ">Stop</button>
      </div>
    `;

    const stopBtn = container.querySelector('#shelf-btn-stop');
    stopBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      shouldStop = true;
      if (stopBtn) stopBtn.textContent = 'Stopping...';
    });
  } else if (state === 'done') {
    container.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        background: #064E3B;
        color: #ECFDF5;
        padding: 10px 18px;
        border-radius: 9999px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        font-size: 13px;
        font-weight: 500;
        border: 1px solid #059669;
      ">
        <span>✓ ${info?.message || 'Sync completed'}</span>
      </div>
    `;
    setTimeout(() => {
      if (floatingWidget) renderWidgetContent(floatingWidget, 'idle');
    }, 4500);
  } else if (state === 'error') {
    container.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        background: #7F1D1D;
        color: #FEF2F2;
        padding: 10px 18px;
        border-radius: 9999px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        font-size: 12px;
        font-weight: 500;
        border: 1px solid #DC2626;
      ">
        <span>⚠ ${info?.message || 'Error occurred'}</span>
      </div>
    `;
    setTimeout(() => {
      if (floatingWidget) renderWidgetContent(floatingWidget, 'idle');
    }, 6000);
  }
}

// The core capture process
async function startCapture() {
  if (isCapturing) return;

  isCapturing = true;
  shouldStop = false;
  newlySavedCount = 0;
  alreadySavedCount = 0;

  if (floatingWidget) {
    renderWidgetContent(floatingWidget, 'capturing', { newCount: 0, existingCount: 0 });
  }

  console.log('[Shelf] Fetching known bookmark IDs from Shelf library...');
  const knownCheck = await fetchKnownIdsViaBackground();
  if (!knownCheck.success && knownCheck.error) {
    console.error('[Shelf] Pre-flight connection failed:', knownCheck.error);
    let userMsg = knownCheck.error;
    if (userMsg.includes('API Token not configured')) {
      userMsg = 'API Token missing. Click extension icon > Options.';
    } else if (userMsg.includes('401') || userMsg.includes('Invalid or revoked')) {
      userMsg = 'Invalid API Token. Update in Extension Options.';
    } else if (userMsg.includes('Database error') || userMsg.includes('SERVICE_ROLE_KEY')) {
      userMsg = 'Server config error. Check Vercel environment keys.';
    } else if (userMsg.length > 50) {
      userMsg = userMsg.slice(0, 47) + '...';
    }

    if (floatingWidget) {
      renderWidgetContent(floatingWidget, 'error', { message: userMsg });
    }
    isCapturing = false;
    return;
  }

  const knownInShelf = knownCheck.ids;
  console.log(`[Shelf] Library currently contains ${knownInShelf.size} bookmarks.`);

  const seenInSession = new Set<string>();
  let noNewTweetsRounds = 0;
  const maxIdleRounds = 35; // Patient 35 rounds (~60-80s) of scrolling before completing
  let lastScrollHeight = document.documentElement.scrollHeight;

  try {
    // If no tweets immediately visible, wait 800ms for X timeline to mount
    let initialElements = findTweetElements(document);
    if (initialElements.length === 0) {
      console.log('[Shelf] Waiting for initial tweets to mount in DOM...');
      await randomDelay(800, 1200);
      initialElements = findTweetElements(document);
    }

    while (!shouldStop && noNewTweetsRounds < maxIdleRounds) {
      // 1. Check if Twitter network loading spinner is actively visible
      if (isTwitterLoading()) {
        console.log('[Shelf] Twitter is fetching more tweets from network, waiting...');
        noNewTweetsRounds = Math.max(0, noNewTweetsRounds - 1);
        await randomDelay(1200, 2000);
        continue;
      }

      // 2. Check if timeline expanded in height
      const currentScrollHeight = document.documentElement.scrollHeight;
      if (currentScrollHeight > lastScrollHeight) {
        lastScrollHeight = currentScrollHeight;
        noNewTweetsRounds = 0;
      }

      // 3. Find candidate tweet elements in DOM
      const tweetElements = findTweetElements(document);
      const batchToProcess: ExtractedTweet[] = [];
      let discoveredThisPass = 0;

      for (const el of tweetElements) {
        if (shouldStop) break;

        const tweet = extractTweetFromElement(el);
        if (!tweet) continue;

        // Check if tweet is already stored in Shelf
        if (knownInShelf.has(tweet.tweet_id)) {
          if (!seenInSession.has(tweet.tweet_id)) {
            seenInSession.add(tweet.tweet_id);
            alreadySavedCount++;
            discoveredThisPass++;
            console.log(`[Shelf] Tweet ${tweet.tweet_id} already in Shelf. Skipping.`);
          }
          continue;
        }

        // Brand new tweet to save!
        if (!seenInSession.has(tweet.tweet_id)) {
          seenInSession.add(tweet.tweet_id);
          batchToProcess.push(tweet);
          discoveredThisPass++;
          console.log(`[Shelf] Found new bookmark: ${tweet.tweet_id} by @${tweet.author_handle}`);
        }
      }

      // Update widget count in real-time
      if (floatingWidget) {
        renderWidgetContent(floatingWidget, 'capturing', {
          newCount: newlySavedCount + batchToProcess.length,
          existingCount: alreadySavedCount,
        });
      }

      // Send new bookmarks batch immediately
      if (batchToProcess.length > 0) {
        noNewTweetsRounds = 0;
        console.log(`[Shelf] Transmitting ${batchToProcess.length} new bookmarks to Shelf...`);
        try {
          const res = await sendBatchViaBackground(batchToProcess);
          console.log('[Shelf] Ingest response:', res);
          const savedCount = typeof res.added === 'number' ? res.added : batchToProcess.length;
          newlySavedCount += savedCount;
          // Mark as known in Shelf
          batchToProcess.forEach((t) => knownInShelf.add(t.tweet_id));
        } catch (sendErr: unknown) {
          console.error('[Shelf] Send error:', sendErr);
          const errText = sendErr instanceof Error ? sendErr.message : 'Ingest failed';
          let displayMsg = errText;
          if (displayMsg.includes('401') || displayMsg.includes('Unauthorized') || displayMsg.includes('token')) {
            displayMsg = 'Auth failed (401). Check API token in Options.';
          } else if (displayMsg.includes('Database error') || displayMsg.includes('SERVICE_ROLE_KEY')) {
            displayMsg = 'Server DB error. Check Vercel environment keys.';
          } else if (displayMsg.length > 50) {
            displayMsg = displayMsg.slice(0, 47) + '...';
          }
          if (floatingWidget) {
            renderWidgetContent(floatingWidget, 'error', { message: displayMsg });
          }
          break; // Stop scrolling if sending failed
        }
      } else if (discoveredThisPass > 0) {
        // Discovered existing tweets, which means we are progressing through the feed!
        noNewTweetsRounds = 0;
      } else {
        noNewTweetsRounds++;
        console.log(`[Shelf] Advancing timeline (idle pass ${noNewTweetsRounds}/${maxIdleRounds})...`);
      }

      if (shouldStop) break;

      // Deep scroll and micro-bounce
      triggerDeepScroll();

      // Human-like randomized delay
      await randomDelay(1200, 2000);
    }

    // Save sync info to chrome.storage
    chrome.storage.sync.set({
      shelf_last_sync_time: new Date().toISOString(),
      shelf_last_sync_count: newlySavedCount,
    });

    let finishMessage = '';
    if (newlySavedCount > 0) {
      finishMessage = `Saved ${newlySavedCount} new bookmarks! (${alreadySavedCount} already in Shelf)`;
    } else if (alreadySavedCount > 0) {
      finishMessage = `All ${alreadySavedCount} bookmarks are already in Shelf!`;
    } else {
      finishMessage = isBookmarksOrHistoryPage()
        ? 'No bookmarks detected in this view'
        : 'No posts found on this page';
    }

    if (floatingWidget) {
      renderWidgetContent(floatingWidget, 'done', { message: finishMessage });
    }
  } catch (err: unknown) {
    console.error('[Shelf] Sync error:', err);
    const msg = err instanceof Error ? err.message : 'Sync failed';
    if (floatingWidget) {
      renderWidgetContent(floatingWidget, 'error', { message: msg });
    }
  } finally {
    isCapturing = false;
    shouldStop = false;
  }
}

// Continuously ensure floating widget stays anchored in DOM
function ensureWidget() {
  if (!document.body) return;

  const existing = document.getElementById('shelf-floating-widget');
  const isAttached = existing && document.body.contains(existing);

  if (!isAttached) {
    createFloatingWidget();
  } else if (existing && !isCapturing) {
    const isSpecial = isBookmarksOrHistoryPage();
    const sub = existing.querySelector('#shelf-btn-sub');
    const expected = isSpecial ? 'Sync bookmarks & history' : 'Sync visible posts';
    if (sub && sub.textContent !== expected) {
      sub.textContent = expected;
    }
  }
}

// Auto-sync trigger on page load / refresh
function checkAutoSync() {
  try {
    const autoSync = sessionStorage.getItem('shelf_auto_sync');
    if (autoSync === '1') {
      sessionStorage.removeItem('shelf_auto_sync');
      console.log('[Shelf] Auto-sync scheduled from previous navigation/refresh');
      setTimeout(() => {
        if (!isCapturing) {
          startCapture();
        }
      }, 1600);
    }
  } catch {
    // Session storage not accessible
  }
}

// Show temporary notification when a bookmark is auto-removed from Shelf
function showRemovalNotice(tweetId: string) {
  const notice = document.createElement('div');
  notice.style.cssText = `
    position: fixed !important;
    bottom: 84px !important;
    right: 32px !important;
    z-index: 2147483647 !important;
    background: #18181B !important;
    color: #F4F4F5 !important;
    padding: 8px 16px !important;
    border-radius: 9999px !important;
    font-size: 12px !important;
    font-weight: 500 !important;
    border: 1px solid #71717A !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important;
    pointer-events: none !important;
    transition: opacity 0.3s ease !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  `;
  notice.textContent = '✕ Removed from Shelf library';
  document.body.appendChild(notice);
  setTimeout(() => {
    notice.style.opacity = '0';
    setTimeout(() => notice.remove(), 400);
  }, 3000);
}

// Global real-time listener for bookmark removal actions on X
let lastInteractedTweetId = '';

document.addEventListener(
  'click',
  (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Track last interacted tweet container to handle portal dropdown menus
    const tweetEl = target.closest('article, [data-testid="tweet"]');
    if (tweetEl) {
      const timeLink = tweetEl.querySelector('time')?.closest('a');
      const statusLink = timeLink || tweetEl.querySelector('a[href*="/status/"]');
      const href = statusLink?.getAttribute('href') || '';
      const match = href.match(/\/status\/(\d+)/);
      if (match) {
        lastInteractedTweetId = match[1];
      }
    }

    // Check if clicked element or parent is an un-bookmark trigger
    const removeTrigger = target.closest(
      '[data-testid="removeBookmark"], ' +
      '[aria-label*="Remove"][aria-label*="ookmark"], ' +
      '[aria-label*="remove"][aria-label*="ookmark"], ' +
      '[data-testid="bookmark"][aria-label*="Remove"], ' +
      '[data-testid="bookmark"][aria-label*="remove"]'
    );

    // Check for dropdown menu item (e.g. from Share or More menu)
    const menuItem = target.closest('[role="menuitem"], [data-testid="Dropdown"]');
    const isMenuRemove = menuItem && /remove.*bookmark|delete.*bookmark/i.test(menuItem.textContent || '');

    if (removeTrigger || isMenuRemove) {
      let tweetId = '';

      // Try finding tweet element from closest ancestor
      const container = (removeTrigger || menuItem)?.closest(
        'article, [data-testid="tweet"], [data-testid="cellInnerDiv"], div[role="article"]'
      );
      if (container) {
        const timeLink = container.querySelector('time')?.closest('a');
        const statusLink = timeLink || container.querySelector('a[href*="/status/"]');
        const href = statusLink?.getAttribute('href') || '';
        const match = href.match(/\/status\/(\d+)/);
        if (match) {
          tweetId = match[1];
        }
      }

      if (!tweetId) {
        tweetId = lastInteractedTweetId;
      }

      if (tweetId) {
        console.log('[Shelf] Un-bookmark action detected on X for tweet:', tweetId);
        chrome.runtime.sendMessage(
          {
            type: 'DELETE_BOOKMARK',
            tweetId,
          },
          (response) => {
            if (response && response.success) {
              console.log('[Shelf] Bookmark auto-removed from Shelf library:', tweetId);
              showRemovalNotice(tweetId);
            }
          }
        );
      }
    }
  },
  true // Use capture phase to inspect DOM before Twitter mutates/unmounts
);

// Listen for START_CAPTURE message from popup or shortcuts
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === 'START_CAPTURE') {
    startCapture();
    sendResponse({ started: true });
  }
});

// Watchdog interval to make sure pill never disappears
setInterval(ensureWidget, 600);

// Observe URL changes (single-page application navigation on X)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    ensureWidget();
  }
}).observe(document, { subtree: true, childList: true });

ensureWidget();
checkAutoSync();
