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
  getProductSampleTemplate,
  deleteProduct,
  getVendorOrders,
  updateSubOrderStatus,
  getShippingLabelData,
  generateBulkShippingLabels,
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
  getVendorStaffPermissions,
  getVendorStaff,
  createVendorStaff,
  updateVendorStaff,
  deleteVendorStaff,
  getLowStockInventory,
  updateInventoryThresholds,
  triggerRestockAlert,
  quickRestockInventory,
} = require('../controllers/vendorController');
const { getVendorTaxReport, exportVendorTaxReportCSV } = require('../controllers/taxController');
const { getSplitPackingSlips, getThermalReceipt } = require('../controllers/orderController');
const {
  getVendorPromotions,
  createVendorPromotion,
  updateVendorPromotion,
  toggleVendorPromotion,
  deleteVendorPromotion,
} = require('../controllers/couponController');
const {
  getVendorHealth,
  recalculateVendorHealth,
  submitSlaAppeal,
} = require('../controllers/vendorHealthController');
const {
  checkStoreSlugAvailability,
  getOnboardingState,
  saveStep1,
  saveStep2,
  saveStep3,
  saveStep4,
  submitOnboarding,
} = require('../controllers/vendorOnboardingController');
const { protect, authorize, requireVendorPermission } = require('../middlewares/auth');

// Point 58: Public Storefront Vendor Showcase (Accessible by any customer/visitor)
router.get('/store/:slugOrId', getPublicVendorStore);

// Point 34: Public Slug Availability Check
router.get('/onboarding/check-slug', checkStoreSlugAvailability);

// All subsequent vendor routes require Vendor authentication & role
router.use(protect);
router.use(authorize('vendor', 'vendor_staff'));

// Point 34: Self-Service 4-Step Vendor Registration & Onboarding Wizard
router.get('/onboarding', getOnboardingState);
router.post('/onboarding/step/1', saveStep1);
router.post('/onboarding/step/2', saveStep2);
router.post('/onboarding/step/3', saveStep3);
router.post('/onboarding/step/4', saveStep4);
router.post('/onboarding/submit', submitOnboarding);

// Point 58: Vendor Profile & Branding Customization
router.get('/profile', getVendorProfile);
router.put('/profile', requireVendorPermission('STORE_SETTINGS'), updateVendorProfile);

// Point 59: Vacation Mode Toggle (Pause orders without deleting items)
router.put('/vacation-mode', requireVendorPermission('STORE_SETTINGS'), updateVacationMode);

// Point 60: Customer Reviews Management (View reviews & post vendor responses)
router.get('/reviews', getVendorReviews);
router.post('/reviews/:id/reply', replyVendorReview);
router.delete('/reviews/:id/reply', deleteVendorReviewReply);

// Point 61: Real-Time Vendor Financial Wallet & Ledger
router.get('/wallet', getVendorWallet);
router.get('/wallet/export-csv', exportVendorLedgerCSV);

// Point 15: Vendor GST/VAT & HSN Tax Filing Report
router.get('/tax-report', getVendorTaxReport);
router.get('/tax-report/export-csv', exportVendorTaxReportCSV);

router.get('/dashboard', getVendorDashboard);
router.get('/products', getVendorProducts);
router.post('/products', createProduct);
router.post('/products/bulk-upload', bulkUploadProducts);
router.get('/products/export-csv', exportProductsCSV);
router.get('/products/sample-template', getProductSampleTemplate);

// Point 10: Inventory Low-Stock Threshold & Auto-Restock Alerts
router.get('/inventory/low-stock', getLowStockInventory);
router.put('/inventory/thresholds', updateInventoryThresholds);
router.post('/inventory/trigger-restock-alert', triggerRestockAlert);
router.patch('/inventory/quick-restock', quickRestockInventory);

// Point 11: Vendor-Funded Custom Promotions & BOGO Engine
router.get('/promotions', getVendorPromotions);
router.post('/promotions', createVendorPromotion);
router.put('/promotions/:id', updateVendorPromotion);
router.patch('/promotions/:id/toggle', toggleVendorPromotion);
router.delete('/promotions/:id', deleteVendorPromotion);

// Point 12: Seller Health & SLA Performance Scorecard
router.get('/health', getVendorHealth);
router.post('/health/recalculate', recalculateVendorHealth);
router.post('/health/appeal', submitSlaAppeal);

router.post('/ai-generator/product-copy', generateProductCopy);
router.post('/ai-generator/seo-meta', generateSeoMeta);
router.put('/products/:id', updateProduct);
router.put('/products/:id/media', updateProductMedia);
router.patch('/products/:id/stock', updateProductStock);
router.delete('/products/:id', deleteProduct);
router.get('/orders', getVendorOrders);
router.get('/orders/:id/shipping-label', getShippingLabelData);
router.post('/orders/bulk-shipping-labels', generateBulkShippingLabels);
router.get('/orders/bulk-shipping-labels', generateBulkShippingLabels);
router.get('/orders/:id/split-packing-slip', getSplitPackingSlips);
router.get('/orders/:id/thermal-receipt', getThermalReceipt);
router.put('/orders/:id/status', updateSubOrderStatus);
router.post('/payout', requireVendorPermission('WALLET_FINANCE'), requestPayout);


// Point #13: Vendor Sub-Staff Roles & Granular Permissions
router.get('/staff/permissions', getVendorStaffPermissions);
router.get('/staff', requireVendorPermission('STAFF_MANAGE'), getVendorStaff);
router.post('/staff', requireVendorPermission('STAFF_MANAGE'), createVendorStaff);
router.put('/staff/:id', requireVendorPermission('STAFF_MANAGE'), updateVendorStaff);
router.delete('/staff/:id', requireVendorPermission('STAFF_MANAGE'), deleteVendorStaff);

module.exports = router;
