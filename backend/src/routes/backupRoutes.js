const express = require('express');
const router = express.Router();
const {
  createBackup,
  getBackups,
  downloadBackup,
  syncBackupToCloud,
  deleteBackup,
  getBackupSchedule,
  updateBackupSchedule,
  getDatabaseStats,
  togglePinBackup,
  restoreBackup,
  pruneOldBackups,
  testOffsiteCloudPing,
} = require('../controllers/backupController');
const { protect, authorize } = require('../middlewares/auth');

// Super Admin Automated Scheduled Database Backup & Cloud Sync Routes
router.post('/create', protect, authorize('superadmin', 'admin'), createBackup);
router.get('/list', protect, authorize('superadmin', 'admin'), getBackups);
router.get('/stats', protect, authorize('superadmin', 'admin'), getDatabaseStats);
router.get('/schedule', protect, authorize('superadmin', 'admin'), getBackupSchedule);
router.put('/schedule', protect, authorize('superadmin', 'admin'), updateBackupSchedule);
router.post('/prune', protect, authorize('superadmin', 'admin'), pruneOldBackups);
router.post('/test-offsite-ping', protect, authorize('superadmin', 'admin'), testOffsiteCloudPing);
router.get('/:id/download', protect, authorize('superadmin', 'admin'), downloadBackup);
router.post('/:id/cloud-sync', protect, authorize('superadmin', 'admin'), syncBackupToCloud);
router.post('/:id/pin', protect, authorize('superadmin', 'admin'), togglePinBackup);
router.post('/:id/restore', protect, authorize('superadmin', 'admin'), restoreBackup);
router.delete('/:id', protect, authorize('superadmin', 'admin'), deleteBackup);

module.exports = router;
