const CACHE_NAME = "jampos-web-cache-v7";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.json",
  "./icon.svg",
  "./icon-192.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512.svg",
  "./tailwind.js",
  "./html2canvas.min.js",
  "./fontawesome.min.css",
  "./fa-brands-400.woff2",
  "./fa-brands-400.ttf",
  "./fa-regular-400.woff2",
  "./fa-regular-400.ttf",
  "./fa-solid-900.woff2",
  "./fa-solid-900.ttf",
  "./fa-v4compatibility.woff2",
  "./fa-v4compatibility.ttf",
  "./style.css",
  "./quagga.min.js",
  "./web-bridge.js",
  "./qrcode.min.js",
  "./jsqr.js",
  "./sync-client.js",
  "./app.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).then(function() {
        return cache.match('./trial-meta').then(function(resp) {
          if (!resp) {
            var meta = JSON.stringify({ installed: Date.now(), version: 'trial-30d' });
            return cache.put('./trial-meta', new Response(meta, { headers: { 'Content-Type': 'application/json' } }));
          }
        });
      });
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

self.addEventListener("message", function(event) {
  var data = event.data;
  if (data && data.type === "showNotification") {
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      tag: data.tag || "jampos",
      vibrate: [200, 100, 200],
      requireInteraction: true
    });
  }
  if (data && data.type === "getTrialMeta") {
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.match('./trial-meta');
    }).then(function(resp) {
      if (resp) {
        resp.json().then(function(meta) {
          event.source.postMessage({ type: 'trialMeta', data: meta });
        });
      }
    }).catch(function() {});
  }
  if (data && data.type === "saveTrialStart") {
    var meta = JSON.stringify({ installed: data.timestamp, version: 'trial-30d' });
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.put('./trial-meta', new Response(meta, { headers: { 'Content-Type': 'application/json' } }));
    }).catch(function() {});
  }
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url && "focus" in clientList[i]) return clientList[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(self.registration.scope);
    })
  );
});

self.addEventListener("sync", function(event) {
  if (event.tag === "sync-data") {
    event.waitUntil(Promise.resolve());
  }
});

self.addEventListener("fetch", (event) => {
  var req = event.request;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(function() {
        return caches.match("./index.html").then(function(cached) {
          return cached || caches.match("./offline.html");
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
        return cached || caches.match("./offline.html");
      });
      return cached || fetchPromise;
    })
  );
});
