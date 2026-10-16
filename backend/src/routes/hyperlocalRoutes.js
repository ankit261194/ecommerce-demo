const express = require('express');
const router = express.Router();
const {
  getActiveDarkStores,
  checkGpsBoundary,
  getAdminDarkStores,
  createDarkStore,
  updateDarkStore,
  toggleSurgePricing,
  deleteDarkStore,
} = require('../controllers/hyperlocalController');
const { protect, authorize } = require('../middlewares/auth');

// Public storefront & checkout geofence endpoints
router.get('/dark-stores', getActiveDarkStores);
router.post('/check-boundary', checkGpsBoundary);

// Super Admin Dark Store & Geofence Polygon Management
router.use(protect);
router.use(authorize('superadmin'));

router.get('/admin/dark-stores', getAdminDarkStores);
router.post('/admin/dark-stores', createDarkStore);
router.put('/admin/dark-stores/:id', updateDarkStore);
router.post('/admin/dark-stores/:id/toggle-surge', toggleSurgePricing);
router.delete('/admin/dark-stores/:id', deleteDarkStore);

module.exports = router;
