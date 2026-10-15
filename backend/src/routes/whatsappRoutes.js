const express = require('express');
const router = express.Router();
const {
  sendOrderConfirmation,
  handleBotQuery,
  getWhatsAppTemplates,
} = require('../controllers/whatsappController');

// Point #71: WhatsApp Order Confirmation & Bot Engine Routes
router.post('/order-confirmation', sendOrderConfirmation);
router.post('/bot-query', handleBotQuery);
router.get('/templates', getWhatsAppTemplates);

module.exports = router;
