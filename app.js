// ══════════════════════════════════════
// FIREBASE CONFIG
// ══════════════════════════════════════
var FB_CONFIG = {
  apiKey: "AIzaSyCVzKxsbUW4zDeCOOUjSlZqYNjb0zn7VfU",
  authDomain: "sunghospital-9eb65.firebaseapp.com",
  databaseURL: "https://sunghospital-9eb65-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sunghospital-9eb65",
  storageBucket: "sunghospital-9eb65.firebasestorage.app",
  messagingSenderId: "1019796894908",
  appId: "1:1019796894908:web:7bb5aad634f90974a80cb9"
};
var fbDb = null;
var fbAuth = null;

// Firebase array/object normalization
// Firebase RTDB converts arrays to objects - convert back
function normalizeArr(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return Object.values(val);
}
function normalizeStore(s) {
  if (!s) return s;
  ['meetings','users','departments','shifts','announcements','incidents',
   'emergencies','babies','rooms','formRequests','swapRequests','journals',
   'eduItems','titles','formNotifs','messages','chatRooms','equipment',
   'patients','sops','inventory','inventoryLogs','skillDefs','leaves'].forEach(function(f) {
    s[f] = normalizeArr(s[f]);
  });
  s.meetings.forEach(function(m) {
    m.tasks = normalizeArr(m.tasks);
    m.chat = normalizeArr(m.chat);
    m.votes = normalizeArr(m.votes);
    m.votes.forEach(function(v) {
      v.options = normalizeArr(v.options);
    });
  });
  return s;
}

// Init Firebase after page fully loads
window.addEventListener('load', function() {
  try {
    if (typeof firebase === 'undefined') { setSyncDot(false); return; }
    firebase.initializeApp(FB_CONFIG);
    fbDb = firebase.database();
    fbAuth = firebase.auth();
    setSyncDot(true);
  } catch(e) {
    setSyncDot(false);
  }
});

// Sync status dot
function setSyncDot(ok) {
  var el = document.getElementById('syncDot');
  if (!el) return;
  el.style.background = ok ? '#2e7d5a' : '#b8909a';
  el.title = ok ? '雲端同步中' : '本機模式';
}

