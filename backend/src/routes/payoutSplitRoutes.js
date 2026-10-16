const express = require('express');
const router = express.Router();
const {
  getVendorPayoutSplits,
  getAllAdminPayoutSplits,
  triggerPayoutSplit,
  simulatePayoutSplit,
} = require('../controllers/payoutSplitController');
const { protect, authorize } = require('../middlewares/auth');

// Public / Vendor Calculator Simulation
router.post('/simulate', simulatePayoutSplit);

// Vendor Payout Split Telemetry
router.get('/vendor', protect, authorize('vendor'), getVendorPayoutSplits);

// Super Admin Payout Split Management
router.get('/admin', protect, authorize('superadmin', 'admin'), getAllAdminPayoutSplits);
router.post('/admin/settle/:subOrderId', protect, authorize('superadmin', 'admin'), triggerPayoutSplit);

module.exports = router;
