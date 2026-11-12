import type { ExtractedTweet } from './extractor';
import { parseBookmarksApiResponse, type ParsedBookmarksPage } from './bookmarks_parser';

// Global state
let isCapturing = false;
let shouldStop = false;
let newlySavedCount = 0;
let alreadySavedCount = 0;
let savedTweetIds = new Set<string>();
let seenThisSession = new Set<string>();
let pendingQueue: ExtractedTweet[] = [];
let floatingWidget: HTMLElement | null = null;
let hasAutoSyncedForCurrentVisit = false;
let autoSyncTimer: number | null = null;

interface InterceptedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  response: any;
  timestamp: number;
}

let lastInterceptedRequest: InterceptedRequest | null = null;
let interceptResolver: ((req: InterceptedRequest) => void) | null = null;
let requestIdCounter = 0;

// Listen for network interception messages from the MAIN-world interceptor
window.addEventListener('message', (event) => {
  if (event.data?.type === 'SHELF_BOOKMARKS_INTERCEPTED') {
    const { url, method, headers, body, response } = event.data;
    if (url && response) {
      lastInterceptedRequest = {
        url,
        method: method || 'GET',
        headers: headers || {},
        body,
        response,
        timestamp: Date.now(),
      };
      if (interceptResolver) {
        interceptResolver(lastInterceptedRequest);
        interceptResolver = null;
      }
      console.log('[shelf] Captured X Bookmarks API request & response.');
    }
  }
});

/**
 * Send request to MAIN-world interceptor to fetch the next bookmarks page using X's session context
 */
