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

    // 立即載入 store（帳密登入需要，不等 auth 狀態）
    fbDb.ref('/').once('value', function(snap) {
      store = normalizeStore(snap.val() || defaultStore());

      // store 載好後，嘗試用 localStorage session 恢復（帳密登入）
      if (!fbAuth.currentUser) {
        var savedId = localStorage.getItem('loggedInUserId');
        if (savedId) {
          var u = store.users.find(function(u) { return u.id === savedId; });
          if (u) {
            currentUser = u;
            if (!window.location.pathname.endsWith('dashboard.html')) {
              window.location.href = 'dashboard.html';
            }
          }
        }
      }
    });

    // Google auth 狀態監聽（已登入的 Google 帳號自動恢復）
    fbAuth.onAuthStateChanged(function(firebaseUser) {
      if (!firebaseUser) return;
      var tryRedirect = function() {
        var matched = store && store.users.find(function(u) {
          return u.googleId === firebaseUser.uid || u.email === firebaseUser.email;
        });
        if (!matched) return; // 新用戶交由 signInWithPopup 處理
        currentUser = matched;
        localStorage.setItem('loggedInUserId', matched.id);
        if (!window.location.pathname.endsWith('dashboard.html')) {
          window.location.href = 'dashboard.html';
        }
      };
      // store 可能還沒載好，等它
      if (store) {
        tryRedirect();
      } else {
        var t = setInterval(function() {
          if (store) { clearInterval(t); tryRedirect(); }
        }, 80);
      }
    });

  } catch(e) {
    console.warn('Firebase 初始化失敗', e);
  }
});

// ── 帳號密碼登入 ──
function doLogin() {
  var uEl = document.getElementById('loginUser');
  var pEl = document.getElementById('loginPass');
  if (!uEl || !pEl) return;

  var uname = uEl.value.trim();
  var pass  = pEl.value;
  if (!uname || !pass) { showLoginErr('請輸入帳號和密碼'); return; }

  // store 還沒好就先嘗試讀一次
  if (!store) {
    showLoginErr('連線中，請稍候...');
    if (!fbDb) return;
    fbDb.ref('/').once('value', function(snap) {
      store = normalizeStore(snap.val() || defaultStore());
      doLogin(); // 重試
    });
    return;
  }

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
    var finish = function() {
      var matched = store.users.find(function(u) {
        return u.googleId === gu.uid || u.email === gu.email;
      });
      if (!matched) {
        // 新用戶，建立帳號
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
        fbDb.ref('users').set(store.users);
      }
      currentUser = matched;
      localStorage.setItem('loggedInUserId', matched.id);
      window.location.href = 'dashboard.html';
    };

    if (store) {
      finish();
    } else {
      fbDb.ref('/').once('value', function(snap) {
        store = normalizeStore(snap.val() || defaultStore());
        finish();
      });
    }
  }).catch(function(e) {
    setLoginLoading(false);
    var msg = e.code === 'auth/popup-closed-by-user' ? '登入視窗已關閉，請重試'
            : e.code === 'auth/popup-blocked'        ? '彈出視窗被封鎖，請允許後重試'
            : 'Google 登入失敗：' + e.message;
    showLoginErr(msg);
  });
}

// ── 登出 ──
function doLogout() {
  currentUser = null;
  localStorage.removeItem('loggedInUserId');
  if (fbAuth) fbAuth.signOut();
  window.location.href = 'index.html';
}

// ── 頁面保護 ──
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
  var txt = document.getElementById('loginBtnText');
  if (txt) txt.textContent = on ? '登入中...' : '以 Google 帳號登入';
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
