const CACHE_NAME = 'felinos-cache-v1';
const API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

// Archivos que componen la aplicación (App Shell)
const urlsToCache = [
    './felinos.html', // El nombre de tu archivo HTML principal
    './manifest.json',
    // URLs de las librerías externas
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://html2canvas.hertzen.com/dist/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// Instalación del Service Worker: se cachea el App Shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache abierto');
                // Añadimos la URL de la API a la caché para tener un fallback
                const apiRequest = new Request(API_URL, { mode: 'cors' });
                cache.add(apiRequest);
                
                return cache.addAll(urlsToCache);
            })
    );
});

// Interceptación de solicitudes de red (Fetch)
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    // Estrategia para la API del Dólar: Network first, falling back to Cache
    // Intenta buscar la tasa nueva. Si falla (offline), usa la última guardada.
    if (requestUrl.href === API_URL) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return fetch(event.request)
                    .then(networkResponse => {
                        // Si la respuesta es válida, la guardamos en caché y la retornamos
                        if (networkResponse && networkResponse.ok) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // Si fetch falla (offline), buscamos en la caché
                        return cache.match(event.request);
                    });
            })
        );
    } else {
        // Estrategia para el resto de archivos (App Shell): Cache first
        // Responde desde la caché si está disponible, si no, va a la red.
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        return response; // Servir desde la caché
                    }
                    return fetch(event.request); // Ir a la red
                })
        );
    }
});

// Activación: Limpia cachés antiguas
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
