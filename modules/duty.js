// ════════════════════════════════════════════════════════
// 值班表（產房護理排班系統）
// ════════════════════════════════════════════════════════

const SHINFO={
  morning:  {l:'早班',   c:'sh-m',  time:'07:00–15:00', color:'#f59e0b'},
  afternoon:{l:'午班',   c:'sh-a',  time:'15:00–23:00', color:'#3b82f6'},
  night:    {l:'夜班',   c:'sh-n',  time:'23:00–07:00', color:'#6366f1'},
  oncall:   {l:'ON CALL',c:'sh-oc', time:'備勤',         color:'#c4527a'},
  training: {l:'教育訓練',c:'sh-tr', time:'',            color:'#0d6e65'},
  off:      {l:'休假',   c:'sh-off', time:'',            color:'#c0909a'},
};
const DLBLS=['一','二','三','四','五','六','日'];
var _dutyTab='week';
var _dutyWeekOffset=0;

// ── 月曆導覽用 window 級變數（避免 const/let 重宣告）
if(typeof window._dutyMonthYear==='undefined'){
  window._dutyMonthYear=new Date().getFullYear();
  window._dutyMonthMonth=new Date().getMonth();
}

function renderDutyPage(c){
  var exportBtn=(isAdmin()||hasPerm('exportData'))?'<button class="btn-sm" onclick="exportDutyCSV()">📥 匯出CSV</button>':'';
  var batchBtn=hasPerm('manageSchedule')?'<button class="btn-sm primary" onclick="openBatchEdit()">✏️ 批次排班</button>':'';
  c.innerHTML='<div class="admin-layout">'
    +'<div class="main-header"><div><h1>📅 值班表</h1><div class="main-header-meta">產房護理排班 · 換班管理</div></div>'
    +'<div class="header-actions">'+exportBtn+batchBtn+'</div></div>'
    +'<div style="display:flex;gap:0;border-bottom:2px solid var(--b1);padding:0 24px;background:var(--surface)">'
    +'<div class="users-tab" id="dtab_week"  onclick="setDutyTab(\'week\')">週排班</div>'
    +'<div class="users-tab" id="dtab_month" onclick="setDutyTab(\'month\')">月曆</div>'
    +'<div class="users-tab" id="dtab_mine"  onclick="setDutyTab(\'mine\')">我的班表</div>'
    +'<div class="users-tab" id="dtab_swap"  onclick="setDutyTab(\'swap\')">換班申請<span id="swapPendBadge"></span></div>'
    +'<div class="users-tab" id="dtab_stats" onclick="setDutyTab(\'stats\')">排班統計</div>'
    +'</div>'
    +'<div class="admin-content" id="dutyC"></div></div>';
  setDutyTab(_dutyTab);
}

function setDutyTab(tab){
  _dutyTab=tab;
  ['week','month','mine','swap','stats'].forEach(function(t){
    var el=document.getElementById('dtab_'+t);
    if(el)el.className='users-tab'+(t===tab?' active':'');
  });
  rnDuty();
}

function rnDuty(){
  var c=document.getElementById('dutyC');if(!c)return;
  if(!store.dutySchedule)store.dutySchedule={};
  if(!store.swapRequests)store.swapRequests=[];
  if(!store.dutyNotes)store.dutyNotes={};
  // 更新換班角標
  var pSw=store.swapRequests.filter(function(s){return s.status==='pending';});
  var myPend=pSw.filter(function(s){return s.toId===currentUser.id;});
  var totalBadge=myPend.length+(hasPerm('manageSchedule')?pSw.filter(function(s){return s.fromId!==currentUser.id&&s.toId!==currentUser.id;}).length:0);
  var bdg=document.getElementById('swapPendBadge');
  if(bdg)bdg.innerHTML=totalBadge?'<span style="font-size:10px;background:#fce8e8;color:#b03050;padding:1px 6px;border-radius:99px;margin-left:4px">'+totalBadge+'</span>':'';
  // 分頁路由
  if(_dutyTab==='week')rnDutyWeek(c);
  else if(_dutyTab==='month')rnDutyMonth(c);
  else if(_dutyTab==='mine')rnDutyMine(c);
  else if(_dutyTab==='swap')rnDutySwap(c);
  else if(_dutyTab==='stats')rnDutyStats(c);
}

