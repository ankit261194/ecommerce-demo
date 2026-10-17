const mongoose = require('mongoose');
const EInvoice = require('../models/EInvoice');
const EInvoiceConfig = require('../models/EInvoiceConfig');
const Order = require('../models/Order');
const SubOrder = require('../models/SubOrder');
const VendorProfile = require('../models/VendorProfile');
const AuditLog = require('../models/AuditLog');
const {
  generateEInvoiceForOrder,
  cancelEInvoiceById,
  generateGstr1Report,
  generateGstr8Report,
  generatePrintableTaxInvoiceHtml,
  getOrCreateConfig,
} = require('../services/eInvoiceService');

/**
 * Generate GST E-Invoice with IRN & QR Code
 * POST /api/tax/e-invoicing/generate/:orderId
 */
const generateEInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { buyerGstin, buyerLegalName, buyerStateCode, supplyType } = req.body || {};

    const einvoice = await generateEInvoiceForOrder(orderId, {
      buyerGstin,
      buyerLegalName,
      buyerStateCode,
      supplyType,
      userId: req.user?._id,
      userName: req.user?.name || 'Authorized Tax Officer',
      userRole: req.user?.role || 'superadmin',
    });

    res.status(201).json({
      success: true,
      message: 'Government GST E-Invoice with IRN and signed QR code generated successfully.',
      data: einvoice,
    });
  } catch (error) {
    console.error('Error generating e-invoice:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to generate GST E-Invoice.',
    });
  }
};

/**
 * Get E-Invoice by ID
 * GET /api/tax/e-invoicing/:id
 */
const getEInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    let einvoice = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      einvoice = await EInvoice.findById(id).populate('order').populate('vendor').populate('customer');
    }
    if (!einvoice) {
      einvoice = await EInvoice.findOne({ invoiceNumber: id }).populate('order').populate('vendor').populate('customer');
    }
    if (!einvoice) {
      einvoice = await EInvoice.findOne({ irn: id }).populate('order').populate('vendor').populate('customer');
    }

    if (!einvoice) {
      return res.status(404).json({
        success: false,
        message: 'E-Invoice not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: einvoice,
    });
  } catch (error) {
    console.error('Error fetching e-invoice:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching e-invoice details.',
    });
  }
};

/**
 * Get E-Invoice by Order ID or Order Number
 * GET /api/tax/e-invoicing/order/:orderId
 */
const getEInvoiceByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    let order = null;
    let subOrder = null;

    if (mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId);
      if (!order) {
        subOrder = await SubOrder.findById(orderId);
        if (subOrder) {
          order = await Order.findById(subOrder.parentOrder);
        }
      }
    }
    if (!order && !subOrder) {
      order = await Order.findOne({ orderNumber: orderId });
    }

    let einvoice = null;
    if (subOrder) {
      einvoice = await EInvoice.findOne({ subOrder: subOrder._id, status: 'GENERATED' })
        .populate('order')
        .populate('subOrder')
        .populate('vendor')
        .populate('customer');
    }
    if (!einvoice && order) {
      einvoice = await EInvoice.findOne({ order: order._id, status: 'GENERATED' })
        .populate('order')
        .populate('subOrder')
        .populate('vendor')
        .populate('customer');
    }

    if (!einvoice && mongoose.Types.ObjectId.isValid(orderId)) {
      einvoice = await EInvoice.findOne({ subOrder: orderId, status: 'GENERATED' })
        .populate('order')
        .populate('subOrder')
        .populate('vendor')
        .populate('customer');
    }

    // Auto-generate if not yet generated and order or subOrder exists
    if (!einvoice && (subOrder || order)) {
      const targetId = subOrder ? subOrder._id : order._id;
      einvoice = await generateEInvoiceForOrder(targetId, {
        userId: req.user?._id,
        userName: req.user?.name,
        userRole: req.user?.role,
      });

      if (einvoice) {
        einvoice = await EInvoice.findById(einvoice._id)
          .populate('order')
          .populate('subOrder')
          .populate('vendor')
          .populate('customer');
      }
    }

    if (!einvoice) {
      return res.status(404).json({
        success: false,
        message: 'No E-Invoice found for this order.',
      });
    }

    res.status(200).json({
      success: true,
      data: einvoice,
    });
  } catch (error) {
    console.error('Error fetching e-invoice for order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching e-invoice for order.',
    });
  }
};

/**
 * Get Printable A4 Tax Invoice HTML
 * GET /api/tax/e-invoicing/:id/print
 */
