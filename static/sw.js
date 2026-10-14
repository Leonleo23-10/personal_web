const CACHE_NAME = 'leolab-v2';
const ASSETS = [
  '/',
  '/arcade',
  '/static/css/style.css',
  '/static/js/main.js',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});