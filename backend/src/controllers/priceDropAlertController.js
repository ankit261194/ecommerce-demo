const PriceDropAlert = require('../models/PriceDropAlert');
const Product = require('../models/Product');
const smsService = require('../services/smsService');
const mailService = require('../services/mailService');

/**
 * Trigger alerts for subscribers when product price drops (Point 15)
 */
const checkAndTriggerPriceDropAlerts = async (productId, oldPrice, newPrice) => {
  try {
    if (newPrice >= oldPrice) return { triggered: 0, alerts: [] };

    const product = await Product.findById(productId);
    if (!product) return { triggered: 0, alerts: [] };

    // Find active subscribers whose targetPrice >= newPrice and alertType is PRICE_DROP or BOTH
    const alerts = await PriceDropAlert.find({
      product: productId,
      status: 'ACTIVE',
      alertType: { $in: ['PRICE_DROP', 'BOTH'] },
      targetPrice: { $gte: newPrice },
    });

    if (alerts.length === 0) return { triggered: 0, alerts: [] };

    const triggeredList = [];
    const siteUrl = `https://shribalajikripadham.online/ecommerce-demo/#product?id=${productId}`;

    for (const alert of alerts) {
      alert.status = 'ALERTED';
      alert.alertedAt = new Date();
      alert.alertedPrice = newPrice;
      await alert.save();
      triggeredList.push(alert);

      // 1. Send Email Notification if requested
      if (['EMAIL', 'BOTH', 'ALL'].includes(alert.channel) && alert.customerEmail) {
        await mailService.sendEmail(
          alert.customerEmail,
          `🎉 Price Drop Alert: ${product.title} is now ₹${newPrice}!`,
          `Hi ${alert.customerName},\n\nGreat news! The product "${product.title}" has dropped in price to ₹${newPrice} (was ₹${oldPrice}), reaching your target price of ₹${alert.targetPrice}.\n\nBuy now before stock runs out: ${siteUrl}`
        ).catch(() => {});
      }

      // 2. Send SMS / WhatsApp Notification if requested and phone exists
      if (['WHATSAPP', 'SMS', 'BOTH', 'ALL'].includes(alert.channel) && alert.customerPhone) {
        await smsService.sendSMS(
          alert.customerPhone,
          `AuraMarket Price Drop! ${product.title} dropped to ₹${newPrice} (was ₹${oldPrice}). Your target ₹${alert.targetPrice} met! Order now: ${siteUrl}`
        ).catch(() => {});
      }
    }

    return { triggered: triggeredList.length, alerts: triggeredList };
  } catch (err) {
    console.error('[PriceDropAlert] Error triggering price drop alerts:', err);
    return { triggered: 0, error: err.message };
  }
};

/**
 * Trigger alerts for subscribers when product comes back in stock (Point 15)
 */
const checkAndTriggerStockAlerts = async (productId, oldStock, newStock) => {
  try {
    if (oldStock > 0 || newStock <= 0) return { triggered: 0, alerts: [] };

    const product = await Product.findById(productId);
    if (!product) return { triggered: 0, alerts: [] };

    // Find active subscribers waiting for restock
    const alerts = await PriceDropAlert.find({
      product: productId,
      status: 'ACTIVE',
      alertType: { $in: ['BACK_IN_STOCK', 'BOTH'] },
    });

    if (alerts.length === 0) return { triggered: 0, alerts: [] };

    const triggeredList = [];
    const siteUrl = `https://shribalajikripadham.online/ecommerce-demo/#product?id=${productId}`;

    for (const alert of alerts) {
      alert.status = 'ALERTED';
      alert.alertedAt = new Date();
      alert.restockedUnits = newStock;
      await alert.save();
      triggeredList.push(alert);

      // 1. Send Email Notification if requested
      if (['EMAIL', 'BOTH', 'ALL'].includes(alert.channel) && alert.customerEmail) {
        await mailService.sendEmail(
          alert.customerEmail,
          `📦 Back in Stock Alert: ${product.title} is available now!`,
          `Hi ${alert.customerName},\n\nGood news! "${product.title}" is now back in stock with ${newStock} units available.\n\nSecure yours before it sells out: ${siteUrl}`
        ).catch(() => {});
      }

      // 2. Send SMS / WhatsApp Notification if requested
      if (['WHATSAPP', 'SMS', 'BOTH', 'ALL'].includes(alert.channel) && alert.customerPhone) {
        await smsService.sendSMS(
          alert.customerPhone,
          `AuraMarket Restock Alert! Good news, "${product.title}" is back in stock with ${newStock} units available! Order now: ${siteUrl}`
        ).catch(() => {});
      }
    }

    return { triggered: triggeredList.length, alerts: triggeredList };
  } catch (err) {
    console.error('[PriceDropAlert] Error triggering stock alerts:', err);
    return { triggered: 0, error: err.message };
  }
};

exports.checkAndTriggerPriceDropAlerts = checkAndTriggerPriceDropAlerts;
exports.checkAndTriggerStockAlerts = checkAndTriggerStockAlerts;

