// ════ 表單簽核 ════
const FTYPES={leave:{l:'請假',c:'ft-lv'},overtime:{l:'加班',c:'ft-ot'},supply:{l:'物品申請',c:'ft-sp'},other:{l:'其他',c:'ft-ot2'}};

// ── 簽核規則閾值（可由管理頁調整，存於 store.formRuleConfig） ──
var FORM_RULE_DEFAULTS={leaveDays:2,overtimeHours:4,supplyAmount:5000};
function getRuleConfig(){
  var c=(store&&store.formRuleConfig)||{};
  return {
    leaveDays:Number(c.leaveDays)>0?Number(c.leaveDays):FORM_RULE_DEFAULTS.leaveDays,
    overtimeHours:Number(c.overtimeHours)>0?Number(c.overtimeHours):FORM_RULE_DEFAULTS.overtimeHours,
    supplyAmount:Number(c.supplyAmount)>0?Number(c.supplyAmount):FORM_RULE_DEFAULTS.supplyAmount
  };
}

// ── 簽核規則：依類型 + 數量自動決定階數 ──
var FORM_RULES={
  leave:{
    extraFieldHtml:'',
    getCtx:function(){
      var sd=document.getElementById('fsd'),ed=document.getElementById('fed');
      if(!sd||!ed||!sd.value||!ed.value)return{days:1};
      var ms=new Date(ed.value)-new Date(sd.value);
      return{days:Math.max(1,Math.round(ms/86400000)+1)};
    },
    stages:function(ctx){return ctx.days<=getRuleConfig().leaveDays?1:2;},
    describe:function(ctx){var t=getRuleConfig().leaveDays;return ctx.days<=t?'📋 請假 '+ctx.days+' 天 → 建議 1 階審核（直屬主管）':'📋 請假 '+ctx.days+' 天（>'+t+' 天）→ 建議 2 階審核（主管 → 院方）';}
  },
  overtime:{
    extraFieldHtml:'<div class="form-row"><label>加班時數</label><input id="fhours" type="number" min="0" step="0.5" placeholder="例：3" oninput="updateRuleBanner()" style="width:140px"></div>',
    getCtx:function(){var h=document.getElementById('fhours');return{hours:h?(parseFloat(h.value)||0):0};},
    stages:function(ctx){return ctx.hours<=getRuleConfig().overtimeHours?1:2;},
    describe:function(ctx){var t=getRuleConfig().overtimeHours;return ctx.hours<=t?'📋 加班 '+ctx.hours+' 小時 → 建議 1 階審核':'📋 加班 '+ctx.hours+' 小時（>'+t+' 小時）→ 建議 2 階審核（主管 → 院方）';}
  },
  supply:{
    extraFieldHtml:'<div class="form-row"><label>金額（元）</label><input id="famount" type="number" min="0" step="1" placeholder="例：3000" oninput="updateRuleBanner()" style="width:140px"></div>',
    getCtx:function(){var a=document.getElementById('famount');return{amount:a?(parseFloat(a.value)||0):0};},
    stages:function(ctx){return ctx.amount<=getRuleConfig().supplyAmount?1:2;},
    describe:function(ctx){var t=getRuleConfig().supplyAmount;return ctx.amount<=t?'📋 物品申請 '+ctx.amount+' 元 → 建議 1 階審核':'📋 物品申請 '+ctx.amount+' 元（>'+t+' 元）→ 建議 2 階審核（主管 → 採購/院方）';}
  },
  other:{
    extraFieldHtml:'',
    getCtx:function(){return{};},
    stages:function(){return 1;},
    describe:function(){return '📋 其他類型 → 預設 1 階審核（可手動加階）';}
  }
};

// 多階審核人選擇狀態（僅在開啟新增/重新申請彈窗期間有效）
var _approverPicks=[''];

function getApproverCandidates(){
  return store.users.filter(function(u){
    return u.id!==currentUser.id&&u.status!=='disabled'&&u.status!=='resigned'
      &&(u.role==='admin'||u.role==='supervisor'||(u.permissions&&u.permissions.approveForm));
  });
}

