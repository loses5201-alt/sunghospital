// ════════════════════════════════════════════════════════
// 病患動線看板
// ════════════════════════════════════════════════════════

var PATIENT_STAGES = ['入院登記','待產','生產中','產後恢復','母嬰同室','準備出院'];
var PATIENT_STAGE_COLORS = ['#9b8fd4','#f59e0b','#ef4444','#3b82f6','#10b981','#c4527a'];
var PATIENT_FLAGS = {urgent:'🔴 緊急',oxygen:'💨 氧氣',iv:'💉 點滴',pain:'⚠️ 疼痛',obs:'👁️ 觀察中'};

function renderPatientPage(c){
  c.innerHTML = '<div class="admin-layout">'
    +'<div class="main-header"><div><h1>🏥 病患動線看板</h1>'
    +'<div class="main-header-meta">即時追蹤產程進度</div></div>'
    +'<div class="header-actions">'
    +(isAdmin()?'<button class="btn-sm primary" onclick="openNewPatient()">+ 新增病患</button>':'')
    +'</div></div>'
    +'<div id="patientBoard" style="padding:24px;overflow-x:auto;min-height:400px"></div>'
    +'</div>';
  rnPatientBoard();
}

function rnPatientBoard(){
  var bd = document.getElementById('patientBoard');
  if(!bd) return;
  if(!store.patients) store.patients = [];
  var active = store.patients.filter(function(p){ return !p.discharged; });
  var discharged = store.patients.filter(function(p){ return p.discharged; });

  var total = active.length;
  var html = '<div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap">'
    +'<div style="font-size:13px;color:var(--muted)">在院病患：<strong style="color:var(--text)">'+total+'</strong> 人</div>'
    +'</div>';

  html += '<div style="display:flex;gap:14px;padding-bottom:16px;min-width:max-content">';
  PATIENT_STAGES.forEach(function(stage, si){
    var pts = active.filter(function(p){ return p.stage === stage; });
    var col = PATIENT_STAGE_COLORS[si];
    html += '<div style="width:220px;flex-shrink:0">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 12px;background:var(--surface);border-radius:10px;border:1.5px solid var(--b1);box-shadow:0 1px 4px rgba(0,0,0,.04)">'
      +'<span style="width:10px;height:10px;border-radius:50%;background:'+col+';flex-shrink:0;display:inline-block;box-shadow:0 0 6px '+col+'66"></span>'
      +'<span style="font-size:12px;font-weight:800;color:var(--text)">'+stage+'</span>'
      +'<span style="margin-left:auto;font-size:11px;font-weight:800;background:'+col+'22;color:'+col+';padding:2px 9px;border-radius:99px">'+pts.length+'</span>'
      +'</div>';
    if(!pts.length){
      html += '<div style="border:1.5px dashed var(--b2);border-radius:10px;height:60px;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--faint)">無病患</div>';
    } else {
      pts.forEach(function(p){
        html += renderPatientCard(p, si, col);
      });
    }
    html += '</div>';
  });
  html += '</div>';

  if(discharged.length){
    var recent = discharged.slice(-8).reverse();
    html += '<div style="margin-top:8px;padding-top:18px;border-top:1px solid var(--b1)">'
      +'<div style="font-size:11px;font-weight:800;color:var(--faint);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px">最近出院（'+discharged.length+'）</div>'
      +'<div style="display:flex;flex-wrap:wrap;gap:8px">'
      +recent.map(function(p){
        return '<div style="padding:6px 14px;background:var(--s2);border-radius:99px;font-size:12px;color:var(--faint)">'
          +esc(p.name)+' <span style="font-size:10px">· '+esc(p.roomNo||'-')+'</span></div>';
      }).join('')
      +'</div></div>';
  }

  bd.innerHTML = html;
}

