// ════ 會議記錄 ════
var _taskFilter = 'all';
function renderMeetingMain(){
  const m=store.meetings.find(x=>x.id===currentMeetingId);if(!m)return;
  const done=m.tasks.filter(t=>t.status==='已完成').length;
  const ip=m.tasks.filter(t=>t.status==='進行中').length;
  const todo=m.tasks.filter(t=>t.status==='待辦').length;
  const crit=m.tasks.filter(t=>t.priority==='critical'&&t.status!=='已完成').length;
  const rc=Object.values(m.reads||{}).filter(r=>r.read).length;
  const rt=Object.keys(m.reads||{}).length;
  const pc=document.getElementById('pageContainer');
  pc.style.cssText='';
  pc.classList.remove('page-enter');void pc.offsetWidth;pc.classList.add('page-enter');
  pc.innerHTML=`
    <div class="main-header">
      <div style="min-width:0"><h1>${esc(m.title)}</h1><div class="main-header-meta">${fmtDate(m.date)} · ${m.attendeeIds.length} 位與會成員</div></div>
      <div class="header-actions">
        ${crit>0?`<span class="btn-sm urgent-btn">⚡ ${crit} 項緊急任務</span>`:''}
        ${isAdmin()?`<button class="btn-sm" onclick="openEditMeeting()">編輯</button>`:''}
        ${isAdmin()?`<button class="btn-sm danger" onclick="deleteMeeting()">刪除</button><button class="btn-sm" onclick="exportMeetingText()">📄 匯出</button>`:''}
      </div>
    </div>
    <div class="stats-bar">
      <div class="stat-item"><div class="stat-num">${m.tasks.length}</div><div class="stat-label">總任務</div></div>
      <div class="stat-item"><div class="stat-num" style="color:var(--green)">${done}</div><div class="stat-label">已完成</div></div>
      <div class="stat-item"><div class="stat-num" style="color:var(--amber)">${ip}</div><div class="stat-label">進行中</div></div>
      <div class="stat-item"><div class="stat-num" style="color:var(--faint)">${todo}</div><div class="stat-label">待辦</div></div>
      ${crit>0?`<div class="stat-item"><div class="stat-num" style="color:var(--red)">${crit}</div><div class="stat-label">緊急</div></div>`:''}
      <div class="stat-item"><div class="stat-num" style="color:${rc<rt?'var(--red)':'var(--green)'}">${rc}/${rt}</div><div class="stat-label">已讀</div></div>
    </div>
    <div class="tabs">
      <div class="tab ${currentTab==='notes'?'active':''}" onclick="switchTab('notes',this)">紀錄摘要${m.signoff&&m.signoff.locked?'<span class="tab-cnt" style="background:#e8f5e9;color:#2e7d32">🔏</span>':''}</div>
      <div class="tab ${currentTab==='resolutions'?'active':''}" onclick="switchTab('resolutions',this)">決議事項 ${m.resolutions&&m.resolutions.length?`<span class="tab-cnt" style="background:var(--amber-bg);color:var(--amber)">${m.resolutions.length}</span>`:''}</div>
      <div class="tab ${currentTab==='tasks'?'active':''}" onclick="switchTab('tasks',this)">任務 ${m.tasks.length?`<span class="tab-cnt" style="background:var(--s2);color:var(--muted)">${m.tasks.length}</span>`:''}</div>
      <div class="tab ${currentTab==='progress'?'active':''}" onclick="switchTab('progress',this)">進度</div>
      <div class="tab ${currentTab==='chat'?'active':''}" onclick="switchTab('chat',this)">討論 ${m.chat&&m.chat.length?`<span class="tab-cnt" style="background:var(--blue-bg);color:var(--blue)">${m.chat.length}</span>`:''}</div>
      <div class="tab ${currentTab==='votes'?'active':''}" onclick="switchTab('votes',this)">投票 ${m.votes&&m.votes.length?`<span class="tab-cnt" style="background:var(--purple-bg);color:var(--purple)">${m.votes.length}</span>`:''}</div>
    </div>
    <div class="tab-content" id="tabContent"></div>`;
  setTimeout(function(){animateNumbers(pc);pc.querySelectorAll('.card,.task-card').forEach(function(el){el.classList.add('stagger-item');});},15);
  renderTab();
}
function switchTab(tab,el){
  currentTab=tab;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');renderTab();
}
function renderTab(){
  const m=store.meetings.find(x=>x.id===currentMeetingId);if(!m)return;
  const c=document.getElementById('tabContent');
  if(currentTab==='notes')renderNotes(c,m);
  else if(currentTab==='resolutions')renderResolutions(c,m);
  else if(currentTab==='tasks')renderTasks(c,m);
  else if(currentTab==='progress')renderProgress(c,m);
  else if(currentTab==='chat')renderChat(c,m);
  else if(currentTab==='votes')renderVotes(c,m);
}

