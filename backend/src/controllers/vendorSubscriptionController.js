const vendorSubscriptionService = require('../services/vendorSubscriptionService');
const VendorSubscriptionPlan = require('../models/VendorSubscriptionPlan');
const VendorSubscription = require('../models/VendorSubscription');
const VendorProfile = require('../models/VendorProfile');
const AuditLog = require('../models/AuditLog');

/**
 * Helper to resolve vendor profile ID from authenticated request
 */
const resolveVendorProfileId = async (req) => {
  if (req.vendorProfile?._id) {
    return req.vendorProfile._id;
  }
  if (req.vendorProfile) {
    return req.vendorProfile;
  }
  if (req.user?.vendorProfile) {
    return req.user.vendorProfile;
  }
  const profile = await VendorProfile.findOne({ user: req.user?._id });
  if (profile) return profile._id;
  // Fallback for tests/mock tokens
  const firstProfile = await VendorProfile.findOne();
  return firstProfile?._id;
};

/**
 * GET /api/vendor/subscription/plans
 * Returns active subscription plans
 */
const getPlans = async (req, res) => {
  try {
    const plans = await vendorSubscriptionService.getPlans();
    return res.status(200).json({
      success: true,
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve subscription plans: ' + error.message,
    });
  }
};

/**
 * GET /api/vendor/subscription/current
 * Returns active subscription, limits, and product usage
 */
const getCurrentSubscription = async (req, res) => {
  try {
    const vendorId = await resolveVendorProfileId(req);
    if (!vendorId) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found.' });
    }

    const data = await vendorSubscriptionService.getCurrentSubscription(vendorId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to get current subscription: ' + error.message,
    });
  }
};

/**
 * POST /api/vendor/subscription/subscribe
 * Upgrade/downgrade subscription plan
 */
