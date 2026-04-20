// ════ 表單簽核 ════
const FTYPES={leave:{l:'請假',c:'ft-lv'},overtime:{l:'加班',c:'ft-ot'},supply:{l:'物品申請',c:'ft-sp'},other:{l:'其他',c:'ft-ot2'}};
function renderFormsPage(c){
  var exportBtn=(isAdmin()||hasPerm('exportData'))?'<button class="btn-sm" onclick="exportFormsCSV()">📥 匯出CSV</button>':'';
  c.innerHTML='<div class="admin-layout"><div class="main-header"><div><h1>📋 表單簽核</h1><div class="main-header-meta">請假 · 加班 · 物品申請 · 線上審核</div></div><div class="header-actions">'+exportBtn+'<button class="btn-sm primary" onclick="openNewFrm()">+ 新增申請</button></div></div><div class="admin-content" id="frmC"></div></div>';
  rnForms();
}
function isApp(f){const i=f.approvers.indexOf(currentUser.id);if(i<0)return false;if(i===0)return f.statuses[0]==='pending';return f.statuses[i-1]==='approved'&&f.statuses[i]==='pending';}
function withdrawForm(id){
  if(!confirm('\u78ba\u5b9a\u64a4\u56de\u6b64\u7533\u8acb\uff1f')) return;
  var f = store.formRequests.find(function(x){ return x.id===id; });
  if(!f) return;
  f.status = 'withdrawn';
  f.statuses = f.statuses.map(function(s){ return s==='pending'?'withdrawn':s; });
  logAudit('\u64a4\u56de\u7533\u8acb', f.title);
  saveStore(); rnForms();
  showToast('\u5df2\u64a4\u56de', f.title, '\u21a9\ufe0f');
}

// ── 審核結果通知 ──
function notifyFormResult(f, status, comment){
  if(!store.formNotifs) store.formNotifs = [];
  var ok = status === 'approved';
  store.formNotifs.unshift({
    id: uid(),
    toUserId: f.applicantId,
    formId: f.id,
    title: (ok ? '\u2713 \u7533\u8acb\u6838\u51c6\uff1a' : '\u2717 \u7533\u8acb\u99b3\u56de\uff1a') + f.title,
    body: comment || (ok ? '\u60a8\u7684\u7533\u8acb\u5df2\u7372\u6838\u51c6' : '\u60a8\u7684\u7533\u8acb\u5df2\u88ab\u99b3\u56de'),
    time: today() + ' ' + nowTime(),
    read: false
  });
}