// ── Notes ──
function renderNotes(c, m) {
  c.style.cssText = '';
  var chips = m.attendeeIds.map(function(uid2) {
    var r = m.reads && m.reads[uid2];
    return '<div class="attendee-chip" style="display:flex;align-items:center;gap:8px;padding:7px 12px;background:var(--surface);border:1px solid var(--b1);border-radius:var(--radius-sm)">'
      + avatarEl(uid2, 26)
      + '<div><div style="font-size:12px;font-weight:500">' + esc(userName(uid2)) + '</div>'
      + '<div style="font-size:10px;color:var(--faint)">' + esc(userTitle(uid2)) + ' · ' + esc(userDept(uid2)) + '</div></div>'
      + '<div style="width:7px;height:7px;border-radius:50%;background:' + (r && r.read ? 'var(--green)' : 'var(--b3)') + ';margin-left:auto" title="' + (r && r.read ? '已讀' : '未讀') + '"></div>'
      + '</div>';
  }).join('');
  var unread = m.attendeeIds.filter(function(u) { return !(m.reads && m.reads[u] && m.reads[u].read); });
  c.innerHTML = '<div class="sec-label">與會成員</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:4px">' + chips + '</div>'
    + (unread.length ? '<div class="alert alert-info" style="margin-top:10px"><span>👁</span><div>未讀：' + unread.map(function(u) { return esc(userName(u)); }).join('、') + '</div></div>' : '')
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin:14px 0 6px">'
    + '<div class="sec-label" style="margin:0">會議摘要</div>'
    + (isAdmin() || m.attendeeIds.includes(currentUser.id)
      ? '<button onclick="editNotesInline(\'' + m.id + '\')" style="font-size:11px;padding:4px 10px;border-radius:var(--radius-sm);border:1px solid var(--b2);background:transparent;color:var(--muted);font-family:inherit;cursor:pointer">✏️ 編輯摘要</button>'
      : '')
    + '</div>'
    + '<div id="notesDisplay" style="background:var(--surface);border:1px solid var(--b1);border-radius:var(--radius);padding:14px 16px;font-size:14px;line-height:1.8;white-space:pre-wrap">'
    + (m.notes ? esc(m.notes) : '<span style="color:var(--faint)">尚無摘要</span>')
    + '</div>'
    // ── 簽核區 ──
    + renderSignoffSection(m);
}

function editNotesInline(meetingId) {
  var m = store.meetings.find(function(x) { return x.id === meetingId; });
  if (!m) return;
  var d = document.getElementById('notesDisplay');
  if (!d) return;
  d.innerHTML = '<textarea id="notesTA" style="width:100%;box-sizing:border-box;min-height:120px;font-family:inherit;font-size:14px;line-height:1.8;border:none;outline:none;resize:vertical;background:transparent;color:var(--text)">'
    + esc(m.notes || '') + '</textarea>'
    + '<div style="display:flex;gap:8px;margin-top:8px;justify-content:flex-end">'
    + '<button onclick="renderTab()" style="font-size:12px;padding:5px 12px;border-radius:var(--radius-sm);border:1px solid var(--b2);background:transparent;color:var(--muted);font-family:inherit;cursor:pointer">取消</button>'
    + '<button onclick="saveNotesInline(\'' + meetingId + '\')" style="font-size:12px;padding:5px 14px;border-radius:var(--radius-sm);border:none;background:var(--primary);color:white;font-family:inherit;cursor:pointer;font-weight:600">儲存</button>'
    + '</div>';
  setTimeout(function() { var ta = document.getElementById('notesTA'); if (ta) ta.focus(); }, 0);
}

