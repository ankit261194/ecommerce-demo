const express = require('express');
const router = express.Router();
const {
  getMyDeliveries,
  updateDeliveryStatus,
  verifyOtpAndCompleteDelivery,
  getTaskNavigationDetails,
  getTaskContactTemplates,
  logContactAttempt,
  resendDeliveryOtp,
  saveCustomerSignature,
  getTaskSignature,
  uploadProofPhoto,
  getTaskProofPhoto,
  getCodReconciliationSummary,
  submitCodReconciliation,
  getCodReconciliations,
  verifyCodReconciliation,
} = require('../controllers/deliveryController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.use(authorize('delivery', 'superadmin'));

router.get('/tasks', getMyDeliveries);
router.get('/tasks/:id/navigation', getTaskNavigationDetails);
router.get('/tasks/:id/contact-templates', getTaskContactTemplates);
router.post('/tasks/:id/contact-log', logContactAttempt);
router.post('/tasks/:id/resend-otp', resendDeliveryOtp);
router.put('/tasks/:id/status', updateDeliveryStatus);
router.post('/tasks/:id/verify-otp', verifyOtpAndCompleteDelivery);
router.post('/tasks/:id/signature', saveCustomerSignature);
router.get('/tasks/:id/signature', getTaskSignature);
router.post('/tasks/:id/proof-photo', uploadProofPhoto);
router.get('/tasks/:id/proof-photo', getTaskProofPhoto);

// Point #69: COD Cash Collection Reconciliation Routes
router.get('/cod/summary', getCodReconciliationSummary);
router.post('/cod/reconcile', submitCodReconciliation);
router.get('/cod/reconciliations', getCodReconciliations);
router.put('/cod/reconciliations/:id/verify', verifyCodReconciliation);

module.exports = router;
