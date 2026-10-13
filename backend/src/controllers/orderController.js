const Product = require('../models/Product');
const VendorProfile = require('../models/VendorProfile');
const Order = require('../models/Order');
const SubOrder = require('../models/SubOrder');
const DeliveryTask = require('../models/DeliveryTask');
const Ledger = require('../models/Ledger');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const smsService = require('../services/smsService');
const mailService = require('../services/mailService');

// @desc    Checkout and Create Multi-Vendor Split Orders
// @route   POST /api/orders
exports.createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod, couponCode, deliveryInstructions, paymentDetails } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items are required to place an order' });
    }

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.pincode) {
      return res.status(400).json({ success: false, message: 'Complete shipping address is required' });
    }

    // Step 1: Validate all items exist and have sufficient stock before decrementing
    let validatedItems = [];
    let totalOrderAmount = 0;
    const vendorItemsMap = {}; // Group items by vendorId for sub-order splitting
    const productsToDecrement = [];

    for (const item of items) {
      if (!item.productId) {
        return res.status(400).json({ success: false, message: 'Product ID is required for each cart item' });
      }
      const qty = Number(item.quantity);
      if (!qty || qty < 1) {
        return res.status(400).json({ success: false, message: 'Valid positive quantity is required' });
      }

      const product = await Product.findById(item.productId).populate('vendor');
      if (!product || !product.isPublished) {
        return res.status(404).json({ success: false, message: `Product '${item.title || item.productId}' is no longer available` });
      }

      let variantMatch = null;
      let itemPrice = product.sellingPrice;
      let variantName = item.variantName || 'Standard';

      if (product.hasVariants && product.variants?.length > 0) {
        if (item.variantSku) {
          variantMatch = product.variants.find(v => v.sku === item.variantSku);
        }
        if (!variantMatch) {
          variantMatch = product.variants[0];
        }

        if (variantMatch) {
          if (variantMatch.stock < qty) {
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for variant '${variantMatch.name}' of '${product.title}'. Only ${variantMatch.stock} units remaining.`,
            });
          }
          itemPrice = product.sellingPrice + (variantMatch.additionalPrice || 0);
          variantName = variantMatch.name;
        }
      }

      // Check general stock
      if (product.stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for '${product.title}'. Only ${product.stock} units remaining.`,
        });
      }

      const itemTotalPrice = itemPrice * qty;
      totalOrderAmount += itemTotalPrice;

      productsToDecrement.push({
        product,
        variantSku: variantMatch ? variantMatch.sku : null,
        quantity: qty,
      });

      const validatedItem = {
        product: product._id,
        vendor: product.vendor._id,
        title: product.title,
        image: product.images[0] || '',
        variantSku: variantMatch ? variantMatch.sku : (item.variantSku || product.sku),
        variantName: variantName,
        quantity: qty,
        price: itemPrice,
        totalPrice: itemTotalPrice,
      };

      validatedItems.push(validatedItem);

      // Group by vendor
      const vendorIdStr = product.vendor._id.toString();
      if (!vendorItemsMap[vendorIdStr]) {
        vendorItemsMap[vendorIdStr] = {
          vendor: product.vendor,
          items: [],
          subTotal: 0,
        };
      }
      vendorItemsMap[vendorIdStr].items.push(validatedItem);
      vendorItemsMap[vendorIdStr].subTotal += itemTotalPrice;
    }

    // Step 1b: Execute atomic stock decrements with rollback protection
    const decrementedList = [];
    for (const entry of productsToDecrement) {
      let updated;
      if (entry.variantSku && entry.product.hasVariants) {
        updated = await Product.findOneAndUpdate(
          {
            _id: entry.product._id,
            stock: { $gte: entry.quantity },
            variants: {
              $elemMatch: {
                sku: entry.variantSku,
                stock: { $gte: entry.quantity },
              },
            },
            isPublished: true,
          },
          {
            $inc: {
              stock: -entry.quantity,
              'variants.$.stock': -entry.quantity,
            },
          },
          { new: true }
        );
      } else {
        updated = await Product.findOneAndUpdate(
          { _id: entry.product._id, stock: { $gte: entry.quantity }, isPublished: true },
          { $inc: { stock: -entry.quantity } },
          { new: true }
        );
      }

      if (!updated) {
        // Rollback already decremented products to avoid stock leak
        for (const prev of decrementedList) {
          if (prev.variantSku) {
            await Product.findOneAndUpdate(
              { _id: prev.productId, variants: { $elemMatch: { sku: prev.variantSku } } },
              { $inc: { stock: prev.quantity, 'variants.$.stock': prev.quantity } }
            );
          } else {
            await Product.findByIdAndUpdate(prev.productId, { $inc: { stock: prev.quantity } });
          }
        }
        return res.status(400).json({
          success: false,
          message: `Stock ran out for '${entry.product.title}' due to concurrent orders. Please try again.`,
        });
      }

      decrementedList.push({
        productId: entry.product._id,
        variantSku: entry.variantSku,
        quantity: entry.quantity,
      });
    }

    // Step 2: Point #22 Real Promo Code / Coupon Engine validation & calculation
    let appliedCoupon = null;
    let couponDiscountAmount = 0;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const Coupon = require('../models/Coupon');
      const cleanCode = couponCode.trim().toUpperCase();
      const couponDoc = await Coupon.findOne({ code: cleanCode, isActive: true });

      if (couponDoc) {
        const notExpired = !couponDoc.expiryDate || new Date(couponDoc.expiryDate) >= new Date();
        const limitNotReached = !couponDoc.usageLimit || couponDoc.usedCount < couponDoc.usageLimit;
        const minOrderMet = !couponDoc.minOrderAmount || totalOrderAmount >= couponDoc.minOrderAmount;

        if (notExpired && limitNotReached && minOrderMet) {
          if (couponDoc.discountType === 'PERCENTAGE') {
            couponDiscountAmount = Math.round((totalOrderAmount * couponDoc.discountValue) / 100);
            if (couponDoc.maxDiscountAmount && couponDoc.maxDiscountAmount > 0) {
              couponDiscountAmount = Math.min(couponDiscountAmount, couponDoc.maxDiscountAmount);
            }
          } else {
            couponDiscountAmount = Math.min(couponDoc.discountValue, totalOrderAmount);
          }

          appliedCoupon = {
            code: couponDoc.code,
            title: couponDoc.title,
            discountAmount: couponDiscountAmount,
            discountType: couponDoc.discountType,
          };

          // Increment usage count atomically
          await Coupon.findByIdAndUpdate(couponDoc._id, { $inc: { usedCount: 1 } });
        }
      }
    }

    // Dynamic Shipping Calculation (Free Shipping above threshold on net item subtotal)
    const UIConfig = require('../models/UIConfig');
    let uiConfigDoc = null;
    try {
      uiConfigDoc = await UIConfig.findOne();
    } catch (e) {}
    const freeThreshold = uiConfigDoc?.shipping?.freeShippingThreshold ?? 999;
    const defaultFee = uiConfigDoc?.shipping?.defaultShippingFee ?? 99;
    const shippingFee = totalOrderAmount >= freeThreshold ? 0 : defaultFee;

    // Point #31: Customer In-App Wallet & Reward Coins Redemption
    const coinsToRedeem = Number(req.body.coinsToRedeem || req.body.walletCoinsUsed || 0);
    let coinDiscount = 0;
    let customerUser = await User.findById(req.user._id);

    if (coinsToRedeem > 0 && customerUser) {
      const availableCoins = customerUser.walletCoins || 0;
      if (coinsToRedeem > availableCoins) {
        return res.status(400).json({
          success: false,
          message: `Cannot redeem ${coinsToRedeem} coins. You only have ${availableCoins} reward coins available.`,
        });
      }
      // 1 Coin = ₹1 discount (cannot exceed net payable order total)
      const maxRedeemable = Math.max(0, totalOrderAmount - couponDiscountAmount + shippingFee);
      coinDiscount = Math.min(coinsToRedeem, maxRedeemable);
    }

    const finalTotalAmount = Math.max(0, totalOrderAmount - couponDiscountAmount + shippingFee - coinDiscount);

    // Point #26 & #31: Resolve Payment Gateway & Verification
    const validMethods = ['COD', 'RAZORPAY', 'STRIPE', 'UPI', 'WALLET'];
    const activePaymentMethod = validMethods.includes(paymentMethod) ? paymentMethod : 'COD';

    let walletAmountDebited = 0;
    if (activePaymentMethod === 'WALLET' && customerUser) {
      if ((customerUser.walletBalance || 0) < finalTotalAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient in-app wallet balance. You have ₹${customerUser.walletBalance || 0}, but order total is ₹${finalTotalAmount}.`,
        });
      }
      walletAmountDebited = finalTotalAmount;
      customerUser.walletBalance = Math.max(0, (customerUser.walletBalance || 0) - walletAmountDebited);
    }

    if (coinDiscount > 0 && customerUser) {
      customerUser.walletCoins = Math.max(0, (customerUser.walletCoins || 0) - coinDiscount);
    }

    // Point #31: 5% Cashback Reward on completed orders (minimum 10 coins)
    const cashbackEarned = Math.max(10, Math.round(finalTotalAmount * 0.05));
    if (customerUser) {
      customerUser.walletCoins = (customerUser.walletCoins || 0) + cashbackEarned;
      await customerUser.save();
    }

    const isPrepaid = ['RAZORPAY', 'STRIPE', 'UPI', 'WALLET'].includes(activePaymentMethod);
    const resolvedPaymentStatus = isPrepaid ? 'PAID' : 'PENDING';
    const resolvedPaymentId =
      paymentDetails?.transactionId ||
      paymentDetails?.upiUtr ||
      (isPrepaid ? `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}` : null);

    const masterOrder = await Order.create({
      customer: req.user._id,
      items: validatedItems,
      subtotal: totalOrderAmount,
      discountAmount: couponDiscountAmount + coinDiscount,
      coupon: appliedCoupon,
      walletCoinsUsed: coinDiscount,
      walletAmountDebited,
      cashbackEarned,
      totalAmount: finalTotalAmount,
      shippingFee,
      shippingAddress,
      deliveryInstructions: deliveryInstructions || '',
      paymentMethod: activePaymentMethod,
      paymentStatus: resolvedPaymentStatus,
      paymentId: resolvedPaymentId,
      paymentDetails: {
        gateway: activePaymentMethod,
        transactionId: resolvedPaymentId,
        upiUtr: paymentDetails?.upiUtr || null,
        cardLast4: paymentDetails?.cardLast4 || null,
        paidAt: isPrepaid ? new Date() : null,
      },
    });

    // Step 3: Create Sub-Orders per Vendor (Order Splitting)
    const createdSubOrders = [];
    let totalPlatformCommission = 0;

    // Pick an available delivery partner to assign (if any exists)
    let deliveryPartner = await User.findOne({ role: 'delivery', isActive: true });
    if (!deliveryPartner) {
      deliveryPartner = await User.findOne({ email: 'rider@auramarket.com' });
    }

    for (const vendorIdStr in vendorItemsMap) {
      const vendorGroup = vendorItemsMap[vendorIdStr];
      const vendor = vendorGroup.vendor;
      const commissionRate = vendor.commissionRate || 10;
      const commissionAmount = (vendorGroup.subTotal * commissionRate) / 100;
      const vendorEarning = vendorGroup.subTotal - commissionAmount;

      totalPlatformCommission += commissionAmount;

      const subOrder = await SubOrder.create({
        parentOrder: masterOrder._id,
        vendor: vendor._id,
        customer: req.user._id,
        items: vendorGroup.items,
        subTotal: vendorGroup.subTotal,
        platformCommissionRate: commissionRate,
        platformCommissionAmount: commissionAmount,
        vendorEarning,
        shippingAddress,
        deliveryInstructions: deliveryInstructions || '',
        deliveryPartner: deliveryPartner ? deliveryPartner._id : null,
        trackingHistory: [
          {
            status: 'placed',
            timestamp: new Date(),
            note: 'Order successfully placed by customer',
          },
        ],
      });

      createdSubOrders.push(subOrder._id);

      // Update Vendor Balance & Stats
      vendor.walletBalance += vendorEarning;
      vendor.totalSales += vendorGroup.subTotal;
      vendor.totalEarnings += vendorEarning;
      await vendor.save();

      // Create Financial Ledger Entry for Vendor
      await Ledger.create({
        vendor: vendor._id,
        subOrder: subOrder._id,
        type: 'ORDER_CREDIT',
        amount: vendorEarning,
        description: `Credit for SubOrder #${subOrder._id.toString().slice(-6)} (SubTotal ₹${vendorGroup.subTotal} - Commission ₹${commissionAmount})`,
        balanceAfter: vendor.walletBalance,
        status: 'COMPLETED',
      });

      // Create Delivery Task for courier partner
      if (deliveryPartner) {
        await DeliveryTask.create({
          subOrder: subOrder._id,
          deliveryPartner: deliveryPartner._id,
          deliveryInstructions: deliveryInstructions || '',
          pickupLocation: {
            storeName: vendor.storeName,
            phone: vendor.pickupAddress?.phone || '9876543210',
            address: `${vendor.pickupAddress?.street || 'Shop 101'}, ${vendor.pickupAddress?.city || 'Delhi'}`,
          },
          dropLocation: {
            recipientName: shippingAddress.recipientName,
            phone: shippingAddress.phone,
            address: `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state}`,
            pincode: shippingAddress.pincode,
          },
          isCod: activePaymentMethod === 'COD',
          amountToCollect: activePaymentMethod === 'COD' ? vendorGroup.subTotal : 0,
        });
      }
    }

    // Step 4: Update Master Order with Sub-Order references and total commission
    masterOrder.subOrders = createdSubOrders;
    masterOrder.totalCommission = totalPlatformCommission;
    await masterOrder.save();

    // Create Platform Commission Ledger Entry
    await Ledger.create({
      type: 'COMMISSION_DEBIT',
      amount: totalPlatformCommission,
      description: `Platform Commission cut on Master Order #${masterOrder.orderNumber}`,
      balanceAfter: totalPlatformCommission,
      status: 'COMPLETED',
    });

    // Point #31: Record Wallet & Coin Transactions
    if (customerUser) {
      if (coinDiscount > 0) {
        await WalletTransaction.create({
          user: customerUser._id,
          type: 'DEBIT',
          currency: 'COINS',
          amount: coinDiscount,
          category: 'COIN_REDEMPTION',
          title: '🪙 Coins Redeemed at Checkout',
          description: `Applied ${coinDiscount} coins discount on Order #${masterOrder.orderNumber}`,
          order: masterOrder._id,
          orderNumber: masterOrder.orderNumber,
          balanceAfter: customerUser.walletBalance || 0,
          coinsAfter: customerUser.walletCoins || 0,
        });
      }

      if (walletAmountDebited > 0) {
        await WalletTransaction.create({
          user: customerUser._id,
          type: 'DEBIT',
          currency: 'INR',
          amount: walletAmountDebited,
          category: 'WALLET_PAYMENT',
          title: '💵 In-App Wallet Payment',
          description: `Paid ₹${walletAmountDebited} for Order #${masterOrder.orderNumber}`,
          order: masterOrder._id,
          orderNumber: masterOrder.orderNumber,
          balanceAfter: customerUser.walletBalance || 0,
          coinsAfter: customerUser.walletCoins || 0,
        });
      }

      if (cashbackEarned > 0) {
        await WalletTransaction.create({
          user: customerUser._id,
          type: 'CREDIT',
          currency: 'COINS',
          amount: cashbackEarned,
          category: 'CASHBACK',
          title: '🎁 5% Cashback Reward Coins',
          description: `Earned ${cashbackEarned} cashback coins on Order #${masterOrder.orderNumber}`,
          order: masterOrder._id,
          orderNumber: masterOrder.orderNumber,
          balanceAfter: customerUser.walletBalance || 0,
          coinsAfter: customerUser.walletCoins || 0,
        });
      }
    }

    const populatedOrder = await Order.findById(masterOrder._id).populate({
      path: 'subOrders',
      populate: { path: 'vendor', select: 'storeName storeLogo pickupAddress' },
    });

    // Asynchronously dispatch Order Confirmation SMS & Email notifications
    const customerPhone = shippingAddress?.phone || req.user?.phone || '9876543210';
    const customerEmail = req.user?.email || 'customer@auramarket.com';

    smsService
      .sendOrderSMS({ order: populatedOrder, phone: customerPhone })
      .catch(err => console.log('[SMS Warning] Could not dispatch order SMS:', err.message));

    mailService
      .sendOrderEmail({ order: populatedOrder, email: customerEmail })
      .catch(err => console.log('[Email Warning] Could not dispatch order email:', err.message));

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! Sub-orders generated for vendors.',
      data: populatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Customer's Order History
