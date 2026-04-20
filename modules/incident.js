// ════ 異常事件通報 ════
// INCIDENT REPORT
// ══════════════════════════════════════════
function updateIrBadge(){
  if(!currentUser)return;
  const n=store.incidents.filter(i=>i.status==='new').length;
  const b=document.getElementById('badge_ir');if(b)b.style.display=n>0?'flex':'none';
}
const irLevels={1:{label:'Level 1 輕微',cls:'ir-l1'},2:{label:'Level 2 中度',cls:'ir-l2'},3:{label:'Level 3 重大',cls:'ir-l3'},4:{label:'Level 4 嚴重',cls:'ir-l4'}};
function renderIncidentPage(c){
  c.innerHTML=`<div class="admin-layout">
    <div class="main-header">
      <div><h1>異常事件通報</h1><div class="main-header-meta">Incident Report · 追蹤處理進度</div></div>
      <button class="btn-sm primary" onclick="openNewIR()">＋ 新增通報</button>
    </div>
    <div class="admin-content" id="irList"></div>
  </div>`;
  renderIRList();
}
function renderIRList(){
  const c=document.getElementById('irList');if(!c)return;
  const sorted=[...store.incidents].sort((a,b)=>{
    const sw={new:0,processing:1,closed:2};
    return (sw[a.status]||0)-(sw[b.status]||0)||b.date.localeCompare(a.date);
  });
  const html=sorted.map(ir=>{
    const lv=irLevels[ir.level]||irLevels[1];
    const st=ir.status==='new'?'<span class="ir-status ir-new">新通報</span>':ir.status==='processing'?'<span class="ir-status ir-processing">處理中</span>':'<span class="ir-status ir-closed">已結案</span>';
    return`<div class="ir-card ${lv.cls}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;gap:8px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="ir-level ${lv.cls}">${lv.label}</span>${st}
          <span style="font-size:11px;color:var(--faint)">${fmtDate(ir.date)} · ${esc(userDept(ir.reporterId))}</span>
        </div>
        ${hasPerm('manageIR')?`<select class="task-select" onchange="updateIRStatus('${ir.id}',this.value)">
          <option ${ir.status==='new'?'selected':''} value="new">新通報</option>
          <option ${ir.status==='processing'?'selected':''} value="processing">處理中</option>
          <option ${ir.status==='closed'?'selected':''} value="closed">已結案</option>
        </select>`:''}
      </div>
      <div style="font-size:14px;font-weight:600;margin-bottom:8px">${esc(ir.title)}</div>
      <div style="font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:10px">${esc(ir.description)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><div style="font-size:10px;font-weight:700;color:var(--faint);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">已採取行動</div>
          <div style="font-size:12px;color:var(--muted);background:var(--bg);border-radius:var(--radius-sm);padding:8px 10px">${esc(ir.actions)||'—'}</div></div>
        <div><div style="font-size:10px;font-weight:700;color:var(--faint);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">後續追蹤</div>
          <div style="font-size:12px;color:var(--muted);background:var(--bg);border-radius:var(--radius-sm);padding:8px 10px">${esc(ir.followUp)||'—'}</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--b1)">
        ${avatarEl(ir.reporterId,20)}<span style="font-size:12px;color:var(--muted)">通報人：${esc(userName(ir.reporterId))}</span>
      </div>
    </div>`;
  }).join('');
  c.innerHTML=html||'<div style="text-align:center;padding:40px;color:var(--faint);font-size:13px">尚無通報紀錄</div>';
}
function openNewIR(){
  const deptOpts=store.departments.map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join('');
  showModal('新增異常事件通報',`
    <div style="background:var(--amber-bg);border:1px solid #f0d890;border-radius:var(--radius-sm);padding:8px 12px;margin-bottom:12px;font-size:12px;color:var(--amber)">所有通報均為機密，僅管理員與科主任可查閱。</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-row"><label>事件日期</label><input id="irDate" type="date" value="${today()}"></div>
      <div class="form-row"><label>事件等級</label><select id="irLevel">
        <option value="1">Level 1 輕微</option><option value="2">Level 2 中度</option>
        <option value="3">Level 3 重大</option><option value="4">Level 4 嚴重</option>
      </select></div>
    </div>
    <div class="form-row"><label>事件主旨</label><input id="irTitle" placeholder="簡短描述事件性質"></div>
    <div class="form-row"><label>詳細描述</label><textarea id="irDesc" placeholder="事件發生經過、涉及人員..."></textarea></div>
    <div class="form-row"><label>已採取行動</label><textarea id="irActions" placeholder="已做什麼處置..."></textarea></div>
    <div class="form-row"><label>後續追蹤</label><input id="irFollowUp" placeholder="需追蹤或改善事項..."></div>`,saveIR);
}
function saveIR(){
  const title=document.getElementById('irTitle').value.trim();if(!title)return;
  store.incidents.unshift({id:uid(),title,description:document.getElementById('irDesc').value,
    reporterId:currentUser.id,deptId:currentUser.deptId,
    level:document.getElementById('irLevel').value,status:'new',
    date:document.getElementById('irDate').value,
    actions:document.getElementById('irActions').value,
    followUp:document.getElementById('irFollowUp').value});
  saveStore();closeModal();renderIRList();updateIrBadge();
}
function updateIRStatus(id,v){
  const ir=store.incidents.find(x=>x.id===id);if(ir)ir.status=v;
  saveStore();renderIRList();updateIrBadge();
}

