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
  generateDispatchManifest,
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
  getEffectiveVendorPermissions,
  getVendorStaff,
  createVendorStaff,
  updateVendorStaff,
  toggleVendorStaffStatus,
  deleteVendorStaff,
  getLowStockInventory,
  updateInventoryThresholds,
  triggerRestockAlert,
  quickRestockInventory,
  bulkInlineUpdateProducts,
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
const {
  getVendorVerificationStatus,
  verifyVendorGstin,
  verifyVendorBankPennyDrop,
} = require('../controllers/vendorVerificationController');
const {
  getStorefrontCustomization,
  updateStorefrontCustomization,
  addHeroBanner,
  deleteHeroBanner,
  reorderHeroBanners,
  updateBrandStory,
} = require('../controllers/vendorStorefrontController');
const {
  getVendorCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  toggleCampaignStatus,
  deleteCampaign,
  getKeywordSuggestions,
} = require('../controllers/sponsoredAdController');
const {
  getInventoryAgingRadar,
  applyDiscountNudge,
  bulkApplyDiscountNudges,
  getAgingRadarSettings,
  updateAgingRadarSettings,
  exportInventoryAgingCSV,
} = require('../controllers/inventoryAgingController');
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

// Point 35: Real-Time Government GSTIN & Bank Penny-Drop Verification
router.get('/verification/status', getVendorVerificationStatus);
router.post('/verification/gstin', verifyVendorGstin);
router.post('/verification/bank-penny-drop', verifyVendorBankPennyDrop);

// Point 36: Vendor Custom Micro-Storefront Builder (Custom banners, stories & showcase)
router.get('/storefront/customization', requireVendorPermission('STORE_SETTINGS'), getStorefrontCustomization);
router.put('/storefront/customization', requireVendorPermission('STORE_SETTINGS'), updateStorefrontCustomization);
router.post('/storefront/banner', requireVendorPermission('STORE_SETTINGS'), addHeroBanner);
router.delete('/storefront/banner/:id', requireVendorPermission('STORE_SETTINGS'), deleteHeroBanner);
router.patch('/storefront/banners/reorder', requireVendorPermission('STORE_SETTINGS'), reorderHeroBanners);
router.put('/storefront/brand-story', requireVendorPermission('STORE_SETTINGS'), updateBrandStory);

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
router.get('/wallet', requireVendorPermission('WALLET_FINANCE'), getVendorWallet);
router.get('/wallet/export-csv', requireVendorPermission('WALLET_FINANCE'), exportVendorLedgerCSV);

// Point 15: Vendor GST/VAT & HSN Tax Filing Report
router.get('/tax-report', requireVendorPermission('WALLET_FINANCE', 'ACCOUNTING_TAX'), getVendorTaxReport);
router.get('/tax-report/export-csv', requireVendorPermission('WALLET_FINANCE', 'ACCOUNTING_TAX'), exportVendorTaxReportCSV);

router.get('/dashboard', getVendorDashboard);
router.get('/products', getVendorProducts);
router.post('/products', requireVendorPermission('PRODUCTS_MANAGE'), createProduct);
router.patch('/products/bulk-inline-update', requireVendorPermission('PRODUCTS_MANAGE', 'WAREHOUSE_INVENTORY'), bulkInlineUpdateProducts);
router.post('/products/bulk-upload', bulkUploadProducts);
router.get('/products/export-csv', exportProductsCSV);
router.get('/products/sample-template', getProductSampleTemplate);

// Point 10: Inventory Low-Stock Threshold & Auto-Restock Alerts
router.get('/inventory/low-stock', getLowStockInventory);
router.put('/inventory/thresholds', updateInventoryThresholds);
router.post('/inventory/trigger-restock-alert', triggerRestockAlert);
router.patch('/inventory/quick-restock', quickRestockInventory);

