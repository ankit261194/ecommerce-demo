const express = require('express');
const router = express.Router();
const {
  createSubscription,
  getMySubscriptions,
  getSubscriptionById,
  pauseSubscription,
  resumeSubscription,
  skipNextDelivery,
  cancelSubscription,
  triggerDueDeliveries,
} = require('../controllers/subscriptionController');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.post('/', createSubscription);
router.get('/my', getMySubscriptions);
router.post('/trigger-due', triggerDueDeliveries);
router.get('/:id', getSubscriptionById);
router.post('/:id/pause', pauseSubscription);
router.post('/:id/resume', resumeSubscription);
router.post('/:id/skip', skipNextDelivery);
router.post('/:id/cancel', cancelSubscription);

module.exports = router;
