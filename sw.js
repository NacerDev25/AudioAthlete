const CACHE_NAME = 'audioathlete-v3';
const ASSETS_TO_CACHE = [
  'index.html',
  'style.css',
  'js.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'icon.svg',
  'ar_start.mp3',
  'ar_half.mp3',
  'ar_three.mp3',
  'ar_rest.mp3',
  'en_start.mp3',
  'en_half.mp3',
  'en_three.mp3',
  'en_rest.mp3'
];

// Install event: cache all essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching all assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event: Network-first falling back to cache
// This ensures users always get the latest code if online
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If we get a valid network response, clone it to the cache
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If network fails (offline), serve from cache
        return caches.match(event.request);
      })
  );
});