function suggestApproversByRule(type){
  var rule=FORM_RULES[type]||FORM_RULES.other;
  var n=rule.stages(rule.getCtx());
  var pool=getApproverCandidates();
  var deptId=currentUser.deptId;
  var s1=pool.filter(function(u){return u.role==='supervisor'&&u.deptId===deptId;})[0]
       ||pool.filter(function(u){return u.role==='supervisor';})[0]
       ||pool.filter(function(u){return u.permissions&&u.permissions.approveForm;})[0]
       ||pool[0];
  if(n===1)return s1?[s1.id]:[''];
  var s2=pool.filter(function(u){return u.role==='admin'&&(!s1||u.id!==s1.id);})[0]
       ||pool.filter(function(u){return !s1||u.id!==s1.id;})[0];
  return [s1?s1.id:'',s2?s2.id:''];
}

function approverOptionsHtml(selectedId){
  var pool=getApproverCandidates();
  if(!pool.length)return '<option value="">（尚未設定可審核人員）</option>';
  return '<option value="">— 請選擇 —</option>'+pool.map(function(u){
    var sel=(u.id===selectedId)?' selected':'';
    var role=u.role==='admin'?'管理員':u.role==='supervisor'?'主管':'可審核';
    return '<option value="'+u.id+'"'+sel+'>'+esc(u.name)+' · '+role+'</option>';
  }).join('');
}

function renderApproverPicker(){
  var box=document.getElementById('approverPicker');if(!box)return;
  if(!_approverPicks.length)_approverPicks=[''];
  var maxStages=5;
  var rows=_approverPicks.map(function(picked,i){
    var canRemove=_approverPicks.length>1;
    return '<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">'
      +'<div style="width:28px;height:28px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">'+(i+1)+'</div>'
      +'<select onchange="setApproverPick('+i+',this.value)" style="flex:1;padding:7px 10px;border:1px solid var(--b1);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);font-size:13px;font-family:inherit">'+approverOptionsHtml(picked)+'</select>'
      +(canRemove?'<button type="button" class="btn-sm" style="font-size:11px;padding:4px 8px" onclick="removeApproverStage('+i+')" title="移除這一階">×</button>':'<span style="display:inline-block;width:32px"></span>')
      +'</div>';
  }).join('');
  var addBtn=_approverPicks.length<maxStages?'<button type="button" class="btn-sm" style="font-size:11px;padding:5px 10px" onclick="addApproverStage()">＋ 加一階</button>':'';
  var ruleBtn='<button type="button" class="btn-sm primary" style="font-size:11px;padding:5px 10px" onclick="applyRuleSuggestion()" title="依規則自動填入建議審核人">🎯 依規則建議</button>';
  box.innerHTML=rows+'<div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">'+addBtn+ruleBtn+'</div>';
}

function setApproverPick(i,val){_approverPicks[i]=val;}
function addApproverStage(){_approverPicks.push('');renderApproverPicker();}
function removeApproverStage(i){_approverPicks.splice(i,1);if(!_approverPicks.length)_approverPicks=[''];renderApproverPicker();}
function applyRuleSuggestion(){
  var ty=document.getElementById('fty');if(!ty)return;
  _approverPicks=suggestApproversByRule(ty.value);
  if(!_approverPicks.length)_approverPicks=[''];
  renderApproverPicker();updateRuleBanner();
}
function updateRuleBanner(){
  var ty=document.getElementById('fty'),banner=document.getElementById('ruleBanner');
  if(!ty||!banner)return;
  var rule=FORM_RULES[ty.value]||FORM_RULES.other;
  banner.innerHTML=rule.describe(rule.getCtx())+' <span style="color:var(--faint);font-size:11px">（可手動調整）</span>';
}
function onFormTypeChange(){
  var ty=document.getElementById('fty');if(!ty)return;
  var host=document.getElementById('extraFieldHost');
  if(host){var rule=FORM_RULES[ty.value]||FORM_RULES.other;host.innerHTML=rule.extraFieldHtml||'';}
  updateRuleBanner();
}
function renderFormsPage(c){
  var exportBtn=(isAdmin()||hasPerm('exportData'))?'<button class="btn-sm" onclick="exportFormsCSV()">📥 匯出CSV</button>':'';
  c.innerHTML='<div class="admin-layout"><div class="main-header"><div><h1>📋 表單簽核</h1><div class="main-header-meta">請假 · 加班 · 物品申請 · 線上審核</div></div><div class="header-actions">'+exportBtn+'<button class="btn-sm primary" onclick="openNewFrm()">+ 新增申請</button></div></div><div class="admin-content" id="frmC"></div></div>';
  rnForms();
}
function isApp(f){const i=f.approvers.indexOf(currentUser.id);if(i<0)return false;if(i===0)return f.statuses[0]==='pending';return f.statuses[i-1]==='approved'&&f.statuses[i]==='pending';}

