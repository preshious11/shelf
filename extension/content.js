const l={timeline:['div[data-testid="primaryColumn"] section','main[role="main"] section','div[aria-label="Timeline: Bookmarks"]'],tweet:['article[data-testid="tweet"]','article[role="article"]'],tweetText:['div[data-testid="tweetText"]',"div[lang]"],userNameContainer:['div[data-testid="User-Name"]'],avatarImage:['div[data-testid="Tweet-User-Avatar"] img','img[src*="profile_images"]'],statusLink:['a[href*="/status/"]'],timeTag:["time"],tweetPhoto:['div[data-testid="tweetPhoto"] img'],tweetVideo:['div[data-testid="videoPlayer"] video','div[data-testid="videoComponent"] video'],cardWrapper:['div[data-testid="card.wrapper"]','div[data-testid="card.layoutLarge.media"]'],socialContext:['span[data-testid="socialContext"]']};function x(e,o){for(const r of o){const t=e.querySelector(r);if(t)return t}return null}function v(e,o){for(const r of o){const t=e.querySelectorAll(r);if(t.length>0)return Array.from(t)}return[]}function L(e){var o;try{const r=v(e,l.statusLink);let t="",d="";for(const s of r){const i=s.getAttribute("href")||"",a=i.match(/\/status\/(\d+)/);if(a&&a[1]){t=a[1],d=i.startsWith("http")?i:`https://x.com${i}`;break}}if(!t)return null;let p="",g="";const b=x(e,l.userNameContainer);if(b){const i=(b.innerText||"").split(`
`).map(a=>a.trim()).filter(Boolean);i.length>0&&(p=i[0]);for(const a of i)if(a.startsWith("@")){g=a.replace(/^@/,"");break}}let c=null;const m=x(e,l.avatarImage);m&&m.src&&(c=m.src);let y="";const w=x(e,l.tweetText);w&&(y=w.innerText||"");let T=null;const F=x(e,l.timeTag);if(F){const s=F.getAttribute("datetime");s&&(T=s)}const k=[];v(e,l.tweetPhoto).forEach(s=>{s.src&&!s.src.includes("emoji")&&!s.src.includes("profile_images")&&k.push({type:"image",url:s.src,alt_text:s.alt||void 0})}),v(e,l.tweetVideo).forEach(s=>{const i=s.currentSrc||s.src||s.poster;i&&k.push({type:"video",url:i})});const _=[];w&&w.querySelectorAll("a").forEach(i=>{const a=i.getAttribute("href");a&&(a.startsWith("http")||a.includes("t.co"))&&_.push({url:a,expanded_url:a,display_url:i.innerText||a})});let C=!1;const E=x(e,l.socialContext);return E&&((o=E.textContent)!=null&&o.toLowerCase().includes("replying to"))&&(C=!0),{tweet_id:t,tweet_url:d,author_name:p,author_handle:g,author_avatar_url:c,text:y,posted_at:T,media:k,links:_,is_thread:C}}catch(r){return console.error("Error extracting tweet element:",r),null}}let S=!1,h=!1,f=0,n=null;const M=25;function D(e=1500,o=3e3){const r=Math.floor(Math.random()*(o-e+1))+e;return new Promise(t=>setTimeout(t,r))}async function B(e){return new Promise((o,r)=>{chrome.runtime.sendMessage({type:"INGEST_BATCH",batch:e},t=>{if(chrome.runtime.lastError){r(new Error(chrome.runtime.lastError.message));return}if(!t||!t.success){r(new Error((t==null?void 0:t.error)||"Ingest failed via background worker"));return}o({added:t.added||0,skipped:t.skipped||0})})})}function P(){if(document.getElementById("shelf-floating-widget"))return;const e=document.createElement("div");e.id="shelf-floating-widget",e.style.cssText=`
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    user-select: none;
  `,u(e,"idle"),document.body.appendChild(e),n=e}function u(e,o,r){if(o==="idle"){e.innerHTML=`
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        background: #18181B;
        color: #F4F4F5;
        padding: 8px 14px;
        border-radius: 9999px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        border: 1px solid #27272A;
        transition: transform 0.15s ease, background 0.15s ease;
      " id="shelf-btn-start">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>Save to Shelf</span>
      </div>
    `;const t=e.querySelector("#shelf-btn-start");t==null||t.addEventListener("click",H)}else if(o==="capturing"){e.innerHTML=`
      <div style="
        display: flex;
        align-items: center;
        gap: 12px;
        background: #18181B;
        color: #F4F4F5;
        padding: 8px 14px;
        border-radius: 9999px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
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
        "></div>
        <span>Saving to Shelf: <strong>${(r==null?void 0:r.count)||0}</strong></span>
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
    `;const t=e.querySelector("#shelf-btn-stop");t==null||t.addEventListener("click",()=>{h=!0,t&&(t.textContent="Stopping...")})}else o==="done"?(e.innerHTML=`
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        background: #064E3B;
        color: #ECFDF5;
        padding: 8px 14px;
        border-radius: 9999px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-size: 13px;
        font-weight: 500;
        border: 1px solid #059669;
      ">
        <span>✓ ${(r==null?void 0:r.message)||"Sync completed"}</span>
      </div>
    `,setTimeout(()=>{n&&u(n,"idle")},4e3)):o==="error"&&(e.innerHTML=`
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        background: #7F1D1D;
        color: #FEF2F2;
        padding: 8px 14px;
        border-radius: 9999px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-size: 12px;
        font-weight: 500;
        border: 1px solid #DC2626;
      ">
        <span>⚠ ${(r==null?void 0:r.message)||"Error occurred"}</span>
      </div>
    `,setTimeout(()=>{n&&u(n,"idle")},5e3))}async function H(){if(S)return;S=!0,h=!1,f=0,n&&u(n,"capturing",{count:0});const e=new Set,o=[];let r=0,t=!1;try{for(;!h&&!t&&r<5;){const p=v(document,l.tweet);let g=0;for(const b of p){if(h)break;const c=L(b);if(c&&!e.has(c.tweet_id)&&(e.add(c.tweet_id),o.push(c),g++,f++,n&&u(n,"capturing",{count:f}),o.length>=M)){const m=o.splice(0,o.length);if((await B(m)).skipped>0){t=!0;break}}}if(g===0?r++:r=0,h||t)break;window.scrollBy({top:window.innerHeight*.85,behavior:"smooth"}),await D(1500,3e3)}o.length>0&&await B(o),chrome.storage.sync.set({shelf_last_sync_time:new Date().toISOString(),shelf_last_sync_count:f});const d=t?`Caught up! ${f} bookmarks saved`:`Saved ${f} bookmarks to Shelf`;n&&u(n,"done",{message:d})}catch(d){console.error("Shelf sync error:",d);const p=d instanceof Error?d.message:"Sync failed";n&&u(n,"error",{message:p})}finally{S=!1,h=!1}}function I(){(window.location.pathname.includes("/bookmarks")||window.location.pathname.includes("/i/bookmarks"))&&P()}let A=location.href;new MutationObserver(()=>{const e=location.href;e!==A&&(A=e,I())}).observe(document,{subtree:!0,childList:!0});I();
