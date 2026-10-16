const express = require('express');
const router = express.Router();
const emiController = require('../controllers/emiController');
const { protect, authorize } = require('../middlewares/auth');

// Public Storefront Endpoints
router.get('/config', emiController.getEmiConfig);
router.get('/calculate', emiController.calculateEmiPlans);
router.post('/calculate', emiController.calculateEmiPlans);

// Super Admin Endpoints
router.get('/admin/config', protect, authorize('superadmin', 'admin'), emiController.getAdminEmiConfig);
router.put('/admin/config', protect, authorize('superadmin', 'admin'), emiController.updateAdminEmiConfig);

module.exports = router;