function requestNextPageFromMainWorld(params: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<{
  success: boolean;
  status?: number;
  rateLimitReset?: number;
  rateLimitRemaining?: number;
  response?: any;
  error?: string;
}> {
  return new Promise((resolve) => {
    const requestId = `shelf_req_${Date.now()}_${++requestIdCounter}`;
    let resolved = false;

    const handler = (event: MessageEvent) => {
      if (
        event.data?.type === 'SHELF_NEXT_PAGE_RESPONSE' &&
        event.data?.requestId === requestId
      ) {
        window.removeEventListener('message', handler);
        resolved = true;
        resolve(event.data);
      }
    };

    window.addEventListener('message', handler);

    // 45s safety timeout
    setTimeout(() => {
      if (!resolved) {
        window.removeEventListener('message', handler);
        resolve({
          success: false,
          error: 'Timeout waiting for next bookmarks page from page context',
        });
      }
    }, 45000);

    window.postMessage(
      {
        type: 'SHELF_FETCH_NEXT_BOOKMARKS_PAGE',
        requestId,
        ...params,
      },
      '*'
    );
  });
}

/**
 * Build the URL and optional body for the next page request by updating the cursor in variables
 */
function buildNextPageRequest(
  baseRequest: InterceptedRequest,
  cursor: string
): { url: string; body?: string } {
  const method = (baseRequest.method || 'GET').toUpperCase();

  if (method === 'GET') {
    try {
      const urlObj = new URL(baseRequest.url, window.location.origin);
      const varsStr = urlObj.searchParams.get('variables');
      if (varsStr) {
        const vars = JSON.parse(varsStr);
        vars.cursor = cursor;
        vars.count = 20;
        urlObj.searchParams.set('variables', JSON.stringify(vars));
      } else {
        urlObj.searchParams.set('cursor', cursor);
      }
      return { url: urlObj.toString() };
    } catch {
      return { url: `${baseRequest.url}&cursor=${encodeURIComponent(cursor)}` };
    }
  } else {
    // POST request
    let nextBody = baseRequest.body;
    try {
      if (baseRequest.body) {
        const parsed = JSON.parse(baseRequest.body);
        if (parsed.variables) {
          parsed.variables.cursor = cursor;
          parsed.variables.count = 20;
        } else {
          parsed.cursor = cursor;
        }
        nextBody = JSON.stringify(parsed);
      }
    } catch {
      // Keep existing body if parsing fails
    }
    return { url: baseRequest.url, body: nextBody };
  }
}

/**
 * Build the URL and optional body for the top page request by removing any cursor
 */
function buildTopPageRequest(baseRequest: InterceptedRequest): { url: string; body?: string } {
  const method = (baseRequest.method || 'GET').toUpperCase();

  if (method === 'GET') {
    try {
      const urlObj = new URL(baseRequest.url, window.location.origin);
      const varsStr = urlObj.searchParams.get('variables');
      if (varsStr) {
        const vars = JSON.parse(varsStr);
        delete vars.cursor;
        vars.count = 20;
        urlObj.searchParams.set('variables', JSON.stringify(vars));
      } else {
        urlObj.searchParams.delete('cursor');
      }
      return { url: urlObj.toString() };
    } catch {
      return { url: baseRequest.url };
    }
  } else {
    // POST request
    let nextBody = baseRequest.body;
    try {
      if (baseRequest.body) {
        const parsed = JSON.parse(baseRequest.body);
        if (parsed.variables) {
          delete parsed.variables.cursor;
          parsed.variables.count = 20;
        } else {
          delete parsed.cursor;
        }
        nextBody = JSON.stringify(parsed);
      }
    } catch {
      // Keep existing body if parsing fails
    }
    return { url: baseRequest.url, body: nextBody };
  }
}

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
  statusText?: string,
  unsavedCount?: number
) {
  try {
    const payload = {
      type: 'SYNC_PROGRESS',
      isCapturing,
      savedCount: newlySavedCount,
      alreadySavedCount,
      unsavedCount: unsavedCount || (status === 'done' ? pendingQueue.length : 0),
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
async function fetchKnownIdsViaBackground(): Promise<{
  success: boolean;
  ids: Set<string>;
  isAuthError?: boolean;
  status?: number;
  error?: string;
}> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_KNOWN_IDS' }, (res) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          isAuthError: false,
          ids: new Set(),
          error: chrome.runtime.lastError.message,
        });
        return;
      }
      if (!res || !res.success) {
        const isAuth = Boolean(
          res?.isAuthError ||
            res?.status === 401 ||
            (res?.error &&
              (res.error.includes('Not connected to Shelf') ||
                res.error.includes('401') ||
                res.error.includes('API Token not configured')))
        );
        resolve({
          success: false,
          isAuthError: isAuth,
          status: res?.status || (isAuth ? 401 : 500),
          ids: new Set(),
          error: res?.error || 'Failed to connect to Shelf web app',
        });
        return;
      }
      const ids = new Set<string>((res.knownIds || []).map((id: any) => String(id)));
      resolve({ success: true, isAuthError: false, ids });
    });
  });
}

// Result interface for batch ingestion
interface SendBatchResult {
  success: boolean;
  added?: number;
  skipped?: number;
  isAuthError?: boolean;
  status?: number;
  error?: string;
}

// Helper: send batch of tweets to background service worker for ingestion
async function sendBatchViaBackground(batch: ExtractedTweet[]): Promise<SendBatchResult> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: 'INGEST_BATCH',
        batch,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            isAuthError: false,
            error: chrome.runtime.lastError.message,
          });
          return;
        }
        if (!response || !response.success) {
          const isAuth = Boolean(
            response?.isAuthError ||
              response?.status === 401 ||
              (response?.error &&
                (response.error.includes('Not connected to Shelf') ||
                  response.error.includes('401') ||
                  response.error.includes('API Token not configured')))
          );
          resolve({
            success: false,
            isAuthError: isAuth,
            status: response?.status || (isAuth ? 401 : 500),
            error: response?.error || 'Ingest failed via background worker',
          });
          return;
        }
        resolve({
          success: true,
          isAuthError: false,
          added: response.added || 0,
          skipped: response.skipped || 0,
        });
      }
    );
  });
}

