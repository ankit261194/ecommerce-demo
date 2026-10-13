const express = require('express');
const router = express.Router();
const {
  getDashboardAnalytics,
  getAllVendors,
  updateVendorStatus,
  getAllOrders,
  updateOrderStatus,
  getPlatformLedger,
  triggerWipeDemo,
  triggerSeedDemo,
  getIntegrations,
  updateIntegrations,
  testSMSIntegration,
  testEmailIntegration,
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
router.put('/orders/:id/status', updateOrderStatus);
router.patch('/orders/:id/status', updateOrderStatus);
router.get('/ledger', getPlatformLedger);

// Integrations & API Hub
router.get('/integrations', getIntegrations);
router.put('/integrations', updateIntegrations);
router.post('/integrations/test-sms', testSMSIntegration);
router.post('/integrations/test-email', testEmailIntegration);

// 1-Click Operations
router.post('/wipe-demo', triggerWipeDemo);
router.post('/demo/wipe', triggerWipeDemo);
router.post('/seed-demo', triggerSeedDemo);
router.post('/demo/seed', triggerSeedDemo);

module.exports = router;
