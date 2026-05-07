// ════════════════════════════════════════════════════════
// 員工技能矩陣
// ════════════════════════════════════════════════════════

var SKILL_CATS = ['臨床技能','急救','特殊操作','證照/認證'];
var SKILL_LEVELS = {
  certified: {label:'✓ 認證', bg:'var(--green-bg)', color:'var(--green)'},
  trained:   {label:'◎ 受訓', bg:'var(--blue-bg)',  color:'var(--blue)'},
  learning:  {label:'△ 學習', bg:'var(--lavender-bg)', color:'var(--lavender)'}
};
var _skillDeptFilter = '';

function renderSkillsPage(c){
  c.innerHTML = '<div class="admin-layout">'
    +'<div class="main-header"><div><h1>🎓 技能矩陣</h1>'
    +'<div class="main-header-meta">員工技能 · 證照 · 到期提醒</div></div>'
    +'<div class="header-actions">'
    +(isAdmin()?'<button class="btn-sm primary" onclick="openNewSkillDef()">+ 新增技能欄位</button>':'')
    +'</div></div>'
    +'<div class="admin-content" id="skillsC"></div></div>';
  rnSkills();
}

function rnSkills(){
  var c = document.getElementById('skillsC');
  if(!c) return;
  if(!store.skillDefs) store.skillDefs = [];
  if(!store.skillMatrix) store.skillMatrix = {};

  var users = store.users.filter(function(u){
    if(u.username==='admin') return false; // 隱藏系統管理員
    var active = u.status!=='disabled' && u.status!=='resigned';
    var deptOk = !_skillDeptFilter || u.deptId===_skillDeptFilter;
    return active && deptOk;
  });

  var skills = store.skillDefs;
  var todayStr = today();
  var SOON_MS = 60*24*60*60*1000; // 60 days

  // Dept filter
  var html = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px">'
    +'<button class="board-cat-btn'+(_skillDeptFilter===''?' active':'')+'" onclick="_skillDeptFilter=\'\';rnSkills()">全部科別</button>'
    +store.departments.map(function(d){
      return '<button class="board-cat-btn'+(_skillDeptFilter===d.id?' active':'')+'" onclick="_skillDeptFilter=\''+d.id+'\';rnSkills()">'+esc(d.name)+'</button>';
    }).join('')+'</div>';

  // Expiry alerts
  var expAlerts = [];
  users.forEach(function(u){
    var um = store.skillMatrix[u.id]||{};
    skills.forEach(function(s){
      var cell = um[s.id]||{};
      if(cell.expireDate && cell.level==='certified'){
        var diff = new Date(cell.expireDate) - new Date(todayStr);
        if(diff < 0) expAlerts.push({name:u.name, skill:s.name, date:cell.expireDate, expired:true});
        else if(diff < SOON_MS) expAlerts.push({name:u.name, skill:s.name, date:cell.expireDate, expired:false});
      }
    });
  });
  if(expAlerts.length){
    html += '<div style="margin-bottom:18px">';
    expAlerts.forEach(function(a){
      html += '<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:var(--radius-sm);margin-bottom:6px;background:'+(a.expired?'var(--red-bg)':'var(--amber-bg)')+';border-left:3px solid '+(a.expired?'var(--red)':'var(--amber)')+';">'
        +'<span style="font-size:14px">'+(a.expired?'🔴':'⚠️')+'</span>'
        +'<span style="font-size:13px;font-weight:700;color:var(--text)">'+esc(a.name)+'</span>'
        +'<span style="font-size:12px;color:var(--muted)">的「'+esc(a.skill)+'」'+(a.expired?'已過期':'即將到期')+'（'+esc(a.date)+'）</span>'
        +'</div>';
    });
    html += '</div>';
  }

  if(!skills.length){
    html += '<div class="empty-state"><div class="empty-state-icon">🎓</div><div class="empty-state-title">尚未建立技能欄位</div>'
      +(isAdmin()?'<button class="empty-state-btn" onclick="openNewSkillDef()">建立第一個技能</button>':'')+'</div>';
    c.innerHTML = html; return;
  }

  // Legend
  html += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;font-size:12px">'
    +Object.entries(SKILL_LEVELS).map(function(e){
      return '<span style="padding:3px 10px;border-radius:99px;background:'+e[1].bg+';color:'+e[1].color+';font-weight:700">'+e[1].label+'</span>';
    }).join('')
    +'<span style="padding:3px 10px;border-radius:99px;background:var(--red-bg);color:var(--red);font-weight:700">✗ 過期</span>'
    +'<span style="padding:3px 10px;border-radius:99px;background:var(--amber-bg);color:var(--amber);font-weight:700">⚠ 即將到期</span>'
    +'</div>';

  html += '<div style="overflow-x:auto"><table><thead><tr>'
    +'<th style="min-width:130px;position:sticky;left:0;background:var(--s2);z-index:2">人員</th>'
    +skills.map(function(s){
      return '<th style="min-width:90px;text-align:center;vertical-align:bottom">'
        +'<div style="font-size:12px;font-weight:800">'+esc(s.name)+'</div>'
        +'<div style="font-size:9px;color:var(--faint);font-weight:400;margin-top:1px">'+esc(s.category)+'</div>'
        +(isAdmin()?'<div style="margin-top:3px"><button style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--faint);padding:0" onclick="openEditSkillDef(\''+s.id+'\')">✏️</button>'
          +'<button style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--faint);padding:0" onclick="deleteSkillDef(\''+s.id+'\')">🗑️</button></div>':'')
        +'</th>';
    }).join('')+'</tr></thead><tbody>'
    +users.map(function(u){
      var um = store.skillMatrix[u.id]||{};
      return '<tr><td style="position:sticky;left:0;background:var(--surface);z-index:1">'
        +'<div style="display:flex;align-items:center;gap:7px">'+avatarEl(u.id,24)
        +'<div><div style="font-size:13px;font-weight:700">'+esc(u.name)+'</div>'
        +'<div style="font-size:11px;color:var(--faint)">'+esc(u.title||'')+'</div></div>'
        +'</div></td>'
        +skills.map(function(s){
          var cell = um[s.id]||{};
          var lvl = cell.level||'';
          var exp = cell.expireDate||'';
          var expired = exp && exp < todayStr;
          var expiringSoon = exp && !expired && (new Date(exp)-new Date(todayStr)) < SOON_MS;
          var lv = SKILL_LEVELS[lvl];
          var bg = expired?'var(--red-bg)':expiringSoon?'var(--amber-bg)':lv?lv.bg:'transparent';
          var fc = expired?'var(--red)':expiringSoon?'var(--amber)':lv?lv.color:'var(--faint)';
          var label = expired?'✗ 過期':expiringSoon?'⚠ 即將':lv?lv.label:'—';
          return '<td style="text-align:center;padding:8px">'
            +(isAdmin()
              ?'<button onclick="openSkillCell(\''+u.id+'\',\''+s.id+'\')" style="background:'+bg+';color:'+fc+';border:none;border-radius:6px;padding:4px 8px;font-size:11px;font-weight:700;cursor:pointer;min-width:70px;transition:all .12s">'+label+'</button>'
              :'<span style="background:'+bg+';color:'+fc+';border-radius:6px;padding:4px 8px;font-size:11px;font-weight:700;display:inline-block;min-width:70px">'+label+'</span>')
            +(exp&&lvl?'<div style="font-size:9px;color:'+(expired?'var(--red)':expiringSoon?'var(--amber)':'var(--faint)')+'">'+exp+'</div>':'')
            +'</td>';
        }).join('')
        +'</tr>';
    }).join('')
    +'</tbody></table></div>';

  c.innerHTML = html;
}

