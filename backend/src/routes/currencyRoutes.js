const express = require('express');
const router = express.Router();
const {
  getActiveCurrencies,
  convertCurrency,
  getAdminCurrencies,
  createCurrency,
  updateCurrency,
  syncLiveRates,
} = require('../controllers/currencyController');
const { protect, authorize } = require('../middlewares/auth');

// Public endpoints
router.get('/list', getActiveCurrencies);
router.post('/convert', convertCurrency);

// Admin-authenticated endpoints
router.get('/admin', protect, authorize('superadmin'), getAdminCurrencies);
router.post('/admin', protect, authorize('superadmin'), createCurrency);
router.put('/admin/:code', protect, authorize('superadmin'), updateCurrency);
router.post('/admin/sync', protect, authorize('superadmin'), syncLiveRates);

module.exports = router;
