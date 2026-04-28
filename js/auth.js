// ══════════════════════════════════════
// Firebase 設定（請勿修改）
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

var fbDb        = null;
var fbAuth      = null;
var store       = null;
var currentUser = null;
var _storeReady = null; // Promise：resolve 後 store 一定是有效物件

// ══════════════════════════════════════
// 原則：localStorage 只存 loggedInUserId（session token）
//       所有業務資料只從 Firebase 讀寫，不碰 localStorage
// ══════════════════════════════════════

window.addEventListener('load', function() {
  try {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK 未載入');
      return;
    }

    // 防止重複 initializeApp
    try { firebase.app(); } catch(e) { firebase.initializeApp(FB_CONFIG); }

    fbDb   = firebase.database();
    fbAuth = firebase.auth();

    // ── 從 Firebase 讀取 store（唯一資料來源）──
    _storeReady = fbDb.ref('store').once('value').then(function(snap) {
      var raw = snap.val();
      if (raw && typeof raw === 'object') {
        store = normalizeStore(raw);
      } else {
        // Firebase 是空的：推入預設結構（含管理員帳號）
        store = defaultStore();
        fbDb.ref('store').set(store).catch(function(){});
      }
      return store;
    }).catch(function(err) {
      console.error('Firebase store 讀取失敗', err);
      store = defaultStore();
      return store;
    });

    // ── Google session 自動恢復 ──
    fbAuth.onAuthStateChanged(function(firebaseUser) {
      if (!firebaseUser) return;
      if (window.location.href.indexOf('dashboard.html') !== -1) return;

      _storeReady.then(function() {
        var matched = store.users.find(function(u) {
          return u.googleId === firebaseUser.uid || u.email === firebaseUser.email;
        });
        if (!matched) return; // 新用戶：由 signInWithPopup 流程處理
        currentUser = matched;
        localStorage.setItem('loggedInUserId', matched.id);
        window.location.href = 'dashboard.html';
      });
    });

    // ── 帳密 session 恢復（F5 重整）──
    _storeReady.then(function() {
      if (fbAuth.currentUser) return;
      var savedId = localStorage.getItem('loggedInUserId');
      if (!savedId) return;
      var u = store.users.find(function(u) { return u.id === savedId; });
      if (!u) { localStorage.removeItem('loggedInUserId'); return; }
      currentUser = u;
      if (window.location.href.indexOf('dashboard.html') === -1) {
        window.location.href = 'dashboard.html';
      }
    });

  } catch(e) {
    console.error('Firebase 初始化失敗', e);
  }
});

// ══════════════════════════════════════
// 帳號密碼登入
// ══════════════════════════════════════
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
    _storeReady.then(function() {
      hideLoginErr();
      proceed();
    });
  } else {
    showLoginErr('Firebase 未連線，請重新整理頁面');
  }
}

// ══════════════════════════════════════
// Google 登入
// ══════════════════════════════════════
function loginWithGoogle() {
  if (!fbAuth) { showLoginErr('Firebase 連線中，請稍後再試'); return; }
  setLoginLoading(true);

  var provider = new firebase.auth.GoogleAuthProvider();
  fbAuth.signInWithPopup(provider).then(function(result) {
    var gu = result.user;

    var finish = function() {
      var matched = store.users.find(function(u) {
        return u.googleId === gu.uid || u.email === gu.email;
      });
      if (!matched) {
        var isFirst = store.users.length === 0;
        matched = {
          id: uid(),
          username: gu.email.split('@')[0],
          name: gu.displayName || gu.email.split('@')[0],
          email: gu.email,
          googleId: gu.uid,
          role: isFirst ? 'admin' : 'member',
          status: 'active',
          needsReview: !isFirst
        };
        store.users.push(matched);
        // 新用戶直接寫入 Firebase
        fbDb.ref('store/users').set(store.users).catch(function(e) {
          console.warn('新用戶寫入失敗', e);
        });
      }
      currentUser = matched;
      localStorage.setItem('loggedInUserId', matched.id);
      window.location.href = 'dashboard.html';
    };

    if (store) {
      finish();
    } else {
      (_storeReady || Promise.resolve(defaultStore())).then(finish);
    }
  }).catch(function(e) {
    setLoginLoading(false);
    var msg = e.code === 'auth/popup-closed-by-user' ? '登入視窗已關閉，請重試'
            : e.code === 'auth/popup-blocked'        ? '彈出視窗被封鎖，請允許後重試'
            : 'Google 登入失敗：' + e.message;
    showLoginErr(msg);
  });
}

// ══════════════════════════════════════
// 登出
// ══════════════════════════════════════
function doLogout() {
  currentUser = null;
  localStorage.removeItem('loggedInUserId');
  if (fbAuth) fbAuth.signOut().catch(function(){});
  window.location.href = 'index.html';
}

// ══════════════════════════════════════
// 頁面保護（dashboard.html 用）
// ══════════════════════════════════════
function requireAuth() {
  var savedId = localStorage.getItem('loggedInUserId');
  if (!savedId) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// ══════════════════════════════════════
// UI Helpers
// ══════════════════════════════════════
function showLoginErr(msg) {
  var el = document.getElementById('loginErr');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function hideLoginErr() {
  var el = document.getElementById('loginErr');
  if (el) el.style.display = 'none';
}
function setLoginLoading(on) {
  var btn = document.getElementById('loginGoogleBtn');
  if (btn) btn.disabled = on;
  var txt = document.getElementById('loginBtnText');
  if (txt) txt.textContent = on ? '登入中...' : '以 Google 帳號登入';
}

// ══════════════════════════════════════
// 工具函式
// ══════════════════════════════════════
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
