// ════════════════════════════════════════════════════════
// 庫存 / 耗材管理
// ════════════════════════════════════════════════════════

var INV_CATS = ['耗材','藥品','器械','清潔','辦公','其他'];
var _invCat = '';

function renderInventoryPage(c){
  c.innerHTML = '<div class="admin-layout">'
    +'<div class="main-header"><div><h1>📦 庫存管理</h1>'
    +'<div class="main-header-meta">耗材 · 藥品 · 物資追蹤</div></div>'
    +'<div class="header-actions">'
    +(isAdmin()?'<button class="btn-sm primary" onclick="openNewInvItem()">+ 新增品項</button>':'')
    +'</div></div>'
    +'<div class="admin-content" id="invC"></div></div>';
  rnInventory();
}

function rnInventory(){
  var c = document.getElementById('invC');
  if(!c) return;
  if(!store.inventory) store.inventory = [];
  if(!store.inventoryLogs) store.inventoryLogs = [];

  var items = store.inventory;
  var low = items.filter(function(i){ return i.qty>0 && i.qty<=i.minQty; }).length;
  var crit = items.filter(function(i){ return i.qty===0; }).length;
  var ok = items.length - low - crit;

  var html = '<div class="metric-grid" style="margin-bottom:22px">'
    +'<div class="metric-box"><div class="metric-num">'+items.length+'</div><div class="metric-lbl">品項總數</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:var(--green)">'+ok+'</div><div class="metric-lbl">庫存充足</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:var(--amber)">'+low+'</div><div class="metric-lbl">庫存偏低</div></div>'
    +'<div class="metric-box"><div class="metric-num" style="color:var(--red)">'+crit+'</div><div class="metric-lbl">已告磬</div></div>'
    +'</div>';

  html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px">'
    +'<button class="board-cat-btn'+(_invCat===''?' active':'')+'" onclick="_invCat=\'\';rnInventory()">全部</button>'
    +INV_CATS.map(function(cat){
      return '<button class="board-cat-btn'+(_invCat===cat?' active':'')+'" onclick="_invCat=\''+cat+'\';rnInventory()">'+cat+'</button>';
    }).join('')+'</div>';

  var list = _invCat ? items.filter(function(i){ return i.category===_invCat; }) : items;

  if(!list.length){
    html += '<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-title">尚無品項</div>'
      +(isAdmin()?'<button class="empty-state-btn" onclick="openNewInvItem()">新增第一個品項</button>':'')+'</div>';
    c.innerHTML = html; return;
  }

  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(195px,1fr));gap:12px;margin-bottom:28px">';
  list.forEach(function(item){
    var max = Math.max(item.minQty*2 || 10, item.qty || 1);
    var pct = Math.min(Math.round(item.qty/max*100), 100);
    var statusColor = item.qty===0 ? 'var(--red)' : item.qty<=item.minQty ? 'var(--amber)' : 'var(--green)';
    var statusLabel = item.qty===0 ? '告磬' : item.qty<=item.minQty ? '偏低' : '充足';
    var statusBg = item.qty===0 ? 'var(--red-bg)' : item.qty<=item.minQty ? 'var(--amber-bg)' : 'var(--green-bg)';

    html += '<div style="background:var(--surface);border:1.5px solid var(--b1);border-radius:var(--radius);padding:16px;position:relative;overflow:hidden;transition:all .18s" onmouseenter="this.style.borderColor=\''+statusColor+'\';this.style.boxShadow=\'0 6px 20px rgba(0,0,0,.08)\'" onmouseleave="this.style.borderColor=\'var(--b1)\';this.style.boxShadow=\'none\'">'
      +'<div style="position:absolute;top:0;left:0;right:0;height:3px;background:'+statusColor+';opacity:.7"></div>'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">'
      +'<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:800;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(item.name)+'</div>'
      +'<div style="font-size:12px;color:var(--muted);margin-top:1px">'+esc(item.category)+' · 單位：'+esc(item.unit||'個')+'</div></div>'
      +'<span style="font-size:11px;padding:2px 8px;border-radius:99px;font-weight:800;background:'+statusBg+';color:'+statusColor+';white-space:nowrap;margin-left:6px">'+statusLabel+'</span>'
      +'</div>'
      +'<div style="font-size:30px;font-weight:900;color:'+statusColor+';letter-spacing:-.03em;line-height:1;margin-bottom:2px">'+item.qty+'</div>'
      +'<div style="font-size:11px;color:var(--faint);margin-bottom:8px">最低庫存：'+item.minQty+' '+esc(item.unit||'個')+'</div>'
      +'<div style="height:5px;background:var(--s2);border-radius:99px;margin-bottom:12px">'
      +'<div style="width:'+pct+'%;height:100%;background:'+statusColor+';border-radius:99px;transition:width .4s"></div></div>'
      +'<div style="display:flex;gap:6px">'
      +'<button class="btn-xs danger" onclick="invUse(\''+item.id+'\')">－ 使用</button>'
      +'<button class="btn-xs success" onclick="invRestock(\''+item.id+'\')">＋ 補貨</button>'
      +(isAdmin()?'<button class="btn-xs" onclick="openEditInvItem(\''+item.id+'\')" title="編輯">⚙️</button>'
        +'<button class="btn-xs danger" onclick="deleteInvItem(\''+item.id+'\')" title="刪除">🗑️</button>':'')
      +'</div></div>';
  });
  html += '</div>';

  // Log
  var logs = (store.inventoryLogs||[]).slice(-30).reverse();
  if(logs.length){
    html += '<div class="sec-label">最近異動紀錄</div>'
      +'<div class="table-wrap"><table><thead><tr>'
      +'<th>時間</th><th>品項</th><th>類型</th><th>數量</th><th>人員</th><th>備註</th>'
      +'</tr></thead><tbody>'
      +logs.map(function(l){
        var isUse = l.type==='use';
        return '<tr>'
          +'<td style="color:var(--faint);font-size:12px">'+esc(l.date||'')+'</td>'
          +'<td style="font-weight:600">'+esc(l.itemName||'')+'</td>'
          +'<td><span style="font-size:11px;padding:2px 8px;border-radius:99px;font-weight:700;background:'+(isUse?'var(--red-bg)':'var(--green-bg)')+';color:'+(isUse?'var(--red)':'var(--green)')+'">'+( isUse?'使用':'補貨')+'</span></td>'
          +'<td style="font-weight:800;color:'+(isUse?'var(--red)':'var(--green)')+'">'+(isUse?'−':'+')+(l.qty||0)+'</td>'
          +'<td>'+esc(userName(l.userId||''))+'</td>'
          +'<td style="color:var(--muted);font-size:12px">'+esc(l.note||'')+'</td>'
          +'</tr>';
      }).join('')
      +'</tbody></table></div>';
  }

  c.innerHTML = html;
}

