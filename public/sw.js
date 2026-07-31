const CACHE_NAME = 'cotizador-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/content/logo-gemeseg-back-white.png',
  '/content/logo-gemeseg-back-blue.png',
];

// Install: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('Cache addAll failed, caching individually:', err);
        return Promise.allSettled(
          STATIC_ASSETS.map(url => cache.add(url).catch(() => console.warn('Failed to cache:', url)))
        );
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

// Fetch: network first, fallback to cache
self.addEventListener('fetch', event => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase API calls
  if (request.url.includes('supabase.co')) return;

  // Skip Google Sheets API calls
  if (request.url.includes('googleapis.com')) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        // Clone and cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then(cached => {
          if (cached) return cached;

          // For navigation requests, return cached index.html
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }

          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
