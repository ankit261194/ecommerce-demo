const express = require('express');
const router = express.Router();
const {
  getDashboardAnalytics,
  getAllVendors,
  getVendorDetails,
  updateVendorStatus,
  updateVendorKYC,
  updateVendorCommission,
  getAllOrders,
  updateOrderStatus,
  getOrderCommissionSplit,
  getPlatformLedger,
  triggerWipeDemo,
  triggerSeedDemo,
  getIntegrations,
  updateIntegrations,
  testSMSIntegration,
  testEmailIntegration,
  bulkUpdateOrderStatus,
  exportOrdersCSV,
  getBulkInvoices,
  getAllCustomers,
  getCustomerDetails,
  toggleCustomerStatus,
  toggleCustomerVerification,
  updateCustomerNotes,
} = require('../controllers/adminController');
const { getTaxInvoice } = require('../controllers/orderController');
const { protect, authorize } = require('../middlewares/auth');

// All admin routes require Super Admin authorization
router.use(protect);
router.use(authorize('superadmin'));

router.get('/analytics', getDashboardAnalytics);

// Vendor KYC & Store Approval Center (Point #44)
router.get('/vendors', getAllVendors);
router.get('/vendors/:id', getVendorDetails);
router.put('/vendors/:id/status', updateVendorStatus);
router.patch('/vendors/:id/status', updateVendorStatus);
router.put('/vendors/:id/kyc', updateVendorKYC);
router.patch('/vendors/:id/kyc', updateVendorKYC);
router.put('/vendors/:id/commission', updateVendorCommission);
router.patch('/vendors/:id/commission', updateVendorCommission);
router.get('/orders', getAllOrders);
router.post('/orders/bulk-status', bulkUpdateOrderStatus);
router.put('/orders/bulk-status', bulkUpdateOrderStatus);
router.get('/orders/export-csv', exportOrdersCSV);
router.post('/orders/export-csv', exportOrdersCSV);
router.post('/orders/bulk-invoices', getBulkInvoices);
router.put('/orders/:id/status', updateOrderStatus);
router.patch('/orders/:id/status', updateOrderStatus);
router.get('/orders/:id/commission-split', getOrderCommissionSplit);
router.get('/orders/:id/invoice', getTaxInvoice);
router.get('/ledger', getPlatformLedger);

// Customer CRM Directory (Point #43)
router.get('/customers', getAllCustomers);
router.get('/customers/:id', getCustomerDetails);
router.patch('/customers/:id/status', toggleCustomerStatus);
router.patch('/customers/:id/verify', toggleCustomerVerification);
router.put('/customers/:id/notes', updateCustomerNotes);

// Category & Sub-Category Tree Manager (Point #36)
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} = require('../controllers/categoryController');
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/reorder', reorderCategories);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Brand Directory Manager (Point #37)
const {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} = require('../controllers/brandController');
router.get('/brands', getBrands);
router.post('/brands', createBrand);
router.put('/brands/:id', updateBrand);
router.delete('/brands/:id', deleteBrand);

// Homepage Hero Slider & Promo Banner Manager (Point #38)
const {
  getAdminBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  reorderBanners,
} = require('../controllers/bannerController');
router.get('/banners', getAdminBanners);
router.post('/banners', createBanner);
router.put('/banners/reorder', reorderBanners);
router.put('/banners/:id', updateBanner);
router.delete('/banners/:id', deleteBanner);
router.patch('/banners/:id/toggle', toggleBannerStatus);

// Dynamic Top Announcement Bar Controller (Point #39)
const { getAnnouncement, updateAnnouncement } = require('../controllers/uiController');
router.get('/announcement', getAnnouncement);
router.put('/announcement', updateAnnouncement);

// Integrations & API Hub
router.get('/integrations', getIntegrations);
router.put('/integrations', updateIntegrations);
router.post('/integrations/test-sms', testSMSIntegration);
router.post('/integrations/test-email', testEmailIntegration);

// 1-Click Operations
router.post('/wipe-demo', triggerWipeDemo);
router.post('/demo/wipe', triggerWipeDemo);
router.post('/seed-demo', triggerSeedDemo);
router.post('/demo/seed', triggerSeedDemo);

module.exports = router;