// @route   GET /api/orders/my
exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate({
        path: 'subOrders',
        populate: { path: 'vendor', select: 'storeName storeLogo' },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Single Order Details
// @route   GET /api/orders/:id
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate({
        path: 'subOrders',
        populate: [
          { path: 'vendor', select: 'storeName storeLogo pickupAddress' },
          { path: 'deliveryPartner', select: 'name phone' },
        ],
      });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Allow only owner or admin to view
    if (order.customer._id.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel an order (Point #28: 1-Click Self-Cancel Order Before Dispatch)
// @route   POST /api/orders/:id/cancel
exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('subOrders');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this order' });
    }

    // Check if order was already cancelled or all sub-orders are delivered
    const allDelivered = order.subOrders.length > 0 && order.subOrders.every(sub => sub.status === 'delivered');
    if (allDelivered) {
      return res.status(400).json({ success: false, message: 'Cannot cancel an order that has already been delivered' });
    }

    const allCancelled = order.subOrders.length > 0 && order.subOrders.every(sub => sub.status === 'cancelled');
    if (allCancelled) {
      return res.status(400).json({ success: false, message: 'Order is already cancelled' });
    }

    // Point #28 Guardrail: Before-dispatch verification for customer self-cancellation
    if (req.user.role !== 'superadmin') {
      const isAlreadyDispatched = order.subOrders.some(sub =>
        ['dispatched', 'out_for_delivery', 'delivered'].includes(sub.status)
      );
      if (isAlreadyDispatched) {
        return res.status(400).json({
          success: false,
          message: 'Order cannot be self-cancelled after dispatch. The shipment is already in transit with courier partner. Please initiate a Return after delivery.',
        });
      }
    }

    const reason = req.body.reason || (req.user.role === 'superadmin' ? 'Cancelled by platform admin' : 'Cancelled by customer before dispatch');
    order.cancellationReason = reason;
    order.cancelledAt = new Date();

    for (const sub of order.subOrders) {
      if (sub.status !== 'delivered' && sub.status !== 'cancelled') {
        sub.status = 'cancelled';
        sub.cancellationReason = reason;
        sub.trackingHistory.push({
          status: 'cancelled',
          timestamp: new Date(),
          note: `Order cancelled: ${reason}`,
        });
        await sub.save();

        // 1. Restore stock for each item in the suborder (both product and variant stock)
        if (sub.items && sub.items.length > 0) {
          for (const item of sub.items) {
            if (item.variantSku) {
              const res = await Product.findOneAndUpdate(
                { _id: item.product, variants: { $elemMatch: { sku: item.variantSku } } },
                { $inc: { stock: item.quantity, 'variants.$.stock': item.quantity } }
              );
              if (!res) {
                await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
              }
            } else {
              await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
            }
          }
        }

        // 2. Reverse vendor wallet balance & sales stats
        const vendor = await VendorProfile.findById(sub.vendor);
        if (vendor) {
          vendor.walletBalance = Math.max(0, vendor.walletBalance - sub.vendorEarning);
          vendor.totalSales = Math.max(0, vendor.totalSales - sub.subTotal);
          vendor.totalEarnings = Math.max(0, vendor.totalEarnings - sub.vendorEarning);
          await vendor.save();

          // 3. Create Refund Ledger Entry
          await Ledger.create({
            vendor: vendor._id,
            subOrder: sub._id,
            type: 'REFUND',
            amount: sub.vendorEarning,
            description: `Refund/Reversal for cancelled SubOrder #${sub._id.toString().slice(-6)}: ${reason}`,
            balanceAfter: vendor.walletBalance,
            status: 'COMPLETED',
          });
        }

        // 4. Cancel delivery task so rider does not deliver a cancelled order
        await DeliveryTask.findOneAndUpdate(
          { subOrder: sub._id, status: { $ne: 'DELIVERED' } },
          { status: 'CANCELLED' }
        );
      }
    }

    // Update master order status and payment status
    order.status = 'CANCELLED';
    if (order.paymentStatus === 'PAID') {
      order.paymentStatus = 'REFUNDED';
    }
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully! Stock restored to inventory and vendor ledgers adjusted.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Track Order Step-by-Step (Point #27 Live Visual Stepper)
// @route   GET /api/orders/track/:identifier
exports.trackOrder = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const mongoose = require('mongoose');
    let order = null;

    // 1. Try finding by MongoDB ObjectId or orderNumber
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      order = await Order.findById(identifier);
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: identifier });
    }
    if (!order) {
      // 2. Try finding by SubOrder ID
      const sub = mongoose.Types.ObjectId.isValid(identifier)
        ? await SubOrder.findById(identifier)
        : null;
      if (sub) {
        order = await Order.findById(sub.parentOrder);
      }
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `No active order found with tracking reference '${identifier}'`,
      });
    }

    // Populate sub-orders with vendor and courier partner details
    await order.populate([
      { path: 'customer', select: 'name phone' },
      {
        path: 'subOrders',
        populate: [
          { path: 'vendor', select: 'storeName storeLogo pickupAddress phone' },
          { path: 'deliveryPartner', select: 'name phone' },
        ],
      },
    ]);

    // Standard 5-step lifecycle stages:
    // 1. placed (Ordered)
    // 2. packed (Packaging)
    // 3. dispatched (In Transit / Shipped)
    // 4. out_for_delivery (Out for Delivery)
    // 5. delivered (Delivered)
    const stageOrder = ['placed', 'packed', 'dispatched', 'out_for_delivery', 'delivered'];
    const stageLabels = {
      placed: { title: 'Order Confirmed', desc: 'Order received and verified by AuraMarket' },
      packed: { title: 'Packed & Barcoded', desc: 'Merchant prepared parcel with shipping slip' },
      dispatched: { title: 'Handed to Express Courier', desc: 'Parcel left fulfillment hub and is in transit' },
      out_for_delivery: { title: 'Out for Doorstep Delivery', desc: 'Courier rider is on the way to your destination' },
      delivered: { title: 'Delivered Successfully', desc: 'Handed over at doorstep with verified OTP' },
    };

    const subOrdersTracking = (order.subOrders || []).map(sub => {
      const currentStatus = sub.status || 'placed';
      const isCancelled = currentStatus === 'cancelled';
      const currentIndex = stageOrder.indexOf(currentStatus);

      const steps = stageOrder.map((stageKey, idx) => {
        const histItem = (sub.trackingHistory || []).find(h => h.status === stageKey);
        const isCompleted = !isCancelled && (currentIndex >= idx);
        const isCurrent = !isCancelled && (currentIndex === idx);

        return {
          stepIndex: idx + 1,
          key: stageKey,
          label: stageLabels[stageKey].title,
          description: histItem?.note || stageLabels[stageKey].desc,
          isCompleted,
          isCurrent,
          timestamp: histItem?.timestamp || (isCompleted ? sub.createdAt : null),
        };
      });

      return {
        subOrderId: sub._id ? `SUB-${sub._id.toString().slice(-4)}` : 'SUB-001',
        rawSubOrderId: sub._id,
        vendor: sub.vendor,
        items: sub.items,
        subTotal: sub.subTotal,
        status: currentStatus,
        isCancelled,
        deliveryOtp: sub.deliveryOtp || '4821',
        deliveryPartner: sub.deliveryPartner || { name: 'Vikram Singh', phone: '9876543210' },
        steps,
        deliveryInstructions: sub.deliveryInstructions || order.deliveryInstructions || '',
      };
    });

    const canSelfCancel = !['DELIVERED', 'CANCELLED'].includes(order.status) &&
      !order.subOrders.some(sub => ['dispatched', 'out_for_delivery', 'delivered'].includes(sub.status));

    res.status(200).json({
      success: true,
      data: {
        orderId: order.orderNumber || order._id,
        rawOrderId: order._id,
        createdAt: order.createdAt,
        totalAmount: order.totalAmount,
        status: order.status,
        shippingAddress: order.shippingAddress,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        paymentDetails: order.paymentDetails,
        deliveryInstructions: order.deliveryInstructions,
        canSelfCancel,
        cancellationReason: order.cancellationReason || null,
        cancelledAt: order.cancelledAt || null,
        subOrders: subOrdersTracking,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Simulate/Advance Order Milestone for Demo/Testing
// @route   POST /api/orders/:id/advance-step
exports.simulateOrderStep = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { step } = req.body; // 'packed' | 'dispatched' | 'out_for_delivery' | 'delivered'
    const order = await Order.findById(id).populate('subOrders');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const nextStep = step || 'packed';
    for (const sub of order.subOrders) {
      sub.status = nextStep;
      sub.trackingHistory.push({
        status: nextStep,
        timestamp: new Date(),
        note: `Milestone advanced to ${nextStep}`,
      });
      await sub.save();
    }

    if (nextStep === 'delivered') {
      order.status = 'DELIVERED';
      order.paymentStatus = 'PAID';
    } else {
      order.status = 'IN_PROGRESS';
    }
    await order.save();

    res.status(200).json({ success: true, message: `Order milestone advanced to ${nextStep}` });
  } catch (error) {
    next(error);
  }
};

// Helper: Convert number to English currency words
function numberToWords(amount) {
  const num = Math.round(Number(amount) || 0);
  if (num === 0) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function inWords(n) {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : ' ');
  }
  
  let str = '';
  let n = num;
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = Math.floor(n / 100);
  const remaining = Math.floor(n % 100);
  
  if (crore) str += inWords(crore) + 'Crore ';
  if (lakh) str += inWords(lakh) + 'Lakh ';
  if (thousand) str += inWords(thousand) + 'Thousand ';
  if (hundred) str += inWords(hundred) + 'Hundred ';
  if (remaining) str += inWords(remaining);
  
  return 'Rupees ' + str.trim() + ' Only';
}