// @desc    Subscribe to Price Drop or Back-in-Stock Alert (Point 15)
// @route   POST /api/price-drop-alerts
// @access  Public / Customer
exports.subscribePriceDrop = async (req, res, next) => {
  try {
    const {
      productId,
      targetPrice,
      email,
      phone,
      name,
      channel = 'BOTH',
      alertType = 'PRICE_DROP',
    } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const resolvedAlertType = ['PRICE_DROP', 'BACK_IN_STOCK', 'BOTH'].includes(alertType)
      ? alertType
      : 'PRICE_DROP';

    let numericTarget = 0;
    if (resolvedAlertType !== 'BACK_IN_STOCK') {
      numericTarget = parseFloat(targetPrice);
      if (isNaN(numericTarget) || numericTarget <= 0) {
        return res.status(400).json({ success: false, message: 'Valid positive target price is required for price drop alerts' });
      }
    }

    const subscriberEmail = (email || req.user?.email || '').trim().toLowerCase();
    const subscriberPhone = (phone || req.user?.phone || '').trim();

    // Check communication channel requirements
    if (['EMAIL', 'BOTH', 'ALL'].includes(channel) && !subscriberEmail) {
      return res.status(400).json({ success: false, message: 'Valid email address is required for email alerts' });
    }
    if (['WHATSAPP', 'SMS', 'BOTH', 'ALL'].includes(channel) && !subscriberPhone) {
      return res.status(400).json({ success: false, message: 'Valid phone number is required for WhatsApp/SMS alerts' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const currentPrice = product.sellingPrice || product.price || 0;
    const initialStock = product.stock || 0;

    // Create or update existing subscription for this customer & product & alertType
    const query = {
      product: product._id,
      alertType: resolvedAlertType,
      ...(subscriberEmail ? { customerEmail: subscriberEmail } : { customerPhone: subscriberPhone }),
    };

    const update = {
      product: product._id,
      customer: req.user?._id || null,
      customerEmail: subscriberEmail,
      customerPhone: subscriberPhone,
      customerName: name || req.user?.name || 'Valued Shopper',
      alertType: resolvedAlertType,
      currentPrice,
      targetPrice: numericTarget,
      initialStock,
      channel,
      status: 'ACTIVE',
      alertedAt: null,
      alertedPrice: null,
      restockedUnits: null,
    };

    const alert = await PriceDropAlert.findOneAndUpdate(query, update, {
      upsert: true,
      new: true,
      runValidators: true,
    });

    // Send instant confirmation SMS if phone provided
    if (update.customerPhone && ['WHATSAPP', 'SMS', 'BOTH', 'ALL'].includes(channel)) {
      const confirmMsg = resolvedAlertType === 'BACK_IN_STOCK'
        ? `AuraMarket: Restock alert confirmed for "${product.title}"! We will notify you immediately via WhatsApp/SMS the moment new units arrive.`
        : `AuraMarket: Price drop alert confirmed for "${product.title}"! We will alert you immediately when price reaches ₹${numericTarget}.`;
      await smsService.sendSMS(update.customerPhone, confirmMsg).catch(() => {});
    }

    const successMsg = resolvedAlertType === 'BACK_IN_STOCK'
      ? `Back-in-stock alert registered! We will notify you via ${channel} as soon as this item is restocked.`
      : `Price drop alert set successfully! We will notify you when price reaches ₹${numericTarget}.`;

    res.status(201).json({
      success: true,
      message: successMsg,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Current Customer's Price Drop & Restock Alerts
// @route   GET /api/price-drop-alerts/my
// @access  Public (Optional Auth or Email/Phone query)
exports.getMyAlerts = async (req, res, next) => {
  try {
    const query = {};
    if (req.user?._id) {
      query.$or = [
        { customer: req.user._id },
        { customerEmail: req.user.email?.toLowerCase() },
        ...(req.user.phone ? [{ customerPhone: req.user.phone }] : []),
      ];
    } else if (req.query.email) {
      query.customerEmail = req.query.email.trim().toLowerCase();
    } else if (req.query.phone) {
      query.customerPhone = req.query.phone.trim();
    } else {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const alerts = await PriceDropAlert.find(query)
      .populate('product', 'title image images sellingPrice price mrp stock')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel Product Alert
// @route   DELETE /api/price-drop-alerts/:id
// @access  Private / Public
exports.deleteAlert = async (req, res, next) => {
  try {
    const alert = await PriceDropAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    alert.status = 'CANCELLED';
    await alert.save();

    res.status(200).json({
      success: true,
      message: 'Alert cancelled successfully',
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Simulate Price Drop & Trigger Alerts (Point 15)
// @route   POST /api/price-drop-alerts/simulate
// @access  Public / Admin
exports.simulatePriceDrop = async (req, res, next) => {
  try {
    const { productId, newPrice, oldPrice } = req.body;
    if (!productId || typeof newPrice !== 'number') {
      return res.status(400).json({ success: false, message: 'productId and numeric newPrice are required' });
    }

    const prod = await Product.findById(productId);
    if (!prod) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const prevPrice = typeof oldPrice === 'number' ? oldPrice : (prod.sellingPrice || prod.price);
    prod.sellingPrice = newPrice;
    await prod.save();

    const result = await checkAndTriggerPriceDropAlerts(productId, prevPrice, newPrice);

    res.status(200).json({
      success: true,
      message: `Triggered ${result.triggered} price drop alerts for new price ₹${newPrice}`,
      triggeredCount: result.triggered,
      data: result.alerts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Simulate Restock & Trigger Back-in-Stock Alerts (Point 15)
// @route   POST /api/price-drop-alerts/simulate-stock
// @access  Public / Admin
exports.simulateStockAlert = async (req, res, next) => {
  try {
    const { productId, newStock = 10, oldStock = 0 } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId is required' });
    }

    const prod = await Product.findById(productId);
    if (!prod) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const prevStock = typeof oldStock === 'number' ? oldStock : prod.stock;
    prod.stock = Number(newStock);
    await prod.save();

    const result = await checkAndTriggerStockAlerts(productId, prevStock, Number(newStock));

    res.status(200).json({
      success: true,
      message: `Triggered ${result.triggered} back-in-stock alerts for restocked ${newStock} units`,
      triggeredCount: result.triggered,
      data: result.alerts,
    });
  } catch (error) {
    next(error);
  }
};
