const express = require('express');
const router = express.Router();
const {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  adjustStock,
  simulateRouting,
  getNetworkAnalytics,
} = require('../controllers/warehouseController');
const { protect, authorize } = require('../middlewares/auth');

// Protected admin routes
router.use(protect);
router.use(authorize('superadmin', 'admin'));

router.route('/')
  .get(getWarehouses)
  .post(createWarehouse);

router.get('/analytics', getNetworkAnalytics);
router.post('/route-simulation', simulateRouting);

router.route('/:id')
  .get(getWarehouseById)
  .put(updateWarehouse)
  .delete(deleteWarehouse);

router.post('/:id/stock-adjust', adjustStock);

module.exports = router;
