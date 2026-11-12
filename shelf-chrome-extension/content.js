const T={timeline:['div[data-testid="primaryColumn"] section','main[role="main"] section','div[aria-label="Timeline: Bookmarks"]',"section"],tweet:['article[data-testid="tweet"]','article[role="article"]','div[data-testid="cellInnerDiv"] article','div[data-testid="cellInnerDiv"]','div[data-testid="tweet"]',"article"],tweetText:['div[data-testid="tweetText"]',"div[lang]","span[lang]"],userNameContainer:['div[data-testid="User-Name"]'],avatarImage:['div[data-testid="Tweet-User-Avatar"] img','img[src*="profile_images"]'],statusLink:['a[href*="/status/"]'],timeTag:["time"],tweetPhoto:['div[data-testid="tweetPhoto"] img','img[src*="media"]','img[src*="tweet_video_thumb"]'],tweetVideo:['div[data-testid="videoPlayer"] video','div[data-testid="videoComponent"] video',"video"],cardWrapper:['div[data-testid="card.wrapper"]','div[data-testid="card.layoutLarge.media"]'],socialContext:['span[data-testid="socialContext"]']};function F(r,t){for(const e of t){const o=r.querySelector(e);if(o)return o}return null}function H(r,t){for(const e of t){const o=r.querySelectorAll(e);if(o.length>0)return Array.from(o)}return[]}function j(r){var t;try{let e="",o="";const n=F(r,T.timeTag);if(n){const f=n.closest("a");if(f){const p=f.getAttribute("href")||"",u=p.match(/\/status\/(\d+)/);u&&u[1]&&(e=u[1],o=p.startsWith("http")?p:`https://x.com${p}`)}}if(!e){const f=H(r,T.statusLink);for(const p of f){const u=p.getAttribute("href")||"",q=u.match(/\/status\/(\d+)/);if(q&&q[1]){e=q[1],o=u.startsWith("http")?u:`https://x.com${u}`;break}}}if(!e)return null;let s="",i="";const c=F(r,T.userNameContainer);if(c){const p=(c.innerText||"").split(`
`).map(u=>u.trim()).filter(Boolean);p.length>0&&(s=p[0]);for(const u of p)if(u.startsWith("@")){i=u.replace(/^@/,"");break}}let w=null;const d=F(r,T.avatarImage);d&&d.src&&(w=d.src);let y="";const m=F(r,T.tweetText);m&&(y=m.innerText||"");let v=null;const D=F(r,T.timeTag);if(D){const f=D.getAttribute("datetime");f&&(v=f)}const C=[];H(r,T.tweetPhoto).forEach(f=>{f.src&&!f.src.includes("emoji")&&!f.src.includes("profile_images")&&C.push({type:"image",url:f.src,alt_text:f.alt||void 0})}),H(r,T.tweetVideo).forEach(f=>{const p=f.currentSrc||f.src||f.poster;p&&C.push({type:"video",url:p})});const b=[];m&&m.querySelectorAll("a").forEach(p=>{const u=p.getAttribute("href");u&&(u.startsWith("http")||u.includes("t.co"))&&b.push({url:u,expanded_url:u,display_url:p.innerText||u})});let _=!1;const N=F(r,T.socialContext);return N&&((t=N.textContent)!=null&&t.toLowerCase().includes("replying to"))&&(_=!0),{tweet_id:e,tweet_url:o,author_name:s,author_handle:i,author_avatar_url:w,text:y,posted_at:v,media:C,links:b,is_thread:_}}catch(e){return console.error("[shelf] Error extracting tweet element:",e),null}}let S=!1,a=!1,h=0,x=0,A=new Set,$=new Set,g=[],l=null;async function G(){return new Promise(r=>{try{chrome.storage.local.get(["shelf_saved_tweet_ids"],t=>{if(chrome.runtime.lastError){console.warn("[shelf] Error reading storage.local:",chrome.runtime.lastError.message),r(new Set);return}const e=t==null?void 0:t.shelf_saved_tweet_ids;Array.isArray(e)?r(new Set(e.map(o=>String(o)))):r(new Set)})}catch(t){console.error("[shelf] Exception loading saved IDs:",t),r(new Set)}})}async function M(r){return new Promise(t=>{try{chrome.storage.local.set({shelf_saved_tweet_ids:Array.from(r)},()=>{t()})}catch(e){console.error("[shelf] Exception persisting saved IDs:",e),t()}})}function E(r,t,e){try{const o={type:"SYNC_PROGRESS",isCapturing:S,savedCount:h,alreadySavedCount:x,unsavedCount:e||(r==="done"?g.length:0),status:r,statusText:t||(S?`Syncing… ${h} saved`:"Done"),isDone:r==="done"};chrome.storage.local.set({shelf_sync_state:o}),chrome.runtime.sendMessage(o).catch(()=>{})}catch(o){console.warn("[shelf] Error broadcasting sync progress:",o)}}function R(){const r=window.location.href.toLowerCase(),t=window.location.pathname.toLowerCase();return r.includes("bookmark")||r.includes("history")||t.startsWith("/i/bookmarks")||t.startsWith("/i/history")||t.includes("/bookmarks")||t.includes("/history")}async function Q(){return new Promise(r=>{chrome.runtime.sendMessage({type:"GET_KNOWN_IDS"},t=>{if(chrome.runtime.lastError){r({success:!1,isAuthError:!1,ids:new Set,error:chrome.runtime.lastError.message});return}if(!t||!t.success){const o=!!(t!=null&&t.isAuthError||(t==null?void 0:t.status)===401||t!=null&&t.error&&(t.error.includes("Not connected to Shelf")||t.error.includes("401")||t.error.includes("API Token not configured")));r({success:!1,isAuthError:o,status:(t==null?void 0:t.status)||(o?401:500),ids:new Set,error:(t==null?void 0:t.error)||"Failed to connect to Shelf web app"});return}const e=new Set((t.knownIds||[]).map(o=>String(o)));r({success:!0,isAuthError:!1,ids:e})})})}async function X(r){return new Promise(t=>{chrome.runtime.sendMessage({type:"INGEST_BATCH",batch:r},e=>{if(chrome.runtime.lastError){t({success:!1,isAuthError:!1,error:chrome.runtime.lastError.message});return}if(!e||!e.success){const o=!!(e!=null&&e.isAuthError||(e==null?void 0:e.status)===401||e!=null&&e.error&&(e.error.includes("Not connected to Shelf")||e.error.includes("401")||e.error.includes("API Token not configured")));t({success:!1,isAuthError:o,status:(e==null?void 0:e.status)||(o?401:500),error:(e==null?void 0:e.error)||"Ingest failed via background worker"});return}t({success:!0,isAuthError:!1,added:e.added||0,skipped:e.skipped||0})})})}async function I(r,t=100){const e=Date.now();for(;Date.now()-e<r;){if(a)return!1;const o=r-(Date.now()-e);await new Promise(n=>setTimeout(n,Math.min(t,o)))}return!a}async function Z(r,t=5){let e=0,o=1e3;for(;e<t;){if(a)return{success:!1};e++,console.log(`[shelf] Ingesting batch of ${r.length} tweets (attempt ${e}/${t})...`);const n=await X(r);if(n.success)return console.log("[shelf] Ingest response:",n),{success:!0};if(n.isAuthError)return console.error("[shelf] Auth error (401) on batch ingest. Aborting immediately without retry."),{success:!1,isAuthError:!0,error:n.error};if(a)return{success:!1};if(console.error(`[shelf] Batch attempt ${e}/${t} failed (server/network):`,n.error),e>=t)return console.error("[shelf] Batch failed all 5 attempts. Keeping in queue for next round."),{success:!1,error:n.error};const s=Math.floor(Math.random()*500),i=o+s;if(console.log(`[shelf] Retrying batch in ${i}ms...`),!await I(i)||a)return console.log("[shelf] Batch backoff cancelled due to stop request."),{success:!1};o*=2}return{success:!1}}async function W(r=!1){for(;(g.length>=20||r&&g.length>0)&&!a;){const e=Math.min(20,g.length),o=g.slice(0,e),n=await Z(o,5);if(n.isAuthError){console.error("[shelf] Auth error (401) mid-sync. Halting queue processing immediately.");const s="Not connected to Shelf. Please reconnect your API token";return a=!0,l&&k(l,"error",{message:s}),E("error",s),{authError:!0}}if(n.success)g.splice(0,e),o.forEach(s=>A.add(s.tweet_id)),h+=e,await M(A),E("capturing"),l&&k(l,"capturing",{newCount:h,existingCount:x});else{console.warn(`[shelf] ${g.length} tweets remain queued for next round.`);break}}return{authError:!1}}function J(r){try{const t=Array.from(r.querySelectorAll('article[data-testid="tweet"], article[role="article"]'));if(t.length>0)return t;const e=Array.from(r.querySelectorAll('div[data-testid="cellInnerDiv"]')).filter(s=>s.querySelector('a[href*="/status/"]')||s.querySelector("time")||s.querySelector('[data-testid="tweetText"]'));if(e.length>0)return e;const o=Array.from(r.querySelectorAll('a[href*="/status/"]')),n=new Set;for(const s of o){if(!(s.getAttribute("href")||"").match(/\/status\/\d+/))continue;const c=s.closest("article")||s.closest('div[data-testid="cellInnerDiv"]')||s.closest('div[role="article"]')||s.closest("section > div > div > div");c&&n.add(c)}return Array.from(n)}catch(t){return console.error("[shelf] Error finding tweet elements:",t),[]}}function Y(){const r=new Set;try{const t=document.querySelectorAll('a[href*="/status/"]');for(const e of t){const n=(e.getAttribute("href")||"").match(/\/status\/(\d+)/);n&&n[1]&&r.add(n[1])}}catch(t){console.error("[shelf] Error getting visible status IDs:",t)}return r}function L(){return!!(document.querySelector('div[role="progressbar"]')||document.querySelector('[aria-label="Loading…"]')||document.querySelector('[aria-label="Loading"]')||document.querySelector('svg[aria-label="Loading"]'))}async function ee(r=15e3){if(!L())return!0;console.log("[shelf] Twitter loading spinner detected. Waiting up to 15s for bookmarks to load...");const t=Date.now();for(;L()&&Date.now()-t<r;)if(a||!await I(500)||a)return!1;return await I(400),!a}async function te(){try{const r=Array.from(document.querySelectorAll('button, div[role="button"]'));let t=null;for(const e of r){const o=(e.textContent||"").trim().toLowerCase();if(o==="retry"||o==="try again"){t=e;break}}if(t){console.log("[shelf] Twitter retry button detected! Waiting 60-second cooldown first..."),E("rate_limited","Rate limited by X. Waiting 60s...");for(let o=60;o>0;o--)if(a||(l&&k(l,"capturing",{newCount:h,statusText:`Rate limited. Waiting ${o}s...`}),!await I(1e3)||a))return console.log("[shelf] Sync stopped during rate-limit cooldown."),!1;if(a)return!1;console.log("[shelf] 60-second cooldown elapsed. Clicking Retry button...");const e=Array.from(document.querySelectorAll('button, div[role="button"]')).find(o=>{const n=(o.textContent||"").trim().toLowerCase();return n==="retry"||n==="try again"})||t;try{e.click(),console.log("[shelf] Clicked Retry button.")}catch(o){console.error("[shelf] Error clicking retry button:",o)}return await I(1500),!a}}catch(r){console.error("[shelf] Error in checkAndHandleRetry:",r)}return!1}async function re(){if(!a){console.log("[shelf] Nudging lazy loader: scrolling up ~600px, then jumping to bottom...");try{if(window.scrollBy({top:-600,behavior:"auto"}),!await I(450)||a)return;window.scrollTo({top:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),behavior:"smooth"}),window.dispatchEvent(new Event("scroll")),window.dispatchEvent(new WheelEvent("wheel",{deltaY:450,bubbles:!0})),await I(350)}catch(r){console.error("[shelf] Error nudging lazy loader:",r)}}}function oe(){try{window.dispatchEvent(new Event("scroll")),window.dispatchEvent(new WheelEvent("wheel",{deltaY:350,bubbles:!0}));const r=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight);(window.scrollY||window.pageYOffset)+window.innerHeight>=r-350?(window.scrollBy({top:-450,behavior:"auto"}),setTimeout(()=>{window.scrollTo({top:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),behavior:"smooth"}),window.dispatchEvent(new Event("scroll"))},180)):window.scrollBy({top:window.innerHeight*.9,behavior:"smooth"});const o=[document.querySelector("main"),document.querySelector('div[data-testid="primaryColumn"]'),document.querySelector('section[role="region"]')];for(const n of o)n&&n.scrollHeight>n.clientHeight&&n.clientHeight>0&&(n.scrollTop+n.clientHeight>=n.scrollHeight-250?(n.scrollBy({top:-350,behavior:"auto"}),setTimeout(()=>{n.scrollTop=n.scrollHeight},150)):n.scrollBy({top:window.innerHeight*.9,behavior:"smooth"}))}catch(r){console.error("[shelf] Error in triggerDeepScroll:",r)}}function ne(r,t,e=5e3){return new Promise(o=>{if(a){o(!1);return}const n=()=>{const m=Y();for(const v of m)if(!r.has(v)||t&&!t.has(v))return!0;return!1};if(n()){o(!0);return}let s=!1,i=null,c=null,w=null;const d=()=>{s||(s=!0,i&&(i.disconnect(),i=null),c!==null&&(window.clearInterval(c),c=null),w!==null&&(window.clearTimeout(w),w=null))},y=()=>{if(!s){if(a){d(),o(!1);return}if(n()){d(),o(!0);return}}};try{i=new MutationObserver(()=>{if(a){d(),o(!1);return}y()}),i.observe(document.body,{childList:!0,subtree:!0})}catch(m){console.error("[shelf] Error creating MutationObserver:",m)}c=window.setInterval(y,100),w=window.setTimeout(()=>{d(),o(!1)},e)})}function se(){if(!document.body)return;const r=document.getElementById("shelf-floating-widget");if(r&&document.body.contains(r))return;r&&r.remove();const t=document.createElement("div");t.id="shelf-floating-widget",t.style.cssText=`
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
  `,k(t,"idle"),document.body.appendChild(t),l=t,console.log("[shelf] Floating widget anchored to document.body")}function k(r,t,e){if(t==="idle"){const o=R()?"Sync bookmarks & history":"Sync visible posts";r.innerHTML=`
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
          <span id="shelf-btn-sub" style="font-size: 10px; color: #38BDF8; font-weight: 500;">${o}</span>
        </div>
      </div>
    `;const n=r.querySelector("#shelf-btn-start");n==null||n.addEventListener("click",s=>{s.preventDefault(),s.stopPropagation(),K()})}else if(t==="capturing"){const o=(e==null?void 0:e.newCount)||h,n=(e==null?void 0:e.existingCount)||x,s=(e==null?void 0:e.statusText)||(n>0?`${n} already in Shelf`:"Scanning bookmarks...");r.innerHTML=`
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
          <span>Syncing… <strong>${o} saved</strong></span>
          <span style="font-size: 10px; color: #38BDF8;">${s}</span>
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
    `;const i=r.querySelector("#shelf-btn-stop");i==null||i.addEventListener("click",c=>{c.preventDefault(),c.stopPropagation(),V(),i&&(i.textContent="Stopping...")})}else if(t==="done"){const o=!!(e!=null&&e.warning),n=o?"#78350F":"#064E3B",s=o?"#D97706":"#059669",i=o?"#FEF3C7":"#ECFDF5",c=o?"⚠":"✓";r.innerHTML=`
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        background: ${n};
        color: ${i};
        padding: 10px 18px;
        border-radius: 9999px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        font-size: 13px;
        font-weight: 500;
        border: 1px solid ${s};
      ">
        <span>${c} ${(e==null?void 0:e.message)||"Done"}</span>
      </div>
    `,setTimeout(()=>{l&&!S&&k(l,"idle")},o?7e3:4500)}else t==="error"&&(r.innerHTML=`
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
        <span>⚠ ${(e==null?void 0:e.message)||"Error occurred"}</span>
      </div>
    `,setTimeout(()=>{l&&!S&&k(l,"idle")},5e3))}function V(){S&&(console.log("[shelf] Stop requested by user"),a=!0,E("idle","Stopping sync..."),l&&k(l,"capturing",{newCount:h,existingCount:x,statusText:"Stopping..."}))}async function K(){if(S){console.log("[shelf] Sync is already in progress. Ignoring duplicate start request.");return}S=!0,a=!1,h=0,x=0,g=[],$=new Set,l&&k(l,"capturing",{newCount:0,existingCount:0}),E("capturing","Syncing… 0 saved"),console.log("[shelf] Starting full continuous bookmark sync...");const r=await G();console.log(`[shelf] Loaded ${r.size} saved IDs from local storage cache.`);const t=await Q();if(t.isAuthError){console.error("[shelf] Auth failure connecting to Shelf (401). Aborting sync before scrolling.");const n="Not connected to Shelf. Please reconnect your API token";l&&k(l,"error",{message:n}),E("error",n),S=!1,a=!1;return}t.success&&t.ids?(A=new Set(t.ids),await M(A),console.log(`[shelf] Synchronized with Shelf server: ${A.size} active saved IDs.`)):(console.warn("[shelf] Could not reach Shelf server to fetch known IDs ("+(t.error||"network error")+"). Using local storage cache."),A=new Set(r));let e=0;const o=8;try{for(;!a&&e<o;)try{if(await te()){e=0;continue}if(a)break;if(L()){if(!await ee(15e3)||a)break;e=0}const d=Y(),y=J(document);let m=0;for(const B of y){if(a)break;try{const b=j(B);if(!b||!b.tweet_id)continue;const _=!$.has(b.tweet_id);if(_&&($.add(b.tweet_id),m++),A.has(b.tweet_id)){_&&(x++,console.log(`[shelf] Bookmark ${b.tweet_id} by @${b.author_handle} is already in Shelf (${x} existing).`));continue}_&&(g.push(b),console.log(`[shelf] Discovered new unsaved bookmark: ${b.tweet_id} by @${b.author_handle} (Queue size: ${g.length})`))}catch(b){console.error("[shelf] Error extracting tweet element:",b)}}if(m>0?(e=0,console.log(`[shelf] Progress: ${m} newly rendered tweets this round. (Total seen this session: ${$.size}, Unsaved queued: ${g.length})`)):(e++,console.log(`[shelf] 0 newly rendered tweets this round. Consecutive empty rounds: ${e}/${o} (Total seen this session: ${$.size}).`)),l&&k(l,"capturing",{newCount:h+g.length,existingCount:x}),E("capturing"),(await W(!1)).authError){console.error("[shelf] Sync stopped due to auth error (401)."),S=!1,a=!1;return}if(a)break;const D=Math.round(window.scrollY||window.pageYOffset||0),C=Math.round(Math.max(document.documentElement.scrollHeight,document.body.scrollHeight)),z=window.innerHeight;console.log(`[shelf] Scroll state: scrollY=${D}px, scrollHeight=${C}px, windowHeight=${z}px, seenThisSession=${$.size}`),e>0&&e<o?await re():oe(),await ne(d,$,5e3)}catch(w){console.error("[shelf] Loop iteration error:",w)}if(g.length>0&&!a){console.log(`[shelf] Flushing final ${g.length} queued tweets with retry before completing...`),l&&k(l,"capturing",{newCount:h+g.length,existingCount:x,statusText:`Saving final ${g.length} bookmarks...`}),E("capturing",`Saving final ${g.length} bookmarks...`);try{if((await W(!0)).authError){S=!1,a=!1;return}}catch(w){console.error("[shelf] Error in final queue flush:",w)}}chrome.storage.sync.set({shelf_last_sync_time:new Date().toISOString(),shelf_last_sync_count:h});const n=g.length,s=$.size;console.log(`[shelf] Sync finished summary:
  • Total tweets seen this session: ${s}
  • Newly saved: ${h}
  • Already existing in Shelf: ${x}
  • Unsaved (failed batches): ${n}`);let i="",c=!1;a?i=`Stopped (${h} saved, ${s} seen)`:n>0?(c=!0,h>0?i=`Done: ${h} saved (${n} unsaved, ${s} seen)`:i=`${n} unsaved (${s} seen)`):h>0?i=`Done (${h} saved, ${s} seen)`:x>0?i=`Done (${x} in Shelf, ${s} seen)`:i=R()?"Done (no bookmarks found)":"Done",l&&k(l,"done",{message:i,warning:c}),E("done",i,n),console.log(`[shelf] Sync finished! Total saved: ${h}, Total existing: ${x}, Unsaved: ${n}, Total seen: ${s}`)}catch(n){console.error("[shelf] Fatal sync error:",n);const s=n instanceof Error?n.message:"Sync interrupted";l&&k(l,"error",{message:s}),E("error",s)}finally{S=!1,a=!1}}function P(){if(!document.body)return;const r=document.getElementById("shelf-floating-widget");if(!(r&&document.body.contains(r)))se();else if(r&&!S){const e=R(),o=r.querySelector("#shelf-btn-sub"),n=e?"Sync bookmarks & history":"Sync visible posts";o&&o.textContent!==n&&(o.textContent=n)}}function ie(r){const t=document.createElement("div");t.style.cssText=`
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
  `,t.textContent="✕ Removed from Shelf library",document.body.appendChild(t),setTimeout(()=>{t.style.opacity="0",setTimeout(()=>t.remove(),400)},3e3)}let O="";document.addEventListener("click",r=>{var e,o,n;const t=r.target;if(t)try{const s=t.closest('article, [data-testid="tweet"]');if(s){const y=((e=s.querySelector("time"))==null?void 0:e.closest("a"))||s.querySelector('a[href*="/status/"]'),v=((y==null?void 0:y.getAttribute("href"))||"").match(/\/status\/(\d+)/);v&&(O=v[1])}const i=t.closest('[data-testid="removeBookmark"], [aria-label*="Remove"][aria-label*="ookmark"], [aria-label*="remove"][aria-label*="ookmark"], [data-testid="bookmark"][aria-label*="Remove"], [data-testid="bookmark"][aria-label*="remove"]'),c=t.closest('[role="menuitem"], [data-testid="Dropdown"]'),w=c&&/remove.*bookmark|delete.*bookmark/i.test(c.textContent||"");if(i||w){let d="";const y=(o=i||c)==null?void 0:o.closest('article, [data-testid="tweet"], [data-testid="cellInnerDiv"], div[role="article"]');if(y){const v=((n=y.querySelector("time"))==null?void 0:n.closest("a"))||y.querySelector('a[href*="/status/"]'),C=((v==null?void 0:v.getAttribute("href"))||"").match(/\/status\/(\d+)/);C&&(d=C[1])}d||(d=O),d&&(console.log("[shelf] Un-bookmark action detected on X for tweet:",d),A.delete(d),M(A),chrome.runtime.sendMessage({type:"DELETE_BOOKMARK",tweetId:d},m=>{m&&m.success&&(console.log("[shelf] Bookmark auto-removed from Shelf library:",d),ie(d))}))}}catch(s){console.error("[shelf] Error in un-bookmark click listener:",s)}},!0);chrome.runtime.onMessage.addListener((r,t,e)=>{try{if(r.action==="START_CAPTURE")return S?e({started:!1,alreadyRunning:!0}):(K(),e({started:!0})),!0;if(r.action==="STOP_CAPTURE")return V(),e({stopped:!0}),!0}catch(o){return console.error("[shelf] Error in content script onMessage listener:",o),e({error:String(o)}),!0}});setInterval(P,600);let U=location.href;new MutationObserver(()=>{const r=location.href;r!==U&&(U=r,P())}).observe(document,{subtree:!0,childList:!0});P();
