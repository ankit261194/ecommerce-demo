const express = require('express');
const router = express.Router();
const {
  getServerHealth,
  getDatabaseTelemetry,
  getCronJobs,
  runCronJob,
  toggleCronJob,
  getBackups,
  triggerBackup,
  getBackupSchedule,
  updateBackupSchedule,
  downloadBackup,
  simulateRestore,
  getApiMetrics,
  simulateApiDiagnosticPing,
  resetApiMetrics,
} = require('../controllers/telemetryController');
const { protect, authorize } = require('../middlewares/auth');

// All telemetry & server management routes are restricted to Super Admin & Sub-Admin
router.use(protect);
router.use(authorize('superadmin', 'subadmin'));

// Live Server, Health & Telemetry
router.get('/server-health', getServerHealth);
router.get('/health', getServerHealth);
router.get('/database', getDatabaseTelemetry);

// Point 33: Live API Telemetry & Traffic Insights
router.get('/api-metrics', getApiMetrics);
router.post('/api-metrics/simulate-ping', simulateApiDiagnosticPing);
router.post('/api-metrics/reset', authorize('superadmin'), resetApiMetrics);

// Cron Jobs Engine
router.get('/cron-jobs', getCronJobs);
router.post('/cron-jobs/:id/run', authorize('superadmin'), runCronJob);
router.patch('/cron-jobs/:id/toggle', authorize('superadmin'), toggleCronJob);

// Automated Backup Engine & Scheduler
router.get('/backups', getBackups);
router.post('/backups/trigger', authorize('superadmin'), triggerBackup);
router.get('/backups/schedule', getBackupSchedule);
router.put('/backups/schedule', authorize('superadmin'), updateBackupSchedule);
router.get('/backups/:id/download', authorize('superadmin'), downloadBackup);
router.post('/backups/:id/restore-simulation', authorize('superadmin'), simulateRestore);

module.exports = router;
