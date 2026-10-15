const express = require('express');
const router = express.Router();
const {
  getCurrenciesAndRates,
  convertCurrency,
  getLanguages,
  getLocaleTranslations,
  updateRates,
  updateSettings,
} = require('../controllers/localizationController');
const { protect, authorize } = require('../middlewares/auth');

// Public Storefront Localization Endpoints
router.get('/currencies', getCurrenciesAndRates);
router.get('/convert', convertCurrency);
router.get('/languages', getLanguages);
router.get('/translations/:lang', getLocaleTranslations);

// Super Admin Management Endpoints
router.put('/admin/rates', protect, authorize('superadmin', 'admin'), updateRates);
router.put('/admin/settings', protect, authorize('superadmin', 'admin'), updateSettings);
router.put('/rates', protect, authorize('superadmin', 'admin'), updateRates);
router.put('/settings', protect, authorize('superadmin', 'admin'), updateSettings);

module.exports = router;