// ─────────────────────────────────────────
// 週排班
// ─────────────────────────────────────────
function rnDutyWeek(c){
  var wk=getWkOffset(_dutyWeekOffset);
  var todayStr=today();
  var minStaff=store.dutyMinStaff||{morning:2,afternoon:2,night:1};
  var nurses=store.users.filter(function(u){return u.status!=='disabled'&&u.status!=='resigned';});

  // 每天各班人數
  var coverage={};
  wk.forEach(function(d){
    coverage[d]={morning:0,afternoon:0,night:0,oncall:0};
    nurses.forEach(function(u){
      var sh=(store.dutySchedule[u.id]&&store.dutySchedule[u.id][d])||'off';
      if(coverage[d][sh]!==undefined)coverage[d][sh]++;
    });
  });

  // 表頭（日期 + 人力數 + 備註）
  var hdr='<div class="dcell dc-hd dc-corner">姓名</div>'
    +wk.map(function(d,i){
      var isToday=d===todayStr;
      var cov=coverage[d];
      var warn=Object.entries(minStaff).some(function(e){return (cov[e[0]]||0)<Number(e[1]);});
      var note=store.dutyNotes[d]||'';
      return '<div class="dcell dc-hd'+(isToday?' dc-today':'')+(warn?' dc-warn':'')+'">'
        +'<div style="font-size:11px;font-weight:800">'+DLBLS[i]+'</div>'
        +'<div style="font-size:10px;color:var(--faint)">'+d.slice(5)+'</div>'
        +'<div class="duty-cov-row">'
        +'<span class="dcov dcov-m" title="早班">'+cov.morning+'</span>'
        +'<span class="dcov dcov-a" title="午班">'+cov.afternoon+'</span>'
        +'<span class="dcov dcov-n" title="夜班">'+cov.night+'</span>'
        +(cov.oncall?'<span class="dcov dcov-oc" title="ON CALL">'+cov.oncall+'</span>':'')
        +'</div>'
        +(warn?'<div style="font-size:9px;color:var(--red);font-weight:700">⚠ 人力不足</div>':'')
        +(note?'<div class="duty-note-chip" title="'+esc(note)+'">📌 '+esc(note.slice(0,8))+(note.length>8?'…':'')+'</div>':'')
        +(hasPerm('manageSchedule')?'<div class="duty-add-note" onclick="editDutyNote(\''+d+'\')">'+(note?'✏️':'＋備註')+'</div>':'')
        +'</div>';
    }).join('');

  // 護士行
  var rows=nurses.map(function(u){
    var myRow=u.id===currentUser.id;
    var workCnt=wk.filter(function(d){var sh=(store.dutySchedule[u.id]&&store.dutySchedule[u.id][d])||'off';return sh!=='off';}).length;
    var cells=wk.map(function(d){
      var sh=(store.dutySchedule[u.id]&&store.dutySchedule[u.id][d])||'off';
      var s=SHINFO[sh]||SHINFO.off;
      var isToday=d===todayStr;
      var onLeave=(store.leaves||[]).some(function(l){return l.userId===u.id&&l.status==='approved'&&l.startDate<=d&&l.endDate>=d;});
      var badge=onLeave?'<span class="sh-leave">請假</span>':'<span class="'+s.c+'">'+s.l+'</span>';
      var clickable=hasPerm('manageSchedule')?'onclick="editDC(\''+u.id+'\',\''+d+'\')" style="cursor:pointer"':'';
      return '<div class="dcell'+(isToday?' dc-today-cell':'')+(myRow?' dc-my-cell':'')+'" '+clickable+'>'+badge+'</div>';
    }).join('');
    return '<div class="dcell dc-rl'+(myRow?' dc-my-rl':'')+'">'
      +avatarEl(u.id,18)
      +'<div style="min-width:0;margin-left:4px"><div style="font-size:12px;font-weight:'+(myRow?'800':'600')+'">'+esc(u.name)+'</div>'
      +'<div style="font-size:9px;color:var(--faint)">'+workCnt+' 班</div></div>'
      +'</div>'+cells;
  }).join('');

  // 週標題
  var weekStart=new Date(wk[0]),weekEnd=new Date(wk[6]);
  var weekLabel=wk[0].slice(0,7).replace('-','年')+'月 / '+(weekStart.getMonth()===weekEnd.getMonth()?'':((weekEnd.getMonth()+1)+'月'))
    +wk[0].slice(8)+'日 ~ '+wk[6].slice(8)+'日';

  c.innerHTML='<div style="padding:16px 24px 28px">'
    // 週導覽列
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:18px;flex-wrap:wrap">'
    +'<div class="duty-week-nav">'
    +'<button class="btn-sm" onclick="_dutyWeekOffset--;rnDuty()">‹ 上週</button>'
    +'<span style="font-size:13px;font-weight:700;min-width:150px;text-align:center">'+weekLabel+'</span>'
    +'<button class="btn-sm" onclick="_dutyWeekOffset++;rnDuty()">下週 ›</button>'
    +'</div>'
    +(_dutyWeekOffset!==0?'<button class="btn-sm" onclick="_dutyWeekOffset=0;rnDuty()">回本週</button>':'')
    +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-left:auto">'
    +'<span class="duty-legend"><span class="dcov dcov-m">早</span>早班</span>'
    +'<span class="duty-legend"><span class="dcov dcov-a">午</span>午班</span>'
    +'<span class="duty-legend"><span class="dcov dcov-n">夜</span>夜班</span>'
    +(Object.values(coverage).some(function(d){return d.oncall>0;})?'<span class="duty-legend"><span class="dcov dcov-oc">C</span>ON CALL</span>':'')
    +'</div>'
    +'</div>'
    // 排班格
    +'<div style="overflow-x:auto"><div class="duty-grid new-duty-grid" style="min-width:640px">'
    +'<div class="duty-grid-hdr">'+hdr+'</div>'
    +rows
    +'</div></div>'
    +'</div>';
}