// ── 申請詳情彈窗 ──
function openFormDetail(id){
  var f = store.formRequests.find(function(x){ return x.id===id; });
  if(!f) return;
  var ft = FTYPES[f.type] || FTYPES.other;
  var dateRange = f.startDate
    ? fmtDate(f.startDate) + (f.endDate && f.endDate!==f.startDate ? ' \uff5e ' + fmtDate(f.endDate) : '')
    : '\u2014';

  var stColors = { approved:'var(--green)', rejected:'var(--red)', withdrawn:'var(--muted)', pending:'var(--amber)' };
  var stLabels = { approved:'\u2713 \u6838\u51c6', rejected:'\u2717 \u99b3\u56de', withdrawn:'\u21a9 \u5df2\u64a4\u56de', pending:'\u23f3 \u5f85\u5be9' };

  var timeline = f.approvers.map(function(uid2, i){
    var st = f.statuses[i] || 'pending';
    var comment = f.comments && f.comments[i] ? f.comments[i] : '';
    var clr = stColors[st] || 'var(--muted)';
    var lbl = stLabels[st] || st;
    var dot = '<div style="width:28px;height:28px;border-radius:50%;background:' + clr
      + ';color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">'
      + (i+1) + '</div>';
    var line = i < f.approvers.length-1
      ? '<div style="width:2px;flex:1;min-height:14px;background:var(--b2);margin:2px auto 0;margin-left:13px"></div>'
      : '';
    var commentHtml = comment
      ? '<div style="font-size:12px;color:var(--muted);margin-top:6px;padding:6px 10px;background:var(--s2);border-radius:6px;font-style:italic">\u201c' + esc(comment) + '\u201d</div>'
      : '';
    return '<div style="display:flex;gap:12px;margin-bottom:4px">'
      + '<div style="display:flex;flex-direction:column;align-items:flex-start">' + dot + line + '</div>'
      + '<div style="padding-top:4px;flex:1;padding-bottom:10px">'
      + '<div style="font-size:13px;font-weight:600">' + esc(userName(uid2)) + '</div>'
      + '<div style="font-size:11px;color:' + clr + ';margin-top:1px">' + lbl + '</div>'
      + commentHtml
      + '</div></div>';
  }).join('');

  var attHtml = '';
  if(f.attachment){
    var a = f.attachment;
    attHtml = '<div class="form-row"><label>\u9644\u4ef6</label>'
      + (a.mime&&a.mime.startsWith('image/')
          ? '<img src="' + a.data + '" onclick="viewAttachment(\'' + f.id + '\')" style="max-height:100px;border-radius:6px;cursor:pointer;border:1px solid var(--b1)">'
          : '<a onclick="viewAttachment(\'' + f.id + '\')" style="cursor:pointer;color:var(--primary)">\ud83d\udcce ' + esc(a.name) + '</a>')
      + '</div>';
  }

  var overallSt = f.status === 'approved' ? '\u2713 \u6838\u51c6' : f.status === 'rejected' ? '\u2717 \u99b3\u56de' : f.status === 'withdrawn' ? '\u21a9 \u5df2\u64a4\u56de' : '\u5be9\u6838\u4e2d';
  var overallClr = stColors[f.status] || 'var(--amber)';

  var html = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding:10px 12px;background:var(--s2);border-radius:var(--radius-sm)">'
    + '<span class="ftype ' + ft.c + '">' + ft.l + '</span>'
    + '<span style="font-size:13px;font-weight:700;flex:1">' + esc(f.title) + '</span>'
    + '<span style="font-size:12px;font-weight:700;color:' + overallClr + '">' + overallSt + '</span>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">'
    + '<div class="form-row" style="margin:0"><label>\u7533\u8acb\u4eba</label><div style="font-size:13px;padding:4px 0">' + esc(userName(f.applicantId)) + '</div></div>'
    + '<div class="form-row" style="margin:0"><label>\u7533\u8acb\u65e5\u671f</label><div style="font-size:13px;padding:4px 0">' + fmtDate(f.createdAt) + '</div></div>'
    + '<div class="form-row" style="margin:0;grid-column:1/-1"><label>\u65e5\u671f\u5340\u9593</label><div style="font-size:13px;padding:4px 0">' + dateRange + '</div></div>'
    + '</div>'
    + (f.reason ? '<div class="form-row"><label>\u539f\u56e0\u8aaa\u660e</label><div style="font-size:13px;padding:8px;background:var(--s2);border-radius:6px;line-height:1.6;white-space:pre-wrap">' + esc(f.reason) + '</div></div>' : '')
    + attHtml
    + '<div class="form-row"><label>\u5be9\u6838\u6d41\u7a0b</label><div style="margin-top:8px">' + timeline + '</div></div>';

  showModal(esc(f.title), html, null);
  setTimeout(function(){
    var footer = document.querySelector('.modal-footer');
    if(footer) footer.style.display = 'none';
  }, 0);
}

// ── 新版 appF：帶意見 ──
function appF(id){
  showModal('\u5be9\u6838\u610f\u898b\uff08\u9078\u586b\uff09',
    '<div class="form-row"><label>\u9644\u5e36\u610f\u898b</label><textarea id="apComment" rows="3" style="width:100%;box-sizing:border-box;font-family:inherit;font-size:13px;border:1px solid var(--b2);border-radius:var(--radius-sm);padding:8px 10px;background:var(--bg);color:var(--text);resize:vertical;line-height:1.6" placeholder="\u9078\u586b\uff0c\u4f8b\uff1a\u540c\u610f\uff0c\u8acb\u6ce8\u610f\u8865\u73ed\u4e8b\u5b9c"></textarea></div>',
    function(){
      var comment = document.getElementById('apComment') ? document.getElementById('apComment').value.trim() : '';
      var f = store.formRequests.find(function(x){ return x.id===id; });
      if(!f) return;
      var i = f.approvers.indexOf(currentUser.id);
      if(i<0) return;
      if(!f.comments) f.comments = [];
      f.comments[i] = comment;
      f.statuses[i] = 'approved';
      if(f.statuses.every(function(s){ return s==='approved'; })) f.status = 'approved';
      logAudit('\u5be9\u6838\u901a\u904e', f.title||f.type||'\u8868\u55ae');
      notifyFormResult(f, 'approved', comment);
      saveStore(); closeModal(); rnForms();
      showToast('\u5df2\u6838\u51c6', f.title, '\u2705');
    }
  );
}

