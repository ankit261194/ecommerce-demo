const DeliveryTask = require('../models/DeliveryTask');
const ReturnRequest = require('../models/ReturnRequest');
const Product = require('../models/Product');
const VendorProfile = require('../models/VendorProfile');
const ShippingConfig = require('../models/ShippingConfig');
const AuditLog = require('../models/AuditLog');
const WalletTransaction = require('../models/WalletTransaction');
const Ledger = require('../models/Ledger');
const Order = require('../models/Order');
const SubOrder = require('../models/SubOrder');

// @desc    Get Return Pickup Task Details with Inspection Guide
// @route   GET /api/delivery/reverse-pickup/:taskId
// @access  Private (Delivery Rider, SuperAdmin)
exports.getReturnPickupDetails = async (req, res, next) => {
  try {
    const task = await DeliveryTask.findById(req.params.taskId)
      .populate({
        path: 'returnRequest',
        populate: [
          { path: 'customer', select: 'name email phone' },
          { path: 'vendor', select: 'storeName phone warehouseAddress' },
          { path: 'items.product', select: 'title price image sku countInStock' },
        ],
      })
      .populate('deliveryPartner', 'name phone vehicleDetails');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Pickup task not found' });
    }

    if (task.taskType !== 'REVERSE_PICKUP') {
      return res.status(400).json({ success: false, message: 'Task is not a reverse pickup task' });
    }

    res.status(200).json({
      success: true,
      data: task,
      inspectionChecklistGuide: [
        { key: 'brandTagIntact', label: 'Brand Tag & Hologram Intact', mandatory: true },
        { key: 'originalPackagingPresent', label: 'Original Box & Barcode Present', mandatory: true },
        { key: 'serialNumberMatched', label: 'Serial / IMEI Number Matches Invoice', mandatory: false },
        { key: 'noPhysicalDamage', label: 'No Cracks, Dents, or Customer Physical Damage', mandatory: true },
        { key: 'accessoriesComplete', label: 'All In-Box Accessories & Manuals Present', mandatory: false },
        { key: 'powerOnVerified', label: 'Device Powers On (If Applicable / Electronics)', mandatory: false },
      ],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Doorstep 6-Point Return Pickup Inspection & Waybill Handover
// @route   POST /api/delivery/reverse-pickup/:taskId/inspect-doorstep
// @access  Private (Delivery Rider, SuperAdmin)
exports.inspectDoorstepReturn = async (req, res, next) => {
  try {
    const {
      otp,
      checklist = {},
      photos = [],
      inspectionStatus,
      rejectionCategory = 'NONE',
      rejectionReason = '',
    } = req.body;

    const task = await DeliveryTask.findById(req.params.taskId).populate('returnRequest');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Reverse pickup task not found' });
    }

    if (task.taskType !== 'REVERSE_PICKUP') {
      return res.status(400).json({ success: false, message: 'Specified task is not a reverse pickup task' });
    }

    // Role check: only assigned rider or superadmin
    if (
      req.user.role !== 'superadmin' &&
      task.deliveryPartner &&
      task.deliveryPartner.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to inspect this pickup task' });
    }

    if (!['ACCEPTED_AT_DOORSTEP', 'REJECTED_AT_DOORSTEP'].includes(inspectionStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid inspectionStatus. Must be ACCEPTED_AT_DOORSTEP or REJECTED_AT_DOORSTEP',
      });
    }

    let returnReq = task.returnRequest;
    if (!returnReq && task.returnRequest) {
      returnReq = await ReturnRequest.findById(task.returnRequest);
    }

    const expectedOtp =
      task.reversePickupDetails?.pickupOtp ||
      returnReq?.reversePickupOtp ||
      '';

    // 1. ACCEPTED WORKFLOW
    if (inspectionStatus === 'ACCEPTED_AT_DOORSTEP') {
      // Validate customer OTP
      if (expectedOtp && (!otp || String(otp).trim() !== String(expectedOtp).trim())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer pickup OTP. Please verify the 4-digit code provided by the customer.',
        });
      }

      // Generate unique reverse waybill
      const timestampPart = Date.now().toString().slice(-6);
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const reverseWaybill = `RTO-${timestampPart}-${randomPart}`;

      // Update DeliveryTask
      task.doorstepInspection = {
        checklist: {
          brandTagIntact: Boolean(checklist.brandTagIntact),
          originalPackagingPresent: Boolean(checklist.originalPackagingPresent),
          serialNumberMatched: Boolean(checklist.serialNumberMatched),
          noPhysicalDamage: Boolean(checklist.noPhysicalDamage),
          accessoriesComplete: Boolean(checklist.accessoriesComplete),
          powerOnVerified: Boolean(checklist.powerOnVerified),
        },
        photos: Array.isArray(photos) ? photos : [],
        inspectionStatus: 'ACCEPTED_AT_DOORSTEP',
        rejectionCategory: 'NONE',
        rejectionReason: '',
        inspectedAt: new Date(),
        inspectedBy: req.user._id,
        reverseWaybill,
      };
      task.status = 'DELIVERED';
      task.otpVerified = true;
      task.deliveredAt = new Date();
      await task.save();

      // Update ReturnRequest if linked
      if (returnReq) {
        // Fetch shipping configuration for high-value routing threshold
        const shippingConfig = await ShippingConfig.findOne();
        const threshold = shippingConfig?.reverseLogisticsConfig?.centralHubThresholdAmount || 5000;
        const isHighValue = (returnReq.refundAmount || 0) >= threshold;

        const centralHubName =
          shippingConfig?.reverseLogisticsConfig?.centralHubName || 'AuraMarket Central QC & Grading Hub';
        const centralHubAddress = shippingConfig?.reverseLogisticsConfig?.centralHubAddress || {
          recipient: 'Central Returns Intake',
          street: 'Sector 62, Industrial Area',
          city: 'Noida',
          state: 'Uttar Pradesh',
          pincode: '201301',
        };

        const vendorProfile = returnReq.vendor ? await VendorProfile.findById(returnReq.vendor) : null;
        const vendorHubName = vendorProfile?.storeName ? `${vendorProfile.storeName} Fulfillment Warehouse` : 'Primary Vendor Warehouse';
        const vendorAddress = {
          recipient: vendorProfile?.storeName || 'Merchant Warehouse',
          street: vendorProfile?.warehouseAddress?.address || 'Industrial Area',
          city: vendorProfile?.warehouseAddress?.city || 'Delhi',
          state: vendorProfile?.warehouseAddress?.state || 'Delhi',
          pincode: vendorProfile?.warehouseAddress?.pincode || '110001',
        };

        returnReq.doorstepInspection = task.doorstepInspection;
        returnReq.reversePickupStatus = 'PICKED_UP';
        returnReq.status = 'PICKED_UP';

        // Set Reverse Routing
        if (!returnReq.reverseRouting) {
          returnReq.reverseRouting = {};
        }
        returnReq.reverseRouting.destinationType = isHighValue ? 'CENTRAL_GRADING_HUB' : 'RETURN_TO_VENDOR';
        returnReq.reverseRouting.destinationHubName = isHighValue ? centralHubName : vendorHubName;
        returnReq.reverseRouting.destinationAddress = isHighValue ? centralHubAddress : vendorAddress;
        returnReq.reverseRouting.currentLocation = 'Customer Doorstep (Collected & Sealed)';
        returnReq.reverseRouting.reverseWaybill = reverseWaybill;
        returnReq.reverseRouting.carrierPartner =
          shippingConfig?.reverseLogisticsConfig?.defaultCarrierPartner || 'AuraMarket Express Reverse';
        returnReq.reverseRouting.routingStatus = 'PICKED_UP_FROM_CUSTOMER';

        if (!Array.isArray(returnReq.reverseRouting.milestones)) {
          returnReq.reverseRouting.milestones = [];
        }
        returnReq.reverseRouting.milestones.push({
          status: 'PICKED_UP_FROM_CUSTOMER',
          location: `${task.pickupLocation?.address || 'Customer Doorstep'}, ${task.pickupLocation?.city || ''}`,
          timestamp: new Date(),
          notes: `Doorstep 6-point verification passed. Package sealed with Reverse Waybill ${reverseWaybill}. Routed to ${returnReq.reverseRouting.destinationType}.`,
          updatedBy: req.user._id,
        });

        await returnReq.save();
      }

      await AuditLog.create({
        action: 'DOORSTEP_RETURN_INSPECT_ACCEPTED',
        module: 'LOGISTICS',
        performedBy: req.user._id,
        userName: req.user.name || 'Delivery Rider',
        userEmail: req.user.email || 'rider@auramarket.com',
        userRole: req.user.role || 'delivery',
        targetId: task._id.toString(),
        targetType: 'DeliveryTask',
        description: `Doorstep return pickup task #${task._id} passed 6-point checklist. Waybill ${reverseWaybill} issued.`,
      });

      return res.status(200).json({
        success: true,
        message: `Doorstep inspection verified successfully! Reverse Waybill ${reverseWaybill} generated.`,
        data: {
          task,
          returnRequest: returnReq,
          reverseWaybill,
          inspectionStatus: 'ACCEPTED_AT_DOORSTEP',
        },
      });
    }

    // 2. REJECTED WORKFLOW
    if (inspectionStatus === 'REJECTED_AT_DOORSTEP') {
      const validCategories = [
        'TAG_MISSING',
        'DAMAGED_BY_CUSTOMER',
        'SERIAL_MISMATCH',
        'ACCESSORY_MISSING',
        'CUSTOMER_REFUSED_HANDOVER',
        'NONE',
      ];
      const category = validCategories.includes(rejectionCategory) ? rejectionCategory : 'DAMAGED_BY_CUSTOMER';
      const reasonText = rejectionReason || `Item failed doorstep inspection: ${category}`;

      task.doorstepInspection = {
        checklist: {
          brandTagIntact: Boolean(checklist.brandTagIntact),
          originalPackagingPresent: Boolean(checklist.originalPackagingPresent),
          serialNumberMatched: Boolean(checklist.serialNumberMatched),
          noPhysicalDamage: Boolean(checklist.noPhysicalDamage),
          accessoriesComplete: Boolean(checklist.accessoriesComplete),
          powerOnVerified: Boolean(checklist.powerOnVerified),
        },
        photos: Array.isArray(photos) ? photos : [],
        inspectionStatus: 'REJECTED_AT_DOORSTEP',
        rejectionCategory: category,
        rejectionReason: reasonText,
        inspectedAt: new Date(),
        inspectedBy: req.user._id,
        reverseWaybill: '',
      };
      task.status = 'FAILED';
      task.failureReason = reasonText;
      if (!task.failureLog) task.failureLog = {};
      task.failureLog.reason = reasonText;
      await task.save();

      if (returnReq) {
        returnReq.doorstepInspection = task.doorstepInspection;
        returnReq.status = 'REJECTED';
        returnReq.reversePickupStatus = 'FAILED';
        returnReq.resolutionNote = `Return rejected at customer doorstep: ${category}. Reason: ${reasonText}`;

        if (!returnReq.reverseRouting) {
          returnReq.reverseRouting = {};
        }
        returnReq.reverseRouting.routingStatus = 'REJECTED_AT_DOORSTEP';
        returnReq.reverseRouting.currentLocation = 'Customer Doorstep (Returned to Customer)';

        if (!Array.isArray(returnReq.reverseRouting.milestones)) {
          returnReq.reverseRouting.milestones = [];
        }
        returnReq.reverseRouting.milestones.push({
          status: 'REJECTED_AT_DOORSTEP',
          location: 'Customer Doorstep',
          timestamp: new Date(),
          notes: `Rider rejected return pickup. Category: ${category}. Reason: ${reasonText}`,
          updatedBy: req.user._id,
        });

        await returnReq.save();
      }

      await AuditLog.create({
        action: 'DOORSTEP_RETURN_INSPECT_REJECTED',
        module: 'LOGISTICS',
        performedBy: req.user._id,
        userName: req.user.name || 'Delivery Rider',
        userEmail: req.user.email || 'rider@auramarket.com',
        userRole: req.user.role || 'delivery',
        targetId: task._id.toString(),
        targetType: 'DeliveryTask',
        description: `Doorstep return pickup task #${task._id} rejected (${category}): ${reasonText}`,
      });

      return res.status(200).json({
        success: true,
        message: `Doorstep return pickup marked as REJECTED. Reason: ${reasonText}`,
        data: {
          task,
          returnRequest: returnReq,
          inspectionStatus: 'REJECTED_AT_DOORSTEP',
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Record Reverse Routing Multi-Hop Milestone
// @route   PATCH /api/returns/:id/reverse-routing/milestone
// @access  Private (Delivery Rider, Vendor, SuperAdmin)
exports.recordReverseRoutingMilestone = async (req, res, next) => {
  try {
    const { milestoneStatus, location = '', notes = '', carrierPartner } = req.body;

    const validStatuses = [
      'PICKUP_SCHEDULED',
      'PICKED_UP_FROM_CUSTOMER',
      'INWARDED_LOCAL_HUB',
      'IN_REVERSE_TRANSIT',
      'OUT_FOR_VENDOR_DELIVERY',
      'RECEIVED_AT_VENDOR_WAREHOUSE',
      'RESTOCKED_TO_INVENTORY',
      'SPF_CLAIM_RAISED',
      'SCRAPPED',
      'REJECTED_AT_DOORSTEP',
    ];

    if (!validStatuses.includes(milestoneStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid milestoneStatus. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const returnReq = await ReturnRequest.findById(req.params.id);
    if (!returnReq) {
      return res.status(404).json({ success: false, message: 'Return request not found' });
    }

    if (!returnReq.reverseRouting) {
      returnReq.reverseRouting = {};
    }

    returnReq.reverseRouting.routingStatus = milestoneStatus;
    if (location) {
      returnReq.reverseRouting.currentLocation = location;
    }
    if (carrierPartner) {
      returnReq.reverseRouting.carrierPartner = carrierPartner;
    }

    if (milestoneStatus === 'IN_REVERSE_TRANSIT') {
      returnReq.status = 'IN_REVERSE_TRANSIT';
    } else if (milestoneStatus === 'RECEIVED_AT_VENDOR_WAREHOUSE') {
      returnReq.status = 'RECEIVED_AT_WAREHOUSE';
    }

    if (!Array.isArray(returnReq.reverseRouting.milestones)) {
      returnReq.reverseRouting.milestones = [];
    }

    returnReq.reverseRouting.milestones.push({
      status: milestoneStatus,
      location: location || returnReq.reverseRouting.currentLocation || 'Transit Facility',
      timestamp: new Date(),
      notes: notes || `Milestone reached: ${milestoneStatus}`,
      updatedBy: req.user._id,
    });

    await returnReq.save();

    await AuditLog.create({
      action: 'REVERSE_ROUTING_MILESTONE_UPDATED',
      module: 'LOGISTICS',
      performedBy: req.user._id,
      userName: req.user.name || 'Logistics Operator',
      userEmail: req.user.email || 'logistics@auramarket.com',
      userRole: req.user.role || 'staff',
      targetId: returnReq._id.toString(),
      targetType: 'ReturnRequest',
      description: `Reverse transit milestone updated to ${milestoneStatus} at ${location || 'Transit Hub'}.`,
    });

    res.status(200).json({
      success: true,
      message: `Reverse logistics milestone updated to ${milestoneStatus}`,
      data: returnReq,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Vendor Inbound Return Grading & Inventory Restock / SPF Claim
// @route   POST /api/vendor/returns/:id/grade-and-restock
// @access  Private (Vendor, SuperAdmin, Vendor Staff)
exports.vendorGradeAndRestock = async (req, res, next) => {
  try {
    const {
      conditionGrade = 'GRADE_A_RESALEABLE',
      restockAction = 'RESTOCK',
      restockQuantity,
      spfClaimData = {},
      notes = '',
    } = req.body;

    const validGrades = [
      'UNGRADED',
      'GRADE_A_RESALEABLE',
      'GRADE_B_REFURB',
      'GRADE_C_DAMAGED',
      'DEFECTIVE_SCRAP',
    ];

    if (!validGrades.includes(conditionGrade)) {
      return res.status(400).json({
        success: false,
        message: `Invalid conditionGrade. Must be one of: ${validGrades.join(', ')}`,
      });
    }

    const returnReq = await ReturnRequest.findById(req.params.id).populate('items.product');

    if (!returnReq) {
      return res.status(404).json({ success: false, message: 'Return request not found' });
    }

    // Vendor authorization verification
    if (req.user.role !== 'superadmin') {
      const vendorId =
        req.user.vendorProfile ||
        req.vendorProfile?._id ||
        (await VendorProfile.findOne({ user: req.user._id }))?._id;

      const reqVendorId = returnReq.vendor?._id ? returnReq.vendor._id : returnReq.vendor;
      if (!vendorId || String(vendorId) !== String(reqVendorId)) {
        return res.status(403).json({ success: false, message: 'Not authorized for this vendor return parcel' });
      }
    }

    if (!returnReq.reverseRouting) {
      returnReq.reverseRouting = {};
    }

    returnReq.reverseRouting.conditionGrade = conditionGrade;

    if (!Array.isArray(returnReq.reverseRouting.milestones)) {
      returnReq.reverseRouting.milestones = [];
    }

    // 1. RESTOCK WORKFLOW (Grade A or explicit RESTOCK)
    if (conditionGrade === 'GRADE_A_RESALEABLE' || restockAction === 'RESTOCK') {
      let totalUnits = 0;
      for (const item of returnReq.items) {
        const qty = Number(restockQuantity) || item.quantity || 1;
        totalUnits += qty;
        if (item.product) {
          const prodId = item.product._id || item.product;
          await Product.findByIdAndUpdate(prodId, {
            $inc: { countInStock: qty, stock: qty },
          });
        }
      }

      returnReq.reverseRouting.restockedQuantity = totalUnits;
      returnReq.reverseRouting.restockedAt = new Date();
      returnReq.reverseRouting.routingStatus = 'RESTOCKED_TO_INVENTORY';
      returnReq.status = 'RESTOCKED';

      returnReq.reverseRouting.milestones.push({
        status: 'RESTOCKED_TO_INVENTORY',
        location: 'Merchant Warehouse Shelf',
        timestamp: new Date(),
        notes: `Item verified as ${conditionGrade}. ${totalUnits} units automatically restocked back to live inventory.`,
        updatedBy: req.user._id,
      });

      await returnReq.save();

      await AuditLog.create({
        action: 'RETURN_RESTOCKED_TO_INVENTORY',
        module: 'INVENTORY',
        performedBy: req.user._id,
        userName: req.user.name || 'Merchant Warehouse Manager',
        userEmail: req.user.email || 'vendor@auramarket.com',
        userRole: req.user.role || 'vendor',
        targetId: returnReq._id.toString(),
        targetType: 'ReturnRequest',
        description: `Vendor graded Return #${returnReq._id} as ${conditionGrade}. Restocked ${totalUnits} units to inventory.`,
      });

      return res.status(200).json({
        success: true,
        message: `Return item successfully graded as ${conditionGrade} and restocked to live inventory!`,
        data: returnReq,
      });
    }

    // 2. SELLER PROTECTION FUND (SPF) CLAIM WORKFLOW (Grade C / Damaged / Tampered)
    if (restockAction === 'RAISE_SPF_CLAIM' || conditionGrade === 'GRADE_C_DAMAGED') {
      const claimAmount = Number(spfClaimData.claimAmount) || returnReq.refundAmount || 0;
      const claimReason =
        spfClaimData.claimReason || notes || `Damaged / Tampered return package graded as ${conditionGrade}`;
      const proofPhotos = Array.isArray(spfClaimData.proofPhotos) ? spfClaimData.proofPhotos : [];
      const unboxingVideoUrl = spfClaimData.unboxingVideoUrl || '';

      returnReq.reverseRouting.spfClaim = {
        isClaimRaised: true,
        claimReason,
        claimAmount,
        claimStatus: 'PENDING_REVIEW',
        proofPhotos,
        unboxingVideoUrl,
        compensationAmount: 0,
        reviewedAt: null,
        reviewedBy: null,
        reviewNotes: '',
      };
      returnReq.reverseRouting.routingStatus = 'SPF_CLAIM_RAISED';
      returnReq.status = 'SPF_CLAIM_RAISED';

      returnReq.reverseRouting.milestones.push({
        status: 'SPF_CLAIM_RAISED',
        location: 'Merchant Inbound Claims Bay',
        timestamp: new Date(),
        notes: `Seller Protection Fund (SPF) Claim filed for ₹${claimAmount}. Reason: ${claimReason}. Proofs submitted.`,
        updatedBy: req.user._id,
      });

      await returnReq.save();

      await AuditLog.create({
        action: 'SPF_CLAIM_RAISED',
        module: 'LOGISTICS',
        performedBy: req.user._id,
        userName: req.user.name || 'Merchant',
        userEmail: req.user.email || 'vendor@auramarket.com',
        userRole: req.user.role || 'vendor',
        targetId: returnReq._id.toString(),
        targetType: 'ReturnRequest',
        description: `Vendor raised SPF Claim of ₹${claimAmount} for Return #${returnReq._id}. Reason: ${claimReason}`,
      });

      return res.status(200).json({
        success: true,
        message: `Seller Protection Fund (SPF) Claim of ₹${claimAmount} raised successfully and queued for Super Admin review!`,
        data: returnReq,
      });
    }

    // 3. SCRAP OR GRADE B ACTION
    if (restockAction === 'SCRAP' || conditionGrade === 'DEFECTIVE_SCRAP') {
      returnReq.reverseRouting.routingStatus = 'SCRAPPED';
      returnReq.reverseRouting.milestones.push({
        status: 'SCRAPPED',
        location: 'Merchant Salvage / Scrap Area',
        timestamp: new Date(),
        notes: notes || `Item graded as ${conditionGrade} and marked for salvage/liquidation.`,
        updatedBy: req.user._id,
      });
    } else {
      returnReq.reverseRouting.routingStatus = 'RECEIVED_AT_VENDOR_WAREHOUSE';
      returnReq.reverseRouting.milestones.push({
        status: 'RECEIVED_AT_VENDOR_WAREHOUSE',
        location: 'Merchant Refurbishment Bay',
        timestamp: new Date(),
        notes: notes || `Item graded as ${conditionGrade}. Stored for processing.`,
        updatedBy: req.user._id,
      });
    }

    await returnReq.save();

    res.status(200).json({
      success: true,
      message: `Return item graded as ${conditionGrade} (${restockAction}).`,
      data: returnReq,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List Seller Protection Fund (SPF) Claims for Admin & Vendors
// @route   GET /api/admin/returns/spf-claims
// @access  Private (SuperAdmin, Vendor)
exports.getSpfClaimsList = async (req, res, next) => {
  try {
    const { status = 'ALL', search = '' } = req.query;

    const query = {
      'reverseRouting.spfClaim.isClaimRaised': true,
    };

    if (status && status !== 'ALL') {
      query['reverseRouting.spfClaim.claimStatus'] = status;
    }

    // If vendor user, only show their claims
    if (req.user.role === 'vendor' || req.user.role === 'vendor_staff') {
      const vendorId =
        req.user.vendorProfile ||
        req.vendorProfile?._id ||
        (await VendorProfile.findOne({ user: req.user._id }))?._id;
      if (vendorId) {
        query.vendor = vendorId;
      }
    }

    const claims = await ReturnRequest.find(query)
      .populate('order', 'orderNumber totalAmount paymentMethod shippingAddress')
      .populate('vendor', 'storeName email phone walletBalance')
      .populate('customer', 'name email phone')
      .populate('items.product', 'title price image sku')
      .sort({ updatedAt: -1 });

    const totalClaimsCount = claims.length;
    const pendingCount = claims.filter(c => c.reverseRouting?.spfClaim?.claimStatus === 'PENDING_REVIEW').length;
    const approvedCount = claims.filter(c => c.reverseRouting?.spfClaim?.claimStatus === 'APPROVED_COMPENSATED').length;
    const totalCompensatedAmount = claims
      .filter(c => c.reverseRouting?.spfClaim?.claimStatus === 'APPROVED_COMPENSATED')
      .reduce((sum, c) => sum + (c.reverseRouting?.spfClaim?.compensationAmount || 0), 0);

    res.status(200).json({
      success: true,
      count: claims.length,
      metrics: {
        totalClaimsCount,
        pendingCount,
        approvedCount,
        totalCompensatedAmount,
      },
      data: claims,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Super Admin Review of Vendor SPF Claim (Approve with Wallet Payout / Reject)
// @route   POST /api/admin/returns/spf-claims/:id/review
// @access  Private (SuperAdmin)
exports.reviewSpfClaim = async (req, res, next) => {
  try {
    const { decision, compensationAmount, reviewNotes = '' } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid decision. Must be APPROVED or REJECTED',
      });
    }

    const returnReq = await ReturnRequest.findById(req.params.id)
      .populate('vendor')
      .populate('order');

    if (!returnReq) {
      return res.status(404).json({ success: false, message: 'Return request not found' });
    }

    if (!returnReq.reverseRouting?.spfClaim?.isClaimRaised) {
      return res.status(400).json({
        success: false,
        message: 'No active SPF Claim has been filed for this return request.',
      });
    }

    if (decision === 'APPROVED') {
      const payoutAmount = Number(compensationAmount) || returnReq.reverseRouting.spfClaim.claimAmount || 0;

      if (payoutAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Compensation amount must be greater than zero for approval.',
        });
      }

      // 1. Credit Vendor Wallet
      let vendorProfile = returnReq.vendor;
      if (vendorProfile && typeof vendorProfile.save !== 'function') {
        vendorProfile = await VendorProfile.findById(vendorProfile._id || vendorProfile);
      }

      let balanceAfter = 0;
      if (vendorProfile) {
        vendorProfile.walletBalance = (vendorProfile.walletBalance || 0) + payoutAmount;
        vendorProfile.totalEarned = (vendorProfile.totalEarned || 0) + payoutAmount;
        await vendorProfile.save();
        balanceAfter = vendorProfile.walletBalance;

        // 2. Create WalletTransaction
        await WalletTransaction.create({
          user: vendorProfile.user || req.user._id,
          type: 'CREDIT',
          currency: 'INR',
          amount: payoutAmount,
          category: 'SPF_COMPENSATION',
          status: 'SUCCESS',
          paymentMethod: 'SYSTEM',
          title: 'Seller Protection Fund (SPF) Reimbursement',
          description: reviewNotes || 'Seller Protection Fund reimbursement',
          transactionReference: `SPF-${returnReq._id}-${Date.now().toString().slice(-4)}`,
          notes: reviewNotes || `Seller Protection Fund reimbursement for damaged return #${returnReq._id}`,
        });

        // 3. Create Ledger Entry
        await Ledger.create({
          vendor: vendorProfile._id,
          type: 'SPF_COMPENSATION',
          amount: payoutAmount,
          description: `SPF Claim Approved Compensation for Return #${returnReq._id} (${reviewNotes || 'Claim Verified'})`,
          balanceAfter,
          status: 'COMPLETED',
        });
      }

      returnReq.reverseRouting.spfClaim.claimStatus = 'APPROVED_COMPENSATED';
      returnReq.reverseRouting.spfClaim.compensationAmount = payoutAmount;
      returnReq.reverseRouting.spfClaim.reviewedAt = new Date();
      returnReq.reverseRouting.spfClaim.reviewedBy = req.user._id;
      returnReq.reverseRouting.spfClaim.reviewNotes =
        reviewNotes || 'SPF claim verified by admin. Compensation credited to merchant wallet.';

      returnReq.reverseRouting.milestones.push({
        status: 'SPF_CLAIM_APPROVED',
        location: 'AuraMarket Platform Finance Hub',
        timestamp: new Date(),
        notes: `Super Admin approved SPF Claim. ₹${payoutAmount} credited to merchant wallet.`,
        updatedBy: req.user._id,
      });

      await returnReq.save();

      await AuditLog.create({
        action: 'SPF_CLAIM_APPROVED',
        module: 'LOGISTICS',
        performedBy: req.user._id,
        userName: req.user.name || 'Super Admin',
        userEmail: req.user.email || 'admin@auramarket.com',
        userRole: 'superadmin',
        targetId: returnReq._id.toString(),
        targetType: 'ReturnRequest',
        description: `Approved SPF Claim for Return #${returnReq._id}. Paid compensation ₹${payoutAmount} to vendor wallet.`,
      });

      return res.status(200).json({
        success: true,
        message: `SPF Claim approved! ₹${payoutAmount} disbursed to vendor wallet.`,
        data: returnReq,
      });
    }

    if (decision === 'REJECTED') {
      returnReq.reverseRouting.spfClaim.claimStatus = 'REJECTED';
      returnReq.reverseRouting.spfClaim.reviewedAt = new Date();
      returnReq.reverseRouting.spfClaim.reviewedBy = req.user._id;
      returnReq.reverseRouting.spfClaim.reviewNotes =
        reviewNotes || 'Claim rejected due to insufficient damage proof or seller packaging flaw.';

      returnReq.reverseRouting.milestones.push({
        status: 'SPF_CLAIM_REJECTED',
        location: 'AuraMarket Claims Review Desk',
        timestamp: new Date(),
        notes: `Super Admin rejected SPF Claim. Reason: ${reviewNotes || 'Insufficient proof'}`,
        updatedBy: req.user._id,
      });

      await returnReq.save();

      await AuditLog.create({
        action: 'SPF_CLAIM_REJECTED',
        module: 'LOGISTICS',
        performedBy: req.user._id,
        userName: req.user.name || 'Super Admin',
        userEmail: req.user.email || 'admin@auramarket.com',
        userRole: 'superadmin',
        targetId: returnReq._id.toString(),
        targetType: 'ReturnRequest',
        description: `Rejected SPF Claim for Return #${returnReq._id}. Reason: ${reviewNotes}`,
      });

      return res.status(200).json({
        success: true,
        message: 'SPF Claim has been rejected.',
        data: returnReq,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reverse Logistics Operations Dashboard & KPIs
// @route   GET /api/admin/returns/reverse-logistics/dashboard
// @access  Private (SuperAdmin, Vendor)
exports.getReverseRoutingDashboard = async (req, res, next) => {
  try {
    const allReturns = await ReturnRequest.find()
      .populate('order', 'orderNumber totalAmount')
      .populate('vendor', 'storeName phone')
      .populate('customer', 'name email phone')
      .sort({ updatedAt: -1 });

    const totalReturns = allReturns.length;

    const inTransitStatuses = [
      'PICKED_UP_FROM_CUSTOMER',
      'INWARDED_LOCAL_HUB',
      'IN_REVERSE_TRANSIT',
      'OUT_FOR_VENDOR_DELIVERY',
    ];

    const inTransitRtos = allReturns.filter(r =>
      inTransitStatuses.includes(r.reverseRouting?.routingStatus)
    ).length;

    const restockedList = allReturns.filter(
      r => r.status === 'RESTOCKED' || r.reverseRouting?.routingStatus === 'RESTOCKED_TO_INVENTORY'
    );
    const totalRestockedCount = restockedList.length;
    const totalRestockedGmv = restockedList.reduce((sum, r) => sum + (r.refundAmount || 0), 0);

    const spfClaimsList = allReturns.filter(r => r.reverseRouting?.spfClaim?.isClaimRaised);
    const pendingSpfClaims = spfClaimsList.filter(
      r => r.reverseRouting?.spfClaim?.claimStatus === 'PENDING_REVIEW'
    ).length;
    const approvedSpfAmount = spfClaimsList
      .filter(r => r.reverseRouting?.spfClaim?.claimStatus === 'APPROVED_COMPENSATED')
      .reduce((sum, r) => sum + (r.reverseRouting?.spfClaim?.compensationAmount || 0), 0);

    // Destination Breakdown
    const destinationBreakdown = {
      RETURN_TO_VENDOR: allReturns.filter(r => r.reverseRouting?.destinationType === 'RETURN_TO_VENDOR').length,
      CENTRAL_GRADING_HUB: allReturns.filter(r => r.reverseRouting?.destinationType === 'CENTRAL_GRADING_HUB').length,
      LOCAL_DARK_STORE: allReturns.filter(r => r.reverseRouting?.destinationType === 'LOCAL_DARK_STORE').length,
      SCRAP_LIQUIDATION: allReturns.filter(r => r.reverseRouting?.destinationType === 'SCRAP_LIQUIDATION').length,
    };

    // Condition Grade Breakdown
    const conditionGradeBreakdown = {
      UNGRADED: allReturns.filter(r => !r.reverseRouting?.conditionGrade || r.reverseRouting?.conditionGrade === 'UNGRADED').length,
      GRADE_A_RESALEABLE: allReturns.filter(r => r.reverseRouting?.conditionGrade === 'GRADE_A_RESALEABLE').length,
      GRADE_B_REFURB: allReturns.filter(r => r.reverseRouting?.conditionGrade === 'GRADE_B_REFURB').length,
      GRADE_C_DAMAGED: allReturns.filter(r => r.reverseRouting?.conditionGrade === 'GRADE_C_DAMAGED').length,
      DEFECTIVE_SCRAP: allReturns.filter(r => r.reverseRouting?.conditionGrade === 'DEFECTIVE_SCRAP').length,
    };

    res.status(200).json({
      success: true,
      kpis: {
        totalReturns,
        inTransitRtos,
        totalRestockedCount,
        totalRestockedGmv,
        pendingSpfClaims,
        approvedSpfAmount,
      },
      destinationBreakdown,
      conditionGradeBreakdown,
      recentReturns: allReturns.slice(0, 15),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Reverse Logistics Routing Configuration
// @route   GET /api/admin/returns/routing-config
// @access  Private (SuperAdmin)
exports.getRoutingConfig = async (req, res, next) => {
  try {
    let shippingConfig = await ShippingConfig.findOne();
    if (!shippingConfig) {
      shippingConfig = await ShippingConfig.create({});
    }

    const defaultReverseConfig = {
      centralHubThresholdAmount: 5000,
      defaultCarrierPartner: 'AuraMarket Express Reverse',
      autoRestockGradeA: true,
      maxReverseTransitDays: 4,
      centralHubName: 'AuraMarket Central QC & Grading Hub',
      centralHubAddress: {
        recipient: 'Central Returns Intake',
        street: 'Sector 62, Industrial Area',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
      },
    };

    const config = shippingConfig.reverseLogisticsConfig || defaultReverseConfig;

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Reverse Logistics Routing Configuration
// @route   PUT /api/admin/returns/routing-config
// @access  Private (SuperAdmin)
exports.updateRoutingConfig = async (req, res, next) => {
  try {
    const {
      centralHubThresholdAmount,
      defaultCarrierPartner,
      autoRestockGradeA,
      maxReverseTransitDays,
      centralHubName,
      centralHubAddress,
    } = req.body;

    let shippingConfig = await ShippingConfig.findOne();
    if (!shippingConfig) {
      shippingConfig = await ShippingConfig.create({});
    }

    if (!shippingConfig.reverseLogisticsConfig) {
      shippingConfig.reverseLogisticsConfig = {};
    }

    if (centralHubThresholdAmount !== undefined) {
      shippingConfig.reverseLogisticsConfig.centralHubThresholdAmount = Number(centralHubThresholdAmount);
    }
    if (defaultCarrierPartner !== undefined) {
      shippingConfig.reverseLogisticsConfig.defaultCarrierPartner = defaultCarrierPartner;
    }
    if (autoRestockGradeA !== undefined) {
      shippingConfig.reverseLogisticsConfig.autoRestockGradeA = Boolean(autoRestockGradeA);
    }
    if (maxReverseTransitDays !== undefined) {
      shippingConfig.reverseLogisticsConfig.maxReverseTransitDays = Number(maxReverseTransitDays);
    }
    if (centralHubName !== undefined) {
      shippingConfig.reverseLogisticsConfig.centralHubName = centralHubName;
    }
    if (centralHubAddress !== undefined) {
      shippingConfig.reverseLogisticsConfig.centralHubAddress = centralHubAddress;
    }

    await shippingConfig.save();

    await AuditLog.create({
      action: 'UPDATE_REVERSE_LOGISTICS_CONFIG',
      module: 'LOGISTICS',
      performedBy: req.user._id,
      userName: req.user.name || 'Super Admin',
      userEmail: req.user.email || 'admin@auramarket.com',
      userRole: 'superadmin',
      targetId: shippingConfig._id.toString(),
      targetType: 'ShippingConfig',
      description: 'Updated reverse logistics routing thresholds and grading hub configurations.',
    });

    res.status(200).json({
      success: true,
      message: 'Reverse logistics routing configuration updated successfully',
      data: shippingConfig.reverseLogisticsConfig,
    });
  } catch (error) {
    next(error);
  }
};
