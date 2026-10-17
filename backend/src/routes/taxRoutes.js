const express = require('express');
const router = express.Router();
const {
  getTaxSettings,
  updateTaxSettings,
  calculateTax,
  getHsnDirectory,
  testTaxMatrix,
} = require('../controllers/taxMatrixController');
const {
  generateEInvoice,
  getEInvoiceById,
  getEInvoiceByOrder,
  getPrintableTaxInvoiceHtml,
  cancelEInvoice,
  getGstr1Report,
  getGstr8Report,
  getTaxComplianceDashboard,
  getEInvoiceSettings,
  updateEInvoiceSettings,
  getVendorEInvoices,
} = require('../controllers/eInvoiceController');
const { protect, authorize } = require('../middlewares/auth');

// Public tax calculation and HSN directory
router.post('/calculate', calculateTax);
router.get('/hsn-directory', getHsnDirectory);

// Super Admin Tax Matrix Settings and Sandbox Simulator
router.get('/settings', protect, authorize('superadmin', 'admin'), getTaxSettings);
router.put('/settings', protect, authorize('superadmin', 'admin'), updateTaxSettings);
router.post('/test-matrix', protect, authorize('superadmin', 'admin'), testTaxMatrix);

// Admin prefixed aliases for tax matrix
router.get('/admin/settings', protect, authorize('superadmin', 'admin'), getTaxSettings);
router.put('/admin/settings', protect, authorize('superadmin', 'admin'), updateTaxSettings);
router.post('/admin/test-matrix', protect, authorize('superadmin', 'admin'), testTaxMatrix);

// =========================================================================
// POINT 49: GST / TDS E-INVOICING & AUTOMATED GOVERNMENT TAX COMPLIANCE
// =========================================================================

// Generate GST E-Invoice with deterministic IRN & signed QR Code
router.post('/e-invoicing/generate/:orderId', protect, generateEInvoice);

// Fetch E-Invoice by Order ID / SubOrder ID
router.get('/e-invoicing/order/:orderId', protect, getEInvoiceByOrder);

// Printable A4 Tax Invoice HTML Preview (Browser-friendly)
router.get('/e-invoicing/:id/print', getPrintableTaxInvoiceHtml);

// Fetch E-Invoice by ID, Invoice Number or IRN
router.get('/e-invoicing/:id', protect, getEInvoiceById);

// Cancel E-Invoice (enforces statutory 24-hour IRP window)
router.post('/e-invoicing/:id/cancel', protect, authorize('superadmin', 'admin', 'vendor'), cancelEInvoice);

// Government Return Reports (GSTR-1 & GSTR-8)
router.get('/reports/gstr1', protect, authorize('superadmin', 'admin'), getGstr1Report);
router.get('/reports/gstr8', protect, authorize('superadmin', 'admin'), getGstr8Report);

// Tax Compliance Dashboard Radar & KPI Analytics
router.get('/compliance-dashboard', protect, authorize('superadmin', 'admin'), getTaxComplianceDashboard);
router.get('/admin/compliance-dashboard', protect, authorize('superadmin', 'admin'), getTaxComplianceDashboard);

// E-Invoicing & NIC Gateway Settings
router.get('/e-invoicing/settings', protect, authorize('superadmin', 'admin'), getEInvoiceSettings);
router.put('/e-invoicing/settings', protect, authorize('superadmin', 'admin'), updateEInvoiceSettings);
router.get('/admin/e-invoicing/settings', protect, authorize('superadmin', 'admin'), getEInvoiceSettings);
router.put('/admin/e-invoicing/settings', protect, authorize('superadmin', 'admin'), updateEInvoiceSettings);

// Vendor-specific E-Invoices
router.get('/vendor/e-invoices', protect, authorize('superadmin', 'admin', 'vendor'), getVendorEInvoices);

module.exports = router;