// ─────────────────────────────────────────
// 月曆（個人班表 + 全員人數）
// ─────────────────────────────────────────
function rnDutyMonth(c){
  var year=window._dutyMonthYear,month=window._dutyMonthMonth;
  var todayStr=today();
  var first=new Date(year,month,1);
  var last=new Date(year,month+1,0);
  var startDay=(first.getDay()+6)%7;
  var cells=[];
  for(var i=0;i<startDay;i++){var dt=new Date(year,month,-(startDay-1-i));cells.push({date:dt.toISOString().slice(0,10),cur:false});}
  for(var d=1;d<=last.getDate();d++){var dt2=new Date(year,month,d);cells.push({date:dt2.toISOString().slice(0,10),cur:true});}
  while(cells.length%7!==0){var dt3=new Date(year,month+1,cells.length-last.getDate()-startDay+1);cells.push({date:dt3.toISOString().slice(0,10),cur:false});}
  var nurses=store.users.filter(function(u){return u.status!=='disabled'&&u.status!=='resigned';});
  var minStaff=store.dutyMinStaff||{morning:2,afternoon:2,night:1};
  var myId=currentUser.id;

  var rowsHtml='';
  for(var ri=0;ri<cells.length;ri+=7){
    var week=cells.slice(ri,ri+7);
    rowsHtml+='<div class="duty-month-row">'+week.map(function(cell){
      var d=cell.date;
      var isToday=d===todayStr;
      var sh=(store.dutySchedule[myId]&&store.dutySchedule[myId][d])||'off';
      var s=SHINFO[sh]||SHINFO.off;
      var onLeave=(store.leaves||[]).some(function(l){return l.userId===myId&&l.status==='approved'&&l.startDate<=d&&l.endDate>=d;});
      var cov={morning:0,afternoon:0,night:0};
      nurses.forEach(function(u){var v=(store.dutySchedule[u.id]&&store.dutySchedule[u.id][d])||'off';if(cov[v]!==undefined)cov[v]++;});
      var warn=cell.cur&&Object.entries(minStaff).some(function(e){return (cov[e[0]]||0)<Number(e[1]);});
      var note=store.dutyNotes[d]||'';
      return '<div class="duty-month-cell'+(isToday?' dmc-today':'')+(!cell.cur?' dmc-other':'')+(warn?' dmc-warn':'')+'">'
        +'<div class="dmc-date'+(isToday?' dmc-date-today':'')+'">'+(parseInt(d.slice(8))+'')+'</div>'
        +(cell.cur?'<span class="'+(onLeave?'sh-leave':s.c)+'" style="font-size:10px;padding:2px 5px;display:inline-block;margin:1px 0">'+(onLeave?'請假':s.l)+'</span>':'')
        +(cell.cur?'<div class="dmc-cov">'
          +'<span class="dcov dcov-m" title="早班">'+cov.morning+'</span>'
          +'<span class="dcov dcov-a" title="午班">'+cov.afternoon+'</span>'
          +'<span class="dcov dcov-n" title="夜班">'+cov.night+'</span>'
          +'</div>':'')
        +(note&&cell.cur?'<div style="font-size:9px;color:var(--primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px">📌 '+esc(note.slice(0,10))+'</div>':'')
        +'</div>';
    }).join('')+'</div>';
  }

  c.innerHTML='<div style="padding:16px 24px 28px">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:18px">'
    +'<button class="btn-sm" onclick="window._dutyMonthMonth--;if(window._dutyMonthMonth<0){window._dutyMonthMonth=11;window._dutyMonthYear--;}rnDuty()">‹</button>'
    +'<div style="font-size:15px;font-weight:800;min-width:120px;text-align:center">'+year+' 年 '+(month+1)+' 月</div>'
    +'<button class="btn-sm" onclick="window._dutyMonthMonth++;if(window._dutyMonthMonth>11){window._dutyMonthMonth=0;window._dutyMonthYear++;}rnDuty()">›</button>'
    +'<button class="btn-sm" style="margin-left:8px" onclick="window._dutyMonthYear=new Date().getFullYear();window._dutyMonthMonth=new Date().getMonth();rnDuty()">本月</button>'
    +'</div>'
    +'<div class="duty-month-grid">'
    +'<div class="duty-month-hdr">'+DLBLS.map(function(l){return '<div class="dmc-hdr">'+l+'</div>';}).join('')+'</div>'
    +rowsHtml
    +'</div>'
    +'<div style="font-size:11px;color:var(--faint);margin-top:10px">彩色班別 = 我的班表 · 數字 = 全院各班人數</div>'
    +'</div>';
}

