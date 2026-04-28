// ════ 交班紀錄 ════
var shiftFilter = 'all';
var shiftSearch  = '';

// ── 緊急等級定義 ──
var SH_URGENCY = {
  normal:  { label:'一般',   cls:'',         bg:'',                         icon:'' },
  watch:   { label:'需關注', cls:'su-watch',  bg:'var(--amber-bg)',          icon:'⚠️' },
  critical:{ label:'警示',   cls:'su-crit',   bg:'rgba(220,50,50,.07)',      icon:'🚨' }
};

// ── 安全旗標定義 ──
var SH_FLAGS = [
  { id:'npo',       label:'禁食 NPO',     icon:'🚫',  color:'#e05a00' },
  { id:'iso_c',     label:'接觸隔離',     icon:'🧤',  color:'#1a7a3c' },
  { id:'iso_d',     label:'飛沫隔離',     icon:'😷',  color:'#1a7a3c' },
  { id:'iso_a',     label:'空氣隔離',     icon:'💨',  color:'#1a7a3c' },
  { id:'fall',      label:'跌倒高風險',   icon:'⚠',  color:'#b06000' },
  { id:'pressure',  label:'壓傷照護',     icon:'🩹',  color:'#904080' },
  { id:'allergy',   label:'藥物過敏警示', icon:'💊',  color:'#c00030' }
];

// ════════════════════════════════
// 頁面渲染
// ════════════════════════════════
function renderShiftPage(c){
  shiftViewMode = 'list';
  var todayCnt   = store.shifts.filter(function(s){ return s.date===today(); }).length;
  var pendingCnt = store.shifts.filter(function(s){ return !s.toSigned; }).length;
  var critCnt    = store.shifts.filter(function(s){ return !s.toSigned && s.urgency==='critical'; }).length;

  c.innerHTML =
    '<div class="admin-layout">'
    +'<div class="main-header">'
    +'<div><h1>交班紀錄</h1><div class="main-header-meta">早班 06:00 &nbsp;·&nbsp; 午班 14:00 &nbsp;·&nbsp; 夜班 22:00</div></div>'
    +'<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">'
    +'<button class="btn-sm" onclick="openShiftHelp()" title="使用教學">📖 教學</button>'
    +'<div style="display:flex;border:1px solid var(--b2);border-radius:var(--radius-sm);overflow:hidden">'
    +'<button id="svBtnList" class="btn-sm active" style="border:none;border-radius:0;padding:5px 10px" onclick="switchShiftView(\'list\')">列表</button>'
    +'<button id="svBtnCal"  class="btn-sm"        style="border:none;border-radius:0;padding:5px 10px;border-left:1px solid var(--b2)" onclick="switchShiftView(\'cal\')">月曆</button>'
    +'</div>'
    +'<button class="btn-sm primary" onclick="openNewShift()">＋ 新增交班</button>'
    +'</div></div>'

    // 統計列
    +'<div class="metric-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:14px">'
    +'<div class="metric-box"><div class="metric-num" style="font-size:22px">'+todayCnt+'</div><div class="metric-lbl">今日交班</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="font-size:22px;color:'+(pendingCnt>0?'var(--amber)':'var(--green)')+'">'+pendingCnt+'</div><div class="metric-lbl">待簽收</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="font-size:22px;color:'+(critCnt>0?'var(--red)':'var(--faint)')+'">'+critCnt+'</div><div class="metric-lbl">🚨 警示未簽</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="font-size:22px">'+store.shifts.length+'</div><div class="metric-lbl">累計紀錄</div></div>'
    +'</div>'

    // 搜尋列
    +'<div style="margin-bottom:10px">'
    +'<input id="shiftSearchInput" placeholder="🔍 搜尋病房單位..." value="'+esc(shiftSearch)+'" oninput="setShiftSearch(this.value)" '
    +'style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--b1);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);font-size:13px;font-family:inherit">'
    +'</div>'

    // 篩選標籤
    +'<div style="display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap" id="shiftFilterBar">'
    +[['all','全部'],['morning','🌅 早班'],['afternoon','☀️ 午班'],['night','🌙 夜班'],['pending','⏳ 待簽收'],['critical','🚨 警示']].map(function(pair){
      return '<button class="btn-sm'+(shiftFilter===pair[0]?' primary':'')+'" onclick="setShiftFilter(\''+pair[0]+'\')" id="sfBtn_'+pair[0]+'">'+pair[1]+'</button>';
    }).join('')
    +'</div>'

    +'<div id="shiftListWrap"><div class="admin-content" id="shiftList"></div></div>'
    +'<div id="shiftCalWrap" style="display:none"></div>'
    +'</div>';

  renderShiftList();
}

function setShiftFilter(f){
  shiftFilter = f;
  document.querySelectorAll('#shiftFilterBar button').forEach(function(b){ b.classList.remove('primary'); });
  var btn = document.getElementById('sfBtn_'+f); if(btn) btn.classList.add('primary');
  renderShiftList();
}

function setShiftSearch(v){
  shiftSearch = v;
  renderShiftList();
}