// ── 新版 rejF：帶意見 ──
function rejF(id){
  showModal('\u99b3\u56de\u539f\u56e0\uff08\u9078\u586b\uff09',
    '<div class="form-row"><label>\u99b3\u56de\u539f\u56e0</label><textarea id="rjComment" rows="3" style="width:100%;box-sizing:border-box;font-family:inherit;font-size:13px;border:1px solid var(--b2);border-radius:var(--radius-sm);padding:8px 10px;background:var(--bg);color:var(--text);resize:vertical;line-height:1.6" placeholder="\u9078\u586b\uff0c\u4f8b\uff1a\u65e5\u671f\u885d\u7a81\uff0c\u8acb\u91cd\u65b0\u7533\u8acb"></textarea></div>',
    function(){
      var comment = document.getElementById('rjComment') ? document.getElementById('rjComment').value.trim() : '';
      var f = store.formRequests.find(function(x){ return x.id===id; });
      if(!f) return;
      var i = f.approvers.indexOf(currentUser.id);
      if(i<0) return;
      if(!f.comments) f.comments = [];
      f.comments[i] = comment;
      f.statuses[i] = 'rejected';
      f.status = 'rejected';
      logAudit('\u5be9\u6838\u9000\u56de', f.title||f.type||'\u8868\u55ae');
      notifyFormResult(f, 'rejected', comment);
      saveStore(); closeModal(); rnForms();
      showToast('\u5df2\u99b3\u56de', f.title, '\u274c');
    }
  );
}

