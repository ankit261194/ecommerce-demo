const express = require('express');
const router = express.Router();
const {
  getAvailableDeliverySlots,
  getSlotConfiguration,
  updateSlotConfiguration,
  getDispatchRadar,
  triggerAutoAssignTask,
  batchAutoAssignTasks,
  manualAssignRider,
  getFleetRiders,
  updateRiderDutyStatus,
  exportDispatchRadarCSV,
} = require('../controllers/dispatchSchedulerController');
const { protect, authorize } = require('../middlewares/auth');

// Public / Customer Checkout Endpoints
router.get('/slots/available', getAvailableDeliverySlots);

// Authenticated Routes
router.use(protect);

// Delivery Rider Self-Service Duty Status
router.patch('/riders/:id/duty-status', updateRiderDutyStatus);
router.get('/riders/me/duty-status', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      _id: req.user._id,
      name: req.user.name,
      dutyStatus: req.user.dutyStatus || 'ON_DUTY',
      isAvailable: req.user.isAvailable !== false,
      assignedZone: req.user.assignedZone || '',
      lastLocation: req.user.lastLocation || null,
    },
  });
});

// Super Admin / Logistics Fleet Command Center Routes
router.get('/slots/config', authorize('superadmin'), getSlotConfiguration);
router.put('/slots/config', authorize('superadmin'), updateSlotConfiguration);

router.get('/dispatch/radar', authorize('superadmin'), getDispatchRadar);
router.get('/dispatch/radar/export-csv', authorize('superadmin'), exportDispatchRadarCSV);
router.post('/dispatch/auto-assign/:taskId', authorize('superadmin'), triggerAutoAssignTask);
router.post('/dispatch/batch-auto-assign', authorize('superadmin'), batchAutoAssignTasks);
router.post('/dispatch/manual-assign', authorize('superadmin'), manualAssignRider);
router.get('/riders', authorize('superadmin'), getFleetRiders);

module.exports = router;
