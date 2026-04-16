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
   'eduItems','titles'].forEach(function(f) {
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
function startFirebaseSync() {
  if (!fbDb) { setSyncDot(false); return; }

  // 策略：永遠先從雲端拉最新資料
  // 雲端有資料 → 用雲端（確保所有裝置看到同樣的東西）
  // 雲端沒資料 → 把本地資料推上去（第一次初始化）
  fbDb.ref('store').once('value').then(function(snap) {
    var cloudData = snap.val();
    if (cloudData && cloudData.users && Array.isArray(cloudData.users) && cloudData.users.length > 0) {
      // 雲端有資料，以雲端為準
      store = normalizeStore(cloudData);
      try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch(e) {}
      mergeNewLocal();
      renderSidebar();
      updateAnnBadge();
      updateIrBadge();
      updateMarquee();
    } else {
      // 雲端是空的，把本地資料推上去
      fbDb.ref('store').set(store).catch(function() {});
    }

    // 即時監聽：只要雲端資料有變動就立刻更新本地
    // 用 _savedAt 避免自己的儲存觸發自己更新
    var mySaveTime = 0;
    var _origSave = saveStore;
    // 記錄每次自己存的時間
    window._lastSelfSave = 0;

    fbDb.ref('store/_savedAt').on('value', function(tSnap) {
      var cloudTime = tSnap.val() || 0;
      // 如果是自己剛存的就跳過（避免無限循環）
      if (cloudTime === window._lastSelfSave) return;
      if (!currentUser) return;

      // 雲端有新資料，拉下來
      fbDb.ref('store').once('value').then(function(dSnap) {
        var d = dSnap.val();
        if (d && d.users && Array.isArray(d.users) && d.users.length > 0) {
          store = normalizeStore(d);
          try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch(ex) {}
          mergeNewLocal();
          // 更新當前頁面
          if (currentPage === 'meetings' || !currentPage) {
            renderSidebar();
            if (currentMeetingId) renderMeetingMain();
          }
          updateAnnBadge();
          updateIrBadge();
          updateMarquee();
        }
      });
    });

    setSyncDot(true);
  }).catch(function() {
    setSyncDot(false);
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
  document.getElementById('loginErr').style.display='none';
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('appShell').style.display='block';
  initApp();
}
function initApp(){
  mergeNewLocal(); // 只補欄位到 localStorage，不覆蓋 Firebase
  startFirebaseSync(); // 先從雲端讀資料，之後再存回去
  if(isAdmin()){
    document.getElementById('navDepts').style.display='flex';
    document.getElementById('navUsers').style.display='flex';
  }
  updateNavUser();updateAnnBadge();updateIrBadge();
  renderSidebar();setPage('meetings');
  checkPendingEmergency();
}
function updateNavUser(){
  if(!currentUser)return;
  const el=document.getElementById('navUser');
  if(el){el.textContent=initials(currentUser.name);el.className='nav-user '+currentUser.avatar;}
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
    <div class="pm-item danger" onclick="logout()">登出</div>`;
  }
}
document.addEventListener('click',function(e){
  const m=document.getElementById('profileMenu');
  const u=document.getElementById('navUser');
  if(m&&!m.contains(e.target)&&u&&!u.contains(e.target))m.classList.remove('open');
});
function logout(){
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
  }
}
function renderPageInMain(fn){
  const c=document.getElementById('pageContainer');
  c.innerHTML='';
  c.style.cssText='';
  fn(c);
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
function renderSidebar(q=''){
  const el=document.getElementById('meetingList');
  el.innerHTML='';
  const sub=document.getElementById('sidebarSub');
  if(sub)sub.textContent=currentUser?currentUser.name+' · '+store.meetings.length+'場':' ';
  const list=[...store.meetings].sort((a,b)=>b.date.localeCompare(a.date))
    .filter(m=>!q||m.title.toLowerCase().includes(q.toLowerCase()));
  list.forEach(m=>{
    const open=m.tasks.filter(t=>t.status!=='已完成').length;
    const hasCritical=m.tasks.some(t=>t.priority==='critical'&&t.status!=='已完成');
    const isRead=m.reads&&m.reads[currentUser.id]&&m.reads[currentUser.id].read;
    const div=document.createElement('div');
    div.className='meeting-item'+(m.id===currentMeetingId?' active':'');
    div.innerHTML=`<div class="mi-title">${esc(m.title)}</div>
      <div class="mi-meta">${fmtDate(m.date)}
        ${!isRead?'<span class="mi-badge badge-unread">未讀</span>':''}
        ${hasCritical?'<span class="mi-badge badge-urgent">緊急</span>':''}
      </div>
      <span class="mi-badge ${open===0?'badge-done':'badge-open'}">${open===0?'✓ 完成':open+' 待辦'}</span>`;
    div.onclick=()=>selectMeeting(m.id);
    el.appendChild(div);
  });
  if(!list.length)el.innerHTML='<div style="text-align:center;padding:20px;font-size:12px;color:var(--faint)">無符合結果</div>';
}
function selectMeeting(id){
  currentMeetingId=id;currentTab='notes';
  const m=store.meetings.find(x=>x.id===id);
  if(m&&m.reads&&m.reads[currentUser.id])m.reads[currentUser.id]={read:true,time:nowTime()};
  saveStore();renderSidebar();renderMeetingMain();
}

// ══════════════════════════════════════════
// MEETING MAIN
// ══════════════════════════════════════════
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
  pc.innerHTML=`
    <div class="main-header">
      <div style="min-width:0"><h1>${esc(m.title)}</h1><div class="main-header-meta">${fmtDate(m.date)} · ${m.attendeeIds.length} 位與會成員</div></div>
      <div class="header-actions">
        ${crit>0?`<span class="btn-sm urgent-btn">⚡ ${crit} 項緊急任務</span>`:''}
        ${isAdmin()?`<button class="btn-sm" onclick="openEditMeeting()">編輯</button>`:''}
        ${isAdmin()?`<button class="btn-sm danger" onclick="deleteMeeting()">刪除</button>`:''}
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
      <div class="tab ${currentTab==='notes'?'active':''}" onclick="switchTab('notes',this)">紀錄摘要</div>
      <div class="tab ${currentTab==='tasks'?'active':''}" onclick="switchTab('tasks',this)">任務 ${m.tasks.length?`<span class="tab-cnt" style="background:var(--s2);color:var(--muted)">${m.tasks.length}</span>`:''}</div>
      <div class="tab ${currentTab==='progress'?'active':''}" onclick="switchTab('progress',this)">進度</div>
      <div class="tab ${currentTab==='chat'?'active':''}" onclick="switchTab('chat',this)">討論 ${m.chat&&m.chat.length?`<span class="tab-cnt" style="background:var(--blue-bg);color:var(--blue)">${m.chat.length}</span>`:''}</div>
      <div class="tab ${currentTab==='votes'?'active':''}" onclick="switchTab('votes',this)">投票 ${m.votes&&m.votes.length?`<span class="tab-cnt" style="background:var(--purple-bg);color:var(--purple)">${m.votes.length}</span>`:''}</div>
    </div>
    <div class="tab-content" id="tabContent"></div>`;
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
  else if(currentTab==='tasks')renderTasks(c,m);
  else if(currentTab==='progress')renderProgress(c,m);
  else if(currentTab==='chat')renderChat(c,m);
  else if(currentTab==='votes')renderVotes(c,m);
}

// ── Notes ──
function renderNotes(c,m){
  c.style.cssText='';
  const chips=m.attendeeIds.map(uid=>{
    const r=m.reads&&m.reads[uid];
    return`<div class="attendee-chip" style="display:flex;align-items:center;gap:8px;padding:7px 12px;background:var(--surface);border:1px solid var(--b1);border-radius:var(--radius-sm)">
      ${avatarEl(uid,26)}
      <div><div style="font-size:12px;font-weight:500">${esc(userName(uid))}</div>
      <div style="font-size:10px;color:var(--faint)">${esc(userTitle(uid))} · ${esc(userDept(uid))}</div></div>
      <div style="width:7px;height:7px;border-radius:50%;background:${r&&r.read?'var(--green)':'var(--b3)'};margin-left:auto" title="${r&&r.read?'已讀':'未讀'}"></div>
    </div>`;
  }).join('');
  const unread=m.attendeeIds.filter(u=>!(m.reads&&m.reads[u]&&m.reads[u].read));
  c.innerHTML=`<div class="sec-label">與會成員</div>
    <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:4px">${chips}</div>
    ${unread.length?`<div class="alert alert-info" style="margin-top:10px"><span>👁</span><div>未讀：${unread.map(u=>esc(userName(u))).join('、')}</div></div>`:''}
    <div class="sec-label">會議摘要</div>
    <div style="background:var(--surface);border:1px solid var(--b1);border-radius:var(--radius);padding:14px 16px;font-size:14px;line-height:1.8">${esc(m.notes)||'<span style="color:var(--faint)">尚無摘要</span>'}</div>`;
}

// ── Tasks ──
function renderTasks(c,m){
  c.style.cssText='';
  const canEdit=isAdmin()||m.attendeeIds.includes(currentUser.id);
  const sorted=[...m.tasks].sort((a,b)=>{
    const po={critical:0,urgent:1,normal:2};
    return (po[a.priority]||2)-(po[b.priority]||2);
  });
  const rows=sorted.map((t,i)=>{
    const origI=m.tasks.indexOf(t);
    const isDone=t.status==='已完成',isIP=t.status==='進行中';
    const dc=dueClass(t.due,t.status);
    const cardClass=t.priority==='critical'&&!isDone?'t-critical':t.priority==='urgent'&&!isDone?'t-urgent':'';
    return`<div class="task-card ${cardClass}">
      <div class="status-dot ${isDone?'done':isIP?'in-progress':''}" onclick="${canEdit||t.assigneeId===currentUser.id?`cycleStatus(${origI})`:'void(0)'}" title="點擊切換">${isDone?'✓':isIP?'◑':''}</div>
      <div class="task-body">
        <div class="task-text ${isDone?'done-text':''}">${esc(t.text)}</div>
        <div class="task-meta">
          ${avatarEl(t.assigneeId,18)}<span class="task-assignee">${esc(userName(t.assigneeId))}</span>
          ${prioBadge(t.priority)}
          ${t.due?`<span class="due-tag ${dc}">${fmtDate(t.due)}</span>`:''}
        </div>
      </div>
      ${canEdit||t.assigneeId===currentUser.id?`<select class="task-select" onchange="setStatus(${origI},this.value)">
        <option ${t.status==='待辦'?'selected':''}>待辦</option>
        <option ${t.status==='進行中'?'selected':''}>進行中</option>
        <option ${t.status==='已完成'?'selected':''}>已完成</option>
      </select>`:''}
    </div>`;
  }).join('');
  c.innerHTML=`<div class="sec-label">任務清單（${m.tasks.length}項）</div>
    ${rows||'<div style="text-align:center;padding:30px;color:var(--faint);font-size:13px">尚無任務</div>'}
    ${canEdit?`<div class="add-task-area">
      <input class="input-task" id="newTask" placeholder="輸入任務..." onkeydown="if(event.key==='Enter')addTask()">
      <select id="newAssignee">${m.attendeeIds.map(u=>`<option value="${u}">${esc(userName(u))}</option>`).join('')}</select>
      <select id="newPrio"><option value="normal">一般</option><option value="urgent">急件</option><option value="critical">緊急</option></select>
      <input id="newDue" type="date" style="width:130px">
      <button class="btn-add" onclick="addTask()">新增</button>
    </div>`:''}`;
}

// ── Progress ──
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
function renderChat(c,m){
  if(!m.chat)m.chat=[];
  const msgs=m.chat.map(msg=>`<div class="chat-msg">
    <div class="chat-avatar ${getAv(msg.userId)}" style="width:30px;height:30px;font-size:10px">${initials(userName(msg.userId))}</div>
    <div class="chat-content">
      <div class="chat-name">${esc(userName(msg.userId))}<span style="font-size:10px;color:var(--faint)">${esc(userTitle(msg.userId))}</span><span class="chat-time">${msg.time}</span></div>
      <div class="chat-bubble">${esc(msg.text)}</div>
    </div>
  </div>`).join('');
  c.style.cssText='padding:14px 20px 0';
  c.innerHTML=`<div class="chat-messages" id="chatMsgs">${msgs||'<div style="text-align:center;padding:30px;font-size:12px;color:var(--faint)">尚無訊息</div>'}</div>
    <div class="chat-input-wrap">
      <textarea class="chat-input" id="chatInput" rows="1" placeholder="輸入訊息（Enter 送出）" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChat();}"></textarea>
      <button class="btn-send" onclick="sendChat()">送出</button>
    </div>`;
  const box=document.getElementById('chatMsgs');if(box)box.scrollTop=box.scrollHeight;
}
function sendChat(){
  const m=store.meetings.find(x=>x.id===currentMeetingId);if(!m)return;
  const text=document.getElementById('chatInput').value.trim();if(!text)return;
  if(!m.chat)m.chat=[];
  m.chat.push({id:uid(),userId:currentUser.id,text,time:nowTime()});
  saveStore();renderTab();
}

// ── Votes ──
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
function deleteMeeting(){if(!confirm('確定刪除這場會議？'))return;store.meetings=store.meetings.filter(x=>x.id!==currentMeetingId);currentMeetingId=null;saveStore();renderSidebar();renderEmptyMain();}
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
    closeModal();saveStore();renderSidebar();renderMeetingMain();
  } else {
    const id=uid();const reads={};
    attendeeIds.forEach(u=>{reads[u]={read:u===currentUser.id,time:u===currentUser.id?nowTime():null};});
    store.meetings.push({id,title,date,attendeeIds,notes,tasks:[],chat:[],votes:[],reads});
    closeModal();saveStore();renderSidebar();selectMeeting(id);
  }
}

// ══════════════════════════════════════════
// SHIFT HANDOVER
// ══════════════════════════════════════════
function renderShiftPage(c){
  c.innerHTML=`<div class="admin-layout">
    <div class="main-header">
      <div><h1>交班紀錄</h1><div class="main-header-meta">早班 06:00 / 午班 14:00 / 夜班 22:00</div></div>
      <button class="btn-sm primary" onclick="openNewShift()">＋ 新增交班</button>
    </div>
    <div class="admin-content" id="shiftList"></div>
  </div>`;
  renderShiftList();
}
function shiftLabel(s){
  if(s==='morning')return'<span class="shift-badge shift-morning">🌅 早班</span>';
  if(s==='afternoon')return'<span class="shift-badge shift-afternoon">☀️ 午班</span>';
  return'<span class="shift-badge shift-night">🌙 夜班</span>';
}
function renderShiftList(){
  const c=document.getElementById('shiftList');if(!c)return;
  const sorted=[...store.shifts].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));
  const html=sorted.map(s=>{
    const canSign=s.toUserId===currentUser.id&&!s.toSigned;
    return`<div class="handover-card ${s.fromSigned&&s.toSigned?'signed':''}">
      <div class="hc-header">
        ${shiftLabel(s.shift)}
        <div class="hc-title">${esc(s.unit)}</div>
        <span style="font-size:12px;color:var(--faint)">${fmtDate(s.date)}</span>
        ${s.fromSigned&&s.toSigned?'<span class="sign-chip sign-done">✓ 完成交接</span>':''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="handover-field"><label>病患狀況</label><p>${esc(s.patients)}</p></div>
        <div class="handover-field"><label>本班重要事件</label><p>${esc(s.keyEvents)}</p></div>
        <div class="handover-field"><label>待辦事項</label><p>${esc(s.pending)}</p></div>
        <div class="handover-field"><label>用藥注意</label><p>${esc(s.meds)}</p></div>
      </div>
      <div class="sign-row">
        <span style="font-size:12px;color:var(--muted)">交班：</span>${avatarEl(s.fromUserId,20)}<span style="font-size:12px">${esc(userName(s.fromUserId))}</span>
        <span class="sign-chip ${s.fromSigned?'sign-done':'sign-pending'}"><span class="sign-dot"></span>${s.fromSigned?'已簽收':'待簽'}</span>
        <span style="font-size:12px;color:var(--muted);margin-left:8px">接班：</span>${avatarEl(s.toUserId,20)}<span style="font-size:12px">${esc(userName(s.toUserId))}</span>
        <span class="sign-chip ${s.toSigned?'sign-done':'sign-pending'}"><span class="sign-dot"></span>${s.toSigned?'已簽收':'待簽'}</span>
        ${canSign?`<button class="btn-sm primary" style="margin-left:auto" onclick="signShift('${s.id}')">✓ 簽收確認</button>`:''}
      </div>
    </div>`;
  }).join('');
  c.innerHTML=html||'<div style="text-align:center;padding:40px;color:var(--faint);font-size:13px">尚無交班紀錄</div>';
}
function signShift(id){
  const s=store.shifts.find(x=>x.id===id);if(!s)return;
  s.toSigned=true;saveStore();renderShiftList();
}
function openNewShift(){
  const nurseOpts=store.users.map(u=>`<option value="${u.id}">${esc(u.name)} (${esc(userDept(u.id))})</option>`).join('');
  showModal('新增交班紀錄',`
    <div class="form-row"><label>病房/單位</label><input id="shUnit" placeholder="例：內科 3A 病房"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-row"><label>日期</label><input id="shDate" type="date" value="${today()}"></div>
      <div class="form-row"><label>班別</label><select id="shShift"><option value="morning">早班</option><option value="afternoon">午班</option><option value="night">夜班</option></select></div>
      <div class="form-row"><label>交班人</label><select id="shFrom">${nurseOpts}</select></div>
      <div class="form-row"><label>接班人</label><select id="shTo">${nurseOpts}</select></div>
    </div>
    <div class="form-row"><label>病患狀況</label><textarea id="shPatients" placeholder="目前收治人數、特殊狀況..."></textarea></div>
    <div class="form-row"><label>本班重要事件</label><textarea id="shEvents" placeholder="異常事件、病患警示..."></textarea></div>
    <div class="form-row"><label>待辦事項</label><textarea id="shPending" placeholder="未完成項目、需交接事項..."></textarea></div>
    <div class="form-row"><label>用藥注意</label><input id="shMeds" placeholder="藥物異常、庫存不足...">
  </div>`,saveShift);
}
function saveShift(){
  const unit=document.getElementById('shUnit').value.trim();if(!unit)return;
  store.shifts.unshift({
    id:uid(),unit,date:document.getElementById('shDate').value,
    shift:document.getElementById('shShift').value,
    fromUserId:document.getElementById('shFrom').value,
    toUserId:document.getElementById('shTo').value,
    patients:document.getElementById('shPatients').value,
    keyEvents:document.getElementById('shEvents').value,
    pending:document.getElementById('shPending').value,
    meds:document.getElementById('shMeds').value,
    fromSigned:true,toSigned:false,createdAt:today()+' '+nowTime()
  });
  saveStore();closeModal();renderShiftList();
}

// ══════════════════════════════════════════
// ANNOUNCEMENTS
// ══════════════════════════════════════════
function updateMarquee(){
  const inner=document.getElementById('marqueeInner');
  if(!inner)return;
  const anns=(store.announcements||[]).slice(0,15);
  if(!anns.length){inner.innerHTML='';return;}
  const sep='<span class="marquee-sep">✦</span>';
  const items=anns.map(a=>`<span class="marquee-item" onclick="openAnnFromMarquee('${a.id}')">${esc(a.title)}</span>${sep}`).join('');
  // 複製一份讓 translateX(-50%) 動畫無縫循環
  inner.innerHTML=items+items;
}
function openAnnFromMarquee(id){
  setPage('announcements');
  setTimeout(function(){
    const el=document.querySelector('[data-ann-id="'+id+'"]');
    if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.style.outline='2px solid #d4af37';setTimeout(function(){el.style.outline='';},1800);}
  },120);
}
function updateAnnBadge(){
  if(!currentUser)return;
  const n=store.announcements.filter(a=>!a.reads[currentUser.id]).length;
  const b=document.getElementById('annBadge');if(b)b.style.display=n>0?'flex':'none';
}
function markAllAnnRead(){
  store.announcements.forEach(a=>{if(!a.reads[currentUser.id])a.reads[currentUser.id]=true;});
  saveStore();updateAnnBadge();
}
function renderAnnouncementsPage(c){
  c.innerHTML=`<div class="admin-layout">
    <div class="main-header">
      <div><h1>公告牆</h1><div class="main-header-meta">全院公告 · 感染管控警示</div></div>
      <div class="header-actions">
        ${isAdmin()?`<button class="btn-sm danger" onclick="openEmergencyBroadcast()">⚡ 緊急廣播</button>`:''}
        <button class="btn-sm primary" onclick="openAddAnn()">＋ 發布公告</button>
      </div>
    </div>
    <div class="admin-content" id="annList"></div>
  </div>`;
  renderAnnList();
}
function infLevelBadge(lv){
  if(lv==='red')return'<span class="ann-pin-badge" style="background:var(--red-bg);color:var(--red)">🔴 感染紅色警示</span>';
  if(lv==='orange')return'<span class="ann-pin-badge" style="background:var(--orange-bg);color:var(--orange)">🟠 感染橙色警示</span>';
  if(lv==='yellow')return'<span class="ann-pin-badge" style="background:var(--amber-bg);color:var(--amber)">🟡 感染黃色警示</span>';
  if(lv==='pinned')return'<span class="ann-pin-badge" style="background:var(--amber-bg);color:var(--amber)">📌 置頂</span>';
  return'';
}
function renderAnnList(){
  const c=document.getElementById('annList');if(!c)return;
  const sorted=[...store.announcements].sort((a,b)=>{
    const w=x=>x.infectionLevel==='red'?0:x.infectionLevel==='orange'?1:x.pinned?2:3;
    return w(a)-w(b)||b.time.localeCompare(a.time);
  });
  const allIds=store.users.map(u=>u.id);
  const cards=sorted.map((a,i)=>{
    const infClass=a.infectionLevel==='red'?'infection-red':a.infectionLevel==='orange'?'infection-orange':a.infectionLevel==='yellow'?'infection-yellow':a.pinned?'pinned':'';
    const badge=a.infectionLevel?infLevelBadge(a.infectionLevel):(a.pinned?infLevelBadge('pinned'):'');
    const readList=allIds.map(uid=>`<span class="ann-read-chip ${a.reads[uid]?'arc-read':'arc-unread'}">${a.reads[uid]?'✓':''} ${esc(userName(uid))}</span>`).join('');
    const myRead=a.reads[currentUser.id];
    return`<div class="ann-card ${infClass}" data-ann-id="${a.id}">
      ${badge}
      <div class="ann-header">${avatarEl(a.authorId,26)}<div class="ann-title-text">${esc(a.title)}</div></div>
      <div class="ann-body">${esc(a.body)}</div>
      <div class="ann-meta">${esc(userName(a.authorId))} · ${a.time}</div>
      <div class="ann-read-list">${readList}</div>
      <div class="ann-actions">
        ${!myRead?`<button class="btn-sm" onclick="readAnn('${a.id}')">✓ 標示已讀</button>`:'<span style="font-size:11px;color:var(--green)">✓ 已讀</span>'}
        ${isAdmin()?`<button class="btn-sm" onclick="togglePin('${a.id}')">${a.pinned?'取消置頂':'📌 置頂'}</button>
        <button class="btn-sm danger" onclick="deleteAnn('${a.id}')">刪除</button>`:''}
      </div>
    </div>`;
  }).join('');
  c.innerHTML=cards||'<div style="text-align:center;padding:40px;color:var(--faint);font-size:13px">尚無公告</div>';
}
function openAddAnn(){
  showModal('發布公告',`
    <div class="form-row"><label>標題</label><input id="annTitle" placeholder="公告主旨"></div>
    <div class="form-row"><label>內容</label><textarea id="annBody" placeholder="詳細說明..."></textarea></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-row"><label>類別</label><select id="annCat"><option value="general">一般公告</option><option value="infection">感染管控</option><option value="admin">行政通知</option><option value="training">教育訓練</option></select></div>
      <div class="form-row"><label>感染警示等級</label><select id="annInf"><option value="">（無）</option><option value="yellow">🟡 黃色</option><option value="orange">🟠 橙色</option><option value="red">🔴 紅色</option></select></div>
    </div>
    <div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="annPinned"> 置頂公告</label></div>`,saveAnn);
}
function saveAnn(){
  const title=document.getElementById('annTitle').value.trim();
  const body=document.getElementById('annBody').value.trim();
  if(!title||!body)return;
  const reads={};store.users.forEach(u=>reads[u.id]=u.id===currentUser.id);
  store.announcements.unshift({id:uid(),title,body,authorId:currentUser.id,
    time:today()+' '+nowTime(),pinned:document.getElementById('annPinned').checked,
    category:document.getElementById('annCat').value,
    infectionLevel:document.getElementById('annInf').value,reads});
  saveStore();closeModal();renderAnnList();updateAnnBadge();updateMarquee();
}
function readAnn(id){const a=store.announcements.find(x=>x.id===id);if(a)a.reads[currentUser.id]=true;saveStore();renderAnnList();updateAnnBadge();}
function togglePin(id){const a=store.announcements.find(x=>x.id===id);if(a)a.pinned=!a.pinned;saveStore();renderAnnList();}
function deleteAnn(id){if(!confirm('確定刪除？'))return;store.announcements=store.announcements.filter(x=>x.id!==id);saveStore();renderAnnList();updateMarquee();}

// ══════════════════════════════════════════
// EMERGENCY BROADCAST
// ══════════════════════════════════════════
function openEmergencyBroadcast(){
  showModal('⚡ 發送緊急廣播',`
    <div style="background:var(--red-bg);border:1px solid #f0c0c0;border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:14px;font-size:13px;color:var(--red)">
      ⚠ 緊急廣播將強制所有在線用戶收到彈出通知，需本人確認已讀。
    </div>
    <div class="form-row"><label>緊急等級</label><select id="emBroadcastLevel">
      <option value="green">🟢 一般通知</option>
      <option value="yellow">🟡 黃色警示</option>
      <option value="orange">🟠 橙色警示</option>
      <option value="red">🔴 紅色緊急</option>
    </select></div>
    <div class="form-row"><label>標題</label><input id="emBroadcastTitle" placeholder="緊急事件標題..."></div>
    <div class="form-row"><label>詳細說明</label><textarea id="emBroadcastBody" placeholder="請說明緊急事件詳情、應對措施..."></textarea></div>`,sendEmergency);
}
function sendEmergency(){
  var _etEl=document.getElementById('emBroadcastTitle')||document.getElementById('emTitle');
  var _ebEl=document.getElementById('emBroadcastBody')||document.getElementById('emBody');
  var _elEl=document.getElementById('emBroadcastLevel')||document.getElementById('emLevel');
  if(!_etEl||!_etEl.value)return;
  const title=_etEl.value.trim();
  const body=_ebEl?_ebEl.value.trim():'';
  if(!title)return;
  const level=_elEl?_elEl.value:'green';
  const confirms={};
  confirms[currentUser.id]=true;
  const em={id:uid(),title,body,level,authorId:currentUser.id,time:today()+' '+nowTime(),confirms};
  store.emergencies.push(em);
  store.announcements.unshift({id:uid(),title:'⚡ '+title,body,authorId:currentUser.id,
    time:today()+' '+nowTime(),pinned:true,category:'emergency',infectionLevel:level==='red'?'red':level==='orange'?'orange':level==='yellow'?'yellow':'',
    reads:Object.fromEntries(store.users.map(u=>[u.id,u.id===currentUser.id]))});
  saveStore();closeModal();showEmergencyOverlay(em);
}
function checkPendingEmergency(){
  const pending=store.emergencies.find(e=>!e.confirms[currentUser.id]);
  if(pending)showEmergencyOverlay(pending);
}
function showEmergencyOverlay(em){
  const levelLabels={green:'一般通知',yellow:'🟡 黃色警示',orange:'🟠 橙色警示',red:'🔴 紅色緊急'};
  const levelColors={green:'background:#d1fae5;color:#065f46',yellow:'background:var(--amber-bg);color:var(--amber)',orange:'background:var(--orange-bg);color:var(--orange)',red:'background:var(--red-bg);color:var(--red)'};
  document.getElementById('emLevelBadge').textContent=levelLabels[em.level]||'緊急廣播';
  document.getElementById('emLevelBadge').style.cssText=levelColors[em.level]||levelColors.red;
  document.getElementById('emTitle').textContent||0;
  document.getElementById('emTitle').style&&(document.getElementById('emTitle').style.cssText='');
  document.getElementById('emTitle').textContent=em.title;
  document.getElementById('emBody').textContent=em.body;
  const confirmList=store.users.map(u=>`<div class="em-confirm-item">
    <div class="em-read-dot" style="background:${em.confirms[u.id]?'var(--green)':'#ccc'}"></div>
    <span style="font-size:12px">${esc(u.name)}</span>
    <span style="font-size:10px;color:var(--faint);margin-left:auto">${em.confirms[u.id]?'已確認':'待確認'}</span>
  </div>`).join('');
  document.getElementById('emConfirmList').innerHTML=confirmList;
  document.getElementById('emergencyOverlay').dataset.emId=em.id;
  document.getElementById('emergencyOverlay').classList.add('show');
}
function confirmEmergency(){
  const id=document.getElementById('emergencyOverlay').dataset.emId;
  const em=store.emergencies.find(x=>x.id===id);
  if(em)em.confirms[currentUser.id]=true;
  saveStore();
  document.getElementById('emergencyOverlay').classList.remove('show');
}

// ══════════════════════════════════════════
// INCIDENT REPORT
// ══════════════════════════════════════════
function updateIrBadge(){
  if(!currentUser)return;
  const n=store.incidents.filter(i=>i.status==='new').length;
  const b=document.getElementById('irBadge');if(b)b.style.display=n>0?'flex':'none';
}
const irLevels={1:{label:'Level 1 輕微',cls:'ir-l1'},2:{label:'Level 2 中度',cls:'ir-l2'},3:{label:'Level 3 重大',cls:'ir-l3'},4:{label:'Level 4 嚴重',cls:'ir-l4'}};
function renderIncidentPage(c){
  c.innerHTML=`<div class="admin-layout">
    <div class="main-header">
      <div><h1>異常事件通報</h1><div class="main-header-meta">Incident Report · 追蹤處理進度</div></div>
      <button class="btn-sm primary" onclick="openNewIR()">＋ 新增通報</button>
    </div>
    <div class="admin-content" id="irList"></div>
  </div>`;
  renderIRList();
}
function renderIRList(){
  const c=document.getElementById('irList');if(!c)return;
  const sorted=[...store.incidents].sort((a,b)=>{
    const sw={new:0,processing:1,closed:2};
    return (sw[a.status]||0)-(sw[b.status]||0)||b.date.localeCompare(a.date);
  });
  const html=sorted.map(ir=>{
    const lv=irLevels[ir.level]||irLevels[1];
    const st=ir.status==='new'?'<span class="ir-status ir-new">新通報</span>':ir.status==='processing'?'<span class="ir-status ir-processing">處理中</span>':'<span class="ir-status ir-closed">已結案</span>';
    return`<div class="ir-card ${lv.cls}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;gap:8px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="ir-level ${lv.cls}">${lv.label}</span>${st}
          <span style="font-size:11px;color:var(--faint)">${fmtDate(ir.date)} · ${esc(userDept(ir.reporterId))}</span>
        </div>
        ${isAdmin()?`<select class="task-select" onchange="updateIRStatus('${ir.id}',this.value)">
          <option ${ir.status==='new'?'selected':''} value="new">新通報</option>
          <option ${ir.status==='processing'?'selected':''} value="processing">處理中</option>
          <option ${ir.status==='closed'?'selected':''} value="closed">已結案</option>
        </select>`:''}
      </div>
      <div style="font-size:14px;font-weight:600;margin-bottom:8px">${esc(ir.title)}</div>
      <div style="font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:10px">${esc(ir.description)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><div style="font-size:10px;font-weight:700;color:var(--faint);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">已採取行動</div>
          <div style="font-size:12px;color:var(--muted);background:var(--bg);border-radius:var(--radius-sm);padding:8px 10px">${esc(ir.actions)||'—'}</div></div>
        <div><div style="font-size:10px;font-weight:700;color:var(--faint);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">後續追蹤</div>
          <div style="font-size:12px;color:var(--muted);background:var(--bg);border-radius:var(--radius-sm);padding:8px 10px">${esc(ir.followUp)||'—'}</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--b1)">
        ${avatarEl(ir.reporterId,20)}<span style="font-size:12px;color:var(--muted)">通報人：${esc(userName(ir.reporterId))}</span>
      </div>
    </div>`;
  }).join('');
  c.innerHTML=html||'<div style="text-align:center;padding:40px;color:var(--faint);font-size:13px">尚無通報紀錄</div>';
}
function openNewIR(){
  const deptOpts=store.departments.map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join('');
  showModal('新增異常事件通報',`
    <div style="background:var(--amber-bg);border:1px solid #f0d890;border-radius:var(--radius-sm);padding:8px 12px;margin-bottom:12px;font-size:12px;color:var(--amber)">所有通報均為機密，僅管理員與科主任可查閱。</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-row"><label>事件日期</label><input id="irDate" type="date" value="${today()}"></div>
      <div class="form-row"><label>事件等級</label><select id="irLevel">
        <option value="1">Level 1 輕微</option><option value="2">Level 2 中度</option>
        <option value="3">Level 3 重大</option><option value="4">Level 4 嚴重</option>
      </select></div>
    </div>
    <div class="form-row"><label>事件主旨</label><input id="irTitle" placeholder="簡短描述事件性質"></div>
    <div class="form-row"><label>詳細描述</label><textarea id="irDesc" placeholder="事件發生經過、涉及人員..."></textarea></div>
    <div class="form-row"><label>已採取行動</label><textarea id="irActions" placeholder="已做什麼處置..."></textarea></div>
    <div class="form-row"><label>後續追蹤</label><input id="irFollowUp" placeholder="需追蹤或改善事項..."></div>`,saveIR);
}
function saveIR(){
  const title=document.getElementById('irTitle').value.trim();if(!title)return;
  store.incidents.unshift({id:uid(),title,description:document.getElementById('irDesc').value,
    reporterId:currentUser.id,deptId:currentUser.deptId,
    level:document.getElementById('irLevel').value,status:'new',
    date:document.getElementById('irDate').value,
    actions:document.getElementById('irActions').value,
    followUp:document.getElementById('irFollowUp').value});
  saveStore();closeModal();renderIRList();updateIrBadge();
}
function updateIRStatus(id,v){
  const ir=store.incidents.find(x=>x.id===id);if(ir)ir.status=v;
  saveStore();renderIRList();updateIrBadge();
}

// ══════════════════════════════════════════
// CALENDAR
// ══════════════════════════════════════════
let calYear=new Date().getFullYear(),calMonth=new Date().getMonth();
function renderCalendarPage(c){
  c.innerHTML=`<div class="admin-layout">
    <div class="main-header">
      <div><h1>行事曆</h1><div class="main-header-meta">會議 · 交班 · 值班排程</div></div>
    </div>
    <div class="admin-content" id="calWrap"></div>
  </div>`;
  renderCalendar();
}
function renderCalendar(){
  const w=document.getElementById('calWrap');if(!w)return;
  const days=['日','一','二','三','四','五','六'];
  const first=new Date(calYear,calMonth,1);
  const last=new Date(calYear,calMonth+1,0);
  const startDay=first.getDay();
  const cells=[];
  for(let i=0;i<startDay;i++){
    const d=new Date(calYear,calMonth,-(startDay-1-i));
    cells.push({date:d,current:false});
  }
  for(let d=1;d<=last.getDate();d++)cells.push({date:new Date(calYear,calMonth,d),current:true});
  while(cells.length%7!==0)cells.push({date:new Date(calYear,calMonth+1,cells.length-last.getDate()-startDay+1),current:false});

  const dayLabels=days.map(d=>`<div class="cal-day-label">${d}</div>`).join('');
  const cellHtml=cells.map(cell=>{
    const ds=cell.date.toISOString().split('T')[0];
    const isToday=ds===today();
    const meetings=store.meetings.filter(m=>m.date===ds);
    const shifts=store.shifts.filter(s=>s.date===ds);
    const events=[
      ...meetings.map(m=>`<div class="cal-event cal-event-meeting" onclick="event.stopPropagation();selectMeeting('${m.id}');setPage('meetings')" title="${esc(m.title)}">${esc(m.title)}</div>`),
      ...shifts.map(s=>`<div class="cal-event cal-event-shift" title="${esc(s.unit)}">${s.shift==='morning'?'早':s.shift==='afternoon'?'午':'夜'} ${esc(s.unit)}</div>`)
    ].join('');
    return`<div class="cal-cell ${isToday?'today':''} ${!cell.current?'other-month':''}">
      <div class="cal-date-num">${cell.date.getDate()}</div>${events}
    </div>`;
  }).join('');

  w.innerHTML=`<div class="cal-header">
    <div class="cal-nav">
      <button onclick="calNav(-1)">‹</button>
      <div class="cal-title">${calYear} 年 ${calMonth+1} 月</div>
      <button onclick="calNav(1)">›</button>
    </div>
    <button class="btn-sm" onclick="calYear=new Date().getFullYear();calMonth=new Date().getMonth();renderCalendar()">今天</button>
  </div>
  <div class="cal-grid-header">${dayLabels}</div>
  <div class="cal-grid">${cellHtml}</div>
  <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
    <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)"><span style="width:10px;height:10px;background:var(--blue-bg);border-radius:2px;display:inline-block"></span>會議</span>
    <span style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted)"><span style="width:10px;height:10px;background:var(--green-bg);border-radius:2px;display:inline-block"></span>交班</span>
  </div>`;
}
function calNav(dir){calMonth+=dir;if(calMonth>11){calMonth=0;calYear++;}else if(calMonth<0){calMonth=11;calYear--;}renderCalendar();}

// ══════════════════════════════════════════
// STATISTICS
// ══════════════════════════════════════════
function renderStatsPage(c){
  const allTasks=store.meetings.flatMap(m=>m.tasks);
  const doneTasks=allTasks.filter(t=>t.status==='已完成').length;
  const overdueTasks=allTasks.filter(t=>t.status!=='已完成'&&t.due&&t.due<today()).length;
  const critTasks=allTasks.filter(t=>t.priority==='critical').length;
  const taskRate=allTasks.length?Math.round(doneTasks/allTasks.length*100):0;
  const irOpen=store.incidents.filter(i=>i.status!=='closed').length;
  const annReadRates=store.announcements.map(a=>{
    const total=store.users.length;
    const read=Object.values(a.reads).filter(Boolean).length;
    return{title:a.title,pct:total?Math.round(read/total*100):0};
  });
  const meetingReadRates=store.meetings.map(m=>{
    const total=m.attendeeIds.length;
    const read=Object.values(m.reads||{}).filter(r=>r.read).length;
    return{title:m.title,pct:total?Math.round(read/total*100):0};
  });
  const userTaskStats=store.users.map(u=>{
    const assigned=allTasks.filter(t=>t.assigneeId===u.id);
    const done=assigned.filter(t=>t.status==='已完成').length;
    return{name:u.name,uid:u.id,total:assigned.length,done,pct:assigned.length?Math.round(done/assigned.length*100):0};
  }).filter(u=>u.total>0).sort((a,b)=>b.pct-a.pct);

  c.innerHTML=`<div class="admin-layout">
    <div class="main-header"><div><h1>統計報表</h1><div class="main-header-meta">任務完成率 · 公告閱讀率 · 事件統計</div></div></div>
    <div class="admin-content">
      <div class="metric-grid">
        <div class="metric-box"><div class="metric-num" style="color:var(--green)">${taskRate}%</div><div class="metric-lbl">任務完成率</div></div>
        <div class="metric-box"><div class="metric-num">${allTasks.length}</div><div class="metric-lbl">總任務數</div></div>
        <div class="metric-box"><div class="metric-num" style="color:var(--red)">${overdueTasks}</div><div class="metric-lbl">逾期任務</div></div>
        <div class="metric-box"><div class="metric-num" style="color:var(--red)">${critTasks}</div><div class="metric-lbl">緊急任務</div></div>
        <div class="metric-box"><div class="metric-num">${store.meetings.length}</div><div class="metric-lbl">會議總數</div></div>
        <div class="metric-box"><div class="metric-num" style="color:${irOpen>0?'var(--red)':'var(--green)'}">${irOpen}</div><div class="metric-lbl">未結案通報</div></div>
      </div>

      <div class="stat-card">
        <div class="stat-card-title">成員任務完成率</div>
        ${userTaskStats.map(u=>`<div class="bar-row">
          <div class="bar-label">${esc(u.name)}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${u.pct}%;background:${u.pct===100?'var(--green)':u.pct>50?'var(--amber)':'var(--red)'}"></div></div>
          <div class="bar-pct">${u.pct}%</div>
        </div>`).join('')||'<div style="color:var(--faint);font-size:13px">尚無任務資料</div>'}
      </div>

      <div class="stat-card">
        <div class="stat-card-title">公告閱讀率</div>
        ${annReadRates.slice(0,6).map(a=>`<div class="bar-row">
          <div class="bar-label">${esc(a.title.slice(0,8))}...</div>
          <div class="bar-track"><div class="bar-fill" style="width:${a.pct}%;background:var(--blue)"></div></div>
          <div class="bar-pct">${a.pct}%</div>
        </div>`).join('')||'<div style="color:var(--faint);font-size:13px">尚無公告</div>'}
      </div>

      <div class="stat-card">
        <div class="stat-card-title">會議紀錄閱讀率</div>
        ${meetingReadRates.slice(0,6).map(m=>`<div class="bar-row">
          <div class="bar-label">${esc(m.title.slice(0,8))}...</div>
          <div class="bar-track"><div class="bar-fill" style="width:${m.pct}%;background:var(--teal)"></div></div>
          <div class="bar-pct">${m.pct}%</div>
        </div>`).join('')||'<div style="color:var(--faint);font-size:13px">尚無資料</div>'}
      </div>

      <div class="stat-card">
        <div class="stat-card-title">異常事件統計</div>
        <div class="metric-grid" style="grid-template-columns:repeat(4,1fr)">
          ${['1','2','3','4'].map(lv=>{
            const cnt=store.incidents.filter(i=>i.level===lv).length;
            const l=irLevels[lv];
            return`<div class="metric-box"><div class="metric-num">${cnt}</div><div class="metric-lbl">${l.label}</div></div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

// ══════════════════════════════════════════
// DEPARTMENTS & USERS
// ══════════════════════════════════════════
function renderDepartmentsPage(c){
  c.innerHTML=`<div class="admin-layout">
    <div class="main-header"><div><h1>科別管理</h1><div class="main-header-meta">醫院科別 · 病房架構</div></div>
      <button class="btn-sm primary" onclick="openAddDept()">＋ 新增科別</button>
    </div>
    <div class="admin-content" id="deptContent"></div>
  </div>`;
  renderDeptContent();
}
function renderDeptContent(){
  const c=document.getElementById('deptContent');if(!c)return;
  const cards=store.departments.map(d=>{
    const members=store.users.filter(u=>u.deptId===d.id);
    const mHtml=members.map(u=>`<div class="member-mini">${avatarEl(u.id,20)}<span>${esc(u.name)}</span><span class="title-chip">${esc(u.title||'')}</span></div>`).join('');
    return`<div class="dept-card">
      <div class="dept-card-name">${esc(d.name)}</div>
      <div class="dept-card-meta">${members.length} 位成員</div>
      <div style="margin-top:10px;border-top:1px solid var(--b1);padding-top:8px">${mHtml||'<span style="font-size:12px;color:var(--faint)">尚無成員</span>'}</div>
      <div class="dept-card-actions">
        <button class="btn-ghost" style="padding:5px 10px;border-radius:var(--radius-sm);border:1px solid var(--b2);background:transparent;color:var(--muted);font-size:12px;font-family:inherit;cursor:pointer" onclick="openEditDept('${d.id}')">編輯</button>
        <button class="btn-ghost" style="padding:5px 10px;border-radius:var(--radius-sm);border:1px solid var(--b2);background:transparent;color:var(--red);font-size:12px;font-family:inherit;cursor:pointer" onclick="deleteDept('${d.id}')">刪除</button>
      </div>
    </div>`;
  }).join('');
  c.innerHTML=`<div class="sec-label">科別列表（${store.departments.length}）</div><div class="card-grid">${cards}</div>`;
}
function openAddDept(){showModal('新增科別',`<div class="form-row"><label>科別名稱</label><input id="deptName" placeholder="例：內科部"></div>`,()=>{const n=document.getElementById('deptName').value.trim();if(!n)return;store.departments.push({id:uid(),name:n});saveStore();closeModal();renderDeptContent();});}
function openEditDept(id){const d=store.departments.find(x=>x.id===id);showModal('編輯科別',`<div class="form-row"><label>科別名稱</label><input id="deptName" value="${esc(d.name)}"></div>`,()=>{const n=document.getElementById('deptName').value.trim();if(!n)return;d.name=n;saveStore();closeModal();renderDeptContent();});}
function deleteDept(id){const m=store.users.filter(u=>u.deptId===id);if(m.length&&!confirm(`此科別有 ${m.length} 位成員，確定刪除？`))return;store.departments=store.departments.filter(x=>x.id!==id);store.users.forEach(u=>{if(u.deptId===id)u.deptId='';});saveStore();renderDeptContent();}

function renderUsersPage(c){
  c.innerHTML=`<div class="admin-layout">
    <div class="main-header"><div><h1>人員管理</h1><div class="main-header-meta">帳號 · 科別 · 職稱 · 角色權限</div></div>
      <button class="btn-sm primary" onclick="openAddUser()">＋ 新增人員</button>
    </div>
    <div class="admin-content" id="userContent"></div>
  </div>`;
  renderUserContent();
}
function renderUserContent(){
  const c=document.getElementById('userContent');if(!c)return;
  const rows=store.users.map(u=>`<tr>
    <td><div style="display:flex;align-items:center;gap:9px">${avatarEl(u.id,28)}<div><div style="font-size:13px;font-weight:500">${esc(u.name)}</div><div style="font-size:11px;color:var(--faint)">@${esc(u.username)}</div></div></div></td>
    <td>${u.deptId?`<span class="dept-chip">${esc(userDept(u.id))}</span>`:'—'}</td>
    <td>${u.title?`<span class="title-chip">${esc(u.title)}</span>`:'—'}</td>
    <td><span class="role-badge ${u.role==='admin'?'rb-admin':'rb-member'}">${u.role==='admin'?'管理員':'一般'}</span></td>
    <td><div style="display:flex;gap:6px">
      <button class="btn-sm" onclick="openEditUser('${u.id}')">編輯</button>
      ${u.id!==currentUser.id?`<button class="btn-sm danger" onclick="deleteUser('${u.id}')">刪除</button>`:'<span style="font-size:11px;color:var(--faint);padding:5px 6px">本人</span>'}
    </div></td>
  </tr>`).join('');
  c.innerHTML=`<div class="table-wrap"><table><thead><tr><th>姓名/帳號</th><th>科別</th><th>職稱</th><th>角色</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function userFormHtml(u){
  const dOpts=store.departments.map(d=>`<option value="${d.id}" ${u&&u.deptId===d.id?'selected':''}>${esc(d.name)}</option>`).join('');
  const tOpts=store.titles.map(t=>`<option ${u&&u.title===t?'selected':''}>${esc(t)}</option>`).join('');
  const avOpts=AVCOLORS.map((av,i)=>`<option value="${av}" ${u&&u.avatar===av?'selected':''}>顏色 ${i+1}</option>`).join('');
  return`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    <div class="form-row"><label>姓名</label><input id="uName" value="${esc(u?.name||'')}"></div>
    <div class="form-row"><label>帳號</label><input id="uUsername" value="${esc(u?.username||'')}"></div>
    <div class="form-row"><label>密碼 ${u?'（留空不改）':''}</label><input id="uPassword" type="password" placeholder="${u?'留空維持':'設定密碼'}"></div>
    <div class="form-row"><label>頭像顏色</label><select id="uAvatar">${avOpts}</select></div>
    <div class="form-row"><label>科別</label><select id="uDept"><option value="">（無）</option>${dOpts}</select></div>
    <div class="form-row"><label>職稱</label><select id="uTitle"><option value="">（無）</option>${tOpts}</select></div>
    <div class="form-row"><label>角色</label><select id="uRole"><option value="member" ${u?.role==='member'?'selected':''}>一般成員</option><option value="admin" ${u?.role==='admin'?'selected':''}>管理員</option></select></div>
  </div>`;
}
let editingUserId=null;
function openAddUser(){editingUserId=null;showModal('新增人員',userFormHtml(null),saveUser);}
function openEditUser(id){editingUserId=id;const u=store.users.find(x=>x.id===id);showModal('編輯人員',userFormHtml(u),saveUser);}
function saveUser(){
  const name=document.getElementById('uName').value.trim();
  const username=document.getElementById('uUsername').value.trim();
  const password=document.getElementById('uPassword').value;
  if(!name||!username){alert('姓名和帳號為必填');return;}
  if(store.users.find(u=>u.username===username&&u.id!==editingUserId)){alert('帳號已被使用');return;}
  const data={name,username,deptId:document.getElementById('uDept').value,title:document.getElementById('uTitle').value,role:document.getElementById('uRole').value,avatar:document.getElementById('uAvatar').value};
  if(editingUserId){
    const u=store.users.find(x=>x.id===editingUserId);
    Object.assign(u,data);if(password)u.password=password;
    if(u.id===currentUser.id){currentUser=u;updateNavUser();}
  } else {
    if(!password){alert('請設定密碼');return;}
    store.users.push({id:uid(),...data,password});
  }
  saveStore();closeModal();renderUserContent();
}
function deleteUser(id){if(!confirm('確定刪除此人員？'))return;store.users=store.users.filter(x=>x.id!==id);saveStore();renderUserContent();}

// ══════════════════════════════════════════
// CHANGE PASSWORD
// ══════════════════════════════════════════
function openChangePassword(){
  document.getElementById('profileMenu').classList.remove('open');
  showModal('修改密碼',`<div class="form-row"><label>舊密碼</label><input id="oldPass" type="password"></div>
    <div class="form-row"><label>新密碼</label><input id="newPass" type="password"></div>
    <div class="form-row"><label>確認新密碼</label><input id="confirmPass" type="password"></div>`,
  ()=>{
    const old=document.getElementById('oldPass').value;
    const nw=document.getElementById('newPass').value;
    const conf=document.getElementById('confirmPass').value;
    if(currentUser.password!==old){alert('舊密碼錯誤');return;}
    if(nw!==conf){alert('兩次密碼不一致');return;}
    if(nw.length<4){alert('密碼至少4碼');return;}
    currentUser.password=nw;const u=store.users.find(x=>x.id===currentUser.id);if(u)u.password=nw;
    saveStore();closeModal();alert('密碼已更新');
  });
}

// ══════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════
let modalSaveFn=null;
function showModal(title,bodyHtml,onSave){
  modalSaveFn=onSave;
  document.getElementById('modalContent').innerHTML=`<h2>${esc(title)}</h2>${bodyHtml}
    <div class="modal-footer">
      <button class="btn-cancel" onclick="closeModal()">取消</button>
      <button class="btn-save" onclick="if(modalSaveFn)modalSaveFn()">儲存</button>
    </div>`;
  document.getElementById('overlay').classList.add('open');
}
function closeModal(){document.getElementById('overlay').classList.remove('open');}
document.getElementById('overlay').onclick=function(e){if(e.target===this)closeModal();};

function hideSidebar(){const sb=document.getElementById('sidebar');if(sb)sb.style.display='none';}

// 新功能預設資料
function dBabies(){return [
  {id:'b1',name:'小睿寶',gender:'boy',weight:'3.2kg',height:'50cm',born:today()+' 06:22',mom:'床位 301',nurse:'u3',note:'順產，母嬰均安！',emoji:'👶'},
  {id:'b2',name:'小希寶',gender:'girl',weight:'2.9kg',height:'48cm',born:today()+' 09:15',mom:'床位 308',nurse:'u6',note:'母嬰平安！',emoji:'🌸'},
];}
function dRooms(){return [
  {id:'r1',name:'產房 A',status:'active',patient:'張○○',since:'09:15',note:'第一胎，38週'},
  {id:'r2',name:'產房 B',status:'recovery',patient:'林○○',since:'07:30',note:'剖腹產後恢復'},
  {id:'r3',name:'產房 C',status:'waiting',patient:'王○○',since:'10:45',note:'宮縮5分鐘一次'},
  {id:'r4',name:'產房 D',status:'empty',patient:'',since:'',note:''},
  {id:'r5',name:'LDR 1',status:'waiting',patient:'陳○○',since:'08:20',note:'待產觀察中'},
  {id:'r6',name:'LDR 2',status:'empty',patient:'',since:'',note:''},
  {id:'r7',name:'手術室 1',status:'clean',patient:'',since:'11:00',note:'清潔中'},
  {id:'r8',name:'恢復室',status:'recovery',patient:'劉○○',since:'06:50',note:'生產後觀察'},
];}
function dForms(){return [
  {id:'f1',type:'leave',title:'特休假申請 4/15',applicantId:'u3',date:today(),startDate:'2026-04-15',endDate:'2026-04-16',reason:'私人事務',approvers:['u2'],statuses:['approved'],status:'approved',createdAt:addD(today(),-1)},
  {id:'f2',type:'overtime',title:'加班申請 本週夜班',applicantId:'u6',date:today(),startDate:today(),endDate:today(),reason:'人力不足',approvers:['u3','u2'],statuses:['approved','pending'],status:'pending',createdAt:today()},
];}
function dJournals(){return [
  {id:'j1',userId:'u3',date:today(),mood:'good',content:'今日護病比正常，308床媽媽哺乳順利。301床寶寶黃疸數值下降，家屬安心許多。',createdAt:today()+' 16:30'},
  {id:'j2',userId:'u6',date:addD(today(),-1),mood:'tired',content:'昨晚夜班比較忙，急產一位，陪產到天亮。媽媽和寶寶都平安，值得！',createdAt:addD(today(),-1)+' 08:10'},
];}
function dEdu(){return [
  {id:'e1',title:'母乳哺餵指南',icon:'🤱',tags:['br'],desc:'含乳姿勢、哺乳頻率、脹奶處理等完整說明。',content:'【正確含乳】寶寶嘴巴應張大含住乳暈，含乳正確時不應感到疼痛。\n\n【哺乳頻率】新生兒每2-3小時哺餵，每次約15-20分鐘，按需哺乳。\n\n【脹奶處理】熱敷後輕柔按摩，讓寶寶頻繁吸吮。\n\n【保存方式】室溫4小時，冷藏3-5天，冷凍3-6個月。'},
  {id:'e2',title:'新生兒日常照護',icon:'👶',tags:['nb'],desc:'臍帶護理、洗澡、黃疸觀察等新生兒照護重點。',content:'【臍帶護理】保持乾燥，每次換尿布後用75%酒精清潔根部。\n\n【黃疸觀察】生理性黃疸7-10天消退，持續加深需就醫。\n\n【洗澡要點】水溫約38度，先臉後身體，保持溫暖。'},
  {id:'e3',title:'產後身心照護',icon:'🌸',tags:['pp'],desc:'傷口照護、惡露觀察、產後憂鬱辨識。',content:'【傷口照護】保持清潔乾燥，有紅腫熱痛立即告知護理師。\n\n【惡露觀察】由紅轉淡黃，約4-6週結束，異味或突增需通報。\n\n【產後憂鬱】持續2週以上情緒低落請主動尋求協助。'},
  {id:'e4',title:'營養與飲食建議',icon:'🥗',tags:['nu'],desc:'哺乳期飲食禁忌、發奶食物、補充營養重點。',content:'【哺乳期】避免辛辣、酒精，多喝溫熱湯品助泌乳。\n\n【發奶食物】豬腳花生湯、黑麻油雞、魚湯均有助泌乳。\n\n【鐵質補充】多攝取菠菜、豬肝、紅肉，搭配維生素C。'},
];}

// ── 表單附件 ──
let _pendingAttachment=null;
function handleAttachment(input){
  const file=input.files[0];
  if(!file){_pendingAttachment=null;document.getElementById('fattachPreview').innerHTML='';return;}
  if(file.size>819200){alert('檔案請勿超過 800 KB，請壓縮後再上傳');input.value='';return;}
  const r=new FileReader();
  r.onload=function(e){
    _pendingAttachment={name:file.name,mime:file.type,data:e.target.result};
    const prev=document.getElementById('fattachPreview');if(!prev)return;
    prev.innerHTML=file.type.startsWith('image/')
      ?'<img src="'+e.target.result+'" style="max-height:72px;max-width:180px;border-radius:6px;border:1px solid var(--b1);margin-top:4px;cursor:pointer" onclick="viewAttachment(\'__preview__\')">'
      :'<span style="font-size:11px;color:var(--muted);margin-top:4px;display:block">📎 '+esc(file.name)+'</span>';
  };
  r.readAsDataURL(file);
}
function viewAttachment(id){
  const f=id==='__preview__'?{attachment:_pendingAttachment}:store.formRequests.find(x=>x.id===id);
  if(!f||!f.attachment)return;
  const a=f.attachment;
  if(a.mime.startsWith('image/')){
    showModal('附件預覽','<div style="text-align:center"><img src="'+a.data+'" style="max-width:100%;max-height:60vh;border-radius:8px"></div><div style="text-align:center;margin-top:8px;font-size:12px;color:var(--muted)">'+esc(a.name)+'</div>',null);
    document.querySelector('.modal-footer').style.display='none';
  } else {
    const link=document.createElement('a');link.href=a.data;link.download=a.name;link.click();
  }
}

// mergeNewLocal：補足缺少的欄位，只存 localStorage，不推送到 Firebase
// 在 initApp() 登入後立即呼叫，避免用空的本機資料覆蓋雲端
function mergeNewLocal(){
  if(!store.babies)store.babies=dBabies();
  if(!store.rooms)store.rooms=dRooms();
  if(!store.formRequests)store.formRequests=dForms();
  if(!store.dutySchedule)store.dutySchedule={};
  if(!store.swapRequests)store.swapRequests=[];
  if(!store.journals)store.journals=dJournals();
  if(!store.eduItems)store.eduItems=dEdu();
  try{localStorage.setItem(STORE_KEY,JSON.stringify(store));}catch(e){}
}
// mergeNew：補足欄位後同步到 Firebase
// 只在已確認從雲端讀取資料後呼叫
function mergeNew(){
  if(!store.babies)store.babies=dBabies();
  if(!store.rooms)store.rooms=dRooms();
  if(!store.formRequests)store.formRequests=dForms();
  if(!store.dutySchedule)store.dutySchedule={};
  if(!store.swapRequests)store.swapRequests=[];
  if(!store.journals)store.journals=dJournals();
  if(!store.eduItems)store.eduItems=dEdu();
  saveStore();
}

// 寶寶牆
function renderBabyPage(c){
  c.innerHTML='<div class="admin-layout"><div class="main-header"><div><h1>🍼 寶寶牆</h1><div class="main-header-meta">新生兒出生公告</div></div><button class="btn-sm primary" onclick="openNewBaby()">+ 新增寶寶</button></div><div class="admin-content" id="babyC"></div></div>';
  rnBaby();
}
function rnBaby(){
  const c=document.getElementById('babyC');if(!c)return;
  const cnt=store.babies.filter(b=>b.born.startsWith(today().slice(0,7))).length;
  const cards=store.babies.map(b=>'<div class="baby-card"><div class="baby-ph">'+b.emoji+'</div><div class="baby-info"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><div class="baby-name">'+esc(b.name)+'</div><span class="'+(b.gender==='boy'?'bb-b':'bb-g')+'">'+(b.gender==='boy'?'男寶':'女寶')+'</span></div><div class="baby-meta"><span>⚖ '+esc(b.weight)+'</span><span>📏 '+esc(b.height)+'</span><span>🕐 '+esc(b.born)+'</span></div><div class="baby-meta" style="margin-top:3px"><span>🏥 '+esc(b.mom)+'</span></div>'+(b.note?'<div style="font-size:12px;color:var(--muted);margin-top:5px">'+esc(b.note)+'</div>':'')+'</div></div>').join('');
  c.innerHTML='<div style="text-align:center;margin-bottom:18px;padding:14px;background:linear-gradient(135deg,#fde8f0,#fff0f5);border-radius:var(--radius);border:1px solid rgba(196,82,122,0.15)"><div style="font-size:20px;margin-bottom:3px">本月共迎接 '+cnt+' 位新生命</div><div style="font-size:12px;color:var(--muted)">每個寶寶都是最珍貴的禮物</div></div><div class="baby-grid">'+cards+'</div>';
}
function openNewBaby(){
  const nOpts=store.users.map(u=>'<option value="'+u.id+'">'+esc(u.name)+'</option>').join('');
  showModal('新增寶寶公告','<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="form-row"><label>寶寶暱稱</label><input id="bn" placeholder="例：小睿寶"></div><div class="form-row"><label>性別</label><select id="bg"><option value="boy">男寶</option><option value="girl">女寶</option></select></div><div class="form-row"><label>體重</label><input id="bw" placeholder="例：3.2kg"></div><div class="form-row"><label>身高</label><input id="bh" placeholder="例：50cm"></div><div class="form-row"><label>出生時間</label><input id="bb" placeholder="'+today()+' 08:00"></div><div class="form-row"><label>媽媽床位</label><input id="bm" placeholder="例：床位 301"></div></div><div class="form-row"><label>負責護理師</label><select id="bnr">'+nOpts+'</select></div><div class="form-row"><label>祝福留言</label><input id="bnt" placeholder="例：母嬰均安！"></div>',
  ()=>{const n=document.getElementById('bn').value.trim();if(!n)return;store.babies.unshift({id:uid(),name:n,gender:document.getElementById('bg').value,weight:document.getElementById('bw').value,height:document.getElementById('bh').value,born:document.getElementById('bb').value||today()+' '+nowTime(),mom:document.getElementById('bm').value,nurse:document.getElementById('bnr').value,note:document.getElementById('bnt').value,emoji:document.getElementById('bg').value==='boy'?'👶':'🌸'});saveStore();closeModal();rnBaby();});
}

// 產房狀態
const RSTS={empty:{l:'空床',c:'rs-em',i:'🛏',rc:'r-empty'},waiting:{l:'待產中',c:'rs-wt',i:'⏳',rc:'r-waiting'},active:{l:'生產中',c:'rs-ac',i:'🚨',rc:'r-active'},recovery:{l:'恢復中',c:'rs-re',i:'💊',rc:'r-recovery'},clean:{l:'清潔中',c:'rs-cl',i:'🧹',rc:'r-clean'}};
function renderDeliveryPage(c){
  c.innerHTML='<div class="admin-layout"><div class="main-header"><div><h1>🚪 產房即時狀態</h1><div class="main-header-meta">點擊更新狀態</div></div><button class="btn-sm primary" onclick="setPage(\'delivery\')">🔄 刷新</button></div><div class="admin-content" id="roomC"></div></div>';
  rnRooms();
}
function rnRooms(){
  const c=document.getElementById('roomC');if(!c)return;
  const stats=Object.entries(RSTS).map(([k,v])=>{const cnt=store.rooms.filter(r=>r.status===k).length;return cnt>0?'<span style="font-size:12px;margin-right:14px">'+v.i+' '+v.l+' <strong>'+cnt+'</strong></span>':''}).join('');
  const cards=store.rooms.map((r,i)=>{const s=RSTS[r.status]||RSTS.empty;return'<div class="rcard '+s.rc+'" onclick="editRoom('+i+')"><span style="font-size:26px;margin-bottom:7px;display:block">'+s.i+'</span><div style="font-size:13px;font-weight:700">'+esc(r.name)+'</div><span style="font-size:11px;padding:2px 8px;border-radius:99px;font-weight:600;margin-top:5px;display:inline-block;background:'+(r.status==='empty'?'#e8f7f0':r.status==='waiting'?'#fdf0dc':r.status==='active'?'#fce8e8':r.status==='recovery'?'#e8f0fb':'#f0f0f0')+';color:'+(r.status==='empty'?'#2e7d5a':r.status==='waiting'?'#8f5208':r.status==='active'?'#b03050':r.status==='recovery'?'#1558a0':'#888')+'">'+s.l+'</span>'+(r.patient?'<div style="font-size:11px;color:var(--muted);margin-top:3px">'+esc(r.patient)+'</div>':'')+(r.since?'<div style="font-size:10px;color:var(--faint);margin-top:2px">⏱ '+esc(r.since)+'</div>':'')+(r.note?'<div style="font-size:10px;color:var(--faint);margin-top:2px">'+esc(r.note)+'</div>':'')+'</div>';}).join('');
  c.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;padding:11px;background:var(--surface);border-radius:var(--radius);border:1px solid var(--b1)">'+stats+'</div><div class="room-grid">'+cards+'</div>';
}
function editRoom(i){
  const r=store.rooms[i];
  const opts=Object.entries(RSTS).map(([k,v])=>'<option value="'+k+'" '+(r.status===k?'selected':'')+'>'+v.i+' '+v.l+'</option>').join('');
  showModal('更新：'+r.name,'<div class="form-row"><label>狀態</label><select id="rs">'+opts+'</select></div><div class="form-row"><label>病患（可匿名）</label><input id="rp" value="'+esc(r.patient)+'"></div><div class="form-row"><label>開始時間</label><input id="rt" value="'+esc(r.since)+'"></div><div class="form-row"><label>備註</label><input id="rn" value="'+esc(r.note)+'"></div>',
  ()=>{store.rooms[i].status=document.getElementById('rs').value;store.rooms[i].patient=document.getElementById('rp').value;store.rooms[i].since=document.getElementById('rt').value;store.rooms[i].note=document.getElementById('rn').value;saveStore();closeModal();rnRooms();});
}

// 表單簽核
const FTYPES={leave:{l:'請假',c:'ft-lv'},overtime:{l:'加班',c:'ft-ot'},supply:{l:'物品申請',c:'ft-sp'},other:{l:'其他',c:'ft-ot2'}};
function renderFormsPage(c){
  c.innerHTML='<div class="admin-layout"><div class="main-header"><div><h1>📋 表單簽核</h1><div class="main-header-meta">請假 · 加班 · 物品申請 · 線上審核</div></div><button class="btn-sm primary" onclick="openNewFrm()">+ 新增申請</button></div><div class="admin-content" id="frmC"></div></div>';
  rnForms();
}
function isApp(f){const i=f.approvers.indexOf(currentUser.id);if(i<0)return false;if(i===0)return f.statuses[0]==='pending';return f.statuses[i-1]==='approved'&&f.statuses[i]==='pending';}
function rnForms(){
  const c=document.getElementById('frmC');if(!c)return;
  const all=[...store.formRequests].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  function rCard(f){
    const ft=FTYPES[f.type]||FTYPES.other;
    const flow=f.approvers.map((uid,i)=>{const st=f.statuses[i]||'pending';const cls=st==='approved'?'ad-ok':st==='pending'&&i===f.statuses.filter(s=>s==='approved').length?'ad-cur':'ad-pd';return'<div class="astep"><div class="adot '+cls+'">'+(st==='approved'?'✓':i+1)+'</div><span style="font-size:11px;color:var(--muted)">'+esc(userName(uid))+'</span></div>'+(i<f.approvers.length-1?'<span style="color:var(--faint);font-size:10px">→</span>':'')}).join('');
    const canA=isApp(f)&&f.status==='pending';
    const attHtml=f.attachment
      ?(f.attachment.mime&&f.attachment.mime.startsWith('image/')
        ?'<div class="frq-attach"><img src="'+f.attachment.data+'" onclick="viewAttachment(\''+f.id+'\')" title="點擊查看大圖"><span class="frq-attach-name">'+esc(f.attachment.name)+'</span></div>'
        :'<div class="frq-attach"><a onclick="viewAttachment(\''+f.id+'\')" style="cursor:pointer">📎 '+esc(f.attachment.name)+'</a></div>')
      :'';
    return'<div class="frq-card"><span class="ftype '+ft.c+'">'+ft.l+'</span><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;margin-bottom:3px">'+esc(f.title)+'</div><div style="font-size:11px;color:var(--faint);display:flex;gap:8px;flex-wrap:wrap"><span>'+esc(userName(f.applicantId))+'</span><span>'+fmtDate(f.createdAt)+'</span>'+(f.reason?'<span>'+esc(f.reason)+'</span>':'')+'</div><div class="aflow">'+flow+'</div>'+attHtml+'</div><div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0"><span class="'+(f.status==='approved'?'fst-a':f.status==='rejected'?'fst-r':'fst-p')+'">'+(f.status==='approved'?'✓ 核准':f.status==='rejected'?'✗ 駁回':'審核中')+'</span>'+(canA?'<button class="btn-sm primary" style="font-size:11px;padding:4px 8px" onclick="appF(\''+f.id+'\')">核准</button><button class="btn-sm danger" style="font-size:11px;padding:4px 8px;background:#fce8e8;color:#b03050;border-color:#f0c0c0" onclick="rejF(\''+f.id+'\')">駁回</button>':'')+'</div></div>';
  }
  const pend=all.filter(f=>f.status==='pending'&&isApp(f));
  c.innerHTML=(pend.length?'<div class="sec-label">待我審核（'+pend.length+'）</div>'+pend.map(rCard).join('')+'<div class="sec-label">全部申請</div>':'<div class="sec-label">全部申請</div>')+all.map(rCard).join('');
}
function appF(id){const f=store.formRequests.find(x=>x.id===id);if(!f)return;const i=f.approvers.indexOf(currentUser.id);if(i<0)return;f.statuses[i]='approved';if(f.statuses.every(s=>s==='approved'))f.status='approved';saveStore();rnForms();}
function rejF(id){const f=store.formRequests.find(x=>x.id===id);if(!f)return;const i=f.approvers.indexOf(currentUser.id);if(i<0)return;f.statuses[i]='rejected';f.status='rejected';saveStore();rnForms();}
function openNewFrm(){
  _pendingAttachment=null;
  const aOpts=store.users.filter(u=>u.id!==currentUser.id).map(u=>'<option value="'+u.id+'">'+esc(u.name)+'</option>').join('');
  showModal('新增申請單',
    '<div class="form-row"><label>類型</label><select id="fty"><option value="leave">請假</option><option value="overtime">加班</option><option value="supply">物品申請</option><option value="other">其他</option></select></div>'+
    '<div class="form-row"><label>標題</label><input id="ftit" placeholder="例：特休假申請 4/20"></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="form-row"><label>開始日期</label><input id="fsd" type="date" value="'+today()+'"></div><div class="form-row"><label>結束日期</label><input id="fed" type="date" value="'+today()+'"></div></div>'+
    '<div class="form-row"><label>原因</label><textarea id="frs"></textarea></div>'+
    '<div class="form-row"><label>送審主管</label><select id="fap">'+aOpts+'</select></div>'+
    '<div class="form-row"><label>附件（圖片或 PDF，上限 800 KB）</label><input type="file" id="fattach" accept="image/*,.pdf" onchange="handleAttachment(this)" style="font-size:12px;width:100%"><div id="fattachPreview"></div></div>',
  ()=>{
    const t=document.getElementById('ftit').value.trim();if(!t)return;
    store.formRequests.unshift({
      id:uid(),type:document.getElementById('fty').value,title:t,
      applicantId:currentUser.id,date:today(),
      startDate:document.getElementById('fsd').value,
      endDate:document.getElementById('fed').value,
      reason:document.getElementById('frs').value,
      approvers:[document.getElementById('fap').value],
      statuses:['pending'],status:'pending',createdAt:today(),
      attachment:_pendingAttachment||null
    });
    _pendingAttachment=null;
    saveStore();closeModal();rnForms();
  });
}

// 值班表
function getWk(){const d=[];const dt=new Date();dt.setDate(dt.getDate()-dt.getDay()+1);for(let i=0;i<7;i++){const dd=new Date(dt);dd.setDate(dt.getDate()+i);d.push(dd.toISOString().split('T')[0]);}return d;}
const SHINFO={morning:{l:'早班',c:'sh-m'},afternoon:{l:'午班',c:'sh-a'},night:{l:'夜班',c:'sh-n'},off:{l:'休假',c:'sh-off'}};
const DLBLS=['一','二','三','四','五','六','日'];
function renderDutyPage(c){
  c.innerHTML='<div class="admin-layout"><div class="main-header"><div><h1>📅 值班表</h1><div class="main-header-meta">本週排班 · 換班申請</div></div>'+(isAdmin()?'<button class="btn-sm primary" onclick="openDA()">✏️ 編輯</button>':'')+'</div><div class="admin-content" id="dutyC"></div></div>';
  rnDuty();
}
function rnDuty(){
  const c=document.getElementById('dutyC');if(!c)return;
  if(!store.dutySchedule)store.dutySchedule={};
  if(!store.swapRequests)store.swapRequests=[];
  const wk=getWk();
  const nurses=store.users.filter(u=>u.deptId==='d3'||u.deptId==='d5');
  const hdr=wk.map((d,i)=>'<div class="dcell dc-hd">'+DLBLS[i]+'<br><span style="font-size:10px;font-weight:400">'+fmtDate(d).slice(5)+'</span></div>').join('');
  const rows=nurses.map(u=>{const cells=wk.map(d=>{const sh=(store.dutySchedule[u.id]&&store.dutySchedule[u.id][d])||'off';const s=SHINFO[sh]||SHINFO.off;return'<div class="dcell" style="'+(d===today()?'background:#fff0f5':'')+'" onclick="'+(isAdmin()?'editDC(\''+u.id+'\',\''+d+'\')':'void(0)')+'" ><span class="'+s.c+'">'+s.l+'</span></div>';}).join('');return'<div class="dcell dc-rl">'+avatarEl(u.id,18)+'<span style="margin-left:4px">'+esc(u.name)+'</span></div>'+cells;}).join('');
  const pSw=store.swapRequests.filter(s=>s.status==='pending');
  const swCards=store.swapRequests.map(s=>'<div class="swcard"><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600">'+esc(userName(s.fromId))+' → '+esc(userName(s.toId))+'</div><div style="font-size:11px;color:var(--muted)">'+fmtDate(s.fromDate)+' '+(SHINFO[s.fromShift]?SHINFO[s.fromShift].l:'')+' ⇄ '+fmtDate(s.toDate)+' '+(SHINFO[s.toShift]?SHINFO[s.toShift].l:'')+'</div>'+(s.reason?'<div style="font-size:11px;color:var(--faint)">'+esc(s.reason)+'</div>':'')+'</div><span style="font-size:10px;padding:2px 7px;border-radius:99px;font-weight:500;background:'+(s.status==='approved'?'#e8f7f0':'#fdf0dc')+';color:'+(s.status==='approved'?'#2e7d5a':'#8f5208')+'">'+(s.status==='approved'?'✓ 核准':'待審')+'</span>'+(isAdmin()&&s.status==='pending'?'<button class="btn-sm primary" style="font-size:11px;padding:4px 8px" onclick="appSw(\''+s.id+'\')">核准</button>':'')+'</div>').join('');
  c.innerHTML='<div class="sec-label">本週排班</div><div style="overflow-x:auto;margin-bottom:18px"><div class="duty-grid" style="min-width:560px"><div class="dcell dc-hd">姓名</div>'+hdr+rows+'</div></div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div class="sec-label" style="margin:0">換班申請 '+(pSw.length?'<span style="font-size:10px;background:#fce8e8;color:#b03050;padding:1px 6px;border-radius:99px">'+pSw.length+'</span>':'')+'</div><button class="btn-sm" onclick="openNewSw()">+ 申請換班</button></div>'+(swCards||'<div style="text-align:center;padding:18px;color:var(--faint);font-size:13px">尚無換班申請</div>');
}
function editDC(uid,date){
  const cur=(store.dutySchedule[uid]&&store.dutySchedule[uid][date])||'off';
  const opts=Object.entries(SHINFO).map(([k,v])=>'<option value="'+k+'" '+(cur===k?'selected':'')+'>'+v.l+'</option>').join('');
  showModal('編輯排班：'+userName(uid)+' '+fmtDate(date),'<div class="form-row"><label>班別</label><select id="dcs">'+opts+'</select></div>',()=>{if(!store.dutySchedule[uid])store.dutySchedule[uid]={};store.dutySchedule[uid][date]=document.getElementById('dcs').value;saveStore();closeModal();rnDuty();});
}
function openDA(){
  const uOpts=store.users.map(u=>'<option value="'+u.id+'">'+esc(u.name)+'</option>').join('');
  const dOpts=getWk().map(d=>'<option value="'+d+'">'+fmtDate(d)+'</option>').join('');
  const sOpts=Object.entries(SHINFO).map(([k,v])=>'<option value="'+k+'">'+v.l+'</option>').join('');
  showModal('編輯排班','<div class="form-row"><label>成員</label><select id="dau">'+uOpts+'</select></div><div class="form-row"><label>日期</label><select id="dad">'+dOpts+'</select></div><div class="form-row"><label>班別</label><select id="das">'+sOpts+'</select></div>',()=>{const u2=document.getElementById('dau').value,d=document.getElementById('dad').value;if(!store.dutySchedule[u2])store.dutySchedule[u2]={};store.dutySchedule[u2][d]=document.getElementById('das').value;saveStore();closeModal();rnDuty();});
}
function openNewSw(){
  const uOpts=store.users.map(u=>'<option value="'+u.id+'">'+esc(u.name)+'</option>').join('');
  const dOpts=getWk().map(d=>'<option value="'+d+'">'+fmtDate(d)+'</option>').join('');
  const sOpts=Object.entries(SHINFO).map(([k,v])=>'<option value="'+k+'">'+v.l+'</option>').join('');
  showModal('申請換班','<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="form-row"><label>換班對象</label><select id="swt">'+uOpts+'</select></div><div class="form-row"><label>原因</label><input id="swr"></div><div class="form-row"><label>我的日期</label><select id="swfd">'+dOpts+'</select></div><div class="form-row"><label>我的班別</label><select id="swfs">'+sOpts+'</select></div><div class="form-row"><label>對方日期</label><select id="swtd">'+dOpts+'</select></div><div class="form-row"><label>對方班別</label><select id="swts">'+sOpts+'</select></div></div>',()=>{store.swapRequests.unshift({id:uid(),fromId:currentUser.id,toId:document.getElementById('swt').value,fromDate:document.getElementById('swfd').value,toDate:document.getElementById('swtd').value,fromShift:document.getElementById('swfs').value,toShift:document.getElementById('swts').value,reason:document.getElementById('swr').value,status:'pending'});saveStore();closeModal();rnDuty();});
}
function appSw(id){const s=store.swapRequests.find(x=>x.id===id);if(!s)return;s.status='approved';if(!store.dutySchedule[s.fromId])store.dutySchedule[s.fromId]={};if(!store.dutySchedule[s.toId])store.dutySchedule[s.toId]={};const tmp=(store.dutySchedule[s.fromId][s.fromDate])||'off';store.dutySchedule[s.fromId][s.fromDate]=(store.dutySchedule[s.toId][s.toDate])||'off';store.dutySchedule[s.toId][s.toDate]=tmp;saveStore();rnDuty();}

// 工作日誌
const MOODS={great:{l:'很棒 😄',c:'mo-gr'},good:{l:'不錯 😊',c:'mo-go'},ok:{l:'普通 😐',c:'mo-ok'},tired:{l:'辛苦 😔',c:'mo-ti'}};
function renderJournalPage(c){
  c.innerHTML='<div class="admin-layout"><div class="main-header"><div><h1>📝 工作日誌</h1><div class="main-header-meta">'+(isAdmin()?'查看全員日誌':'個人每日紀錄')+'</div></div><button class="btn-sm primary" onclick="openNewJ()">+ 今日日誌</button></div><div class="admin-content" id="jC"></div></div>';
  rnJ();
}
function rnJ(){
  const c=document.getElementById('jC');if(!c)return;
  const list=store.journals.filter(j=>isAdmin()||j.userId===currentUser.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  c.innerHTML=list.map(j=>{const m=MOODS[j.mood]||MOODS.ok;return'<div class="jcard"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><div style="display:flex;align-items:center;gap:8px">'+(isAdmin()?avatarEl(j.userId,20):'')+' <span style="font-size:13px;font-weight:600">'+(isAdmin()?esc(userName(j.userId))+' · ':'')+fmtDate(j.date)+'</span><span class="mood '+m.c+'">'+m.l+'</span></div><span style="font-size:10px;color:var(--faint)">'+(j.createdAt||'').split(' ')[1]+'</span></div><div class="jcont">'+esc(j.content)+'</div></div>';}).join('')||'<div style="text-align:center;padding:40px;color:var(--faint);font-size:13px">今天還沒寫日誌 🌸</div>';
}
function openNewJ(){
  const mOpts=Object.entries(MOODS).map(([k,v])=>'<option value="'+k+'">'+v.l+'</option>').join('');
  showModal('今日工作日誌','<div class="form-row"><label>今日心情</label><select id="jm">'+mOpts+'</select></div><div class="form-row"><label>日誌內容</label><textarea id="jc" style="min-height:110px" placeholder="今天做了什麼？有什麼值得記錄的事？"></textarea></div>',
  ()=>{const cont=document.getElementById('jc').value.trim();if(!cont)return;if(!store.journals)store.journals=[];store.journals.unshift({id:uid(),userId:currentUser.id,date:today(),mood:document.getElementById('jm').value,content:cont,createdAt:today()+' '+nowTime()});saveStore();closeModal();rnJ();});
}

// 衛教資料庫
const ETAGS={br:{l:'哺乳',c:'et-br'},nb:{l:'新生兒',c:'et-nb'},pp:{l:'產後',c:'et-pp'},nu:{l:'營養',c:'et-nu'}};
function renderEduPage(c){
  c.innerHTML='<div class="admin-layout"><div class="main-header"><div><h1>📚 衛教資料庫</h1><div class="main-header-meta">點擊卡片展開詳細內容</div></div>'+(isAdmin()?'<button class="btn-sm primary" onclick="openNewEdu()">+ 新增</button>':'')+'</div><div class="admin-content" id="eduC"></div></div>';
  rnEdu();
}
function rnEdu(){
  const c=document.getElementById('eduC');if(!c)return;
  c.innerHTML=store.eduItems.map((e,i)=>{
    const tags=e.tags.map(t=>{const tm=ETAGS[t]||{l:t,c:''};return'<span class="etag '+tm.c+'">'+tm.l+'</span>';}).join('');
    return'<div class="ecard" onclick="togEdu(\'eex'+i+'\')"><div class="eico">'+e.icon+'</div><div style="flex:1;min-width:0"><div class="etitle">'+esc(e.title)+'</div><div class="edesc">'+esc(e.desc)+'</div><div>'+tags+'</div><div class="eexp" id="eex'+i+'">'+esc(e.content)+'</div></div></div>';
  }).join('');
}
function togEdu(id){const el=document.getElementById(id);if(el)el.classList.toggle('open');}
function openNewEdu(){
  showModal('新增衛教資料','<div class="form-row"><label>標題</label><input id="eu" placeholder="衛教主題"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="form-row"><label>圖示</label><input id="ei" placeholder="例：🤱"></div><div class="form-row"><label>標籤（br/nb/pp/nu）</label><input id="et" placeholder="例：br,nb"></div></div><div class="form-row"><label>簡介</label><input id="ed"></div><div class="form-row"><label>詳細內容</label><textarea id="ec" style="min-height:110px"></textarea></div>',
  ()=>{const t=document.getElementById('eu').value.trim();if(!t)return;if(!store.eduItems)store.eduItems=[];store.eduItems.push({id:uid(),title:t,icon:document.getElementById('ei').value||'📄',tags:document.getElementById('et').value.split(',').map(x=>x.trim()).filter(Boolean),desc:document.getElementById('ed').value,content:document.getElementById('ec').value});saveStore();closeModal();rnEdu();});
}

