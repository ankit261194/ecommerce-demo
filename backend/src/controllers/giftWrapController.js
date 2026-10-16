const GiftWrapConfig = require('../models/GiftWrapConfig');
const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');

const getDefaultConfigData = () => {
  return {
    isEnabled: true,
    basePrice: 49,
    freeThreshold: 1999,
    allowHidePrice: true,
    maxMessageLength: 250,
    designs: [
      {
        id: 'wrap-gold',
        name: 'Royal Gold Velvet',
        price: 49,
        color: '#f59e0b',
        previewImage: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&q=80',
        isActive: true,
      },
      {
        id: 'wrap-ruby',
        name: 'Festive Celebration Ruby',
        price: 49,
        color: '#ef4444',
        previewImage: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=300&q=80',
        isActive: true,
      },
      {
        id: 'wrap-midnight',
        name: 'Midnight Stars Sapphire',
        price: 59,
        color: '#1e3a8a',
        previewImage: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=300&q=80',
        isActive: true,
      },
      {
        id: 'wrap-eco',
        name: 'Eco-Friendly Botanical Kraft',
        price: 39,
        color: '#15803d',
        previewImage: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=300&q=80',
        isActive: true,
      },
    ],
    cardThemes: [
      {
        theme: 'Birthday',
        icon: '🎂',
        defaultMessage: 'Wishing you a very Happy Birthday! May all your dreams and wishes come true.',
        isActive: true,
      },
      {
        theme: 'Anniversary',
        icon: '💍',
        defaultMessage: 'Happy Anniversary! Celebrating your wonderful journey of love and togetherness.',
        isActive: true,
      },
      {
        theme: 'Festive / Diwali',
        icon: '🪔',
        defaultMessage: 'Warm festive greetings! Wishing you and your family prosperity, light, and boundless happiness.',
        isActive: true,
      },
      {
        theme: 'Congratulations',
        icon: '🎉',
        defaultMessage: 'Heartiest congratulations on your remarkable success! So proud of your achievement.',
        isActive: true,
      },
      {
        theme: 'Thank You',
        icon: '💐',
        defaultMessage: 'A heartfelt thank you for your warmth, generosity, and wonderful support.',
        isActive: true,
      },
      {
        theme: 'Best Wishes',
        icon: '✨',
        defaultMessage: 'Sending you my warmest thoughts and very best wishes for all your future endeavors.',
        isActive: true,
      },
    ],
  };
};

/**
 * Fetch or seed default GiftWrapConfig document
 */
const getOrSeedGiftConfig = async () => {
  let config = await GiftWrapConfig.findOne();
  if (!config) {
    config = await GiftWrapConfig.create(getDefaultConfigData());
  }
  return config;
};

/**
 * Helper to escape HTML characters
 */
