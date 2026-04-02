/// <reference lib="webworker" />

const CACHE_NAME = 'otaku-calendar-v1';
const STATIC_CACHE = 'otaku-static-v1';
const API_CACHE = 'otaku-api-v1';
const IMAGE_CACHE = 'otaku-images-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

const API_CACHE_DURATION = 60 * 60 * 1000;
const IMAGE_CACHE_DURATION = 24 * 60 * 60 * 1000;

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('otaku-') &&
                   name !== CACHE_NAME &&
                   name !== STATIC_CACHE &&
                   name !== API_CACHE &&
                   name !== IMAGE_CACHE;
          })
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API requests - Network First with Cache Fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCacheFallback(request));
    return;
  }

  // Image requests - Cache First with Network Fallback
  if (
    request.destination === 'image' ||
    url.hostname.includes('myanimelist') ||
    url.hostname.includes('img.animeschedule') ||
    url.hostname.includes('cdn.myanimelist') ||
    url.hostname.includes('media.discordapp')
  ) {
    event.respondWith(cacheFirstWithNetworkFallback(request, IMAGE_CACHE));
    return;
  }

  // Static assets and pages - Cache First
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.json')
  ) {
    event.respondWith(cacheFirstWithNetworkFallback(request, STATIC_CACHE));
    return;
  }

  // Navigation requests (HTML pages) - Network First
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithCacheFallback(request));
    return;
  }

  // Default - Network First
  event.respondWith(networkFirstWithCacheFallback(request));
});

// Strategy: Network First with Cache Fallback
async function networkFirstWithCacheFallback(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'Você está offline. Tente novamente quando tiver conexão.' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Strategy: Cache First with Network Fallback
async function cacheFirstWithNetworkFallback(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return a placeholder for images if offline
    if (request.destination === 'image') {
      return new Response(
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmMWYxIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCIgZmlsbD0iIzYzNjZmMSI+T2ZmbGluZTwvdGV4dD48L3N2Zz4=',
        {
          headers: { 'Content-Type': 'image/svg+xml' },
        }
      );
    }
    
    throw error;
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  
  const options = {
    body: data.body || 'Novo conteúdo disponível!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Otaku Calendar', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-favorites') {
    event.waitUntil(syncFavorites());
  }
});

async function syncFavorites() {
  console.log('Syncing favorites...');
}

export {};
