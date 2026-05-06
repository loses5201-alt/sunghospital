// ════════════════════════════════════════════════════════
// SOP 文件庫（院內作業標準程序）
// ════════════════════════════════════════════════════════

var SOP_CATS = ['護理','行政','緊急','感控','設備','其他'];
var _sopCat = '';
var _sopSearch = '';

function renderSopPage(c){
  c.innerHTML = '<div class="admin-layout">'
    +'<div class="main-header"><div><h1>📋 SOP 文件庫</h1>'
    +'<div class="main-header-meta">院內作業標準程序 · 點擊確認已讀</div></div>'
    +'<div class="header-actions">'
    +(isAdmin()?'<button class="btn-sm primary" onclick="openNewSop()">+ 新增 SOP</button>':'')
    +'</div></div>'
    +'<div class="admin-content" id="sopC"></div></div>';
  rnSop();
}

function rnSop(){
  var c = document.getElementById('sopC');
  if(!c) return;
  if(!store.sops) store.sops = [];

  var html = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">'
    +'<div class="board-search" style="flex:1;min-width:200px"><span style="font-size:15px;color:var(--faint)">🔍</span>'
    +'<input placeholder="搜尋 SOP..." value="'+esc(_sopSearch)+'" oninput="_sopSearch=this.value;rnSop()"></div>'
    +'</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px">'
    +'<button class="board-cat-btn'+('' === _sopCat?' active':'')+'" onclick="_sopCat=\'\';rnSop()">全部</button>'
    +SOP_CATS.map(function(cat){
      var cnt = store.sops.filter(function(s){ return s.category===cat; }).length;
      return '<button class="board-cat-btn'+(cat===_sopCat?' active':'')+'" onclick="_sopCat=\''+cat+'\';rnSop()">'+cat+(cnt?' ('+cnt+')':'')+'</button>';
    }).join('')
    +'</div>';

  var allIds = store.users.map(function(u){ return u.id; });
  var list = store.sops.filter(function(s){
    var catOk = !_sopCat || s.category===_sopCat;
    var srOk = !_sopSearch || (s.title||'').indexOf(_sopSearch)>=0 || (s.content||'').indexOf(_sopSearch)>=0;
    return catOk && srOk;
  });

  if(!list.length){
    html += '<div class="empty-state"><div class="empty-state-icon">📋</div>'
      +'<div class="empty-state-title">尚無 SOP 文件</div>'
      +(isAdmin()?'<button class="empty-state-btn" onclick="openNewSop()">新增第一份 SOP</button>':'')+'</div>';
    c.innerHTML = html; return;
  }

  list.forEach(function(s){
    var acks = s.acks||{};
    var ackCnt = allIds.filter(function(id){ return acks[id]; }).length;
    var myAck = acks[currentUser.id];
    var pct = allIds.length ? Math.round(ackCnt/allIds.length*100) : 0;
    var catColor = {護理:'#c4527a',行政:'#1558a0',緊急:'#952020',感控:'#0d6e65',設備:'#8f5208',其他:'#7a5862'}[s.category]||'var(--muted)';

    html += '<div style="background:var(--surface);border:1.5px solid var(--b1);border-radius:var(--radius);padding:18px 20px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,.04)">'
      +'<div style="display:flex;align-items:flex-start;gap:10px">'
      +'<div style="flex:1">'
      +'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px">'
      +'<span style="font-size:15px;font-weight:800;color:var(--text)">'+esc(s.title)+'</span>'
      +'<span style="font-size:10px;padding:2px 8px;border-radius:99px;background:var(--lavender-bg);color:var(--lavender);font-weight:800">v'+esc(s.version||'1.0')+'</span>'
      +'<span style="font-size:10px;padding:2px 8px;border-radius:99px;font-weight:700;background:'+catColor+'22;color:'+catColor+'">'+esc(s.category)+'</span>'
      +'</div>'
      +'<div style="font-size:11px;color:var(--faint)">最後更新：'+esc((s.updatedAt||'').slice(0,10))+' · '+esc(userName(s.updatedBy||''))+'</div>'
      +'</div>'
      +(isAdmin()?'<div style="display:flex;gap:5px;flex-shrink:0">'
        +'<button class="btn-xs" onclick="openEditSop(\''+s.id+'\')">編輯</button>'
        +'<button class="btn-xs danger" onclick="deleteSop(\''+s.id+'\')">刪除</button>'
        +'</div>':'')
      +'</div>'
      +(isAdmin()
        ?'<div style="margin:12px 0">'
          +'<div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--muted);margin-bottom:5px">'
          +'<span>確認閱讀率</span>'
          +'<span style="font-weight:800;color:var(--primary)">'+pct+'%</span>'
          +'<span style="color:var(--faint)">('+ackCnt+'/'+allIds.length+' 人)</span>'
          +'</div>'
          +'<div style="height:5px;background:var(--s2);border-radius:99px"><div style="width:'+pct+'%;height:100%;background:var(--primary);border-radius:99px;transition:width .4s"></div></div>'
          +'</div>'
        :'')
      +'<div id="sopbody_'+s.id+'" style="display:none;font-size:13px;color:var(--text);line-height:1.85;white-space:pre-wrap;background:var(--s2);border-radius:var(--radius-sm);padding:14px 16px;margin:12px 0">'+esc(s.content||'（無內容）')+'</div>'
      +'<div style="display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap">'
      +'<button class="btn-sm" onclick="togSopBody(\''+s.id+'\')">📖 閱讀內容</button>'
      +(myAck
        ?'<span style="font-size:11px;color:var(--green);font-weight:800;display:flex;align-items:center;gap:4px">✓ 已確認閱讀 <span style="font-weight:400;color:var(--faint)">'+esc((acks[currentUser.id]||'').slice(0,10))+'</span></span>'
        :'<button class="btn-sm primary" onclick="ackSop(\''+s.id+'\')">✓ 確認已讀</button>')
      +'</div>'
      +'</div>';
  });

  c.innerHTML = html;
}

