// 宋俊宏婦幼醫院 Service Worker
var CACHE = 'sunghospital-v1';
var APP_SHELL = [
  '/sunghospital/',
  '/sunghospital/index.html',
  '/sunghospital/style.css',
  '/sunghospital/app.js',
  '/sunghospital/icon.svg',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(APP_SHELL); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  // Firebase 即時資料庫 WebSocket 不走 cache
  if(e.request.url.indexOf('firebaseio.com')>-1 || e.request.url.indexOf('googleapis.com')>-1){
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(cached){
      var networkFetch = fetch(e.request).then(function(response){
        if(response && response.status===200 && e.request.method==='GET'){
          var clone = response.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, clone); });
        }
        return response;
      }).catch(function(){ return cached; });
      return cached || networkFetch;
    })
  );
});
