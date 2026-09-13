const CACHE_NAME = 'gravador-shell-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-first, no app-bundle precaching on purpose: Expo's own docs warn that aggressive
// service-worker caching can trap users on a stale build. This only exists so Chrome/Edge see a
// registered worker with a fetch handler and offer the "install app" prompt, with a basic offline
// fallback to whatever was last successfully fetched.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
