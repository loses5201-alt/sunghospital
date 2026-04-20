// ════ 科別管理 ════
// DEPARTMENTS & USERS
// ══════════════════════════════════════════
function renderDepartmentsPage(c){
  c.innerHTML=`<div class="admin-layout">
    <div class="main-header"><div><h1>科別管理</h1><div class="main-header-meta">醫院科別 · 病房架構</div></div>
      <button class="btn-sm primary" onclick="openAddDept()">＋ 新增科別</button>
    </div>
    <div class="admin-content" id="deptContent"></div>
  </div>`;
  renderDeptContent();
}
function renderDeptContent(){
  const c=document.getElementById('deptContent');if(!c)return;
  const cards=store.departments.map(d=>{
    const members=store.users.filter(u=>u.deptId===d.id);
    const mHtml=members.map(u=>`<div class="member-mini">${avatarEl(u.id,20)}<span>${esc(u.name)}</span><span class="title-chip">${esc(u.title||'')}</span></div>`).join('');
    return`<div class="dept-card">
      <div class="dept-card-name">${esc(d.name)}</div>
      <div class="dept-card-meta">${members.length} 位成員</div>
      <div style="margin-top:10px;border-top:1px solid var(--b1);padding-top:8px">${mHtml||'<span style="font-size:12px;color:var(--faint)">尚無成員</span>'}</div>
      <div class="dept-card-actions">
        <button class="btn-ghost" style="padding:5px 10px;border-radius:var(--radius-sm);border:1px solid var(--b2);background:transparent;color:var(--muted);font-size:12px;font-family:inherit;cursor:pointer" onclick="openEditDept('${d.id}')">編輯</button>
        <button class="btn-ghost" style="padding:5px 10px;border-radius:var(--radius-sm);border:1px solid var(--b2);background:transparent;color:var(--red);font-size:12px;font-family:inherit;cursor:pointer" onclick="deleteDept('${d.id}')">刪除</button>
      </div>
    </div>`;
  }).join('');
  c.innerHTML=`<div class="sec-label">科別列表（${store.departments.length}）</div><div class="card-grid">${cards}</div>`;
}
function openAddDept(){showModal('新增科別',`<div class="form-row"><label>科別名稱</label><input id="deptName" placeholder="例：內科部"></div>`,()=>{const n=document.getElementById('deptName').value.trim();if(!n)return;store.departments.push({id:uid(),name:n});logAudit('新增科別', n);saveStore();closeModal();renderDeptContent();});}
function openEditDept(id){const d=store.departments.find(x=>x.id===id);showModal('編輯科別',`<div class="form-row"><label>科別名稱</label><input id="deptName" value="${esc(d.name)}"></div>`,()=>{const n=document.getElementById('deptName').value.trim();if(!n)return;d.name=n;logAudit('編輯科別', n);saveStore();closeModal();renderDeptContent();});}
function deleteDept(id){const m=store.users.filter(u=>u.deptId===id);if(m.length&&!confirm(`此科別有 ${m.length} 位成員，確定刪除？`))return;const dd=store.departments.find(x=>x.id===id);store.departments=store.departments.filter(x=>x.id!==id);store.users.forEach(u=>{if(u.deptId===id)u.deptId='';});logAudit('刪除科別', dd?dd.name:'');saveStore();renderDeptContent();}