// Helper: interruptible sleep that checks shouldStop frequently (exits within ~100ms when stopped)
async function sleepInterruptible(ms: number, stepMs = 100): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (shouldStop) return false;
    const remaining = ms - (Date.now() - start);
    await new Promise((r) => setTimeout(r, Math.min(stepMs, remaining)));
  }
  return !shouldStop;
}

// Helper: send batch with retry and exponential backoff (up to 5 attempts)
async function sendBatchWithRetry(
  batch: ExtractedTweet[],
  maxAttempts = 5
): Promise<{ success: boolean; isAuthError?: boolean; error?: string }> {
  let attempt = 0;
  let delayMs = 1000;

  while (attempt < maxAttempts) {
    if (shouldStop) return { success: false };
    attempt++;

    console.log(`[shelf] Ingesting batch of ${batch.length} tweets (attempt ${attempt}/${maxAttempts})...`);
    const res = await sendBatchViaBackground(batch);

    if (res.success) {
      console.log('[shelf] Ingest response:', res);
      return { success: true };
    }

    // 1. IF 401 AUTH ERROR: DO NOT RETRY WITH BACKOFF!
    if (res.isAuthError) {
      console.error('[shelf] Auth error (401) on batch ingest. Aborting immediately without retry.');
      return { success: false, isAuthError: true, error: res.error };
    }

    if (shouldStop) return { success: false };

    // 2. Network errors and 5xx responses: Log and retry with exponential backoff
    console.error(`[shelf] Batch attempt ${attempt}/${maxAttempts} failed (server/network):`, res.error);

    if (attempt >= maxAttempts) {
      console.error('[shelf] Batch failed all 5 attempts. Keeping in queue for next round.');
      return { success: false, error: res.error };
    }

    const jitter = Math.floor(Math.random() * 500);
    const waitTime = delayMs + jitter;
    console.log(`[shelf] Retrying batch in ${waitTime}ms...`);

    const ok = await sleepInterruptible(waitTime);
    if (!ok || shouldStop) {
      console.log('[shelf] Batch backoff cancelled due to stop request.');
      return { success: false };
    }
    delayMs *= 2;
  }

  return { success: false };
}

// Helper: process pending queue in batches of ~20
async function processPendingQueue(forceFlushAll = false): Promise<{ authError?: boolean }> {
  const BATCH_SIZE = 20;

  while (pendingQueue.length >= BATCH_SIZE || (forceFlushAll && pendingQueue.length > 0)) {
    if (shouldStop) break;

    const countToSend = Math.min(BATCH_SIZE, pendingQueue.length);
    const batch = pendingQueue.slice(0, countToSend);

    const result = await sendBatchWithRetry(batch, 5);

    if (result.isAuthError) {
      console.error('[shelf] Auth error (401) mid-sync. Halting queue processing immediately.');
      const authMsg = 'Not connected to Shelf. Please reconnect your API token';
      shouldStop = true;
      if (floatingWidget) {
        renderWidgetContent(floatingWidget, 'error', { message: authMsg });
      }
      broadcastSyncProgress('error', authMsg);
      return { authError: true };
    }

    if (result.success) {
      pendingQueue.splice(0, countToSend);
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
      console.warn(`[shelf] ${pendingQueue.length} tweets remain queued for next round.`);
      break;
    }
  }

  return { authError: false };
}

// Stop capture
function stopCapture() {
  if (!isCapturing) return;
  console.log('[shelf] Stop requested by user');
  shouldStop = true;
  broadcastSyncProgress('idle', 'Stopping sync...');
  if (floatingWidget) {
    renderWidgetContent(floatingWidget, 'capturing', {
      newCount: newlySavedCount,
      existingCount: alreadySavedCount,
      statusText: 'Stopping...',
    });
  }
}

/**
 * Run a pagination pass (either incremental or full scan to the end).
 * Returns whether the pass completed normally without being stopped by user or 401.
 */
