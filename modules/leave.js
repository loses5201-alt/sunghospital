// ════════════════════════════════════════════════════════
// 請假申請與管理
// ════════════════════════════════════════════════════════

var LEAVE_TYPES = [
  {id:'annual',   label:'年假',   color:'var(--green)',   defaultDays:14},
  {id:'sick',     label:'病假',   color:'var(--blue)',    defaultDays:30},
  {id:'personal', label:'事假',   color:'var(--amber)',   defaultDays:14},
  {id:'comp',     label:'補休',   color:'var(--lavender)',defaultDays:0},
  {id:'maternity',label:'產假',   color:'var(--primary)', defaultDays:56},
  {id:'special',  label:'特別假', color:'var(--orange)',  defaultDays:3}
];
var _leaveTab = 'mine';

function renderLeavePage(c){
  c.innerHTML = '<div class="admin-layout">'
    +'<div class="main-header"><div><h1>📅 請假管理</h1>'
    +'<div class="main-header-meta">申請 · 審核 · 餘額</div></div>'
    +'<div class="header-actions"><button class="btn-sm primary" onclick="openNewLeave()">+ 請假申請</button></div>'
    +'</div>'
    +'<div style="display:flex;gap:0;border-bottom:2px solid var(--b1);padding:0 24px;background:var(--surface)">'
    +'<div class="users-tab" id="ltab_mine" onclick="setLeaveTab(\'mine\')">我的假期</div>'
    +(hasPerm('approveLeave')?'<div class="users-tab" id="ltab_pending" onclick="setLeaveTab(\'pending\')">待審核<span id="leavePendBadge"></span></div>':'')
    +(hasPerm('approveLeave')?'<div class="users-tab" id="ltab_all" onclick="setLeaveTab(\'all\')">全部假期</div>':'')
    +(isAdmin()?'<div class="users-tab" id="ltab_balance" onclick="setLeaveTab(\'balance\')">餘額管理</div>':'')
    +'</div>'
    +'<div class="admin-content" id="leaveC"></div></div>';
  setLeaveTab('mine');
}

function setLeaveTab(tab){
  _leaveTab = tab;
  document.querySelectorAll('[id^="ltab_"]').forEach(function(el){ el.classList.remove('active'); });
  var t = document.getElementById('ltab_'+tab);
  if(t) t.classList.add('active');
  rnLeave();
}

function rnLeave(){
  var c = document.getElementById('leaveC');
  if(!c) return;
  if(!store.leaves) store.leaves = [];
  if(!store.leaveBalance) store.leaveBalance = {};

  // Update pending badge
  var pend = (store.leaves||[]).filter(function(l){ return l.status==='pending'; }).length;
  var pb = document.getElementById('leavePendBadge');
  if(pb) pb.innerHTML = pend ? '<span style="background:var(--red);color:white;border-radius:99px;font-size:10px;padding:1px 6px;margin-left:5px">'+pend+'</span>' : '';

  if(_leaveTab==='mine') rnLeaveMine(c);
  else if(_leaveTab==='pending') rnLeavePending(c);
  else if(_leaveTab==='all') rnLeaveAll(c);
  else if(_leaveTab==='balance') rnLeaveBalance(c);
}

function rnLeaveMine(c){
  var bal = store.leaveBalance[currentUser.id]||{};
  var myLeaves = (store.leaves||[]).filter(function(l){ return l.userId===currentUser.id; })
    .sort(function(a,b){ return (b.createdAt||'').localeCompare(a.createdAt||''); });

  var html = '<div style="margin-bottom:22px">'
    +'<div class="sec-label">假期餘額</div>'
    +'<div style="display:flex;gap:10px;flex-wrap:wrap">';
  LEAVE_TYPES.filter(function(lt){ return lt.id!=='maternity'; }).forEach(function(lt){
    var used = (store.leaves||[]).filter(function(l){ return l.userId===currentUser.id&&l.type===lt.id&&l.status==='approved'; })
      .reduce(function(s,l){ return s+(l.days||0); },0);
    var total = bal[lt.id]!==undefined ? bal[lt.id] : lt.defaultDays;
    var remain = total - used;
    var fc = remain<=0 ? 'var(--red)' : remain<3 ? 'var(--amber)' : lt.color;
    html += '<div style="background:var(--surface);border:1.5px solid var(--b1);border-radius:14px;padding:14px 18px;min-width:100px;text-align:center;position:relative;overflow:hidden">'
      +'<div style="position:absolute;top:0;left:0;right:0;height:3px;background:'+lt.color+'"></div>'
      +'<div style="font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">'+lt.label+'</div>'
      +'<div style="font-size:28px;font-weight:900;color:'+fc+';line-height:1">'+remain+'</div>'
      +'<div style="font-size:10px;color:var(--faint);margin-top:3px">已用 '+used+' / 共 '+total+' 天</div>'
      +'</div>';
  });
  html += '</div></div>';

  if(!myLeaves.length){
    html += '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-title">尚無請假紀錄</div><button class="empty-state-btn" onclick="openNewLeave()">申請假期</button></div>';
    c.innerHTML = html; return;
  }
  html += '<div class="sec-label">申請紀錄</div>'+_leaveTable(myLeaves, false, false);
  c.innerHTML = html;
}

