// ════ 人員管理 ════
var usersTabState='users';
function renderUsersPage(c){
  c.innerHTML=`<div class="admin-layout">
    <div class="main-header">
      <div><h1>⚙️ 系統管理</h1><div class="main-header-meta">人員 · 稽核日誌 · 系統統計</div></div>
      <div class="header-actions">
        <button class="btn-sm" onclick="backupData()" title="下載資料備份">📥 備份</button>
        <button class="btn-sm" onclick="restoreData()" title="從備份檔還原">📤 還原</button>
        <button class="btn-sm" onclick="loadSampleData()" title="載入範例資料（會覆蓋現有資料）" style="background:#f5e6ff;color:#7a35a0;border-color:#d0a8f0">🎭 範例資料</button>
        <button class="btn-sm primary" onclick="openAddUser()">＋ 新增人員</button>
      </div>
    </div>
    <div class="users-tab-bar">
      <div class="users-tab" id="utab-users" onclick="switchUsersTab('users')">👥 人員管理</div>
      <div class="users-tab" id="utab-audit" onclick="switchUsersTab('audit')">📋 稽核日誌</div>
      <div class="users-tab" id="utab-stats" onclick="switchUsersTab('stats')">📊 系統統計</div>
    </div>
    <div class="admin-content" id="usersTabContent"></div>
    <div id="backupLog" style="padding:0 20px 20px"></div>
  </div>`;
  switchUsersTab(usersTabState);
}
function switchUsersTab(tab){
  usersTabState=tab;
  document.querySelectorAll('.users-tab').forEach(function(t){t.classList.remove('active');});
  var el=document.getElementById('utab-'+tab);if(el)el.classList.add('active');
  var c=document.getElementById('usersTabContent');if(!c)return;
  if(tab==='users'){renderUserContent();}
  else if(tab==='audit'){renderAuditTab(c);}
  else if(tab==='stats'){renderUserStats(c);}
}
var userFilter={q:'',dept:'',status:'',jobType:''};
const JOBTYPES={
  '':'',
  nurse:'護理師',
  doctor:'醫師',
  admin:'行政',
  admin_finance:'行政-財務',
  admin_hr:'行政-人事',
  admin_purchase:'行政-採購',
  admin_general:'行政-總務',
  admin_it:'行政-資訊',
  admin_warehouse:'行政-倉管',
  it:'IT（資訊）',
  other:'其他'
};
const STATUSLBLS={active:'在職',disabled:'停用',resigned:'離職'};
const ROLELABELS={admin:'管理員',supervisor:'主管',member:'一般'};

// ── 全功能權限定義 ──
var PERMISSION_DEFS=[
  {section:'病患管理',items:[
    {k:'viewPatients',  l:'查看病患看板',  desc:'可查看病患資訊與產房狀態'},
    {k:'editPatients',  l:'管理病患資料',  desc:'可新增、編輯、辦理出院'},
  ]},
  {section:'排班管理',items:[
    {k:'viewSchedule',   l:'查看排班',          desc:'可查看本週值班表'},
    {k:'manageSchedule', l:'管理排班/審核換班',  desc:'可編輯值班表及核准換班申請'},
  ]},
  {section:'請假管理',items:[
    {k:'applyLeave',   l:'申請請假',  desc:'可提出請假申請'},
    {k:'approveLeave', l:'審核請假',  desc:'可核准或駁回他人的請假申請'},
  ]},
  {section:'表單簽核',items:[
    {k:'applyForm',   l:'申請表單',       desc:'可提出加班、物品採購等申請單'},
    {k:'approveForm', l:'審核/簽核表單',  desc:'可核准或駁回申請單，並出現在簽核人選單中'},
  ]},
  {section:'公告管理',items:[
    {k:'publishAnn', l:'發布/管理公告',  desc:'可新增、刪除、置頂公告及發出緊急廣播'},
  ]},
  {section:'庫存管理',items:[
    {k:'viewInventory',   l:'查看庫存',  desc:'可查看庫存品項與數量'},
    {k:'manageInventory', l:'管理庫存',  desc:'可新增、調整、盤點庫存'},
  ]},
  {section:'事件通報',items:[
    {k:'reportIR', l:'通報事件',      desc:'可提交異常事件通報'},
    {k:'manageIR', l:'管理事件通報',  desc:'可更新事件通報的處理狀態'},
  ]},
  {section:'SOP 文件',items:[
    {k:'viewSOP',   l:'查看 SOP',  desc:'可閱讀標準作業程序文件'},
    {k:'manageSOP', l:'管理 SOP',  desc:'可新增、編輯、刪除 SOP 文件'},
  ]},
  {section:'技能矩陣',items:[
    {k:'viewSkills',   l:'查看技能矩陣',  desc:'可查看人員技能評估'},
    {k:'manageSkills', l:'管理技能矩陣',  desc:'可更新技能評估與技能定義'},
  ]},
  {section:'報表匯出',items:[
    {k:'viewReports', l:'查看報表',  desc:'可檢視統計報表頁面'},
    {k:'exportData',  l:'匯出資料',  desc:'可匯出 CSV 表單和班表'},
  ]},
];