// ════════════════════════════════
// 班別徽章
// ════════════════════════════════
function shiftLabel(s){
  if(s==='morning')  return '<span class="shift-badge shift-morning">🌅 早班</span>';
  if(s==='afternoon')return '<span class="shift-badge shift-afternoon">☀️ 午班</span>';
  return '<span class="shift-badge shift-night">🌙 夜班</span>';
}

// ════════════════════════════════
// 列表渲染
// ════════════════════════════════
function renderShiftList(){
  var c = document.getElementById('shiftList'); if(!c) return;
  var sorted = [...store.shifts].sort(function(a,b){
    // 警示且未簽收優先
    var aPri = (!a.toSigned && a.urgency==='critical') ? 0 : (!a.toSigned) ? 1 : 2;
    var bPri = (!b.toSigned && b.urgency==='critical') ? 0 : (!b.toSigned) ? 1 : 2;
    if(aPri !== bPri) return aPri - bPri;
    return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
  });

  // 篩選
  if(shiftFilter==='morning')   sorted = sorted.filter(function(s){ return s.shift==='morning'; });
  else if(shiftFilter==='afternoon') sorted = sorted.filter(function(s){ return s.shift==='afternoon'; });
  else if(shiftFilter==='night')     sorted = sorted.filter(function(s){ return s.shift==='night'; });
  else if(shiftFilter==='pending')   sorted = sorted.filter(function(s){ return !s.toSigned; });
  else if(shiftFilter==='critical')  sorted = sorted.filter(function(s){ return s.urgency==='critical' && !s.toSigned; });

  // 搜尋
  if(shiftSearch.trim()){
    var kw = shiftSearch.trim().toLowerCase();
    sorted = sorted.filter(function(s){ return (s.unit||'').toLowerCase().includes(kw); });
  }

  if(!sorted.length){ c.innerHTML = _shiftEmptyState(); return; }

  // 按日期分組
  var groups = {};
  sorted.forEach(function(s){ if(!groups[s.date]) groups[s.date]=[]; groups[s.date].push(s); });

  var html = Object.keys(groups).sort(function(a,b){ return b.localeCompare(a); }).map(function(date){
    var isToday = date === today();
    var cards   = groups[date].map(function(s){ return _shiftCard(s); }).join('');
    return '<div class="home-section" style="margin-top:14px;margin-bottom:8px">'
      +(isToday?'<span style="background:var(--primary);color:#fff;font-size:10px;padding:2px 7px;border-radius:99px;margin-right:6px">今天</span>':'')
      +fmtDate(date)+'</div>'+cards;
  }).join('');

  c.innerHTML = html;
}

