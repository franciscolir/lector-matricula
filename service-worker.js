
const CACHE_NAME = 'placa-cache-v1';
const urlsToCache = [
  './',
  'index.html',
  'manifest.json',
  'https://unpkg.com/tesseract.js@5.0.1/dist/tesseract.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});

