const express = require('express');
const router = express.Router();
const {
  getShippingQuotes,
  getShippingZones,
  createShippingZone,
  generateCustomsDeclaration,
} = require('../controllers/internationalShippingController');
const { protect, authorize } = require('../middlewares/auth');

// Public quotes & zones
router.post('/quotes', getShippingQuotes);
router.get('/zones', getShippingZones);

// Admin & Vendor customs declaration
router.get('/declaration/:orderId', protect, generateCustomsDeclaration);

// Admin-authenticated endpoints
router.post('/admin/zones', protect, authorize('superadmin'), createShippingZone);

module.exports = router;
