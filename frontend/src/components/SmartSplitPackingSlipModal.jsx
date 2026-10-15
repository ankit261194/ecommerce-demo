import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  FileText,
  X,
  QrCode,
  Building2,
  MapPin,
  Phone,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Layers,
  Download,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import axios from 'axios';

export default function SmartSplitPackingSlipModal({
  isOpen,
  onClose,
  orderId,
  role = 'admin',
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [slips, setSlips] = useState([]);
  const [activeSlipIdx, setActiveSlipIdx] = useState(0);
  const [format, setFormat] = useState('a4'); // 'a4' | 'thermal'
  const printContainerRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !orderId) return;

    let isMounted = true;
    const fetchSlips = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const endpoint =
          role === 'admin'
            ? `/api/admin/orders/${orderId}/split-packing-slips`
            : role === 'vendor'
            ? `/api/vendor/orders/${orderId}/split-packing-slip`
            : `/api/orders/${orderId}/split-packing-slips`;

        const res = await axios.get(endpoint, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (isMounted) {
          if (res.data?.success && res.data?.data) {
            setSlips(res.data.data);
            setActiveSlipIdx(0);
          } else {
            setError(res.data?.message || 'Failed to retrieve split packing slips');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || err.message || 'Error loading split packing slips');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSlips();
    return () => {
      isMounted = false;
    };
  }, [isOpen, orderId, role]);

  if (!isOpen) return null;

  const currentSlip = slips[activeSlipIdx] || slips[0];

  const handlePrint = (singleSlipOnly = false) => {
    const slipsToPrint = singleSlipOnly && currentSlip ? [currentSlip] : slips;
    if (!slipsToPrint || slipsToPrint.length === 0) return;

    const printWin = window.open('', '_blank', 'width=900,height=950');
    if (!printWin) {
      window.print();
      return;
    }

    const isThermal = format === 'thermal';
    const slipsHtml = slipsToPrint
      .map(
        (slip) => `
      <div style="border: 1px solid #000; padding: ${isThermal ? '8px' : '18px'}; margin-bottom: 24px; page-break-after: always; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: ${isThermal ? '10px' : '11px'}; color: #000; background: #fff;">
        <div style="background: ${slip.isCOD ? '#000' : '#f1f5f9'}; color: ${slip.isCOD ? '#fff' : '#000'}; font-weight: 900; text-align: center; padding: 4px; font-size: 11px; margin-bottom: 8px;">
          ${slip.isCOD ? `CASH ON DELIVERY (COD) — COLLECT ₹${slip.amountToCollect?.toLocaleString('en-IN')}` : `PREPAID ORDER — DO NOT COLLECT CASH (${slip.paymentMethod})`}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px;">
          <div>
            <div style="font-size: ${isThermal ? '13px' : '16px'}; font-weight: 900;">AuraMarket Express Logistics</div>
            <div style="font-size: 9px; font-weight: bold; text-transform: uppercase;">Smart Multi-Vendor Split Packing Slip</div>
            <div style="font-size: 9px; color: #475569; margin-top: 3px;">
              <strong>Slip #:</strong> ${slip.slipId} &nbsp;|&nbsp; <strong>Order #:</strong> ${slip.orderNumber}
            </div>
            <div style="font-size: 8px; color: #64748b;">
              <strong>Routing Code:</strong> ${slip.routingCode} &nbsp;|&nbsp; <strong>Date:</strong> ${new Date(slip.invoiceDate).toLocaleDateString('en-IN')}
            </div>
          </div>
          <div style="text-align: center; border: 1px solid #cbd5e1; padding: 4px; border-radius: 4px;">
            ${slip.qrCodeSvg}
            <div style="font-size: 7px; font-weight: bold; margin-top: 2px;">SCAN TO TRACK LIVE</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; font-size: 9px;">
          <div style="border: 1px solid #cbd5e1; padding: 6px; border-radius: 4px;">
            <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase;">Merchant (Seller)</div>
            <div style="font-weight: 800; font-size: 11px;">${slip.seller?.storeName}</div>
            <div><strong>GSTIN:</strong> ${slip.seller?.gstin}</div>
            <div>${slip.seller?.address}</div>
            <div><strong>Phone:</strong> ${slip.seller?.phone}</div>
          </div>
          <div style="border: 1px solid #cbd5e1; padding: 6px; border-radius: 4px;">
            <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase;">Ship To (Customer)</div>
            <div style="font-weight: 800; font-size: 11px;">${slip.customer?.name}</div>
            <div>${slip.customer?.fullAddress}</div>
            <div><strong>Phone:</strong> ${slip.customer?.phone}</div>
            ${slip.customer?.deliveryInstructions ? `<div style="font-weight: bold; color: #b45309;">Note: ${slip.customer.deliveryInstructions}</div>` : ''}
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9px;">
          <thead>
            <tr style="background: #0f172a; color: #fff;">
              <th style="padding: 4px; text-align: left;">#</th>
              <th style="padding: 4px; text-align: left;">Item Description</th>
              <th style="padding: 4px; text-align: left;">SKU</th>
              <th style="padding: 4px; text-align: center;">HSN</th>
              <th style="padding: 4px; text-align: center;">Qty</th>
              <th style="padding: 4px; text-align: right;">Price</th>
              <th style="padding: 4px; text-align: right;">Taxable</th>
              <th style="padding: 4px; text-align: center;">GST</th>
              <th style="padding: 4px; text-align: right;">CGST</th>
              <th style="padding: 4px; text-align: right;">SGST</th>
              <th style="padding: 4px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${slip.items
              ?.map(
                (it) => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 4px;">${it.index}</td>
                <td style="padding: 4px;"><strong>${it.title}</strong><div style="font-size: 8px; color: #64748b;">${it.variantName}</div></td>
                <td style="padding: 4px;"><code>${it.variantSku}</code></td>
                <td style="padding: 4px; text-align: center;"><strong>${it.hsnCode}</strong></td>
                <td style="padding: 4px; text-align: center; font-weight: bold;">${it.quantity}</td>
                <td style="padding: 4px; text-align: right;">₹${it.unitPrice?.toLocaleString('en-IN')}</td>
                <td style="padding: 4px; text-align: right;">₹${it.taxableValue?.toLocaleString('en-IN')}</td>
                <td style="padding: 4px; text-align: center;">${it.gstRate}%</td>
                <td style="padding: 4px; text-align: right;">₹${it.cgstAmount?.toLocaleString('en-IN')}</td>
                <td style="padding: 4px; text-align: right;">₹${it.sgstAmount?.toLocaleString('en-IN')}</td>
                <td style="padding: 4px; text-align: right; font-weight: bold;">₹${it.totalPrice?.toLocaleString('en-IN')}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 8px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px; border-radius: 4px; max-width: 320px; font-size: 8px;">
            <strong>Verification Protocol:</strong> ${slip.deliveryOtpNotice}<br>
            Tracking URL: <code>${slip.trackingUrl}</code>
          </div>
          <div style="border: 1px solid #000; padding: 6px 8px; border-radius: 4px; min-width: 180px; font-size: 9px;">
            <div style="display:flex; justify-content:space-between;"><span>Taxable Value:</span><span>₹${slip.summary?.totalTaxable?.toLocaleString('en-IN')}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>CGST (9%):</span><span>₹${slip.summary?.totalCgst?.toLocaleString('en-IN')}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>SGST (9%):</span><span>₹${slip.summary?.totalSgst?.toLocaleString('en-IN')}</span></div>
            <div style="display:flex; justify-content:space-between; font-weight:900; font-size:11px; border-top:1px solid #000; margin-top:4px; padding-top:4px;">
              <span>Sub-Order Total:</span><span>₹${slip.summary?.grandTotal?.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 14px; font-size: 8px; color: #475569; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
          <div>Authentic Electronic Packing Slip issued under Rule 46 of CGST Rules via AuraMarket Enterprise.</div>
          <div style="border-top: 1px solid #000; min-width: 120px; text-align: center; font-weight: bold; color: #000; padding-top: 2px;">
            Authorized Signatory<br><span style="font-size: 7px; color: #64748b;">${slip.seller?.storeName}</span>
          </div>
        </div>
      </div>
    `
      )
      .join('\n');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Split Packing Slips - ${orderId}</title>
          <style>
            @page {
              size: ${isThermal ? '100mm 150mm' : 'A4'};
              margin: ${isThermal ? '2mm' : '10mm'};
            }
            body { margin: 0; padding: 0; background: #fff; }
            * { box-sizing: border-box; }
          </style>
        </head>
        <body>
          ${slipsHtml}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Smart Multi-Vendor Split Packing Slip</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Point #73
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Order <span className="font-mono text-slate-200">#{orderId}</span> split across {slips.length} merchant(s) with dynamic live GPS tracking QR codes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <p className="text-sm font-medium">Generating smart multi-vendor packing slips with QR codes...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          ) : slips.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Layers className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No split packing slip records found for this order.</p>
            </div>
          ) : (
            <>
              {/* Vendor Selector Tabs (if multiple vendors) */}
              {slips.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mr-1">Vendors:</span>
                  {slips.map((slip, idx) => (
                    <button
                      key={slip.slipId || idx}
                      onClick={() => setActiveSlipIdx(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeSlipIdx === idx
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{slip.seller?.storeName || `Vendor ${idx + 1}`}</span>
                      <span className="opacity-75 text-[10px]">({slip.items?.length} items)</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Active Slip Visual Card */}
              {currentSlip && (
                <div
                  ref={printContainerRef}
                  className="bg-white text-slate-900 rounded-2xl border border-slate-200 p-6 shadow-xl relative overflow-hidden"
                >
                  {/* COD / Prepaid Badge Banner */}
                  <div
                    className={`text-center py-1.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider mb-4 ${
                      currentSlip.isCOD ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {currentSlip.isCOD
                      ? `CASH ON DELIVERY (COD) — COLLECT ₹${currentSlip.amountToCollect?.toLocaleString('en-IN')}`
                      : `PREPAID ORDER — DO NOT COLLECT CASH (${currentSlip.paymentMethod})`}
                  </div>

                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b-2 border-slate-900 pb-4 mb-4">
                    <div>
                      <div className="text-xl font-black text-slate-900 tracking-tight">
                        AuraMarket Express Logistics
                      </div>
                      <div className="inline-block bg-slate-900 text-amber-400 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider mt-1">
                        Smart Multi-Vendor Split Packing Slip
                      </div>
                      <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                        <div>
                          <strong>Slip ID:</strong> <span className="font-mono">{currentSlip.slipId}</span> &nbsp;|&nbsp;{' '}
                          <strong>Order:</strong> <span className="font-mono">#{currentSlip.orderNumber}</span>
                        </div>
                        <div>
                          <strong>Routing Code:</strong>{' '}
                          <span className="font-mono font-bold text-slate-900">{currentSlip.routingCode}</span> &nbsp;|&nbsp;{' '}
                          <strong>Date:</strong> {new Date(currentSlip.invoiceDate).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    </div>

                    {/* Dynamic QR Code Box */}
                    <div className="flex flex-col items-center bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center self-center sm:self-auto">
                      <div
                        className="w-24 h-24 flex items-center justify-center"
                        dangerouslySetInnerHTML={{ __html: currentSlip.qrCodeSvg }}
                      />
                      <span className="text-[9px] font-bold text-slate-700 mt-1 uppercase tracking-wider">
                        Scan to Track Live
                      </span>
                      <a
                        href={currentSlip.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[9px] text-amber-600 font-semibold hover:underline flex items-center gap-0.5 mt-0.5"
                      >
                        Open Link <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>

                  {/* Merchant & Customer Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-xs">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Merchant (Seller) Information
                      </span>
                      <div className="font-extrabold text-sm text-slate-900">{currentSlip.seller?.storeName}</div>
                      <div className="text-slate-600 mt-0.5">
                        <strong>GSTIN:</strong> {currentSlip.seller?.gstin}
                      </div>
                      <div className="text-slate-600">{currentSlip.seller?.address}</div>
                      <div className="text-slate-600">
                        <strong>Phone:</strong> {currentSlip.seller?.phone}
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Ship To (Customer Details)
                      </span>
                      <div className="font-extrabold text-sm text-slate-900">{currentSlip.customer?.name}</div>
                      <div className="text-slate-600">{currentSlip.customer?.fullAddress}</div>
                      <div className="text-slate-600">
                        <strong>Phone:</strong> {currentSlip.customer?.phone}
                      </div>
                      {currentSlip.customer?.deliveryInstructions && (
                        <div className="mt-1 text-amber-800 font-semibold bg-amber-50 p-1 rounded border border-amber-200 text-[11px]">
                          <strong>Note:</strong> {currentSlip.customer.deliveryInstructions}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Itemized Breakdown Table with HSN & Tax */}
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-wider">
                          <th className="py-2 px-2.5">#</th>
                          <th className="py-2 px-2.5">Item & Variant</th>
                          <th className="py-2 px-2.5">SKU</th>
                          <th className="py-2 px-2.5 text-center">HSN</th>
                          <th className="py-2 px-2.5 text-center">Qty</th>
                          <th className="py-2 px-2.5 text-right">Unit Price</th>
                          <th className="py-2 px-2.5 text-right">Taxable Val</th>
                          <th className="py-2 px-2.5 text-center">GST</th>
                          <th className="py-2 px-2.5 text-right">CGST (9%)</th>
                          <th className="py-2 px-2.5 text-right">SGST (9%)</th>
                          <th className="py-2 px-2.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {currentSlip.items?.map((it) => (
                          <tr key={it.variantSku || it.index} className="hover:bg-slate-50">
                            <td className="py-2 px-2.5 font-medium text-slate-500">{it.index}</td>
                            <td className="py-2 px-2.5">
                              <div className="font-bold text-slate-900">{it.title}</div>
                              <div className="text-[10px] text-slate-500">{it.variantName}</div>
                            </td>
                            <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600">{it.variantSku}</td>
                            <td className="py-2 px-2.5 text-center font-bold text-slate-800">{it.hsnCode}</td>
                            <td className="py-2 px-2.5 text-center font-bold">{it.quantity}</td>
                            <td className="py-2 px-2.5 text-right">₹{it.unitPrice?.toLocaleString('en-IN')}</td>
                            <td className="py-2 px-2.5 text-right font-medium">₹{it.taxableValue?.toLocaleString('en-IN')}</td>
                            <td className="py-2 px-2.5 text-center">{it.gstRate}%</td>
                            <td className="py-2 px-2.5 text-right text-slate-600">₹{it.cgstAmount?.toLocaleString('en-IN')}</td>
                            <td className="py-2 px-2.5 text-right text-slate-600">₹{it.sgstAmount?.toLocaleString('en-IN')}</td>
                            <td className="py-2 px-2.5 text-right font-black text-slate-900">
                              ₹{it.totalPrice?.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary & Signatory Section */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 max-w-sm text-xs text-amber-900 space-y-1">
                      <div className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-950">
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                        Doorstep Delivery Protocol
                      </div>
                      <p>{currentSlip.deliveryOtpNotice}</p>
                      <div className="text-[10px] text-amber-700 pt-1">
                        Courier: <strong>{currentSlip.courierPartner}</strong>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 min-w-[240px] text-xs space-y-1.5 self-end sm:self-auto">
                      <div className="flex justify-between text-slate-600">
                        <span>Total Taxable Value:</span>
                        <span className="font-semibold">₹{currentSlip.summary?.totalTaxable?.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Total CGST (9%):</span>
                        <span className="font-semibold">₹{currentSlip.summary?.totalCgst?.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Total SGST (9%):</span>
                        <span className="font-semibold">₹{currentSlip.summary?.totalSgst?.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Shipping Charges:</span>
                        <span className="font-semibold text-emerald-600">FREE</span>
                      </div>
                      <div className="flex justify-between text-slate-900 font-black text-sm border-t border-slate-300 pt-1.5">
                        <span>Merchant SubTotal:</span>
                        <span className="text-amber-600">₹{currentSlip.summary?.grandTotal?.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Authorized Sign */}
                  <div className="flex justify-between items-end border-t border-dashed border-slate-300 pt-4 mt-4 text-[10px] text-slate-500">
                    <div>
                      Authentic Electronic Split Packing Slip generated under Rule 46 of CGST Rules.<br />
                      Issued on behalf of <strong>{currentSlip.seller?.storeName}</strong>.
                    </div>
                    <div className="border-t border-slate-900 pt-1 text-center min-w-[130px] font-bold text-slate-900">
                      Authorized Signatory<br />
                      <span className="text-[9px] font-normal text-slate-500">{currentSlip.seller?.storeName}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Print Paper:</span>
            <div className="inline-flex rounded-xl bg-slate-800 p-0.5 border border-slate-700 text-xs">
              <button
                onClick={() => setFormat('a4')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  format === 'a4' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                A4 Standard
              </button>
              <button
                onClick={() => setFormat('thermal')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  format === 'thermal' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Thermal (100x150)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePrint(true)}
              disabled={slips.length === 0}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print This Slip</span>
            </button>

            {slips.length > 1 && (
              <button
                onClick={() => handlePrint(false)}
                disabled={slips.length === 0}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Layers className="w-4 h-4" />
                <span>Print All ({slips.length}) Slips</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
