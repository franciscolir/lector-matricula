const CACHE='alpr-pwa-adv-v1';
const ASSETS=['./','./index.html','./style.css','./app.js','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png','https://unpkg.com/tesseract.js@5/dist/tesseract.min.js','https://docs.opencv.org/4.x/opencv.js'];
self.addEventListener('install',e=>
  {e.waitUntil(caches.open(CACHE).then(c=>
    c.addAll(ASSETS)).then(self.skipWaiting()));
  });
self.addEventListener('activate',e=>
  {e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>
    caches.delete(k)))));
   self.clients.claim();
  });
self.addEventListener('fetch',e=>
  {e.respondWith(caches.match(e.request).then(r=>
    r||fetch(e.request)));
  });
