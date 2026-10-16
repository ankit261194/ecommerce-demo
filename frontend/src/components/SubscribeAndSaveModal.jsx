import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Calendar,
  Clock,
  Wallet,
  CheckCircle2,
  X,
  AlertCircle,
  Pause,
  Play,
  SkipForward,
  Trash2,
  Truck,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Plus,
  Minus,
} from 'lucide-react';
import api from '../api/client';

const FREQUENCY_OPTIONS = [
  { id: 'DAILY', label: 'Daily Delivery', days: 1, subtext: 'Fresh milk, daily essentials' },
  { id: 'WEEKLY', label: 'Every Week', days: 7, subtext: 'Weekly fruits & pantry staples' },
  { id: 'BIWEEKLY', label: 'Every 2 Weeks', days: 14, subtext: 'Household supplies' },
  { id: 'MONTHLY', label: 'Every Month', days: 30, subtext: 'Personal care, grooming, supplements' },
];

const TIME_SLOTS = [
  { id: 'MORNING_6_8', label: '🌅 6:00 AM - 8:00 AM (Early Morning Drop)' },
  { id: 'AFTERNOON_12_2', label: '☀️ 12:00 PM - 2:00 PM (Midday)' },
  { id: 'EVENING_6_8', label: '🌙 6:00 PM - 8:00 PM (Evening)' },
  { id: 'ANYTIME', label: '📦 Anytime Standard Express' },
];