// ════════════════════════════════
// 卡片渲染
// ════════════════════════════════
function _shiftCard(s){
  var canSign  = s.toUserId===currentUser.id && !s.toSigned;
  var done     = s.fromSigned && s.toSigned;
  var urgency  = SH_URGENCY[s.urgency||'normal'];
  var clDone   = s.checklist && s.checklist.length ? s.checklist.filter(function(i){ return i.done; }).length : 0;
  var clTotal  = s.checklist ? s.checklist.length : 0;

  // 安全旗標列
  var flagsHtml = '';
  if(s.flags && s.flags.length){
    flagsHtml = '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px;">'
      +s.flags.map(function(fid){
        var fd = SH_FLAGS.find(function(f){ return f.id===fid; });
        if(!fd) return '';
        return '<span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;background:'+fd.color+'22;color:'+fd.color+'">'
          +fd.icon+' '+fd.label+'</span>';
      }).join('')
      +'</div>';
  }

  // 待追蹤檢驗
  var labsHtml = s.labs
    ? '<div class="handover-field"><label>🧪 待追蹤檢驗</label><p style="color:var(--amber)">'+esc(s.labs)+'</p></div>'
    : '';

  // 待辦清單（含時間戳）
  var checklistHtml = '';
  if(clTotal){
    var allDone = clDone === clTotal;
    checklistHtml = '<div class="handover-field" style="margin-top:8px">'
      +'<label>✅ 待辦清單 '
      +(allDone?'<span class="sign-chip sign-done" style="font-size:10px">全部完成 ✓</span>'
               :'<span style="font-size:10px;color:var(--faint)">('+clDone+'/'+clTotal+')</span>')
      +'</label>'
      +'<div class="cl-list">'
      +s.checklist.map(function(item){
        var ts = item.done && item.doneAt
          ? '<span style="font-size:10px;color:var(--faint);margin-left:auto;white-space:nowrap">'+esc(userName(item.doneBy||''))+' '+esc((item.doneAt||'').slice(11,16))+'</span>'
          : '';
        return '<label class="cl-item'+(item.done?' cl-done':'')+'" style="display:flex;align-items:center;gap:6px">'
          +'<input type="checkbox" '+(item.done?'checked':'')
          +' onchange="toggleChecklistItem(\''+s.id+'\',\''+item.id+'\',this.checked)" style="accent-color:#c4527a;flex-shrink:0"> '
          +'<span style="flex:1">'+esc(item.text)+'</span>'
          +ts+'</label>';
      }).join('')
      +'</div></div>';
  }

  // 緊急等級頂部橫幅
  var urgencyBanner = s.urgency && s.urgency!=='normal'
    ? '<div style="background:'+urgency.bg+';padding:7px 14px;margin:-16px -16px 12px;border-radius:var(--radius) var(--radius) 0 0;font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px;'
      +(s.urgency==='critical'?'color:#c00030':'color:#7a5000')+'">'
      +urgency.icon+' 等級標記：'+urgency.label
      +'</div>'
    : '';

  return '<div class="handover-card '+(done?'signed':'')+(s.urgency==='critical'&&!done?' sh-crit':s.urgency==='watch'&&!done?' sh-watch':'')+'">'
    +urgencyBanner
    +'<div class="hc-header">'
    +shiftLabel(s.shift)
    +'<div class="hc-title">'+esc(s.unit)+'</div>'
    +(done?'<span class="sign-chip sign-done">✓ 完成交接</span>':'<span class="sign-chip sign-pending"><span class="sign-dot"></span>待接班確認</span>')
    +'</div>'

    // 安全旗標
    +flagsHtml

    // 主要四欄
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +'<div class="handover-field"><label>🛏 病患狀況</label><p>'+esc(s.patients||'—')+'</p></div>'
    +'<div class="handover-field"><label>⚠️ 本班重要事件</label><p>'+esc(s.keyEvents||'—')+'</p></div>'
    +'<div class="handover-field"><label>📋 待辦事項</label><p>'+esc(s.pending||'—')+'</p></div>'
    +'<div class="handover-field"><label>💊 用藥/點滴</label><p>'+esc(s.meds||'—')+'</p></div>'
    +'</div>'

    // 待追蹤檢驗
    +labsHtml

    // 待辦清單
    +checklistHtml

    // 簽名列
    +'<div class="sign-row">'
    +'<span style="font-size:12px;color:var(--muted)">交班：</span>'
    +avatarEl(s.fromUserId,20)
    +'<span style="font-size:12px">'+esc(userName(s.fromUserId))+'</span>'
    +'<span class="sign-chip '+(s.fromSigned?'sign-done':'sign-pending')+'"><span class="sign-dot"></span>'+(s.fromSigned?'已簽':'待簽')+'</span>'
    +'<span style="font-size:12px;color:var(--muted);margin-left:8px">接班：</span>'
    +avatarEl(s.toUserId,20)
    +'<span style="font-size:12px">'+esc(userName(s.toUserId))+'</span>'
    +'<span class="sign-chip '+(s.toSigned?'sign-done':'sign-pending')+'"><span class="sign-dot"></span>'+(s.toSigned?'已簽':'待簽')+'</span>'
    +(canSign?'<button class="btn-sm primary" style="margin-left:auto" onclick="confirmSignShift(\''+s.id+'\')">✓ 我要簽收</button>':'')
    +(!s.toSigned && (currentUser.id===s.fromUserId || isAdmin())
        ?'<button class="btn-xs" style="margin-left:'+(canSign?'4px':'auto')+'" onclick="openEditShift(\''+s.id+'\')">✏ 編輯</button>':'')
    +(isAdmin()?'<button class="btn-xs danger" style="margin-left:4px" onclick="deleteShift(\''+s.id+'\')">✕</button>':'')
    +'</div>'
    +'</div>';
}

function _shiftEmptyState(){
  var tip = shiftFilter==='all' && !shiftSearch
    ? '<div style="text-align:center;padding:40px 20px;color:var(--faint)">'
      +'<div style="font-size:32px;margin-bottom:10px">📋</div>'
      +'<div style="font-size:14px;margin-bottom:6px;color:var(--text)">尚無交班紀錄</div>'
      +'<div style="font-size:12px;margin-bottom:16px">點擊右上角「＋ 新增交班」開始記錄，或查看「📖 教學」了解操作方式</div>'
      +'<button class="btn-sm primary" onclick="openShiftHelp()">📖 查看使用教學</button>'
      +'</div>'
    : '<div style="text-align:center;padding:30px;color:var(--faint);font-size:13px">找不到符合的交班紀錄</div>';
  return tip;
}

// ════════════════════════════════
// 簽收（加入閱讀確認）
// ════════════════════════════════
function confirmSignShift(id){
  var s = store.shifts.find(function(x){ return x.id===id; }); if(!s) return;
  var hasCrit = s.urgency==='critical';
  var pendingCl = (s.checklist||[]).filter(function(i){ return !i.done; }).length;
  var msg = '確認已閱讀本次交班內容並完成接班？'
    +(hasCrit?'\n\n⚠️ 此交班標記為「警示」等級，請確認已充分了解重要事件。':'')
    +(pendingCl>0?'\n\n📋 尚有 '+pendingCl+' 項待辦清單未完成，確認仍要簽收？':'');
  if(!confirm(msg)) return;
  signShift(id);
}

function signShift(id){
  var s = store.shifts.find(function(x){ return x.id===id; }); if(!s) return;
  s.toSigned = true; s.toSignedAt = today()+' '+nowTime();
  saveStore(); renderShiftList();
  showToast('簽收完成','交班已確認，'+nowTime(),'✓');
}

