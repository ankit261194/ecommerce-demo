const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);

router.get('/', walletController.getWallet);
router.post('/daily-checkin', walletController.claimDailyCheckin);
router.post('/redeem-coins', walletController.redeemCoins);
router.get('/topup/preset-packs', walletController.getPresetPacks);
router.post('/topup', walletController.topUpWallet);

// Point #72 & Point #16: Post-Purchase Gamified Scratch Card Reward Engine
router.post('/scratch-card/generate', walletController.generateScratchCard);
router.post('/scratch-card/:id/scratch', walletController.scratchCard);
router.post('/scratch-card/:id/claim', walletController.claimScratchCard);
router.get('/scratch-cards', walletController.getMyScratchCards);

// Point 16: Super Admin Wallet & Rewards Control Center
router.get('/admin/overview', authorize('superadmin', 'subadmin'), walletController.getAdminWalletOverview);
router.post('/admin/adjust', authorize('superadmin'), walletController.adminAdjustCustomerWallet);

module.exports = router;
