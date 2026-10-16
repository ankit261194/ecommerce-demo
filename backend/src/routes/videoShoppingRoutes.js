const express = require('express');
const router = express.Router();
const videoShoppingController = require('../controllers/videoShoppingController');
const { protect, authorize } = require('../middlewares/auth');

// Public Storefront Endpoints
router.get('/reels', videoShoppingController.getStorefrontReels);
router.get('/reels/:id', videoShoppingController.getReelById);
router.post('/reels/:id/view', videoShoppingController.recordReelView);
router.post('/reels/:id/like', videoShoppingController.likeReel);
router.post('/reels/:id/comment', videoShoppingController.commentOnReel);

// Admin / Vendor Protected Management Endpoints
router.use('/admin', protect, authorize('superadmin', 'admin', 'vendor'));
router.get('/admin/reels', videoShoppingController.getAdminReels);
router.post('/admin/reels', videoShoppingController.createReel);
router.put('/admin/reels/:id', videoShoppingController.updateReel);
router.delete('/admin/reels/:id', videoShoppingController.deleteReel);

module.exports = router;
