const nodemailer = require('nodemailer');
const UIConfig = require('../models/UIConfig');

/**
 * Universal Email & SMTP Notification Service
 * Dynamic Nodemailer transporter utilizing credentials configured from Super Admin panel.
 * Includes fail-safe mock fallback for zero-dependency operation.
 */
class MailService {
  /**
   * Fetch latest email configuration from UIConfig
   */
  async getConfig() {
    try {
      const uiConfig = await UIConfig.findOne();
      return uiConfig?.integrations?.email || {
        activeProvider: 'mock',
        smtp: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          username: 'notifications@auramarket.com',
          password: '',
          fromEmail: 'notifications@auramarket.com',
          fromName: 'AuraMarket Store',
        },
        sendgrid: {
          apiKey: '',
          fromEmail: 'notifications@auramarket.com',
          fromName: 'AuraMarket Store',
        },
      };
    } catch (_) {
      return { activeProvider: 'mock' };
    }
  }

  /**
   * Main dispatch method
   */
  async sendMail({ to, subject, text, html, provider, config: passedConfig }) {
    if (!to) {
      return { success: false, error: 'Recipient email address is required' };
    }

    const emailConfig = passedConfig || (await this.getConfig());
    const activeProvider = provider || emailConfig.activeProvider || 'mock';

    console.log(`[MailService] Sending Email via [${activeProvider.toUpperCase()}] to: ${to} | Subject: "${subject}"`);

    switch (activeProvider.toLowerCase()) {
      case 'smtp':
        return this.sendViaSMTP({ to, subject, text, html, config: emailConfig.smtp });

      case 'sendgrid':
        return this.sendViaSendGrid({ to, subject, text, html, config: emailConfig.sendgrid });

      case 'mock':
      default:
        return this.sendViaMock({ to, subject, text, html });
    }
  }

  /**
   * Alias for sendMail
   */
  async sendEmail(params) {
    return this.sendMail(params);
  }

  /**
   * Built-in Mock Simulator (Zero SMTP credentials required)
   */
  sendViaMock({ to, subject, text }) {
    const timestamp = new Date().toISOString();
    console.log(`\n================== [MOCK EMAIL DISPATCH] ==================`);
    console.log(`📧 To:        ${to}`);
    console.log(`📝 Subject:   ${subject}`);
    console.log(`📄 Snippet:   ${(text || '').slice(0, 120)}...`);
    console.log(`⏱️ Timestamp: ${timestamp}`);
    console.log(`===========================================================\n`);

    return {
      success: true,
      provider: 'mock',
      messageId: `MOCK_MAIL_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      status: 'SENT',
      to,
      subject,
      note: 'Email dispatched instantly via AuraMarket Built-in Mock Mailer (Zero SMTP configuration required)',
    };
  }

  /**
   * Custom SMTP Transporter (Hostinger, cPanel, Gmail, Outlook, AWS SES)
   */
  async sendViaSMTP({ to, subject, text, html, config = {} }) {
    const host = config.host || process.env.SMTP_HOST;
    const port = Number(config.port || process.env.SMTP_PORT || 587);
    const username = config.username || process.env.SMTP_USER;
    const password = config.password || process.env.SMTP_PASS;
    const fromEmail = config.fromEmail || process.env.SMTP_FROM || 'notifications@auramarket.com';
    const fromName = config.fromName || 'AuraMarket Store';
    const isSecure = config.secure !== undefined ? Boolean(config.secure) : port === 465;

    // If credentials are blank or placeholders, gracefully simulate
    if (!host || !username || !password || password.includes('mock') || password.length < 3) {
      return {
        success: true,
        provider: 'smtp',
        simulated: true,
        messageId: `SMTP_SIM_${Date.now()}`,
        status: 'SENT',
        to,
        subject,
        note: 'SMTP host or password not fully configured. Email was simulated safely in showroom mode.',
      };
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: isSecure,
        auth: {
          user: username,
          pass: password,
        },
        tls: {
          rejectUnauthorized: false, // Prevents self-signed cert issues on cPanel/Hostinger
        },
        connectionTimeout: 8000,
      });

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        text: text || 'Message from AuraMarket Multi-Vendor Marketplace',
        html: html || `<p>${text || 'Message from AuraMarket Multi-Vendor Marketplace'}</p>`,
      };

      const info = await transporter.sendMail(mailOptions);

      return {
        success: true,
        provider: 'smtp',
        messageId: info.messageId,
        status: 'SENT',
        to,
        subject,
        note: `Live SMTP email sent successfully via ${host}:${port}!`,
      };
    } catch (err) {
      return {
        success: false,
        provider: 'smtp',
        error: `SMTP Dispatch Error: ${err.message}`,
      };
    }
  }

  /**
   * SendGrid API v3 Adapter
   */
  async sendViaSendGrid({ to, subject, text, html, config = {} }) {
    const apiKey = config.apiKey || process.env.SENDGRID_API_KEY;
    const fromEmail = config.fromEmail || 'notifications@auramarket.com';
    const fromName = config.fromName || 'AuraMarket Store';

    if (!apiKey || apiKey.includes('mock') || apiKey.length < 10) {
      return {
        success: true,
        provider: 'sendgrid',
        simulated: true,
        messageId: `SG_SIM_${Date.now()}`,
        status: 'SENT',
        to,
        subject,
        note: 'SendGrid API key not configured. Email simulated safely in showroom mode.',
      };
    }

    try {
      const payload = {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail, name: fromName },
        subject,
        content: [
          { type: 'text/plain', value: text || subject },
          { type: 'text/html', value: html || `<p>${text || subject}</p>` },
        ],
      };

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 202 || response.ok) {
        return {
          success: true,
          provider: 'sendgrid',
          messageId: `SG_${Date.now()}`,
          status: 'SENT',
          note: 'Live SendGrid email dispatched successfully!',
        };
      } else {
        const errorBody = await response.text();
        return {
          success: false,
          provider: 'sendgrid',
          error: `SendGrid error (${response.status}): ${errorBody}`,
        };
      }
    } catch (err) {
      return {
        success: false,
        provider: 'sendgrid',
        error: `SendGrid Network Error: ${err.message}`,
      };
    }
  }

  /**
   * High-Level Trigger: Order Placement Confirmation Email
   */
  async sendOrderEmail({ order, email }) {
    if (!email) return { success: false, error: 'Customer email missing' };

    const orderNum = order.orderNumber || (order._id ? order._id.toString().slice(-6) : 'DEMO');
    const amount = order.totalAmount || 0;
    const otp = order.deliveryOtp || '4821';
    const itemsCount = (order.items && order.items.length) || 1;

    const subject = `Order Confirmed #${orderNum} - AuraMarket`;
    const text = `Thank you for your order! Order #${orderNum} for ₹${amount} (${itemsCount} items) has been received. Your secret Delivery OTP is: ${otp}. Please provide this to the courier partner upon receipt.`;

    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f1f5f9;">
          <h1 style="color: #0f172a; margin: 0; font-size: 24px;">AuraMarket</h1>
          <p style="color: #64748b; font-size: 14px; margin: 4px 0 0;">Multi-Vendor Marketplace</p>
        </div>
        <div style="padding: 24px 0;">
          <h2 style="color: #10b981; margin: 0 0 12px; font-size: 20px;">🎉 Order Confirmed!</h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">
            Thank you for shopping with us. Your multi-vendor order <strong>#${orderNum}</strong> has been confirmed and routed to the seller partners for dispatch.
          </p>
          <div style="background: #f8fafc; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <p style="margin: 0; font-size: 14px; color: #475569;">Grand Total: <strong style="color: #0f172a; font-size: 18px;">₹${amount}</strong></p>
            <p style="margin: 8px 0 0; font-size: 14px; color: #475569;">Delivery Verification OTP: <strong style="color: #f59e0b; font-size: 20px; letter-spacing: 2px;">${otp}</strong></p>
            <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8;">(Share this secret 4-digit code ONLY with your courier partner at your doorstep)</p>
          </div>
        </div>
        <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">© 2026 AuraMarket Multi-Vendor Marketplace Platform. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendMail({ to: email, subject, text, html });
  }
}

module.exports = new MailService();
