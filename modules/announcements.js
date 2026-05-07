// ════ 公告 ════
// ANNOUNCEMENTS
// ══════════════════════════════════════════
function updateMarquee(){
  const inner=document.getElementById('marqueeInner');
  if(!inner)return;
  const anns=(store.announcements||[]).slice(0,15);
  if(!anns.length){inner.innerHTML='';return;}
  const sep='<span class="marquee-sep">✦</span>';
  const items=anns.map(a=>`<span class="marquee-item" onclick="openAnnFromMarquee('${a.id}')">${esc(a.title)}</span>${sep}`).join('');
  // 複製一份讓 translateX(-50%) 動畫無縫循環
  inner.innerHTML=items+items;
}
function openAnnFromMarquee(id){
  setPage('announcements');
  setTimeout(function(){
    const el=document.querySelector('[data-ann-id="'+id+'"]');
    if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.style.outline='2px solid #d4af37';setTimeout(function(){el.style.outline='';},1800);}
  },120);
}
function updateAnnBadge(){
  if(!currentUser)return;
  const n=(store.announcements||[]).filter(a=>!(a.reads||{})[currentUser.id]).length;
  const b=document.getElementById('badge_ann');if(b)b.style.display=n>0?'flex':'none';
}
function markAllAnnRead(){
  (store.announcements||[]).forEach(a=>{if(!a.reads)a.reads={};if(!a.reads[currentUser.id])a.reads[currentUser.id]=true;});
  saveCollection('announcements');updateAnnBadge();
}
function renderAnnouncementsPage(c){
  c.innerHTML=`<div class="admin-layout">
    <div class="main-header">
      <div><h1>公告牆</h1><div class="main-header-meta">全院公告 · 感染管控警示</div></div>
      <div class="header-actions">
        ${hasPerm('publishAnn')?`<button class="btn-sm danger" onclick="openEmergencyBroadcast()">⚡ 緊急廣播</button>`:''}
        ${hasPerm('publishAnn')?`<button class="btn-sm primary" onclick="openAddAnn()">＋ 發布公告</button>`:''}
      </div>
    </div>
    <div class="admin-content" id="annList"></div>
  </div>`;
  renderAnnList();
}
function infLevelBadge(lv){
  if(lv==='red')return'<span class="ann-pin-badge" style="background:var(--red-bg);color:var(--red)">🔴 感染紅色警示</span>';
  if(lv==='orange')return'<span class="ann-pin-badge" style="background:var(--orange-bg);color:var(--orange)">🟠 感染橙色警示</span>';
  if(lv==='yellow')return'<span class="ann-pin-badge" style="background:var(--amber-bg);color:var(--amber)">🟡 感染黃色警示</span>';
  if(lv==='pinned')return'<span class="ann-pin-badge" style="background:var(--amber-bg);color:var(--amber)">📌 置頂</span>';
  return'';
}
function renderAnnList(){
  const c=document.getElementById('annList');if(!c)return;
  // 自我修復：補上缺少的 reads / time 欄位
  (store.announcements||[]).forEach(a=>{if(!a.reads)a.reads={};if(!a.time)a.time='';});
  const sorted=[...(store.announcements||[])].sort((a,b)=>{
    const w=x=>x.infectionLevel==='red'?0:x.infectionLevel==='orange'?1:x.pinned?2:3;
    return w(a)-w(b)||(b.time||'').localeCompare(a.time||'');
  });
  const allIds=(store.users||[]).filter(u=>u.username!=='admin').map(u=>u.id);
  const cards=sorted.map((a,i)=>{
    const reads=a.reads||{};
    const infClass=a.infectionLevel==='red'?'infection-red':a.infectionLevel==='orange'?'infection-orange':a.infectionLevel==='yellow'?'infection-yellow':a.pinned?'pinned':'';
    const badge=a.infectionLevel?infLevelBadge(a.infectionLevel):(a.pinned?infLevelBadge('pinned'):'');
    const readList=allIds.map(uid=>`<span class="ann-read-chip ${reads[uid]?'arc-read':'arc-unread'}">${reads[uid]?'✓':''} ${esc(userName(uid))}</span>`).join('');
    const readCount=allIds.filter(uid=>reads[uid]).length;
    const readPct=allIds.length?Math.round(readCount/allIds.length*100):0;
    const myRead=reads[currentUser.id];
    return`<div class="ann-card ${infClass}" data-ann-id="${a.id}">
      ${badge}
      <div class="ann-header">${avatarEl(a.authorId,26)}<div class="ann-title-text">${esc(a.title)}</div></div>
      <div class="ann-body">${esc(a.body)}</div>
      <div class="ann-meta">${esc(userName(a.authorId))} · ${a.time}</div>
      <div class="ann-read-progress"><span class="ann-read-pct">${readCount}/${allIds.length} 人已讀（${readPct}%）</span><div class="ann-read-bar-wrap"><div class="ann-read-bar" style="width:${readPct}%"></div></div></div>
      <div class="ann-read-list">${readList}</div>
      <div class="ann-actions">
        ${!myRead?`<button class="btn-sm" onclick="readAnn('${a.id}')">✓ 標示已讀</button>`:'<span style="font-size:12px;color:var(--green)">✓ 已讀</span>'}
        ${hasPerm('publishAnn')?`<button class="btn-sm" onclick="togglePin('${a.id}')">${a.pinned?'取消置頂':'📌 置頂'}</button>
        <button class="btn-sm danger" onclick="deleteAnn('${a.id}')">刪除</button>`:''}
      </div>
    </div>`;
  }).join('');
  c.innerHTML=cards||'<div style="text-align:center;padding:40px;color:var(--faint);font-size:13px">尚無公告</div>';
}
function openAddAnn(){
  showModal('發布公告',`
    <div class="form-row"><label>標題</label><input id="annTitle" placeholder="公告主旨"></div>
    <div class="form-row"><label>內容</label><textarea id="annBody" placeholder="詳細說明..."></textarea></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-row"><label>類別</label><select id="annCat"><option value="general">一般公告</option><option value="infection">感染管控</option><option value="admin">行政通知</option><option value="training">教育訓練</option></select></div>
      <div class="form-row"><label>感染警示等級</label><select id="annInf"><option value="">（無）</option><option value="yellow">🟡 黃色</option><option value="orange">🟠 橙色</option><option value="red">🔴 紅色</option></select></div>
    </div>
    <div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="annPinned"> 置頂公告</label></div>`,saveAnn);
}
function saveAnn(){
  const title=document.getElementById('annTitle').value.trim();
  const body=document.getElementById('annBody').value.trim();
  if(!title||!body)return;
  const reads={};store.users.forEach(u=>{if(u.username!=='admin')reads[u.id]=u.id===currentUser.id;});
  store.announcements.unshift({id:uid(),title,body,authorId:currentUser.id,
    time:today()+' '+nowTime(),pinned:document.getElementById('annPinned').checked,
    category:document.getElementById('annCat').value,
    infectionLevel:document.getElementById('annInf').value,reads});
  logAudit('發布公告', document.getElementById('annTitle').value.trim());
  saveCollection('announcements');closeModal();renderAnnList();updateAnnBadge();updateMarquee();
}
function readAnn(id){const a=store.announcements.find(x=>x.id===id);if(a){if(!a.reads)a.reads={};a.reads[currentUser.id]=true;}saveCollection('announcements');renderAnnList();updateAnnBadge();}
function togglePin(id){const a=store.announcements.find(x=>x.id===id);if(a)a.pinned=!a.pinned;saveCollection('announcements');renderAnnList();}
function deleteAnn(id){if(!hasPerm('publishAnn')){showToast('無權限','只有公告管理者能刪除公告','🔒');return;}if(!confirm('確定刪除？'))return;const da=store.announcements.find(x=>x.id===id);store.announcements=store.announcements.filter(x=>x.id!==id);logAudit('刪除公告', da?da.title:'');saveCollection('announcements');renderAnnList();updateMarquee();}


