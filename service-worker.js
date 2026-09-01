// Clark Golf Group — Service Worker
// Enables PWA "Add to Home Screen" and basic offline support

const CACHE_NAME = 'clark-golf-v2';   // bumped: purges any stale v1 entries on activate

// Files to cache for offline use
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Pages that must always come straight from the network (never a cached or
// substituted copy): the admin portal. Everything under /portal is bypassed.
const NETWORK_ONLY_PATHS = ['/portal'];

// Install: pre-cache core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        // Don't block install if some files fail to cache
        console.warn('[SW] Pre-cache failed for some files:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first strategy (always get fresh Firebase data)
// Falls back to cache if offline
self.addEventListener('fetch', event => {
  // Skip non-GET and cross-origin Firebase requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('firebaseio.com')) return;
  if (event.request.url.includes('googleapis.com')) return;

  const url = new URL(event.request.url);

  // Portal: hands off entirely — the browser fetches it fresh, no cache, no fallback.
  if (url.origin === self.location.origin &&
      NETWORK_ONLY_PATHS.some(p => url.pathname.startsWith(p))) {
    return;
  }

  const isNavigation = event.request.mode === 'navigate';

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return response;
      })
      .catch(() => {
        // Network failed — try the cache for this exact request (ignoring ?v= style params)
        return caches.match(event.request, { ignoreSearch: true }).then(cached => {
          if (cached) return cached;
          // Last resort: ONLY substitute the main page for a navigation to the app itself.
          // Never answer some other page's URL with index.html (that is what left the
          // portal looking blank until a refresh).
          if (isNavigation && (url.pathname === '/' || url.pathname === '/index.html')) {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline',
            headers: { 'Content-Type': 'text/plain' } });
        });
      })
  );
});
