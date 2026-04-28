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

var fbDb = null;
var fbAuth = null;
var store = null;
var currentUser = null;
var _storeReady = null; // Promise，resolve 後 store 必然是有效物件

// ══════════════════════════════════════
// Firebase 初始化
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

    // 立即從 Firebase 讀取 store，並記錄為 Promise
    _storeReady = fbDb.ref('store').once('value').then(function(snap) {
      var raw = snap.val();
      store = (raw && typeof raw === 'object') ? normalizeStore(raw) : defaultStore();
      return store;
    }).catch(function(err) {
      console.warn('store 讀取失敗，使用預設值', err);
      store = defaultStore();
      return store;
    });

    // ── Google session 自動恢復 ──
    // 僅處理「已存在帳號」的恢復；新用戶由 signInWithPopup 建立
    fbAuth.onAuthStateChanged(function(firebaseUser) {
      if (!firebaseUser) return;
      // 已在 dashboard 不重複跳轉
      if (window.location.href.indexOf('dashboard.html') !== -1) return;

      _storeReady.then(function() {
        var matched = store.users.find(function(u) {
          return u.googleId === firebaseUser.uid || u.email === firebaseUser.email;
        });
        if (!matched) return; // 新用戶，等 signInWithPopup 流程建立
        currentUser = matched;
        localStorage.setItem('loggedInUserId', matched.id);
        window.location.href = 'dashboard.html';
      });
    });

    // ── 帳密 session 恢復（F5 重整用）──
    _storeReady.then(function() {
      if (fbAuth.currentUser) return; // Google session 由 onAuthStateChanged 處理
      var savedId = localStorage.getItem('loggedInUserId');
      if (!savedId) return;
      var u = store.users.find(function(u) { return u.id === savedId; });
      if (!u) return;
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
    _storeReady.then(proceed);
  } else {
    showLoginErr('Firebase 尚未連線，請重新整理頁面');
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
        // 新用戶：建立帳號並寫回 Firebase
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
      (_storeReady || Promise.resolve()).then(finish);
    }
  }).catch(function(e) {
    setLoginLoading(false);
    var msg = e.code === 'auth/popup-closed-by-user'
            ? '登入視窗已關閉，請重試'
            : e.code === 'auth/popup-blocked'
            ? '彈出視窗被封鎖，請允許後重試'
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
  if (!s || typeof s !== 'object') return null;
  // 確保所有陣列欄位一定存在（即使 Firebase 裡沒有這個 key）
  ['users','meetings','departments','shifts','announcements','incidents',
   'emergencies','babies','rooms','formRequests','swapRequests','journals',
   'eduItems','titles','formNotifs','messages','chatRooms','equipment',
   'patients','sops','inventory','inventoryLogs','skillDefs','leaves'
  ].forEach(function(f) {
    s[f] = normalizeArr(s[f]);
  });
  return s;
}

function defaultStore() {
  return {
    users:[], departments:[], meetings:[], shifts:[], announcements:[],
    incidents:[], emergencies:[], babies:[], rooms:[], formRequests:[],
    swapRequests:[], journals:[], eduItems:[], titles:[], formNotifs:[],
    messages:[], chatRooms:[], equipment:[], patients:[], sops:[],
    inventory:[], inventoryLogs:[], skillDefs:[], leaves:[]
  };
}
