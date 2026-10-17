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
  Truck,
  ExternalLink,
  Ban,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function EInvoiceViewerModal({
  isOpen,
  onClose,
  orderId,
  subOrderId,
  invoiceId,
  apiUrl = '/api',
}) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [copiedIrn, setCopiedIrn] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('ORDER_CANCELLED');
  const [cancelRemarks, setCancelRemarks] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchInvoice();
    } else {
      setInvoice(null);
      setError(null);
      setShowCancelModal(false);
    }
  }, [isOpen, orderId, subOrderId, invoiceId]);

  const fetchInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auramarket_token') || '';
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      let endpoint = '';
      if (invoiceId) {
        endpoint = `${apiUrl}/tax/e-invoicing/${invoiceId}`;
      } else if (subOrderId) {
        endpoint = `${apiUrl}/tax/e-invoicing/order/${subOrderId}`;
      } else if (orderId) {
        endpoint = `${apiUrl}/tax/e-invoicing/order/${orderId}`;
      }

      if (!endpoint) {
        throw new Error('No order or invoice reference provided.');
      }

      const res = await fetch(endpoint, { headers });
      const json = await res.json();

      if (res.ok && json.success && json.data) {
        setInvoice(json.data);
      } else {
        // Not yet generated
        setInvoice(null);
      }
    } catch (err) {
      console.warn('Error fetching invoice:', err);
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    setGenerating(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auramarket_token') || '';
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const targetId = subOrderId || orderId;
      const res = await fetch(`${apiUrl}/tax/e-invoicing/generate/${targetId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to generate e-invoice.');
      }

      setInvoice(json.data);
    } catch (err) {
      setError(err.message || 'Error generating e-invoice.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyIrn = () => {
    if (!invoice?.irn) return;
    navigator.clipboard?.writeText(invoice.irn);
    setCopiedIrn(true);
    setTimeout(() => setCopiedIrn(false), 2000);
  };

  const handlePrint = () => {
    if (!invoice) return;
    const printUrl = `${apiUrl}/tax/e-invoicing/${invoice._id || invoice.invoiceNumber}/print`;
    window.open(printUrl, '_blank');
  };

  const handleCancelInvoice = async () => {
    if (!invoice) return;
    setCancelling(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auramarket_token') || '';
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(`${apiUrl}/tax/e-invoicing/${invoice._id}/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cancellationReason: cancelReason,
          cancellationRemarks: cancelRemarks,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to cancel e-invoice.');
      }

      setInvoice(json.data);
      setShowCancelModal(false);
    } catch (err) {
      setError(err.message || 'Failed to cancel e-invoice.');
    } finally {
      setCancelling(false);
    }
  };

  if (!isOpen) return null;

  // Calculate cancellation window eligibility
  const ackTime = invoice?.ackDate ? new Date(invoice.ackDate).getTime() : Date.now();
  const hoursSinceAck = (Date.now() - ackTime) / (1000 * 60 * 60);
  const canCancel = invoice?.status === 'GENERATED' && hoursSinceAck <= 24;

  const qrImageUrl = invoice?.irn
    ? `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(invoice.irn)}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight">GST Tax Invoice / E-Invoice</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  NIC Verifiable
                </span>
                {invoice?.status === 'CANCELLED' && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    CANCELLED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Rule 48(4) Central Goods and Services Tax Rules, 2017
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {invoice && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition"
                title="Print Official A4 Invoice with QR Code"
              >
                <Printer className="w-3.5 h-3.5" />
                Print A4 Invoice
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Notice:</strong> {error}
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Fetching verified GST E-Invoice dossier...</p>
            </div>
          ) : !invoice ? (
            /* Not yet generated state */
            <div className="py-16 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">No E-Invoice Generated Yet</h4>
                <p className="text-xs text-slate-500 mt-1">
                  An official GST E-Invoice with 64-character deterministic IRN, signed QR code,
                  and Section 194O/52 tax attribution has not been generated for this order.
                </p>
              </div>
              <button
                onClick={handleGenerateInvoice}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating via NIC Sandbox...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Generate GST E-Invoice (IRN / QR)
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Active Invoice Viewer */
            <div className="space-y-6">
              {/* IRN Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white shadow-md border border-slate-800">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400">
                        Invoice Reference Number (IRN)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                        SHA-256
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono font-bold text-cyan-300 break-all select-all">
                        {invoice.irn}
                      </code>
                      <button
                        onClick={handleCopyIrn}
                        className="p-1 rounded hover:bg-slate-700 text-slate-300 transition flex-shrink-0"
                        title="Copy IRN"
                      >
                        {copiedIrn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-300 pt-1">
                      <div>
                        <strong className="text-slate-400">Ack No:</strong> {invoice.ackNo}
                      </div>
                      <div>
                        <strong className="text-slate-400">Ack Date:</strong>{' '}
                        {new Date(invoice.ackDate).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div>
                        <strong className="text-slate-400">Type:</strong> {invoice.supplyType}
                      </div>
                      <div>
                        <strong className="text-slate-400">Tax Type:</strong>{' '}
                        <span className="font-semibold text-emerald-400">
                          {invoice.taxType === 'INTRA_STATE' ? 'INTRA-STATE (CGST + SGST)' : 'INTER-STATE (IGST)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* QR Code thumbnail */}
                  <div className="flex flex-col items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex-shrink-0">
                    <img
                      src={qrImageUrl}
                      alt="NIC Signed QR Code"
                      className="w-24 h-24 object-contain"
                    />
                    <span className="text-[9px] font-bold text-slate-600 mt-1 uppercase tracking-wider">
                      IRP QR Code
                    </span>
                  </div>
                </div>
              </div>

              {/* Cancelled Alert Banner */}
              {invoice.status === 'CANCELLED' && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Ban className="w-6 h-6 text-rose-600 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-sm">This E-Invoice has been CANCELLED</div>
                      <div className="text-xs text-rose-600">
                        Reason: <strong>{invoice.cancellationReason || 'ORDER_CANCELLED'}</strong>
                        {invoice.cancellationRemarks ? ` - ${invoice.cancellationRemarks}` : ''} | Cancelled on{' '}
                        {invoice.cancelledAt ? new Date(invoice.cancelledAt).toLocaleString('en-IN') : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Parties Grid (Supplier vs Buyer) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Supplier (Seller) */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Details of Supplier (Seller)
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      GSTIN: {invoice.supplierDetails?.gstin || '07AAAAA0000A1Z5'}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {invoice.supplierDetails?.tradeName || invoice.supplierDetails?.legalName}
                  </div>
                  <div className="text-xs text-slate-600">
                    <strong>Legal Name:</strong> {invoice.supplierDetails?.legalName}
                  </div>
                  <div className="text-xs text-slate-600">
                    <strong>Address:</strong> {invoice.supplierDetails?.address}, {invoice.supplierDetails?.city}
                  </div>
                  <div className="text-xs text-slate-600">
                    <strong>State:</strong> {invoice.supplierDetails?.state} (Code: {invoice.supplierDetails?.stateCode})
                  </div>
                  <div className="text-xs text-slate-600">
                    <strong>Contact:</strong> {invoice.supplierDetails?.email} | {invoice.supplierDetails?.phone}
                  </div>
                </div>

                {/* Buyer (Recipient) */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Details of Recipient (Billed To)
                    </span>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        invoice.buyerDetails?.isB2B
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {invoice.buyerDetails?.isB2B
                        ? `B2B GSTIN: ${invoice.buyerDetails?.gstin}`
                        : 'B2C - UNREGISTERED (URP)'}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {invoice.buyerDetails?.legalName || 'Valued Retail Shopper'}
                  </div>
                  <div className="text-xs text-slate-600">
                    <strong>Address:</strong> {invoice.buyerDetails?.address}, {invoice.buyerDetails?.city} -{' '}
                    {invoice.buyerDetails?.pincode}
                  </div>
                  <div className="text-xs text-slate-600">
                    <strong>Place of Supply:</strong> {invoice.buyerDetails?.state} (Code: {invoice.buyerDetails?.stateCode})
                  </div>
                  <div className="text-xs text-slate-600">
                    <strong>Contact:</strong> {invoice.buyerDetails?.phone} | {invoice.buyerDetails?.email}
                  </div>
                </div>
              </div>

              {/* Invoice Meta Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-100 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Invoice Number</div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">{invoice.invoiceNumber}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-100 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Invoice Date</div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">
                    {new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-100 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Supply Category</div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">{invoice.supplyType}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-100 border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Reverse Charge</div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">NO</div>
                </div>
              </div>

              {/* e-Way Bill Banner (if > ₹50,000) */}
              {invoice.eWayBill?.ewayBillNo && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-blue-900">
                        Electronic Way Bill (e-Way Bill) Generated
                      </div>
                      <div className="text-xs text-blue-700 font-mono mt-0.5">
                        EWB No: <strong>{invoice.eWayBill.ewayBillNo}</strong> | Vehicle:{' '}
                        <strong>{invoice.eWayBill.vehicleNumber || 'DL-01-AB-1234'}</strong> | Distance:{' '}
                        {invoice.eWayBill.distanceKm || 180} km
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-blue-200 text-blue-800 text-[10px] font-bold uppercase">
                    Consignment &gt; ₹50,000
                  </span>
                </div>
              )}

              {/* HSN Summary Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    HSN / SAC Tax Liability Summary
                  </h5>
                  <span className="text-[10px] text-slate-500 font-medium">Standard 18% GST Slab</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2">HSN Code</th>
                        <th className="px-4 py-2">Description</th>
                        <th className="px-4 py-2 text-right">Taxable Val (₹)</th>
                        {invoice.taxType === 'INTRA_STATE' ? (
                          <>
                            <th className="px-4 py-2 text-right">CGST (9%)</th>
                            <th className="px-4 py-2 text-right">SGST (9%)</th>
                          </>
                        ) : (
                          <th className="px-4 py-2 text-right">IGST (18%)</th>
                        )}
                        <th className="px-4 py-2 text-right">Total Tax (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(invoice.hsnSummary || []).map((h, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-mono font-bold text-blue-700">{h.hsnCode}</td>
                          <td className="px-4 py-2.5 text-slate-700">{h.description}</td>
                          <td className="px-4 py-2.5 text-right font-medium">₹{h.taxableAmount?.toFixed(2)}</td>
                          {invoice.taxType === 'INTRA_STATE' ? (
                            <>
                              <td className="px-4 py-2.5 text-right font-medium text-slate-600">
                                ₹{h.cgstAmount?.toFixed(2)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-medium text-slate-600">
                                ₹{h.sgstAmount?.toFixed(2)}
                              </td>
                            </>
                          ) : (
                            <td className="px-4 py-2.5 text-right font-medium text-slate-600">
                              ₹{h.igstAmount?.toFixed(2)}
                            </td>
                          )}
                          <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                            ₹{h.totalTax?.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals & Statutory Deductions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Statutory TDS & TCS Box */}
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    Government Statutory Compliance
                  </div>
                  <div className="text-xs text-amber-800 space-y-1">
                    <div className="flex justify-between py-0.5">
                      <span>Section 194O Income Tax (1% TDS):</span>
                      <strong className="font-mono">₹{invoice.tdsSection194O?.tdsAmount?.toFixed(2) || '0.00'}</strong>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span>Section 52 GST TCS (1%):</span>
                      <strong className="font-mono">₹{invoice.tcsSection52?.tcsAmount?.toFixed(2) || '0.00'}</strong>
                    </div>
                    <p className="text-[10px] text-amber-700 mt-1 leading-relaxed">
                      E-Commerce Operator (AuraMarket) automatically reports monthly withholding in
                      Form GSTR-8 and Form 26Q under Central Tax regulations.
                    </p>
                  </div>
                </div>

                {/* Calculation Totals */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Taxable Amount:</span>
                    <span className="font-medium font-mono">₹{invoice.totalTaxableAmount?.toFixed(2)}</span>
                  </div>
                  {invoice.taxType === 'INTRA_STATE' ? (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>Central Tax (CGST 9%):</span>
                        <span className="font-medium font-mono">₹{invoice.totalCgst?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>State Tax (SGST 9%):</span>
                        <span className="font-medium font-mono">₹{invoice.totalSgst?.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-600">
                      <span>Integrated Tax (IGST 18%):</span>
                      <span className="font-medium font-mono">₹{invoice.totalIgst?.toFixed(2)}</span>
                    </div>
                  )}
                  {invoice.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Round Off:</span>
                      <span className="font-medium font-mono">₹{invoice.roundOff?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-bold text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-base text-blue-700 font-mono">₹{invoice.grandTotal?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            <span>24-Hour IRP Cancellation Window:</span>
            {canCancel ? (
              <span className="text-emerald-600 font-bold">
                Active ({(24 - hoursSinceAck).toFixed(1)}h remaining)
              </span>
            ) : invoice?.status === 'CANCELLED' ? (
              <span className="text-rose-600 font-bold">Cancelled</span>
            ) : (
              <span className="text-slate-400 font-medium">Expired (Issue GSTR-1 Credit Note)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 hover:bg-rose-50 text-rose-700 text-xs font-semibold transition"
              >
                <Ban className="w-3.5 h-3.5" />
                Cancel IRN
              </button>
            )}

            {invoice && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <Printer className="w-4 h-4" />
                Print / Download PDF
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* 24-Hour Cancellation Confirmation Modal */}
        {showCancelModal && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-300 p-6 max-w-md w-full space-y-4 animate-scaleUp">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <h4 className="font-bold text-base text-slate-900">Cancel Government E-Invoice?</h4>
              </div>
              <p className="text-xs text-slate-600">
                This will officially revoke IRN <code className="font-mono">{invoice?.irn?.substring(0, 16)}...</code>{' '}
                on the National Informatics Centre (NIC) portal. This action is irreversible within the 24-hour statutory window.
              </p>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cancellation Reason</label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="ORDER_CANCELLED">1 - Order Cancelled by Customer / Merchant</option>
                    <option value="DUPLICATE">2 - Duplicate Invoice Entry</option>
                    <option value="DATA_ENTRY_MISTAKE">3 - Data Entry Mistake / Typo</option>
                    <option value="OTHER">4 - Other Compliance Reason</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Remarks / Audit Note</label>
                  <input
                    type="text"
                    value={cancelRemarks}
                    onChange={(e) => setCancelRemarks(e.target.value)}
                    placeholder="e.g. Order cancelled prior to courier dispatch"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
                >
                  Back
                </button>
                <button
                  onClick={handleCancelInvoice}
                  disabled={cancelling}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {cancelling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                  Confirm Revocation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