function openSkillCell(userId, skillId){
  var skill = (store.skillDefs||[]).find(function(s){ return s.id===skillId; });
  var user = store.users.find(function(u){ return u.id===userId; });
  if(!skill||!user) return;
  if(!store.skillMatrix) store.skillMatrix = {};
  var cell = (store.skillMatrix[userId]||{})[skillId]||{};
  var lvlOpts = [['','—']].concat(Object.entries(SKILL_LEVELS).map(function(e){ return [e[0],e[1].label]; }))
    .map(function(e){ return '<option value="'+e[0]+'"'+(cell.level===e[0]?' selected':'')+'>'+e[1]+'</option>'; }).join('');
  showModal(esc(user.name)+' — '+esc(skill.name),
    '<div class="form-row"><label>程度</label><select id="slvl">'+lvlOpts+'</select></div>'
    +(skill.requiresExpiry?'<div class="form-row"><label>到期日</label><input id="sexp" type="date" value="'+(cell.expireDate||'')+'"></div>':'')
    +'<div class="form-row"><label>備註（選填）</label><input id="snote" value="'+esc(cell.note||'')+'"></div>',
  function(){
    if(!store.skillMatrix[userId]) store.skillMatrix[userId] = {};
    store.skillMatrix[userId][skillId] = {
      level: document.getElementById('slvl').value,
      expireDate: skill.requiresExpiry ? (document.getElementById('sexp').value||'') : '',
      note: document.getElementById('snote').value.trim(),
      updatedAt: new Date().toISOString()
    };
    saveCollection('skillMatrix'); closeModal(); rnSkills();
  });
}

function openNewSkillDef(){ _skillDefForm(null); }
function openEditSkillDef(id){
  var s = (store.skillDefs||[]).find(function(x){ return x.id===id; });
  _skillDefForm(s);
}
function deleteSkillDef(id){
  if(!confirm('確定刪除此技能欄位？（相關資料也將刪除）')) return;
  store.skillDefs = (store.skillDefs||[]).filter(function(s){ return s.id!==id; });
  if(store.skillMatrix) Object.values(store.skillMatrix).forEach(function(um){ delete um[id]; });
  saveMultiple(['skillDefs','skillMatrix']); rnSkills();
}
function _skillDefForm(s){
  var catOpts = SKILL_CATS.map(function(c){
    return '<option value="'+c+'"'+(s&&s.category===c?' selected':'')+'>'+c+'</option>';
  }).join('');
  showModal(s?'編輯技能欄位':'新增技能欄位',
    '<div class="form-row"><label>技能名稱</label><input id="sn" value="'+(s?esc(s.name):'')+'"></div>'
    +'<div class="form-row"><label>分類</label><select id="sc">'+catOpts+'</select></div>'
    +'<div class="form-row"><label style="display:flex;align-items:center;gap:8px;text-transform:none;letter-spacing:0"><input type="checkbox" id="sexp"'+(s&&s.requiresExpiry?' checked':'')+'> 需要填寫到期日</label></div>',
  function(){
    var n = document.getElementById('sn').value.trim(); if(!n) return;
    if(!store.skillDefs) store.skillDefs = [];
    if(s){
      s.name=n; s.category=document.getElementById('sc').value;
      s.requiresExpiry=document.getElementById('sexp').checked;
    } else {
      store.skillDefs.push({id:uid(), name:n, category:document.getElementById('sc').value, requiresExpiry:document.getElementById('sexp').checked});
    }
    saveCollection('skillDefs'); closeModal(); rnSkills();
  });
}
