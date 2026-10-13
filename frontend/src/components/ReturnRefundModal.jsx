import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCcw,
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
  RefreshCw,
  Clock,
  ArrowRight,
  Package,
} from 'lucide-react';

export default function ReturnRefundModal({
  isOpen,
  onClose,
  orderData,
  apiUrl = '/api',
  onSuccess,
}) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [reason, setReason] = useState('Defective / damaged product');
  const [detailedDescription, setDetailedDescription] = useState('');
  const [proofPhotos, setProofPhotos] = useState([]);
  const [refundMode, setRefundMode] = useState('ORIGINAL_PAYMENT_METHOD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [existingReturn, setExistingReturn] = useState(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

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
      reader.onload = (event) => {
        if (event.target?.result) {
          setProofPhotos(prev => [...prev, event.target.result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const addDemoPhoto = (url) => {
    if (!proofPhotos.includes(url)) {
      setProofPhotos(prev => [...prev, url]);
    }
  };

  const removePhoto = (index) => {
    setProofPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const toggleItemSelection = (index) => {
    setSelectedItems(prev =>
      prev.map((it, idx) => (idx === index ? { ...it, selected: !it.selected } : it))
    );
  };

  const calculateTotalRefund = () => {
    return selectedItems
      .filter(it => it.selected)
      .reduce((sum, it) => sum + (it.price * it.quantity), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const itemsToReturn = selectedItems.filter(it => it.selected);
    if (itemsToReturn.length === 0) {
      setError('Please select at least one item to return.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || 'demo-customer-token';
      const payload = {
        orderId: orderData.rawOrderId || orderData.orderId,
        subOrderId: orderData.subOrders?.[0]?.rawSubOrderId,
        items: itemsToReturn,
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
    } catch (err) {
      setError(err.message || 'Could not submit return request.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-slate-900 dark:to-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Return & Refund Request
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Buyer Protection
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Order #{orderData?.orderId || 'ORD'} • 7-Day Hassle-Free Returns
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {existingReturn ? (
            /* View Existing Return Request Status */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-slate-800/80 border border-indigo-200 dark:border-indigo-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Return Request Active
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    existingReturn.status === 'REFUNDED'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : existingReturn.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {existingReturn.status}
                  </span>
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <p><strong>Reason:</strong> {existingReturn.reason}</p>
                  {existingReturn.detailedDescription && (
                    <p><strong>Details:</strong> "{existingReturn.detailedDescription}"</p>
                  )}
                  <p><strong>Refund Amount:</strong> ₹{existingReturn.refundAmount?.toLocaleString('en-IN')}</p>
                  <p><strong>Refund Mode:</strong> <span className="uppercase font-mono text-[11px]">{existingReturn.refundMode}</span></p>
                  {existingReturn.resolutionNote && (
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-800 mt-2">
                      <p className="font-semibold text-indigo-900 dark:text-indigo-300">Merchant / Admin Note:</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{existingReturn.resolutionNote}</p>
                    </div>
                  )}
                </div>

                {existingReturn.proofPhotos?.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Submitted Proof Photos:</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {existingReturn.proofPhotos.map((photo, i) => (
                        <img
                          key={i}
                          src={photo}
                          alt="Proof"
                          className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Return Submission Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. Select Items to Return */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  1. Select Items to Return
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedItems.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleItemSelection(idx)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        item.selected
                          ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20'
                          : 'border-slate-200 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => {}}
                          className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                        />
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            <ShoppingBag className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                            {item.title}
                          </p>
                          {item.variantSku && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              SKU: {item.variantSku}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          ₹{item.price * item.quantity}
                        </p>
                        <p className="text-[10px] text-slate-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Return Reason */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  2. Reason for Return
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {returnReasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <textarea
                  rows={2}
                  value={detailedDescription}
                  onChange={(e) => setDetailedDescription(e.target.value)}
                  placeholder="Additional details (e.g. description of scratch, error code, or fit issue)..."
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* 3. Photo Proof Upload & 1-Tap Demo Sample Photos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-amber-500" />
                    3. Upload Proof Photos (Optional but recommended)
                  </label>
                  <span className="text-[10px] text-slate-400">Max 5 photos</span>
                </div>

                {/* 1-Tap Sample Photo Chips for Testing/Demo */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[10px] font-semibold text-slate-400">1-Tap Demo Photos:</span>
                  {demoPhotos.map((dp, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => addDemoPhoto(dp.url)}
                      className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60 text-[10px] font-medium border border-amber-200 dark:border-amber-800 transition"
                    >
                      {dp.label}
                    </button>
                  ))}
                </div>

                {/* Upload Input & Gallery */}
                <div className="flex flex-wrap gap-2.5 items-center pt-1">
                  <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-amber-500 transition">
                    <Upload className="w-4 h-4" />
                    <span className="text-[9px] mt-0.5">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {proofPhotos.map((photo, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden group">
                      <img src={photo} alt="Proof" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Refund Destination Mode */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  4. Preferred Refund Destination
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2.5 transition ${
                      refundMode === 'ORIGINAL_PAYMENT_METHOD'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="refund_mode"
                      value="ORIGINAL_PAYMENT_METHOD"
                      checked={refundMode === 'ORIGINAL_PAYMENT_METHOD'}
                      onChange={() => setRefundMode('ORIGINAL_PAYMENT_METHOD')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                        Original Source
                      </p>
                      <p className="text-[10px] text-slate-500">Back to Card / UPI / Bank</p>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2.5 transition ${
                      refundMode === 'WALLET_COINS'
                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="refund_mode"
                      value="WALLET_COINS"
                      checked={refundMode === 'WALLET_COINS'}
                      onChange={() => setRefundMode('WALLET_COINS')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <Wallet className="w-3.5 h-3.5 text-amber-500" />
                        AuraMarket Wallet
                      </p>
                      <p className="text-[10px] text-emerald-600 font-semibold">⚡ Instant Disbursement</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Total Refund Banner */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 uppercase font-semibold">Estimated Refund Amount:</span>
                  <p className="text-lg font-black text-slate-900 dark:text-white">
                    ₹{calculateTotalRefund().toLocaleString('en-IN')}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading || calculateTotalRefund() === 0}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow-md shadow-amber-500/20 active:scale-95"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      Submit Return Request
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Courier doorstep pickup scheduled within 24-48 hours of merchant approval</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-200 hover:bg-slate-300 font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