export default function SubscribeAndSaveModal({
  isOpen,
  onClose,
  product,
  selectedVariant = null,
  user = null,
  onSuccessToast,
}) {
  const [activeTab, setActiveTab] = useState('CREATE'); // 'CREATE' | 'MY_SUBSCRIPTIONS'
  const [frequency, setFrequency] = useState('MONTHLY');
  const [quantity, setQuantity] = useState(1);
  const [timeSlot, setTimeSlot] = useState('MORNING_6_8');
  const [paymentMethod, setPaymentMethod] = useState('WALLET_AUTO_DEBIT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Customer's existing subscriptions
  const [mySubscriptions, setMySubscriptions] = useState([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);

  const basePrice = product?.sellingPrice || 999;
  const variantAdditional = selectedVariant?.additionalPrice || 0;
  const unitPrice = basePrice + variantAdditional;
  const discountPercentage = 10;
  const discountedUnitPrice = Math.max(1, Math.round(unitPrice * 0.9));
  const cycleTotal = discountedUnitPrice * quantity;
  const unitSavings = unitPrice - discountedUnitPrice;
  const totalSavings = unitSavings * quantity;

  // Next scheduled date preview
  const freqObj = FREQUENCY_OPTIONS.find((f) => f.id === frequency) || FREQUENCY_OPTIONS[3];
  const nextDeliveryDatePreview = new Date(Date.now() + freqObj.days * 24 * 60 * 60 * 1000);

  // Fetch my subscriptions when switching to list tab or on open
  const fetchMySubscriptions = async () => {
    setIsLoadingSubs(true);
    try {
      const res = await api.get('/subscriptions/my');
      if (res.data?.success) {
        setMySubscriptions(res.data.data || []);
      }
    } catch (_) {
      // Graceful fallback
    } finally {
      setIsLoadingSubs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (localStorage.getItem('token')) {
        fetchMySubscriptions();
      }
    }
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const handleCreateSubscription = async () => {
    if (!localStorage.getItem('token')) {
      setErrorMsg('Please login to set up automated Subscribe & Save recurring orders.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.post('/subscriptions', {
        productId: product._id,
        variantSku: selectedVariant?.sku || null,
        quantity,
        frequency,
        deliveryTimeSlot: timeSlot,
        paymentMethod,
      });

      if (res.data?.success) {
        onSuccessToast?.(res.data.message || 'Subscribed successfully! 10% recurring discount active.');
        fetchMySubscriptions();
        setActiveTab('MY_SUBSCRIPTIONS');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to create subscription. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (subId, actionType, reason = '') => {
    try {
      const res = await api.post(`/subscriptions/${subId}/${actionType}`, { reason });
      if (res.data?.success) {
        onSuccessToast?.(res.data.message || `Subscription ${actionType} successful!`);
        fetchMySubscriptions();
      }
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${actionType} subscription`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden text-slate-900">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
              <RefreshCw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg leading-tight">Subscribe & Save Engine</h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-full border border-white/20">
                  Save 10% Every Order
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-medium">Point 13: Recurring Auto-Delivery with Flexible Schedules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            onClick={() => setActiveTab('CREATE')}
            className={`flex-1 py-3 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'CREATE'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Setup New Subscription</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('MY_SUBSCRIPTIONS');
              fetchMySubscriptions();
            }}
            className={`flex-1 py-3 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'MY_SUBSCRIPTIONS'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>My Active Subscriptions ({mySubscriptions.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'CREATE' ? (
            <>
              {/* Product Card Snapshot */}
              <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={product.thumbnail || product.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e'}
                    alt={product.title}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">{product.title}</h4>
                    <p className="text-[11px] text-slate-500">
                      Standard: <span className="line-through">₹{unitPrice}</span> •{' '}
                      <span className="font-black text-emerald-600">Subscribed: ₹{discountedUnitPrice}</span>
                    </p>
                  </div>
                </div>

                {/* Quantity Controller */}
                <div className="flex items-center gap-2 border border-slate-300 rounded-xl bg-white px-2 py-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-black text-xs font-mono w-5 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Step 1: Select Delivery Frequency */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1. Choose Delivery Frequency</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FREQUENCY_OPTIONS.map((opt) => {
                    const isSelected = frequency === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFrequency(opt.id)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="block text-xs font-black">{opt.label}</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5 line-clamp-1">{opt.subtext}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Preferred Delivery Time Slot */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. Preferred Doorstep Time Window</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const isSelected = timeSlot === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setTimeSlot(slot.id)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500/20'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Payment Method for Auto-Orders */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>3. Payment Channel for Recurring Cycle</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'WALLET_AUTO_DEBIT', label: '🪙 Wallet Auto-Debit', desc: 'Auto-deduct from cash wallet' },
                    { id: 'UPI_AUTOPAY', label: '⚡ UPI AutoPay Mandate', desc: 'NPCI UPI recurring auto-debit' },
                    { id: 'COD_PER_DELIVERY', label: '💵 Cash per Delivery', desc: 'Pay rider on each arrival' },
                  ].map((p) => {
                    const isSelected = paymentMethod === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPaymentMethod(p.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500/20'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span className="block text-xs font-black">{p.label}</span>
                        <span className="block text-[10px] text-slate-500">{p.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Calculation & Savings Callout */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 border border-emerald-300/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-semibold">One-Time Buy Value ({quantity}x):</span>
                  <span className="line-through text-slate-500 font-bold font-mono">₹{unitPrice * quantity}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-emerald-700 font-bold">
                  <span>Subscribe & Save Discount (10% OFF):</span>
                  <span className="font-mono">-₹{totalSavings}</span>
                </div>
                <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 block leading-tight">Cycle Total Payable:</span>
                    <span className="text-[10px] text-emerald-700 font-bold">
                      Next Delivery: {nextDeliveryDatePreview.toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </span>
                  </div>
                  <span className="text-xl font-black text-emerald-900 font-mono">₹{cycleTotal}</span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCreateSubscription}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSubmitting ? 'Scheduling Auto-Orders...' : `Confirm & Subscribe for ₹${cycleTotal} / cycle`}</span>
              </button>
            </>
          ) : (
            /* Tab 2: My Active Subscriptions */
            <div className="space-y-3">
              {isLoadingSubs ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                  Loading your subscriptions...
                </div>
              ) : mySubscriptions.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-800">No Active Subscriptions</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    You have not set up any recurring deliveries yet. Subscribe to your favorite daily staples and save 10% on every order!
                  </p>
                  <button
                    onClick={() => setActiveTab('CREATE')}
                    className="mt-2 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-500"
                  >
                    Subscribe to this item
                  </button>
                </div>
              ) : (
                mySubscriptions.map((sub) => {
                  const isPaused = sub.status === 'PAUSED';
                  const isCancelled = sub.status === 'CANCELLED';
                  const nextDateStr = new Date(sub.nextDeliveryDate).toLocaleDateString('en-IN', {
                    dateStyle: 'medium',
                  });

                  return (
                    <div
                      key={sub._id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all space-y-3 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              sub.product?.thumbnail ||
                              sub.product?.images?.[0] ||
                              'https://images.unsplash.com/photo-1505740420928-5e560c06d30e'
                            }
                            alt={sub.product?.title || 'Product'}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                              {sub.product?.title || 'Subscribed Product'}
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Frequency: <strong className="text-slate-800">{sub.frequency}</strong> • Qty:{' '}
                              <strong>{sub.quantity}</strong> • Cycle: <strong>₹{sub.cycleTotal}</strong>
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            sub.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isPaused
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-red-50 text-red-800 border-red-200'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Next Scheduled Delivery:</span>
                        </span>
                        <strong className="text-slate-900 font-bold">{nextDateStr}</strong>
                      </div>

                      {/* Management Action Buttons */}
                      {!isCancelled && (
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                          {isPaused ? (
                            <button
                              type="button"
                              onClick={() => handleAction(sub._id, 'resume')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-1 transition-all"
                            >
                              <Play className="w-3 h-3" />
                              <span>Resume</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAction(sub._id, 'pause')}
                              className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs flex items-center gap-1 transition-all"
                            >
                              <Pause className="w-3 h-3" />
                              <span>Pause</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isPaused}
                            onClick={() => handleAction(sub._id, 'skip')}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-all disabled:opacity-40"
                          >
                            <SkipForward className="w-3 h-3" />
                            <span>Skip Next</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to cancel this recurring subscription?')) {
                                handleAction(sub._id, 'cancel');
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center gap-1 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
