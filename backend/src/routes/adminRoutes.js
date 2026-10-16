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
  getAllPayouts,
  getPayoutDetails,
  approvePayout,
  rejectPayout,
  exportPayoutsCSV,
  getStaffPermissionsCatalog,
  getAllStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  getAuditLogs,
  getDatabaseBackupStats,
  exportDatabaseBackup,
} = require('../controllers/adminController');
const {
  getTaxInvoice,
  getSplitPackingSlips,
  getRtoGuardOverview,
  overrideRtoGuard,
  getThermalReceipt,
} = require('../controllers/orderController');
const {
  bulkUploadProducts,
  exportProductsCSV,
  getProductSampleTemplate,
  generateBulkShippingLabels,
  getLowStockInventory,
  updateInventoryThresholds,
  triggerRestockAlert,
  quickRestockInventory,
} = require('../controllers/vendorController');
const { protect, authorize, requirePermission } = require('../middlewares/auth');

// All admin routes require Super Admin or Sub-Admin authorization
router.use(protect);
router.use(authorize('superadmin', 'subadmin'));

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

// Bulk Products Operations (Point #8)
router.post('/products/bulk-upload', bulkUploadProducts);
router.get('/products/export-csv', exportProductsCSV);
router.get('/products/sample-template', getProductSampleTemplate);

// Point 10: Multi-Vendor Inventory Low-Stock Radar & Automated Alerts
router.get('/inventory/low-stock', getLowStockInventory);
router.put('/inventory/thresholds', updateInventoryThresholds);
router.post('/inventory/trigger-restock-alert', triggerRestockAlert);
router.patch('/inventory/quick-restock', quickRestockInventory);

// Vendor Withdrawal / Payout Approval Hub (Point #45)
router.get('/payouts', getAllPayouts);
router.get('/payouts/export-csv', exportPayoutsCSV);
router.get('/payouts/:id', getPayoutDetails);
router.put('/payouts/:id/approve', approvePayout);
router.patch('/payouts/:id/approve', approvePayout);
router.put('/payouts/:id/reject', rejectPayout);
router.patch('/payouts/:id/reject', rejectPayout);

router.get('/orders', getAllOrders);
router.post('/orders/bulk-status', bulkUpdateOrderStatus);
router.put('/orders/bulk-status', bulkUpdateOrderStatus);
router.get('/orders/export-csv', exportOrdersCSV);
router.post('/orders/export-csv', exportOrdersCSV);
router.post('/orders/bulk-invoices', getBulkInvoices);
router.post('/orders/bulk-shipping-labels', generateBulkShippingLabels);
router.get('/orders/bulk-shipping-labels', generateBulkShippingLabels);
router.put('/orders/:id/status', updateOrderStatus);
router.patch('/orders/:id/status', updateOrderStatus);
router.get('/orders/:id/commission-split', getOrderCommissionSplit);
router.get('/orders/:id/invoice', getTaxInvoice);
router.get('/orders/:id/split-packing-slips', getSplitPackingSlips);
router.get('/orders/:id/thermal-receipt', getThermalReceipt);
router.get('/rto-guard/overview', getRtoGuardOverview);
router.post('/rto-guard/override', overrideRtoGuard);
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

// Sub-Admin Staff Roles & Permissions (Point #49)
router.get('/staff/permissions', getStaffPermissionsCatalog);
router.get('/staff', getAllStaff);
router.post('/staff', createStaff);
router.put('/staff/:id', updateStaff);
router.patch('/staff/:id', updateStaff);
router.delete('/staff/:id', deleteStaff);

// System Audit Activity Log & 1-Click Database Backup (Point #50)
router.get('/audit-logs', getAuditLogs);
router.get('/backup/stats', getDatabaseBackupStats);
router.get('/backup/export', exportDatabaseBackup);

// 1-Click Operations
router.post('/wipe-demo', triggerWipeDemo);
router.post('/demo/wipe', triggerWipeDemo);
router.post('/seed-demo', triggerSeedDemo);
router.post('/demo/seed', triggerSeedDemo);

module.exports = router;