// Point 41: Inventory Aging & Dead-Stock Velocity Radar with automated discount nudges
router.get('/inventory/aging-radar', requireVendorPermission('WAREHOUSE_INVENTORY', 'PRODUCTS_MANAGE'), getInventoryAgingRadar);
router.get('/inventory/aging-radar/export-csv', requireVendorPermission('WAREHOUSE_INVENTORY', 'PRODUCTS_MANAGE'), exportInventoryAgingCSV);
router.get('/inventory/aging-settings', requireVendorPermission('WAREHOUSE_INVENTORY', 'PRODUCTS_MANAGE'), getAgingRadarSettings);
router.put('/inventory/aging-settings', requireVendorPermission('STORE_SETTINGS', 'PRODUCTS_MANAGE'), updateAgingRadarSettings);
router.post('/inventory/apply-discount-nudge', requireVendorPermission('PRODUCTS_MANAGE'), applyDiscountNudge);
router.post('/inventory/bulk-apply-discount-nudges', requireVendorPermission('PRODUCTS_MANAGE'), bulkApplyDiscountNudges);

// Point 11: Vendor-Funded Custom Promotions & BOGO Engine
router.get('/promotions', getVendorPromotions);
router.post('/promotions', createVendorPromotion);
router.put('/promotions/:id', updateVendorPromotion);
router.patch('/promotions/:id/toggle', toggleVendorPromotion);
router.delete('/promotions/:id', deleteVendorPromotion);

// Point 40: Seller Sponsored Ads & CPC Keyword Bidding Engine (In-platform ad revenue)
router.get('/ads/campaigns', requireVendorPermission('MARKETING_ADS', 'PRODUCTS_MANAGE'), getVendorCampaigns);
router.post('/ads/campaigns', requireVendorPermission('MARKETING_ADS', 'PRODUCTS_MANAGE'), createCampaign);
router.get('/ads/campaigns/:id', requireVendorPermission('MARKETING_ADS', 'PRODUCTS_MANAGE'), getCampaignById);
router.put('/ads/campaigns/:id', requireVendorPermission('MARKETING_ADS', 'PRODUCTS_MANAGE'), updateCampaign);
router.patch('/ads/campaigns/:id/toggle', requireVendorPermission('MARKETING_ADS', 'PRODUCTS_MANAGE'), toggleCampaignStatus);
router.delete('/ads/campaigns/:id', requireVendorPermission('MARKETING_ADS', 'PRODUCTS_MANAGE'), deleteCampaign);
router.get('/ads/keyword-suggestions', requireVendorPermission('MARKETING_ADS', 'PRODUCTS_MANAGE'), getKeywordSuggestions);

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
router.get('/orders/:id/shipping-label', requireVendorPermission('ORDERS_MANAGE', 'PACKAGING_DISPATCH'), getShippingLabelData);
router.post('/orders/bulk-shipping-labels', requireVendorPermission('ORDERS_MANAGE', 'PACKAGING_DISPATCH'), generateBulkShippingLabels);
router.get('/orders/bulk-shipping-labels', requireVendorPermission('ORDERS_MANAGE', 'PACKAGING_DISPATCH'), generateBulkShippingLabels);
router.get('/orders/:id/split-packing-slip', requireVendorPermission('ORDERS_MANAGE', 'PACKAGING_DISPATCH'), getSplitPackingSlips);
router.post('/orders/dispatch-manifest', requireVendorPermission('ORDERS_MANAGE', 'PACKAGING_DISPATCH'), generateDispatchManifest);
router.get('/orders/dispatch-manifest', requireVendorPermission('ORDERS_MANAGE', 'PACKAGING_DISPATCH'), generateDispatchManifest);
router.get('/orders/:id/thermal-receipt', getThermalReceipt);
router.put('/orders/:id/status', updateSubOrderStatus);
router.post('/payout', requireVendorPermission('WALLET_FINANCE'), requestPayout);


// Point #13 & Point #37: Vendor Sub-Staff Roles & Granular Permissions (Warehouse Manager, Packager, Accountant)
router.get('/staff/permissions', getVendorStaffPermissions);
router.get('/staff/me/effective-permissions', getEffectiveVendorPermissions);
router.get('/staff', requireVendorPermission('STAFF_MANAGE'), getVendorStaff);
router.post('/staff', requireVendorPermission('STAFF_MANAGE'), createVendorStaff);
router.put('/staff/:id', requireVendorPermission('STAFF_MANAGE'), updateVendorStaff);
router.patch('/staff/:id/toggle-status', requireVendorPermission('STAFF_MANAGE'), toggleVendorStaffStatus);
router.delete('/staff/:id', requireVendorPermission('STAFF_MANAGE'), deleteVendorStaff);

module.exports = router;
