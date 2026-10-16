const VendorProfile = require('../models/VendorProfile');
const SubOrder = require('../models/SubOrder');
const ReturnRequest = require('../models/ReturnRequest');
const Review = require('../models/Review');
const { recordAuditLog } = require('../utils/auditLogger');

/**
 * Core mathematical engine to evaluate Vendor Health & SLA metrics
 */
const evaluateVendorSla = async (vendorId) => {
  const vendor = await VendorProfile.findById(vendorId);
  if (!vendor) return null;

  // 1. Fetch all sub-orders for this vendor
  const subOrders = await SubOrder.find({ vendor: vendor._id });
  const totalEvaluated = subOrders.length;

  // 2. Calculate Late Dispatches
  // SLA threshold: order dispatched after 48h from creation OR unfulfilled & older than 48h
  const now = Date.now();
  const lateOrders = subOrders.filter((o) => {
    if (o.dispatchedAt) {
      return new Date(o.dispatchedAt).getTime() - new Date(o.createdAt).getTime() > 48 * 3600 * 1000;
    }
    // If not yet dispatched and older than 48 hours
    const isPending = ['placed', 'pending', 'confirmed', 'packaging', 'packed'].includes(o.status);
    return isPending && now - new Date(o.createdAt).getTime() > 48 * 3600 * 1000;
  });
  const lateOrdersCount = lateOrders.length;
  const lateShipmentRate = totalEvaluated > 0 ? Math.round((lateOrdersCount / totalEvaluated) * 1000) / 10 : 0;

  // 3. Calculate Cancellations
  const cancelledOrders = subOrders.filter((o) => o.status === 'cancelled');
  const cancelledOrdersCount = cancelledOrders.length;
  const cancellationRate = totalEvaluated > 0 ? Math.round((cancelledOrdersCount / totalEvaluated) * 1000) / 10 : 0;

  // 4. Calculate Returns & Product Defect Rate
  const deliveredOrders = subOrders.filter((o) => o.status === 'delivered');
  const deliveredCount = deliveredOrders.length;
  const returnRequests = await ReturnRequest.find({
    vendor: vendor._id,
    status: { $in: ['APPROVED', 'RECEIVED', 'REFUNDED'] },
  });
  const returnedOrdersCount = returnRequests.length;
  const returnRate = deliveredCount > 0 ? Math.round((returnedOrdersCount / deliveredCount) * 1000) / 10 : 0;

  // 5. On-Time Delivery Rate
  const onTimeDeliveryRate = Math.max(0, Math.min(100, Math.round((100 - lateShipmentRate) * 10) / 10));

  // 6. Average Rating
  const averageRating = Number(vendor.rating) || 4.8;

  // 7. Overall Health Score Calculation (0 - 100)
  let score = 100;
  score -= lateShipmentRate * 2.5;
  score -= cancellationRate * 5.0;
  score -= returnRate * 3.0;
  if (averageRating < 4.0) {
    score -= (4.0 - averageRating) * 10;
  }
  score = Math.max(0, Math.min(100, Math.round(score * 10) / 10));

  // 8. Determine Badge Tier & Privileges / Penalties (if not manually overridden)
  let badgeTier = 'SILVER';
  let penaltyStatus = 'GOOD_STANDING';
  let dailyOrderCap = null;
  let payoutHoldDays = 0;
  let commissionDiscountPercent = 0;
  let searchRankBoost = 1.0;
  let warningNotes = '';

  if (vendor.slaMetrics && vendor.slaMetrics.isManualOverride) {
    badgeTier = vendor.slaMetrics.badgeTier || 'SILVER';
    penaltyStatus = vendor.slaMetrics.penaltyStatus || 'GOOD_STANDING';
    dailyOrderCap = vendor.slaMetrics.dailyOrderCap ?? null;
    payoutHoldDays = vendor.slaMetrics.payoutHoldDays ?? 0;
    commissionDiscountPercent = vendor.slaMetrics.commissionDiscountPercent ?? 0;
    searchRankBoost = vendor.slaMetrics.searchRankBoost ?? 1.0;
    warningNotes = vendor.slaMetrics.warningNotes || '';
  } else {
    // Automated Tier Rules
    if (score >= 90 && lateShipmentRate <= 2.0 && cancellationRate <= 1.0 && returnRate <= 2.5 && averageRating >= 4.5) {
      badgeTier = 'PLATINUM';
      commissionDiscountPercent = 2; // 2% platform commission reduction bonus
      searchRankBoost = 1.25; // 25% organic visibility boost in search
    } else if (score >= 75 && lateShipmentRate <= 4.0 && cancellationRate <= 2.5 && returnRate <= 4.0) {
      badgeTier = 'GOLD';
      commissionDiscountPercent = 1;
      searchRankBoost = 1.1;
    } else if (score >= 50 && lateShipmentRate <= 8.0 && cancellationRate <= 5.0) {
      badgeTier = 'SILVER';
      commissionDiscountPercent = 0;
      searchRankBoost = 1.0;
    } else if (score >= 35) {
      badgeTier = 'AT_RISK';
      penaltyStatus = 'WARNING';
      dailyOrderCap = 50;
      payoutHoldDays = 7;
      warningNotes = 'High late shipment or cancellation rate detected. Please clear backlogs to prevent probation.';
    } else if (score >= 20) {
      badgeTier = 'PROBATION';
      penaltyStatus = 'PROBATION';
      dailyOrderCap = 20;
      payoutHoldDays = 14;
      warningNotes = 'Severe SLA breaches. Store placed under 14-day probation with order throttling.';
    } else {
      badgeTier = 'SUSPENDED';
      penaltyStatus = 'SUSPENDED';
      dailyOrderCap = 0;
      payoutHoldDays = 30;
      warningNotes = 'Critical non-compliance. Store operations suspended pending administrative review.';
    }
  }

  // 9. Persist evaluated metrics
  vendor.slaMetrics = {
    score,
    badgeTier,
    lateShipmentRate,
    cancellationRate,
    returnRate,
    onTimeDeliveryRate,
    averageRating,
    totalOrdersEvaluated: totalEvaluated,
    lateOrdersCount,
    cancelledOrdersCount,
    returnedOrdersCount,
    dailyOrderCap,
    payoutHoldDays,
    penaltyStatus,
    commissionDiscountPercent,
    searchRankBoost,
    warningNotes,
    isManualOverride: vendor.slaMetrics?.isManualOverride || false,
    overrideReason: vendor.slaMetrics?.overrideReason || '',
    lastCalculatedAt: new Date(),
  };

  await vendor.save();
  return vendor;
};

