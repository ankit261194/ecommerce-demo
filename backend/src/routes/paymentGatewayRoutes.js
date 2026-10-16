const express = require('express');
const router = express.Router();
const {
  getPaymentGateways,
  updatePaymentGateways,
  testGatewayConnection,
  getPublicActiveGateways,
} = require('../controllers/paymentGatewayController');
const { protect, authorize } = require('../middlewares/auth');

// Public endpoints for customer storefront checkout payment options
router.get('/active-gateways', getPublicActiveGateways);
router.get('/active', getPublicActiveGateways);

// Super Admin Payment Gateway Control Center (Supports both /gateways and /admin/gateways)
router.get('/gateways', protect, authorize('superadmin', 'admin'), getPaymentGateways);
router.get('/admin/gateways', protect, authorize('superadmin', 'admin'), getPaymentGateways);

router.put('/gateways', protect, authorize('superadmin', 'admin'), updatePaymentGateways);
router.put('/admin/gateways', protect, authorize('superadmin', 'admin'), updatePaymentGateways);

router.post('/test-connection', protect, authorize('superadmin', 'admin'), testGatewayConnection);
router.post('/admin/test-connection', protect, authorize('superadmin', 'admin'), testGatewayConnection);

module.exports = router;
