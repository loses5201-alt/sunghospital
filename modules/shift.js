// ════ 交班紀錄 ════
function renderShiftPage(c){
  shiftViewMode = 'list';
  c.innerHTML=`<div class="admin-layout">
    <div class="main-header">
      <div><h1>交班紀錄</h1><div class="main-header-meta">早班 06:00 / 午班 14:00 / 夜班 22:00</div></div>
      <div style="display:flex;gap:6px;align-items:center">
        <div style="display:flex;border:1px solid var(--b2);border-radius:var(--radius-sm);overflow:hidden">
          <button id="svBtnList" class="btn-sm active" style="border:none;border-radius:0;padding:5px 10px" onclick="switchShiftView('list')">列表</button>
          <button id="svBtnCal"  class="btn-sm"        style="border:none;border-radius:0;padding:5px 10px;border-left:1px solid var(--b2)" onclick="switchShiftView('cal')">月曆</button>
        </div>
        <button class="btn-sm primary" onclick="openNewShift()">＋ 新增交班</button>
      </div>
    </div>
    <div id="shiftListWrap"><div class="admin-content" id="shiftList"></div></div>
    <div id="shiftCalWrap" style="display:none"></div>
  </div>`;
  renderShiftList();
}
function shiftLabel(s){
  if(s==='morning')return'<span class="shift-badge shift-morning">🌅 早班</span>';
  if(s==='afternoon')return'<span class="shift-badge shift-afternoon">☀️ 午班</span>';
  return'<span class="shift-badge shift-night">🌙 夜班</span>';
}
function renderShiftList(){
  const c=document.getElementById('shiftList');if(!c)return;
  const sorted=[...store.shifts].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));
  const html=sorted.map(s=>{
    const canSign=s.toUserId===currentUser.id&&!s.toSigned;
    return`<div class="handover-card ${s.fromSigned&&s.toSigned?'signed':''}">
      <div class="hc-header">
        ${shiftLabel(s.shift)}
        <div class="hc-title">${esc(s.unit)}</div>
        <span style="font-size:12px;color:var(--faint)">${fmtDate(s.date)}</span>
        ${s.fromSigned&&s.toSigned?'<span class="sign-chip sign-done">✓ 完成交接</span>':''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="handover-field"><label>病患狀況</label><p>${esc(s.patients)}</p></div>
        <div class="handover-field"><label>本班重要事件</label><p>${esc(s.keyEvents)}</p></div>
        <div class="handover-field"><label>待辦事項</label><p>${esc(s.pending)}</p></div>
        <div class="handover-field"><label>用藥注意</label><p>${esc(s.meds)}</p></div>
      </div>
      ${(s.checklist&&s.checklist.length)?`<div class="handover-field" style="margin-top:8px"><label>待辦清單 ${s.checklist.every(i=>i.done)?'<span class="sign-chip sign-done" style="font-size:10px">全部完成 ✓</span>':'<span style="font-size:10px;color:var(--faint)">('+s.checklist.filter(i=>i.done).length+'/'+s.checklist.length+')</span>'}</label><div class="cl-list">${s.checklist.map(item=>`<label class="cl-item${item.done?' cl-done':''}"><input type="checkbox" ${item.done?'checked':''} onchange="toggleChecklistItem('${s.id}','${item.id}',this.checked)" style="accent-color:#c4527a"> ${esc(item.text)}</label>`).join('')}</div></div>`:''}
      <div class="sign-row">
        <span style="font-size:12px;color:var(--muted)">交班：</span>${avatarEl(s.fromUserId,20)}<span style="font-size:12px">${esc(userName(s.fromUserId))}</span>
        <span class="sign-chip ${s.fromSigned?'sign-done':'sign-pending'}"><span class="sign-dot"></span>${s.fromSigned?'已簽收':'待簽'}</span>
        <span style="font-size:12px;color:var(--muted);margin-left:8px">接班：</span>${avatarEl(s.toUserId,20)}<span style="font-size:12px">${esc(userName(s.toUserId))}</span>
        <span class="sign-chip ${s.toSigned?'sign-done':'sign-pending'}"><span class="sign-dot"></span>${s.toSigned?'已簽收':'待簽'}</span>
        ${canSign?`<button class="btn-sm primary" style="margin-left:auto" onclick="signShift('${s.id}')">✓ 簽收確認</button>`:''}
      </div>
    </div>`;
  }).join('');
  c.innerHTML=html||'<div style="text-align:center;padding:40px;color:var(--faint);font-size:13px">尚無交班紀錄</div>';
}
function signShift(id){
  const s=store.shifts.find(x=>x.id===id);if(!s)return;
  s.toSigned=true;saveStore();renderShiftList();
}
function openNewShift(){
  const nurseOpts=store.users.filter(u=>u.status!=='disabled'&&u.status!=='resigned').map(u=>`<option value="${u.id}">${esc(u.name)} (${esc(userDept(u.id))})</option>`).join('');
  showModal('新增交班紀錄',`
    <div class="form-row"><label>病房/單位</label><input id="shUnit" placeholder="例：內科 3A 病房"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-row"><label>日期</label><input id="shDate" type="date" value="${today()}"></div>
      <div class="form-row"><label>班別</label><select id="shShift"><option value="morning">早班</option><option value="afternoon">午班</option><option value="night">夜班</option></select></div>
      <div class="form-row"><label>交班人</label><select id="shFrom">${nurseOpts}</select></div>
      <div class="form-row"><label>接班人</label><select id="shTo">${nurseOpts}</select></div>
    </div>
    <div class="form-row"><label>病患狀況</label><textarea id="shPatients" placeholder="目前收治人數、特殊狀況..."></textarea></div>
    <div class="form-row"><label>本班重要事件</label><textarea id="shEvents" placeholder="異常事件、病患警示..."></textarea></div>
    <div class="form-row"><label>待辦事項</label><textarea id="shPending" placeholder="未完成項目、需交接事項..."></textarea></div>
    <div class="form-row"><label>用藥注意</label><input id="shMeds" placeholder="藥物異常、庫存不足..."></div>
    <div class="form-row"><label>待辦清單 <span style="font-weight:400;color:var(--faint)">（每行一項，接班人可逐項勾選）</span></label><textarea id="shChecklist" style="min-height:80px" placeholder="每行輸入一個待辦項目&#10;例：床位 312 換藥&#10;例：檢查胰島素庫存"></textarea></div>
  </div>`,saveShift);
}
function saveShift(){
  const unit=document.getElementById('shUnit').value.trim();if(!unit)return;
  const clRaw=(document.getElementById('shChecklist').value||'').split('\n').map(function(l){return l.trim();}).filter(Boolean);
  const checklist=clRaw.map(function(text){return{id:uid(),text:text,done:false};});
  store.shifts.unshift({
    id:uid(),unit,date:document.getElementById('shDate').value,
    shift:document.getElementById('shShift').value,
    fromUserId:document.getElementById('shFrom').value,
    toUserId:document.getElementById('shTo').value,
    patients:document.getElementById('shPatients').value,
    keyEvents:document.getElementById('shEvents').value,
    pending:document.getElementById('shPending').value,
    meds:document.getElementById('shMeds').value,
    checklist:checklist,
    fromSigned:true,toSigned:false,createdAt:today()+' '+nowTime()
  });
  saveStore();closeModal();renderShiftList();
}
function toggleChecklistItem(shiftId,itemId,done){
  const s=store.shifts.find(function(x){return x.id===shiftId;});if(!s||!s.checklist)return;
  const item=s.checklist.find(function(x){return x.id===itemId;});if(item)item.done=done;
  saveStore();renderShiftList();
}

