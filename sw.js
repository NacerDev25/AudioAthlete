const CACHE_NAME = 'audio-athlete-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './js.js',
  './manifest.json',
  './icon.svg',
  './sounds/ar/start.mp3',
  './sounds/ar/half.mp3',
  './sounds/ar/three.mp3',
  './sounds/ar/rest.mp3',
  './sounds/en/start.mp3',
  './sounds/en/half.mp3',
  './sounds/en/three.mp3',
  './sounds/en/rest.mp3'
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
