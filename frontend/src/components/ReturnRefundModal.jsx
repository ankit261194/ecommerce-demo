import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCcw,
  RefreshCw,
  Upload,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Camera,
  Trash2,
  ShieldCheck,
  CreditCard,
  Wallet,
  Building2,
  Clock,
  ArrowRight,
  Package,
  Truck,
  Check,
  Copy,
  Sparkles,
  Scissors
} from 'lucide-react';

export default function ReturnRefundModal({
  isOpen,
  onClose,
  orderData,
  apiUrl = '/api',
  onSuccess,
}) {
  // Workflow type: 'EXCHANGE' | 'RETURN_REFUND' (Point 5: 1-Click Product Exchange)
  const [workflowType, setWorkflowType] = useState('EXCHANGE');

  const [selectedItems, setSelectedItems] = useState([]);
  const [reason, setReason] = useState('Defective / damaged product');
  const [detailedDescription, setDetailedDescription] = useState('');
  const [proofPhotos, setProofPhotos] = useState([]);
  const [refundMode, setRefundMode] = useState('ORIGINAL_PAYMENT_METHOD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [existingReturn, setExistingReturn] = useState(null);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);

  // Exchange Specific State (Point 5)
  const [requestedSize, setRequestedSize] = useState('L');
  const [requestedColor, setRequestedColor] = useState('Navy Blue');
  const [exchangeReason, setExchangeReason] = useState('Size is too small (Need larger size)');

  const exchangeReasons = [
    'Size is too small (Need larger size)',
    'Size is too large (Need smaller size)',
    'Color / shade is different from pictures',
    'Fabric / styling does not fit expectations',
    'Defective or stitching defect, replacement required',
  ];

  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'];
  const availableColors = ['Jet Black', 'Pure White', 'Navy Blue', 'Steel Grey', 'Olive Green', 'Crimson Red'];

  const returnReasons = [
    'Defective / damaged product',
    'Wrong item or size delivered',
    'Item does not match website description',
    'Missing parts or accessories',
    'Performance or quality not as expected',
    'Arrived too late',
    'Other reason',
  ];

  const demoPhotos = [
    { label: '📦 Damaged Box', url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80' },
    { label: '📱 Scratched Surface', url: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80' },
    { label: '🔌 Missing Cable', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80' },
  ];

  useEffect(() => {
    if (isOpen && orderData) {
      setError(null);
      checkExistingReturn();

      // Pre-select all items from first suborder or master order
      const itemsList = orderData.subOrders?.[0]?.items || [];
      if (itemsList.length > 0) {
        setSelectedItems(
          itemsList.map(it => ({
            product: it.product?._id || it.product,
            title: it.product?.name || it.title || 'Product Item',
            image: it.product?.images?.[0] || it.image || '',
            variantSku: it.variantSku || '',
            price: it.price || it.unitPrice || 0,
            quantity: it.quantity || 1,
            selected: true,
          }))
        );
      }
    }
  }, [isOpen, orderData]);

  const checkExistingReturn = async () => {
    if (!orderData?.rawOrderId) return;
    setCheckingExisting(true);
    try {
      const token = localStorage.getItem('token') || 'demo-customer-token';
      const res = await fetch(`${apiUrl}/returns/order/${orderData.rawOrderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setExistingReturn(data.data);
      } else {
        setExistingReturn(null);
      }
    } catch (_) {
      setExistingReturn(null);
    } finally {
      setCheckingExisting(false);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPhotos(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const toggleItemSelection = (index) => {
    setSelectedItems(prev =>
      prev.map((it, i) => (i === index ? { ...it, selected: !it.selected } : it))
    );
  };

  const calculateTotalRefund = () => {
    return selectedItems
      .filter(it => it.selected)
      .reduce((sum, it) => sum + (it.price * it.quantity), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const itemsToProcess = selectedItems.filter(it => it.selected);
    if (itemsToProcess.length === 0) {
      setError('Please select at least one item.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || 'demo-customer-token';

      if (workflowType === 'EXCHANGE') {
        // Point 5: 1-Click Product Exchange API
        const payload = {
          orderId: orderData.rawOrderId || orderData.orderId,
          subOrderId: orderData.subOrders?.[0]?.rawSubOrderId,
          items: itemsToProcess,
          requestedSize,
          requestedColor,
          exchangeReason,
          detailedDescription,
          proofPhotos,
        };

        const res = await fetch(`${apiUrl}/returns/exchange`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to submit exchange request.');
        }

        setExistingReturn(data.data);
        if (onSuccess) onSuccess(data.data);
      } else {
        // Standard Return & Refund API
        const payload = {
          orderId: orderData.rawOrderId || orderData.orderId,
          subOrderId: orderData.subOrders?.[0]?.rawSubOrderId,
          items: itemsToProcess,
          reason,
          detailedDescription,
          proofPhotos,
          refundMode,
        };

        const res = await fetch(`${apiUrl}/returns`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to submit return request.');
        }

        setExistingReturn(data.data);
        if (onSuccess) onSuccess(data.data);
      }
    } catch (err) {
      setError(err.message || 'Could not process request.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-md ${
              workflowType === 'EXCHANGE'
                ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
                : 'bg-indigo-600 text-white shadow-indigo-600/20'
            }`}>
              {workflowType === 'EXCHANGE' ? (
                <RefreshCw className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <RotateCcw className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  {workflowType === 'EXCHANGE' ? '1-Click Product Exchange' : 'Return & Full Refund'}
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Point #5 Certified
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Order #{orderData?.orderId || 'ORD'} • 7-Day Doorstep Replacement Guarantee
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Workflow Type Switcher Tabs */}
        {!existingReturn && (
          <div className="px-6 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWorkflowType('EXCHANGE')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all ${
                workflowType === 'EXCHANGE'
                  ? 'bg-white text-slate-950 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
              <span>1-Click Size / Color Exchange</span>
              <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-extrabold uppercase">
                Free Pickup
              </span>
            </button>

            <button
              type="button"
              onClick={() => setWorkflowType('RETURN_REFUND')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all ${
                workflowType === 'RETURN_REFUND'
                  ? 'bg-white text-slate-950 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
              <span>Return for Money Refund</span>
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 custom-device-scrollbar">
          {existingReturn ? (
            /* View Existing Return / Exchange Request Status */
            <div className="space-y-4 animate-fade-in">
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      {existingReturn.requestType === 'EXCHANGE'
                        ? '🔄 Product Exchange In Progress'
                        : 'Return Request Active'}
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                    existingReturn.status === 'EXCHANGE_COMPLETED' || existingReturn.status === 'REFUNDED'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : existingReturn.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}>
                    {existingReturn.status}
                  </span>
                </div>

                {/* Secret Reverse Pickup OTP Card (Point 5 Highlight) */}
                {existingReturn.reversePickupOtp && (
                  <div className="p-4 rounded-xl bg-white border border-amber-300/80 shadow-sm flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        🔐 Doorstep Reverse Pickup OTP
                      </span>
                      <p className="text-2xl font-black text-slate-900 font-mono tracking-widest">
                        {existingReturn.reversePickupOtp}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Share this secret code with the courier rider only after they hand over the replacement or inspect the item.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(existingReturn.reversePickupOtp)}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 transition-colors flex items-center gap-1.5 text-xs font-bold"
                    >
                      {copiedOtp ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="text-xs text-slate-700 space-y-1.5">
                  {existingReturn.requestType === 'EXCHANGE' && existingReturn.exchangeDetails && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                      <p className="font-black text-slate-900">Exchange Replacement Target:</p>
                      <div className="flex items-center gap-3 pt-0.5">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-400 font-bold text-[11px]">
                          Size: {existingReturn.exchangeDetails.requestedSize || 'Standard'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200">
                          Color: {existingReturn.exchangeDetails.requestedColor || 'Default'}
                        </span>
                      </div>
                    </div>
                  )}

                  <p><strong>Reason:</strong> {existingReturn.reason}</p>
                  {existingReturn.detailedDescription && (
                    <p><strong>Customer Notes:</strong> "{existingReturn.detailedDescription}"</p>
                  )}
                  {existingReturn.reversePickupStatus && (
                    <p><strong>Courier Reverse Pickup:</strong> <span className="font-bold uppercase text-amber-700">{existingReturn.reversePickupStatus}</span></p>
                  )}
                  {existingReturn.resolutionNote && (
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 mt-2">
                      <p className="font-bold text-slate-900">Merchant / Admin Note:</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">{existingReturn.resolutionNote}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 text-xs text-slate-600">
                <Truck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Our courier rider will coordinate doorstep pickup within 24-48 business hours.</span>
              </div>
            </div>
          ) : (
            /* Creation Form */
            <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Step 1: Select Items */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Select Item(s) to {workflowType === 'EXCHANGE' ? 'Exchange' : 'Return'}
                </label>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {selectedItems.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => toggleItemSelection(index)}
                      className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                        item.selected
                          ? 'bg-amber-50/50'
                          : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                        />
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <ShoppingBag className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{item.title}</p>
                          <p className="text-[11px] text-slate-500">
                            Qty: {item.quantity} • ₹{item.price?.toLocaleString('en-IN')}
                            {item.variantSku && ` • SKU: ${item.variantSku}`}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-900">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 2: Exchange Configuration (Only when EXCHANGE) */}
              {workflowType === 'EXCHANGE' ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Replacement Options
                    </h4>
                  </div>

                  {/* Size Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700">
                      Select Replacement Size:
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {availableSizes.map(sz => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setRequestedSize(sz)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                            requestedSize === sz
                              ? 'bg-slate-900 text-amber-400 border-slate-900 shadow-sm scale-105'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700">
                      Select Replacement Color / Shade:
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {availableColors.map(col => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setRequestedColor(col)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                            requestedColor === col
                              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm scale-105'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reason for Exchange */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      Reason for Size / Color Exchange:
                    </label>
                    <select
                      value={exchangeReason}
                      onChange={(e) => setExchangeReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      {exchangeReasons.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                /* Return Reason & Refund Mode */
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Return Reason
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    >
                      {returnReasons.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Preferred Refund Mode
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setRefundMode('ORIGINAL_PAYMENT_METHOD')}
                        className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                          refundMode === 'ORIGINAL_PAYMENT_METHOD'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm ring-1 ring-indigo-500'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <CreditCard className="w-4 h-4 mb-1 text-indigo-600" />
                        <div>Original Payment</div>
                        <div className="text-[10px] text-slate-500 font-normal">3-5 business days</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRefundMode('WALLET_COINS')}
                        className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                          refundMode === 'WALLET_COINS'
                            ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-sm ring-1 ring-amber-500'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Wallet className="w-4 h-4 mb-1 text-amber-600" />
                        <div>Aura Coins Wallet</div>
                        <div className="text-[10px] text-emerald-600 font-normal">Instant credit</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRefundMode('BANK_TRANSFER')}
                        className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                          refundMode === 'BANK_TRANSFER'
                            ? 'border-slate-900 bg-slate-100 text-slate-900 shadow-sm ring-1 ring-slate-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Building2 className="w-4 h-4 mb-1 text-slate-700" />
                        <div>Direct NEFT / IMPS</div>
                        <div className="text-[10px] text-slate-500 font-normal">Direct bank transfer</div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Additional Notes */}
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Additional Details & Fitting Remarks
                </label>
                <textarea
                  rows={2}
                  value={detailedDescription}
                  onChange={(e) => setDetailedDescription(e.target.value)}
                  placeholder="e.g. Sleeves are 2 inches longer than expected, requesting Size L in Navy Blue..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              {/* Step 4: Photo Proof Upload */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span>Photo Proof (Optional)</span>
                  <span className="text-[11px] text-slate-400 font-normal">Helps instant approval</span>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {proofPhotos.map((photo, i) => (
                    <div key={i} className="relative w-14 h-14 rounded-xl border border-slate-200 overflow-hidden group">
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setProofPhotos(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <label className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-500 flex flex-col items-center justify-center text-slate-400 hover:text-amber-600 cursor-pointer transition">
                    <Camera className="w-4 h-4" />
                    <span className="text-[9px] font-bold mt-0.5">Upload</span>
                    <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
                  </label>

                  {proofPhotos.length === 0 && (
                    <div className="flex items-center gap-1.5 ml-2">
                      <span className="text-[11px] text-slate-400">Try demo:</span>
                      {demoPhotos.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setProofPhotos(prev => [...prev, p.url])}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Reverse Pickup Logistics Assurance Notice */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
                <Truck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-black text-slate-900 block">
                    {workflowType === 'EXCHANGE' ? 'Automatic Reverse Pickup Scheduled' : 'Doorstep Pickup Guarantee'}
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Our dedicated courier partner will arrive at your doorstep to inspect and collect the item. A secret 4-digit pickup OTP will be generated on your screen for safe verification.
                  </p>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs">
                  {workflowType === 'RETURN_REFUND' && (
                    <>
                      <span className="text-slate-500">Refund Total: </span>
                      <span className="font-black text-slate-900 text-sm">
                        ₹{calculateTotalRefund().toLocaleString('en-IN')}
                      </span>
                    </>
                  )}
                  {workflowType === 'EXCHANGE' && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      ✨ Zero Convenience Fee • Free Exchange
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading || selectedItems.filter(it => it.selected).length === 0}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-black shadow-md transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                  >
                    {loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {workflowType === 'EXCHANGE' ? 'Confirm 1-Click Exchange' : 'Submit Return Request'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
