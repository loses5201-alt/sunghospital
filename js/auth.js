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

// ── Firebase 初始化 ──
window.addEventListener('load', function() {
  try {
    if (typeof firebase === 'undefined') return;
    firebase.initializeApp(FB_CONFIG);
    fbDb = firebase.database();
    fbAuth = firebase.auth();

    // 恢復 session
    fbAuth.onAuthStateChanged(function(firebaseUser) {
      if (firebaseUser) {
        loadStoreAndRedirect(firebaseUser);
      } else {
        var savedId = localStorage.getItem('loggedInUserId');
        if (savedId) {
          loadStoreAndLogin(savedId);
        }
      }
    });
  } catch(e) {
    console.warn('Firebase 初始化失敗，切換本機模式', e);
    tryLocalLogin();
  }
});

// ── 從 Firebase 載入 store ──
function loadStoreAndRedirect(firebaseUser) {
  fbDb.ref('/').once('value', function(snap) {
    store = normalizeStore(snap.val() || defaultStore());
    var matched = store.users.find(function(u) {
      return u.googleId === firebaseUser.uid || u.email === firebaseUser.email;
    });
    if (!matched) return; // 尚未建立帳號，仍在登入頁
    currentUser = matched;
    localStorage.setItem('loggedInUserId', matched.id);
    // 如果已在 dashboard，不重複跳轉
    if (!window.location.pathname.endsWith('dashboard.html')) {
      window.location.href = 'dashboard.html';
    }
  });
}

function loadStoreAndLogin(userId) {
  fbDb.ref('/').once('value', function(snap) {
    store = normalizeStore(snap.val() || defaultStore());
    var matched = store.users.find(function(u) { return u.id === userId; });
    if (matched) {
      currentUser = matched;
      if (!window.location.pathname.endsWith('dashboard.html')) {
        window.location.href = 'dashboard.html';
      }
    }
  });
}

// ── 帳號密碼登入 ──
function doLogin() {
  var uEl = document.getElementById('loginUser');
  var pEl = document.getElementById('loginPass');
  var errEl = document.getElementById('loginErr');
  if (!uEl || !pEl) return;

  var uname = uEl.value.trim();
  var pass = pEl.value;
  if (!uname || !pass) { showLoginErr('請輸入帳號和密碼'); return; }

  if (!store) { showLoginErr('資料載入中，請稍候...'); return; }

  var user = store.users.find(function(u) {
    return u.username === uname && u.password === pass;
  });
  if (!user) { showLoginErr('帳號或密碼錯誤'); return; }

  currentUser = user;
  localStorage.setItem('loggedInUserId', user.id);
  window.location.href = 'dashboard.html';
}

// ── Google 登入 ──
function loginWithGoogle() {
  if (!fbAuth) { showLoginErr('Firebase 連線中，請稍後再試'); return; }
  var provider = new firebase.auth.GoogleAuthProvider();
  setLoginLoading(true);

  fbAuth.signInWithPopup(provider).then(function(result) {
    var gu = result.user;
    if (!store) return fbDb.ref('/').once('value', function(snap) {
      store = normalizeStore(snap.val() || defaultStore());
      handleGoogleUser(gu);
    });
    handleGoogleUser(gu);
  }).catch(function(e) {
    setLoginLoading(false);
    showLoginErr('Google 登入失敗：' + e.message);
  });
}

function handleGoogleUser(gu) {
  var matched = store.users.find(function(u) {
    return u.googleId === gu.uid || u.email === gu.email;
  });
  if (!matched) {
    // 第一次登入，建立帳號
    var isFirst = store.users.length === 0;
    matched = {
      id: uid(), username: gu.email.split('@')[0],
      name: gu.displayName || gu.email.split('@')[0],
      email: gu.email, googleId: gu.uid,
      role: isFirst ? 'admin' : 'member',
      status: 'active', needsReview: !isFirst
    };
    store.users.push(matched);
    fbDb.ref('users').set(store.users);
  }
  currentUser = matched;
  localStorage.setItem('loggedInUserId', matched.id);
  window.location.href = 'dashboard.html';
}

// ── 登出 ──
function doLogout() {
  currentUser = null;
  localStorage.removeItem('loggedInUserId');
  if (fbAuth) fbAuth.signOut();
  window.location.href = 'index.html';
}

// ── 頁面保護（dashboard / pages 用） ──
function requireAuth() {
  var savedId = localStorage.getItem('loggedInUserId');
  if (!savedId) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// ── UI helpers ──
function showLoginErr(msg) {
  var el = document.getElementById('loginErr');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function setLoginLoading(on) {
  var btn = document.getElementById('loginGoogleBtn');
  if (btn) btn.disabled = on;
  var btnTxt = document.getElementById('loginBtnText');
  if (btnTxt) btnTxt.textContent = on ? '登入中...' : '以 Google 帳號登入';
}
function tryLocalLogin() {
  var savedId = localStorage.getItem('loggedInUserId');
  if (savedId && store) {
    var u = store.users.find(function(u) { return u.id === savedId; });
    if (u) { currentUser = u; window.location.href = 'dashboard.html'; }
  }
}

// ── 工具函式 ──
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
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
    if (s[f] !== undefined) s[f] = normalizeArr(s[f]);
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