// ─────────────────────────────────────────
// 我的班表（未來 28 天）
// ─────────────────────────────────────────
function rnDutyMine(c){
  var todayStr=today();
  var days=[];
  for(var i=0;i<28;i++){var dt=new Date(todayStr);dt.setDate(dt.getDate()+i);days.push(dt.toISOString().slice(0,10));}
  var myShifts=days.map(function(d){
    var sh=(store.dutySchedule[currentUser.id]&&store.dutySchedule[currentUser.id][d])||'off';
    var onLeave=(store.leaves||[]).some(function(l){return l.userId===currentUser.id&&l.status==='approved'&&l.startDate<=d&&l.endDate>=d;});
    return {date:d,shift:sh,onLeave:onLeave};
  });
  var cnt={morning:0,afternoon:0,night:0,oncall:0,training:0,off:0};
  myShifts.forEach(function(x){if(cnt[x.shift]!==undefined)cnt[x.shift]++;else cnt.off++;});

  // 找下一班
  var nextShift=myShifts.find(function(x){return x.date>todayStr&&x.shift!=='off'&&!x.onLeave;});

  // 按週分組
  var weeks=[];
  for(var wi=0;wi<4;wi++){weeks.push(myShifts.slice(wi*7,(wi+1)*7));}
  var weeksHtml=weeks.map(function(wk,wi){
    var wLabel=wi===0?'本週':wi===1?'下週':(wi+1)+'週後';
    var rows=wk.map(function(x){
      var s=SHINFO[x.shift]||SHINFO.off;
      var isToday=x.date===todayStr;
      var dt2=new Date(x.date);
      var dayName=DLBLS[(dt2.getDay()+6)%7];
      var isWkend=dt2.getDay()===0||dt2.getDay()===6;
      var shLabel=x.onLeave?'請假':s.l;
      var shCls=x.onLeave?'sh-leave':s.c;
      var shTime=(!x.onLeave&&s.time)?s.time:'';
      var note=store.dutyNotes[x.date]||'';
      return '<div class="duty-mine-row'+(isToday?' duty-mine-today':'')+'">'
        +'<div class="dmine-day" style="color:'+(isWkend?'var(--primary)':'var(--muted)')+'">'+dayName+'</div>'
        +'<div class="dmine-date" style="font-weight:'+(isToday?'800':'400')+'">'+fmtDate(x.date)+'</div>'
        +'<span class="'+shCls+'">'+shLabel+'</span>'
        +(shTime?'<span class="dmine-time">'+shTime+'</span>':'')
        +(note?'<span class="dmine-note">📌 '+esc(note.slice(0,14))+'</span>':'')
        +(isToday?'<span class="dmine-today-badge">今天</span>':'')
        +'</div>';
    }).join('');
    return '<div class="dmine-week">'
      +'<div class="dmine-week-lbl">'+wLabel+'</div>'
      +rows+'</div>';
  }).join('');

  c.innerHTML='<div style="padding:16px 24px 28px">'
    // 統計概覽
    +'<div class="metric-grid" style="grid-template-columns:repeat(5,1fr);margin-bottom:22px">'
    +'<div class="metric-box"><div class="metric-num" style="color:#f59e0b">'+cnt.morning+'</div><div class="metric-lbl">早班</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:#3b82f6">'+cnt.afternoon+'</div><div class="metric-lbl">午班</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:#6366f1">'+cnt.night+'</div><div class="metric-lbl">夜班</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:var(--primary)">'+cnt.oncall+'</div><div class="metric-lbl">ON CALL</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:var(--faint)">'+cnt.off+'</div><div class="metric-lbl">休假</div></div>'
    +'</div>'
    // 下一班提示
    +(nextShift?'<div class="duty-next-shift">'
      +'<span style="font-size:11px;color:var(--muted)">下一班：</span>'
      +'<strong>'+fmtDate(nextShift.date)+'</strong>'
      +'<span class="'+(SHINFO[nextShift.shift]||SHINFO.off).c+'" style="margin-left:8px">'+(SHINFO[nextShift.shift]||SHINFO.off).l+'</span>'
      +'<span style="font-size:11px;color:var(--faint);margin-left:8px">'+(SHINFO[nextShift.shift]||SHINFO.off).time+'</span>'
      +'</div>':'')
    +'<div class="sec-label" style="margin-bottom:12px">未來 28 天班表</div>'
    +'<div class="duty-mine-list">'+weeksHtml+'</div>'
    +'</div>';
}