function renderPatientCard(p, si, col){
  var elapsed = p.stageTime ? _ptElapsed(p.stageTime) : _ptElapsed(p.admitTime);
  var flags = (p.flags||[]).map(function(f){ return (PATIENT_FLAGS[f]||f).split(' ')[0]; }).join(' ');
  var assigneeName = p.assigneeId ? userName(p.assigneeId) : '未指派';
  var canNext = si < PATIENT_STAGES.length - 1;
  var canPrev = si > 0;

  return '<div style="background:var(--surface);border:1.5px solid var(--b1);border-radius:12px;padding:13px 14px;margin-bottom:9px;cursor:pointer;transition:all .15s;position:relative;overflow:hidden" onmouseenter="this.style.borderColor=\''+col+'\'" onmouseleave="this.style.borderColor=\'var(--b1)\'" onclick="openPatientDetail(\''+p.id+'\')">'
    +'<div style="position:absolute;top:0;left:0;right:0;height:3px;background:'+col+';opacity:.5;border-radius:12px 12px 0 0"></div>'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;margin-top:2px">'
    +'<div><div style="font-size:14px;font-weight:800;color:var(--text)">'+esc(p.name)+'</div>'
    +'<div style="font-size:11px;color:var(--muted);margin-top:1px">'+esc(p.roomNo||'未分配')+(p.age?' · '+esc(p.age)+'歲':'')+'</div></div>'
    +'<div style="text-align:right"><div style="font-size:10px;color:var(--faint)">'+elapsed+'</div>'
    +(flags?'<div style="font-size:12px;margin-top:2px">'+flags+'</div>':'')
    +'</div></div>'
    +'<div style="font-size:11px;color:var(--muted);margin-bottom:9px;display:flex;align-items:center;gap:5px">'
    +avatarEl(p.assigneeId, 16)+' '+esc(assigneeName)
    +'</div>'
    +(p.note?'<div style="font-size:11px;color:var(--muted);background:var(--s2);border-radius:6px;padding:4px 8px;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(p.note)+'</div>':'')
    +'<div style="display:flex;gap:5px;flex-wrap:wrap" onclick="event.stopPropagation()">'
    +(canPrev?'<button class="btn-xs" onclick="movePtStage(\''+p.id+'\',-1)" title="退回上一階段">◀</button>':'')
    +(canNext?'<button class="btn-xs success" onclick="movePtStage(\''+p.id+'\',1)">下一階段 ▶</button>':'')
    +'<button class="btn-xs" onclick="openPtNote(\''+p.id+'\')" title="備註">✏️</button>'
    +(isAdmin()?'<button class="btn-xs danger" onclick="dischargePt(\''+p.id+'\')" title="辦理出院">出院</button>':'')
    +'</div>'
    +'</div>';
}

function _ptElapsed(ts){
  if(!ts) return '';
  var ms = Date.now() - new Date(ts).getTime();
  var h = Math.floor(ms/3600000);
  var m = Math.floor((ms%3600000)/60000);
  if(h >= 24){ var d=Math.floor(h/24); return d+'天'+( h%24)+'h'; }
  if(h > 0) return h+'h '+m+'m';
  return m+'m';
}

function openPatientDetail(id){
  var p = (store.patients||[]).find(function(x){ return x.id===id; });
  if(!p) return;
  var stageOpts = PATIENT_STAGES.map(function(s){
    return '<option value="'+s+'"'+(p.stage===s?' selected':'')+'>'+s+'</option>';
  }).join('');
  var assigneeOpts = '<option value="">未指派</option>'
    +store.users.filter(function(u){ return u.status!=='disabled'&&u.status!=='resigned'; })
      .map(function(u){ return '<option value="'+u.id+'"'+(p.assigneeId===u.id?' selected':'')+'>'+esc(u.name)+'</option>'; }).join('');
  var flagsHtml = Object.entries(PATIENT_FLAGS).map(function(e){
    var checked = (p.flags||[]).indexOf(e[0])>=0 ? 'checked' : '';
    return '<label style="display:flex;align-items:center;gap:5px;font-size:13px;cursor:pointer">'
      +'<input type="checkbox" value="'+e[0]+'" '+checked+' class="pflag"> '+esc(e[1])+'</label>';
  }).join('');

  showModal('病患資訊 — '+esc(p.name),
    '<div class="form-row"><label>姓名</label><input id="pn" value="'+esc(p.name)+'"></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +'<div class="form-row"><label>床號/房號</label><input id="pr" value="'+esc(p.roomNo||'')+'"></div>'
    +'<div class="form-row"><label>年齡</label><input id="pa" value="'+esc(p.age||'')+'"></div>'
    +'</div>'
    +'<div class="form-row"><label>目前階段</label><select id="ps">'+stageOpts+'</select></div>'
    +'<div class="form-row"><label>負責護理師</label><select id="pasn">'+assigneeOpts+'</select></div>'
    +'<div class="form-row"><label>備註</label><textarea id="pnt">'+esc(p.note||'')+'</textarea></div>'
    +'<div class="form-row"><label>旗標</label><div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px">'+flagsHtml+'</div></div>',
  function(){
    p.name = document.getElementById('pn').value.trim();
    p.roomNo = document.getElementById('pr').value.trim();
    p.age = document.getElementById('pa').value.trim();
    var ns = document.getElementById('ps').value;
    if(ns !== p.stage){ p.stage = ns; p.stageTime = new Date().toISOString(); }
    p.assigneeId = document.getElementById('pasn').value;
    p.note = document.getElementById('pnt').value.trim();
    p.flags = Array.from(document.querySelectorAll('.pflag:checked')).map(function(cb){ return cb.value; });
    saveCollection('patients'); closeModal(); rnPatientBoard();
  });
}

function openPtNote(id){
  var p = (store.patients||[]).find(function(x){ return x.id===id; });
  if(!p) return;
  showModal('快速備註 — '+esc(p.name),
    '<div class="form-row"><textarea id="qn" style="min-height:80px">'+esc(p.note||'')+'</textarea></div>',
  function(){
    p.note = document.getElementById('qn').value.trim();
    saveCollection('patients'); closeModal(); rnPatientBoard();
  });
}

function movePtStage(id, dir){
  var p = (store.patients||[]).find(function(x){ return x.id===id; });
  if(!p) return;
  var idx = PATIENT_STAGES.indexOf(p.stage);
  var ni = idx + dir;
  if(ni < 0 || ni >= PATIENT_STAGES.length) return;
  p.stage = PATIENT_STAGES[ni];
  p.stageTime = new Date().toISOString();
  saveCollection('patients'); rnPatientBoard();
  showToast('階段更新', esc(p.name)+' → '+p.stage, '🏥');
}

function dischargePt(id){
  var p = (store.patients||[]).find(function(x){ return x.id===id; });
  if(!p||!confirm(esc(p.name)+' 確認辦理出院？')) return;
  p.discharged = true;
  p.dischargeTime = new Date().toISOString();
  saveCollection('patients'); rnPatientBoard();
  showToast('出院', esc(p.name)+' 已辦理出院', '👋');
}

function openNewPatient(){
  var assigneeOpts = '<option value="">未指派</option>'
    +store.users.filter(function(u){ return u.status!=='disabled'&&u.status!=='resigned'; })
      .map(function(u){ return '<option value="'+u.id+'">'+esc(u.name)+'</option>'; }).join('');
  showModal('新增病患',
    '<div class="form-row"><label>姓名</label><input id="pn" placeholder="病患姓名（可用代稱）"></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +'<div class="form-row"><label>床號/房號</label><input id="pr" placeholder="例：302"></div>'
    +'<div class="form-row"><label>年齡</label><input id="pa" placeholder="歲"></div>'
    +'</div>'
    +'<div class="form-row"><label>負責護理師</label><select id="pasn">'+assigneeOpts+'</select></div>'
    +'<div class="form-row"><label>備註（選填）</label><textarea id="pnt" style="min-height:60px"></textarea></div>',
  function(){
    var n = document.getElementById('pn').value.trim();
    if(!n) return;
    if(!store.patients) store.patients = [];
    store.patients.push({
      id:uid(), name:n,
      roomNo:document.getElementById('pr').value.trim(),
      age:document.getElementById('pa').value.trim(),
      stage:PATIENT_STAGES[0],
      admitTime:new Date().toISOString(),
      stageTime:new Date().toISOString(),
      assigneeId:document.getElementById('pasn').value,
      note:document.getElementById('pnt').value.trim(),
      flags:[], discharged:false
    });
    saveCollection('patients'); closeModal(); rnPatientBoard();
    showToast('新增成功', esc(n)+' 已加入看板', '🏥');
  });
}
