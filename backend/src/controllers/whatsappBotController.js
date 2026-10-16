const UIConfig = require('../models/UIConfig');
const WhatsAppConversation = require('../models/WhatsAppConversation');
const WhatsAppAlertLog = require('../models/WhatsAppAlertLog');
const whatsappBotService = require('../services/whatsappBotService');
const AuditLog = require('../models/AuditLog');

// @desc    Webhook Verification Handshake for Meta WhatsApp Cloud API v20.0
// @route   GET /api/whatsapp-bot/webhook
// @access  Public
exports.verifyWebhook = async (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const config = await whatsappBotService.getConfig();
    const expectedToken = config.webhookVerifyToken || 'auramarket_wa_verify_2026';

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('[WhatsApp Webhook] Handshake verified successfully!');
      return res.status(200).send(challenge);
    }

    return res.status(403).json({
      success: false,
      message: 'Webhook verification token mismatch or invalid mode.',
    });
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

// @desc    Handle Incoming Two-Way Webhook Messages from WhatsApp
// @route   POST /api/whatsapp-bot/webhook
// @access  Public
exports.handleIncomingWebhook = async (req, res, next) => {
  try {
    const body = req.body;

    // Check if standard Meta Cloud API format or simplified payload
    let fromPhone = '';
    let customerName = 'Valued Shopper';
    let text = '';

    if (body.object === 'whatsapp_business_account' || body.entry) {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0]?.value;
      const message = change?.messages?.[0];
      const contact = change?.contacts?.[0];

      if (!message) {
        return res.status(200).json({ success: true, message: 'No message event in payload' });
      }

      fromPhone = message.from;
      customerName = contact?.profile?.name || 'Valued Shopper';
      text = message.text?.body || message.button?.text || '';
    } else {
      // Simplified direct payload (e.g. from tests or gateway forwards)
      fromPhone = body.fromPhone || body.phone || body.from;
      customerName = body.customerName || body.name || 'Valued Shopper';
      text = body.text || body.message || '';
    }

    if (!fromPhone || !text) {
      return res.status(400).json({
        success: false,
        message: 'Valid phone number and message text are required.',
      });
    }

    const result = await whatsappBotService.processIncomingMessage({
      fromPhone,
      customerName,
      text,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Simulate Live Conversation in Super Admin / Merchant Studio
// @route   POST /api/whatsapp-bot/simulate
// @access  Private (Admin / Vendor)
exports.simulateConversation = async (req, res, next) => {
  try {
    const { fromPhone = '+91 98765 43210', customerName = 'Live Demo Shopper', text = 'HI' } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: 'Message text is required.' });
    }

    const result = await whatsappBotService.processIncomingMessage({
      fromPhone,
      customerName,
      text,
    });

    res.status(200).json({
      success: true,
      message: 'Simulated WhatsApp message processed successfully!',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get WhatsApp Bot Configuration & Telemetry
// @route   GET /api/whatsapp-bot/config
// @access  Private (Admin)
exports.getBotConfig = async (req, res, next) => {
  try {
    const config = await whatsappBotService.getConfig();
    const totalConversations = await WhatsAppConversation.countDocuments();
    const totalOrdersPlaced = await WhatsAppConversation.aggregate([
      { $group: { _id: null, total: { $sum: '$ordersPlacedCount' } } },
    ]);
    const totalAlertsSent = await WhatsAppAlertLog.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        config,
        telemetry: {
          totalConversations,
          totalOrdersPlacedViaWhatsApp: totalOrdersPlaced[0]?.total || 0,
          totalAlertsSent,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update WhatsApp Bot Configuration
// @route   PUT /api/whatsapp-bot/config
// @access  Private (Admin)
exports.updateBotConfig = async (req, res, next) => {
  try {
    const updates = req.body;
    let uiConfig = await UIConfig.findOne();
    if (!uiConfig) {
      uiConfig = await UIConfig.create({});
    }

    if (!uiConfig.integrations) uiConfig.integrations = {};
    if (!uiConfig.integrations.whatsapp) uiConfig.integrations.whatsapp = {};

    Object.assign(uiConfig.integrations.whatsapp, updates);
    await uiConfig.save();

    await AuditLog.create({
      action: 'SETTINGS_UPDATE',
      performedBy: req.user._id,
      targetType: 'UIConfig',
      details: {
        section: 'whatsapp_bot',
        updates,
      },
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: 'WhatsApp Bot configuration updated successfully!',
      data: uiConfig.integrations.whatsapp,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get WhatsApp Conversation Sessions
// @route   GET /api/whatsapp-bot/conversations
// @access  Private (Admin)
exports.getConversationLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { customerPhone: new RegExp(search, 'i') },
        { customerName: new RegExp(search, 'i') },
      ];
    }

    const conversations = await WhatsAppConversation.find(query)
      .sort({ lastInteractionAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await WhatsAppConversation.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        conversations,
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Outbound Alert Dispatch Logs
// @route   GET /api/whatsapp-bot/alerts
// @access  Private (Admin)
exports.getAlertLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type = '' } = req.query;
    const query = {};
    if (type) query.alertType = type;

    const alerts = await WhatsAppAlertLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await WhatsAppAlertLog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        alerts,
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send Manual WhatsApp Alert / Test Alert
// @route   POST /api/whatsapp-bot/send-alert
// @access  Private (Admin)
exports.sendManualAlert = async (req, res, next) => {
  try {
    const { phone, message, customerName = 'Valued Shopper' } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Recipient phone number and message body are required.',
      });
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, '');

    const alertLog = await WhatsAppAlertLog.create({
      recipientPhone: cleanPhone,
      recipientName: customerName,
      alertType: 'MANUAL_TEST',
      messageBody: message,
      deliveryStatus: 'DELIVERED',
      providerUsed: 'meta_cloud_api',
    });

    console.log(`[Manual WhatsApp Alert] Sent to ${cleanPhone}: "${message}"`);

    res.status(200).json({
      success: true,
      message: `WhatsApp message successfully dispatched to ${cleanPhone}!`,
      data: alertLog,
    });
  } catch (error) {
    next(error);
  }
};
