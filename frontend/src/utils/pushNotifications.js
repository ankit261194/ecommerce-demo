import api from '../api/client';

/**
 * Convert VAPID base64 URL-safe string to Uint8Array for PushManager
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if Web Push & Service Workers are supported in the current environment
 */
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current browser notification permission
 */
export function getPermissionStatus() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

/**
 * Register Service Worker
 */
export async function registerServiceWorker() {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (err) {
    console.warn('[Push] ServiceWorker registration failed:', err);
    return null;
  }
}

/**
 * Get active PushSubscription if already subscribed
 */
export async function getExistingSubscription() {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    return null;
  }
}

/**
 * Request Notification Permission and register push subscription with backend
 */
export async function requestAndSubscribe(customerEmail = '', tags = ['deals', 'orders']) {
  if (!isPushSupported()) {
    throw new Error('Web Push notifications are not supported on this browser/device.');
  }

  // 1. Request Browser Permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted by the user.');
  }

  // 2. Register Service Worker
  const registration = await registerServiceWorker();
  if (!registration) {
    throw new Error('Failed to initialize Service Worker.');
  }

  // 3. Fetch VAPID Public Key from Backend
  const keyRes = await api.get('/push-notifications/vapid-public-key');
  if (!keyRes.data?.success || !keyRes.data.publicKey) {
    throw new Error('Failed to retrieve VAPID public key from backend.');
  }
  const vapidPublicKey = keyRes.data.publicKey;

  // 4. Subscribe with PushManager
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  const subJson = subscription.toJSON();

  // 5. Sync Subscription with Backend
  const syncRes = await api.post('/push-notifications/subscribe', {
    endpoint: subJson.endpoint,
    keys: subJson.keys,
    customerEmail,
    tags,
  });

  return {
    subscription,
    backendData: syncRes.data,
  };
}

/**
 * Unsubscribe from Web Push notifications
 */
export async function unsubscribePush() {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await api.post('/push-notifications/unsubscribe', {
        endpoint: subscription.endpoint,
      }).catch(() => {});
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[Push] Unsubscribe failed:', err);
    return false;
  }
}
