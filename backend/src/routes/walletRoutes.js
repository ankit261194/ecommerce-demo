const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/', walletController.getWallet);
router.post('/daily-checkin', walletController.claimDailyCheckin);
router.post('/redeem-coins', walletController.redeemCoins);
router.post('/topup', walletController.topUpWallet);

// Point #72: Post-Purchase Gamified Scratch Card Reward Engine
router.post('/scratch-card/generate', walletController.generateScratchCard);
router.post('/scratch-card/:id/scratch', walletController.scratchCard);
router.post('/scratch-card/:id/claim', walletController.claimScratchCard);
router.get('/scratch-cards', walletController.getMyScratchCards);

module.exports = router;
