const express = require('express');
const router = express.Router();
const { getUIConfig, updateUIConfig } = require('../controllers/uiController');
const { protect, authorize } = require('../middlewares/auth');

router.get('/config', getUIConfig);
router.put('/config', protect, authorize('superadmin'), updateUIConfig);

module.exports = router;
