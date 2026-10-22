const UIConfig = require('../models/UIConfig');
const Product = require('../models/Product');
const Order = require('../models/Order');
const SubOrder = require('../models/SubOrder');
const User = require('../models/User');
const WhatsAppConversation = require('../models/WhatsAppConversation');
const WhatsAppAlertLog = require('../models/WhatsAppAlertLog');

class WhatsAppBotService {
  /**
   * Get WhatsApp configuration from UIConfig
   */
  async getConfig() {
    try {
      const config = await UIConfig.findOne();
      return (
        config?.integrations?.whatsapp || {
          enabled: true,
          botEnabled: true,
          botName: 'AuraBot',
          greetingMessage: 'Namaste! Welcome to AuraMarket WhatsApp Shopping Concierge.',
          supportPhone: '+91 98765 43210',
          catalogSearchLimit: 4,
          autoCodBookingEnabled: true,
          webhookVerifyToken: 'auramarket_wa_verify_2026',
        }
      );
    } catch (_) {
      return {
        enabled: true,
        botEnabled: true,
        botName: 'AuraBot',
        greetingMessage: 'Namaste! Welcome to AuraMarket WhatsApp Shopping Concierge.',
        supportPhone: '+91 98765 43210',
        catalogSearchLimit: 4,
        autoCodBookingEnabled: true,
        webhookVerifyToken: 'auramarket_wa_verify_2026',
      };
    }
  }

