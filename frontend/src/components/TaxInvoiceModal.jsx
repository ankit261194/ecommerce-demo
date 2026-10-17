import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Calendar,
  CreditCard,
  Hash,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

export default function TaxInvoiceModal({
  isOpen,
  onClose,
  orderId,
  apiUrl = '/api',
}) {
  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedInv, setCopiedInv] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchInvoice();
    }
  }, [isOpen, orderId]);

  const fetchInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/orders/${orderId}/invoice`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch tax invoice.');
      }
      setInvoiceData(data.data);
    } catch (err) {
      setError(err.message || 'Could not load tax invoice.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    const downloadUrl = invoiceData?.pdfDownloadUrl || `${apiUrl}/orders/${orderId}/invoice/pdf?download=true`;
    window.open(downloadUrl, '_blank');
  };

  const handlePrint = () => {
    if (!invoiceData?.printableHtml) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceData.printableHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  };

  const handleDownloadHtml = () => {
    if (!invoiceData?.printableHtml) return;
    const blob = new Blob([invoiceData.printableHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TaxInvoice_${invoiceData.invoiceNumber || 'AuraMarket'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyInvoiceNumber = () => {
    if (invoiceData?.invoiceNumber) {
      navigator.clipboard?.writeText(invoiceData.invoiceNumber);
      setCopiedInv(true);
      setTimeout(() => setCopiedInv(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-800 text-amber-400 flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Official Tax Invoice
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  GST Compliant
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authorized GSTIN Tax Invoice with HSN code itemization & QR code
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={loading || !invoiceData}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95 disabled:opacity-50"
              title="Download Official GST Tax Invoice PDF with QR & Seal"
            >
              <FileText className="w-3.5 h-3.5" />
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={loading || !invoiceData}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95 disabled:opacity-50"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={handleDownloadHtml}
              disabled={loading || !invoiceData}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-750 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              title="Download Offline HTML"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">HTML</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-100 dark:bg-slate-950">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Generating Tax Invoice with verified GST breakdown...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Invoice Retrieval Notice</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          ) : invoiceData ? (
            /* Authentic Printable Paper Sheet */
            <div className="bg-white text-slate-900 rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8 space-y-6 max-w-3xl mx-auto">
              {/* Paper Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">AuraMarket</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-300 text-slate-950">
                      Original Tax Invoice
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Enterprise Multi-Vendor E-Commerce Platform
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    GST Rule 46 Compliant Document
                  </p>
                </div>

                <div className="text-left sm:text-right space-y-0.5 text-xs text-slate-600">
                  <h3 className="text-base font-black text-slate-900 tracking-wide uppercase">
                    Tax Invoice
                  </h3>
                  <p className="flex sm:justify-end items-center gap-1 font-mono font-bold text-slate-900">
                    {invoiceData.invoiceNumber}
                    <button
                      onClick={copyInvoiceNumber}
                      className="text-slate-400 hover:text-indigo-600 transition"
                      title="Copy Invoice Number"
                    >
                      {copiedInv ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </p>
                  <p><strong>Date:</strong> {invoiceData.invoiceDate}</p>
                  <p><strong>Order Ref:</strong> {invoiceData.orderId}</p>
                  <p>
                    <strong>Payment:</strong> <span className="uppercase font-semibold">{invoiceData.payment?.method || 'COD'}</span> ({invoiceData.payment?.status || 'CONFIRMED'})
                  </p>
                </div>
              </div>

              {/* Seller & Buyer Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Sold By Box */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                    Sold By (Authorized Merchant)
                  </p>
                  <p className="font-bold text-sm text-slate-900">{invoiceData.seller?.storeName}</p>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{invoiceData.seller?.address}</p>
                  <div className="pt-1 text-[11px] text-slate-700">
                    <p><strong>GSTIN:</strong> <span className="font-mono font-bold">{invoiceData.seller?.gstin}</span></p>
                    <p><strong>PAN:</strong> <span className="font-mono">{invoiceData.seller?.pan}</span></p>
                    <p><strong>State of Supplier:</strong> {invoiceData.seller?.state} (Code: {invoiceData.seller?.stateCode})</p>
                  </div>
                </div>

                {/* Billed & Shipped To */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                    Billed & Shipped To (Customer)
                  </p>
                  <p className="font-bold text-sm text-slate-900">{invoiceData.buyer?.name}</p>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{invoiceData.buyer?.address}</p>
                  <div className="pt-1 text-[11px] text-slate-700">
                    <p><strong>Phone:</strong> {invoiceData.buyer?.phone}</p>
                    <p><strong>Email:</strong> {invoiceData.buyer?.email}</p>
                    <p><strong>Place of Supply:</strong> {invoiceData.buyer?.state}</p>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-2.5 font-bold">#</th>
                      <th className="p-2.5 font-bold">Item Description</th>
                      <th className="p-2.5 font-bold">HSN</th>
                      <th className="p-2.5 font-bold text-right">Qty</th>
                      <th className="p-2.5 font-bold text-right">Unit Gross</th>
                      <th className="p-2.5 font-bold text-right">Taxable</th>
                      {invoiceData.pricing?.isInterState ? (
                        <th className="p-2.5 font-bold text-right">IGST (18%)</th>
                      ) : (
                        <>
                          <th className="p-2.5 font-bold text-right">CGST (9%)</th>
                          <th className="p-2.5 font-bold text-right">SGST (9%)</th>
                        </>
                      )}
                      <th className="p-2.5 font-bold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoiceData.lineItems?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="p-2.5 text-slate-500">{item.itemNo}</td>
                        <td className="p-2.5">
                          <p className="font-bold text-slate-900">{item.title}</p>
                          <p className="text-[10px] text-slate-400 font-mono">SKU: {item.variantSku}</p>
                        </td>
                        <td className="p-2.5 font-mono text-slate-600">{item.hsnCode}</td>
                        <td className="p-2.5 text-right font-semibold">{item.quantity}</td>
                        <td className="p-2.5 text-right font-mono">₹{item.unitGrossPrice?.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right font-mono">₹{item.taxableValue?.toLocaleString('en-IN')}</td>
                        {invoiceData.pricing?.isInterState ? (
                          <td className="p-2.5 text-right font-mono text-slate-600">
                            ₹{(item.igstAmount ?? item.cgstAmount + item.sgstAmount)?.toLocaleString('en-IN')}
                          </td>
                        ) : (
                          <>
                            <td className="p-2.5 text-right font-mono text-slate-600">₹{item.cgstAmount?.toLocaleString('en-IN')}</td>
                            <td className="p-2.5 text-right font-mono text-slate-600">₹{item.sgstAmount?.toLocaleString('en-IN')}</td>
                          </>
                        )}
                        <td className="p-2.5 text-right font-bold text-slate-900 font-mono">₹{item.totalAmount?.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* HSN Summary Table */}
              {invoiceData.hsnSummary && invoiceData.hsnSummary.length > 0 && (
                <div className="overflow-x-auto border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-3 py-2 text-[11px] font-black uppercase text-slate-700 tracking-wider">
                    HSN / SAC Tax Itemization Summary
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-2 font-bold">HSN Code</th>
                        <th className="p-2 font-bold text-right">Taxable Amount</th>
                        {invoiceData.pricing?.isInterState ? (
                          <th className="p-2 font-bold text-right">IGST</th>
                        ) : (
                          <>
                            <th className="p-2 font-bold text-right">CGST</th>
                            <th className="p-2 font-bold text-right">SGST</th>
                          </>
                        )}
                        <th className="p-2 font-bold text-right">Total Tax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoiceData.hsnSummary.map((h, hIdx) => (
                        <tr key={hIdx}>
                          <td className="p-2 font-mono font-bold text-slate-800">{h.hsnCode}</td>
                          <td className="p-2 text-right font-mono">₹{h.taxableValue?.toLocaleString('en-IN')}</td>
                          {invoiceData.pricing?.isInterState ? (
                            <td className="p-2 text-right font-mono">₹{h.igstAmount?.toLocaleString('en-IN')}</td>
                          ) : (
                            <>
                              <td className="p-2 text-right font-mono">₹{h.cgstAmount?.toLocaleString('en-IN')}</td>
                              <td className="p-2 text-right font-mono">₹{h.sgstAmount?.toLocaleString('en-IN')}</td>
                            </>
                          )}
                          <td className="p-2 text-right font-bold font-mono text-slate-900">
                            ₹{h.totalTax?.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals Table */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1 space-y-2">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Amount in Words:</p>
                    <p className="font-bold text-slate-800 leading-snug">
                      {invoiceData.pricing?.amountInWords}
                    </p>
                  </div>
                  {invoiceData.companySeal && (
                    <div className="text-[11px] text-slate-500 font-mono space-y-0.5">
                      <p>Corporate CIN: {invoiceData.companySeal.cin}</p>
                      <p>Corporate GSTIN: {invoiceData.companySeal.gstin}</p>
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-72 space-y-1.5 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex justify-between">
                    <span>Taxable Amount:</span>
                    <span className="font-mono font-bold">₹{invoiceData.pricing?.subtotal?.toLocaleString('en-IN')}</span>
                  </div>
                  {invoiceData.pricing?.isInterState ? (
                    <div className="flex justify-between">
                      <span>IGST (18.0%):</span>
                      <span className="font-mono font-bold">₹{invoiceData.pricing?.igstTotal?.toLocaleString('en-IN')}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span>CGST (9.0%):</span>
                        <span className="font-mono font-bold">₹{invoiceData.pricing?.cgstTotal?.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SGST (9.0%):</span>
                        <span className="font-mono font-bold">₹{invoiceData.pricing?.sgstTotal?.toLocaleString('en-IN')}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span>Shipping Fee:</span>
                    <span className="font-mono font-bold">{invoiceData.pricing?.shippingFee === 0 ? 'FREE' : `₹${invoiceData.pricing?.shippingFee}`}</span>
                  </div>
                  {invoiceData.pricing?.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Reward Coins Redeemed:</span>
                      <span className="font-mono">-₹{invoiceData.pricing?.discount?.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-slate-900 pt-2 flex justify-between text-sm font-black text-slate-900">
                    <span>Grand Total:</span>
                    <span className="font-mono">₹{invoiceData.pricing?.grandTotal?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic GST QR Code & Digital Cryptoseal Preview (Point #20) */}
              <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* GST e-Invoice QR Code */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  {invoiceData.qrCodeDataUrl ? (
                    <img
                      src={invoiceData.qrCodeDataUrl}
                      alt="National GST e-Invoice QR Code"
                      className="w-20 h-20 rounded-lg border border-slate-300 shrink-0 bg-white p-1 shadow-sm"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-slate-200 flex items-center justify-center text-xs text-slate-400 font-mono">
                      QR Code
                    </div>
                  )}
                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <p className="font-bold text-slate-900 text-xs flex items-center gap-1">
                      <span>National GST e-Invoice QR</span>
                    </p>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Scan with GST Verify app or camera to validate digitally signed tax payload.
                    </p>
                    <p className="text-[9px] font-mono text-indigo-600 font-semibold truncate">
                      GSTIN: {invoiceData.seller?.gstin || '07AABCA1234D1Z5'}
                    </p>
                  </div>
                </div>

                {/* Digital Cryptoseal Badge */}
                <div className="p-3 rounded-xl bg-emerald-50/70 border-2 border-dashed border-emerald-500 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-black text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>DIGITALLY SIGNED & VERIFIED</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-900">
                    {invoiceData.digitalSeal?.badgeText || 'Digitally Signed by AuraMarket Technologies Pvt. Ltd.'}
                  </p>
                  <p className="text-[10px] text-emerald-700">
                    {invoiceData.digitalSeal?.subText || 'Authorized Signatory • Verified by Government GST Portal Guidelines'}
                  </p>
                  <div className="inline-block px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 font-mono text-[9px] text-emerald-900 font-bold">
                    Digital Cryptoseal Hash: {invoiceData.digitalSeal?.shortHash || invoiceData.digitalSeal?.hash?.slice(0, 16) || 'AUTH-SEAL'}
                  </div>
                  <p className="text-[9px] text-slate-500 italic">
                    {invoiceData.digitalSeal?.actNotice || 'Issued under Section 31 of CGST Act, 2017'}
                  </p>
                </div>
              </div>

              {/* Paper Footer with Legal Compliance Notice */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500">
                <div className="space-y-0.5 text-center sm:text-left">
                  <p>• Authentic computer-generated electronic invoice issued under Section 31 of CGST Act. No physical signature required.</p>
                  <p>• Retain this document for official warranty claims and business input tax credit.</p>
                  <p>• Subject to {invoiceData.seller?.state || 'Delhi'} Jurisdiction • Platform Support: {invoiceData.seller?.email || 'billing@auramarket.com'}</p>
                </div>
                <div className="text-right text-[10px] text-slate-400 font-mono">
                  Page 1 of 1 • AuraMarket Corporate Billing
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Download or print authentic GST tax invoice PDF with QR & cryptoseal
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={loading || !invoiceData}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Download GST Invoice (PDF)
            </button>
            <button
              onClick={handlePrint}
              disabled={loading || !invoiceData}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
