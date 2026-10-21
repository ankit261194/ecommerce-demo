const express = require('express');
const router = express.Router();
const {
  evaluatePreview,
  getFraudDashboard,
  getFraudIncidents,
  getFraudIncidentById,
  resolveFraudIncident,
  getFraudRules,
  updateFraudRule,
  getFraudSettings,
  updateFraudSettings,
  toggleShadowBan,
  exportFraudReportCsv,
} = require('../controllers/fraudController');
const { protect, authorize } = require('../middlewares/auth');

// Optional auth for evaluate-preview (handles guest & logged-in customers)
const optionalProtect = (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return protect(req, res, next);
  }
  next();
};

// =========================================================================
// POINT 50: FRAUD DETECTION & PREVENTION ENGINE
// =========================================================================

// Public / Customer Checkout Pre-flight preview
router.post('/evaluate-preview', optionalProtect, evaluatePreview);

// Super Admin / Security Operations Routes
router.get('/dashboard', protect, authorize('superadmin', 'admin'), getFraudDashboard);
router.get('/incidents', protect, authorize('superadmin', 'admin'), getFraudIncidents);
router.get('/incidents/:id', protect, authorize('superadmin', 'admin'), getFraudIncidentById);
router.post('/incidents/:id/resolve', protect, authorize('superadmin', 'admin'), resolveFraudIncident);
router.get('/rules', protect, authorize('superadmin', 'admin'), getFraudRules);
router.put('/rules/:id', protect, authorize('superadmin', 'admin'), updateFraudRule);
router.get('/settings', protect, authorize('superadmin', 'admin'), getFraudSettings);
router.put('/settings', protect, authorize('superadmin', 'admin'), updateFraudSettings);
router.post('/users/:userId/shadow-ban', protect, authorize('superadmin', 'admin'), toggleShadowBan);
router.get('/export-csv', protect, authorize('superadmin', 'admin'), exportFraudReportCsv);

module.exports = router;
