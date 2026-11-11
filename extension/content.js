const d={timeline:['div[data-testid="primaryColumn"] section','main[role="main"] section','div[aria-label="Timeline: Bookmarks"]'],tweet:['article[data-testid="tweet"]','article[role="article"]'],tweetText:['div[data-testid="tweetText"]',"div[lang]"],userNameContainer:['div[data-testid="User-Name"]'],avatarImage:['div[data-testid="Tweet-User-Avatar"] img','img[src*="profile_images"]'],statusLink:['a[href*="/status/"]'],timeTag:["time"],tweetPhoto:['div[data-testid="tweetPhoto"] img'],tweetVideo:['div[data-testid="videoPlayer"] video','div[data-testid="videoComponent"] video'],cardWrapper:['div[data-testid="card.wrapper"]','div[data-testid="card.layoutLarge.media"]'],socialContext:['span[data-testid="socialContext"]']};function f(e,o){for(const r of o){const t=e.querySelector(r);if(t)return t}return null}function k(e,o){for(const r of o){const t=e.querySelectorAll(r);if(t.length>0)return Array.from(t)}return[]}function D(e){var o;try{let r="",t="";const l=f(e,d.timeTag);if(l){const a=l.closest("a");if(a){const i=a.getAttribute("href")||"",s=i.match(/\/status\/(\d+)/);s&&s[1]&&(r=s[1],t=i.startsWith("http")?i:`https://x.com${i}`)}}if(!r){const a=k(e,d.statusLink);for(const i of a){const s=i.getAttribute("href")||"",T=s.match(/\/status\/(\d+)/);if(T&&T[1]){r=T[1],t=s.startsWith("http")?s:`https://x.com${s}`;break}}}if(!r)return null;let p="",m="";const w=f(e,d.userNameContainer);if(w){const i=(w.innerText||"").split(`
`).map(s=>s.trim()).filter(Boolean);i.length>0&&(p=i[0]);for(const s of i)if(s.startsWith("@")){m=s.replace(/^@/,"");break}}let c=null;const x=f(e,d.avatarImage);x&&x.src&&(c=x.src);let b="";const v=f(e,d.tweetText);v&&(b=v.innerText||"");let _=null;const C=f(e,d.timeTag);if(C){const a=C.getAttribute("datetime");a&&(_=a)}const y=[];k(e,d.tweetPhoto).forEach(a=>{a.src&&!a.src.includes("emoji")&&!a.src.includes("profile_images")&&y.push({type:"image",url:a.src,alt_text:a.alt||void 0})}),k(e,d.tweetVideo).forEach(a=>{const i=a.currentSrc||a.src||a.poster;i&&y.push({type:"video",url:i})});const E=[];v&&v.querySelectorAll("a").forEach(i=>{const s=i.getAttribute("href");s&&(s.startsWith("http")||s.includes("t.co"))&&E.push({url:s,expanded_url:s,display_url:i.innerText||s})});let A=!1;const B=f(e,d.socialContext);return B&&((o=B.textContent)!=null&&o.toLowerCase().includes("replying to"))&&(A=!0),{tweet_id:r,tweet_url:t,author_name:p,author_handle:m,author_avatar_url:c,text:b,posted_at:_,media:y,links:E,is_thread:A}}catch(r){return console.error("Error extracting tweet element:",r),null}}let S=!1,g=!1,h=0,n=null;const I=10;function H(e=1500,o=3e3){const r=Math.floor(Math.random()*(o-e+1))+e;return new Promise(t=>setTimeout(t,r))}async function L(e){return new Promise((o,r)=>{chrome.runtime.sendMessage({type:"INGEST_BATCH",batch:e},t=>{if(chrome.runtime.lastError){r(new Error(chrome.runtime.lastError.message));return}if(!t||!t.success){r(new Error((t==null?void 0:t.error)||"Ingest failed via background worker"));return}o({added:t.added||0,skipped:t.skipped||0})})})}function N(){if(document.getElementById("shelf-floating-widget"))return;const e=document.createElement("div");e.id="shelf-floating-widget",e.style.cssText=`
    position: fixed;
    bottom: 32px;
    right: 32px;
    z-index: 2147483647;
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
    `;const t=e.querySelector("#shelf-btn-start");t==null||t.addEventListener("click",P)}else if(o==="capturing"){e.innerHTML=`
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
    `;const t=e.querySelector("#shelf-btn-stop");t==null||t.addEventListener("click",()=>{g=!0,t&&(t.textContent="Stopping...")})}else o==="done"?(e.innerHTML=`
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
    `,setTimeout(()=>{n&&u(n,"idle")},5e3))}async function P(){if(S)return;S=!0,g=!1,h=0,n&&u(n,"capturing",{count:0});const e=new Set,o=[];let r=0,t=!1;try{for(;!g&&!t&&r<5;){const p=k(document,d.tweet);let m=0;for(const w of p){if(g)break;const c=D(w);if(c&&!e.has(c.tweet_id)&&(e.add(c.tweet_id),o.push(c),m++,h++,n&&u(n,"capturing",{count:h}),o.length>=I)){const x=o.splice(0,o.length),b=await L(x);if(b.added===0&&b.skipped>=I){t=!0;break}}}if(m===0?r++:r=0,g||t)break;window.scrollBy({top:window.innerHeight*.85,behavior:"smooth"}),await H(1500,3e3)}o.length>0&&await L(o),chrome.storage.sync.set({shelf_last_sync_time:new Date().toISOString(),shelf_last_sync_count:h});const l=t?`Caught up! ${h} bookmarks saved`:`Saved ${h} bookmarks to Shelf`;n&&u(n,"done",{message:l})}catch(l){console.error("Shelf sync error:",l);const p=l instanceof Error?l.message:"Sync failed";n&&u(n,"error",{message:p})}finally{S=!1,g=!1}}function F(){(window.location.href.includes("/bookmarks")||window.location.pathname.includes("/bookmarks")||window.location.pathname.includes("/i/bookmarks"))&&N()}chrome.runtime.onMessage.addListener((e,o,r)=>{e.action==="START_CAPTURE"&&(P(),r({started:!0}))});setInterval(F,1200);let M=location.href;new MutationObserver(()=>{const e=location.href;e!==M&&(M=e,F())}).observe(document,{subtree:!0,childList:!0});F();