// ─────────────────────────────────────────
// 換班申請
// ─────────────────────────────────────────
function rnDutySwap(c){
  var pSw=store.swapRequests.filter(function(s){return s.status==='pending';});
  var myPend=pSw.filter(function(s){return s.toId===currentUser.id;});
  var swStClr={approved:'#2e7d5a',rejected:'#b03050',pending:'#8f5208'};
  var swStBg={approved:'#e8f7f0',rejected:'#fce8e8',pending:'#fdf0dc'};
  var swStTxt={approved:'✓ 核准',rejected:'✗ 拒絕',pending:'⏳ 待審'};

  function swCard(s){
    var stClr=swStClr[s.status]||'#888';
    var stBg=swStBg[s.status]||'#f0f0f0';
    var stTxt=swStTxt[s.status]||s.status;
    var amRecip=s.toId===currentUser.id&&s.status==='pending';
    var amReq=s.fromId===currentUser.id;
    var canMgr=hasPerm('manageSchedule')&&s.status==='pending';
    var timeline='<div class="sw-timeline">'
      +'<div class="sw-step sw-step-done">'+avatarEl(s.fromId,22)+'<div>'
      +'<div style="font-size:12px;font-weight:700">'+esc(userName(s.fromId))+'</div>'
      +'<div style="font-size:10px;color:var(--faint)">'+fmtDate(s.fromDate)+'<br>'+(SHINFO[s.fromShift]?SHINFO[s.fromShift].l:'')+(SHINFO[s.fromShift]&&SHINFO[s.fromShift].time?' '+SHINFO[s.fromShift].time:'')+'</div>'
      +'</div></div>'
      +'<div class="sw-arrow">⇄</div>'
      +'<div class="sw-step '+(s.status==='approved'?'sw-step-done':s.status==='rejected'?'sw-step-rej':'sw-step-pend')+'">'+avatarEl(s.toId,22)+'<div>'
      +'<div style="font-size:12px;font-weight:700">'+esc(userName(s.toId))+'</div>'
      +'<div style="font-size:10px;color:var(--faint)">'+fmtDate(s.toDate)+'<br>'+(SHINFO[s.toShift]?SHINFO[s.toShift].l:'')+(SHINFO[s.toShift]&&SHINFO[s.toShift].time?' '+SHINFO[s.toShift].time:'')+'</div>'
      +'</div></div></div>';
    var actions='';
    if(amRecip){
      actions='<div style="display:flex;gap:8px;margin-top:12px">'
        +'<button class="btn-sm primary" onclick="appSw(\''+s.id+'\')">✓ 我同意換班</button>'
        +'<button class="btn-sm danger" onclick="rejectSw(\''+s.id+'\')">✗ 婉拒</button>'
        +'</div>';
    } else if(canMgr){
      actions='<div style="display:flex;gap:8px;margin-top:12px">'
        +'<button class="btn-sm primary" style="font-size:11px" onclick="appSw(\''+s.id+'\')">核准</button>'
        +'<button class="btn-sm danger" style="font-size:11px" onclick="rejectSw(\''+s.id+'\')">拒絕</button>'
        +'</div>';
    } else if(amReq&&s.status==='pending'){
      actions='<div style="margin-top:10px"><button class="btn-sm" onclick="cancelSwap(\''+s.id+'\')">撤回申請</button></div>';
    }
    return '<div class="swcard'+(amRecip?' swcard-highlight':'')+'">'
      +(amRecip?'<div class="swcard-recip-tip">📬 對方請求與您換班，請確認</div>':'')
      +'<div style="flex:1;min-width:0">'+timeline
      +(s.reason?'<div class="swcard-reason">💬 '+esc(s.reason)+'</div>':'')
      +'<div style="font-size:10px;color:var(--faint);margin-top:5px">申請時間：'+(s.createdAt||'')+'</div>'
      +actions+'</div>'
      +'<div><span style="font-size:10px;padding:3px 9px;border-radius:99px;font-weight:700;background:'+stBg+';color:'+stClr+'">'+stTxt+'</span></div>'
      +'</div>';
  }

  var myReqs=store.swapRequests.filter(function(s){return s.fromId===currentUser.id||s.toId===currentUser.id;});
  var adminReqs=hasPerm('manageSchedule')?store.swapRequests.filter(function(s){return s.fromId!==currentUser.id&&s.toId!==currentUser.id;}):[];
  var pendingForMe=myReqs.filter(function(s){return s.toId===currentUser.id&&s.status==='pending';});
  var myHistory=myReqs.filter(function(s){return !(s.toId===currentUser.id&&s.status==='pending');});

  c.innerHTML='<div style="padding:16px 24px 28px">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">'
    +(myPend.length?'<div class="swap-alert-box">📬 有 '+myPend.length+' 筆換班請求等待您確認</div>':'<div></div>')
    +'<button class="btn-sm primary" onclick="openNewSw()">+ 申請換班</button>'
    +'</div>'
    +(pendingForMe.length?'<div class="sec-label" style="margin-bottom:10px">🔔 需要我確認</div>'+pendingForMe.map(swCard).join(''):'')
    +(myHistory.length?'<div class="sec-label" style="margin-top:20px;margin-bottom:10px">我的換班紀錄</div>'+myHistory.map(swCard).join(''):'')
    +(adminReqs.length?'<div class="sec-label" style="margin-top:20px;margin-bottom:10px">全員換班申請</div>'+adminReqs.map(swCard).join(''):'')
    +(!myReqs.length&&!adminReqs.length?'<div style="text-align:center;padding:40px;color:var(--faint);font-size:13px">尚無換班申請</div>':'')
    +'</div>';
}

