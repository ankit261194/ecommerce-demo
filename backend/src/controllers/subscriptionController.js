const Subscription = require('../models/Subscription');
const Product = require('../models/Product');
const User = require('../models/User');

const FREQUENCY_DAYS_MAP = {
  DAILY: 1,
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 30,
};

// @desc    Point 13: Create Recurring Auto-Order Subscription
// @route   POST /api/subscriptions
// @access  Private (Customer)
exports.createSubscription = async (req, res, next) => {
  try {
    const {
      productId,
      variantSku,
      quantity = 1,
      frequency = 'MONTHLY',
      deliveryTimeSlot = 'MORNING_6_8',
      paymentMethod = 'WALLET_AUTO_DEBIT',
      shippingAddress,
      startDate,
    } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required for subscription' });
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const product = await Product.findById(productId).populate('vendor');
    if (!product || !product.isPublished) {
      return res.status(404).json({ success: false, message: 'Product not found or currently unavailable' });
    }

    let unitPrice = product.sellingPrice;
    let variantName = 'Standard';

    if (product.hasVariants && product.variants?.length > 0) {
      const match = variantSku
        ? product.variants.find((v) => v.sku === variantSku)
        : product.variants[0];
      if (match) {
        unitPrice = product.sellingPrice + (match.additionalPrice || 0);
        variantName = match.name;
      }
    }

    const upperFreq = (frequency || 'MONTHLY').toUpperCase();
    const frequencyDays = FREQUENCY_DAYS_MAP[upperFreq] || 30;

    // Recurring discount: 10% standard Subscribe & Save discount
    const discountPercentage = 10;
    const discountedUnitPrice = Math.max(1, Math.round(unitPrice * (1 - discountPercentage / 100)));
    const cycleTotal = discountedUnitPrice * qty;

    // Next delivery date calculation
    const baseDate = startDate ? new Date(startDate) : new Date();
    const nextDeliveryDate = new Date(baseDate.getTime() + frequencyDays * 24 * 60 * 60 * 1000);

    // Resolve shipping address
    let resolvedAddress = shippingAddress;
    if (!resolvedAddress || !resolvedAddress.street) {
      const userDoc = await User.findById(req.user._id);
      const defaultAddr = userDoc?.addressBook?.find((a) => a.isDefault) || userDoc?.addressBook?.[0];
      if (defaultAddr) {
        resolvedAddress = {
          recipientName: defaultAddr.recipientName || userDoc.name,
          phone: defaultAddr.phone || userDoc.phone || '9876543210',
          street: defaultAddr.street,
          city: defaultAddr.city,
          state: defaultAddr.state,
          pincode: defaultAddr.pincode,
          landmark: defaultAddr.landmark || '',
          coordinates: defaultAddr.coordinates,
        };
      } else {
        resolvedAddress = {
          recipientName: req.user.name || 'Shopper',
          phone: req.user.phone || '9876543210',
          street: '123 Market Street',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
        };
      }
    }

    const subscription = await Subscription.create({
      customer: req.user._id,
      product: product._id,
      vendor: product.vendor?._id || product.vendor || null,
      variantSku: variantSku || null,
      variantName,
      quantity: qty,
      frequency: upperFreq,
      frequencyDays,
      discountPercentage,
      unitPrice,
      discountedUnitPrice,
      cycleTotal,
      deliveryTimeSlot,
      shippingAddress: resolvedAddress,
      paymentMethod,
      status: 'ACTIVE',
      startDate: new Date(),
      nextDeliveryDate,
    });

    res.status(201).json({
      success: true,
      message: `Subscribed successfully! You save ${discountPercentage}% (₹${unitPrice - discountedUnitPrice} off per unit) with recurring auto-delivery.`,
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Subscriptions of Current Customer
// @route   GET /api/subscriptions/my
// @access  Private (Customer)
exports.getMySubscriptions = async (req, res, next) => {
  try {
    const query = { customer: req.user._id };
    if (req.query.status && ['ACTIVE', 'PAUSED', 'CANCELLED'].includes(req.query.status.toUpperCase())) {
      query.status = req.query.status.toUpperCase();
    }

    const subscriptions = await Subscription.find(query)
      .populate('product', 'title images thumbnail sellingPrice slug')
      .populate('vendor', 'storeName phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: subscriptions.length,
      data: subscriptions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Subscription Details by ID
// @route   GET /api/subscriptions/:id
// @access  Private (Owner / Admin)
exports.getSubscriptionById = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate('product', 'title images thumbnail sellingPrice slug brand')
      .populate('vendor', 'storeName phone');

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (
      String(subscription.customer) !== String(req.user._id) &&
      !['admin', 'superadmin'].includes(req.user.role)
    ) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to subscription' });
    }

    res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Pause Recurring Subscription
// @route   POST /api/subscriptions/:id/pause
// @access  Private (Owner)
exports.pauseSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (String(subscription.customer) !== String(req.user._id) && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (subscription.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot pause a cancelled subscription' });
    }

    subscription.status = 'PAUSED';
    subscription.pausedAt = new Date();
    subscription.pauseReason = req.body.reason || 'Paused by customer';
    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription paused. No upcoming recurring orders will be created until resumed.',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resume Recurring Subscription
// @route   POST /api/subscriptions/:id/resume
// @access  Private (Owner)
exports.resumeSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (String(subscription.customer) !== String(req.user._id) && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (subscription.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot resume a cancelled subscription' });
    }

    subscription.status = 'ACTIVE';
    subscription.pausedAt = null;
    subscription.pauseReason = null;

    // If next delivery date has elapsed while paused, advance it from today
    if (new Date(subscription.nextDeliveryDate) <= new Date()) {
      subscription.nextDeliveryDate = new Date(Date.now() + subscription.frequencyDays * 24 * 60 * 60 * 1000);
    }

    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription resumed! Your next delivery is scheduled.',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Skip Next Scheduled Delivery Cycle
// @route   POST /api/subscriptions/:id/skip
// @access  Private (Owner)
exports.skipNextDelivery = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (String(subscription.customer) !== String(req.user._id) && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (subscription.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Can only skip active subscriptions' });
    }

    const skippedDate = subscription.nextDeliveryDate;
    subscription.skippedDeliveryDates.push(skippedDate);

    // Advance next delivery date by one frequency cycle
    subscription.nextDeliveryDate = new Date(
      new Date(skippedDate).getTime() + subscription.frequencyDays * 24 * 60 * 60 * 1000
    );

    subscription.deliveryHistory.push({
      deliveryDate: skippedDate,
      status: 'SKIPPED',
      amountCharged: 0,
      note: 'Skipped by customer',
    });

    await subscription.save();

    res.status(200).json({
      success: true,
      message: `Next scheduled delivery on ${new Date(skippedDate).toLocaleDateString('en-IN')} skipped. New delivery date: ${subscription.nextDeliveryDate.toLocaleDateString('en-IN')}.`,
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel Subscription
// @route   POST /api/subscriptions/:id/cancel
// @access  Private (Owner)
exports.cancelSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (String(subscription.customer) !== String(req.user._id) && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    subscription.status = 'CANCELLED';
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = req.body.reason || 'Cancelled by customer';
    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription has been cancelled.',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger Due Recurring Deliveries (Background Scheduler / Worker)
// @route   POST /api/subscriptions/trigger-due
// @access  Private (Admin or Authenticated Worker)
exports.triggerDueDeliveries = async (req, res, next) => {
  try {
    const now = new Date();
    const dueSubscriptions = await Subscription.find({
      status: 'ACTIVE',
      nextDeliveryDate: { $lte: now },
    }).populate('product');

    let processedCount = 0;
    const processedIds = [];

    for (const sub of dueSubscriptions) {
      // Advance next delivery date
      sub.lastDeliveredDate = now;
      sub.totalDeliveriesCount += 1;
      sub.nextDeliveryDate = new Date(now.getTime() + sub.frequencyDays * 24 * 60 * 60 * 1000);

      sub.deliveryHistory.push({
        deliveryDate: now,
        status: 'PLACED',
        amountCharged: sub.cycleTotal,
        note: `Automated recurring delivery cycle #${sub.totalDeliveriesCount}`,
      });

      await sub.save();
      processedCount++;
      processedIds.push(sub._id);
    }

    res.status(200).json({
      success: true,
      message: `Triggered ${processedCount} due recurring subscriptions.`,
      processedCount,
      processedIds,
    });
  } catch (error) {
    next(error);
  }
};
