const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const { protect, authorize } = require('../middlewares/auth');

// Public endpoints
router.get('/', bannerController.getPublicBanners);

// Admin dedicated routes
router.get('/admin/all', protect, authorize('SUPER_ADMIN'), bannerController.getAdminBanners);
router.post('/', protect, authorize('SUPER_ADMIN'), bannerController.createBanner);
router.put('/reorder', protect, authorize('SUPER_ADMIN'), bannerController.reorderBanners);

// Parameterized routes (placed after specific subroutes)
router.get('/:id', bannerController.getBannerById);
router.put('/:id', protect, authorize('SUPER_ADMIN'), bannerController.updateBanner);
router.delete('/:id', protect, authorize('SUPER_ADMIN'), bannerController.deleteBanner);
router.patch('/:id/toggle', protect, authorize('SUPER_ADMIN'), bannerController.toggleBannerStatus);

module.exports = router;
