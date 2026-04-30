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
var store = null;
var currentUser = null;
var _storeReady = null;

window.addEventListener('load', function() {
  if (typeof firebase === 'undefined') {
    showLoginErr('Firebase SDK 載入失敗，請重新整理');
    return;
  }
  try { firebase.app(); } catch(e) { firebase.initializeApp(FB_CONFIG); }
  fbDb = firebase.database();

  _storeReady = fbDb.ref('store').once('value').then(function(snap) {
    var raw = snap.val();
    if (raw && typeof raw === 'object') {
      store = normalizeStore(raw);
    } else {
      store = defaultStore();
      fbDb.ref('store').set(store).catch(function(){});
    }
    return store;
  }).catch(function() {
    store = defaultStore();
    return store;
  });

  _storeReady.then(function() {
    var savedId = localStorage.getItem('loggedInUserId');
    if (!savedId) return;
    var u = store.users.find(function(u) { return u.id === savedId; });
    if (!u) {
      localStorage.removeItem('loggedInUserId');
      return;
    }
    currentUser = u;
    if (window.location.href.indexOf('dashboard.html') === -1) {
      window.location.href = 'dashboard.html';
    }
  });
});

function doLogin() {
  var uEl = document.getElementById('loginUser');
  var pEl = document.getElementById('loginPass');
  if (!uEl || !pEl) return;
  var uname = uEl.value.trim();
  var pass  = pEl.value;
  if (!uname || !pass) { showLoginErr('請輸入帳號和密碼'); return; }

  var proceed = function() {
    var user = store.users.find(function(u) {
      return u.username === uname && u.password === pass;
    });
    if (!user) { showLoginErr('帳號或密碼錯誤'); return; }
    currentUser = user;
    localStorage.setItem('loggedInUserId', user.id);
    window.location.href = 'dashboard.html';
  };

  if (store) {
    proceed();
  } else if (_storeReady) {
    showLoginErr('連線中，請稍候...');
    _storeReady.then(function() { hideLoginErr(); proceed(); });
  } else {
    showLoginErr('Firebase 未連線，請重新整理頁面');
  }
}

function doLogout() {
  currentUser = null;
  localStorage.removeItem('loggedInUserId');
  window.location.href = 'index.html';
}

function requireAuth() {
  var savedId = localStorage.getItem('loggedInUserId');
  if (!savedId) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

function showLoginErr(msg) {
  var el = document.getElementById('loginErr');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function hideLoginErr() {
  var el = document.getElementById('loginErr');
  if (el) el.style.display = 'none';
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function normalizeArr(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') return Object.values(val);
  return [];
}
function normalizeStore(s) {
  if (!s || typeof s !== 'object') return defaultStore();
  ['users','meetings','departments','shifts','announcements','incidents',
   'emergencies','babies','rooms','formRequests','swapRequests','journals',
   'eduItems','titles','formNotifs','messages','chatRooms','equipment',
   'patients','sops','inventory','inventoryLogs','skillDefs','leaves'
  ].forEach(function(f) { s[f] = normalizeArr(s[f]); });
  return s;
}
function defaultStore() {
  return {
    departments:[
      {id:'d1',name:'婦產科',color:'pink'},
      {id:'d2',name:'護理部',color:'green'},
      {id:'d3',name:'行政部',color:'amber'}
    ],
    titles:['主治醫師','住院醫師','護理師','護理長','行政人員','病房主任','科主任','院長'],
    users:[
      {id:'u1',username:'admin',password:'admin123',name:'系統管理員',
       role:'admin',deptId:'d3',title:'行政人員',avatar:'av-a',status:'active'}
    ],
    meetings:[],shifts:[],announcements:[],incidents:[],emergencies:[],
    babies:[],rooms:[],formRequests:[],swapRequests:[],journals:[],
    eduItems:[],formNotifs:[],messages:[],chatRooms:[],equipment:[],
    patients:[],sops:[],inventory:[],inventoryLogs:[],skillDefs:[],leaves:[]
  };
}