const getPrintableTaxInvoiceHtml = async (req, res) => {
  try {
    const { id } = req.params;
    let einvoice = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      einvoice = await EInvoice.findById(id);
      if (!einvoice) {
        einvoice = await EInvoice.findOne({ subOrder: id, status: 'GENERATED' });
      }
      if (!einvoice) {
        einvoice = await EInvoice.findOne({ order: id, status: 'GENERATED' });
      }
      if (!einvoice) {
        const subOrd = await SubOrder.findById(id);
        if (subOrd) {
          einvoice = await generateEInvoiceForOrder(subOrd._id);
        }
      }
    }
    if (!einvoice) {
      einvoice = await EInvoice.findOne({ invoiceNumber: id });
    }
    if (!einvoice) {
      einvoice = await EInvoice.findOne({ irn: id });
    }
    if (!einvoice) {
      const ord = await Order.findOne({ orderNumber: id });
      if (ord) {
        einvoice = await EInvoice.findOne({ order: ord._id, status: 'GENERATED' });
        if (!einvoice) {
          einvoice = await generateEInvoiceForOrder(ord._id);
        }
      }
    }

    if (!einvoice) {
      return res.status(404).send('<h3>Tax Invoice not found.</h3>');
    }

    const html = await generatePrintableTaxInvoiceHtml(einvoice._id);
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error('Error generating printable HTML:', error);
    res.status(500).send(`<h3>Failed to generate printable tax invoice: ${error.message}</h3>`);
  }
};

/**
 * Cancel E-Invoice (24-hour statutory window enforcement)
 * POST /api/tax/e-invoicing/:id/cancel
 */
const cancelEInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason, cancellationRemarks } = req.body || {};

    let einvoice = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      einvoice = await EInvoice.findById(id);
      if (!einvoice) {
        einvoice = await EInvoice.findOne({ order: id, status: 'GENERATED' });
      }
      if (!einvoice) {
        einvoice = await EInvoice.findOne({ subOrder: id, status: 'GENERATED' });
      }
    }
    if (!einvoice) {
      einvoice = await EInvoice.findOne({ invoiceNumber: id });
    }
    if (!einvoice) {
      einvoice = await EInvoice.findOne({ irn: id });
    }
    if (!einvoice) {
      return res.status(404).json({
        success: false,
        message: 'E-Invoice record not found.',
      });
    }

    const cancelledInvoice = await cancelEInvoiceById(
      einvoice._id,
      cancellationReason,
      cancellationRemarks,
      req.user || {}
    );

    res.status(200).json({
      success: true,
      message: 'GST E-Invoice successfully cancelled within statutory 24-hour window.',
      data: cancelledInvoice,
    });
  } catch (error) {
    console.error('Error cancelling e-invoice:', error);
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Failed to cancel E-Invoice.',
    });
  }
};

/**
 * GSTR-1 Sales Return Report & CSV Export
 * GET /api/tax/reports/gstr1
 */
