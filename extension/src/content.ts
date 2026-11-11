import { extractTweetFromElement, type ExtractedTweet } from './extractor';
import { SELECTORS, querySelectorAllFirst } from './selectors';

// Global state
let isCapturing = false;
let shouldStop = false;
let capturedCount = 0;
let floatingWidget: HTMLElement | null = null;

const BATCH_SIZE = 25;

// Helper to delay with randomized pacing (1.5 to 3.0 seconds)
function randomDelay(minMs = 1500, maxMs = 3000): Promise<void> {
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

// Create and inject the floating widget
function createFloatingWidget() {
  if (document.getElementById('shelf-floating-widget')) return;

  const container = document.createElement('div');
  container.id = 'shelf-floating-widget';
  container.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    user-select: none;
  `;

  renderWidgetContent(container, 'idle');
  document.body.appendChild(container);
  floatingWidget = container;
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
        padding: 8px 14px;
        border-radius: 9999px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        border: 1px solid #27272A;
        transition: transform 0.15s ease, background 0.15s ease;
      " id="shelf-btn-start">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
        padding: 8px 14px;
        border-radius: 9999px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
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
        "></div>
        <span>Saving to Shelf: <strong>${info?.count || 0}</strong></span>
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
        padding: 8px 14px;
        border-radius: 9999px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-size: 13px;
        font-weight: 500;
        border: 1px solid #059669;
      ">
        <span>✓ ${info?.message || 'Sync completed'}</span>
      </div>
    `;
    setTimeout(() => {
      if (floatingWidget) renderWidgetContent(floatingWidget, 'idle');
    }, 4000);
  } else if (state === 'error') {
    container.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        background: #7F1D1D;
        color: #FEF2F2;
        padding: 8px 14px;
        border-radius: 9999px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-size: 12px;
        font-weight: 500;
        border: 1px solid #DC2626;
      ">
        <span>⚠ ${info?.message || 'Error occurred'}</span>
      </div>
    `;
    setTimeout(() => {
      if (floatingWidget) renderWidgetContent(floatingWidget, 'idle');
    }, 5000);
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
  const pendingBatch: ExtractedTweet[] = [];
  let noNewTweetsRounds = 0;
  let reachedAlreadySaved = false;

  try {
    while (!shouldStop && !reachedAlreadySaved && noNewTweetsRounds < 5) {
      // 1. Find all tweet elements currently rendered in the DOM
      const tweetElements = querySelectorAllFirst(document, SELECTORS.tweet);
      let foundNewInPass = 0;

      for (const el of tweetElements) {
        if (shouldStop) break;

        const tweet = extractTweetFromElement(el);
        if (tweet && !seenIds.has(tweet.tweet_id)) {
          seenIds.add(tweet.tweet_id);
          pendingBatch.push(tweet);
          foundNewInPass++;
          capturedCount++;

          if (floatingWidget) {
            renderWidgetContent(floatingWidget, 'capturing', { count: capturedCount });
          }

          // If pending batch reaches BATCH_SIZE (25), send immediately via background worker
          if (pendingBatch.length >= BATCH_SIZE) {
            const batchToSend = pendingBatch.splice(0, pendingBatch.length);
            const res = await sendBatchViaBackground(batchToSend);

            // Incremental sync condition:
            // If the ingest endpoint reports that items were skipped (already saved),
            // we have reached our previously saved bookmarks! Stop scrolling.
            if (res.skipped > 0) {
              reachedAlreadySaved = true;
              break;
            }
          }
        }
      }

      if (foundNewInPass === 0) {
        noNewTweetsRounds++;
      } else {
        noNewTweetsRounds = 0;
      }

      if (shouldStop || reachedAlreadySaved) break;

      // 2. Scroll smoothly down the page
      window.scrollBy({
        top: window.innerHeight * 0.85,
        behavior: 'smooth',
      });

      // 3. Human-like randomized delay (1.5 to 3.0 seconds)
      await randomDelay(1500, 3000);
    }

    // Send any remaining bookmarks in pendingBatch
    if (pendingBatch.length > 0) {
      await sendBatchViaBackground(pendingBatch);
    }

    // Save sync info to chrome.storage
    chrome.storage.sync.set({
      shelf_last_sync_time: new Date().toISOString(),
      shelf_last_sync_count: capturedCount,
    });

    const finishMessage = reachedAlreadySaved
      ? `Caught up! ${capturedCount} bookmarks saved`
      : `Saved ${capturedCount} bookmarks to Shelf`;

    if (floatingWidget) {
      renderWidgetContent(floatingWidget, 'done', { message: finishMessage });
    }
  } catch (err: unknown) {
    console.error('Shelf sync error:', err);
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
function init() {
  const isBookmarksPage =
    window.location.pathname.includes('/bookmarks') ||
    window.location.pathname.includes('/i/bookmarks');

  if (isBookmarksPage) {
    createFloatingWidget();
  }
}

// Observe URL changes (single-page application navigation on X)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    init();
  }
}).observe(document, { subtree: true, childList: true });

init();
