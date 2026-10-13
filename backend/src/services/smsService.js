const UIConfig = require('../models/UIConfig');

/**
 * Universal SMS Gateway Service Factory
 * Adapts between Mock Logger, Fast2SMS, MSG91, and Twilio.
 * Fully configurable from Super Admin panel with zero code changes.
 */
class SMSService {
  /**
   * Fetch latest SMS configuration from UIConfig
   */
  async getConfig() {
    try {
      const uiConfig = await UIConfig.findOne();
      return uiConfig?.integrations?.sms || {
        activeProvider: 'mock',
        fast2sms: { apiKey: '', senderId: 'FSTSMS', route: 'q' },
        msg91: { authKey: '', senderId: 'AURAMK', dltTemplateId: '' },
        twilio: { accountSid: '', authToken: '', fromPhone: '' },
      };
    } catch (_) {
      return { activeProvider: 'mock' };
    }
  }

  /**
   * Main dispatch method
   */
  async sendSMS({ to, message, provider, config: passedConfig }) {
    if (!to) {
      return { success: false, error: 'Recipient phone number is required' };
    }

    const cleanedPhone = to.toString().replace(/[^0-9+]/g, '');
    const smsConfig = passedConfig || (await this.getConfig());
    const activeProvider = provider || smsConfig.activeProvider || 'mock';

    console.log(`[SMSService] Sending SMS via [${activeProvider.toUpperCase()}] to: ${cleanedPhone}`);

    switch (activeProvider.toLowerCase()) {
      case 'fast2sms':
        return this.sendViaFast2SMS(cleanedPhone, message, smsConfig.fast2sms);

      case 'msg91':
        return this.sendViaMSG91(cleanedPhone, message, smsConfig.msg91);

      case 'twilio':
        return this.sendViaTwilio(cleanedPhone, message, smsConfig.twilio);

      case 'mock':
      default:
        return this.sendViaMock(cleanedPhone, message);
    }
  }

