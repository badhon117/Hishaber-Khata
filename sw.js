const CACHE_NAME = 'hishaber-khata-v1';

// যেসব ফাইল ক্যাশ করা হবে
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './home.html',
  './shop.html',
  './goods.html',
  './faq.html',
  './about.html',
  './css/common.css',
  './css/home.css',
  './css/shop.css',
  './css/goods.css',
  './js/common.js',
  './js/home.js',
  './js/shop.js',
  './js/goods.js',
  './js/sync.js',
  './manifest.json',
  './logo.png',
  './icon.svg'
];

// ১. সার্ভিস ওয়ার্কার ইন্সটল
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching essential assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// ২. সার্ভিস ওয়ার্কার অ্যাক্টিভেশন এবং পুরানো ক্যাশ মুছে ফেলা
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ৩. নেটওয়ার্ক ও ক্যাশ থেকে ফাইল ফেচ করা
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // অফলাইনে কোনো পেজ না পাওয়া গেলে এটি কাজ করবে
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
