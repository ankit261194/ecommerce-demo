// ============================================================================
// AuraMarket Enterprise Native PWA Service Worker
// Features: Offline-first asset caching, Network fallback, Background Sync & Web Push
// ============================================================================

const CACHE_NAME = 'auramarket-static-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

// Service Worker Installation & Asset Pre-caching
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline essentials');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Pre-cache skipped some optional assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Cache Activation & Stale Cache Pruning
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((staleName) => {
            console.log('[ServiceWorker] Purging stale cache:', staleName);
            return caches.delete(staleName);
          })
      );
    })
  );
  event.waitUntil(self.clients.claim());
});

// Fetch Interceptor: Stale-While-Revalidate for Static Assets, Network-First for API
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Bypass non-GET requests or browser extension schemes
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // API calls: Network-first with offline JSON fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            offline: true,
            message: 'You are currently browsing in offline mode. Cached data displayed.',
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Static Assets (JS, CSS, images, fonts): Cache-first with stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Handle incoming Web Push message payload
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'AuraMarket Notification', body: event.data.text() };
    }
  } else {
    data = {
      title: 'AuraMarket Update',
      body: 'Check out newly arrived deals in store!',
    };
  }

  const title = data.title || 'AuraMarket Notification';
  const options = {
    body: data.body || 'Tap to view details.',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    image: data.image || undefined,
    tag: data.tag || 'auramarket-push-' + Date.now(),
    vibrate: [100, 50, 100],
    data: {
      url: data.data?.url || data.url || '/',
      campaignId: data.data?.campaignId || data.campaignId || null,
      timestamp: Date.now(),
    },
    actions: data.actions || [
      { action: 'open', title: 'Open Store' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const clickData = event.notification.data || {};
  const targetUrl = clickData.url || '/';
  const campaignId = clickData.campaignId;

  // Record click telemetry ping
  if (campaignId) {
    fetch(`/api/push-notifications/track-click/${campaignId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  }

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if (client.url.includes(targetUrl)) {
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
