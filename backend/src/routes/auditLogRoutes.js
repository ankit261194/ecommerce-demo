const express = require('express');
const router = express.Router();
const {
  getAuditLogs,
  getAuditLogStats,
  exportAuditLogs,
  pruneAuditLogs,
  logCustomEvent,
} = require('../controllers/auditLogController');
const { protect, authorize } = require('../middlewares/auth');

// All audit trail endpoints require Super Admin or Admin authorization
router.use(protect);
router.use(authorize('superadmin', 'admin'));

router.get('/', getAuditLogs);
router.get('/stats', getAuditLogStats);
router.get('/export', exportAuditLogs);
router.post('/log-custom-event', logCustomEvent);

// Prune is strictly restricted to Super Admin only
router.delete('/prune', authorize('superadmin'), pruneAuditLogs);

module.exports = router;
