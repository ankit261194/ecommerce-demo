const ReturnRequest = require('../models/ReturnRequest');
const Order = require('../models/Order');
const SubOrder = require('../models/SubOrder');
const Product = require('../models/Product');
const VendorProfile = require('../models/VendorProfile');
const Ledger = require('../models/Ledger');
const DeliveryTask = require('../models/DeliveryTask');
const User = require('../models/User');
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
