/**
 * Point 73: Smart Multi-Vendor Split Packing Slip Helper
 * Generates itemized split vendor slips with HSN & Tax details, dynamic QR codes, and printable HTML.
 */

const { generateQRCodeSVG } = require('./qrCodeGenerator');

function formatCurrency(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildSplitPackingSlipData({ order, subOrder, vendor, customer, items, trackingBaseUrl }) {
  const orderNumber = order.orderNumber || order._id.toString();
  const subOrderNumber = subOrder?._id ? `SUB-${subOrder._id.toString().slice(-6).toUpperCase()}` : `SUB-${orderNumber.slice(-4)}`;
  const baseUrl = trackingBaseUrl || 'https://shribalajikripadham.online/ecommerce-demo/';
  const trackingUrl = `${baseUrl.replace(/\/+$/, '')}/#order-track?id=${encodeURIComponent(orderNumber)}`;

  // Generate dynamic QR code pointing to live tracking URL
  const qr = generateQRCodeSVG(trackingUrl, { size: 160, padding: 2 });

  // Calculate HSN & Tax itemized breakdown
  const itemizedItems = items.map((item, idx) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const totalPrice = Number(item.totalPrice) || (qty * price);
    const hsnCode = item.hsnCode || (item.product?.hsnCode) || '85183000';
    const gstRate = 18;
    const taxableValue = Math.round((totalPrice / (1 + gstRate / 100)) * 100) / 100;
    const totalTax = Math.round((totalPrice - taxableValue) * 100) / 100;
    const cgstRate = 9;
    const sgstRate = 9;
    const cgstAmount = Math.round((totalTax / 2) * 100) / 100;
    const sgstAmount = Math.round((totalTax - cgstAmount) * 100) / 100;

    return {
      index: idx + 1,
      title: item.title || item.product?.title || 'Product Item',
      variantSku: item.variantSku || item.sku || 'SKU-STD',
      variantName: item.variantName || 'Standard',
      hsnCode,
      quantity: qty,
      unitPrice: price,
      totalPrice,
      taxableValue,
      gstRate,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      totalTax,
    };
  });

  const subTotal = itemizedItems.reduce((acc, it) => acc + it.totalPrice, 0);
  const totalTaxable = Math.round(itemizedItems.reduce((acc, it) => acc + it.taxableValue, 0) * 100) / 100;
  const totalCgst = Math.round(itemizedItems.reduce((acc, it) => acc + it.cgstAmount, 0) * 100) / 100;
  const totalSgst = Math.round(itemizedItems.reduce((acc, it) => acc + it.sgstAmount, 0) * 100) / 100;
  const totalTax = Math.round((totalCgst + totalSgst) * 100) / 100;

  const isCOD = (order.paymentMethod || '').toUpperCase() === 'COD';
  const routingCode = `EXP-${(order.shippingAddress?.pincode || '110001').slice(0, 3)}-${subOrderNumber.slice(-4)}`;

  return {
    slipId: `SLIP-${subOrderNumber}`,
    orderId: order._id,
    orderNumber,
    subOrderId: subOrder?._id || null,
    subOrderNumber,
    invoiceDate: subOrder?.createdAt || order.createdAt || new Date(),
    routingCode,
    trackingUrl,
    qrCodeSvg: qr.svg,
    qrCodeDataUri: qr.dataUri,
    isCOD,
    amountToCollect: isCOD ? subTotal : 0,
    paymentMethod: order.paymentMethod || 'PREPAID',
    paymentStatus: order.paymentStatus || 'PAID',
    courierPartner: subOrder?.deliveryPartner?.name || 'AuraMarket Express Logistics',
    deliveryOtpNotice: 'Customer 4-digit secret delivery OTP required for release.',
    seller: {
      id: vendor._id,
      storeName: vendor.storeName || 'Apex Tech Hub',
      storeSlug: vendor.storeSlug || 'apex-tech',
      logo: vendor.logo || vendor.storeLogo || null,
      gstin: vendor.gstin || '07AAAAA0000A1Z5',
      phone: vendor.phone || '+91 98765 43210',
      email: vendor.supportEmail || 'merchant@auramarket.com',
      address: vendor.address || 'Plot 42, Logistics Park, Tech Zone 4, Greater Noida, UP - 201306',
    },
    customer: {
      name: order.shippingAddress?.recipientName || customer?.name || 'Valued Customer',
      phone: order.shippingAddress?.phone || customer?.phone || '9876543210',
      street: order.shippingAddress?.street || 'Flat 402, Green Valley Apartments',
      city: order.shippingAddress?.city || 'New Delhi',
      state: order.shippingAddress?.state || 'Delhi',
      pincode: order.shippingAddress?.pincode || '110001',
      fullAddress: `${order.shippingAddress?.street || ''}, ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} - ${order.shippingAddress?.pincode || ''}`,
      deliveryInstructions: order.deliveryInstructions || subOrder?.deliveryInstructions || 'Leave at doorstep or reception',
    },
    items: itemizedItems,
    summary: {
      itemCount: itemizedItems.reduce((acc, it) => acc + it.quantity, 0),
      totalTaxable,
      totalCgst,
      totalSgst,
      totalTax,
      shippingFee: 0,
      grandTotal: subTotal,
    },
  };
}

