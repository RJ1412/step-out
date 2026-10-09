// Step Out Hand-Written Service Worker
// Designed for trail use: keeps the pocket card accessible with zero cellular signal.

const CACHE_NAME = 'stepout-v1';
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never intercept API requests with stale service-worker data
  if (request.url.includes('/api/')) {
    return;
  }

  // Network-first strategy for pages and assets, fallback to cache when offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone and store successful GET responses in cache
        if (request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(async () => {
        // Offline: try serving from cache
        const cached = await caches.match(request);
        if (cached) return cached;

        // If navigating to any page offline, serve the root shell
        if (request.mode === 'navigate') {
          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;
        }

        return new Response('Offline: Step Out cache unavailable', {
          status: 503,
          statusText: 'Offline',
        });
      })
  );
});
