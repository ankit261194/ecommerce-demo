const express = require('express');
const router = express.Router();
const {
  getMessagingSettings,
  updateMessagingSettings,
  testMessagingDispatch,
} = require('../controllers/messagingConfigController');
const { protect, authorize } = require('../middlewares/auth');

// Super Admin SMS & WhatsApp Cloud API Control Center
router.get('/settings', protect, authorize('superadmin', 'admin'), getMessagingSettings);
router.put('/settings', protect, authorize('superadmin', 'admin'), updateMessagingSettings);
router.post('/test-dispatch', protect, authorize('superadmin', 'admin'), testMessagingDispatch);

module.exports = router;
