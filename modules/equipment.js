// ════════════════════════════════════════════════════════
// 設備/耗材回報
// ════════════════════════════════════════════════════════
var EQ_CATS={device:'設備故障',supply:'耗材不足',facility:'環境維修',other:'其他'};
var EQ_STATUS={open:'待處理',inprogress:'處理中',resolved:'已解決'};
var EQ_PRI={high:'🔴 緊急',medium:'🟡 一般',low:'🟢 低優先'};

function updateEqBadge(){
  var n=(store.equipment||[]).filter(function(e){return e.status!=='resolved';}).length;
  var b=document.getElementById('badge_eq');if(b)b.style.display=n>0?'flex':'none';
}

function renderEquipmentPage(c){
  var items=store.equipment||[];
  var pending=items.filter(function(e){return e.status!=='resolved';});
  var resolved=items.filter(function(e){return e.status==='resolved';});
  function eqCard(e){
    var canResolve=isAdmin()||hasPerm('manageIR');
    var priLabel=EQ_PRI[e.priority||'medium']||EQ_PRI.medium;
    var actions=e.status!=='resolved'
      ?(e.status==='open'?'<button class="btn-xs" onclick="setEqStatus(\''+e.id+'\',\'inprogress\')">開始處理</button>':'')
       +(canResolve?'<button class="btn-xs success" onclick="setEqStatus(\''+e.id+'\',\'resolved\')">標記解決</button>':'')
       +'<button class="btn-xs" onclick="openEqComment(\''+e.id+'\')">💬 跟進</button>'
       +(isAdmin()?'<button class="btn-xs danger" onclick="deleteEqReport(\''+e.id+'\')">刪除</button>':'')
      :'<span style="font-size:11px;color:var(--faint)">解決日期：'+esc(e.resolvedAt||'')+'</span>'
       +'<button class="btn-xs" onclick="openEqComment(\''+e.id+'\')" style="margin-left:6px">💬 跟進</button>';
    var comments=(e.comments||[]).map(function(cm){
      return '<div style="font-size:11px;padding:5px 8px;background:var(--bg);border-radius:var(--radius-sm);border-left:2px solid var(--primary);margin-top:4px">'
        +'<span style="font-weight:600;color:var(--primary)">'+esc(userName(cm.userId))+'</span>'
        +' <span style="color:var(--faint)">'+esc((cm.at||'').slice(0,10))+'</span>'
        +'<div style="margin-top:2px;color:var(--text)">'+esc(cm.text)+'</div></div>';
    }).join('');
    return '<div class="eq-card eq-s-'+e.status+'">'
      +'<div class="eq-card-top"><span class="eq-cat-badge">'+esc(EQ_CATS[e.category]||e.category)+'</span>'
      +'<span style="font-size:11px;color:var(--faint)">'+priLabel+'</span>'
      +'<span class="eq-status-lbl eq-sl-'+e.status+'">'+esc(EQ_STATUS[e.status]||e.status)+'</span></div>'
      +'<div class="eq-name">'+esc(e.name)+'</div>'
      +'<div class="eq-meta">📍 '+esc(e.location||'未指定')+' &nbsp;·&nbsp; 回報者：'+esc(userName(e.reportedBy))+' &nbsp;·&nbsp; '+esc((e.reportedAt||'').slice(0,10))+'</div>'
      +(e.note?'<div class="eq-note">'+esc(e.note)+'</div>':'')
      +(comments?'<div style="margin-top:6px">'+comments+'</div>':'')
      +'<div class="eq-actions">'+actions+'</div></div>';
  }
  c.innerHTML='<div class="admin-layout">'
    +'<div class="main-header"><div><h1>🔧 設備回報</h1><div class="main-header-meta">設備故障 · 耗材不足 · 環境維修</div></div>'
    +'<button class="btn-sm primary" onclick="openNewEqReport()">＋ 新增回報</button></div>'
    +'<div class="admin-content">'
    +'<div class="metric-grid" style="margin-bottom:16px">'
    +'<div class="metric-box"><div class="metric-num" style="color:var(--red)">'+pending.filter(function(e){return e.status==='open';}).length+'</div><div class="metric-lbl">待處理</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:var(--amber)">'+pending.filter(function(e){return e.status==='inprogress';}).length+'</div><div class="metric-lbl">處理中</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:var(--green)">'+resolved.length+'</div><div class="metric-lbl">已解決</div></div>'
    +'</div>'
    +(pending.length?'<div class="home-section">🚨 待處理 / 處理中</div>'+pending.map(eqCard).join('')
      :'<div style="padding:30px;text-align:center;color:var(--faint)">目前無待處理項目 ✅</div>')
    +(resolved.length?'<div class="home-section" style="margin-top:20px">✅ 已解決（最近10筆）</div>'+resolved.slice(-10).reverse().map(eqCard).join(''):'')
    +'</div></div>';
  updateEqBadge();
}

