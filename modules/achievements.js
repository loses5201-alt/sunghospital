// ════ 個人成就卡（read-only 從現有資料計算） ════

function _achMonthsSince(dateStr){
  if(!dateStr) return 0;
  var d = new Date(dateStr);
  if(isNaN(d.getTime())) return 0;
  var now = new Date();
  var months = (now.getFullYear()-d.getFullYear())*12 + (now.getMonth()-d.getMonth());
  return Math.max(0, months);
}

function computeMyAchievements(){
  var me = currentUser.id;
  var ach = [];

  // 1. 主責照護寶寶數
  var babyResp = (store.babies||[]).filter(function(b){
    return (b.responsibleNurses||[]).indexOf(me) >= 0;
  }).length;
  if(babyResp>0) ach.push({
    icon:'🤱', label:'主責照護寶寶', value:babyResp+' 位',
    desc:'被指定為主責的寶寶數', color:'#c4527a'
  });

  // 2. 收到的感謝數
  var thanksReceived = (store.thanks||[]).filter(function(t){return t.toUserId===me;}).length;
  if(thanksReceived>0) ach.push({
    icon:'💝', label:'收到的感謝', value:thanksReceived+' 個',
    desc:'同事對你的肯定', color:'#d65a85'
  });

  // 3. 送出的感謝數（推動正向氛圍）
  var thanksSent = (store.thanks||[]).filter(function(t){return t.fromUserId===me;}).length;
  if(thanksSent>0) ach.push({
    icon:'🌟', label:'送出的感謝', value:thanksSent+' 個',
    desc:'你看見了同事的努力', color:'#9b8fd4'
  });

  // 4. 累積夜班次數（從 dutySchedule 計算）
  var nightCnt = 0;
  if(store.dutySchedule && store.dutySchedule[me]){
    nightCnt = Object.values(store.dutySchedule[me]).filter(function(s){return s==='night';}).length;
  }
  if(nightCnt>0) ach.push({
    icon:'🌙', label:'累積夜班', value:nightCnt+' 次',
    desc:'撐過深夜的辛苦', color:'#1558a0'
  });

  // 5. 累積接生 / 主治寶寶（如果有 birthMethod 記錄且 attending = me，這比較難精準算，先跳過）

  // 6. 已核准的請假申請數
  var leavesApproved = (store.formRequests||[]).filter(function(f){
    return f.applicantId===me && f.type==='leave' && f.status==='approved';
  }).length;
  if(leavesApproved>0) ach.push({
    icon:'🌴', label:'已核准請假', value:leavesApproved+' 次',
    desc:'有好好休息', color:'#2e7d5a'
  });

  // 7. 我審核通過的表單數
  var formsApproved = (store.formRequests||[]).filter(function(f){
    if(!f.approvers || !f.statuses) return false;
    var i = f.approvers.indexOf(me);
    return i>=0 && f.statuses[i]==='approved';
  }).length;
  if(formsApproved>0) ach.push({
    icon:'✅', label:'已審核表單', value:formsApproved+' 件',
    desc:'你的審核讓流程順暢', color:'#1a7a45'
  });

  // 8. 完成的任務（會議任務）
  var taskDone = 0;
  (store.meetings||[]).forEach(function(m){
    (m.tasks||[]).forEach(function(t){
      if(t.assigneeId===me && t.status==='已完成') taskDone++;
    });
  });
  if(taskDone>0) ach.push({
    icon:'🎯', label:'完成任務', value:taskDone+' 項',
    desc:'說到做到', color:'#7a35a0'
  });

  // 9. 發過的留言板貼文
  var posts = (store.journals||[]).filter(function(j){return j.userId===me;}).length;
  if(posts>0) ach.push({
    icon:'📝', label:'留言板貼文', value:posts+' 則',
    desc:'你帶動了討論', color:'#0d8070'
  });

  // 10. 年資（月）
  var months = _achMonthsSince(currentUser.joinDate);
  if(months>0){
    var yrLabel = months>=12 ? Math.floor(months/12)+' 年'+(months%12?(months%12)+' 月':'') : months+' 月';
    ach.push({
      icon:'📅', label:'年資', value:yrLabel,
      desc:'感謝你的付出', color:'#8f5208'
    });
  }

  return ach;
}

function renderMyAchievements(){
  var ach = computeMyAchievements();
  if(!ach.length) return ''; // 沒有任何成就就不顯示

  var cards = ach.map(function(a){
    return '<div class="ach-card" style="--ach-clr:'+a.color+'">'
      + '<div class="ach-icon">'+a.icon+'</div>'
      + '<div class="ach-body">'
      + '<div class="ach-value">'+a.value+'</div>'
      + '<div class="ach-label">'+esc(a.label)+'</div>'
      + '<div class="ach-desc">'+esc(a.desc)+'</div>'
      + '</div></div>';
  }).join('');

  return '<div class="home-section">🏆 我的成就 <span style="font-size:12px;font-weight:400;color:var(--faint);text-transform:none;letter-spacing:0">這些只有在這個系統才看得到</span></div>'
    + '<div class="ach-grid">'+cards+'</div>';
}