// ── 職種預設權限 ──
var JOB_TYPE_DEFAULTS={
  doctor:        {viewPatients:1,editPatients:1,viewSchedule:1,applyLeave:1,applyForm:1,reportIR:1,viewSOP:1,viewSkills:1},
  nurse:         {viewPatients:1,editPatients:1,viewSchedule:1,applyLeave:1,applyForm:1,reportIR:1,viewSOP:1,viewInventory:1,viewSkills:1},
  admin:         {applyLeave:1,applyForm:1,viewSchedule:1,publishAnn:1},
  admin_finance: {applyLeave:1,applyForm:1,approveForm:1,viewReports:1,exportData:1},
  admin_hr:      {applyLeave:1,applyForm:1,approveLeave:1,manageSchedule:1,viewReports:1},
  admin_purchase:{applyLeave:1,applyForm:1,approveForm:1,viewInventory:1,manageInventory:1},
  admin_general: {applyLeave:1,applyForm:1,publishAnn:1,viewInventory:1},
  admin_it:      {viewPatients:1,editPatients:1,viewSchedule:1,manageSchedule:1,applyLeave:1,approveLeave:1,applyForm:1,approveForm:1,publishAnn:1,viewInventory:1,manageInventory:1,reportIR:1,manageIR:1,viewSOP:1,manageSOP:1,viewSkills:1,manageSkills:1,viewReports:1,exportData:1},
  admin_warehouse:{applyLeave:1,applyForm:1,viewInventory:1,manageInventory:1},
  it:            {viewPatients:1,editPatients:1,viewSchedule:1,manageSchedule:1,applyLeave:1,approveLeave:1,applyForm:1,approveForm:1,publishAnn:1,viewInventory:1,manageInventory:1,reportIR:1,manageIR:1,viewSOP:1,manageSOP:1,viewSkills:1,manageSkills:1,viewReports:1,exportData:1},
  other:         {applyLeave:1,applyForm:1},
};
function renderUserContent(){
  const c=document.getElementById('usersTabContent');if(!c)return;
  // Filter bar
  const dOpts='<option value="">全部科別</option>'+store.departments.map(d=>'<option value="'+d.id+'"'+(userFilter.dept===d.id?' selected':'')+'>'+esc(d.name)+'</option>').join('');
  const stOpts='<option value="">全部狀態</option><option value="active"'+(userFilter.status==='active'?' selected':'')+'>在職</option><option value="disabled"'+(userFilter.status==='disabled'?' selected':'')+'>停用</option><option value="resigned"'+(userFilter.status==='resigned'?' selected':'')+'>離職</option>';
  const jtOpts='<option value="">全部職類</option><option value="nurse">護理師</option><option value="doctor">醫師</option><option value="admin">行政</option><option value="it">IT</option><option value="other">其他</option>';
  const filterBar=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
    <input id="uSearch" placeholder="🔍 搜尋姓名/帳號" oninput="userFilter.q=this.value;renderUserContent()" value="${esc(userFilter.q)}" style="padding:7px 10px;border:1px solid var(--b1);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);font-size:12px;font-family:inherit;min-width:150px">
    <select onchange="userFilter.dept=this.value;renderUserContent()" style="padding:7px 10px;border:1px solid var(--b1);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);font-size:12px;font-family:inherit">${dOpts}</select>
    <select onchange="userFilter.status=this.value;renderUserContent()" style="padding:7px 10px;border:1px solid var(--b1);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);font-size:12px;font-family:inherit">${stOpts}</select>
    <select onchange="userFilter.jobType=this.value;renderUserContent()" style="padding:7px 10px;border:1px solid var(--b1);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);font-size:12px;font-family:inherit">${jtOpts}</select>
    <span style="font-size:11px;color:var(--faint);margin-left:auto">共 ${store.users.filter(u=>u.status!=='disabled'&&u.status!=='resigned').length} 位在職</span>
  </div>`;
  let users=[...store.users];
  if(userFilter.q){const q=userFilter.q.toLowerCase();users=users.filter(u=>u.name.toLowerCase().includes(q)||u.username.toLowerCase().includes(q));}
  if(userFilter.dept)users=users.filter(u=>u.deptId===userFilter.dept);
  if(userFilter.status)users=users.filter(u=>(u.status||'active')===userFilter.status);
  if(userFilter.jobType)users=users.filter(u=>(u.jobType||'')===userFilter.jobType);
  const rows=users.map(u=>{
    const st=u.status||'active';
    const stBadge=`<span class="ustatus-${st}">${STATUSLBLS[st]||st}</span>`;
    const jtLabel=JOBTYPES[u.jobType||'']||'';
    const jtBadge=jtLabel?`<span class="ujobtype-badge">${jtLabel}</span>`:'';
    // 顯示最多5個已啟用的權限標籤（簡稱）
    const PERM_SHORT={viewPatients:'看板',editPatients:'病患',viewSchedule:'排班',manageSchedule:'排班管',applyLeave:'請假',approveLeave:'假審',applyForm:'申請',approveForm:'簽核',publishAnn:'公告',viewInventory:'庫存',manageInventory:'庫管',reportIR:'通報',manageIR:'事件',viewSOP:'SOP',manageSOP:'SOP管',viewSkills:'技能',manageSkills:'技管',viewReports:'報表',exportData:'匯出'};
    const permsHtml=u.role==='admin'?'':(u.role==='supervisor'?'<span class="perm-tag" style="background:#f0e0f8;color:#8a40a0">主管審核</span>':
      (u.permissions?Object.keys(u.permissions).filter(k=>u.permissions[k]&&PERM_SHORT[k]).slice(0,5).map(k=>`<span class="perm-tag">${PERM_SHORT[k]}</span>`).join(''):''));
    const btns=u.id===currentUser.id
      ?'<span style="font-size:11px;color:var(--faint);padding:5px 6px">本人</span>'
      :`<button class="btn-sm" onclick="openEditUser('${u.id}')">編輯</button>
        ${st==='active'?`<button class="btn-sm" onclick="setUserStatus('${u.id}','disabled')" title="停用帳號">停用</button>`:`<button class="btn-sm" onclick="setUserStatus('${u.id}','active')" title="重新啟用">啟用</button>`}
        ${st!=='resigned'?`<button class="btn-sm" onclick="setUserStatus('${u.id}','resigned')" title="標記離職">離職</button>`:''}
        <button class="btn-sm danger" onclick="deleteUser('${u.id}')">刪除</button>`;
    return`<tr style="${st!=='active'?'opacity:.55':''}">
      <td><div style="display:flex;align-items:center;gap:9px">${avatarEl(u.id,28)}<div><div style="font-size:13px;font-weight:500">${esc(u.name)}</div><div style="font-size:11px;color:var(--faint)">@${esc(u.username)}${u.joinDate?' · 到職:'+fmtDate(u.joinDate):''}</div></div></div></td>
      <td>${u.deptId?`<span class="dept-chip">${esc(userDept(u.id))}</span>`:'—'}${jtBadge}</td>
      <td>${u.title?`<span class="title-chip">${esc(u.title)}</span>`:'—'}</td>
      <td><div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center"><span class="role-badge ${u.role==='admin'?'rb-admin':u.role==='supervisor'?'rb-supervisor':'rb-member'}">${ROLELABELS[u.role]||'一般'}</span>${stBadge}${permsHtml}</div></td>
      <td><div style="display:flex;gap:4px;flex-wrap:wrap">${btns}</div></td>
    </tr>`;
  }).join('');
  c.innerHTML=filterBar+`<div class="table-wrap"><table><thead><tr><th>姓名/帳號</th><th>科別/職類</th><th>職稱</th><th>角色/狀態/權限</th><th>操作</th></tr></thead><tbody>${rows||'<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--faint)">無符合的人員</td></tr>'}</tbody></table></div>`;
}
function setUserStatus(id,status){
  const u=store.users.find(function(x){return x.id===id;});if(!u)return;
  const lbls={active:'啟用',disabled:'停用',resigned:'標記離職'};
  if(!confirm('確定'+lbls[status]+'此帳號？'))return;
  u.status=status;
  logAudit('狀態變更',u.name+' → '+STATUSLBLS[status]);
  saveStore();renderUserContent();
  showToast(STATUSLBLS[status],u.name,status==='active'?'✅':'⚠️');
}
function onRoleChange(sel){
  var ps=document.getElementById('permSection');
  var sn=document.getElementById('supervisorNote');
  if(ps)ps.style.display=sel.value==='admin'?'none':'';
  if(sn)sn.style.display=sel.value==='supervisor'?'':'none';
}
function applyJobTypeDefaults(){
  var jt=document.getElementById('uJobType').value;
  var defs=JOB_TYPE_DEFAULTS[jt]||{};
  PERMISSION_DEFS.forEach(function(sec){sec.items.forEach(function(pd){var el=document.getElementById('perm_'+pd.k);if(el)el.checked=!!(defs[pd.k]);});});
}
function copyPermsFrom(uid){
  if(!uid)return;
  var src=store.users.find(function(x){return x.id===uid;});
  if(!src||!src.permissions)return;
  PERMISSION_DEFS.forEach(function(sec){sec.items.forEach(function(pd){var el=document.getElementById('perm_'+pd.k);if(el)el.checked=!!(src.permissions[pd.k]);});});
  var sel=document.getElementById('copyFromUser');if(sel)sel.value='';
  showToast('已複製','來自 '+esc(src.name),'📋');
}
function userFormHtml(u){
  const dOpts=store.departments.map(d=>`<option value="${d.id}" ${u&&u.deptId===d.id?'selected':''}>${esc(d.name)}</option>`).join('');
  const tOpts=store.titles.map(t=>`<option ${u&&u.title===t?'selected':''}>${esc(t)}</option>`).join('');
  const avOpts=AVCOLORS.map((av,i)=>`<option value="${av}" ${u&&u.avatar===av?'selected':''}>顏色 ${i+1}</option>`).join('');
  const p=u&&u.permissions?u.permissions:{};
  const curRole=u?(u.role||'member'):'member';
  const isAdminRole=curRole==='admin';
  const isSvRole=curRole==='supervisor';

  // 每個 section 的 checkbox 區塊
  const permSections=PERMISSION_DEFS.map(sec=>{
    const items=sec.items.map(pd=>
      `<label style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;cursor:pointer">
        <input type="checkbox" id="perm_${pd.k}" ${p[pd.k]?'checked':''} style="margin-top:3px;accent-color:#c4527a;width:14px;height:14px;flex-shrink:0">
        <div><div style="font-size:12px;font-weight:600">${pd.l}</div><div style="font-size:10px;color:var(--faint);margin-top:1px">${pd.desc}</div></div>
      </label>`
    ).join('');
    return `<div style="border:1px solid var(--b1);border-radius:8px;padding:10px 12px;background:var(--surface)">
      <div style="font-size:10px;font-weight:700;color:#c4527a;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;padding-bottom:5px;border-bottom:1px solid var(--b1)">${sec.section}</div>
      ${items}
    </div>`;
  }).join('');

  // 複製來源選項
  const copyOpts=store.users
    .filter(x=>x.id!==(u&&u.id)&&x.role!=='admin')
    .map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');

  return`
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
    <div class="form-row"><label>姓名</label><input id="uName" value="${esc(u?.name||'')}"></div>
    <div class="form-row"><label>帳號</label><input id="uUsername" value="${esc(u?.username||'')}"></div>
    <div class="form-row"><label>密碼${u?' （留空不改）':''}</label><input id="uPassword" type="password" placeholder="${u?'留空維持原密碼':'設定密碼'}"></div>
    <div class="form-row"><label>頭像顏色</label><select id="uAvatar">${avOpts}</select></div>
    <div class="form-row"><label>科別</label><select id="uDept"><option value="">（無）</option>${dOpts}</select></div>
    <div class="form-row"><label>職稱</label><select id="uTitle"><option value="">（無）</option>${tOpts}</select></div>
    <div class="form-row"><label>角色</label>
      <select id="uRole" onchange="onRoleChange(this)">
        <option value="member" ${curRole==='member'?'selected':''}>一般成員</option>
        <option value="supervisor" ${isSvRole?'selected':''}>主管（可審核簽核）</option>
        <option value="admin" ${isAdminRole?'selected':''}>管理員（全部權限）</option>
      </select>
    </div>
    <div class="form-row"><label>職類</label>
      <select id="uJobType">
        <option value="">（未指定）</option>
        <option value="nurse"           ${u?.jobType==='nurse'?'selected':''}>護理師</option>
        <option value="doctor"          ${u?.jobType==='doctor'?'selected':''}>醫師</option>
        <option value="admin"           ${u?.jobType==='admin'?'selected':''}>行政</option>
        <option value="admin_finance"   ${u?.jobType==='admin_finance'?'selected':''}>行政-財務</option>
        <option value="admin_hr"        ${u?.jobType==='admin_hr'?'selected':''}>行政-人事</option>
        <option value="admin_purchase"  ${u?.jobType==='admin_purchase'?'selected':''}>行政-採購</option>
        <option value="admin_general"   ${u?.jobType==='admin_general'?'selected':''}>行政-總務</option>
        <option value="admin_it"        ${u?.jobType==='admin_it'?'selected':''}>行政-資訊</option>
        <option value="admin_warehouse" ${u?.jobType==='admin_warehouse'?'selected':''}>行政-倉管</option>
        <option value="it"              ${u?.jobType==='it'?'selected':''}>IT（資訊）</option>
        <option value="other"           ${u?.jobType==='other'?'selected':''}>其他</option>
      </select>
    </div>
    <div class="form-row"><label>帳號狀態</label>
      <select id="uStatus">
        <option value="active"   ${(u?.status||'active')==='active'?'selected':''}>在職</option>
        <option value="disabled" ${u?.status==='disabled'?'selected':''}>停用</option>
        <option value="resigned" ${u?.status==='resigned'?'selected':''}>離職</option>
      </select>
    </div>
    <div class="form-row"><label>到職日期</label><input id="uJoinDate" type="date" value="${u?.joinDate||''}"></div>
  </div>
  <div class="form-row" style="margin-bottom:14px"><label>備註</label>
    <textarea id="uNote" style="min-height:55px" placeholder="內部備註、設備帳號等...">${esc(u?.note||'')}</textarea>
  </div>
  <div id="permSection" style="${isAdminRole?'display:none':''}">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
      <div style="font-size:12px;font-weight:700;color:#c4527a;text-transform:uppercase;letter-spacing:.08em;flex:1">功能權限</div>
      <button type="button" class="btn-xs" onclick="applyJobTypeDefaults()" title="根據職類帶入預設勾選">套用職種預設</button>
      <select id="copyFromUser" onchange="copyPermsFrom(this.value)"
        style="font-size:11px;padding:4px 8px;border:1px solid var(--b1);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);font-family:inherit;cursor:pointer">
        <option value="">複製自...</option>${copyOpts}
      </select>
    </div>
    <div id="supervisorNote" style="${isSvRole?'':'display:none;'}padding:8px 12px;background:#fff3f8;border:1px solid #f0c0d0;border-radius:8px;font-size:12px;color:#9a4060;margin-bottom:10px">
      主管自動擁有 <strong>審核請假、審核/簽核表單、管理排班換班</strong>，以下可額外賦予其他功能
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${permSections}</div>
    <div style="font-size:11px;color:var(--faint);margin-top:8px">管理員自動擁有全部權限；主管自動擁有審核相關權限；以下設定適用一般成員與主管</div>
  </div>`;
}
let editingUserId=null;
function openAddUser(){editingUserId=null;showModal('新增人員',userFormHtml(null),saveUser);}
function openEditUser(id){editingUserId=id;const u=store.users.find(x=>x.id===id);showModal('編輯人員',userFormHtml(u),saveUser);}
function saveUser(){
  const name=document.getElementById('uName').value.trim();
  const username=document.getElementById('uUsername').value.trim();
  const password=document.getElementById('uPassword').value;
  if(!name||!username){alert('姓名和帳號為必填');return;}
  if(store.users.find(u=>u.username===username&&u.id!==editingUserId)){alert('帳號已被使用');return;}
  // 收集全部 PERMISSION_DEFS 中的勾選狀態
  const perms={};
  PERMISSION_DEFS.forEach(function(sec){sec.items.forEach(function(pd){var el=document.getElementById('perm_'+pd.k);perms[pd.k]=!!(el&&el.checked);});});
  const data={name,username,deptId:document.getElementById('uDept').value,title:document.getElementById('uTitle').value,role:document.getElementById('uRole').value,avatar:document.getElementById('uAvatar').value,permissions:perms,jobType:document.getElementById('uJobType')?.value||'',status:document.getElementById('uStatus')?.value||'active',joinDate:document.getElementById('uJoinDate')?.value||'',note:document.getElementById('uNote')?.value||''};
  if(editingUserId){
    const u=store.users.find(x=>x.id===editingUserId);
    Object.assign(u,data);if(password)u.password=password;
    if(u.id===currentUser.id){currentUser=u;updateNavUser();}
    logAudit('編輯人員', data.name + '（@' + data.username + '）');
  } else {
    if(!password){alert('請設定密碼');return;}
    store.users.push({id:uid(),...data,password});
    logAudit('新增人員', data.name + '（@' + data.username + '）');
  }
  saveStore();closeModal();renderUserContent();
}
function deleteUser(id){if(!confirm('確定刪除此人員？'))return;const du=store.users.find(x=>x.id===id);store.users=store.users.filter(x=>x.id!==id);logAudit('刪除人員', du?du.name:'');saveStore();renderUserContent();}

// ══════════════════════════════════════════
// CHANGE PASSWORD
// ══════════════════════════════════════════
function openChangePassword(){
  document.getElementById('profileMenu').classList.remove('open');
  showModal('修改密碼',`<div class="form-row"><label>舊密碼</label><input id="oldPass" type="password"></div>
    <div class="form-row"><label>新密碼</label><input id="newPass" type="password"></div>
    <div class="form-row"><label>確認新密碼</label><input id="confirmPass" type="password"></div>`,
  ()=>{
    const old=document.getElementById('oldPass').value;
    const nw=document.getElementById('newPass').value;
    const conf=document.getElementById('confirmPass').value;
    if(currentUser.password!==old){alert('舊密碼錯誤');return;}
    if(nw!==conf){alert('兩次密碼不一致');return;}
    if(nw.length<4){alert('密碼至少4碼');return;}
    currentUser.password=nw;const u=store.users.find(x=>x.id===currentUser.id);if(u)u.password=nw;
    saveStore();closeModal();alert('密碼已更新');
  });
}

// ══════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════
let modalSaveFn=null;
function showModal(title,bodyHtml,onSave){
  modalSaveFn=onSave;
  document.getElementById('modalContent').innerHTML=`<h2>${esc(title)}</h2>${bodyHtml}
    <div class="modal-footer">
      <button class="btn-cancel" onclick="closeModal()">取消</button>
      <button class="btn-save" onclick="if(modalSaveFn)modalSaveFn()">儲存</button>
    </div>`;
  document.getElementById('overlay').classList.add('open');
}
function closeModal(){document.getElementById('overlay').classList.remove('open');}
document.getElementById('overlay').onclick=function(e){if(e.target===this)closeModal();};

function hideSidebar(){const sb=document.getElementById('sidebar');if(sb)sb.style.display='none';}

// 新功能預設資料
function dBabies(){return [
  {id:'b1',name:'小睿寶',gender:'boy',weight:'3.2kg',height:'50cm',born:today()+' 06:22',mom:'床位 301',nurse:'u3',note:'順產，母嬰均安！',emoji:'👶'},
  {id:'b2',name:'小希寶',gender:'girl',weight:'2.9kg',height:'48cm',born:today()+' 09:15',mom:'床位 308',nurse:'u6',note:'母嬰平安！',emoji:'🌸'},
];}
function dRooms(){return [
  {id:'r1',name:'產房 A',status:'active',patient:'張○○',since:'09:15',note:'第一胎，38週'},
  {id:'r2',name:'產房 B',status:'recovery',patient:'林○○',since:'07:30',note:'剖腹產後恢復'},
  {id:'r3',name:'產房 C',status:'waiting',patient:'王○○',since:'10:45',note:'宮縮5分鐘一次'},
  {id:'r4',name:'產房 D',status:'empty',patient:'',since:'',note:''},
  {id:'r5',name:'LDR 1',status:'waiting',patient:'陳○○',since:'08:20',note:'待產觀察中'},
  {id:'r6',name:'LDR 2',status:'empty',patient:'',since:'',note:''},
  {id:'r7',name:'手術室 1',status:'clean',patient:'',since:'11:00',note:'清潔中'},
  {id:'r8',name:'恢復室',status:'recovery',patient:'劉○○',since:'06:50',note:'生產後觀察'},
];}
function dForms(){return [
  {id:'f1',type:'leave',title:'特休假申請 4/15',applicantId:'u3',date:today(),startDate:'2026-04-15',endDate:'2026-04-16',reason:'私人事務',approvers:['u2'],statuses:['approved'],status:'approved',createdAt:addD(today(),-1)},
  {id:'f2',type:'overtime',title:'加班申請 本週夜班',applicantId:'u6',date:today(),startDate:today(),endDate:today(),reason:'人力不足',approvers:['u3','u2'],statuses:['approved','pending'],status:'pending',createdAt:today()},
];}
function dJournals(){return [
  {id:'j1',userId:'u3',date:today(),mood:'good',content:'今日護病比正常，308床媽媽哺乳順利。301床寶寶黃疸數值下降，家屬安心許多。',createdAt:today()+' 16:30'},
  {id:'j2',userId:'u6',date:addD(today(),-1),mood:'tired',content:'昨晚夜班比較忙，急產一位，陪產到天亮。媽媽和寶寶都平安，值得！',createdAt:addD(today(),-1)+' 08:10'},
];}
function dEdu(){return [
  {id:'e1',title:'母乳哺餵指南',icon:'🤱',tags:['br'],desc:'含乳姿勢、哺乳頻率、脹奶處理等完整說明。',content:'【正確含乳】寶寶嘴巴應張大含住乳暈，含乳正確時不應感到疼痛。\n\n【哺乳頻率】新生兒每2-3小時哺餵，每次約15-20分鐘，按需哺乳。\n\n【脹奶處理】熱敷後輕柔按摩，讓寶寶頻繁吸吮。\n\n【保存方式】室溫4小時，冷藏3-5天，冷凍3-6個月。'},
  {id:'e2',title:'新生兒日常照護',icon:'👶',tags:['nb'],desc:'臍帶護理、洗澡、黃疸觀察等新生兒照護重點。',content:'【臍帶護理】保持乾燥，每次換尿布後用75%酒精清潔根部。\n\n【黃疸觀察】生理性黃疸7-10天消退，持續加深需就醫。\n\n【洗澡要點】水溫約38度，先臉後身體，保持溫暖。'},
  {id:'e3',title:'產後身心照護',icon:'🌸',tags:['pp'],desc:'傷口照護、惡露觀察、產後憂鬱辨識。',content:'【傷口照護】保持清潔乾燥，有紅腫熱痛立即告知護理師。\n\n【惡露觀察】由紅轉淡黃，約4-6週結束，異味或突增需通報。\n\n【產後憂鬱】持續2週以上情緒低落請主動尋求協助。'},
  {id:'e4',title:'營養與飲食建議',icon:'🥗',tags:['nu'],desc:'哺乳期飲食禁忌、發奶食物、補充營養重點。',content:'【哺乳期】避免辛辣、酒精，多喝溫熱湯品助泌乳。\n\n【發奶食物】豬腳花生湯、黑麻油雞、魚湯均有助泌乳。\n\n【鐵質補充】多攝取菠菜、豬肝、紅肉，搭配維生素C。'},
];}

// ── 表單附件 ──
let _pendingAttachment=null;
function handleAttachment(input){
  const file=input.files[0];
  if(!file){_pendingAttachment=null;document.getElementById('fattachPreview').innerHTML='';return;}
  if(file.size>819200){alert('檔案請勿超過 800 KB，請壓縮後再上傳');input.value='';return;}
  const r=new FileReader();
  r.onload=function(e){
    _pendingAttachment={name:file.name,mime:file.type,data:e.target.result};
    const prev=document.getElementById('fattachPreview');if(!prev)return;
    prev.innerHTML=file.type.startsWith('image/')
      ?'<img src="'+e.target.result+'" style="max-height:72px;max-width:180px;border-radius:6px;border:1px solid var(--b1);margin-top:4px;cursor:pointer" onclick="viewAttachment(\'__preview__\')">'
      :'<span style="font-size:11px;color:var(--muted);margin-top:4px;display:block">📎 '+esc(file.name)+'</span>';
  };
  r.readAsDataURL(file);
}
function viewAttachment(id){
  const f=id==='__preview__'?{attachment:_pendingAttachment}:store.formRequests.find(x=>x.id===id);
  if(!f||!f.attachment)return;
  const a=f.attachment;
  if(!a.mime.startsWith('image/')){
    const link=document.createElement('a');link.href=a.data;link.download=a.name;link.click();
    return;
  }
  // Lightbox
  const lb=document.createElement('div');
  lb.id='imgLightbox';
  lb.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:zoom-out;padding:16px;box-sizing:border-box;animation:lbIn .18s ease';
  lb.innerHTML='<img src="'+a.data+'" style="max-width:95vw;max-height:88vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,.6);user-select:none">'
    +'<div style="margin-top:12px;font-size:12px;color:rgba(255,255,255,.6);pointer-events:none">'+esc(a.name)+'</div>'
    +'<div style="position:absolute;top:16px;right:20px;color:white;font-size:26px;line-height:1;cursor:pointer;opacity:.7" onclick="document.getElementById(\'imgLightbox\').remove()">×</div>';
  lb.onclick=function(e){if(e.target===lb||e.target.tagName==='IMG')lb.remove();};
  document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){lb.remove();document.removeEventListener('keydown',esc);}});
  document.body.appendChild(lb);
}

// mergeNewLocal：補足缺少的欄位，只存 localStorage，不推送到 Firebase
// 在 initApp() 登入後立即呼叫，避免用空的本機資料覆蓋雲端
function mergeNewLocal(){
  if(!store.babies)store.babies=dBabies();
  if(!store.rooms)store.rooms=dRooms();
  if(!store.formRequests)store.formRequests=dForms();
  if(!store.dutySchedule)store.dutySchedule={};
  if(!store.swapRequests)store.swapRequests=[];
  if(!store.journals)store.journals=dJournals();
  if(!store.eduItems)store.eduItems=dEdu();
  if(!store.formNotifs)store.formNotifs=[];
  if(!store.eduReads)store.eduReads={};
  if(!store.messages)store.messages=[];
  if(!store.chatRooms)store.chatRooms=[];
  if(!store.equipment)store.equipment=[];
  store.users.forEach(function(u){
    if(!u.permissions)u.permissions={};
    if(!u.status)u.status='active';
    if(u.jobType===undefined)u.jobType='';
    if(!u.joinDate)u.joinDate='';
    if(!u.note)u.note='';
    if(!u.role)u.role='member';
    // 補足所有新權限鍵（不覆蓋已設定的值）
    PERMISSION_DEFS.forEach(function(sec){sec.items.forEach(function(pd){if(u.permissions[pd.k]===undefined)u.permissions[pd.k]=false;});});
  });
  (store.babies||[]).forEach(function(b){
    if(b.discharged===undefined)b.discharged=false;
    if(!b.dischargeDate)b.dischargeDate='';
  });
  (store.shifts||[]).forEach(function(s){if(!s.checklist)s.checklist=[];});
  (store.meetings||[]).forEach(function(m){
    if(!m.resolutions)m.resolutions=[];
    if(!m.signoff)m.signoff={locked:false,signatures:{}};
  });
  (store.formRequests||[]).forEach(function(f){if(f.urgent===undefined)f.urgent=false;});
  (store.messages||[]).forEach(function(m){
    if(!m.reactions)m.reactions={};
    if(m.deleted===undefined)m.deleted=false;
    if(!m.replyTo)m.replyTo=null;
  });
  (store.chatRooms||[]).forEach(function(r){
    if(r.isGroup===undefined)r.isGroup=false;
    if(!r.groupName)r.groupName='';
  });
  (store.journals||[]).forEach(function(j){
    if(!j.title)j.title='';
    if(!j.category)j.category='chat';
    if(!j.likes)j.likes=[];
    if(!j.comments)j.comments=[];
    if(j.pinned===undefined)j.pinned=false;
    if(!j.image)j.image=null;
    if(j.edited===undefined)j.edited=false;
  });
  try{localStorage.setItem(STORE_KEY,JSON.stringify(store));}catch(e){}
}
// mergeNew：補足欄位後同步到 Firebase
// 只在已確認從雲端讀取資料後呼叫
function mergeNew(){
  if(!store.babies)store.babies=dBabies();
  if(!store.rooms)store.rooms=dRooms();
  if(!store.formRequests)store.formRequests=dForms();
  if(!store.dutySchedule)store.dutySchedule={};
  if(!store.swapRequests)store.swapRequests=[];
  if(!store.journals)store.journals=dJournals();
  if(!store.eduItems)store.eduItems=dEdu();
  if(!store.formNotifs)store.formNotifs=[];
  if(!store.eduReads)store.eduReads={};
  if(!store.messages)store.messages=[];
  if(!store.chatRooms)store.chatRooms=[];
  if(!store.equipment)store.equipment=[];
  store.users.forEach(function(u){
    if(!u.permissions)u.permissions={};
    if(!u.status)u.status='active';
    if(u.jobType===undefined)u.jobType='';
    if(!u.joinDate)u.joinDate='';
    if(!u.note)u.note='';
    if(!u.role)u.role='member';
    // 補足所有新權限鍵（不覆蓋已設定的值）
    PERMISSION_DEFS.forEach(function(sec){sec.items.forEach(function(pd){if(u.permissions[pd.k]===undefined)u.permissions[pd.k]=false;});});
  });
  (store.babies||[]).forEach(function(b){
    if(b.discharged===undefined)b.discharged=false;
    if(!b.dischargeDate)b.dischargeDate='';
  });
  (store.shifts||[]).forEach(function(s){if(!s.checklist)s.checklist=[];});
  (store.meetings||[]).forEach(function(m){
    if(!m.resolutions)m.resolutions=[];
    if(!m.signoff)m.signoff={locked:false,signatures:{}};
  });
  (store.formRequests||[]).forEach(function(f){if(f.urgent===undefined)f.urgent=false;});
  (store.messages||[]).forEach(function(m){
    if(!m.reactions)m.reactions={};
    if(m.deleted===undefined)m.deleted=false;
    if(!m.replyTo)m.replyTo=null;
  });
  (store.chatRooms||[]).forEach(function(r){
    if(r.isGroup===undefined)r.isGroup=false;
    if(!r.groupName)r.groupName='';
  });
  (store.journals||[]).forEach(function(j){
    if(!j.title)j.title='';
    if(!j.category)j.category='chat';
    if(!j.likes)j.likes=[];
    if(!j.comments)j.comments=[];
    if(j.pinned===undefined)j.pinned=false;
    if(!j.image)j.image=null;
    if(j.edited===undefined)j.edited=false;
  });
  saveStore();
  checkNewNotifs();
}

// 寶寶牆