function saveNotesInline(meetingId) {
  var m = store.meetings.find(function(x) { return x.id === meetingId; });
  if (!m) return;
  var ta = document.getElementById('notesTA');
  if (!ta) return;
  m.notes = ta.value.trim();
  saveStore(); renderTab();
  showToast('摘要已更新', '', '✅');
}

// ── 任務（含篩選 + 刪除）──
function _getMtg() {
  return store.meetings.find(function(x) { return x.id === currentMeetingId; });
}
function _getTask(taskId) {
  var m = _getMtg(); if (!m) return null;
  return (m.tasks || []).find(function(t) { return t.id === taskId; }) || null;
}

function renderTasks(c, m) {
  c.style.cssText = '';
  var attendees = m.attendeeIds || [];
  var canEdit = isAdmin() || attendees.indexOf(currentUser.id) >= 0;
  var tasks = m.tasks || [];
  var sorted = tasks.slice().sort(function(a, b) {
    var po = {critical: 0, urgent: 1, normal: 2};
    return (po[a.priority] || 2) - (po[b.priority] || 2);
  });
  var todayStr = today();
  var filtered = sorted.filter(function(t) {
    if (_taskFilter === 'mine')    return t.assigneeId === currentUser.id;
    if (_taskFilter === 'todo')    return t.status !== '已完成';
    if (_taskFilter === 'overdue') return t.status !== '已完成' && t.due && t.due < todayStr;
    return true;
  });

  var filterDefs = [
    {k:'all',     l:'全部',  n: sorted.length},
    {k:'mine',    l:'我的',  n: sorted.filter(function(t){ return t.assigneeId === currentUser.id; }).length},
    {k:'todo',    l:'未完成',n: sorted.filter(function(t){ return t.status !== '已完成'; }).length},
    {k:'overdue', l:'逾期',  n: sorted.filter(function(t){ return t.status !== '已完成' && t.due && t.due < todayStr; }).length}
  ];
  var filterHtml = '<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">'
    + filterDefs.map(function(fd) {
      var active = _taskFilter === fd.k;
      return '<button onclick="setTaskFilter(\'' + fd.k + '\')" style="padding:4px 11px;border-radius:99px;border:1.5px solid ' + (active ? 'var(--primary)' : 'var(--b2)') + ';background:' + (active ? 'var(--primary)' : 'transparent') + ';color:' + (active ? 'white' : 'var(--muted)') + ';font-size:11px;font-family:inherit;cursor:pointer;font-weight:' + (active ? '600' : '400') + ';transition:all .12s">'
        + fd.l + (fd.n ? ' ' + fd.n : '') + '</button>';
    }).join('')
    + '</div>';

  var rows = filtered.map(function(t) {
    var tid = t.id;
    var isDone = t.status === '已完成', isIP = t.status === '進行中';
    var dc = dueClass(t.due, t.status);
    var cardClass = t.priority === 'critical' && !isDone ? 't-critical' : t.priority === 'urgent' && !isDone ? 't-urgent' : '';
    var canAct = canEdit || t.assigneeId === currentUser.id;
    return '<div class="task-card ' + cardClass + '">'
      + '<div class="status-dot ' + (isDone ? 'done' : isIP ? 'in-progress' : '') + '" onclick="' + (canAct ? 'cycleStatusById(\'' + tid + '\')' : 'void(0)') + '" title="點擊切換">'
      + (isDone ? '✓' : isIP ? '◑' : '') + '</div>'
      + '<div class="task-body">'
      + '<div class="task-text ' + (isDone ? 'done-text' : '') + '">' + esc(t.text) + '</div>'
      + (t.note ? '<div style="font-size:11px;color:var(--muted);margin-top:2px;font-style:italic;line-height:1.4">📝 ' + esc(t.note) + '</div>' : '')
      + '<div class="task-meta">' + avatarEl(t.assigneeId, 18) + '<span class="task-assignee">' + esc(userName(t.assigneeId)) + '</span>'
      + prioBadge(t.priority)
      + (t.due ? '<span class="due-tag ' + dc + '">' + fmtDate(t.due) + '</span>' : '')
      + '</div></div>'
      + (canAct
        ? '<select class="task-select" onchange="setStatusById(\'' + tid + '\',this.value)">'
          + '<option' + (t.status === '待辦'   ? ' selected' : '') + '>待辦</option>'
          + '<option' + (t.status === '進行中' ? ' selected' : '') + '>進行中</option>'
          + '<option' + (t.status === '已完成' ? ' selected' : '') + '>已完成</option>'
          + '</select>' : '')
      + (canEdit
        ? '<button onclick="openEditTaskById(\'' + tid + '\')" title="編輯" style="background:none;border:none;cursor:pointer;font-size:13px;color:var(--faint);padding:0 4px;line-height:1;flex-shrink:0;opacity:.5;transition:opacity .12s">✏</button>'
          + '<button onclick="deleteTaskById(\'' + tid + '\')" title="刪除" style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--faint);padding:0 4px;line-height:1;flex-shrink:0;opacity:.4;transition:opacity .12s">×</button>'
        : '')
      + '</div>';
  }).join('');

  var doneCount = tasks.filter(function(t){ return t.status === '已完成'; }).length;
  c.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
    + '<div class="sec-label" style="margin:0">任務清單（' + tasks.length + '項）</div>'
    + (canEdit && doneCount
      ? '<button onclick="clearCompletedTasks()" style="font-size:11px;padding:4px 10px;border-radius:var(--radius-sm);border:1px solid var(--b2);background:transparent;color:var(--muted);font-family:inherit;cursor:pointer">清除已完成（' + doneCount + '）</button>'
      : '')
    + '</div>'
    + filterHtml
    + (rows || '<div style="text-align:center;padding:30px;color:var(--faint);font-size:13px">沒有符合條件的任務</div>')
    + (canEdit ? '<div class="add-task-area">'
      + '<input class="input-task" id="newTask" placeholder="輸入任務..." onkeydown="if(event.key===\'Enter\')addTask()">'
      + '<select id="newAssignee">' + attendees.map(function(u) { return '<option value="' + u + '">' + esc(userName(u)) + '</option>'; }).join('') + '</select>'
      + '<select id="newPrio"><option value="normal">一般</option><option value="urgent">急件</option><option value="critical">緊急</option></select>'
      + '<input id="newDue" type="date" style="width:130px">'
      + '<button class="btn-add" onclick="addTask()">新增</button>'
      + '</div>' : '');
}

