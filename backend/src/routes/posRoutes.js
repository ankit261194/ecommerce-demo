const express = require('express');
const router = express.Router();
const {
  searchPosProducts,
  createPosOrder,
  getPosOrders,
  getPosReceipt,
  parkCart,
  getParkedCarts,
  resumeParkedCart,
} = require('../controllers/posController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.use(authorize('vendor', 'vendor_staff', 'superadmin'));

// Fast Product Search by Barcode / SKU / Title
router.get('/products', searchPosProducts);

// POS Order Creation & Daily Summaries
router.post('/orders', createPosOrder);
router.get('/orders', getPosOrders);
router.get('/orders/:id/receipt', getPosReceipt);

// Multi-Customer Park / Hold Queue
router.post('/park', parkCart);
router.get('/parked', getParkedCarts);
router.delete('/parked/:id', resumeParkedCart);

module.exports = router;
