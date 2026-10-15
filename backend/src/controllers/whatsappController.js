const Order = require('../models/Order');
const SubOrder = require('../models/SubOrder');
const DeliveryTask = require('../models/DeliveryTask');
const UIConfig = require('../models/UIConfig');
const smsService = require('../services/smsService');

/**
 * Point #71: 1-Click WhatsApp Order Confirmation & Tracking Bot Engine
 */

// Helper to clean phone numbers into international WhatsApp standard
const formatPhoneForWhatsApp = (rawPhone) => {
  if (!rawPhone) return '918533955333';
  const digits = rawPhone.toString().replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
};

// @desc    Generate 1-Click WhatsApp Order Confirmation & Dispatch Message (Point #71)
// @route   POST /api/whatsapp/order-confirmation
exports.sendOrderConfirmation = async (req, res, next) => {
  try {
    const { orderId, phone } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId or orderNumber is required.' });
    }

    // Lookup order by MongoDB ObjectId or orderNumber
    let order;
    if (orderId.toString().match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(orderId).populate('customer items.product');
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: orderId }).populate('customer items.product');
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found for WhatsApp confirmation.' });
    }

    const subOrders = await SubOrder.find({ parentOrder: order._id }).populate('vendor');
    const deliveryTask = await DeliveryTask.findOne({ subOrder: { $in: subOrders.map(s => s._id) } });

    // Resolve recipient phone
    const targetPhone = phone || order.shippingAddress?.phone || order.customer?.phone || '9876543210';
    const waPhone = formatPhoneForWhatsApp(targetPhone);

    const uiConfig = await UIConfig.findOne();
    const storeName = uiConfig?.storeName || 'AuraMarket';
    const canonicalBase = uiConfig?.seo?.canonicalUrl?.replace(/\/+$/, '') || 'https://shribalajikripadham.online/ecommerce-demo';
    const trackingUrl = `${canonicalBase}/#order-track?id=${order.orderNumber}`;

    // Item line summaries
    const itemLines = (order.items || []).map((item, idx) => {
      const name = item.title || item.product?.title || 'Selected Product';
      const qty = item.quantity || 1;
      const price = item.price || 0;
      return `  ${idx + 1}. *${name}* (x${qty}) — ₹${(price * qty).toLocaleString('en-IN')}`;
    }).join('\n');

    const formattedMessage = 