function setTaskFilter(f) { _taskFilter = f; renderTab(); }

// ── ID-based task actions (safe after Firebase re-normalization) ──
function cycleStatusById(taskId) {
  var m = _getMtg(); if (!m) return;
  var t = _getTask(taskId); if (!t) return;
  t.status = t.status === '待辦' ? '進行中' : t.status === '進行中' ? '已完成' : '待辦';
  saveStore(); renderSidebar(); renderMeetingMain();
}
function setStatusById(taskId, v) {
  var m = _getMtg(); if (!m) return;
  var t = _getTask(taskId); if (!t) return;
  t.status = v;
  saveStore(); renderSidebar(); renderMeetingMain();
}
function deleteTaskById(taskId) {
  var m = _getMtg(); if (!m) return;
  if (!confirm('確定刪除此任務？')) return;
  m.tasks = (m.tasks || []).filter(function(t) { return t.id !== taskId; });
  saveStore(); renderSidebar(); renderMeetingMain();
}
function openEditTaskById(taskId) {
  var m = _getMtg(); if (!m) return;
  var t = _getTask(taskId); if (!t) return;
  var attendees = m.attendeeIds || [];
  var assigneeOpts = attendees.map(function(u) {
    return '<option value="' + u + '"' + (t.assigneeId === u ? ' selected' : '') + '>' + esc(userName(u)) + '</option>';
  }).join('');
  showModal('編輯任務',
    '<div class="form-row"><label>任務內容</label><input id="etText" value="' + esc(t.text || '') + '"></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="form-row"><label>負責人</label><select id="etAssignee">' + assigneeOpts + '</select></div>'
    + '<div class="form-row"><label>優先等級</label><select id="etPrio">'
    + '<option value="normal"' + (t.priority === 'normal' ? ' selected' : '') + '>一般</option>'
    + '<option value="urgent"' + (t.priority === 'urgent' ? ' selected' : '') + '>急件</option>'
    + '<option value="critical"' + (t.priority === 'critical' ? ' selected' : '') + '>緊急</option>'
    + '</select></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="form-row"><label>到期日</label><input id="etDue" type="date" value="' + (t.due || '') + '"></div>'
    + '<div class="form-row"><label>狀態</label><select id="etStatus">'
    + '<option' + (t.status === '待辦' ? ' selected' : '') + '>待辦</option>'
    + '<option' + (t.status === '進行中' ? ' selected' : '') + '>進行中</option>'
    + '<option' + (t.status === '已完成' ? ' selected' : '') + '>已完成</option>'
    + '</select></div></div>'
    + '<div class="form-row"><label>備註（選填）</label><input id="etNote" value="' + esc(t.note || '') + '"></div>',
  function() {
    var m2 = _getMtg(); if (!m2) return;
    var t2 = _getTask(taskId); if (!t2) return;
    var txt = document.getElementById('etText').value.trim();
    if (!txt) return;
    t2.text = txt;
    t2.assigneeId = document.getElementById('etAssignee').value;
    t2.priority = document.getElementById('etPrio').value;
    t2.due = document.getElementById('etDue').value;
    t2.status = document.getElementById('etStatus').value;
    t2.note = document.getElementById('etNote').value.trim();
    saveStore(); closeModal(); renderSidebar(); renderMeetingMain();
    showToast('任務已更新', txt, '✅');
  });
}
function clearCompletedTasks() {
  var m = _getMtg(); if (!m) return;
  var n = (m.tasks || []).filter(function(t) { return t.status === '已完成'; }).length;
  if (!n) { showToast('無已完成任務', '', '⚠️'); return; }
  if (!confirm('確定清除 ' + n + ' 項已完成任務？此操作無法復原。')) return;
  m.tasks = (m.tasks || []).filter(function(t) { return t.status !== '已完成'; });
  saveStore(); renderSidebar(); renderMeetingMain();
  showToast('清除完成', '已移除 ' + n + ' 項完成任務', '✅');
}

