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
const {
  recordReverseRoutingMilestone,
  vendorGradeAndRestock,
  getSpfClaimsList,
  reviewSpfClaim,
  getReverseRoutingDashboard,
  getRoutingConfig,
  updateRoutingConfig,
  getVendorReturns,
} = require('../controllers/reverseLogisticsController');
const { protect, authorize } = require('../middlewares/auth');

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

// Point 47: Return Pickup Inspection & Reverse Logistics Routing Engine
router.get('/', authorize('superadmin', 'vendor', 'vendor_staff'), getVendorReturns);
router.patch('/:id/reverse-routing/milestone', authorize('delivery', 'vendor', 'vendor_staff', 'superadmin'), recordReverseRoutingMilestone);
router.post('/:id/grade-and-restock', authorize('vendor', 'vendor_staff', 'superadmin'), vendorGradeAndRestock);
router.get('/spf-claims', authorize('superadmin', 'vendor', 'vendor_staff'), getSpfClaimsList);
router.post('/spf-claims/:id/review', authorize('superadmin'), reviewSpfClaim);
router.get('/reverse-logistics/dashboard', authorize('superadmin', 'vendor', 'vendor_staff'), getReverseRoutingDashboard);
router.get('/routing-config', authorize('superadmin'), getRoutingConfig);
router.put('/routing-config', authorize('superadmin'), updateRoutingConfig);

module.exports = router;
