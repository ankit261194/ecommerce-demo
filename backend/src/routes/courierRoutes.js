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
} = require('../controllers/courierController');
const { protect, authorize } = require('../middlewares/auth');

// Public tracking and label printing
router.get('/track/:awbOrSubOrderId', trackShipment);
router.get('/label/:awbCode', getShippingLabel);

// Vendor & Admin AWB operations
router.post('/generate-awb/:subOrderId', protect, authorize('superadmin', 'admin', 'vendor'), generateAwb);
router.post('/schedule-pickup/:subOrderId', protect, authorize('superadmin', 'admin', 'vendor'), schedulePickup);

// Super Admin Courier Aggregator Settings
router.get('/settings', protect, authorize('superadmin', 'admin'), getCourierSettings);
router.put('/settings', protect, authorize('superadmin', 'admin'), updateCourierSettings);
router.post('/test-connection', protect, authorize('superadmin', 'admin'), testCourierConnection);
router.get('/shipments', protect, authorize('superadmin', 'admin', 'vendor'), getShipmentsList);

// Admin prefixed aliases
router.get('/admin/settings', protect, authorize('superadmin', 'admin'), getCourierSettings);
router.put('/admin/settings', protect, authorize('superadmin', 'admin'), updateCourierSettings);
router.post('/admin/test-connection', protect, authorize('superadmin', 'admin'), testCourierConnection);
router.get('/admin/shipments', protect, authorize('superadmin', 'admin', 'vendor'), getShipmentsList);

module.exports = router;
