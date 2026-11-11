import { extractTweetFromElement, type ExtractedTweet } from './extractor';
import { SELECTORS, querySelectorAllFirst } from './selectors';

// Global state
let isCapturing = false;
let shouldStop = false;
let capturedCount = 0;
let floatingWidget: HTMLElement | null = null;

// Helper to delay with randomized pacing (1.2 to 2.2 seconds)
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

// Scroll timeline down
function scrollTimeline(): void {
  window.scrollBy({
    top: window.innerHeight * 0.85,
    behavior: 'smooth',
  });

  const scrollables = [
    document.querySelector('main'),
    document.querySelector('div[data-testid="primaryColumn"]'),
    document.querySelector('section[role="region"]'),
  ];
  for (const el of scrollables) {
    if (el && el.scrollHeight > el.clientHeight && el.clientHeight > 0) {
      el.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' });
    }
  }
}

// Micro bounce to trigger virtualized loading
function scrollBounce(): void {
  window.scrollBy({ top: -140, behavior: 'auto' });
  const col = document.querySelector('div[data-testid="primaryColumn"]');
  if (col) col.scrollBy({ top: -140, behavior: 'auto' });
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
  info?: { count?: number; message?: string }
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
        <span>Saving bookmarks: <strong>${info?.count || 0}</strong></span>
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
  capturedCount = 0;

  if (floatingWidget) {
    renderWidgetContent(floatingWidget, 'capturing', { count: 0 });
  }

  const seenIds = new Set<string>();
  let noNewTweetsRounds = 0;

  console.log('[Shelf] Starting capture on:', window.location.href);

  try {
    // If no tweets immediately visible, wait 800ms for X timeline to mount
    let initialElements = findTweetElements(document);
    if (initialElements.length === 0) {
      console.log('[Shelf] Waiting for initial tweets to mount in DOM...');
      await randomDelay(800, 1200);
      initialElements = findTweetElements(document);
    }

    while (!shouldStop && noNewTweetsRounds < 15) {
      // 1. Find all candidate tweet elements in DOM
      const tweetElements = findTweetElements(document);
      console.log(`[Shelf] Scan found ${tweetElements.length} candidate elements in DOM`);

      const batchToProcess: ExtractedTweet[] = [];

      for (const el of tweetElements) {
        if (shouldStop) break;

        const tweet = extractTweetFromElement(el);
        if (tweet && !seenIds.has(tweet.tweet_id)) {
          seenIds.add(tweet.tweet_id);
          batchToProcess.push(tweet);
          capturedCount++;
          console.log(`[Shelf] Extracted tweet ${tweet.tweet_id} by @${tweet.author_handle}`);
        }
      }

      // Update widget count in real-time
      if (floatingWidget) {
        renderWidgetContent(floatingWidget, 'capturing', { count: capturedCount });
      }

      // Send batch immediately if any new tweets were discovered
      if (batchToProcess.length > 0) {
        noNewTweetsRounds = 0;
        console.log(`[Shelf] Sending batch of ${batchToProcess.length} bookmarks to Shelf...`);
        try {
          const res = await sendBatchViaBackground(batchToProcess);
          console.log('[Shelf] Ingest response:', res);
        } catch (sendErr) {
          console.error('[Shelf] Send error:', sendErr);
        }
      } else {
        noNewTweetsRounds++;
        console.log(`[Shelf] No new tweets in this pass (round ${noNewTweetsRounds}/15)`);
      }

      if (shouldStop) break;

      // Scroll timeline
      scrollTimeline();

      // Micro-bounce if waiting for Twitter GraphQL request
      if (noNewTweetsRounds >= 2) {
        scrollBounce();
        await randomDelay(350, 550);
        scrollTimeline();
      }

      // Human-like randomized delay
      await randomDelay(1200, 2200);
    }

    // Save sync info to chrome.storage
    chrome.storage.sync.set({
      shelf_last_sync_time: new Date().toISOString(),
      shelf_last_sync_count: capturedCount,
    });

    let finishMessage = '';
    if (capturedCount === 0) {
      finishMessage = isBookmarksOrHistoryPage()
        ? 'No bookmarks detected in this view'
        : 'No posts found on this page';
    } else {
      finishMessage = `Saved ${capturedCount} bookmarks to Shelf`;
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
