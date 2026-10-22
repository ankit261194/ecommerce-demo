const express = require('express');
const router = express.Router();
const {
  verifyWebhook,
  handleIncomingWebhook,
  simulateConversation,
  getBotConfig,
  updateBotConfig,
  getConversationLogs,
  getAlertLogs,
  sendManualAlert,
  sendOrderConfirmationAlert,
  sendTrackingUpdateAlert,
  sendDeliveryOtpAlert,
  sendAbandonedCartAlert,
  getWhatsAppAnalytics,
} = require('../controllers/whatsappBotController');
const { protect, authorize } = require('../middlewares/auth');

// Public Webhook Handshake & Ingestion
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleIncomingWebhook);

// Protected: Live Simulator (Super Admin, Admin & Vendors)
router.post('/simulate', protect, simulateConversation);

// Super Admin Only Operations
router.get('/config', protect, authorize('superadmin', 'admin'), getBotConfig);
router.put('/config', protect, authorize('superadmin', 'admin'), updateBotConfig);
router.get('/analytics', protect, authorize('superadmin', 'admin'), getWhatsAppAnalytics);
router.get('/conversations', protect, authorize('superadmin', 'admin'), getConversationLogs);
router.get('/alerts', protect, authorize('superadmin', 'admin'), getAlertLogs);
router.post('/send-alert', protect, authorize('superadmin', 'admin'), sendManualAlert);

// Outbound Transactional Alert Dispatches
router.post('/send-order-confirmation', protect, authorize('superadmin', 'admin'), sendOrderConfirmationAlert);
router.post('/send-tracking-update', protect, authorize('superadmin', 'admin'), sendTrackingUpdateAlert);
router.post('/send-delivery-otp', protect, authorize('superadmin', 'admin'), sendDeliveryOtpAlert);
router.post('/send-abandoned-cart', protect, authorize('superadmin', 'admin'), sendAbandonedCartAlert);

module.exports = router;
