const express = require('express');
const router = express.Router();
const {
  getVaultSummary,
  getVaultSettlements,
  getPendingRidersWithCash,
  initiateHandover,
  verifyHandoverOtp,
  recordBankDeposit,
  getPrintableSettlementSlip,
  getRiderCashInHandTelemetry,
  getRidersLimitMonitor,
  updateRiderCashLimit,
  raiseDispute,
  resolveDispute,
  recordVaultRemittanceDrop,
  exportSettlementsCsv,
} = require('../controllers/codVaultController');
const { protect, authorize } = require('../middlewares/auth');

// Public printable settlement slip
router.get('/slip/:id', getPrintableSettlementSlip);

// Protected routes
router.use(protect);

// Point 45: Rider Live Cash-in-Hand Telemetry & Threshold Status
router.get('/rider/cash-in-hand', authorize('delivery', 'superadmin', 'admin'), getRiderCashInHandTelemetry);

// Handover initiation (Rider or Admin)
router.post('/handover/initiate', initiateHandover);

// Settlements List (Rider sees own, Admin sees all)
router.get('/settlements', getVaultSettlements);

// Point 45: Dispute Workflow
router.post('/settlements/:id/dispute', authorize('delivery', 'superadmin', 'admin'), raiseDispute);
router.post('/settlements/:id/resolve-dispute', authorize('superadmin', 'admin'), resolveDispute);

// Super Admin & Vault Manager routes
router.get('/summary', authorize('superadmin', 'admin'), getVaultSummary);
router.get('/riders-pending-cash', authorize('superadmin', 'admin'), getPendingRidersWithCash);
router.get('/riders-limit-monitor', authorize('superadmin', 'admin'), getRidersLimitMonitor);
router.put('/riders/:id/cash-limit', authorize('superadmin', 'admin'), updateRiderCashLimit);
router.post('/handover/verify-otp', authorize('superadmin', 'admin'), verifyHandoverOtp);
router.post('/handover/vault-drop', authorize('superadmin', 'admin'), recordVaultRemittanceDrop);
router.post('/bank-deposit/:id', authorize('superadmin', 'admin'), recordBankDeposit);
router.get('/export-csv', authorize('superadmin', 'admin'), exportSettlementsCsv);

module.exports = router;

