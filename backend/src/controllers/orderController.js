const Product = require('../models/Product');
const VendorProfile = require('../models/VendorProfile');
const Order = require('../models/Order');
const SubOrder = require('../models/SubOrder');
const DeliveryTask = require('../models/DeliveryTask');
const Ledger = require('../models/Ledger');
const User = require('../models/User');
const smsService = require('../services/smsService');
const mailService = require('../services/mailService');

// @desc    Checkout and Create Multi-Vendor Split Orders
// @route   POST /api/orders
exports.createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;

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

    // Step 2: Point #19 Dynamic Shipping Calculation (Free Shipping above threshold)
    const UIConfig = require('../models/UIConfig');
    let uiConfigDoc = null;
    try {
      uiConfigDoc = await UIConfig.findOne();
    } catch (e) {}
    const freeThreshold = uiConfigDoc?.shipping?.freeShippingThreshold ?? 999;
    const defaultFee = uiConfigDoc?.shipping?.defaultShippingFee ?? 99;
    const shippingFee = totalOrderAmount >= freeThreshold ? 0 : defaultFee;
    const finalTotalAmount = totalOrderAmount + shippingFee;

    const masterOrder = await Order.create({
      customer: req.user._id,
      items: validatedItems,
      totalAmount: finalTotalAmount,
      shippingFee,
      shippingAddress,
      paymentMethod: paymentMethod || 'COD',
      paymentStatus: paymentMethod === 'RAZORPAY' ? 'PAID' : 'PENDING',
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
          isCod: paymentMethod === 'COD',
          amountToCollect: paymentMethod === 'COD' ? vendorGroup.subTotal : 0,
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

// @desc    Cancel an order
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

    for (const sub of order.subOrders) {
      if (sub.status !== 'delivered' && sub.status !== 'cancelled') {
        sub.status = 'cancelled';
        sub.trackingHistory.push({
          status: 'cancelled',
          timestamp: new Date(),
          note: `Order cancelled by ${req.user.role === 'superadmin' ? 'Admin' : 'Customer'}`,
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
            description: `Refund/Reversal for cancelled SubOrder #${sub._id.toString().slice(-6)}`,
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
      message: 'Order cancelled successfully! Stock restored and vendor ledgers adjusted.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};