  /**
   * Mock / Local Simulation Provider (Zero external setup required)
   */
  sendViaMock(phone, message) {
    const timestamp = new Date().toISOString();
    console.log(`\n================== [MOCK SMS DISPATCH] ==================`);
    console.log(`📱 To:        ${phone}`);
    console.log(`💬 Message:   ${message}`);
    console.log(`⏱️ Timestamp: ${timestamp}`);
    console.log(`=========================================================\n`);

    return {
      success: true,
      provider: 'mock',
      messageId: `MOCK_SMS_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      status: 'DELIVERED',
      phone,
      note: 'Message delivered instantly via AuraMarket Built-in Mock Gateway (Zero configuration required)',
    };
  }

  /**
   * Fast2SMS Gateway (India Instant OTP / Transactional)
   */
  async sendViaFast2SMS(phone, message, config = {}) {
    const apiKey = config.apiKey || process.env.FAST2SMS_API_KEY;

    if (!apiKey || apiKey.includes('mock') || apiKey.length < 8) {
      return {
        success: true,
        provider: 'fast2sms',
        simulated: true,
        messageId: `FSTSMS_SIM_${Date.now()}`,
        status: 'DELIVERED',
        phone,
        note: 'Fast2SMS API Key not configured or in test mode. SMS simulated cleanly in showroom mode.',
      };
    }

    try {
      // Indian 10-digit number format
      const digitsOnly = phone.replace(/[^0-9]/g, '').slice(-10);

      const payload = {
        route: config.route || 'q',
        message: message,
        language: 'english',
        flash: 0,
        numbers: digitsOnly,
      };

      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.return) {
        return {
          success: true,
          provider: 'fast2sms',
          messageId: data.request_id || `FST_${Date.now()}`,
          status: 'DELIVERED',
          data,
          note: 'Live Fast2SMS message dispatched successfully!',
        };
      } else {
        return {
          success: false,
          provider: 'fast2sms',
          error: data.message ? (Array.isArray(data.message) ? data.message.join(', ') : data.message) : 'Fast2SMS dispatch failed',
          details: data,
        };
      }
    } catch (err) {
      return {
        success: false,
        provider: 'fast2sms',
        error: `Fast2SMS Network Connection Error: ${err.message}`,
      };
    }
  }

  /**
   * MSG91 Gateway (Enterprise SMS & DLT Flows)
   */
  async sendViaMSG91(phone, message, config = {}) {
    const authKey = config.authKey || process.env.MSG91_AUTH_KEY;

    if (!authKey || authKey.includes('mock') || authKey.length < 8) {
      return {
        success: true,
        provider: 'msg91',
        simulated: true,
        messageId: `MSG91_SIM_${Date.now()}`,
        status: 'DELIVERED',
        phone,
        note: 'MSG91 Auth Key not configured or in test mode. SMS simulated cleanly in showroom mode.',
      };
    }

    try {
      const digitsOnly = phone.replace(/[^0-9]/g, '').slice(-10);
      const senderId = config.senderId || 'AURAMK';

      const url = `https://api.msg91.com/api/v2/sendsms`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          authkey: authKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: senderId,
          route: '4',
          country: '91',
          sms: [{ message: message, to: [digitsOnly] }],
        }),
      });

      const data = await response.json();
      return {
        success: response.ok,
        provider: 'msg91',
        messageId: data.request_id || `MSG91_${Date.now()}`,
        status: response.ok ? 'DELIVERED' : 'FAILED',
        data,
      };
    } catch (err) {
      return {
        success: false,
        provider: 'msg91',
        error: `MSG91 Network Connection Error: ${err.message}`,
      };
    }
  }

  /**
   * Twilio Gateway (Global SMS & International Delivery)
   */
  async sendViaTwilio(phone, message, config = {}) {
    const accountSid = config.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = config.authToken || process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = config.fromPhone || process.env.TWILIO_FROM_PHONE;

    if (!accountSid || !authToken || accountSid.includes('mock') || accountSid.length < 8) {
      return {
        success: true,
        provider: 'twilio',
        simulated: true,
        messageId: `TWILIO_SIM_${Date.now()}`,
        status: 'DELIVERED',
        phone,
        note: 'Twilio Account SID / Auth Token not configured or in test mode. SMS simulated cleanly in showroom mode.',
      };
    }

    try {
      const formattedTo = phone.startsWith('+') ? phone : `+91${phone.replace(/[^0-9]/g, '').slice(-10)}`;
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

      const params = new URLSearchParams();
      params.append('To', formattedTo);
      params.append('From', fromPhone || '+15005550006');
      params.append('Body', message);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          provider: 'twilio',
          messageId: data.sid,
          status: data.status || 'QUEUED',
          data,
          note: 'Live Twilio international SMS dispatched successfully!',
        };
      } else {
        return {
          success: false,
          provider: 'twilio',
          error: data.message || 'Twilio SMS failed',
          details: data,
        };
      }
    } catch (err) {
      return {
        success: false,
        provider: 'twilio',
        error: `Twilio Network Error: ${err.message}`,
      };
    }
  }

  /**
   * High-Level Trigger: Order Placement Confirmation SMS
   */
  async sendOrderSMS({ order, phone }) {
    const orderNum = order.orderNumber || (order._id ? order._id.toString().slice(-6) : 'DEMO');
    const amount = order.totalAmount || 0;
    const otp = order.deliveryOtp || '4821';

    const message = `AuraMarket Order Confirmed! Your Order #${orderNum} for ₹${amount} is booked. Delivery OTP is ${otp}. Keep this code confidential until delivery.`;
    return this.sendSMS({ to: phone, message });
  }

  /**
   * High-Level Trigger: Delivery OTP Dispatch
   */
  async sendDeliveryOtpSMS({ phone, otp, orderNumber }) {
    const message = `Your AuraMarket delivery verification OTP is ${otp} for Order #${orderNumber}. Share this code ONLY with your courier partner upon receiving your package.`;
    return this.sendSMS({ to: phone, message });
  }
}

module.exports = new SMSService();
