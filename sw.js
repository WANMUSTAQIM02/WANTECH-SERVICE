const CACHE_NAME = 'wantech-v10'; // Boleh tukar nombor ini jika ada update besar
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './logo.png'
];

// Pemasangan (Install) - Simpan cache baru
self.addEventListener('install', event => {
  self.skipWaiting(); // Paksa browser guna Service Worker baru serta-merta
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Pengaktifan (Activate) - Buang cache lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Buang cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// STRATEGI NETWORK-FIRST
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Jika ada internet & berjaya ambil data baru, simpan/update ke dalam cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Jika tiada internet (offline), barulah guna cache lama
        return caches.match(event.request);
      })
  );
});