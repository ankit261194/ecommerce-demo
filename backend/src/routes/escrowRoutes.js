const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const {
  getVendorEscrowSummary,
  releaseMaturedEscrowFunds,
  getAdminEscrowRadar,
  adminBatchReleaseEscrow,
  disputeEscrowHold,
  resolveEscrowDispute,
  getEscrowConfig,
  updateEscrowConfig,
} = require('../controllers/escrowController');

// Vendor endpoints (accessible by vendor and superadmin)
router.get('/summary', protect, authorize('vendor', 'superadmin', 'admin'), getVendorEscrowSummary);
router.post('/release-matured', protect, authorize('vendor', 'superadmin', 'admin'), releaseMaturedEscrowFunds);

// Super Admin Treasury & Dispute engine endpoints
router.get('/radar', protect, authorize('superadmin', 'admin'), getAdminEscrowRadar);
router.post('/batch-release', protect, authorize('superadmin', 'admin'), adminBatchReleaseEscrow);
router.post('/:subOrderId/dispute', protect, authorize('superadmin', 'admin'), disputeEscrowHold);
router.post('/:subOrderId/resolve-dispute', protect, authorize('superadmin', 'admin'), resolveEscrowDispute);
router.get('/config', protect, authorize('superadmin', 'admin'), getEscrowConfig);
router.put('/config', protect, authorize('superadmin', 'admin'), updateEscrowConfig);

module.exports = router;
