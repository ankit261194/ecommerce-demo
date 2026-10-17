const express = require('express');
const router = express.Router();
const {
  getCourierSettings,
  updateCourierSettings,
  testCourierConnection,
  generateAwb,
  schedulePickup,
  trackShipment,
  getShipmentsList,
  getShippingLabel,
  compareCarrierRates,
  dispatchWithFallback,
  bulkDispatchWithFallback,
  getCarrierHealthStatus,
  ingestCourierWebhook,
} = require('../controllers/courierController');
const { protect, authorize } = require('../middlewares/auth');

// Public tracking, label printing, and webhook ingestion
router.get('/track/:awbOrSubOrderId', trackShipment);
router.get('/label/:awbCode', getShippingLabel);
router.post('/webhook/:carrier', ingestCourierWebhook);

// Vendor & Admin AWB operations
router.post('/generate-awb/:subOrderId', protect, authorize('superadmin', 'admin', 'vendor'), generateAwb);
router.post('/schedule-pickup/:subOrderId', protect, authorize('superadmin', 'admin', 'vendor'), schedulePickup);

// Point 46: Multi-Carrier Rate Comparison & Fallback Dispatch
router.post('/rates/compare', protect, authorize('superadmin', 'admin', 'vendor'), compareCarrierRates);
router.post('/dispatch-with-fallback/:subOrderId', protect, authorize('superadmin', 'admin', 'vendor'), dispatchWithFallback);
router.post('/bulk-dispatch-with-fallback', protect, authorize('superadmin', 'admin', 'vendor'), bulkDispatchWithFallback);

// Super Admin Courier Aggregator Settings & Health Radar
router.get('/settings', protect, authorize('superadmin', 'admin'), getCourierSettings);
router.put('/settings', protect, authorize('superadmin', 'admin'), updateCourierSettings);
router.post('/test-connection', protect, authorize('superadmin', 'admin'), testCourierConnection);
router.get('/health-status', protect, authorize('superadmin', 'admin'), getCarrierHealthStatus);
router.get('/shipments', protect, authorize('superadmin', 'admin', 'vendor'), getShipmentsList);

// Admin prefixed aliases
router.get('/admin/settings', protect, authorize('superadmin', 'admin'), getCourierSettings);
router.put('/admin/settings', protect, authorize('superadmin', 'admin'), updateCourierSettings);
router.post('/admin/test-connection', protect, authorize('superadmin', 'admin'), testCourierConnection);
router.get('/admin/health-status', protect, authorize('superadmin', 'admin'), getCarrierHealthStatus);
router.get('/admin/shipments', protect, authorize('superadmin', 'admin', 'vendor'), getShipmentsList);
router.post('/admin/rates/compare', protect, authorize('superadmin', 'admin', 'vendor'), compareCarrierRates);
router.post('/admin/dispatch-with-fallback/:subOrderId', protect, authorize('superadmin', 'admin', 'vendor'), dispatchWithFallback);
router.post('/admin/bulk-dispatch-with-fallback', protect, authorize('superadmin', 'admin', 'vendor'), bulkDispatchWithFallback);

module.exports = router;

