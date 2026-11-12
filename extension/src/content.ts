import { extractTweetFromElement, type ExtractedTweet } from './extractor';
import { SELECTORS } from './selectors';

// Global state
let isCapturing = false;
let shouldStop = false;
let newlySavedCount = 0;
let alreadySavedCount = 0;
let savedTweetIds = new Set<string>();
let seenInSession = new Set<string>();
let pendingQueue: ExtractedTweet[] = [];
let floatingWidget: HTMLElement | null = null;

// Helper: load saved tweet IDs from local persistent extension storage
async function loadSavedTweetIdsFromStorage(): Promise<Set<string>> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['shelf_saved_tweet_ids'], (data) => {
        if (chrome.runtime.lastError) {
          console.warn('[shelf] Error reading storage.local:', chrome.runtime.lastError.message);
          resolve(new Set());
          return;
        }
        const list = data?.shelf_saved_tweet_ids;
        if (Array.isArray(list)) {
          resolve(new Set(list.map((id) => String(id))));
        } else {
          resolve(new Set());
        }
      });
    } catch (err) {
      console.error('[shelf] Exception loading saved IDs:', err);
      resolve(new Set());
    }
  });
}

// Helper: persist saved tweet IDs to local persistent extension storage
async function persistSavedTweetIds(ids: Set<string>): Promise<void> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set({ shelf_saved_tweet_ids: Array.from(ids) }, () => {
        resolve();
      });
    } catch (err) {
      console.error('[shelf] Exception persisting saved IDs:', err);
      resolve();
    }
  });
}

// Helper: broadcast sync progress to popup and storage
function broadcastSyncProgress(
  status: 'capturing' | 'done' | 'idle' | 'rate_limited' | 'error',
  statusText?: string
) {
  try {
    const payload = {
      type: 'SYNC_PROGRESS',
      isCapturing,
      savedCount: newlySavedCount,
      alreadySavedCount,
      status,
      statusText: statusText || (isCapturing ? `Syncing… ${newlySavedCount} saved` : 'Done'),
      isDone: status === 'done',
    };

    chrome.storage.local.set({ shelf_sync_state: payload });
    chrome.runtime.sendMessage(payload).catch(() => {
      // Popup might be closed, harmless
    });
  } catch (err) {
    console.warn('[shelf] Error broadcasting sync progress:', err);
  }
}

// Helper: detect if current URL is bookmarks or history
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

// Helper: fetch existing tweet IDs already saved in Shelf web app database
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

// Helper: send batch of tweets to background service worker for ingestion
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