  /**
   * Process Two-Way Incoming WhatsApp Message
   */
  async processIncomingMessage({ fromPhone, customerName = 'Valued Shopper', text = '' }) {
    if (!fromPhone) {
      throw new Error('Customer phone number is required.');
    }

    const cleanPhone = fromPhone.toString().replace(/[^0-9+]/g, '');
    const cleanText = (text || '').trim();
    const lower = cleanText.toLowerCase();

    // 1. Retrieve or initialize conversation record
    let conversation = await WhatsAppConversation.findOne({ customerPhone: cleanPhone });
    if (!conversation) {
      conversation = await WhatsAppConversation.create({
        customerPhone: cleanPhone,
        customerName: customerName || 'Valued Shopper',
        messages: [],
        activeCart: [],
      });
    }

    // Record customer incoming message
    conversation.messages.push({
      sender: 'user',
      text: cleanText,
      timestamp: new Date(),
    });

    const botConfig = await this.getConfig();
    let replyText = '';
    let intent = 'UNKNOWN';
    let payload = {};

    // 2. Keyword & Intent Router
    if (
      !cleanText ||
      lower === 'hi' ||
      lower === 'hello' ||
      lower === 'start' ||
      lower === 'menu' ||
      lower === 'namaste' ||
      lower === 'hey' ||
      lower === 'help'
    ) {
      intent = 'GREETING';
      replyText = `Namaste ${customerName}! 🙏\nWelcome to *AuraMarket WhatsApp Shopping Concierge*.\n\nReply with a keyword or number anytime:\n1️⃣ *CATALOG* — Browse top trending products\n2️⃣ *SEARCH <item>* — Search store (e.g. "SEARCH headphones" or "shoes")\n3️⃣ *CART* — View your active WhatsApp cart\n4️⃣ *TRACK <order#>* — Track live delivery & secret OTP (e.g. "TRACK ORD-12345")\n5️⃣ *SUPPORT* — Talk to customer support\n\n⚡ *Instant COD Booking*: Reply *"BUY <product_id>"* to order any product directly via Cash on Delivery!`;
      payload = { menuOptions: ['CATALOG', 'SEARCH', 'CART', 'TRACK', 'SUPPORT'] };
    } else if (lower === 'catalog' || lower === '1' || lower === 'trending' || lower === 'deals') {
      intent = 'SEARCH';
      const products = await Product.find({ isPublished: { $ne: false }, stock: { $gt: 0 } })
        .limit(botConfig.catalogSearchLimit || 4)
        .sort({ ratingsAverage: -1, createdAt: -1 });

      if (products.length === 0) {
        replyText = `Our catalog is currently being refreshed with fresh arrivals! Please check back in a few moments.`;
      } else {
        replyText = `🔥 *Top Trending Products on AuraMarket:*\n\n`;
        products.forEach((p, idx) => {
          const discount = p.mrp > p.sellingPrice ? Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100) : 0;
          replyText += `${idx + 1}. *${p.title}*\n`;
          replyText += `   💵 Price: ₹${p.sellingPrice} ${discount > 0 ? `(~₹${p.mrp}~ • *${discount}% OFF*)` : ''}\n`;
          replyText += `   ⭐ Rating: ${p.ratingsAverage || 4.5} ★ | In Stock\n`;
          replyText += `   👉 Order via COD: Reply *BUY ${p._id}*\n\n`;
        });
        replyText += `Reply *BUY <id>* to place instant COD order, or *SEARCH <keyword>* for more!`;
        payload = { products: products.map((p) => ({ id: p._id, title: p.title, price: p.sellingPrice })) };
      }
    } else if (lower.startsWith('search ') || lower.startsWith('find ') || lower === '2') {
      intent = 'SEARCH';
      const query = lower.replace(/^(search|find)\s+/i, '').trim();

      if (!query || lower === '2') {
        replyText = `🔍 *Search Catalog*: Please reply with *SEARCH <product name>*, e.g.:\n• SEARCH headphones\n• SEARCH smartwatch\n• SEARCH hoodie`;
      } else {
        const regex = new RegExp(query, 'i');
        const results = await Product.find({
          isPublished: { $ne: false },
          $or: [{ title: regex }, { categoryLabel: regex }, { tags: regex }, { brand: regex }],
        }).limit(botConfig.catalogSearchLimit || 4);

        if (results.length === 0) {
          replyText = `😔 We couldn't find any products matching "*${query}*".\nTry searching for "headphones", "shoes", or "watch", or reply *CATALOG* to view trending items!`;
        } else {
          replyText = `🔍 *Found ${results.length} items for "${query}":*\n\n`;
          results.forEach((p, idx) => {
            replyText += `${idx + 1}. *${p.title}*\n`;
            replyText += `   💵 Price: ₹${p.sellingPrice}\n`;
            replyText += `   👉 Quick COD Order: Reply *BUY ${p._id}*\n\n`;
          });
          replyText += `Reply *BUY <product_id>* to order with Cash on Delivery!`;
          payload = { resultsCount: results.length, query };
        }
      }
    } else if (lower.startsWith('buy ') || lower.startsWith('cod ') || lower.startsWith('order ')) {
      intent = 'CHECKOUT_COD';
      const productId = cleanText.split(/\s+/)[1]?.trim();

      if (!productId) {
        replyText = `To order via Cash on Delivery, reply with *BUY <product_id>*. You can copy the ID from search results!`;
      } else {
        const product = await Product.findById(productId).catch(() => null);
        if (!product) {
          replyText = `❌ Product not found or invalid product ID: "${productId}". Please check the ID or reply *CATALOG* to browse available items.`;
        } else if (product.stock <= 0) {
          replyText = `⚠️ Sorry, *${product.title}* is currently out of stock. We are restocking soon!`;
        } else {
          // Atomically create COD Order in database
          const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
          const orderNum = `ORD-WA-${Date.now().toString().slice(-6)}`;

          // Find or fallback customer user
          let customerUser = await User.findOne({ $or: [{ phone: cleanPhone }, { email: 'customer@auramarket.com' }] });
          if (!customerUser) {
            customerUser = await User.findOne();
          }

          const VendorProfile = require('../models/VendorProfile');
          let vendorId = product.vendor;
          if (!vendorId) {
            const defaultVendor = await VendorProfile.findOne();
            vendorId = defaultVendor?._id;
          }

          const newOrder = await Order.create({
            orderNumber: orderNum,
            customer: customerUser?._id,
            paymentMethod: 'COD',
            paymentStatus: 'PENDING',
            status: 'PLACED',
            deliveryOtp,
            items: [
              {
                product: product._id,
                vendor: vendorId,
                title: product.title,
                price: product.sellingPrice,
                quantity: 1,
                totalPrice: product.sellingPrice,
              },
            ],
            subtotal: product.sellingPrice,
            shippingFee: 0,
            totalAmount: product.sellingPrice,
            totalCommission: Math.round(product.sellingPrice * 0.1),
            shippingAddress: {
              recipientName: customerName || 'Valued Customer',
              phone: cleanPhone,
              street: 'WhatsApp Direct Order (Doorstep Delivery)',
              city: 'Delhi',
              state: 'Delhi',
              pincode: '110001',
            },
          });

          // Decrement product inventory
          product.stock = Math.max(0, product.stock - 1);
          await product.save();

          // Increment conversation stats
          conversation.ordersPlacedCount = (conversation.ordersPlacedCount || 0) + 1;
          conversation.status = 'ORDER_PLACED';

          // Log alert in WhatsAppAlertLog
          await WhatsAppAlertLog.create({
            recipientPhone: cleanPhone,
            recipientName: customerName,
            alertType: 'ORDER_CONFIRMATION',
            orderId: newOrder._id,
            orderNumber: newOrder.orderNumber,
            messageBody: `Order #${newOrder.orderNumber} confirmed via WhatsApp! OTP: ${deliveryOtp}`,
            deliveryStatus: 'DELIVERED',
            providerUsed: botConfig.provider || 'meta_cloud_api',
          }).catch(() => {});

          replyText = `🎉 *CONGRATULATIONS! YOUR ORDER IS CONFIRMED!* 🎉\n\n📦 *Order ID:* #${newOrder.orderNumber}\n🛍️ *Item:* ${product.title}\n💵 *Pay at Doorstep:* ₹${newOrder.totalAmount} (COD)\n🔐 *Secret Delivery OTP:* *${deliveryOtp}*\n_(⚠️ Share this OTP with the courier rider ONLY after receiving the parcel)_\n\n🚚 *Dispatch:* Packed within 24 hours with tamper-proof security tape.\nTrack live status anytime: reply *TRACK ${newOrder.orderNumber}*`;

          payload = {
            orderId: newOrder._id,
            orderNumber: newOrder.orderNumber,
            totalAmount: newOrder.totalAmount,
            deliveryOtp,
          };
        }
      }
    } else if (lower.startsWith('track') || lower === '4') {
      intent = 'TRACK_ORDER';
      const orderArg = cleanText.split(/\s+/)[1]?.trim();
      let matchedOrder = null;

      if (orderArg) {
        matchedOrder = await Order.findOne({
          $or: [{ orderNumber: orderArg }, { orderNumber: `ORD-${orderArg}` }],
        });
      }

      if (!matchedOrder) {
        // Find most recent order by phone
        matchedOrder = await Order.findOne({
          $or: [{ 'shippingAddress.phone': cleanPhone }, { phone: cleanPhone }],
        }).sort({ createdAt: -1 });
      }

      if (!matchedOrder) {
        // Fallback to any recent placed order for demonstration
        matchedOrder = await Order.findOne().sort({ createdAt: -1 });
      }

      if (!matchedOrder) {
        replyText = `📦 We couldn't locate any active orders for phone number *${cleanPhone}*.\nReply *CATALOG* to browse and place your first order!`;
      } else {
        const statusEmoji =
          matchedOrder.status === 'delivered'
            ? '✅ Delivered'
            : matchedOrder.status === 'out_for_delivery'
            ? '🚚 Out for Delivery'
            : matchedOrder.status === 'processing'
            ? '📦 In Packaging'
            : '⚡ Confirmed & Queued';

        replyText = `📍 *AuraMarket Live Order Status:*\n\n📦 *Order ID:* #${matchedOrder.orderNumber}\n📊 *Status:* *${statusEmoji}*\n💵 *Amount:* ₹${matchedOrder.totalAmount} (${matchedOrder.paymentMethod})\n🔐 *Secret Delivery OTP:* *${matchedOrder.deliveryOtp || '4821'}*\n\n🚚 *Courier:* AuraMarket Express Logistics\nNeed assistance? Reply *SUPPORT*!`;
        payload = {
          orderNumber: matchedOrder.orderNumber,
          status: matchedOrder.status,
          otp: matchedOrder.deliveryOtp,
        };
      }
    } else if (lower === 'cart' || lower === '3' || lower === 'my cart') {
      intent = 'CART';
      if (!conversation.activeCart || conversation.activeCart.length === 0) {
        replyText = `🛒 Your WhatsApp Shopping Cart is currently empty.\nReply *CATALOG* to discover trending products or *SEARCH <item>*!`;
      } else {
        let total = 0;
        replyText = `🛒 *Your WhatsApp Active Cart:*\n\n`;
        conversation.activeCart.forEach((item, i) => {
          total += item.price * (item.quantity || 1);
          replyText += `${i + 1}. *${item.title}* (x${item.quantity}) — ₹${item.price * item.quantity}\n`;
        });
        replyText += `\n💰 *Total:* ₹${total}\n👉 Reply *BUY <id>* to checkout via Cash on Delivery instantly!`;
      }
    } else if (lower.includes('support') || lower === '5' || lower.includes('agent') || lower.includes('human')) {
      intent = 'SUPPORT';
      replyText = `🤝 *AuraMarket Concierge Support:*\n\nOur customer care team is available 24/7 to assist you!\n📞 Phone: *${botConfig.supportPhone || '+91 98765 43210'}*\n💬 WhatsApp: wa.me/919876543210\n📧 Email: support@auramarket.com\n\nReply *MENU* to return to the main shopping menu.`;
      conversation.status = 'SUPPORT_REQUESTED';
    } else {
      // Natural fallback search or greeting
      const results = await Product.find({
        isPublished: { $ne: false },
        $or: [{ title: new RegExp(cleanText, 'i') }, { categoryLabel: new RegExp(cleanText, 'i') }],
      }).limit(2);

      if (results.length > 0) {
        intent = 'SEARCH';
        replyText = `🔍 We found these matching items for "*${cleanText}*":\n\n`;
        results.forEach((p, idx) => {
          replyText += `${idx + 1}. *${p.title}* — ₹${p.sellingPrice}\n   👉 Reply *BUY ${p._id}* to order via COD!\n\n`;
        });
        replyText += `Reply with *BUY <id>*, or reply *MENU* to see all options.`;
      } else {
        intent = 'UNKNOWN';
        replyText = `Hello! I didn't quite catch that. 🤔\n\nReply:\n• *CATALOG* to see trending products\n• *SEARCH <product>* to search\n• *TRACK* to track your order\n• *MENU* for main options`;
      }
    }

