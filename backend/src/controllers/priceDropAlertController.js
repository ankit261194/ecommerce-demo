const PriceDropAlert = require('../models/PriceDropAlert');
const Product = require('../models/Product');
const smsService = require('../services/smsService');
const mailService = require('../services/mailService');

/**
 * Trigger alerts for subscribers when product price drops
 */
const checkAndTriggerPriceDropAlerts = async (productId, oldPrice, newPrice) => {
  try {
    if (newPrice >= oldPrice) return { triggered: 0, alerts: [] };

    const product = await Product.findById(productId);
    if (!product) return { triggered: 0, alerts: [] };

    // Find active subscribers whose targetPrice >= newPrice
    const alerts = await PriceDropAlert.find({
      product: productId,
      status: 'ACTIVE',
      targetPrice: { $gte: newPrice },
    });

    if (alerts.length === 0) return { triggered: 0, alerts: [] };

    const triggeredList = [];
    const siteUrl = 'https://shribalajikripadham.online/ecommerce-demo/';

    for (const alert of alerts) {
      alert.status = 'ALERTED';
      alert.alertedAt = new Date();
      alert.alertedPrice = newPrice;
      await alert.save();
      triggeredList.push(alert);

      // 1. Send Email Notification if requested
      if (['EMAIL', 'BOTH'].includes(alert.channel) && alert.customerEmail) {
        await mailService.sendEmail(
          alert.customerEmail,
          `🎉 Price Drop Alert: ${product.title} is now ₹${newPrice}!`,
          `Hi ${alert.customerName},\n\nGreat news! The product "${product.title}" has dropped in price to ₹${newPrice} (was ₹${oldPrice}), reaching your target price of ₹${alert.targetPrice}.\n\nBuy now before stock runs out: ${siteUrl}`
        );
      }

      // 2. Send SMS / WhatsApp Notification if requested and phone exists
      if (['WHATSAPP', 'BOTH'].includes(alert.channel) && alert.customerPhone) {
        await smsService.sendSMS(
          alert.customerPhone,
          `AuraMarket Price Drop! ${product.title} dropped to ₹${newPrice} (was ₹${oldPrice}). Your target ₹${alert.targetPrice} met! Order now: ${siteUrl}`
        );
      }
    }

    return { triggered: triggeredList.length, alerts: triggeredList };
  } catch (err) {
    console.error('[PriceDropAlert] Error triggering alerts:', err);
    return { triggered: 0, error: err.message };
  }
};

exports.checkAndTriggerPriceDropAlerts = checkAndTriggerPriceDropAlerts;

// @desc    Subscribe to Price Drop Alert (Point 6)
// @route   POST /api/price-drop-alerts
// @access  Public / Customer
exports.subscribePriceDrop = async (req, res, next) => {
  try {
    const { productId, targetPrice, email, phone, name, channel = 'BOTH' } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const numericTarget = parseFloat(targetPrice);
    if (isNaN(numericTarget) || numericTarget <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive target price is required' });
    }

    const subscriberEmail = (email || req.user?.email || '').trim().toLowerCase();
    if (!subscriberEmail || !subscriberEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email address is required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const currentPrice = product.sellingPrice || product.price || 0;

    // Create or update existing subscription for this customer & product
    const query = {
      product: product._id,
      customerEmail: subscriberEmail,
    };

    const update = {
      product: product._id,
      customer: req.user?._id || null,
      customerEmail: subscriberEmail,
      customerPhone: phone || req.user?.phone || '',
      customerName: name || req.user?.name || 'Valued Shopper',
      currentPrice,
      targetPrice: numericTarget,
      channel,
      status: 'ACTIVE',
      alertedAt: null,
      alertedPrice: null,
    };

    const alert = await PriceDropAlert.findOneAndUpdate(query, update, {
      upsert: true,
      new: true,
      runValidators: true,
    });

    // Send instant confirmation SMS if phone provided
    if (update.customerPhone) {
      await smsService.sendSMS(
        update.customerPhone,
        `AuraMarket: Price drop alert set for ${product.title}! We will alert you immediately when price drops below ₹${numericTarget}.`
      );
    }

    res.status(201).json({
      success: true,
      message: `Price drop alert set successfully! We will notify you when price reaches ₹${numericTarget}.`,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Current Customer's Price Drop Alerts
// @route   GET /api/price-drop-alerts/my
// @access  Public (Optional Auth or Email query)
exports.getMyAlerts = async (req, res, next) => {
  try {
    const query = {};
    if (req.user?._id) {
      query.$or = [{ customer: req.user._id }, { customerEmail: req.user.email?.toLowerCase() }];
    } else if (req.query.email) {
      query.customerEmail = req.query.email.trim().toLowerCase();
    } else {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const alerts = await PriceDropAlert.find(query)
      .populate('product', 'title image images sellingPrice price mrp')
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

// @desc    Cancel Price Drop Alert
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
      message: 'Price drop alert cancelled successfully',
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Simulate Price Drop & Trigger Alerts (For tests & admin simulation)
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
    
    // Update product price
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
