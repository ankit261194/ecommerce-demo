const pushService = require('../services/pushNotificationService');
const PushSubscription = require('../models/PushSubscription');
const PushCampaign = require('../models/PushCampaign');

// @desc    Get VAPID Public Key for Browser Subscription
// @route   GET /api/push-notifications/vapid-public-key
// @access  Public
exports.getVapidPublicKey = async (req, res, next) => {
  try {
    const key = pushService.getVapidPublicKey();
    res.status(200).json({
      success: true,
      publicKey: key,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Subscribe Browser to Web Push
// @route   POST /api/push-notifications/subscribe
// @access  Public (optional user auth)
exports.subscribe = async (req, res, next) => {
  try {
    const { endpoint, keys, customerEmail, tags } = req.body;
    const userAgent = req.headers['user-agent'] || '';

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription payload: endpoint and keys (p256dh, auth) are required.',
      });
    }

    const subscription = await pushService.saveSubscription({
      endpoint,
      keys,
      user: req.user?._id || null,
      customerEmail: customerEmail || req.user?.email || '',
      userAgent,
      tags: tags || ['deals', 'orders'],
    });

    res.status(201).json({
      success: true,
      message: 'Browser registered for native Web Push notifications.',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unsubscribe Browser from Web Push
// @route   POST /api/push-notifications/unsubscribe
// @access  Public
exports.unsubscribe = async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'Subscription endpoint is required.' });
    }

    await pushService.removeSubscription(endpoint);

    res.status(200).json({
      success: true,
      message: 'Web Push subscription successfully removed.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Track notification click for Campaign CTR analytics
// @route   POST /api/push-notifications/track-click/:campaignId
// @access  Public
exports.trackClick = async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    if (campaignId && campaignId !== 'null') {
      await PushCampaign.findByIdAndUpdate(campaignId, { $inc: { clickCount: 1 } }).catch(() => {});
    }
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// SUPER ADMIN PUSH NOTIFICATION MANAGEMENT
// ============================================================================

// @desc    Get Push Subscribers with telemetry metrics
// @route   GET /api/push-notifications/admin/subscribers
// @access  Private (Super Admin)
exports.getSubscribers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const query = {};
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    const skip = (Number(page) - 1) * Number(limit);

    const [subscribers, total, totalActive, desktopCount, mobileCount, tabletCount] =
      await Promise.all([
        PushSubscription.find(query)
          .populate('user', 'name email role')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        PushSubscription.countDocuments(),
        PushSubscription.countDocuments({ isActive: true }),
        PushSubscription.countDocuments({ isActive: true, deviceType: 'desktop' }),
        PushSubscription.countDocuments({ isActive: true, deviceType: 'mobile' }),
        PushSubscription.countDocuments({ isActive: true, deviceType: 'tablet' }),
      ]);

    res.status(200).json({
      success: true,
      data: subscribers,
      telemetry: {
        totalSubscribers: total,
        activeSubscribers: totalActive,
        desktopCount,
        mobileCount,
        tabletCount,
      },
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Past Broadcast Campaigns with Delivery & CTR metrics
// @route   GET /api/push-notifications/admin/campaigns
// @access  Private (Super Admin)
exports.getCampaigns = async (req, res, next) => {
  try {
    const campaigns = await PushCampaign.find()
      .populate('sentBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    const totalCampaigns = campaigns.length;
    const totalSent = campaigns.reduce((acc, c) => acc + (c.sentCount || 0), 0);
    const totalDelivered = campaigns.reduce((acc, c) => acc + (c.successCount || 0), 0);
    const totalClicks = campaigns.reduce((acc, c) => acc + (c.clickCount || 0), 0);
    const overallCtr = totalDelivered > 0 ? ((totalClicks / totalDelivered) * 100).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      data: campaigns,
      summary: {
        totalCampaigns,
        totalSent,
        totalDelivered,
        totalClicks,
        overallCtr: Number(overallCtr),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Broadcast Web Push Notification
// @route   POST /api/push-notifications/admin/broadcast
// @access  Private (Super Admin)
exports.sendBroadcast = async (req, res, next) => {
  try {
    const { title, body, icon, badge, image, targetUrl, targetAudience, actions } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Notification Title and Message Body are required.',
      });
    }

    const result = await pushService.broadcastPush(
      {
        title,
        body,
        icon: icon || '/favicon.ico',
        badge: badge || '/favicon.ico',
        image: image || '',
        targetUrl: targetUrl || '/',
        targetAudience: targetAudience || 'all',
        actions: actions || [
          { action: 'open_deal', title: 'Shop Now' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      },
      req.user
    );

    res.status(200).json({
      success: true,
      message: `Broadcast dispatched to ${result.sentCount} devices (${result.successCount} delivered successfully).`,
      campaign: result.campaign,
      telemetry: {
        sentCount: result.sentCount,
        successCount: result.successCount,
        failureCount: result.failureCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send Instant Test Notification to a specific Subscriber
// @route   POST /api/push-notifications/admin/test
// @access  Private (Super Admin)
exports.sendTestNotification = async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    let targetSub;

    if (endpoint) {
      targetSub = await PushSubscription.findOne({ endpoint });
    } else {
      // Pick current admin subscription or most recent active subscription
      targetSub =
        (await PushSubscription.findOne({ user: req.user?._id, isActive: true })) ||
        (await PushSubscription.findOne({ isActive: true }).sort({ createdAt: -1 }));
    }

    if (!targetSub) {
      return res.status(404).json({
        success: false,
        message: 'No active push subscription device found to send test notification.',
      });
    }

    const result = await pushService.sendPushNotification(targetSub, {
      title: '🔔 AuraMarket Web Push Test',
      body: 'Congratulations! Your native browser web push notifications are working smoothly.',
      icon: '/favicon.ico',
      targetUrl: '/ecommerce-demo/',
      actions: [
        { action: 'test_ok', title: 'Great!' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'Test notification delivered successfully.',
      result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Subscriber
// @route   DELETE /api/push-notifications/admin/subscribers/:id
// @access  Private (Super Admin)
exports.deleteSubscriber = async (req, res, next) => {
  try {
    const sub = await PushSubscription.findByIdAndDelete(req.params.id);
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Subscriber not found.' });
    }
    res.status(200).json({ success: true, message: 'Subscriber deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
