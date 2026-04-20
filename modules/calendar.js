// ════ 行事曆 ════
// CALENDAR
// ══════════════════════════════════════════
let calYear=new Date().getFullYear(),calMonth=new Date().getMonth();
function renderCalendarPage(c){
  c.innerHTML=`<div class="admin-layout">
    <div class="main-header">
      <div><h1>行事曆</h1><div class="main-header-meta">會議 · 交班 · 值班排程</div></div>
    </div>
    <div class="admin-content" id="calWrap"></div>
  </div>`;
  renderCalendar();
}
function renderCalendar(){
  const w=document.getElementById('calWrap');if(!w)return;
  const days=['日','一','二','三','四','五','六'];
  const first=new Date(calYear,calMonth,1);
  const last=new Date(calYear,calMonth+1,0);
  const startDay=first.getDay();
  const cells=[];
  for(let i=0;i<startDay;i++){
    const d=new Date(calYear,calMonth,-(startDay-1-i));
    cells.push({date:d,current:false});
  }
  for(let d=1;d<=last.getDate();d++)cells.push({date:new Date(calYear,calMonth,d),current:true});
  while(cells.length%7!==0)cells.push({date:new Date(calYear,calMonth+1,cells.length-last.getDate()-startDay+1),current:false});

  const dayLabels=days.map(d=>`<div class="cal-day-label">${d}</div>`).join('');
  const cellHtml=cells.map(cell=>{
    const ds=cell.date.toISOString().split('T')[0];
    const isToday=ds===today();
    const meetings=store.meetings.filter(m=>m.date===ds);
    const shifts=store.shifts.filter(s=>s.date===ds);
    const myDuty=(store.dutySchedule&&store.dutySchedule[currentUser.id]&&store.dutySchedule[currentUser.id][ds])||'';
    const leaveReqs=(store.formRequests||[]).filter(f=>f.type==='leave'&&f.status==='approved'&&f.startDate<=ds&&(!f.endDate||f.endDate>=ds));
    const events=[
      ...meetings.map(m=>`<div class="cal-event cal-event-meeting" onclick="event.stopPropagation();selectMeeting('${m.id}');setPage('meetings')" title="${esc(m.title)}">${esc(m.title)}</div>`),
      ...shifts.map(s=>`<div class="cal-event cal-event-shift" title="${esc(s.unit)}">${s.shift==='morning'?'早':s.shift==='afternoon'?'午':'夜'} ${esc(s.unit)}</div>`),
      ...(myDuty&&myDuty!=='off'?[`<div class="cal-event cal-event-duty" title="我的班別">${(SHINFO[myDuty]||{l:myDuty}).l}</div>`]:[]),
      ...leaveReqs.map(f=>`<div class="cal-event cal-event-leave" title="${esc(userName(f.applicantId))} 請假">${esc(userName(f.applicantId).slice(0,2))} 休</div>`)
    ].join('');
    return`<div class="cal-cell ${isToday?'today':''} ${!cell.current?'other-month':''}">
      <div class="cal-date-num">${cell.date.getDate()}</div>${events}
    </div>`;
  }).join('');

  w.innerHTML=`<div class="cal-header">
    <div class="cal-nav">
      <button onclick="calNav(-1)">‹</button>
      <div class="cal-title">${calYear} 年 ${calMonth+1} 月</div>
      <button onclick="calNav(1)">›</button>
    </div>
    <button class="btn-sm" onclick="calYear=new Date().getFullYear();calMonth=new Date().getMonth();renderCalendar()">今天</button>
  </div>
  <div class="cal-grid-header">${dayLabels}</div>
  <div class="cal-grid">${cellHtml}</div>
  <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
    <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)"><span style="width:10px;height:10px;background:var(--blue-bg);border-radius:2px;display:inline-block"></span>會議</span>
    <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)"><span style="width:10px;height:10px;background:var(--green-bg);border-radius:2px;display:inline-block"></span>交班</span>
    <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)"><span style="width:10px;height:10px;background:var(--amber-bg);border-radius:2px;display:inline-block"></span>我的班別</span>
    <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)"><span style="width:10px;height:10px;background:#fce8e8;border-radius:2px;display:inline-block"></span>核准假單</span>
  </div>`;
}
function calNav(dir){calMonth+=dir;if(calMonth>11){calMonth=0;calYear++;}else if(calMonth<0){calMonth=11;calYear--;}renderCalendar();}

