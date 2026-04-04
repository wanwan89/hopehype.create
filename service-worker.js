const CACHE_NAME = 'hopehype-v1';

// File yang wajib ada supaya aplikasi bisa dibuka offline (tampilan dasar)
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Ambil dari cache, jika tidak ada baru ambil dari internet
      return response || fetch(event.request);
    })
  );
});
