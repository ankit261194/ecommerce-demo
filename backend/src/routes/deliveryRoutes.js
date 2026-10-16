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
  reportDeliveryFailure,
  rescheduleTask,
  getLiveGpsTracking,
  updateRiderLocation,
  getOptimizedRoute,
  applyRouteSequence,
  getRiderTipsSummary,
} = require('../controllers/deliveryController');
const { protect, authorize } = require('../middlewares/auth');

// Point 16: Public Live Real-Time GPS Tracking Map (Accessible by customer)
router.get('/live-tracking/:identifier', getLiveGpsTracking);

router.use(protect);
router.use(authorize('delivery', 'superadmin'));

// Point 14: Rider Delivery Tips & Earnings Summary
router.get('/rider/tips', getRiderTipsSummary);

// Point 16: Rider GPS Location Updates
router.patch('/rider/location', updateRiderLocation);

// Point 17: Multi-Stop Rider Delivery Route Optimizer
router.get('/rider/optimize-route', getOptimizedRoute);
router.post('/rider/apply-route-sequence', applyRouteSequence);

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

// Point #70: Delivery Failure & Reschedule Routes
router.post('/tasks/:id/fail', reportDeliveryFailure);
router.post('/tasks/:id/reschedule', rescheduleTask);

module.exports = router;
