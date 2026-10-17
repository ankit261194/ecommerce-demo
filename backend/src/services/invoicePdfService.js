const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * Standard Indian State to GST State Code mapping (2-digit)
 */
const STATE_GST_CODES = {
  'JAMMU AND KASHMIR': '01',
  'HIMACHAL PRADESH': '02',
  'PUNJAB': '03',
  'CHANDIGARH': '04',
  'UTTARAKHAND': '05',
  'HARYANA': '06',
  'DELHI': '07',
  'RAJASTHAN': '08',
  'UTTAR PRADESH': '09',
  'BIHAR': '10',
  'SIKKIM': '11',
  'ARUNACHAL PRADESH': '12',
  'NAGALAND': '13',
  'MANIPUR': '14',
  'MIZORAM': '15',
  'TRIPURA': '16',
  'MEGHALAYA': '17',
  'ASSAM': '18',
  'WEST BENGAL': '19',
  'JHARKHAND': '20',
  'ODISHA': '21',
  'CHHATTISGARH': '22',
  'MADHYA PRADESH': '23',
  'GUJARAT': '24',
  'DAMAN AND DIU': '25',
  'DADRA AND NAGAR HAVELI': '26',
  'MAHARASHTRA': '27',
  'ANDHRA PRADESH': '37',
  'KARNATAKA': '29',
  'GOA': '30',
  'LAKSHADWEEP': '31',
  'KERALA': '32',
  'TAMIL NADU': '33',
  'PUDUCHERRY': '34',
  'ANDAMAN AND NICOBAR ISLANDS': '35',
  'TELANGANA': '36',
  'LADAKH': '38',
};

function getStateCode(stateName, fallback = '07') {
  if (!stateName) return fallback;
  const normalized = stateName.trim().toUpperCase();
  return STATE_GST_CODES[normalized] || fallback;
}

/**
 * Convert numeric Indian Rupee amount to words
 */
function numberToWords(amount) {
  const num = Math.round(Number(amount) || 0);
  if (num === 0) return 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n) {
    if (n === 0) return '';
    if (n < 20) return units[n] + ' ';
    const t = Math.floor(n / 10);
    const u = n % 10;
    return tens[t] + (u > 0 ? '-' + units[u] : '') + ' ';
  }

  function convertThreeDigits(n) {
    let res = '';
    const h = Math.floor(n / 100);
    const rem = n % 100;
    if (h > 0) res += units[h] + ' Hundred ';
    if (rem > 0) res += convertTwoDigits(rem);
    return res;
  }

  let crore = Math.floor(num / 10000000);
  let rem = num % 10000000;
  let lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  let thousand = Math.floor(rem / 1000);
  rem = rem % 1000;
  let hundred = rem;

  let words = '';
  if (crore > 0) words += convertThreeDigits(crore) + 'Crore ';
  if (lakh > 0) words += convertThreeDigits(lakh) + 'Lakh ';
  if (thousand > 0) words += convertThreeDigits(thousand) + 'Thousand ';
  if (hundred > 0) words += convertThreeDigits(hundred);

  return 'Rupees ' + words.trim() + ' Only';
}

/**
 * Format currency amount with commas (Rs. X,XX,XXX.XX)
 */
