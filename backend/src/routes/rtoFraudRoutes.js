const express = require('express');
const router = express.Router();
const rtoFraudController = require('../controllers/rtoFraudController');
const { protect, authorize } = require('../middlewares/auth');

// Public Storefront Pre-Checkout Evaluation
router.post('/predict', rtoFraudController.predictRtoRisk);

// Admin Protected Telemetry & Settings
router.use('/admin', protect, authorize('superadmin', 'admin'));
router.get('/admin/telemetry', rtoFraudController.getAdminRtoTelemetry);
router.get('/admin/config', rtoFraudController.getAdminRtoConfig);
router.put('/admin/config', rtoFraudController.updateAdminRtoConfig);
router.post('/admin/simulate', rtoFraudController.simulateRtoScoring);

module.exports = router;
