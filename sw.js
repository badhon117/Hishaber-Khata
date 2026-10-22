const CACHE_NAME = 'hishaber-khata-v8';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './home.html',
  './shop.html',
  './goods.html',
  './roz.html',
  './faq.html',
  './about.html',
  './css/common.css',
  './css/home.css',
  './css/shop.css',
  './css/goods.css',
  './css/roz.css',
  './js/common.js',
  './js/home.js',
  './js/shop.js',
  './js/goods.js',
  './js/roz.js',
  './js/sync.js',
  './manifest.json',
  './recycle-bin.html',  // 🆕
  './logo.png',
  './logo-192.png',    // 🆕
  './logo-512.png'     // 🆕
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        // 🆕 FIX: undefined এর বদলে Response.error() রিটার্ন
        return Response.error();
      });
    })
  );
});
