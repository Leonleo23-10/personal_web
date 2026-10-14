const CACHE_NAME = 'pwa-game-{game_id}-v3';
    const URLS = [
        '/arcade/{game_id}/',
        '/static/css/style.css',
        '/static/js/main.js',
        '/static/js/arcade_engines.js',
        '/arcade/{game_id}/manifest.json',
        '/arcade/{game_id}/icon.svg'
    ];
    self.addEventListener('install', e => {{
        self.skipWaiting();
        e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(URLS)));
    }});
    self.addEventListener('activate', e => {{
        e.waitUntil(clients.claim());
    }});
    // Network-First: Si hay internet baja lo más nuevo; si estás offline usa la caché
    self.addEventListener('fetch', e => {{
        e.respondWith(
            fetch(e.request).then(res => {{
                const copy = res.clone();
                caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
                return res;
            }}).catch(() => caches.match(e.request))
        );
    }});