    // 3. Record bot reply in conversation
    conversation.messages.push({
      sender: 'bot',
      text: replyText,
      intent,
      payload,
      timestamp: new Date(),
    });

    conversation.lastIntent = intent;
    conversation.lastInteractionAt = new Date();
    await conversation.save();

    console.log(`\n================== [WHATSAPP BOT INTERACTION] ==================`);
    console.log(`📱 From:    ${cleanPhone} (${customerName})`);
    console.log(`💬 Input:   "${cleanText}"`);
    console.log(`🤖 Intent:  [${intent}]`);
    console.log(`📨 Reply:   ${replyText.slice(0, 100)}...`);
    console.log(`=================================================================\n`);

    return {
      success: true,
      fromPhone: cleanPhone,
      replyText,
      intent,
      payload,
      conversationId: conversation._id,
    };
  }

  /**
   * Outbound Automated Transactional Alert: Order Confirmation
   */
  async sendOrderConfirmationAlert({ order, phone, customerName = 'Customer' }) {
    if (!order || !phone) return { success: false, error: 'Order and phone required' };

    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const itemsText = (order.items || []).map((i) => `• ${i.title} (x${i.quantity || 1})`).join('\n');
    const msg = `🎉 *AuraMarket Order Confirmed!* #${order.orderNumber}\n\nHi ${customerName}, your order has been received:\n${itemsText}\n\n💵 *Total:* ₹${order.totalAmount} (${order.paymentMethod})\n🔐 *Secret Delivery OTP:* *${order.deliveryOtp || '4821'}*\n\nKeep your OTP safe. Share it with our delivery rider only upon doorstep handover!`;

    const alertLog = await WhatsAppAlertLog.create({
      recipientPhone: cleanPhone,
      recipientName: customerName,
      alertType: 'ORDER_CONFIRMATION',
      orderId: order._id,
      orderNumber: order.orderNumber,
      messageBody: msg,
      deliveryStatus: 'DELIVERED',
    }).catch(() => null);

    console.log(`[WhatsAppAlertLog] Sent ORDER_CONFIRMATION to ${cleanPhone} for Order #${order.orderNumber}`);
    return { success: true, messageId: alertLog?._id, message: msg };
  }

  /**
   * Outbound Automated Transactional Alert: Out For Delivery
   */
  async sendOutForDeliveryAlert({ order, phone, riderName = 'Rider', riderPhone = '+91 98765 00000' }) {
    if (!order || !phone) return { success: false, error: 'Order and phone required' };

    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const msg = `🚚 *AuraMarket Package Out for Delivery!* #${order.orderNumber}\n\nOur delivery associate *${riderName}* (${riderPhone}) is on the way with your package.\n\n🔐 *Secret Delivery OTP:* *${order.deliveryOtp || '4821'}*\n${order.paymentMethod === 'COD' ? `💵 *Cash to Pay:* ₹${order.totalAmount} (Exact cash appreciated)` : '✅ Payment already completed.'}\n\nPlease share your OTP only after package inspection!`;

    const alertLog = await WhatsAppAlertLog.create({
      recipientPhone: cleanPhone,
      recipientName: order.shippingAddress?.fullName || 'Customer',
      alertType: 'OUT_FOR_DELIVERY',
      orderId: order._id,
      orderNumber: order.orderNumber,
      messageBody: msg,
      deliveryStatus: 'DELIVERED',
    }).catch(() => null);

    return { success: true, messageId: alertLog?._id, message: msg };
  }

  /**
   * Outbound Automated Transactional Alert: Delivered
   */
  async sendDeliverySuccessAlert({ order, phone }) {
    if (!order || !phone) return { success: false, error: 'Order and phone required' };

    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const msg = `✅ *AuraMarket Order Delivered Successfully!* #${order.orderNumber}\n\nYour package has been handed over. Thank you for shopping with us! Enjoy your purchase.\n\n⭐ Share your feedback & rate your experience: https://shribalajikripadham.online/ecommerce-demo/orders/${order._id}`;

    const alertLog = await WhatsAppAlertLog.create({
      recipientPhone: cleanPhone,
      recipientName: order.shippingAddress?.fullName || 'Customer',
      alertType: 'ORDER_DELIVERED',
      orderId: order._id,
      orderNumber: order.orderNumber,
      messageBody: msg,
      deliveryStatus: 'DELIVERED',
    }).catch(() => null);

    return { success: true, messageId: alertLog?._id, message: msg };
  }

  /**
   * Outbound Automated Transactional Alert: Delivery OTP Reminder
   */
  async sendDeliveryOtpAlert({ order, phone, customerName = 'Customer' }) {
    if (!order || !phone) return { success: false, error: 'Order and phone required' };

    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const otp = order.deliveryOtp || '4821';
    const msg = `🔐 *AuraMarket Secret Delivery Handover OTP: ${otp}*\n\nHi ${customerName}, your delivery rider is approaching. Please provide OTP *${otp}* to the rider only after verifying your parcel #${order.orderNumber}.\n\n⚠️ Never share your OTP over phone calls or SMS.`;

    const alertLog = await WhatsAppAlertLog.create({
      recipientPhone: cleanPhone,
      recipientName: customerName,
      alertType: 'OUT_FOR_DELIVERY',
      orderId: order._id,
      orderNumber: order.orderNumber,
      messageBody: msg,
      deliveryStatus: 'DELIVERED',
    }).catch(() => null);

    return { success: true, messageId: alertLog?._id, message: msg, otp };
  }

  /**
   * Outbound Automated Transactional Alert: Abandoned Cart Recovery
   */
  async sendAbandonedCartAlert({ phone, customerName = 'Shopper', items = [], couponCode = 'WA10OFF' }) {
    if (!phone) return { success: false, error: 'Phone number required' };

    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const itemsText = items.map((i) => `• ${i.title || 'Cart Item'}`).join('\n') || '• Your selected items';
    const msg = `🛒 *You left items in your AuraMarket cart!* ⏳\n\nHi ${customerName}, don't miss out on your favorite items:\n${itemsText}\n\n🎁 *Exclusive WhatsApp Bonus:* Use code *${couponCode}* for an extra 10% instant discount!\n\n👉 Complete your order now: https://shribalajikripadham.online/ecommerce-demo/#cart`;

    const alertLog = await WhatsAppAlertLog.create({
      recipientPhone: cleanPhone,
      recipientName: customerName,
      alertType: 'CART_RECOVERY',
      messageBody: msg,
      deliveryStatus: 'DELIVERED',
    }).catch(() => null);

    return { success: true, messageId: alertLog?._id, message: msg, couponCode };
  }
}

module.exports = new WhatsAppBotService();