// ── 新版 rnForms：含撤回、詳情、意見顯示 ──
function rnForms(){
  var c = document.getElementById('frmC'); if(!c) return;
  if(!store.formNotifs) store.formNotifs = [];
  var all = store.formRequests.slice().sort(function(a,b){ return b.createdAt.localeCompare(a.createdAt); });

  function rCard(f){
    var ft = FTYPES[f.type] || FTYPES.other;
    var flow = f.approvers.map(function(uid2, i){
      var st = f.statuses[i] || 'pending';
      var cls = st==='approved'?'ad-ok':st==='rejected'?'ad-rj':i===f.statuses.filter(function(s){ return s==='approved'; }).length?'ad-cur':'ad-pd';
      var dot = (st==='approved'?'\u2713':st==='rejected'?'\u2717':String(i+1));
      var comment = f.comments && f.comments[i] ? f.comments[i] : '';
      var cHtml = comment
        ? '<div style="font-size:10px;color:var(--muted);margin-top:2px;font-style:italic;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(comment) + '">\u201c' + esc(comment.slice(0,12)) + (comment.length>12?'\u2026':'') + '\u201d</div>'
        : '';
      return '<div class="astep"><div class="adot ' + cls + '">' + dot + '</div>'
        + '<span style="font-size:11px;color:var(--muted)">' + esc(userName(uid2)) + '</span>'
        + cHtml + '</div>'
        + (i < f.approvers.length-1 ? '<span style="color:var(--faint);font-size:10px">\u2192</span>' : '');
    }).join('');

    var canA = isApp(f) && f.status==='pending';
    var canW = f.applicantId===currentUser.id && f.status==='pending';
    var dateRange = f.startDate
      ? ' \ud83d\udcc5 ' + fmtDate(f.startDate) + (f.endDate&&f.endDate!==f.startDate?' \uff5e '+fmtDate(f.endDate):'')
      : '';
    var stCls = f.status==='approved'?'fst-a':f.status==='rejected'?'fst-r':f.status==='withdrawn'?'fst-w':'fst-p';
    var stTxt = f.status==='approved'?'\u2713 \u6838\u51c6':f.status==='rejected'?'\u2717 \u99b3\u56de':f.status==='withdrawn'?'\u21a9 \u64a4\u56de':'\u5be9\u6838\u4e2d';
    var attHtml = f.attachment
      ? (f.attachment.mime&&f.attachment.mime.startsWith('image/')
          ? '<div class="frq-attach"><img src="' + f.attachment.data + '" onclick="viewAttachment(\'' + f.id + '\')" title="\u9ede\u64ca\u67e5\u770b\u5927\u5716"><span class="frq-attach-name">' + esc(f.attachment.name) + '</span></div>'
          : '<div class="frq-attach"><a onclick="viewAttachment(\'' + f.id + '\')" style="cursor:pointer">\ud83d\udcce ' + esc(f.attachment.name) + '</a></div>')
      : '';

    return '<div class="frq-card'+(f.urgent&&f.status==='pending'?' frq-urgent':'')+'">'
      +(f.urgent&&f.status==='pending'?'<span style="font-size:10px;font-weight:700;color:var(--red);background:#fce8e8;border-radius:99px;padding:2px 7px;flex-shrink:0;align-self:flex-start;margin-right:2px">🔴 緊急</span>':'')
      +'<span class="ftype ' + ft.c + '">' + ft.l + '</span>'
      + '<div style="flex:1;min-width:0">'
      + '<div style="font-size:13px;font-weight:600;margin-bottom:3px;cursor:pointer" onclick="openFormDetail(\'' + f.id + '\')">'
      + esc(f.title) + ' <span style="font-size:10px;color:var(--primary);font-weight:400">\u8a73\u60c5 \u203a</span></div>'
      + '<div style="font-size:11px;color:var(--faint);display:flex;gap:8px;flex-wrap:wrap">'
      + '<span>' + esc(userName(f.applicantId)) + '</span>'
      + '<span>' + fmtDate(f.createdAt) + '</span>'
      + (dateRange ? '<span>' + dateRange + '</span>' : '')
      + (f.reason ? '<span>' + esc(f.reason.slice(0,20)) + (f.reason.length>20?'\u2026':'') + '</span>' : '')
      + '</div>'
      + '<div class="aflow">' + flow + '</div>'
      + attHtml + '</div>'
      + '<div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">'
      + '<span class="' + stCls + '">' + stTxt + '</span>'
      + (canA ? '<button class="btn-sm primary" style="font-size:11px;padding:4px 8px" onclick="appF(\'' + f.id + '\')">\u6838\u51c6</button>'
               + '<button class="btn-sm danger" style="font-size:11px;padding:4px 8px" onclick="rejF(\'' + f.id + '\')">\u99b3\u56de</button>' : '')
      + (canW ? '<button class="btn-sm" style="font-size:11px;padding:4px 8px" onclick="withdrawForm(\'' + f.id + '\')">\u64a4\u56de</button>' : '')
      + (f.applicantId===currentUser.id&&f.status==='rejected'?'<button class="btn-sm primary" style="font-size:11px;padding:4px 8px" onclick="resubmitForm(\''+f.id+'\')">↩ 重新申請</button>':'')
      + '</div></div>';
  }

  // sort: urgent+pending first, then by date
  all.sort(function(a,b){
    var aUrgPend=(a.urgent&&a.status==='pending')?1:0;
    var bUrgPend=(b.urgent&&b.status==='pending')?1:0;
    if(bUrgPend!==aUrgPend)return bUrgPend-aUrgPend;
    return b.createdAt.localeCompare(a.createdAt);
  });
  var pend = all.filter(function(f){ return f.status==='pending' && isApp(f); });
  c.innerHTML = (pend.length
    ? '<div class="sec-label">\u5f85\u6211\u5be9\u6838\uff08' + pend.length + '\uff09</div>' + pend.map(rCard).join('') + '<div class="sec-label">\u5168\u90e8\u7533\u8acb</div>'
    : '<div class="sec-label">\u5168\u90e8\u7533\u8acb</div>'
  ) + all.map(rCard).join('');
}
function openNewFrm(){
  _pendingAttachment=null;
  const approvers=store.users.filter(u=>u.id!==currentUser.id&&u.status!=='disabled'&&u.status!=='resigned'&&(u.role==='admin'||(u.permissions&&u.permissions.approveForm)));
  const aOpts=approvers.length
    ?approvers.map(u=>'<option value="'+u.id+'">'+esc(u.name)+'</option>').join('')
    :'<option value="">（尚未設定可審核人員）</option>';
  showModal('新增申請單',
    '<div class="form-row"><label>類型</label><select id="fty"><option value="leave">請假</option><option value="overtime">加班</option><option value="supply">物品申請</option><option value="other">其他</option></select></div>'+
    '<div class="form-row"><label>標題</label><input id="ftit" placeholder="例：特休假申請 4/20"></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="form-row"><label>開始日期</label><input id="fsd" type="date" value="'+today()+'"></div><div class="form-row"><label>結束日期</label><input id="fed" type="date" value="'+today()+'"></div></div>'+
    '<div class="form-row"><label>原因</label><textarea id="frs"></textarea></div>'+
    '<div class="form-row"><label>送審主管</label><select id="fap">'+aOpts+'</select></div>'+
    '<div class="form-row"><label>附件（圖片或 PDF，上限 800 KB）</label><input type="file" id="fattach" accept="image/*,.pdf" onchange="handleAttachment(this)" style="font-size:12px;width:100%"><div id="fattachPreview"></div></div>'+
    '<div class="form-row" style="margin-top:2px"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="furgent" style="width:15px;height:15px;accent-color:var(--red);cursor:pointer"> <span style="color:var(--red);font-weight:700">🔴 標記為緊急（置頂顯示並提醒審核人員）</span></label></div>',
  ()=>{
    const t=document.getElementById('ftit').value.trim();if(!t)return;
    store.formRequests.unshift({
      id:uid(),type:document.getElementById('fty').value,title:t,
      applicantId:currentUser.id,date:today(),
      startDate:document.getElementById('fsd').value,
      endDate:document.getElementById('fed').value,
      reason:document.getElementById('frs').value,
      approvers:[document.getElementById('fap').value],
      statuses:['pending'],status:'pending',createdAt:today(),
      urgent:!!(document.getElementById('furgent')&&document.getElementById('furgent').checked),
      attachment:_pendingAttachment||null
    });
    _pendingAttachment=null;
    saveStore();closeModal();rnForms();
  });
}

