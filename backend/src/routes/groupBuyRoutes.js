const express = require('express');
const router = express.Router();
const {
  createPool,
  joinPool,
  getPoolDetails,
  getProductActivePools,
  getStorefrontDeals,
  getAdminPools,
  expireOldPools,
  updateProductGroupBuySettings,
} = require('../controllers/groupBuyController');
const { protect, authorize } = require('../middlewares/auth');

// Public Storefront Endpoints
router.get('/pools/:poolCodeOrId', getPoolDetails);
router.get('/product/:productId/pools', getProductActivePools);
router.get('/storefront/deals', getStorefrontDeals);

// Protected Customer Pool Operations
router.post('/pools', protect, createPool);
router.post('/pools/:poolId/join', protect, joinPool);

// Admin & Vendor Management Operations
router.get('/admin/pools', protect, authorize('superadmin', 'admin'), getAdminPools);
router.post('/admin/expire-check', protect, authorize('superadmin', 'admin'), expireOldPools);
router.put('/admin/product/:productId', protect, authorize('superadmin', 'admin', 'vendor'), updateProductGroupBuySettings);

module.exports = router;
