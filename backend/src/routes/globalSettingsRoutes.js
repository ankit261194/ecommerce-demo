const express = require('express');
const router = express.Router();
const {
  getPublicGlobalSettings,
  getAdminGlobalSettings,
  updateGlobalSettings,
  toggleMaintenanceMode,
  syncExchangeRates,
  updateCurrencies,
} = require('../controllers/globalSettingsController');
const { protect, authorize } = require('../middlewares/auth');

// Public storefront global branding & maintenance check (or Admin if mounted under /admin)
router.get('/', (req, res, next) => {
  if (req.baseUrl && req.baseUrl.includes('admin')) {
    return protect(req, res, () => authorize('superadmin', 'admin')(req, res, () => getAdminGlobalSettings(req, res, next)));
  }
  return getPublicGlobalSettings(req, res, next);
});
router.put('/', protect, authorize('superadmin', 'admin'), updateGlobalSettings);

// Super Admin Management Endpoints
router.get('/settings', protect, authorize('superadmin', 'admin'), getAdminGlobalSettings);
router.put('/settings', protect, authorize('superadmin', 'admin'), updateGlobalSettings);
router.patch('/maintenance', protect, authorize('superadmin', 'admin'), toggleMaintenanceMode);
router.post('/sync-currency-rates', protect, authorize('superadmin', 'admin'), syncExchangeRates);
router.put('/currencies', protect, authorize('superadmin', 'admin'), updateCurrencies);

// Admin prefixed aliases (for flexibility when called via /api/global-settings/admin/* or /api/admin/global-settings/*)
router.get('/admin', protect, authorize('superadmin', 'admin'), getAdminGlobalSettings);
router.get('/admin/settings', protect, authorize('superadmin', 'admin'), getAdminGlobalSettings);
router.put('/admin', protect, authorize('superadmin', 'admin'), updateGlobalSettings);
router.put('/admin/settings', protect, authorize('superadmin', 'admin'), updateGlobalSettings);
router.patch('/admin/maintenance', protect, authorize('superadmin', 'admin'), toggleMaintenanceMode);
router.post('/admin/sync-currency-rates', protect, authorize('superadmin', 'admin'), syncExchangeRates);
router.put('/admin/currencies', protect, authorize('superadmin', 'admin'), updateCurrencies);

module.exports = router;
