const CACHE_NAME = 'leolab-general-v3';
const URLS = [
    '/',
    '/arcade',
    '/experimentos',
    '/static/css/style.css',
    '/static/js/main.js',
    '/static/js/arcade_engines.js',
    '/manifest.json'
];

self.addEventListener('install', e => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(URLS)));
});

self.addEventListener('activate', e => {
    e.waitUntil(clients.claim());
});

// Estrategia Network-First: Siempre muestra los cambios nuevos si hay internet
self.addEventListener('fetch', e => {
    e.respondWith(
        fetch(e.request).then(res => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
            return res;
        }).catch(() => caches.match(e.request))
    );
});