// ── 逾期判定：pending 超過 24 小時 ──
var FORM_OVERDUE_HOURS=24;
function isFormOverdue(f){
  if(!f||f.status!=='pending'||!f.createdAt)return false;
  var ms=Date.now()-new Date(f.createdAt).getTime();
  if(isNaN(ms))return false;
  return ms>FORM_OVERDUE_HOURS*3600*1000;
}
function overdueHours(f){
  if(!f||!f.createdAt)return 0;
  var ms=Date.now()-new Date(f.createdAt).getTime();
  return Math.max(0,Math.floor(ms/3600000));
}

// ── 表單列表篩選狀態 ──
var _formFilter='all';
function setFormFilter(v){_formFilter=v;rnForms();}
function withdrawForm(id){
  if(!confirm('\u78ba\u5b9a\u64a4\u56de\u6b64\u7533\u8acb\uff1f')) return;
  var f = store.formRequests.find(function(x){ return x.id===id; });
  if(!f) return;
  f.status = 'withdrawn';
  f.statuses = f.statuses.map(function(s){ return s==='pending'?'withdrawn':s; });
  logAudit('\u64a4\u56de\u7533\u8acb', f.title);
  saveCollection('formRequests'); rnForms();
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

  // 重申歷程：往上找父單，往下找後續重申
  var historyHtml = '';
  if(f.resubmittedFrom){
    var parent = store.formRequests.find(function(x){ return x.id === f.resubmittedFrom; });
    if(parent){
      var rejIdx = (parent.statuses||[]).lastIndexOf('rejected');
      var rejComment = rejIdx >= 0 && parent.comments && parent.comments[rejIdx] ? parent.comments[rejIdx] : '';
      historyHtml += '<div style="background:#fff8e1;border-left:3px solid var(--amber,#f5a623);border-radius:6px;padding:10px 12px;margin-bottom:12px;font-size:12px;line-height:1.6">'
        + '<div style="font-weight:700;color:var(--amber,#c87a00);margin-bottom:4px">↩ 此為重新申請</div>'
        + '<div style="color:var(--muted)">原申請：<a onclick="closeModal();setTimeout(function(){openFormDetail(\''+parent.id+'\');},50)" style="color:var(--primary);cursor:pointer;text-decoration:underline">'+esc(parent.title)+'</a> · '+fmtDate(parent.createdAt)+'</div>'
        + (rejComment ? '<div style="margin-top:6px;padding:6px 8px;background:rgba(255,255,255,0.6);border-radius:4px;font-style:italic;color:var(--text)">原駁回意見：「'+esc(rejComment)+'」</div>' : '')
        + '</div>';
    }
  }
  var children = (store.formRequests||[]).filter(function(x){ return x.resubmittedFrom === f.id; });
  if(children.length){
    historyHtml += '<div style="background:var(--s2);border-radius:6px;padding:10px 12px;margin-bottom:12px;font-size:12px;line-height:1.6">'
      + '<div style="font-weight:700;margin-bottom:4px">📎 後續重申</div>'
      + children.map(function(ch){
          var st = ch.status==='approved'?'✓ 核准':ch.status==='rejected'?'✗ 駁回':ch.status==='withdrawn'?'↩ 撤回':'⏳ 審核中';
          return '<div style="margin-top:3px"><a onclick="closeModal();setTimeout(function(){openFormDetail(\''+ch.id+'\');},50)" style="color:var(--primary);cursor:pointer;text-decoration:underline">'+esc(ch.title)+'</a> · '+fmtDate(ch.createdAt)+' · '+st+'</div>';
        }).join('')
      + '</div>';
  }

  var html = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding:10px 12px;background:var(--s2);border-radius:var(--radius-sm)">'
    + '<span class="ftype ' + ft.c + '">' + ft.l + '</span>'
    + '<span style="font-size:13px;font-weight:700;flex:1">' + esc(f.title) + '</span>'
    + '<span style="font-size:12px;font-weight:700;color:' + overallClr + '">' + overallSt + '</span>'
    + '</div>'
    + historyHtml
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
      var totalStages = f.approvers.length;
      var allDone = f.statuses.every(function(s){ return s==='approved'; });
      if(allDone){
        f.status = 'approved';
        notifyFormResult(f, 'approved', comment);
      } else {
        var nextId = f.approvers[i+1];
        if(nextId){
          if(!store.formNotifs) store.formNotifs = [];
          store.formNotifs.unshift({
            id: uid(), toUserId: nextId, formId: f.id,
            title: '\u23f3 \u5f85\u60a8\u5be9\u6838\uff1a' + f.title,
            body: '\u7b2c ' + (i+1) + ' \u968e\u5df2\u6838\u51c6\uff0c\u8f2a\u5230\u60a8\u7c3d\u6838',
            time: today() + ' ' + nowTime(), read: false
          });
        }
      }
      var stageLabel = totalStages > 1 ? '\uff08\u7b2c'+(i+1)+'/'+totalStages+'\u968e'+(allDone?'\u3001\u6700\u7d42':'')+'\uff09' : '';
      logAudit('\u5be9\u6838\u901a\u904e'+stageLabel, f.title||f.type||'\u8868\u55ae');
      saveMultiple(['formRequests','formNotifs']); closeModal(); rnForms();
      showToast(allDone?'\u5df2\u6838\u51c6\uff08\u6700\u7d42\uff09':'\u5df2\u6838\u51c6 '+stageLabel, f.title, '\u2705');
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
      saveMultiple(['formRequests','formNotifs']); closeModal(); rnForms();
      showToast('\u5df2\u99b3\u56de', f.title, '\u274c');
    }
  );
}

