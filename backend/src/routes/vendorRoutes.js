const express = require('express');
const router = express.Router();
const {
  getVendorDashboard,
  getVendorProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getVendorOrders,
  updateSubOrderStatus,
  requestPayout,
} = require('../controllers/vendorController');
const { protect, authorize } = require('../middlewares/auth');

// All vendor routes require Vendor role
router.use(protect);
router.use(authorize('vendor'));

router.get('/dashboard', getVendorDashboard);
router.get('/products', getVendorProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);
router.get('/orders', getVendorOrders);
router.put('/orders/:id/status', updateSubOrderStatus);
router.post('/payout', requestPayout);

module.exports = router;
