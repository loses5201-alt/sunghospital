// ════ 可搜尋人員選擇器（PeoplePicker） ════
// 用法：
//   container.innerHTML = renderPeoplePicker('myPicker', { mode:'multi', selectedIds:[...] });
//   var ids = pickerSelectedIds('myPicker');  // multi
//   var id  = pickerSelectedId('myPicker');   // single
//
// opts:
//   mode: 'multi' (預設) | 'single'
//   selectedIds: 預先勾選的 id 陣列（multi）
//   selectedId:  預先選中的 id（single）
//   excludeIds:  不要顯示的人員 id 陣列（例：排除自己）
//   filterFn:    自訂過濾函式 user => boolean（例：只取 supervisor）
//   maxHeight:   清單最大高度（預設 220）
//   showSelectAll: 是否顯示「全選 / 清除」按鈕（multi 時預設 true）
//   placeholder: 搜尋框 placeholder

function renderPeoplePicker(pickerId, opts){
  opts = opts || {};
  var mode = opts.mode || 'multi';
  var sel = mode === 'single' ? [opts.selectedId || ''] : (opts.selectedIds || []);
  var exclude = opts.excludeIds || [];
  var filterFn = opts.filterFn;
  var maxH = opts.maxHeight || 220;
  var showAll = mode === 'multi' && opts.showSelectAll !== false;
  var placeholder = opts.placeholder || '🔍 搜尋姓名 / 職稱 / 科別...';

  var pool = (store.users || []).filter(function(u){
    if (exclude.indexOf(u.id) >= 0) return false;
    if ((u.status || 'active') !== 'active') return false;
    if (filterFn && !filterFn(u)) return false;
    return true;
  });

  // 依科別分組顯示，方便瀏覽
  var rows = pool.map(function(u){
    var dept = (typeof userDept === 'function') ? userDept(u.id) : '';
    var title = u.title || '';
    var hay = ((u.name || '') + ' ' + title + ' ' + dept).toLowerCase();
    var checked = sel.indexOf(u.id) >= 0;
    var inputType = mode === 'single' ? 'radio' : 'checkbox';
    var avatar = (typeof avatarEl === 'function') ? avatarEl(u.id, 26) : '';
    return '<label class="pp-row" data-hay="' + hay + '">'
      + '<input type="' + inputType + '" name="pp_' + pickerId + '" value="' + u.id + '"' + (checked ? ' checked' : '') + ' onchange="pickerUpdateCount(\'' + pickerId + '\')">'
      + avatar
      + '<div class="pp-info">'
        + '<div class="pp-name">' + esc(u.name || '') + '</div>'
        + '<div class="pp-meta">' + esc(title) + (title && dept ? ' · ' : '') + esc(dept) + '</div>'
      + '</div>'
      + '</label>';
  }).join('');

  var emptyHtml = '<div class="pp-empty">沒有符合條件的人員</div>';
  var controlsHtml = '<div class="pp-controls">'
    + '<input class="pp-search" placeholder="' + placeholder + '" oninput="pickerSearch(\'' + pickerId + '\', this.value)">'
    + (showAll
      ? '<button type="button" class="pp-mini-btn" onclick="pickerToggleAll(\'' + pickerId + '\', true)">全選</button>'
        + '<button type="button" class="pp-mini-btn" onclick="pickerToggleAll(\'' + pickerId + '\', false)">清除</button>'
      : '')
    + '<span class="pp-count" data-base="' + (mode === 'single' ? '1' : pool.length) + '"></span>'
    + '</div>';

  return '<div id="' + pickerId + '" class="pp pp-' + mode + '" data-mode="' + mode + '">'
    + controlsHtml
    + '<div class="pp-list" style="max-height:' + maxH + 'px">'
    + (rows || emptyHtml)
    + '</div>'
    + '</div>';
}

function pickerSearch(pickerId, q){
  q = (q || '').toLowerCase().trim();
  var picker = document.getElementById(pickerId);
  if (!picker) return;
  var visibleCount = 0;
  picker.querySelectorAll('.pp-row').forEach(function(row){
    var hay = row.dataset.hay || '';
    var match = !q || hay.indexOf(q) >= 0;
    row.style.display = match ? '' : 'none';
    if (match) visibleCount++;
  });
  pickerUpdateCount(pickerId, visibleCount);
}

function pickerToggleAll(pickerId, checked){
  var picker = document.getElementById(pickerId);
  if (!picker) return;
  picker.querySelectorAll('.pp-row').forEach(function(row){
    if (row.style.display !== 'none') {
      var input = row.querySelector('input');
      if (input) input.checked = !!checked;
    }
  });
  pickerUpdateCount(pickerId);
}

function pickerUpdateCount(pickerId, visibleCount){
  var picker = document.getElementById(pickerId);
  if (!picker) return;
  var lbl = picker.querySelector('.pp-count');
  if (!lbl) return;
  var mode = picker.dataset.mode || 'multi';
  if (mode === 'single') {
    var checked = picker.querySelector('input:checked');
    lbl.textContent = checked ? '已選 ' + (userName(checked.value) || '') : '';
  } else {
    var total = picker.querySelectorAll('input:checked').length;
    var visible = visibleCount !== undefined ? visibleCount : picker.querySelectorAll('.pp-row:not([style*="none"])').length;
    var base = lbl.dataset.base || '';
    lbl.textContent = total > 0 ? '已選 ' + total + ' 人' + (visible && visible !== Number(base) ? '（' + visible + ' 筆顯示中）' : '') : (visible && visible !== Number(base) ? visible + ' 筆顯示中' : '');
  }
}

function pickerSelectedIds(pickerId){
  var picker = document.getElementById(pickerId);
  if (!picker) return [];
  return Array.from(picker.querySelectorAll('input:checked')).map(function(el){ return el.value; });
}

function pickerSelectedId(pickerId){
  var arr = pickerSelectedIds(pickerId);
  return arr[0] || '';
}
