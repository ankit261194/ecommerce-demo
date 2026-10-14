const express = require('express');
const router = express.Router();
const { getUIConfig, updateUIConfig, getAnnouncement, updateAnnouncement } = require('../controllers/uiController');
const { protect, authorize } = require('../middlewares/auth');

router.get('/config', getUIConfig);
router.put('/config', protect, authorize('superadmin'), updateUIConfig);
router.get('/announcement', getAnnouncement);
router.put('/announcement', protect, authorize('superadmin'), updateAnnouncement);

module.exports = router;
