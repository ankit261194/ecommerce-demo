// Default Responsive HTML Transactional Email Templates for AuraMarket
const getDefaultEmailTemplates = () => [
  {
    templateKey: 'welcome',
    name: 'Customer Welcome & Onboarding',
    subject: 'Welcome to {{store_name}}, {{customer_name}}! 🎉',
    variables: ['{{customer_name}}', '{{customer_email}}', '{{store_name}}', '{{store_url}}', '{{discount_code}}'],
    enabled: true,
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 36px 24px; text-align: center; color: #ffffff; }
    .content { padding: 32px 28px; line-height: 1.6; }
    .coupon-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0; }
    .coupon-code { font-size: 20px; font-weight: 800; color: #4f46e5; letter-spacing: 2px; }
    .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-weight: 700; margin-top: 16px; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0; font-size: 24px;">Welcome to {{store_name}}!</h1>
      <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Your journey to effortless online shopping starts here</p>
    </div>
    <div class="content">
      <p>Hi <strong>{{customer_name}}</strong>,</p>
      <p>Thank you for joining <strong>{{store_name}}</strong>! We are thrilled to welcome you to our marketplace community. Explore thousands of top-rated products from verified regional merchants.</p>
      <div class="coupon-box">
        <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">Here is a special welcome treat for your first order:</p>
        <div class="coupon-code">{{discount_code}}</div>
        <p style="margin: 8px 0 0; font-size: 12px; color: #94a3b8;">Use this code during checkout for exclusive savings.</p>
      </div>
      <p style="text-align: center;">
        <a href="{{store_url}}" class="btn">Start Shopping Now →</a>
      </p>
      <p style="margin-top: 24px; font-size: 13px; color: #64748b;">If you have any questions or need recommendations, our support team is always ready to assist you.</p>
    </div>
    <div class="footer">
      © {{store_name}} Commerce Inc. All rights reserved. Registered email: {{customer_email}}
    </div>
  </div>
</body>
</html>`,
  },
  {
    templateKey: 'order_placed',
    name: 'Order Confirmation & Receipt',
    subject: 'Order Confirmed! #{{order_id}} — {{store_name}}',
    variables: ['{{customer_name}}', '{{order_id}}', '{{order_date}}', '{{order_total}}', '{{item_count}}', '{{shipping_address}}', '{{track_url}}'],
    enabled: true,
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #0f172a; padding: 32px 24px; text-align: center; color: #ffffff; }
    .content { padding: 32px 28px; }
    .receipt-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .total-row { display: flex; justify-content: space-between; font-weight: 800; font-size: 16px; border-top: 2px dashed #cbd5e1; padding-top: 12px; margin-top: 12px; color: #0f172a; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 22px;">Order Placed Successfully!</h1>
      <p style="margin: 6px 0 0; color: #38bdf8; font-size: 13px;">Order #{{order_id}}</p>
    </div>
    <div class="content">
      <p>Dear <strong>{{customer_name}}</strong>,</p>
      <p>Thank you for your order! We have received your payment and our merchants have started packing your package.</p>
      <div class="receipt-card">
        <div style="font-weight: 700; margin-bottom: 12px; font-size: 14px; color: #334155;">Order Summary</div>
        <div class="row"><span>Order Date:</span><strong>{{order_date}}</strong></div>
        <div class="row"><span>Total Items:</span><strong>{{item_count}} item(s)</strong></div>
        <div class="row"><span>Delivery Address:</span><span style="max-width: 60%; text-align: right;">{{shipping_address}}</span></div>
        <div class="total-row"><span>Total Paid:</span><span style="color:#16a34a;">₹{{order_total}}</span></div>
      </div>
      <p style="text-align: center; margin: 24px 0;">
        <a href="{{track_url}}" class="btn">Track Order Live →</a>
      </p>
      <p style="font-size: 12px; color: #64748b;">You will receive another update as soon as your items are handed over to our delivery courier.</p>
    </div>
    <div class="footer">
      © {{store_name}} • 100% Buyer Protection & Express Logistics
    </div>
  </div>
</body>
</html>`,
  },
  {
    templateKey: 'order_dispatched',
    name: 'Order Dispatched & Tracking',
    subject: 'Your Order #{{order_id}} is On Its Way! 🚚',
    variables: ['{{customer_name}}', '{{order_id}}', '{{courier_name}}', '{{tracking_number}}', '{{track_url}}', '{{delivery_eta}}'],
    enabled: true,
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #0284c7, #0369a1); padding: 32px 24px; text-align: center; color: #ffffff; }
    .content { padding: 32px 28px; }
    .shipment-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .badge { display: inline-block; background: #16a34a; color: white; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; }
    .btn { display: inline-block; background: #0284c7; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 22px;">Your Shipment Has Dispatched!</h1>
      <p style="margin: 6px 0 0; opacity: 0.9; font-size: 13px;">Estimated Arrival: {{delivery_eta}}</p>
    </div>
    <div class="content">
      <p>Hello <strong>{{customer_name}}</strong>,</p>
      <p>Great news! Your package for Order <strong>#{{order_id}}</strong> has been dispatched and is currently in transit.</p>
      <div class="shipment-box">
        <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom: 12px;">
          <span style="font-weight: 700; color: #166534;">Courier Logistics Partner:</span>
          <span class="badge">{{courier_name}}</span>
        </div>
        <p style="margin: 0; font-size: 13px; color: #374151;">Waybill / AWB: <strong>{{tracking_number}}</strong></p>
      </div>
      <p style="text-align: center; margin: 24px 0;">
        <a href="{{track_url}}" class="btn">View Live Tracking →</a>
      </p>
      <p style="font-size: 12px; color: #64748b;">Please keep your contact phone active for the delivery rider when arriving at your location.</p>
    </div>
    <div class="footer">
      Powered by AuraMarket Express Dispatch Engine
    </div>
  </div>
</body>
</html>`,
  },
  {
    templateKey: 'order_delivered',
    name: 'Order Delivered Successfully',
    subject: 'Delivered! Your Package #{{order_id}} Has Arrived 📦',
    variables: ['{{customer_name}}', '{{order_id}}', '{{delivery_time}}', '{{review_url}}', '{{invoice_url}}'],
    enabled: true,
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #10b981, #059669); padding: 32px 24px; text-align: center; color: #ffffff; }
    .content { padding: 32px 28px; }
    .btn { display: inline-block; background: #059669; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; margin: 6px; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 22px;">Package Delivered!</h1>
      <p style="margin: 6px 0 0; opacity: 0.9; font-size: 13px;">Delivered at {{delivery_time}}</p>
    </div>
    <div class="content">
      <p>Hi <strong>{{customer_name}}</strong>,</p>
      <p>Your package for Order <strong>#{{order_id}}</strong> has been delivered. We hope you love your new purchase!</p>
      <p>If you have any feedback or want to help other shoppers, please take 30 seconds to rate your purchase:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="{{review_url}}" class="btn">⭐ Rate & Review Products</a>
        <a href="{{invoice_url}}" style="display:inline-block; padding: 12px 20px; color: #475569; text-decoration: none; font-weight: 600; font-size: 13px;">Download Tax Invoice</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">Not satisfied? You are protected by our 7-Day Hassle-Free Return & Exchange guarantee via your account dashboard.</p>
    </div>
    <div class="footer">
      Thank you for shopping with us!
    </div>
  </div>
</body>
</html>`,
  },
  {
    templateKey: 'refund_approved',
    name: 'Refund Approved & Wallet Credit',
    subject: 'Refund Processed for Order #{{order_id}} — ₹{{refund_amount}}',
    variables: ['{{customer_name}}', '{{order_id}}', '{{refund_amount}}', '{{refund_method}}', '{{arn_number}}'],
    enabled: true,
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #059669, #0d9488); padding: 32px 24px; text-align: center; color: #ffffff; }
    .content { padding: 32px 28px; }
    .refund-card { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 22px;">Refund Processed Successfully</h1>
      <p style="margin: 6px 0 0; opacity: 0.9; font-size: 13px;">₹{{refund_amount}} credited</p>
    </div>
    <div class="content">
      <p>Dear <strong>{{customer_name}}</strong>,</p>
      <p>Your refund request for Order <strong>#{{order_id}}</strong> has been approved and issued.</p>
      <div class="refund-card">
        <div style="font-size: 13px; margin-bottom: 6px;">Refund Amount: <strong style="font-size: 16px; color:#065f46;">₹{{refund_amount}}</strong></div>
        <div style="font-size: 13px; margin-bottom: 6px;">Payment Method: <strong>{{refund_method}}</strong></div>
        <div style="font-size: 12px; color: #047857;">Bank ARN / Reference: <code>{{arn_number}}</code></div>
      </div>
      <p style="font-size: 12px; color: #64748b;">Depending on your bank or card issuer, funds typically reflect in your account within 2-4 business days.</p>
    </div>
    <div class="footer">
      AuraMarket Secure Escrow & Refund Protection
    </div>
  </div>
</body>
</html>`,
  },
  {
    templateKey: 'password_reset',
    name: 'Password Reset & OTP Verification',
    subject: 'Reset Your {{store_name}} Password — OTP: {{otp_code}}',
    variables: ['{{customer_name}}', '{{otp_code}}', '{{reset_url}}', '{{expiry_mins}}', '{{store_name}}'],
    enabled: true,
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #1e1b4b; padding: 32px 24px; text-align: center; color: #ffffff; }
    .content { padding: 32px 28px; }
    .otp-card { background: #f5f3ff; border: 2px dashed #c4b5fd; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-code { font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #6d28d9; margin: 8px 0; font-family: monospace; }
    .btn { display: inline-block; background: #6d28d9; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; margin-top: 14px; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 22px;">Security Verification</h1>
      <p style="margin: 6px 0 0; color: #c4b5fd; font-size: 13px;">Password Reset Request</p>
    </div>
    <div class="content">
      <p>Hello <strong>{{customer_name}}</strong>,</p>
      <p>We received a request to reset your password for your <strong>{{store_name}}</strong> account. Use the one-time verification code below:</p>
      <div class="otp-card">
        <div style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: #7c3aed;">Your 6-Digit Verification OTP</div>
        <div class="otp-code">{{otp_code}}</div>
        <div style="font-size: 12px; color: #8b5cf6;">Valid for {{expiry_mins}} minutes. Never share this code with anyone.</div>
      </div>
      <p style="text-align: center;">
        <a href="{{reset_url}}" class="btn">Reset Password Directly →</a>
      </p>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">If you did not request this password reset, please ignore this email or contact support immediately.</p>
    </div>
    <div class="footer">
      © {{store_name}} Security Operations Center
    </div>
  </div>
</body>
</html>`,
  },
];

module.exports = { getDefaultEmailTemplates };
