const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const PushCampaign = require('../models/PushCampaign');
const Order = require('../models/Order');
const AbandonedCart = require('../models/AbandonedCart');

// Standard Default VAPID Keys for AuraMarket Enterprise (can be overridden via ENV)
const DEFAULT_VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BDuY-04o0bHIRjdIwH4Nkw7AHAtoAaVLbJaBr085g0aFyDju0ZPDXqwodqU35r8EFlpzPnbJ1evFwYar0LWKMl8';

const DEFAULT_VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'jAEICTntAWYrvL9dUMt2ErgF2eZaLLAL3yJdz9Ike0w';

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@auramarket.online';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, DEFAULT_VAPID_PUBLIC_KEY, DEFAULT_VAPID_PRIVATE_KEY);
} catch (err) {
  console.warn('[WebPush] Error configuring VAPID details:', err.message);
}

/**
 * Determine device type from user-agent string
 */
function parseDeviceType(userAgent = '') {
  const ua = userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (
    /mobile|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop|windows phone/i.test(ua)
  ) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Get Public VAPID Key for browser client registration
 */
function getVapidPublicKey() {
  return DEFAULT_VAPID_PUBLIC_KEY;
}

/**
 * Register or update browser push subscription
 */
async function saveSubscription({
  endpoint,
  keys,
  user = null,
  customerEmail = '',
  userAgent = '',
  tags = ['deals', 'orders'],
}) {
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new Error('Valid push subscription endpoint and encryption keys are required');
  }

  const deviceType = parseDeviceType(userAgent);

  const existing = await PushSubscription.findOne({ endpoint });
  if (existing) {
    existing.keys = keys;
    if (user) existing.user = user;
    if (customerEmail) existing.customerEmail = customerEmail;
    if (userAgent) existing.userAgent = userAgent;
    existing.deviceType = deviceType;
    existing.isActive = true;
    if (Array.isArray(tags) && tags.length > 0) {
      existing.tags = Array.from(new Set([...(existing.tags || []), ...tags]));
    }
    await existing.save();
    return existing;
  }

  const newSub = await PushSubscription.create({
    endpoint,
    keys,
    user: user || null,
    customerEmail: customerEmail || '',
    userAgent,
    deviceType,
    tags: Array.isArray(tags) ? tags : ['deals', 'orders'],
    isActive: true,
  });

  return newSub;
}

/**
 * Remove or deactivate push subscription
 */
async function removeSubscription(endpoint) {
  if (!endpoint) return false;
  const res = await PushSubscription.deleteOne({ endpoint });
  return res.deletedCount > 0;
}

/**
 * Send Web Push notification to a single subscriber
 */
async function sendPushNotification(subscription, payload = {}) {
  const isMock =
    !subscription.endpoint ||
    subscription.endpoint.includes('mock') ||
    subscription.endpoint.includes('example.com') ||
    subscription.endpoint.includes('localhost') ||
    subscription.endpoint.includes('test_sub') ||
    process.env.NODE_ENV === 'test';

  const stringPayload =
    typeof payload === 'string'
      ? payload
      : JSON.stringify({
          title: payload.title || 'AuraMarket Notification',
          body: payload.body || 'You have an update regarding your store.',
          icon: payload.icon || '/favicon.ico',
          badge: payload.badge || '/favicon.ico',
          image: payload.image || '',
          data: {
            url: payload.targetUrl || payload.url || '/',
            campaignId: payload.campaignId || null,
            ...payload.data,
          },
          actions: payload.actions || [
            { action: 'open', title: 'Open Store' },
            { action: 'close', title: 'Dismiss' },
          ],
        });

  if (isMock) {
    // Simulated successful delivery in test/mock environment
    await PushSubscription.updateOne(
      { endpoint: subscription.endpoint },
      { $set: { lastNotifiedAt: new Date() }, $inc: { notificationCount: 1 } }
    ).catch(() => {});
    return { success: true, simulated: true };
  }

  try {
    const pushSub = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    };

    await webpush.sendNotification(pushSub, stringPayload, {
      TTL: 60 * 60 * 24, // 24 hours
      urgency: 'high',
    });

    await PushSubscription.updateOne(
      { endpoint: subscription.endpoint },
      { $set: { lastNotifiedAt: new Date() }, $inc: { notificationCount: 1 } }
    ).catch(() => {});

    return { success: true };
  } catch (error) {
    // 404 or 410 Gone indicates expired or revoked subscription in browser
    if (error.statusCode === 404 || error.statusCode === 410) {
      await PushSubscription.updateOne({ endpoint: subscription.endpoint }, { $set: { isActive: false } }).catch(() => {});
    }
    return { success: false, error: error.message, statusCode: error.statusCode };
  }
}