async function runPaginationPass(options: {
  captured: InterceptedRequest;
  startCursor: string | null;
  isIncremental: boolean;
  isFirstPassFromInitialTop: boolean;
  passName?: string;
}): Promise<{ reachedEnd: boolean; authError?: boolean }> {
  const { captured, startCursor, isIncremental, isFirstPassFromInitialTop, passName } = options;

  let pageNumber = 1;
  let currentCursor: string | null = startCursor;
  let lastCursor: string | null = null;
  let isFirstPage = isFirstPassFromInitialTop;
  let consecutiveAlreadySavedPages = 0;

  console.log(
    `[shelf] Starting pass "${passName || 'pagination'}" (cursor: ${startCursor ? 'resumed' : 'top'}, incremental: ${isIncremental})...`
  );

  while (!shouldStop) {
    let pageResult: ParsedBookmarksPage | null = null;

    try {
      if (isFirstPage) {
        isFirstPage = false;
        pageResult = parseBookmarksApiResponse(captured.response);
      } else {
        const pageRequest = currentCursor
          ? buildNextPageRequest(captured, currentCursor)
          : buildTopPageRequest(captured);

        const fetchRes = await requestNextPageFromMainWorld({
          url: pageRequest.url,
          method: captured.method,
          headers: captured.headers,
          body: pageRequest.body,
        });

        if (shouldStop) return { reachedEnd: false };

        // Rate limit 429 handling
        if (fetchRes.status === 429) {
          const resetHeader = fetchRes.rateLimitReset;
          const nowSec = Math.floor(Date.now() / 1000);
          let waitSeconds = resetHeader && resetHeader > nowSec ? resetHeader - nowSec : 60;
          if (waitSeconds > 900) waitSeconds = 900;

          console.warn(`[shelf] HTTP 429 Rate limited. Waiting ${waitSeconds}s until reset (${resetHeader})...`);

          if (!isIncremental && currentCursor) {
            await chrome.storage.local.set({ shelf_last_cursor: currentCursor });
          }

          for (let s = waitSeconds; s > 0; s--) {
            if (shouldStop) break;
            const mins = Math.floor(s / 60);
            const secs = s % 60;
            const formatted = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
            const statusText = `Rate limited by X. Resuming in ${formatted}...`;

            if (floatingWidget) {
              renderWidgetContent(floatingWidget, 'capturing', {
                newCount: newlySavedCount + pendingQueue.length,
                existingCount: alreadySavedCount,
                statusText,
              });
            }
            broadcastSyncProgress('rate_limited', statusText);

            const ok = await sleepInterruptible(1000);
            if (!ok || shouldStop) break;
          }

          if (shouldStop) return { reachedEnd: false };
          continue;
        }

        if (!fetchRes.success || !fetchRes.response) {
          console.error('[shelf] Failed to fetch next bookmarks page:', fetchRes.error || fetchRes.status);
          await sleepInterruptible(2000);
          return { reachedEnd: false };
        }

        pageResult = parseBookmarksApiResponse(fetchRes.response);
      }

      if (!pageResult) {
        console.warn('[shelf] Empty page result returned.');
        return { reachedEnd: true };
      }

      const pageTweets = pageResult.tweets;
      let newToSaveInThisPage = 0;

      for (const tweet of pageTweets) {
        if (shouldStop) break;
        try {
          if (!tweet || !tweet.tweet_id) continue;

          const isNewToSession = !seenThisSession.has(tweet.tweet_id);
          if (isNewToSession) {
            seenThisSession.add(tweet.tweet_id);
          }

          if (savedTweetIds.has(tweet.tweet_id)) {
            if (isNewToSession) {
              alreadySavedCount++;
            }
          } else {
            if (isNewToSession) {
              pendingQueue.push(tweet);
              newToSaveInThisPage++;
            }
          }
        } catch (tErr) {
          console.error('[shelf] Error processing parsed tweet:', tErr);
        }
      }

      // Check if page contains ONLY tweets already saved in Shelf
      const isPageAllAlreadySaved = pageTweets.length > 0 && newToSaveInThisPage === 0;

      if (isPageAllAlreadySaved) {
        consecutiveAlreadySavedPages++;
      } else if (newToSaveInThisPage > 0) {
        consecutiveAlreadySavedPages = 0;
      }

      // Process pending queue in batches of ~20
      const queueRes = await processPendingQueue(false);
      if (queueRes.authError) {
        console.error('[shelf] Sync stopped due to auth error (401).');
        return { reachedEnd: false, authError: true };
      }

      const bottomCursor = pageResult.bottomCursor;

      // Logging requirement:
      console.log(
        `[shelf] Page ${pageNumber}: ${pageTweets.length} tweets on page, ` +
        `${seenThisSession.size} total seen, ${pendingQueue.length + newlySavedCount} new to save, ` +
        `bottom cursor: ${bottomCursor ? (bottomCursor === currentCursor ? 'unchanged' : 'received') : 'none'}`
      );

      // Update widget UI
      if (floatingWidget) {
        renderWidgetContent(floatingWidget, 'capturing', {
          newCount: newlySavedCount + pendingQueue.length,
          existingCount: alreadySavedCount,
          statusText: `Page ${pageNumber} • ${seenThisSession.size} seen`,
        });
      }
      broadcastSyncProgress('capturing');

      // Requirement 1 Incremental Stop condition:
      // "stop once 2 consecutive pages contain only tweets already saved in Shelf (log 'Caught up with existing bookmarks')"
      if (isIncremental && consecutiveAlreadySavedPages >= 2) {
        console.log('[shelf] Caught up with existing bookmarks');
        return { reachedEnd: true };
      }

      // Stop condition: page returns no new tweet entries
      if (pageTweets.length === 0) {
        console.log(`[shelf] Page ${pageNumber} returned 0 tweets. Timeline ended.`);
        return { reachedEnd: true };
      }

      // Stop condition: bottom cursor reached end or stopped changing
      if (!bottomCursor || bottomCursor === currentCursor || bottomCursor === lastCursor) {
        console.log(`[shelf] Bottom cursor reached end or stopped changing (${bottomCursor}).`);
        return { reachedEnd: true };
      }

      // If full manual scan, persist cursor for resumption
      if (!isIncremental) {
        await chrome.storage.local.set({ shelf_last_cursor: bottomCursor });
      }

      lastCursor = currentCursor;
      currentCursor = bottomCursor;
      pageNumber++;

      // Wait 2–3 seconds between pages
      const delay = Math.floor(Math.random() * 1000) + 2000;
      const ok = await sleepInterruptible(delay);
      if (!ok || shouldStop) return { reachedEnd: false };
    } catch (pageErr) {
      console.error('[shelf] Error in page iteration:', pageErr);
      await sleepInterruptible(2000);
    }
  }

  return { reachedEnd: !shouldStop };
}

