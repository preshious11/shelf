const f={timeline:['div[data-testid="primaryColumn"] section','main[role="main"] section','div[aria-label="Timeline: Bookmarks"]',"section"],tweet:['article[data-testid="tweet"]','article[role="article"]','div[data-testid="cellInnerDiv"] article','div[data-testid="cellInnerDiv"]','div[data-testid="tweet"]',"article"],tweetText:['div[data-testid="tweetText"]',"div[lang]","span[lang]"],userNameContainer:['div[data-testid="User-Name"]'],avatarImage:['div[data-testid="Tweet-User-Avatar"] img','img[src*="profile_images"]'],statusLink:['a[href*="/status/"]'],timeTag:["time"],tweetPhoto:['div[data-testid="tweetPhoto"] img','img[src*="media"]','img[src*="tweet_video_thumb"]'],tweetVideo:['div[data-testid="videoPlayer"] video','div[data-testid="videoComponent"] video',"video"],cardWrapper:['div[data-testid="card.wrapper"]','div[data-testid="card.layoutLarge.media"]'],socialContext:['span[data-testid="socialContext"]']};function p(t,e){for(const o of e){const r=t.querySelector(o);if(r)return r}return null}function S(t,e){for(const o of e){const r=t.querySelectorAll(o);if(r.length>0)return Array.from(r)}return[]}function H(t){var e;try{let o="",r="";const a=p(t,f.timeTag);if(a){const s=a.closest("a");if(s){const l=s.getAttribute("href")||"",n=l.match(/\/status\/(\d+)/);n&&n[1]&&(o=n[1],r=l.startsWith("http")?l:`https://x.com${l}`)}}if(!o){const s=S(t,f.statusLink);for(const l of s){const n=l.getAttribute("href")||"",w=n.match(/\/status\/(\d+)/);if(w&&w[1]){o=w[1],r=n.startsWith("http")?n:`https://x.com${n}`;break}}}if(!o)return null;let i="",d="";const u=p(t,f.userNameContainer);if(u){const l=(u.innerText||"").split(`
`).map(n=>n.trim()).filter(Boolean);l.length>0&&(i=l[0]);for(const n of l)if(n.startsWith("@")){d=n.replace(/^@/,"");break}}let C=null;const b=p(t,f.avatarImage);b&&b.src&&(C=b.src);let E="";const x=p(t,f.tweetText);x&&(E=x.innerText||"");let B=null;const I=p(t,f.timeTag);if(I){const s=I.getAttribute("datetime");s&&(B=s)}const v=[];S(t,f.tweetPhoto).forEach(s=>{s.src&&!s.src.includes("emoji")&&!s.src.includes("profile_images")&&v.push({type:"image",url:s.src,alt_text:s.alt||void 0})}),S(t,f.tweetVideo).forEach(s=>{const l=s.currentSrc||s.src||s.poster;l&&v.push({type:"video",url:l})});const D=[];x&&x.querySelectorAll("a").forEach(l=>{const n=l.getAttribute("href");n&&(n.startsWith("http")||n.includes("t.co"))&&D.push({url:n,expanded_url:n,display_url:l.innerText||n})});let L=!1;const q=p(t,f.socialContext);return q&&((e=q.textContent)!=null&&e.toLowerCase().includes("replying to"))&&(L=!0),{tweet_id:o,tweet_url:r,author_name:i,author_handle:d,author_avatar_url:C,text:E,posted_at:B,media:v,links:D,is_thread:L}}catch(o){return console.error("Error extracting tweet element:",o),null}}let y=!1,g=!1,m=0,c=null;function k(t=1200,e=2200){const o=Math.floor(Math.random()*(e-t+1))+t;return new Promise(r=>setTimeout(r,o))}function F(){const t=window.location.href.toLowerCase(),e=window.location.pathname.toLowerCase();return t.includes("bookmark")||t.includes("history")||e.startsWith("/i/bookmarks")||e.startsWith("/i/history")||e.includes("/bookmarks")||e.includes("/history")}async function W(t){return new Promise((e,o)=>{chrome.runtime.sendMessage({type:"INGEST_BATCH",batch:t},r=>{if(chrome.runtime.lastError){o(new Error(chrome.runtime.lastError.message));return}if(!r||!r.success){o(new Error((r==null?void 0:r.error)||"Ingest failed via background worker"));return}e({added:r.added||0,skipped:r.skipped||0})})})}function T(t){const e=Array.from(t.querySelectorAll('article[data-testid="tweet"], article[role="article"]'));if(e.length>0)return e;const o=Array.from(t.querySelectorAll('div[data-testid="cellInnerDiv"]')).filter(i=>i.querySelector('a[href*="/status/"]')||i.querySelector("time")||i.querySelector('[data-testid="tweetText"]'));if(o.length>0)return o;const r=Array.from(t.querySelectorAll('a[href*="/status/"]')),a=new Set;for(const i of r){if(!(i.getAttribute("href")||"").match(/\/status\/\d+/))continue;const u=i.closest("article")||i.closest('div[data-testid="cellInnerDiv"]')||i.closest('div[role="article"]')||i.closest("section > div > div > div");u&&a.add(u)}return Array.from(a)}function M(){window.scrollBy({top:window.innerHeight*.85,behavior:"smooth"});const t=[document.querySelector("main"),document.querySelector('div[data-testid="primaryColumn"]'),document.querySelector('section[role="region"]')];for(const e of t)e&&e.scrollHeight>e.clientHeight&&e.clientHeight>0&&e.scrollBy({top:window.innerHeight*.85,behavior:"smooth"})}function $(){window.scrollBy({top:-140,behavior:"auto"});const t=document.querySelector('div[data-testid="primaryColumn"]');t&&t.scrollBy({top:-140,behavior:"auto"})}function N(){if(!document.body)return;const t=document.getElementById("shelf-floating-widget");if(t&&document.body.contains(t))return;t&&t.remove();const e=document.createElement("div");e.id="shelf-floating-widget",e.style.cssText=`
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
  `,h(e,"idle"),document.body.appendChild(e),c=e,console.log("[Shelf] Floating widget anchored to document.body")}function h(t,e,o){if(e==="idle"){const a=F()?"Sync bookmarks & history":"Sync visible posts";t.innerHTML=`
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
          <span id="shelf-btn-sub" style="font-size: 10px; color: #38BDF8; font-weight: 500;">${a}</span>
        </div>
      </div>
    `;const i=t.querySelector("#shelf-btn-start");i==null||i.addEventListener("click",d=>{d.preventDefault(),d.stopPropagation(),_()})}else if(e==="capturing"){t.innerHTML=`
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
        <span>Saving bookmarks: <strong>${(o==null?void 0:o.count)||0}</strong></span>
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
    `;const r=t.querySelector("#shelf-btn-stop");r==null||r.addEventListener("click",a=>{a.preventDefault(),a.stopPropagation(),g=!0,r&&(r.textContent="Stopping...")})}else e==="done"?(t.innerHTML=`
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
    `,setTimeout(()=>{c&&h(c,"idle")},4500)):e==="error"&&(t.innerHTML=`
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
    `,setTimeout(()=>{c&&h(c,"idle")},6e3))}async function _(){if(y)return;y=!0,g=!1,m=0,c&&h(c,"capturing",{count:0});const t=new Set;let e=0;console.log("[Shelf] Starting capture on:",window.location.href);try{let o=T(document);for(o.length===0&&(console.log("[Shelf] Waiting for initial tweets to mount in DOM..."),await k(800,1200),o=T(document));!g&&e<15;){const a=T(document);console.log(`[Shelf] Scan found ${a.length} candidate elements in DOM`);const i=[];for(const d of a){if(g)break;const u=H(d);u&&!t.has(u.tweet_id)&&(t.add(u.tweet_id),i.push(u),m++,console.log(`[Shelf] Extracted tweet ${u.tweet_id} by @${u.author_handle}`))}if(c&&h(c,"capturing",{count:m}),i.length>0){e=0,console.log(`[Shelf] Sending batch of ${i.length} bookmarks to Shelf...`);try{const d=await W(i);console.log("[Shelf] Ingest response:",d)}catch(d){console.error("[Shelf] Send error:",d)}}else e++,console.log(`[Shelf] No new tweets in this pass (round ${e}/15)`);if(g)break;M(),e>=2&&($(),await k(350,550),M()),await k(1200,2200)}chrome.storage.sync.set({shelf_last_sync_time:new Date().toISOString(),shelf_last_sync_count:m});let r="";m===0?r=F()?"No bookmarks detected in this view":"No posts found on this page":r=`Saved ${m} bookmarks to Shelf`,c&&h(c,"done",{message:r})}catch(o){console.error("[Shelf] Sync error:",o);const r=o instanceof Error?o.message:"Sync failed";c&&h(c,"error",{message:r})}finally{y=!1,g=!1}}function A(){if(!document.body)return;const t=document.getElementById("shelf-floating-widget");if(!(t&&document.body.contains(t)))N();else if(t&&!y){const o=F(),r=t.querySelector("#shelf-btn-sub"),a=o?"Sync bookmarks & history":"Sync visible posts";r&&r.textContent!==a&&(r.textContent=a)}}function z(){try{sessionStorage.getItem("shelf_auto_sync")==="1"&&(sessionStorage.removeItem("shelf_auto_sync"),console.log("[Shelf] Auto-sync scheduled from previous navigation/refresh"),setTimeout(()=>{y||_()},1600))}catch{}}chrome.runtime.onMessage.addListener((t,e,o)=>{t.action==="START_CAPTURE"&&(_(),o({started:!0}))});setInterval(A,600);let P=location.href;new MutationObserver(()=>{const t=location.href;t!==P&&(P=t,A())}).observe(document,{subtree:!0,childList:!0});A();z();
