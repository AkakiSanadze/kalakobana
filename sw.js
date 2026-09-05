const CACHE_NAME = 'kalakobana-v1';

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
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Cache-first strategy for maximum offline reliability
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Fallback to index.html if offline navigation
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