// Keep legacy index-based functions for renderMyTasksMain compatibility
function deleteTask(origI) {
  var m = _getMtg(); if (!m) return;
  if (!confirm('確定刪除此任務？')) return;
  (m.tasks || []).splice(origI, 1);
  saveStore(); renderSidebar(); renderMeetingMain();
}

// ── 聊天（全新設計）──
function renderProgress(c,m){
  c.style.cssText='';
  const people={};
  m.tasks.forEach(t=>{
    if(!people[t.assigneeId])people[t.assigneeId]={total:0,done:0,ip:0,tasks:[]};
    people[t.assigneeId].total++;
    if(t.status==='已完成')people[t.assigneeId].done++;
    else if(t.status==='進行中')people[t.assigneeId].ip++;
    people[t.assigneeId].tasks.push(t);
  });
  const overdue=m.tasks.filter(t=>t.status!=='已完成'&&t.due&&t.due<today());
  const al=overdue.length?`<div class="alert alert-danger"><span>⚠</span><div><strong>逾期（${overdue.length}項）：</strong>${overdue.map(t=>`${esc(t.text)}（${esc(userName(t.assigneeId))}）`).join('、')}</div></div>`:'';
  const cards=Object.entries(people).map(([uid,s])=>{
    const pct=s.total?Math.round(s.done/s.total*100):0;
    const col=pct===100?'pf-green':pct>0?'pf-amber':'pf-gray';
    const mini=s.tasks.map(t=>{
      const cls=t.status==='已完成'?'ms-done':t.status==='進行中'?'ms-ip':'ms-todo';
      return`<div class="mini-task"><span class="mini-status ${cls}">${t.status}</span>${prioBadge(t.priority)}<span style="flex:1">${esc(t.text)}</span>${t.due?`<span style="font-size:10px;color:var(--faint)">${fmtDate(t.due)}</span>`:''}</div>`;
    }).join('');
    return`<div class="person-card">
      <div class="person-header">
        <div class="person-name-row">${avatarEl(uid,24)}${esc(userName(uid))}<span style="font-size:11px;color:var(--faint)">${esc(userTitle(uid))}</span></div>
        <div class="person-stats">${s.done}/${s.total} · ${pct}%</div>
      </div>
      <div class="progress-wrap"><div class="progress-fill ${col}" style="width:${pct}%"></div></div>
      <div class="task-list-mini">${mini}</div>
    </div>`;
  }).join('');
  c.innerHTML=`${al}<div class="sec-label">成員進度</div>${cards||'<div style="text-align:center;padding:30px;color:var(--faint);font-size:13px">尚無任務</div>'}`;
}