// ════════════════════════════════
// 新增交班
// ════════════════════════════════
function openNewShift(){
  var nurseOpts = store.users.filter(function(u){ return u.status!=='disabled'&&u.status!=='resigned'; })
    .map(function(u){ return '<option value="'+u.id+'">'+esc(u.name)+' ('+esc(userDept(u.id))+')</option>'; }).join('');

  showModal('新增交班紀錄',
    '<div style="background:linear-gradient(135deg,#fff0f5,#fdf4ff);border:1px solid rgba(196,82,122,.2);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:14px;font-size:12px;color:var(--muted);display:flex;gap:8px;align-items:flex-start">'
    +'<span style="font-size:16px;flex-shrink:0">💡</span>'
    +'<span>填寫越詳細，接班人員越能快速掌握狀況。可點選下方範本快速填入，再依實際情況修改。</span></div>'

    // 快速範本
    +'<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">'
    +'<span style="font-size:11px;color:var(--faint);align-self:center">快速範本：</span>'
    +'<button class="btn-xs" onclick="_fillShiftTemplate(\'maternity\')">🏥 產後病房</button>'
    +'<button class="btn-xs" onclick="_fillShiftTemplate(\'nicu\')">🍼 新生兒室</button>'
    +'<button class="btn-xs" onclick="_fillShiftTemplate(\'delivery\')">🌸 產房</button>'
    +'</div>'

    // 基本資訊
    +'<div class="form-row"><label>病房/單位</label><input id="shUnit" placeholder="例：產後護理 3A 病房"></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +'<div class="form-row"><label>日期</label><input id="shDate" type="date" value="'+today()+'"></div>'
    +'<div class="form-row"><label>班別</label><select id="shShift"><option value="morning">🌅 早班（06:00）</option><option value="afternoon">☀️ 午班（14:00）</option><option value="night">🌙 夜班（22:00）</option></select></div>'
    +'<div class="form-row"><label>交班人</label><select id="shFrom">'+nurseOpts+'</select></div>'
    +'<div class="form-row"><label>接班人</label><select id="shTo">'+nurseOpts+'</select></div>'
    +'</div>'

    // 緊急等級
    +'<div class="form-row"><label>🚦 緊急等級 <span style="font-weight:400;color:var(--faint)">本班是否有需要特別注意的狀況？</span></label>'
    +'<div style="display:flex;gap:8px;margin-top:4px">'
    +'<label style="display:flex;align-items:center;gap:5px;font-size:13px;cursor:pointer"><input type="radio" name="shUrgency" value="normal"  checked> 一般</label>'
    +'<label style="display:flex;align-items:center;gap:5px;font-size:13px;cursor:pointer;color:#7a5000"><input type="radio" name="shUrgency" value="watch"> ⚠️ 需關注</label>'
    +'<label style="display:flex;align-items:center;gap:5px;font-size:13px;cursor:pointer;color:#c00030"><input type="radio" name="shUrgency" value="critical"> 🚨 警示</label>'
    +'</div></div>'

    // 安全旗標
    +'<div class="form-row"><label>🛡 安全旗標 <span style="font-weight:400;color:var(--faint)">勾選本班有的特殊照護需求</span></label>'
    +'<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">'
    +SH_FLAGS.map(function(f){
      return '<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;padding:4px 8px;border:1px solid var(--b1);border-radius:99px;background:var(--surface)">'
        +'<input type="checkbox" name="shFlag" value="'+f.id+'" style="accent-color:'+f.color+'"> '
        +f.icon+' '+f.label+'</label>';
    }).join('')
    +'</div></div>'

    // 臨床欄位
    +'<div class="form-row"><label>🛏 病患狀況 <span style="font-weight:400;color:var(--faint)">收治人數、逐床重要狀態</span></label>'
    +'<textarea id="shPatients" placeholder="目前收治 8 位，床 301 產後第2日血壓偏高持續監測，床 305 剖腹產後第1日傷口滲液加強觀察" style="min-height:70px"></textarea></div>'
    +'<div class="form-row"><label>⚠️ 本班重要事件 <span style="font-weight:400;color:var(--faint)">異常、通報、已處置</span></label>'
    +'<textarea id="shEvents" placeholder="14:30 床 302 體溫 38.2°C 已通報主治，遵囑退燒藥，每30分鐘量測" style="min-height:70px"></textarea></div>'
    +'<div class="form-row"><label>🧪 待追蹤檢驗值 <span style="font-weight:400;color:var(--faint)">抽血結果未回、待複查項目</span></label>'
    +'<textarea id="shLabs" placeholder="床 303 CBC 於 22:00 後回報，請追蹤 Hb 是否 <8；床 307 膽紅素明早複查" style="min-height:55px"></textarea></div>'
    +'<div class="form-row"><label>📋 待辦事項 <span style="font-weight:400;color:var(--faint)">未完成、需接班執行</span></label>'
    +'<textarea id="shPending" placeholder="床 303 隔日抽血請於 06:00 前採樣；床 308 換留置針" style="min-height:70px"></textarea></div>'
    +'<div class="form-row"><label>💊 用藥/點滴 <span style="font-weight:400;color:var(--faint)">在跑的 IV、藥物警示、庫存</span></label>'
    +'<input id="shMeds" placeholder="床 301 Oxytocin 10mU/min 剩 120mL；胰島素庫存 2 支請補充"></div>'
    +'<div class="form-row"><label>✅ 待辦清單 <span style="font-weight:400;color:var(--faint)">每行一項，接班可逐項打勾</span></label>'
    +'<textarea id="shChecklist" style="min-height:90px" placeholder="床 301 量血壓&#10;床 305 傷口換藥&#10;核對胰島素庫存&#10;確認新生兒篩檢報告回報"></textarea></div>',
  saveShift);
}

