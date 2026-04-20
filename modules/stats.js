// ════════════════════════════════════════════════════════
// 統計報表
// ════════════════════════════════════════════════════════

function renderStatsPage(c){
  var allTasks = store.meetings.flatMap(function(m){ return m.tasks; });
  var doneTasks = allTasks.filter(function(t){ return t.status==='已完成'; }).length;
  var overdueTasks = allTasks.filter(function(t){ return t.status!=='已完成'&&t.due&&t.due<today(); }).length;
  var critTasks = allTasks.filter(function(t){ return t.priority==='critical'; }).length;
  var taskRate = allTasks.length ? Math.round(doneTasks/allTasks.length*100) : 0;
  var irOpen = store.incidents.filter(function(i){ return i.status!=='closed'; }).length;

  var days7 = [];
  for(var i=6;i>=0;i--){
    var d = new Date(); d.setDate(d.getDate()-i);
    var ds = d.toISOString().slice(0,10);
    days7.push({ label:(d.getMonth()+1)+'/'+(d.getDate()), count:store.incidents.filter(function(ir){ return ir.date===ds; }).length });
  }

  var shiftCounts = {morning:0,afternoon:0,night:0,off:0};
  if(store.dutySchedule){
    Object.values(store.dutySchedule).forEach(function(ud){ Object.values(ud).forEach(function(sh){ if(shiftCounts[sh]!==undefined) shiftCounts[sh]++; }); });
  }

  var deptStats = store.departments.map(function(d){
    return {name:d.name, count:store.users.filter(function(u){ return u.deptId===d.id; }).length};
  }).filter(function(d){ return d.count>0; }).sort(function(a,b){ return b.count-a.count; });

  var userTaskStats = store.users.map(function(u){
    var assigned = allTasks.filter(function(t){ return t.assigneeId===u.id; });
    var done = assigned.filter(function(t){ return t.status==='已完成'; }).length;
    return {name:u.name, total:assigned.length, done:done, pct:assigned.length?Math.round(done/assigned.length*100):0};
  }).filter(function(u){ return u.total>0; }).sort(function(a,b){ return b.pct-a.pct; });

  var annReadRates = store.announcements.slice(0,6).map(function(a){
    var total = store.users.length;
    var read = Object.values(a.reads).filter(Boolean).length;
    return {title:a.title, pct:total?Math.round(read/total*100):0};
  });

  var babies = store.babies||[];
  var boys = babies.filter(function(b){ return b.gender==='boy'; }).length;
  var girls = babies.filter(function(b){ return b.gender==='girl'; }).length;

  var irLvCnt = ['1','2','3','4'].map(function(lv){
    return {lv:lv, label:irLevels[lv]?irLevels[lv].label:'L'+lv, cnt:store.incidents.filter(function(ir){ return ir.level===lv; }).length};
  });

  var irChartData = days7.map(function(d){ return {l:d.label,v:d.count}; });
  var irColors = days7.map(function(d){ return d.count===0?'var(--b2)':d.count>=3?'var(--red)':'var(--amber)'; });
  var deptChartData = deptStats.map(function(d){ return {l:d.name,v:d.count}; });
  var shiftChartData = [{l:'早班',v:shiftCounts.morning},{l:'午班',v:shiftCounts.afternoon},{l:'夜班',v:shiftCounts.night}];
  var userTaskChartData = userTaskStats.slice(0,10).map(function(u){ return {l:u.name,v:u.pct}; });
  var annChartData = annReadRates.map(function(a){ return {l:a.title,v:a.pct}; });

  function svgMultiBarChart(data,colors,h){
    h=h||140;var w=400;
    if(!data||!data.length)return '<div style="color:var(--faint);font-size:12px;padding:20px;text-align:center">暫無資料</div>';
    var max=Math.max.apply(null,data.map(function(d){return d.v;}))||1;
    var gap=(w-40)/data.length;
    var bw=Math.max(8,Math.floor(gap*0.6));
    var gridLines=[0.25,0.5,0.75,1].map(function(f){
      var y=Math.round(h-18-f*(h-32));
      return '<line x1="10" y1="'+y+'" x2="'+(w-10)+'" y2="'+y+'" stroke="var(--b1)" stroke-width="1"/>';
    }).join('');
    var bars=data.map(function(d,i){
      var bh=Math.round(d.v/max*(h-32));if(bh<2)bh=2;
      var x=Math.round(i*gap+20+(gap-bw)/2);
      var y=h-18-bh;
      var clr=colors&&colors[i]?colors[i]:'var(--primary)';
      var lbl=d.l.length>5?d.l.slice(0,5)+'…':d.l;
      return '<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="3" fill="'+clr+'" opacity=".85"><title>'+d.l+': '+d.v+'</title></rect>'
        +'<text class="chart-label" x="'+(x+bw/2)+'" y="'+(h-2)+'" text-anchor="middle">'+lbl+'</text>'
        +(d.v>0?'<text class="chart-label" x="'+(x+bw/2)+'" y="'+(y-4)+'" text-anchor="middle" style="font-weight:700;fill:var(--text)">'+d.v+'</text>':'');
    }).join('');
    return '<svg class="chart-svg" viewBox="0 0 '+w+' '+h+'" style="height:'+h+'px">'+gridLines+bars+'</svg>';
  }

  c.innerHTML = '<div class="admin-layout">'
    +'<div class="main-header"><div><h1>統計報表</h1><div class="main-header-meta">任務 · 公告 · 事件 · 排班 · 人員</div></div></div>'
    +'<div class="admin-content">'
    +'<div class="metric-grid">'
    +'<div class="metric-box"><div class="metric-num" style="color:var(--green)" data-target="'+taskRate+'">0%</div><div class="metric-lbl">任務完成率</div></div>'
    +'<div class="metric-box"><div class="metric-num" data-target="'+allTasks.length+'">0</div><div class="metric-lbl">總任務數</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:var(--red)" data-target="'+overdueTasks+'">0</div><div class="metric-lbl">逾期任務</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:var(--red)" data-target="'+critTasks+'">0</div><div class="metric-lbl">緊急任務</div></div>'
    +'<div class="metric-box"><div class="metric-num" data-target="'+store.meetings.length+'">0</div><div class="metric-lbl">會議總數</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:'+(irOpen>0?'var(--red)':'var(--green)')+'" data-target="'+irOpen+'">0</div><div class="metric-lbl">未結案通報</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:#5ba5e0" data-target="'+boys+'">0</div><div class="metric-lbl">🍼 男寶</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:#e07ca0" data-target="'+girls+'">0</div><div class="metric-lbl">🌸 女寶</div></div>'
    +'</div>'
    +'<div class="stat-card"><div class="stat-card-title">📈 近 7 天異常事件趨勢</div>'
    +svgMultiBarChart(irChartData,irColors,140)+'</div>'
    +'<div class="stat-card"><div class="stat-card-title">🗓 班別分布（排班紀錄）</div>'
    +(shiftChartData.some(function(d){return d.v>0;})?svgBarChart(shiftChartData,'var(--amber)',140):'<div style="color:var(--faint);font-size:13px">尚無排班資料</div>')
    +'</div>'
    +'<div class="stat-card"><div class="stat-card-title">🏥 科別人員分布</div>'
    +(deptChartData.length?svgBarChart(deptChartData,'var(--primary)',140):'<div style="color:var(--faint);font-size:13px">尚無資料</div>')
    +'</div>'
    +'<div class="stat-card"><div class="stat-card-title">✅ 成員任務完成率（%）</div>'
    +(userTaskChartData.length?svgBarChart(userTaskChartData,'var(--green)',140):'<div style="color:var(--faint);font-size:13px">尚無任務資料</div>')
    +'</div>'
    +'<div class="stat-card"><div class="stat-card-title">📢 公告閱讀率（%）</div>'
    +(annChartData.length?svgBarChart(annChartData,'var(--blue)',140):'<div style="color:var(--faint);font-size:13px">尚無公告</div>')
    +'</div>'
    +'<div class="stat-card"><div class="stat-card-title">⚠️ 異常事件等級統計</div>'
    +'<div class="metric-grid" style="grid-template-columns:repeat(4,1fr)">'
    +irLvCnt.map(function(x){ return '<div class="metric-box"><div class="metric-num">'+x.cnt+'</div><div class="metric-lbl">'+esc(x.label)+'</div></div>'; }).join('')
    +'</div></div>'
    +'</div></div>';

  setTimeout(function(){ animateNumbers(c); }, 80);
}