/**
 * Broadcast notification to targeted subscriber segments
 */
async function broadcastPush(campaignData, adminUser = null) {
  const {
    title,
    body,
    icon = '/favicon.ico',
    badge = '',
    image = '',
    targetUrl = '/',
    targetAudience = 'all',
    actions = [
      { action: 'view_deal', title: 'Shop Now' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  } = campaignData;

  if (!title || !body) {
    throw new Error('Notification title and body are required');
  }

  // Determine query by target audience
  const query = { isActive: true };

  if (targetAudience === 'customers') {
    query.user = { $ne: null };
  } else if (targetAudience === 'active_orders') {
    const activeOrders = await Order.find({
      orderStatus: { $in: ['PLACED', 'CONFIRMED', 'SHIPPED', 'OUT_FOR_DELIVERY'] },
    }).select('user customerEmail');
    const userIds = activeOrders.map(o => o.user).filter(Boolean);
    const emails = activeOrders.map(o => o.customerEmail).filter(Boolean);
    query.$or = [{ user: { $in: userIds } }, { customerEmail: { $in: emails } }];
  } else if (targetAudience === 'abandoned_cart') {
    const abandoned = await AbandonedCart.find({
      status: 'ABANDONED',
    }).select('customerEmail');
    const emails = abandoned.map(a => a.customerEmail).filter(Boolean);
    query.$or = [{ tags: 'cart_abandoned' }, { customerEmail: { $in: emails } }];
  }

  const subscribers = await PushSubscription.find(query);

  const campaign = await PushCampaign.create({
    title,
    body,
    icon,
    badge,
    image,
    targetUrl,
    targetAudience,
    actions,
    sentCount: subscribers.length,
    sentBy: adminUser?._id || null,
  });

  let successCount = 0;
  let failureCount = 0;

  for (const sub of subscribers) {
    const res = await sendPushNotification(sub, {
      title,
      body,
      icon,
      badge,
      image,
      targetUrl,
      campaignId: campaign._id.toString(),
      actions,
    });
    if (res.success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  campaign.successCount = successCount;
  campaign.failureCount = failureCount;
  campaign.status = failureCount === subscribers.length && subscribers.length > 0 ? 'failed' : 'sent';
  await campaign.save();

  return {
    campaign,
    sentCount: subscribers.length,
    successCount,
    failureCount,
  };
}

/**
 * Dispatch automated push alert for order milestone transition
 */
async function sendOrderMilestonePush(order, milestone) {
  if (!order) return;
  const targetEmail = order.customerEmail;
  const targetUser = order.user;

  const subscriber = await PushSubscription.findOne({
    isActive: true,
    $or: [{ user: targetUser }, { customerEmail: targetEmail }],
  });

  if (!subscriber) return;

  const milestoneMessages = {
    CONFIRMED: {
      title: `✅ Order Confirmed! (#${order.orderId || order._id.toString().slice(-6)})`,
      body: `Your payment was verified. Merchant is preparing your items for dispatch.`,
    },
    SHIPPED: {
      title: `🚚 Order Dispatched! (#${order.orderId || order._id.toString().slice(-6)})`,
      body: `Your package has been handed over to courier partner. Tap to track live.`,
    },
    OUT_FOR_DELIVERY: {
      title: `🛵 Out for Delivery! (#${order.orderId || order._id.toString().slice(-6)})`,
      body: `Your order is arriving today! Please keep your doorstep ready.`,
    },
    DELIVERED: {
      title: `🎉 Order Delivered Successfully!`,
      body: `Order #${order.orderId || order._id.toString().slice(-6)} has been handed over. Enjoy your purchase!`,
    },
  };

  const alert = milestoneMessages[milestone] || {
    title: `Order Update: ${milestone}`,
    body: `Your order #${order.orderId || order._id.toString().slice(-6)} status has been updated.`,
  };

  await sendPushNotification(subscriber, {
    title: alert.title,
    body: alert.body,
    targetUrl: `/order/${order._id}`,
    icon: '/favicon.ico',
    actions: [
      { action: 'track_order', title: 'Track Order' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
}

module.exports = {
  getVapidPublicKey,
  saveSubscription,
  removeSubscription,
  sendPushNotification,
  broadcastPush,
  sendOrderMilestonePush,
  parseDeviceType,
};
