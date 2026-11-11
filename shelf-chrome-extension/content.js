const u={timeline:['div[data-testid="primaryColumn"] section','main[role="main"] section','div[aria-label="Timeline: Bookmarks"]',"section"],tweet:['article[data-testid="tweet"]','article[role="article"]','div[data-testid="cellInnerDiv"] article','div[data-testid="cellInnerDiv"]','div[data-testid="tweet"]',"article"],tweetText:['div[data-testid="tweetText"]',"div[lang]","span[lang]"],userNameContainer:['div[data-testid="User-Name"]'],avatarImage:['div[data-testid="Tweet-User-Avatar"] img','img[src*="profile_images"]'],statusLink:['a[href*="/status/"]'],timeTag:["time"],tweetPhoto:['div[data-testid="tweetPhoto"] img','img[src*="media"]','img[src*="tweet_video_thumb"]'],tweetVideo:['div[data-testid="videoPlayer"] video','div[data-testid="videoComponent"] video',"video"],cardWrapper:['div[data-testid="card.wrapper"]','div[data-testid="card.layoutLarge.media"]'],socialContext:['span[data-testid="socialContext"]']};function m(e,r){for(const t of r){const o=e.querySelector(t);if(o)return o}return null}function S(e,r){for(const t of r){const o=e.querySelectorAll(t);if(o.length>0)return Array.from(o)}return[]}function q(e){var r;try{let t="",o="";const i=m(e,u.timeTag);if(i){const s=i.closest("a");if(s){const l=s.getAttribute("href")||"",n=l.match(/\/status\/(\d+)/);n&&n[1]&&(t=n[1],o=l.startsWith("http")?l:`https://x.com${l}`)}}if(!t){const s=S(e,u.statusLink);for(const l of s){const n=l.getAttribute("href")||"",k=n.match(/\/status\/(\d+)/);if(k&&k[1]){t=k[1],o=n.startsWith("http")?n:`https://x.com${n}`;break}}}if(!t)return null;let c="",a="";const b=m(e,u.userNameContainer);if(b){const l=(b.innerText||"").split(`
`).map(n=>n.trim()).filter(Boolean);l.length>0&&(c=l[0]);for(const n of l)if(n.startsWith("@")){a=n.replace(/^@/,"");break}}let f=null;const p=m(e,u.avatarImage);p&&p.src&&(f=p.src);let E="";const w=m(e,u.tweetText);w&&(E=w.innerText||"");let F=null;const _=m(e,u.timeTag);if(_){const s=_.getAttribute("datetime");s&&(F=s)}const y=[];S(e,u.tweetPhoto).forEach(s=>{s.src&&!s.src.includes("emoji")&&!s.src.includes("profile_images")&&y.push({type:"image",url:s.src,alt_text:s.alt||void 0})}),S(e,u.tweetVideo).forEach(s=>{const l=s.currentSrc||s.src||s.poster;l&&y.push({type:"video",url:l})});const A=[];w&&w.querySelectorAll("a").forEach(l=>{const n=l.getAttribute("href");n&&(n.startsWith("http")||n.includes("t.co"))&&A.push({url:n,expanded_url:n,display_url:l.innerText||n})});let C=!1;const B=m(e,u.socialContext);return B&&((r=B.textContent)!=null&&r.toLowerCase().includes("replying to"))&&(C=!0),{tweet_id:t,tweet_url:o,author_name:c,author_handle:a,author_avatar_url:f,text:E,posted_at:F,media:y,links:A,is_thread:C}}catch(t){return console.error("Error extracting tweet element:",t),null}}let v=!1,x=!1,g=0,d=null;function I(e=1200,r=2200){const t=Math.floor(Math.random()*(r-e+1))+e;return new Promise(o=>setTimeout(o,t))}async function M(e){return new Promise((r,t)=>{chrome.runtime.sendMessage({type:"INGEST_BATCH",batch:e},o=>{if(chrome.runtime.lastError){t(new Error(chrome.runtime.lastError.message));return}if(!o||!o.success){t(new Error((o==null?void 0:o.error)||"Ingest failed via background worker"));return}r({added:o.added||0,skipped:o.skipped||0})})})}function $(e){var i,c;const r=['article[data-testid="tweet"]','article[role="article"]','div[data-testid="cellInnerDiv"] article','div[data-testid="tweet"]','div[data-testid="cellInnerDiv"]',"article"];for(const a of r){const f=Array.from(e.querySelectorAll(a)).filter(p=>p.querySelector('a[href*="/status/"]')||p.querySelector("time")||p.querySelector('[data-testid="tweetText"]'));if(f.length>0)return f}const t=Array.from(e.querySelectorAll('a[href*="/status/"]')),o=new Set;for(const a of t){if(!(a.getAttribute("href")||"").match(/\/status\/\d+/))continue;const f=a.closest("article")||a.closest('div[data-testid="cellInnerDiv"]')||a.closest('div[role="article"]')||a.closest("section > div > div > div")||((c=(i=a.parentElement)==null?void 0:i.parentElement)==null?void 0:c.parentElement);f&&o.add(f)}return Array.from(o)}function N(){if(!document.body)return;const e=document.getElementById("shelf-floating-widget");if(e&&document.body.contains(e))return;e&&e.remove();const r=document.createElement("div");r.id="shelf-floating-widget",r.style.cssText=`
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
  `,h(r,"idle"),document.body.appendChild(r),d=r,console.log("[Shelf] Floating widget anchored to document.body")}function h(e,r,t){const o=window.location.href.includes("bookmarks");if(r==="idle"){e.innerHTML=`
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        background: #18181B;
        color: #F4F4F5;
        padding: 10px 18px;
        border-radius: 9999px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.35);
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        border: 1px solid #38BDF8;
        transition: transform 0.15s ease, background 0.15s ease;
      " id="shelf-btn-start">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        <span id="shelf-btn-label">${o?"Save to Shelf":"Open Bookmarks"}</span>
      </div>
    `;const i=e.querySelector("#shelf-btn-start");i==null||i.addEventListener("click",()=>{window.location.href.includes("bookmarks")?L():window.location.href="https://x.com/i/bookmarks"})}else if(r==="capturing"){e.innerHTML=`
      <div style="
        display: flex;
        align-items: center;
        gap: 12px;
        background: #18181B;
        color: #F4F4F5;
        padding: 10px 18px;
        border-radius: 9999px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
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
        <span>Saving bookmarks: <strong>${(t==null?void 0:t.count)||0}</strong></span>
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
    `;const i=e.querySelector("#shelf-btn-stop");i==null||i.addEventListener("click",()=>{x=!0,i&&(i.textContent="Stopping...")})}else r==="done"?(e.innerHTML=`
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
    `,setTimeout(()=>{d&&h(d,"idle")},4500)):r==="error"&&(e.innerHTML=`
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
    `,setTimeout(()=>{d&&h(d,"idle")},6e3))}async function L(){if(v)return;v=!0,x=!1,g=0,d&&h(d,"capturing",{count:0});const e=new Set;let r=0;console.log("[Shelf] Starting continuous capture on:",window.location.href);try{for(;!x&&r<15;){const o=$(document);console.log(`[Shelf] Scan found ${o.length} candidate elements in DOM`);const i=[];for(const c of o){if(x)break;const a=q(c);a&&!e.has(a.tweet_id)&&(e.add(a.tweet_id),i.push(a),g++,console.log(`[Shelf] Extracted tweet ${a.tweet_id} by @${a.author_handle}`))}if(d&&h(d,"capturing",{count:g}),i.length>0){r=0,console.log(`[Shelf] Sending batch of ${i.length} bookmarks to Shelf...`);try{const c=await M(i);console.log("[Shelf] Ingest response:",c)}catch(c){console.error("[Shelf] Send error:",c)}}else r++,console.log(`[Shelf] No new tweets in this pass (round ${r}/15)`);if(x)break;window.scrollBy({top:window.innerHeight*.9,behavior:"smooth"}),r>=2&&(window.scrollBy({top:-120,behavior:"auto"}),await I(300,500),window.scrollBy({top:500,behavior:"smooth"})),await I(1200,2200)}chrome.storage.sync.set({shelf_last_sync_time:new Date().toISOString(),shelf_last_sync_count:g});let t="";g===0?t="No bookmarks detected":t=`Saved ${g} bookmarks to Shelf`,d&&h(d,"done",{message:t})}catch(t){console.error("[Shelf] Sync error:",t);const o=t instanceof Error?t.message:"Sync failed";d&&h(d,"error",{message:o})}finally{v=!1,x=!1}}function T(){if(!document.body)return;const e=document.getElementById("shelf-floating-widget");if(!(e&&document.body.contains(e)))N();else if(e&&!v){const t=window.location.href.includes("bookmarks"),o=e.querySelector("#shelf-btn-label");o&&o.textContent!==(t?"Save to Shelf":"Open Bookmarks")&&(o.textContent=t?"Save to Shelf":"Open Bookmarks")}}chrome.runtime.onMessage.addListener((e,r,t)=>{e.action==="START_CAPTURE"&&(L(),t({started:!0}))});setInterval(T,600);let D=location.href;new MutationObserver(()=>{const e=location.href;e!==D&&(D=e,T())}).observe(document,{subtree:!0,childList:!0});T();