// ── 緊急廣播 (moved from meetings block) ──
function openEmergencyBroadcast(){
  showModal('⚡ 發送緊急廣播',`
    <div style="background:var(--red-bg);border:1px solid #f0c0c0;border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:14px;font-size:13px;color:var(--red)">
      ⚠ 緊急廣播將強制所有在線用戶收到彈出通知，需本人確認已讀。
    </div>
    <div class="form-row"><label>緊急等級</label><select id="emBroadcastLevel">
      <option value="green">🟢 一般通知</option>
      <option value="yellow">🟡 黃色警示</option>
      <option value="orange">🟠 橙色警示</option>
      <option value="red">🔴 紅色緊急</option>
    </select></div>
    <div class="form-row"><label>標題</label><input id="emBroadcastTitle" placeholder="緊急事件標題..."></div>
    <div class="form-row"><label>詳細說明</label><textarea id="emBroadcastBody" placeholder="請說明緊急事件詳情、應對措施..."></textarea></div>`,sendEmergency);
}
function sendEmergency(){
  var _etEl=document.getElementById('emBroadcastTitle')||document.getElementById('emTitle');
  var _ebEl=document.getElementById('emBroadcastBody')||document.getElementById('emBody');
  var _elEl=document.getElementById('emBroadcastLevel')||document.getElementById('emLevel');
  if(!_etEl||!_etEl.value)return;
  const title=_etEl.value.trim();
  const body=_ebEl?_ebEl.value.trim():'';
  if(!title)return;
  const level=_elEl?_elEl.value:'green';
  const confirms={};
  confirms[currentUser.id]=true;
  const em={id:uid(),title,body,level,authorId:currentUser.id,time:today()+' '+nowTime(),confirms};
  store.emergencies.push(em);
  store.announcements.unshift({id:uid(),title:'⚡ '+title,body,authorId:currentUser.id,
    time:today()+' '+nowTime(),pinned:true,category:'emergency',infectionLevel:level==='red'?'red':level==='orange'?'orange':level==='yellow'?'yellow':'',
    reads:Object.fromEntries(store.users.filter(u=>u.username!=='admin').map(u=>[u.id,u.id===currentUser.id]))});
  saveMultiple(['emergencies','announcements']);closeModal();showEmergencyOverlay(em);
}
function checkPendingEmergency(){
  const pending=store.emergencies.find(e=>!e.confirms[currentUser.id]);
  if(pending)showEmergencyOverlay(pending);
}
function showEmergencyOverlay(em){
  const levelLabels={green:'一般通知',yellow:'🟡 黃色警示',orange:'🟠 橙色警示',red:'🔴 紅色緊急'};
  const levelColors={green:'background:#d1fae5;color:#065f46',yellow:'background:var(--amber-bg);color:var(--amber)',orange:'background:var(--orange-bg);color:var(--orange)',red:'background:var(--red-bg);color:var(--red)'};
  document.getElementById('emLevelBadge').textContent=levelLabels[em.level]||'緊急廣播';
  document.getElementById('emLevelBadge').style.cssText=levelColors[em.level]||levelColors.red;
  document.getElementById('emTitle').textContent||0;
  document.getElementById('emTitle').style&&(document.getElementById('emTitle').style.cssText='');
  document.getElementById('emTitle').textContent=em.title;
  document.getElementById('emBody').textContent=em.body;
  const confirmList=store.users.filter(u=>u.username!=='admin').map(u=>`<div class="em-confirm-item">
    <div class="em-read-dot" style="background:${em.confirms[u.id]?'var(--green)':'#ccc'}"></div>
    <span style="font-size:12px">${esc(u.name)}</span>
    <span style="font-size:11px;color:var(--faint);margin-left:auto">${em.confirms[u.id]?'已確認':'待確認'}</span>
  </div>`).join('');
  document.getElementById('emConfirmList').innerHTML=confirmList;
  document.getElementById('emergencyOverlay').dataset.emId=em.id;
  document.getElementById('emergencyOverlay').classList.add('show');
}
function confirmEmergency(){
  const id=document.getElementById('emergencyOverlay').dataset.emId;
  const em=store.emergencies.find(x=>x.id===id);
  if(em)em.confirms[currentUser.id]=true;
  saveCollection('emergencies');
  document.getElementById('emergencyOverlay').classList.remove('show');
}

// ══════════════════════════════════════════
// 異常事件通報 → modules/incident.js

// ══════════════════════════════════════════
// 行事曆 → modules/calendar.js

// ══════════════════════════════════════════
// STATISTICS
// ══════════════════════════════════════════