function invUse(id){
  var item = (store.inventory||[]).find(function(i){ return i.id===id; });
  if(!item) return;
  showModal('使用 — '+esc(item.name),
    '<div class="form-row"><label>使用數量（庫存：'+item.qty+' '+esc(item.unit||'個')+'）</label>'
    +'<input id="iq" type="number" value="1" min="1" max="'+item.qty+'"></div>'
    +'<div class="form-row"><label>備註（選填）</label><input id="inote"></div>',
  function(){
    var q = Math.max(1, parseInt(document.getElementById('iq').value)||1);
    if(item.qty - q < 0){ showToast('庫存不足', '目前庫存 '+item.qty+'，無法使用 '+q, '⚠️'); return; }
    item.qty -= q;
    item.updatedAt = new Date().toISOString();
    if(!store.inventoryLogs) store.inventoryLogs = [];
    store.inventoryLogs.push({id:uid(), itemId:item.id, itemName:item.name, type:'use', qty:q, userId:currentUser.id, date:today(), note:document.getElementById('inote').value.trim()});
    saveMultiple(['inventory','inventoryLogs']); closeModal(); rnInventory();
    if(item.qty === 0) showToast('庫存告磬', esc(item.name)+' 已用完，請補貨！', '🚨');
    else if(item.qty <= item.minQty) showToast('庫存警示', esc(item.name)+' 剩餘 '+item.qty+'，已低於最低庫存', '⚠️');
  });
}

