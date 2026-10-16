// ============================================================================
// AuraMarket Enterprise Native Web Push Service Worker
// Handles background push events, rich action buttons & notification clicks
// ============================================================================

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if (client.url.includes(targetUrl)) {
            return client.focus();
          }
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
