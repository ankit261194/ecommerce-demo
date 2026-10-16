const express = require('express');
const router = express.Router();
const {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  trackClick,
  getSubscribers,
  getCampaigns,
  sendBroadcast,
  sendTestNotification,
  deleteSubscriber,
} = require('../controllers/pushNotificationController');
const { protect, authorize, optionalAuth } = require('../middlewares/auth');

// ============================================================================
// PUBLIC WEB PUSH ROUTES
// ============================================================================
router.get('/vapid-public-key', getVapidPublicKey);
router.post('/subscribe', optionalAuth, subscribe);
router.post('/unsubscribe', unsubscribe);
router.post('/track-click/:campaignId', trackClick);

// ============================================================================
// SUPER ADMIN BROADCAST & TELEMETRY ROUTES
// ============================================================================
router.get('/admin/subscribers', protect, authorize('superadmin', 'admin'), getSubscribers);
router.get('/admin/campaigns', protect, authorize('superadmin', 'admin'), getCampaigns);
router.post('/admin/broadcast', protect, authorize('superadmin', 'admin'), sendBroadcast);
router.post('/admin/test', protect, authorize('superadmin', 'admin'), sendTestNotification);
router.delete('/admin/subscribers/:id', protect, authorize('superadmin', 'admin'), deleteSubscriber);

module.exports = router;