function togSopBody(id){
  var el = document.getElementById('sopbody_'+id);
  if(!el) return;
  el.style.display = el.style.display==='none' ? 'block' : 'none';
}

function ackSop(id){
  var s = (store.sops||[]).find(function(x){ return x.id===id; });
  if(!s) return;
  if(!s.acks) s.acks = {};
  s.acks[currentUser.id] = new Date().toISOString();
  saveCollection('sops'); rnSop();
  showToast('已確認', '已標記閱讀「'+esc(s.title)+'」', '✅');
}

function deleteSop(id){
  if(!confirm('確定刪除此 SOP？')) return;
  store.sops = (store.sops||[]).filter(function(s){ return s.id!==id; });
  saveCollection('sops'); rnSop();
}

function openNewSop(){ _sopForm(null); }
function openEditSop(id){
  var s = (store.sops||[]).find(function(x){ return x.id===id; });
  _sopForm(s);
}
function _sopForm(s){
  var catOpts = SOP_CATS.map(function(c){
    return '<option value="'+c+'"'+(s&&s.category===c?' selected':'')+'>'+c+'</option>';
  }).join('');
  showModal(s?'編輯 SOP':'新增 SOP',
    '<div class="form-row"><label>標題</label><input id="st" value="'+(s?esc(s.title):'')+'"></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +'<div class="form-row"><label>分類</label><select id="sc">'+catOpts+'</select></div>'
    +'<div class="form-row"><label>版本號</label><input id="sv" value="'+(s?esc(s.version||'1.0'):'1.0')+'"></div>'
    +'</div>'
    +'<div class="form-row"><label>內容（支援換行）</label><textarea id="sct" style="min-height:200px;font-family:inherit">'+(s?esc(s.content||''):'')+'</textarea></div>',
  function(){
    var t = document.getElementById('st').value.trim(); if(!t) return;
    var newVer = document.getElementById('sv').value.trim()||'1.0';
    if(!store.sops) store.sops = [];
    if(s){
      var verChanged = newVer !== (s.version||'1.0');
      s.title = t; s.category = document.getElementById('sc').value;
      s.version = newVer; s.content = document.getElementById('sct').value;
      s.updatedAt = new Date().toISOString(); s.updatedBy = currentUser.id;
      if(verChanged){ s.acks = {}; showToast('版本更新', '版本已更新，所有人需重新確認閱讀', '📋'); }
    } else {
      store.sops.push({id:uid(), title:t, category:document.getElementById('sc').value,
        version:newVer, content:document.getElementById('sct').value,
        updatedAt:new Date().toISOString(), updatedBy:currentUser.id, acks:{}});
    }
    saveCollection('sops'); closeModal(); rnSop();
  });
}
