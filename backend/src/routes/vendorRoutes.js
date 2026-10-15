const express = require('express');
const router = express.Router();
const {
  getVendorDashboard,
  getVendorProducts,
  createProduct,
  updateProduct,
  updateProductMedia,
  updateProductStock,
  bulkUploadProducts,
  exportProductsCSV,
  deleteProduct,
  getVendorOrders,
  updateSubOrderStatus,
  getShippingLabelData,
  requestPayout,
  getVendorProfile,
  updateVendorProfile,
  getPublicVendorStore,
  updateVacationMode,
  getVendorReviews,
  replyVendorReview,
  deleteVendorReviewReply,
  getVendorWallet,
  exportVendorLedgerCSV,
  generateProductCopy,
  generateSeoMeta,
} = require('../controllers/vendorController');
const { getSplitPackingSlips, getThermalReceipt } = require('../controllers/orderController');
const { protect, authorize } = require('../middlewares/auth');

// Point 58: Public Storefront Vendor Showcase (Accessible by any customer/visitor)
router.get('/store/:slugOrId', getPublicVendorStore);

// All subsequent vendor routes require Vendor authentication & role
router.use(protect);
router.use(authorize('vendor'));

// Point 58: Vendor Profile & Branding Customization
router.get('/profile', getVendorProfile);
router.put('/profile', updateVendorProfile);

// Point 59: Vacation Mode Toggle (Pause orders without deleting items)
router.put('/vacation-mode', updateVacationMode);

// Point 60: Customer Reviews Management (View reviews & post vendor responses)
router.get('/reviews', getVendorReviews);
router.post('/reviews/:id/reply', replyVendorReview);
router.delete('/reviews/:id/reply', deleteVendorReviewReply);

// Point 61: Real-Time Vendor Financial Wallet & Ledger
router.get('/wallet', getVendorWallet);
router.get('/wallet/export-csv', exportVendorLedgerCSV);

router.get('/dashboard', getVendorDashboard);
router.get('/products', getVendorProducts);
router.post('/products', createProduct);
router.post('/products/bulk-upload', bulkUploadProducts);
router.get('/products/export-csv', exportProductsCSV);
router.post('/ai-generator/product-copy', generateProductCopy);
router.post('/ai-generator/seo-meta', generateSeoMeta);
router.put('/products/:id', updateProduct);
router.put('/products/:id/media', updateProductMedia);
router.patch('/products/:id/stock', updateProductStock);
router.delete('/products/:id', deleteProduct);
router.get('/orders', getVendorOrders);
router.get('/orders/:id/shipping-label', getShippingLabelData);
router.get('/orders/:id/split-packing-slip', getSplitPackingSlips);
router.get('/orders/:id/thermal-receipt', getThermalReceipt);
router.put('/orders/:id/status', updateSubOrderStatus);
router.post('/payout', requestPayout);

module.exports = router;
