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
} = require('../controllers/backupController');
const { protect, authorize } = require('../middlewares/auth');

// Super Admin Automated Scheduled Database Backup & Cloud Sync Routes
router.post('/create', protect, authorize('superadmin', 'admin'), createBackup);
router.get('/list', protect, authorize('superadmin', 'admin'), getBackups);
router.get('/stats', protect, authorize('superadmin', 'admin'), getDatabaseStats);
router.get('/schedule', protect, authorize('superadmin', 'admin'), getBackupSchedule);
router.put('/schedule', protect, authorize('superadmin', 'admin'), updateBackupSchedule);
router.get('/:id/download', protect, authorize('superadmin', 'admin'), downloadBackup);
router.post('/:id/cloud-sync', protect, authorize('superadmin', 'admin'), syncBackupToCloud);
router.delete('/:id', protect, authorize('superadmin', 'admin'), deleteBackup);

module.exports = router;
