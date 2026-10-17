const express = require('express');
const router = express.Router();
const {
  getAdminAbandonedCarts,
  sendCartReminder,
  sendBulkReminders,
  syncCartSession,
  markCartRecovered,
  deleteAbandonedCart,
  generateWhatsAppRecoveryLink,
  getCartByRecoveryToken,
  completeCartRecovery,
  runRecoveryScheduler,
  getExitIntentConfig,
  updateExitIntentConfig,
  recordExitIntentEvent,
  getAbandonedRevenueAnalytics,
  getRecoverySequenceConfig,
  updateRecoverySequenceConfig,
  triggerAutomatedRecoveryDrip,
  sendManualDripNudge,
  testChannelDispatch,
  getSequenceAnalytics,
} = require('../controllers/abandonedCartController');
const { protect, authorize, optionalAuth } = require('../middlewares/auth');

// Public Storefront Cart Sync endpoint
router.post('/sync', optionalAuth, syncCartSession);

// Point #21: Public Storefront 1-Click WhatsApp Direct Cart Recovery endpoints
router.get('/recover/:token', getCartByRecoveryToken);
router.post('/recover/:token/complete', completeCartRecovery);

// Point 13: Exit-Intent Popup & Sequence Tracking Endpoints (Public)
router.get('/exit-intent-config', getExitIntentConfig);
router.post('/exit-intent-event', recordExitIntentEvent);

// Point 29: Automated Abandoned Cart Recovery Sequences (Email + WhatsApp drip campaigns)
router.get('/admin/sequences/config', protect, authorize('superadmin', 'admin'), getRecoverySequenceConfig);
router.get('/sequences/config', protect, authorize('superadmin', 'admin'), getRecoverySequenceConfig);
router.put('/admin/sequences/config', protect, authorize('superadmin', 'admin'), updateRecoverySequenceConfig);
router.put('/sequences/config', protect, authorize('superadmin', 'admin'), updateRecoverySequenceConfig);

router.post('/admin/sequences/run', protect, authorize('superadmin', 'admin'), triggerAutomatedRecoveryDrip);
router.post('/sequences/run', protect, authorize('superadmin', 'admin'), triggerAutomatedRecoveryDrip);

router.post('/admin/sequences/test-dispatch', protect, authorize('superadmin', 'admin'), testChannelDispatch);
router.post('/sequences/test-dispatch', protect, authorize('superadmin', 'admin'), testChannelDispatch);

router.get('/admin/sequences/analytics', protect, authorize('superadmin', 'admin'), getSequenceAnalytics);
router.get('/sequences/analytics', protect, authorize('superadmin', 'admin'), getSequenceAnalytics);

router.post('/admin/:id/drip-nudge', protect, authorize('superadmin', 'admin'), sendManualDripNudge);
router.post('/:id/drip-nudge', protect, authorize('superadmin', 'admin'), sendManualDripNudge);

// Super Admin & Vendor Management routes
router.get('/', protect, authorize('superadmin', 'admin'), getAdminAbandonedCarts);
router.get('/all', protect, authorize('superadmin', 'admin'), getAdminAbandonedCarts);
router.get('/admin/all', protect, authorize('superadmin', 'admin'), getAdminAbandonedCarts);
router.get('/admin/analytics', protect, authorize('superadmin', 'admin'), getAbandonedRevenueAnalytics);
router.get('/analytics', protect, authorize('superadmin', 'admin'), getAbandonedRevenueAnalytics);
router.put('/admin/exit-intent-config', protect, authorize('superadmin', 'admin'), updateExitIntentConfig);
router.put('/exit-intent-config', protect, authorize('superadmin', 'admin'), updateExitIntentConfig);
router.post('/admin/run-scheduler', protect, authorize('superadmin', 'admin'), runRecoveryScheduler);
router.post('/run-scheduler', protect, authorize('superadmin', 'admin'), runRecoveryScheduler);

router.post('/admin/bulk-reminder', protect, authorize('superadmin', 'admin'), sendBulkReminders);
router.post('/admin/:id/send-reminder', protect, authorize('superadmin', 'admin'), sendCartReminder);
router.post('/admin/:id/whatsapp-link', protect, authorize('superadmin', 'admin', 'vendor'), generateWhatsAppRecoveryLink);
router.get('/admin/:id/whatsapp-link', protect, authorize('superadmin', 'admin', 'vendor'), generateWhatsAppRecoveryLink);
router.post('/admin/:id/mark-recovered', protect, authorize('superadmin', 'admin'), markCartRecovered);
router.delete('/admin/:id', protect, authorize('superadmin', 'admin'), deleteAbandonedCart);

module.exports = router;