function invRestock(id){
  var item = (store.inventory||[]).find(function(i){ return i.id===id; });
  if(!item) return;
  showModal('補貨 — '+esc(item.name),
    '<div class="form-row"><label>補貨數量</label><input id="iq" type="number" value="10" min="1"></div>'
    +'<div class="form-row"><label>備註（選填）</label><input id="inote"></div>',
  function(){
    var q = Math.max(1, parseInt(document.getElementById('iq').value)||1);
    item.qty += q;
    item.updatedAt = new Date().toISOString();
    if(!store.inventoryLogs) store.inventoryLogs = [];
    store.inventoryLogs.push({id:uid(), itemId:item.id, itemName:item.name, type:'restock', qty:q, userId:currentUser.id, date:today(), note:document.getElementById('inote').value.trim()});
    saveMultiple(['inventory','inventoryLogs']); closeModal(); rnInventory();
    showToast('補貨完成', esc(item.name)+' +'+q+esc(item.unit||'個')+' → 庫存 '+item.qty, '📦');
  });
}

function deleteInvItem(id){
  if(!confirm('確定刪除此品項？')) return;
  store.inventory = (store.inventory||[]).filter(function(i){ return i.id!==id; });
  saveCollection('inventory'); rnInventory();
}

function openNewInvItem(){ _invForm(null); }
function openEditInvItem(id){
  var item = (store.inventory||[]).find(function(i){ return i.id===id; });
  _invForm(item);
}
function _invForm(item){
  var catOpts = INV_CATS.map(function(c){
    return '<option value="'+c+'"'+(item&&item.category===c?' selected':'')+'>'+c+'</option>';
  }).join('');
  showModal(item?'編輯品項':'新增品項',
    '<div class="form-row"><label>品項名稱</label><input id="in" value="'+(item?esc(item.name):'')+'"></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
    +'<div class="form-row"><label>分類</label><select id="ic">'+catOpts+'</select></div>'
    +'<div class="form-row"><label>單位</label><input id="iu" value="'+(item?esc(item.unit||'個'):'個')+'"></div>'
    +'<div class="form-row"><label>最低庫存</label><input id="im" type="number" value="'+(item?item.minQty:5)+'" min="0"></div>'
    +'</div>'
    +'<div class="form-row"><label>目前庫存數量</label><input id="iq" type="number" value="'+(item?item.qty:0)+'" min="0"></div>',
  function(){
    var n = document.getElementById('in').value.trim(); if(!n) return;
    if(!store.inventory) store.inventory = [];
    if(item){
      item.name=n; item.category=document.getElementById('ic').value;
      item.unit=document.getElementById('iu').value.trim()||'個';
      item.minQty=parseInt(document.getElementById('im').value)||0;
      item.qty=parseInt(document.getElementById('iq').value)||0;
      item.updatedAt=new Date().toISOString();
    } else {
      store.inventory.push({id:uid(), name:n, category:document.getElementById('ic').value,
        unit:document.getElementById('iu').value.trim()||'個',
        qty:parseInt(document.getElementById('iq').value)||0,
        minQty:parseInt(document.getElementById('im').value)||5,
        updatedAt:new Date().toISOString(), updatedBy:currentUser.id});
    }
    saveCollection('inventory'); closeModal(); rnInventory();
  });
}