function openNewEqReport(){
  var locOpts=(store.rooms||[]).map(function(r){return '<option value="'+esc(r.name)+'">'+esc(r.name)+'</option>';}).join('');
  showModal('新增設備/耗材回報',
    '<div class="form-row"><label>類型</label><select id="eqCat">'
    +Object.entries(EQ_CATS).map(function(kv){return '<option value="'+kv[0]+'">'+kv[1]+'</option>';}).join('')+'</select></div>'
    +'<div class="form-row"><label>優先等級</label><select id="eqPri">'
    +'<option value="high">🔴 緊急</option><option value="medium" selected>🟡 一般</option><option value="low">🟢 低優先</option></select></div>'
    +'<div class="form-row"><label>名稱/項目</label><input id="eqName" placeholder="例：呼叫鈴故障、手術手套不足..."></div>'
    +'<div class="form-row"><label>地點</label><select id="eqLoc"><option value="">（選擇）</option>'+locOpts
    +'<option value="護理站">護理站</option><option value="倉庫">倉庫</option></select></div>'
    +'<div class="form-row"><label>補充說明</label><textarea id="eqNote" style="min-height:60px"></textarea></div>',
  function(){
    var name=document.getElementById('eqName').value.trim();
    if(!name){alert('請填寫名稱');return;}
    var item={id:uid(),name:name,category:document.getElementById('eqCat').value,
      priority:document.getElementById('eqPri').value,
      location:document.getElementById('eqLoc').value,note:document.getElementById('eqNote').value,
      status:'open',reportedBy:currentUser.id,reportedAt:today(),comments:[]};
    if(!store.equipment)store.equipment=[];
    store.equipment.push(item);logAudit('設備回報',name);saveStore();closeModal();
    renderPageInMain(renderEquipmentPage);updateEqBadge();showToast('回報已送出',name,'🔧');
  });
}

function openEqComment(id){
  showModal('新增跟進留言',
    '<div class="form-row"><label>留言內容</label><textarea id="eqCmTxt" style="min-height:80px" placeholder="更新處理進度、補充說明..."></textarea></div>',
  function(){
    var txt=document.getElementById('eqCmTxt').value.trim();if(!txt)return;
    var e=(store.equipment||[]).find(function(x){return x.id===id;});if(!e)return;
    if(!e.comments)e.comments=[];
    e.comments.push({userId:currentUser.id,text:txt,at:today()});
    saveStore();closeModal();renderPageInMain(renderEquipmentPage);showToast('跟進留言已新增','','💬');
  });
}

function setEqStatus(id,status){
  var e=(store.equipment||[]).find(function(x){return x.id===id;});if(!e)return;
  e.status=status;if(status==='resolved'){e.resolvedBy=currentUser.id;e.resolvedAt=today();}
  logAudit('設備狀態更新',e.name+' → '+(EQ_STATUS[status]||status));
  saveStore();renderPageInMain(renderEquipmentPage);updateEqBadge();showToast('狀態已更新',e.name,'✅');
}

function deleteEqReport(id){
  if(!confirm('確定刪除此回報？'))return;
  var e=(store.equipment||[]).find(function(x){return x.id===id;});
  store.equipment=(store.equipment||[]).filter(function(x){return x.id!==id;});
  logAudit('刪除設備回報',e?e.name:'');saveStore();renderPageInMain(renderEquipmentPage);updateEqBadge();
}
