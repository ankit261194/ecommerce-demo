const express = require('express');
const router = express.Router();
const priceDropAlertController = require('../controllers/priceDropAlertController');
const { optionalAuth } = require('../middlewares/auth');

// Public / Authenticated customer routes
router.post('/', optionalAuth, priceDropAlertController.subscribePriceDrop);
router.post('/subscribe', optionalAuth, priceDropAlertController.subscribePriceDrop);
router.get('/my', optionalAuth, priceDropAlertController.getMyAlerts);
router.delete('/:id', optionalAuth, priceDropAlertController.deleteAlert);
router.post('/simulate', priceDropAlertController.simulatePriceDrop);

module.exports = router;
