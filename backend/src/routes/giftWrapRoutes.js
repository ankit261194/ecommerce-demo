const express = require('express');
const router = express.Router();
const {
  getGiftWrapConfig,
  getAdminConfig,
  updateAdminConfig,
  generateGiftSlip,
} = require('../controllers/giftWrapController');
const { protect, authorize } = require('../middlewares/auth');

// Public storefront configuration
router.get('/config', getGiftWrapConfig);

// Protected routes
router.get('/orders/:id/gift-slip', protect, generateGiftSlip);

// Super Admin & Admin management routes
router.get('/admin/config', protect, authorize('superadmin', 'admin'), getAdminConfig);
router.put('/admin/config', protect, authorize('superadmin', 'admin'), updateAdminConfig);

module.exports = router;
