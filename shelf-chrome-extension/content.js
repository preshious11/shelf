function Me(e){var c,m,i,l,f,S,g,$,B,Z,C,K,Q,v,w,P,O,D,M,z,U,Y,W,ee,fe,he,me,ge,pe,ye,we,be,_e,ke,xe,Se,ve,Ee,Te,Ce;const t=[];let o=null,r=null;if(!e||typeof e!="object")return{tweets:t,bottomCursor:o};let n=[];const s=((m=(c=e==null?void 0:e.data)==null?void 0:c.bookmark_timeline_v2)==null?void 0:m.timeline)||((l=(i=e==null?void 0:e.data)==null?void 0:i.bookmark_timeline)==null?void 0:l.timeline)||(($=(g=(S=(f=e==null?void 0:e.data)==null?void 0:f.user)==null?void 0:S.result)==null?void 0:g.timeline)==null?void 0:$.timeline)||((Z=(B=e==null?void 0:e.data)==null?void 0:B.timeline)==null?void 0:Z.timeline);Array.isArray(s==null?void 0:s.instructions)?n=s.instructions:Array.isArray((C=e==null?void 0:e.data)==null?void 0:C.instructions)?n=e.data.instructions:Array.isArray(e==null?void 0:e.instructions)&&(n=e.instructions);for(const E of n){if(!E||typeof E!="object")continue;(E.direction==="Bottom"||E.cursorType==="Bottom"||E.entryType==="TimelineTimelineCursor")&&E.value&&(o=E.value);let te=[];Array.isArray(E.entries)?te=E.entries:E.entry&&typeof E.entry=="object"&&(te=[E.entry]);for(const F of te){if(!F||typeof F!="object")continue;const Ae=String(F.entryId||""),V=((K=F.content)==null?void 0:K.cursorType)||((v=(Q=F.content)==null?void 0:Q.cursorContent)==null?void 0:v.cursorType),j=((w=F.content)==null?void 0:w.value)||((O=(P=F.content)==null?void 0:P.cursorContent)==null?void 0:O.value);if(Ae.startsWith("cursor-bottom")||V==="Bottom"||V==="bottom"){j&&(o=j);continue}if(Ae.startsWith("cursor-top")||V==="Top"||V==="top"){j&&(r=j);continue}const oe=(D=F.content)==null?void 0:D.itemContent,L=(M=oe==null?void 0:oe.tweet_results)==null?void 0:M.result;if(!L)continue;let h=L;(L.__typename==="TweetWithVisibilityResults"||L.__typename==="TweetWithVisibility")&&L.tweet&&(h=L.tweet);const $e=String(h.__typename||"");if($e==="TweetTombstone"||$e==="TweetUnavailable"||!h.legacy)continue;const X=String(h.rest_id||h.id_str||((z=h.legacy)==null?void 0:z.id_str)||"").trim();if(!X)continue;const _=((Y=(U=h.core)==null?void 0:U.user_results)==null?void 0:Y.result)||((ee=(W=h.core)==null?void 0:W.user_result)==null?void 0:ee.result),re=(_==null?void 0:_.legacy)||{},Ie=(_==null?void 0:_.core)||{},Ue=String(re.name||Ie.name||(_==null?void 0:_.name)||"Unknown").trim(),ne=String(re.screen_name||Ie.screen_name||(_==null?void 0:_.screen_name)||"").replace(/^@/,"").trim(),We=re.profile_image_url_https||(_==null?void 0:_.avatar_image_url)||void 0,He=(me=(he=(fe=h.note_tweet)==null?void 0:fe.note_tweet_results)==null?void 0:he.result)==null?void 0:me.text,Ge=String(He||((ge=h.legacy)==null?void 0:ge.full_text)||((pe=h.legacy)==null?void 0:pe.text)||"").trim();let se;if((ye=h.legacy)!=null&&ye.created_at)try{const d=new Date(h.legacy.created_at);se=isNaN(d.getTime())?h.legacy.created_at:d.toISOString()}catch{se=h.legacy.created_at}const ie=[],Fe=((be=(we=h.legacy)==null?void 0:we.extended_entities)==null?void 0:be.media)||((ke=(_e=h.legacy)==null?void 0:_e.entities)==null?void 0:ke.media)||[];if(Array.isArray(Fe)){for(const d of Fe)if(d){if(d.type==="photo"){const ae=d.media_url_https||d.media_url;ae&&ie.push({type:"image",url:ae,alt_text:d.ext_alt_text||void 0})}else if(d.type==="video"||d.type==="animated_gif"){const De=((Se=(Array.isArray((xe=d.video_info)==null?void 0:xe.variants)?d.video_info.variants:[]).filter(H=>H&&H.content_type==="video/mp4"&&H.url).sort((H,je)=>(je.bitrate||0)-(H.bitrate||0))[0])==null?void 0:Se.url)||d.media_url_https||d.media_url;De&&ie.push({type:"video",url:De,alt_text:d.ext_alt_text||void 0})}}}const Be=[],Pe=((Ee=(ve=h.legacy)==null?void 0:ve.entities)==null?void 0:Ee.urls)||[];if(Array.isArray(Pe))for(const d of Pe)d&&d.url&&Be.push({url:d.url,expanded_url:d.expanded_url||d.url,display_url:d.display_url||d.url});const Ke=!!((Te=h.legacy)!=null&&Te.in_reply_to_status_id_str||(Ce=h.legacy)!=null&&Ce.in_reply_to_user_id_str),Ve=ne?`https://x.com/${ne}/status/${X}`:`https://x.com/i/web/status/${X}`;t.push({tweet_id:X,tweet_url:Ve,author_name:Ue,author_handle:ne,author_avatar_url:We,text:Ge,posted_at:se,media:ie,links:Be,is_thread:Ke})}}return{tweets:t,bottomCursor:o,topCursor:r}}let y=!1,u=!1,b=0,A=0,I=new Set,N=new Set,p=[],a=null,R=!1,x=null,le=null,q=null,Xe=0;window.addEventListener("message",e=>{var t;if(((t=e.data)==null?void 0:t.type)==="SHELF_BOOKMARKS_INTERCEPTED"){const{url:o,method:r,headers:n,body:s,response:c}=e.data;o&&c&&(le={url:o,method:r||"GET",headers:n||{},body:s,response:c,timestamp:Date.now()},q&&(q(le),q=null),console.log("[shelf] Captured X Bookmarks API request & response."))}});function Je(e){return new Promise(t=>{const o=`shelf_req_${Date.now()}_${++Xe}`;let r=!1;const n=s=>{var c,m;((c=s.data)==null?void 0:c.type)==="SHELF_NEXT_PAGE_RESPONSE"&&((m=s.data)==null?void 0:m.requestId)===o&&(window.removeEventListener("message",n),r=!0,t(s.data))};window.addEventListener("message",n),setTimeout(()=>{r||(window.removeEventListener("message",n),t({success:!1,error:"Timeout waiting for next bookmarks page from page context"}))},45e3),window.postMessage({type:"SHELF_FETCH_NEXT_BOOKMARKS_PAGE",requestId:o,...e},"*")})}function Ze(e,t){if((e.method||"GET").toUpperCase()==="GET")try{const r=new URL(e.url,window.location.origin),n=r.searchParams.get("variables");if(n){const s=JSON.parse(n);s.cursor=t,s.count=20,r.searchParams.set("variables",JSON.stringify(s))}else r.searchParams.set("cursor",t);return{url:r.toString()}}catch{return{url:`${e.url}&cursor=${encodeURIComponent(t)}`}}else{let r=e.body;try{if(e.body){const n=JSON.parse(e.body);n.variables?(n.variables.cursor=t,n.variables.count=20):n.cursor=t,r=JSON.stringify(n)}}catch{}return{url:e.url,body:r}}}async function Qe(){return new Promise(e=>{try{chrome.storage.local.get(["shelf_saved_tweet_ids"],t=>{if(chrome.runtime.lastError){console.warn("[shelf] Error reading storage.local:",chrome.runtime.lastError.message),e(new Set);return}const o=t==null?void 0:t.shelf_saved_tweet_ids;Array.isArray(o)?e(new Set(o.map(r=>String(r)))):e(new Set)})}catch(t){console.error("[shelf] Exception loading saved IDs:",t),e(new Set)}})}async function ce(e){return new Promise(t=>{try{chrome.storage.local.set({shelf_saved_tweet_ids:Array.from(e)},()=>{t()})}catch(o){console.error("[shelf] Exception persisting saved IDs:",o),t()}})}function T(e,t,o){try{const r={type:"SYNC_PROGRESS",isCapturing:y,savedCount:b,alreadySavedCount:A,unsavedCount:o||(e==="done"?p.length:0),status:e,statusText:t||(y?`Syncing… ${b} saved`:"Done"),isDone:e==="done"};chrome.storage.local.set({shelf_sync_state:r}),chrome.runtime.sendMessage(r).catch(()=>{})}catch(r){console.warn("[shelf] Error broadcasting sync progress:",r)}}function Oe(){const e=window.location.href.toLowerCase(),t=window.location.pathname.toLowerCase();return e.includes("bookmark")||e.includes("history")||t.startsWith("/i/bookmarks")||t.startsWith("/i/history")||t.includes("/bookmarks")||t.includes("/history")}async function Ye(){return new Promise(e=>{chrome.runtime.sendMessage({type:"GET_KNOWN_IDS"},t=>{if(chrome.runtime.lastError){e({success:!1,isAuthError:!1,ids:new Set,error:chrome.runtime.lastError.message});return}if(!t||!t.success){const r=!!(t!=null&&t.isAuthError||(t==null?void 0:t.status)===401||t!=null&&t.error&&(t.error.includes("Not connected to Shelf")||t.error.includes("401")||t.error.includes("API Token not configured")));e({success:!1,isAuthError:r,status:(t==null?void 0:t.status)||(r?401:500),ids:new Set,error:(t==null?void 0:t.error)||"Failed to connect to Shelf web app"});return}const o=new Set((t.knownIds||[]).map(r=>String(r)));e({success:!0,isAuthError:!1,ids:o})})})}async function et(e){return new Promise(t=>{chrome.runtime.sendMessage({type:"INGEST_BATCH",batch:e},o=>{if(chrome.runtime.lastError){t({success:!1,isAuthError:!1,error:chrome.runtime.lastError.message});return}if(!o||!o.success){const r=!!(o!=null&&o.isAuthError||(o==null?void 0:o.status)===401||o!=null&&o.error&&(o.error.includes("Not connected to Shelf")||o.error.includes("401")||o.error.includes("API Token not configured")));t({success:!1,isAuthError:r,status:(o==null?void 0:o.status)||(r?401:500),error:(o==null?void 0:o.error)||"Ingest failed via background worker"});return}t({success:!0,isAuthError:!1,added:o.added||0,skipped:o.skipped||0})})})}async function G(e,t=100){const o=Date.now();for(;Date.now()-o<e;){if(u)return!1;const r=e-(Date.now()-o);await new Promise(n=>setTimeout(n,Math.min(t,r)))}return!u}async function tt(e,t=5){let o=0,r=1e3;for(;o<t;){if(u)return{success:!1};o++,console.log(`[shelf] Ingesting batch of ${e.length} tweets (attempt ${o}/${t})...`);const n=await et(e);if(n.success)return console.log("[shelf] Ingest response:",n),{success:!0};if(n.isAuthError)return console.error("[shelf] Auth error (401) on batch ingest. Aborting immediately without retry."),{success:!1,isAuthError:!0,error:n.error};if(u)return{success:!1};if(console.error(`[shelf] Batch attempt ${o}/${t} failed (server/network):`,n.error),o>=t)return console.error("[shelf] Batch failed all 5 attempts. Keeping in queue for next round."),{success:!1,error:n.error};const s=Math.floor(Math.random()*500),c=r+s;if(console.log(`[shelf] Retrying batch in ${c}ms...`),!await G(c)||u)return console.log("[shelf] Batch backoff cancelled due to stop request."),{success:!1};r*=2}return{success:!1}}async function Le(e=!1){for(;(p.length>=20||e&&p.length>0)&&!u;){const o=Math.min(20,p.length),r=p.slice(0,o),n=await tt(r,5);if(n.isAuthError){console.error("[shelf] Auth error (401) mid-sync. Halting queue processing immediately.");const s="Not connected to Shelf. Please reconnect your API token";return u=!0,a&&k(a,"error",{message:s}),T("error",s),{authError:!0}}if(n.success)p.splice(0,o),r.forEach(s=>I.add(s.tweet_id)),b+=o,await ce(I),T("capturing"),a&&k(a,"capturing",{newCount:b,existingCount:A});else{console.warn(`[shelf] ${p.length} tweets remain queued for next round.`);break}}return{authError:!1}}function ze(){y&&(console.log("[shelf] Stop requested by user"),u=!0,T("idle","Stopping sync..."),a&&k(a,"capturing",{newCount:b,existingCount:A,statusText:"Stopping..."}))}async function ue(){if(y){console.log("[shelf] Sync is already in progress. Ignoring duplicate start request.");return}x!==null&&(window.clearTimeout(x),x=null),R=!0,y=!0,u=!1,b=0,A=0,p=[],N=new Set,a&&k(a,"capturing",{newCount:0,existingCount:0}),T("capturing","Syncing… 0 saved"),console.log("[shelf] Starting network-based bookmark sync...");const e=await Qe();console.log(`[shelf] Loaded ${e.size} saved IDs from local storage cache.`);const t=await Ye();if(t.isAuthError){console.error("[shelf] Auth failure connecting to Shelf (401). Aborting sync.");const i="Not connected to Shelf. Please reconnect your API token";a&&k(a,"error",{message:i}),T("error",i),y=!1,u=!1;return}t.success&&t.ids?(I=new Set(t.ids),await ce(I),console.log(`[shelf] Synchronized with Shelf server: ${I.size} active saved IDs.`)):(console.warn("[shelf] Could not reach Shelf server to fetch known IDs ("+(t.error||"network error")+"). Using local storage cache."),I=new Set(e));let o=le;if(o||(console.log("[shelf] Waiting up to 10s to capture X Bookmarks API request..."),a&&k(a,"capturing",{newCount:0,existingCount:0,statusText:"Connecting to X API..."}),T("capturing","Connecting to X API..."),o=await new Promise(i=>{let l=null;const f=S=>{l!==null&&clearTimeout(l),i(S)};q=f,l=window.setTimeout(()=>{q===f&&(q=null),i(null)},1e4)})),!o){console.warn("[shelf] No Bookmarks API request captured within 10s.");const i="Reload the bookmarks page and try again";a&&k(a,"error",{message:i}),T("error",i),y=!1,u=!1;return}let r=null;try{const i=await new Promise(l=>{chrome.storage.local.get(["shelf_last_cursor"],f=>l(f||{}))});i!=null&&i.shelf_last_cursor&&(r=i.shelf_last_cursor,console.log("[shelf] Resuming sync from saved cursor:",r))}catch(i){console.warn("[shelf] Error checking stored cursor:",i)}let n=1,s=r,c=null,m=!r;try{for(;!u;){let g=null;try{if(m)m=!1,g=Me(o.response);else{if(!s){console.log("[shelf] No more cursor available. Reached the end of bookmarks timeline.");break}const v=Ze(o,s),w=await Je({url:v.url,method:o.method,headers:o.headers,body:v.body});if(u)break;if(w.status===429){const P=w.rateLimitReset,O=Math.floor(Date.now()/1e3);let D=P&&P>O?P-O:60;D>900&&(D=900),console.warn(`[shelf] HTTP 429 Rate limited. Waiting ${D}s until reset (${P})...`),s&&await chrome.storage.local.set({shelf_last_cursor:s});for(let M=D;M>0&&!u;M--){const z=Math.floor(M/60),U=M%60,W=`Rate limited by X. Resuming in ${z>0?`${z}m ${U}s`:`${U}s`}...`;if(a&&k(a,"capturing",{newCount:b+p.length,existingCount:A,statusText:W}),T("rate_limited",W),!await G(1e3)||u)break}if(u)break;continue}if(!w.success||!w.response){console.error("[shelf] Failed to fetch next bookmarks page:",w.error||w.status),await G(2e3);break}g=Me(w.response)}if(!g){console.warn("[shelf] Empty page result returned.");break}const $=g.tweets;let B=0;for(const v of $){if(u)break;try{if(!v||!v.tweet_id)continue;const w=!N.has(v.tweet_id);w&&N.add(v.tweet_id),I.has(v.tweet_id)?w&&A++:w&&(p.push(v),B++)}catch(w){console.error("[shelf] Error processing parsed tweet:",w)}}if((await Le(!1)).authError){console.error("[shelf] Sync stopped due to auth error (401)."),y=!1,u=!1;return}const C=g.bottomCursor;if(console.log(`[shelf] Page ${n}: ${$.length} tweets on page, ${N.size} total seen, ${p.length+b} new to save, bottom cursor: ${C?C===s?"unchanged":"received":"none"}`),a&&k(a,"capturing",{newCount:b+p.length,existingCount:A,statusText:`Page ${n} • ${N.size} seen`}),T("capturing"),$.length===0){console.log(`[shelf] Page ${n} returned 0 tweets. Bookmarks timeline ended.`);break}if(!C||C===s||C===c){console.log(`[shelf] Bottom cursor reached end or stopped changing (${C}).`);break}await chrome.storage.local.set({shelf_last_cursor:C}),c=s,s=C,n++;const K=Math.floor(Math.random()*1e3)+2e3;if(!await G(K)||u)break}catch($){console.error("[shelf] Error in page iteration:",$),await G(2e3)}}if(p.length>0&&!u){console.log(`[shelf] Flushing final ${p.length} queued tweets with retry before completing...`),a&&k(a,"capturing",{newCount:b+p.length,existingCount:A,statusText:`Saving final ${p.length} bookmarks...`}),T("capturing",`Saving final ${p.length} bookmarks...`);try{if((await Le(!0)).authError){y=!1,u=!1;return}}catch(g){console.error("[shelf] Error in final queue flush:",g)}}u||await chrome.storage.local.remove("shelf_last_cursor"),chrome.storage.sync.set({shelf_last_sync_time:new Date().toISOString(),shelf_last_sync_count:b});const i=p.length,l=N.size;console.log(`[shelf] Sync finished summary:
  • Total tweets seen this session: ${l}
  • Newly saved: ${b}
  • Already existing in Shelf: ${A}
  • Unsaved (failed batches): ${i}`);let f="",S=!1;u?f=`Stopped (${b} saved, ${l} seen)`:i>0?(S=!0,f=`Done: ${l} seen, ${b} newly saved (${i} unsaved)`):f=`Done: ${l} seen, ${b} newly saved`,a&&k(a,"done",{message:f,warning:S}),T("done",f,i)}catch(i){console.error("[shelf] Fatal sync error:",i);const l=i instanceof Error?i.message:"Sync interrupted";a&&k(a,"error",{message:l}),T("error",l)}finally{y=!1,u=!1}}function ot(){if(!document.body)return;const e=document.getElementById("shelf-floating-widget");if(e&&document.body.contains(e))return;e&&e.remove();const t=document.createElement("div");t.id="shelf-floating-widget",t.style.cssText=`
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
  `,k(t,"idle"),document.body.appendChild(t),a=t,console.log("[shelf] Floating widget anchored to document.body")}function k(e,t,o){if(t==="idle"){const r=Oe()?"Sync bookmarks":"Go to Bookmarks";e.innerHTML=`
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
    `;const n=e.querySelector("#shelf-btn-start");n==null||n.addEventListener("click",s=>{s.preventDefault(),s.stopPropagation(),ue()})}else if(t==="capturing"){const r=(o==null?void 0:o.newCount)||b,n=(o==null?void 0:o.existingCount)||A,s=(o==null?void 0:o.statusText)||(n>0?`${n} already in Shelf`:"Scanning bookmarks...");e.innerHTML=`
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
          <span>Syncing… <strong>${r} saved</strong></span>
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
    `;const c=e.querySelector("#shelf-btn-stop");c==null||c.addEventListener("click",m=>{m.preventDefault(),m.stopPropagation(),ze(),c&&(c.textContent="Stopping...")})}else if(t==="done"){const r=!!(o!=null&&o.warning),n=r?"#78350F":"#064E3B",s=r?"#D97706":"#059669",c=r?"#FEF3C7":"#ECFDF5",m=r?"⚠":"✓";e.innerHTML=`
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        background: ${n};
        color: ${c};
        padding: 10px 18px;
        border-radius: 9999px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        font-size: 13px;
        font-weight: 500;
        border: 1px solid ${s};
      ">
        <span>${m} ${(o==null?void 0:o.message)||"Done"}</span>
      </div>
    `,setTimeout(()=>{a&&!y&&k(a,"idle")},r?7e3:4500)}else t==="error"&&(e.innerHTML=`
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
    `,setTimeout(()=>{a&&!y&&k(a,"idle")},7e3))}function de(){if(!document.body)return;const e=document.getElementById("shelf-floating-widget");if(!(e&&document.body.contains(e)))ot();else if(e&&!y){const o=Oe(),r=e.querySelector("#shelf-btn-sub"),n=o?"Sync bookmarks":"Go to Bookmarks";r&&r.textContent!==n&&(r.textContent=n)}}function rt(e){const t=document.createElement("div");t.style.cssText=`
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
  `,t.textContent="✕ Removed from Shelf library",document.body.appendChild(t),setTimeout(()=>{t.style.opacity="0",setTimeout(()=>t.remove(),400)},3e3)}let Ne="";document.addEventListener("click",e=>{var o,r,n;const t=e.target;if(t)try{const s=t.closest('article, [data-testid="tweet"]');if(s){const f=((o=s.querySelector("time"))==null?void 0:o.closest("a"))||s.querySelector('a[href*="/status/"]'),g=((f==null?void 0:f.getAttribute("href"))||"").match(/\/status\/(\d+)/);g&&(Ne=g[1])}const c=t.closest('[data-testid="removeBookmark"], [aria-label*="Remove"][aria-label*="ookmark"], [aria-label*="remove"][aria-label*="ookmark"], [data-testid="bookmark"][aria-label*="Remove"], [data-testid="bookmark"][aria-label*="remove"]'),m=t.closest('[role="menuitem"], [data-testid="Dropdown"]'),i=m&&/remove.*bookmark|delete.*bookmark/i.test(m.textContent||"");if(c||i){let l="";const f=(r=c||m)==null?void 0:r.closest('article, [data-testid="tweet"], [data-testid="cellInnerDiv"], div[role="article"]');if(f){const g=((n=f.querySelector("time"))==null?void 0:n.closest("a"))||f.querySelector('a[href*="/status/"]'),B=((g==null?void 0:g.getAttribute("href"))||"").match(/\/status\/(\d+)/);B&&(l=B[1])}l||(l=Ne),l&&(console.log("[shelf] Un-bookmark action detected on X for tweet:",l),I.delete(l),ce(I),chrome.runtime.sendMessage({type:"DELETE_BOOKMARK",tweetId:l},S=>{S&&S.success&&(console.log("[shelf] Bookmark auto-removed from Shelf library:",l),rt(l))}))}}catch(s){console.error("[shelf] Error in un-bookmark click listener:",s)}},!0);chrome.runtime.onMessage.addListener((e,t,o)=>{try{if(e.action==="START_CAPTURE")return y?o({started:!1,alreadyRunning:!0}):(ue(),o({started:!0})),!0;if(e.action==="STOP_CAPTURE")return ze(),o({stopped:!0}),!0}catch(r){return console.error("[shelf] Error in content script onMessage listener:",r),o({error:String(r)}),!0}});function Re(){const e=window.location.href.toLowerCase();return window.location.pathname.toLowerCase().startsWith("/i/bookmarks")||e.includes("x.com/i/bookmarks")||e.includes("twitter.com/i/bookmarks")}function J(){if(!Re()){R=!1,x!==null&&(window.clearTimeout(x),x=null);return}if(!(R||y)&&x===null)try{chrome.storage.sync.get(["shelf_auto_sync_on_open"],e=>{chrome.runtime.lastError||!((e==null?void 0:e.shelf_auto_sync_on_open)!==!1)||R||y||x!==null||(console.log("[shelf] Auto-sync is enabled. Sync will start automatically in 3 seconds..."),x=window.setTimeout(()=>{x=null,Re()&&!y&&!R&&(R=!0,console.log("[shelf] Triggering automatic bookmark sync on x.com/i/bookmarks..."),ue())},3e3))})}catch(e){console.warn("[shelf] Error checking auto-sync preference:",e)}}chrome.storage.onChanged.addListener((e,t)=>{t==="sync"&&e.shelf_auto_sync_on_open&&(e.shelf_auto_sync_on_open.newValue===!1?x!==null&&(window.clearTimeout(x),x=null):e.shelf_auto_sync_on_open.newValue===!0&&J())});setInterval(de,600);let qe=location.href;new MutationObserver(()=>{const e=location.href;e!==qe&&(qe=e,de(),J())}).observe(document,{subtree:!0,childList:!0});window.addEventListener("popstate",J);de();J();