// @desc    Get Current Vendor SLA Health Scorecard
// @route   GET /api/vendor/health
exports.getVendorHealth = async (req, res, next) => {
  try {
    let vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    // Auto calculate if metrics haven't been computed or older than 30 mins
    const lastCalc = vendor.slaMetrics?.lastCalculatedAt ? new Date(vendor.slaMetrics.lastCalculatedAt).getTime() : 0;
    if (Date.now() - lastCalc > 30 * 60 * 1000) {
      vendor = await evaluateVendorSla(vendor._id);
    }

    const sla = vendor.slaMetrics || {};

    res.status(200).json({
      success: true,
      storeName: vendor.storeName,
      scorecard: {
        score: sla.score ?? 100,
        badgeTier: sla.badgeTier || 'SILVER',
        lateShipmentRate: sla.lateShipmentRate ?? 0,
        cancellationRate: sla.cancellationRate ?? 0,
        returnRate: sla.returnRate ?? 0,
        onTimeDeliveryRate: sla.onTimeDeliveryRate ?? 100,
        averageRating: sla.averageRating ?? 4.8,
        totalOrdersEvaluated: sla.totalOrdersEvaluated ?? 0,
        lateOrdersCount: sla.lateOrdersCount ?? 0,
        cancelledOrdersCount: sla.cancelledOrdersCount ?? 0,
        returnedOrdersCount: sla.returnedOrdersCount ?? 0,
        lastCalculatedAt: sla.lastCalculatedAt,
      },
      privileges: {
        commissionDiscountPercent: sla.commissionDiscountPercent ?? 0,
        searchRankBoost: sla.searchRankBoost ?? 1.0,
        instantPayout: ['PLATINUM', 'GOLD'].includes(sla.badgeTier),
        prioritySupport: sla.badgeTier === 'PLATINUM',
      },
      penalties: {
        penaltyStatus: sla.penaltyStatus || 'GOOD_STANDING',
        dailyOrderCap: sla.dailyOrderCap,
        payoutHoldDays: sla.payoutHoldDays ?? 0,
        warningNotes: sla.warningNotes || '',
        isManualOverride: sla.isManualOverride || false,
      },
      policyBenchmarks: {
        lateShipmentTarget: 2.0, // <= 2.0%
        cancellationTarget: 1.0, // <= 1.0%
        returnTarget: 2.5, // <= 2.5%
        ratingTarget: 4.5, // >= 4.5
      },
      appeals: vendor.slaAppeals || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Force Recalculate Vendor SLA Health Scorecard
// @route   POST /api/vendor/health/recalculate
exports.recalculateVendorHealth = async (req, res, next) => {
  try {
    let vendor;
    const isAdmin = req.user && (req.user.role === 'superadmin' || req.user.role === 'admin');

    if (isAdmin && req.body.vendorId) {
      vendor = await VendorProfile.findById(req.body.vendorId);
    } else {
      vendor = await VendorProfile.findOne({ user: req.user._id });
    }

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const updatedVendor = await evaluateVendorSla(vendor._id);

    res.status(200).json({
      success: true,
      message: 'Seller health and SLA scorecard recalculated successfully',
      scorecard: updatedVendor.slaMetrics,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit an SLA Performance Appeal & Remediation Plan
// @route   POST /api/vendor/health/appeal
exports.submitSlaAppeal = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ user: req.user._id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const { reason, actionPlan, metricContested = 'OVERALL_SCORE' } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'A detailed reason (minimum 10 characters) explaining the SLA variance is required',
      });
    }

    if (!actionPlan || actionPlan.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'A concrete remediation action plan (minimum 10 characters) is required',
      });
    }

    const newAppeal = {
      reason: reason.trim(),
      actionPlan: actionPlan.trim(),
      metricContested,
      status: 'PENDING',
      submittedAt: new Date(),
    };

    vendor.slaAppeals.push(newAppeal);
    await vendor.save();

    const createdAppeal = vendor.slaAppeals[vendor.slaAppeals.length - 1];

    await recordAuditLog({
      action: 'VENDOR_SLA_APPEAL_SUBMITTED',
      module: 'VENDORS',
      req,
      description: `Vendor "${vendor.storeName}" submitted an SLA appeal for ${metricContested}`,
      targetType: 'VendorProfile',
      targetId: vendor._id,
      details: {
        vendorId: vendor._id,
        metricContested,
        appealId: createdAppeal._id,
      },
      severity: 'LOW',
    });

    res.status(201).json({
      success: true,
      message: 'SLA appeal and remediation plan submitted successfully for administrative review',
      appeal: createdAppeal,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Super Admin Multi-Vendor Health & SLA Radar
// @route   GET /api/admin/vendor-health
exports.getAdminVendorHealthRadar = async (req, res, next) => {
  try {
    const vendors = await VendorProfile.find()
      .populate('user', 'name email')
      .select('storeName storeLogo storeSlug status slaMetrics slaAppeals createdAt')
      .sort({ 'slaMetrics.score': 1 }); // Lowest scores first to spotlight at-risk vendors

    let totalScore = 0;
    const tierCounts = {
      PLATINUM: 0,
      GOLD: 0,
      SILVER: 0,
      AT_RISK: 0,
      PROBATION: 0,
      SUSPENDED: 0,
    };
    let totalPendingAppeals = 0;

    vendors.forEach((v) => {
      const tier = v.slaMetrics?.badgeTier || 'SILVER';
      if (tierCounts[tier] !== undefined) {
        tierCounts[tier]++;
      }
      totalScore += v.slaMetrics?.score ?? 100;
      if (Array.isArray(v.slaAppeals)) {
        totalPendingAppeals += v.slaAppeals.filter((a) => a.status === 'PENDING').length;
      }
    });

    const averageHealthScore = vendors.length > 0 ? Math.round((totalScore / vendors.length) * 10) / 10 : 100;

    res.status(200).json({
      success: true,
      count: vendors.length,
      telemetry: {
        totalVendors: vendors.length,
        averageHealthScore,
        tierCounts,
        atRiskCount: tierCounts.AT_RISK + tierCounts.PROBATION + tierCounts.SUSPENDED,
        pendingAppealsCount: totalPendingAppeals,
      },
      vendors,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Super Admin Manual SLA Tier & Penalty Override
// @route   PUT /api/admin/vendor-health/:vendorId/override
exports.overrideVendorHealthTier = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const {
      badgeTier,
      dailyOrderCap,
      payoutHoldDays,
      penaltyStatus,
      overrideReason,
      clearOverride = false,
    } = req.body;

    const vendor = await VendorProfile.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (clearOverride) {
      vendor.slaMetrics.isManualOverride = false;
      vendor.slaMetrics.overrideReason = '';
      await vendor.save();
      // Recalculate based on real data
      const recalculated = await evaluateVendorSla(vendor._id);
      return res.status(200).json({
        success: true,
        message: 'Manual SLA override cleared. Scorecard recalculated automatically.',
        scorecard: recalculated.slaMetrics,
      });
    }

    if (badgeTier && !['PLATINUM', 'GOLD', 'SILVER', 'AT_RISK', 'PROBATION', 'SUSPENDED'].includes(badgeTier)) {
      return res.status(400).json({ success: false, message: 'Invalid badge tier' });
    }

    vendor.slaMetrics = vendor.slaMetrics || {};
    vendor.slaMetrics.isManualOverride = true;
    vendor.slaMetrics.overrideReason = overrideReason || 'Administrative decision';
    if (badgeTier) vendor.slaMetrics.badgeTier = badgeTier;
    if (dailyOrderCap !== undefined) vendor.slaMetrics.dailyOrderCap = dailyOrderCap === '' ? null : Number(dailyOrderCap);
    if (payoutHoldDays !== undefined) vendor.slaMetrics.payoutHoldDays = Number(payoutHoldDays);
    if (penaltyStatus) vendor.slaMetrics.penaltyStatus = penaltyStatus;

    if (badgeTier === 'PLATINUM') {
      vendor.slaMetrics.commissionDiscountPercent = 2;
      vendor.slaMetrics.searchRankBoost = 1.25;
    } else if (badgeTier === 'GOLD') {
      vendor.slaMetrics.commissionDiscountPercent = 1;
      vendor.slaMetrics.searchRankBoost = 1.1;
    } else {
      vendor.slaMetrics.commissionDiscountPercent = 0;
      vendor.slaMetrics.searchRankBoost = 1.0;
    }

    await vendor.save();

    await recordAuditLog({
      action: 'VENDOR_SLA_OVERRIDDEN',
      module: 'VENDORS',
      req,
      description: `Super Admin manually updated SLA tier for "${vendor.storeName}" to ${vendor.slaMetrics.badgeTier}`,
      targetType: 'VendorProfile',
      targetId: vendor._id,
      details: {
        vendorId: vendor._id,
        badgeTier: vendor.slaMetrics.badgeTier,
        overrideReason: vendor.slaMetrics.overrideReason,
      },
      severity: 'HIGH',
    });

    res.status(200).json({
      success: true,
      message: `Vendor SLA tier successfully updated to ${vendor.slaMetrics.badgeTier}`,
      scorecard: vendor.slaMetrics,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Super Admin Review Vendor SLA Appeal
// @route   PATCH /api/admin/vendor-health/appeals/:appealId
exports.reviewSlaAppeal = async (req, res, next) => {
  try {
    const { appealId } = req.params;
    const { decision, adminFeedback = '' } = req.body; // decision: 'APPROVED' | 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be APPROVED or REJECTED' });
    }

    const vendor = await VendorProfile.findOne({ 'slaAppeals._id': appealId });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Appeal not found' });
    }

    const appeal = vendor.slaAppeals.id(appealId);
    appeal.status = decision;
    appeal.reviewedAt = new Date();
    appeal.reviewedBy = req.user._id;
    appeal.adminFeedback = adminFeedback;

    if (decision === 'APPROVED') {
      // Restore vendor to Silver good standing and clear active daily caps
      vendor.slaMetrics.penaltyStatus = 'GOOD_STANDING';
      vendor.slaMetrics.dailyOrderCap = null;
      vendor.slaMetrics.payoutHoldDays = 0;
      if (['AT_RISK', 'PROBATION', 'SUSPENDED'].includes(vendor.slaMetrics.badgeTier)) {
        vendor.slaMetrics.badgeTier = 'SILVER';
        vendor.slaMetrics.score = Math.max(vendor.slaMetrics.score || 50, 60);
      }
      vendor.slaMetrics.warningNotes = 'Appeal approved by management: penalties waived.';
    }

    await vendor.save();

    await recordAuditLog({
      action: 'VENDOR_SLA_APPEAL_REVIEWED',
      module: 'VENDORS',
      req,
      description: `Super Admin ${decision} SLA appeal for vendor "${vendor.storeName}"`,
      targetType: 'VendorProfile',
      targetId: vendor._id,
      details: {
        vendorId: vendor._id,
        appealId,
        decision,
        adminFeedback,
      },
      severity: 'MEDIUM',
    });

    res.status(200).json({
      success: true,
      message: `SLA Appeal has been ${decision.toLowerCase()} successfully`,
      appeal,
      scorecard: vendor.slaMetrics,
    });
  } catch (error) {
    next(error);
  }
};