function rnLeavePending(c){
  var pend = (store.leaves||[]).filter(function(l){ return l.status==='pending'; })
    .sort(function(a,b){ return (a.createdAt||'').localeCompare(b.createdAt||''); });
  if(!pend.length){
    c.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-title">目前無待審核申請</div></div>'; return;
  }
  c.innerHTML = _leaveTable(pend, true, true);
}

function rnLeaveAll(c){
  var all = (store.leaves||[]).slice().sort(function(a,b){ return (b.createdAt||'').localeCompare(a.createdAt||''); });
  c.innerHTML = all.length ? _leaveTable(all, true, true) : '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-title">尚無紀錄</div></div>';
}

function rnLeaveBalance(c){
  var users = store.users.filter(function(u){ return u.status==='active'; });
  var ltypes = LEAVE_TYPES.filter(function(lt){ return lt.id!=='maternity'; });
  var html = '<div class="table-wrap"><table><thead><tr><th>人員</th>'
    +ltypes.map(function(lt){ return '<th style="text-align:center">'+lt.label+'<div style="font-size:9px;font-weight:400;color:var(--faint)">剩餘/總計</div></th>'; }).join('')
    +'<th></th></tr></thead><tbody>'
    +users.map(function(u){
      var bal = store.leaveBalance[u.id]||{};
      return '<tr><td><div style="display:flex;align-items:center;gap:7px">'+avatarEl(u.id,24)+'<span style="font-weight:600">'+esc(u.name)+'</span></div></td>'
        +ltypes.map(function(lt){
          var used = (store.leaves||[]).filter(function(l){ return l.userId===u.id&&l.type===lt.id&&l.status==='approved'; })
            .reduce(function(s,l){ return s+(l.days||0); },0);
          var total = bal[lt.id]!==undefined ? bal[lt.id] : lt.defaultDays;
          var remain = total - used;
          var fc = remain<=0?'var(--red)':remain<3?'var(--amber)':'var(--green)';
          return '<td style="text-align:center"><span style="font-weight:800;color:'+fc+'">'+remain+'</span>'
            +'<span style="color:var(--faint);font-size:11px"> / '+total+'</span></td>';
        }).join('')
        +'<td><button class="btn-xs" onclick="openEditBalance(\''+u.id+'\')">調整</button></td></tr>';
    }).join('')
    +'</tbody></table></div>';
  c.innerHTML = html;
}

function _leaveTable(leaves, showUser, showApprove){
  return '<div class="table-wrap"><table><thead><tr>'
    +(showUser?'<th>申請人</th>':'')
    +'<th>假別</th><th>日期</th><th>天數</th><th>原因</th><th>狀態</th>'
    +(showApprove&&hasPerm('approveLeave')?'<th>操作</th>':'')
    +'</tr></thead><tbody>'
    +leaves.map(function(l){
      var lt = LEAVE_TYPES.find(function(t){ return t.id===l.type; })||{label:l.type,color:'var(--muted)'};
      var stBg = l.status==='approved'?'var(--green-bg)':l.status==='rejected'?'var(--red-bg)':'var(--amber-bg)';
      var stFc = l.status==='approved'?'var(--green)':l.status==='rejected'?'var(--red)':'var(--amber)';
      var stLabel = l.status==='approved'?'✓ 核准':l.status==='rejected'?'✗ 駁回':'⏳ 待審核';
      return '<tr>'
        +(showUser?'<td><div style="display:flex;align-items:center;gap:7px">'+avatarEl(l.userId,22)+'<span>'+esc(userName(l.userId))+'</span></div></td>':'')
        +'<td><span style="font-size:11px;padding:2px 9px;border-radius:99px;font-weight:700;background:'+lt.color+'22;color:'+lt.color+'">'+lt.label+'</span></td>'
        +'<td style="font-size:12px;white-space:nowrap">'+esc(l.startDate||'')+' → '+esc(l.endDate||'')+'</td>'
        +'<td style="font-weight:800;text-align:center">'+( l.days||0 )+'天</td>'
        +'<td style="color:var(--muted);font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(l.reason||'')+'</td>'
        +'<td><span style="font-size:11px;padding:3px 9px;border-radius:99px;font-weight:700;background:'+stBg+';color:'+stFc+'">'+stLabel+'</span></td>'
        +(showApprove&&hasPerm('approveLeave')&&l.status==='pending'
          ?'<td><button class="btn-xs success" onclick="approveLeave(\''+l.id+'\',true)">核准</button> <button class="btn-xs danger" onclick="approveLeave(\''+l.id+'\',false)">駁回</button></td>'
          :'<td style="font-size:11px;color:var(--faint)">'+( l.approverId?'by '+esc(userName(l.approverId)):'' )+'</td>')
        +'</tr>';
    }).join('')
    +'</tbody></table></div>';
}