// Start continuous bookmark sync using network-based GraphQL pagination
async function startCapture(isAutoSync = false) {
  if (isCapturing) {
    console.log('[shelf] Sync is already in progress. Ignoring duplicate start request.');
    return;
  }

  // Cancel any pending auto-sync timer and mark as synced for this visit
  if (autoSyncTimer !== null) {
    window.clearTimeout(autoSyncTimer);
    autoSyncTimer = null;
  }
  hasAutoSyncedForCurrentVisit = true;

  isCapturing = true;
  shouldStop = false;
  newlySavedCount = 0;
  alreadySavedCount = 0;
  pendingQueue = [];
  seenThisSession = new Set<string>();

  if (floatingWidget) {
    renderWidgetContent(floatingWidget, 'capturing', { newCount: 0, existingCount: 0 });
  }
  broadcastSyncProgress('capturing', 'Syncing… 0 saved');

  console.log(`[shelf] Starting network-based bookmark sync (${isAutoSync ? 'auto-sync incremental' : 'manual full scan'})...`);

  // 1. Synchronize known saved IDs: Server is authoritative source of truth
  const localSavedIds = await loadSavedTweetIdsFromStorage();
  console.log(`[shelf] Loaded ${localSavedIds.size} saved IDs from local storage cache.`);

  const backendCheck = await fetchKnownIdsViaBackground();

  // Handle 401 auth failure upfront
  if (backendCheck.isAuthError) {
    console.error('[shelf] Auth failure connecting to Shelf (401). Aborting sync.');
    const authMsg = 'Not connected to Shelf. Please reconnect your API token';
    if (floatingWidget) {
      renderWidgetContent(floatingWidget, 'error', { message: authMsg });
    }
    broadcastSyncProgress('error', authMsg);
    isCapturing = false;
    shouldStop = false;
    return;
  }

  if (backendCheck.success && backendCheck.ids) {
    savedTweetIds = new Set(backendCheck.ids);
    await persistSavedTweetIds(savedTweetIds);
    console.log(`[shelf] Synchronized with Shelf server: ${savedTweetIds.size} active saved IDs.`);
  } else {
    console.warn(
      '[shelf] Could not reach Shelf server to fetch known IDs (' +
        (backendCheck.error || 'network error') +
        '). Using local storage cache.'
    );
    savedTweetIds = new Set(localSavedIds);
  }

  // 2. Capture X's Bookmarks API request
  let captured = lastInterceptedRequest;
  if (!captured) {
    console.log('[shelf] Waiting up to 10s to capture X Bookmarks API request...');
    if (floatingWidget) {
      renderWidgetContent(floatingWidget, 'capturing', {
        newCount: 0,
        existingCount: 0,
        statusText: 'Connecting to X API...',
      });
    }
    broadcastSyncProgress('capturing', 'Connecting to X API...');

    captured = await new Promise<InterceptedRequest | null>((resolve) => {
      let timer: number | null = null;
      const resolver = (req: InterceptedRequest) => {
        if (timer !== null) clearTimeout(timer);
        resolve(req);
      };
      interceptResolver = resolver;
      timer = window.setTimeout(() => {
        if (interceptResolver === resolver) {
          interceptResolver = null;
        }
        resolve(null);
      }, 10000);
    });
  }

  // Fallback: If no Bookmarks API request is captured within 10s, display notice rather than falling back to scrolling
  if (!captured) {
    console.warn('[shelf] No Bookmarks API request captured within 10s.');
    const fallbackMsg = 'Reload the bookmarks page and try again';
    if (floatingWidget) {
      renderWidgetContent(floatingWidget, 'error', { message: fallbackMsg });
    }
    broadcastSyncProgress('error', fallbackMsg);
    isCapturing = false;
    shouldStop = false;
    return;
  }

  // 3. Check for stored cursor resume (manual full scans only)
  let storedCursor: string | null = null;
  if (!isAutoSync) {
    try {
      const data = await new Promise<{ shelf_last_cursor?: string }>((resolve) => {
        chrome.storage.local.get(['shelf_last_cursor'], (res) => resolve(res || {}));
      });
      if (data?.shelf_last_cursor) {
        storedCursor = data.shelf_last_cursor;
        console.log('[shelf] Resuming sync from saved cursor:', storedCursor);
      }
    } catch (err) {
      console.warn('[shelf] Error checking stored cursor:', err);
    }
  }

  try {
    if (isAutoSync) {
      // 1. Auto-sync: start from the top and stop once 2 consecutive pages contain only tweets already saved
      await runPaginationPass({
        captured,
        startCursor: null,
        isIncremental: true,
        isFirstPassFromInitialTop: true,
        passName: 'Auto-sync incremental pass',
      });
    } else if (storedCursor) {
      // 2. Resuming from shelf_last_cursor:
      // Pass 1: resume from saved cursor to the very end
      const pass1 = await runPaginationPass({
        captured,
        startCursor: storedCursor,
        isIncremental: false,
        isFirstPassFromInitialTop: false,
        passName: 'Resumed full scan pass',
      });

      // When a run resumes from a saved cursor and reaches the end, also do an incremental pass from the top
      // so bookmarks added since the interruption aren't missed.
      if (pass1.reachedEnd && !shouldStop) {
        console.log('[shelf] Resumed pass reached end. Now running incremental pass from the top so bookmarks added since interruption are not missed...');
        if (floatingWidget) {
          renderWidgetContent(floatingWidget, 'capturing', {
            newCount: newlySavedCount + pendingQueue.length,
            existingCount: alreadySavedCount,
            statusText: 'Catching up from top...',
          });
        }
        broadcastSyncProgress('capturing', 'Catching up from top...');

        const pass2 = await runPaginationPass({
          captured,
          startCursor: null,
          isIncremental: true,
          isFirstPassFromInitialTop: false,
          passName: 'Post-resume incremental catch-up pass',
        });

        // Clear shelf_last_cursor only after BOTH are done!
        if (pass2.reachedEnd && !shouldStop) {
          await chrome.storage.local.remove('shelf_last_cursor');
          console.log('[shelf] Both resumed pass and top catch-up pass completed. Cleared shelf_last_cursor.');
        }
      }
    } else {
      // 3. Manual full scan from top to the very end
      const fullPass = await runPaginationPass({
        captured,
        startCursor: null,
        isIncremental: false,
        isFirstPassFromInitialTop: true,
        passName: 'Manual full scan pass',
      });

      if (fullPass.reachedEnd && !shouldStop) {
        await chrome.storage.local.remove('shelf_last_cursor');
        console.log('[shelf] Full scan completed to end. Cleared shelf_last_cursor.');
      }
    }

    // 4. Final flush: ensure any remaining tweets in pendingQueue are flushed with retry before completing
    if (pendingQueue.length > 0 && !shouldStop) {
      console.log(`[shelf] Flushing final ${pendingQueue.length} queued tweets with retry before completing...`);
      if (floatingWidget) {
        renderWidgetContent(floatingWidget, 'capturing', {
          newCount: newlySavedCount + pendingQueue.length,
          existingCount: alreadySavedCount,
          statusText: `Saving final ${pendingQueue.length} bookmarks...`,
        });
      }
      broadcastSyncProgress('capturing', `Saving final ${pendingQueue.length} bookmarks...`);

      try {
        const flushRes = await processPendingQueue(true);
        if (flushRes.authError) {
          isCapturing = false;
          shouldStop = false;
          return;
        }
      } catch (flushErr) {
        console.error('[shelf] Error in final queue flush:', flushErr);
      }
    }

    // Save final stats
    chrome.storage.sync.set({
      shelf_last_sync_time: new Date().toISOString(),
      shelf_last_sync_count: newlySavedCount,
    });

    const unsavedCount = pendingQueue.length;
    const totalSeen = seenThisSession.size;

    // Final summary logging
    console.log(
      `[shelf] Sync finished summary:\n` +
      `  • Total tweets seen this session: ${totalSeen}\n` +
      `  • Newly saved: ${newlySavedCount}\n` +
      `  • Already existing in Shelf: ${alreadySavedCount}\n` +
      `  • Unsaved (failed batches): ${unsavedCount}`
    );

    let finishMsg = '';
    let isWarning = false;

    if (shouldStop) {
      finishMsg = `Stopped (${newlySavedCount} saved, ${totalSeen} seen)`;
    } else if (isAutoSync) {
      // Incremental sync finish message: "Up to date: N new saved"
      if (unsavedCount > 0) {
        isWarning = true;
        finishMsg = `Up to date: ${newlySavedCount} new saved (${unsavedCount} unsaved)`;
      } else {
        finishMsg = `Up to date: ${newlySavedCount} new saved`;
      }
    } else if (unsavedCount > 0) {
      isWarning = true;
      finishMsg = `Done: ${totalSeen} seen, ${newlySavedCount} newly saved (${unsavedCount} unsaved)`;
    } else {
      finishMsg = `Done: ${totalSeen} seen, ${newlySavedCount} newly saved`;
    }

    if (floatingWidget) {
      renderWidgetContent(floatingWidget, 'done', {
        message: finishMsg,
        warning: isWarning,
      });
    }
    broadcastSyncProgress('done', finishMsg, unsavedCount);
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
    warning?: boolean;
  }
) {
  if (state === 'idle') {
    const subText = isBookmarksOrHistoryPage() ? 'Sync bookmarks' : 'Go to Bookmarks';
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
      startCapture(false);
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
    const isWarning = Boolean(info?.warning);
    const bgColor = isWarning ? '#78350F' : '#064E3B';
    const borderColor = isWarning ? '#D97706' : '#059669';
    const textColor = isWarning ? '#FEF3C7' : '#ECFDF5';
    const icon = isWarning ? '⚠' : '✓';
    container.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        background: ${bgColor};
        color: ${textColor};
        padding: 10px 18px;
        border-radius: 9999px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        font-size: 13px;
        font-weight: 500;
        border: 1px solid ${borderColor};
      ">
        <span>${icon} ${info?.message || 'Done'}</span>
      </div>
    `;
    setTimeout(() => {
      if (floatingWidget && !isCapturing) renderWidgetContent(floatingWidget, 'idle');
    }, isWarning ? 7000 : 4500);
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
    }, 7000);
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
    const expected = isSpecial ? 'Sync bookmarks' : 'Go to Bookmarks';
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
        startCapture(false);
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

// Helper: detect if current URL is specifically the bookmarks page
function isBookmarksPage(): boolean {
  const url = window.location.href.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  return (
    path.startsWith('/i/bookmarks') ||
    url.includes('x.com/i/bookmarks') ||
    url.includes('twitter.com/i/bookmarks')
  );
}

// Automatically start sync a few seconds after x.com/i/bookmarks loads if enabled (on by default)
function checkAndScheduleAutoSync() {
  if (!isBookmarksPage()) {
    // Navigated away from bookmarks: reset visit tracking and clear pending auto-sync timer
    hasAutoSyncedForCurrentVisit = false;
    if (autoSyncTimer !== null) {
      window.clearTimeout(autoSyncTimer);
      autoSyncTimer = null;
    }
    return;
  }

  // If already capturing or already triggered auto-sync for this visit, don't trigger again
  if (hasAutoSyncedForCurrentVisit || isCapturing) {
    return;
  }

  if (autoSyncTimer !== null) {
    return;
  }

  try {
    chrome.storage.sync.get(['shelf_auto_sync_on_open'], (data) => {
      if (chrome.runtime.lastError) return;

      // Default is true (on by default)
      const isAutoSyncEnabled = data?.shelf_auto_sync_on_open !== false;
      if (!isAutoSyncEnabled) return;

      if (hasAutoSyncedForCurrentVisit || isCapturing || autoSyncTimer !== null) return;

      console.log('[shelf] Auto-sync is enabled. Sync will start automatically in 3 seconds...');

      autoSyncTimer = window.setTimeout(() => {
        autoSyncTimer = null;
        if (isBookmarksPage() && !isCapturing && !hasAutoSyncedForCurrentVisit) {
          hasAutoSyncedForCurrentVisit = true;
          console.log('[shelf] Triggering automatic bookmark sync on x.com/i/bookmarks...');
          startCapture(true);
        }
      }, 3000);
    });
  } catch (err) {
    console.warn('[shelf] Error checking auto-sync preference:', err);
  }
}

// React to auto-sync preference toggle changes in real time
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.shelf_auto_sync_on_open) {
    if (changes.shelf_auto_sync_on_open.newValue === false) {
      if (autoSyncTimer !== null) {
        window.clearTimeout(autoSyncTimer);
        autoSyncTimer = null;
      }
    } else if (changes.shelf_auto_sync_on_open.newValue === true) {
      checkAndScheduleAutoSync();
    }
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
    checkAndScheduleAutoSync();
  }
}).observe(document, { subtree: true, childList: true });

window.addEventListener('popstate', checkAndScheduleAutoSync);

ensureWidget();
checkAndScheduleAutoSync();