// ════════════════════════════════
// 快速範本
// ════════════════════════════════
function _fillShiftTemplate(type){
  var tpl = {
    maternity:{
      unit:'產後護理 3A 病房',
      patients:'目前收治 10 位，床 301 產後第2日、血壓 148/92 持續監測；床 305 剖腹產後第1日、傷口滲液已處置；其餘病患狀況穩定。',
      events:'14:30 床 302 哺乳困難，已請泌乳師協助；16:00 床 307 新生兒黃疸指數 12.5，已通報醫師遵囑照光治療。',
      labs:'床 303 CBC 22:00 後回報，追蹤 Hb；床 307 膽紅素明早 06:00 複查。',
      pending:'床 303 隔日抽血（肝功能）請於 06:00 前採樣；床 308 排班更換靜脈留置針；確認今日出院床位備品補充。',
      meds:'Oxytocin 點滴床 301 仍在進行（10mU/min，剩餘 120mL）；胰島素庫存僅剩 2 支，請明早補充。',
      checklist:'床 301 量血壓\n床 305 傷口換藥\n床 307 照光治療確認\n核對胰島素庫存\n確認今日出院手續'
    },
    nicu:{
      unit:'新生兒加護病房',
      patients:'目前收治 6 位新生兒，嬰 A（36週早產）呼吸穩定監測中；嬰 B（足月）黃疸照光第2日；其餘生命跡象穩定。',
      events:'15:00 嬰 C 血氧短暫下降至 92%，已調整姿勢後回升至 98%，請持續觀察；嬰 D 首次親餵，協助媽媽。',
      labs:'嬰 A 血糖 02:00 採樣後待回報；嬰 B 膽紅素照光第2日，明早複查。',
      pending:'嬰 A 凌晨 02:00 需抽血（血糖、電解質）；嬰 B 照光治療持續，每4小時翻身；嬰 E 出院衛教尚未完成，請接班安排。',
      meds:'嬰 C 抗生素 Ampicillin 靜注每8小時，下次時間 22:00；維生素 K 庫存已補充。',
      checklist:'嬰 A 血氧監測\n嬰 B 翻身（照光）\n嬰 C 抗生素準時給藥\n嬰 D 哺餵評估記錄\n02:00 嬰 A 抽血'
    },
    delivery:{
      unit:'產房',
      patients:'目前待產 2 位，床 D1 初產婦宮口開 5 公分，床 D2 經產婦宮口開 7 公分進展快速；恢復室 1 位剖腹產後狀況穩定。',
      events:'15:30 床 D1 胎心監測出現晚期減速，已通知主治，遵囑左側臥並給 O₂，監測中；床 D2 即將進入第二產程。',
      labs:'床 D2 產後血型確認單待回，請追蹤。',
      pending:'床 D2 隨時可能需進產台，請確認接生物品備妥；恢復室媽媽 60 分鐘後可移回病房，請聯絡 3A 備床。',
      meds:'分娩包已備妥；Pitocin 急救備用藥置於推車上層，請確認；Oxytocin 備 2 支於冷藏。',
      checklist:'床 D2 接生物品確認\n胎心監測持續記錄\n恢復室媽媽移床聯絡\n新生兒急救設備check\n確認血庫備血狀態'
    }
  };
  var t = tpl[type]; if(!t) return;
  var set = function(id,v){ var el=document.getElementById(id); if(el) el.value=v; };
  set('shUnit',t.unit); set('shPatients',t.patients); set('shEvents',t.events);
  set('shLabs',t.labs); set('shPending',t.pending); set('shMeds',t.meds); set('shChecklist',t.checklist);
  showToast('範本已套用','請依實際狀況修改內容','✓');
}

// ════════════════════════════════
// 儲存交班
// ════════════════════════════════
function saveShift(){
  var unit = document.getElementById('shUnit').value.trim(); if(!unit) return;
  var clRaw = (document.getElementById('shChecklist').value||'').split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
  var checklist = clRaw.map(function(text){ return {id:uid(),text:text,done:false}; });
  var urgencyEl = document.querySelector('input[name="shUrgency"]:checked');
  var flagEls   = document.querySelectorAll('input[name="shFlag"]:checked');
  var flags     = Array.from(flagEls).map(function(el){ return el.value; });

  store.shifts.unshift({
    id:uid(), unit:unit,
    date:document.getElementById('shDate').value,
    shift:document.getElementById('shShift').value,
    fromUserId:document.getElementById('shFrom').value,
    toUserId:document.getElementById('shTo').value,
    urgency:urgencyEl ? urgencyEl.value : 'normal',
    flags:flags,
    patients:document.getElementById('shPatients').value,
    keyEvents:document.getElementById('shEvents').value,
    labs:document.getElementById('shLabs').value,
    pending:document.getElementById('shPending').value,
    meds:document.getElementById('shMeds').value,
    checklist:checklist,
    fromSigned:true, toSigned:false,
    createdAt:today()+' '+nowTime()
  });
  saveStore(); closeModal(); renderShiftList();
  showToast('交班紀錄已送出','接班人員需點擊「我要簽收」確認交接','📋');
}