// Helper: send batch with retry and exponential backoff (up to 5 attempts)
async function sendBatchWithRetry(batch: ExtractedTweet[], maxAttempts = 5): Promise<boolean> {
  let attempt = 0;
  let delayMs = 1000;

  while (attempt < maxAttempts) {
    if (shouldStop) return false;
    attempt++;
    try {
      console.log(`[shelf] Ingesting batch of ${batch.length} tweets (attempt ${attempt}/${maxAttempts})...`);
      const res = await sendBatchViaBackground(batch);
      console.log('[shelf] Ingest response:', res);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[shelf] Batch attempt ${attempt}/${maxAttempts} failed:`, msg);

      if (attempt >= maxAttempts) {
        console.error('[shelf] Batch failed all 5 attempts. Keeping in queue for next round.');
        return false;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s + jitter
      const jitter = Math.floor(Math.random() * 500);
      const waitTime = delayMs + jitter;
      console.log(`[shelf] Retrying batch in ${waitTime}ms...`);

      const startWait = Date.now();
      while (Date.now() - startWait < waitTime) {
        if (shouldStop) return false;
        await new Promise((r) => setTimeout(r, 200));
      }
      delayMs *= 2;
    }
  }
  return false;
}

// Helper: process pending queue in batches of ~20
async function processPendingQueue(forceFlushAll = false): Promise<void> {
  const BATCH_SIZE = 20;

  while (pendingQueue.length >= BATCH_SIZE || (forceFlushAll && pendingQueue.length > 0)) {
    if (shouldStop) break;

    const countToSend = Math.min(BATCH_SIZE, pendingQueue.length);
    const batch = pendingQueue.slice(0, countToSend);

    const success = await sendBatchWithRetry(batch, 5);
    if (success) {
      // Remove successfully ingested batch from queue
      pendingQueue.splice(0, countToSend);
      // Mark as saved
      batch.forEach((t) => savedTweetIds.add(t.tweet_id));
      newlySavedCount += countToSend;
      await persistSavedTweetIds(savedTweetIds);
      broadcastSyncProgress('capturing');

      if (floatingWidget) {
        renderWidgetContent(floatingWidget, 'capturing', {
          newCount: newlySavedCount,
          existingCount: alreadySavedCount,
        });
      }
    } else {
      // Keep tweets in queue for next round; do not drop or exit loop
      console.warn(`[shelf] ${pendingQueue.length} tweets remain queued for next round.`);
      break;
    }
  }
}

// Helper: find all candidate tweet elements in DOM
function findTweetElements(doc: Document): Element[] {
  try {
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
  } catch (err) {
    console.error('[shelf] Error finding tweet elements:', err);
    return [];
  }
}

// Helper: get visible status IDs currently in the DOM (accounts for list virtualization)
function getVisibleStatusIds(): Set<string> {
  const ids = new Set<string>();
  try {
    const links = document.querySelectorAll<HTMLAnchorElement>('a[href*="/status/"]');
    for (const a of links) {
      const href = a.getAttribute('href') || '';
      const match = href.match(/\/status\/(\d+)/);
      if (match && match[1]) {
        ids.add(match[1]);
      }
    }
  } catch (err) {
    console.error('[shelf] Error getting visible status IDs:', err);
  }
  return ids;
}

// Helper: check if Twitter is actively displaying a loading spinner
function isTwitterLoading(): boolean {
  return !!(
    document.querySelector('div[role="progressbar"]') ||
    document.querySelector('[aria-label="Loading…"]') ||
    document.querySelector('[aria-label="Loading"]') ||
    document.querySelector('svg[aria-label="Loading"]')
  );
}

// Helper: check and handle Twitter's "Retry" button after rate limit
async function checkAndHandleRetry(): Promise<boolean> {
  try {
    const candidates = Array.from(document.querySelectorAll('button, div[role="button"]'));
    for (const el of candidates) {
      const txt = (el.textContent || '').trim().toLowerCase();
      if (txt === 'retry' || txt === 'try again') {
        console.log('[shelf] Twitter retry button detected! Clicking and cooling down for 60 seconds...');
        try {
          (el as HTMLElement).click();
        } catch (clickErr) {
          console.error('[shelf] Error clicking retry button:', clickErr);
        }

        broadcastSyncProgress('rate_limited', 'Rate limited by X. Waiting 60s...');

        // Wait 60 seconds, checking shouldStop every second
        for (let sec = 60; sec > 0; sec--) {
          if (shouldStop) break;
          if (floatingWidget) {
            renderWidgetContent(floatingWidget, 'capturing', {
              newCount: newlySavedCount,
              statusText: `Rate limited. Waiting ${sec}s...`,
            });
          }
          await new Promise((r) => setTimeout(r, 1000));
        }
        return true;
      }
    }
  } catch (err) {
    console.error('[shelf] Error in checkAndHandleRetry:', err);
  }
  return false;
}

// Helper: nudge lazy loader when 0 tweets found in a round (scroll up ~600px, pause, then jump to bottom)
async function nudgeLazyLoader(): Promise<void> {
  console.log('[shelf] Nudging lazy loader: scrolling up ~600px, then jumping to bottom...');
  try {
    window.scrollBy({ top: -600, behavior: 'auto' });
    await new Promise((r) => setTimeout(r, 450));
    window.scrollTo({
      top: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      behavior: 'smooth',
    });
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 450, bubbles: true }));
    await new Promise((r) => setTimeout(r, 350));
  } catch (err) {
    console.error('[shelf] Error nudging lazy loader:', err);
  }
}

// Helper: trigger deep scroll on document and potential scrollable containers
function triggerDeepScroll(): void {
  try {
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 350, bubbles: true }));

    const scrollHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
    const currentY = window.scrollY || window.pageYOffset;
    const isNearBottom = currentY + window.innerHeight >= scrollHeight - 350;

    if (isNearBottom) {
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
  } catch (err) {
    console.error('[shelf] Error in triggerDeepScroll:', err);
  }
}

// Helper: wait up to 5 seconds using MutationObserver for new tweets or virtualization DOM updates
function waitForNewTweetsOrMutation(
  previousVisibleIds: Set<string>,
  timeoutMs = 5000
): Promise<boolean> {
  return new Promise((resolve) => {
    // Check if new IDs already mounted
    const currentIds = getVisibleStatusIds();
    for (const id of currentIds) {
      if (!previousVisibleIds.has(id)) {
        resolve(true);
        return;
      }
    }

    let resolved = false;
    let observer: MutationObserver | null = null;
    let checkInterval: number | null = null;
    let timer: number | null = null;

    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (checkInterval !== null) {
        window.clearInterval(checkInterval);
        checkInterval = null;
      }
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    const checkForChanges = () => {
      if (resolved) return;
      if (shouldStop) {
        cleanup();
        resolve(false);
        return;
      }
      const nowIds = getVisibleStatusIds();
      for (const id of nowIds) {
        if (!previousVisibleIds.has(id)) {
          cleanup();
          resolve(true);
          return;
        }
      }
    };

    try {
      observer = new MutationObserver(() => {
        checkForChanges();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (obsErr) {
      console.error('[shelf] Error creating MutationObserver:', obsErr);
    }

    // Interval poll fallback every 250ms
    checkInterval = window.setInterval(checkForChanges, 250);

    // Timeout fallback after timeoutMs
    timer = window.setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);
  });
}

// Create and inject the floating widget
function createFloatingWidget() {
  if (!document.body) return;

  const existing = document.getElementById('shelf-floating-widget');
  if (existing && document.body.contains(existing)) {
    return;
  }
  if (existing) {
    existing.remove();
  }

  const widget = document.createElement('div');
  widget.id = 'shelf-floating-widget';
  widget.style.cssText = `
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

  renderWidgetContent(widget, 'idle');
  document.body.appendChild(widget);
  floatingWidget = widget;
  console.log('[shelf] Floating widget anchored to document.body');
}

// Render the widget content according to state
function renderWidgetContent(
  container: HTMLElement,
  state: 'idle' | 'capturing' | 'done' | 'error',
  info?: {
    newCount?: number;
    existingCount?: number;
    message?: string;
    statusText?: string;
  }
) {
  if (state === 'idle') {
    const subText = isBookmarksOrHistoryPage() ? 'Sync bookmarks & history' : 'Sync visible posts';
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
          <span id="shelf-btn-sub" style="font-size: 10px; color: #38BDF8; font-weight: 500;">${subText}</span>
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
    const saved = info?.newCount || newlySavedCount;
    const existing = info?.existingCount || alreadySavedCount;
    const extraStatus = info?.statusText || (existing > 0 ? `${existing} already in Shelf` : 'Scanning bookmarks...');

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
          <span>Syncing… <strong>${saved} saved</strong></span>
          <span style="font-size: 10px; color: #38BDF8;">${extraStatus}</span>
        </div>
        <button id="shelf-btn-stop" style="
          background: #27272A;
          color: #F4F4F5;
          border: 1px solid #3F3F46;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 11px;
          cursor: pointer;
          font-weight: 600;
        ">Stop</button>
      </div>
    `;

    const stopBtn = container.querySelector('#shelf-btn-stop');
    stopBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      stopCapture();
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
        <span>✓ ${info?.message || 'Done'}</span>
      </div>
    `;
    setTimeout(() => {
      if (floatingWidget && !isCapturing) renderWidgetContent(floatingWidget, 'idle');
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
      if (floatingWidget && !isCapturing) renderWidgetContent(floatingWidget, 'idle');
    }, 5000);
  }
}

// Stop capture
function stopCapture() {
  if (!isCapturing) return;
  console.log('[shelf] Stop requested by user');
  shouldStop = true;
  broadcastSyncProgress('idle', 'Stopping sync...');
}

// Start continuous capture process
async function startCapture() {
  // Prevent duplicate runs
  if (isCapturing) {
    console.log('[shelf] Sync is already in progress. Ignoring duplicate start request.');
    return;
  }

  isCapturing = true;
  shouldStop = false;
  newlySavedCount = 0;
  alreadySavedCount = 0;
  pendingQueue = [];
  seenInSession = new Set<string>();

  if (floatingWidget) {
    renderWidgetContent(floatingWidget, 'capturing', { newCount: 0, existingCount: 0 });
  }
  broadcastSyncProgress('capturing', 'Syncing… 0 saved');

  console.log('[shelf] Starting full continuous bookmark sync...');

  // 1. Load saved IDs from local storage and backend
  const localSavedIds = await loadSavedTweetIdsFromStorage();
  savedTweetIds = new Set(localSavedIds);

  console.log(`[shelf] Loaded ${savedTweetIds.size} saved IDs from local storage.`);
  const backendCheck = await fetchKnownIdsViaBackground();
  if (backendCheck.success && backendCheck.ids) {
    backendCheck.ids.forEach((id) => savedTweetIds.add(id));
    await persistSavedTweetIds(savedTweetIds);
    console.log(`[shelf] Total known saved IDs merged: ${savedTweetIds.size}`);
  } else if (backendCheck.error) {
    console.warn('[shelf] Could not fetch known IDs from backend:', backendCheck.error);
    // Continue with locally stored IDs!
  }

  let emptyRounds = 0;
  const MAX_EMPTY_ROUNDS = 8; // Only finish after ~8 consecutive rounds with 0 new tweets

  try {
    while (!shouldStop && emptyRounds < MAX_EMPTY_ROUNDS) {
      try {
        // A. Check for X's "Retry" button
        const hadRetry = await checkAndHandleRetry();
        if (hadRetry) {
          emptyRounds = 0;
          continue;
        }

        if (shouldStop) break;

        // B. Check for active loading spinner
        if (isTwitterLoading()) {
          console.log('[shelf] Twitter network loading spinner active, waiting...');
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }

        // C. Snapshot visible status IDs before scrolling to detect new renders
        const previousVisibleIds = getVisibleStatusIds();

        // D. Scan and extract all visible tweets in DOM
        const elements = findTweetElements(document);
        let newDiscoveredInRound = 0;

        for (const el of elements) {
          if (shouldStop) break;
          try {
            const tweet = extractTweetFromElement(el);
            if (!tweet || !tweet.tweet_id) continue;

            // Check if already in Shelf
            if (savedTweetIds.has(tweet.tweet_id)) {
              if (!seenInSession.has(tweet.tweet_id)) {
                seenInSession.add(tweet.tweet_id);
                alreadySavedCount++;
              }
              continue;
            }

            // New bookmark found!
            if (!seenInSession.has(tweet.tweet_id)) {
              seenInSession.add(tweet.tweet_id);
              pendingQueue.push(tweet);
              newDiscoveredInRound++;
              console.log(`[shelf] Found new bookmark: ${tweet.tweet_id} by @${tweet.author_handle}`);
            }
          } catch (tweetErr) {
            console.error('[shelf] Error extracting tweet element:', tweetErr);
          }
        }

        // E. Update empty rounds counter
        if (newDiscoveredInRound > 0) {
          emptyRounds = 0;
        } else {
          emptyRounds++;
          console.log(`[shelf] No new tweets this round. Consecutive empty rounds: ${emptyRounds}/${MAX_EMPTY_ROUNDS}`);
        }

        // F. Update UI with progress
        if (floatingWidget) {
          renderWidgetContent(floatingWidget, 'capturing', {
            newCount: newlySavedCount + pendingQueue.length,
            existingCount: alreadySavedCount,
          });
        }
        broadcastSyncProgress('capturing');

        // G. Process pending queue in batches of ~20 with retry
        await processPendingQueue(false);

        if (shouldStop) break;

        // H. If consecutive empty round, nudge the lazy loader (scroll up ~600px then bottom)
        if (emptyRounds > 0 && emptyRounds < MAX_EMPTY_ROUNDS) {
          await nudgeLazyLoader();
        } else {
          triggerDeepScroll();
        }

        // I. Wait with MutationObserver for X to render new tweet articles (up to 5s)
        await waitForNewTweetsOrMutation(previousVisibleIds, 5000);
      } catch (iterErr) {
        console.error('[shelf] Loop iteration error:', iterErr);
        // Never exit the loop on error; continue
      }
    }

    // Flush any remaining tweets in queue (even if < 20)
    try {
      if (pendingQueue.length > 0 && !shouldStop) {
        console.log(`[shelf] Flushing final ${pendingQueue.length} queued tweets...`);
        await processPendingQueue(true);
      }
    } catch (flushErr) {
      console.error('[shelf] Error in final queue flush:', flushErr);
    }

    // Save final stats
    chrome.storage.sync.set({
      shelf_last_sync_time: new Date().toISOString(),
      shelf_last_sync_count: newlySavedCount,
    });

    let finishMsg = '';
    if (shouldStop) {
      finishMsg = `Stopped (${newlySavedCount} saved)`;
    } else if (newlySavedCount > 0) {
      finishMsg = `Done (${newlySavedCount} saved)`;
    } else if (alreadySavedCount > 0) {
      finishMsg = `Done (${alreadySavedCount} in Shelf)`;
    } else {
      finishMsg = isBookmarksOrHistoryPage() ? 'Done (no bookmarks found)' : 'Done';
    }

    if (floatingWidget) {
      renderWidgetContent(floatingWidget, 'done', { message: finishMsg });
    }
    broadcastSyncProgress('done', finishMsg);
    console.log(`[shelf] Sync finished! Total saved: ${newlySavedCount}, Total existing: ${alreadySavedCount}`);
  } catch (err: unknown) {
    console.error('[shelf] Fatal sync error:', err);
    const msg = err instanceof Error ? err.message : 'Sync interrupted';
    if (floatingWidget) {
      renderWidgetContent(floatingWidget, 'error', { message: msg });
    }
    broadcastSyncProgress('error', msg);
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

    try {
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

      const removeTrigger = target.closest(
        '[data-testid="removeBookmark"], ' +
        '[aria-label*="Remove"][aria-label*="ookmark"], ' +
        '[aria-label*="remove"][aria-label*="ookmark"], ' +
        '[data-testid="bookmark"][aria-label*="Remove"], ' +
        '[data-testid="bookmark"][aria-label*="remove"]'
      );

      const menuItem = target.closest('[role="menuitem"], [data-testid="Dropdown"]');
      const isMenuRemove = menuItem && /remove.*bookmark|delete.*bookmark/i.test(menuItem.textContent || '');

      if (removeTrigger || isMenuRemove) {
        let tweetId = '';

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
          console.log('[shelf] Un-bookmark action detected on X for tweet:', tweetId);
          savedTweetIds.delete(tweetId);
          persistSavedTweetIds(savedTweetIds);

          chrome.runtime.sendMessage(
            {
              type: 'DELETE_BOOKMARK',
              tweetId,
            },
            (response) => {
              if (response && response.success) {
                console.log('[shelf] Bookmark auto-removed from Shelf library:', tweetId);
                showRemovalNotice(tweetId);
              }
            }
          );
        }
      }
    } catch (unbookErr) {
      console.error('[shelf] Error in un-bookmark click listener:', unbookErr);
    }
  },
  true
);

// Listen for messages from popup or shortcuts
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  try {
    if (req.action === 'START_CAPTURE') {
      if (isCapturing) {
        sendResponse({ started: false, alreadyRunning: true });
      } else {
        startCapture();
        sendResponse({ started: true });
      }
      return true;
    }

    if (req.action === 'STOP_CAPTURE') {
      stopCapture();
      sendResponse({ stopped: true });
      return true;
    }
  } catch (msgErr) {
    console.error('[shelf] Error in content script onMessage listener:', msgErr);
    sendResponse({ error: String(msgErr) });
    return true;
  }
});

// Watchdog interval to make sure pill stays anchored
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
