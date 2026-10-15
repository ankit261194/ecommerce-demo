const AbandonedCart = require('../models/AbandonedCart');
const Coupon = require('../models/Coupon');
const smsService = require('../services/smsService');
const mailService = require('../services/mailService');
const mongoose = require('mongoose');

// @desc    Get All Abandoned Carts with Recovery Analytics for Super Admin
// @route   GET /api/admin/abandoned-carts
// @access  Private (Super Admin)
exports.getAdminAbandonedCarts = async (req, res, next) => {
  try {
    const { status, search } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.status = status.toUpperCase();
    }

    if (search && search.trim() !== '') {
      query.$or = [
        { customerName: { $regex: search.trim(), $options: 'i' } },
        { customerEmail: { $regex: search.trim(), $options: 'i' } },
        { customerPhone: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const carts = await AbandonedCart.find(query).sort({ abandonedAt: -1 });

    const totalCarts = await AbandonedCart.countDocuments();
    const recoveredCarts = await AbandonedCart.countDocuments({ status: 'RECOVERED' });
    const remindersSent = await AbandonedCart.countDocuments({ reminderCount: { $gt: 0 } });

    // Calculate potential recoverable revenue from non-recovered carts
    const nonRecovered = await AbandonedCart.find({ status: { $ne: 'RECOVERED' } });
    const potentialRevenue = nonRecovered.reduce((acc, c) => acc + (c.cartTotal || 0), 0);

    const recoveredItems = await AbandonedCart.find({ status: 'RECOVERED' });
    const recoveredRevenue = recoveredItems.reduce((acc, c) => acc + (c.cartTotal || 0), 0);

    const recoveryRate =
      totalCarts > 0 ? Math.round((recoveredCarts / totalCarts) * 100) : 0;

    res.status(200).json({
      success: true,
      count: carts.length,
      stats: {
        total: totalCarts,
        potentialRevenue,
        recoveredRevenue,
        recovered: recoveredCarts,
        remindersSent,
        recoveryRate,
      },
      data: carts,
    });
  } catch (error) {
    next(error);
  }
};

// Helper: Ensure recovery discount coupon exists in database
const ensureRecoveryCoupon = async (code = 'RECOVER10', discountValue = 10) => {
  const cleanCode = (code || 'RECOVER10').trim().toUpperCase();
  let coupon = await Coupon.findOne({ code: cleanCode });
  if (!coupon) {
    try {
      coupon = await Coupon.create({
        code: cleanCode,
        title: 'Abandoned Cart Recovery Discount',
        description: `Special ${discountValue}% off voucher to complete your checkout!`,
        discountType: 'PERCENTAGE',
        discountValue,
        maxDiscountAmount: 500,
        minOrderAmount: 299,
        isActive: true,
        isFeatured: false,
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    } catch (_) {}
  }
  return cleanCode;
};

// @desc    1-Click Send Auto-Recovery Reminder (Email + SMS)
// @route   POST /api/admin/abandoned-carts/:id/send-reminder
// @access  Private (Super Admin)
exports.sendCartReminder = async (req, res, next) => {
  try {
    const { couponCode = 'RECOVER10', customMessage } = req.body;

    const cart = await AbandonedCart.findById(req.params.id);
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Abandoned cart record not found',
      });
    }

    const activeCouponCode = await ensureRecoveryCoupon(couponCode, 10);

    const itemsSummary = cart.items
      .map((i) => `${i.quantity}x ${i.title}`)
      .slice(0, 3)
      .join(', ');

    const emailSubject = `🛒 Don't miss out on your cart, ${cart.customerName}! Extra 10% OFF inside`;
    const messageBody =
      customMessage ||
      `Hi ${cart.customerName}, you left ${cart.items.length} item(s) in your cart (${itemsSummary}) totaling ₹${cart.cartTotal.toLocaleString('en-IN')}. Complete your order today and use promo code "${activeCouponCode}" at checkout for an instant discount!`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #0f172a;">You left something behind at AuraMarket!</h2>
        <p>Hi <strong>${cart.customerName}</strong>,</p>
        <p>${messageBody}</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #334155;">Items in your cart:</h4>
          <ul style="padding-left: 20px; color: #475569;">
            ${cart.items.map((i) => `<li><strong>${i.title}</strong> (Qty: ${i.quantity}) — ₹${i.price.toLocaleString('en-IN')}</li>`).join('')}
          </ul>
          <p style="font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 0;">Cart Total: ₹${cart.cartTotal.toLocaleString('en-IN')}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://shribalajikripadham.online/ecommerce-demo/" style="background-color: #f59e0b; color: #0f172a; font-weight: bold; padding: 14px 28px; text-decoration: none; border-radius: 12px; display: inline-block;">Complete Checkout Now</a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Use recovery coupon <strong>${activeCouponCode}</strong> at checkout for bonus savings.</p>
      </div>
    `;

    // 1. Dispatch Email notification
    const emailRes = await mailService.sendMail({
      to: cart.customerEmail,
      subject: emailSubject,
      text: messageBody,
      html: emailHtml,
    });

    // 2. Dispatch SMS notification if phone is available
    let smsRes = { success: false, skipped: true };
    if (cart.customerPhone) {
      smsRes = await smsService.sendSMS({
        to: cart.customerPhone,
        message: `AuraMarket: Hi ${cart.customerName}, your cart with ₹${cart.cartTotal} in items is waiting! Use code ${activeCouponCode} for extra savings: https://shribalajikripadham.online/ecommerce-demo/`,
      });
    }

    // Update cart record
    cart.reminderCount += 1;
    cart.lastReminderSentAt = new Date();
    cart.status = 'REMINDER_SENT';
    cart.recoveryCoupon = activeCouponCode;
    await cart.save();

    res.status(200).json({
      success: true,
      message: `Recovery reminder dispatched to ${cart.customerEmail} and SMS dispatched!`,
      data: cart,
      emailSent: emailRes?.success || false,
      smsSent: smsRes?.success || false,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk Dispatch Recovery Reminders to all pending abandoned carts
// @route   POST /api/admin/abandoned-carts/bulk-reminder
// @access  Private (Super Admin)
exports.sendBulkReminders = async (req, res, next) => {
  try {
    const { couponCode = 'RECOVER10' } = req.body;
    const activeCouponCode = await ensureRecoveryCoupon(couponCode, 10);

    const pendingCarts = await AbandonedCart.find({
      status: { $in: ['ABANDONED', 'REMINDER_SENT'] },
      reminderCount: { $lt: 3 },
    });

    let sentCount = 0;
    for (const cart of pendingCarts) {
      try {
        await mailService.sendMail({
          to: cart.customerEmail,
          subject: `🛒 Complete your AuraMarket order, ${cart.customerName}! Extra 10% OFF`,
          text: `Hi ${cart.customerName}, finish your checkout for ₹${cart.cartTotal} with code ${activeCouponCode}!`,
          html: `<p>Hi ${cart.customerName}, complete your order totaling ₹${cart.cartTotal} with code ${activeCouponCode}!</p>`,
        });

        if (cart.customerPhone) {
          await smsService.sendSMS({
            to: cart.customerPhone,
            message: `AuraMarket: Hi ${cart.customerName}, finish your checkout for ₹${cart.cartTotal} with code ${activeCouponCode}!`,
          });
        }

        cart.reminderCount += 1;
        cart.lastReminderSentAt = new Date();
        cart.status = 'REMINDER_SENT';
        cart.recoveryCoupon = activeCouponCode;
        await cart.save();
        sentCount += 1;
      } catch (sendErr) {
        console.warn(`Failed sending reminder to cart ${cart._id}:`, sendErr);
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk recovery reminders dispatched to ${sentCount} customers!`,
      count: sentCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Storefront Cart Sync / Tracking
// @route   POST /api/abandoned-carts/sync
// @access  Public / Customer
exports.syncCartSession = async (req, res, next) => {
  try {
    const { customerName, customerEmail, customerPhone, items = [], cartTotal = 0 } = req.body;

    if (!customerEmail || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer email and at least one item are required to sync cart session',
      });
    }

    const cleanEmail = customerEmail.trim().toLowerCase();

    const formattedItems = items.map((item) => ({
      product: mongoose.Types.ObjectId.isValid(item.product || item.productId)
        ? (item.product || item.productId)
        : undefined,
      productId: String(item.productId || item.product || ''),
      title: item.title || 'Cart Item',
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
      image: item.image || '',
      variant: item.variant || item.variantName || '',
    }));

    const calculatedTotal =
      Number(cartTotal) > 0
        ? Number(cartTotal)
        : formattedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);

    // Check if an existing open abandoned cart exists for this customer email
    let cart = await AbandonedCart.findOne({
      customerEmail: cleanEmail,
      status: { $in: ['ABANDONED', 'REMINDER_SENT'] },
    });

    if (cart) {
      cart.items = formattedItems;
      cart.cartTotal = calculatedTotal;
      if (customerName) cart.customerName = customerName;
      if (customerPhone) cart.customerPhone = customerPhone;
      cart.abandonedAt = new Date();
      await cart.save();
    } else {
      cart = await AbandonedCart.create({
        customerName: customerName || 'Valued Customer',
        customerEmail: cleanEmail,
        customerPhone: customerPhone || '',
        items: formattedItems,
        cartTotal: calculatedTotal,
        status: 'ABANDONED',
        abandonedAt: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark Abandoned Cart as Recovered
// @route   POST /api/admin/abandoned-carts/:id/mark-recovered
// @access  Private (Super Admin)
exports.markCartRecovered = async (req, res, next) => {
  try {
    const cart = await AbandonedCart.findById(req.params.id);
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    cart.status = 'RECOVERED';
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart marked as successfully recovered!',
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Abandoned Cart
// @route   DELETE /api/admin/abandoned-carts/:id
// @access  Private (Super Admin)
exports.deleteAbandonedCart = async (req, res, next) => {
  try {
    const cart = await AbandonedCart.findByIdAndDelete(req.params.id);
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Abandoned cart record removed',
      deletedId: req.params.id,
    });
  } catch (error) {
    next(error);
  }
};