// ════════════════════════════════
// 刪除 / 編輯
// ════════════════════════════════
function deleteShift(id){
  if(!confirm('確定刪除此交班紀錄？'))return;
  store.shifts = store.shifts.filter(function(x){ return x.id!==id; });
  saveStore(); renderShiftPage(document.getElementById('mainContent'));
  showToast('已刪除','交班紀錄已移除','🗑');
}

function openEditShift(id){
  var s = store.shifts.find(function(x){ return x.id===id; }); if(!s) return;
  var nurseOpts = store.users.filter(function(u){ return u.status!=='disabled'&&u.status!=='resigned'; })
    .map(function(u){ return '<option value="'+u.id+'"'+(u.id===s.fromUserId?' selected':'')+'>'+esc(u.name)+' ('+esc(userDept(u.id))+')</option>'; }).join('');
  var nurseOptsTo = store.users.filter(function(u){ return u.status!=='disabled'&&u.status!=='resigned'; })
    .map(function(u){ return '<option value="'+u.id+'"'+(u.id===s.toUserId?' selected':'')+'>'+esc(u.name)+' ('+esc(userDept(u.id))+')</option>'; }).join('');
  var clText = (s.checklist||[]).map(function(i){ return i.text; }).join('\n');
  var shiftSel = ['morning','afternoon','night'].map(function(x){
    return '<option value="'+x+'"'+(x===s.shift?' selected':'')+'>'+{'morning':'🌅 早班（06:00）','afternoon':'☀️ 午班（14:00）','night':'🌙 夜班（22:00）'}[x]+'</option>';
  }).join('');

  showModal('編輯交班紀錄',
    '<div class="form-row"><label>病房/單位</label><input id="eshUnit" value="'+esc(s.unit)+'"></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +'<div class="form-row"><label>日期</label><input id="eshDate" type="date" value="'+esc(s.date)+'"></div>'
    +'<div class="form-row"><label>班別</label><select id="eshShift">'+shiftSel+'</select></div>'
    +'<div class="form-row"><label>交班人</label><select id="eshFrom">'+nurseOpts+'</select></div>'
    +'<div class="form-row"><label>接班人</label><select id="eshTo">'+nurseOptsTo+'</select></div>'
    +'</div>'
    +'<div class="form-row"><label>🚦 緊急等級</label>'
    +'<div style="display:flex;gap:8px;margin-top:4px">'
    +['normal','watch','critical'].map(function(v){
      var lbl = {normal:'一般',watch:'⚠️ 需關注',critical:'🚨 警示'}[v];
      return '<label style="display:flex;align-items:center;gap:5px;font-size:13px;cursor:pointer"><input type="radio" name="eshUrgency" value="'+v+'"'+(s.urgency===v||(!s.urgency&&v==='normal')?' checked':'')+'>'+lbl+'</label>';
    }).join('')
    +'</div></div>'
    +'<div class="form-row"><label>🛡 安全旗標</label>'
    +'<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">'
    +SH_FLAGS.map(function(f){
      var checked = (s.flags||[]).indexOf(f.id)>=0;
      return '<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;padding:4px 8px;border:1px solid var(--b1);border-radius:99px;background:var(--surface)">'
        +'<input type="checkbox" name="eshFlag" value="'+f.id+'"'+(checked?' checked':'')+' style="accent-color:'+f.color+'"> '
        +f.icon+' '+f.label+'</label>';
    }).join('')+'</div></div>'
    +'<div class="form-row"><label>🛏 病患狀況</label><textarea id="eshPatients" style="min-height:70px">'+esc(s.patients||'')+'</textarea></div>'
    +'<div class="form-row"><label>⚠️ 本班重要事件</label><textarea id="eshEvents" style="min-height:70px">'+esc(s.keyEvents||'')+'</textarea></div>'
    +'<div class="form-row"><label>🧪 待追蹤檢驗值</label><textarea id="eshLabs" style="min-height:55px">'+esc(s.labs||'')+'</textarea></div>'
    +'<div class="form-row"><label>📋 待辦事項</label><textarea id="eshPending" style="min-height:70px">'+esc(s.pending||'')+'</textarea></div>'
    +'<div class="form-row"><label>💊 用藥/點滴</label><input id="eshMeds" value="'+esc(s.meds||'')+'"></div>'
    +'<div class="form-row"><label>✅ 待辦清單</label><textarea id="eshChecklist" style="min-height:90px">'+esc(clText)+'</textarea></div>',
  function(){
    var unit = document.getElementById('eshUnit').value.trim(); if(!unit) return;
    var clRaw = (document.getElementById('eshChecklist').value||'').split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
    var oldMap = {}; (s.checklist||[]).forEach(function(i){ oldMap[i.text]=i; });
    var urgEl  = document.querySelector('input[name="eshUrgency"]:checked');
    var flagEls = document.querySelectorAll('input[name="eshFlag"]:checked');
    s.unit       = unit;
    s.date       = document.getElementById('eshDate').value;
    s.shift      = document.getElementById('eshShift').value;
    s.fromUserId = document.getElementById('eshFrom').value;
    s.toUserId   = document.getElementById('eshTo').value;
    s.urgency    = urgEl ? urgEl.value : 'normal';
    s.flags      = Array.from(flagEls).map(function(el){ return el.value; });
    s.patients   = document.getElementById('eshPatients').value;
    s.keyEvents  = document.getElementById('eshEvents').value;
    s.labs       = document.getElementById('eshLabs').value;
    s.pending    = document.getElementById('eshPending').value;
    s.meds       = document.getElementById('eshMeds').value;
    s.checklist  = clRaw.map(function(text){
      var old = oldMap[text];
      return old ? old : {id:uid(),text:text,done:false};
    });
    saveStore(); closeModal(); renderShiftList();
    showToast('已更新','交班紀錄已修改','✏');
  });
}

