const g={timeline:['div[data-testid="primaryColumn"] section','main[role="main"] section','div[aria-label="Timeline: Bookmarks"]',"section"],tweet:['article[data-testid="tweet"]','article[role="article"]','div[data-testid="cellInnerDiv"] article','div[data-testid="cellInnerDiv"]','div[data-testid="tweet"]',"article"],tweetText:['div[data-testid="tweetText"]',"div[lang]","span[lang]"],userNameContainer:['div[data-testid="User-Name"]'],avatarImage:['div[data-testid="Tweet-User-Avatar"] img','img[src*="profile_images"]'],statusLink:['a[href*="/status/"]'],timeTag:["time"],tweetPhoto:['div[data-testid="tweetPhoto"] img','img[src*="media"]','img[src*="tweet_video_thumb"]'],tweetVideo:['div[data-testid="videoPlayer"] video','div[data-testid="videoComponent"] video',"video"],cardWrapper:['div[data-testid="card.wrapper"]','div[data-testid="card.layoutLarge.media"]'],socialContext:['span[data-testid="socialContext"]']};function x(e,t){for(const o of t){const n=e.querySelector(o);if(n)return n}return null}function C(e,t){for(const o of t){const n=e.querySelectorAll(o);if(n.length>0)return Array.from(n)}return[]}function P(e){var t;try{let o="",n="";const r=x(e,g.timeTag);if(r){const c=r.closest("a");if(c){const u=c.getAttribute("href")||"",a=u.match(/\/status\/(\d+)/);a&&a[1]&&(o=a[1],n=u.startsWith("http")?u:`https://x.com${u}`)}}if(!o){const c=C(e,g.statusLink);for(const u of c){const a=u.getAttribute("href")||"",A=a.match(/\/status\/(\d+)/);if(A&&A[1]){o=A[1],n=a.startsWith("http")?a:`https://x.com${a}`;break}}}if(!o)return null;let i="",l="";const p=x(e,g.userNameContainer);if(p){const u=(p.innerText||"").split(`
`).map(a=>a.trim()).filter(Boolean);u.length>0&&(i=u[0]);for(const a of u)if(a.startsWith("@")){l=a.replace(/^@/,"");break}}let y=null;const d=x(e,g.avatarImage);d&&d.src&&(y=d.src);let f="";const m=x(e,g.tweetText);m&&(f=m.innerText||"");let s=null;const E=x(e,g.timeTag);if(E){const c=E.getAttribute("datetime");c&&(s=c)}const b=[];C(e,g.tweetPhoto).forEach(c=>{c.src&&!c.src.includes("emoji")&&!c.src.includes("profile_images")&&b.push({type:"image",url:c.src,alt_text:c.alt||void 0})}),C(e,g.tweetVideo).forEach(c=>{const u=c.currentSrc||c.src||c.poster;u&&b.push({type:"video",url:u})});const q=[];m&&m.querySelectorAll("a").forEach(u=>{const a=u.getAttribute("href");a&&(a.startsWith("http")||a.includes("t.co"))&&q.push({url:a,expanded_url:a,display_url:u.innerText||a})});let D=!1;const H=x(e,g.socialContext);return H&&((t=H.textContent)!=null&&t.toLowerCase().includes("replying to"))&&(D=!0),{tweet_id:o,tweet_url:n,author_name:i,author_handle:l,author_avatar_url:y,text:f,posted_at:s,media:b,links:q,is_thread:D}}catch(o){return console.error("Error extracting tweet element:",o),null}}let T=!1,k=!1,v=0,S=0,h=null;function _(e=1200,t=2200){const o=Math.floor(Math.random()*(t-e+1))+e;return new Promise(n=>setTimeout(n,o))}function I(){const e=window.location.href.toLowerCase(),t=window.location.pathname.toLowerCase();return e.includes("bookmark")||e.includes("history")||t.startsWith("/i/bookmarks")||t.startsWith("/i/history")||t.includes("/bookmarks")||t.includes("/history")}async function z(){return new Promise(e=>{chrome.runtime.sendMessage({type:"GET_KNOWN_IDS"},t=>{if(chrome.runtime.lastError||!t||!t.success||!Array.isArray(t.knownIds)){console.warn("[Shelf] Could not fetch known IDs from background, starting fresh"),e(new Set);return}e(new Set(t.knownIds.map(o=>String(o))))})})}async function N(e){return new Promise((t,o)=>{chrome.runtime.sendMessage({type:"INGEST_BATCH",batch:e},n=>{if(chrome.runtime.lastError){o(new Error(chrome.runtime.lastError.message));return}if(!n||!n.success){o(new Error((n==null?void 0:n.error)||"Ingest failed via background worker"));return}t({added:n.added||0,skipped:n.skipped||0})})})}function F(e){const t=Array.from(e.querySelectorAll('article[data-testid="tweet"], article[role="article"]'));if(t.length>0)return t;const o=Array.from(e.querySelectorAll('div[data-testid="cellInnerDiv"]')).filter(i=>i.querySelector('a[href*="/status/"]')||i.querySelector("time")||i.querySelector('[data-testid="tweetText"]'));if(o.length>0)return o;const n=Array.from(e.querySelectorAll('a[href*="/status/"]')),r=new Set;for(const i of n){if(!(i.getAttribute("href")||"").match(/\/status\/\d+/))continue;const p=i.closest("article")||i.closest('div[data-testid="cellInnerDiv"]')||i.closest('div[role="article"]')||i.closest("section > div > div > div");p&&r.add(p)}return Array.from(r)}function R(){return!!(document.querySelector('div[role="progressbar"]')||document.querySelector('[aria-label="Loading…"]')||document.querySelector('[aria-label="Loading"]')||document.querySelector('svg[aria-label="Loading"]'))}function W(){const e=Array.from(document.querySelectorAll('button, div[role="button"]'));for(const t of e){const o=(t.textContent||"").trim().toLowerCase();if(o==="retry"||o==="try again")return console.log("[Shelf] Twitter retry button detected, clicking..."),t.click(),!0}return!1}function O(){W(),window.dispatchEvent(new Event("scroll")),window.dispatchEvent(new WheelEvent("wheel",{deltaY:350,bubbles:!0}));const e=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight);(window.scrollY||window.pageYOffset)+window.innerHeight>=e-350?(window.scrollBy({top:-450,behavior:"auto"}),setTimeout(()=>{window.scrollTo({top:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),behavior:"smooth"}),window.dispatchEvent(new Event("scroll"))},180)):window.scrollBy({top:window.innerHeight*.9,behavior:"smooth"});const n=[document.querySelector("main"),document.querySelector('div[data-testid="primaryColumn"]'),document.querySelector('section[role="region"]')];for(const r of n)r&&r.scrollHeight>r.clientHeight&&r.clientHeight>0&&(r.scrollTop+r.clientHeight>=r.scrollHeight-250?(r.scrollBy({top:-350,behavior:"auto"}),setTimeout(()=>{r.scrollTop=r.scrollHeight},150)):r.scrollBy({top:window.innerHeight*.9,behavior:"smooth"}))}function U(){if(!document.body)return;const e=document.getElementById("shelf-floating-widget");if(e&&document.body.contains(e))return;e&&e.remove();const t=document.createElement("div");t.id="shelf-floating-widget",t.style.cssText=`
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
  `,w(t,"idle"),document.body.appendChild(t),h=t,console.log("[Shelf] Floating widget anchored to document.body")}function w(e,t,o){if(t==="idle"){const r=I()?"Sync bookmarks & history":"Sync visible posts";e.innerHTML=`
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
    `;const i=e.querySelector("#shelf-btn-start");i==null||i.addEventListener("click",l=>{l.preventDefault(),l.stopPropagation(),B()})}else if(t==="capturing"){const n=(o==null?void 0:o.newCount)||0,r=(o==null?void 0:o.existingCount)||0;e.innerHTML=`
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
          <span>Saving: <strong>${n} new</strong></span>
          ${r>0?`<span style="font-size: 10px; color: #A1A1AA;">${r} already in Shelf</span>`:'<span style="font-size: 10px; color: #38BDF8;">Scanning timeline...</span>'}
        </div>
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
    `;const i=e.querySelector("#shelf-btn-stop");i==null||i.addEventListener("click",l=>{l.preventDefault(),l.stopPropagation(),k=!0,i&&(i.textContent="Stopping...")})}else t==="done"?(e.innerHTML=`
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
        <span>✓ ${(o==null?void 0:o.message)||"Sync completed"}</span>
      </div>
    `,setTimeout(()=>{h&&w(h,"idle")},4500)):t==="error"&&(e.innerHTML=`
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
        <span>⚠ ${(o==null?void 0:o.message)||"Error occurred"}</span>
      </div>
    `,setTimeout(()=>{h&&w(h,"idle")},6e3))}async function B(){if(T)return;T=!0,k=!1,v=0,S=0,h&&w(h,"capturing",{newCount:0,existingCount:0}),console.log("[Shelf] Fetching known bookmark IDs from Shelf library...");const e=await z();console.log(`[Shelf] Library currently contains ${e.size} bookmarks.`);const t=new Set;let o=0;const n=35;let r=document.documentElement.scrollHeight;try{let i=F(document);for(i.length===0&&(console.log("[Shelf] Waiting for initial tweets to mount in DOM..."),await _(800,1200),i=F(document));!k&&o<n;){if(R()){console.log("[Shelf] Twitter is fetching more tweets from network, waiting..."),o=Math.max(0,o-1),await _(1200,2e3);continue}const p=document.documentElement.scrollHeight;p>r&&(r=p,o=0);const y=F(document),d=[];let f=0;for(const m of y){if(k)break;const s=P(m);if(s){if(e.has(s.tweet_id)){t.has(s.tweet_id)||(t.add(s.tweet_id),S++,f++,console.log(`[Shelf] Tweet ${s.tweet_id} already in Shelf. Skipping.`));continue}t.has(s.tweet_id)||(t.add(s.tweet_id),d.push(s),v++,f++,console.log(`[Shelf] Found new bookmark: ${s.tweet_id} by @${s.author_handle}`))}}if(h&&w(h,"capturing",{newCount:v,existingCount:S}),d.length>0){o=0,console.log(`[Shelf] Transmitting ${d.length} new bookmarks to Shelf...`);try{const m=await N(d);console.log("[Shelf] Ingest response:",m),d.forEach(s=>e.add(s.tweet_id))}catch(m){console.error("[Shelf] Send error:",m)}}else f>0?o=0:(o++,console.log(`[Shelf] Advancing timeline (idle pass ${o}/${n})...`));if(k)break;O(),await _(1200,2e3)}chrome.storage.sync.set({shelf_last_sync_time:new Date().toISOString(),shelf_last_sync_count:v});let l="";v>0?l=`Saved ${v} new bookmarks! (${S} already in Shelf)`:S>0?l=`All ${S} bookmarks are already in Shelf!`:l=I()?"No bookmarks detected in this view":"No posts found on this page",h&&w(h,"done",{message:l})}catch(i){console.error("[Shelf] Sync error:",i);const l=i instanceof Error?i.message:"Sync failed";h&&w(h,"error",{message:l})}finally{T=!1,k=!1}}function L(){if(!document.body)return;const e=document.getElementById("shelf-floating-widget");if(!(e&&document.body.contains(e)))U();else if(e&&!T){const o=I(),n=e.querySelector("#shelf-btn-sub"),r=o?"Sync bookmarks & history":"Sync visible posts";n&&n.textContent!==r&&(n.textContent=r)}}function V(){try{sessionStorage.getItem("shelf_auto_sync")==="1"&&(sessionStorage.removeItem("shelf_auto_sync"),console.log("[Shelf] Auto-sync scheduled from previous navigation/refresh"),setTimeout(()=>{T||B()},1600))}catch{}}function Y(e){const t=document.createElement("div");t.style.cssText=`
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
  `,t.textContent="✕ Removed from Shelf library",document.body.appendChild(t),setTimeout(()=>{t.style.opacity="0",setTimeout(()=>t.remove(),400)},3e3)}let M="";document.addEventListener("click",e=>{var l,p,y;const t=e.target;if(!t)return;const o=t.closest('article, [data-testid="tweet"]');if(o){const f=((l=o.querySelector("time"))==null?void 0:l.closest("a"))||o.querySelector('a[href*="/status/"]'),s=((f==null?void 0:f.getAttribute("href"))||"").match(/\/status\/(\d+)/);s&&(M=s[1])}const n=t.closest('[data-testid="removeBookmark"], [aria-label*="Remove"][aria-label*="ookmark"], [aria-label*="remove"][aria-label*="ookmark"], [data-testid="bookmark"][aria-label*="Remove"], [data-testid="bookmark"][aria-label*="remove"]'),r=t.closest('[role="menuitem"], [data-testid="Dropdown"]'),i=r&&/remove.*bookmark|delete.*bookmark/i.test(r.textContent||"");if(n||i){let d="";const f=(p=n||r)==null?void 0:p.closest('article, [data-testid="tweet"], [data-testid="cellInnerDiv"], div[role="article"]');if(f){const s=((y=f.querySelector("time"))==null?void 0:y.closest("a"))||f.querySelector('a[href*="/status/"]'),b=((s==null?void 0:s.getAttribute("href"))||"").match(/\/status\/(\d+)/);b&&(d=b[1])}d||(d=M),d&&(console.log("[Shelf] Un-bookmark action detected on X for tweet:",d),chrome.runtime.sendMessage({type:"DELETE_BOOKMARK",tweetId:d},m=>{m&&m.success&&(console.log("[Shelf] Bookmark auto-removed from Shelf library:",d),Y())}))}},!0);chrome.runtime.onMessage.addListener((e,t,o)=>{e.action==="START_CAPTURE"&&(B(),o({started:!0}))});setInterval(L,600);let $=location.href;new MutationObserver(()=>{const e=location.href;e!==$&&($=e,L())}).observe(document,{subtree:!0,childList:!0});L();V();