// 值班表
function getWk(){const d=[];const dt=new Date();dt.setDate(dt.getDate()-dt.getDay()+1);for(let i=0;i<7;i++){const dd=new Date(dt);dd.setDate(dt.getDate()+i);d.push(dd.toISOString().split('T')[0]);}return d;}
// 值班表 → modules/duty.js

var _boardOpenId=null;

// 留言板 → modules/journal.js


// 衛教資料庫 → modules/edu.js


// ══════════════════════════════════════════
// 即時時鐘
// ══════════════════════════════════════════
function startClock(){
  const weekMap=['日','一','二','三','四','五','六'];
  function tick(){
    const now=new Date();
    const hh=String(now.getHours()).padStart(2,'0');
    const mm=String(now.getMinutes()).padStart(2,'0');
    const ss=String(now.getSeconds()).padStart(2,'0');
    const ck=document.getElementById('liveClock');
    const dk=document.getElementById('liveDate');
    if(ck)ck.textContent=hh+':'+mm+':'+ss;
    if(dk)dk.textContent=(now.getMonth()+1)+'/'+(now.getDate())+' ('+weekMap[now.getDay()]+')';
  }
  tick();
  setInterval(tick,1000);
}

// ══════════════════════════════════════════
// 在線人員 (Firebase: presence/{userId})
// ══════════════════════════════════════════
function startPresence(){
  if(!fbDb||!currentUser)return;
  const ref=fbDb.ref('presence/'+currentUser.id);
  ref.set({name:currentUser.name,id:currentUser.id,since:Date.now()});
  ref.onDisconnect().remove();
  fbDb.ref('presence').on('value',function(snap){
    const data=snap.val()||{};
    const bar=document.getElementById('presenceBar');
    if(!bar)return;
    const others=Object.values(data).filter(u=>u.id!==currentUser.id);
    if(!others.length){bar.innerHTML='<span style="font-size:10px;color:var(--faint);padding:2px 2px">目前只有你在線上</span>';return;}
    bar.innerHTML=others.map(u=>`<span class="presence-dot">${esc(u.name)}</span>`).join('');
  });
}

