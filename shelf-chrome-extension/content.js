const T={timeline:['div[data-testid="primaryColumn"] section','main[role="main"] section','div[aria-label="Timeline: Bookmarks"]',"section"],tweet:['article[data-testid="tweet"]','article[role="article"]','div[data-testid="cellInnerDiv"] article','div[data-testid="cellInnerDiv"]','div[data-testid="tweet"]',"article"],tweetText:['div[data-testid="tweetText"]',"div[lang]","span[lang]"],userNameContainer:['div[data-testid="User-Name"]'],avatarImage:['div[data-testid="Tweet-User-Avatar"] img','img[src*="profile_images"]'],statusLink:['a[href*="/status/"]'],timeTag:["time"],tweetPhoto:['div[data-testid="tweetPhoto"] img','img[src*="media"]','img[src*="tweet_video_thumb"]'],tweetVideo:['div[data-testid="videoPlayer"] video','div[data-testid="videoComponent"] video',"video"],cardWrapper:['div[data-testid="card.wrapper"]','div[data-testid="card.layoutLarge.media"]'],socialContext:['span[data-testid="socialContext"]']};function I(r,t){for(const e of t){const o=r.querySelector(e);if(o)return o}return null}function B(r,t){for(const e of t){const o=r.querySelectorAll(e);if(o.length>0)return Array.from(o)}return[]}function Y(r){var t;try{let e="",o="";const n=I(r,T.timeTag);if(n){const h=n.closest("a");if(h){const p=h.getAttribute("href")||"",d=p.match(/\/status\/(\d+)/);d&&d[1]&&(e=d[1],o=p.startsWith("http")?p:`https://x.com${p}`)}}if(!e){const h=B(r,T.statusLink);for(const p of h){const d=p.getAttribute("href")||"",D=d.match(/\/status\/(\d+)/);if(D&&D[1]){e=D[1],o=d.startsWith("http")?d:`https://x.com${d}`;break}}}if(!e)return null;let s="",l="";const a=I(r,T.userNameContainer);if(a){const p=(a.innerText||"").split(`
`).map(d=>d.trim()).filter(Boolean);p.length>0&&(s=p[0]);for(const d of p)if(d.startsWith("@")){l=d.replace(/^@/,"");break}}let k=null;const u=I(r,T.avatarImage);u&&u.src&&(k=u.src);let f="";const v=I(r,T.tweetText);v&&(f=v.innerText||"");let x=null;const m=I(r,T.timeTag);if(m){const h=m.getAttribute("datetime");h&&(x=h)}const A=[];B(r,T.tweetPhoto).forEach(h=>{h.src&&!h.src.includes("emoji")&&!h.src.includes("profile_images")&&A.push({type:"image",url:h.src,alt_text:h.alt||void 0})}),B(r,T.tweetVideo).forEach(h=>{const p=h.currentSrc||h.src||h.poster;p&&A.push({type:"video",url:p})});const R=[];v&&v.querySelectorAll("a").forEach(p=>{const d=p.getAttribute("href");d&&(d.startsWith("http")||d.includes("t.co"))&&R.push({url:d,expanded_url:d,display_url:p.innerText||d})});let H=!1;const P=I(r,T.socialContext);return P&&((t=P.textContent)!=null&&t.toLowerCase().includes("replying to"))&&(H=!0),{tweet_id:e,tweet_url:o,author_name:s,author_handle:l,author_avatar_url:k,text:f,posted_at:x,media:A,links:R,is_thread:H}}catch(e){return console.error("[shelf] Error extracting tweet element:",e),null}}let y=!1,i=!1,g=0,S=0,C=new Set,F=new Set,w=[],c=null;async function V(){return new Promise(r=>{try{chrome.storage.local.get(["shelf_saved_tweet_ids"],t=>{if(chrome.runtime.lastError){console.warn("[shelf] Error reading storage.local:",chrome.runtime.lastError.message),r(new Set);return}const e=t==null?void 0:t.shelf_saved_tweet_ids;Array.isArray(e)?r(new Set(e.map(o=>String(o)))):r(new Set)})}catch(t){console.error("[shelf] Exception loading saved IDs:",t),r(new Set)}})}async function q(r){return new Promise(t=>{try{chrome.storage.local.set({shelf_saved_tweet_ids:Array.from(r)},()=>{t()})}catch(e){console.error("[shelf] Exception persisting saved IDs:",e),t()}})}function E(r,t,e){try{const o={type:"SYNC_PROGRESS",isCapturing:y,savedCount:g,alreadySavedCount:S,unsavedCount:e||(r==="done"?w.length:0),status:r,statusText:t||(y?`Syncing… ${g} saved`:"Done"),isDone:r==="done"};chrome.storage.local.set({shelf_sync_state:o}),chrome.runtime.sendMessage(o).catch(()=>{})}catch(o){console.warn("[shelf] Error broadcasting sync progress:",o)}}function L(){const r=window.location.href.toLowerCase(),t=window.location.pathname.toLowerCase();return r.includes("bookmark")||r.includes("history")||t.startsWith("/i/bookmarks")||t.startsWith("/i/history")||t.includes("/bookmarks")||t.includes("/history")}async function K(){return new Promise(r=>{chrome.runtime.sendMessage({type:"GET_KNOWN_IDS"},t=>{if(chrome.runtime.lastError){r({success:!1,isAuthError:!1,ids:new Set,error:chrome.runtime.lastError.message});return}if(!t||!t.success){const o=!!(t!=null&&t.isAuthError||(t==null?void 0:t.status)===401||t!=null&&t.error&&(t.error.includes("Not connected to Shelf")||t.error.includes("401")||t.error.includes("API Token not configured")));r({success:!1,isAuthError:o,status:(t==null?void 0:t.status)||(o?401:500),ids:new Set,error:(t==null?void 0:t.error)||"Failed to connect to Shelf web app"});return}const e=new Set((t.knownIds||[]).map(o=>String(o)));r({success:!0,isAuthError:!1,ids:e})})})}async function j(r){return new Promise(t=>{chrome.runtime.sendMessage({type:"INGEST_BATCH",batch:r},e=>{if(chrome.runtime.lastError){t({success:!1,isAuthError:!1,error:chrome.runtime.lastError.message});return}if(!e||!e.success){const o=!!(e!=null&&e.isAuthError||(e==null?void 0:e.status)===401||e!=null&&e.error&&(e.error.includes("Not connected to Shelf")||e.error.includes("401")||e.error.includes("API Token not configured")));t({success:!1,isAuthError:o,status:(e==null?void 0:e.status)||(o?401:500),error:(e==null?void 0:e.error)||"Ingest failed via background worker"});return}t({success:!0,isAuthError:!1,added:e.added||0,skipped:e.skipped||0})})})}async function _(r,t=100){const e=Date.now();for(;Date.now()-e<r;){if(i)return!1;const o=r-(Date.now()-e);await new Promise(n=>setTimeout(n,Math.min(t,o)))}return!i}async function G(r,t=5){let e=0,o=1e3;for(;e<t;){if(i)return{success:!1};e++,console.log(`[shelf] Ingesting batch of ${r.length} tweets (attempt ${e}/${t})...`);const n=await j(r);if(n.success)return console.log("[shelf] Ingest response:",n),{success:!0};if(n.isAuthError)return console.error("[shelf] Auth error (401) on batch ingest. Aborting immediately without retry."),{success:!1,isAuthError:!0,error:n.error};if(i)return{success:!1};if(console.error(`[shelf] Batch attempt ${e}/${t} failed (server/network):`,n.error),e>=t)return console.error("[shelf] Batch failed all 5 attempts. Keeping in queue for next round."),{success:!1,error:n.error};const s=Math.floor(Math.random()*500),l=o+s;if(console.log(`[shelf] Retrying batch in ${l}ms...`),!await _(l)||i)return console.log("[shelf] Batch backoff cancelled due to stop request."),{success:!1};o*=2}return{success:!1}}async function N(r=!1){for(;(w.length>=20||r&&w.length>0)&&!i;){const e=Math.min(20,w.length),o=w.slice(0,e),n=await G(o,5);if(n.isAuthError){console.error("[shelf] Auth error (401) mid-sync. Halting queue processing immediately.");const s="Not connected to Shelf. Please reconnect your API token";return i=!0,c&&b(c,"error",{message:s}),E("error",s),{authError:!0}}if(n.success)w.splice(0,e),o.forEach(s=>C.add(s.tweet_id)),g+=e,await q(C),E("capturing"),c&&b(c,"capturing",{newCount:g,existingCount:S});else{console.warn(`[shelf] ${w.length} tweets remain queued for next round.`);break}}return{authError:!1}}function X(r){try{const t=Array.from(r.querySelectorAll('article[data-testid="tweet"], article[role="article"]'));if(t.length>0)return t;const e=Array.from(r.querySelectorAll('div[data-testid="cellInnerDiv"]')).filter(s=>s.querySelector('a[href*="/status/"]')||s.querySelector("time")||s.querySelector('[data-testid="tweetText"]'));if(e.length>0)return e;const o=Array.from(r.querySelectorAll('a[href*="/status/"]')),n=new Set;for(const s of o){if(!(s.getAttribute("href")||"").match(/\/status\/\d+/))continue;const a=s.closest("article")||s.closest('div[data-testid="cellInnerDiv"]')||s.closest('div[role="article"]')||s.closest("section > div > div > div");a&&n.add(a)}return Array.from(n)}catch(t){return console.error("[shelf] Error finding tweet elements:",t),[]}}function $(){const r=new Set;try{const t=document.querySelectorAll('a[href*="/status/"]');for(const e of t){const n=(e.getAttribute("href")||"").match(/\/status\/(\d+)/);n&&n[1]&&r.add(n[1])}}catch(t){console.error("[shelf] Error getting visible status IDs:",t)}return r}function Z(){return!!(document.querySelector('div[role="progressbar"]')||document.querySelector('[aria-label="Loading…"]')||document.querySelector('[aria-label="Loading"]')||document.querySelector('svg[aria-label="Loading"]'))}async function Q(){try{const r=Array.from(document.querySelectorAll('button, div[role="button"]'));let t=null;for(const e of r){const o=(e.textContent||"").trim().toLowerCase();if(o==="retry"||o==="try again"){t=e;break}}if(t){console.log("[shelf] Twitter retry button detected! Waiting 60-second cooldown first..."),E("rate_limited","Rate limited by X. Waiting 60s...");for(let o=60;o>0;o--)if(i||(c&&b(c,"capturing",{newCount:g,statusText:`Rate limited. Waiting ${o}s...`}),!await _(1e3)||i))return console.log("[shelf] Sync stopped during rate-limit cooldown."),!1;if(i)return!1;console.log("[shelf] 60-second cooldown elapsed. Clicking Retry button...");const e=Array.from(document.querySelectorAll('button, div[role="button"]')).find(o=>{const n=(o.textContent||"").trim().toLowerCase();return n==="retry"||n==="try again"})||t;try{e.click(),console.log("[shelf] Clicked Retry button.")}catch(o){console.error("[shelf] Error clicking retry button:",o)}return await _(1500),!i}}catch(r){console.error("[shelf] Error in checkAndHandleRetry:",r)}return!1}async function J(){if(!i){console.log("[shelf] Nudging lazy loader: scrolling up ~600px, then jumping to bottom...");try{if(window.scrollBy({top:-600,behavior:"auto"}),!await _(450)||i)return;window.scrollTo({top:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),behavior:"smooth"}),window.dispatchEvent(new Event("scroll")),window.dispatchEvent(new WheelEvent("wheel",{deltaY:450,bubbles:!0})),await _(350)}catch(r){console.error("[shelf] Error nudging lazy loader:",r)}}}function ee(){try{window.dispatchEvent(new Event("scroll")),window.dispatchEvent(new WheelEvent("wheel",{deltaY:350,bubbles:!0}));const r=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight);(window.scrollY||window.pageYOffset)+window.innerHeight>=r-350?(window.scrollBy({top:-450,behavior:"auto"}),setTimeout(()=>{window.scrollTo({top:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),behavior:"smooth"}),window.dispatchEvent(new Event("scroll"))},180)):window.scrollBy({top:window.innerHeight*.9,behavior:"smooth"});const o=[document.querySelector("main"),document.querySelector('div[data-testid="primaryColumn"]'),document.querySelector('section[role="region"]')];for(const n of o)n&&n.scrollHeight>n.clientHeight&&n.clientHeight>0&&(n.scrollTop+n.clientHeight>=n.scrollHeight-250?(n.scrollBy({top:-350,behavior:"auto"}),setTimeout(()=>{n.scrollTop=n.scrollHeight},150)):n.scrollBy({top:window.innerHeight*.9,behavior:"smooth"}))}catch(r){console.error("[shelf] Error in triggerDeepScroll:",r)}}function te(r,t=5e3){return new Promise(e=>{if(i){e(!1);return}const o=$();for(const f of o)if(!r.has(f)){e(!0);return}let n=!1,s=null,l=null,a=null;const k=()=>{n||(n=!0,s&&(s.disconnect(),s=null),l!==null&&(window.clearInterval(l),l=null),a!==null&&(window.clearTimeout(a),a=null))},u=()=>{if(n)return;if(i){k(),e(!1);return}const f=$();for(const v of f)if(!r.has(v)){k(),e(!0);return}};try{s=new MutationObserver(()=>{if(i){k(),e(!1);return}u()}),s.observe(document.body,{childList:!0,subtree:!0})}catch(f){console.error("[shelf] Error creating MutationObserver:",f)}l=window.setInterval(u,100),a=window.setTimeout(()=>{k(),e(!1)},t)})}function re(){if(!document.body)return;const r=document.getElementById("shelf-floating-widget");if(r&&document.body.contains(r))return;r&&r.remove();const t=document.createElement("div");t.id="shelf-floating-widget",t.style.cssText=`
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
  `,b(t,"idle"),document.body.appendChild(t),c=t,console.log("[shelf] Floating widget anchored to document.body")}function b(r,t,e){if(t==="idle"){const o=L()?"Sync bookmarks & history":"Sync visible posts";r.innerHTML=`
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
    `;const n=r.querySelector("#shelf-btn-start");n==null||n.addEventListener("click",s=>{s.preventDefault(),s.stopPropagation(),U()})}else if(t==="capturing"){const o=(e==null?void 0:e.newCount)||g,n=(e==null?void 0:e.existingCount)||S,s=(e==null?void 0:e.statusText)||(n>0?`${n} already in Shelf`:"Scanning bookmarks...");r.innerHTML=`
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
    `;const l=r.querySelector("#shelf-btn-stop");l==null||l.addEventListener("click",a=>{a.preventDefault(),a.stopPropagation(),O(),l&&(l.textContent="Stopping...")})}else if(t==="done"){const o=!!(e!=null&&e.warning),n=o?"#78350F":"#064E3B",s=o?"#D97706":"#059669",l=o?"#FEF3C7":"#ECFDF5",a=o?"⚠":"✓";r.innerHTML=`
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
        <span>${a} ${(e==null?void 0:e.message)||"Done"}</span>
      </div>
    `,setTimeout(()=>{c&&!y&&b(c,"idle")},o?7e3:4500)}else t==="error"&&(r.innerHTML=`
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
    `,setTimeout(()=>{c&&!y&&b(c,"idle")},5e3))}function O(){y&&(console.log("[shelf] Stop requested by user"),i=!0,E("idle","Stopping sync..."),c&&b(c,"capturing",{newCount:g,existingCount:S,statusText:"Stopping..."}))}async function U(){if(y){console.log("[shelf] Sync is already in progress. Ignoring duplicate start request.");return}y=!0,i=!1,g=0,S=0,w=[],F=new Set,c&&b(c,"capturing",{newCount:0,existingCount:0}),E("capturing","Syncing… 0 saved"),console.log("[shelf] Starting full continuous bookmark sync...");const r=await V();console.log(`[shelf] Loaded ${r.size} saved IDs from local storage cache.`);const t=await K();if(t.isAuthError){console.error("[shelf] Auth failure connecting to Shelf (401). Aborting sync before scrolling.");const n="Not connected to Shelf. Please reconnect your API token";c&&b(c,"error",{message:n}),E("error",n),y=!1,i=!1;return}t.success&&t.ids?(C=new Set(t.ids),await q(C),console.log(`[shelf] Synchronized with Shelf server: ${C.size} active saved IDs.`)):(console.warn("[shelf] Could not reach Shelf server to fetch known IDs ("+(t.error||"network error")+"). Using local storage cache."),C=new Set(r));let e=0;const o=8;try{for(;!i&&e<o;)try{if(await Q()){e=0;continue}if(i)break;if(Z()){if(console.log("[shelf] Twitter network loading spinner active, waiting..."),!await _(1200)||i)break;continue}const k=$(),u=X(document);let f=0;for(const x of u){if(i)break;try{const m=Y(x);if(!m||!m.tweet_id)continue;if(C.has(m.tweet_id)){F.has(m.tweet_id)||(F.add(m.tweet_id),S++);continue}F.has(m.tweet_id)||(F.add(m.tweet_id),w.push(m),f++,console.log(`[shelf] Found new bookmark: ${m.tweet_id} by @${m.author_handle}`))}catch(m){console.error("[shelf] Error extracting tweet element:",m)}}if(f>0?e=0:(e++,console.log(`[shelf] No new tweets this round. Consecutive empty rounds: ${e}/${o}`)),c&&b(c,"capturing",{newCount:g+w.length,existingCount:S}),E("capturing"),(await N(!1)).authError){console.error("[shelf] Sync stopped due to auth error (401)."),y=!1,i=!1;return}if(i)break;e>0&&e<o?await J():ee(),await te(k,5e3)}catch(a){console.error("[shelf] Loop iteration error:",a)}if(w.length>0&&!i){console.log(`[shelf] Flushing final ${w.length} queued tweets with retry before completing...`),c&&b(c,"capturing",{newCount:g+w.length,existingCount:S,statusText:`Saving final ${w.length} bookmarks...`}),E("capturing",`Saving final ${w.length} bookmarks...`);try{if((await N(!0)).authError){y=!1,i=!1;return}}catch(a){console.error("[shelf] Error in final queue flush:",a)}}chrome.storage.sync.set({shelf_last_sync_time:new Date().toISOString(),shelf_last_sync_count:g});const n=w.length;let s="",l=!1;i?s=`Stopped (${g} saved)`:n>0?(l=!0,g>0?s=`Done: ${g} saved (${n} failed to save)`:s=`${n} bookmark${n===1?"":"s"} could not be saved`):g>0?s=`Done (${g} saved)`:S>0?s=`Done (${S} in Shelf)`:s=L()?"Done (no bookmarks found)":"Done",c&&b(c,"done",{message:s,warning:l}),E("done",s,n),console.log(`[shelf] Sync finished! Total saved: ${g}, Total existing: ${S}, Unsaved: ${n}`)}catch(n){console.error("[shelf] Fatal sync error:",n);const s=n instanceof Error?n.message:"Sync interrupted";c&&b(c,"error",{message:s}),E("error",s)}finally{y=!1,i=!1}}function M(){if(!document.body)return;const r=document.getElementById("shelf-floating-widget");if(!(r&&document.body.contains(r)))re();else if(r&&!y){const e=L(),o=r.querySelector("#shelf-btn-sub"),n=e?"Sync bookmarks & history":"Sync visible posts";o&&o.textContent!==n&&(o.textContent=n)}}function oe(r){const t=document.createElement("div");t.style.cssText=`
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
  `,t.textContent="✕ Removed from Shelf library",document.body.appendChild(t),setTimeout(()=>{t.style.opacity="0",setTimeout(()=>t.remove(),400)},3e3)}let W="";document.addEventListener("click",r=>{var e,o,n;const t=r.target;if(t)try{const s=t.closest('article, [data-testid="tweet"]');if(s){const f=((e=s.querySelector("time"))==null?void 0:e.closest("a"))||s.querySelector('a[href*="/status/"]'),x=((f==null?void 0:f.getAttribute("href"))||"").match(/\/status\/(\d+)/);x&&(W=x[1])}const l=t.closest('[data-testid="removeBookmark"], [aria-label*="Remove"][aria-label*="ookmark"], [aria-label*="remove"][aria-label*="ookmark"], [data-testid="bookmark"][aria-label*="Remove"], [data-testid="bookmark"][aria-label*="remove"]'),a=t.closest('[role="menuitem"], [data-testid="Dropdown"]'),k=a&&/remove.*bookmark|delete.*bookmark/i.test(a.textContent||"");if(l||k){let u="";const f=(o=l||a)==null?void 0:o.closest('article, [data-testid="tweet"], [data-testid="cellInnerDiv"], div[role="article"]');if(f){const x=((n=f.querySelector("time"))==null?void 0:n.closest("a"))||f.querySelector('a[href*="/status/"]'),A=((x==null?void 0:x.getAttribute("href"))||"").match(/\/status\/(\d+)/);A&&(u=A[1])}u||(u=W),u&&(console.log("[shelf] Un-bookmark action detected on X for tweet:",u),C.delete(u),q(C),chrome.runtime.sendMessage({type:"DELETE_BOOKMARK",tweetId:u},v=>{v&&v.success&&(console.log("[shelf] Bookmark auto-removed from Shelf library:",u),oe(u))}))}}catch(s){console.error("[shelf] Error in un-bookmark click listener:",s)}},!0);chrome.runtime.onMessage.addListener((r,t,e)=>{try{if(r.action==="START_CAPTURE")return y?e({started:!1,alreadyRunning:!0}):(U(),e({started:!0})),!0;if(r.action==="STOP_CAPTURE")return O(),e({stopped:!0}),!0}catch(o){return console.error("[shelf] Error in content script onMessage listener:",o),e({error:String(o)}),!0}});setInterval(M,600);let z=location.href;new MutationObserver(()=>{const r=location.href;r!==z&&(z=r,M())}).observe(document,{subtree:!0,childList:!0});M();
