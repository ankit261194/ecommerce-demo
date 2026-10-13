const express = require('express');
const router = express.Router();
const {
  getDashboardAnalytics,
  getAllVendors,
  updateVendorStatus,
  getAllOrders,
  getPlatformLedger,
  triggerWipeDemo,
  triggerSeedDemo,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/auth');

// All admin routes require Super Admin authorization
router.use(protect);
router.use(authorize('superadmin'));

router.get('/analytics', getDashboardAnalytics);
router.get('/vendors', getAllVendors);
router.put('/vendors/:id/status', updateVendorStatus);
router.patch('/vendors/:id/status', updateVendorStatus);
router.patch('/vendors/:id/commission', updateVendorStatus);
router.get('/orders', getAllOrders);
router.get('/ledger', getPlatformLedger);

// 1-Click Operations
router.post('/wipe-demo', triggerWipeDemo);
router.post('/demo/wipe', triggerWipeDemo);
router.post('/seed-demo', triggerSeedDemo);
router.post('/demo/seed', triggerSeedDemo);

module.exports = router;