// ─────────────────────────────────────────
// 排班統計
// ─────────────────────────────────────────
function rnDutyStats(c){
  var year=new Date().getFullYear(),month=new Date().getMonth();
  var firstDay=year+'-'+(month+1<10?'0'+(month+1):(month+1))+'-01';
  var lastDay=new Date(year,month+1,0).toISOString().slice(0,10);
  var allDays=[];
  for(var dt=new Date(firstDay);dt.toISOString().slice(0,10)<=lastDay;dt.setDate(dt.getDate()+1))
    allDays.push(dt.toISOString().slice(0,10));

  var minStaff=store.dutyMinStaff||{morning:2,afternoon:2,night:1};
  var nurses=store.users.filter(function(u){return u.status!=='disabled'&&u.status!=='resigned';});

  var stats=nurses.map(function(u){
    var cnt={morning:0,afternoon:0,night:0,oncall:0,training:0};
    allDays.forEach(function(d){
      var sh=(store.dutySchedule[u.id]&&store.dutySchedule[u.id][d])||'off';
      if(cnt[sh]!==undefined)cnt[sh]++;
    });
    var total=cnt.morning+cnt.afternoon+cnt.night+cnt.oncall+cnt.training;
    return {user:u,cnt:cnt,total:total};
  }).sort(function(a,b){return b.total-a.total;});

  // 人力不足天數
  var understaff=allDays.filter(function(d){
    return Object.entries(minStaff).some(function(e){
      var n=nurses.filter(function(u){return (store.dutySchedule[u.id]&&store.dutySchedule[u.id][d])===e[0];}).length;
      return n<Number(e[1]);
    });
  }).length;

  // 夜班分布（每人本月夜班數）
  var maxNight=Math.max.apply(null,stats.map(function(s){return s.cnt.night;}),0)||1;

  var tableRows=stats.map(function(s){
    var pct=allDays.length?Math.round(s.total/allDays.length*100):0;
    var nightBar=Math.round(s.cnt.night/maxNight*60);
    return '<tr>'
      +'<td style="min-width:110px"><div style="display:flex;align-items:center;gap:8px">'+avatarEl(s.user.id,22)+'<span>'+esc(s.user.name)+'</span></div></td>'
      +'<td style="color:#f59e0b;font-weight:700;text-align:center">'+s.cnt.morning+'</td>'
      +'<td style="color:#3b82f6;font-weight:700;text-align:center">'+s.cnt.afternoon+'</td>'
      +'<td style="text-align:center"><div style="display:flex;align-items:center;gap:6px">'
      +'<div style="height:6px;background:#eee;border-radius:3px;width:'+nightBar+'px;background:#6366f1;opacity:.8"></div>'
      +'<span style="color:#6366f1;font-weight:700">'+s.cnt.night+'</span>'
      +'</div></td>'
      +'<td style="color:var(--primary);font-weight:700;text-align:center">'+s.cnt.oncall+'</td>'
      +'<td style="font-weight:800;text-align:center">'+s.total+'</td>'
      +'<td><div style="height:6px;background:var(--s2);border-radius:3px;min-width:80px">'
      +'<div style="width:'+pct+'%;height:100%;background:var(--primary);border-radius:3px"></div></div></td>'
      +'</tr>';
  }).join('');

  // 今週人力狀況（快速預覽）
  var wk=getWkOffset(0);
  var covRows=wk.map(function(d){
    var cov={morning:0,afternoon:0,night:0};
    nurses.forEach(function(u){var sh=(store.dutySchedule[u.id]&&store.dutySchedule[u.id][d])||'off';if(cov[sh]!==undefined)cov[sh]++;});
    var warnM=cov.morning<(minStaff.morning||0);
    var warnA=cov.afternoon<(minStaff.afternoon||0);
    var warnN=cov.night<(minStaff.night||0);
    var dayName=DLBLS[(new Date(d).getDay()+6)%7];
    return '<tr>'
      +'<td>'+dayName+' <span style="color:var(--faint);font-size:11px">'+d.slice(5)+'</span></td>'
      +'<td style="text-align:center;background:'+(warnM?'var(--red-bg)':'')+'"><span style="color:#f59e0b;font-weight:700">'+cov.morning+'</span>'+(warnM?'<span style="color:var(--red);font-size:10px"> ⚠</span>':'')+'</td>'
      +'<td style="text-align:center;background:'+(warnA?'var(--red-bg)':'')+'"><span style="color:#3b82f6;font-weight:700">'+cov.afternoon+'</span>'+(warnA?'<span style="color:var(--red);font-size:10px"> ⚠</span>':'')+'</td>'
      +'<td style="text-align:center;background:'+(warnN?'var(--red-bg)':'')+'"><span style="color:#6366f1;font-weight:700">'+cov.night+'</span>'+(warnN?'<span style="color:var(--red);font-size:10px"> ⚠</span>':'')+'</td>'
      +'</tr>';
  }).join('');

  c.innerHTML='<div style="padding:16px 24px 28px">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
    +'<div class="sec-label" style="margin:0">'+(month+1)+'月 排班統計</div>'
    +(hasPerm('manageSchedule')?'<button class="btn-sm" onclick="openMinStaffSettings()">⚙️ 最低人力設定</button>':'')
    +'</div>'
    // 概要指標
    +'<div class="metric-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:22px">'
    +'<div class="metric-box"><div class="metric-num">'+nurses.length+'</div><div class="metric-lbl">護理人員</div></div>'
    +'<div class="metric-box"><div class="metric-num">'+allDays.length+'</div><div class="metric-lbl">本月天數</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:'+(understaff?'var(--red)':'var(--green)')+'">'+understaff+'</div><div class="metric-lbl">人力不足日</div></div>'
    +'<div class="metric-box"><div class="metric-num">'+stats.reduce(function(s,x){return s+x.total;},0)+'</div><div class="metric-lbl">本月總排班</div></div>'
    +'</div>'
    // 本週人力快速覽
    +'<div class="sec-label" style="margin-bottom:8px">本週人力狀況</div>'
    +'<div class="table-wrap" style="margin-bottom:22px"><table><thead><tr>'
    +'<th>日期</th><th>早班</th><th>午班</th><th>夜班</th>'
    +'</tr></thead><tbody>'+covRows+'</tbody></table></div>'
    // 個人排班統計
    +'<div class="sec-label" style="margin-bottom:8px">人員排班統計（本月）</div>'
    +'<div class="table-wrap"><table><thead><tr>'
    +'<th>人員</th><th style="color:#f59e0b">早班</th><th style="color:#3b82f6">午班</th><th style="color:#6366f1">夜班</th><th style="color:var(--primary)">CALL</th><th>合計</th><th>出勤比</th>'
    +'</tr></thead><tbody>'+tableRows+'</tbody></table></div>'
    +'</div>';
}

// ─────────────────────────────────────────
// 工具函式
// ─────────────────────────────────────────

// 取得偏移週 (offset=0 本週, 1 下週...)
function getWkOffset(offset){
  var base=getWk();
  if(!offset)return base;
  return base.map(function(d){
    var dt=new Date(d);dt.setDate(dt.getDate()+offset*7);
    return dt.toISOString().slice(0,10);
  });
}

