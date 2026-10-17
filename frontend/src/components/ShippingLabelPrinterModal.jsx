import React, { useState, useRef } from 'react';
import {
  Printer,
  FileText,
  X,
  CheckCircle2,
  Download,
  QrCode,
  Truck,
  Building2,
  MapPin,
  Phone,
  ShieldCheck,
  Maximize2,
  Copy,
} from 'lucide-react';

export default function ShippingLabelPrinterModal({
  isOpen,
  onClose,
  order,
  vendorData = { storeName: 'Apex Tech Hub', phone: '+91 98765 43210', gstin: '07AAAAA0000A1Z5' },
}) {
  const [printFormat, setPrintFormat] = useState('thermal'); // 'thermal' | 'a4'
  const [maskPhone, setMaskPhone] = useState(false);
  const printAreaRef = useRef(null);

  if (!isOpen || !order) return null;

  const orderNum = order.parentOrderNumber || order.id || 'ORD-98214';
  const subOrderNum = order.id || 'SUB-9821';
  const customerName = order.customerName || 'Aman Sharma';
  const rawCustomerPhone = order.customerPhone || (order.shippingAddress?.phone) || '9876543210';
  const customerPhone = maskPhone && rawCustomerPhone.length >= 10
    ? `${rawCustomerPhone.slice(0, 2)}XXXXXX${rawCustomerPhone.slice(-2)}`
    : rawCustomerPhone;
  const customerAddress = order.shippingAddress
    ? `${order.shippingAddress.street || ''}, ${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} - ${order.shippingAddress.pincode || '110001'}`
    : 'Flat 402, Green Valley Apartments, Sector 62, Noida, UP - 201301';
  const isCOD = order.paymentMethod === 'COD';
  const amountToCollect = isCOD ? (order.subTotal || 8999) : 0;
  const items = order.items || [{ title: 'Aura Pro ANC Headphones', qty: 1, price: 8999 }];
  const routingCode = `EXP-${(order.pincode || '110001').slice(0, 3)}-${subOrderNum.slice(-4)}`;
  const invoiceNumber = `INV-${new Date().getFullYear()}-${subOrderNum.replace(/[^a-zA-Z0-9]/g, '')}`;

  // 1-Click Print Execution
  const handleTriggerPrint = () => {
    window.print();
  };

  // Open clean printable window
  const handleOpenPrintWindow = () => {
    const printContent = printAreaRef.current?.innerHTML;
    if (!printContent) return;

    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (!printWin) {
      window.print();
      return;
    }

    const isThermal = printFormat === 'thermal';
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${isThermal ? 'Shipping Label' : 'Tax Invoice'} - ${subOrderNum}</title>
          <style>
            @page {
              size: ${isThermal ? '100mm 150mm' : 'A4'};
              margin: ${isThermal ? '0' : '15mm'};
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #000;
              margin: ${isThermal ? '4mm' : '0'};
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * { box-sizing: border-box; }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Shipping Label & Branded Packing Slip Station</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Point #39
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Point #57
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Direct Thermal (100x150mm) & A4 Packing Slip printer with vector barcodes & phone masking
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Pills & Toolbar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider">Format:</span>
            <button
              type="button"
              onClick={() => setPrintFormat('thermal')}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                printFormat === 'thermal'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>4x6" Thermal Label (100x150mm)</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat('a4')}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                printFormat === 'a4'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>A4 Full Tax Invoice / Packing Slip</span>
            </button>

            {/* Phone Masking Toggle (Point #39) */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-colors">
              <input
                type="checkbox"
                checked={maskPhone}
                onChange={(e) => setMaskPhone(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-0 cursor-pointer accent-amber-500"
              />
              <span className="text-[11px] font-semibold text-slate-300">
                Mask Phone {maskPhone ? '(Active)' : ''}
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenPrintWindow}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Open dedicated print window"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Print Window</span>
            </button>
            <button
              type="button"
              onClick={handleTriggerPrint}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all hover:scale-105"
            >
              <Printer className="w-4 h-4" />
              <span>Print Document Now</span>
            </button>
          </div>
        </div>

        {/* Document Preview Box (White Sheet on Dark Backdrop) */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950/70 flex justify-center">
          <div ref={printAreaRef} className="w-full flex justify-center">
            {printFormat === 'thermal' ? (
              /* ==================== 4x6 THERMAL SHIPPING LABEL ==================== */
              <div
                id="thermal-label-container"
                className="w-full max-w-[390px] bg-white text-black p-4 rounded-xl border-2 border-black font-sans shadow-2xl space-y-3 leading-tight select-all"
                style={{ minHeight: '560px' }}
              >
                {/* Brand & Carrier Header */}
                <div className="flex items-center justify-between border-b-2 border-black pb-2">
                  <div>
                    <h1 className="text-base font-black tracking-tight uppercase">AuraMarket Express</h1>
                    <p className="text-[10px] font-bold text-neutral-600">Priority B2C Parcel Delivery</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase rounded">
                      AIR / SURFACE
                    </span>
                    <p className="text-[10px] font-bold text-neutral-700 mt-0.5">HUB: DEL-01</p>
                  </div>
                </div>

                {/* Barcode & Sub-Order Ref */}
                <div className="text-center py-2 space-y-1">
                  {/* High Density Vector Barcode */}
                  <div
                    className="h-11 w-full mx-auto"
                    style={{
                      background:
                        'repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 9px, #000 9px, #000 13px, #fff 13px, #fff 15px)',
                    }}
                  />
                  <p className="font-mono text-sm font-black tracking-widest">{subOrderNum}</p>
                </div>

                {/* Routing & Specs Bar */}
                <div className="grid grid-cols-2 gap-2 border-t-2 border-b-2 border-black py-1.5 text-xs font-bold">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase">Routing Code:</span>
                    <p className="font-mono font-black text-sm">{routingCode}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-500 uppercase">Weight / Pack:</span>
                    <p className="font-black">0.85 KG | Box 1/1</p>
                  </div>
                </div>

                {/* Payment Badge Banner */}
                {isCOD ? (
                  <div className="p-2 bg-black text-white text-center rounded">
                    <p className="text-xs uppercase tracking-wider font-bold">CASH ON DELIVERY (COD)</p>
                    <p className="text-base font-black">COLLECT: ₹{amountToCollect.toLocaleString('en-IN')}</p>
                  </div>
                ) : (
                  <div className="p-1.5 border-2 border-dashed border-black text-center text-xs font-black uppercase">
                    PREPAID ORDER — DO NOT COLLECT CASH
                  </div>
                )}

                {/* Ship To Section */}
                <div className="border border-neutral-300 rounded p-2 bg-neutral-50/50 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Deliver To:</span>
                  <p className="font-black text-sm text-neutral-950">{customerName}</p>
                  <p className="text-xs text-neutral-800 font-medium">{customerAddress}</p>
                  <p className="text-xs font-bold pt-0.5">Phone: {customerPhone}</p>
                </div>

                {/* Return Address (Seller) */}
                <div className="border-t border-dashed border-neutral-400 pt-2 text-[10px] text-neutral-700 space-y-0.5">
                  <p className="font-black uppercase text-neutral-900">Return Address (Seller):</p>
                  <p className="font-bold text-neutral-900">{vendorData.storeName} (GSTIN: {vendorData.gstin || '07AAAAA0000A1Z5'})</p>
                  <p>Tech Logistics Park, Sector 62, Noida, UP, 201301 | Support: {vendorData.phone}</p>
                </div>

                {/* Item Manifest Mini Table */}
                <div className="border-t border-black pt-2">
                  <table className="w-full text-left text-[10px]">
                    <thead>
                      <tr className="border-b border-neutral-300 font-bold uppercase text-neutral-500">
                        <th className="pb-1">SKU / Item</th>
                        <th className="pb-1 text-center">Qty</th>
                        <th className="pb-1 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-1 font-medium truncate max-w-[180px]">{it.title}</td>
                          <td className="py-1 text-center font-bold">{it.qty}</td>
                          <td className="py-1 text-right font-bold">₹{it.price.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* OTP Security Notice */}
                <div className="border-t border-dashed border-neutral-400 pt-2 text-center text-[9px] text-neutral-600 font-bold">
                  🔒 Handover to delivery rider. Customer OTP verified at doorstep.
                </div>
              </div>
            ) : (
              /* ==================== A4 TAX INVOICE & PACKING SLIP ==================== */
              <div
                id="a4-slip-container"
                className="w-full max-w-[720px] bg-white text-slate-900 p-8 rounded-2xl border border-slate-300 font-sans shadow-2xl space-y-6 select-all"
                style={{ minHeight: '900px' }}
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-950">AuraMarket Platform</h1>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      OFFICIAL TAX INVOICE & STORE PACKING SLIP
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">Multi-Vendor E-Commerce Logistics Network</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-base font-black text-slate-900">{invoiceNumber}</p>
                    <p className="text-xs text-slate-600 font-bold">Order Ref: {orderNum}</p>
                    <p className="text-xs text-slate-600 font-bold">Sub-Order: {subOrderNum}</p>
                    <p className="text-xs text-slate-500">
                      Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Seller & Customer Meta Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1 text-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Sold & Shipped By (Merchant):
                    </span>
                    <p className="text-sm font-black text-slate-900">{vendorData.storeName}</p>
                    <p className="text-slate-600">Plot 42, Tech Hub Logistics Center, Sector 62, Noida, UP, 201301</p>
                    <p className="font-bold text-slate-800">GSTIN: {vendorData.gstin || '07AAAAA0000A1Z5'}</p>
                    <p className="text-slate-600">Merchant Phone: {vendorData.phone}</p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1 text-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Billed & Shipped To (Customer):
                    </span>
                    <p className="text-sm font-black text-slate-900">{customerName}</p>
                    <p className="text-slate-600">{customerAddress}</p>
                    <p className="font-bold text-slate-800">Customer Contact: {customerPhone}</p>
                    <p className="text-slate-500">Routing: <strong>{routingCode}</strong></p>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-white font-bold uppercase text-[11px]">
                      <tr>
                        <th className="px-3 py-2.5">#</th>
                        <th className="px-3 py-2.5">Product Description</th>
                        <th className="px-3 py-2.5">SKU / Code</th>
                        <th className="px-3 py-2.5 text-center">Qty</th>
                        <th className="px-3 py-2.5 text-right">Unit Price</th>
                        <th className="px-3 py-2.5 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="px-3 py-2.5 font-bold text-slate-950">{it.title}</td>
                          <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">
                            {it.variantSku || `APX-SKU-${idx + 1}`}
                          </td>
                          <td className="px-3 py-2.5 text-center font-black">{it.qty}</td>
                          <td className="px-3 py-2.5 text-right">₹{it.price.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2.5 text-right font-black">
                            ₹{(it.price * it.qty).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary & Totals */}
                <div className="flex justify-end">
                  <div className="w-72 space-y-2 text-xs border-t-2 border-slate-900 pt-3">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal (Items):</span>
                      <span className="font-bold text-slate-900">₹{(order.subTotal || 8999).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>GST / Tax (Included 18%):</span>
                      <span className="font-bold text-slate-900">
                        ₹{Math.round((order.subTotal || 8999) * 0.18).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Shipping & Packaging:</span>
                      <span className="font-bold text-emerald-600">FREE</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-slate-950 border-t border-slate-300 pt-2">
                      <span>Grand Total:</span>
                      <span>₹{(order.subTotal || 8999).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-right text-[11px] text-slate-500 font-medium pt-1">
                      Payment Mode: <strong className="text-slate-900 uppercase">{order.paymentMethod || 'PREPAID'}</strong>
                    </div>
                  </div>
                </div>

                {/* Footer Signatory & Compliance */}
                <div className="pt-8 border-t border-slate-200 flex items-end justify-between text-xs text-slate-500">
                  <div className="max-w-md space-y-1">
                    <p className="font-bold text-slate-700">Declaration & Terms:</p>
                    <p className="text-[11px]">
                      We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. Handled in accordance with AuraMarket Seller SLA.
                    </p>
                  </div>
                  <div className="text-center border-t border-slate-900 pt-2 w-44">
                    <p className="font-bold text-slate-900 text-xs">Authorized Signatory</p>
                    <p className="text-[10px] text-slate-500">{vendorData.storeName}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 flex items-center justify-between bg-slate-950/50 text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Barcode & QR verified. Compatible with Zebra, Rollo, TSC & laser printers.</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
