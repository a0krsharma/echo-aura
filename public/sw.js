// Echo Service Worker for Offline Support
const CACHE_NAME = 'echo-v3';
const urlsToCache = [
  '/',
  '/rooms',
  '/studio',
  '/profile',
  '/notifications',
  '/search',
  '/waves',
  '/clash',
  '/radar',
  '/wire',
  '/terminal',
  '/manifest.json'
];

// Install event - cache assets & skipWaiting
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  // Skip non-HTTP requests (chrome-extension, data:, etc.)
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Skip Cloudinary, Agora telemetry, external analytics, and non-GET requests
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('cloudinary.com') ||
    event.request.url.includes('agora.io') ||
    event.request.url.includes('statscollector') ||
    event.request.url.includes('sd-rtn.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch(() => {});

            return response;
          })
          .catch(() => {
            return new Response('Network error occurred', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/plain' }),
            });
          });
      })
  );
});

// Activate event - clean up old caches & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
    ])
  );
});
