const express = require('express');
const router = express.Router();
const {
  getTaxSettings,
  updateTaxSettings,
  calculateTax,
  getHsnDirectory,
  testTaxMatrix,
} = require('../controllers/taxMatrixController');
const { protect, authorize } = require('../middlewares/auth');

// Public tax calculation and HSN directory
router.post('/calculate', calculateTax);
router.get('/hsn-directory', getHsnDirectory);

// Super Admin Tax Matrix Settings and Sandbox Simulator
router.get('/settings', protect, authorize('superadmin', 'admin'), getTaxSettings);
router.put('/settings', protect, authorize('superadmin', 'admin'), updateTaxSettings);
router.post('/test-matrix', protect, authorize('superadmin', 'admin'), testTaxMatrix);

// Admin prefixed aliases
router.get('/admin/settings', protect, authorize('superadmin', 'admin'), getTaxSettings);
router.put('/admin/settings', protect, authorize('superadmin', 'admin'), updateTaxSettings);
router.post('/admin/test-matrix', protect, authorize('superadmin', 'admin'), testTaxMatrix);

module.exports = router;
