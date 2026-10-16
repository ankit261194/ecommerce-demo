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
} = require('../controllers/codVaultController');
const { protect, authorize } = require('../middlewares/auth');

// Public printable settlement slip
router.get('/slip/:id', getPrintableSettlementSlip);

// Protected routes
router.use(protect);

// Handover initiation (Rider or Admin)
router.post('/handover/initiate', initiateHandover);

// Settlements List (Rider sees own, Admin sees all)
router.get('/settlements', getVaultSettlements);

// Super Admin & Vault Manager routes
router.get('/summary', authorize('superadmin', 'admin'), getVaultSummary);
router.get('/riders-pending-cash', authorize('superadmin', 'admin'), getPendingRidersWithCash);
router.post('/handover/verify-otp', authorize('superadmin', 'admin'), verifyHandoverOtp);
router.post('/bank-deposit/:id', authorize('superadmin', 'admin'), recordBankDeposit);

module.exports = router;