`*🛍️ ${storeName.toUpperCase()} — ORDER CONFIRMED!*
━━━━━━━━━━━━━━━━━━━━
📦 *Order ID:* #${order.orderNumber}
📅 *Date:* ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
👤 *Recipient:* ${order.shippingAddress?.name || order.customer?.name || 'Valued Customer'}
📞 *Contact:* +${waPhone}

🛒 *Ordered Items:*
${itemLines || '  • Standard Marketplace Package'}

💰 *Payment Details:*
• Total Amount: *₹${order.totalAmount.toLocaleString('en-IN')}*
• Payment Method: *${order.paymentMethod || 'COD'}*
• Payment Status: *${(order.paymentStatus || 'PENDING').toUpperCase()}*

📍 *Doorstep Shipping Address:*
${order.shippingAddress?.address || 'Doorstep Delivery'}, ${order.shippingAddress?.city || ''} — PIN: ${order.shippingAddress?.pincode || ''}

🔐 *Secret Handover OTP:* *${order.deliveryOtp || '4821'}*
⚠️ _(Keep this code confidential. Share ONLY with the delivery rider upon inspecting your parcel)_

━━━━━━━━━━━━━━━━━━━━
🔗 *1-Click Live GPS Package Tracking:*
${trackingUrl}

🤖 *Interactive WhatsApp Bot Commands:*
Reply directly to this chat at any time:
• *TRACK* — Live route progress & ETA
• *OTP* — Retrieve your 4-digit handover PIN
• *CANCEL* — Self-cancellation options
• *SUPPORT* — Connect with a live agent
━━━━━━━━━━━━━━━━━━━━
Thank you for shopping with ${storeName}! ✨`;

    const whatsappUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(formattedMessage)}`;

    // Dispatch simulated message through SMS/notification pipeline
    await smsService.sendSMS({
      to: targetPhone,
      message: `AuraMarket: Order #${order.orderNumber} confirmed for ₹${order.totalAmount}. WhatsApp updates active. Track: ${trackingUrl}`,
    });

    res.status(200).json({
      success: true,
      message: '1-Click WhatsApp Order Confirmation generated successfully!',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        phone: waPhone,
        customerName: order.shippingAddress?.name || order.customer?.name || 'Customer',
        totalAmount: order.totalAmount,
        deliveryOtp: order.deliveryOtp,
        trackingUrl,
        whatsappUrl,
        formattedMessage,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process Incoming WhatsApp Bot Chat Query (Point #71)
// @route   POST /api/whatsapp/bot-query
exports.handleBotQuery = async (req, res, next) => {
  try {
    const { query, phone, orderNumber: passedOrderNumber } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ success: false, message: 'Query string is required.' });
    }

    const cleanQuery = query.trim();
    const upperQuery = cleanQuery.toUpperCase();

    // Try extracting Order ID from query e.g. "STATUS #ORD-179206-123", "TRACK ORD-456", "ORD-123"
    const orderMatch = cleanQuery.match(/(?:ORD-|SUB-|TASK-)?\d{6,}[-\d]*/i) || cleanQuery.match(/#[A-Za-z0-9_-]+/);
    const extractedOrderNum = orderMatch ? orderMatch[0].replace('#', '') : passedOrderNumber;

    let order = null;
    if (extractedOrderNum) {
      order = await Order.findOne({
        $or: [
          { orderNumber: extractedOrderNum },
          { orderNumber: new RegExp(extractedOrderNum, 'i') },
        ],
      }).populate('customer items.product');
    }

    // Fallback: If no order extracted, try searching latest order for the user phone
    if (!order && phone) {
      const cleanPhoneDigits = phone.toString().replace(/[^0-9]/g, '').slice(-10);
      order = await Order.findOne({
        $or: [
          { 'shippingAddress.phone': new RegExp(cleanPhoneDigits) },
          { 'customer.phone': new RegExp(cleanPhoneDigits) },
        ],
      }).sort({ createdAt: -1 }).populate('customer items.product');
    }

    const uiConfig = await UIConfig.findOne();
    const storeName = uiConfig?.storeName || 'AuraMarket';
    const canonicalBase = uiConfig?.seo?.canonicalUrl?.replace(/\/+$/, '') || 'https://shribalajikripadham.online/ecommerce-demo';
    const supportPhone = '+91 8533955333';

    let intent = 'UNKNOWN';
    let reply = '';

    // INTENT 1: TRACKING & STATUS
    if (upperQuery.includes('TRACK') || upperQuery.includes('STATUS') || upperQuery.includes('WHERE')) {
      intent = 'TRACKING';
      if (!order) {
        reply = 
`🤖 *${storeName} Tracking Assistant*
━━━━━━━━━━━━━━━━━━━━
Please specify your Order Number to check live status.
Example: *TRACK #ORD-123456*

Or check our web tracker:
🔗 ${canonicalBase}/#track`;
      } else {
        const subOrders = await SubOrder.find({ parentOrder: order._id });
        const deliveryTask = await DeliveryTask.findOne({ subOrder: { $in: subOrders.map(s => s._id) } });

        const statusDisplay = deliveryTask?.status || order.orderStatus || 'IN_TRANSIT';
        const lastNote = deliveryTask?.status === 'DELIVERED'
          ? 'Delivered & verified at customer doorstep.'
          : deliveryTask?.status === 'OUT_FOR_DELIVERY'
          ? 'Courier partner is en route with your package.'
          : 'Package packed and ready for carrier pickup.';

        reply = 
`🤖 *${storeName} Live Tracking Status*
━━━━━━━━━━━━━━━━━━━━
📦 *Order ID:* #${order.orderNumber}
⚡ *Status:* *${statusDisplay.replace(/_/g, ' ')}*
📍 *Current Step:* ${lastNote}
💰 *Amount Due:* ₹${order.totalAmount.toLocaleString('en-IN')} (${order.paymentMethod})
🔐 *Delivery OTP:* *${order.deliveryOtp || '4821'}*
━━━━━━━━━━━━━━━━━━━━
🔗 *Real-Time GPS Map:*
${canonicalBase}/#order-track?id=${order.orderNumber}

Need help? Reply *SUPPORT* to talk to our courier desk.`;
      }
    }

    // INTENT 2: DELIVERY OTP INQUIRY
    else if (upperQuery.includes('OTP') || upperQuery.includes('CODE') || upperQuery.includes('PIN')) {
      intent = 'OTP_INQUIRY';
      if (!order) {
        reply = 
`🔐 *${storeName} Delivery OTP Service*
━━━━━━━━━━━━━━━━━━━━
Please provide your Order ID to retrieve your secret 4-digit OTP.
Example: *OTP #ORD-123456*`;
      } else {
        reply = 
`🔐 *Your Secret Handover OTP*
━━━━━━━━━━━━━━━━━━━━
📦 *Order ID:* #${order.orderNumber}
🔑 *4-Digit OTP:* *${order.deliveryOtp || '4821'}*

⚠️ *Rider Safety Notice:*
Only share this 4-digit PIN with the delivery courier after receiving and inspecting your parcel package. Never share OTP over phone.`;
      }
    }

    // INTENT 3: SELF CANCELLATION
    else if (upperQuery.includes('CANCEL')) {
      intent = 'CANCELLATION';
      if (!order) {
        reply = 
`❌ *${storeName} Order Cancellation*
━━━━━━━━━━━━━━━━━━━━
Please provide your Order ID to view cancellation eligibility.
Example: *CANCEL #ORD-123456*`;
      } else {
        const subOrders = await SubOrder.find({ parentOrder: order._id });
        const isDispatched = subOrders.some(s => ['shipped', 'out_for_delivery', 'delivered'].includes(s.status));

        if (!isDispatched && order.orderStatus !== 'cancelled') {
          reply = 
`⚡ *1-Click Self-Cancellation Available*
━━━━━━━━━━━━━━━━━━━━
Order #${order.orderNumber} has not left the seller warehouse yet.
You can cancel your order immediately with full refund.
👉 Click here to cancel:
🔗 ${canonicalBase}/#order-track?id=${order.orderNumber}&action=cancel`;
        } else if (order.orderStatus === 'cancelled') {
          reply = 
`ℹ️ *Order Already Cancelled*
━━━━━━━━━━━━━━━━━━━━
Order #${order.orderNumber} was already cancelled. Any pre-paid payments have been refunded to your source payment method.`;
        } else {
          reply = 
`🚚 *Order Is In-Transit*
━━━━━━━━━━━━━━━━━━━━
Order #${order.orderNumber} has already been dispatched with our courier partner. In-transit cancellation is not possible, but you can:
1. Refuse acceptance at doorstep (instant RTO).
2. Accept parcel and request a 7-day return via our portal.`;
        }
      }
    }

    // INTENT 4: SUPPORT / HUMAN AGENT
    else if (upperQuery.includes('SUPPORT') || upperQuery.includes('HELP') || upperQuery.includes('AGENT') || upperQuery.includes('HUMAN')) {
      intent = 'CUSTOMER_SUPPORT';
      reply = 
`👋 *${storeName} Customer Care Desk*
━━━━━━━━━━━━━━━━━━━━
We are here to help you!

💬 *Direct WhatsApp Agent:*
https://wa.me/${formatPhoneForWhatsApp(supportPhone)}

📞 *Phone Support:* ${supportPhone}
⏰ *Hours:* Mon - Sat (9:00 AM - 9:00 PM IST)
📧 *Email:* support@auramarket.com

To check an order, simply reply with *TRACK* or *OTP*.`;
    }

    // INTENT 5: GREETINGS / DEFAULT MENU
    else {
      intent = 'GREETING';
      reply = 
`🤖 *Welcome to ${storeName} WhatsApp Assistant!*
━━━━━━━━━━━━━━━━━━━━
I can help you track orders, get your delivery OTP, and manage shipments.

*Available Commands:*
1️⃣ *TRACK <Order #>* — Live GPS location & status
2️⃣ *OTP <Order #>* — Get secret delivery PIN
3️⃣ *CANCEL <Order #>* — 1-click self cancellation
4️⃣ *SUPPORT* — Connect with a human agent

Type any command above to get started! ✨`;
    }

    res.status(200).json({
      success: true,
      data: {
        query: cleanQuery,
        intent,
        reply,
        matchedOrder: order ? order.orderNumber : null,
        supportPhone,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Pre-Configured WhatsApp Marketing & Transactional Templates (Point #71)
// @route   GET /api/whatsapp/templates
exports.getWhatsAppTemplates = async (req, res, next) => {
  try {
    const uiConfig = await UIConfig.findOne();
    const storeName = uiConfig?.storeName || 'AuraMarket';

    const templates = [
      {
        id: 'ORDER_CONFIRMATION',
        name: 'Order Confirmation & Secret OTP',
        category: 'TRANSACTIONAL',
        description: 'Sent automatically after customer completes checkout with secret delivery OTP.',
        sampleVariables: ['{{orderNumber}}', '{{totalAmount}}', '{{deliveryOtp}}', '{{trackUrl}}'],
        body: `*🛍️ ${storeName} Order Confirmed!*\nOrder #{{orderNumber}} for ₹{{totalAmount}} is booked.\n🔐 Secret Delivery OTP: *{{deliveryOtp}}*\nTrack live: {{trackUrl}}`,
      },
      {
        id: 'OUT_FOR_DELIVERY',
        name: 'Out For Delivery Live Alert',
        category: 'SHIPPING_UPDATE',
        description: 'Notifies customer when delivery partner begins transit to doorstep.',
        sampleVariables: ['{{orderNumber}}', '{{riderName}}', '{{riderPhone}}', '{{deliveryOtp}}'],
        body: `🚚 *Your package is Out For Delivery!*\nOrder #{{orderNumber}} is arriving with rider {{riderName}} (+{{riderPhone}}).\nKeep OTP *{{deliveryOtp}}* ready.`,
      },
      {
        id: 'DELIVERED_POD',
        name: 'Delivered with Proof of Delivery',
        category: 'DELIVERY_RECEIPT',
        description: 'Confirms successful handover with verifiable digital signature & photo proof link.',
        sampleVariables: ['{{orderNumber}}', '{{podUrl}}'],
        body: `✅ *Order Delivered Successfully!*\nOrder #{{orderNumber}} has been delivered.\nView Proof of Delivery (POD) slip: {{podUrl}}`,
      },
      {
        id: 'ABANDONED_CART_RECOVERY',
        name: 'Abandoned Cart 10% Discount Ping',
        category: 'MARKETING_RECOVERY',
        description: 'Automated nudge for cart abandoners with 1-click checkout recovery link.',
        sampleVariables: ['{{customerName}}', '{{cartItemCount}}', '{{couponCode}}', '{{cartUrl}}'],
        body: `👋 Hey {{customerName}}, you left {{cartItemCount}} items in your cart!\nUse coupon *{{couponCode}}* for an instant 10% OFF:\n{{cartUrl}}`,
      },
    ];

    res.status(200).json({
      success: true,
      templates,
    });
  } catch (error) {
    next(error);
  }
};