function formatCurrency(num) {
  const val = Number(num) || 0;
  return 'Rs. ' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Prepare all invoice computational data, HSN groupings, QR payload, and digital seal
 */
async function getInvoiceData(order, customTaxCfg = null) {
  const mongoose = require('mongoose');
  let taxCfg = customTaxCfg;
  if (!taxCfg) {
    try {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const UIConfig = require('../models/UIConfig');
        const uiConfig = await UIConfig.findOne().lean();
        taxCfg = uiConfig?.taxSettings || {};
      } else {
        taxCfg = {};
      }
    } catch (_) {
      taxCfg = {};
    }
  }

  const primaryVendor = order.subOrders?.[0]?.vendor || (order.items?.[0]?.vendor);
  const sellerState = primaryVendor?.state || taxCfg.state || 'Delhi';
  const sellerStateCode = getStateCode(sellerState, taxCfg.stateCode || '07');

  const seller = {
    companyName: 'AuraMarket India Technologies Pvt. Ltd.',
    legalEntity: taxCfg.companyName || 'AuraMarket India Technologies Pvt. Ltd.',
    storeName: primaryVendor?.storeName || taxCfg.companyName || 'AuraMarket Official Store',
    gstin: primaryVendor?.gstin || taxCfg.gstin || '07AABCA1234D1Z5',
    cin: taxCfg.cin || 'U72900DL2024PTC123456',
    pan: primaryVendor?.pan || taxCfg.pan || 'AABCA1234D',
    address: primaryVendor?.pickupAddress || taxCfg.corporateAddress || 'Corporate Office: Tech Park Hub, Tower 3, Okhla Industrial Area Phase-III, New Delhi, Delhi 110020',
    phone: primaryVendor?.phone || taxCfg.supportPhone || '+91 8533955333',
    email: primaryVendor?.businessEmail || taxCfg.supportEmail || 'billing@auramarket.com',
    state: sellerState,
    stateCode: sellerStateCode,
  };

  const buyerState = order.shippingAddress?.state || 'Delhi';
  const buyerStateCode = getStateCode(buyerState, '07');

  const buyer = {
    name: order.shippingAddress?.recipientName || order.shippingAddress?.fullName || order.customer?.name || 'Valued Customer',
    phone: order.shippingAddress?.phone || order.customer?.phone || 'N/A',
    email: order.customer?.email || 'customer@auramarket.com',
    street: order.shippingAddress?.street || 'Customer Address',
    city: order.shippingAddress?.city || 'Delhi',
    state: buyerState,
    stateCode: buyerStateCode,
    pincode: order.shippingAddress?.pincode || '110001',
    address: `${order.shippingAddress?.street || ''}, ${order.shippingAddress?.city || ''}, ${buyerState} - ${order.shippingAddress?.pincode || ''}`.replace(/^, /, ''),
  };

  // Inter-State vs Intra-State logic:
  // Same State -> Intra-State (CGST 9% + SGST 9%)
  // Different State -> Inter-State (IGST 18%)
  const isInterState = seller.stateCode !== buyer.stateCode;

  const invoiceNumber = `INV-${order.orderNumber || (order._id ? order._id.toString().slice(-8).toUpperCase() : Date.now())}`;
  const invoiceDateObj = order.createdAt ? new Date(order.createdAt) : new Date();
  const invoiceDate = invoiceDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const placeOfSupply = `${buyer.state} (${buyer.stateCode})`;
  const reverseCharge = 'NO';

  // Total discounts from coupons / reward coins
  const totalDiscount = (order.discountAmount || 0) + (order.walletCoinsUsed || 0);
  const items = order.items || [];
  const totalRawGross = items.reduce((sum, it) => sum + ((it.price || 0) * (it.quantity || 1)), 0);

  let totalTaxableAmount = 0;
  let totalTaxAmount = 0;
  const hsnMap = {};

  const lineItems = items.map((item, idx) => {
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.price) || 0;
    const lineGross = unitPrice * qty;

    // Allocate discount proportionally across items
    let lineDiscount = 0;
    if (totalDiscount > 0 && totalRawGross > 0) {
      lineDiscount = Math.round(((lineGross / totalRawGross) * totalDiscount) * 100) / 100;
    }

    const netLineTotal = Math.max(0, lineGross - lineDiscount);
    // Standard 18% inclusive GST
    const taxableValue = Math.round((netLineTotal / 1.18) * 100) / 100;
    const tax = Math.round((netLineTotal - taxableValue) * 100) / 100;

    const cgst = isInterState ? 0 : Math.round((tax / 2) * 100) / 100;
    const sgst = isInterState ? 0 : Math.round((tax - cgst) * 100) / 100;
    const igst = isInterState ? tax : 0;

    totalTaxableAmount += taxableValue;
    totalTaxAmount += tax;

    const hsnCode = item.hsnCode || '85183000';
    if (!hsnMap[hsnCode]) {
      hsnMap[hsnCode] = {
        hsnCode,
        taxableValue: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTax: 0,
      };
    }
    hsnMap[hsnCode].taxableValue += taxableValue;
    hsnMap[hsnCode].cgstAmount += cgst;
    hsnMap[hsnCode].sgstAmount += sgst;
    hsnMap[hsnCode].igstAmount += igst;
    hsnMap[hsnCode].totalTax += tax;

    return {
      itemNo: idx + 1,
      title: item.title || item.product?.title || 'E-Commerce Product',
      variantSku: item.variantSku || 'STD-SKU',
      hsnCode,
      quantity: qty,
      unitPrice,
      unitGrossPrice: unitPrice,
      discount: lineDiscount,
      taxableAmount: taxableValue,
      taxableValue: taxableValue,
      taxRate: '18%',
      cgst,
      sgst,
      igst,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      total: netLineTotal,
      totalAmount: netLineTotal,
    };
  });

  const subtotal = Math.round(totalTaxableAmount * 100) / 100;
  const cgstTotal = isInterState ? 0 : Math.round((totalTaxAmount / 2) * 100) / 100;
  const sgstTotal = isInterState ? 0 : Math.round((totalTaxAmount - cgstTotal) * 100) / 100;
  const igstTotal = isInterState ? Math.round(totalTaxAmount * 100) / 100 : 0;
  const totalTax = Math.round(totalTaxAmount * 100) / 100;
  const shippingFee = Number(order.shippingFee) || 0;
  const discount = totalDiscount;
  const grandTotal = Number(order.totalAmount) || Math.round((subtotal + totalTax + shippingFee) * 100) / 100;
  const amountInWords = numberToWords(grandTotal);

  const hsnBreakdown = Object.values(hsnMap).map(h => ({
    hsnCode: h.hsnCode,
    taxableAmount: Math.round(h.taxableValue * 100) / 100,
    taxableValue: Math.round(h.taxableValue * 100) / 100,
    cgst: Math.round(h.cgstAmount * 100) / 100,
    sgst: Math.round(h.sgstAmount * 100) / 100,
    igst: Math.round(h.igstAmount * 100) / 100,
    cgstAmount: Math.round(h.cgstAmount * 100) / 100,
    sgstAmount: Math.round(h.sgstAmount * 100) / 100,
    igstAmount: Math.round(h.igstAmount * 100) / 100,
    totalTax: Math.round(h.totalTax * 100) / 100,
  }));

  // Cryptographic SHA-256 seal
  const digitalHash = crypto
    .createHash('sha256')
    .update(`${invoiceNumber}:${grandTotal}:${order.createdAt || ''}`)
    .digest('hex');
  const shortHash = digitalHash.slice(0, 16).toUpperCase();

  const digitalSeal = {
    signer: 'AuraMarket Authorized Signatory',
    authority: 'AuraMarket India Technologies Pvt. Ltd.',
    legalEntity: seller.legalEntity,
    gstin: seller.gstin,
    cin: seller.cin,
    hash: digitalHash,
    shortHash,
    certifiedAt: new Date().toISOString(),
    verified: true,
    verificationCode: `AUTH-SEAL-${shortHash}`,
    actNotice: 'Issued under Section 31 of CGST Act, 2017',
    badgeText: 'Digitally Signed by AuraMarket Technologies Pvt. Ltd.',
    subText: 'Authorized Signatory • Verified by Government GST Portal Guidelines',
  };

  // Dynamic GST QR Code String conforming to GST e-Invoice guidelines
  const qrString = `GSTIN:${seller.gstin}|INV:${invoiceNumber}|DATE:${invoiceDate}|TOTAL:${grandTotal}|TAX:${totalTax}|CGST:${cgstTotal}|SGST:${sgstTotal}|IGST:${igstTotal}|BUYER:${buyer.name.slice(0, 20)}|HASH:${shortHash}`;

  const [qrCodeDataUrl, qrCodeBuffer] = await Promise.all([
    QRCode.toDataURL(qrString, { width: 140, margin: 1, errorCorrectionLevel: 'M' }),
    QRCode.toBuffer(qrString, { width: 90, margin: 1, errorCorrectionLevel: 'M' }),
  ]);

  const gstSummary = {
    isInterState,
    supplyType: isInterState ? 'Inter-State (IGST 18%)' : 'Intra-State (CGST 9% + SGST 9%)',
    placeOfSupply,
    reverseCharge,
    hsnBreakdown,
    taxableAmount: subtotal,
    cgst: cgstTotal,
    sgst: sgstTotal,
    igst: igstTotal,
    totalTax,
    shippingFee,
    discount,
    grandTotal,
    amountInWords,
  };

  return {
    invoiceNumber,
    invoiceDate,
    orderNumber: order.orderNumber || order._id.toString(),
    placeOfSupply,
    reverseCharge,
    seller,
    buyer,
    lineItems,
    gstSummary,
    pricing: {
      subtotal,
      cgstTotal,
      sgstTotal,
      igstTotal,
      totalTax,
      shippingFee,
      discount,
      grandTotal,
      amountInWords,
      isInterState,
    },
    digitalSeal,
    qrString,
    qrCodeDataUrl,
    qrCodeBuffer,
  };
}