// ════════════════════════════════
// 待辦清單勾選（含時間戳）
// ════════════════════════════════
function toggleChecklistItem(shiftId,itemId,done){
  var s = store.shifts.find(function(x){ return x.id===shiftId; }); if(!s||!s.checklist) return;
  var item = s.checklist.find(function(x){ return x.id===itemId; }); if(!item) return;
  item.done = done;
  if(done){
    item.doneBy = currentUser.id;
    item.doneAt = today()+' '+nowTime();
  } else {
    delete item.doneBy; delete item.doneAt;
  }
  saveStore(); renderShiftList();
}

// ════════════════════════════════
// 使用教學 Modal
// ════════════════════════════════
function openShiftHelp(){
  var steps = [
    {ico:'1️⃣', title:'點擊「＋ 新增交班」', desc:'在頁面右上角點擊新增按鈕，開啟交班表單。'},
    {ico:'2️⃣', title:'選擇快速範本（可選）', desc:'可點選「產後病房」、「新生兒室」、「產房」等範本，自動填入範例內容，再依實際狀況修改。'},
    {ico:'3️⃣', title:'設定緊急等級', desc:'本班有不穩定病患請選「⚠️ 需關注」；有危急事件選「🚨 警示」，接班人看到會有特別提示。'},
    {ico:'4️⃣', title:'勾選安全旗標', desc:'病房有禁食、隔離、跌倒高風險的病患，請勾選對應旗標，接班人一眼就能看到。'},
    {ico:'5️⃣', title:'填寫臨床四大欄位', desc:'病患狀況、本班重要事件、待辦事項、用藥/點滴，越詳細越好。'},
    {ico:'6️⃣', title:'填寫待追蹤檢驗值', desc:'抽血結果未回、需複查的項目獨立填在這裡，顯示時會用橙色提醒。'},
    {ico:'7️⃣', title:'建立待辦清單', desc:'每行輸入一項任務。接班後可在卡片上打勾，系統自動記錄完成者姓名與時間。'},
    {ico:'8️⃣', title:'接班人閱讀後簽收', desc:'接班人看到屬於自己的交班卡後，點「我要簽收」，系統會確認是否有未完成待辦，確認後完成雙向交接。'}
  ];

  var stepsHtml = steps.map(function(s){
    return '<div style="display:flex;gap:12px;margin-bottom:14px;align-items:flex-start">'
      +'<span style="font-size:20px;flex-shrink:0;line-height:1.2">'+s.ico+'</span>'
      +'<div><div style="font-weight:700;font-size:13px;margin-bottom:3px">'+s.title+'</div>'
      +'<div style="font-size:12px;color:var(--muted);line-height:1.6">'+s.desc+'</div></div></div>';
  }).join('');

  var exampleCard =
    '<div style="margin-top:18px;border-top:1px solid var(--b1);padding-top:16px">'
    +'<div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">✦ 範例交班卡（警示等級）</div>'
    +'<div class="handover-card sh-crit" style="margin:0;pointer-events:none">'
    +'<div style="background:rgba(220,50,50,.07);padding:7px 14px;margin:-16px -16px 12px;border-radius:var(--radius) var(--radius) 0 0;font-size:12px;font-weight:700;color:#c00030">🚨 等級標記：警示</div>'
    +'<div class="hc-header"><span class="shift-badge shift-night">🌙 夜班</span><div class="hc-title">產後護理 3A 病房</div>'
    +'<span class="sign-chip sign-pending"><span class="sign-dot"></span>待接班確認</span></div>'
    +'<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">'
    +'<span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;background:#e0500022;color:#e05000">🚫 禁食 NPO</span>'
    +'<span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;background:#c0003022;color:#c00030">💊 藥物過敏警示</span>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +'<div class="handover-field"><label>🛏 病患狀況</label><p>收治 10 位，床 301 產後第2日血壓 148/92 持續監測；床 305 剖腹產後第1日傷口滲液已處置。</p></div>'
    +'<div class="handover-field"><label>⚠️ 本班重要事件</label><p>22:10 床 301 血壓突升至 162/105，已通報主治，遵囑給予降壓藥，密切監測中。</p></div>'
    +'<div class="handover-field"><label>📋 待辦事項</label><p>床 301 每30分鐘量血壓至 02:00；床 303 隔日 06:00 前採血。</p></div>'
    +'<div class="handover-field"><label>💊 用藥/點滴</label><p>床 301 Labetalol IV 仍在進行；Oxytocin 剩 80mL。</p></div>'
    +'</div>'
    +'<div class="handover-field" style="margin-top:8px"><label>🧪 待追蹤檢驗值</label><p style="color:var(--amber)">床 301 血液常規 02:00 後回報，追蹤 PLT 是否 &lt;100K；床 303 CBC 明早追蹤。</p></div>'
    +'<div class="handover-field" style="margin-top:8px"><label>✅ 待辦清單 <span style="font-size:10px;color:var(--faint)">(1/3)</span></label>'
    +'<div class="cl-list">'
    +'<label class="cl-item cl-done" style="display:flex;align-items:center;gap:6px"><input type="checkbox" checked disabled style="accent-color:#c4527a;flex-shrink:0"> <span style="flex:1">床 305 傷口換藥</span><span style="font-size:10px;color:var(--faint);margin-left:auto">王護理師 22:30</span></label>'
    +'<label class="cl-item" style="display:flex;align-items:center;gap:6px"><input type="checkbox" disabled style="accent-color:#c4527a;flex-shrink:0"> <span style="flex:1">床 301 每30分血壓紀錄</span></label>'
    +'<label class="cl-item" style="display:flex;align-items:center;gap:6px"><input type="checkbox" disabled style="accent-color:#c4527a;flex-shrink:0"> <span style="flex:1">06:00 床 303 採血</span></label>'
    +'</div></div>'
    +'<div class="sign-row">'
    +'<span style="font-size:12px;color:var(--muted)">交班：</span>'
    +'<div style="width:20px;height:20px;border-radius:50%;background:#c4527a;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700">王</div>'
    +'<span style="font-size:12px">王護理師</span>'
    +'<span class="sign-chip sign-done"><span class="sign-dot"></span>已簽</span>'
    +'<span style="font-size:12px;color:var(--muted);margin-left:8px">接班：</span>'
    +'<div style="width:20px;height:20px;border-radius:50%;background:#5ba5e0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700">李</div>'
    +'<span style="font-size:12px">李護理師</span>'
    +'<span class="sign-chip sign-pending"><span class="sign-dot"></span>待簽</span>'
    +'<button class="btn-sm primary" style="margin-left:auto;opacity:.5;cursor:default">✓ 我要簽收</button>'
    +'</div></div></div>';

  var tipBar =
    '<div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">'
    +'<div style="flex:1;min-width:140px;background:rgba(220,50,50,.07);border-radius:var(--radius-sm);padding:10px 12px;font-size:12px">'
    +'<div style="font-weight:700;margin-bottom:4px;color:#c00030">🚨 緊急等級標記</div>'
    +'一般 / ⚠️需關注 / 🚨警示，警示級交班在列表最頂端顯示，簽收前會二次確認。</div>'
    +'<div style="flex:1;min-width:140px;background:#e0500011;border-radius:var(--radius-sm);padding:10px 12px;font-size:12px">'
    +'<div style="font-weight:700;margin-bottom:4px;color:#e05000">🛡 安全旗標</div>'
    +'NPO、隔離、跌倒高風險等以標籤顯示，接班人一目了然，不會淹沒在文字中。</div>'
    +'<div style="flex:1;min-width:140px;background:var(--amber-bg);border-radius:var(--radius-sm);padding:10px 12px;font-size:12px">'
    +'<div style="font-weight:700;margin-bottom:4px;color:var(--amber)">🧪 待追蹤檢驗</div>'
    +'抽血未回、待複查單獨一欄，橙色顯示，不會和待辦事項混在一起。</div>'
    +'<div style="flex:1;min-width:140px;background:var(--green-bg);border-radius:var(--radius-sm);padding:10px 12px;font-size:12px">'
    +'<div style="font-weight:700;margin-bottom:4px;color:var(--green)">⏱ 勾選時間戳</div>'
    +'清單打勾後自動記錄「誰、幾點完成」，可供事後稽核。</div>'
    +'</div>';

  document.getElementById('modalContent').innerHTML =
    '<h2>📖 交班功能使用教學</h2>'
    +'<div style="max-height:65vh;overflow-y:auto;padding-right:4px">'
    +tipBar
    +'<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px">操作步驟</div>'
    +stepsHtml
    +exampleCard
    +'</div>'
    +'<div class="modal-footer">'
    +'<button class="btn-cancel" onclick="closeModal()">關閉</button>'
    +'<button class="btn-save" onclick="closeModal();openNewShift()">＋ 立即新增交班</button>'
    +'</div>';
  document.getElementById('overlay').classList.add('open');
}