function approveLeave(id, approved){
  var l = (store.leaves||[]).find(function(x){ return x.id===id; });
  if(!l) return;
  l.status = approved ? 'approved' : 'rejected';
  l.approverId = currentUser.id;
  l.approvedAt = new Date().toISOString();
  saveCollection('leaves'); rnLeave();
  var lt = LEAVE_TYPES.find(function(t){ return t.id===l.type; })||{label:l.type};
  showToast(approved?'已核准':'已駁回', esc(userName(l.userId))+'的'+lt.label, approved?'✅':'❌');
}

function openEditBalance(userId){
  var user = store.users.find(function(u){ return u.id===userId; });
  if(!user) return;
  var bal = store.leaveBalance[userId]||{};
  var ltypes = LEAVE_TYPES.filter(function(lt){ return lt.id!=='maternity'; });
  showModal(esc(user.name)+' — 假期餘額調整',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +ltypes.map(function(lt){
      return '<div class="form-row"><label>'+lt.label+'（天）</label><input type="number" id="lb_'+lt.id+'" value="'+(bal[lt.id]!==undefined?bal[lt.id]:lt.defaultDays)+'" min="0"></div>';
    }).join('')+'</div>',
  function(){
    if(!store.leaveBalance) store.leaveBalance = {};
    if(!store.leaveBalance[userId]) store.leaveBalance[userId] = {};
    ltypes.forEach(function(lt){
      var v = parseInt(document.getElementById('lb_'+lt.id).value);
      if(!isNaN(v)) store.leaveBalance[userId][lt.id] = v;
    });
    saveCollection('leaveBalance'); closeModal(); rnLeave();
    showToast('更新完成', esc(user.name)+'的假期餘額已調整', '📅');
  });
}

function _calcDays(start, end){
  if(!start||!end) return 0;
  return Math.max(1, Math.round((new Date(end)-new Date(start))/86400000)+1);
}

function openNewLeave(){
  var typeOpts = LEAVE_TYPES.map(function(lt){
    return '<option value="'+lt.id+'">'+lt.label+'（預設'+lt.defaultDays+'天）</option>';
  }).join('');
  var todayVal = today();
  showModal('請假申請',
    '<div class="form-row"><label>假別</label><select id="ltype">'+typeOpts+'</select></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +'<div class="form-row"><label>開始日期</label><input type="date" id="lstart" value="'+todayVal+'"></div>'
    +'<div class="form-row"><label>結束日期</label><input type="date" id="lend" value="'+todayVal+'"></div>'
    +'</div>'
    +'<div class="form-row"><label>原因</label><textarea id="lreason" style="min-height:70px" placeholder="請說明請假原因"></textarea></div>',
  function(){
    var start = document.getElementById('lstart').value;
    var end = document.getElementById('lend').value;
    if(!start||!end||start>end){ showToast('日期錯誤', '結束日期不能早於開始日期', '⚠️'); return; }
    if(!store.leaves) store.leaves = [];
    var days = _calcDays(start, end);
    store.leaves.push({
      id:uid(), userId:currentUser.id,
      type:document.getElementById('ltype').value,
      startDate:start, endDate:end, days:days,
      reason:document.getElementById('lreason').value.trim(),
      status:'pending', createdAt:new Date().toISOString()
    });
    saveCollection('leaves'); closeModal(); rnLeave();
    showToast('申請送出', '假期申請（'+days+'天）已送出待審核', '📅');
  });
}