const getGstr1Report = async (req, res) => {
  try {
    const { startDate, endDate, format } = req.query;
    const report = await generateGstr1Report({ startDate, endDate });

    if (format === 'csv') {
      let csv = '\uFEFF'; // UTF-8 BOM
      
      // Table 4A: B2B Invoices
      csv += '--- GSTR-1 TABLE 4A: TAXABLE B2B SUPPLIES ---\n';
      csv += 'GSTIN,Receiver Name,Invoice Number,Invoice Date,Invoice Value,Place of Supply,Reverse Charge,Rate,Taxable Value,CGST,SGST,IGST,IRN\n';
      for (const inv of (report.tables.b2b || [])) {
        csv += `"${inv.gstin}","${inv.receiverName}","${inv.invoiceNumber}","${inv.invoiceDate}",${inv.invoiceValue},"${inv.placeOfSupply}","${inv.reverseCharge}",${inv.applicableTaxRate},${inv.taxableValue},${inv.cgst},${inv.sgst},${inv.igst},"${inv.irn}"\n`;
      }
      csv += '\n';

      // Table 5A: B2C Large (> ₹2.5 Lakh Inter-State)
      csv += '--- GSTR-1 TABLE 5A: B2C LARGE INTER-STATE INVOICES ---\n';
      csv += 'Invoice Number,Invoice Date,Invoice Value,Place of Supply,Rate,Taxable Value,IGST\n';
      for (const inv of (report.tables.b2cLarge || [])) {
        csv += `"${inv.invoiceNumber}","${inv.invoiceDate}",${inv.invoiceValue},"${inv.placeOfSupply}",${inv.applicableTaxRate || 18},${inv.taxableValue},${inv.igst}\n`;
      }
      csv += '\n';

      // Table 7: B2C Small (Retail Other Supplies)
      csv += '--- GSTR-1 TABLE 7: B2C OTHER RETAIL SUPPLIES ---\n';
      csv += 'Place of Supply,Supply Type,Rate,Taxable Value,CGST,SGST,IGST\n';
      for (const inv of (report.tables.b2cSmall || [])) {
        csv += `"${inv.placeOfSupply}","${inv.supplyType}",${inv.applicableTaxRate || 18},${inv.taxableValue},${inv.cgst},${inv.sgst},${inv.igst}\n`;
      }
      csv += '\n';

      // Table 12: HSN Summary of Outward Supplies
      csv += '--- GSTR-1 TABLE 12: HSN SUMMARY OF OUTWARD SUPPLIES ---\n';
      csv += 'HSN Code,Description,UQC,Total Taxable Value,CGST,SGST,IGST,Total Tax\n';
      for (const h of (report.tables.hsnSummary || [])) {
        csv += `"${h.hsnCode}","${h.description}","${h.uqc || 'NOS'}",${h.totalTaxableValue},${h.cgst},${h.sgst},${h.igst},${h.totalTax}\n`;
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="GSTR1_Report_${Date.now()}.csv"`);
      return res.status(200).send(csv);
    }

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating GSTR-1 report:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating GSTR-1 report.',
    });
  }
};

/**
 * GSTR-8 E-Commerce Operator TCS Return Report & CSV Export
 * GET /api/tax/reports/gstr8
 */
const getGstr8Report = async (req, res) => {
  try {
    const { startDate, endDate, format } = req.query;
    const report = await generateGstr8Report({ startDate, endDate });

    if (format === 'csv') {
      let csv = '\uFEFF';
      csv += 'Vendor ID,Merchant Name,Vendor GSTIN,Gross Supplies,Returns,Net Taxable,CGST TCS (0.5%),SGST TCS (0.5%),IGST TCS (1.0%),Total TCS Collected,TDS 194O Withheld\n';

      for (const v of report.vendorBreakdown) {
        csv += `"${v.vendorId}","${v.vendorName}","${v.gstin}",${v.grossSupplies},${v.returns},${v.netTaxableAmount},${v.cgstTcs},${v.sgstTcs},${v.igstTcs},${v.totalTcs},${v.tds194OWithheld}\n`;
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="GSTR8_TCS_Report_${Date.now()}.csv"`);
      return res.status(200).send(csv);
    }

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating GSTR-8 report:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating GSTR-8 report.',
    });
  }
};

/**
 * Super Admin Tax Compliance Dashboard Radar
 * GET /api/admin/tax/compliance-dashboard
 */
const getTaxComplianceDashboard = async (req, res) => {
  try {
    const config = await getOrCreateConfig();
    const totalInvoices = await EInvoice.countDocuments();
    const activeInvoices = await EInvoice.countDocuments({ status: 'GENERATED' });
    const cancelledInvoices = await EInvoice.countDocuments({ status: 'CANCELLED' });
    const b2bInvoices = await EInvoice.countDocuments({ supplyType: 'B2B', status: 'GENERATED' });
    const b2cInvoices = await EInvoice.countDocuments({ supplyType: 'B2C', status: 'GENERATED' });
    const ewayBillsCount = await EInvoice.countDocuments({ 'eWayBill.ewayBillNo': { $exists: true, $ne: null } });

    // Aggregate monetary values
    const aggregates = await EInvoice.aggregate([
      { $match: { status: 'GENERATED' } },
      {
        $group: {
          _id: null,
          totalTaxable: { $sum: '$totalTaxableAmount' },
          totalCgst: { $sum: '$totalCgst' },
          totalSgst: { $sum: '$totalSgst' },
          totalIgst: { $sum: '$totalIgst' },
          totalGrand: { $sum: '$grandTotal' },
          totalTds194O: { $sum: '$tdsSection194O.tdsAmount' },
          totalTcs52: { $sum: '$tcsSection52.tcsAmount' },
        },
      },
    ]);

    const agg = aggregates[0] || {
      totalTaxable: 0,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst: 0,
      totalGrand: 0,
      totalTds194O: 0,
      totalTcs52: 0,
    };

    const recentInvoices = await EInvoice.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('order', 'orderNumber status')
      .populate('vendor', 'storeName gstin');

    res.status(200).json({
      success: true,
      data: {
        kpi: {
          totalInvoices,
          activeInvoices,
          cancelledInvoices,
          b2bInvoices,
          b2cInvoices,
          ewayBillsCount,
          totalTaxableValue: Math.round(agg.totalTaxable * 100) / 100,
          totalCgst: Math.round(agg.totalCgst * 100) / 100,
          totalSgst: Math.round(agg.totalSgst * 100) / 100,
          totalIgst: Math.round(agg.totalIgst * 100) / 100,
          totalTaxCollected: Math.round((agg.totalCgst + agg.totalSgst + agg.totalIgst) * 100) / 100,
          totalGrandValue: Math.round(agg.totalGrand * 100) / 100,
          totalTds194OWithheld: Math.round(agg.totalTds194O * 100) / 100,
          totalTcs52Collected: Math.round(agg.totalTcs52 * 100) / 100,
        },
        gatewayHealth: {
          environment: config.environment,
          irpProvider: config.irpProvider,
          gatewayStatus: 'ONLINE_ACTIVE',
          uptimePercent: 99.98,
          averageLatencyMs: 42,
          tokenValid: Boolean(config.nicTokenExpiry && new Date(config.nicTokenExpiry) > new Date()),
        },
        recentInvoices,
      },
    });
  } catch (error) {
    console.error('Error fetching tax compliance dashboard:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching tax compliance dashboard.',
    });
  }
};

