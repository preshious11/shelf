const S={timeline:['div[data-testid="primaryColumn"] section','main[role="main"] section','div[aria-label="Timeline: Bookmarks"]',"section"],tweet:['article[data-testid="tweet"]','article[role="article"]','div[data-testid="cellInnerDiv"] article','div[data-testid="cellInnerDiv"]','div[data-testid="tweet"]',"article"],tweetText:['div[data-testid="tweetText"]',"div[lang]","span[lang]"],userNameContainer:['div[data-testid="User-Name"]'],avatarImage:['div[data-testid="Tweet-User-Avatar"] img','img[src*="profile_images"]'],statusLink:['a[href*="/status/"]'],timeTag:["time"],tweetPhoto:['div[data-testid="tweetPhoto"] img','img[src*="media"]','img[src*="tweet_video_thumb"]'],tweetVideo:['div[data-testid="videoPlayer"] video','div[data-testid="videoComponent"] video',"video"],cardWrapper:['div[data-testid="card.wrapper"]','div[data-testid="card.layoutLarge.media"]'],socialContext:['span[data-testid="socialContext"]']};function _(t,o){for(const e of o){const r=t.querySelector(e);if(r)return r}return null}function B(t,o){for(const e of o){const r=t.querySelectorAll(e);if(r.length>0)return Array.from(r)}return[]}function Y(t){var o;try{let e="",r="";const n=_(t,S.timeTag);if(n){const h=n.closest("a");if(h){const m=h.getAttribute("href")||"",f=m.match(/\/status\/(\d+)/);f&&f[1]&&(e=f[1],r=m.startsWith("http")?m:`https://x.com${m}`)}}if(!e){const h=B(t,S.statusLink);for(const m of h){const f=m.getAttribute("href")||"",D=f.match(/\/status\/(\d+)/);if(D&&D[1]){e=D[1],r=f.startsWith("http")?f:`https://x.com${f}`;break}}}if(!e)return null;let s="",c="";const l=_(t,S.userNameContainer);if(l){const m=(l.innerText||"").split(`
`).map(f=>f.trim()).filter(Boolean);m.length>0&&(s=m[0]);for(const f of m)if(f.startsWith("@")){c=f.replace(/^@/,"");break}}let w=null;const u=_(t,S.avatarImage);u&&u.src&&(w=u.src);let i="";const y=_(t,S.tweetText);y&&(i=y.innerText||"");let k=null;const A=_(t,S.timeTag);if(A){const h=A.getAttribute("datetime");h&&(k=h)}const C=[];B(t,S.tweetPhoto).forEach(h=>{h.src&&!h.src.includes("emoji")&&!h.src.includes("profile_images")&&C.push({type:"image",url:h.src,alt_text:h.alt||void 0})}),B(t,S.tweetVideo).forEach(h=>{const m=h.currentSrc||h.src||h.poster;m&&C.push({type:"video",url:m})});const H=[];y&&y.querySelectorAll("a").forEach(m=>{const f=m.getAttribute("href");f&&(f.startsWith("http")||f.includes("t.co"))&&H.push({url:f,expanded_url:f,display_url:m.innerText||f})});let R=!1;const P=_(t,S.socialContext);return P&&((o=P.textContent)!=null&&o.toLowerCase().includes("replying to"))&&(R=!0),{tweet_id:e,tweet_url:r,author_name:s,author_handle:c,author_avatar_url:w,text:i,posted_at:k,media:C,links:H,is_thread:R}}catch(e){return console.error("[shelf] Error extracting tweet element:",e),null}}let x=!1,a=!1,p=0,b=0,E=new Set,F=new Set,g=[],d=null;async function V(){return new Promise(t=>{try{chrome.storage.local.get(["shelf_saved_tweet_ids"],o=>{if(chrome.runtime.lastError){console.warn("[shelf] Error reading storage.local:",chrome.runtime.lastError.message),t(new Set);return}const e=o==null?void 0:o.shelf_saved_tweet_ids;Array.isArray(e)?t(new Set(e.map(r=>String(r)))):t(new Set)})}catch(o){console.error("[shelf] Exception loading saved IDs:",o),t(new Set)}})}async function L(t){return new Promise(o=>{try{chrome.storage.local.set({shelf_saved_tweet_ids:Array.from(t)},()=>{o()})}catch(e){console.error("[shelf] Exception persisting saved IDs:",e),o()}})}function T(t,o){try{const e={type:"SYNC_PROGRESS",isCapturing:x,savedCount:p,alreadySavedCount:b,status:t,statusText:o||(x?`Syncing… ${p} saved`:"Done"),isDone:t==="done"};chrome.storage.local.set({shelf_sync_state:e}),chrome.runtime.sendMessage(e).catch(()=>{})}catch(e){console.warn("[shelf] Error broadcasting sync progress:",e)}}function $(){const t=window.location.href.toLowerCase(),o=window.location.pathname.toLowerCase();return t.includes("bookmark")||t.includes("history")||o.startsWith("/i/bookmarks")||o.startsWith("/i/history")||o.includes("/bookmarks")||o.includes("/history")}async function K(){return new Promise(t=>{chrome.runtime.sendMessage({type:"GET_KNOWN_IDS"},o=>{if(chrome.runtime.lastError){t({success:!1,ids:new Set,error:chrome.runtime.lastError.message});return}if(!o||!o.success){t({success:!1,ids:new Set,error:(o==null?void 0:o.error)||"Failed to connect to Shelf web app"});return}const e=new Set((o.knownIds||[]).map(r=>String(r)));t({success:!0,ids:e})})})}async function j(t){return new Promise((o,e)=>{chrome.runtime.sendMessage({type:"INGEST_BATCH",batch:t},r=>{if(chrome.runtime.lastError){e(new Error(chrome.runtime.lastError.message));return}if(!r||!r.success){e(new Error((r==null?void 0:r.error)||"Ingest failed via background worker"));return}o({added:r.added||0,skipped:r.skipped||0})})})}async function I(t,o=100){const e=Date.now();for(;Date.now()-e<t;){if(a)return!1;const r=t-(Date.now()-e);await new Promise(n=>setTimeout(n,Math.min(o,r)))}return!a}async function G(t,o=5){let e=0,r=1e3;for(;e<o;){if(a)return!1;e++;try{console.log(`[shelf] Ingesting batch of ${t.length} tweets (attempt ${e}/${o})...`);const n=await j(t);return console.log("[shelf] Ingest response:",n),!0}catch(n){if(a)return!1;const s=n instanceof Error?n.message:String(n);if(console.error(`[shelf] Batch attempt ${e}/${o} failed:`,s),e>=o)return console.error("[shelf] Batch failed all 5 attempts. Keeping in queue for next round."),!1;const c=Math.floor(Math.random()*500),l=r+c;if(console.log(`[shelf] Retrying batch in ${l}ms...`),!await I(l)||a)return console.log("[shelf] Batch backoff cancelled due to stop request."),!1;r*=2}}return!1}async function z(t=!1){for(;(g.length>=20||t&&g.length>0)&&!a;){const e=Math.min(20,g.length),r=g.slice(0,e);if(await G(r,5))g.splice(0,e),r.forEach(s=>E.add(s.tweet_id)),p+=e,await L(E),T("capturing"),d&&v(d,"capturing",{newCount:p,existingCount:b});else{console.warn(`[shelf] ${g.length} tweets remain queued for next round.`);break}}}function X(t){try{const o=Array.from(t.querySelectorAll('article[data-testid="tweet"], article[role="article"]'));if(o.length>0)return o;const e=Array.from(t.querySelectorAll('div[data-testid="cellInnerDiv"]')).filter(s=>s.querySelector('a[href*="/status/"]')||s.querySelector("time")||s.querySelector('[data-testid="tweetText"]'));if(e.length>0)return e;const r=Array.from(t.querySelectorAll('a[href*="/status/"]')),n=new Set;for(const s of r){if(!(s.getAttribute("href")||"").match(/\/status\/\d+/))continue;const l=s.closest("article")||s.closest('div[data-testid="cellInnerDiv"]')||s.closest('div[role="article"]')||s.closest("section > div > div > div");l&&n.add(l)}return Array.from(n)}catch(o){return console.error("[shelf] Error finding tweet elements:",o),[]}}function q(){const t=new Set;try{const o=document.querySelectorAll('a[href*="/status/"]');for(const e of o){const n=(e.getAttribute("href")||"").match(/\/status\/(\d+)/);n&&n[1]&&t.add(n[1])}}catch(o){console.error("[shelf] Error getting visible status IDs:",o)}return t}function Z(){return!!(document.querySelector('div[role="progressbar"]')||document.querySelector('[aria-label="Loading…"]')||document.querySelector('[aria-label="Loading"]')||document.querySelector('svg[aria-label="Loading"]'))}async function Q(){try{const t=Array.from(document.querySelectorAll('button, div[role="button"]'));let o=null;for(const e of t){const r=(e.textContent||"").trim().toLowerCase();if(r==="retry"||r==="try again"){o=e;break}}if(o){console.log("[shelf] Twitter retry button detected! Waiting 60-second cooldown first..."),T("rate_limited","Rate limited by X. Waiting 60s...");for(let r=60;r>0;r--)if(a||(d&&v(d,"capturing",{newCount:p,statusText:`Rate limited. Waiting ${r}s...`}),!await I(1e3)||a))return console.log("[shelf] Sync stopped during rate-limit cooldown."),!1;if(a)return!1;console.log("[shelf] 60-second cooldown elapsed. Clicking Retry button...");const e=Array.from(document.querySelectorAll('button, div[role="button"]')).find(r=>{const n=(r.textContent||"").trim().toLowerCase();return n==="retry"||n==="try again"})||o;try{e.click(),console.log("[shelf] Clicked Retry button.")}catch(r){console.error("[shelf] Error clicking retry button:",r)}return await I(1500),!a}}catch(t){console.error("[shelf] Error in checkAndHandleRetry:",t)}return!1}async function J(){if(!a){console.log("[shelf] Nudging lazy loader: scrolling up ~600px, then jumping to bottom...");try{if(window.scrollBy({top:-600,behavior:"auto"}),!await I(450)||a)return;window.scrollTo({top:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),behavior:"smooth"}),window.dispatchEvent(new Event("scroll")),window.dispatchEvent(new WheelEvent("wheel",{deltaY:450,bubbles:!0})),await I(350)}catch(t){console.error("[shelf] Error nudging lazy loader:",t)}}}function ee(){try{window.dispatchEvent(new Event("scroll")),window.dispatchEvent(new WheelEvent("wheel",{deltaY:350,bubbles:!0}));const t=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight);(window.scrollY||window.pageYOffset)+window.innerHeight>=t-350?(window.scrollBy({top:-450,behavior:"auto"}),setTimeout(()=>{window.scrollTo({top:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),behavior:"smooth"}),window.dispatchEvent(new Event("scroll"))},180)):window.scrollBy({top:window.innerHeight*.9,behavior:"smooth"});const r=[document.querySelector("main"),document.querySelector('div[data-testid="primaryColumn"]'),document.querySelector('section[role="region"]')];for(const n of r)n&&n.scrollHeight>n.clientHeight&&n.clientHeight>0&&(n.scrollTop+n.clientHeight>=n.scrollHeight-250?(n.scrollBy({top:-350,behavior:"auto"}),setTimeout(()=>{n.scrollTop=n.scrollHeight},150)):n.scrollBy({top:window.innerHeight*.9,behavior:"smooth"}))}catch(t){console.error("[shelf] Error in triggerDeepScroll:",t)}}function te(t,o=5e3){return new Promise(e=>{if(a){e(!1);return}const r=q();for(const i of r)if(!t.has(i)){e(!0);return}let n=!1,s=null,c=null,l=null;const w=()=>{n||(n=!0,s&&(s.disconnect(),s=null),c!==null&&(window.clearInterval(c),c=null),l!==null&&(window.clearTimeout(l),l=null))},u=()=>{if(n)return;if(a){w(),e(!1);return}const i=q();for(const y of i)if(!t.has(y)){w(),e(!0);return}};try{s=new MutationObserver(()=>{if(a){w(),e(!1);return}u()}),s.observe(document.body,{childList:!0,subtree:!0})}catch(i){console.error("[shelf] Error creating MutationObserver:",i)}c=window.setInterval(u,100),l=window.setTimeout(()=>{w(),e(!1)},o)})}function oe(){if(!document.body)return;const t=document.getElementById("shelf-floating-widget");if(t&&document.body.contains(t))return;t&&t.remove();const o=document.createElement("div");o.id="shelf-floating-widget",o.style.cssText=`
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
  `,v(o,"idle"),document.body.appendChild(o),d=o,console.log("[shelf] Floating widget anchored to document.body")}function v(t,o,e){if(o==="idle"){const r=$()?"Sync bookmarks & history":"Sync visible posts";t.innerHTML=`
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
    `;const n=t.querySelector("#shelf-btn-start");n==null||n.addEventListener("click",s=>{s.preventDefault(),s.stopPropagation(),U()})}else if(o==="capturing"){const r=(e==null?void 0:e.newCount)||p,n=(e==null?void 0:e.existingCount)||b,s=(e==null?void 0:e.statusText)||(n>0?`${n} already in Shelf`:"Scanning bookmarks...");t.innerHTML=`
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
    `;const c=t.querySelector("#shelf-btn-stop");c==null||c.addEventListener("click",l=>{l.preventDefault(),l.stopPropagation(),O(),c&&(c.textContent="Stopping...")})}else o==="done"?(t.innerHTML=`
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
        <span>✓ ${(e==null?void 0:e.message)||"Done"}</span>
      </div>
    `,setTimeout(()=>{d&&!x&&v(d,"idle")},4500)):o==="error"&&(t.innerHTML=`
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
    `,setTimeout(()=>{d&&!x&&v(d,"idle")},5e3))}function O(){x&&(console.log("[shelf] Stop requested by user"),a=!0,T("idle","Stopping sync..."),d&&v(d,"capturing",{newCount:p,existingCount:b,statusText:"Stopping..."}))}async function U(){if(x){console.log("[shelf] Sync is already in progress. Ignoring duplicate start request.");return}x=!0,a=!1,p=0,b=0,g=[],F=new Set,d&&v(d,"capturing",{newCount:0,existingCount:0}),T("capturing","Syncing… 0 saved"),console.log("[shelf] Starting full continuous bookmark sync...");const t=await V();console.log(`[shelf] Loaded ${t.size} saved IDs from local storage cache.`);const o=await K();o.success&&o.ids?(E=new Set(o.ids),await L(E),console.log(`[shelf] Synchronized with Shelf server: ${E.size} active saved IDs.`)):(console.warn("[shelf] Could not reach Shelf server to fetch known IDs ("+(o.error||"network error")+"). Using local storage cache."),E=new Set(t));let e=0;const r=8;try{for(;!a&&e<r;)try{if(await Q()){e=0;continue}if(a)break;if(Z()){if(console.log("[shelf] Twitter network loading spinner active, waiting..."),!await I(1200)||a)break;continue}const c=q(),l=X(document);let w=0;for(const u of l){if(a)break;try{const i=Y(u);if(!i||!i.tweet_id)continue;if(E.has(i.tweet_id)){F.has(i.tweet_id)||(F.add(i.tweet_id),b++);continue}F.has(i.tweet_id)||(F.add(i.tweet_id),g.push(i),w++,console.log(`[shelf] Found new bookmark: ${i.tweet_id} by @${i.author_handle}`))}catch(i){console.error("[shelf] Error extracting tweet element:",i)}}if(w>0?e=0:(e++,console.log(`[shelf] No new tweets this round. Consecutive empty rounds: ${e}/${r}`)),d&&v(d,"capturing",{newCount:p+g.length,existingCount:b}),T("capturing"),await z(!1),a)break;e>0&&e<r?await J():ee(),await te(c,5e3)}catch(s){console.error("[shelf] Loop iteration error:",s)}if(g.length>0&&!a){console.log(`[shelf] Flushing final ${g.length} queued tweets with retry before completing...`),d&&v(d,"capturing",{newCount:p+g.length,existingCount:b,statusText:`Saving final ${g.length} bookmarks...`}),T("capturing",`Saving final ${g.length} bookmarks...`);try{await z(!0)}catch(s){console.error("[shelf] Error in final queue flush:",s)}}chrome.storage.sync.set({shelf_last_sync_time:new Date().toISOString(),shelf_last_sync_count:p});let n="";a?n=`Stopped (${p} saved)`:p>0?n=g.length>0?`Done (${p} saved, ${g.length} queued)`:`Done (${p} saved)`:b>0?n=`Done (${b} in Shelf)`:n=$()?"Done (no bookmarks found)":"Done",d&&v(d,"done",{message:n}),T("done",n),console.log(`[shelf] Sync finished! Total saved: ${p}, Total existing: ${b}`)}catch(n){console.error("[shelf] Fatal sync error:",n);const s=n instanceof Error?n.message:"Sync interrupted";d&&v(d,"error",{message:s}),T("error",s)}finally{x=!1,a=!1}}function M(){if(!document.body)return;const t=document.getElementById("shelf-floating-widget");if(!(t&&document.body.contains(t)))oe();else if(t&&!x){const e=$(),r=t.querySelector("#shelf-btn-sub"),n=e?"Sync bookmarks & history":"Sync visible posts";r&&r.textContent!==n&&(r.textContent=n)}}function re(t){const o=document.createElement("div");o.style.cssText=`
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
  `,o.textContent="✕ Removed from Shelf library",document.body.appendChild(o),setTimeout(()=>{o.style.opacity="0",setTimeout(()=>o.remove(),400)},3e3)}let W="";document.addEventListener("click",t=>{var e,r,n;const o=t.target;if(o)try{const s=o.closest('article, [data-testid="tweet"]');if(s){const i=((e=s.querySelector("time"))==null?void 0:e.closest("a"))||s.querySelector('a[href*="/status/"]'),k=((i==null?void 0:i.getAttribute("href"))||"").match(/\/status\/(\d+)/);k&&(W=k[1])}const c=o.closest('[data-testid="removeBookmark"], [aria-label*="Remove"][aria-label*="ookmark"], [aria-label*="remove"][aria-label*="ookmark"], [data-testid="bookmark"][aria-label*="Remove"], [data-testid="bookmark"][aria-label*="remove"]'),l=o.closest('[role="menuitem"], [data-testid="Dropdown"]'),w=l&&/remove.*bookmark|delete.*bookmark/i.test(l.textContent||"");if(c||w){let u="";const i=(r=c||l)==null?void 0:r.closest('article, [data-testid="tweet"], [data-testid="cellInnerDiv"], div[role="article"]');if(i){const k=((n=i.querySelector("time"))==null?void 0:n.closest("a"))||i.querySelector('a[href*="/status/"]'),C=((k==null?void 0:k.getAttribute("href"))||"").match(/\/status\/(\d+)/);C&&(u=C[1])}u||(u=W),u&&(console.log("[shelf] Un-bookmark action detected on X for tweet:",u),E.delete(u),L(E),chrome.runtime.sendMessage({type:"DELETE_BOOKMARK",tweetId:u},y=>{y&&y.success&&(console.log("[shelf] Bookmark auto-removed from Shelf library:",u),re(u))}))}}catch(s){console.error("[shelf] Error in un-bookmark click listener:",s)}},!0);chrome.runtime.onMessage.addListener((t,o,e)=>{try{if(t.action==="START_CAPTURE")return x?e({started:!1,alreadyRunning:!0}):(U(),e({started:!0})),!0;if(t.action==="STOP_CAPTURE")return O(),e({stopped:!0}),!0}catch(r){return console.error("[shelf] Error in content script onMessage listener:",r),e({error:String(r)}),!0}});setInterval(M,600);let N=location.href;new MutationObserver(()=>{const t=location.href;t!==N&&(N=t,M())}).observe(document,{subtree:!0,childList:!0});M();
