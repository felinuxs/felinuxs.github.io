const CACHE_NAME = 'punto-chat-pwa-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/app.js',
  '/manifest.json',
  'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
  // Asegúrate de añadir tus propios iconos aquí si los creas
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Si usas la imagen de fondo de WhatsApp, asegúrate de que también esté en caché
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/WhatsApp_Background.svg/1024px-WhatsApp_Background.svg.png'
];

// Evento 'install': Se ejecuta cuando el Service Worker se instala por primera vez
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cacheando archivos estáticos');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento 'activate': Se ejecuta cuando el Service Worker se activa
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        }).filter(Boolean) // Filter out null values
      );
    })
  );
});

// Evento 'fetch': Se ejecuta cada vez que el navegador solicita un recurso
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si el recurso está en caché, lo devuelve
        if (response) {
          return response;
        }
        // Si no está en caché, intenta obtenerlo de la red
        return fetch(event.request)
          .then((networkResponse) => {
            // Clona la respuesta porque un stream solo se puede consumir una vez
            const responseToCache = networkResponse.clone();
            // Abre el caché y guarda la respuesta de la red
            caches.open(CACHE_NAME)
              .then((cache) => {
                // Solo cachea respuestas exitosas y de HTTP/HTTPS
                if (networkResponse.ok && networkResponse.type === 'basic') {
                    cache.put(event.request, responseToCache);
                }
              });
            return networkResponse;
          })
          .catch(() => {
            // Si falla la red y no está en caché, puedes devolver una página offline
            console.log('Service Worker: Fallo de red para:', event.request.url);
            // Por ahora, solo devuelve una respuesta vacía o un error
            return new Response('<h1>Offline</h1><p>No se pudo cargar el recurso y no está en caché.</p>', {
                headers: { 'Content-Type': 'text/html' }
            });
          });
      })
  );
});

