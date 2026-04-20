// ════════════════════════════════════════════════════════
// 全院儀表板 (Kiosk)
// ════════════════════════════════════════════════════════
var _kioskTimer=null;

function renderKioskPage(c){
  var onDutyToday=(store.dutySchedule
    ?Object.entries(store.dutySchedule).filter(function(kv){var s=kv[1][today()];return s&&s!=='off';})
       .map(function(kv){return store.users.find(function(u){return u.id===kv[0];})||null;}).filter(Boolean):[]);
  var activeRooms=(store.rooms||[]).filter(function(r){return r.status==='active'||r.status==='waiting';}).length;
  var pendingForms=(store.formRequests||[]).filter(function(f){return f.status==='pending';}).length;
  var openIR=(store.incidents||[]).filter(function(i){return i.status==='new';}).length;
  var pendingEq=(store.equipment||[]).filter(function(e){return e.status!=='resolved';}).length;
  var now=new Date();
  var timeStr=now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');
  var dateStr=now.getFullYear()+'年'+(now.getMonth()+1)+'月'+now.getDate()+'日 星期'+['日','一','二','三','四','五','六'][now.getDay()];
  var shiftNow=(function(){var h=now.getHours();return h>=7&&h<15?'🌅 早班':h>=15&&h<23?'☀️ 午班':'🌙 夜班';})();
  var staffHtml=onDutyToday.slice(0,8).map(function(u){
    return '<div class="kiosk-staff-chip"><div class="kiosk-av '+u.avatar+'">'+initials(u.name)+'</div><span>'+esc(u.name)+'</span></div>';
  }).join('')||'<span style="color:var(--faint)">今日尚未排班</span>';
  var annHtml=(store.announcements||[]).slice(0,3).map(function(a){return '<div class="kiosk-ann-item">📢 '+esc(a.title)+'</div>';}).join('')||'<div style="color:var(--faint)">無公告</div>';
  c.innerHTML='<div id="kioskView" class="kiosk-wrap">'
    +'<div class="kiosk-header">'
    +'<div class="kiosk-logo">宋俊宏婦幼醫院</div>'
    +'<div class="kiosk-time-block"><div class="kiosk-time">'+timeStr+'</div><div class="kiosk-date">'+dateStr+'</div></div>'
    +'<button class="btn-sm" style="align-self:center;margin-left:auto" onclick="toggleKioskFS()">⛶ 全螢幕</button>'
    +'</div>'
    +'<div class="kiosk-grid">'
    +'<div class="kiosk-card kiosk-big"><div class="kiosk-card-label">目前班別</div><div class="kiosk-card-value">'+shiftNow+'</div></div>'
    +'<div class="kiosk-card"><div class="kiosk-card-label">使用中產房</div><div class="kiosk-card-value" style="color:var(--amber)">'+activeRooms+'</div></div>'
    +'<div class="kiosk-card"><div class="kiosk-card-label">待審表單</div><div class="kiosk-card-value" style="color:'+(pendingForms>0?'var(--red)':'var(--green)')+'">'+pendingForms+'</div></div>'
    +'<div class="kiosk-card"><div class="kiosk-card-label">未結通報</div><div class="kiosk-card-value" style="color:'+(openIR>0?'var(--red)':'var(--green)')+'">'+openIR+'</div></div>'
    +'<div class="kiosk-card"><div class="kiosk-card-label">設備待處理</div><div class="kiosk-card-value" style="color:'+(pendingEq>0?'var(--amber)':'var(--green)')+'">'+pendingEq+'</div></div>'
    +'<div class="kiosk-card kiosk-wide"><div class="kiosk-card-label">今日當班人員</div><div class="kiosk-staff-row">'+staffHtml+'</div></div>'
    +'<div class="kiosk-card kiosk-wide"><div class="kiosk-card-label">最新公告</div>'+annHtml+'</div>'
    +'</div></div>';
  if(_kioskTimer)clearInterval(_kioskTimer);
  _kioskTimer=setInterval(function(){if(document.getElementById('kioskView'))renderPageInMain(renderKioskPage);else clearInterval(_kioskTimer);},30000);
}

function toggleKioskFS(){
  if(!document.fullscreenElement)document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen();
  else document.exitFullscreen&&document.exitFullscreen();
}
