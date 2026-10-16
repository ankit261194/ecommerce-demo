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
} = require('../controllers/abandonedCartController');
const { protect, authorize, optionalAuth } = require('../middlewares/auth');

// Public Storefront Cart Sync endpoint
router.post('/sync', optionalAuth, syncCartSession);

// Point #21: Public Storefront 1-Click WhatsApp Direct Cart Recovery endpoints
router.get('/recover/:token', getCartByRecoveryToken);
router.post('/recover/:token/complete', completeCartRecovery);

// Super Admin & Vendor Management routes
router.get('/admin/all', protect, authorize('superadmin', 'admin'), getAdminAbandonedCarts);
router.post('/admin/bulk-reminder', protect, authorize('superadmin', 'admin'), sendBulkReminders);
router.post('/admin/:id/send-reminder', protect, authorize('superadmin', 'admin'), sendCartReminder);
router.post('/admin/:id/whatsapp-link', protect, authorize('superadmin', 'admin', 'vendor'), generateWhatsAppRecoveryLink);
router.get('/admin/:id/whatsapp-link', protect, authorize('superadmin', 'admin', 'vendor'), generateWhatsAppRecoveryLink);
router.post('/admin/:id/mark-recovered', protect, authorize('superadmin', 'admin'), markCartRecovered);
router.delete('/admin/:id', protect, authorize('superadmin', 'admin'), deleteAbandonedCart);

module.exports = router;
