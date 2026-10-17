import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  Store,
  RefreshCw,
  FastForward,
  User,
  ShoppingBag,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Printer,
  MessageSquare,
  Gift,
  FileCheck,
  Wallet,
  LifeBuoy,
  FileText,
  Download,
} from 'lucide-react';
import ReturnRefundModal from './ReturnRefundModal';
import TaxInvoiceModal from './TaxInvoiceModal';
import WhatsAppOrderBotModal from './WhatsAppOrderBotModal';
import ScratchCardModal from './ScratchCardModal';
import LiveGpsTrackingMap from './LiveGpsTrackingMap';
import ProofOfDeliveryModal from './ProofOfDeliveryModal';
import SupportHelpdeskModal from './SupportHelpdeskModal';

export default function LiveOrderTrackerModal({
  isOpen,
  onClose,
  initialOrderId = null,
  apiUrl = '/api',
}) {
  const [searchTerm, setSearchTerm] = useState(initialOrderId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [activePackageIndex, setActivePackageIndex] = useState(0);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [copiedOrder, setCopiedOrder] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Point #28: 1-Click Self-Cancel Order State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('Ordered by mistake');
  const [customReason, setCustomReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  // Point #29: Return & Refund Request State
  const [showReturnModal, setShowReturnModal] = useState(false);

  // Point #30: 1-Click Tax Invoice State
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Point #71: 1-Click WhatsApp Order Bot State
  const [showWhatsAppBot, setShowWhatsAppBot] = useState(false);

  // Point #72: Post-Purchase Scratch Card State
  const [showScratchCard, setShowScratchCard] = useState(false);

  // Point #21: Digital Proof of Delivery (POD) Signature & Slip State
  const [showPodModal, setShowPodModal] = useState(false);

  // Point #19: Formal Customer Support Helpdesk (Ticketing System with SLAs)
  const [showSupportModal, setShowSupportModal] = useState(false);

  const cancellationReasons = [
    'Ordered by mistake',
    'Found a better price elsewhere',
    'Need to change delivery address or phone',
    'Need different size / color / variant',
    'Delivery time is too long',
    'Other reason',
  ];

  useEffect(() => {
    if (isOpen) {
      if (initialOrderId) {
        setSearchTerm(initialOrderId);
        fetchOrderTracking(initialOrderId);
      } else if (!orderData) {
        // Try fetching the latest order from localStorage if available
        const lastOrder = localStorage.getItem('last_placed_order_id');
        if (lastOrder) {
          setSearchTerm(lastOrder);
          fetchOrderTracking(lastOrder);
        }
      }
    }
  }, [isOpen, initialOrderId]);

  const fetchOrderTracking = async (identifier) => {
    const query = (identifier || searchTerm || '').trim();
    if (!query) {
      setError('Please enter a valid Order ID or Reference Number');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/orders/track/${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'No tracking information found for this reference.');
      }
      setOrderData(data.data);
      setActivePackageIndex(0);
    } catch (err) {
      setError(err.message || 'Failed to fetch order tracking status.');
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateStep = async (stepKey) => {
    if (!orderData?.rawOrderId) return;
    setIsSimulating(true);
    try {
      const token = localStorage.getItem('token') || 'demo-customer-token';
      const res = await fetch(`${apiUrl}/orders/${orderData.rawOrderId}/advance-step`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ step: stepKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to simulate step');
      }
      // Refresh tracked order state
      await fetchOrderTracking(orderData.orderId || orderData.rawOrderId);
    } catch (err) {
      alert(`Simulation Notice: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  // Point #28: 1-Click Self-Cancel Handler
  const handleConfirmCancel = async () => {
    if (!orderData?.rawOrderId) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      const token = localStorage.getItem('token') || 'demo-customer-token';
      const finalReason = selectedReason === 'Other reason' && customReason.trim()
        ? customReason.trim()
        : selectedReason;

      const res = await fetch(`${apiUrl}/orders/${orderData.rawOrderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: finalReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Could not cancel order.');
      }
      setShowCancelModal(false);
      // Dispatch wallet_updated event so header wallet counter updates immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wallet_updated', { detail: data.refundSummary }));
      }
      // Refresh tracked order status
      await fetchOrderTracking(orderData.orderId || orderData.rawOrderId);
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel order.');
    } finally {
      setIsCancelling(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard?.writeText(text);
    if (type === 'otp') {
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    } else {
      setCopiedOrder(true);
      setTimeout(() => setCopiedOrder(false), 2000);
    }
  };

  if (!isOpen) return null;

  const currentPackage = orderData?.subOrders?.[activePackageIndex] || orderData?.subOrders?.[0];
  const steps = currentPackage?.steps || [];
  const isOrderCancelled = orderData?.status === 'CANCELLED';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-900 dark:to-slate-850">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
              isOrderCancelled
                ? 'bg-rose-600 text-white shadow-rose-600/20'
                : 'bg-indigo-600 text-white shadow-indigo-600/20'
            }`}>
              {isOrderCancelled ? (
                <XCircle className="w-5 h-5" />
              ) : (
                <Truck className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Live Order Tracker
                {isOrderCancelled ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-400 border border-rose-300 dark:border-rose-700">
                    Cancelled
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    Real-time
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track parcel milestones, courier rider updates, and OTP verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Lookup */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchOrderTracking();
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter Order ID (e.g. ORD-1791925947854-733 or MongoDB ID)..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-sm shadow-indigo-600/20"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Tracking...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Track Order
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{error}</p>
                <p className="text-[11px] mt-0.5 opacity-90">
                  Tip: Check the order confirmation screen or your order SMS for the reference number.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {orderData ? (
            <>
              {/* Point #28: Cancelled Order Alert Banner */}
              {isOrderCancelled && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                      This Order Has Been Cancelled
                    </h4>
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      Reason: <strong className="font-semibold">{orderData.cancellationReason || 'Cancelled before dispatch'}</strong>
                    </p>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      All reserved items have been auto-restored to live inventory. Any payments made have been marked for instant refund.
                    </p>
                    {orderData.instantWalletRefund?.isRefunded && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900 dark:text-emerald-200">
                        <span className="flex items-center gap-1.5 font-bold">
                          <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Instant Wallet Refund Credited: ₹{orderData.instantWalletRefund.refundAmount}</span>
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
                            #17 INSTANT
                          </span>
                        </span>
                        <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                          Wallet Balance: ₹{orderData.instantWalletRefund.walletBalanceAfter}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Overview Banner */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500 font-medium">Order Number:</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {orderData.orderId}
                    </span>
                    <button
                      onClick={() => copyToClipboard(orderData.orderId, 'order')}
                      className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                      title="Copy Order ID"
                    >
                      {copiedOrder ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      isOrderCancelled
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    }`}>
                      {orderData.status || 'CONFIRMED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Placed on: {orderData.createdAt ? new Date(orderData.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}
                    {' • '}
                    Total: <strong className="text-slate-900 dark:text-white">₹{orderData.totalAmount?.toLocaleString('en-IN')}</strong>
                    {' • '}
                    Payment: <span className="font-medium uppercase">{orderData.paymentMethod || 'COD'}</span> ({orderData.paymentStatus || 'CONFIRMED'})
                  </p>
                </div>

                {/* Right Actions & Badges */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Point #20: Download Official GST Tax Invoice (PDF) */}
                  <button
                    type="button"
                    onClick={() => {
                      const oNum = orderData.orderNumber || orderData.orderId || orderData.rawOrderId;
                      const token = localStorage.getItem('token') || localStorage.getItem('auramarket_token') || '';
                      const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
                      window.open(`${apiUrl}/orders/${oNum}/invoice/pdf?download=true${tokenParam}`, '_blank');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition active:scale-95"
                    title="Download Official GST Tax Invoice PDF with QR code & digital cryptoseal"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Official GST Tax Invoice (PDF)</span>
                  </button>

                  {/* Point #30: 1-Click Tax Invoice Preview Modal */}
                  <button
                    type="button"
                    onClick={() => setShowInvoiceModal(true)}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition shadow-sm active:scale-95"
                    title="Preview Official GST Tax Invoice Sheet"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>View Invoice</span>
                  </button>

                  {/* Point #21: Digital Proof of Delivery (POD) Signature & Slip */}
                  <button
                    type="button"
                    onClick={() => setShowPodModal(true)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition shadow-sm active:scale-95 ${
                      orderData?.proofOfDelivery?.hasSignature
                        ? 'bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                    title={orderData?.proofOfDelivery?.hasSignature ? 'View Official Proof of Delivery (POD) Slip' : 'Capture Digital Proof of Delivery Handover Signature'}
                  >
                    <FileCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{orderData?.proofOfDelivery?.hasSignature ? 'View POD Slip' : 'Sign POD'}</span>
                  </button>

                  {/* Point #71: 1-Click WhatsApp Order Bot Assistant */}
                  <button
                    onClick={() => setShowWhatsAppBot(true)}
                    className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5 transition shadow-sm active:scale-95"
                    title="1-Click WhatsApp Confirmation & AI Tracking Assistant"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-current" />
                    <span>WhatsApp Bot</span>
                  </button>

                  {/* Point #72: Post-Purchase Scratch Card Reward */}
                  <button
                    onClick={() => setShowScratchCard(true)}
                    className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-300 dark:border-amber-700 flex items-center gap-1.5 transition shadow-sm active:scale-95"
                    title="Unlock & Scratch Post-Purchase Reward Card"
                  >
                    <Gift className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-current" />
                    <span>Scratch Card</span>
                  </button>

                  {/* Point #28: 1-Click Self-Cancel Action Button */}
                  {orderData.canSelfCancel && !isOrderCancelled && (
                    <button
                      onClick={() => {
                        setSelectedReason('Ordered by mistake');
                        setCustomReason('');
                        setCancelError(null);
                        setShowCancelModal(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 transition shadow-sm active:scale-95"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      1-Click Cancel Order
                    </button>
                  )}

                  {/* Point #29: Return & Refund Action Button (When Delivered) */}
                  {(orderData.status === 'DELIVERED' || currentPackage?.status === 'delivered') && !isOrderCancelled && (
                    <button
                      onClick={() => setShowReturnModal(true)}
                      className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Return / Refund
                    </button>
                  )}

                  {/* Secret Delivery OTP Card */}
                  {currentPackage?.deliveryOtp && !isOrderCancelled && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-300 dark:border-amber-700/60 rounded-xl p-3 flex items-center gap-3 shrink-0">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-amber-800 dark:text-amber-300">
                          Delivery Handover OTP
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xl font-black tracking-widest text-slate-900 dark:text-white font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700">
                            {currentPackage.deliveryOtp}
                          </span>
                          <button
                            onClick={() => copyToClipboard(currentPackage.deliveryOtp, 'otp')}
                            className="text-amber-700 dark:text-amber-300 hover:text-amber-900 text-xs flex items-center gap-1 font-medium transition"
                          >
                            {copiedOtp ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Copied
                              </span>
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Multi-Vendor Package Split Tabs (if multi-vendor) */}
              {orderData.subOrders?.length > 1 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-indigo-500" />
                    Split Packages ({orderData.subOrders.length} separate vendor parcels)
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {orderData.subOrders.map((sub, index) => {
                      const isActive = activePackageIndex === index;
                      const vendorName = sub.vendor?.storeName || `Package #${index + 1}`;
                      return (
                        <button
                          key={index}
                          onClick={() => setActivePackageIndex(index)}
                          className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-2 shrink-0 transition ${
                            isActive
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-755'
                          }`}
                        >
                          <Store className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span>{vendorName}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                              sub.status === 'cancelled'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : isActive
                                ? 'bg-indigo-700 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {sub.status || 'placed'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5-Step Visual Stepper Component */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    Package Milestone Timeline
                    {currentPackage?.subOrderId && (
                      <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400">
                        ({currentPackage.subOrderId})
                      </span>
                    )}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {isOrderCancelled ? (
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">Cancelled</span>
                    ) : (
                      <>
                        Est. Delivery: <strong className="text-slate-800 dark:text-slate-200">2-3 Business Days</strong>
                      </>
                    )}
                  </span>
                </div>

                {/* Stepper Progress Bar & Icons */}
                <div className="relative">
                  {/* Stepper Grid (Horizontal on md+, Vertical responsive) */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-2 relative">
                    {steps.map((step, idx) => {
                      const isCompleted = step.isCompleted;
                      const isCurrent = step.isCurrent;

                      return (
                        <div key={step.key} className="relative flex md:flex-col items-start md:items-center text-left md:text-center gap-3 md:gap-2">
                          {/* Step Connector Line (Desktop) */}
                          {idx < steps.length - 1 && (
                            <div
                              className={`hidden md:block absolute top-4 left-1/2 w-full h-1 -z-0 transition-colors ${
                                isOrderCancelled
                                  ? 'bg-slate-200 dark:bg-slate-700'
                                  : steps[idx + 1].isCompleted
                                  ? 'bg-emerald-500'
                                  : isCompleted
                                  ? 'bg-gradient-to-r from-emerald-500 to-indigo-500'
                                  : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                            />
                          )}

                          {/* Step Circle Badge */}
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${
                              isOrderCancelled
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700'
                                : isCompleted
                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                : isCurrent
                                ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/60 shadow-md shadow-indigo-600/30 animate-pulse'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {isOrderCancelled ? (
                              <span className="text-xs font-bold">{step.stepIndex}</span>
                            ) : isCompleted ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : isCurrent ? (
                              idx === 1 ? (
                                <Package className="w-4 h-4" />
                              ) : idx === 2 ? (
                                <Truck className="w-4 h-4" />
                              ) : idx === 3 ? (
                                <MapPin className="w-4 h-4" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )
                            ) : (
                              <span className="text-xs font-bold">{step.stepIndex}</span>
                            )}
                          </div>

                          {/* Step Text Info */}
                          <div className="flex-1 md:mt-1">
                            <p
                              className={`text-xs font-bold leading-tight ${
                                isOrderCancelled
                                  ? 'text-slate-400 dark:text-slate-500'
                                  : isCompleted
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : isCurrent
                                  ? 'text-indigo-600 dark:text-indigo-400'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {step.label}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                              {step.description}
                            </p>
                            {step.timestamp && (
                              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                                {new Date(step.timestamp).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dispatch / Transit Notice */}
                {!orderData.canSelfCancel && !isOrderCancelled && orderData.status !== 'DELIVERED' && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl flex items-center gap-2.5 text-xs text-blue-800 dark:text-blue-300">
                    <Truck className="w-4 h-4 shrink-0 text-blue-600" />
                    <span>
                      <strong>Package is in transit:</strong> Self-cancellation is now closed as the parcel is with our courier rider. You may request a Return/Refund upon doorstep delivery.
                    </span>
                  </div>
                )}

                {/* Point 16: Live Real-Time GPS Delivery Tracking Map */}
                <div className="pt-2 pb-1">
                  <LiveGpsTrackingMap
                    orderId={orderData.orderId}
                    subOrderId={currentPackage?.rawSubOrderId || currentPackage?.subOrderId}
                    deliveryOtp={currentPackage?.deliveryOtp || orderData.deliveryOtp || '4821'}
                    recipientName={orderData.shippingAddress?.recipientName || 'Valued Customer'}
                    deliveryAddress={`${orderData.shippingAddress?.street || ''}, ${orderData.shippingAddress?.city || ''}`}
                  />
                </div>

                {/* Courier Partner & Delivery Address Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {/* Courier Partner Card */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-indigo-500" />
                      Assigned Delivery Partner
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                          {currentPackage?.deliveryPartner?.name?.charAt(0) || 'V'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {currentPackage?.deliveryPartner?.name || 'Vikram Singh'}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Aura Express Fleet • 2-Wheeler Priority
                          </p>
                        </div>
                      </div>
                      <a
                        href={`tel:${currentPackage?.deliveryPartner?.phone || '9876543210'}`}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
                      >
                        <Phone className="w-3 h-3" />
                        Call Rider
                      </a>
                    </div>
                  </div>

                  {/* Destination & Rider Notes Card */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                      Delivery Destination
                    </p>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {orderData.shippingAddress?.recipientName || 'Valued Customer'}
                        <span className="text-slate-400 font-normal ml-1">
                          ({orderData.shippingAddress?.phone || 'Mobile'})
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                        {orderData.shippingAddress?.street}, {orderData.shippingAddress?.city},{' '}
                        {orderData.shippingAddress?.pincode}
                      </p>
                    </div>
                    {orderData.deliveryInstructions && (
                      <div className="p-1.5 px-2 bg-amber-50 dark:bg-amber-950/40 rounded border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>Rider Note: "{orderData.deliveryInstructions}"</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Package Items Preview */}
                {currentPackage?.items?.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      Items in this Package ({currentPackage.items.length})
                    </p>
                    <div className="space-y-2">
                      {currentPackage.items.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            {item.product?.images?.[0] ? (
                              <img
                                src={item.product.images[0]}
                                alt={item.product?.name || 'Product'}
                                className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                                <ShoppingBag className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white line-clamp-1">
                                {item.product?.name || item.title || 'Product Item'}
                              </p>
                              {item.variantSku && (
                                <p className="text-[10px] text-slate-400 font-mono">
                                  SKU: {item.variantSku}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900 dark:text-white">
                              ₹{(item.price || item.unitPrice || 0) * (item.quantity || 1)}
                            </p>
                            <p className="text-[10px] text-slate-500">Qty: {item.quantity || 1}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Demo Milestone Simulator Bar (Only when active and not cancelled) */}
              {!isOrderCancelled && (
                <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-850 dark:via-indigo-950/20 dark:to-slate-850 border border-indigo-200 dark:border-indigo-800/60 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <FastForward className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Interactive Live Simulation Toolbar
                    </p>
                    <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-300">
                      Fast-forward milestones for demo/testing
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleSimulateStep('packed')}
                      disabled={isSimulating}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-755 text-slate-800 dark:text-slate-200 text-xs font-medium border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      📦 Step 2: Mark Packed
                    </button>
                    <button
                      onClick={() => handleSimulateStep('dispatched')}
                      disabled={isSimulating}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-755 text-slate-800 dark:text-slate-200 text-xs font-medium border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      🚚 Step 3: Mark Shipped
                    </button>
                    <button
                      onClick={() => handleSimulateStep('out_for_delivery')}
                      disabled={isSimulating}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-755 text-slate-800 dark:text-slate-200 text-xs font-medium border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      🛵 Step 4: Out for Delivery
                    </button>
                    <button
                      onClick={() => handleSimulateStep('delivered')}
                      disabled={isSimulating}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
                    >
                      ✅ Step 5: Mark Delivered
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : !loading && (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                <Search className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Track Your AuraMarket Package
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Enter your order number above to view real-time package milestones, courier location, and secret handover OTP.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {orderData?.canSelfCancel && !isOrderCancelled && (
              <button
                onClick={() => {
                  setSelectedReason('Ordered by mistake');
                  setCustomReason('');
                  setCancelError(null);
                  setShowCancelModal(true);
                }}
                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm active:scale-95 flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel Order
              </button>
            )}
            {(orderData?.status === 'DELIVERED' || currentPackage?.status === 'delivered') && !isOrderCancelled && (
              <button
                onClick={() => setShowReturnModal(true)}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition shadow-sm active:scale-95 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Return / Refund
              </button>
            )}
            {/* Point #20: 1-Click Official Downloadable GST Tax Invoice PDF */}
            {orderData && (
              <button
                type="button"
                onClick={() => {
                  const oNum = orderData.orderNumber || orderData.orderId || orderData.rawOrderId;
                  if (oNum) {
                    const token = localStorage.getItem('token') || localStorage.getItem('auramarket_token') || '';
                    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
                    window.open(`${apiUrl}/orders/${oNum}/invoice/pdf?download=true${tokenParam}`, '_blank');
                  }
                }}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm active:scale-95 flex items-center gap-1.5"
                title="Download Official GST Tax Invoice PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">GST Invoice (PDF)</span>
              </button>
            )}
            {/* Point #19: Formal Customer Support Helpdesk Button */}
            <button
              onClick={() => setShowSupportModal(true)}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm active:scale-95 flex items-center gap-1.5"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              Need Help with this Order?
            </button>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
              Powered by AuraMarket Express Logistics Engine
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-750 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
          >
            Close Tracker
          </button>
        </div>
      </div>

      {/* Point #28: 1-Click Self-Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Cancel Order #{orderData?.orderId}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Instant 1-Click self-cancellation before dispatch
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cancelError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Please select a cancellation reason:
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {cancellationReasons.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      selectedReason === reason
                        ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel_reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              {selectedReason === 'Other reason' && (
                <div className="space-y-1">
                  <textarea
                    rows={2}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Tell us more about why you are cancelling..."
                    className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <RotateCcw className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <strong>Automatic Inventory Restoration:</strong> Items in this order will immediately be returned to available merchant stock.
                </span>
              </div>

              {/* Point 17: Instant Wallet Refund Guarantee Banner */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                <Wallet className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-bold flex items-center gap-1.5">
                    <span>Instant Wallet Refund Guarantee</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-black">
                      #17 INSTANT
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                    {orderData?.totalAmount
                      ? `₹${orderData.totalAmount} will be immediately credited to your Aura In-App Wallet. Zero bank waiting time!`
                      : 'Any prepaid amount will immediately be credited to your Aura Wallet.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Keep Order
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50 shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5"
              >
                {isCancelling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    Confirm Cancellation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Point #29: Return & Refund Request Modal */}
      <ReturnRefundModal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        orderData={orderData}
        apiUrl={apiUrl}
        onSuccess={() => fetchOrderTracking(orderData?.orderId || orderData?.rawOrderId)}
      />

      {/* Point #30: 1-Click Tax Invoice Download Modal */}
      <TaxInvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        orderId={orderData?.orderId || orderData?.rawOrderId}
        apiUrl={apiUrl}
      />

      {/* Point #21: Digital Proof of Delivery (POD) Customer Signature Modal */}
      {showPodModal && orderData && (
        <ProofOfDeliveryModal
          isOpen={showPodModal}
          onClose={() => setShowPodModal(false)}
          order={orderData}
          apiUrl={apiUrl}
          onSuccess={(updatedPod) => {
            setOrderData(prev => prev ? {
              ...prev,
              proofOfDelivery: updatedPod?.proofOfDelivery || updatedPod,
              status: 'DELIVERED',
            } : prev);
          }}
        />
      )}

      {/* Point #71: 1-Click WhatsApp Order Confirmation & Bot Modal */}
      {showWhatsAppBot && orderData && (
        <WhatsAppOrderBotModal
          isOpen={showWhatsAppBot}
          onClose={() => setShowWhatsAppBot(false)}
          order={{
            _id: orderData._id || orderData.rawOrderId || orderData.orderId,
            orderNumber: orderData.orderNumber || orderData.orderId,
            totalAmount: orderData.totalAmount || orderData.pricing?.totalAmount || 1299,
            deliveryOtp: orderData.deliveryOtp || currentPackage?.deliveryOtp || '4821',
            shippingAddress: orderData.shippingAddress || { phone: '9876543210' },
            customer: orderData.customer,
            items: orderData.items || [],
          }}
        />
      )}

      {/* Point #72: Gamified Post-Purchase Scratch Card Reward Modal */}
      {showScratchCard && orderData && (
        <ScratchCardModal
          isOpen={showScratchCard}
          onClose={() => setShowScratchCard(false)}
          orderId={orderData._id || orderData.rawOrderId || orderData.orderId}
        />
      )}

      {/* Point #19: Formal Customer Support Helpdesk Modal */}
      <SupportHelpdeskModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        orderData={orderData}
        apiUrl={apiUrl}
      />
    </div>
  );
}