// ── 個人簽核儀表板：統計 + 篩選 ──
function renderFormDashboard(all){
  var me=currentUser.id;
  var pendingForMe=all.filter(function(f){return f.status==='pending'&&isApp(f);});
  var myPending=all.filter(function(f){return f.applicantId===me&&f.status==='pending';});
  var ym=today().slice(0,7); // YYYY-MM
  var myThisMonth=all.filter(function(f){
    if(f.applicantId!==me||!f.createdAt)return false;
    return f.createdAt.slice(0,7)===ym;
  });
  var myMonthApproved=myThisMonth.filter(function(f){return f.status==='approved';}).length;
  var myMonthRejected=myThisMonth.filter(function(f){return f.status==='rejected';}).length;
  var overdueAll=all.filter(isFormOverdue);

  function tile(label,val,sub,clr,key){
    var active=_formFilter===key?' style="outline:2px solid var(--primary);outline-offset:-2px"':'';
    var cursor=key?' cursor:pointer;':'';
    return '<div'+(key?' onclick="setFormFilter(\''+key+'\')"':'')
      +' style="flex:1;min-width:130px;background:var(--surface);border:1px solid var(--b1);border-radius:var(--radius-sm);padding:10px 12px;'+cursor+'"'
      +(active?' data-active="1"':'')+'>'
      +'<div style="font-size:11px;color:var(--muted)">'+label+'</div>'
      +'<div style="font-size:22px;font-weight:700;color:'+clr+';line-height:1.1;margin-top:2px">'+val+'</div>'
      +(sub?'<div style="font-size:10px;color:var(--faint);margin-top:2px">'+sub+'</div>':'')
      +'</div>';
  }
  return '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">'
    +tile('待我審核',pendingForMe.length,pendingForMe.length?'點此篩選':'目前無待審','var(--amber,#f5a623)','pending_me')
    +tile('我送出（審核中）',myPending.length,'','var(--primary)','my_pending')
    +tile('本月已核准',myMonthApproved,myMonthRejected?'駁回 '+myMonthRejected+' 件':'','var(--green,#2ec27e)',null)
    +tile('逾期',overdueAll.length,overdueAll.length?'>'+FORM_OVERDUE_HOURS+'h pending':'','var(--red,#e54545)','overdue')
    +'</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">'
    +['all:全部','pending_me:待我審核','my_pending:我送出（審核中）','my_all:我送出（全部）','overdue:逾期'].map(function(s){
      var p=s.split(':'),k=p[0],l=p[1];
      var on=_formFilter===k;
      return '<button class="btn-sm'+(on?' primary':'')+'" style="font-size:11px;padding:4px 10px" onclick="setFormFilter(\''+k+'\')">'+l+'</button>';
    }).join('')
    +'</div>';
}

