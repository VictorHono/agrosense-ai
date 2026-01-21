// Bump cache version when SW logic changes
const CACHE_NAME = 'agrocamer-v2';
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('AgroCamer: Caching essential assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, then cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Never cache JS/CSS/worker files: stale bundles can break the app (invalid hook calls)
  const dest = event.request.destination;
  if (dest === 'script' || dest === 'style' || dest === 'worker') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Skip API calls - they should always try network
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Vous êtes hors ligne. Veuillez vérifier votre connexion.' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache only navigations and same-origin static assets we explicitly want (avoid JS/CSS)
        if (response.status === 200) {
          const url = new URL(event.request.url);
          const isSameOrigin = url.origin === self.location.origin;
          const isNavigation = event.request.mode === 'navigate';
          const isSafeAsset = isSameOrigin && (dest === 'document' || dest === 'image' || dest === 'font');

          if (isNavigation || isSafeAsset) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') return caches.match(OFFLINE_URL);
          return new Response('Contenu non disponible hors ligne', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-analyses') {
    event.waitUntil(syncPendingAnalyses());
  }
});

async function syncPendingAnalyses() {
  // Sync pending analyses when back online
  console.log('AgroCamer: Syncing pending analyses...');
}

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'Nouvelle notification AgroCamer',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'explore', title: 'Voir' },
      { action: 'close', title: 'Fermer' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('AgroCamer', options)
  );
});