// ── Chat ──
function renderChat(c, m) {
  if (!m.chat) m.chat = [];
  var prevUserId = null;
  var prevDate   = null;
  var rows = m.chat.map(function(msg) {
    var isMine  = msg.userId === currentUser.id;
    var msgDate = msg.date || '';
    var dateSep = '';
    if (msgDate && msgDate !== prevDate) {
      var dl = msgDate === today() ? '今天' : fmtDate(msgDate);
      dateSep = '<div class="chat-date-sep"><span>' + dl + '</span></div>';
      prevDate = msgDate;
    }
    var isFirst = msg.userId !== prevUserId;
    prevUserId = msg.userId;

    var timeHtml = '<span class="chat-time-inline">' + (msg.time || '') + '</span>';
    var row;
    if (isMine) {
      row = '<div class="chat-row mine">'
        + '<div class="chat-bubble-mine">' + esc(msg.text) + timeHtml + '</div>'
        + '</div>';
    } else {
      row = '<div class="chat-row other">'
        + '<div class="chat-other-avatar">'
        + (isFirst ? avatarEl(msg.userId, 30) : '<div style="width:30px;flex-shrink:0"></div>')
        + '</div>'
        + '<div class="chat-other-body">'
        + (isFirst ? '<div class="chat-other-name">' + esc(userName(msg.userId)) + '</div>' : '')
        + '<div class="chat-bubble-other">' + esc(msg.text) + timeHtml + '</div>'
        + '</div></div>';
    }
    return dateSep + row;
  }).join('');

  c.style.cssText = 'padding:0;display:flex;flex-direction:column;height:calc(100vh - 260px);min-height:320px';
  c.innerHTML = '<div class="chat-wrap2">'
    + '<div class="chat-messages2" id="chatMsgs">'
    + (rows || '<div class="chat-empty"><div style="font-size:38px;margin-bottom:10px">💬</div><div>開始討論吧</div></div>')
    + '</div>'
    + '<div class="chat-input-wrap2">'
    + '<textarea class="chat-input2" id="chatInput" rows="1" placeholder="輸入訊息… (Enter 送出，Shift+Enter 換行)" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendChat();}"></textarea>'
    + '<button class="btn-send2" onclick="sendChat()">送出</button>'
    + '</div></div>';

  var box = document.getElementById('chatMsgs');
  if (box) box.scrollTop = box.scrollHeight;
}

