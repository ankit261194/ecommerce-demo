const express = require('express');
const router = express.Router();
const {
  sendOrderConfirmation,
  handleBotQuery,
  getWhatsAppTemplates,
} = require('../controllers/whatsappController');
const {
  verifyWebhook,
  handleIncomingWebhook,
} = require('../controllers/whatsappBotController');

// Point #71: WhatsApp Order Confirmation & Bot Engine Routes
router.post('/order-confirmation', sendOrderConfirmation);
router.post('/bot-query', handleBotQuery);
router.get('/templates', getWhatsAppTemplates);

// Webhook Aliases for Meta Cloud API
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleIncomingWebhook);

module.exports = router;
