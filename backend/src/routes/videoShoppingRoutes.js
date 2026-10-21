const express = require('express');
const router = express.Router();
const videoShoppingController = require('../controllers/videoShoppingController');
const { protect, authorize } = require('../middlewares/auth');

// Public Storefront Endpoints - Reels
router.get('/reels', videoShoppingController.getStorefrontReels);
router.get('/reels/:id', videoShoppingController.getReelById);
router.post('/reels/:id/view', videoShoppingController.recordReelView);
router.post('/reels/:id/like', videoShoppingController.likeReel);
router.post('/reels/:id/comment', videoShoppingController.commentOnReel);

// Public Storefront Endpoints - Live Video Streaming (Point #54)
router.get('/live', videoShoppingController.getActiveLiveStreams);
router.get('/live/:id', videoShoppingController.getLiveStreamDetails);
router.post('/live/:id/chat', videoShoppingController.sendChatMessage);
router.post('/live/:id/like', videoShoppingController.sendLike);
router.post('/live/:id/quick-buy', videoShoppingController.quickBuyLiveProduct);

// Admin / Vendor Protected Management Endpoints - Live Video Streaming
router.post('/live/start', protect, authorize('superadmin', 'admin', 'vendor'), videoShoppingController.startLiveStream);
router.post('/live/:id/end', protect, authorize('superadmin', 'admin', 'vendor'), videoShoppingController.endLiveStream);
router.post('/live/:id/pin', protect, authorize('superadmin', 'admin', 'vendor'), videoShoppingController.pinProduct);

// Admin / Vendor Protected Management Endpoints - Reels
router.use('/admin', protect, authorize('superadmin', 'admin', 'vendor'));
router.get('/admin/reels', videoShoppingController.getAdminReels);
router.post('/admin/reels', videoShoppingController.createReel);
router.put('/admin/reels/:id', videoShoppingController.updateReel);
router.delete('/admin/reels/:id', videoShoppingController.deleteReel);

module.exports = router;
