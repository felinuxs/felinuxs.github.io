const CACHE_NAME = "jampos-cache-v7";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.svg",
  "/icon-512.svg",
  "/tailwind.js",
  "/html2canvas.min.js",
  "/fontawesome.min.css",
  "/fa-brands-400.woff2",
  "/fa-brands-400.ttf",
  "/fa-regular-400.woff2",
  "/fa-regular-400.ttf",
  "/fa-solid-900.woff2",
  "/fa-solid-900.ttf",
  "/fa-v4compatibility.woff2",
  "/fa-v4compatibility.ttf",
  "/style.css",
  "/quagga.min.js",
  "/js/config.js",
  "/js/utils.js",
  "/js/db.js",
  "/js/cloud-sync.js",
  "/js/scanner.js",
  "/js/app.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    }).catch(function() {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", (event) => {
  var req = event.request;
  
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(function() {
        return caches.match("/index.html").then(function(cached) {
          return cached || caches.match("/offline.html");
        });
      })
    );
    return;
  }

  var url = new URL(req.url);
  
  if (url.origin !== location.origin) return;
  
  event.respondWith(
    caches.match(req).then(function(cached) {
      var fetchPromise = fetch(req).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(req, clone);
          });
        }
        return response;
      }).catch(function() {
        return cached || caches.match("/offline.html");
      });
      return cached || fetchPromise;
    })
  );
});