// @desc    1-Click Tax Invoice Download / Preview (Point #30)
// @route   GET /api/orders/:id/invoice
// @access  Public / Customer / Admin
exports.getTaxInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const mongoose = require('mongoose');
    let order = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id);
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: id });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found for invoice generation' });
    }

    await order.populate([
      { path: 'customer', select: 'name email phone' },
      {
        path: 'subOrders',
        populate: [{ path: 'vendor', select: 'storeName pickupAddress phone businessEmail gstin pan' }],
      },
    ]);

    const primaryVendor = order.subOrders?.[0]?.vendor;
    const seller = {
      storeName: primaryVendor?.storeName || 'AuraMarket Authorized Merchant',
      address: primaryVendor?.pickupAddress || 'Fulfillment Center B-42, Okhla Industrial Area Phase-III, New Delhi, Delhi 110020',
      phone: primaryVendor?.phone || '+91 9876543210',
      email: primaryVendor?.businessEmail || 'billing@auramarket.com',
      gstin: primaryVendor?.gstin || '07AAAAA0000A1Z5',
      pan: primaryVendor?.pan || 'AAAAA0000A',
      state: 'Delhi',
      stateCode: '07',
    };

    const buyer = {
      name: order.shippingAddress?.recipientName || order.customer?.name || 'Valued Customer',
      phone: order.shippingAddress?.phone || order.customer?.phone || 'N/A',
      email: order.customer?.email || 'customer@auramarket.com',
      address: `${order.shippingAddress?.street}, ${order.shippingAddress?.city}, ${order.shippingAddress?.state} - ${order.shippingAddress?.pincode}`,
      state: order.shippingAddress?.state || 'Delhi',
      pincode: order.shippingAddress?.pincode || '110001',
    };

    const invoiceNumber = `INV-${order.orderNumber || order._id.toString().slice(-8).toUpperCase()}`;
    const invoiceDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN');
    const orderDate = invoiceDate;

    // Line items breakdown with 18% GST (9% CGST + 9% SGST for same-state)
    let totalTaxableValue = 0;
    let totalTaxAmount = 0;

    const lineItems = (order.items || []).map((item, idx) => {
      const grossTotal = (item.price || 0) * (item.quantity || 1);
      // Assuming prices are inclusive of 18% GST
      const taxable = Math.round((grossTotal / 1.18) * 100) / 100;
      const tax = Math.round((grossTotal - taxable) * 100) / 100;
      const cgst = Math.round((tax / 2) * 100) / 100;
      const sgst = Math.round((tax / 2) * 100) / 100;

      totalTaxableValue += taxable;
      totalTaxAmount += tax;

      return {
        itemNo: idx + 1,
        title: item.title || 'Product Item',
        variantSku: item.variantSku || 'STD-SKU',
        hsnCode: '85183000',
        quantity: item.quantity || 1,
        unitGrossPrice: item.price || 0,
        taxableValue: taxable,
        taxRate: '18%',
        cgstAmount: cgst,
        sgstAmount: sgst,
        totalAmount: grossTotal,
      };
    });

    const subtotal = Math.round(totalTaxableValue * 100) / 100;
    const cgstTotal = Math.round((totalTaxAmount / 2) * 100) / 100;
    const sgstTotal = Math.round((totalTaxAmount / 2) * 100) / 100;
    const totalTax = Math.round(totalTaxAmount * 100) / 100;
    const shippingFee = order.shippingFee || 0;
    const discount = order.discountAmount || 0;
    const grandTotal = order.totalAmount || Math.round((subtotal + totalTax + shippingFee - discount) * 100) / 100;
    const amountInWords = numberToWords(grandTotal);

    // Generate standalone printable HTML
    const printableHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${invoiceNumber}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.4; font-size: 12px; margin: 0; padding: 20px; }
    .invoice-card { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 8px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f2444; padding-bottom: 15px; margin-bottom: 20px; }
    .brand-title { font-size: 24px; font-weight: 900; color: #0f2444; margin: 0; letter-spacing: -0.5px; }
    .badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; margin-left: 6px; }
    .inv-title { font-size: 18px; font-weight: 800; text-align: right; color: #0f2444; margin: 0; }
    .inv-meta { text-align: right; font-size: 11px; color: #64748b; margin-top: 4px; }
    .party-row { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
    .party-box { flex: 1; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
    .party-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
    .party-name { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #0f2444; color: #ffffff; font-weight: 700; text-align: left; padding: 8px; font-size: 11px; }
    td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
    .text-right { text-align: right; }
    .totals-table { width: 320px; margin-left: auto; margin-bottom: 20px; }
    .totals-table td { padding: 4px 8px; }
    .grand-total-row { background: #f1f5f9; font-weight: 800; font-size: 13px; border-top: 2px solid #0f2444; }
    .words-box { padding: 10px; background: #f8fafc; border-left: 3px solid #0f2444; font-size: 11px; margin-bottom: 20px; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 10px; color: #64748b; }
    .seal-box { text-align: center; border: 1px dashed #cbd5e1; padding: 8px 16px; border-radius: 6px; background: #fafafa; }
    @media print {
      body { padding: 0; }
      .invoice-card { border: none; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div>
        <h1 class="brand-title">AuraMarket<span class="badge">ORIGINAL TAX INVOICE</span></h1>
        <p style="margin: 2px 0 0; color: #64748b; font-size: 11px;">Enterprise Multi-Vendor E-Commerce Platform</p>
      </div>
      <div>
        <h2 class="inv-title">TAX INVOICE</h2>
        <div class="inv-meta">
          <strong>Invoice #:</strong> ${invoiceNumber}<br>
          <strong>Invoice Date:</strong> ${invoiceDate}<br>
          <strong>Order Reference:</strong> ${order.orderNumber || order._id}<br>
          <strong>Payment Mode:</strong> ${order.paymentMethod || 'COD'} (${order.paymentStatus || 'PAID'})
        </div>
      </div>
    </div>

    <div class="party-row">
      <div class="party-box">
        <div class="party-title">Sold By (Merchant / Seller)</div>
        <div class="party-name">${seller.storeName}</div>
        <div>${seller.address}</div>
        <div><strong>GSTIN:</strong> ${seller.gstin} | <strong>PAN:</strong> ${seller.pan}</div>
        <div><strong>State:</strong> ${seller.state} (Code: ${seller.stateCode})</div>
      </div>
      <div class="party-box">
        <div class="party-title">Billed & Shipped To (Customer)</div>
        <div class="party-name">${buyer.name}</div>
        <div>${buyer.address}</div>
        <div><strong>Phone:</strong> ${buyer.phone}</div>
        <div><strong>State of Supply:</strong> ${buyer.state}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 30px;">#</th>
          <th>Item Description</th>
          <th>HSN</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Taxable</th>
          <th class="text-right">CGST (9%)</th>
          <th class="text-right">SGST (9%)</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems.map(item => `
          <tr>
            <td>${item.itemNo}</td>
            <td><strong>${item.title}</strong><br><span style="color:#64748b; font-size:10px;">SKU: ${item.variantSku}</span></td>
            <td>${item.hsnCode}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">₹${item.unitGrossPrice.toLocaleString('en-IN')}</td>
            <td class="text-right">₹${item.taxableValue.toLocaleString('en-IN')}</td>
            <td class="text-right">₹${item.cgstAmount.toLocaleString('en-IN')}</td>
            <td class="text-right">₹${item.sgstAmount.toLocaleString('en-IN')}</td>
            <td class="text-right font-bold">₹${item.totalAmount.toLocaleString('en-IN')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <table class="totals-table">
      <tr>
        <td>Taxable Amount:</td>
        <td class="text-right font-bold">₹${subtotal.toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>CGST (9.0%):</td>
        <td class="text-right font-bold">₹${cgstTotal.toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>SGST (9.0%):</td>
        <td class="text-right font-bold">₹${sgstTotal.toLocaleString('en-IN')}</td>
      </tr>
      <tr>
        <td>Shipping & Delivery:</td>
        <td class="text-right font-bold">${shippingFee === 0 ? 'FREE' : '₹' + shippingFee}</td>
      </tr>
      ${discount > 0 ? `
      <tr>
        <td style="color: #059669;">Promo Coupon Discount:</td>
        <td class="text-right font-bold" style="color: #059669;">-₹${discount.toLocaleString('en-IN')}</td>
      </tr>` : ''}
      <tr class="grand-total-row">
        <td>Grand Total (INR):</td>
        <td class="text-right">₹${grandTotal.toLocaleString('en-IN')}</td>
      </tr>
    </table>

    <div class="words-box">
      <strong>Amount in Words:</strong> ${amountInWords}
    </div>

    <div class="footer">
      <div>
        <p style="margin: 0 0 2px;">• This is a system-generated electronic tax invoice authorized by AuraMarket.</p>
        <p style="margin: 0 0 2px;">• For warranty and product returns, retain this invoice as proof of purchase.</p>
        <p style="margin: 0;">• Subject to Delhi Jurisdiction. Contact: support@auramarket.com</p>
      </div>
      <div class="seal-box">
        <strong style="color: #0f2444; font-size: 11px;">AuraMarket Digital Verification</strong><br>
        <span style="color: #059669; font-weight: 700;">✓ Digitally Signed & Authenticated</span><br>
        <span style="font-size: 9px; color: #94a3b8;">Authorized Signatory</span>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    res.status(200).json({
      success: true,
      data: {
        invoiceNumber,
        invoiceDate,
        orderId: order.orderNumber || order._id,
        rawOrderId: order._id,
        orderDate,
        seller,
        buyer,
        lineItems,
        pricing: {
          subtotal,
          cgstTotal,
          sgstTotal,
          totalTax,
          shippingFee,
          discount,
          grandTotal,
          amountInWords,
        },
        payment: {
          method: order.paymentMethod,
          status: order.paymentStatus,
          transactionRef: order.paymentDetails?.transactionId || order.paymentDetails?.upiUtr || 'N/A',
        },
        printableHtml,
      },
    });
  } catch (error) {
    next(error);
  }
};