// 點擊格子編輯
function editDC(uid,date){
  var cur=(store.dutySchedule[uid]&&store.dutySchedule[uid][date])||'off';
  var opts=Object.entries(SHINFO).map(function(e){
    return '<option value="'+e[0]+'"'+(cur===e[0]?' selected':'')+'>'+e[1].l+(e[1].time?' ('+e[1].time+')':'')+'</option>';
  }).join('');
  showModal('編輯排班：'+userName(uid)+' · '+fmtDate(date),
    '<div class="form-row"><label>班別</label><select id="dcs">'+opts+'</select></div>',
  function(){
    if(!store.dutySchedule[uid])store.dutySchedule[uid]={};
    store.dutySchedule[uid][date]=document.getElementById('dcs').value;
    saveStore();closeModal();rnDuty();
  });
}

// 批次排班
function openBatchEdit(){
  var uOpts=store.users.filter(function(u){return u.status!=='disabled'&&u.status!=='resigned';})
    .map(function(u){return '<option value="'+u.id+'">'+esc(u.name)+'</option>';}).join('');
  var sOpts=Object.entries(SHINFO).map(function(e){return '<option value="'+e[0]+'">'+e[1].l+'</option>';}).join('');
  showModal('批次排班',
    '<div style="background:var(--amber-bg);border:1px solid #f0d890;border-radius:var(--radius-sm);padding:8px 14px;font-size:12px;color:var(--amber);margin-bottom:12px">將覆蓋所選日期範圍內的班別設定</div>'
    +'<div class="form-row"><label>人員</label><select id="beu">'+uOpts+'</select></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +'<div class="form-row"><label>開始日期</label><input id="bes" type="date" value="'+today()+'"></div>'
    +'<div class="form-row"><label>結束日期</label><input id="bee" type="date" value="'+today()+'"></div>'
    +'</div>'
    +'<div class="form-row"><label>班別</label><select id="besh">'+sOpts+'</select></div>'
    +'<div style="display:flex;gap:16px;margin-top:6px">'
    +'<label class="form-row" style="flex-direction:row;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="beSkipWkend"> 跳過週末</label>'
    +'<label class="form-row" style="flex-direction:row;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="beSkipLeave"> 跳過已請假日</label>'
    +'</div>',
  function(){
    var u=document.getElementById('beu').value;
    var start=document.getElementById('bes').value;
    var end=document.getElementById('bee').value;
    var sh=document.getElementById('besh').value;
    var skipWkend=document.getElementById('beSkipWkend').checked;
    var skipLeave=document.getElementById('beSkipLeave').checked;
    if(!u||!start||!end||start>end){showToast('請填寫完整','','⚠️');return;}
    if(!store.dutySchedule[u])store.dutySchedule[u]={};
    var cnt=0;
    for(var dt=new Date(start);dt.toISOString().slice(0,10)<=end;dt.setDate(dt.getDate()+1)){
      var dStr=dt.toISOString().slice(0,10);
      if(skipWkend&&(dt.getDay()===0||dt.getDay()===6))continue;
      if(skipLeave&&(store.leaves||[]).some(function(l){return l.userId===u&&l.status==='approved'&&l.startDate<=dStr&&l.endDate>=dStr;}))continue;
      store.dutySchedule[u][dStr]=sh;cnt++;
    }
    saveStore();closeModal();rnDuty();
    showToast('批次排班完成',userName(u)+' 設定 '+cnt+' 天為 '+(SHINFO[sh]||SHINFO.off).l,'✅');
  });
}

// 申請換班（改進版：自動帶入我的班別）
function openNewSw(){
  var todayStr=today();
  var myDates=[];
  for(var i=-3;i<=28;i++){
    var dt=new Date(todayStr);dt.setDate(dt.getDate()+i);
    var d=dt.toISOString().slice(0,10);
    var sh=(store.dutySchedule[currentUser.id]&&store.dutySchedule[currentUser.id][d])||'off';
    if(sh!=='off')myDates.push({date:d,sh:sh});
  }
  var uOpts=store.users.filter(function(u){return u.id!==currentUser.id&&u.status!=='disabled'&&u.status!=='resigned';})
    .map(function(u){return '<option value="'+u.id+'">'+esc(u.name)+'</option>';}).join('');
  var myDOpts=myDates.map(function(x){
    return '<option value="'+x.date+'">'+fmtDate(x.date)+' ('+(SHINFO[x.sh]||SHINFO.off).l+')</option>';
  }).join('')||'<option value="'+todayStr+'">'+fmtDate(todayStr)+'</option>';
  var futureDates=[];
  for(var j=0;j<28;j++){var dt2=new Date(todayStr);dt2.setDate(dt2.getDate()+j);futureDates.push(dt2.toISOString().slice(0,10));}
  var tgtDOpts=futureDates.map(function(d){return '<option value="'+d+'">'+fmtDate(d)+'</option>';}).join('');

  showModal('申請換班',
    '<div style="background:var(--s2);border-radius:var(--radius-sm);padding:10px 14px;font-size:12px;color:var(--muted);margin-bottom:14px">'
    +'換班申請會通知對方確認，兩方同意後再由主管審核核准。</div>'
    +'<div class="form-row"><label>換班對象</label><select id="swt">'+uOpts+'</select></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
    +'<div class="form-row"><label>我要換出的班</label><select id="swfd">'+myDOpts+'</select></div>'
    +'<div class="form-row"><label>換入對方哪天的班</label><select id="swtd">'+tgtDOpts+'</select></div>'
    +'</div>'
    +'<div class="form-row"><label>換班原因 <span style="font-weight:400;color:var(--red)">（必填）</span></label>'
    +'<textarea id="swr" style="min-height:80px" placeholder="請說明換班原因，例如：家庭緊急事務、身體不適、重要活動…"></textarea></div>',
  function(){
    var reason=document.getElementById('swr').value.trim();
    if(!reason){showToast('請填寫換班原因','','⚠️');return;}
    var fromDate=document.getElementById('swfd').value;
    var toDate=document.getElementById('swtd').value;
    var toId=document.getElementById('swt').value;
    var fromShift=(store.dutySchedule[currentUser.id]&&store.dutySchedule[currentUser.id][fromDate])||'off';
    var toShift=(store.dutySchedule[toId]&&store.dutySchedule[toId][toDate])||'off';
    store.swapRequests.unshift({id:uid(),fromId:currentUser.id,toId:toId,
      fromDate:fromDate,toDate:toDate,fromShift:fromShift,toShift:toShift,
      reason:reason,status:'pending',createdAt:today()+' '+nowTime()});
    saveStore();closeModal();_dutyTab='swap';rnDuty();
    showToast('換班申請已送出','等待 '+userName(toId)+' 確認','🔄');
  });
}

