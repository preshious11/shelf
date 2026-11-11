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
  // Strategy 1: Standard tweet container selectors
  const candidateSelectors = [
    'article[data-testid="tweet"]',
    'article[role="article"]',
    'div[data-testid="cellInnerDiv"] article',
    'div[data-testid="tweet"]',
    'div[data-testid="cellInnerDiv"]',
    'article',
  ];

  for (const sel of candidateSelectors) {
    const els = Array.from(doc.querySelectorAll(sel));
    // Filter to elements that contain at least a status link, time element, or tweetText
    const valid = els.filter(
      (el) =>
        el.querySelector('a[href*="/status/"]') ||
        el.querySelector('time') ||
        el.querySelector('[data-testid="tweetText"]')
    );
    if (valid.length > 0) {
      return valid;
    }
  }

  // Strategy 2: Status-link traversal fallback
  // Every tweet on X has at least one status permalink (/username/status/123456789)
  const statusLinks = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href*="/status/"]'));
  const containers = new Set<Element>();

  for (const a of statusLinks) {
    const href = a.getAttribute('href') || '';
    if (!href.match(/\/status\/\d+/)) continue;

    const card =
      a.closest('article') ||
      a.closest('div[data-testid="cellInnerDiv"]') ||
      a.closest('div[role="article"]') ||
      a.closest('section > div > div > div') ||
      a.parentElement?.parentElement?.parentElement;

    if (card) {
      containers.add(card);
    }
  }

  return Array.from(containers);
}

// Create and inject the floating widget
function createFloatingWidget() {
  if (document.getElementById('shelf-floating-widget')) return;

  const container = document.createElement('div');
  container.id = 'shelf-floating-widget';
  container.style.cssText = `
    position: fixed;
    bottom: 32px;
    right: 32px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    user-select: none;
  `;

  renderWidgetContent(container, 'idle');
  document.body.appendChild(container);
  floatingWidget = container;
  console.log('[Shelf] Floating capture widget injected successfully.');
}

function renderWidgetContent(
  container: HTMLElement,
  state: 'idle' | 'capturing' | 'done' | 'error',
  info?: { count?: number; message?: string }
) {
  if (state === 'idle') {
    container.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        background: #18181B;
        color: #F4F4F5;
        padding: 9px 16px;
        border-radius: 9999px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        border: 1px solid #38BDF8;
        transition: transform 0.15s ease, background 0.15s ease;
      " id="shelf-btn-start">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>Save to Shelf</span>
      </div>
    `;

    const startBtn = container.querySelector('#shelf-btn-start');
    startBtn?.addEventListener('click', startCapture);
  } else if (state === 'capturing') {
    container.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        gap: 12px;
        background: #18181B;
        color: #F4F4F5;
        padding: 9px 16px;
        border-radius: 9999px;
        box-shadow: 0 4px 18px rgba(0,0,0,0.35);
        font-size: 13px;
        font-weight: 500;
        border: 1px solid #0284C7;
      ">
        <div style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #38BDF8;
          box-shadow: 0 0 8px #38BDF8;
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
    stopBtn?.addEventListener('click', () => {
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
        padding: 9px 16px;
        border-radius: 9999px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
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
        padding: 9px 16px;
        border-radius: 9999px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
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
  let consecutiveFullSkippedBatches = 0;

  console.log('[Shelf] Starting capture on:', window.location.href);

  try {
    while (!shouldStop && noNewTweetsRounds < 6) {
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
        const res = await sendBatchViaBackground(batchToProcess);
        console.log('[Shelf] Batch ingest response:', res);

        // Incremental check: only stop if 2 entire batches in a row contain 0 added and all skipped
        if (res.added === 0 && res.skipped > 0) {
          consecutiveFullSkippedBatches++;
          if (consecutiveFullSkippedBatches >= 2) {
            console.log('[Shelf] Caught up to previously saved bookmarks.');
            break;
          }
        } else {
          consecutiveFullSkippedBatches = 0;
        }
      } else {
        noNewTweetsRounds++;
        console.log(`[Shelf] No new tweets in this pass (round ${noNewTweetsRounds}/6)`);
      }

      if (shouldStop) break;

      // Scroll smoothly down the page to trigger virtualized timeline loading
      window.scrollBy({
        top: window.innerHeight * 0.85,
        behavior: 'smooth',
      });

      // Human-like randomized delay
      await randomDelay(1200, 2400);
    }

    // Save sync info to chrome.storage
    chrome.storage.sync.set({
      shelf_last_sync_time: new Date().toISOString(),
      shelf_last_sync_count: capturedCount,
    });

    let finishMessage = '';
    if (capturedCount === 0) {
      finishMessage = 'No bookmarks detected on this page';
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

// Initialize on x.com bookmarks page
function checkAndInit() {
  const isBookmarksPage =
    window.location.href.includes('/bookmarks') ||
    window.location.pathname.includes('/bookmarks') ||
    window.location.pathname.includes('/i/bookmarks');

  if (isBookmarksPage) {
    createFloatingWidget();
  }
}

// Listen for START_CAPTURE message from popup or shortcuts
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === 'START_CAPTURE') {
    startCapture();
    sendResponse({ started: true });
  }
});

// Periodic check to catch single-page client side navigation
setInterval(checkAndInit, 1000);

// Observe URL changes (single-page application navigation on X)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    checkAndInit();
  }
}).observe(document, { subtree: true, childList: true });

checkAndInit();
