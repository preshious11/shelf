const m={timeline:['div[data-testid="primaryColumn"] section','main[role="main"] section','div[aria-label="Timeline: Bookmarks"]',"section"],tweet:['article[data-testid="tweet"]','article[role="article"]','div[data-testid="cellInnerDiv"] article','div[data-testid="cellInnerDiv"]','div[data-testid="tweet"]',"article"],tweetText:['div[data-testid="tweetText"]',"div[lang]","span[lang]"],userNameContainer:['div[data-testid="User-Name"]'],avatarImage:['div[data-testid="Tweet-User-Avatar"] img','img[src*="profile_images"]'],statusLink:['a[href*="/status/"]'],timeTag:["time"],tweetPhoto:['div[data-testid="tweetPhoto"] img','img[src*="media"]','img[src*="tweet_video_thumb"]'],tweetVideo:['div[data-testid="videoPlayer"] video','div[data-testid="videoComponent"] video',"video"],cardWrapper:['div[data-testid="card.wrapper"]','div[data-testid="card.layoutLarge.media"]'],socialContext:['span[data-testid="socialContext"]']};function w(e,o){for(const t of o){const n=e.querySelector(t);if(n)return n}return null}function A(e,o){for(const t of o){const n=e.querySelectorAll(t);if(n.length>0)return Array.from(n)}return[]}function M(e){var o;try{let t="",n="";const i=w(e,m.timeTag);if(i){const a=i.closest("a");if(a){const c=a.getAttribute("href")||"",s=c.match(/\/status\/(\d+)/);s&&s[1]&&(t=s[1],n=c.startsWith("http")?c:`https://x.com${c}`)}}if(!t){const a=A(e,m.statusLink);for(const c of a){const s=c.getAttribute("href")||"",C=s.match(/\/status\/(\d+)/);if(C&&C[1]){t=C[1],n=s.startsWith("http")?s:`https://x.com${s}`;break}}}if(!t)return null;let r="",l="";const g=w(e,m.userNameContainer);if(g){const c=(g.innerText||"").split(`
`).map(s=>s.trim()).filter(Boolean);c.length>0&&(r=c[0]);for(const s of c)if(s.startsWith("@")){l=s.replace(/^@/,"");break}}let k=null;const h=w(e,m.avatarImage);h&&h.src&&(k=h.src);let y="";const f=w(e,m.tweetText);f&&(y=f.innerText||"");let d=null;const L=w(e,m.timeTag);if(L){const a=L.getAttribute("datetime");a&&(d=a)}const T=[];A(e,m.tweetPhoto).forEach(a=>{a.src&&!a.src.includes("emoji")&&!a.src.includes("profile_images")&&T.push({type:"image",url:a.src,alt_text:a.alt||void 0})}),A(e,m.tweetVideo).forEach(a=>{const c=a.currentSrc||a.src||a.poster;c&&T.push({type:"video",url:c})});const B=[];f&&f.querySelectorAll("a").forEach(c=>{const s=c.getAttribute("href");s&&(s.startsWith("http")||s.includes("t.co"))&&B.push({url:s,expanded_url:s,display_url:c.innerText||s})});let D=!1;const q=w(e,m.socialContext);return q&&((o=q.textContent)!=null&&o.toLowerCase().includes("replying to"))&&(D=!0),{tweet_id:t,tweet_url:n,author_name:r,author_handle:l,author_avatar_url:k,text:y,posted_at:d,media:T,links:B,is_thread:D}}catch(t){return console.error("Error extracting tweet element:",t),null}}let S=!1,v=!1,b=0,x=0,u=null;function _(e=1200,o=2200){const t=Math.floor(Math.random()*(o-e+1))+e;return new Promise(n=>setTimeout(n,t))}function F(){const e=window.location.href.toLowerCase(),o=window.location.pathname.toLowerCase();return e.includes("bookmark")||e.includes("history")||o.startsWith("/i/bookmarks")||o.startsWith("/i/history")||o.includes("/bookmarks")||o.includes("/history")}async function P(){return new Promise(e=>{chrome.runtime.sendMessage({type:"GET_KNOWN_IDS"},o=>{if(chrome.runtime.lastError||!o||!o.success||!Array.isArray(o.knownIds)){console.warn("[Shelf] Could not fetch known IDs from background, starting fresh"),e(new Set);return}e(new Set(o.knownIds.map(t=>String(t))))})})}async function W(e){return new Promise((o,t)=>{chrome.runtime.sendMessage({type:"INGEST_BATCH",batch:e},n=>{if(chrome.runtime.lastError){t(new Error(chrome.runtime.lastError.message));return}if(!n||!n.success){t(new Error((n==null?void 0:n.error)||"Ingest failed via background worker"));return}o({added:n.added||0,skipped:n.skipped||0})})})}function E(e){const o=Array.from(e.querySelectorAll('article[data-testid="tweet"], article[role="article"]'));if(o.length>0)return o;const t=Array.from(e.querySelectorAll('div[data-testid="cellInnerDiv"]')).filter(r=>r.querySelector('a[href*="/status/"]')||r.querySelector("time")||r.querySelector('[data-testid="tweetText"]'));if(t.length>0)return t;const n=Array.from(e.querySelectorAll('a[href*="/status/"]')),i=new Set;for(const r of n){if(!(r.getAttribute("href")||"").match(/\/status\/\d+/))continue;const g=r.closest("article")||r.closest('div[data-testid="cellInnerDiv"]')||r.closest('div[role="article"]')||r.closest("section > div > div > div");g&&i.add(g)}return Array.from(i)}function N(){return!!(document.querySelector('div[role="progressbar"]')||document.querySelector('[aria-label="Loading…"]')||document.querySelector('[aria-label="Loading"]')||document.querySelector('svg[aria-label="Loading"]'))}function z(){const e=Array.from(document.querySelectorAll('button, div[role="button"]'));for(const o of e){const t=(o.textContent||"").trim().toLowerCase();if(t==="retry"||t==="try again")return console.log("[Shelf] Twitter retry button detected, clicking..."),o.click(),!0}return!1}function O(){z(),window.dispatchEvent(new Event("scroll")),window.dispatchEvent(new WheelEvent("wheel",{deltaY:350,bubbles:!0}));const e=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight);(window.scrollY||window.pageYOffset)+window.innerHeight>=e-350?(window.scrollBy({top:-450,behavior:"auto"}),setTimeout(()=>{window.scrollTo({top:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),behavior:"smooth"}),window.dispatchEvent(new Event("scroll"))},180)):window.scrollBy({top:window.innerHeight*.9,behavior:"smooth"});const n=[document.querySelector("main"),document.querySelector('div[data-testid="primaryColumn"]'),document.querySelector('section[role="region"]')];for(const i of n)i&&i.scrollHeight>i.clientHeight&&i.clientHeight>0&&(i.scrollTop+i.clientHeight>=i.scrollHeight-250?(i.scrollBy({top:-350,behavior:"auto"}),setTimeout(()=>{i.scrollTop=i.scrollHeight},150)):i.scrollBy({top:window.innerHeight*.9,behavior:"smooth"}))}function R(){if(!document.body)return;const e=document.getElementById("shelf-floating-widget");if(e&&document.body.contains(e))return;e&&e.remove();const o=document.createElement("div");o.id="shelf-floating-widget",o.style.cssText=`
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
  `,p(o,"idle"),document.body.appendChild(o),u=o,console.log("[Shelf] Floating widget anchored to document.body")}function p(e,o,t){if(o==="idle"){const i=F()?"Sync bookmarks & history":"Sync visible posts";e.innerHTML=`
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
          <span id="shelf-btn-sub" style="font-size: 10px; color: #38BDF8; font-weight: 500;">${i}</span>
        </div>
      </div>
    `;const r=e.querySelector("#shelf-btn-start");r==null||r.addEventListener("click",l=>{l.preventDefault(),l.stopPropagation(),I()})}else if(o==="capturing"){const n=(t==null?void 0:t.newCount)||0,i=(t==null?void 0:t.existingCount)||0;e.innerHTML=`
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
          ${i>0?`<span style="font-size: 10px; color: #A1A1AA;">${i} already in Shelf</span>`:'<span style="font-size: 10px; color: #38BDF8;">Scanning timeline...</span>'}
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
    `;const r=e.querySelector("#shelf-btn-stop");r==null||r.addEventListener("click",l=>{l.preventDefault(),l.stopPropagation(),v=!0,r&&(r.textContent="Stopping...")})}else o==="done"?(e.innerHTML=`
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
        <span>✓ ${(t==null?void 0:t.message)||"Sync completed"}</span>
      </div>
    `,setTimeout(()=>{u&&p(u,"idle")},4500)):o==="error"&&(e.innerHTML=`
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
    `,setTimeout(()=>{u&&p(u,"idle")},6e3))}async function I(){if(S)return;S=!0,v=!1,b=0,x=0,u&&p(u,"capturing",{newCount:0,existingCount:0}),console.log("[Shelf] Fetching known bookmark IDs from Shelf library...");const e=await P();console.log(`[Shelf] Library currently contains ${e.size} bookmarks.`);const o=new Set;let t=0;const n=35;let i=document.documentElement.scrollHeight;try{let r=E(document);for(r.length===0&&(console.log("[Shelf] Waiting for initial tweets to mount in DOM..."),await _(800,1200),r=E(document));!v&&t<n;){if(N()){console.log("[Shelf] Twitter is fetching more tweets from network, waiting..."),t=Math.max(0,t-1),await _(1200,2e3);continue}const g=document.documentElement.scrollHeight;g>i&&(i=g,t=0);const k=E(document),h=[];let y=0;for(const f of k){if(v)break;const d=M(f);if(d){if(e.has(d.tweet_id)){o.has(d.tweet_id)||(o.add(d.tweet_id),x++,y++,console.log(`[Shelf] Tweet ${d.tweet_id} already in Shelf. Skipping.`));continue}o.has(d.tweet_id)||(o.add(d.tweet_id),h.push(d),b++,y++,console.log(`[Shelf] Found new bookmark: ${d.tweet_id} by @${d.author_handle}`))}}if(u&&p(u,"capturing",{newCount:b,existingCount:x}),h.length>0){t=0,console.log(`[Shelf] Transmitting ${h.length} new bookmarks to Shelf...`);try{const f=await W(h);console.log("[Shelf] Ingest response:",f),h.forEach(d=>e.add(d.tweet_id))}catch(f){console.error("[Shelf] Send error:",f)}}else y>0?t=0:(t++,console.log(`[Shelf] Advancing timeline (idle pass ${t}/${n})...`));if(v)break;O(),await _(1200,2e3)}chrome.storage.sync.set({shelf_last_sync_time:new Date().toISOString(),shelf_last_sync_count:b});let l="";b>0?l=`Saved ${b} new bookmarks! (${x} already in Shelf)`:x>0?l=`All ${x} bookmarks are already in Shelf!`:l=F()?"No bookmarks detected in this view":"No posts found on this page",u&&p(u,"done",{message:l})}catch(r){console.error("[Shelf] Sync error:",r);const l=r instanceof Error?r.message:"Sync failed";u&&p(u,"error",{message:l})}finally{S=!1,v=!1}}function H(){if(!document.body)return;const e=document.getElementById("shelf-floating-widget");if(!(e&&document.body.contains(e)))R();else if(e&&!S){const t=F(),n=e.querySelector("#shelf-btn-sub"),i=t?"Sync bookmarks & history":"Sync visible posts";n&&n.textContent!==i&&(n.textContent=i)}}function U(){try{sessionStorage.getItem("shelf_auto_sync")==="1"&&(sessionStorage.removeItem("shelf_auto_sync"),console.log("[Shelf] Auto-sync scheduled from previous navigation/refresh"),setTimeout(()=>{S||I()},1600))}catch{}}chrome.runtime.onMessage.addListener((e,o,t)=>{e.action==="START_CAPTURE"&&(I(),t({started:!0}))});setInterval(H,600);let $=location.href;new MutationObserver(()=>{const e=location.href;e!==$&&($=e,H())}).observe(document,{subtree:!0,childList:!0});H();U();