const escapeHtml = (unsafe) => {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * GET /api/gift-wrap/config
 * Public storefront configuration for Gift Wrapping and Greeting Cards
 */
exports.getGiftWrapConfig = async (req, res) => {
  try {
    const config = await getOrSeedGiftConfig();
    return res.status(200).json({
      success: true,
      data: {
        isEnabled: config.isEnabled,
        basePrice: config.basePrice,
        freeThreshold: config.freeThreshold,
        allowHidePrice: config.allowHidePrice,
        maxMessageLength: config.maxMessageLength,
        designs: (config.designs || []).filter((d) => d.isActive),
        cardThemes: (config.cardThemes || []).filter((t) => t.isActive),
      },
    });
  } catch (error) {
    console.error('Error in getGiftWrapConfig:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/gift-wrap/admin/config
 * Super Admin get full GiftWrap configuration
 */
exports.getAdminConfig = async (req, res) => {
  try {
    const config = await getOrSeedGiftConfig();
    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error in getAdminConfig:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/gift-wrap/admin/config
 * Super Admin update GiftWrap configuration with immutable AuditLog
 */
exports.updateAdminConfig = async (req, res) => {
  try {
    const {
      isEnabled,
      basePrice,
      freeThreshold,
      allowHidePrice,
      maxMessageLength,
      designs,
      cardThemes,
    } = req.body;

    let config = await getOrSeedGiftConfig();

    const previousSnapshot = {
      isEnabled: config.isEnabled,
      basePrice: config.basePrice,
      freeThreshold: config.freeThreshold,
      designsCount: config.designs?.length || 0,
    };

    if (isEnabled !== undefined) config.isEnabled = isEnabled;
    if (basePrice !== undefined) config.basePrice = Number(basePrice);
    if (freeThreshold !== undefined) config.freeThreshold = Number(freeThreshold);
    if (allowHidePrice !== undefined) config.allowHidePrice = allowHidePrice;
    if (maxMessageLength !== undefined) config.maxMessageLength = Number(maxMessageLength);
    if (Array.isArray(designs)) config.designs = designs;
    if (Array.isArray(cardThemes)) config.cardThemes = cardThemes;

    config.updatedBy = req.user?._id;
    await config.save();

    // Log to immutable AuditLog
    await AuditLog.create({
      action: 'UPDATE_SETTINGS',
      module: 'SETTINGS',
      targetId: config._id.toString(),
      targetType: 'GiftWrapConfig',
      description: `Super Admin updated Gift Wrap & Greeting Card rules (Price: ₹${config.basePrice}, Free threshold: ₹${config.freeThreshold})`,
      changeSummary: `Updated base wrap price to ₹${config.basePrice}`,
      details: {
        previous: previousSnapshot,
        updated: {
          isEnabled: config.isEnabled,
          basePrice: config.basePrice,
          freeThreshold: config.freeThreshold,
          designsCount: config.designs?.length || 0,
        },
      },
      performedBy: req.user?._id,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    });

    return res.status(200).json({
      success: true,
      message: 'Gift Wrap & Greeting Card settings successfully updated.',
      data: config,
    });
  } catch (error) {
    console.error('Error in updateAdminConfig:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/gift-wrap/orders/:id/gift-slip
 * Generates a high-quality, printable 4x6 / postcard size gift slip
 */
exports.generateGiftSlip = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate('customer', 'name email');

    if (!order) {
      return res.status(404).send('Order not found.');
    }

    // Role check: customer must own order or be admin/vendor
    const isOwner = order.customer?._id?.toString() === req.user?._id?.toString();
    const isAdmin = ['superadmin', 'admin', 'vendor', 'vendor_staff'].includes(req.user?.role);
    if (!isOwner && !isAdmin) {
      return res.status(403).send('Not authorized to access gift slip for this order.');
    }

    const gift = order.giftWrap || {};
    const recipient = gift.recipientName || order.shippingAddress?.recipientName || 'Valued Friend';
    const sender = gift.senderName || order.customer?.name || 'A Special Friend';
    const message = gift.message || 'Wishing you joy and wonderful moments!';
    const theme = gift.cardTheme || 'Best Wishes';
    const wrap = gift.wrapName || 'Designer Gift Wrap';
    const hidePrice = gift.hideInvoicePrice !== false;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Gift Packing Slip - Order #${order._id.toString().slice(-8).toUpperCase()}</title>
  <style>
    @page {
      size: 4in 6in;
      margin: 0.25in;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Georgia", serif;
      margin: 0;
      padding: 16px;
      background: #fdfbf7;
      color: #1e293b;
    }
    .gift-card {
      border: 2px dashed #f59e0b;
      border-radius: 16px;
      padding: 20px;
      background: #ffffff;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      position: relative;
    }
    .header {
      text-align: center;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand {
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #f59e0b;
      margin-bottom: 4px;
    }
    .title {
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .greeting-badge {
      display: inline-block;
      margin-top: 6px;
      background: #fef3c7;
      color: #92400e;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .names {
      margin-bottom: 16px;
    }
    .to-from {
      font-size: 13px;
      line-height: 1.6;
    }
    .to-from strong {
      color: #0f172a;
    }
    .message-box {
      background: #fffbeb;
      border-left: 3px solid #f59e0b;
      padding: 14px 16px;
      border-radius: 8px;
      margin: 16px 0;
      font-style: italic;
      font-size: 14px;
      line-height: 1.6;
      color: #78350f;
    }
    .items-list {
      margin-top: 16px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
    }
    .items-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      padding: 4px 0;
      color: #334155;
    }
    .item-val {
      font-weight: 700;
      color: #10b981;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      border-top: 1px dashed #cbd5e1;
      padding-top: 12px;
      font-size: 10px;
      color: #94a3b8;
    }
    @media print {
      body { background: none; padding: 0; }
      .gift-card { box-shadow: none; border-color: #000; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 12px; text-align: right;">
    <button onclick="window.print()" style="background: #f59e0b; color: #0f172a; border: none; font-weight: 800; padding: 8px 16px; border-radius: 8px; cursor: pointer;">
      🖨️ Print Gift Slip
    </button>
  </div>

  <div class="gift-card">
    <div class="header">
      <div class="brand">AuraMarket Gift Delivery</div>
      <h1 class="title">🎁 A Special Gift For You!</h1>
      <div class="greeting-badge">${escapeHtml(theme)} Greeting</div>
    </div>

    <div class="names">
      <div class="to-from">
        Dearest: <strong>${escapeHtml(recipient)}</strong>
      </div>
      <div class="to-from">
        Sent with warmth by: <strong>${escapeHtml(sender)}</strong>
      </div>
    </div>

    <div class="message-box">
      &ldquo;${escapeHtml(message)}&rdquo;
    </div>

    <div class="items-list">
      <div class="items-title">Enclosed Gift Items (Packaged in ${escapeHtml(wrap)})</div>
      ${(order.items || [])
        .map(
          (item) => `
        <div class="item-row">
          <span>• ${escapeHtml(item.title)} &times; ${item.quantity || 1}</span>
          <span class="item-val">${hidePrice ? '★ Gift Item - Value Protected' : `₹${(item.price || 0) * (item.quantity || 1)}`}</span>
        </div>
      `
        )
        .join('')}
    </div>

    <div class="footer">
      Order Ref: #${order._id.toString().slice(-8).toUpperCase()} • Delivered with care by AuraMarket Logistics<br>
      ${hidePrice ? 'Price information intentionally omitted for gift presentation.' : ''}
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Error generating gift slip:', error);
    return res.status(500).send('Failed to generate gift packing slip.');
  }
};
