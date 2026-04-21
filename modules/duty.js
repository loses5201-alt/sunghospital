// ════ 值班表 ════
const SHINFO={morning:{l:'早班',c:'sh-m'},afternoon:{l:'午班',c:'sh-a'},night:{l:'夜班',c:'sh-n'},off:{l:'休假',c:'sh-off'}};
const DLBLS=['一','二','三','四','五','六','日'];
function renderDutyPage(c){
  var exportBtn=(isAdmin()||hasPerm('exportData'))?'<button class="btn-sm" onclick="exportDutyCSV()">📥 匯出CSV</button>':'';
  c.innerHTML='<div class="admin-layout"><div class="main-header"><div><h1>📅 值班表</h1><div class="main-header-meta">本週排班 · 換班申請</div></div><div class="header-actions">'+exportBtn+(hasPerm('manageSchedule')?'<button class="btn-sm primary" onclick="openDA()">✏️ 編輯</button>':'')+'</div></div><div class="admin-content" id="dutyC"></div></div>';
  rnDuty();
}
function rnDuty(){
  const c=document.getElementById('dutyC');if(!c)return;
  if(!store.dutySchedule)store.dutySchedule={};
  if(!store.swapRequests)store.swapRequests=[];
  const wk=getWk();
  const nurses=store.users.filter(u=>u.deptId==='d3'||u.deptId==='d5');
  const hdr=wk.map((d,i)=>'<div class="dcell dc-hd">'+DLBLS[i]+'<br><span style="font-size:10px;font-weight:400">'+fmtDate(d).slice(5)+'</span></div>').join('');
  const rows=nurses.map(u=>{const cells=wk.map(d=>{const sh=(store.dutySchedule[u.id]&&store.dutySchedule[u.id][d])||'off';const s=SHINFO[sh]||SHINFO.off;return'<div class="dcell" style="'+(d===today()?'background:#fff0f5':'')+'" onclick="'+(hasPerm('manageSchedule')?'editDC(\''+u.id+'\',\''+d+'\')':'void(0)')+'" ><span class="'+s.c+'">'+s.l+'</span></div>';}).join('');return'<div class="dcell dc-rl">'+avatarEl(u.id,18)+'<span style="margin-left:4px">'+esc(u.name)+'</span></div>'+cells;}).join('');
  const pSw=store.swapRequests.filter(s=>s.status==='pending');
  const swStClr={approved:'#2e7d5a',rejected:'#b03050',pending:'#8f5208'};const swStBg={approved:'#e8f7f0',rejected:'#fce8e8',pending:'#fdf0dc'};const swStTxt={approved:'✓ 核准',rejected:'✗ 拒絕',pending:'⏳ 待審'};
  const swCards=store.swapRequests.map(s=>{
    const stClr=swStClr[s.status]||'#888';const stBg=swStBg[s.status]||'#f0f0f0';const stTxt=swStTxt[s.status]||s.status;
    const timeline='<div class="sw-timeline"><div class="sw-step sw-step-done">'+avatarEl(s.fromId,18)+'<div><div style="font-size:11px;font-weight:600">'+esc(userName(s.fromId))+'</div><div style="font-size:10px;color:var(--faint)">'+fmtDate(s.fromDate)+' '+( SHINFO[s.fromShift]?SHINFO[s.fromShift].l:'')+'</div></div></div><div class="sw-arrow">⇄</div><div class="sw-step '+(s.status==='approved'?'sw-step-done':s.status==='rejected'?'sw-step-rej':'sw-step-pend')+'">'+avatarEl(s.toId,18)+'<div><div style="font-size:11px;font-weight:600">'+esc(userName(s.toId))+'</div><div style="font-size:10px;color:var(--faint)">'+fmtDate(s.toDate)+' '+(SHINFO[s.toShift]?SHINFO[s.toShift].l:'')+'</div></div></div></div>';
    return'<div class="swcard"><div style="flex:1;min-width:0">'+timeline+(s.reason?'<div style="font-size:11px;color:var(--muted);margin-top:6px;padding:6px 10px;background:var(--s2);border-radius:6px;font-style:italic;white-space:pre-wrap">💬 '+esc(s.reason)+'</div>':'')+'<div style="font-size:10px;color:var(--faint);margin-top:4px">'+(s.createdAt||'')+'</div></div><div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end"><span style="font-size:10px;padding:3px 8px;border-radius:99px;font-weight:600;background:'+stBg+';color:'+stClr+'">'+stTxt+'</span>'+(hasPerm('manageSchedule')&&s.status==='pending'?'<button class="btn-sm primary" style="font-size:11px;padding:4px 8px" onclick="appSw(\''+s.id+'\')">核准</button><button class="btn-sm danger" style="font-size:11px;padding:4px 8px" onclick="rejectSw(\''+s.id+'\')">拒絕</button>':'')+'</div></div>';
  }).join('');
  c.innerHTML='<div class="sec-label">本週排班</div><div style="overflow-x:auto;margin-bottom:18px"><div class="duty-grid" style="min-width:560px"><div class="dcell dc-hd">姓名</div>'+hdr+rows+'</div></div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div class="sec-label" style="margin:0">換班申請 '+(pSw.length?'<span style="font-size:10px;background:#fce8e8;color:#b03050;padding:1px 6px;border-radius:99px">'+pSw.length+'</span>':'')+'</div><button class="btn-sm" onclick="openNewSw()">+ 申請換班</button></div>'+(swCards||'<div style="text-align:center;padding:18px;color:var(--faint);font-size:13px">尚無換班申請</div>');
}
function editDC(uid,date){
  const cur=(store.dutySchedule[uid]&&store.dutySchedule[uid][date])||'off';
  const opts=Object.entries(SHINFO).map(([k,v])=>'<option value="'+k+'" '+(cur===k?'selected':'')+'>'+v.l+'</option>').join('');
  showModal('編輯排班：'+userName(uid)+' '+fmtDate(date),'<div class="form-row"><label>班別</label><select id="dcs">'+opts+'</select></div>',()=>{if(!store.dutySchedule[uid])store.dutySchedule[uid]={};store.dutySchedule[uid][date]=document.getElementById('dcs').value;saveStore();closeModal();rnDuty();});
}
function openDA(){
  const uOpts=store.users.map(u=>'<option value="'+u.id+'">'+esc(u.name)+'</option>').join('');
  const dOpts=getWk().map(d=>'<option value="'+d+'">'+fmtDate(d)+'</option>').join('');
  const sOpts=Object.entries(SHINFO).map(([k,v])=>'<option value="'+k+'">'+v.l+'</option>').join('');
  showModal('編輯排班','<div class="form-row"><label>成員</label><select id="dau">'+uOpts+'</select></div><div class="form-row"><label>日期</label><select id="dad">'+dOpts+'</select></div><div class="form-row"><label>班別</label><select id="das">'+sOpts+'</select></div>',()=>{const u2=document.getElementById('dau').value,d=document.getElementById('dad').value;if(!store.dutySchedule[u2])store.dutySchedule[u2]={};store.dutySchedule[u2][d]=document.getElementById('das').value;saveStore();closeModal();rnDuty();});
}
function openNewSw(){
  const uOpts=store.users.map(u=>'<option value="'+u.id+'">'+esc(u.name)+'</option>').join('');
  const dOpts=getWk().map(d=>'<option value="'+d+'">'+fmtDate(d)+'</option>').join('');
  const sOpts=Object.entries(SHINFO).map(([k,v])=>'<option value="'+k+'">'+v.l+'</option>').join('');
  showModal('申請換班','<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="form-row"><label>換班對象</label><select id="swt">'+uOpts+'</select></div><div class="form-row"><label>我的日期</label><select id="swfd">'+dOpts+'</select></div><div class="form-row"><label>我的班別</label><select id="swfs">'+sOpts+'</select></div><div class="form-row"><label>對方日期</label><select id="swtd">'+dOpts+'</select></div><div class="form-row"><label>對方班別</label><select id="swts">'+sOpts+'</select></div></div><div class="form-row" style="margin-top:6px"><label>換班原因</label><textarea id="swr" style="min-height:70px" placeholder="請說明換班原因，例：家庭事務、身體不適..."></textarea></div>',()=>{store.swapRequests.unshift({id:uid(),fromId:currentUser.id,toId:document.getElementById('swt').value,fromDate:document.getElementById('swfd').value,toDate:document.getElementById('swtd').value,fromShift:document.getElementById('swfs').value,toShift:document.getElementById('swts').value,reason:document.getElementById('swr').value.trim(),status:'pending',createdAt:today()+' '+nowTime()});saveStore();closeModal();rnDuty();});
}
function appSw(id){const s=store.swapRequests.find(x=>x.id===id);if(!s)return;s.status='approved';if(!store.dutySchedule[s.fromId])store.dutySchedule[s.fromId]={};if(!store.dutySchedule[s.toId])store.dutySchedule[s.toId]={};const tmp=(store.dutySchedule[s.fromId][s.fromDate])||'off';store.dutySchedule[s.fromId][s.fromDate]=(store.dutySchedule[s.toId][s.toDate])||'off';store.dutySchedule[s.toId][s.toDate]=tmp;saveStore();rnDuty();}
function rejectSw(id){const s=store.swapRequests.find(x=>x.id===id);if(!s)return;s.status='rejected';saveStore();rnDuty();}

// ════════════════════════════════════════════════════════
// 留言板
// ════════════════════════════════════════════════════════
var BOARD_CATS={chat:{l:'閒聊',c:'bc-chat',e:'💬'},mood:{l:'心情',c:'bc-mood',e:'🌸'},question:{l:'問題',c:'bc-question',e:'❓'},share:{l:'分享',c:'bc-share',e:'🎉'},notice:{l:'通知',c:'bc-notice',e:'📢'}};
var _boardFilter='all';
var _boardSort='newest';
var _boardSearch='';
var _boardImg=null;
