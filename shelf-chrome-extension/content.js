function Fe(r){var c,g,i,l,f,_,m,A,F,X,T,W,V,v,y,B,R,P,D,q,O,J,z,Z,le,ce,ue,de,fe,he,ge,me,pe,ye,we,be,ke,xe,_e,ve;const e=[];let t=null,o=null;if(!r||typeof r!="object")return{tweets:e,bottomCursor:t};let s=[];const n=((g=(c=r==null?void 0:r.data)==null?void 0:c.bookmark_timeline_v2)==null?void 0:g.timeline)||((l=(i=r==null?void 0:r.data)==null?void 0:i.bookmark_timeline)==null?void 0:l.timeline)||((A=(m=(_=(f=r==null?void 0:r.data)==null?void 0:f.user)==null?void 0:_.result)==null?void 0:m.timeline)==null?void 0:A.timeline)||((X=(F=r==null?void 0:r.data)==null?void 0:F.timeline)==null?void 0:X.timeline);Array.isArray(n==null?void 0:n.instructions)?s=n.instructions:Array.isArray((T=r==null?void 0:r.data)==null?void 0:T.instructions)?s=r.data.instructions:Array.isArray(r==null?void 0:r.instructions)&&(s=r.instructions);for(const S of s){if(!S||typeof S!="object")continue;(S.direction==="Bottom"||S.cursorType==="Bottom"||S.entryType==="TimelineTimelineCursor")&&S.value&&(t=S.value);let Q=[];Array.isArray(S.entries)?Q=S.entries:S.entry&&typeof S.entry=="object"&&(Q=[S.entry]);for(const I of Q){if(!I||typeof I!="object")continue;const Se=String(I.entryId||""),G=((W=I.content)==null?void 0:W.cursorType)||((v=(V=I.content)==null?void 0:V.cursorContent)==null?void 0:v.cursorType),K=((y=I.content)==null?void 0:y.value)||((R=(B=I.content)==null?void 0:B.cursorContent)==null?void 0:R.value);if(Se.startsWith("cursor-bottom")||G==="Bottom"||G==="bottom"){K&&(t=K);continue}if(Se.startsWith("cursor-top")||G==="Top"||G==="top"){K&&(o=K);continue}const Y=(P=I.content)==null?void 0:P.itemContent,M=(D=Y==null?void 0:Y.tweet_results)==null?void 0:D.result;if(!M)continue;let h=M;(M.__typename==="TweetWithVisibilityResults"||M.__typename==="TweetWithVisibility")&&M.tweet&&(h=M.tweet);const Ee=String(h.__typename||"");if(Ee==="TweetTombstone"||Ee==="TweetUnavailable"||!h.legacy)continue;const j=String(h.rest_id||h.id_str||((q=h.legacy)==null?void 0:q.id_str)||"").trim();if(!j)continue;const b=((J=(O=h.core)==null?void 0:O.user_results)==null?void 0:J.result)||((Z=(z=h.core)==null?void 0:z.user_result)==null?void 0:Z.result),ee=(b==null?void 0:b.legacy)||{},Te=(b==null?void 0:b.core)||{},Re=String(ee.name||Te.name||(b==null?void 0:b.name)||"Unknown").trim(),te=String(ee.screen_name||Te.screen_name||(b==null?void 0:b.screen_name)||"").replace(/^@/,"").trim(),qe=ee.profile_image_url_https||(b==null?void 0:b.avatar_image_url)||void 0,Oe=(ue=(ce=(le=h.note_tweet)==null?void 0:le.note_tweet_results)==null?void 0:ce.result)==null?void 0:ue.text,ze=String(Oe||((de=h.legacy)==null?void 0:de.full_text)||((fe=h.legacy)==null?void 0:fe.text)||"").trim();let re;if((he=h.legacy)!=null&&he.created_at)try{const d=new Date(h.legacy.created_at);re=isNaN(d.getTime())?h.legacy.created_at:d.toISOString()}catch{re=h.legacy.created_at}const oe=[],Ce=((me=(ge=h.legacy)==null?void 0:ge.extended_entities)==null?void 0:me.media)||((ye=(pe=h.legacy)==null?void 0:pe.entities)==null?void 0:ye.media)||[];if(Array.isArray(Ce)){for(const d of Ce)if(d){if(d.type==="photo"){const se=d.media_url_https||d.media_url;se&&oe.push({type:"image",url:se,alt_text:d.ext_alt_text||void 0})}else if(d.type==="video"||d.type==="animated_gif"){const Ie=((be=(Array.isArray((we=d.video_info)==null?void 0:we.variants)?d.video_info.variants:[]).filter(U=>U&&U.content_type==="video/mp4"&&U.url).sort((U,We)=>(We.bitrate||0)-(U.bitrate||0))[0])==null?void 0:be.url)||d.media_url_https||d.media_url;Ie&&oe.push({type:"video",url:Ie,alt_text:d.ext_alt_text||void 0})}}}const Ae=[],$e=((xe=(ke=h.legacy)==null?void 0:ke.entities)==null?void 0:xe.urls)||[];if(Array.isArray($e))for(const d of $e)d&&d.url&&Ae.push({url:d.url,expanded_url:d.expanded_url||d.url,display_url:d.display_url||d.url});const Ue=!!((_e=h.legacy)!=null&&_e.in_reply_to_status_id_str||(ve=h.legacy)!=null&&ve.in_reply_to_user_id_str),He=te?`https://x.com/${te}/status/${j}`:`https://x.com/i/web/status/${j}`;e.push({tweet_id:j,tweet_url:He,author_name:Re,author_handle:te,author_avatar_url:qe,text:ze,posted_at:re,media:oe,links:Ae,is_thread:Ue})}}return{tweets:e,bottomCursor:t,topCursor:o}}let x=!1,u=!1,w=0,C=0,$=new Set,N=new Set,p=[],a=null,ne=null,L=null,Ge=0;window.addEventListener("message",r=>{var e;if(((e=r.data)==null?void 0:e.type)==="SHELF_BOOKMARKS_INTERCEPTED"){const{url:t,method:o,headers:s,body:n,response:c}=r.data;t&&c&&(ne={url:t,method:o||"GET",headers:s||{},body:n,response:c,timestamp:Date.now()},L&&(L(ne),L=null),console.log("[shelf] Captured X Bookmarks API request & response."))}});function Ke(r){return new Promise(e=>{const t=`shelf_req_${Date.now()}_${++Ge}`;let o=!1;const s=n=>{var c,g;((c=n.data)==null?void 0:c.type)==="SHELF_NEXT_PAGE_RESPONSE"&&((g=n.data)==null?void 0:g.requestId)===t&&(window.removeEventListener("message",s),o=!0,e(n.data))};window.addEventListener("message",s),setTimeout(()=>{o||(window.removeEventListener("message",s),e({success:!1,error:"Timeout waiting for next bookmarks page from page context"}))},45e3),window.postMessage({type:"SHELF_FETCH_NEXT_BOOKMARKS_PAGE",requestId:t,...r},"*")})}function je(r,e){if((r.method||"GET").toUpperCase()==="GET")try{const o=new URL(r.url,window.location.origin),s=o.searchParams.get("variables");if(s){const n=JSON.parse(s);n.cursor=e,n.count=20,o.searchParams.set("variables",JSON.stringify(n))}else o.searchParams.set("cursor",e);return{url:o.toString()}}catch{return{url:`${r.url}&cursor=${encodeURIComponent(e)}`}}else{let o=r.body;try{if(r.body){const s=JSON.parse(r.body);s.variables?(s.variables.cursor=e,s.variables.count=20):s.cursor=e,o=JSON.stringify(s)}}catch{}return{url:r.url,body:o}}}async function Xe(){return new Promise(r=>{try{chrome.storage.local.get(["shelf_saved_tweet_ids"],e=>{if(chrome.runtime.lastError){console.warn("[shelf] Error reading storage.local:",chrome.runtime.lastError.message),r(new Set);return}const t=e==null?void 0:e.shelf_saved_tweet_ids;Array.isArray(t)?r(new Set(t.map(o=>String(o)))):r(new Set)})}catch(e){console.error("[shelf] Exception loading saved IDs:",e),r(new Set)}})}async function ie(r){return new Promise(e=>{try{chrome.storage.local.set({shelf_saved_tweet_ids:Array.from(r)},()=>{e()})}catch(t){console.error("[shelf] Exception persisting saved IDs:",t),e()}})}function E(r,e,t){try{const o={type:"SYNC_PROGRESS",isCapturing:x,savedCount:w,alreadySavedCount:C,unsavedCount:t||(r==="done"?p.length:0),status:r,statusText:e||(x?`Syncing… ${w} saved`:"Done"),isDone:r==="done"};chrome.storage.local.set({shelf_sync_state:o}),chrome.runtime.sendMessage(o).catch(()=>{})}catch(o){console.warn("[shelf] Error broadcasting sync progress:",o)}}function Me(){const r=window.location.href.toLowerCase(),e=window.location.pathname.toLowerCase();return r.includes("bookmark")||r.includes("history")||e.startsWith("/i/bookmarks")||e.startsWith("/i/history")||e.includes("/bookmarks")||e.includes("/history")}async function Ve(){return new Promise(r=>{chrome.runtime.sendMessage({type:"GET_KNOWN_IDS"},e=>{if(chrome.runtime.lastError){r({success:!1,isAuthError:!1,ids:new Set,error:chrome.runtime.lastError.message});return}if(!e||!e.success){const o=!!(e!=null&&e.isAuthError||(e==null?void 0:e.status)===401||e!=null&&e.error&&(e.error.includes("Not connected to Shelf")||e.error.includes("401")||e.error.includes("API Token not configured")));r({success:!1,isAuthError:o,status:(e==null?void 0:e.status)||(o?401:500),ids:new Set,error:(e==null?void 0:e.error)||"Failed to connect to Shelf web app"});return}const t=new Set((e.knownIds||[]).map(o=>String(o)));r({success:!0,isAuthError:!1,ids:t})})})}async function Je(r){return new Promise(e=>{chrome.runtime.sendMessage({type:"INGEST_BATCH",batch:r},t=>{if(chrome.runtime.lastError){e({success:!1,isAuthError:!1,error:chrome.runtime.lastError.message});return}if(!t||!t.success){const o=!!(t!=null&&t.isAuthError||(t==null?void 0:t.status)===401||t!=null&&t.error&&(t.error.includes("Not connected to Shelf")||t.error.includes("401")||t.error.includes("API Token not configured")));e({success:!1,isAuthError:o,status:(t==null?void 0:t.status)||(o?401:500),error:(t==null?void 0:t.error)||"Ingest failed via background worker"});return}e({success:!0,isAuthError:!1,added:t.added||0,skipped:t.skipped||0})})})}async function H(r,e=100){const t=Date.now();for(;Date.now()-t<r;){if(u)return!1;const o=r-(Date.now()-t);await new Promise(s=>setTimeout(s,Math.min(e,o)))}return!u}async function Ze(r,e=5){let t=0,o=1e3;for(;t<e;){if(u)return{success:!1};t++,console.log(`[shelf] Ingesting batch of ${r.length} tweets (attempt ${t}/${e})...`);const s=await Je(r);if(s.success)return console.log("[shelf] Ingest response:",s),{success:!0};if(s.isAuthError)return console.error("[shelf] Auth error (401) on batch ingest. Aborting immediately without retry."),{success:!1,isAuthError:!0,error:s.error};if(u)return{success:!1};if(console.error(`[shelf] Batch attempt ${t}/${e} failed (server/network):`,s.error),t>=e)return console.error("[shelf] Batch failed all 5 attempts. Keeping in queue for next round."),{success:!1,error:s.error};const n=Math.floor(Math.random()*500),c=o+n;if(console.log(`[shelf] Retrying batch in ${c}ms...`),!await H(c)||u)return console.log("[shelf] Batch backoff cancelled due to stop request."),{success:!1};o*=2}return{success:!1}}async function Be(r=!1){for(;(p.length>=20||r&&p.length>0)&&!u;){const t=Math.min(20,p.length),o=p.slice(0,t),s=await Ze(o,5);if(s.isAuthError){console.error("[shelf] Auth error (401) mid-sync. Halting queue processing immediately.");const n="Not connected to Shelf. Please reconnect your API token";return u=!0,a&&k(a,"error",{message:n}),E("error",n),{authError:!0}}if(s.success)p.splice(0,t),o.forEach(n=>$.add(n.tweet_id)),w+=t,await ie($),E("capturing"),a&&k(a,"capturing",{newCount:w,existingCount:C});else{console.warn(`[shelf] ${p.length} tweets remain queued for next round.`);break}}return{authError:!1}}function Ne(){x&&(console.log("[shelf] Stop requested by user"),u=!0,E("idle","Stopping sync..."),a&&k(a,"capturing",{newCount:w,existingCount:C,statusText:"Stopping..."}))}async function Le(){if(x){console.log("[shelf] Sync is already in progress. Ignoring duplicate start request.");return}x=!0,u=!1,w=0,C=0,p=[],N=new Set,a&&k(a,"capturing",{newCount:0,existingCount:0}),E("capturing","Syncing… 0 saved"),console.log("[shelf] Starting network-based bookmark sync...");const r=await Xe();console.log(`[shelf] Loaded ${r.size} saved IDs from local storage cache.`);const e=await Ve();if(e.isAuthError){console.error("[shelf] Auth failure connecting to Shelf (401). Aborting sync.");const i="Not connected to Shelf. Please reconnect your API token";a&&k(a,"error",{message:i}),E("error",i),x=!1,u=!1;return}e.success&&e.ids?($=new Set(e.ids),await ie($),console.log(`[shelf] Synchronized with Shelf server: ${$.size} active saved IDs.`)):(console.warn("[shelf] Could not reach Shelf server to fetch known IDs ("+(e.error||"network error")+"). Using local storage cache."),$=new Set(r));let t=ne;if(t||(console.log("[shelf] Waiting up to 10s to capture X Bookmarks API request..."),a&&k(a,"capturing",{newCount:0,existingCount:0,statusText:"Connecting to X API..."}),E("capturing","Connecting to X API..."),t=await new Promise(i=>{let l=null;const f=_=>{l!==null&&clearTimeout(l),i(_)};L=f,l=window.setTimeout(()=>{L===f&&(L=null),i(null)},1e4)})),!t){console.warn("[shelf] No Bookmarks API request captured within 10s.");const i="Reload the bookmarks page and try again";a&&k(a,"error",{message:i}),E("error",i),x=!1,u=!1;return}let o=null;try{const i=await new Promise(l=>{chrome.storage.local.get(["shelf_last_cursor"],f=>l(f||{}))});i!=null&&i.shelf_last_cursor&&(o=i.shelf_last_cursor,console.log("[shelf] Resuming sync from saved cursor:",o))}catch(i){console.warn("[shelf] Error checking stored cursor:",i)}let s=1,n=o,c=null,g=!o;try{for(;!u;){let m=null;try{if(g)g=!1,m=Fe(t.response);else{if(!n){console.log("[shelf] No more cursor available. Reached the end of bookmarks timeline.");break}const v=je(t,n),y=await Ke({url:v.url,method:t.method,headers:t.headers,body:v.body});if(u)break;if(y.status===429){const B=y.rateLimitReset,R=Math.floor(Date.now()/1e3);let P=B&&B>R?B-R:60;P>900&&(P=900),console.warn(`[shelf] HTTP 429 Rate limited. Waiting ${P}s until reset (${B})...`),n&&await chrome.storage.local.set({shelf_last_cursor:n});for(let D=P;D>0&&!u;D--){const q=Math.floor(D/60),O=D%60,z=`Rate limited by X. Resuming in ${q>0?`${q}m ${O}s`:`${O}s`}...`;if(a&&k(a,"capturing",{newCount:w+p.length,existingCount:C,statusText:z}),E("rate_limited",z),!await H(1e3)||u)break}if(u)break;continue}if(!y.success||!y.response){console.error("[shelf] Failed to fetch next bookmarks page:",y.error||y.status),await H(2e3);break}m=Fe(y.response)}if(!m){console.warn("[shelf] Empty page result returned.");break}const A=m.tweets;let F=0;for(const v of A){if(u)break;try{if(!v||!v.tweet_id)continue;const y=!N.has(v.tweet_id);y&&N.add(v.tweet_id),$.has(v.tweet_id)?y&&C++:y&&(p.push(v),F++)}catch(y){console.error("[shelf] Error processing parsed tweet:",y)}}if((await Be(!1)).authError){console.error("[shelf] Sync stopped due to auth error (401)."),x=!1,u=!1;return}const T=m.bottomCursor;if(console.log(`[shelf] Page ${s}: ${A.length} tweets on page, ${N.size} total seen, ${p.length+w} new to save, bottom cursor: ${T?T===n?"unchanged":"received":"none"}`),a&&k(a,"capturing",{newCount:w+p.length,existingCount:C,statusText:`Page ${s} • ${N.size} seen`}),E("capturing"),A.length===0){console.log(`[shelf] Page ${s} returned 0 tweets. Bookmarks timeline ended.`);break}if(!T||T===n||T===c){console.log(`[shelf] Bottom cursor reached end or stopped changing (${T}).`);break}await chrome.storage.local.set({shelf_last_cursor:T}),c=n,n=T,s++;const W=Math.floor(Math.random()*1e3)+2e3;if(!await H(W)||u)break}catch(A){console.error("[shelf] Error in page iteration:",A),await H(2e3)}}if(p.length>0&&!u){console.log(`[shelf] Flushing final ${p.length} queued tweets with retry before completing...`),a&&k(a,"capturing",{newCount:w+p.length,existingCount:C,statusText:`Saving final ${p.length} bookmarks...`}),E("capturing",`Saving final ${p.length} bookmarks...`);try{if((await Be(!0)).authError){x=!1,u=!1;return}}catch(m){console.error("[shelf] Error in final queue flush:",m)}}u||await chrome.storage.local.remove("shelf_last_cursor"),chrome.storage.sync.set({shelf_last_sync_time:new Date().toISOString(),shelf_last_sync_count:w});const i=p.length,l=N.size;console.log(`[shelf] Sync finished summary:
  • Total tweets seen this session: ${l}
  • Newly saved: ${w}
  • Already existing in Shelf: ${C}
  • Unsaved (failed batches): ${i}`);let f="",_=!1;u?f=`Stopped (${w} saved, ${l} seen)`:i>0?(_=!0,f=`Done: ${l} seen, ${w} newly saved (${i} unsaved)`):f=`Done: ${l} seen, ${w} newly saved`,a&&k(a,"done",{message:f,warning:_}),E("done",f,i)}catch(i){console.error("[shelf] Fatal sync error:",i);const l=i instanceof Error?i.message:"Sync interrupted";a&&k(a,"error",{message:l}),E("error",l)}finally{x=!1,u=!1}}function Qe(){if(!document.body)return;const r=document.getElementById("shelf-floating-widget");if(r&&document.body.contains(r))return;r&&r.remove();const e=document.createElement("div");e.id="shelf-floating-widget",e.style.cssText=`
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
  `,k(e,"idle"),document.body.appendChild(e),a=e,console.log("[shelf] Floating widget anchored to document.body")}function k(r,e,t){if(e==="idle"){const o=Me()?"Sync bookmarks":"Go to Bookmarks";r.innerHTML=`
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
          <span id="shelf-btn-sub" style="font-size: 10px; color: #38BDF8; font-weight: 500;">${o}</span>
        </div>
      </div>
    `;const s=r.querySelector("#shelf-btn-start");s==null||s.addEventListener("click",n=>{n.preventDefault(),n.stopPropagation(),Le()})}else if(e==="capturing"){const o=(t==null?void 0:t.newCount)||w,s=(t==null?void 0:t.existingCount)||C,n=(t==null?void 0:t.statusText)||(s>0?`${s} already in Shelf`:"Scanning bookmarks...");r.innerHTML=`
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
          <span>Syncing… <strong>${o} saved</strong></span>
          <span style="font-size: 10px; color: #38BDF8;">${n}</span>
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
    `;const c=r.querySelector("#shelf-btn-stop");c==null||c.addEventListener("click",g=>{g.preventDefault(),g.stopPropagation(),Ne(),c&&(c.textContent="Stopping...")})}else if(e==="done"){const o=!!(t!=null&&t.warning),s=o?"#78350F":"#064E3B",n=o?"#D97706":"#059669",c=o?"#FEF3C7":"#ECFDF5",g=o?"⚠":"✓";r.innerHTML=`
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        background: ${s};
        color: ${c};
        padding: 10px 18px;
        border-radius: 9999px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        font-size: 13px;
        font-weight: 500;
        border: 1px solid ${n};
      ">
        <span>${g} ${(t==null?void 0:t.message)||"Done"}</span>
      </div>
    `,setTimeout(()=>{a&&!x&&k(a,"idle")},o?7e3:4500)}else e==="error"&&(r.innerHTML=`
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
    `,setTimeout(()=>{a&&!x&&k(a,"idle")},7e3))}function ae(){if(!document.body)return;const r=document.getElementById("shelf-floating-widget");if(!(r&&document.body.contains(r)))Qe();else if(r&&!x){const t=Me(),o=r.querySelector("#shelf-btn-sub"),s=t?"Sync bookmarks":"Go to Bookmarks";o&&o.textContent!==s&&(o.textContent=s)}}function Ye(r){const e=document.createElement("div");e.style.cssText=`
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
  `,e.textContent="✕ Removed from Shelf library",document.body.appendChild(e),setTimeout(()=>{e.style.opacity="0",setTimeout(()=>e.remove(),400)},3e3)}let Pe="";document.addEventListener("click",r=>{var t,o,s;const e=r.target;if(e)try{const n=e.closest('article, [data-testid="tweet"]');if(n){const f=((t=n.querySelector("time"))==null?void 0:t.closest("a"))||n.querySelector('a[href*="/status/"]'),m=((f==null?void 0:f.getAttribute("href"))||"").match(/\/status\/(\d+)/);m&&(Pe=m[1])}const c=e.closest('[data-testid="removeBookmark"], [aria-label*="Remove"][aria-label*="ookmark"], [aria-label*="remove"][aria-label*="ookmark"], [data-testid="bookmark"][aria-label*="Remove"], [data-testid="bookmark"][aria-label*="remove"]'),g=e.closest('[role="menuitem"], [data-testid="Dropdown"]'),i=g&&/remove.*bookmark|delete.*bookmark/i.test(g.textContent||"");if(c||i){let l="";const f=(o=c||g)==null?void 0:o.closest('article, [data-testid="tweet"], [data-testid="cellInnerDiv"], div[role="article"]');if(f){const m=((s=f.querySelector("time"))==null?void 0:s.closest("a"))||f.querySelector('a[href*="/status/"]'),F=((m==null?void 0:m.getAttribute("href"))||"").match(/\/status\/(\d+)/);F&&(l=F[1])}l||(l=Pe),l&&(console.log("[shelf] Un-bookmark action detected on X for tweet:",l),$.delete(l),ie($),chrome.runtime.sendMessage({type:"DELETE_BOOKMARK",tweetId:l},_=>{_&&_.success&&(console.log("[shelf] Bookmark auto-removed from Shelf library:",l),Ye(l))}))}}catch(n){console.error("[shelf] Error in un-bookmark click listener:",n)}},!0);chrome.runtime.onMessage.addListener((r,e,t)=>{try{if(r.action==="START_CAPTURE")return x?t({started:!1,alreadyRunning:!0}):(Le(),t({started:!0})),!0;if(r.action==="STOP_CAPTURE")return Ne(),t({stopped:!0}),!0}catch(o){return console.error("[shelf] Error in content script onMessage listener:",o),t({error:String(o)}),!0}});setInterval(ae,600);let De=location.href;new MutationObserver(()=>{const r=location.href;r!==De&&(De=r,ae())}).observe(document,{subtree:!0,childList:!0});ae();
