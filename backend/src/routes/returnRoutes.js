const express = require('express');
const router = express.Router();
const {
  createReturnRequest,
  createExchangeRequest,
  getMyReturns,
  getReturnByOrder,
  updateReturnStatus,
  updateReversePickupStatus,
  // Point 18: Automated Return & Replacement with Unboxing Video & SLA
  getReturnReasons,
  createAutomatedReturnReplacement,
  inspectReturnRequest,
  autoResolveExpiredSLA,
  getInspectionStatus,
} = require('../controllers/returnController');
const { protect } = require('../middlewares/auth');

// Public or semi-public helper for reasons & SLA policies
router.get('/reasons', getReturnReasons);

router.use(protect);

router.post('/', createReturnRequest);
router.post('/automated', createAutomatedReturnReplacement);
router.post('/exchange', createExchangeRequest);
router.get('/my', getMyReturns);
router.get('/order/:orderId', getReturnByOrder);
router.get('/:id/inspection-status', getInspectionStatus);
router.put('/:id/status', updateReturnStatus);
router.post('/:id/inspect', inspectReturnRequest);
router.post('/:id/sla-auto-approve', autoResolveExpiredSLA);
router.put('/:id/reverse-pickup', updateReversePickupStatus);

module.exports = router;
