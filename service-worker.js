const CACHE_NAME = 'punto-chat-cache-v1';
const urlsToCache = [
    './',
    './index.html', // assuming index.html is the main file for PWA (or punto.html in this case)
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/peerjs@1.4.7/dist/peerjs.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://fonts.gstatic.com', // Font assets might be fetched from here
    // Placeholder icons
    'https://placehold.co/192x192/3B82F6/FFFFFF?text=PUNTO',
    'https://placehold.co/512x512/3B82F6/FFFFFF?text=PUNTO'
];

// Install event: cache app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event: serve from cache, then network (Cache First strategy)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // No cache hit - fetch from network
                return fetch(event.request).then((networkResponse) => {
                    // Check if we received a valid response
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    // IMPORTANT: Clone the response. A response is a stream
                    // and can only be consumed once. We must clone it so that
                    // we can consume one in the cache and one in the browser.
                    const responseToCache = networkResponse.clone();

                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return networkResponse;
                });
            })
            .catch(() => {
                // This catch is for when the network request also fails
                // You could return an offline page here
                console.log('Fetch failed, serving offline content.');
                // Example: return caches.match('/offline.html');
            })
    );
});