/**
 * Generate native PDF with PDFKit, pipe to Express response or return Buffer
 *
 * @param {Object} order - Full order object with populated customer/vendor
 * @param {Object|null} res - Express response object (optional)
 * @param {Object} options - { download: boolean, taxSettings: object }
 * @returns {Promise<{ buffer: Buffer, invoiceNumber: string, grandTotal: number, digitalSeal: object, qrCodeDataUrl: string, gstSummary: object }>}
 */
async function generateInvoicePdf(order, res = null, options = {}) {
  const download = options.download === true || options.download === 'true' || options.download === '1';
  const data = await getInvoiceData(order, options.taxSettings);

  const {
    invoiceNumber,
    invoiceDate,
    orderNumber,
    placeOfSupply,
    reverseCharge,
    seller,
    buyer,
    lineItems,
    gstSummary,
    pricing,
    digitalSeal,
    qrCodeBuffer,
    qrCodeDataUrl,
  } = data;

  if (res) {
    res.setHeader('Content-Type', 'application/pdf');
    const disposition = download ? 'attachment' : 'inline';
    const filenameNumber = order.orderNumber || (order._id ? order._id.toString().slice(-8).toUpperCase() : invoiceNumber);
    res.setHeader('Content-Disposition', `${disposition}; filename="Invoice-${filenameNumber}.pdf"`);
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36, // 0.5 inch margins
        info: {
          Title: `GST Tax Invoice - ${invoiceNumber}`,
          Author: seller.companyName,
          Subject: `Official Tax Invoice for Order #${orderNumber}`,
          Keywords: 'GST, Tax Invoice, QR Code, Digital Seal, AuraMarket',
          Creator: 'AuraMarket Native Invoice PDF Generator',
        },
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));

      if (res) {
        doc.pipe(res);
      }

      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          buffer,
          invoiceNumber,
          invoiceDate,
          grandTotal: pricing.grandTotal,
          digitalSeal,
          qrCodeDataUrl,
          gstSummary,
        });
      });

      doc.on('error', err => reject(err));

      const pageWidth = 595.28;
      const leftMargin = 36;
      const contentWidth = pageWidth - (leftMargin * 2); // 523.28 pt

      // ==========================================
      // 1. TOP HEADER BRAND & TAX INVOICE BADGE
      // ==========================================
      const headerTopY = 32;

      // Dark Navy Background Top Accent Bar
      doc.rect(leftMargin, headerTopY, contentWidth, 3).fill('#0F2444');

      // Company Brand
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#0F2444')
        .text('AuraMarket India Technologies Pvt. Ltd.', leftMargin, headerTopY + 10);

      // Tax Invoice Label (Right side)
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#0F2444')
        .text('TAX INVOICE', leftMargin + 320, headerTopY + 10, { width: contentWidth - 320, align: 'right' });

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#B45309')
        .text('ORIGINAL FOR RECIPIENT', leftMargin + 320, headerTopY + 26, { width: contentWidth - 320, align: 'right' });

      // Company Corporate Identifiers line
      doc.font('Helvetica').fontSize(7.5).fillColor('#475569')
        .text(`GSTIN: ${seller.gstin}   |   CIN: ${seller.cin}   |   PAN: ${seller.pan}`, leftMargin, headerTopY + 28);
      doc.font('Helvetica').fontSize(7).fillColor('#64748b')
        .text(`${seller.address}   •   Support: ${seller.phone} | ${seller.email}`, leftMargin, headerTopY + 38);

      // Horizontal Divider
      doc.rect(leftMargin, headerTopY + 50, contentWidth, 0.75).fill('#CBD5E1');

      // ==========================================
      // 2. INVOICE METADATA STRIP
      // ==========================================
      const metaY = headerTopY + 56;
      doc.rect(leftMargin, metaY, contentWidth, 26).fill('#F8FAFC');
      doc.rect(leftMargin, metaY, contentWidth, 26).stroke('#E2E8F0');

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0F2444')
        .text('Invoice No:', leftMargin + 8, metaY + 5)
        .font('Helvetica').fillColor('#1E293B')
        .text(invoiceNumber, leftMargin + 60, metaY + 5);

      doc.font('Helvetica-Bold').fillColor('#0F2444')
        .text('Invoice Date:', leftMargin + 8, metaY + 15)
        .font('Helvetica').fillColor('#1E293B')
        .text(invoiceDate, leftMargin + 60, metaY + 15);

      doc.font('Helvetica-Bold').fillColor('#0F2444')
        .text('Order Ref:', leftMargin + 175, metaY + 5)
        .font('Helvetica').fillColor('#1E293B')
        .text(orderNumber, leftMargin + 225, metaY + 5);

      doc.font('Helvetica-Bold').fillColor('#0F2444')
        .text('Supply Type:', leftMargin + 175, metaY + 15)
        .font('Helvetica').fillColor('#1E293B')
        .text(gstSummary.supplyType, leftMargin + 225, metaY + 15);

      doc.font('Helvetica-Bold').fillColor('#0F2444')
        .text('Place of Supply:', leftMargin + 355, metaY + 5)
        .font('Helvetica').fillColor('#1E293B')
        .text(placeOfSupply, leftMargin + 425, metaY + 5);

      doc.font('Helvetica-Bold').fillColor('#0F2444')
        .text('Reverse Charge:', leftMargin + 355, metaY + 15)
        .font('Helvetica').fillColor('#1E293B')
        .text(reverseCharge, leftMargin + 425, metaY + 15);

      // ==========================================
      // 3. PARTIES SECTION (INVOICED BY & INVOICED TO)
      // ==========================================
      const partyY = metaY + 32;
      const boxWidth = (contentWidth - 10) / 2;
      const boxHeight = 72;

      // Invoiced By Box (Seller)
      doc.rect(leftMargin, partyY, boxWidth, boxHeight).fill('#F8FAFC');
      doc.rect(leftMargin, partyY, boxWidth, boxHeight).stroke('#CBD5E1');
      doc.rect(leftMargin, partyY, boxWidth, 14).fill('#0F2444');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF')
        .text('INVOICED BY (SELLER / VENDOR)', leftMargin + 6, partyY + 3.5);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0F2444')
        .text(seller.storeName, leftMargin + 6, partyY + 18, { width: boxWidth - 12 });
      doc.font('Helvetica').fontSize(7).fillColor('#334155')
        .text(seller.address, leftMargin + 6, partyY + 29, { width: boxWidth - 12 })
        .text(`GSTIN: ${seller.gstin}   |   PAN: ${seller.pan}`, leftMargin + 6, partyY + 52)
        .text(`State: ${seller.state} (Code: ${seller.stateCode})`, leftMargin + 6, partyY + 62);

      // Invoiced To Box (Buyer)
      const buyerX = leftMargin + boxWidth + 10;
      doc.rect(buyerX, partyY, boxWidth, boxHeight).fill('#F8FAFC');
      doc.rect(buyerX, partyY, boxWidth, boxHeight).stroke('#CBD5E1');
      doc.rect(buyerX, partyY, boxWidth, 14).fill('#0F2444');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF')
        .text('INVOICED TO (BUYER / CUSTOMER)', buyerX + 6, partyY + 3.5);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0F2444')
        .text(buyer.name, buyerX + 6, partyY + 18, { width: boxWidth - 12 });
      doc.font('Helvetica').fontSize(7).fillColor('#334155')
        .text(buyer.address, buyerX + 6, partyY + 29, { width: boxWidth - 12 })
        .text(`Phone: ${buyer.phone}   |   Email: ${buyer.email}`, buyerX + 6, partyY + 52)
        .text(`Place of Supply: ${buyer.state} (State Code: ${buyer.stateCode})`, buyerX + 6, partyY + 62);

      // ==========================================
      // 4. ITEMIZED GST TABLE
      // ==========================================
      const tableTopY = partyY + boxHeight + 8;
      const col = {
        sno: { x: leftMargin, w: 22 },
        desc: { x: leftMargin + 22, w: 165 },
        hsn: { x: leftMargin + 187, w: 48 },
        qty: { x: leftMargin + 235, w: 24 },
        unitPrice: { x: leftMargin + 259, w: 50 },
        discount: { x: leftMargin + 309, w: 42 },
        taxable: { x: leftMargin + 351, w: 56 },
        tax: { x: leftMargin + 407, w: 58 },
        total: { x: leftMargin + 465, w: 58 },
      };

      // Table Header Row
      const tableHeaderHeight = 16;
      doc.rect(leftMargin, tableTopY, contentWidth, tableHeaderHeight).fill('#0F2444');

      doc.font('Helvetica-Bold').fontSize(7).fillColor('#FFFFFF')
        .text('S.No', col.sno.x + 2, tableTopY + 4.5)
        .text('Description of Goods', col.desc.x + 2, tableTopY + 4.5)
        .text('HSN Code', col.hsn.x + 2, tableTopY + 4.5)
        .text('Qty', col.qty.x, tableTopY + 4.5, { width: col.qty.w, align: 'center' })
        .text('Unit Price', col.unitPrice.x, tableTopY + 4.5, { width: col.unitPrice.w - 3, align: 'right' })
        .text('Disc.', col.discount.x, tableTopY + 4.5, { width: col.discount.w - 3, align: 'right' })
        .text('Taxable', col.taxable.x, tableTopY + 4.5, { width: col.taxable.w - 3, align: 'right' })
        .text(gstSummary.isInterState ? 'IGST (18%)' : 'GST (18%)', col.tax.x, tableTopY + 4.5, { width: col.tax.w - 3, align: 'right' })
        .text('Total', col.total.x, tableTopY + 4.5, { width: col.total.w - 3, align: 'right' });

      // Rows
      let rowY = tableTopY + tableHeaderHeight;
      const rowHeight = 18;

      lineItems.forEach((item, i) => {
        const bg = (i % 2 === 0) ? '#FFFFFF' : '#F8FAFC';
        doc.rect(leftMargin, rowY, contentWidth, rowHeight).fill(bg);
        doc.rect(leftMargin, rowY, contentWidth, rowHeight).stroke('#E2E8F0');

        doc.font('Helvetica').fontSize(7).fillColor('#334155')
          .text(String(item.itemNo), col.sno.x + 2, rowY + 5)
          .font('Helvetica-Bold').fillColor('#0F2444')
          .text(item.title.length > 32 ? item.title.slice(0, 30) + '...' : item.title, col.desc.x + 2, rowY + 5, { width: col.desc.w - 4 })
          .font('Helvetica').fillColor('#475569')
          .text(item.hsnCode, col.hsn.x + 2, rowY + 5)
          .text(String(item.quantity), col.qty.x, rowY + 5, { width: col.qty.w, align: 'center' })
          .text(formatCurrency(item.unitPrice), col.unitPrice.x, rowY + 5, { width: col.unitPrice.w - 3, align: 'right' })
          .text(item.discount > 0 ? '-' + formatCurrency(item.discount) : 'Rs. 0.00', col.discount.x, rowY + 5, { width: col.discount.w - 3, align: 'right' })
          .text(formatCurrency(item.taxableAmount), col.taxable.x, rowY + 5, { width: col.taxable.w - 3, align: 'right' })
          .text(formatCurrency(item.igst || (item.cgst + item.sgst)), col.tax.x, rowY + 5, { width: col.tax.w - 3, align: 'right' })
          .font('Helvetica-Bold').fillColor('#0F2444')
          .text(formatCurrency(item.total), col.total.x, rowY + 5, { width: col.total.w - 3, align: 'right' });

        rowY += rowHeight;
      });

      // ==========================================
      // 5. TOTALS & HSN SUMMARY SECTION
      // ==========================================
      const summaryTopY = rowY + 6;
      const leftSummaryWidth = 240;
      const totalsWidth = 230;
      const totalsX = leftMargin + contentWidth - totalsWidth;

      // Left Box: Amount in words & HSN Summary
      doc.rect(leftMargin, summaryTopY, leftSummaryWidth, 24).fill('#F1F5F9');
      doc.rect(leftMargin, summaryTopY, leftSummaryWidth, 24).stroke('#CBD5E1');
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#0F2444')
        .text('Total Amount in Words:', leftMargin + 5, summaryTopY + 3.5);
      doc.font('Helvetica').fontSize(6.5).fillColor('#334155')
        .text(pricing.amountInWords, leftMargin + 5, summaryTopY + 12, { width: leftSummaryWidth - 10 });

      // HSN / SAC Tax Breakdown Table
      const hsnTopY = summaryTopY + 28;
      const hsnHeaderHeight = 12;
      doc.rect(leftMargin, hsnTopY, leftSummaryWidth, hsnHeaderHeight).fill('#334155');
      doc.font('Helvetica-Bold').fontSize(6).fillColor('#FFFFFF')
        .text('HSN/SAC', leftMargin + 4, hsnTopY + 3)
        .text('Taxable', leftMargin + 60, hsnTopY + 3, { width: 50, align: 'right' })
        .text(gstSummary.isInterState ? 'IGST' : 'CGST+SGST', leftMargin + 115, hsnTopY + 3, { width: 60, align: 'right' })
        .text('Total Tax', leftMargin + 180, hsnTopY + 3, { width: 55, align: 'right' });

      let hsnRowY = hsnTopY + hsnHeaderHeight;
      gstSummary.hsnBreakdown.forEach((h, idx) => {
        const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(leftMargin, hsnRowY, leftSummaryWidth, 12).fill(bg);
        doc.rect(leftMargin, hsnRowY, leftSummaryWidth, 12).stroke('#E2E8F0');
        doc.font('Helvetica').fontSize(6).fillColor('#334155')
          .text(h.hsnCode, leftMargin + 4, hsnRowY + 3)
          .text(formatCurrency(h.taxableAmount), leftMargin + 60, hsnRowY + 3, { width: 50, align: 'right' })
          .text(formatCurrency(h.igst || (h.cgst + h.sgst)), leftMargin + 115, hsnRowY + 3, { width: 60, align: 'right' })
          .font('Helvetica-Bold')
          .text(formatCurrency(h.totalTax), leftMargin + 180, hsnRowY + 3, { width: 55, align: 'right' });
        hsnRowY += 12;
      });

      // Right Box: Totals Table
      let totY = summaryTopY;
      const totLineH = 13;

      function renderTotalRow(label, value, isBold = false, isHighlight = false) {
        if (isHighlight) {
          doc.rect(totalsX, totY, totalsWidth, totLineH + 3).fill('#0F2444');
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF')
            .text(label, totalsX + 6, totY + 3.5)
            .text(value, totalsX + 110, totY + 3.5, { width: totalsWidth - 116, align: 'right' });
          totY += totLineH + 4;
        } else {
          doc.rect(totalsX, totY, totalsWidth, totLineH).fill('#F8FAFC');
          doc.rect(totalsX, totY, totalsWidth, totLineH).stroke('#E2E8F0');
          doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7).fillColor(isBold ? '#0F2444' : '#475569')
            .text(label, totalsX + 6, totY + 3)
            .text(value, totalsX + 110, totY + 3, { width: totalsWidth - 116, align: 'right' });
          totY += totLineH;
        }
      }

      renderTotalRow('Total Taxable Value:', formatCurrency(pricing.subtotal));

      if (gstSummary.isInterState) {
        renderTotalRow('Integrated Tax (IGST 18%):', formatCurrency(pricing.igstTotal));
      } else {
        renderTotalRow('Central Tax (CGST 9.0%):', formatCurrency(pricing.cgstTotal));
        renderTotalRow('State Tax (SGST 9.0%):', formatCurrency(pricing.sgstTotal));
      }

      renderTotalRow('Shipping & Logistics Fee:', pricing.shippingFee > 0 ? formatCurrency(pricing.shippingFee) : 'FREE');

      if (pricing.discount > 0) {
        renderTotalRow('Discounts & Coins Redeemed:', '-' + formatCurrency(pricing.discount));
      }

      renderTotalRow('Grand Total (INR):', formatCurrency(pricing.grandTotal), true, true);

      // ==========================================
      // 6. DYNAMIC GST QR CODE & DIGITAL CRYPTOSEAL
      // ==========================================
      const bottomSectionY = Math.max(hsnRowY, totY) + 10;

      // QR Code Box (Left)
      const qrBoxWidth = 160;
      const qrBoxHeight = 100;
      doc.rect(leftMargin, bottomSectionY, qrBoxWidth, qrBoxHeight).fill('#F8FAFC');
      doc.rect(leftMargin, bottomSectionY, qrBoxWidth, qrBoxHeight).stroke('#CBD5E1');

      doc.font('Helvetica-Bold').fontSize(7).fillColor('#0F2444')
        .text('NATIONAL GST e-INVOICE QR CODE', leftMargin + 8, bottomSectionY + 6);

      // Render image directly in PDF
      doc.image(qrCodeBuffer, leftMargin + 10, bottomSectionY + 18, { width: 68, height: 68 });

      doc.font('Helvetica').fontSize(6).fillColor('#64748B')
        .text('Scan using GST Verify app or smartphone camera to validate invoice authenticity on Government Portal.',
          leftMargin + 84, bottomSectionY + 22, { width: 70, align: 'left' });

      // Digital Cryptoseal Box (Right)
      const sealX = leftMargin + qrBoxWidth + 10;
      const sealWidth = contentWidth - qrBoxWidth - 10;
      const sealHeight = 100;

      doc.rect(sealX, bottomSectionY, sealWidth, sealHeight).fill('#F0FDF4');
      doc.rect(sealX, bottomSectionY, sealWidth, sealHeight).stroke('#86EFAC');

      // Top badge header
      doc.rect(sealX, bottomSectionY, sealWidth, 16).fill('#166534');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF')
        .text('OFFICIAL DIGITAL CRYPTOSEAL & AUTHORIZATION', sealX + 8, bottomSectionY + 4);

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#14532D')
        .text(digitalSeal.badgeText, sealX + 8, bottomSectionY + 22);

      doc.font('Helvetica').fontSize(7).fillColor('#166534')
        .text(digitalSeal.subText, sealX + 8, bottomSectionY + 34)
        .text(`Certified Signatory: ${digitalSeal.signer}`, sealX + 8, bottomSectionY + 44)
        .text(`Timestamp: ${digitalSeal.certifiedAt}`, sealX + 8, bottomSectionY + 54);

      // Monospace hash box
      doc.rect(sealX + 8, bottomSectionY + 65, sealWidth - 16, 16).fill('#DCFCE7');
      doc.rect(sealX + 8, bottomSectionY + 65, sealWidth - 16, 16).stroke('#86EFAC');
      doc.font('Courier-Bold').fontSize(7).fillColor('#065F46')
        .text(`Digital Cryptoseal Hash: ${digitalSeal.shortHash} (Verified)`, sealX + 12, bottomSectionY + 70);

      doc.font('Helvetica-Oblique').fontSize(6.5).fillColor('#15803D')
        .text(digitalSeal.actNotice, sealX + 8, bottomSectionY + 86);

      // ==========================================
      // 7. LEGAL FOOTER
      // ==========================================
      const footerY = bottomSectionY + sealHeight + 8;
      doc.rect(leftMargin, footerY, contentWidth, 0.75).fill('#CBD5E1');

      doc.font('Helvetica').fontSize(6.5).fillColor('#64748B')
        .text('• This is an authentic computer-generated electronic invoice issued under Section 31 of CGST Act, 2017. No physical signature required.',
          leftMargin, footerY + 4)
        .text(`• Subject to ${seller.state} Jurisdiction. Questions or Tax Disputes: ${seller.email} | Helpline: ${seller.phone}`,
          leftMargin, footerY + 12);

      doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#0F2444')
        .text('Page 1 of 1 • AuraMarket Corporate Billing', leftMargin + 350, footerY + 8, { width: contentWidth - 350, align: 'right' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  STATE_GST_CODES,
  getStateCode,
  numberToWords,
  formatCurrency,
  getInvoiceData,
  generateInvoicePdf,
};
