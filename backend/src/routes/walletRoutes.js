const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/', walletController.getWallet);
router.post('/daily-checkin', walletController.claimDailyCheckin);
router.post('/redeem-coins', walletController.redeemCoins);
router.post('/topup', walletController.topUpWallet);

module.exports = router;