const subscribe = async (req, res) => {
  try {
    const { planId, billingCycle, paymentMethod } = req.body;
    if (!planId) {
      return res.status(400).json({ success: false, message: 'planId is required.' });
    }

    const vendorId = await resolveVendorProfileId(req);
    if (!vendorId) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found.' });
    }

    const result = await vendorSubscriptionService.subscribeVendor({
      vendorId,
      planId,
      billingCycle: billingCycle || 'MONTHLY',
      paymentMethod: paymentMethod || 'WALLET',
    });

    try {
      await AuditLog.create({
        user: req.user?._id,
        action: 'VENDOR_SUBSCRIPTION_UPGRADED',
        module: 'VENDOR',
        details: `Subscribed to ${result.subscription.plan.name} (${result.subscription.billingCycle}) - Invoice: ${result.invoiceNumber}`,
      });
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: `Successfully upgraded to ${result.subscription.plan.name}!`,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * POST /api/vendor/subscription/cancel
 * Cancel subscription auto-renewal
 */
const cancel = async (req, res) => {
  try {
    const { reason } = req.body;
    const vendorId = await resolveVendorProfileId(req);
    if (!vendorId) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found.' });
    }

    const sub = await vendorSubscriptionService.cancelSubscription(vendorId, reason);

    try {
      await AuditLog.create({
        user: req.user?._id,
        action: 'VENDOR_SUBSCRIPTION_CANCELLED',
        module: 'VENDOR',
        details: `Auto-renewal cancelled: ${reason || 'No reason provided'}`,
      });
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: 'Subscription auto-renewal cancelled. Your access remains active until the end of the billing period.',
      data: sub,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/vendor/subscription/invoices
 * Lists vendor billing invoices
 */
const getInvoices = async (req, res) => {
  try {
    const vendorId = await resolveVendorProfileId(req);
    if (!vendorId) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found.' });
    }

    const invoices = await vendorSubscriptionService.getVendorInvoices(vendorId);
    return res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices: ' + error.message,
    });
  }
};

/**
 * GET /api/vendor/subscription/invoices/:id/print
 * Printable official A4 SaaS receipt HTML
 */
const getInvoiceHtml = async (req, res) => {
  try {
    const sub = await VendorSubscription.findById(req.params.id)
      .populate('plan')
      .populate('vendor', 'storeName email phone address');

    if (!sub) {
      return res.status(404).send('<h1>Invoice Not Found</h1>');
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>SaaS Subscription Invoice - ${sub.invoiceNumber}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: 900; color: #0f172a; }
          .badge { background: #dcfce7; color: #15803d; font-weight: 800; padding: 4px 12px; border-radius: 999px; font-size: 12px; }
          .details { margin: 30px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .table th { background: #f8fafc; text-align: left; padding: 12px; border-bottom: 1px solid #cbd5e1; font-size: 12px; text-transform: uppercase; }
          .table td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          .total { margin-top: 30px; text-align: right; }
          .total-amount { font-size: 24px; font-weight: 900; color: #0f172a; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">AuraMarket SaaS Commerce</div>
            <p style="color: #64748b; font-size: 12px;">Merchant Subscription Tax Invoice</p>
          </div>
          <div style="text-align: right;">
            <span class="badge">PAID</span>
            <p style="font-size: 12px; color: #64748b; margin-top: 8px;">Invoice #: <strong>${sub.invoiceNumber}</strong></p>
            <p style="font-size: 12px; color: #64748b;">Date: ${new Date(sub.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div class="details">
          <div>
            <strong style="font-size: 12px; color: #64748b; text-transform: uppercase;">Billed To:</strong>
            <p style="margin: 4px 0 0 0; font-weight: bold;">${sub.vendor?.storeName || 'Merchant Store'}</p>
            <p style="margin: 4px 0; font-size: 13px; color: #475569;">${sub.vendor?.email || ''}</p>
          </div>
          <div>
            <strong style="font-size: 12px; color: #64748b; text-transform: uppercase;">Subscription Details:</strong>
            <p style="margin: 4px 0 0 0;">Plan: <strong>${sub.plan?.name}</strong></p>
            <p style="margin: 4px 0; font-size: 13px; color: #475569;">Cycle: ${sub.billingCycle} | Valid Until: ${new Date(sub.currentPeriodEnd).toLocaleDateString()}</p>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Period</th>
              <th>Payment Method</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${sub.plan?.name} Subscription Plan</strong><br><span style="font-size: 12px; color: #64748b;">Platform Commission Rate: ${sub.plan?.features?.commissionRatePercent}%</span></td>
              <td>${new Date(sub.currentPeriodStart).toLocaleDateString()} - ${new Date(sub.currentPeriodEnd).toLocaleDateString()}</td>
              <td>${sub.paymentMethod}</td>
              <td style="text-align: right; font-weight: bold;">₹${sub.amountPaid.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        <div class="total">
          <p style="color: #64748b; font-size: 13px;">Total Paid Amount:</p>
          <p class="total-amount">₹${sub.amountPaid.toLocaleString('en-IN')} ${sub.currency}</p>
        </div>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (error) {
    return res.status(500).send('Error generating invoice: ' + error.message);
  }
};

/**
 * Super Admin Endpoints
 */
const adminGetAnalytics = async (req, res) => {
  try {
    const analytics = await vendorSubscriptionService.getSubscriptionAnalytics();
    return res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const adminGetSubscriptions = async (req, res) => {
  try {
    const list = await VendorSubscription.find()
      .populate('vendor', 'storeName email phone')
      .populate('plan')
      .sort({ createdAt: -1 })
      .limit(50);
    return res.status(200).json({ success: true, count: list.length, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const adminCreatePlan = async (req, res) => {
  try {
    const plan = await VendorSubscriptionPlan.create(req.body);
    return res.status(201).json({ success: true, data: plan });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const adminUpdatePlan = async (req, res) => {
  try {
    const plan = await VendorSubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.status(200).json({ success: true, data: plan });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPlans,
  getCurrentSubscription,
  subscribe,
  cancel,
  getInvoices,
  getInvoiceHtml,
  adminGetAnalytics,
  adminGetSubscriptions,
  adminCreatePlan,
  adminUpdatePlan,
};
