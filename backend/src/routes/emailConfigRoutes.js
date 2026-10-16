const express = require('express');
const router = express.Router();
const {
  getEmailSettings,
  updateEmailSettings,
  getEmailTemplates,
  updateEmailTemplate,
  resetDefaultTemplates,
  previewRenderedTemplate,
  testEmailDispatch,
} = require('../controllers/emailConfigController');
const { protect, authorize } = require('../middlewares/auth');

// Super Admin Email SMTP & Visual Template Builder Control Center
router.get('/settings', protect, authorize('superadmin', 'admin'), getEmailSettings);
router.put('/settings', protect, authorize('superadmin', 'admin'), updateEmailSettings);
router.get('/templates', protect, authorize('superadmin', 'admin'), getEmailTemplates);
router.put('/templates/:templateKey', protect, authorize('superadmin', 'admin'), updateEmailTemplate);
router.post('/templates/reset', protect, authorize('superadmin', 'admin'), resetDefaultTemplates);
router.post('/preview', protect, authorize('superadmin', 'admin'), previewRenderedTemplate);
router.post('/test-dispatch', protect, authorize('superadmin', 'admin'), testEmailDispatch);

module.exports = router;
