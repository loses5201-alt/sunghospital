// ════ 人員管理 ════
var usersTabState='users';
function renderUsersPage(c){
  c.innerHTML=`<div class="admin-layout">
    <div class="main-header">
      <div><h1>⚙️ 系統管理</h1><div class="main-header-meta">人員 · 稽核日誌 · 系統統計</div></div>
      <div class="header-actions">
        <button class="btn-sm" onclick="backupData()" title="下載資料備份">📥 備份</button>
        <button class="btn-sm" onclick="restoreData()" title="從備份檔還原">📤 還原</button>
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
const JOBTYPES={nurse:'護理師',doctor:'醫師',admin:'行政',it:'IT',other:'其他','':('')};
const STATUSLBLS={active:'在職',disabled:'停用',resigned:'離職'};
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
    const permsHtml=u.role!=='admin'&&u.permissions
      ?[['approveForm','簽核'],['manageSchedule','排班'],['publishAnn','公告'],['manageIR','事件'],['viewReports','報表'],['exportData','匯出']].filter(([k])=>u.permissions[k]).map(([,l])=>`<span class="perm-tag">${l}</span>`).join(''):'';
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
      <td><div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center"><span class="role-badge ${u.role==='admin'?'rb-admin':'rb-member'}">${u.role==='admin'?'管理員':'一般'}</span>${stBadge}${permsHtml}</div></td>
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
function userFormHtml(u){
  const dOpts=store.departments.map(d=>`<option value="${d.id}" ${u&&u.deptId===d.id?'selected':''}>${esc(d.name)}</option>`).join('');
  const tOpts=store.titles.map(t=>`<option ${u&&u.title===t?'selected':''}>${esc(t)}</option>`).join('');
  const avOpts=AVCOLORS.map((av,i)=>`<option value="${av}" ${u&&u.avatar===av?'selected':''}>\u984f\u8272 ${i+1}</option>`).join('');
  const p=u&&u.permissions?u.permissions:{};
  const permDefs=[
    {k:'approveForm', l:'\u5be9\u6838\u7c3d\u6838\u55ae', desc:'\u53ef\u6838\u51c6\u6216\u99b3\u56de\u4ed6\u4eba\u7684\u7533\u8acb\u55ae\uff0c\u4e26\u51fa\u73fe\u5728\u7c3d\u6838\u4eba\u9078\u55ae\u4e2d'},
    {k:'manageSchedule', l:'\u7ba1\u7406\u6392\u73ed', desc:'\u53ef\u7de8\u8f2f\u5024\u73ed\u8868\u53ca\u8655\u7406\u63db\u73ed\u7533\u8acb'},
    {k:'publishAnn', l:'\u767c\u5e03/\u7ba1\u7406\u516c\u544a', desc:'\u53ef\u65b0\u589e\u3001\u522a\u9664\u3001\u7f6e\u9802\u516c\u544a\u53ca\u767c\u51fa\u7dca\u6025\u5ee3\u64ad'},
    {k:'manageIR', l:'\u7ba1\u7406\u4e8b\u4ef6\u901a\u5831', desc:'\u53ef\u66f4\u65b0\u4e8b\u4ef6\u901a\u5831\u7684\u8655\u7406\u72c0\u614b'},
    {k:'viewReports', l:'\u67e5\u770b\u5831\u8868', desc:'\u53ef\u6aa2\u8996\u7d71\u8a08\u5831\u8868\u9801\u9762'},
    {k:'exportData', l:'\u5319\u51fa\u8cc7\u6599', desc:'\u53ef\u5319\u51fa CSV \u8868\u55ae\u548c\u73ed\u8868'},
  ];
  const permHtml=permDefs.map(pd=>
    `<label style="display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-radius:var(--radius-sm);border:1px solid var(--b1);cursor:pointer;background:var(--surface)">
      <input type="checkbox" id="perm_${pd.k}" ${p[pd.k]?'checked':''} style="margin-top:2px;accent-color:#c4527a;width:15px;height:15px;flex-shrink:0">
      <div><div style="font-size:13px;font-weight:600">${pd.l}</div><div style="font-size:11px;color:var(--faint);margin-top:1px">${pd.desc}</div></div>
    </label>`
  ).join('');
  return`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    <div class="form-row"><label>\u59d3\u540d</label><input id="uName" value="${esc(u?.name||'')}"></div>
    <div class="form-row"><label>\u5e33\u865f</label><input id="uUsername" value="${esc(u?.username||'')}"></div>
    <div class="form-row"><label>\u5bc6\u78bc ${u?'\uff08\u7559\u7a7a\u4e0d\u6539\uff09':''}</label><input id="uPassword" type="password" placeholder="${u?'\u7559\u7a7a\u7dad\u6301':'\u8a2d\u5b9a\u5bc6\u78bc'}"></div>
    <div class="form-row"><label>\u982d\u50cf\u984f\u8272</label><select id="uAvatar">${avOpts}</select></div>
    <div class="form-row"><label>\u79d1\u5225</label><select id="uDept"><option value="">\uff08\u7121\uff09</option>${dOpts}</select></div>
    <div class="form-row"><label>\u8077\u7a31</label><select id="uTitle"><option value="">\uff08\u7121\uff09</option>${tOpts}</select></div>
    <div class="form-row"><label>\u89d2\u8272</label><select id="uRole"><option value="member" ${u?.role==='member'?'selected':''}>\u4e00\u822c\u6210\u54e1</option><option value="admin" ${u?.role==='admin'?'selected':''}>\u7ba1\u7406\u54e1</option></select></div>
    <div class="form-row"><label>\u8077\u985e</label><select id="uJobType"><option value="">（無）</option><option value="nurse" ${u?.jobType==='nurse'?'selected':''}>\u8b77\u7406\u5e2b</option><option value="doctor" ${u?.jobType==='doctor'?'selected':''}>\u91ab\u5e2b</option><option value="admin" ${u?.jobType==='admin'?'selected':''}>\u884c\u653f</option><option value="it" ${u?.jobType==='it'?'selected':''}>IT</option><option value="other" ${u?.jobType==='other'?'selected':''}>\u5176\u4ed6</option></select></div>
    <div class="form-row"><label>\u5e33\u865f\u72c0\u614b</label><select id="uStatus"><option value="active" ${(u?.status||'active')==='active'?'selected':''}>\u5728\u8077</option><option value="disabled" ${u?.status==='disabled'?'selected':''}>\u505c\u7528</option><option value="resigned" ${u?.status==='resigned'?'selected':''}>\u96e2\u8077</option></select></div>
    <div class="form-row"><label>\u5230\u8077\u65e5\u671f</label><input id="uJoinDate" type="date" value="${u?.joinDate||''}"></div>
  </div>
  <div class="form-row"><label>\u5099\u8a3b\uff08IT \u8a3b\u8a18\uff09</label><textarea id="uNote" style="min-height:60px" placeholder="\u5185\u90e8\u5099\u8a3b\u3001\u8a2d\u5099\u5e33\u865f\u7b49...">${esc(u?.note||'')}</textarea></div>
  <div style="margin-top:14px">
    <div style="font-size:12px;font-weight:700;color:#c4527a;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">\u529f\u80fd\u6b0a\u9650</div>
    <div style="display:flex;flex-direction:column;gap:7px">${permHtml}</div>
    <div style="font-size:11px;color:var(--faint);margin-top:8px">\u7ba1\u7406\u54e1\u81ea\u52d5\u64c1\u6709\u5168\u90e8\u6b0a\u9650\uff0c\u4ee5\u4e0b\u8a2d\u5b9a\u50c5\u9069\u7528\u4e00\u822c\u6210\u54e1</div>
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
  const perms={approveForm:!!document.getElementById('perm_approveForm')?.checked,manageSchedule:!!document.getElementById('perm_manageSchedule')?.checked,publishAnn:!!document.getElementById('perm_publishAnn')?.checked,manageIR:!!document.getElementById('perm_manageIR')?.checked,viewReports:!!document.getElementById('perm_viewReports')?.checked,exportData:!!document.getElementById('perm_exportData')?.checked};
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
    if(u.permissions.viewReports===undefined)u.permissions.viewReports=false;
    if(u.permissions.exportData===undefined)u.permissions.exportData=false;
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
    if(u.permissions.viewReports===undefined)u.permissions.viewReports=false;
    if(u.permissions.exportData===undefined)u.permissions.exportData=false;
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
