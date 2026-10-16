const express = require('express');
const router = express.Router();
const {
  getStorageSettings,
  updateStorageSettings,
  testStoragePing,
  optimizeImageSimulate,
} = require('../controllers/storageConfigController');
const { protect, authorize } = require('../middlewares/auth');

// Super Admin Multi-Cloud Storage & S3 CDN Configurator Routes
router.get('/settings', protect, authorize('superadmin', 'admin'), getStorageSettings);
router.put('/settings', protect, authorize('superadmin', 'admin'), updateStorageSettings);
router.post('/test-ping', protect, authorize('superadmin', 'admin'), testStoragePing);
router.post('/optimize-preview', protect, authorize('superadmin', 'admin'), optimizeImageSimulate);

module.exports = router;
