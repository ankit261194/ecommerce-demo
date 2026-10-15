const express = require('express');
const router = express.Router();
const {
  getAdminAbandonedCarts,
  sendCartReminder,
  sendBulkReminders,
  syncCartSession,
  markCartRecovered,
  deleteAbandonedCart,
} = require('../controllers/abandonedCartController');
const { protect, authorize, optionalAuth } = require('../middlewares/auth');

// Public Storefront Cart Sync endpoint
router.post('/sync', optionalAuth, syncCartSession);

// Super Admin Management routes
router.get('/admin/all', protect, authorize('superadmin', 'admin'), getAdminAbandonedCarts);
router.post('/admin/bulk-reminder', protect, authorize('superadmin', 'admin'), sendBulkReminders);
router.post('/admin/:id/send-reminder', protect, authorize('superadmin', 'admin'), sendCartReminder);
router.post('/admin/:id/mark-recovered', protect, authorize('superadmin', 'admin'), markCartRecovered);
router.delete('/admin/:id', protect, authorize('superadmin', 'admin'), deleteAbandonedCart);

module.exports = router;
