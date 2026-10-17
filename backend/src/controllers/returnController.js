const ReturnRequest = require('../models/ReturnRequest');
const Order = require('../models/Order');
const SubOrder = require('../models/SubOrder');
const Product = require('../models/Product');
const VendorProfile = require('../models/VendorProfile');
const Ledger = require('../models/Ledger');
const DeliveryTask = require('../models/DeliveryTask');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const socketService = require('../services/socketService');
const smsService = require('../services/smsService');
const mailService = require('../services/mailService');

// @desc    Create a Return & Refund Request (Point #29)
// @route   POST /api/returns
// @access  Private (Customer)
exports.createReturnRequest = async (req, res, next) => {
  try {
    const {
      orderId,
      subOrderId,
      items,
      reason,
      detailedDescription,
      proofPhotos,
      refundMode,
    } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Cancellation/Return reason is required' });
    }

    const mongoose = require('mongoose');
    let order = null;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId).populate('subOrders');
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: orderId }).populate('subOrders');
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Not authorized to return this order' });
    }

    // Check delivery status
    let targetSub = null;
    if (subOrderId) {
      targetSub = order.subOrders.find(s => s._id.toString() === subOrderId.toString());
    } else if (order.subOrders && order.subOrders.length > 0) {
      targetSub = order.subOrders[0];
    }

    const isDelivered = order.status === 'DELIVERED' || targetSub?.status === 'delivered';
    if (!isDelivered) {
      return res.status(400).json({
        success: false,
        message: 'Return/Refund can only be requested on delivered orders. If your package is still in transit, please await doorstep delivery.',
      });
    }

    // Check for existing active return request
    const existing = await ReturnRequest.findOne({
      order: order._id,
      status: { $in: ['REQUESTED', 'APPROVED', 'PICKUP_SCHEDULED', 'INSPECTED', 'REFUNDED'] },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A return or refund request is already active for this order.',
        data: existing,
      });
    }

    // Determine items to return
    let returnItems = [];
    let calculatedRefundAmount = 0;

    if (Array.isArray(items) && items.length > 0) {
      returnItems = items.map(it => {
        const lineTotal = (it.price || 0) * (it.quantity || 1);
        calculatedRefundAmount += lineTotal;
        return {
          product: it.productId || it.product,
          title: it.title || it.name || 'Product',
          image: it.image || '',
          variantSku: it.variantSku || '',
          quantity: it.quantity || 1,
          price: it.price || 0,
          reason: it.reason || reason,
        };
      });
    } else if (targetSub && targetSub.items?.length > 0) {
      returnItems = targetSub.items.map(it => {
        calculatedRefundAmount += it.totalPrice || (it.price * it.quantity);
        return {
          product: it.product,
          title: it.title,
          image: it.image,
          variantSku: it.variantSku,
          quantity: it.quantity,
          price: it.price,
          reason,
        };
      });
    } else {
      returnItems = (order.items || []).map(it => {
        calculatedRefundAmount += it.totalPrice || (it.price * it.quantity);
        return {
          product: it.product,
          title: it.title,
          image: it.image,
          variantSku: it.variantSku,
          quantity: it.quantity,
          price: it.price,
          reason,
        };
      });
    }

    const vendorId = targetSub?.vendor || order.items?.[0]?.vendor;

    const returnReq = await ReturnRequest.create({
      order: order._id,
      subOrder: targetSub?._id,
      customer: req.user._id,
      vendor: vendorId,
      items: returnItems,
      reason,
      detailedDescription: detailedDescription || '',
      proofPhotos: Array.isArray(proofPhotos) ? proofPhotos : [],
      refundAmount: calculatedRefundAmount || order.totalAmount,
      refundMode: refundMode || 'ORIGINAL_PAYMENT_METHOD',
      status: 'REQUESTED',
    });

    res.status(201).json({
      success: true,
      message: 'Return request submitted successfully. Our support team and merchant have been notified.',
      data: returnReq,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Customer's Return Requests
// @route   GET /api/returns/my
// @access  Private (Customer)
exports.getMyReturns = async (req, res, next) => {
  try {
    const returns = await ReturnRequest.find({ customer: req.user._id })
      .populate('order', 'orderNumber totalAmount createdAt shippingAddress paymentMethod')
      .populate('vendor', 'storeName storeLogo phone')
      .populate('reversePickupTask')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: returns.length,
      data: returns,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Return Request by Order ID
// @route   GET /api/returns/order/:orderId
// @access  Private
exports.getReturnByOrder = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    let order = null;
    const { orderId } = req.params;

    if (mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId);
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: orderId });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const returnReq = await ReturnRequest.findOne({ order: order._id })
      .populate('vendor', 'storeName storeLogo phone')
      .populate('order', 'orderNumber totalAmount');

    res.status(200).json({
      success: true,
      data: returnReq,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Return Status (Approve / Reject / Refunded)
// @route   PUT /api/returns/:id/status
// @access  Private (Vendor or Admin)
exports.updateReturnStatus = async (req, res, next) => {
  try {
    const { status, resolutionNote } = req.body;
    const validStatuses = ['APPROVED', 'PICKUP_SCHEDULED', 'INSPECTED', 'REFUNDED', 'REJECTED'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const returnReq = await ReturnRequest.findById(req.params.id)
      .populate('order')
      .populate('items.product');

    if (!returnReq) {
      return res.status(404).json({ success: false, message: 'Return request not found' });
    }

    returnReq.status = status;
    if (resolutionNote) returnReq.resolutionNote = resolutionNote;

    // When status becomes REFUNDED, auto-restore stock into inventory!
    if (status === 'REFUNDED') {
      returnReq.resolvedAt = new Date();

      if (returnReq.items && returnReq.items.length > 0) {
        for (const item of returnReq.items) {
          const prodId = item.product?._id || item.product;
          if (item.variantSku) {
            const updated = await Product.findOneAndUpdate(
              { _id: prodId, variants: { $elemMatch: { sku: item.variantSku } } },
              { $inc: { stock: item.quantity, 'variants.$.stock': item.quantity } }
            );
            if (!updated) {
              await Product.findByIdAndUpdate(prodId, { $inc: { stock: item.quantity } });
            }
          } else {
            await Product.findByIdAndUpdate(prodId, { $inc: { stock: item.quantity } });
          }
        }
      }

      // Record Refund Ledger Entry
      const vendor = await VendorProfile.findById(returnReq.vendor);
      if (vendor) {
        await Ledger.create({
          vendor: vendor._id,
          subOrder: returnReq.subOrder,
          type: 'REFUND',
          amount: returnReq.refundAmount,
          description: `Return Approved & Refund Processed: ${returnReq.reason}`,
          balanceAfter: vendor.walletBalance,
          status: 'COMPLETED',
        });
      }
    }

    await returnReq.save();

    res.status(200).json({
      success: true,
      message: `Return request status updated to ${status}`,
      data: returnReq,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    1-Click Product Exchange Workflow (Point 5)
// @route   POST /api/returns/exchange
// @access  Private (Customer)
exports.createExchangeRequest = async (req, res, next) => {
  try {
    const {
      orderId,
      subOrderId,
      items,
      requestedSize,
      requestedColor,
      exchangeReason,
      detailedDescription,
      proofPhotos,
    } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    if (!requestedSize && !requestedColor) {
      return res.status(400).json({
        success: false,
        message: 'At least one replacement attribute (requestedSize or requestedColor) is required for exchange',
      });
    }

    const reason = exchangeReason || 'Size / color replacement needed';

    const mongoose = require('mongoose');
    let order = null;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId).populate('subOrders');
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: orderId }).populate('subOrders');
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Not authorized to request exchange for this order' });
    }

    // Check delivery status
    let targetSub = null;
    if (subOrderId) {
      targetSub = order.subOrders.find(s => s._id.toString() === subOrderId.toString());
    } else if (order.subOrders && order.subOrders.length > 0) {
      targetSub = order.subOrders[0];
    }

    const isDelivered = order.status === 'DELIVERED' || targetSub?.status === 'delivered';
    if (!isDelivered) {
      return res.status(400).json({
        success: false,
        message: 'Exchange can only be requested on delivered orders. Please wait for doorstep delivery first.',
      });
    }

    // Check for existing active return or exchange request
    const existing = await ReturnRequest.findOne({
      order: order._id,
      status: {
        $in: [
          'REQUESTED',
          'APPROVED',
          'PICKUP_SCHEDULED',
          'EXCHANGE_REQUESTED',
          'EXCHANGE_APPROVED',
          'REVERSE_PICKUP_ASSIGNED',
          'REPLACEMENT_DISPATCHED',
        ],
      },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An active return or exchange request already exists for this order.',
        data: existing,
      });
    }

    // Determine exchange items
    let exchangeItems = [];
    if (Array.isArray(items) && items.length > 0) {
      exchangeItems = items.map(it => ({
        product: it.productId || it.product,
        title: it.title || it.name || 'Product',
        image: it.image || '',
        variantSku: it.variantSku || '',
        quantity: it.quantity || 1,
        price: it.price || 0,
        reason,
      }));
    } else if (targetSub && targetSub.items?.length > 0) {
      exchangeItems = targetSub.items.map(it => ({
        product: it.product,
        title: it.title,
        image: it.image,
        variantSku: it.variantSku,
        quantity: it.quantity,
        price: it.price,
        reason,
      }));
    } else {
      exchangeItems = (order.items || []).map(it => ({
        product: it.product,
        title: it.title,
        image: it.image,
        variantSku: it.variantSku,
        quantity: it.quantity,
        price: it.price,
        reason,
      }));
    }

    const vendorId = targetSub?.vendor || order.items?.[0]?.vendor;
    const vendorProfile = await VendorProfile.findById(vendorId);

    // Generate 4-digit Reverse Pickup OTP
    const reversePickupOtp = String(Math.floor(1000 + Math.random() * 9000));

    // Assign a delivery partner for reverse pickup
    let rider = await User.findOne({ role: 'delivery', isActive: true });
    if (!rider) {
      rider = await User.findOne({ role: 'superadmin' });
    }

    // Create Reverse Pickup Delivery Task
    const reverseTask = await DeliveryTask.create({
      subOrder: targetSub?._id,
      taskType: 'REVERSE_PICKUP',
      deliveryPartner: rider._id,
      pickupLocation: {
        storeName: order.shippingAddress?.recipientName || order.shippingAddress?.fullName || req.user.name,
        phone: order.shippingAddress?.phone || req.user.phone || '9876543210',
        address: `${order.shippingAddress?.street || order.shippingAddress?.addressLine1 || 'Doorstep Pickup'}, ${order.shippingAddress?.city || ''}`,
        city: order.shippingAddress?.city || 'Delhi',
        pincode: order.shippingAddress?.pincode || '110001',
      },
      dropLocation: {
        recipientName: vendorProfile?.storeName || 'Merchant Warehouse',
        phone: vendorProfile?.phone || '9876543210',
        address: vendorProfile?.warehouseAddress?.address || 'Merchant Warehouse Hub',
        city: vendorProfile?.warehouseAddress?.city || 'Delhi',
        pincode: vendorProfile?.warehouseAddress?.pincode || '110001',
      },
      reversePickupDetails: {
        pickupOtp: reversePickupOtp,
        requestedSize: requestedSize || '',
        requestedColor: requestedColor || '',
        itemTitle: exchangeItems[0]?.title || 'Exchanged Item',
        customerNotes: detailedDescription || '',
      },
      status: 'ASSIGNED',
      deliveryInstructions: `REVERSE PICKUP: Verify customer OTP ${reversePickupOtp} before taking custody of parcel for exchange.`,
    });

    const returnReq = await ReturnRequest.create({
      order: order._id,
      subOrder: targetSub?._id,
      customer: req.user._id,
      vendor: vendorId,
      items: exchangeItems,
      requestType: 'EXCHANGE',
      exchangeDetails: {
        requestedSize: requestedSize || '',
        requestedColor: requestedColor || '',
        exchangeReason: reason,
        customerNote: detailedDescription || '',
      },
      reversePickupTask: reverseTask._id,
      reversePickupOtp,
      reversePickupStatus: 'SCHEDULED',
      reason,
      detailedDescription: detailedDescription || '',
      proofPhotos: Array.isArray(proofPhotos) ? proofPhotos : [],
      refundAmount: 0,
      refundMode: 'ORIGINAL_PAYMENT_METHOD',
      status: 'EXCHANGE_REQUESTED',
    });

    reverseTask.returnRequest = returnReq._id;
    await reverseTask.save();

    // Trigger SMS notification with secret Reverse Pickup OTP
    const custPhone = order.shippingAddress?.phone || req.user.phone;
    if (custPhone) {
      await smsService.sendSMS(
        custPhone,
        `AuraMarket Exchange Confirmed! Reverse pickup for Order #${order.orderNumber} is scheduled. Your 4-digit Doorstep Pickup OTP is ${reversePickupOtp}.`
      );
    }

    res.status(201).json({
      success: true,
      message: '1-Click Product Exchange initiated! Doorstep reverse pickup has been scheduled.',
      data: returnReq,
      reversePickupTask: reverseTask,
      reversePickupOtp,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Reverse Pickup Status (Rider Doorstep Verification)
// @route   PUT /api/returns/:id/reverse-pickup
// @access  Private (Rider, Vendor, SuperAdmin)
exports.updateReversePickupStatus = async (req, res, next) => {
  try {
    const { status, otp, notes } = req.body;
    const returnReq = await ReturnRequest.findById(req.params.id)
      .populate('order')
      .populate('reversePickupTask');

    if (!returnReq) {
      return res.status(404).json({ success: false, message: 'Exchange request not found' });
    }

    if (status === 'PICKED_UP') {
      if (!otp || String(otp).trim() !== String(returnReq.reversePickupOtp).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reverse pickup verification OTP. Please ask the customer for the 4-digit code.',
        });
      }
      returnReq.reversePickupStatus = 'PICKED_UP';
      returnReq.status = 'REVERSE_PICKUP_COMPLETED';
      returnReq.resolvedAt = new Date();

      if (returnReq.reversePickupTask) {
        await DeliveryTask.findByIdAndUpdate(returnReq.reversePickupTask._id || returnReq.reversePickupTask, {
          status: 'DELIVERED',
          otpVerified: true,
          deliveredAt: new Date(),
        });
      }
    } else {
      returnReq.reversePickupStatus = status;
      if (status === 'COMPLETED') {
        returnReq.status = 'EXCHANGE_COMPLETED';
      }
    }

    if (notes) {
      returnReq.resolutionNote = notes;
    }

    await returnReq.save();

    res.status(200).json({
      success: true,
      message: `Reverse pickup status updated to ${status}`,
      data: returnReq,
    });
  } catch (error) {
    next(error);
  }
};

// ==============================================================================
// PILLAR 1 - POINT 18: AUTOMATED RETURN & REPLACEMENT FLOW WITH UNBOXING VIDEO
// ==============================================================================

// @desc    Get Standard Return & Replacement Reasons, Policies & SLA Settings
// @route   GET /api/returns/reasons
// @access  Public / Private
exports.getReturnReasons = async (req, res, next) => {
  try {
    const reasons = [
      {
        code: 'DAMAGED_IN_TRANSIT',
        label: 'Damaged in Transit / Crushed Packaging',
        description: 'Outer box damaged, product crushed or smashed during shipment.',
        unboxingVideoRecommended: true,
        photoRequired: true,
      },
      {
        code: 'DEFECTIVE_PRODUCT',
        label: 'Defective Product / Not Working',
        description: 'Product does not power on, has manufacturing flaws, or malfunction.',
        unboxingVideoRecommended: true,
        photoRequired: true,
      },
      {
        code: 'WRONG_ITEM_DELIVERED',
        label: 'Wrong Item or Color Delivered',
        description: 'Delivered item differs from what was ordered on invoice.',
        unboxingVideoRecommended: true,
        photoRequired: true,
      },
      {
        code: 'MISSING_ACCESSORIES',
        label: 'Missing Accessories / Parts',
        description: 'Box contents missing charger, cable, documentation or accessories.',
        unboxingVideoRecommended: true,
        photoRequired: true,
      },
      {
        code: 'SIZE_FIT_MISMATCH',
        label: 'Size / Fit Mismatch',
        description: 'Apparel or footwear is too small or too large; variant exchange required.',
        unboxingVideoRecommended: false,
        photoRequired: true,
      },
      {
        code: 'QUALITY_NOT_AS_EXPECTED',
        label: 'Quality Not as Expected',
        description: 'Product material or finish differs significantly from photos.',
        unboxingVideoRecommended: false,
        photoRequired: true,
      },
      {
        code: 'PACKAGE_TAMPERED',
        label: 'Security Seal Broken / Tampered',
        description: 'Package delivered with open tape, torn security seal, or suspected pilferage.',
        unboxingVideoRecommended: true,
        photoRequired: true,
      },
      {
        code: 'OTHER',
        label: 'Other Genuine Reason',
        description: 'Please explain details in the notes section.',
        unboxingVideoRecommended: false,
        photoRequired: false,
      },
    ];

    const timeSlots = ['09:00 - 13:00', '13:00 - 17:00', '17:00 - 20:00', 'ANYTIME'];

    res.status(200).json({
      success: true,
      reasons,
      timeSlots,
      policies: {
        vendorInspectionSlaHours: 48,
        platformAutoApprovalGuarantee: true,
        doorstepReversePickupOtpEnabled: true,
        instantReplacementOrderEnabled: true,
        walletInstantRefundEnabled: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Automated Return / Replacement Request with Unboxing Video & Photos
// @route   POST /api/returns/automated
// @access  Private (Customer)
exports.createAutomatedReturnReplacement = async (req, res, next) => {
  try {
    const {
      orderId,
      subOrderId,
      items,
      reasonCode,
      detailedDescription,
      unboxingVideo,
      proofPhotos,
      resolutionType,
      replacementDetails,
      pickupSchedule,
    } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    const mongoose = require('mongoose');
    let order = null;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId).populate('subOrders');
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: orderId }).populate('subOrders');
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Customer or admin authorization
    if (order.customer.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Not authorized for this order' });
    }

    // Delivery check
    const isDelivered =
      order.status === 'DELIVERED' ||
      order.subOrders?.some(s => s.status === 'delivered') ||
      req.user.role === 'superadmin';

    if (!isDelivered) {
      return res.status(400).json({
        success: false,
        message: 'Return or replacement can only be requested on delivered orders. If in transit, await delivery.',
      });
    }

    // Check for existing active return or replacement request
    const existing = await ReturnRequest.findOne({
      order: order._id,
      status: {
        $in: [
          'REQUESTED',
          'INSPECTION_PENDING',
          'APPROVED',
          'AUTO_APPROVED',
          'PICKUP_SCHEDULED',
          'EXCHANGE_REQUESTED',
          'EXCHANGE_APPROVED',
          'REVERSE_PICKUP_ASSIGNED',
          'REPLACEMENT_CREATED',
          'REPLACEMENT_DISPATCHED',
        ],
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An active return or replacement request already exists for this order.',
        data: existing,
      });
    }

    // Determine suborder & vendor
    let targetSub = null;
    if (subOrderId) {
      targetSub = order.subOrders.find(s => s._id.toString() === subOrderId.toString());
    } else if (order.subOrders && order.subOrders.length > 0) {
      targetSub = order.subOrders[0];
    }

    const vendorId = targetSub?.vendor || order.items?.[0]?.vendor;
    const vendorProfile = await VendorProfile.findById(vendorId);

    // Process items
    let processedItems = [];
    let calculatedRefundAmount = 0;

    if (Array.isArray(items) && items.length > 0) {
      processedItems = items.map(it => {
        const lineTotal = (it.price || 0) * (it.quantity || 1);
        calculatedRefundAmount += lineTotal;
        return {
          product: it.productId || it.product,
          title: it.title || it.name || 'Product Item',
          image: it.image || '',
          variantSku: it.variantSku || '',
          quantity: it.quantity || 1,
          price: it.price || 0,
          reason: detailedDescription || reasonCode || 'Return/Replacement',
        };
      });
    } else if (targetSub && targetSub.items?.length > 0) {
      processedItems = targetSub.items.map(it => {
        calculatedRefundAmount += it.totalPrice || it.price * it.quantity;
        return {
          product: it.product,
          title: it.title,
          image: it.image,
          variantSku: it.variantSku,
          quantity: it.quantity,
          price: it.price,
          reason: detailedDescription || reasonCode || 'Return/Replacement',
        };
      });
    } else {
      processedItems = (order.items || []).map(it => {
        calculatedRefundAmount += it.totalPrice || it.price * it.quantity;
        return {
          product: it.product,
          title: it.title,
          image: it.image,
          variantSku: it.variantSku,
          quantity: it.quantity,
          price: it.price,
          reason: detailedDescription || reasonCode || 'Return/Replacement',
        };
      });
    }

    // Process Unboxing Video
    let videoData = {
      url: '',
      fileName: '',
      durationSeconds: 0,
      fileSize: 0,
      verified: false,
    };

    if (unboxingVideo) {
      if (typeof unboxingVideo === 'string') {
        videoData.url = unboxingVideo;
        videoData.fileName = 'unboxing-video.mp4';
        videoData.durationSeconds = 45;
        videoData.verified = Boolean(unboxingVideo.trim());
      } else if (typeof unboxingVideo === 'object') {
        videoData.url = unboxingVideo.url || '';
        videoData.fileName = unboxingVideo.fileName || 'unboxing-video.mp4';
        videoData.durationSeconds = Number(unboxingVideo.durationSeconds) || 45;
        videoData.fileSize = Number(unboxingVideo.fileSize) || 12500000;
        videoData.verified = Boolean(videoData.url);
      }
    }

    // 48-Hour Vendor Inspection SLA Deadline
    const slaDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // 4-Digit Reverse Pickup OTP
    const reversePickupOtp = String(Math.floor(1000 + Math.random() * 9000));

    // Assign Rider for Reverse Pickup
    let rider = await User.findOne({ role: 'delivery', isActive: true });
    if (!rider) {
      rider = await User.findOne({ role: 'superadmin' });
    }

    const resolvedResolutionType = ['REPLACEMENT', 'REFUND_WALLET', 'REFUND_SOURCE'].includes(resolutionType)
      ? resolutionType
      : 'REPLACEMENT';

    // Create Reverse Pickup Task
    const reverseTask = await DeliveryTask.create({
      subOrder: targetSub?._id,
      taskType: 'REVERSE_PICKUP',
      deliveryPartner: rider?._id,
      pickupLocation: {
        storeName: order.shippingAddress?.recipientName || order.shippingAddress?.fullName || req.user.name,
        phone: order.shippingAddress?.phone || req.user.phone || '9876543210',
        address: `${order.shippingAddress?.street || order.shippingAddress?.addressLine1 || 'Doorstep Pickup'}, ${order.shippingAddress?.city || ''}`,
        city: order.shippingAddress?.city || 'Delhi',
        pincode: order.shippingAddress?.pincode || '110001',
      },
      dropLocation: {
        recipientName: vendorProfile?.storeName || 'Merchant Return Hub',
        phone: vendorProfile?.phone || '9876543210',
        address: vendorProfile?.warehouseAddress?.address || 'Merchant Warehouse Hub',
        city: vendorProfile?.warehouseAddress?.city || 'Delhi',
        pincode: vendorProfile?.warehouseAddress?.pincode || '110001',
      },
      reversePickupDetails: {
        pickupOtp: reversePickupOtp,
        requestedSize: replacementDetails?.requestedSize || '',
        requestedColor: replacementDetails?.requestedColor || '',
        itemTitle: processedItems[0]?.title || 'Returned Item',
        customerNotes: detailedDescription || '',
      },
      status: 'ASSIGNED',
      deliveryInstructions: `DOORSTEP REVERSE PICKUP: Verify customer OTP ${reversePickupOtp} before collecting return parcel. Inspect unboxing condition.`,
    });

    const returnReq = await ReturnRequest.create({
      order: order._id,
      subOrder: targetSub?._id,
      customer: req.user._id,
      vendor: vendorId,
      items: processedItems,
      requestType: resolvedResolutionType === 'REPLACEMENT' ? 'REPLACEMENT' : 'RETURN_REFUND',
      reasonCode: reasonCode || 'DAMAGED_IN_TRANSIT',
      reason: detailedDescription || reasonCode || 'Automated Return/Replacement Request',
      detailedDescription: detailedDescription || '',
      unboxingVideo: videoData,
      proofPhotos: Array.isArray(proofPhotos) ? proofPhotos : [],
      resolutionType: resolvedResolutionType,
      exchangeDetails: {
        requestedSize: replacementDetails?.requestedSize || '',
        requestedColor: replacementDetails?.requestedColor || '',
        replacementVariantSku: replacementDetails?.replacementVariantSku || '',
        exchangeReason: detailedDescription || reasonCode || 'Replacement requested',
        customerNote: replacementDetails?.customerNote || '',
      },
      pickupSchedule: {
        scheduledDate: pickupSchedule?.scheduledDate ? new Date(pickupSchedule.scheduledDate) : new Date(Date.now() + 24 * 3600 * 1000),
        timeSlot: pickupSchedule?.timeSlot || '09:00 - 13:00',
        pickupAddress: {
          street: pickupSchedule?.pickupAddress?.street || order.shippingAddress?.street || '',
          city: pickupSchedule?.pickupAddress?.city || order.shippingAddress?.city || 'Delhi',
          state: pickupSchedule?.pickupAddress?.state || order.shippingAddress?.state || 'Delhi',
          pincode: pickupSchedule?.pickupAddress?.pincode || order.shippingAddress?.pincode || '110001',
          landmark: pickupSchedule?.pickupAddress?.landmark || order.shippingAddress?.landmark || '',
          phone: pickupSchedule?.pickupAddress?.phone || order.shippingAddress?.phone || req.user.phone || '',
        },
      },
      inspectionSLA: {
        deadline: slaDeadline,
        status: 'PENDING_INSPECTION',
        isAutoApproved: false,
        autoApprovalReason: '',
        inspectionNotes: '',
      },
      reversePickupTask: reverseTask._id,
      reversePickupOtp,
      reversePickupStatus: 'SCHEDULED',
      refundAmount: calculatedRefundAmount || order.totalAmount,
      refundMode: resolvedResolutionType === 'REFUND_WALLET' ? 'WALLET_COINS' : 'ORIGINAL_PAYMENT_METHOD',
      status: 'INSPECTION_PENDING',
    });

    reverseTask.returnRequest = returnReq._id;
    await reverseTask.save();

    // Trigger SMS and Email Notifications
    const custPhone = order.shippingAddress?.phone || req.user.phone;
    if (custPhone) {
      await smsService.sendSMS(
        custPhone,
        `AuraMarket Return/Replacement Request Confirmed! Order #${order.orderNumber}. 4-digit Reverse Pickup OTP is ${reversePickupOtp}. Vendor 48h Inspection SLA active.`
      );
    }

    if (req.user.email) {
      await mailService.sendMail({
        to: req.user.email,
        subject: `Return & Replacement Initiated - #${order.orderNumber}`,
        text: `We have received your return/replacement request. Your 48-Hour Inspection SLA is active until ${slaDeadline.toLocaleString()}. Pickup OTP is ${reversePickupOtp}.`,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Automated return & replacement request initiated successfully with 48-Hour Inspection SLA!',
      data: returnReq,
      reversePickupOtp,
      inspectionSlaDeadline: slaDeadline,
      reversePickupTask: reverseTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Vendor or Admin Inspection of Unboxing Video/Photos & Automated Replacement Generation
// @route   POST /api/returns/:id/inspect
// @access  Private (Vendor, Admin, or Demo Simulation)
exports.inspectReturnRequest = async (req, res, next) => {
  try {
    const { action, inspectionNotes, forceReplacement } = req.body;
    const returnReq = await ReturnRequest.findById(req.params.id)
      .populate('order')
      .populate('items.product')
      .populate('customer');

    if (!returnReq) {
      return res.status(404).json({ success: false, message: 'Return request not found' });
    }

    const isPending =
      returnReq.inspectionSLA?.status === 'PENDING_INSPECTION' ||
      returnReq.status === 'INSPECTION_PENDING' ||
      returnReq.status === 'REQUESTED';

    if (!isPending) {
      return res.status(400).json({
        success: false,
        message: `Return request has already been inspected or resolved (current status: ${returnReq.status})`,
        data: returnReq,
      });
    }

    const decision = action ? action.toUpperCase() : 'APPROVE';

    if (decision === 'REJECT') {
      returnReq.status = 'REJECTED';
      returnReq.inspectionSLA.status = 'REJECTED';
      returnReq.inspectionSLA.vendorInspectedAt = new Date();
      returnReq.inspectionSLA.inspectionNotes = inspectionNotes || 'Vendor rejected after unboxing evidence inspection.';
      returnReq.inspectionSLA.inspectedBy = req.user._id;
      returnReq.resolvedAt = new Date();

      if (returnReq.reversePickupTask) {
        await DeliveryTask.findByIdAndUpdate(
          returnReq.reversePickupTask._id || returnReq.reversePickupTask,
          { status: 'CANCELLED', cancellationReason: 'Return request rejected after inspection' }
        );
      }

      await returnReq.save();

      return res.status(200).json({
        success: true,
        message: 'Return request has been rejected based on unboxing inspection.',
        data: returnReq,
      });
    }

    // APPROVAL WORKFLOW
    returnReq.inspectionSLA.status = 'APPROVED';
    returnReq.inspectionSLA.vendorInspectedAt = new Date();
    returnReq.inspectionSLA.inspectionNotes = inspectionNotes || 'Unboxing video & photo evidence verified. Claim approved.';
    returnReq.inspectionSLA.inspectedBy = req.user._id;

    const originalOrder = returnReq.order;
    const isReplacement = returnReq.resolutionType === 'REPLACEMENT' || forceReplacement;

    if (isReplacement) {
      // 1. Create Real Replacement Order in Order.js
      const replacementOrderNumber = 'ORD-REP-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900);
      const deliveryOtp = String(Math.floor(1000 + Math.random() * 9000));

      const replacementItems = returnReq.items.map(it => ({
        product: it.product?._id || it.product || originalOrder?.items?.[0]?.product,
        vendor: returnReq.vendor?._id || returnReq.vendor || originalOrder?.items?.[0]?.vendor,
        title: `${it.title || 'Product'} (Replacement)`,
        image: it.image || '',
        variantSku: returnReq.exchangeDetails?.replacementVariantSku || it.variantSku || 'REP-SKU-01',
        quantity: it.quantity || 1,
        price: 0,
        totalPrice: 0,
      }));

      const repOrder = await Order.create({
        orderNumber: replacementOrderNumber,
        customer: returnReq.customer?._id || returnReq.customer,
        isReplacementOrder: true,
        originalOrder: originalOrder?._id,
        returnRequest: returnReq._id,
        items: replacementItems,
        subtotal: 0,
        totalAmount: 0,
        shippingFee: 0,
        totalCommission: 0,
        shippingAddress: originalOrder?.shippingAddress || {
          recipientName: 'Valued Customer',
          phone: '9876543210',
          street: 'Verified Customer Address',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
        },
        paymentMethod: 'REPLACEMENT_FREE',
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        deliveryOtp,
      });

      // 2. Create SubOrder for Vendor
      const repSubOrder = await SubOrder.create({
        parentOrder: repOrder._id,
        vendor: returnReq.vendor,
        customer: returnReq.customer?._id || returnReq.customer,
        items: replacementItems,
        subTotal: 0,
        totalAmount: 0,
        platformCommissionRate: 10,
        platformCommissionAmount: 0,
        vendorEarning: 0,
        status: 'confirmed',
      });

      repOrder.subOrders = [repSubOrder._id];
      await repOrder.save();

      // 3. Create Forward Delivery Task for Replacement Order
      let rider = await User.findOne({ role: 'delivery', isActive: true });
      if (!rider) rider = await User.findOne({ role: 'superadmin' });

      const repDeliveryTask = await DeliveryTask.create({
        subOrder: repSubOrder._id,
        taskType: 'FORWARD_DELIVERY',
        deliveryPartner: rider?._id,
        pickupLocation: {
          storeName: 'Merchant Fulfillment Hub',
          phone: '9876543210',
          address: 'Merchant Warehouse Hub',
          city: 'Delhi',
          pincode: '110001',
        },
        dropLocation: {
          recipientName: repOrder.shippingAddress?.recipientName || 'Customer',
          phone: repOrder.shippingAddress?.phone || '9876543210',
          address: `${repOrder.shippingAddress?.street || ''}, ${repOrder.shippingAddress?.city || ''}`,
          city: repOrder.shippingAddress?.city || 'Delhi',
          pincode: repOrder.shippingAddress?.pincode || '110001',
        },
        status: 'ASSIGNED',
        deliveryInstructions: `REPLACEMENT ORDER: Dispatch replacement package ${replacementOrderNumber}. Secret Handover OTP: ${repOrder.deliveryOtp}`,
      });

      repSubOrder.deliveryTask = repDeliveryTask._id;
      await repSubOrder.save();

      returnReq.replacementOrder = repOrder._id;
      returnReq.replacementOrderNumber = repOrder.orderNumber;
      returnReq.status = 'REPLACEMENT_CREATED';
      returnReq.resolvedAt = new Date();

      await returnReq.save();

      return res.status(200).json({
        success: true,
        message: 'Unboxing inspection approved! Automated replacement order has been generated and queued for dispatch.',
        data: returnReq,
        replacementOrder: repOrder,
        replacementDeliveryTask: repDeliveryTask,
      });
    } else if (returnReq.resolutionType === 'REFUND_WALLET') {
      // Wallet Refund
      const refundAmt = returnReq.refundAmount || originalOrder?.totalAmount || 0;
      const customerId = returnReq.customer?._id || returnReq.customer;

      await User.findByIdAndUpdate(customerId, {
        $inc: { walletBalance: refundAmt },
      });

      const updatedCust = await User.findById(customerId);

      await WalletTransaction.create({
        user: customerId,
        title: `Instant Wallet Refund - Return #${returnReq._id}`,
        type: 'CREDIT',
        currency: 'INR',
        amount: refundAmt,
        category: 'RETURN_REFUND',
        paymentMethod: 'WALLET',
        description: `Instant Wallet Refund for Return #${returnReq._id} (${returnReq.reasonCode})`,
        status: 'SUCCESS',
      });

      returnReq.status = 'REFUNDED';
      returnReq.resolvedAt = new Date();
      await returnReq.save();

      return res.status(200).json({
        success: true,
        message: `Unboxing inspection approved! ₹${refundAmt} refunded instantly to customer wallet.`,
        data: returnReq,
        walletBalance: updatedCust?.walletBalance,
      });
    } else {
      // Source Refund
      returnReq.status = 'REFUNDED';
      returnReq.resolvedAt = new Date();
      await returnReq.save();

      return res.status(200).json({
        success: true,
        message: 'Unboxing inspection approved! Refund routed to original payment gateway.',
        data: returnReq,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    SLA Watchdog: Auto-Approve Requests where Vendor 48h Inspection SLA Expired
// @route   POST /api/returns/:id/sla-auto-approve
// @access  Public / Private (Watchdog or Simulation)
exports.autoResolveExpiredSLA = async (req, res, next) => {
  try {
    const returnReq = await ReturnRequest.findById(req.params.id)
      .populate('order')
      .populate('items.product')
      .populate('customer');

    if (!returnReq) {
      return res.status(404).json({ success: false, message: 'Return request not found' });
    }

    const isPending = returnReq.inspectionSLA?.status === 'PENDING_INSPECTION' || returnReq.status === 'INSPECTION_PENDING';
    if (!isPending) {
      return res.status(400).json({
        success: false,
        message: `Request is not pending inspection (current status: ${returnReq.status})`,
        data: returnReq,
      });
    }

    // Check if SLA expired or simulation forced
    const now = new Date();
    const isExpired = returnReq.inspectionSLA?.deadline && returnReq.inspectionSLA.deadline <= now;
    const isForced = req.body?.force === true || req.query?.force === 'true';

    if (!isExpired && !isForced) {
      return res.status(400).json({
        success: false,
        message: 'Inspection SLA has not expired yet. 48-Hour vendor window is still active.',
        deadline: returnReq.inspectionSLA?.deadline,
      });
    }

    // Apply Platform Auto-Approval
    returnReq.inspectionSLA.isAutoApproved = true;
    returnReq.inspectionSLA.autoApprovalReason = 'Vendor 48-Hour Inspection SLA Expired - Platform 100% Auto-Approval Guarantee';
    returnReq.inspectionSLA.status = 'AUTO_APPROVED';
    returnReq.inspectionSLA.vendorInspectedAt = new Date();

    if (returnReq.resolutionType === 'REPLACEMENT') {
      const replacementOrderNumber = 'ORD-REP-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900);
      const repOrder = await Order.create({
        orderNumber: replacementOrderNumber,
        customer: returnReq.customer?._id || returnReq.customer,
        isReplacementOrder: true,
        originalOrder: returnReq.order?._id,
        returnRequest: returnReq._id,
        items: returnReq.items.map(it => ({
          product: it.product?._id || it.product || returnReq.order?.items?.[0]?.product,
          vendor: returnReq.vendor?._id || returnReq.vendor || returnReq.order?.items?.[0]?.vendor,
          title: `${it.title || 'Product'} (Auto-Replacement)`,
          image: it.image || '',
          variantSku: it.variantSku || 'REP-AUTO-01',
          quantity: it.quantity || 1,
          price: 0,
          totalPrice: 0,
        })),
        totalAmount: 0,
        subtotal: 0,
        shippingFee: 0,
        totalCommission: 0,
        shippingAddress: returnReq.order?.shippingAddress,
        paymentMethod: 'REPLACEMENT_FREE',
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        deliveryOtp: '4821',
      });

      // Create SubOrder for Vendor
      const repSubOrder = await SubOrder.create({
        parentOrder: repOrder._id,
        vendor: returnReq.vendor,
        customer: returnReq.customer?._id || returnReq.customer,
        items: repOrder.items,
        subTotal: 0,
        totalAmount: 0,
        platformCommissionRate: 10,
        platformCommissionAmount: 0,
        vendorEarning: 0,
        status: 'confirmed',
      });

      // 3. Create Forward Delivery Task for Auto-Replacement Order
      let rider = await User.findOne({ role: 'delivery', isActive: true });
      if (!rider) rider = await User.findOne({ role: 'superadmin' });

      const repDeliveryTask = await DeliveryTask.create({
        subOrder: repSubOrder._id,
        taskType: 'FORWARD_DELIVERY',
        deliveryPartner: rider?._id,
        pickupLocation: {
          storeName: 'Merchant Fulfillment Hub',
          phone: '9876543210',
          address: 'Merchant Warehouse Hub',
          city: 'Delhi',
          pincode: '110001',
        },
        dropLocation: {
          recipientName: repOrder.shippingAddress?.recipientName || 'Customer',
          phone: repOrder.shippingAddress?.phone || '9876543210',
          address: `${repOrder.shippingAddress?.street || ''}, ${repOrder.shippingAddress?.city || ''}`,
          city: repOrder.shippingAddress?.city || 'Delhi',
          pincode: repOrder.shippingAddress?.pincode || '110001',
        },
        status: 'ASSIGNED',
        deliveryInstructions: `SLA AUTO-REPLACEMENT ORDER: Dispatch replacement package ${replacementOrderNumber}. Secret Handover OTP: ${repOrder.deliveryOtp}`,
      });

      repSubOrder.deliveryTask = repDeliveryTask._id;
      await repSubOrder.save();

      returnReq.replacementOrder = repOrder._id;
      returnReq.replacementOrderNumber = repOrder.orderNumber;
      returnReq.status = 'AUTO_APPROVED';
      returnReq.resolvedAt = new Date();
      await returnReq.save();

      return res.status(200).json({
        success: true,
        message: 'SLA Expired! Request has been 100% AUTO-APPROVED and replacement order generated.',
        data: returnReq,
        replacementOrder: repOrder,
        replacementDeliveryTask: repDeliveryTask,
      });
    } else {
      // Refund to wallet
      const refundAmt = returnReq.refundAmount || returnReq.order?.totalAmount || 0;
      const customerId = returnReq.customer?._id || returnReq.customer;

      await User.findByIdAndUpdate(customerId, {
        $inc: { walletBalance: refundAmt },
      });

      await WalletTransaction.create({
        user: customerId,
        title: `SLA Auto-Approval Refund - Return #${returnReq._id}`,
        type: 'CREDIT',
        currency: 'INR',
        amount: refundAmt,
        category: 'RETURN_REFUND',
        paymentMethod: 'WALLET',
        description: `SLA Auto-Approval: Refund credited for Return #${returnReq._id}`,
        status: 'SUCCESS',
      });

      returnReq.status = 'AUTO_APPROVED';
      returnReq.resolvedAt = new Date();
      await returnReq.save();

      return res.status(200).json({
        success: true,
        message: `SLA Expired! Request 100% AUTO-APPROVED. ₹${refundAmt} credited to wallet.`,
        data: returnReq,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get Return / Replacement Inspection & Unboxing Video Telemetry
// @route   GET /api/returns/:id/inspection-status
// @access  Private
exports.getInspectionStatus = async (req, res, next) => {
  try {
    const returnReq = await ReturnRequest.findById(req.params.id)
      .populate('order', 'orderNumber totalAmount shippingAddress status')
      .populate('replacementOrder', 'orderNumber status items deliveryOtp')
      .populate('reversePickupTask')
      .populate('vendor', 'storeName phone');

    if (!returnReq) {
      return res.status(404).json({ success: false, message: 'Return request not found' });
    }

    const now = new Date();
    const deadline = returnReq.inspectionSLA?.deadline ? new Date(returnReq.inspectionSLA.deadline) : null;
    const remainingMs = deadline ? Math.max(0, deadline.getTime() - now.getTime()) : 0;
    const isSlaExpired = remainingMs === 0 && returnReq.inspectionSLA?.status === 'PENDING_INSPECTION';

    res.status(200).json({
      success: true,
      data: {
        returnRequestId: returnReq._id,
        status: returnReq.status,
        resolutionType: returnReq.resolutionType,
        reasonCode: returnReq.reasonCode,
        unboxingVideo: returnReq.unboxingVideo,
        proofPhotosCount: returnReq.proofPhotos?.length || 0,
        proofPhotos: returnReq.proofPhotos,
        reversePickupOtp: returnReq.reversePickupOtp,
        reversePickupStatus: returnReq.reversePickupStatus,
        inspectionSLA: {
          ...returnReq.inspectionSLA?.toObject(),
          remainingHours: Math.round((remainingMs / (1000 * 60 * 60)) * 10) / 10,
          isSlaExpired,
        },
        replacementOrder: returnReq.replacementOrder,
      },
    });
  } catch (error) {
    next(error);
  }
};
