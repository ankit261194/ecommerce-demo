/**
 * Point 75: In-Browser Direct Thermal Receipt Printer (ESC/POS 80mm & 58mm)
 * Universal Receipt Generator producing:
 * 1. Raw ESC/POS binary command stream (Base64) for hardware serial/USB/Bluetooth POS printers
 * 2. Monospace plain-text aligned for 48-col (80mm) and 32-col (58mm) paper
 * 3. Zero-clip HTML/CSS print template with continuous thermal roll styling
 */

const ESC = '\x1B';
const GS = '\x1D';

const ESCPOS = {
  INIT: `${ESC}@`,
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_RIGHT: `${ESC}a\x02`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  DOUBLE_SIZE: `${GS}!\x11`,
  DOUBLE_HEIGHT: `${GS}!\x01`,
  NORMAL_SIZE: `${GS}!\x00`,
  CUT_FULL: `${GS}V\x00`,
  CUT_PARTIAL: `${GS}V\x01`,
  FEED_3: `${ESC}d\x03`,
};

function padColumns(left, right, width = 48) {
  const leftStr = String(left || '');
  const rightStr = String(right || '');
  const totalLen = leftStr.length + rightStr.length;
  if (totalLen >= width) {
    const available = width - rightStr.length - 1;
    const truncated = leftStr.slice(0, Math.max(0, available));
    return `${truncated} ${rightStr}`;
  }
  const spaces = ' '.repeat(width - totalLen);
  return `${leftStr}${spaces}${rightStr}`;
}

function formatCenter(text, width = 48) {
  const str = String(text || '').trim();
  if (str.length >= width) return str.slice(0, width);
  const leftPadding = Math.floor((width - str.length) / 2);
  const rightPadding = width - str.length - leftPadding;
  return `${' '.repeat(leftPadding)}${str}${' '.repeat(rightPadding)}`;
}