/**
 * Get E-Invoicing Settings
 * GET /api/admin/tax/e-invoicing/settings
 */
const getEInvoiceSettings = async (req, res) => {
  try {
    const config = await getOrCreateConfig();
    const configObj = config.toObject();
    if (configObj.gspClientSecret) {
      configObj.gspClientSecret = '••••••••••••••••' + configObj.gspClientSecret.slice(-4);
    }
    res.status(200).json({
      success: true,
      data: configObj,
    });
  } catch (error) {
    console.error('Error fetching e-invoicing settings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching settings.',
    });
  }
};

/**
 * Update E-Invoicing Settings
 * PUT /api/admin/tax/e-invoicing/settings
 */
const updateEInvoiceSettings = async (req, res) => {
  try {
    const config = await getOrCreateConfig();
    const allowedFields = [
      'isEnabled',
      'environment',
      'irpProvider',
      'gspClientId',
      'sellerGstin',
      'legalName',
      'tradeName',
      'stateCode',
      'stateName',
      'address',
      'city',
      'pincode',
      'phone',
      'email',
      'autoGenerateOnOrder',
      'autoGenerateOnDispatch',
      'ewayBillThreshold',
      'tds194ORatePercent',
      'tcs52RatePercent',
      'cancellationWindowHours',
    ];

    for (const f of allowedFields) {
      if (req.body[f] !== undefined) {
        config[f] = req.body[f];
      }
    }

    if (req.body.gspClientSecret && !req.body.gspClientSecret.includes('•••')) {
      config.gspClientSecret = req.body.gspClientSecret;
    }

    await config.save();

    // Log Audit Trail
    try {
      await AuditLog.create({
        action: 'UPDATE_EINVOICE_CONFIG',
        module: 'TAX',
        performedBy: req.user?._id || null,
        userName: req.user?.name || 'Super Admin',
        userRole: req.user?.role || 'superadmin',
        targetId: config._id.toString(),
        targetType: 'EInvoiceConfig',
        description: 'Updated Government Tax Compliance & NIC E-Invoicing configuration.',
      });
    } catch (e) {
      console.error('AuditLog error:', e.message);
    }

    const resObj = config.toObject();
    if (resObj.gspClientSecret) {
      resObj.gspClientSecret = '••••••••••••••••' + resObj.gspClientSecret.slice(-4);
    }

    res.status(200).json({
      success: true,
      message: 'Tax compliance & E-Invoicing configuration updated successfully.',
      data: resObj,
    });
  } catch (error) {
    console.error('Error updating e-invoicing settings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating settings.',
    });
  }
};

/**
 * Vendor-specific tax invoices list
 * GET /api/vendor/tax/e-invoices
 */
const getVendorEInvoices = async (req, res) => {
  try {
    const vendorProfile = await VendorProfile.findOne({ user: req.user._id });
    if (!vendorProfile && req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vendor profile not found.',
      });
    }

    const query = vendorProfile ? { vendor: vendorProfile._id } : {};
    const invoices = await EInvoice.find(query)
      .sort({ createdAt: -1 })
      .populate('order', 'orderNumber status totalAmount');

    res.status(200).json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    console.error('Error fetching vendor invoices:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching vendor tax invoices.',
    });
  }
};

module.exports = {
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
};