// 撤回換班
function cancelSwap(id){
  if(!confirm('確定撤回此換班申請？'))return;
  var s=store.swapRequests.find(function(x){return x.id===id;});
  if(!s||s.fromId!==currentUser.id){showToast('無法撤回','','❌');return;}
  store.swapRequests=store.swapRequests.filter(function(x){return x.id!==id;});
  saveStore();rnDuty();showToast('已撤回換班申請','','↩️');
}

// 核准換班（自動對調班別）
function appSw(id){
  var s=store.swapRequests.find(function(x){return x.id===id;});if(!s)return;
  s.status='approved';
  if(!store.dutySchedule[s.fromId])store.dutySchedule[s.fromId]={};
  if(!store.dutySchedule[s.toId])store.dutySchedule[s.toId]={};
  var tmp=(store.dutySchedule[s.fromId][s.fromDate])||'off';
  store.dutySchedule[s.fromId][s.fromDate]=(store.dutySchedule[s.toId][s.toDate])||'off';
  store.dutySchedule[s.toId][s.toDate]=tmp;
  saveStore();rnDuty();
  showToast('換班已核准',userName(s.fromId)+' ⇄ '+userName(s.toId),'✅');
}

// 拒絕換班
function rejectSw(id){
  var s=store.swapRequests.find(function(x){return x.id===id;});if(!s)return;
  s.status='rejected';saveStore();rnDuty();
  showToast('換班已拒絕','','❌');
}

// 日期備註
function editDutyNote(date){
  if(!store.dutyNotes)store.dutyNotes={};
  var cur=store.dutyNotes[date]||'';
  showModal('排班備註 — '+fmtDate(date),
    '<div class="form-row"><textarea id="dnote" style="min-height:80px" placeholder="例：今日 ICU 支援人力不足、護師會議 14:00、感染管控演練...">'+esc(cur)+'</textarea></div>',
  function(){
    var v=document.getElementById('dnote').value.trim();
    if(v)store.dutyNotes[date]=v;else delete store.dutyNotes[date];
    saveStore();closeModal();rnDuty();
  });
}

// 最低人力設定
function openMinStaffSettings(){
  var ms=store.dutyMinStaff||{morning:2,afternoon:2,night:1};
  showModal('最低人力需求設定',
    '<div style="font-size:12px;color:var(--muted);margin-bottom:14px">低於此人數時，週排班表頭及統計頁將顯示紅色警示</div>'
    +'<div class="form-row"><label>早班最低人數</label><input id="msm" type="number" min="0" value="'+ms.morning+'"></div>'
    +'<div class="form-row"><label>午班最低人數</label><input id="msa" type="number" min="0" value="'+ms.afternoon+'"></div>'
    +'<div class="form-row"><label>夜班最低人數</label><input id="msn" type="number" min="0" value="'+ms.night+'"></div>',
  function(){
    store.dutyMinStaff={
      morning:parseInt(document.getElementById('msm').value)||0,
      afternoon:parseInt(document.getElementById('msa').value)||0,
      night:parseInt(document.getElementById('msn').value)||0
    };
    saveStore();closeModal();rnDuty();
    showToast('已更新最低人力設定','','✅');
  });
}

// CSV 匯出
function exportDutyCSV(){
  var wk=getWkOffset(_dutyWeekOffset);
  var nurses=store.users.filter(function(u){return u.status!=='disabled'&&u.status!=='resigned';});
  var header=['姓名'].concat(wk.map(function(d){return fmtDate(d);}));
  var rows=nurses.map(function(u){
    return [esc(u.name)].concat(wk.map(function(d){
      var sh=(store.dutySchedule[u.id]&&store.dutySchedule[u.id][d])||'off';
      return (SHINFO[sh]||SHINFO.off).l;
    }));
  });
  var csv=[header].concat(rows).map(function(r){return r.join(',');}).join('\n');
  var blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='排班表_'+wk[0]+'.csv';
  a.click();
}

// ════════════════════════════════════════════════════════
// 留言板
// ════════════════════════════════════════════════════════
var BOARD_CATS={chat:{l:'閒聊',c:'bc-chat',e:'💬'},mood:{l:'心情',c:'bc-mood',e:'🌸'},question:{l:'問題',c:'bc-question',e:'❓'},share:{l:'分享',c:'bc-share',e:'🎉'},notice:{l:'通知',c:'bc-notice',e:'📢'}};
var _boardFilter='all';
var _boardSort='newest';
var _boardSearch='';
var _boardImg=null;