function generateThermalReceipt({
  order,
  vendorProfile = null,
  paperWidth = '80mm', // '80mm' (48 cols) or '58mm' (32 cols)
  storeName = 'AuraMarket Store',
}) {
  const widthCols = paperWidth === '58mm' ? 32 : 48;
  const divider = '='.repeat(widthCols);
  const dashed = '-'.repeat(widthCols);
  const is58mm = widthCols === 32;

  // Filter items if specific vendor requested
  let items = order.items || [];
  if (vendorProfile && vendorProfile._id) {
    const vendorIdStr = vendorProfile._id.toString();
    items = items.filter(
      (item) => (item.vendor?._id || item.vendor || '').toString() === vendorIdStr
    );
  }

  const orderNum = order.orderNumber || order._id.toString().slice(-8).toUpperCase();
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const customerName = order.customer?.name || order.shippingAddress?.recipientName || 'Valued Customer';
  const customerPhone = order.customer?.phone || order.shippingAddress?.phone || '';
  const paymentMethod = (order.paymentMethod || 'COD').toUpperCase();
  const paymentStatus = (order.paymentStatus || 'PENDING').toUpperCase();
  const deliveryOtp = order.deliveryOtp || '4821';

  // ----------------------------------------------------
  // 1. Generate Formatted Monospace Plain Text
  // ----------------------------------------------------
  const textLines = [];

  textLines.push(formatCenter(storeName.toUpperCase(), widthCols));
  if (vendorProfile?.storeName) {
    textLines.push(formatCenter(`Merchant: ${vendorProfile.storeName}`, widthCols));
  }
  textLines.push(formatCenter('TAX INVOICE & DELIVERY RECEIPT', widthCols));
  textLines.push(divider);

  textLines.push(padColumns('Order #:', orderNum, widthCols));
  textLines.push(padColumns('Date:', orderDate, widthCols));
  textLines.push(padColumns('Customer:', customerName.slice(0, is58mm ? 18 : 30), widthCols));
  if (customerPhone) {
    textLines.push(padColumns('Phone:', customerPhone, widthCols));
  }
  textLines.push(padColumns('Payment:', `${paymentMethod} (${paymentStatus})`, widthCols));

  if (order.shippingAddress?.city) {
    const cityState = `${order.shippingAddress.city}, ${order.shippingAddress.pincode || ''}`;
    textLines.push(padColumns('Destination:', cityState.slice(0, is58mm ? 18 : 30), widthCols));
  }

  textLines.push(dashed);
  textLines.push(padColumns('ITEM DESCRIPTION', 'AMOUNT', widthCols));
  textLines.push(dashed);

  let calculatedSubtotal = 0;
  for (const item of items) {
    const qty = item.quantity || 1;
    const price = item.price || 0;
    const itemTotal = item.totalPrice || price * qty;
    calculatedSubtotal += itemTotal;

    const titleStr = `${qty}x ${item.title || 'Product'}`;
    const priceStr = `INR ${itemTotal.toFixed(2)}`;

    textLines.push(padColumns(titleStr, priceStr, widthCols));
    if (item.variantName || item.variantSku) {
      const variantStr = `   (${item.variantName || item.variantSku})`;
      textLines.push(variantStr.slice(0, widthCols));
    }
  }

  textLines.push(dashed);
  const subTotalAmount = vendorProfile ? calculatedSubtotal : (order.subtotal || calculatedSubtotal);
  textLines.push(padColumns('Subtotal:', `INR ${subTotalAmount.toFixed(2)}`, widthCols));

  if (!vendorProfile && (order.discountAmount || 0) > 0) {
    textLines.push(padColumns('Discount / Coupon:', `-INR ${order.discountAmount.toFixed(2)}`, widthCols));
  }

  if (!vendorProfile && (order.shippingFee || 0) > 0) {
    textLines.push(padColumns('Shipping Fee:', `INR ${order.shippingFee.toFixed(2)}`, widthCols));
  }

  if (!vendorProfile && (order.taxAmount || 0) > 0) {
    textLines.push(padColumns('GST / Tax (Incl):', `INR ${order.taxAmount.toFixed(2)}`, widthCols));
  }

  textLines.push(divider);
  const finalTotal = vendorProfile ? calculatedSubtotal : (order.totalAmount || calculatedSubtotal);
  textLines.push(padColumns('NET PAYABLE:', `INR ${finalTotal.toFixed(2)}`, widthCols));
  textLines.push(divider);

  // Security / Handover Code Box
  textLines.push(formatCenter('*** DELIVERY HANDOVER OTP ***', widthCols));
  textLines.push(formatCenter(`[ ${deliveryOtp} ]`, widthCols));
  textLines.push(formatCenter('Verify code before handing over parcel', widthCols));
  textLines.push(dashed);

  // Footer notes
  textLines.push(formatCenter('Thank you for shopping with us!', widthCols));
  textLines.push(formatCenter('GST Compliant Computer Generated Slip', widthCols));
  textLines.push(formatCenter('www.auramarket.com', widthCols));

  const rawText = textLines.join('\n');

  // ----------------------------------------------------
  // 2. Build ESC/POS Binary Command Stream
  // ----------------------------------------------------
  let escPosCommands = '';
  escPosCommands += ESCPOS.INIT;
  escPosCommands += ESCPOS.ALIGN_CENTER;
  escPosCommands += ESCPOS.DOUBLE_SIZE;
  escPosCommands += `${storeName}\n`;
  escPosCommands += ESCPOS.NORMAL_SIZE;

  if (vendorProfile?.storeName) {
    escPosCommands += `Merchant: ${vendorProfile.storeName}\n`;
  }
  escPosCommands += 'TAX INVOICE & PACKING RECEIPT\n';
  escPosCommands += `${divider}\n`;

  escPosCommands += ESCPOS.ALIGN_LEFT;
  escPosCommands += `${padColumns('Order #:', orderNum, widthCols)}\n`;
  escPosCommands += `${padColumns('Date:', orderDate, widthCols)}\n`;
  escPosCommands += `${padColumns('Customer:', customerName.slice(0, is58mm ? 18 : 30), widthCols)}\n`;
  escPosCommands += `${padColumns('Payment:', `${paymentMethod} (${paymentStatus})`, widthCols)}\n`;
  escPosCommands += `${dashed}\n`;
  escPosCommands += `${padColumns('ITEM DESCRIPTION', 'AMOUNT', widthCols)}\n`;
  escPosCommands += `${dashed}\n`;

  for (const item of items) {
    const qty = item.quantity || 1;
    const price = item.price || 0;
    const itemTotal = item.totalPrice || price * qty;
    escPosCommands += `${padColumns(`${qty}x ${item.title || 'Product'}`, `INR ${itemTotal.toFixed(2)}`, widthCols)}\n`;
    if (item.variantName || item.variantSku) {
      escPosCommands += `   (${item.variantName || item.variantSku})\n`;
    }
  }

  escPosCommands += `${dashed}\n`;
  escPosCommands += `${padColumns('Subtotal:', `INR ${subTotalAmount.toFixed(2)}`, widthCols)}\n`;
  if (!vendorProfile && (order.discountAmount || 0) > 0) {
    escPosCommands += `${padColumns('Discount:', `-INR ${order.discountAmount.toFixed(2)}`, widthCols)}\n`;
  }
  if (!vendorProfile && (order.shippingFee || 0) > 0) {
    escPosCommands += `${padColumns('Shipping:', `INR ${order.shippingFee.toFixed(2)}`, widthCols)}\n`;
  }

  escPosCommands += `${divider}\n`;
  escPosCommands += ESCPOS.BOLD_ON;
  escPosCommands += `${padColumns('TOTAL PAYABLE:', `INR ${finalTotal.toFixed(2)}`, widthCols)}\n`;
  escPosCommands += ESCPOS.BOLD_OFF;
  escPosCommands += `${divider}\n`;

  escPosCommands += ESCPOS.ALIGN_CENTER;
  escPosCommands += 'DELIVERY HANDOVER OTP\n';
  escPosCommands += ESCPOS.DOUBLE_HEIGHT;
  escPosCommands += `[ ${deliveryOtp} ]\n`;
  escPosCommands += ESCPOS.NORMAL_SIZE;
  escPosCommands += 'Thank you for your order!\n';
  escPosCommands += ESCPOS.FEED_3;
  escPosCommands += ESCPOS.CUT_PARTIAL;

  const escPosBuffer = Buffer.from(escPosCommands, 'binary');
  const escPosBase64 = escPosBuffer.toString('base64');

  // ----------------------------------------------------
  // 3. Generate Zero-Clip Printable HTML Document
  // ----------------------------------------------------
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt #${orderNum} - ${paperWidth}</title>
  <style>
    @page {
      size: ${paperWidth} auto;
      margin: 0mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', Courier, Consolas, monospace;
      font-size: ${is58mm ? '11px' : '12px'};
      line-height: 1.35;
      color: #000;
      background: #fff;
      margin: 0;
      padding: ${is58mm ? '3mm 2mm' : '4mm 3mm'};
      width: ${paperWidth};
      max-width: ${paperWidth};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .title { font-size: ${is58mm ? '14px' : '16px'}; font-weight: 900; letter-spacing: 0.5px; }
    .subtitle { font-size: 10px; margin-top: 2px; }
    .divider-solid { border-top: 1.5px solid #000; margin: 6px 0; }
    .divider-dashed { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px; }
    .row .label { flex: 1; word-break: break-word; }
    .row .value { text-align: right; white-space: nowrap; font-weight: 600; padding-left: 4px; }
    .item-row { margin-bottom: 4px; }
    .item-sub { font-size: 9px; color: #333; padding-left: 8px; }
    .otp-box {
      border: 1.5px solid #000;
      padding: 6px 4px;
      margin: 8px 0;
      text-align: center;
      background: #fbfbfb;
    }
    .otp-title { font-size: 9px; font-weight: bold; text-transform: uppercase; }
    .otp-code { font-size: 18px; font-weight: 900; letter-spacing: 4px; margin: 2px 0; }
    .footer { font-size: 9px; text-align: center; margin-top: 10px; }
    @media print {
      body { width: 100% !important; padding: 2mm !important; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="title">${storeName.toUpperCase()}</div>
    ${vendorProfile?.storeName ? `<div class="subtitle">Merchant: <strong>${vendorProfile.storeName}</strong></div>` : ''}
    <div class="subtitle">TAX INVOICE & DELIVERY RECEIPT</div>
  </div>

  <div class="divider-solid"></div>

  <div class="row"><span class="label">Order #:</span><span class="value font-bold">${orderNum}</span></div>
  <div class="row"><span class="label">Date:</span><span class="value">${orderDate}</span></div>
  <div class="row"><span class="label">Customer:</span><span class="value">${customerName}</span></div>
  ${customerPhone ? `<div class="row"><span class="label">Phone:</span><span class="value">${customerPhone}</span></div>` : ''}
  <div class="row"><span class="label">Payment:</span><span class="value">${paymentMethod} (${paymentStatus})</span></div>

  <div class="divider-dashed"></div>
  <div class="row font-bold">
    <span class="label">ITEM DESCRIPTION</span>
    <span class="value">AMOUNT</span>
  </div>
  <div class="divider-dashed"></div>

  ${items
    .map((item) => {
      const qty = item.quantity || 1;
      const price = item.price || 0;
      const total = item.totalPrice || price * qty;
      return `
    <div class="item-row">
      <div class="row">
        <span class="label">${qty}x ${item.title || 'Product'}</span>
        <span class="value">&#8377;${total.toFixed(2)}</span>
      </div>
      ${item.variantName || item.variantSku ? `<div class="item-sub">(${item.variantName || item.variantSku})</div>` : ''}
    </div>`;
    })
    .join('')}

  <div class="divider-dashed"></div>

  <div class="row"><span class="label">Subtotal:</span><span class="value">&#8377;${subTotalAmount.toFixed(2)}</span></div>
  ${
    !vendorProfile && (order.discountAmount || 0) > 0
      ? `<div class="row"><span class="label">Discount:</span><span class="value">-&#8377;${order.discountAmount.toFixed(2)}</span></div>`
      : ''
  }
  ${
    !vendorProfile && (order.shippingFee || 0) > 0
      ? `<div class="row"><span class="label">Shipping:</span><span class="value">&#8377;${order.shippingFee.toFixed(2)}</span></div>`
      : ''
  }
  ${
    !vendorProfile && (order.taxAmount || 0) > 0
      ? `<div class="row"><span class="label">Tax / GST:</span><span class="value">&#8377;${order.taxAmount.toFixed(2)}</span></div>`
      : ''
  }

  <div class="divider-solid"></div>
  <div class="row font-bold" style="font-size: ${is58mm ? '12px' : '14px'};">
    <span class="label">TOTAL PAYABLE:</span>
    <span class="value">&#8377;${finalTotal.toFixed(2)}</span>
  </div>
  <div class="divider-solid"></div>

  <div class="otp-box">
    <div class="otp-title">&#128273; Secure Delivery Handover OTP</div>
    <div class="otp-code">${deliveryOtp}</div>
    <div style="font-size: 8px; color: #444;">Verify code with customer before handing over parcel</div>
  </div>

  <div class="footer">
    <div>*** THANK YOU FOR YOUR PURCHASE ***</div>
    <div>GST Compliant Computer Generated Receipt</div>
    <div>www.auramarket.com</div>
  </div>
</body>
</html>`;

  return {
    orderId: order._id,
    orderNumber: orderNum,
    paperWidth,
    columns: widthCols,
    itemsCount: items.length,
    rawText,
    escPosBase64,
    html,
  };
}

module.exports = {
  generateThermalReceipt,
  padColumns,
  formatCenter,
  ESCPOS,
};
