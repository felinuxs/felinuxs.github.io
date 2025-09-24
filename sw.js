Service Worker// Define un nombre y versión para la caché
const CACHE_NAME = 'gestor-empresarial-v1.2';

// Lista de archivos que se deben cachear para que la app funcione offline
const urlsToCache = [
  '/',
  'index.html'
  // Nota: Los scripts y librerías externas (jspdf, etc.) se cargarán desde la red.
  // Si quisieras que funcionen 100% offline, también deberían ser cacheados.
];

// Evento 'install': se dispara cuando el Service Worker se instala.
// Aquí abrimos la caché y guardamos nuestros archivos.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierta');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento 'fetch': se dispara cada vez que la app hace una petición de red (p. ej., cargar una página, una imagen).
// Interceptamos la petición y respondemos con el archivo desde la caché si está disponible.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si encontramos una coincidencia en la caché, la devolvemos
        if (response) {
          return response;
        }
        // Si no, hacemos la petición a la red
        return fetch(event.request);
      })
  );
});

// Evento 'activate': se dispara para limpiar cachés antiguas.
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
