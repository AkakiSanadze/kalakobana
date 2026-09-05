const CACHE_NAME = 'kalakobana-v7';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './manifest.json',
  './icon.svg',
  './data/letters.js',
  './data/countries.js',
  './data/cities.js',
  './data/plants.js',
  './data/animals.js',
  './data/geography.js',
  './data/names.js',
  './data/items.js',
  './data/cars.js',
  './data/professions.js',
  './data/dishes.js',
  './data/celebrities.js',
  './data/media.js',
  './data/sports.js',
  './data/adjectives.js',
  './js/config.js',
  './js/storage.js',
  './js/validator.js',
  './js/scoring.js',
  './js/bots.js',
  './js/audio.js',
  './js/game.js',
  './js/ui.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Network-first strategy for navigation and assets so updates are immediate when online
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