function sendChat() {
  var m = store.meetings.find(function(x) { return x.id === currentMeetingId; });
  if (!m) return;
  var inp = document.getElementById('chatInput');
  var text = inp ? inp.value.trim() : '';
  if (!text) return;
  if (!m.chat) m.chat = [];
  m.chat.push({id: uid(), userId: currentUser.id, text: text, time: nowTime(), date: today()});
  if (inp) inp.value = '';
  saveStore(); renderTab();
}
function renderVotes(c,m){
  if(!m.votes)m.votes=[];
  c.style.cssText='';
  const canManage=isAdmin()||m.attendeeIds.includes(currentUser.id);
  const addForm=`<div id="addVoteForm" style="display:none;background:var(--surface);border:1px dashed var(--b2);border-radius:var(--radius);padding:14px;margin-bottom:12px">
    <div class="form-row"><label>投票問題</label><input id="vQuestion" placeholder="問題..."></div>
    <div id="vOptsEdit">
      <div style="display:flex;gap:6px;margin-bottom:6px"><input class="vopt" placeholder="選項 1" style="flex:1;font-size:12px;border:1px solid var(--b1);border-radius:var(--radius-sm);padding:6px 9px;background:var(--bg);color:var(--text);outline:none;font-family:inherit"></div>
      <div style="display:flex;gap:6px;margin-bottom:6px"><input class="vopt" placeholder="選項 2" style="flex:1;font-size:12px;border:1px solid var(--b1);border-radius:var(--radius-sm);padding:6px 9px;background:var(--bg);color:var(--text);outline:none;font-family:inherit"></div>
    </div>
    <div style="display:flex;gap:7px;margin-bottom:10px"><button class="btn-ghost" style="padding:5px 10px;border-radius:var(--radius-sm);border:1px solid var(--b2);background:transparent;color:var(--muted);font-size:12px;font-family:inherit;cursor:pointer" onclick="addVoteOpt()">＋選項</button></div>
    <div style="display:flex;gap:7px">
      <button class="btn-ghost" style="padding:5px 10px;border-radius:var(--radius-sm);border:1px solid var(--b2);background:transparent;color:var(--muted);font-size:12px;font-family:inherit;cursor:pointer" onclick="document.getElementById('addVoteForm').style.display='none'">取消</button>
      <button class="btn-add" onclick="saveVote()">發起</button>
    </div>
  </div>`;
  const cards=m.votes.map((v,vi)=>{
    const tv=Object.keys(v.votes).length;
    const mv=v.votes[currentUser.id];
    const opts=v.options.map((opt,oi)=>{
      const cnt=Object.values(v.votes).filter(x=>x===oi).length;
      const pct=tv?Math.round(cnt/tv*100):0;
      const voted=mv===oi;
      return`<div class="vote-option ${voted?'voted':''}" onclick="${!v.closed?`castVote(${vi},${oi})`:''}">
        <div class="vote-fill" style="width:${pct}%"></div>
        <div class="vote-option-content"><div class="vote-radio ${voted?'checked':''}"></div><span class="vote-opt-text">${esc(opt)}</span><span class="vote-pct">${pct}%（${cnt}）</span></div>
      </div>`;
    }).join('');
    return`<div class="vote-card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
        <div class="vote-question">${esc(v.question)}</div><span class="${v.closed?'vs-closed':'vs-open'}">${v.closed?'已結束':'進行中'}</span>
      </div>
      <div class="vote-options">${opts}</div>
      <div class="vote-meta"><span>${tv} 人投票</span>${!v.closed&&canManage?`<button class="btn-ghost" style="padding:4px 8px;border-radius:var(--radius-sm);border:1px solid var(--b2);background:transparent;color:var(--muted);font-size:11px;font-family:inherit;cursor:pointer" onclick="closeVote(${vi})">結束</button>`:''}</div>
    </div>`;
  }).join('');
  c.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
    <div class="sec-label" style="margin:0">投票議題</div>
    ${canManage?`<button class="btn-sm" onclick="document.getElementById('addVoteForm').style.display='block'">＋發起投票</button>`:''}
  </div>${addForm}${cards||'<div style="text-align:center;padding:30px;color:var(--faint);font-size:13px">尚無投票</div>'}`;
}
function addVoteOpt(){const c=document.getElementById('vOptsEdit');const n=c.children.length+1;const r=document.createElement('div');r.style.cssText='display:flex;gap:6px;margin-bottom:6px';r.innerHTML=`<input class="vopt" placeholder="選項 ${n}" style="flex:1;font-size:12px;border:1px solid var(--b1);border-radius:var(--radius-sm);padding:6px 9px;background:var(--bg);color:var(--text);outline:none;font-family:inherit">`;c.appendChild(r);}
function saveVote(){const m=store.meetings.find(x=>x.id===currentMeetingId);if(!m)return;const q=document.getElementById('vQuestion').value.trim();if(!q)return;const opts=Array.from(document.querySelectorAll('.vopt')).map(i=>i.value.trim()).filter(Boolean);if(opts.length<2)return;if(!m.votes)m.votes=[];m.votes.push({id:uid(),question:q,options:opts,votes:{},closed:false});saveStore();renderTab();}
function castVote(vi,oi){const m=store.meetings.find(x=>x.id===currentMeetingId);if(!m||!m.votes[vi]||m.votes[vi].closed)return;m.votes[vi].votes[currentUser.id]=oi;saveStore();renderTab();}
function closeVote(vi){const m=store.meetings.find(x=>x.id===currentMeetingId);if(!m)return;m.votes[vi].closed=true;saveStore();renderTab();}

// ══════════════════════════════════════════
// TASK ACTIONS
// ══════════════════════════════════════════
function cycleStatus(i){const m=store.meetings.find(x=>x.id===currentMeetingId);const s=m.tasks[i].status;m.tasks[i].status=s==='待辦'?'進行中':s==='進行中'?'已完成':'待辦';saveStore();renderSidebar();renderMeetingMain();}
function setStatus(i,v){const m=store.meetings.find(x=>x.id===currentMeetingId);m.tasks[i].status=v;saveStore();renderSidebar();renderMeetingMain();}
function addTask(){
  const m=store.meetings.find(x=>x.id===currentMeetingId);
  const text=document.getElementById('newTask').value.trim();if(!text)return;
  m.tasks.push({id:uid(),text,assigneeId:document.getElementById('newAssignee').value,due:document.getElementById('newDue').value,status:'待辦',priority:document.getElementById('newPrio').value});
  saveStore();renderSidebar();renderMeetingMain();
}

// ══════════════════════════════════════════
// MEETING CRUD
// ══════════════════════════════════════════
let editingMeetingId=null;
function openNewMeeting(){
  if(!isAdmin()){alert('只有管理員可新增會議');return;}
  editingMeetingId=null;showModal('新增會議',meetingForm(null),saveMeeting);
}
function openEditMeeting(){editingMeetingId=currentMeetingId;const m=store.meetings.find(x=>x.id===currentMeetingId);showModal('編輯會議',meetingForm(m),saveMeeting);}
function deleteMeeting(){if(!confirm('確定刪除這場會議？'))return;const dm=store.meetings.find(x=>x.id===currentMeetingId);store.meetings=store.meetings.filter(x=>x.id!==currentMeetingId);logAudit('刪除會議', dm?dm.title:'');currentMeetingId=null;saveStore();renderSidebar();renderEmptyMain();}
function meetingForm(m){
  const allUsers=store.users.filter(u=>u.role!=='admin'||u.id===currentUser.id);
  const checks=store.users.map(u=>`<label style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:13px;cursor:pointer">
    <input type="checkbox" value="${u.id}" ${m&&m.attendeeIds.includes(u.id)?'checked':''}>
    ${avatarEl(u.id,20)} ${esc(u.name)} <span style="font-size:11px;color:var(--faint)">${esc(u.title||'')} · ${esc(userDept(u.id))}</span>
  </label>`).join('');
  return`<div class="form-row"><label>會議主題</label><input id="fTitle" value="${esc(m?.title||'')}" placeholder="例：內科部主任會議"></div>
    <div class="form-row"><label>日期</label><input id="fDate" type="date" value="${m?.date||today()}"></div>
    <div class="form-row"><label>與會成員</label><div style="background:var(--bg);border:1px solid var(--b2);border-radius:var(--radius-sm);padding:8px 12px;max-height:160px;overflow-y:auto">${checks}</div></div>
    <div class="form-row"><label>會議摘要</label><textarea id="fNotes" placeholder="討論重點、決議...">${esc(m?.notes||'')}</textarea></div>`;
}
function saveMeeting(){
  const title=document.getElementById('fTitle').value.trim();if(!title)return;
  const date=document.getElementById('fDate').value;
  const notes=document.getElementById('fNotes').value;
  const attendeeIds=Array.from(document.querySelectorAll('#modalContent input[type=checkbox]:checked')).map(cb=>cb.value);
  if(editingMeetingId){
    const m=store.meetings.find(x=>x.id===editingMeetingId);
    m.title=title;m.date=date;m.notes=notes;m.attendeeIds=attendeeIds;
    attendeeIds.forEach(u=>{if(!m.reads[u])m.reads[u]={read:false,time:null};});
    logAudit('編輯會議', title);closeModal();saveStore();renderSidebar();renderMeetingMain();
  } else {
    const id=uid();const reads={};
    attendeeIds.forEach(u=>{reads[u]={read:u===currentUser.id,time:u===currentUser.id?nowTime():null};});
    store.meetings.push({id,title,date,attendeeIds,notes,tasks:[],chat:[],votes:[],reads});
    logAudit('新增會議', title);closeModal();saveStore();renderSidebar();selectMeeting(id);
  }
}

// ══════════════════════════════════════════
// SHIFT HANDOVER
// ══════════════════════════════════════════
// 交班紀錄 → modules/shift.js

// ══════════════════════════════════════════
// 公告 → modules/announcements.js

// ══════════════════════════════════════════
