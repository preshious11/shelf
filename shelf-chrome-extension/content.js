const S={timeline:['div[data-testid="primaryColumn"] section','main[role="main"] section','div[aria-label="Timeline: Bookmarks"]',"section"],tweet:['article[data-testid="tweet"]','article[role="article"]','div[data-testid="cellInnerDiv"] article','div[data-testid="cellInnerDiv"]','div[data-testid="tweet"]',"article"],tweetText:['div[data-testid="tweetText"]',"div[lang]","span[lang]"],userNameContainer:['div[data-testid="User-Name"]'],avatarImage:['div[data-testid="Tweet-User-Avatar"] img','img[src*="profile_images"]'],statusLink:['a[href*="/status/"]'],timeTag:["time"],tweetPhoto:['div[data-testid="tweetPhoto"] img','img[src*="media"]','img[src*="tweet_video_thumb"]'],tweetVideo:['div[data-testid="videoPlayer"] video','div[data-testid="videoComponent"] video',"video"],cardWrapper:['div[data-testid="card.wrapper"]','div[data-testid="card.layoutLarge.media"]'],socialContext:['span[data-testid="socialContext"]']};function _(e,o){for(const t of o){const r=e.querySelector(t);if(r)return r}return null}function B(e,o){for(const t of o){const r=e.querySelectorAll(t);if(r.length>0)return Array.from(r)}return[]}function Y(e){var o;try{let t="",r="";const n=_(e,S.timeTag);if(n){const g=n.closest("a");if(g){const p=g.getAttribute("href")||"",u=p.match(/\/status\/(\d+)/);u&&u[1]&&(t=u[1],r=p.startsWith("http")?p:`https://x.com${p}`)}}if(!t){const g=B(e,S.statusLink);for(const p of g){const u=p.getAttribute("href")||"",A=u.match(/\/status\/(\d+)/);if(A&&A[1]){t=A[1],r=u.startsWith("http")?u:`https://x.com${u}`;break}}}if(!t)return null;let s="",l="";const i=_(e,S.userNameContainer);if(i){const p=(i.innerText||"").split(`
`).map(u=>u.trim()).filter(Boolean);p.length>0&&(s=p[0]);for(const u of p)if(u.startsWith("@")){l=u.replace(/^@/,"");break}}let b=null;const f=_(e,S.avatarImage);f&&f.src&&(b=f.src);let h="";const y=_(e,S.tweetText);y&&(h=y.innerText||"");let c=null;const D=_(e,S.timeTag);if(D){const g=D.getAttribute("datetime");g&&(c=g)}const C=[];B(e,S.tweetPhoto).forEach(g=>{g.src&&!g.src.includes("emoji")&&!g.src.includes("profile_images")&&C.push({type:"image",url:g.src,alt_text:g.alt||void 0})}),B(e,S.tweetVideo).forEach(g=>{const p=g.currentSrc||g.src||g.poster;p&&C.push({type:"video",url:p})});const H=[];y&&y.querySelectorAll("a").forEach(p=>{const u=p.getAttribute("href");u&&(u.startsWith("http")||u.includes("t.co"))&&H.push({url:u,expanded_url:u,display_url:p.innerText||u})});let R=!1;const P=_(e,S.socialContext);return P&&((o=P.textContent)!=null&&o.toLowerCase().includes("replying to"))&&(R=!0),{tweet_id:t,tweet_url:r,author_name:s,author_handle:l,author_avatar_url:b,text:h,posted_at:c,media:C,links:H,is_thread:R}}catch(t){return console.error("[shelf] Error extracting tweet element:",t),null}}let k=!1,a=!1,m=0,v=0,E=new Set,F=new Set,w=[],d=null;async function V(){return new Promise(e=>{try{chrome.storage.local.get(["shelf_saved_tweet_ids"],o=>{if(chrome.runtime.lastError){console.warn("[shelf] Error reading storage.local:",chrome.runtime.lastError.message),e(new Set);return}const t=o==null?void 0:o.shelf_saved_tweet_ids;Array.isArray(t)?e(new Set(t.map(r=>String(r)))):e(new Set)})}catch(o){console.error("[shelf] Exception loading saved IDs:",o),e(new Set)}})}async function q(e){return new Promise(o=>{try{chrome.storage.local.set({shelf_saved_tweet_ids:Array.from(e)},()=>{o()})}catch(t){console.error("[shelf] Exception persisting saved IDs:",t),o()}})}function T(e,o,t){try{const r={type:"SYNC_PROGRESS",isCapturing:k,savedCount:m,alreadySavedCount:v,unsavedCount:t||(e==="done"?w.length:0),status:e,statusText:o||(k?`Syncing… ${m} saved`:"Done"),isDone:e==="done"};chrome.storage.local.set({shelf_sync_state:r}),chrome.runtime.sendMessage(r).catch(()=>{})}catch(r){console.warn("[shelf] Error broadcasting sync progress:",r)}}function L(){const e=window.location.href.toLowerCase(),o=window.location.pathname.toLowerCase();return e.includes("bookmark")||e.includes("history")||o.startsWith("/i/bookmarks")||o.startsWith("/i/history")||o.includes("/bookmarks")||o.includes("/history")}async function K(){return new Promise(e=>{chrome.runtime.sendMessage({type:"GET_KNOWN_IDS"},o=>{if(chrome.runtime.lastError){e({success:!1,ids:new Set,error:chrome.runtime.lastError.message});return}if(!o||!o.success){e({success:!1,ids:new Set,error:(o==null?void 0:o.error)||"Failed to connect to Shelf web app"});return}const t=new Set((o.knownIds||[]).map(r=>String(r)));e({success:!0,ids:t})})})}async function j(e){return new Promise((o,t)=>{chrome.runtime.sendMessage({type:"INGEST_BATCH",batch:e},r=>{if(chrome.runtime.lastError){t(new Error(chrome.runtime.lastError.message));return}if(!r||!r.success){t(new Error((r==null?void 0:r.error)||"Ingest failed via background worker"));return}o({added:r.added||0,skipped:r.skipped||0})})})}async function I(e,o=100){const t=Date.now();for(;Date.now()-t<e;){if(a)return!1;const r=e-(Date.now()-t);await new Promise(n=>setTimeout(n,Math.min(o,r)))}return!a}async function G(e,o=5){let t=0,r=1e3;for(;t<o;){if(a)return!1;t++;try{console.log(`[shelf] Ingesting batch of ${e.length} tweets (attempt ${t}/${o})...`);const n=await j(e);return console.log("[shelf] Ingest response:",n),!0}catch(n){if(a)return!1;const s=n instanceof Error?n.message:String(n);if(console.error(`[shelf] Batch attempt ${t}/${o} failed:`,s),t>=o)return console.error("[shelf] Batch failed all 5 attempts. Keeping in queue for next round."),!1;const l=Math.floor(Math.random()*500),i=r+l;if(console.log(`[shelf] Retrying batch in ${i}ms...`),!await I(i)||a)return console.log("[shelf] Batch backoff cancelled due to stop request."),!1;r*=2}}return!1}async function W(e=!1){for(;(w.length>=20||e&&w.length>0)&&!a;){const t=Math.min(20,w.length),r=w.slice(0,t);if(await G(r,5))w.splice(0,t),r.forEach(s=>E.add(s.tweet_id)),m+=t,await q(E),T("capturing"),d&&x(d,"capturing",{newCount:m,existingCount:v});else{console.warn(`[shelf] ${w.length} tweets remain queued for next round.`);break}}}function X(e){try{const o=Array.from(e.querySelectorAll('article[data-testid="tweet"], article[role="article"]'));if(o.length>0)return o;const t=Array.from(e.querySelectorAll('div[data-testid="cellInnerDiv"]')).filter(s=>s.querySelector('a[href*="/status/"]')||s.querySelector("time")||s.querySelector('[data-testid="tweetText"]'));if(t.length>0)return t;const r=Array.from(e.querySelectorAll('a[href*="/status/"]')),n=new Set;for(const s of r){if(!(s.getAttribute("href")||"").match(/\/status\/\d+/))continue;const i=s.closest("article")||s.closest('div[data-testid="cellInnerDiv"]')||s.closest('div[role="article"]')||s.closest("section > div > div > div");i&&n.add(i)}return Array.from(n)}catch(o){return console.error("[shelf] Error finding tweet elements:",o),[]}}function $(){const e=new Set;try{const o=document.querySelectorAll('a[href*="/status/"]');for(const t of o){const n=(t.getAttribute("href")||"").match(/\/status\/(\d+)/);n&&n[1]&&e.add(n[1])}}catch(o){console.error("[shelf] Error getting visible status IDs:",o)}return e}function Z(){return!!(document.querySelector('div[role="progressbar"]')||document.querySelector('[aria-label="Loading…"]')||document.querySelector('[aria-label="Loading"]')||document.querySelector('svg[aria-label="Loading"]'))}async function Q(){try{const e=Array.from(document.querySelectorAll('button, div[role="button"]'));let o=null;for(const t of e){const r=(t.textContent||"").trim().toLowerCase();if(r==="retry"||r==="try again"){o=t;break}}if(o){console.log("[shelf] Twitter retry button detected! Waiting 60-second cooldown first..."),T("rate_limited","Rate limited by X. Waiting 60s...");for(let r=60;r>0;r--)if(a||(d&&x(d,"capturing",{newCount:m,statusText:`Rate limited. Waiting ${r}s...`}),!await I(1e3)||a))return console.log("[shelf] Sync stopped during rate-limit cooldown."),!1;if(a)return!1;console.log("[shelf] 60-second cooldown elapsed. Clicking Retry button...");const t=Array.from(document.querySelectorAll('button, div[role="button"]')).find(r=>{const n=(r.textContent||"").trim().toLowerCase();return n==="retry"||n==="try again"})||o;try{t.click(),console.log("[shelf] Clicked Retry button.")}catch(r){console.error("[shelf] Error clicking retry button:",r)}return await I(1500),!a}}catch(e){console.error("[shelf] Error in checkAndHandleRetry:",e)}return!1}async function J(){if(!a){console.log("[shelf] Nudging lazy loader: scrolling up ~600px, then jumping to bottom...");try{if(window.scrollBy({top:-600,behavior:"auto"}),!await I(450)||a)return;window.scrollTo({top:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),behavior:"smooth"}),window.dispatchEvent(new Event("scroll")),window.dispatchEvent(new WheelEvent("wheel",{deltaY:450,bubbles:!0})),await I(350)}catch(e){console.error("[shelf] Error nudging lazy loader:",e)}}}function ee(){try{window.dispatchEvent(new Event("scroll")),window.dispatchEvent(new WheelEvent("wheel",{deltaY:350,bubbles:!0}));const e=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight);(window.scrollY||window.pageYOffset)+window.innerHeight>=e-350?(window.scrollBy({top:-450,behavior:"auto"}),setTimeout(()=>{window.scrollTo({top:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),behavior:"smooth"}),window.dispatchEvent(new Event("scroll"))},180)):window.scrollBy({top:window.innerHeight*.9,behavior:"smooth"});const r=[document.querySelector("main"),document.querySelector('div[data-testid="primaryColumn"]'),document.querySelector('section[role="region"]')];for(const n of r)n&&n.scrollHeight>n.clientHeight&&n.clientHeight>0&&(n.scrollTop+n.clientHeight>=n.scrollHeight-250?(n.scrollBy({top:-350,behavior:"auto"}),setTimeout(()=>{n.scrollTop=n.scrollHeight},150)):n.scrollBy({top:window.innerHeight*.9,behavior:"smooth"}))}catch(e){console.error("[shelf] Error in triggerDeepScroll:",e)}}function te(e,o=5e3){return new Promise(t=>{if(a){t(!1);return}const r=$();for(const h of r)if(!e.has(h)){t(!0);return}let n=!1,s=null,l=null,i=null;const b=()=>{n||(n=!0,s&&(s.disconnect(),s=null),l!==null&&(window.clearInterval(l),l=null),i!==null&&(window.clearTimeout(i),i=null))},f=()=>{if(n)return;if(a){b(),t(!1);return}const h=$();for(const y of h)if(!e.has(y)){b(),t(!0);return}};try{s=new MutationObserver(()=>{if(a){b(),t(!1);return}f()}),s.observe(document.body,{childList:!0,subtree:!0})}catch(h){console.error("[shelf] Error creating MutationObserver:",h)}l=window.setInterval(f,100),i=window.setTimeout(()=>{b(),t(!1)},o)})}function oe(){if(!document.body)return;const e=document.getElementById("shelf-floating-widget");if(e&&document.body.contains(e))return;e&&e.remove();const o=document.createElement("div");o.id="shelf-floating-widget",o.style.cssText=`
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
  `,x(o,"idle"),document.body.appendChild(o),d=o,console.log("[shelf] Floating widget anchored to document.body")}function x(e,o,t){if(o==="idle"){const r=L()?"Sync bookmarks & history":"Sync visible posts";e.innerHTML=`
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
          <span id="shelf-btn-sub" style="font-size: 10px; color: #38BDF8; font-weight: 500;">${r}</span>
        </div>
      </div>
    `;const n=e.querySelector("#shelf-btn-start");n==null||n.addEventListener("click",s=>{s.preventDefault(),s.stopPropagation(),U()})}else if(o==="capturing"){const r=(t==null?void 0:t.newCount)||m,n=(t==null?void 0:t.existingCount)||v,s=(t==null?void 0:t.statusText)||(n>0?`${n} already in Shelf`:"Scanning bookmarks...");e.innerHTML=`
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
          <span>Syncing… <strong>${r} saved</strong></span>
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
    `;const l=e.querySelector("#shelf-btn-stop");l==null||l.addEventListener("click",i=>{i.preventDefault(),i.stopPropagation(),O(),l&&(l.textContent="Stopping...")})}else if(o==="done"){const r=!!(t!=null&&t.warning),n=r?"#78350F":"#064E3B",s=r?"#D97706":"#059669",l=r?"#FEF3C7":"#ECFDF5",i=r?"⚠":"✓";e.innerHTML=`
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        background: ${n};
        color: ${l};
        padding: 10px 18px;
        border-radius: 9999px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        font-size: 13px;
        font-weight: 500;
        border: 1px solid ${s};
      ">
        <span>${i} ${(t==null?void 0:t.message)||"Done"}</span>
      </div>
    `,setTimeout(()=>{d&&!k&&x(d,"idle")},r?7e3:4500)}else o==="error"&&(e.innerHTML=`
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
        <span>⚠ ${(t==null?void 0:t.message)||"Error occurred"}</span>
      </div>
    `,setTimeout(()=>{d&&!k&&x(d,"idle")},5e3))}function O(){k&&(console.log("[shelf] Stop requested by user"),a=!0,T("idle","Stopping sync..."),d&&x(d,"capturing",{newCount:m,existingCount:v,statusText:"Stopping..."}))}async function U(){if(k){console.log("[shelf] Sync is already in progress. Ignoring duplicate start request.");return}k=!0,a=!1,m=0,v=0,w=[],F=new Set,d&&x(d,"capturing",{newCount:0,existingCount:0}),T("capturing","Syncing… 0 saved"),console.log("[shelf] Starting full continuous bookmark sync...");const e=await V();console.log(`[shelf] Loaded ${e.size} saved IDs from local storage cache.`);const o=await K();o.success&&o.ids?(E=new Set(o.ids),await q(E),console.log(`[shelf] Synchronized with Shelf server: ${E.size} active saved IDs.`)):(console.warn("[shelf] Could not reach Shelf server to fetch known IDs ("+(o.error||"network error")+"). Using local storage cache."),E=new Set(e));let t=0;const r=8;try{for(;!a&&t<r;)try{if(await Q()){t=0;continue}if(a)break;if(Z()){if(console.log("[shelf] Twitter network loading spinner active, waiting..."),!await I(1200)||a)break;continue}const b=$(),f=X(document);let h=0;for(const y of f){if(a)break;try{const c=Y(y);if(!c||!c.tweet_id)continue;if(E.has(c.tweet_id)){F.has(c.tweet_id)||(F.add(c.tweet_id),v++);continue}F.has(c.tweet_id)||(F.add(c.tweet_id),w.push(c),h++,console.log(`[shelf] Found new bookmark: ${c.tweet_id} by @${c.author_handle}`))}catch(c){console.error("[shelf] Error extracting tweet element:",c)}}if(h>0?t=0:(t++,console.log(`[shelf] No new tweets this round. Consecutive empty rounds: ${t}/${r}`)),d&&x(d,"capturing",{newCount:m+w.length,existingCount:v}),T("capturing"),await W(!1),a)break;t>0&&t<r?await J():ee(),await te(b,5e3)}catch(i){console.error("[shelf] Loop iteration error:",i)}if(w.length>0&&!a){console.log(`[shelf] Flushing final ${w.length} queued tweets with retry before completing...`),d&&x(d,"capturing",{newCount:m+w.length,existingCount:v,statusText:`Saving final ${w.length} bookmarks...`}),T("capturing",`Saving final ${w.length} bookmarks...`);try{await W(!0)}catch(i){console.error("[shelf] Error in final queue flush:",i)}}chrome.storage.sync.set({shelf_last_sync_time:new Date().toISOString(),shelf_last_sync_count:m});const n=w.length;let s="",l=!1;a?s=`Stopped (${m} saved)`:n>0?(l=!0,m>0?s=`Done: ${m} saved (${n} failed to save)`:s=`${n} bookmark${n===1?"":"s"} could not be saved`):m>0?s=`Done (${m} saved)`:v>0?s=`Done (${v} in Shelf)`:s=L()?"Done (no bookmarks found)":"Done",d&&x(d,"done",{message:s,warning:l}),T("done",s,n),console.log(`[shelf] Sync finished! Total saved: ${m}, Total existing: ${v}, Unsaved: ${n}`)}catch(n){console.error("[shelf] Fatal sync error:",n);const s=n instanceof Error?n.message:"Sync interrupted";d&&x(d,"error",{message:s}),T("error",s)}finally{k=!1,a=!1}}function M(){if(!document.body)return;const e=document.getElementById("shelf-floating-widget");if(!(e&&document.body.contains(e)))oe();else if(e&&!k){const t=L(),r=e.querySelector("#shelf-btn-sub"),n=t?"Sync bookmarks & history":"Sync visible posts";r&&r.textContent!==n&&(r.textContent=n)}}function re(e){const o=document.createElement("div");o.style.cssText=`
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
  `,o.textContent="✕ Removed from Shelf library",document.body.appendChild(o),setTimeout(()=>{o.style.opacity="0",setTimeout(()=>o.remove(),400)},3e3)}let z="";document.addEventListener("click",e=>{var t,r,n;const o=e.target;if(o)try{const s=o.closest('article, [data-testid="tweet"]');if(s){const h=((t=s.querySelector("time"))==null?void 0:t.closest("a"))||s.querySelector('a[href*="/status/"]'),c=((h==null?void 0:h.getAttribute("href"))||"").match(/\/status\/(\d+)/);c&&(z=c[1])}const l=o.closest('[data-testid="removeBookmark"], [aria-label*="Remove"][aria-label*="ookmark"], [aria-label*="remove"][aria-label*="ookmark"], [data-testid="bookmark"][aria-label*="Remove"], [data-testid="bookmark"][aria-label*="remove"]'),i=o.closest('[role="menuitem"], [data-testid="Dropdown"]'),b=i&&/remove.*bookmark|delete.*bookmark/i.test(i.textContent||"");if(l||b){let f="";const h=(r=l||i)==null?void 0:r.closest('article, [data-testid="tweet"], [data-testid="cellInnerDiv"], div[role="article"]');if(h){const c=((n=h.querySelector("time"))==null?void 0:n.closest("a"))||h.querySelector('a[href*="/status/"]'),C=((c==null?void 0:c.getAttribute("href"))||"").match(/\/status\/(\d+)/);C&&(f=C[1])}f||(f=z),f&&(console.log("[shelf] Un-bookmark action detected on X for tweet:",f),E.delete(f),q(E),chrome.runtime.sendMessage({type:"DELETE_BOOKMARK",tweetId:f},y=>{y&&y.success&&(console.log("[shelf] Bookmark auto-removed from Shelf library:",f),re(f))}))}}catch(s){console.error("[shelf] Error in un-bookmark click listener:",s)}},!0);chrome.runtime.onMessage.addListener((e,o,t)=>{try{if(e.action==="START_CAPTURE")return k?t({started:!1,alreadyRunning:!0}):(U(),t({started:!0})),!0;if(e.action==="STOP_CAPTURE")return O(),t({stopped:!0}),!0}catch(r){return console.error("[shelf] Error in content script onMessage listener:",r),t({error:String(r)}),!0}});setInterval(M,600);let N=location.href;new MutationObserver(()=>{const e=location.href;e!==N&&(N=e,M())}).observe(document,{subtree:!0,childList:!0});M();
