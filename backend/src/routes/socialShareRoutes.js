const express = require('express');
const router = express.Router();
const socialShareController = require('../controllers/socialShareController');
const { protect, authorize } = require('../middlewares/auth');

// Public Social & Crawler Endpoints
router.get('/product/:id/meta', socialShareController.getPublicSocialMetadata);
router.get('/product/:id/card.svg', socialShareController.renderDynamicSocialCardSvg);
router.get('/product/:id', socialShareController.renderOpenGraphHtml);

// Super Admin Endpoints
router.get('/admin/config', protect, authorize('superadmin', 'admin'), socialShareController.getAdminConfig);
router.put('/admin/config', protect, authorize('superadmin', 'admin'), socialShareController.updateAdminConfig);
router.post('/admin/test-url', protect, authorize('superadmin', 'admin'), socialShareController.testSocialUrl);

module.exports = router;
