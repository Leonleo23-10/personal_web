const CACHE_NAME = 'leolab-general-v5';
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
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        )).then(() => clients.claim())
    );
});

// Estrategia Network-First: Siempre muestra los cambios nuevos si hay internet
self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        fetch(e.request).then(res => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
            return res;
        }).catch(() => caches.match(e.request))
    );
});