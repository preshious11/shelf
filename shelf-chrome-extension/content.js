const w={timeline:['div[data-testid="primaryColumn"] section','main[role="main"] section','div[aria-label="Timeline: Bookmarks"]',"section"],tweet:['article[data-testid="tweet"]','article[role="article"]','div[data-testid="cellInnerDiv"] article','div[data-testid="cellInnerDiv"]','div[data-testid="tweet"]',"article"],tweetText:['div[data-testid="tweetText"]',"div[lang]","span[lang]"],userNameContainer:['div[data-testid="User-Name"]'],avatarImage:['div[data-testid="Tweet-User-Avatar"] img','img[src*="profile_images"]'],statusLink:['a[href*="/status/"]'],timeTag:["time"],tweetPhoto:['div[data-testid="tweetPhoto"] img','img[src*="media"]','img[src*="tweet_video_thumb"]'],tweetVideo:['div[data-testid="videoPlayer"] video','div[data-testid="videoComponent"] video',"video"],cardWrapper:['div[data-testid="card.wrapper"]','div[data-testid="card.layoutLarge.media"]'],socialContext:['span[data-testid="socialContext"]']};function v(e,t){for(const o of t){const r=e.querySelector(o);if(r)return r}return null}function A(e,t){for(const o of t){const r=e.querySelectorAll(o);if(r.length>0)return Array.from(r)}return[]}function R(e){var t;try{let o="",r="";const n=v(e,w.timeTag);if(n){const d=n.closest("a");if(d){const h=d.getAttribute("href")||"",l=h.match(/\/status\/(\d+)/);l&&l[1]&&(o=l[1],r=h.startsWith("http")?h:`https://x.com${h}`)}}if(!o){const d=A(e,w.statusLink);for(const h of d){const l=h.getAttribute("href")||"",C=l.match(/\/status\/(\d+)/);if(C&&C[1]){o=C[1],r=l.startsWith("http")?l:`https://x.com${l}`;break}}}if(!o)return null;let s="",i="";const p=v(e,w.userNameContainer);if(p){const h=(p.innerText||"").split(`
`).map(l=>l.trim()).filter(Boolean);h.length>0&&(s=h[0]);for(const l of h)if(l.startsWith("@")){i=l.replace(/^@/,"");break}}let x=null;const g=v(e,w.avatarImage);g&&g.src&&(x=g.src);let u="";const y=v(e,w.tweetText);y&&(u=y.innerText||"");let c=null;const m=v(e,w.timeTag);if(m){const d=m.getAttribute("datetime");d&&(c=d)}const a=[];A(e,w.tweetPhoto).forEach(d=>{d.src&&!d.src.includes("emoji")&&!d.src.includes("profile_images")&&a.push({type:"image",url:d.src,alt_text:d.alt||void 0})}),A(e,w.tweetVideo).forEach(d=>{const h=d.currentSrc||d.src||d.poster;h&&a.push({type:"video",url:h})});const D=[];y&&y.querySelectorAll("a").forEach(h=>{const l=h.getAttribute("href");l&&(l.startsWith("http")||l.includes("t.co"))&&D.push({url:l,expanded_url:l,display_url:h.innerText||l})});let q=!1;const H=v(e,w.socialContext);return H&&((t=H.textContent)!=null&&t.toLowerCase().includes("replying to"))&&(q=!0),{tweet_id:o,tweet_url:r,author_name:s,author_handle:i,author_avatar_url:x,text:u,posted_at:c,media:a,links:D,is_thread:q}}catch(o){return console.error("Error extracting tweet element:",o),null}}let E=!1,T=!1,k=0,S=0,f=null;function I(e=1200,t=2200){const o=Math.floor(Math.random()*(t-e+1))+e;return new Promise(r=>setTimeout(r,o))}function F(){const e=window.location.href.toLowerCase(),t=window.location.pathname.toLowerCase();return e.includes("bookmark")||e.includes("history")||t.startsWith("/i/bookmarks")||t.startsWith("/i/history")||t.includes("/bookmarks")||t.includes("/history")}async function $(){return new Promise(e=>{chrome.runtime.sendMessage({type:"GET_KNOWN_IDS"},t=>{if(chrome.runtime.lastError){e({success:!1,ids:new Set,error:chrome.runtime.lastError.message});return}if(!t||!t.success){e({success:!1,ids:new Set,error:(t==null?void 0:t.error)||"Failed to connect to Shelf web app"});return}const o=new Set((t.knownIds||[]).map(r=>String(r)));e({success:!0,ids:o})})})}async function z(e){return new Promise((t,o)=>{chrome.runtime.sendMessage({type:"INGEST_BATCH",batch:e},r=>{if(chrome.runtime.lastError){o(new Error(chrome.runtime.lastError.message));return}if(!r||!r.success){o(new Error((r==null?void 0:r.error)||"Ingest failed via background worker"));return}t({added:r.added||0,skipped:r.skipped||0})})})}function _(e){const t=Array.from(e.querySelectorAll('article[data-testid="tweet"], article[role="article"]'));if(t.length>0)return t;const o=Array.from(e.querySelectorAll('div[data-testid="cellInnerDiv"]')).filter(s=>s.querySelector('a[href*="/status/"]')||s.querySelector("time")||s.querySelector('[data-testid="tweetText"]'));if(o.length>0)return o;const r=Array.from(e.querySelectorAll('a[href*="/status/"]')),n=new Set;for(const s of r){if(!(s.getAttribute("href")||"").match(/\/status\/\d+/))continue;const p=s.closest("article")||s.closest('div[data-testid="cellInnerDiv"]')||s.closest('div[role="article"]')||s.closest("section > div > div > div");p&&n.add(p)}return Array.from(n)}function N(){return!!(document.querySelector('div[role="progressbar"]')||document.querySelector('[aria-label="Loading…"]')||document.querySelector('[aria-label="Loading"]')||document.querySelector('svg[aria-label="Loading"]'))}function O(){const e=Array.from(document.querySelectorAll('button, div[role="button"]'));for(const t of e){const o=(t.textContent||"").trim().toLowerCase();if(o==="retry"||o==="try again")return console.log("[Shelf] Twitter retry button detected, clicking..."),t.click(),!0}return!1}function W(){O(),window.dispatchEvent(new Event("scroll")),window.dispatchEvent(new WheelEvent("wheel",{deltaY:350,bubbles:!0}));const e=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight);(window.scrollY||window.pageYOffset)+window.innerHeight>=e-350?(window.scrollBy({top:-450,behavior:"auto"}),setTimeout(()=>{window.scrollTo({top:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),behavior:"smooth"}),window.dispatchEvent(new Event("scroll"))},180)):window.scrollBy({top:window.innerHeight*.9,behavior:"smooth"});const r=[document.querySelector("main"),document.querySelector('div[data-testid="primaryColumn"]'),document.querySelector('section[role="region"]')];for(const n of r)n&&n.scrollHeight>n.clientHeight&&n.clientHeight>0&&(n.scrollTop+n.clientHeight>=n.scrollHeight-250?(n.scrollBy({top:-350,behavior:"auto"}),setTimeout(()=>{n.scrollTop=n.scrollHeight},150)):n.scrollBy({top:window.innerHeight*.9,behavior:"smooth"}))}function U(){if(!document.body)return;const e=document.getElementById("shelf-floating-widget");if(e&&document.body.contains(e))return;e&&e.remove();const t=document.createElement("div");t.id="shelf-floating-widget",t.style.cssText=`
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
  `,b(t,"idle"),document.body.appendChild(t),f=t,console.log("[Shelf] Floating widget anchored to document.body")}function b(e,t,o){if(t==="idle"){const n=F()?"Sync bookmarks & history":"Sync visible posts";e.innerHTML=`
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
    `;const s=e.querySelector("#shelf-btn-start");s==null||s.addEventListener("click",i=>{i.preventDefault(),i.stopPropagation(),L()})}else if(t==="capturing"){const r=(o==null?void 0:o.newCount)||0,n=(o==null?void 0:o.existingCount)||0;e.innerHTML=`
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
          <span>Saving: <strong>${r} new</strong></span>
          ${n>0?`<span style="font-size: 10px; color: #A1A1AA;">${n} already in Shelf</span>`:'<span style="font-size: 10px; color: #38BDF8;">Scanning timeline...</span>'}
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
    `;const s=e.querySelector("#shelf-btn-stop");s==null||s.addEventListener("click",i=>{i.preventDefault(),i.stopPropagation(),T=!0,s&&(s.textContent="Stopping...")})}else t==="done"?(e.innerHTML=`
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
    `,setTimeout(()=>{f&&b(f,"idle")},4500)):t==="error"&&(e.innerHTML=`
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
    `,setTimeout(()=>{f&&b(f,"idle")},6e3))}async function L(){if(E)return;E=!0,T=!1,k=0,S=0,f&&b(f,"capturing",{newCount:0,existingCount:0}),console.log("[Shelf] Fetching known bookmark IDs from Shelf library...");const e=await $();if(!e.success&&e.error){console.error("[Shelf] Pre-flight connection failed:",e.error);let i=e.error;i.includes("API Token not configured")?i="API Token missing. Click extension icon > Options.":i.includes("401")||i.includes("Invalid or revoked")?i="Invalid API Token. Update in Extension Options.":i.includes("Database error")||i.includes("SERVICE_ROLE_KEY")?i="Server config error. Check Vercel environment keys.":i.length>50&&(i=i.slice(0,47)+"..."),f&&b(f,"error",{message:i}),E=!1;return}const t=e.ids;console.log(`[Shelf] Library currently contains ${t.size} bookmarks.`);const o=new Set;let r=0;const n=35;let s=document.documentElement.scrollHeight;try{let i=_(document);for(i.length===0&&(console.log("[Shelf] Waiting for initial tweets to mount in DOM..."),await I(800,1200),i=_(document));!T&&r<n;){if(N()){console.log("[Shelf] Twitter is fetching more tweets from network, waiting..."),r=Math.max(0,r-1),await I(1200,2e3);continue}const x=document.documentElement.scrollHeight;x>s&&(s=x,r=0);const g=_(document),u=[];let y=0;for(const c of g){if(T)break;const m=R(c);if(m){if(t.has(m.tweet_id)){o.has(m.tweet_id)||(o.add(m.tweet_id),S++,y++,console.log(`[Shelf] Tweet ${m.tweet_id} already in Shelf. Skipping.`));continue}o.has(m.tweet_id)||(o.add(m.tweet_id),u.push(m),y++,console.log(`[Shelf] Found new bookmark: ${m.tweet_id} by @${m.author_handle}`))}}if(f&&b(f,"capturing",{newCount:k+u.length,existingCount:S}),u.length>0){r=0,console.log(`[Shelf] Transmitting ${u.length} new bookmarks to Shelf...`);try{const c=await z(u);console.log("[Shelf] Ingest response:",c);const m=typeof c.added=="number"?c.added:u.length;k+=m,u.forEach(a=>t.add(a.tweet_id))}catch(c){console.error("[Shelf] Send error:",c);let a=c instanceof Error?c.message:"Ingest failed";a.includes("401")||a.includes("Unauthorized")||a.includes("token")?a="Auth failed (401). Check API token in Options.":a.includes("Database error")||a.includes("SERVICE_ROLE_KEY")?a="Server DB error. Check Vercel environment keys.":a.length>50&&(a=a.slice(0,47)+"..."),f&&b(f,"error",{message:a});break}}else y>0?r=0:(r++,console.log(`[Shelf] Advancing timeline (idle pass ${r}/${n})...`));if(T)break;W(),await I(1200,2e3)}chrome.storage.sync.set({shelf_last_sync_time:new Date().toISOString(),shelf_last_sync_count:k});let p="";k>0?p=`Saved ${k} new bookmarks! (${S} already in Shelf)`:S>0?p=`All ${S} bookmarks are already in Shelf!`:p=F()?"No bookmarks detected in this view":"No posts found on this page",f&&b(f,"done",{message:p})}catch(i){console.error("[Shelf] Sync error:",i);const p=i instanceof Error?i.message:"Sync failed";f&&b(f,"error",{message:p})}finally{E=!1,T=!1}}function B(){if(!document.body)return;const e=document.getElementById("shelf-floating-widget");if(!(e&&document.body.contains(e)))U();else if(e&&!E){const o=F(),r=e.querySelector("#shelf-btn-sub"),n=o?"Sync bookmarks & history":"Sync visible posts";r&&r.textContent!==n&&(r.textContent=n)}}function V(){try{sessionStorage.getItem("shelf_auto_sync")==="1"&&(sessionStorage.removeItem("shelf_auto_sync"),console.log("[Shelf] Auto-sync scheduled from previous navigation/refresh"),setTimeout(()=>{E||L()},1600))}catch{}}function Y(e){const t=document.createElement("div");t.style.cssText=`
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
  `,t.textContent="✕ Removed from Shelf library",document.body.appendChild(t),setTimeout(()=>{t.style.opacity="0",setTimeout(()=>t.remove(),400)},3e3)}let M="";document.addEventListener("click",e=>{var i,p,x;const t=e.target;if(!t)return;const o=t.closest('article, [data-testid="tweet"]');if(o){const u=((i=o.querySelector("time"))==null?void 0:i.closest("a"))||o.querySelector('a[href*="/status/"]'),c=((u==null?void 0:u.getAttribute("href"))||"").match(/\/status\/(\d+)/);c&&(M=c[1])}const r=t.closest('[data-testid="removeBookmark"], [aria-label*="Remove"][aria-label*="ookmark"], [aria-label*="remove"][aria-label*="ookmark"], [data-testid="bookmark"][aria-label*="Remove"], [data-testid="bookmark"][aria-label*="remove"]'),n=t.closest('[role="menuitem"], [data-testid="Dropdown"]'),s=n&&/remove.*bookmark|delete.*bookmark/i.test(n.textContent||"");if(r||s){let g="";const u=(p=r||n)==null?void 0:p.closest('article, [data-testid="tweet"], [data-testid="cellInnerDiv"], div[role="article"]');if(u){const c=((x=u.querySelector("time"))==null?void 0:x.closest("a"))||u.querySelector('a[href*="/status/"]'),a=((c==null?void 0:c.getAttribute("href"))||"").match(/\/status\/(\d+)/);a&&(g=a[1])}g||(g=M),g&&(console.log("[Shelf] Un-bookmark action detected on X for tweet:",g),chrome.runtime.sendMessage({type:"DELETE_BOOKMARK",tweetId:g},y=>{y&&y.success&&(console.log("[Shelf] Bookmark auto-removed from Shelf library:",g),Y())}))}},!0);chrome.runtime.onMessage.addListener((e,t,o)=>{e.action==="START_CAPTURE"&&(L(),o({started:!0}))});setInterval(B,600);let P=location.href;new MutationObserver(()=>{const e=location.href;e!==P&&(P=e,B())}).observe(document,{subtree:!0,childList:!0});B();V();