// ── 新版 rnForms：含儀表板、篩選、逾期、撤回、詳情、意見顯示 ──
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

    var overdue = isFormOverdue(f);
    var ovHtml = overdue
      ? '<span style="font-size:10px;font-weight:700;color:#b8001f;background:#fde8ec;border-radius:99px;padding:2px 7px;flex-shrink:0;align-self:flex-start;margin-right:2px" title="送出後已超過 '+FORM_OVERDUE_HOURS+' 小時尚未完成">🕒 逾期 '+overdueHours(f)+'h</span>'
      : '';
    return '<div class="frq-card'+(f.urgent&&f.status==='pending'?' frq-urgent':'')+(overdue?' frq-overdue':'')+'">'
      +(f.urgent&&f.status==='pending'?'<span style="font-size:10px;font-weight:700;color:var(--red);background:#fce8e8;border-radius:99px;padding:2px 7px;flex-shrink:0;align-self:flex-start;margin-right:2px">🔴 緊急</span>':'')
      +ovHtml
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

  // sort: \u903e\u671f + \u7dca\u6025 pending \u512a\u5148\uff1b\u5176\u9918\u6309\u65e5\u671f\u964d\u51aa
  all.sort(function(a,b){
    var aOv=isFormOverdue(a)?1:0,bOv=isFormOverdue(b)?1:0;
    if(bOv!==aOv)return bOv-aOv;
    var aUrgPend=(a.urgent&&a.status==='pending')?1:0;
    var bUrgPend=(b.urgent&&b.status==='pending')?1:0;
    if(bUrgPend!==aUrgPend)return bUrgPend-aUrgPend;
    return b.createdAt.localeCompare(a.createdAt);
  });

  var dash = renderFormDashboard(all);
  var me = currentUser.id;
  var listSrc;
  var sectionLabel='';
  if(_formFilter==='pending_me'){
    listSrc = all.filter(function(f){ return f.status==='pending' && isApp(f); });
    sectionLabel = '\u5f85\u6211\u5be9\u6838\uff08' + listSrc.length + '\uff09';
  } else if(_formFilter==='my_pending'){
    listSrc = all.filter(function(f){ return f.applicantId===me && f.status==='pending'; });
    sectionLabel = '\u6211\u9001\u51fa \u00b7 \u5be9\u6838\u4e2d\uff08' + listSrc.length + '\uff09';
  } else if(_formFilter==='my_all'){
    listSrc = all.filter(function(f){ return f.applicantId===me; });
    sectionLabel = '\u6211\u9001\u51fa \u00b7 \u5168\u90e8\uff08' + listSrc.length + '\uff09';
  } else if(_formFilter==='overdue'){
    listSrc = all.filter(isFormOverdue);
    sectionLabel = '\u903e\u671f\u7533\u8acb\uff08' + listSrc.length + '\uff09';
  } else {
    listSrc = all;
    sectionLabel = '\u5168\u90e8\u7533\u8acb\uff08' + listSrc.length + '\uff09';
  }

  var pend = (_formFilter==='all') ? all.filter(function(f){ return f.status==='pending' && isApp(f); }) : [];
  var emptyHtml = '<div style="padding:30px;text-align:center;color:var(--faint);font-size:13px">\u6b64\u5206\u985e\u4e0b\u6c92\u6709\u8cc7\u6599</div>';
  c.innerHTML = dash + (pend.length
    ? '<div class="sec-label">\u5f85\u6211\u5be9\u6838\uff08' + pend.length + '\uff09</div>' + pend.map(rCard).join('') + '<div class="sec-label">' + sectionLabel + '</div>'
    : '<div class="sec-label">' + sectionLabel + '</div>'
  ) + (listSrc.length ? listSrc.map(rCard).join('') : emptyHtml);
}
function openNewFrm(){
  _pendingAttachment=null;
  _approverPicks=[''];
  showModal('新增申請單',
    '<div class="form-row"><label>類型</label><select id="fty" onchange="onFormTypeChange()"><option value="leave">請假</option><option value="overtime">加班</option><option value="supply">物品申請</option><option value="other">其他</option></select></div>'+
    '<div class="form-row"><label>標題</label><input id="ftit" placeholder="例：特休假申請 4/20"></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="form-row"><label>開始日期</label><input id="fsd" type="date" value="'+today()+'" onchange="updateRuleBanner()"></div><div class="form-row"><label>結束日期</label><input id="fed" type="date" value="'+today()+'" onchange="updateRuleBanner()"></div></div>'+
    '<div id="extraFieldHost"></div>'+
    '<div class="form-row"><label>原因</label><textarea id="frs"></textarea></div>'+
    '<div id="ruleBanner" style="font-size:12px;color:var(--primary);background:var(--s2);padding:8px 10px;border-radius:var(--radius-sm);margin:4px 0 10px;line-height:1.5"></div>'+
    '<div class="form-row"><label>送審流程（依序簽核）</label><div id="approverPicker"></div></div>'+
    '<div class="form-row"><label>附件（圖片或 PDF，上限 800 KB）</label><input type="file" id="fattach" accept="image/*,.pdf" onchange="handleAttachment(this)" style="font-size:12px;width:100%"><div id="fattachPreview"></div></div>'+
    '<div class="form-row" style="margin-top:2px"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="furgent" style="width:15px;height:15px;accent-color:var(--red);cursor:pointer"> <span style="color:var(--red);font-weight:700">🔴 標記為緊急（置頂顯示並提醒審核人員）</span></label></div>',
  function(){
    var t=document.getElementById('ftit').value.trim();if(!t){alert('請輸入標題');return;}
    if(_approverPicks.some(function(x){return !x;})){alert('每一階都必須選擇審核人，或請移除空白階');return;}
    if(!_approverPicks.length){alert('請至少指定 1 位審核人');return;}
    var seen={};
    for(var k=0;k<_approverPicks.length;k++){
      if(seen[_approverPicks[k]]){alert('同一審核人不可重複指派於不同階');return;}
      seen[_approverPicks[k]]=1;
    }
    var ty=document.getElementById('fty').value;
    var hoursEl=document.getElementById('fhours'),amountEl=document.getElementById('famount');
    store.formRequests.unshift({
      id:uid(),type:ty,title:t,
      applicantId:currentUser.id,date:today(),
      startDate:document.getElementById('fsd').value,
      endDate:document.getElementById('fed').value,
      reason:document.getElementById('frs').value,
      approvers:_approverPicks.slice(),
      statuses:_approverPicks.map(function(){return 'pending';}),
      comments:[],
      status:'pending',createdAt:today(),
      urgent:!!(document.getElementById('furgent')&&document.getElementById('furgent').checked),
      attachment:_pendingAttachment||null,
      hours:hoursEl?(parseFloat(hoursEl.value)||0):undefined,
      amount:amountEl?(parseFloat(amountEl.value)||0):undefined
    });
    _pendingAttachment=null;_approverPicks=[''];
    saveCollection('formRequests');closeModal();rnForms();
    showToast('已送出申請',t,'📋');
  });
  setTimeout(function(){onFormTypeChange();applyRuleSuggestion();},0);
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

