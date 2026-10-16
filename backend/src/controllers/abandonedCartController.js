const AbandonedCart = require('../models/AbandonedCart');
const Coupon = require('../models/Coupon');
const UIConfig = require('../models/UIConfig');
const smsService = require('../services/smsService');
const mailService = require('../services/mailService');
const { recordAuditLog } = require('../utils/auditLogger');
const mongoose = require('mongoose');
const crypto = require('crypto');

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
  } else {
    // If coupon exists but is inactive or expired, revitalize it for recovery
    if (!coupon.isActive || (coupon.expiryDate && coupon.expiryDate < new Date())) {
      coupon.isActive = true;
      coupon.expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await coupon.save();
    }
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

    // Check if an existing open abandoned cart exists for this customer email or authenticated user
    let cart = await AbandonedCart.findOne({
      $or: [
        { customerEmail: cleanEmail },
        ...(req.user?._id ? [{ user: req.user._id }] : []),
      ],
      status: { $in: ['ABANDONED', 'REMINDER_SENT'] },
    });

    if (cart) {
      cart.items = formattedItems;
      cart.cartTotal = calculatedTotal;
      if (customerName) cart.customerName = customerName;
      if (customerPhone) cart.customerPhone = customerPhone;
      if (req.user?._id) cart.user = req.user._id;
      if (!cart.recoveryToken) {
        cart.recoveryToken = `rec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      }
      cart.abandonedAt = new Date();
      await cart.save();
    } else {
      const recoveryToken = `rec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      cart = await AbandonedCart.create({
        user: req.user?._id || null,
        customerName: customerName || 'Valued Customer',
        customerEmail: cleanEmail,
        customerPhone: customerPhone || '',
        items: formattedItems,
        cartTotal: calculatedTotal,
        status: 'ABANDONED',
        recoveryToken,
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

// @desc    Generate 1-Click WhatsApp Direct Cart Recovery Link with Auto-Checkout & Discount (Point #21)
// @route   POST /api/abandoned-carts/admin/:id/whatsapp-link
// @access  Private (Super Admin / Vendor)
exports.generateWhatsAppRecoveryLink = async (req, res, next) => {
  try {
    const { couponCode = 'RECOVER10', customNote = '' } = req.body;

    const cart = await AbandonedCart.findById(req.params.id);
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Abandoned cart record not found',
      });
    }

    // Generate or maintain unique recovery token
    if (!cart.recoveryToken) {
      cart.recoveryToken = `rec_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    }

    // Ensure active recovery discount voucher exists in DB
    const activeCouponCode = await ensureRecoveryCoupon(couponCode, 10);
    cart.recoveryCoupon = activeCouponCode;

    // Direct auto-checkout link with pre-filled recovery token
    const demoBaseUrl = process.env.DEMO_URL || 'https://shribalajikripadham.online/ecommerce-demo';
    const checkoutLink = `${demoBaseUrl}/#recover-cart?token=${cart.recoveryToken}`;

    // Format clean phone number
    let cleanPhone = (cart.customerPhone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const itemsSummary = cart.items
      .map((i) => `${i.quantity}x ${i.title}`)
      .slice(0, 2)
      .join(', ');

    // Personalized high-converting bilingual WhatsApp message
    const messageLines = [
      `🛒 *AuraMarket Cart Recovery Alert*`,
      ``,
      `Namaste *${cart.customerName}*! Aapke cart me *${cart.items.length} items* (${itemsSummary}...) total ₹${cart.cartTotal.toLocaleString('en-IN')} aapka wait kar rahe hain.`,
      ``,
      `🎁 *Special Privilege Offer:* Humne aapke liye exclusive coupon *${activeCouponCode}* activate kar diya hai! Isse aapko instant extra 10% discount milega.`,
      customNote ? `💬 Note: ${customNote}` : null,
      ``,
      `👉 *1-Click Direct Auto-Checkout Link:*`,
      `${checkoutLink}`,
      ``,
      `⚡ *Note:* Yeh exclusive link aur discount agle 24 ghante tak valid hai. Instant safe & secure checkout!`,
    ].filter(Boolean);

    const messageText = messageLines.join('\n');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

    // Update cart telemetry
    cart.whatsappSentCount = (cart.whatsappSentCount || 0) + 1;
    cart.lastWhatsappSentAt = new Date();
    cart.status = 'REMINDER_SENT';
    await cart.save();

    res.status(200).json({
      success: true,
      message: '1-Click WhatsApp direct cart recovery link generated successfully!',
      whatsappUrl,
      messageText,
      recoveryToken: cart.recoveryToken,
      checkoutLink,
      couponCode: activeCouponCode,
      cart: {
        _id: cart._id,
        customerName: cart.customerName,
        customerPhone: cart.customerPhone,
        cartTotal: cart.cartTotal,
        itemsCount: cart.items.length,
        status: cart.status,
        whatsappSentCount: cart.whatsappSentCount,
        lastWhatsappSentAt: cart.lastWhatsappSentAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Abandoned Cart by Recovery Token for Auto-Restoration (Point #21)
// @route   GET /api/abandoned-carts/recover/:token
// @access  Public / Guest
exports.getCartByRecoveryToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Recovery token is required',
      });
    }

    const cart = await AbandonedCart.findOne({ recoveryToken: token.trim() });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired cart recovery token',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Abandoned cart successfully retrieved for 1-click checkout recovery',
      cart: {
        _id: cart._id,
        customerName: cart.customerName,
        customerEmail: cart.customerEmail,
        customerPhone: cart.customerPhone,
        items: cart.items,
        cartTotal: cart.cartTotal,
        recoveryCoupon: cart.recoveryCoupon || 'RECOVER10',
        recoveryToken: cart.recoveryToken,
        status: cart.status,
      },
      autoApplyCoupon: cart.recoveryCoupon || 'RECOVER10',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete Cart Recovery via Auto-Checkout (Point #21)
// @route   POST /api/abandoned-carts/recover/:token/complete
// @access  Public / Authenticated
exports.completeCartRecovery = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { orderId } = req.body;

    const cart = await AbandonedCart.findOne({ recoveryToken: token });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Recovery cart record not found',
      });
    }

    cart.status = 'RECOVERED';
    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      cart.recoveredOrder = orderId;
    }
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart marked as successfully recovered via WhatsApp 1-Click checkout!',
      cartId: cart._id,
      status: cart.status,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// Point 13: Customer Abandoned Cart Automated Recovery Sequences
// =========================================================================

// Helper: Generate dynamic single-use recovery coupon
const generateDynamicRecoveryVoucher = async (cart, discountPct = 15) => {
  const tokenSnippet = cart.recoveryToken
    ? cart.recoveryToken.slice(-6).toUpperCase()
    : crypto.randomBytes(3).toString('hex').toUpperCase();
  const code = `CART${discountPct}_${tokenSnippet}`;

  let coupon = await Coupon.findOne({ code });
  if (!coupon) {
    coupon = await Coupon.create({
      code,
      title: `Cart Recovery Exclusive (${discountPct}% OFF)`,
      description: `Exclusive single-use dynamic incentive for ${cart.customerName}`,
      discountType: 'PERCENTAGE',
      discountValue: discountPct,
      maxDiscountAmount: 1000,
      minOrderAmount: Math.max(0, Math.round(cart.cartTotal * 0.5)),
      usageLimit: 1,
      perUserLimit: 1,
      isActive: true,
      expiryDate: new Date(Date.now() + 48 * 3600 * 1000), // 48 hours validity
    });
  }
  return code;
};

// @desc    Execute Automated Recovery Sequence Scheduler (1-hour, 24-hour, 72-hour nudges)
// @route   POST /api/abandoned-carts/run-scheduler
// @access  Private (Super Admin / Cron)
exports.runRecoveryScheduler = async (req, res, next) => {
  try {
    const { forceStage } = req.body || {}; // For testing or on-demand execution
    const now = Date.now();

    const activeCarts = await AbandonedCart.find({
      status: { $in: ['ABANDONED', 'REMINDER_SENT'] },
    });

    let stage1Count = 0;
    let stage2Count = 0;
    let stage3Count = 0;

    for (const cart of activeCarts) {
      const elapsedMs = now - new Date(cart.abandonedAt).getTime();
      const elapsedHours = elapsedMs / (3600 * 1000);

      // Sequence 1: 1-Hour Gentle Nudge (Email / SMS)
      if (cart.sequenceStage === 0 && (elapsedHours >= 1 || forceStage === 1)) {
        if (!cart.recoveryToken) {
          cart.recoveryToken = `rec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        }
        const demoBaseUrl = process.env.DEMO_URL || 'https://shribalajikripadham.online/ecommerce-demo';
        const restoreLink = `${demoBaseUrl}/#recover-cart?token=${cart.recoveryToken}`;

        await mailService.sendMail({
          to: cart.customerEmail,
          subject: `Did you forget something, ${cart.customerName}? Your AuraMarket cart is waiting!`,
          text: `Hi ${cart.customerName}, you left items in your cart! Complete your order here: ${restoreLink}`,
          html: `<p>Hi ${cart.customerName}, your cart totaling ₹${cart.cartTotal} is reserved for you. <a href="${restoreLink}">Click here to restore your cart</a></p>`,
        });

        cart.sequenceStage = 1;
        cart.status = 'REMINDER_SENT';
        cart.reminderCount = (cart.reminderCount || 0) + 1;
        cart.lastReminderSentAt = new Date();
        cart.recoveryLogs.push({
          stage: 1,
          channel: 'EMAIL',
          dispatchedAt: new Date(),
          recipient: cart.customerEmail,
          couponOffered: cart.recoveryCoupon || 'RECOVER10',
          status: 'DELIVERED',
        });
        await cart.save();
        stage1Count++;
      }
      // Sequence 2: 24-Hour Dynamic Incentive (15% Dynamic Voucher + WhatsApp/Email)
      else if (cart.sequenceStage === 1 && (elapsedHours >= 24 || forceStage === 2)) {
        const dynCoupon = await generateDynamicRecoveryVoucher(cart, 15);
        const demoBaseUrl = process.env.DEMO_URL || 'https://shribalajikripadham.online/ecommerce-demo';
        const restoreLink = `${demoBaseUrl}/#recover-cart?token=${cart.recoveryToken}&coupon=${dynCoupon}`;

        await mailService.sendMail({
          to: cart.customerEmail,
          subject: `🎁 15% OFF Voucher: Complete your cart now, ${cart.customerName}!`,
          text: `Hi ${cart.customerName}, take an extra 15% off with code ${dynCoupon}: ${restoreLink}`,
          html: `<p>Special recovery deal! Use exclusive code <strong>${dynCoupon}</strong> to get 15% OFF: <a href="${restoreLink}">Complete Checkout</a></p>`,
        });

        if (cart.customerPhone) {
          await smsService.sendSMS({
            to: cart.customerPhone,
            message: `AuraMarket: Hi ${cart.customerName}, 15% OFF voucher ${dynCoupon} unlocked for your cart: ${restoreLink}`,
          });
        }

        cart.sequenceStage = 2;
        cart.dynamicCoupon = dynCoupon;
        cart.recoveryCoupon = dynCoupon;
        cart.reminderCount = (cart.reminderCount || 0) + 1;
        cart.lastReminderSentAt = new Date();
        cart.recoveryLogs.push({
          stage: 2,
          channel: 'EMAIL',
          dispatchedAt: new Date(),
          recipient: cart.customerEmail,
          couponOffered: dynCoupon,
          status: 'DELIVERED',
        });
        await cart.save();
        stage2Count++;
      }
      // Sequence 3: 72-Hour Final Warning (Last Chance Nudge)
      else if (cart.sequenceStage === 2 && (elapsedHours >= 72 || forceStage === 3)) {
        if (cart.customerPhone) {
          await smsService.sendSMS({
            to: cart.customerPhone,
            message: `AuraMarket: Last call! Reserved items in your cart will be released back to inventory today: https://shribalajikripadham.online/ecommerce-demo/`,
          });
        }

        cart.sequenceStage = 3;
        cart.reminderCount = (cart.reminderCount || 0) + 1;
        cart.lastReminderSentAt = new Date();
        cart.recoveryLogs.push({
          stage: 3,
          channel: 'SMS',
          dispatchedAt: new Date(),
          recipient: cart.customerPhone || cart.customerEmail,
          couponOffered: cart.recoveryCoupon,
          status: 'DELIVERED',
        });
        await cart.save();
        stage3Count++;
      }
    }

    await recordAuditLog({
      action: 'ABANDONED_CART_SCHEDULER_RUN',
      module: 'MARKETING',
      req,
      description: `Automated cart recovery scheduler executed: ${stage1Count} stage-1, ${stage2Count} stage-2, ${stage3Count} stage-3 nudges dispatched`,
      details: {
        totalEvaluated: activeCarts.length,
        stage1Count,
        stage2Count,
        stage3Count,
      },
      severity: 'LOW',
    });

    res.status(200).json({
      success: true,
      message: 'Automated cart recovery sequence scheduler executed successfully',
      telemetry: {
        totalEvaluated: activeCarts.length,
        stage1Count,
        stage2Count,
        stage3Count,
        totalDispatched: stage1Count + stage2Count + stage3Count,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Exit-Intent Popup Configuration
// @route   GET /api/abandoned-carts/exit-intent-config
// @access  Public
exports.getExitIntentConfig = async (req, res, next) => {
  try {
    let config = await UIConfig.findOne();
    if (!config) {
      config = await UIConfig.create({});
    }

    const exitIntent = config.exitIntentConfig || {
      enabled: true,
      headline: "Wait! Don't leave your cart empty",
      subheadline: 'Take an instant extra 10% OFF before you go',
      discountPercentage: 10,
      couponCode: 'SAVE10NOW',
      countdownSeconds: 900,
    };

    // Ensure coupon exists in DB
    await ensureRecoveryCoupon(exitIntent.couponCode, exitIntent.discountPercentage);

    res.status(200).json({
      success: true,
      exitIntent,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Exit-Intent Popup Configuration (Super Admin)
// @route   PUT /api/admin/abandoned-carts/exit-intent-config
// @access  Private (Super Admin)
exports.updateExitIntentConfig = async (req, res, next) => {
  try {
    let config = await UIConfig.findOne();
    if (!config) {
      config = await UIConfig.create({});
    }

    const {
      enabled,
      headline,
      subheadline,
      discountPercentage,
      couponCode,
      countdownSeconds,
    } = req.body;

    config.exitIntentConfig = config.exitIntentConfig || {};
    if (enabled !== undefined) config.exitIntentConfig.enabled = Boolean(enabled);
    if (headline) config.exitIntentConfig.headline = headline;
    if (subheadline !== undefined) config.exitIntentConfig.subheadline = subheadline;
    if (discountPercentage !== undefined) config.exitIntentConfig.discountPercentage = Number(discountPercentage);
    if (couponCode) config.exitIntentConfig.couponCode = couponCode.trim().toUpperCase();
    if (countdownSeconds !== undefined) config.exitIntentConfig.countdownSeconds = Number(countdownSeconds);

    await config.save();

    if (config.exitIntentConfig.couponCode) {
      await ensureRecoveryCoupon(
        config.exitIntentConfig.couponCode,
        config.exitIntentConfig.discountPercentage || 10
      );
    }

    await recordAuditLog({
      action: 'UPDATE_EXIT_INTENT_CONFIG',
      module: 'SETTINGS',
      req,
      description: 'Super Admin updated exit-intent cart recovery modal configuration',
      details: config.exitIntentConfig,
      severity: 'LOW',
    });

    res.status(200).json({
      success: true,
      message: 'Exit-intent popup configuration updated successfully',
      exitIntent: config.exitIntentConfig,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record Exit-Intent Interaction / Conversion Event
// @route   POST /api/abandoned-carts/exit-intent-event
// @access  Public
exports.recordExitIntentEvent = async (req, res, next) => {
  try {
    const { cartId, recoveryToken, event = 'TRIGGERED', couponCode = 'SAVE10NOW' } = req.body;

    let cart;
    if (cartId && mongoose.Types.ObjectId.isValid(cartId)) {
      cart = await AbandonedCart.findById(cartId);
    } else if (recoveryToken) {
      cart = await AbandonedCart.findOne({ recoveryToken });
    }

    if (cart) {
      if (event === 'TRIGGERED') {
        cart.exitIntentTriggered = true;
        cart.channelAttribution = 'EXIT_INTENT';
      } else if (event === 'CONVERTED') {
        cart.exitIntentConverted = true;
        cart.status = 'RECOVERED';
        cart.channelAttribution = 'EXIT_INTENT';
      }
      cart.recoveryCoupon = couponCode;
      await cart.save();
    }

    res.status(200).json({
      success: true,
      message: `Exit-intent ${event.toLowerCase()} recorded successfully`,
      attributed: !!cart,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Comprehensive Abandoned Revenue Analytics Dashboard (Super Admin)
// @route   GET /api/admin/abandoned-carts/analytics
// @access  Private (Super Admin)
exports.getAbandonedRevenueAnalytics = async (req, res, next) => {
  try {
    const allCarts = await AbandonedCart.find();

    const totalCartsCount = allCarts.length;
    const recoveredCarts = allCarts.filter((c) => c.status === 'RECOVERED');
    const recoveredCount = recoveredCarts.length;
    const recoveryRate = totalCartsCount > 0 ? Math.round((recoveredCount / totalCartsCount) * 1000) / 10 : 0;

    const totalAbandonedRevenue = allCarts.reduce((acc, c) => acc + (c.cartTotal || 0), 0);
    const totalRecoveredRevenue = recoveredCarts.reduce((acc, c) => acc + (c.cartTotal || 0), 0);
    const potentialLostRevenue = totalAbandonedRevenue - totalRecoveredRevenue;

    // Channel Performance Attribution
    const channelAttribution = {
      EMAIL: { count: 0, revenue: 0 },
      WHATSAPP: { count: 0, revenue: 0 },
      SMS: { count: 0, revenue: 0 },
      EXIT_INTENT: { count: 0, revenue: 0 },
      DIRECT: { count: 0, revenue: 0 },
      NONE: { count: 0, revenue: 0 },
    };

    recoveredCarts.forEach((c) => {
      const ch = c.channelAttribution || (c.whatsappSentCount > 0 ? 'WHATSAPP' : c.reminderCount > 0 ? 'EMAIL' : 'DIRECT');
      if (channelAttribution[ch]) {
        channelAttribution[ch].count++;
        channelAttribution[ch].revenue += c.cartTotal || 0;
      }
    });

    // Sequence Funnel Progression
    const sequenceFunnel = {
      uncontacted: allCarts.filter((c) => c.sequenceStage === 0 && c.status !== 'RECOVERED').length,
      stage1Sent: allCarts.filter((c) => c.sequenceStage >= 1).length,
      stage2Sent: allCarts.filter((c) => c.sequenceStage >= 2).length,
      stage3Sent: allCarts.filter((c) => c.sequenceStage >= 3).length,
      recovered: recoveredCount,
    };

    // Top Abandoned Products Ranking
    const productFrequencyMap = {};
    allCarts.forEach((c) => {
      (c.items || []).forEach((item) => {
        const key = item.title || 'Unknown Product';
        if (!productFrequencyMap[key]) {
          productFrequencyMap[key] = {
            title: key,
            quantity: 0,
            revenueLost: 0,
            timesAbandoned: 0,
            image: item.image || '',
          };
        }
        productFrequencyMap[key].quantity += item.quantity || 1;
        productFrequencyMap[key].revenueLost += (item.price || 0) * (item.quantity || 1);
        productFrequencyMap[key].timesAbandoned += 1;
      });
    });

    const topAbandonedProducts = Object.values(productFrequencyMap)
      .sort((a, b) => b.revenueLost - a.revenueLost)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      analytics: {
        totalCartsCount,
        recoveredCount,
        recoveryRate,
        totalAbandonedRevenue,
        totalRecoveredRevenue,
        potentialLostRevenue,
        channelAttribution,
        sequenceFunnel,
        topAbandonedProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

