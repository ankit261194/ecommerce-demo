const express = require('express');
const router = express.Router();
const {
  getShippingSettings,
  updateShippingSettings,
  calculateShippingQuote,
  testShippingQuote,
} = require('../controllers/shippingController');
const { protect, authorize } = require('../middlewares/auth');

// Public Shipping Quote & Customer Options
router.post('/calculate-quote', calculateShippingQuote);
router.post('/quote', calculateShippingQuote);
router.get('/settings', getShippingSettings);

// Super Admin Shipping Engine Settings & Sandbox
router.get('/admin/settings', protect, authorize('superadmin', 'admin'), getShippingSettings);
router.put('/admin/settings', protect, authorize('superadmin', 'admin'), updateShippingSettings);
router.put('/settings', protect, authorize('superadmin', 'admin'), updateShippingSettings);
router.post('/admin/test-quote', protect, authorize('superadmin', 'admin'), testShippingQuote);
router.post('/test-quote', protect, authorize('superadmin', 'admin'), testShippingQuote);

module.exports = router;