function renderPrintableSplitSlipHtml(slipDataList, options = {}) {
  const slips = Array.isArray(slipDataList) ? slipDataList : [slipDataList];
  const format = options.format || 'a4'; // 'a4' | 'thermal'

  const styles = `
    @page {
      size: ${format === 'thermal' ? '100mm 150mm' : 'A4'};
      margin: ${format === 'thermal' ? '3mm' : '12mm'};
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: ${format === 'thermal' ? '10px' : '11px'};
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .slip-container {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: ${format === 'thermal' ? '8px' : '20px'};
      margin-bottom: 24px;
      page-break-after: always;
      background: #ffffff;
    }
    .slip-container:last-child {
      page-break-after: avoid;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .brand-title {
      font-size: ${format === 'thermal' ? '14px' : '18px'};
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .badge-split {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .qr-box {
      text-align: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px;
    }
    .qr-box svg {
      width: ${format === 'thermal' ? '80px' : '95px'};
      height: ${format === 'thermal' ? '80px' : '95px'};
      display: block;
      margin: 0 auto;
    }
    .qr-caption {
      font-size: 8px;
      color: #64748b;
      margin-top: 3px;
      font-weight: 600;
    }
    .grid-party {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    .party-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      background: #f8fafc;
    }
    .party-label {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .party-name {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .table-breakdown {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: ${format === 'thermal' ? '9px' : '10px'};
    }
    .table-breakdown th {
      background: #0f172a;
      color: #ffffff;
      padding: 6px 6px;
      text-align: left;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .table-breakdown td {
      padding: 6px 6px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 10px;
      gap: 12px;
    }
    .notice-box {
      flex: 1;
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: 6px;
      padding: 8px;
      font-size: 9px;
      color: #92400e;
    }
    .totals-card {
      width: ${format === 'thermal' ? '180px' : '240px'};
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      background: #f8fafc;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-size: 10px;
    }
    .grand-total-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 900;
      color: #0f172a;
      border-top: 1px solid #0f172a;
      padding-top: 4px;
      margin-top: 4px;
    }
    .sign-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 18px;
      padding-top: 8px;
      border-top: 1px dashed #cbd5e1;
      font-size: 9px;
      color: #64748b;
    }
    .sign-box {
      border-top: 1px solid #0f172a;
      padding-top: 3px;
      min-width: 130px;
      text-align: center;
      font-weight: 700;
      color: #0f172a;
    }
    .cod-banner {
      background: #dc2626;
      color: #ffffff;
      font-weight: 900;
      text-align: center;
      padding: 4px;
      font-size: 11px;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .prepaid-banner {
      background: #16a34a;
      color: #ffffff;
      font-weight: 800;
      text-align: center;
      padding: 4px;
      font-size: 10px;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    @media print {
      .no-print { display: none !important; }
      body { margin: 0; padding: 0; }
      .slip-container { border: 1px solid #000; box-shadow: none; }
    }
  `;

  const slipsHtml = slips.map((slip) => `
    <div class="slip-container">
      ${slip.isCOD
        ? `<div class="cod-banner">CASH ON DELIVERY (COD) — COLLECT ₹${slip.amountToCollect.toLocaleString('en-IN')}</div>`
        : `<div class="prepaid-banner">PREPAID ORDER — DO NOT COLLECT CASH (${slip.paymentMethod})</div>`}

      <div class="header-bar">
        <div>
          <div class="brand-title">AuraMarket Logistics</div>
          <div class="badge-split">Multi-Vendor Split Packing Slip</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
            <strong>Slip #:</strong> ${slip.slipId} &nbsp;|&nbsp;
            <strong>Order #:</strong> ${slip.orderNumber}
          </div>
          <div style="font-size: 9px; color: #64748b;">
            <strong>Routing Code:</strong> ${slip.routingCode} &nbsp;|&nbsp;
            <strong>Date:</strong> ${new Date(slip.invoiceDate).toLocaleDateString('en-IN')}
          </div>
        </div>
        <div class="qr-box">
          ${slip.qrCodeSvg}
          <div class="qr-caption">Scan for Live GPS Tracking</div>
        </div>
      </div>

      <div class="grid-party">
        <div class="party-card">
          <div class="party-label">Merchant (Seller) Information</div>
          <div class="party-name">${slip.seller.storeName}</div>
          <div><strong>GSTIN:</strong> ${slip.seller.gstin}</div>
          <div>${slip.seller.address}</div>
          <div><strong>Phone:</strong> ${slip.seller.phone}</div>
        </div>
        <div class="party-card">
          <div class="party-label">Ship To (Customer Details)</div>
          <div class="party-name">${slip.customer.name}</div>
          <div>${slip.customer.fullAddress}</div>
          <div><strong>Phone:</strong> ${slip.customer.phone}</div>
          ${slip.customer.deliveryInstructions ? `<div style="margin-top:2px; color:#b45309; font-weight:600;">Note: ${slip.customer.deliveryInstructions}</div>` : ''}
        </div>
      </div>

      <table class="table-breakdown">
        <thead>
          <tr>
            <th style="width: 20px;">#</th>
            <th>Item & Variant Details</th>
            <th>SKU</th>
            <th class="text-center">HSN</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Taxable Val</th>
            <th class="text-center">GST</th>
            <th class="text-right">CGST (9%)</th>
            <th class="text-right">SGST (9%)</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${slip.items.map((it) => `
            <tr>
              <td>${it.index}</td>
              <td>
                <strong>${it.title}</strong>
                <div style="font-size: 8px; color: #64748b;">${it.variantName}</div>
              </td>
              <td><code>${it.variantSku}</code></td>
              <td class="text-center"><strong>${it.hsnCode}</strong></td>
              <td class="text-center font-bold">${it.quantity}</td>
              <td class="text-right">₹${it.unitPrice.toLocaleString('en-IN')}</td>
              <td class="text-right">₹${it.taxableValue.toLocaleString('en-IN')}</td>
              <td class="text-center">${it.gstRate}%</td>
              <td class="text-right">₹${it.cgstAmount.toLocaleString('en-IN')}</td>
              <td class="text-right">₹${it.sgstAmount.toLocaleString('en-IN')}</td>
              <td class="text-right font-bold">₹${it.totalPrice.toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals-wrapper">
        <div class="notice-box">
          <div style="font-weight: 800; text-transform: uppercase; font-size: 9px; margin-bottom: 2px;">Delivery Security Protocol:</div>
          <div>${slip.deliveryOtpNotice}</div>
          <div style="margin-top: 4px; font-size: 8px; color: #78350f;">
            Live tracking scan URL: <code style="word-break: break-all;">${slip.trackingUrl}</code>
          </div>
        </div>

        <div class="totals-card">
          <div class="total-row"><span>Taxable Value:</span><span>₹${slip.summary.totalTaxable.toLocaleString('en-IN')}</span></div>
          <div class="total-row"><span>CGST (9%):</span><span>₹${slip.summary.totalCgst.toLocaleString('en-IN')}</span></div>
          <div class="total-row"><span>SGST (9%):</span><span>₹${slip.summary.totalSgst.toLocaleString('en-IN')}</span></div>
          <div class="total-row"><span>Shipping Charges:</span><span>FREE</span></div>
          <div class="grand-total-row">
            <span>Sub-Order Total:</span>
            <span>₹${slip.summary.grandTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div class="sign-row">
        <div>
          Computer-generated official split packing slip under Rule 46 of CGST Rules.<br>
          Generated on behalf of <strong>${slip.seller.storeName}</strong> via AuraMarket Enterprise.
        </div>
        <div class="sign-box">
          Authorized Signatory<br>
          <span style="font-size: 8px; color: #64748b;">${slip.seller.storeName}</span>
        </div>
      </div>
    </div>
  `).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Smart Multi-Vendor Split Packing Slip</title>
  <style>${styles}</style>
</head>
<body>
  <div class="no-print" style="padding: 12px; background: #0f172a; color: #fff; text-align: center; margin-bottom: 12px; font-weight: bold; font-size: 13px;">
    <span>Smart Multi-Vendor Split Packing Slip with Dynamic QR Codes</span> &nbsp;—&nbsp;
    <button onclick="window.print()" style="background: #f59e0b; color: #000; border: none; padding: 6px 14px; font-weight: bold; border-radius: 6px; cursor: pointer;">
      🖨️ 1-Click Print All Slips
    </button>
  </div>
  ${slipsHtml}
</body>
</html>`;
}

module.exports = {
  buildSplitPackingSlipData,
  renderPrintableSplitSlipHtml,
};
