const f={timeline:['div[data-testid="primaryColumn"] section','main[role="main"] section','div[aria-label="Timeline: Bookmarks"]',"section"],tweet:['article[data-testid="tweet"]','article[role="article"]','div[data-testid="cellInnerDiv"] article','div[data-testid="cellInnerDiv"]','div[data-testid="tweet"]',"article"],tweetText:['div[data-testid="tweetText"]',"div[lang]","span[lang]"],userNameContainer:['div[data-testid="User-Name"]'],avatarImage:['div[data-testid="Tweet-User-Avatar"] img','img[src*="profile_images"]'],statusLink:['a[href*="/status/"]'],timeTag:["time"],tweetPhoto:['div[data-testid="tweetPhoto"] img','img[src*="media"]','img[src*="tweet_video_thumb"]'],tweetVideo:['div[data-testid="videoPlayer"] video','div[data-testid="videoComponent"] video',"video"],cardWrapper:['div[data-testid="card.wrapper"]','div[data-testid="card.layoutLarge.media"]'],socialContext:['span[data-testid="socialContext"]']};function m(e,o){for(const r of o){const t=e.querySelector(r);if(t)return t}return null}function y(e,o){for(const r of o){const t=e.querySelectorAll(r);if(t.length>0)return Array.from(t)}return[]}function L(e){var o;try{let r="",t="";const c=m(e,f.timeTag);if(c){const i=c.closest("a");if(i){const n=i.getAttribute("href")||"",s=n.match(/\/status\/(\d+)/);s&&s[1]&&(r=s[1],t=n.startsWith("http")?n:`https://x.com${n}`)}}if(!r){const i=y(e,f.statusLink);for(const n of i){const s=n.getAttribute("href")||"",k=s.match(/\/status\/(\d+)/);if(k&&k[1]){r=k[1],t=s.startsWith("http")?s:`https://x.com${s}`;break}}}if(!r)return null;let u="",a="";const d=m(e,f.userNameContainer);if(d){const n=(d.innerText||"").split(`
`).map(s=>s.trim()).filter(Boolean);n.length>0&&(u=n[0]);for(const s of n)if(s.startsWith("@")){a=s.replace(/^@/,"");break}}let p=null;const h=m(e,f.avatarImage);h&&h.src&&(p=h.src);let F="";const w=m(e,f.tweetText);w&&(F=w.innerText||"");let _=null;const E=m(e,f.timeTag);if(E){const i=E.getAttribute("datetime");i&&(_=i)}const b=[];y(e,f.tweetPhoto).forEach(i=>{i.src&&!i.src.includes("emoji")&&!i.src.includes("profile_images")&&b.push({type:"image",url:i.src,alt_text:i.alt||void 0})}),y(e,f.tweetVideo).forEach(i=>{const n=i.currentSrc||i.src||i.poster;n&&b.push({type:"video",url:n})});const A=[];w&&w.querySelectorAll("a").forEach(n=>{const s=n.getAttribute("href");s&&(s.startsWith("http")||s.includes("t.co"))&&A.push({url:s,expanded_url:s,display_url:n.innerText||s})});let C=!1;const I=m(e,f.socialContext);return I&&((o=I.textContent)!=null&&o.toLowerCase().includes("replying to"))&&(C=!0),{tweet_id:r,tweet_url:t,author_name:u,author_handle:a,author_avatar_url:p,text:F,posted_at:_,media:b,links:A,is_thread:C}}catch(r){return console.error("Error extracting tweet element:",r),null}}let S=!1,v=!1,x=0,l=null;function q(e=1200,o=2200){const r=Math.floor(Math.random()*(o-e+1))+e;return new Promise(t=>setTimeout(t,r))}async function M(e){return new Promise((o,r)=>{chrome.runtime.sendMessage({type:"INGEST_BATCH",batch:e},t=>{if(chrome.runtime.lastError){r(new Error(chrome.runtime.lastError.message));return}if(!t||!t.success){r(new Error((t==null?void 0:t.error)||"Ingest failed via background worker"));return}o({added:t.added||0,skipped:t.skipped||0})})})}function $(e){var c,u;const o=['article[data-testid="tweet"]','article[role="article"]','div[data-testid="cellInnerDiv"] article','div[data-testid="tweet"]','div[data-testid="cellInnerDiv"]',"article"];for(const a of o){const p=Array.from(e.querySelectorAll(a)).filter(h=>h.querySelector('a[href*="/status/"]')||h.querySelector("time")||h.querySelector('[data-testid="tweetText"]'));if(p.length>0)return p}const r=Array.from(e.querySelectorAll('a[href*="/status/"]')),t=new Set;for(const a of r){if(!(a.getAttribute("href")||"").match(/\/status\/\d+/))continue;const p=a.closest("article")||a.closest('div[data-testid="cellInnerDiv"]')||a.closest('div[role="article"]')||a.closest("section > div > div > div")||((u=(c=a.parentElement)==null?void 0:c.parentElement)==null?void 0:u.parentElement);p&&t.add(p)}return Array.from(t)}function P(){if(document.getElementById("shelf-floating-widget"))return;const e=document.createElement("div");e.id="shelf-floating-widget",e.style.cssText=`
    position: fixed;
    bottom: 32px;
    right: 32px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    user-select: none;
  `,g(e,"idle"),document.body.appendChild(e),l=e,console.log("[Shelf] Floating capture widget injected successfully.")}function g(e,o,r){if(o==="idle"){e.innerHTML=`
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        background: #18181B;
        color: #F4F4F5;
        padding: 9px 16px;
        border-radius: 9999px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        border: 1px solid #38BDF8;
        transition: transform 0.15s ease, background 0.15s ease;
      " id="shelf-btn-start">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>Save to Shelf</span>
      </div>
    `;const t=e.querySelector("#shelf-btn-start");t==null||t.addEventListener("click",D)}else if(o==="capturing"){e.innerHTML=`
      <div style="
        display: flex;
        align-items: center;
        gap: 12px;
        background: #18181B;
        color: #F4F4F5;
        padding: 9px 16px;
        border-radius: 9999px;
        box-shadow: 0 4px 18px rgba(0,0,0,0.35);
        font-size: 13px;
        font-weight: 500;
        border: 1px solid #0284C7;
      ">
        <div style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #38BDF8;
          box-shadow: 0 0 8px #38BDF8;
          animation: pulse 1.5s infinite;
        "></div>
        <span>Saving bookmarks: <strong>${(r==null?void 0:r.count)||0}</strong></span>
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
    `;const t=e.querySelector("#shelf-btn-stop");t==null||t.addEventListener("click",()=>{v=!0,t&&(t.textContent="Stopping...")})}else o==="done"?(e.innerHTML=`
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        background: #064E3B;
        color: #ECFDF5;
        padding: 9px 16px;
        border-radius: 9999px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        font-size: 13px;
        font-weight: 500;
        border: 1px solid #059669;
      ">
        <span>✓ ${(r==null?void 0:r.message)||"Sync completed"}</span>
      </div>
    `,setTimeout(()=>{l&&g(l,"idle")},4500)):o==="error"&&(e.innerHTML=`
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        background: #7F1D1D;
        color: #FEF2F2;
        padding: 9px 16px;
        border-radius: 9999px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        font-size: 12px;
        font-weight: 500;
        border: 1px solid #DC2626;
      ">
        <span>⚠ ${(r==null?void 0:r.message)||"Error occurred"}</span>
      </div>
    `,setTimeout(()=>{l&&g(l,"idle")},6e3))}async function D(){if(S)return;S=!0,v=!1,x=0,l&&g(l,"capturing",{count:0});const e=new Set;let o=0,r=0;console.log("[Shelf] Starting capture on:",window.location.href);try{for(;!v&&o<6;){const c=$(document);console.log(`[Shelf] Scan found ${c.length} candidate elements in DOM`);const u=[];for(const a of c){if(v)break;const d=L(a);d&&!e.has(d.tweet_id)&&(e.add(d.tweet_id),u.push(d),x++,console.log(`[Shelf] Extracted tweet ${d.tweet_id} by @${d.author_handle}`))}if(l&&g(l,"capturing",{count:x}),u.length>0){o=0,console.log(`[Shelf] Sending batch of ${u.length} bookmarks to Shelf...`);const a=await M(u);if(console.log("[Shelf] Batch ingest response:",a),a.added===0&&a.skipped>0){if(r++,r>=2){console.log("[Shelf] Caught up to previously saved bookmarks.");break}}else r=0}else o++,console.log(`[Shelf] No new tweets in this pass (round ${o}/6)`);if(v)break;window.scrollBy({top:window.innerHeight*.85,behavior:"smooth"}),await q(1200,2400)}chrome.storage.sync.set({shelf_last_sync_time:new Date().toISOString(),shelf_last_sync_count:x});let t="";x===0?t="No bookmarks detected on this page":t=`Saved ${x} bookmarks to Shelf`,l&&g(l,"done",{message:t})}catch(t){console.error("[Shelf] Sync error:",t);const c=t instanceof Error?t.message:"Sync failed";l&&g(l,"error",{message:c})}finally{S=!1,v=!1}}function T(){(window.location.href.includes("/bookmarks")||window.location.pathname.includes("/bookmarks")||window.location.pathname.includes("/i/bookmarks"))&&P()}chrome.runtime.onMessage.addListener((e,o,r)=>{e.action==="START_CAPTURE"&&(D(),r({started:!0}))});setInterval(T,1e3);let B=location.href;new MutationObserver(()=>{const e=location.href;e!==B&&(B=e,T())}).observe(document,{subtree:!0,childList:!0});T();
