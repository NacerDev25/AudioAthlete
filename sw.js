const CACHE_NAME = 'audio-athlete-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './js.js',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './ar_start.mp3',
  './ar_half.mp3',
  './ar_three.mp3',
  './ar_rest.mp3',
  './en_start.mp3',
  './en_half.mp3',
  './en_three.mp3',
  './en_rest.mp3'
];

// Install Event - Caching Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event - Cleaning old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// Fetch Event - Serving from cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
