const S={timeline:['div[data-testid="primaryColumn"] section','main[role="main"] section','div[aria-label="Timeline: Bookmarks"]',"section"],tweet:['article[data-testid="tweet"]','article[role="article"]','div[data-testid="cellInnerDiv"] article','div[data-testid="cellInnerDiv"]','div[data-testid="tweet"]',"article"],tweetText:['div[data-testid="tweetText"]',"div[lang]","span[lang]"],userNameContainer:['div[data-testid="User-Name"]'],avatarImage:['div[data-testid="Tweet-User-Avatar"] img','img[src*="profile_images"]'],statusLink:['a[href*="/status/"]'],timeTag:["time"],tweetPhoto:['div[data-testid="tweetPhoto"] img','img[src*="media"]','img[src*="tweet_video_thumb"]'],tweetVideo:['div[data-testid="videoPlayer"] video','div[data-testid="videoComponent"] video',"video"],cardWrapper:['div[data-testid="card.wrapper"]','div[data-testid="card.layoutLarge.media"]'],socialContext:['span[data-testid="socialContext"]']};function C(e,r){for(const t of r){const n=e.querySelector(t);if(n)return n}return null}function D(e,r){for(const t of r){const n=e.querySelectorAll(t);if(n.length>0)return Array.from(n)}return[]}function U(e){var r;try{let t="",n="";const o=C(e,S.timeTag);if(o){const u=o.closest("a");if(u){const h=u.getAttribute("href")||"",d=h.match(/\/status\/(\d+)/);d&&d[1]&&(t=d[1],n=h.startsWith("http")?h:`https://x.com${h}`)}}if(!t){const u=D(e,S.statusLink);for(const h of u){const d=h.getAttribute("href")||"",A=d.match(/\/status\/(\d+)/);if(A&&A[1]){t=A[1],n=d.startsWith("http")?d:`https://x.com${d}`;break}}}if(!t)return null;let s="",c="";const l=C(e,S.userNameContainer);if(l){const h=(l.innerText||"").split(`
`).map(d=>d.trim()).filter(Boolean);h.length>0&&(s=h[0]);for(const d of h)if(d.startsWith("@")){c=d.replace(/^@/,"");break}}let g=null;const a=C(e,S.avatarImage);a&&a.src&&(g=a.src);let i="";const w=C(e,S.tweetText);w&&(i=w.innerText||"");let x=null;const F=C(e,S.timeTag);if(F){const u=F.getAttribute("datetime");u&&(x=u)}const _=[];D(e,S.tweetPhoto).forEach(u=>{u.src&&!u.src.includes("emoji")&&!u.src.includes("profile_images")&&_.push({type:"image",url:u.src,alt_text:u.alt||void 0})}),D(e,S.tweetVideo).forEach(u=>{const h=u.currentSrc||u.src||u.poster;h&&_.push({type:"video",url:h})});const $=[];w&&w.querySelectorAll("a").forEach(h=>{const d=h.getAttribute("href");d&&(d.startsWith("http")||d.includes("t.co"))&&$.push({url:d,expanded_url:d,display_url:h.innerText||d})});let H=!1;const P=C(e,S.socialContext);return P&&((r=P.textContent)!=null&&r.toLowerCase().includes("replying to"))&&(H=!0),{tweet_id:t,tweet_url:n,author_name:s,author_handle:c,author_avatar_url:g,text:i,posted_at:x,media:_,links:$,is_thread:H}}catch(t){return console.error("[shelf] Error extracting tweet element:",t),null}}let v=!1,m=!1,p=0,k=0,b=new Set,I=new Set,y=[],f=null;async function Y(){return new Promise(e=>{try{chrome.storage.local.get(["shelf_saved_tweet_ids"],r=>{if(chrome.runtime.lastError){console.warn("[shelf] Error reading storage.local:",chrome.runtime.lastError.message),e(new Set);return}const t=r==null?void 0:r.shelf_saved_tweet_ids;Array.isArray(t)?e(new Set(t.map(n=>String(n)))):e(new Set)})}catch(r){console.error("[shelf] Exception loading saved IDs:",r),e(new Set)}})}async function q(e){return new Promise(r=>{try{chrome.storage.local.set({shelf_saved_tweet_ids:Array.from(e)},()=>{r()})}catch(t){console.error("[shelf] Exception persisting saved IDs:",t),r()}})}function T(e,r){try{const t={type:"SYNC_PROGRESS",isCapturing:v,savedCount:p,alreadySavedCount:k,status:e,statusText:r||(v?`Syncing… ${p} saved`:"Done"),isDone:e==="done"};chrome.storage.local.set({shelf_sync_state:t}),chrome.runtime.sendMessage(t).catch(()=>{})}catch(t){console.warn("[shelf] Error broadcasting sync progress:",t)}}function L(){const e=window.location.href.toLowerCase(),r=window.location.pathname.toLowerCase();return e.includes("bookmark")||e.includes("history")||r.startsWith("/i/bookmarks")||r.startsWith("/i/history")||r.includes("/bookmarks")||r.includes("/history")}async function V(){return new Promise(e=>{chrome.runtime.sendMessage({type:"GET_KNOWN_IDS"},r=>{if(chrome.runtime.lastError){e({success:!1,ids:new Set,error:chrome.runtime.lastError.message});return}if(!r||!r.success){e({success:!1,ids:new Set,error:(r==null?void 0:r.error)||"Failed to connect to Shelf web app"});return}const t=new Set((r.knownIds||[]).map(n=>String(n)));e({success:!0,ids:t})})})}async function K(e){return new Promise((r,t)=>{chrome.runtime.sendMessage({type:"INGEST_BATCH",batch:e},n=>{if(chrome.runtime.lastError){t(new Error(chrome.runtime.lastError.message));return}if(!n||!n.success){t(new Error((n==null?void 0:n.error)||"Ingest failed via background worker"));return}r({added:n.added||0,skipped:n.skipped||0})})})}async function j(e,r=5){let t=0,n=1e3;for(;t<r;){if(m)return!1;t++;try{console.log(`[shelf] Ingesting batch of ${e.length} tweets (attempt ${t}/${r})...`);const o=await K(e);return console.log("[shelf] Ingest response:",o),!0}catch(o){const s=o instanceof Error?o.message:String(o);if(console.error(`[shelf] Batch attempt ${t}/${r} failed:`,s),t>=r)return console.error("[shelf] Batch failed all 5 attempts. Keeping in queue for next round."),!1;const c=Math.floor(Math.random()*500),l=n+c;console.log(`[shelf] Retrying batch in ${l}ms...`);const g=Date.now();for(;Date.now()-g<l;){if(m)return!1;await new Promise(a=>setTimeout(a,200))}n*=2}}return!1}async function R(e=!1){for(;(y.length>=20||e&&y.length>0)&&!m;){const t=Math.min(20,y.length),n=y.slice(0,t);if(await j(n,5))y.splice(0,t),n.forEach(s=>b.add(s.tweet_id)),p+=t,await q(b),T("capturing"),f&&E(f,"capturing",{newCount:p,existingCount:k});else{console.warn(`[shelf] ${y.length} tweets remain queued for next round.`);break}}}function G(e){try{const r=Array.from(e.querySelectorAll('article[data-testid="tweet"], article[role="article"]'));if(r.length>0)return r;const t=Array.from(e.querySelectorAll('div[data-testid="cellInnerDiv"]')).filter(s=>s.querySelector('a[href*="/status/"]')||s.querySelector("time")||s.querySelector('[data-testid="tweetText"]'));if(t.length>0)return t;const n=Array.from(e.querySelectorAll('a[href*="/status/"]')),o=new Set;for(const s of n){if(!(s.getAttribute("href")||"").match(/\/status\/\d+/))continue;const l=s.closest("article")||s.closest('div[data-testid="cellInnerDiv"]')||s.closest('div[role="article"]')||s.closest("section > div > div > div");l&&o.add(l)}return Array.from(o)}catch(r){return console.error("[shelf] Error finding tweet elements:",r),[]}}function B(){const e=new Set;try{const r=document.querySelectorAll('a[href*="/status/"]');for(const t of r){const o=(t.getAttribute("href")||"").match(/\/status\/(\d+)/);o&&o[1]&&e.add(o[1])}}catch(r){console.error("[shelf] Error getting visible status IDs:",r)}return e}function X(){return!!(document.querySelector('div[role="progressbar"]')||document.querySelector('[aria-label="Loading…"]')||document.querySelector('[aria-label="Loading"]')||document.querySelector('svg[aria-label="Loading"]'))}async function Z(){try{const e=Array.from(document.querySelectorAll('button, div[role="button"]'));for(const r of e){const t=(r.textContent||"").trim().toLowerCase();if(t==="retry"||t==="try again"){console.log("[shelf] Twitter retry button detected! Clicking and cooling down for 60 seconds...");try{r.click()}catch(n){console.error("[shelf] Error clicking retry button:",n)}T("rate_limited","Rate limited by X. Waiting 60s...");for(let n=60;n>0&&!m;n--)f&&E(f,"capturing",{newCount:p,statusText:`Rate limited. Waiting ${n}s...`}),await new Promise(o=>setTimeout(o,1e3));return!0}}}catch(e){console.error("[shelf] Error in checkAndHandleRetry:",e)}return!1}async function Q(){console.log("[shelf] Nudging lazy loader: scrolling up ~600px, then jumping to bottom...");try{window.scrollBy({top:-600,behavior:"auto"}),await new Promise(e=>setTimeout(e,450)),window.scrollTo({top:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),behavior:"smooth"}),window.dispatchEvent(new Event("scroll")),window.dispatchEvent(new WheelEvent("wheel",{deltaY:450,bubbles:!0})),await new Promise(e=>setTimeout(e,350))}catch(e){console.error("[shelf] Error nudging lazy loader:",e)}}function J(){try{window.dispatchEvent(new Event("scroll")),window.dispatchEvent(new WheelEvent("wheel",{deltaY:350,bubbles:!0}));const e=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight);(window.scrollY||window.pageYOffset)+window.innerHeight>=e-350?(window.scrollBy({top:-450,behavior:"auto"}),setTimeout(()=>{window.scrollTo({top:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),behavior:"smooth"}),window.dispatchEvent(new Event("scroll"))},180)):window.scrollBy({top:window.innerHeight*.9,behavior:"smooth"});const n=[document.querySelector("main"),document.querySelector('div[data-testid="primaryColumn"]'),document.querySelector('section[role="region"]')];for(const o of n)o&&o.scrollHeight>o.clientHeight&&o.clientHeight>0&&(o.scrollTop+o.clientHeight>=o.scrollHeight-250?(o.scrollBy({top:-350,behavior:"auto"}),setTimeout(()=>{o.scrollTop=o.scrollHeight},150)):o.scrollBy({top:window.innerHeight*.9,behavior:"smooth"}))}catch(e){console.error("[shelf] Error in triggerDeepScroll:",e)}}function ee(e,r=5e3){return new Promise(t=>{const n=B();for(const i of n)if(!e.has(i)){t(!0);return}let o=!1,s=null,c=null,l=null;const g=()=>{o||(o=!0,s&&(s.disconnect(),s=null),c!==null&&(window.clearInterval(c),c=null),l!==null&&(window.clearTimeout(l),l=null))},a=()=>{if(o)return;if(m){g(),t(!1);return}const i=B();for(const w of i)if(!e.has(w)){g(),t(!0);return}};try{s=new MutationObserver(()=>{a()}),s.observe(document.body,{childList:!0,subtree:!0})}catch(i){console.error("[shelf] Error creating MutationObserver:",i)}c=window.setInterval(a,250),l=window.setTimeout(()=>{g(),t(!1)},r)})}function te(){if(!document.body)return;const e=document.getElementById("shelf-floating-widget");if(e&&document.body.contains(e))return;e&&e.remove();const r=document.createElement("div");r.id="shelf-floating-widget",r.style.cssText=`
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
  `,E(r,"idle"),document.body.appendChild(r),f=r,console.log("[shelf] Floating widget anchored to document.body")}function E(e,r,t){if(r==="idle"){const n=L()?"Sync bookmarks & history":"Sync visible posts";e.innerHTML=`
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
          <span id="shelf-btn-sub" style="font-size: 10px; color: #38BDF8; font-weight: 500;">${n}</span>
        </div>
      </div>
    `;const o=e.querySelector("#shelf-btn-start");o==null||o.addEventListener("click",s=>{s.preventDefault(),s.stopPropagation(),O()})}else if(r==="capturing"){const n=(t==null?void 0:t.newCount)||p,o=(t==null?void 0:t.existingCount)||k,s=(t==null?void 0:t.statusText)||(o>0?`${o} already in Shelf`:"Scanning bookmarks...");e.innerHTML=`
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
          <span>Syncing… <strong>${n} saved</strong></span>
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
    `;const c=e.querySelector("#shelf-btn-stop");c==null||c.addEventListener("click",l=>{l.preventDefault(),l.stopPropagation(),N(),c&&(c.textContent="Stopping...")})}else r==="done"?(e.innerHTML=`
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
        <span>✓ ${(t==null?void 0:t.message)||"Done"}</span>
      </div>
    `,setTimeout(()=>{f&&!v&&E(f,"idle")},4500)):r==="error"&&(e.innerHTML=`
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
    `,setTimeout(()=>{f&&!v&&E(f,"idle")},5e3))}function N(){v&&(console.log("[shelf] Stop requested by user"),m=!0,T("idle","Stopping sync..."))}async function O(){if(v){console.log("[shelf] Sync is already in progress. Ignoring duplicate start request.");return}v=!0,m=!1,p=0,k=0,y=[],I=new Set,f&&E(f,"capturing",{newCount:0,existingCount:0}),T("capturing","Syncing… 0 saved"),console.log("[shelf] Starting full continuous bookmark sync...");const e=await Y();b=new Set(e),console.log(`[shelf] Loaded ${b.size} saved IDs from local storage.`);const r=await V();r.success&&r.ids?(r.ids.forEach(o=>b.add(o)),await q(b),console.log(`[shelf] Total known saved IDs merged: ${b.size}`)):r.error&&console.warn("[shelf] Could not fetch known IDs from backend:",r.error);let t=0;const n=8;try{for(;!m&&t<n;)try{if(await Z()){t=0;continue}if(m)break;if(X()){console.log("[shelf] Twitter network loading spinner active, waiting..."),await new Promise(a=>setTimeout(a,1200));continue}const c=B(),l=G(document);let g=0;for(const a of l){if(m)break;try{const i=U(a);if(!i||!i.tweet_id)continue;if(b.has(i.tweet_id)){I.has(i.tweet_id)||(I.add(i.tweet_id),k++);continue}I.has(i.tweet_id)||(I.add(i.tweet_id),y.push(i),g++,console.log(`[shelf] Found new bookmark: ${i.tweet_id} by @${i.author_handle}`))}catch(i){console.error("[shelf] Error extracting tweet element:",i)}}if(g>0?t=0:(t++,console.log(`[shelf] No new tweets this round. Consecutive empty rounds: ${t}/${n}`)),f&&E(f,"capturing",{newCount:p+y.length,existingCount:k}),T("capturing"),await R(!1),m)break;t>0&&t<n?await Q():J(),await ee(c,5e3)}catch(s){console.error("[shelf] Loop iteration error:",s)}try{y.length>0&&!m&&(console.log(`[shelf] Flushing final ${y.length} queued tweets...`),await R(!0))}catch(s){console.error("[shelf] Error in final queue flush:",s)}chrome.storage.sync.set({shelf_last_sync_time:new Date().toISOString(),shelf_last_sync_count:p});let o="";m?o=`Stopped (${p} saved)`:p>0?o=`Done (${p} saved)`:k>0?o=`Done (${k} in Shelf)`:o=L()?"Done (no bookmarks found)":"Done",f&&E(f,"done",{message:o}),T("done",o),console.log(`[shelf] Sync finished! Total saved: ${p}, Total existing: ${k}`)}catch(o){console.error("[shelf] Fatal sync error:",o);const s=o instanceof Error?o.message:"Sync interrupted";f&&E(f,"error",{message:s}),T("error",s)}finally{v=!1,m=!1}}function M(){if(!document.body)return;const e=document.getElementById("shelf-floating-widget");if(!(e&&document.body.contains(e)))te();else if(e&&!v){const t=L(),n=e.querySelector("#shelf-btn-sub"),o=t?"Sync bookmarks & history":"Sync visible posts";n&&n.textContent!==o&&(n.textContent=o)}}function re(e){const r=document.createElement("div");r.style.cssText=`
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
  `,r.textContent="✕ Removed from Shelf library",document.body.appendChild(r),setTimeout(()=>{r.style.opacity="0",setTimeout(()=>r.remove(),400)},3e3)}let W="";document.addEventListener("click",e=>{var t,n,o;const r=e.target;if(r)try{const s=r.closest('article, [data-testid="tweet"]');if(s){const i=((t=s.querySelector("time"))==null?void 0:t.closest("a"))||s.querySelector('a[href*="/status/"]'),x=((i==null?void 0:i.getAttribute("href"))||"").match(/\/status\/(\d+)/);x&&(W=x[1])}const c=r.closest('[data-testid="removeBookmark"], [aria-label*="Remove"][aria-label*="ookmark"], [aria-label*="remove"][aria-label*="ookmark"], [data-testid="bookmark"][aria-label*="Remove"], [data-testid="bookmark"][aria-label*="remove"]'),l=r.closest('[role="menuitem"], [data-testid="Dropdown"]'),g=l&&/remove.*bookmark|delete.*bookmark/i.test(l.textContent||"");if(c||g){let a="";const i=(n=c||l)==null?void 0:n.closest('article, [data-testid="tweet"], [data-testid="cellInnerDiv"], div[role="article"]');if(i){const x=((o=i.querySelector("time"))==null?void 0:o.closest("a"))||i.querySelector('a[href*="/status/"]'),_=((x==null?void 0:x.getAttribute("href"))||"").match(/\/status\/(\d+)/);_&&(a=_[1])}a||(a=W),a&&(console.log("[shelf] Un-bookmark action detected on X for tweet:",a),b.delete(a),q(b),chrome.runtime.sendMessage({type:"DELETE_BOOKMARK",tweetId:a},w=>{w&&w.success&&(console.log("[shelf] Bookmark auto-removed from Shelf library:",a),re(a))}))}}catch(s){console.error("[shelf] Error in un-bookmark click listener:",s)}},!0);chrome.runtime.onMessage.addListener((e,r,t)=>{try{if(e.action==="START_CAPTURE")return v?t({started:!1,alreadyRunning:!0}):(O(),t({started:!0})),!0;if(e.action==="STOP_CAPTURE")return N(),t({stopped:!0}),!0}catch(n){return console.error("[shelf] Error in content script onMessage listener:",n),t({error:String(n)}),!0}});setInterval(M,600);let z=location.href;new MutationObserver(()=>{const e=location.href;e!==z&&(z=e,M())}).observe(document,{subtree:!0,childList:!0});M();
