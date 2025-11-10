const CACHE_NAME = 'gestor-empresarial-v1.3'; // Cambia la versión si haces futuras actualizaciones
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://html2canvas.hertzen.com/dist/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://placehold.co/192x192/3498db/ffffff?text=GE'
];

// Instala el Service Worker y guarda el 'app shell' en la caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto y listo para guardar archivos.');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Activa el Service Worker y elimina cachés antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Intercepta las peticiones (fetch) para servir desde la caché
self.addEventListener('fetch', event => {
  event.respondWith(
    // Estrategia: Cache primero, y si falla, ir a la red (Cache First)
    caches.match(event.request)
      .then(response => {
        // Si la respuesta está en la caché, la retornamos
        if (response) {
          return response;
        }

        // Si no, la buscamos en la red
        return fetch(event.request).then(
          networkResponse => {
            // Verificamos que la respuesta de red sea válida
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            // Clonamos la respuesta para poder guardarla en caché y enviarla al navegador
            let responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      })
  );
});
