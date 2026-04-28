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

  // 請假使用率
  var leaveTypes = (typeof LEAVE_TYPES!=='undefined'?LEAVE_TYPES:[{id:'annual',label:'年假'},{id:'sick',label:'病假'},{id:'personal',label:'事假'}]);
  var leaveChartData = leaveTypes.map(function(lt){
    var cnt=(store.leaves||[]).filter(function(l){return l.type===lt.id&&l.status==='approved';}).length;
    return {l:lt.label,v:cnt};
  }).filter(function(d){return d.v>0;});

  // 庫存統計
  var invItems = store.inventory||[];
  var invLow = invItems.filter(function(x){return x.quantity<=x.minStock;}).length;
  var invChartData = invItems.slice(0,10).map(function(x){return {l:(x.name||'').slice(0,6),v:x.quantity||0};});

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
    h=h||170;
    var w=500,PL=20,PR=16,PT=26,PB=40;
    var CW=w-PL-PR,CH=h-PT-PB;
    if(!data||!data.length)return '<div style="color:var(--faint);font-size:12px;padding:24px;text-align:center">暫無資料</div>';
    var CMAP={'var(--primary)':'#c4527a','var(--sakura)':'#e8709a','var(--lavender)':'#9b7fd4','var(--green)':'#1a7a45','var(--blue)':'#1558a0','var(--amber)':'#c87800','var(--red)':'#e03030','var(--teal)':'#0d8070','var(--b2)':'#c0b0b8'};
    var PAL=['#e8709a','#9b7fd4','#5a9ef5','#3db89a','#f0a030','#e06060'];
    var max=Math.max.apply(null,data.map(function(d){return d.v;}))||1;
    var gap=CW/data.length;
    var bw=Math.max(10,Math.min(52,Math.floor(gap*0.62)));
    var defsArr=data.map(function(d,i){
      var raw=colors&&colors[i]?colors[i]:PAL[i%PAL.length];
      var clr=CMAP[raw]||(raw.startsWith('var(')?PAL[i%PAL.length]:raw);
      d._clr=clr;
      var gid='mcg'+i+Math.random().toString(36).slice(2,5);
      d._gid=gid;
      return '<linearGradient id="'+gid+'" x1="0" y1="0" x2="0" y2="1">'
        +'<stop offset="0%" stop-color="'+clr+'" stop-opacity="1"/>'
        +'<stop offset="100%" stop-color="'+clr+'" stop-opacity="0.38"/>'
        +'</linearGradient>';
    });
    var grid=[0.25,0.5,0.75,1].map(function(f){
      var y=PT+CH-Math.round(f*CH);
      return '<line x1="'+PL+'" y1="'+y+'" x2="'+(w-PR)+'" y2="'+y+'" stroke="var(--b1)" stroke-width="1" stroke-dasharray="4 3"/>'
        +'<text x="'+(PL-6)+'" y="'+(y+4)+'" text-anchor="end" font-size="9" fill="var(--faint)" font-family="Nunito,sans-serif">'+Math.round(max*f)+'</text>';
    }).join('');
    var bars=data.map(function(d,i){
      var bh=Math.max(4,Math.round(d.v/max*CH));
      var x=Math.round(PL+i*gap+(gap-bw)/2);
      var y=PT+CH-bh;
      var r=Math.min(7,bw/2);
      var path='M'+(x+r)+','+y+' H'+(x+bw-r)+' Q'+(x+bw)+','+y+' '+(x+bw)+','+(y+r)+' V'+(PT+CH)+' H'+x+' V'+(y+r)+' Q'+x+','+y+' '+(x+r)+','+y+'Z';
      var lbl=d.l.length>6?d.l.slice(0,5)+'…':d.l;
      return '<path class="chart-bar" d="'+path+'" fill="url(#'+d._gid+')"><title>'+d.l+': '+d.v+'</title></path>'
        +'<text x="'+(x+bw/2)+'" y="'+(PT+CH+17)+'" text-anchor="middle" font-size="10" fill="var(--muted)" font-family="Nunito,sans-serif">'+lbl+'</text>'
        +(d.v>0?'<text x="'+(x+bw/2)+'" y="'+(y-6)+'" text-anchor="middle" font-size="11" font-weight="700" fill="'+d._clr+'" font-family="Nunito,sans-serif">'+d.v+'</text>':'');
    }).join('');
    return '<svg class="chart-svg" viewBox="0 0 '+w+' '+h+'" style="height:'+h+'px"><defs>'+defsArr.join('')+'</defs>'+grid+bars+'</svg>';
  }

  c.innerHTML = '<div class="admin-layout">'
    +'<div class="main-header"><div><h1>統計報表</h1><div class="main-header-meta">任務 · 公告 · 事件 · 排班 · 人員 · 請假 · 庫存</div></div></div>'
    +'<div class="admin-content">'
    +'<div class="metric-grid">'
    +'<div class="metric-box"><div class="metric-num" style="color:var(--green)" data-target="'+taskRate+'">0%</div><div class="metric-lbl">任務完成率</div></div>'
    +'<div class="metric-box"><div class="metric-num" data-target="'+allTasks.length+'">0</div><div class="metric-lbl">總任務數</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:var(--red)" data-target="'+overdueTasks+'">0</div><div class="metric-lbl">逾期任務</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:var(--red)" data-target="'+critTasks+'">0</div><div class="metric-lbl">緊急任務</div></div>'
    +'<div class="metric-box"><div class="metric-num" data-target="'+store.meetings.length+'">0</div><div class="metric-lbl">會議總數</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:'+(irOpen>0?'var(--red)':'var(--green)')+'" data-target="'+irOpen+'">0</div><div class="metric-lbl">未結案通報</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:var(--amber)" data-target="'+(store.leaves||[]).filter(function(l){return l.status==='approved';}).length+'">0</div><div class="metric-lbl">核准假單</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:'+(invLow>0?'var(--red)':'var(--green)')+'" data-target="'+invLow+'">0</div><div class="metric-lbl">庫存警示</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:#5ba5e0" data-target="'+boys+'">0</div><div class="metric-lbl">🍼 男寶</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:#e07ca0" data-target="'+girls+'">0</div><div class="metric-lbl">🌸 女寶</div></div>'
    +'</div>'
    +'<div class="stat-card"><div class="stat-card-bar" style="background:linear-gradient(90deg,#e8709a,#9b7fd4)"></div><div class="stat-card-inner"><div class="stat-card-title">📈 近 7 天異常事件趨勢</div>'
    +svgMultiBarChart(irChartData,irColors,170)+'</div></div>'
    +'<div class="stat-card"><div class="stat-card-bar" style="background:linear-gradient(90deg,#f0a030,#e8709a)"></div><div class="stat-card-inner"><div class="stat-card-title">🗓 班別分布（排班紀錄）</div>'
    +(shiftChartData.some(function(d){return d.v>0;})?svgBarChart(shiftChartData,'var(--amber)',170):'<div style="color:var(--faint);font-size:13px">尚無排班資料</div>')
    +'</div></div>'
    +'<div class="stat-card"><div class="stat-card-bar" style="background:linear-gradient(90deg,#9b7fd4,#5a9ef5)"></div><div class="stat-card-inner"><div class="stat-card-title">🏥 科別人員分布</div>'
    +(deptChartData.length?svgBarChart(deptChartData,'var(--lavender)',170):'<div style="color:var(--faint);font-size:13px">尚無資料</div>')
    +'</div></div>'
    +'<div class="stat-card"><div class="stat-card-bar" style="background:linear-gradient(90deg,#3db89a,#5a9ef5)"></div><div class="stat-card-inner"><div class="stat-card-title">✅ 成員任務完成率（%）</div>'
    +(userTaskChartData.length?svgBarChart(userTaskChartData,'var(--mint)',170):'<div style="color:var(--faint);font-size:13px">尚無任務資料</div>')
    +'</div></div>'
    +'<div class="stat-card"><div class="stat-card-bar" style="background:linear-gradient(90deg,#5a9ef5,#9b7fd4)"></div><div class="stat-card-inner"><div class="stat-card-title">📢 公告閱讀率（%）</div>'
    +(annChartData.length?svgBarChart(annChartData,'var(--sky)',170):'<div style="color:var(--faint);font-size:13px">尚無公告</div>')
    +'</div></div>'
    +'<div class="stat-card"><div class="stat-card-bar" style="background:linear-gradient(90deg,#9b7fd4,#e8709a)"></div><div class="stat-card-inner"><div class="stat-card-title">📅 假別使用次數（核准）</div>'
    +(leaveChartData.length?svgBarChart(leaveChartData,'var(--lavender)',170):'<div style="color:var(--faint);font-size:13px">尚無請假紀錄</div>')
    +'</div></div>'
    +'<div class="stat-card"><div class="stat-card-bar" style="background:linear-gradient(90deg,#3db89a,#9b7fd4)"></div><div class="stat-card-inner"><div class="stat-card-title">📦 庫存數量（前10項）</div>'
    +(invChartData.length?svgBarChart(invChartData,'var(--mint)',170):'<div style="color:var(--faint);font-size:13px">尚無庫存資料</div>')
    +'</div></div>'
    +'<div class="stat-card"><div class="stat-card-title">⚠️ 異常事件等級統計</div>'
    +'<div class="metric-grid" style="grid-template-columns:repeat(4,1fr)">'
    +irLvCnt.map(function(x){ return '<div class="metric-box"><div class="metric-num">'+x.cnt+'</div><div class="metric-lbl">'+esc(x.label)+'</div></div>'; }).join('')
    +'</div></div>'
    +'</div></div>';

  setTimeout(function(){ animateNumbers(c); }, 80);
}