// ══════════════════════════════════════════
// UTILITY: CSV Export
// ══════════════════════════════════════════
function exportCSV(rows,filename){
  var csv=rows.map(function(r){return r.map(function(c){return'"'+String(c===null||c===undefined?'':c).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
  var blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();
}
function exportFormsCSV(){
  var rows=[['ID','標題','類型','申請人','開始日期','結束日期','原因','狀態','建立時間']];
  (store.formRequests||[]).forEach(function(f){
    rows.push([f.id||'',f.title||'',f.type||'',userName(f.applicantId||''),f.startDate||'',f.endDate||'',f.reason||'',f.status||'',f.createdAt||'']);
  });
  exportCSV(rows,'表單申請_'+today()+'.csv');
}
function exportDutyCSV(){
  var wk=getWk();
  var rows=[['姓名'].concat(wk.map(fmtDate))];
  store.users.filter(function(u){return u.status!=='disabled'&&u.status!=='resigned';}).forEach(function(u){
    rows.push([u.name].concat(wk.map(function(d){return(store.dutySchedule&&store.dutySchedule[u.id]&&store.dutySchedule[u.id][d])||'off';})));
  });
  exportCSV(rows,'值班表_'+today()+'.csv');
}

// ══════════════════════════════════════════
// UTILITY: Browser Notifications
// ══════════════════════════════════════════
var _seenNotifIds=new Set();
function initBrowserNotifications(){
  if('Notification' in window&&Notification.permission==='default'){
    Notification.requestPermission();
  }
  _seenNotifIds=new Set();
  (store.formNotifs||[]).forEach(function(n){_seenNotifIds.add(n.id);});
}
function checkNewNotifs(){
  if(!currentUser) return;
  (store.formNotifs||[]).forEach(function(n){
    if(!_seenNotifIds.has(n.id)){
      _seenNotifIds.add(n.id);
      if(n.toUserId===currentUser.id) pushBrowserNotif(n.title,n.body||'');
    }
  });
}
function pushBrowserNotif(title,body){
  if('Notification' in window&&Notification.permission==='granted'){
    try{new Notification(title,{body:body||''});}catch(e){}
  }
}

// ══════════════════════════════════════════
// UTILITY: Journal Streak
// ══════════════════════════════════════════
function calcJournalStreak(userId){
  var dates=(store.journals||[]).filter(function(j){return j.userId===userId;}).map(function(j){return j.date;});
  if(!dates.length) return 0;
  var unique=Array.from(new Set(dates)).sort().reverse();
  var streak=0;
  for(var i=0;i<60;i++){
    var d=new Date(today());d.setDate(d.getDate()-i);
    var ds=d.toISOString().split('T')[0];
    if(unique.indexOf(ds)>=0) streak++;
    else break;
  }
  return streak;
}

// Google Login
function doGoogleLogin() {
  if (!fbAuth) { alert('Firebase 連線中，請稍後再試'); return; }
  var provider = new firebase.auth.GoogleAuthProvider();
  fbAuth.signInWithPopup(provider).then(function(result) {
    var gu = result.user;
    var matched = store.users.find(function(u) {
      return u.email === gu.email || u.googleId === gu.uid;
    });
    if (!matched) {
      matched = {
        id: uid(), username: gu.email.split('@')[0], password: '',
        name: gu.displayName || gu.email.split('@')[0],
        email: gu.email, googleId: gu.uid,
        role: 'member', deptId: '', title: '', avatar: 'av-a'
      };
      store.users.push(matched);
      saveStore();
    }
    currentUser = matched;
    sessionStorage.setItem('loggedInUserId', matched.id);
    document.getElementById('loginErr').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appShell').style.display = 'block';
    initApp();
  }).catch(function(e) {
    var el = document.getElementById('loginErr');
    el.textContent = 'Google 登入失敗：' + e.message;
    el.style.display = 'block';
  });
}

// Firebase sync in initApp (called after login)
// onReady: callback fired once the first cloud fetch completes (or immediately if no Firebase)
function startFirebaseSync(onReady) {
  if (!fbDb) { setSyncDot(false); if (onReady) onReady(); return; }

  window._lastSelfSave = 0;
  window._lastCloudSavedAt = 0;

  // 策略：永遠先從雲端拉最新資料
  fbDb.ref('store').once('value').then(function(snap) {
    var cloudData = snap.val();
    if (cloudData && cloudData.users && cloudData.users.length > 0) {
      // 雲端有資料，以雲端為準（覆蓋本機 localStorage 舊快取）
      store = normalizeStore(cloudData);
      try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch(e) {}
      mergeNewLocal();
      window._lastCloudSavedAt = store._savedAt || 0;
    } else {
      // 雲端是空的，把本地資料推上去（初始化）
      fbDb.ref('store').set(store).catch(function() {});
    }

    // 雲端資料就緒，通知呼叫者可以渲染頁面了
    if (onReady) onReady();

    // 即時監聽：只要雲端 _savedAt 有變動就重新拉取
    fbDb.ref('store/_savedAt').on('value', function(tSnap) {
      var cloudTime = tSnap.val() || 0;
      window._lastCloudSavedAt = cloudTime;
      // 跳過自己剛存的（避免無限循環）
      if (cloudTime === window._lastSelfSave) return;
      if (!currentUser) return;

      fbDb.ref('store').once('value').then(function(dSnap) {
        var d = dSnap.val();
        if (!d || !d.users) return;
        var prevAnnLen = (store.announcements||[]).length;
        var prevIrLen  = (store.incidents||[]).length;
        store = normalizeStore(d);
        try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch(ex) {}
        mergeNewLocal();
        var newAnns = (store.announcements||[]).length - prevAnnLen;
        var newIrs  = (store.incidents||[]).length  - prevIrLen;
        if (newAnns > 0) { var a = store.announcements[0]; showToast('新公告', a ? a.title : '', '📢'); }
        if (newIrs  > 0) { var ir = store.incidents[0];    showToast('新事件通報', ir ? ir.title : '', '🚨'); }
        // 更新當前頁面（涵蓋所有分頁）
        renderSidebar();
        updateAnnBadge(); updateIrBadge(); updateCalBadge(); updateMarquee();
        if (currentPage === 'meetings' || !currentPage) {
          if (currentMeetingId) renderMeetingMain();
        } else if (currentPage === 'home') {
          setPage('home');
        }
      });
    });

    setSyncDot(true);
  }).catch(function() {
    setSyncDot(false);
    if (onReady) onReady(); // Firebase 失敗仍要讓頁面渲染
  });
}



// ══════════════════════════════════════════
// STORAGE & INIT
// ══════════════════════════════════════════
const STORE_KEY='sunghospital_v3';
function loadStore(){
  // 清除所有舊版本快取
  ['sunghospital_v1','sunghospital_v2','medlog_v4','medlog_v3','medlog_v2','meetinglog_v2'].forEach(k=>localStorage.removeItem(k));
  try{const d=localStorage.getItem(STORE_KEY);if(!d)return null;return normalizeStore(JSON.parse(d));}catch{return null;}
}
function saveStore(){
  store._savedAt = Date.now();
  window._lastSelfSave = store._savedAt;
  try{localStorage.setItem(STORE_KEY,JSON.stringify(store));}catch(e){}
  if(fbDb){
    fbDb.ref('store').set(store).catch(function(){});
  }
}

function defaultStore(){
  const td=today();
  return {
    departments:[
      {id:'d1',name:'內科部',color:'blue'},
      {id:'d2',name:'外科部',color:'teal'},
      {id:'d3',name:'護理部',color:'green'},
      {id:'d4',name:'行政部',color:'amber'},
      {id:'d5',name:'急診部',color:'red'},
    ],
    titles:['主治醫師','住院醫師','護理師','護理長','行政人員','病房主任','科主任'],
    users:[
      {id:'u1',username:'admin',password:'admin123',name:'金秀賢',role:'admin',deptId:'d4',title:'行政人員',avatar:'av-a'},
      {id:'u2',username:'gong_yoo',password:'123456',name:'孔劉',role:'admin',deptId:'d1',title:'科主任',avatar:'av-b'},
      {id:'u3',username:'songhye',password:'123456',name:'宋慧喬',role:'member',deptId:'d3',title:'護理長',avatar:'av-c'},
      {id:'u4',username:'leeminho',password:'123456',name:'李敏鎬',role:'member',deptId:'d2',title:'主治醫師',avatar:'av-d'},
      {id:'u5',username:'parkbojam',password:'123456',name:'朴寶劍',role:'member',deptId:'d1',title:'住院醫師',avatar:'av-e'},
      {id:'u6',username:'kimjiwon',password:'123456',name:'金智媛',role:'member',deptId:'d3',title:'護理師',avatar:'av-f'},
      {id:'u7',username:'sonyejin',password:'123456',name:'孫藝珍',role:'member',deptId:'d4',title:'行政人員',avatar:'av-g'},
      {id:'u8',username:'iu_lee',password:'123456',name:'IU 李知恩',role:'member',deptId:'d5',title:'護理師',avatar:'av-h'},
    ],
    meetings:[
      {id:'m1',title:'內科部主任會議',date:td,attendeeIds:['u2','u3','u4','u5'],
       notes:'討論本月住院病患管理流程優化，確認各病房護病比調整方案，急重症病床分配原則討論。',
       tasks:[
         {id:'t1',text:'更新護病比評估報告',assigneeId:'u3',due:addD(td,5),status:'進行中',priority:'urgent'},
         {id:'t2',text:'確認新進住院醫師排班',assigneeId:'u2',due:addD(td,3),status:'待辦',priority:'normal'},
         {id:'t3',text:'送出急重症病床申請',assigneeId:'u4',due:addD(td,7),status:'待辦',priority:'critical'},
         {id:'t4',text:'彙整上月出院統計',assigneeId:'u5',due:addD(td,2),status:'已完成',priority:'normal'},
       ],
       chat:[
         {id:'c1',userId:'u3',text:'護病比報告我這週四前可以完成，請主任確認格式。',time:'09:15'},
         {id:'c2',userId:'u2',text:'格式沿用上季版本即可，重點加上各班次分布圖。',time:'09:22'},
       ],
       reads:{'u2':{read:true,time:'08:50'},'u3':{read:true,time:'09:10'},'u4':{read:false,time:null},'u5':{read:false,time:null}},
       votes:[
         {id:'v1',question:'護病比調整方案偏好？',options:['方案 A（1:8）','方案 B（1:10）','維持現狀'],votes:{'u2':0,'u3':0,'u4':1},closed:false},
       ]
      },
      {id:'m2',title:'急診部感染管控會議',date:addD(td,-2),attendeeIds:['u2','u4','u8'],
       notes:'討論近期急診室感染管控措施，確認 COVID 相關防護流程，評估隔離病房使用狀況。',
       tasks:[
         {id:'t1',text:'更新感染管控 SOP 文件',assigneeId:'u4',due:addD(td,4),status:'進行中',priority:'critical'},
         {id:'t2',text:'備齊個人防護設備清單',assigneeId:'u8',due:addD(td,1),status:'待辦',priority:'urgent'},
       ],
       chat:[],
       reads:{'u2':{read:true,time:'14:00'},'u4':{read:true,time:'14:30'},'u8':{read:false,time:null}},
       votes:[]
      },
    ],
    shifts:[
      {id:'s1',date:td,shift:'morning',unit:'內科 3A 病房',
       fromUserId:'u3',toUserId:'u6',
       patients:'目前收治 22 床，3 位病患今日出院，1 位新入院等待床位。',
       keyEvents:'床位 312 病患昨夜血壓偏低，已通報值班醫師處理，目前穩定。',
       pending:'床位 315 待做胸腔 X 光，310 家屬要求談話。',
       meds:'胰島素 Insulin 庫存剩 3 瓶，請補充。',
       fromSigned:true,toSigned:false,createdAt:td+' 07:45'},
      {id:'s2',date:addD(td,-1),shift:'afternoon',unit:'護理部 B棟',
       fromUserId:'u6',toUserId:'u3',
       patients:'共 18 床，均穩定。',
       keyEvents:'無特殊事件。',
       pending:'床位 205 換藥待做。',
       meds:'無缺藥。',
       fromSigned:true,toSigned:true,createdAt:addD(td,-1)+' 15:30'},
    ],
    announcements:[
      {id:'a1',title:'⚠ 感染管控警示：流感 H3N2 上升',body:'本週流感 H3N2 確診病例較上週上升 23%，請全院加強手部衛生、確實佩戴口罩。急診、感染科病房加強負壓病室管理。',
       authorId:'u2',time:td+' 08:00',pinned:true,category:'infection',infectionLevel:'orange',
       reads:{'u2':true,'u3':false,'u4':false,'u5':false,'u6':false,'u7':false,'u8':false}},
      {id:'a2',title:'四月份全院教育訓練',body:'訂於 4/20（日）09:00 舉辦急救更新訓練（ACLS），請各科室安排人員出席，缺席請提前申請代訓。',
       authorId:'u7',time:addD(td,-1)+' 17:00',pinned:false,category:'general',infectionLevel:'',
       reads:{'u2':true,'u3':true,'u4':false,'u5':false,'u6':true,'u7':true,'u8':false}},
    ],
    incidents:[
      {id:'i1',title:'藥物給錯事件',description:'護理師A在換班期間，將床位 312 的 Metformin 500mg 給予床位 313 病患，患者無不良反應，已向主治醫師回報。',
       reporterId:'u6',deptId:'d3',level:'3',status:'processing',date:addD(td,-1),
       actions:'已向主治醫師回報，病患持續觀察中。填寫藥物錯誤報告表。',
       followUp:'追蹤 24 小時觀察，加強換班核對流程。'},
      {id:'i2',title:'跌倒意外：床位 215',description:'病患自行下床如廁時跌倒，無骨折，輕微擦傷。病患意識清楚，無失憶情形。',
       reporterId:'u3',deptId:'d3',level:'2',status:'closed',date:addD(td,-3),
       actions:'立即評估傷勢，通知家屬，醫師查房確認。',
       followUp:'已完成。加裝床邊扶手，加強跌倒預防衛教。'},
    ],
    emergencies:[],
  };
}
function addD(d,n){const dt=new Date(d);dt.setDate(dt.getDate()+n);return dt.toISOString().split('T')[0];}

let store=loadStore()||defaultStore();
let currentUser=null,currentMeetingId=null,currentTab='notes',currentPage='meetings';

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════
const AVCOLORS=['av-a','av-b','av-c','av-d','av-e','av-f','av-g','av-h','av-i','av-j'];
function getAv(uid){const u=store.users.find(x=>x.id===uid);return u?u.avatar:AVCOLORS[0];}
function userName(uid){const u=store.users.find(x=>x.id===uid);return u?u.name:'—';}
function userDept(uid){const u=store.users.find(x=>x.id===uid);if(!u||!u.deptId)return'';const d=store.departments.find(x=>x.id===u.deptId);return d?d.name:'';}
function userTitle(uid){const u=store.users.find(x=>x.id===uid);return u?u.title||'':'';}
function initials(name){if(!name)return'?';const p=name.trim().split(/\s+/);return p.length>=2?p[0][0]+p[1][0]:name.slice(0,2).toUpperCase();}
function today(){return new Date().toISOString().split('T')[0];}
function nowTime(){return new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'});}
function fmtDate(d){if(!d)return'';const[y,m,dd]=d.split('-');return`${y}/${m}/${dd}`;}
function dueClass(due,status){
  if(status==='已完成')return'due-ok';if(!due)return'';
  if(due<today())return'due-over';if(due<=addD(today(),3))return'due-warn';return'due-ok';
}
function esc(s){return String(s||'').replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>');}
function uid(){return 'id'+Date.now()+Math.random().toString(36).slice(2,5);}
function isAdmin(){return currentUser&&currentUser.role==='admin';}
function hasPerm(p){return isAdmin()||!!(currentUser&&currentUser.permissions&&currentUser.permissions[p]);}
function prioBadge(p){
  if(p==='critical')return`<span class="prio prio-critical"><span class="prio-dot"></span>緊急</span>`;
  if(p==='urgent')return`<span class="prio prio-urgent"><span class="prio-dot"></span>急件</span>`;
  return`<span class="prio prio-normal">一般</span>`;
}
function avatarEl(uid,size=26){
  const sz=`width:${size}px;height:${size}px;font-size:${Math.round(size*0.4)}px`;
  return`<div class="avatar ${getAv(uid)}" style="${sz}">${initials(userName(uid))}</div>`;
}

// ══════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════
function doLogin(){
  var uEl=document.getElementById('loginUser');var pEl=document.getElementById('loginPass');
  if(!uEl||!pEl)return;
  const uname=uEl.value.trim();
  const pass=pEl.value;
  const user=store.users.find(u=>u.username===uname&&u.password===pass);
  if(!user){document.getElementById('loginErr').style.display='block';return;}
  currentUser=user;
  sessionStorage.setItem('loggedInUserId', user.id); // 保存 session，F5 後自動還原
  document.getElementById('loginErr').style.display='none';
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('appShell').style.display='block';
  initApp();
}
function initApp(){
  applySettings();
  mergeNewLocal();
  updateNavUser();
  renderNav();
  startClock();
  startPresence();
  initBrowserNotifications();
  initDarkModeAuto();
  setInterval(updateShiftCountdown, 60000); updateShiftCountdown();

  // 顯示同步畫面，等 Firebase 回傳後才渲染主內容
  var _pc = document.getElementById('pageContainer');
  if (_pc) _pc.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:14px">'
    + '<div style="width:38px;height:38px;border:3px solid var(--b2);border-top-color:var(--primary);border-radius:50%;animation:spin .7s linear infinite"></div>'
    + '<div style="font-size:14px;font-weight:700;color:var(--text)">正在同步院內資料</div>'
    + '<div style="font-size:11px;color:var(--faint)">連線中，請稍候…</div>'
    + '</div>';

  startFirebaseSync(function() {
    // Firebase 資料就緒後才渲染
    updateAnnBadge(); updateIrBadge(); updateCalBadge();
    updateNotifBadge((store.announcements||[]).filter(function(a){ return !a.reads[currentUser && currentUser.id]; }).length);
    renderSidebar();
    setPage('home');
    checkPendingEmergency();
    setTimeout(showDailySummary, 800);
  });
}
function updateNavUser(){
  if(!currentUser)return;
  const el=document.getElementById('navUser');
  if(!el)return;
  el.className='nav-user '+currentUser.avatar;
  el.innerHTML='<span style="flex-shrink:0">'+initials(currentUser.name)+'</span>'
    +'<span class="nav-user-name">'+esc(currentUser.name)+'</span>';
}
function toggleProfileMenu(){
  const m=document.getElementById('profileMenu');
  m.classList.toggle('open');
  if(m.classList.contains('open')){
    m.innerHTML=`<div class="pm-header">
      <div class="pm-name">${esc(currentUser.name)}</div>
      <div class="pm-role">${esc(userTitle(currentUser.id))} · ${esc(userDept(currentUser.id))}</div>
    </div>
    <div class="pm-item" onclick="openChangePassword()">🔒 修改密碼</div>
    <div class="pm-item" onclick="openSettings()">⚙️ 個人設定</div>
    <div class="pm-item danger" onclick="logout()">登出</div>`;
  }
}
document.addEventListener('click',function(e){
  const m=document.getElementById('profileMenu');
  const u=document.getElementById('navUser');
  if(m&&!m.contains(e.target)&&u&&!u.contains(e.target))m.classList.remove('open');
});
function logout(){
  sessionStorage.removeItem('loggedInUserId'); // 清除 session
  if(fbDb)fbDb.ref('store/_savedAt').off();
  if(fbAuth&&fbAuth.currentUser)fbAuth.signOut().catch(function(){});
  currentUser=null;currentMeetingId=null;
  document.getElementById('appShell').style.display='none';
  document.getElementById('loginScreen').style.display='flex';
  document.getElementById('loginUser').value='';
  document.getElementById('loginPass').value='';
}

// ══════════════════════════════════════════
// NAV / PAGE ROUTING
// ══════════════════════════════════════════

// ── Nav group definitions ──────────────────
var _navExpanded = (localStorage.getItem('navExpanded')!=='0');
var _navGroupCollapsed = JSON.parse(localStorage.getItem('navGroupCollapsed')||'{}');

var NAV_GROUPS = [
  { id:'daily', label:'日常作業', dot:'#e07ca0', items:[
    { id:'navHome',     page:'home',          label:'首頁',
      svg:'<path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h4a1 1 0 001-1v-3h2v3a1 1 0 001 1h4a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>'},
    { id:'navAnn',      page:'announcements', label:'公告',     badge:'ann',
      svg:'<path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 00-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>'},
    { id:'navCal',      page:'calendar',      label:'行事曆',  badge:'cal',
      svg:'<rect x="3" y="4" width="14" height="14" rx="2"/><path d="M7 2v4M13 2v4M3 9h14"/>'},
    { id:'navJournal',  page:'journal',       label:'留言板',
      svg:'<path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>'},
    { id:'navMessages', page:'messages',      label:'站內訊息', badge:'msg',
      svg:'<path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>'}
  ]},
  { id:'nursing', label:'護理管理', dot:'#5ba5e0', items:[
    { id:'navPatient',  page:'patient',       label:'病患看板',
      svg:'<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>'},
    { id:'navBaby',     page:'baby',          label:'寶寶牆',
      svg:'<path d="M12 2C9.79 2 8 3.79 8 6s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-5 0-9 2.25-9 5v1h18v-1c0-2.75-4-5-9-5z"/>'},
    { id:'navDelivery', page:'delivery',      label:'產房狀態',
      svg:'<path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>'},
    { id:'navShift',    page:'shift',         label:'交班紀錄',
      svg:'<path d="M8 7h3m-3 4h5m-5 4h2M4 5v14l3-2 3 2 3-2 3 2V5a2 2 0 00-2-2H6a2 2 0 00-2 2z"/>'},
    { id:'navDuty',     page:'duty',          label:'值班表',
      svg:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'}
  ]},
  { id:'admin', label:'行政作業', dot:'#f0b429', items:[
    { id:'navLeave',    page:'leave',         label:'請假管理',
      svg:'<path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>'},
    { id:'navInventory',page:'inventory',     label:'庫存管理',
      svg:'<path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>'},
    { id:'navForms',    page:'forms',         label:'表單簽核',
      svg:'<path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>'},
    { id:'navMeetings', page:'meetings',      label:'會議紀錄',
      svg:'<rect x="3" y="4" width="14" height="14" rx="2"/><path d="M7 2v4M13 2v4M3 9h14"/>'},
    { id:'navIncident', page:'incident',      label:'異常通報',  badge:'ir',
      svg:'<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/>'},
    { id:'navEquipment',page:'equipment',     label:'設備回報',  badge:'eq',
      svg:'<path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>'}
  ]},
  { id:'system', label:'系統管理', dot:'#9b8fd4', items:[
    { id:'navSop',      page:'sop',           label:'SOP 文件',
      svg:'<path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>'},
    { id:'navSkills',   page:'skills',        label:'技能矩陣',
      svg:'<path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>'},
    { id:'navStats',    page:'stats',         label:'統計報表',
      svg:'<path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>'},
    { id:'navEdu',      page:'edu',           label:'衛教資料',
      svg:'<path d="M10 3L2 7l8 4 8-4-8-4z"/><path d="M2 7v5M18 7v5M6 9v4a4 4 0 008 0V9"/>'},
    { id:'navKiosk',    page:'kiosk',         label:'全院儀表板',
      svg:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'},
    { id:'navDepts',    page:'departments',   label:'科別管理',  adminOnly:true,
      svg:'<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>'},
    { id:'navUsers',    page:'users',         label:'人員管理',  adminOnly:true,
      svg:'<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>'}
  ]}
];

function renderNav(){
  var bar=document.getElementById('navBar');
  var wrap=document.getElementById('navItems');
  if(!wrap)return;
  if(_navExpanded)bar.classList.add('nav-expanded');
  else bar.classList.remove('nav-expanded');

  var html='';
  NAV_GROUPS.forEach(function(g){
    var collapsed=!!_navGroupCollapsed[g.id];
    var visItems=g.items.filter(function(it){ return !it.adminOnly||isAdmin(); });
    if(!visItems.length)return;
    var arrowRot=collapsed?'rotate(-90deg)':'';
    html+='<div class="nav-group" id="ng_'+g.id+'">'
      +'<div class="nav-group-hdr" onclick="toggleNavGroup(\''+g.id+'\')" title="'+g.label+'">'
      +'<div class="nav-group-dot" style="background:'+g.dot+'"></div>'
      +'<span class="nav-group-lbl">'+g.label+'</span>'
      +'<div class="nav-spacer" style="flex:1;min-width:0"></div>'
      +'<span class="nav-group-arrow" style="transform:'+arrowRot+'">▾</span>'
      +'</div>'
      +'<div class="nav-group-body'+(collapsed?' ng-collapsed':'')+'">';
    visItems.forEach(function(it){
      var isActive=(currentPage===it.page)?'active':'';
      var fillType=it.svg.indexOf('stroke')!==-1?'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"':'fill="currentColor"';
      var svgEl='<svg viewBox="0 0 20 20" '+fillType+' width="16" height="16">'+it.svg+'</svg>';
      html+='<button class="nav-btn '+isActive+'" id="'+it.id+'" onclick="setPage(\''+it.page+'\')" title="'+it.label+'">'
        +svgEl+'<span class="nav-lbl">'+it.label+'</span>'
        +(it.badge?'<span class="nav-badge" id="badge_'+it.badge+'" style="display:none"></span>':'')
        +'</button>';
    });
    html+='</div></div>';
  });

  // expand toggle button
  html='<button class="nav-expand-btn" onclick="toggleNavExpand()" title="展開/收合選單">'
    +(_navExpanded
      ? '<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"/></svg>'
      : '<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"/></svg>')
    +'</button>'+html;

  wrap.innerHTML=html;

  // Re-wire badges
  updateAnnBadge();updateIrBadge();updateCalBadge();updateMsgBadge();updateEqBadge();
  var notifCount=(store.formNotifs||[]).filter(function(n){return !n.read;}).length;
  updateNotifBadge(notifCount);
}

function toggleNavExpand(){
  _navExpanded=!_navExpanded;
  localStorage.setItem('navExpanded',_navExpanded?'1':'0');
  renderNav();
}

function toggleNavGroup(gid){
  _navGroupCollapsed[gid]=!_navGroupCollapsed[gid];
  localStorage.setItem('navGroupCollapsed',JSON.stringify(_navGroupCollapsed));
  var body=document.querySelector('#ng_'+gid+' .nav-group-body');
  var arrow=document.querySelector('#ng_'+gid+' .nav-group-arrow');
  if(body)body.classList.toggle('ng-collapsed',!!_navGroupCollapsed[gid]);
  if(arrow)arrow.style.transform=_navGroupCollapsed[gid]?'rotate(-90deg)':'';
}

function setPage(page){
  currentPage=page;
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  const nb=document.getElementById('nav'+page.charAt(0).toUpperCase()+page.slice(1).replace('announcements','Ann').replace('incident','Incident').replace('calendar','Cal').replace('departments','Depts').replace('statistics','Stats').replace('stats','Stats').replace('shift','Shift').replace('meetings','Meetings').replace('users','Users').replace('baby','Baby').replace('delivery','Delivery').replace('forms','Forms').replace('duty','Duty').replace('journal','Journal').replace('edu','Edu'));
  if(nb)nb.classList.add('active');
  const sidebar=document.getElementById('sidebar');
  const pc=document.getElementById('pageContainer');
  if(page==='meetings'){
    sidebar.style.display='flex';
    if(currentMeetingId)renderMeetingMain();
    else renderEmptyMain();
  } else {
    sidebar.style.display='none';
    if(page==='announcements'){renderPageInMain(renderAnnouncementsPage);updateAnnBadge();markAllAnnRead();}
    else if(page==='shift')renderPageInMain(renderShiftPage);
    else if(page==='incident')renderPageInMain(renderIncidentPage);
    else if(page==='calendar')renderPageInMain(renderCalendarPage);
    else if(page==='stats')renderPageInMain(renderStatsPage);
    else if(page==='departments')renderPageInMain(renderDepartmentsPage);
    else if(page==='users')renderPageInMain(renderUsersPage);
    else if(page==='baby'){hideSidebar();renderPageInMain(renderBabyPage);}
    else if(page==='delivery'){hideSidebar();renderPageInMain(renderDeliveryPage);}
    else if(page==='forms'){hideSidebar();renderPageInMain(renderFormsPage);}
    else if(page==='duty'){hideSidebar();renderPageInMain(renderDutyPage);}
    else if(page==='journal'){hideSidebar();renderPageInMain(renderJournalPage);}
    else if(page==='edu'){hideSidebar();renderPageInMain(renderEduPage);}
    else if(page==='home'){hideSidebar();renderPageInMain(renderHomePage);}
    else if(page==='messages'){hideSidebar();renderPageInMain(renderMessagesPage);}
    else if(page==='equipment'){hideSidebar();renderPageInMain(renderEquipmentPage);}
    else if(page==='kiosk'){hideSidebar();renderPageInMain(renderKioskPage);}
    else if(page==='patient'){hideSidebar();renderPageInMain(renderPatientPage);}
    else if(page==='sop'){hideSidebar();renderPageInMain(renderSopPage);}
    else if(page==='inventory'){hideSidebar();renderPageInMain(renderInventoryPage);}
    else if(page==='skills'){hideSidebar();renderPageInMain(renderSkillsPage);}
    else if(page==='leave'){hideSidebar();renderPageInMain(renderLeavePage);}
  }
}
function renderPageInMain(fn){
  const c=document.getElementById('pageContainer');
  c.innerHTML='';
  c.style.cssText='';
  fn(c);
  // 頁面切換淡入動畫
  c.classList.remove('page-enter');
  void c.offsetWidth; // reflow
  c.classList.add('page-enter');
  // 卡片 stagger
  setTimeout(function(){
    c.querySelectorAll('.card,.task-card,.ann-card,.baby-card,.meeting-item,.person-card,.stat-card').forEach(function(el){
      el.classList.add('stagger-item');
    });
  },10);
}
function renderEmptyMain(){
  document.getElementById('pageContainer').innerHTML=`<div style="display:flex;align-items:center;justify-content:center;flex:1;flex-direction:column;gap:12px;color:var(--faint);padding:40px">
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="7" y="9" width="30" height="27" rx="3"/><path d="M15 9V6M29 9V6M7 18h30"/><path d="M14 25h7M14 31h5"/></svg>
    <p style="font-size:13px">選擇左側會議，或點擊「＋新增會議」</p>
  </div>`;
}

// ══════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════
function filterMeetings(q){renderSidebar(q);}
function renderSidebar(q) {
  if (q === undefined) q = '';
  var el = document.getElementById('meetingList');
  el.innerHTML = '';
  var sub = document.getElementById('sidebarSub');
  if (sub) sub.textContent = currentUser ? currentUser.name + ' · ' + store.meetings.length + '場' : ' ';

  // 我的任務入口
  var myPending = [];
  (store.meetings || []).forEach(function(m) {
    (m.tasks || []).forEach(function(t) {
      if (t.assigneeId === currentUser.id && t.status !== '已完成') myPending.push(t);
    });
  });
  var isMyTasks = currentMeetingId === '__mytasks__';
  var myBtn = document.createElement('div');
  myBtn.className = 'meeting-item my-tasks-entry' + (isMyTasks ? ' active' : '');
  myBtn.innerHTML = '<div class="mi-title">📋 我的任務</div>'
    + '<div class="mi-meta">'
    + (myPending.length
      ? '<span class="mi-badge badge-open">' + myPending.length + ' 項待辦</span>'
      : '<span class="mi-badge badge-done">✓ 全部完成</span>')
    + '</div>';
  myBtn.onclick = function() { showMyTasks(); };
  el.appendChild(myBtn);

  var sep = document.createElement('div');
  sep.style.cssText = 'height:1px;background:var(--b1);margin:6px 8px';
  el.appendChild(sep);

  var list = [...store.meetings].sort(function(a, b) { return b.date.localeCompare(a.date); })
    .filter(function(m) { return !q || m.title.toLowerCase().includes(q.toLowerCase()); });
  list.forEach(function(m) {
    var open = m.tasks.filter(function(t) { return t.status !== '已完成'; }).length;
    var hasCritical = m.tasks.some(function(t) { return t.priority === 'critical' && t.status !== '已完成'; });
    var isRead = m.reads && m.reads[currentUser.id] && m.reads[currentUser.id].read;
    var div = document.createElement('div');
    div.className = 'meeting-item' + (m.id === currentMeetingId ? ' active' : '');
    div.innerHTML = '<div class="mi-title">' + esc(m.title) + '</div>'
      + '<div class="mi-meta">' + fmtDate(m.date)
      + (!isRead ? '<span class="mi-badge badge-unread">未讀</span>' : '')
      + (hasCritical ? '<span class="mi-badge badge-urgent">緊急</span>' : '')
      + '</div>'
      + '<span class="mi-badge ' + (open === 0 ? 'badge-done' : 'badge-open') + '">'
      + (open === 0 ? '✓ 完成' : open + ' 待辦') + '</span>';
    div.onclick = function() { selectMeeting(m.id); };
    el.appendChild(div);
  });
  if (!list.length) {
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:20px;font-size:12px;color:var(--faint)';
    empty.textContent = '無符合結果';
    el.appendChild(empty);
  }
}

// ── 我的任務（跨會議）──
function showMyTasks() {
  currentMeetingId = '__mytasks__';
  renderSidebar();
  renderMyTasksMain();
}

function renderMyTasksMain() {
  var pc = document.getElementById('pageContainer');
  pc.style.cssText = '';
  pc.classList.remove('page-enter'); void pc.offsetWidth; pc.classList.add('page-enter');

  var allTasks = [];
  (store.meetings || []).forEach(function(m) {
    (m.tasks || []).forEach(function(t) {
      if (t.assigneeId === currentUser.id) allTasks.push({t: t, m: m});
    });
  });

  var todayStr = today();
  var overdue  = allTasks.filter(function(x) { return x.t.status !== '已完成' && x.t.due && x.t.due < todayStr; });
  var dueToday = allTasks.filter(function(x) { return x.t.status !== '已完成' && x.t.due === todayStr; });
  var pending  = allTasks.filter(function(x) { return x.t.status !== '已完成' && (!x.t.due || x.t.due > todayStr); });
  var done     = allTasks.filter(function(x) { return x.t.status === '已完成'; });

  function taskRow(x) {
    var t = x.t; var m = x.m;
    var origI = m.tasks.indexOf(t);
    var dc = dueClass(t.due, t.status);
    return '<div class="task-card">'
      + '<div class="status-dot ' + (t.status === '已完成' ? 'done' : t.status === '進行中' ? 'in-progress' : '') + '" onclick="cycleTaskGlobal(\'' + m.id + '\',' + origI + ')" title="點擊切換">'
      + (t.status === '已完成' ? '✓' : t.status === '進行中' ? '◑' : '') + '</div>'
      + '<div class="task-body">'
      + '<div class="task-text ' + (t.status === '已完成' ? 'done-text' : '') + '">' + esc(t.text) + '</div>'
      + '<div class="task-meta">'
      + '<span style="font-size:11px;color:var(--primary);font-weight:500">' + esc(m.title) + '</span>'
      + prioBadge(t.priority)
      + (t.due ? '<span class="due-tag ' + dc + '">' + fmtDate(t.due) + '</span>' : '')
      + '</div></div></div>';
  }

  function section(label, items, emptyMsg) {
    if (!items.length && !emptyMsg) return '';
    return '<div class="sec-label">' + label + '</div>'
      + (items.length ? items.map(taskRow).join('') : '<div style="font-size:12px;color:var(--faint);padding:8px 4px">' + emptyMsg + '</div>');
  }

  pc.innerHTML = '<div class="main-header"><div><h1>我的任務</h1>'
    + '<div class="main-header-meta">跨所有會議 · 共 ' + allTasks.length + ' 項</div></div></div>'
    + '<div class="stats-bar">'
    + '<div class="stat-item"><div class="stat-num">' + allTasks.length + '</div><div class="stat-label">全部</div></div>'
    + '<div class="stat-item"><div class="stat-num" style="color:var(--red)">' + overdue.length + '</div><div class="stat-label">逾期</div></div>'
    + '<div class="stat-item"><div class="stat-num" style="color:var(--amber)">' + dueToday.length + '</div><div class="stat-label">今天到期</div></div>'
    + '<div class="stat-item"><div class="stat-num" style="color:var(--green)">' + done.length + '</div><div class="stat-label">已完成</div></div>'
    + '</div>'
    + (overdue.length ? section('⚠️ 逾期（' + overdue.length + '）', overdue, '') : '')
    + (dueToday.length ? section('🔔 今天到期', dueToday, '') : '')
    + section('📋 待辦', pending, '沒有待辦任務')
    + (done.length ? section('✓ 已完成', done, '') : '');
}

function cycleTaskGlobal(meetingId, origI) {
  var m = store.meetings.find(function(x) { return x.id === meetingId; });
  if (!m) return;
  var s = m.tasks[origI].status;
  m.tasks[origI].status = s === '待辦' ? '進行中' : s === '進行中' ? '已完成' : '待辦';
  saveStore();
  if (currentMeetingId === '__mytasks__') { renderSidebar(); renderMyTasksMain(); }
  else { renderSidebar(); renderMeetingMain(); }
}

// ── 紀錄摘要（含行內編輯）──
function selectMeeting(id){
  currentMeetingId=id;currentTab='notes';
  const m=store.meetings.find(x=>x.id===id);
  if(m&&m.reads&&m.reads[currentUser.id])m.reads[currentUser.id]={read:true,time:nowTime()};
  saveStore();renderSidebar();renderMeetingMain();
}

// ══════════════════════════════════════════
// MEETING MAIN
// ══════════════════════════════════════════
// 會議記錄 → modules/meetings.js

// 表單簽核 → modules/forms.js

function showToast(title,body,icon){
  icon=icon||'💬';
  const wrap=document.getElementById('toastContainer');if(!wrap)return;
  const t=document.createElement('div');
  t.className='toast';
  t.innerHTML='<div class="toast-icon">'+icon+'</div><div class="toast-body"><div class="toast-title">'+esc(title)+'</div>'+(body?'<div>'+esc(body)+'</div>':'')+'</div>';
  wrap.appendChild(t);
  t.addEventListener('click',function(){removeToast(t);});
  setTimeout(function(){removeToast(t);},5000);
}
function removeToast(t){
  t.classList.add('toast-out');
  setTimeout(function(){t.remove();},300);
}

// ══════════════════════════════════════════
// 行事曆 today badge
// ══════════════════════════════════════════
function updateCalBadge(){
  const td=today();
  const events=(store.calEvents||[]).filter(e=>e.date===td);
  const b=document.getElementById('badge_cal');
  if(!b)return;
  if(events.length){b.textContent=events.length;b.style.display='flex';}
  else b.style.display='none';
}

// ══════════════════════════════════════════
// 值班倒數
// ══════════════════════════════════════════
function updateShiftCountdown(){
  if(!currentUser)return;
  const el=document.getElementById('shiftCountdown');if(!el)return;
  const schedule=store.dutySchedule&&store.dutySchedule[currentUser.id]||{};
  const now=new Date();
  const todayStr=today();
  const shift=schedule[todayStr];
  if(!shift||shift==='off'){el.textContent='';el.style.display='none';return;}
  // 班別結束時間對應
  const endMap={'日班':17,'小夜':23,'大夜':7};
  let endH=endMap[shift];
  if(!endH){el.style.display='none';return;}
  let endDate=new Date(now);
  endDate.setHours(endH,0,0,0);
  if(endDate<=now)endDate.setDate(endDate.getDate()+1);
  const diff=Math.floor((endDate-now)/60000);
  const h=Math.floor(diff/60),m=diff%60;
  el.style.display='flex';
  el.textContent='⏱ '+shift+' 還剩 '+h+'h '+m+'m';
}

// ══════════════════════════════════════════
// 深色模式
// ══════════════════════════════════════════
(function(){
  // 頁面一載入就套用（不等登入）
  if(localStorage.getItem('sunghospital_dark')==='1'){
    document.body.classList.add('dark');
    var btn=document.getElementById('darkToggle');
    if(btn)btn.innerHTML='<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>';
  }
})();
function toggleDark(){
  var isDark=document.body.classList.toggle('dark');
  localStorage.setItem('sunghospital_dark',isDark?'1':'0');
  var btn=document.getElementById('darkToggle');
  if(!btn)return;
  if(isDark){
    btn.innerHTML='<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>';
    btn.title='切換亮色模式';
  }else{
    btn.innerHTML='<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10 2a1 1 0 011 1v1a1 1 0 01-2 0V3a1 1 0 011-1zm4.22 1.78a1 1 0 011.42 1.42l-.71.7a1 1 0 01-1.42-1.41l.71-.71zM18 9h-1a1 1 0 010-2h1a1 1 0 010 2zm-1.78 5.22a1 1 0 010 1.42l-.71.71a1 1 0 01-1.42-1.42l.71-.71a1 1 0 011.42 0zM10 15a1 1 0 011 1v1a1 1 0 01-2 0v-1a1 1 0 011-1zm-5.22-.78a1 1 0 01-1.42 1.42l-.7-.71a1 1 0 011.41-1.42l.71.71zM4 9H3a1 1 0 010-2h1a1 1 0 010 2zm1.78-5.22a1 1 0 010 1.42l-.71.71A1 1 0 013.66 4.5l.71-.71a1 1 0 011.41 0zM10 6a4 4 0 100 8 4 4 0 000-8z"/></svg>';
    btn.title='切換深色模式';
  }
}

// ══════════════════════════════════════════
// 全站搜尋
// ══════════════════════════════════════════
function openSearch(){
  const ov=document.getElementById('searchOverlay');
  if(!ov)return;
  ov.style.display='flex';
  setTimeout(()=>{const inp=document.getElementById('searchInput2');if(inp)inp.focus();},50);
  doSearch('');
}
function closeSearch(e){
  if(e&&e.target!==document.getElementById('searchOverlay'))return;
  document.getElementById('searchOverlay').style.display='none';
}
document.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();openSearch();}
  if(e.key==='Escape'){const ov=document.getElementById('searchOverlay');if(ov&&ov.style.display!=='none')ov.style.display='none';}
});
function doSearch(q){
  const res=document.getElementById('searchResults');if(!res)return;
  q=(q||'').trim().toLowerCase();
  if(!q){res.innerHTML='<div class="search-empty">輸入關鍵字開始搜尋<br><small style="font-size:11px;margin-top:4px;display:block">支援：會議、公告、寶寶、日誌、衛教</small></div>';return;}
  const hits=[];
  // 會議
  (store.meetings||[]).forEach(m=>{
    if(m.title.toLowerCase().includes(q)||(m.notes||'').toLowerCase().includes(q))
      hits.push({icon:'📋',cat:'會議',title:m.title,sub:m.date,act:()=>{selectMeeting(m.id);setPage('meetings');}});
  });
  // 公告
  (store.announcements||[]).forEach(a=>{
    if(a.title.toLowerCase().includes(q)||(a.body||'').toLowerCase().includes(q))
      hits.push({icon:'📢',cat:'公告',title:a.title,sub:a.time,act:()=>{openAnnFromMarquee(a.id);}});
  });
  // 寶寶
  (store.babies||[]).forEach(b=>{
    if((b.name||'').toLowerCase().includes(q)||(b.motherName||'').toLowerCase().includes(q))
      hits.push({icon:'🍼',cat:'新生兒',title:b.name||'(未命名)',sub:'母：'+(b.motherName||''),act:()=>{setPage('baby');}});
  });
  // 日誌
  (store.journals||[]).forEach(j=>{
    if((j.content||'').toLowerCase().includes(q))
      hits.push({icon:'📝',cat:'工作日誌',title:(j.content||'').slice(0,40)+'…',sub:j.date,act:()=>{setPage('journal');}});
  });
  // 衛教
  (store.eduItems||[]).forEach(e=>{
    if((e.title||'').toLowerCase().includes(q)||(e.desc||'').toLowerCase().includes(q))
      hits.push({icon:'📚',cat:'衛教',title:e.title,sub:e.desc||'',act:()=>{setPage('edu');}});
  });
  if(!hits.length){res.innerHTML='<div class="search-empty">找不到「'+esc(q)+'」的相關結果</div>';return;}
  // 依 cat 分組
  const groups={};hits.forEach(h=>{if(!groups[h.cat])groups[h.cat]=[];groups[h.cat].push(h);});
  let html='';
  Object.entries(groups).forEach(([cat,items])=>{
    html+=`<div class="search-group">${cat}</div>`;
    items.slice(0,5).forEach((item,i)=>{
      html+=`<div class="search-item" onclick="searchGo(${JSON.stringify(cat)},${i})">
        <div class="search-item-icon">${item.icon}</div>
        <div><div class="search-item-title">${esc(item.title)}</div><div class="search-item-sub">${esc(item.sub)}</div></div>
      </div>`;
    });
  });
  res.innerHTML=html;
  // 把 act functions 存起來
  res._hits=groups;
}
function searchGo(cat,i){
  const res=document.getElementById('searchResults');
  if(!res||!res._hits||!res._hits[cat])return;
  res._hits[cat][i].act();
  document.getElementById('searchOverlay').style.display='none';
}

// ══════════════════════════════════════════
// FAB 快捷鍵
// ══════════════════════════════════════════
function toggleFab(){
  const menu=document.getElementById('fabMenu');
  const btn=document.getElementById('fabBtn');
  if(!menu)return;
  const open=menu.style.display==='none';
  menu.style.display=open?'flex':'none';
  btn.classList.toggle('open',open);
}
function fabAct(type){
  toggleFab();
  if(type==='ann'){setPage('announcements');setTimeout(openAddAnn,80);}
  else if(type==='meeting'){setPage('meetings');setTimeout(openNewMeeting,80);}
  else if(type==='journal'){setPage('journal');setTimeout(function(){const b=document.querySelector('[onclick="openNewJ()"]');if(b)b.click();},80);}
  else if(type==='incident'){setPage('incident');setTimeout(function(){const b=document.querySelector('[onclick="openNewIR()"]');if(b)b.click();},80);}
}
document.addEventListener('click',function(e){
  const fab=document.getElementById('fab');
  if(fab&&!fab.contains(e.target)){
    const menu=document.getElementById('fabMenu');
    if(menu&&menu.style.display!=='none'){
      menu.style.display='none';
      document.getElementById('fabBtn').classList.remove('open');
    }
  }
});

// ══════════════════════════════════════════
// 通知中心
// ══════════════════════════════════════════
function openNotifPanel(){
  renderNotifPanel();
  const p=document.getElementById('notifPanel');
  const b=document.getElementById('notifBackdrop');
  if(!p)return;
  p.style.display='flex';b.style.display='block';
  requestAnimationFrame(()=>p.classList.add('open'));
}
function closeNotifPanel(){
  const p=document.getElementById('notifPanel');
  const b=document.getElementById('notifBackdrop');
  if(!p)return;
  p.classList.remove('open');
  b.style.display='none';
  setTimeout(()=>{p.style.display='none';},260);
}
function renderNotifPanel(){
  const list=document.getElementById('notifList');if(!list||!currentUser)return;
  const items=[];
  // 未讀公告
  (store.announcements||[]).forEach(a=>{
    const unread=!a.reads[currentUser.id];
    items.push({icon:'📢',title:a.title,body:a.body,time:a.time,unread,act:()=>{openAnnFromMarquee(a.id);closeNotifPanel();}});
  });
  // 未讀事件
  (store.incidents||[]).forEach(ir=>{
    const unread=!(ir.reads&&ir.reads[currentUser.id]);
    items.push({icon:'🚨',title:ir.title,body:ir.desc||'',time:ir.time||ir.date||'',unread,act:()=>{setPage('incident');closeNotifPanel();}});
  });
  // 簽核結果通知
  (store.formNotifs||[]).filter(n=>n.toUserId===currentUser.id).forEach(n=>{
    items.push({icon:n.title.startsWith('✓')?'✅':'❌',title:n.title,body:n.body||'',time:n.time||'',unread:!n.read,act:()=>{n.read=true;saveStore();setPage('form');closeNotifPanel();renderNotifPanel();}});
  });
  // 任務到期提醒
  const todayStr=today();
  (store.meetings||[]).forEach(mtg=>{
    (mtg.tasks||[]).forEach(tsk=>{
      if(tsk.assigneeId!==currentUser.id||tsk.status==='已完成'||!tsk.due)return;
      const isOverdue=tsk.due<todayStr,isDueToday=tsk.due===todayStr;
      if(isOverdue||isDueToday){
        const mtgId=mtg.id;
        items.push({icon:isOverdue?'⚠️':'🔔',title:isOverdue?'任務已逾期':'任務今天到期',body:tsk.text+'（'+esc(mtg.title)+'）',time:tsk.due,unread:true,act:()=>{selectMeeting(mtgId);currentTab='tasks';closeNotifPanel();renderMeetingMain();}});
      }
    });
  });
  // 依時間排序，未讀優先
  items.sort((a,b)=>(b.unread-a.unread)||b.time.localeCompare(a.time));
  updateNotifBadge(items.filter(x=>x.unread).length);
  if(!items.length){list.innerHTML='<div class="notif-empty">目前沒有通知</div>';return;}
  list.innerHTML=items.map((it,i)=>`
    <div class="notif-item${it.unread?' notif-unread':''}" onclick="notifGo(${i})">
      <div class="notif-item-head">
        <span class="notif-item-icon">${it.icon}</span>
        <span class="notif-item-title">${esc(it.title)}</span>
        <span class="notif-item-time">${(it.time||'').slice(0,10)}</span>
      </div>
      <div class="notif-item-body">${esc((it.body||'').slice(0,60))}${(it.body||'').length>60?'…':''}</div>
    </div>`).join('');
  list._acts=items.map(x=>x.act);
}
function notifGo(i){
  const list=document.getElementById('notifList');
  if(list&&list._acts&&list._acts[i])list._acts[i]();
}
function updateNotifBadge(n){
  const b=document.getElementById('notifBadge');if(!b)return;
  if(n>0){b.textContent=n>9?'9+':n;b.style.display='flex';}
  else b.style.display='none';
}

// ══════════════════════════════════════════
// RWD 側欄漢堡選單
// ══════════════════════════════════════════
function toggleMobileSidebar(){
  const sb=document.getElementById('sidebar');if(!sb)return;
  sb.classList.toggle('mobile-open');
}


// ════════════════════════════════════════════════════════
// ① 離線提示
// ════════════════════════════════════════════════════════
(function(){
  function setBanner(offline){
    var b=document.getElementById('offlineBanner');
    if(b)b.style.display=offline?'block':'none';
  }
  window.addEventListener('online',function(){setBanner(false);showToast('已重新連線','資料同步中…','✅');});
  window.addEventListener('offline',function(){setBanner(true);showToast('網路已中斷','資料暫時無法更新','⚠️');});
  var _chk=setInterval(function(){
    if(typeof fbDb!=='undefined'&&fbDb){
      clearInterval(_chk);
      fbDb.ref('.info/connected').on('value',function(s){setBanner(!s.val());});
    }
  },500);
})();

// ════════════════════════════════════════════════════════
// ② 鍵盤快捷鍵
// ════════════════════════════════════════════════════════
(function(){
  var pageKeys={'1':'home','2':'meetings','3':'shift','4':'announcements',
    '5':'incident','6':'calendar','7':'baby','8':'delivery','9':'duty'};
  document.addEventListener('keydown',function(e){
    if(!currentUser)return;
    var tag=(e.target.tagName||'').toUpperCase();
    if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.key==='?'){openShortcuts();return;}
    if(e.key==='Escape'){closeShortcuts();return;}
    if(e.key==='d'||e.key==='D'){toggleDark();return;}
    if(e.key==='h'||e.key==='H'){setPage('home');return;}
    if(e.key==='n'||e.key==='N'){triggerNewAction();return;}
    if(pageKeys[e.key]){setPage(pageKeys[e.key]);return;}
  });
})();
function openShortcuts(){
  var p=document.getElementById('shortcutsPanel');
  var b=document.getElementById('shortcutsBackdrop');
  if(p){p.style.display='flex';if(b)b.style.display='block';}
}
function closeShortcuts(){
  var p=document.getElementById('shortcutsPanel');
  var b=document.getElementById('shortcutsBackdrop');
  if(p){p.style.display='none';if(b)b.style.display='none';}
}
function triggerNewAction(){
  if(currentPage==='meetings')openNewMeeting();
  else if(currentPage==='announcements')openAddAnn();
  else{var menu=document.getElementById('fabMenu');if(menu&&menu.style.display==='none')toggleFab();}
}

// ════════════════════════════════════════════════════════
// ③ 空狀態設計
// ════════════════════════════════════════════════════════
function emptyState(icon,title,desc,btnLabel,btnFn){
  var btn=btnLabel?('<button class="empty-state-btn" onclick="'+btnFn+'">'+btnLabel+'</button>'):'';
  return '<div class="empty-state stagger-item"><div class="empty-state-icon">'+icon+'</div><div class="empty-state-title">'+title+'</div><div class="empty-state-desc">'+desc+'</div>'+btn+'</div>';
}

// ════════════════════════════════════════════════════════
// ④ 個人化首頁
// ════════════════════════════════════════════════════════
function renderHomePage(c){
  if(!currentUser){c.innerHTML='';return;}
  var hr=new Date().getHours();
  var greet='繼續加油 💪';
  if(hr>=6&&hr<12)greet='早安 ☀️';
  else if(hr>=12&&hr<18)greet='午安 🌤️';
  else if(hr>=18&&hr<22)greet='晚安 🌙';
  else greet='夜深了，注意休息 🌛';
  var todayStr=today();
  var unreadAnn=(store.announcements||[]).filter(function(a){return !a.reads[currentUser.id];}).length;
  var allTasks=(store.meetings||[]).flatMap(function(m){return m.tasks||[];});
  var myTasks=allTasks.filter(function(t){return t.assigneeId===currentUser.id&&t.status!=='已完成';}).length;
  var newBabies=(store.babies||[]).filter(function(b){return b.born&&b.born.startsWith(todayStr);}).length;
  var deliveries=(store.rooms||[]).filter(function(r){return r.status&&r.status!=='空床';}).length;
  var myShift=(store.dutySchedule&&store.dutySchedule[currentUser.id]&&store.dutySchedule[currentUser.id][todayStr])||'';
  var shiftInfo=SHINFO[myShift];
  var pendForms=(store.formRequests||[]).filter(function(f){return f.status==='pending'&&isApp(f);});

  // Stat cards
  var cards=[
    {icon:'📢',num:unreadAnn,label:'未讀公告',page:'announcements',color:'#c4527a'},
    {icon:'✅',num:myTasks,label:'我的待辦',page:'meetings',color:'var(--amber)'},
    {icon:'🍼',num:newBabies,label:'今日新生兒',page:'baby',color:'var(--teal)'},
    {icon:'🛏️',num:deliveries,label:'使用中床位',page:'delivery',color:'var(--blue)'},
    {icon:'📝',num:pendForms.length,label:'待我簽核',page:'forms',color:'var(--red)'},
  ];
  var cardsHtml=cards.map(function(card,i){
    return '<div class="home-card stagger-item" style="animation-delay:'+(i*0.07)+'s" onclick="setPage(\''+card.page+'\')">'
      +'<div class="home-card-icon">'+card.icon+'</div>'
      +'<div class="home-card-num" style="color:'+card.color+'">'+card.num+'</div>'
      +'<div class="home-card-label">'+card.label+'</div>'
      +'<div class="home-card-action">點擊查看 →</div></div>';
  }).join('');

  // Quick actions
  var quickDefs=[
    {icon:'📋',label:'新增會議',fn:"setPage('meetings');setTimeout(openNewMeeting,80)"},
    {icon:'📋',label:'申請表單',fn:"setPage('forms');setTimeout(openNewFrm,80)"},
    {icon:'📝',label:'今日日誌',fn:"setPage('journal');setTimeout(openNewJ,80)"},
    {icon:'⌨️',label:'快捷鍵',fn:'openShortcuts()'},
  ];
  var quickHtml=quickDefs.map(function(b){
    return '<button class="home-quick-btn" onclick="'+b.fn+'"><span>'+b.icon+'</span>'+b.label+'</button>';
  }).join('');
  if(hasPerm('publishAnn')){quickHtml+='<button class="home-quick-btn" onclick="setPage(\'announcements\');setTimeout(openAddAnn,80)"><span>📢</span>發布公告</button>';}

  // Week duty strip
  var wk=getWk();
  var weekHtml=wk.map(function(d,i){
    var sh=(store.dutySchedule&&store.dutySchedule[currentUser.id]&&store.dutySchedule[currentUser.id][d])||'off';
    var si=SHINFO[sh]||SHINFO.off;
    var isToday=d===todayStr;
    var shClr={morning:'#f59e0b',afternoon:'#3b82f6',night:'#6366f1',off:'var(--faint)'};
    return '<div class="home-week-cell'+(isToday?' today-cell':'')+'">'
      +'<div style="font-size:10px;color:var(--faint)">'+['一','二','三','四','五','六','日'][i]+'</div>'
      +'<div style="font-size:10px;color:var(--muted)">'+d.slice(5)+'</div>'
      +'<div style="font-size:11px;font-weight:700;color:'+(sh==='off'?'var(--faint)':shClr[sh]||'var(--primary)')+';margin-top:3px">'+si.l+'</div>'
      +'</div>';
  }).join('');

  // My urgent tasks (top 3)
  var urgentTasks=allTasks.filter(function(t){return t.assigneeId===currentUser.id&&t.status!=='已完成';})
    .sort(function(a,b){
      var po={critical:0,urgent:1,normal:2};
      return (po[a.priority]||2)-(po[b.priority]||2)||(a.due||'').localeCompare(b.due||'');
    }).slice(0,3);
  var tasksHtml=urgentTasks.map(function(t){
    var overdue=t.due&&t.due<todayStr;
    var dueToday=t.due===todayStr;
    var dueLabel=t.due?('<span style="font-size:10px;color:'+(overdue?'var(--red)':dueToday?'var(--amber)':'var(--faint)')+'">'+( overdue?'已逾期 ':'截止 ')+fmtDate(t.due)+'</span>'):'';
    var priDot=t.priority==='critical'?'🔴':t.priority==='urgent'?'🟡':'⚪';
    return '<div class="home-task-row">'+priDot+' <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(t.text)+'</div>'+dueLabel+'</div></div>';
  }).join('');
  var tasksSection=urgentTasks.length
    ?'<div class="home-section" style="display:flex;align-items:center;justify-content:space-between"><span>我的待辦任務</span><span style="font-size:11px;font-weight:400;color:var(--primary);cursor:pointer" onclick="showMyTasks()">全部 ›</span></div>'
      +'<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">'+(tasksHtml||'')+'</div>'
    :'';

  // Journal streak + my recent forms (two columns)
  var streak=calcJournalStreak(currentUser.id);
  var streakHtml='<div class="home-streak">'+(streak>0?'🔥 連續記錄 '+streak+' 天':'📝 今天記錄日誌吧')+'</div>';
  var myForms=(store.formRequests||[]).filter(function(f){return f.applicantId===currentUser.id;}).slice(0,3);
  var formsHtml=myForms.map(function(f){
    var stCls={approved:'fst-a',rejected:'fst-r',withdrawn:'fst-w',pending:'fst-p'}[f.status]||'fst-p';
    var stTxt={approved:'✓ 核准',rejected:'✗ 駁回',withdrawn:'↩ 撤回',pending:'⏳ 待審'}[f.status]||'待審';
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--b1)">'
      +'<div style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(f.title)+'</div>'
      +'<span class="'+stCls+'" style="font-size:10px;flex-shrink:0">'+stTxt+'</span>'
      +'</div>';
  }).join('');
  var sideSection='<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">'
    +'<div><div class="sec-label" style="margin-bottom:6px">日誌紀錄</div>'+streakHtml
      +'<button class="home-quick-btn" style="margin-top:8px;width:100%;justify-content:center" onclick="setPage(\'journal\')">查看日誌</button></div>'
    +'<div><div class="sec-label" style="margin-bottom:6px">我的申請</div>'
      +(formsHtml||'<div style="font-size:12px;color:var(--faint)">尚無申請紀錄</div>')
      +'<button class="home-quick-btn" style="margin-top:8px;width:100%;justify-content:center" onclick="setPage(\'forms\')">查看全部</button></div>'
    +'</div>';

  // Pending forms (sign panel)
  var pendHtml='';
  if(pendForms.length){
    var prows=pendForms.map(function(f){
      var ft=FTYPES[f.type]||FTYPES.other;
      return '<div class="home-pend-row">'
        +'<span class="ftype '+ft.c+'" style="flex-shrink:0">'+ft.l+'</span>'
        +'<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer" onclick="setPage(\'forms\')" title="'+esc(f.title)+'">'+esc(f.title)+'</div>'
        +'<div style="font-size:11px;color:var(--faint)">'+esc(userName(f.applicantId))+' · '+fmtDate(f.createdAt)+'</div></div>'
        +'<div style="display:flex;gap:5px;flex-shrink:0">'
        +'<button class="btn-sm primary" style="font-size:11px;padding:3px 9px" onclick="appF(\''+f.id+'\')">核准</button>'
        +'<button class="btn-sm danger" style="font-size:11px;padding:3px 9px" onclick="rejF(\''+f.id+'\')">駁回</button>'
        +'</div></div>';
    }).join('');
    pendHtml='<div class="home-section" style="display:flex;align-items:center;justify-content:space-between">'
      +'<span>待我簽核</span><span style="font-size:11px;font-weight:400;color:var(--primary);cursor:pointer" onclick="setPage(\'forms\')">全部 ›</span></div>'
      +'<div class="home-pend-list">'+prows+'</div>';
  }

  // Admin summary bar
  var adminBarHtml='';
  if(isAdmin()){
    var pendAll=(store.formRequests||[]).filter(function(f){return f.status==='pending';}).length;
    var unreadNotifs=(store.formNotifs||[]).filter(function(n){return!n.read;}).length;
    var activeRooms=(store.rooms||[]).filter(function(r){return r.status==='active';}).length;
    adminBarHtml='<div class="home-admin-bar">'
      +'<span>🏥 生產中 <strong>'+activeRooms+'</strong> 間</span>'
      +'<span>📋 待審表單 <strong>'+pendAll+'</strong></span>'
      +'<span>🔔 未讀通知 <strong>'+unreadNotifs+'</strong></span>'
      +'<span onclick="setPage(\'users\')" style="cursor:pointer;color:var(--primary)">⚙️ 系統管理 ›</span>'
      +'</div>';
  }

  c.innerHTML='<div class="home-wrap">'
    +adminBarHtml
    +'<div class="home-greeting">'+avatarEl(currentUser.id,42)+' 嗨，'+esc(currentUser.name)+' '+greet+'</div>'
    +'<div class="home-sub">今天是 '+todayStr
    +(shiftInfo?'<span class="home-duty-badge" style="background:var(--s2);margin-left:10px">'+shiftInfo.l+'</span>':'<span class="home-duty-badge" style="background:var(--s2);color:var(--faint);margin-left:10px">未排班</span>')
    +'</div>'
    +'<div class="home-section">今日概覽</div>'
    +'<div class="home-grid">'+cardsHtml+'</div>'
    +'<div class="home-section">本週班表</div>'
    +'<div class="home-week-strip">'+weekHtml+'</div>'
    +'<div class="home-section">快速操作</div>'
    +'<div class="home-quick">'+quickHtml+'</div>'
    +tasksSection
    +sideSection
    +pendHtml
    +'<div id="chartsSection"></div>'
    +'</div>';
  setTimeout(function(){animateNumbers(c);renderCharts(c);},60);
}

// ════════════════════════════════════════════════════════
// ⑤ SVG 圖表
// ════════════════════════════════════════════════════════
function svgLineChart(data,color,h){
  h=h||120;var w=400;
  if(!data||data.length<2)return '<div style="color:var(--faint);font-size:12px;padding:20px;text-align:center">資料不足</div>';
  var max=Math.max.apply(null,data.map(function(d){return d.v;}))||1;
  var pts=data.map(function(d,i){
    var x=Math.round(i/(data.length-1)*(w-40))+20;
    var y=Math.round(h-12-(d.v/max*(h-24)));
    return {x:x,y:y,v:d.v,l:d.l};
  });
  var path=pts.map(function(p,i){return(i?'L':'M')+p.x+' '+p.y;}).join(' ');
  var area=path+' L'+pts[pts.length-1].x+' '+(h-12)+' L'+pts[0].x+' '+(h-12)+' Z';
  var gid='lg'+Math.random().toString(36).slice(2,6);
  var dots=pts.map(function(p){
    return '<circle class="chart-dot" cx="'+p.x+'" cy="'+p.y+'" r="4" fill="'+color+'" stroke="var(--surface)" stroke-width="2"><title>'+p.l+': '+p.v+'</title></circle>';
  }).join('');
  var labels=pts.filter(function(_,i){return i%Math.ceil(pts.length/6)===0||i===pts.length-1;}).map(function(p){
    return '<text class="chart-label" x="'+p.x+'" y="'+h+'" text-anchor="middle">'+p.l+'</text>';
  }).join('');
  return '<svg class="chart-svg" viewBox="0 0 '+w+' '+h+'" style="height:'+h+'px">'
    +'<defs><linearGradient id="'+gid+'" x1="0" y1="0" x2="0" y2="1">'
    +'<stop offset="0%" stop-color="'+color+'" stop-opacity=".25"/>'
    +'<stop offset="100%" stop-color="'+color+'" stop-opacity="0"/>'
    +'</linearGradient></defs>'
    +'<path d="'+area+'" fill="url(#'+gid+')" />'
    +'<path class="chart-line" d="'+path+'" stroke="'+color+'" />'
    +dots+labels+'</svg>';
}
function svgBarChart(data,color,h){
  h=h||140;var w=400;
  if(!data||!data.length)return '<div style="color:var(--faint);font-size:12px;padding:20px;text-align:center">暫無資料</div>';
  var max=Math.max.apply(null,data.map(function(d){return d.v;}))||1;
  var gap=(w-40)/data.length;
  var bw=Math.max(8,Math.floor(gap*0.6));
  // gridlines
  var gridLines=[0.25,0.5,0.75,1].map(function(f){
    var y=Math.round(h-18-f*(h-32));
    return '<line x1="10" y1="'+y+'" x2="'+(w-10)+'" y2="'+y+'" stroke="var(--b1)" stroke-width="1"/>';
  }).join('');
  var bars=data.map(function(d,i){
    var bh=Math.round(d.v/max*(h-32));if(bh<2)bh=2;
    var x=Math.round(i*gap+20+(gap-bw)/2);
    var y=h-18-bh;
    var lbl=d.l.length>5?d.l.slice(0,5)+'…':d.l;
    return '<rect class="chart-bar" x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="3" fill="'+color+'" opacity=".85">'
      +'<title>'+d.l+': '+d.v+'</title></rect>'
      +'<text class="chart-label" x="'+(x+bw/2)+'" y="'+(h-2)+'" text-anchor="middle">'+lbl+'</text>'
      +(d.v>0?'<text class="chart-label" x="'+(x+bw/2)+'" y="'+(y-4)+'" text-anchor="middle" style="font-weight:700;fill:var(--text)">'+d.v+'</text>':'');
  }).join('');
  return '<svg class="chart-svg" viewBox="0 0 '+w+' '+h+'" style="height:'+h+'px">'+gridLines+bars+'</svg>';
}
function renderCharts(c){
  var wrap=document.getElementById('chartsSection');if(!wrap)return;
  var days=[];
  for(var i=6;i>=0;i--){var d=new Date();d.setDate(d.getDate()-i);days.push(d.toISOString().split('T')[0]);}
  var babyData=days.map(function(d){
    return{l:d.slice(5),v:(store.babies||[]).filter(function(b){return b.admDate===d;}).length};
  });
  var taskData=store.users.slice(0,8).map(function(u){
    var n=(store.meetings||[]).flatMap(function(m){return m.tasks||[];})
      .filter(function(t){return t.assigneeId===u.id&&t.status!=='已完成';}).length;
    return{l:u.name.slice(0,3),v:n};
  }).filter(function(d){return d.v>0;});
  wrap.innerHTML='<div class="home-section" style="margin-top:28px">趨勢圖表</div>'
    +'<div class="chart-wrap stagger-item"><div class="chart-title">📈 近 7 天新生兒入院趨勢</div>'+svgLineChart(babyData,'#c4527a')+'</div>'
    +'<div class="chart-wrap stagger-item" style="animation-delay:.08s"><div class="chart-title">📊 人員待辦任務分布</div>'
    +(taskData.length?svgBarChart(taskData,'#5b9cf6'):emptyState('🎉','全部完成！','目前所有人員的任務都已完成','',''))+'</div>';
}

// ════════════════════════════════════════════════════════
// ⑥ 列印 / 匯出
// ════════════════════════════════════════════════════════
function printPage(){window.print();}
function exportMeetingText(){
  var m=store.meetings.find(function(x){return x.id===currentMeetingId;});
  if(!m){showToast('請先選擇一場會議','','ℹ️');return;}
  var lines=['=== '+m.title+' ===','日期：'+m.date,'','【議程/備忘】',m.notes||'（無）','','【任務清單】'];
  (m.tasks||[]).forEach(function(t){lines.push('・'+t.text+' ／ '+userName(t.assigneeId)+' ／ '+t.status);});
  lines.push('','【出席人員】');
  (m.attendeeIds||[]).forEach(function(id){lines.push('・'+userName(id));});
  var blob=new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=m.title+'_'+m.date+'.txt';a.click();
  showToast('已匯出',m.title,'📄');
}

// ════════════════════════════════════════════════════════
// 資料備份 / 還原
// ════════════════════════════════════════════════════════

// ── 下載備份 ──
function backupData(){
  var snapshot = JSON.parse(JSON.stringify(store)); // deep copy
  snapshot._backupAt = new Date().toISOString();
  snapshot._backupBy = currentUser ? currentUser.name : 'unknown';
  var json = JSON.stringify(snapshot, null, 2);
  var blob = new Blob([json], {type: 'application/json;charset=utf-8'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'sunghospital_backup_' + today() + '.json';
  a.click();
  // 記錄這次備份到 Firebase 獨立路徑（不寫入 store）
  if(fbDb){
    fbDb.ref('backupLog').push({
      at: new Date().toISOString(),
      by: currentUser ? currentUser.name : 'unknown',
      size: Math.round(json.length / 1024) + ' KB'
    }).then(function(){
      showToast('備份完成', '已下載到本機', '📥');
      renderBackupLog();
    });
  } else {
    showToast('備份完成', '已下載到本機（離線模式）', '📥');
  }
}

// ── 還原備份 ──
function restoreData(){
  if(!confirm('⚠️ 還原備份將會覆蓋目前所有資料，確定繼續？\n\n建議先下載一份最新備份再還原。')){return;}
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = function(e){
    var file = e.target.files[0];
    if(!file){return;}
    var reader = new FileReader();
    reader.onload = function(ev){
      try{
        var data = JSON.parse(ev.target.result);
        if(!data || !data.users || !Array.isArray(data.users)){
          alert('❌ 類型不符，請確認是備份檔案');
          return;
        }
        var backupDate = (data._backupAt || '').slice(0,16).replace('T',' ');
        var backupBy = data._backupBy || 'unknown';
        var msg = '確認還原此備份？\n\n備份時間：' + backupDate + '\n備份者：' + backupBy + '\n人員數：' + data.users.length + ' 人\n\n還原後頁面將自動重新整理。';
        if(!confirm(msg)){return;}
        delete data._backupAt;
        delete data._backupBy;
        store = normalizeStore(data);
        if(fbDb){
          fbDb.ref('store').set(store).then(function(){
            fbDb.ref('backupLog').push({
              at: new Date().toISOString(),
              by: currentUser ? currentUser.name : 'unknown',
              action: '還原備份（' + backupDate + '）',
              size: '-'
            });
            try{localStorage.setItem(STORE_KEY, JSON.stringify(store));}catch(ex){}
            showToast('還原成功', '3 秒後重新整理頁面', '✅');
            setTimeout(function(){location.reload();}, 3000);
          }).catch(function(){
            alert('❌ 寫入 Firebase 失敗，請確認網路連線。');
          });
        } else {
          try{localStorage.setItem(STORE_KEY, JSON.stringify(store));}catch(ex){}
          showToast('還原成功（離線）', '請重新整理頁面', '✅');
        }
      } catch(err){
        alert('❌ 無法解析備份檔：' + err.message);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };
  input.click();
}

function renderBackupLog(){
  var wrap = document.getElementById('backupLog');
  if(!wrap || !fbDb){return;}
  fbDb.ref('backupLog').orderByKey().limitToLast(10).once('value').then(function(snap){
    var logs = [];
    snap.forEach(function(child){logs.push(child.val());});
    logs.reverse();
    if(!logs.length){
      wrap.innerHTML = '<div style="font-size:12px;color:var(--faint);padding:8px 0">尚無備份紀錄</div>';
      return;
    }
    var rows = logs.map(function(l){
      return '<tr><td style="font-size:12px">' + (l.at||'').slice(0,16).replace('T',' ')
        + '</td><td style="font-size:12px">' + esc(l.by||'')
        + '</td><td style="font-size:12px">' + esc(l.action||'下載備份')
        + '</td><td style="font-size:12px;color:var(--faint)">' + (l.size||'-') + '</td></tr>';
    }).join('');
    wrap.innerHTML = '<div style="font-size:11px;font-weight:800;color:#c4527a;text-transform:uppercase;letter-spacing:.1em;margin:20px 0 10px">備份紀錄（最近 10 筆）</div>'
      + '<div class="table-wrap"><table><thead><tr><th>時間</th><th>操作者</th><th>動作</th><th>大小</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  });
}


// ══════════════════════════════════════════
// AUDIT LOG 稽核日誌
// ══════════════════════════════════════════
function logAudit(action, detail){
  if(!fbDb) return;
  fbDb.ref('auditLog').push({
    at: new Date().toISOString(),
    by: currentUser ? currentUser.name : 'unknown',
    userId: currentUser ? currentUser.id : '',
    action: action,
    detail: detail || ''
  });
}

function renderAuditLog(wrap){
  if(!wrap) wrap=document.getElementById('auditLog');
  if(!wrap||!fbDb){if(wrap)wrap.innerHTML='<div style="color:var(--faint);font-size:13px;padding:20px">Firebase 未連線</div>';return;}
  wrap.innerHTML='<div style="color:var(--faint);font-size:12px;padding:16px">載入中...</div>';
  var auditQ=wrap._auditQ||'';var auditAct=wrap._auditAct||'';
  fbDb.ref('auditLog').orderByKey().limitToLast(200).once('value').then(function(snap){
    var logs=[];
    snap.forEach(function(child){logs.push(child.val());});
    logs.reverse();
    if(auditQ){var q=auditQ.toLowerCase();logs=logs.filter(function(l){return(l.by||'').toLowerCase().includes(q)||(l.detail||'').toLowerCase().includes(q)||(l.action||'').toLowerCase().includes(q);});}
    if(auditAct)logs=logs.filter(function(l){return(l.action||'').includes(auditAct);});
    var ACTION_COLOR={'新增':'#2196F3','編輯':'#FF9800','刪除':'#F44336','發布':'#4CAF50','審核':'#9C27B0','備份':'#607D8B','還原':'#E91E63','狀態':'#00BCD4','拒絕':'#f44336','撤回':'#9E9E9E','出院':'#2e7d5a'};
    function getColor(action){for(var k in ACTION_COLOR){if((action||'').indexOf(k)>-1)return ACTION_COLOR[k];}return'var(--muted)';}
    var filterBar='<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">'
      +'<input placeholder="🔍 搜尋操作者/說明" oninput="var w=this.closest(\'[data-audit]\');if(w){w.querySelector(\'[data-audit-content]\')._wrap._auditQ=this.value;renderAuditLog(w.querySelector(\'[data-audit-content]\')._wrap);}" style="padding:7px 10px;border:1px solid var(--b1);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);font-size:12px;font-family:inherit;flex:1;min-width:140px">'
      +'<select onchange="var w=this.closest(\'[data-audit]\');if(w){w.querySelector(\'[data-audit-content]\')._wrap._auditAct=this.value;renderAuditLog(w.querySelector(\'[data-audit-content]\')._wrap);}" style="padding:7px 10px;border:1px solid var(--b1);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);font-size:12px;font-family:inherit"><option value="">全部動作</option><option value="新增">新增</option><option value="編輯">編輯</option><option value="刪除">刪除</option><option value="審核">審核</option><option value="發布">發布</option><option value="狀態">狀態變更</option></select>'
      +'</div>';
    if(!logs.length){wrap.innerHTML=filterBar+'<div style="text-align:center;padding:24px;color:var(--faint);font-size:13px">尚無符合的操作紀錄</div>';return;}
    var rows=logs.map(function(l){
      var color=getColor(l.action||'');
      return '<tr>'
        +'<td style="font-size:11px;white-space:nowrap;color:var(--faint)">'+(l.at||'').slice(0,16).replace('T',' ')+'</td>'
        +'<td style="font-size:12px">'+esc(l.by||'')+'</td>'
        +'<td><span style="font-size:11px;font-weight:700;padding:2px 7px;border-radius:10px;background:'+color+'22;color:'+color+'">'+esc(l.action||'')+'</span></td>'
        +'<td style="font-size:12px;color:var(--muted)">'+esc(l.detail||'')+'</td>'
        +'</tr>';
    }).join('');
    wrap.innerHTML=filterBar+'<div class="table-wrap"><table><thead><tr><th>時間</th><th>操作者</th><th>動作</th><th>說明</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  });
}
function renderAuditTab(c){
  c.innerHTML='';
  var wrap=document.createElement('div');
  wrap.style.cssText='padding:4px 0';
  wrap._auditQ='';wrap._auditAct='';
  c.appendChild(wrap);
  renderAuditLog(wrap);
}
function renderUserStats(c){
  var total=store.users.length;
  var active=store.users.filter(function(u){return(u.status||'active')==='active';}).length;
  var disabled=store.users.filter(function(u){return u.status==='disabled';}).length;
  var resigned=store.users.filter(function(u){return u.status==='resigned';}).length;
  var byDept=store.departments.map(function(d){
    var cnt=store.users.filter(function(u){return u.deptId===d.id&&(u.status||'active')==='active';}).length;
    return{name:d.name,cnt:cnt};
  });
  var byJob=[['nurse','護理師'],['doctor','醫師'],['admin','行政'],['it','IT'],['other','其他']].map(function(j){
    var cnt=store.users.filter(function(u){return u.jobType===j[0]&&(u.status||'active')==='active';}).length;
    return{label:j[1],cnt:cnt};
  }).filter(function(x){return x.cnt>0;});
  var statCards=[
    {label:'總人數',val:total,color:'var(--primary)'},
    {label:'在職',val:active,color:'#2e7d5a'},
    {label:'停用',val:disabled,color:'#888'},
    {label:'離職',val:resigned,color:'var(--red)'},
  ].map(function(s){
    return'<div style="background:var(--surface);border:1px solid var(--b1);border-radius:var(--radius);padding:16px 20px;text-align:center;min-width:80px">'
      +'<div style="font-size:28px;font-weight:800;color:'+s.color+'">'+s.val+'</div>'
      +'<div style="font-size:12px;color:var(--faint);margin-top:3px">'+s.label+'</div></div>';
  }).join('');
  var deptRows=byDept.map(function(d){
    var pct=active?Math.round(d.cnt/active*100):0;
    return'<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'
      +'<div style="font-size:13px;min-width:100px">'+esc(d.name)+'</div>'
      +'<div style="flex:1;height:8px;background:var(--b1);border-radius:4px"><div style="width:'+pct+'%;height:8px;background:var(--primary);border-radius:4px;transition:width .4s"></div></div>'
      +'<div style="font-size:12px;color:var(--faint);min-width:30px;text-align:right">'+d.cnt+'</div></div>';
  }).join('');
  var jobChips=byJob.map(function(j){
    return'<span style="padding:4px 12px;border-radius:99px;background:var(--s2);font-size:12px;border:1px solid var(--b1)">'+j.label+' '+j.cnt+'</span>';
  }).join('');
  c.innerHTML='<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">'+statCards+'</div>'
    +'<div class="sec-label">各科別在職人數</div><div style="padding:4px 0 16px">'+deptRows+'</div>'
    +'<div class="sec-label">職類分布</div><div style="display:flex;gap:8px;flex-wrap:wrap;padding:4px 0">'+jobChips+'</div>';
}

// ══════════════════════════════════════════
// PERSONAL SETTINGS 個人設定
// ══════════════════════════════════════════
var PREFS_KEY = 'sunghospital_prefs';
function loadPrefs(){
  try{ return JSON.parse(localStorage.getItem(PREFS_KEY)||'{}'); }catch(e){ return {}; }
}
function savePrefsData(p){
  try{ localStorage.setItem(PREFS_KEY, JSON.stringify(p)); }catch(e){}
}
function applySettings(){
  var p = loadPrefs();
  var size = p.fontSize || 'normal';
  document.body.classList.remove('font-sm','font-lg');
  if(size === 'small') document.body.classList.add('font-sm');
  if(size === 'large') document.body.classList.add('font-lg');
}
function openSettings(){
  document.getElementById('profileMenu').classList.remove('open');
  var p = loadPrefs();
  var pages = [
    {v:'home',l:'首頁'},
    {v:'meetings',l:'會議'},
    {v:'shift',l:'交班'},
    {v:'announcements',l:'公告'},
    {v:'duty',l:'排班'},
    {v:'journal',l:'日誌'}
  ];
  var pageOpts = pages.map(function(x){
    return '<option value="'+x.v+'"'+(p.defaultPage===x.v?' selected':'')+'>'+x.l+'</option>';
  }).join('');
  var sizeOpts = [
    {v:'small',l:'小'},
    {v:'normal',l:'標準'},
    {v:'large',l:'大'}
  ].map(function(x){
    return '<option value="'+x.v+'"'+(( p.fontSize||'normal')===x.v?' selected':'')+'>'+x.l+'</option>';
  }).join('');
  var html = '<div class="form-row"><label>登入後預設頁面</label><select id="pDefaultPage">'+pageOpts+'</select></div>'
    + '<div class="form-row"><label>字體大小</label><select id="pFontSize">'+sizeOpts+'</select></div>'
    + '<div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer">'
    + '<input type="checkbox" id="pNotifSound"'+(p.notifSound?' checked':'')+'>  通知音效（未來功能）</label></div>';
  showModal('個人設定', html, function(){
    var np = {
      defaultPage: document.getElementById('pDefaultPage').value,
      fontSize: document.getElementById('pFontSize').value,
      notifSound: document.getElementById('pNotifSound').checked
    };
    savePrefsData(np);
    applySettings();
    showToast('設定已儲存', '字體大小將立即套用', '⚙️');
    closeModal();
  });
}

// ══════════════════════════════════════════
// SWAP REQUEST REJECT 換班拒絕
// ══════════════════════════════════════════
function rejectSw(id){
  if(!confirm('確定拒絕此換班申請？')) return;
  var s = store.swapRequests.find(function(x){ return x.id===id; });
  if(!s) return;
  s.status = 'rejected';
  logAudit('拒絕換班', userName(s.fromId)+' → '+userName(s.toId));
  saveStore();
  rnDuty();
  showToast('換班申請已拒絕', userName(s.fromId)+' 的換班申請已退回', '❌');
}

// ══════════════════════════════════════════
// SHIFT CALENDAR VIEW 班表月曆視圖
// ══════════════════════════════════════════
var shiftViewMode = 'list';

function switchShiftView(mode){
  shiftViewMode = mode;
  var listWrap = document.getElementById('shiftListWrap');
  var calWrap  = document.getElementById('shiftCalWrap');
  var btnList  = document.getElementById('svBtnList');
  var btnCal   = document.getElementById('svBtnCal');
  if(!listWrap||!calWrap) return;
  if(mode === 'list'){
    listWrap.style.display = '';
    calWrap.style.display  = 'none';
    if(btnList){ btnList.classList.add('active'); }
    if(btnCal){  btnCal.classList.remove('active'); }
  } else {
    listWrap.style.display = 'none';
    calWrap.style.display  = '';
    if(btnList){ btnList.classList.remove('active'); }
    if(btnCal){  btnCal.classList.add('active'); }
    renderShiftCalView();
  }
}

function renderShiftCalView(){
  var wrap = document.getElementById('shiftCalWrap');
  if(!wrap) return;

  var now   = new Date();
  var year  = now.getFullYear();
  var month = now.getMonth();

  var firstDay = new Date(year, month, 1).getDay();
  var lastDate = new Date(year, month+1, 0).getDate();

  var SHIFT_CLR = { morning:'#f59e0b', afternoon:'#3b82f6', night:'#6366f1', off:'var(--faint)' };
  var SHIFT_LBL = { morning:'\u65e9', afternoon:'\u5348', night:'\u591c', off:'\u4f11' };

  // Build day cells
  var cells = '';
  var dow = ['\u65e5','\u4e00','\u4e8c','\u4e09','\u56db','\u4e94','\u516d'];
  var headers = dow.map(function(d){
    return '<div style="font-size:10px;font-weight:700;color:var(--faint);text-align:center;padding:4px 0">'+d+'</div>';
  }).join('');

  // Empty cells before first day
  for(var e=0;e<firstDay;e++) cells += '<div></div>';

  for(var dt=1;dt<=lastDate;dt++){
    var ds = year+'-'+(String(month+1).padStart(2,'0'))+'-'+(String(dt).padStart(2,'0'));
    var isToday = ds === today();

    // Collect shifts for this day from all users
    var dayShifts = [];
    if(store.dutySchedule){
      store.users.forEach(function(u){
        var sh = store.dutySchedule[u.id] && store.dutySchedule[u.id][ds];
        if(sh && sh !== 'off'){
          dayShifts.push({name:u.name.slice(0,2), sh:sh});
        }
      });
    }
    // Also check shift handover records
    var handovers = store.shifts.filter(function(s){ return s.date===ds; });

    var innerShifts = dayShifts.slice(0,3).map(function(x){
      return '<span style="font-size:9px;padding:1px 3px;border-radius:3px;background:'+SHIFT_CLR[x.sh]+'22;color:'+SHIFT_CLR[x.sh]+';white-space:nowrap">'+esc(x.name)+' '+SHIFT_LBL[x.sh]+'</span>';
    }).join('');
    if(dayShifts.length>3) innerShifts += '<span style="font-size:9px;color:var(--faint)">+'+( dayShifts.length-3)+'</span>';

    var handoverDot = handovers.length ? '<span style="width:6px;height:6px;border-radius:50%;background:var(--primary);display:inline-block;margin-left:2px" title="'+handovers.length+'\u7b46\u4ea4\u73ed"></span>' : '';

    cells += '<div style="min-height:60px;padding:4px;border:1px solid var(--b2);border-radius:6px;background:'+(isToday?'var(--primary-bg,#fdf0f5)':'var(--surface)')+';font-size:11px">'
      +'<div style="font-weight:'+(isToday?'800':'500')+';color:'+(isToday?'var(--primary)':'var(--text)')+';margin-bottom:2px">'+dt+handoverDot+'</div>'
      +innerShifts
      +'</div>';
  }

  var monthName = (month+1)+'\u6708 '+year;
  wrap.innerHTML = '<div style="padding:16px 20px">'
    +'<div style="font-size:15px;font-weight:700;margin-bottom:12px;color:var(--text)">'+monthName+'</div>'
    +'<div style="font-size:11px;color:var(--faint);margin-bottom:8px">'
    +[{sh:'morning',l:'\ud83c\udf05 \u65e9\u73ed'},{sh:'afternoon',l:'\u2600\ufe0f \u5348\u73ed'},{sh:'night',l:'\ud83c\udf19 \u591c\u73ed'}].map(function(x){
      return '<span style="margin-right:12px"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:'+SHIFT_CLR[x.sh]+';margin-right:3px"></span>'+x.l+'</span>';
    }).join('')
    +'<span style="color:var(--primary)">\u25cf \u6709\u4ea4\u73ed\u7d00\u9304</span></div>'
    +'<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">'
    +headers+cells
    +'</div></div>';
}

// ══════════════════════════════════════════
// VISUAL UPGRADE: progress bar + skeleton
// ══════════════════════════════════════════

// ── Nav progress bar ──
(function(){
  var bar = document.createElement('div');
  bar.id = 'navProgress';
  document.body.appendChild(bar);
})();

function navProgressStart(){
  var b = document.getElementById('navProgress');
  if(!b) return;
  b.style.width = '0';
  b.style.opacity = '1';
  b.style.transition = 'width .25s ease';
  requestAnimationFrame(function(){ b.style.width = '70%'; });
}
function navProgressDone(){
  var b = document.getElementById('navProgress');
  if(!b) return;
  b.style.width = '100%';
  setTimeout(function(){ b.style.opacity = '0'; setTimeout(function(){ b.style.width = '0'; b.style.opacity = '1'; }, 200); }, 200);
}

// ── Skeleton helpers ──
function skelCard(lines){
  lines = lines || 3;
  var inner = '<div class="skel skel-title"></div>';
  for(var i=0;i<lines;i++){
    inner += '<div class="skel skel-line-lg" style="width:'+(100-i*8)+'%"></div>';
  }
  return '<div class="skel-card">'+inner+'</div>';
}
function skelListPage(){
  var cards = '';
  for(var i=0;i<4;i++) cards += skelCard(3);
  return '<div class="admin-layout"><div style="padding:20px 22px 0">'
    +'<div class="skel skel-block" style="height:36px;width:180px;margin-bottom:0"></div></div>'
    +'<div class="admin-content">'+cards+'</div></div>';
}

// ── Override renderPageInMain with progress bar + skeleton ──
var _origRenderPageInMain = renderPageInMain;
renderPageInMain = function(fn){
  var c = document.getElementById('pageContainer');
  if(!c) return;
  navProgressStart();
  // Show skeleton immediately
  c.innerHTML = skelListPage();
  c.classList.remove('page-enter');
  void c.offsetWidth;
  c.classList.add('page-enter');
  // Render actual content after one frame
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      c.innerHTML = '';
      fn(c);
      c.classList.remove('page-enter');
      void c.offsetWidth;
      c.classList.add('page-enter');
      // stagger cards
      setTimeout(function(){
        c.querySelectorAll('.card,.task-card,.ann-card,.baby-card,.meeting-item,.person-card,.stat-card,.handover-card,.home-card').forEach(function(el){
          el.classList.add('stagger-item');
        });
      }, 10);
      navProgressDone();
    });
  });
};


// ════════════════════════════════════════════════════════
// ① 站內訊息
// ════════════════════════════════════════════════════════
var _activeChatRoom = null;
var _pendingChatFile = null;
var _replyToMsg = null;

function updateMsgBadge(){
  if(!currentUser)return;
  var n=(store.messages||[]).filter(function(m){
    return m.to===currentUser.id && !((m.reads||{})[currentUser.id]);
  }).length;
  var b=document.getElementById('badge_msg');
  if(b){b.style.display=n>0?'flex':'none';if(n>0)b.textContent=n>9?'9+':String(n);}
}

function getOrCreateDM(otherId){
  var existing=(store.chatRooms||[]).find(function(r){
    return !r.isGroup && r.members.indexOf(currentUser.id)>=0 && r.members.indexOf(otherId)>=0 && r.members.length===2;
  });
  if(existing)return existing;
  var room={id:uid(),isGroup:false,members:[currentUser.id,otherId],name:'',lastMsg:'',lastTs:''};
  if(!store.chatRooms)store.chatRooms=[];
  store.chatRooms.push(room);saveStore();return room;
}

function sendMsg(roomId,text,attachment,replyTo){
  text=(text||'').trim();
  if(!text&&!attachment)return;
  var room=(store.chatRooms||[]).find(function(r){return r.id===roomId;});if(!room)return;
  var others=room.members.filter(function(id){return id!==currentUser.id;});
  var msg={id:uid(),roomId:roomId,from:currentUser.id,to:others[0]||'',text:text,ts:new Date().toISOString(),reads:{},reactions:{},deleted:false};
  msg.reads[currentUser.id]=true;
  if(attachment)msg.attachment=attachment;
  if(replyTo)msg.replyTo=replyTo;
  if(!store.messages)store.messages=[];
  store.messages.push(msg);
  room.lastMsg=attachment?'📎 '+attachment.name:(text.slice(0,30)||'');
  room.lastTs=msg.ts;
  saveStore();renderChatThread(roomId);updateMsgBadge();
}

function handleChatFile(input){
  var file=input.files&&input.files[0];
  if(!file){_pendingChatFile=null;_clearChatFilePreview();return;}
  if(file.size>819200){alert('檔案請勿超過 800 KB，請壓縮後再上傳');input.value='';return;}
  var r=new FileReader();
  r.onload=function(e){
    _pendingChatFile={name:file.name,mime:file.type,data:e.target.result};
    var prev=document.getElementById('chatFilePreview');
    if(!prev)return;
    prev.style.display='flex';
    prev.innerHTML=(file.type.startsWith('image/')
      ?'<img src="'+e.target.result+'" style="max-height:48px;max-width:120px;border-radius:5px;object-fit:cover">'
      :'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M13 2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7z"/><path d="M13 2v5h5"/></svg>')
      +'<span style="font-size:11px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(file.name)+'</span>'
      +'<button onclick="_clearChatFilePreview()" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:14px;line-height:1;padding:0 2px">×</button>';
  };
  r.readAsDataURL(file);
  input.value='';
}

function _clearChatFilePreview(){
  _pendingChatFile=null;
  var prev=document.getElementById('chatFilePreview');
  if(prev){prev.style.display='none';prev.innerHTML='';}
}

// 站內訊息 → modules/messages.js

// ════════════════════════════════════════════════════════
// ② 設備/耗材回報 → modules/equipment.js
// ════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════
// ③ 全院儀表板 → modules/kiosk.js
// ════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════
// ④ 智慧排班建議
// ════════════════════════════════════════════════════════
function renderScheduleHints(container){
  if(!container)return;
  var hints=[];
  for(var i=0;i<7;i++){
    var d=new Date();d.setDate(d.getDate()+i);var ds=d.toISOString().slice(0,10);
    var cnt=Object.entries(store.dutySchedule||{}).filter(function(kv){var s=kv[1][ds];return s&&s!=='off';}).length;
    var label=fmtDate(ds)+(i===0?' (今天)':i===1?' (明天)':'');
    if(cnt===0)hints.push({t:'error',msg:label+' 無人排班'});
    else if(cnt<=1)hints.push({t:'warn',msg:label+' 僅 '+cnt+' 人排班'});
  }
  if(!hints.length){container.innerHTML='<div style="font-size:12px;color:var(--green);padding:4px 8px">✅ 未來7天排班人力充足</div>';return;}
  container.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0">'+hints.map(function(h){
    return '<div style="font-size:12px;padding:3px 10px;border-radius:99px;background:'+(h.t==='error'?'var(--red-bg)':'var(--amber-bg)')+';color:'+(h.t==='error'?'var(--red)':'var(--amber)')+'">'      +(h.t==='error'?'🚨 ':'⚠️ ')+esc(h.msg)+'</div>';
  }).join('')+'</div>';
}

// ════════════════════════════════════════════════════════
// ⑤ 今日摘要
// ════════════════════════════════════════════════════════
function showDailySummary(){
  var key='dailySummary_'+today();if(localStorage.getItem(key))return;
  localStorage.setItem(key,'1');
  var myForms=(store.formRequests||[]).filter(function(f){return f.applicantId===currentUser.id&&f.status==='pending';}).length;
  var unreadAnn=(store.announcements||[]).filter(function(a){return !a.reads[currentUser.id];}).length;
  var myTasks=(store.meetings||[]).flatMap(function(m){return m.tasks||[];}).filter(function(t){return t.assigneeId===currentUser.id&&t.status!=='已完成';}).length;
  var unreadMsg=(store.messages||[]).filter(function(m){return m.to===currentUser.id&&!(m.reads||{})[currentUser.id];}).length;
  var shiftToday=(function(){
    var s=store.dutySchedule&&store.dutySchedule[currentUser.id]&&store.dutySchedule[currentUser.id][today()];
    if(!s||s==='off')return null;
    return {morning:'🌅 早班',afternoon:'☀️ 午班',night:'🌙 夜班'}[s]||s;
  })();
  if(!myForms&&!unreadAnn&&!myTasks&&!unreadMsg&&!shiftToday)return;
  var items=[];
  if(shiftToday)items.push('<div class="summary-item summary-shift">今日班別：<strong>'+shiftToday+'</strong></div>');
  if(unreadAnn)items.push('<div class="summary-item summary-ann" onclick="closeModal();setPage(\'announcements\')" style="cursor:pointer">📢 未讀公告 <strong>'+unreadAnn+' 則</strong></div>');
  if(myForms)items.push('<div class="summary-item summary-form" onclick="closeModal();setPage(\'forms\')" style="cursor:pointer">📋 待審申請 <strong>'+myForms+' 件</strong></div>');
  if(myTasks)items.push('<div class="summary-item summary-task" onclick="closeModal();setPage(\'meetings\')" style="cursor:pointer">✅ 待完成任務 <strong>'+myTasks+' 項</strong></div>');
  if(unreadMsg)items.push('<div class="summary-item summary-msg" onclick="closeModal();setPage(\'messages\')" style="cursor:pointer">💬 未讀訊息 <strong>'+unreadMsg+' 則</strong></div>');
  showModal('👋 早安，'+esc(currentUser.name)+'！',
    '<div class="summary-sub">今日工作重點</div><div class="summary-list">'+items.join('')+'</div>'    +'<div style="font-size:11px;color:var(--faint);margin-top:12px;text-align:center">點擊項目可快速跳轉 · 今日僅顯示一次</div>',null);
  setTimeout(function(){var f=document.querySelector('.modal-footer');if(f)f.style.display='none';},0);
}

// ════════════════════════════════════════════════════════
// ⑥ 深色模式跟隨系統
// ════════════════════════════════════════════════════════
var _dmMq=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)');
function initDarkModeAuto(){
  if(localStorage.getItem('themeMode')==='system'){
    applySystemDark();if(_dmMq)_dmMq.addEventListener('change',applySystemDark);
  }
}
function applySystemDark(){
  var dark=_dmMq&&_dmMq.matches;
  document.body.classList.toggle('dark',dark);localStorage.setItem('darkMode',dark?'1':'0');
}
function setThemeMode(mode){
  localStorage.setItem('themeMode',mode);
  if(_dmMq)_dmMq.removeEventListener('change',applySystemDark);
  if(mode==='system'){applySystemDark();if(_dmMq)_dmMq.addEventListener('change',applySystemDark);}
  else if(mode==='dark'){document.body.classList.add('dark');localStorage.setItem('darkMode','1');}
  else if(mode==='light'){document.body.classList.remove('dark');localStorage.setItem('darkMode','0');}
  document.querySelectorAll('.theme-btn').forEach(function(b){b.classList.toggle('active',b.dataset.mode===mode);});
  showToast('外觀設定已更新','','🎨');
}
var _origOpenSettings2=(typeof openSettings==='function')?openSettings:null;
openSettings=function(){
  if(_origOpenSettings2)_origOpenSettings2();
  var mode=localStorage.getItem('themeMode')||'manual';
  setTimeout(function(){
    var mc=document.getElementById('modalContent');if(!mc||mc.querySelector('.theme-mode-section'))return;
    var sec=document.createElement('div');sec.className='theme-mode-section';
    sec.style.cssText='margin-top:16px;border-top:1px solid var(--b1);padding-top:14px';
    sec.innerHTML='<div style="font-size:12px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">外觀模式</div>'      +'<div style="display:flex;gap:8px;flex-wrap:wrap">'      +'<button class="btn-sm theme-btn'+(mode==='light'?' active':'')+'" data-mode="light" onclick="setThemeMode(\'light\')">☀️ 淺色</button>'      +'<button class="btn-sm theme-btn'+(mode==='dark'?' active':'')+'" data-mode="dark" onclick="setThemeMode(\'dark\')">🌙 深色</button>'      +'<button class="btn-sm theme-btn'+(mode==='system'?' active':'')+'" data-mode="system" onclick="setThemeMode(\'system\')">💻 跟隨系統</button>'      +'</div>';
    var footer=mc.querySelector('.modal-footer');footer?mc.insertBefore(sec,footer):mc.appendChild(sec);
  },50);
};

// ════════════════════════════════════════════════════════
// ⑦ 績效出勤報表 + 排班建議 patch
// ════════════════════════════════════════════════════════
function renderPerformanceSection(){
  var rows=store.users.filter(function(u){return u.status==='active';}).map(function(u){
    var myDuty=store.dutySchedule&&store.dutySchedule[u.id]
      ?Object.values(store.dutySchedule[u.id]).filter(function(s){return s&&s!=='off';}).length:0;
    var leaves=(store.formRequests||[]).filter(function(f){return f.applicantId===u.id&&f.type==='leave'&&f.status==='approved';}).length;
    var myTasks=(store.meetings||[]).flatMap(function(m){return m.tasks||[];}).filter(function(t){return t.assigneeId===u.id;});
    var done=myTasks.filter(function(t){return t.status==='已完成';}).length;
    var pct=myTasks.length?Math.round(done/myTasks.length*100):null;
    var pctClr=pct===null?'var(--faint)':pct===100?'var(--green)':pct>50?'var(--amber)':'var(--red)';
    return '<tr style="border-bottom:1px solid var(--b1)">'      +'<td style="padding:7px 8px"><div style="display:flex;align-items:center;gap:7px">'      +'<div class="'+u.avatar+'" style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0">'+initials(u.name)+'</div>'+esc(u.name)+'</div></td>'      +'<td style="text-align:center;padding:7px 4px">'+myDuty+'</td>'      +'<td style="text-align:center;padding:7px 4px">'+leaves+'</td>'      +'<td style="text-align:center;padding:7px 4px">'+myTasks.length+'</td>'      +'<td style="text-align:center;padding:7px 4px;color:'+pctClr+';font-weight:700">'+(pct!==null?pct+'%':'—')+'</td>'      +'</tr>';
  }).join('');
  return '<div class="stat-card" style="margin-top:14px"><div class="stat-card-title">👥 人員績效出勤概覽</div>'    +'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">'    +'<thead><tr style="color:var(--muted)">'    +'<th style="text-align:left;padding:6px 8px;font-weight:600">姓名</th>'    +'<th style="padding:6px 4px;font-weight:600">班次</th><th style="padding:6px 4px;font-weight:600">請假</th>'    +'<th style="padding:6px 4px;font-weight:600">任務</th><th style="padding:6px 4px;font-weight:600">完成率</th>'    +'</tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

var _origRenderStatsPage=renderStatsPage;
renderStatsPage=function(c){
  _origRenderStatsPage(c);
  if(isAdmin()||hasPerm('viewReports')){
    setTimeout(function(){var content=c.querySelector('.admin-content');if(content)content.insertAdjacentHTML('beforeend',renderPerformanceSection());},0);
  }
};

var _origRenderDutyPage2=(typeof renderDutyPage==='function')?renderDutyPage:null;
if(_origRenderDutyPage2){
  renderDutyPage=function(c){
    _origRenderDutyPage2(c);
    setTimeout(function(){
      var header=c.querySelector('.main-header');if(!header)return;
      var wrap=document.createElement('div');wrap.style.cssText='padding:8px 22px 0';wrap.id='scheduleHints';
      header.insertAdjacentElement('afterend',wrap);renderScheduleHints(wrap);
    },0);
  };
}

// ════════════════════════════════════════════════════════
// 會議決議事項 & 紀錄簽核
// ════════════════════════════════════════════════════════

// ── 決議事項 Tab ──
function renderResolutions(c, m) {
  if(!m.resolutions) m.resolutions = [];
  var today2 = today();
  var canEdit = isAdmin() || m.attendeeIds.indexOf(currentUser.id) >= 0;

  var rows = m.resolutions.map(function(r) {
    var overdue = r.deadline && r.deadline < today2 && r.status !== '已完成';
    var statusCls = r.status === '已完成' ? 'res-done' : overdue ? 'res-overdue' : 'res-wip';
    var statusLbl = r.status === '已完成' ? '✓ 完成' : overdue ? '⚠ 逾期' : '進行中';
    var assignee = r.assigneeId ? store.users.find(function(u){ return u.id === r.assigneeId; }) : null;
    return '<div class="res-card">'
      + '<div class="res-status ' + statusCls + '">' + statusLbl + '</div>'
      + '<div style="flex:1;min-width:0">'
      + '<div style="font-size:13px;font-weight:600;margin-bottom:4px">' + esc(r.content) + '</div>'
      + '<div style="display:flex;gap:12px;font-size:11px;color:var(--muted);flex-wrap:wrap">'
      + (assignee ? '<span>👤 ' + esc(assignee.name) + '</span>' : '<span style="color:var(--faint)">未指定負責人</span>')
      + (r.deadline ? '<span>📅 ' + fmtDate(r.deadline) + (overdue ? ' <span style="color:var(--red);font-weight:700">逾期</span>' : '') + '</span>' : '')
      + '</div></div>'
      + (canEdit ? '<div style="display:flex;gap:4px;flex-shrink:0">'
        + '<button class="btn-xs" onclick="toggleResolutionStatus(\''+m.id+'\',\''+r.id+'\')" title="切換狀態">' + (r.status === '已完成' ? '↩' : '✓') + '</button>'
        + '<button class="btn-xs danger" onclick="deleteResolution(\''+m.id+'\',\''+r.id+'\')" title="刪除">×</button>'
        + '</div>' : '')
      + '</div>';
  }).join('') || '<div style="text-align:center;padding:32px;color:var(--faint);font-size:13px">尚無決議事項<br>點擊下方按鈕新增</div>';

  var doneCount = m.resolutions.filter(function(r){ return r.status === '已完成'; }).length;
  var total = m.resolutions.length;

  c.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
    + '<div class="sec-label" style="margin:0">決議追蹤'
    + (total ? ' <span style="font-size:11px;color:var(--muted);font-weight:400">(' + doneCount + '/' + total + ' 完成)</span>' : '')
    + '</div>'
    + (canEdit ? '<button class="btn-sm primary" onclick="openAddResolution(\''+m.id+'\')">+ 新增決議</button>' : '')
    + '</div>'
    + (total > 0 ? '<div style="height:4px;background:var(--b1);border-radius:4px;margin-bottom:14px"><div style="width:'
      + (total ? Math.round(doneCount/total*100) : 0) + '%;height:4px;background:var(--green);border-radius:4px;transition:width .3s"></div></div>' : '')
    + rows;
}

function openAddResolution(meetingId) {
  var m = store.meetings.find(function(x){ return x.id === meetingId; });
  if(!m) return;
  var aOpts = '<option value="">（不指定）</option>'
    + m.attendeeIds.map(function(uid2){
        return '<option value="' + uid2 + '">' + esc(userName(uid2)) + '</option>';
      }).join('');
  showModal('新增決議事項',
    '<div class="form-row"><label>決議內容</label><textarea id="resContent" rows="3" style="width:100%;box-sizing:border-box;font-family:inherit;font-size:13px;border:1px solid var(--b2);border-radius:var(--radius-sm);padding:8px 10px;background:var(--bg);color:var(--text);resize:vertical;line-height:1.6" placeholder="例：每週四辦理感控教育訓練，由護理長主持"></textarea></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + '<div class="form-row"><label>負責人</label><select id="resAssignee">' + aOpts + '</select></div>'
    + '<div class="form-row"><label>截止日期</label><input id="resDeadline" type="date"></div>'
    + '</div>',
    function() {
      var content = document.getElementById('resContent').value.trim();
      if(!content) return;
      if(!m.resolutions) m.resolutions = [];
      m.resolutions.push({
        id: uid(),
        content: content,
        assigneeId: document.getElementById('resAssignee').value || null,
        deadline: document.getElementById('resDeadline').value || '',
        status: '進行中',
        createdAt: today() + ' ' + nowTime()
      });
      saveStore(); closeModal(); renderTab();
    }
  );
}

function toggleResolutionStatus(meetingId, resId) {
  var m = store.meetings.find(function(x){ return x.id === meetingId; });
  if(!m) return;
  var r = (m.resolutions||[]).find(function(x){ return x.id === resId; });
  if(!r) return;
  r.status = r.status === '已完成' ? '進行中' : '已完成';
  saveStore(); renderTab(); renderSidebar();
}

function deleteResolution(meetingId, resId) {
  if(!confirm('確定刪除此決議？')) return;
  var m = store.meetings.find(function(x){ return x.id === meetingId; });
  if(!m) return;
  m.resolutions = (m.resolutions||[]).filter(function(r){ return r.id !== resId; });
  saveStore(); renderTab();
}

// ── 紀錄簽核 ──
function renderSignoffSection(m) {
  if(!m.signoff) m.signoff = {locked: false, signatures: {}};
  var locked = m.signoff.locked;
  var sigs = m.signoff.signatures || {};
  var isAttendee = m.attendeeIds.indexOf(currentUser.id) >= 0;
  var mySig = sigs[currentUser.id];
  var signedCount = m.attendeeIds.filter(function(id){ return sigs[id] && sigs[id].signed; }).length;
  var allSigned = signedCount === m.attendeeIds.length;

  if(!locked && !m.notes) return '';

  var sigChips = m.attendeeIds.map(function(uid2) {
    var s = sigs[uid2];
    var signed = s && s.signed;
    return '<div style="display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:6px;background:' + (signed ? 'var(--green-bg,#e8f5e9)' : 'var(--s2)') + ';border:1px solid ' + (signed ? 'rgba(46,125,82,.2)' : 'var(--b1)') + '">'
      + avatarEl(uid2, 22)
      + '<span style="font-size:12px;font-weight:600">' + esc(userName(uid2)) + '</span>'
      + (signed
        ? '<span style="font-size:10px;color:var(--green);margin-left:auto">✓ ' + (s.time||'').slice(5,16) + '</span>'
        : '<span style="font-size:10px;color:var(--faint);margin-left:auto">待簽核</span>')
      + '</div>';
  }).join('');

  var html = '<div style="margin-top:18px;padding:14px 16px;border:1.5px solid ' + (allSigned ? 'rgba(46,125,82,.3)' : locked ? 'rgba(255,160,0,.3)' : 'var(--b1)') + ';border-radius:var(--radius);background:' + (allSigned ? 'rgba(46,125,82,.04)' : 'var(--surface)') + '">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
    + '<div style="font-size:13px;font-weight:700">'
    + (allSigned ? '✅ 全員完成簽核' : locked ? '🔏 紀錄簽核中 (' + signedCount + '/' + m.attendeeIds.length + ')' : '📄 會議紀錄簽核')
    + '</div>'
    + '<div style="display:flex;gap:6px">'
    + (locked && isAttendee && !mySig
      ? '<button class="btn-sm primary" onclick="signMeetingMinutes(\''+m.id+'\')">✍️ 確認簽核</button>'
      : '')
    + (isAdmin() && !locked && m.notes
      ? '<button class="btn-sm" onclick="lockMeetingMinutes(\''+m.id+'\')">🔏 發布簽核</button>'
      : '')
    + (isAdmin() && locked && !allSigned
      ? '<button class="btn-sm" onclick="unlockMeetingMinutes(\''+m.id+'\')" style="font-size:11px">解除鎖定</button>'
      : '')
    + '</div></div>'
    + (locked
      ? '<div style="display:flex;flex-wrap:wrap;gap:6px">' + sigChips + '</div>'
      : '<div style="font-size:12px;color:var(--faint)">完成摘要後，點擊「發布簽核」讓與會成員確認。</div>')
    + '</div>';
  return html;
}

function lockMeetingMinutes(meetingId) {
  if(!confirm('發布後，紀錄將鎖定並通知與會成員簽核。確定嗎？')) return;
  var m = store.meetings.find(function(x){ return x.id === meetingId; });
  if(!m) return;
  if(!m.signoff) m.signoff = {};
  m.signoff.locked = true;
  m.signoff.signatures = m.signoff.signatures || {};
  logAudit('發布簽核', m.title);
  saveStore(); renderTab();
  showToast('已發布', '請與會成員前往確認簽核', '🔏');
}

function unlockMeetingMinutes(meetingId) {
  if(!confirm('解除後簽核狀態將重置，確定嗎？')) return;
  var m = store.meetings.find(function(x){ return x.id === meetingId; });
  if(!m) return;
  m.signoff = {locked: false, signatures: {}};
  saveStore(); renderTab();
  showToast('已解除', '紀錄簽核已重置', '🔓');
}

function signMeetingMinutes(meetingId) {
  var m = store.meetings.find(function(x){ return x.id === meetingId; });
  if(!m || !m.signoff || !m.signoff.locked) return;
  if(!m.signoff.signatures) m.signoff.signatures = {};
  m.signoff.signatures[currentUser.id] = {signed: true, time: today() + ' ' + nowTime()};
  saveStore(); renderTab();
  showToast('已簽核', m.title, '✍️');
}

// ── 表單：退回重申 ──
function resubmitForm(id) {
  var f = store.formRequests.find(function(x){ return x.id === id; });
  if(!f) return;
  _pendingAttachment = null;
  var approvers = store.users.filter(function(u){
    return u.id !== currentUser.id && u.status !== 'disabled' && u.status !== 'resigned'
      && (u.role === 'admin' || (u.permissions && u.permissions.approveForm));
  });
  var aOpts = approvers.length
    ? approvers.map(function(u){ return '<option value="' + u.id + '"' + (f.approvers[0]===u.id?' selected':'') + '>' + esc(u.name) + '</option>'; }).join('')
    : '<option value="">（尚未設定可審核人員）</option>';
  showModal('重新申請（退回修改）',
    '<div style="padding:8px 12px;background:var(--amber-bg,#fff8e1);border-radius:6px;font-size:12px;color:var(--amber);margin-bottom:12px">📋 原申請已退回，請修改後重新送出</div>'
    + '<div class="form-row"><label>類型</label><select id="rfty"><option value="leave"' + (f.type==='leave'?' selected':'') + '>請假</option><option value="overtime"' + (f.type==='overtime'?' selected':'') + '>加班</option><option value="supply"' + (f.type==='supply'?' selected':'') + '>物品申請</option><option value="other"' + (f.type==='other'?' selected':'') + '>其他</option></select></div>'
    + '<div class="form-row"><label>標題</label><input id="rftit" value="' + esc(f.title) + '"></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="form-row"><label>開始日期</label><input id="rfsd" type="date" value="' + (f.startDate||today()) + '"></div><div class="form-row"><label>結束日期</label><input id="rfed" type="date" value="' + (f.endDate||today()) + '"></div></div>'
    + '<div class="form-row"><label>原因</label><textarea id="rfrs">' + esc(f.reason||'') + '</textarea></div>'
    + '<div class="form-row"><label>送審主管</label><select id="rfap">' + aOpts + '</select></div>',
    function() {
      var t = document.getElementById('rftit').value.trim(); if(!t) return;
      store.formRequests.unshift({
        id: uid(), type: document.getElementById('rfty').value, title: t,
        applicantId: currentUser.id, date: today(),
        startDate: document.getElementById('rfsd').value,
        endDate: document.getElementById('rfed').value,
        reason: document.getElementById('rfrs').value,
        approvers: [document.getElementById('rfap').value],
        statuses: ['pending'], status: 'pending', createdAt: today() + ' ' + nowTime(),
        urgent: f.urgent || false,
        attachment: _pendingAttachment || null,
        resubmittedFrom: f.id
      });
      _pendingAttachment = null;
      saveStore(); closeModal(); rnForms();
      showToast('已重新送出', t, '📋');
    }
  );
}

// ════════════════════════════════════════════════════════
// 聊天室進階功能
// ════════════════════════════════════════════════════════

function isOnline(userId){
  var msgs=(store.messages||[]).filter(function(m){return m.from===userId;});
  if(!msgs.length)return false;
  var last=msgs.reduce(function(a,b){return a.ts>b.ts?a:b;});
  return (Date.now()-new Date(last.ts).getTime())<30*60*1000;
}

function reactToMsg(roomId,msgId,emoji){
  var m=(store.messages||[]).find(function(x){return x.id===msgId;});
  if(!m)return;
  if(!m.reactions)m.reactions={};
  if(!m.reactions[emoji])m.reactions[emoji]=[];
  var idx=m.reactions[emoji].indexOf(currentUser.id);
  if(idx>=0){m.reactions[emoji].splice(idx,1);if(!m.reactions[emoji].length)delete m.reactions[emoji];}
  else{m.reactions[emoji].push(currentUser.id);}
  saveStore();renderChatThread(roomId);
}

function setReply(msgId,text,fromName){
  _replyToMsg={msgId:msgId,text:text,fromName:fromName};
  var prev=document.getElementById('chatReplyPreview');
  if(prev){
    prev.style.display='flex';
    prev.innerHTML='<div class="reply-preview-bar">'
      +'<div style="flex:1;min-width:0"><div style="font-size:10px;font-weight:700;color:var(--primary)">↩ 回覆 '+esc(fromName)+'</div>'
      +'<div style="font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc((text||'📎 附件').slice(0,50))+'</div></div>'
      +'<button onclick="clearReply()" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:18px;line-height:1;padding:0 4px;flex-shrink:0">×</button>'
      +'</div>';
  }
  var ci=document.getElementById('chatInput');if(ci)ci.focus();
}

function clearReply(){
  _replyToMsg=null;
  var prev=document.getElementById('chatReplyPreview');
  if(prev){prev.style.display='none';prev.innerHTML='';}
}

function deleteMsg(roomId,msgId){
  if(!confirm('確定刪除此訊息？'))return;
  var m=(store.messages||[]).find(function(x){return x.id===msgId;});
  if(!m||m.from!==currentUser.id)return;
  m.deleted=true;m.text='';m.attachment=null;
  var room=(store.chatRooms||[]).find(function(r){return r.id===roomId;});
  if(room){var last=(store.messages||[]).filter(function(x){return x.roomId===roomId&&!x.deleted;});last.sort(function(a,b){return b.ts.localeCompare(a.ts);});room.lastMsg=last.length?(last[0].text||'📎 附件'):'';}
  saveStore();renderChatThread(roomId);
}

function scrollToMsg(msgId){
  var el=document.getElementById('msg-'+msgId);
  if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.style.transition='background .3s';el.style.background='rgba(196,82,122,.12)';setTimeout(function(){el.style.background='';},1200);}
}

function openCreateGroup(){
  var activeUsers=store.users.filter(function(u){return u.status==='active'&&u.id!==currentUser.id;});
  var checks=activeUsers.map(function(u){
    return '<label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;font-size:13px">'
      +'<input type="checkbox" class="grp-member" value="'+u.id+'" style="width:15px;height:15px;accent-color:var(--primary)">'
      +avatarEl(u.id,22)+esc(u.name)+'</label>';
  }).join('');
  showModal('建立群組聊天',
    '<div class="form-row"><label>群組名稱</label><input id="grpName" placeholder="例：護理站小隊 🌸"></div>'
    +'<div class="form-row"><label>選擇成員</label><div style="max-height:200px;overflow-y:auto;border:1px solid var(--b1);border-radius:var(--radius-sm);padding:8px 12px">'+checks+'</div></div>',
    function(){
      var name=document.getElementById('grpName').value.trim();
      if(!name)return;
      var members=[currentUser.id];
      document.querySelectorAll('.grp-member:checked').forEach(function(cb){members.push(cb.value);});
      if(members.length<2){alert('請至少選擇一位成員');return;}
      if(!store.chatRooms)store.chatRooms=[];
      var room={id:uid(),isGroup:true,groupName:name,members:members,lastMsg:'',lastTs:''};
      store.chatRooms.push(room);
      _activeChatRoom=room.id;
      saveStore();closeModal();setPage('messages');
      showToast('群組已建立',name,'👥');
    }
  );
}

function manageChatGroup(roomId){
  var room=(store.chatRooms||[]).find(function(r){return r.id===roomId;});
  if(!room)return;
  var memberList=room.members.map(function(uid2){
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0">'+avatarEl(uid2,26)
      +'<span style="font-size:13px;font-weight:600">'+esc(userName(uid2))+'</span>'
      +(uid2===currentUser.id?'<span style="font-size:10px;color:var(--faint)">(我)</span>':'')
      +'</div>';
  }).join('');
  var html='<div class="form-row"><label>群組名稱</label><input id="editGrpName" value="'+esc(room.groupName)+'"></div>'
    +'<div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">成員（'+room.members.length+'）</div>'
    +'<div style="border:1px solid var(--b1);border-radius:var(--radius-sm);padding:8px 12px;max-height:180px;overflow-y:auto">'+memberList+'</div>';
  showModal('群組資訊',html,function(){
    var n=document.getElementById('editGrpName').value.trim();
    if(n){room.groupName=n;saveStore();renderChatThread(roomId);renderMessagesPage(document.getElementById('pageContainer'));}
    closeModal();
  },'儲存');
}
