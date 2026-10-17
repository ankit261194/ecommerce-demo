const express = require('express');
const router = express.Router();
const {
  getStorageSettings,
  updateStorageSettings,
  testStoragePing,
  optimizeImageSimulate,
  getPresignedUploadUrl,
  listCloudAssets,
  deleteCloudAsset,
  directUploadLocalHandler,
} = require('../controllers/storageConfigController');
const { protect, authorize } = require('../middlewares/auth');

// Super Admin Multi-Cloud Storage & S3 CDN Configurator Routes
router.get('/settings', protect, authorize('superadmin', 'admin'), getStorageSettings);
router.put('/settings', protect, authorize('superadmin', 'admin'), updateStorageSettings);
router.post('/test-ping', protect, authorize('superadmin', 'admin'), testStoragePing);
router.post('/optimize-preview', protect, authorize('superadmin', 'admin'), optimizeImageSimulate);

// Point 21: Presigned Direct Upload & Cloud Asset Routes
router.post('/presigned-upload', protect, authorize('superadmin', 'admin'), getPresignedUploadUrl);
router.get('/assets', protect, authorize('superadmin', 'admin'), listCloudAssets);
router.delete('/assets/:key(*)', protect, authorize('superadmin', 'admin'), deleteCloudAsset);
router.delete('/assets', protect, authorize('superadmin', 'admin'), deleteCloudAsset);
router.put('/upload-direct/*', protect, authorize('superadmin', 'admin'), directUploadLocalHandler);

module.exports = router;
