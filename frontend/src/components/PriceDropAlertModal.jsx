import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Mail,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Package,
  Phone,
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export default function PriceDropAlertModal({
  isOpen,
  onClose,
  product,
  customerUser,
  initialMode = 'PRICE_DROP', // 'PRICE_DROP' | 'BACK_IN_STOCK'
}) {
  if (!isOpen || !product) return null;

  const currentPrice = product.sellingPrice || product.price || 0;
  const currentStock = product.stock || 0;

  // Preset target prices
  const preset5 = Math.round(currentPrice * 0.95);
  const preset10 = Math.round(currentPrice * 0.90);
  const preset15 = Math.round(currentPrice * 0.85);

  const [alertMode, setAlertMode] = useState(initialMode);
  const [targetPrice, setTargetPrice] = useState(preset10);
  const [customPrice, setCustomPrice] = useState(String(preset10));
  const [email, setEmail] = useState(customerUser?.email || '');
  const [phone, setPhone] = useState(customerUser?.phone || '');
  const [channel, setChannel] = useState('BOTH'); // 'EMAIL' | 'WHATSAPP' | 'BOTH'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    setAlertMode(initialMode);
    setSuccessData(null);
    setError(null);
  }, [initialMode, isOpen]);

  const handleSelectPreset = (val) => {
    setTargetPrice(val);
    setCustomPrice(String(val));
  };

  const handleCustomChange = (e) => {
    const val = e.target.value;
    setCustomPrice(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setTargetPrice(num);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const isPriceDrop = alertMode === 'PRICE_DROP';
    const numeric = parseFloat(customPrice);

    if (isPriceDrop) {
      if (isNaN(numeric) || numeric <= 0) {
        setError('Please specify a valid target price.');
        return;
      }
      if (numeric >= currentPrice) {
        setError(`Target price must be lower than current price (₹${currentPrice.toLocaleString('en-IN')}).`);
        return;
      }
    }

    if (['EMAIL', 'BOTH'].includes(channel) && (!email || !email.includes('@'))) {
      setError('A valid email address is required to receive alerts.');
      return;
    }

    if (['WHATSAPP', 'BOTH'].includes(channel) && !phone) {
      setError('Please provide your WhatsApp phone number for instant notifications.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/price-drop-alerts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productId: product._id,
          alertType: alertMode,
          targetPrice: isPriceDrop ? numeric : currentPrice,
          email: email.trim(),
          phone: phone.trim(),
          name: customerUser?.name || 'Valued Shopper',
          channel,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create product alert');
      }

      setSuccessData(data.data);
    } catch (err) {
      setError(err.message || 'Failed to set product alert.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Card */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col animate-scale-up">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${
              alertMode === 'BACK_IN_STOCK'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600'
                : 'bg-amber-500/10 border border-amber-500/20 text-amber-600'
            }`}>
              {alertMode === 'BACK_IN_STOCK' ? (
                <Package className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <TrendingDown className="w-5 h-5 stroke-[2.2]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  {alertMode === 'BACK_IN_STOCK' ? 'Back in Stock Alert' : 'Price Drop Alert'}
                </h3>
                <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                  WhatsApp & SMS
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {alertMode === 'BACK_IN_STOCK'
                  ? 'Get an instant WhatsApp message the second new stock arrives'
                  : 'Instant WhatsApp & Email notification the moment price drops'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 transition-all"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1.5 mx-6 mt-4 bg-slate-100 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => {
              setAlertMode('PRICE_DROP');
              setSuccessData(null);
              setError(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              alertMode === 'PRICE_DROP'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Price Drop Alert</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAlertMode('BACK_IN_STOCK');
              setSuccessData(null);
              setError(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              alertMode === 'BACK_IN_STOCK'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Back in Stock Alert</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {successData ? (
            /* Success Confirmation State */
            <div className="space-y-4 text-center py-2 animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10 border border-emerald-200">
                <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-900">
                  {alertMode === 'BACK_IN_STOCK' ? 'Restock Alert Activated! 📦' : 'Price Drop Alert Activated! 🎉'}
                </h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  We'll notify you for <strong className="text-slate-900">{product.title}</strong> via WhatsApp and SMS the moment it's triggered.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Alert Mode:</span>
                  <span className="font-bold text-slate-800">
                    {alertMode === 'BACK_IN_STOCK' ? '📦 Back in Stock Restock' : '📉 Price Drop Notification'}
                  </span>
                </div>
                {alertMode === 'PRICE_DROP' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Current Selling Price:</span>
                      <span className="font-bold text-slate-800 line-through">₹{currentPrice.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Target Alert Price:</span>
                      <span className="font-black text-emerald-600 text-sm">₹{successData.targetPrice?.toLocaleString('en-IN')}</span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Channels:</span>
                  <span className="font-bold text-slate-800 uppercase text-[11px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                    {successData.channel}
                  </span>
                </div>
                {successData.customerPhone && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">WhatsApp / Mobile:</span>
                    <span className="font-bold text-slate-800">
                      {successData.customerPhone}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs shadow-md transition-all active:scale-95"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Subscription Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Product Snippet */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden flex-shrink-0">
                  <img
                    src={product.images?.[0] || product.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {product.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-black text-slate-900">
                      Price: ₹{currentPrice.toLocaleString('en-IN')}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      currentStock <= 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {currentStock <= 0 ? 'Out of Stock' : `${currentStock} in stock`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price Drop Mode Presets */}
              {alertMode === 'PRICE_DROP' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Notify Me When Price Drops To:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectPreset(preset5)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        targetPrice === preset5
                          ? 'border-amber-500 bg-amber-50 text-slate-900 ring-2 ring-amber-400/40 font-black scale-[1.02]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 font-bold'
                      }`}
                    >
                      <div className="text-xs font-black">₹{preset5.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-amber-600 font-bold mt-0.5">5% OFF</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset(preset10)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        targetPrice === preset10
                          ? 'border-amber-500 bg-amber-50 text-slate-900 ring-2 ring-amber-400/40 font-black scale-[1.02]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 font-bold'
                      }`}
                    >
                      <div className="text-xs font-black">₹{preset10.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-emerald-600 font-bold mt-0.5">10% OFF 🔥</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset(preset15)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        targetPrice === preset15
                          ? 'border-amber-500 bg-amber-50 text-slate-900 ring-2 ring-amber-400/40 font-black scale-[1.02]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 font-bold'
                      }`}
                    >
                      <div className="text-xs font-black">₹{preset15.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-rose-600 font-bold mt-0.5">15% OFF ⭐</div>
                    </button>
                  </div>

                  <div className="pt-2">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Or enter custom target price (₹):
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max={currentPrice - 1}
                      value={customPrice}
                      onChange={handleCustomChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-black text-slate-900 outline-none transition-all"
                      placeholder="e.g. 799"
                    />
                  </div>
                </div>
              ) : (
                /* Back in Stock Info Box */
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                  <div className="flex items-center gap-2 font-black text-xs">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Instant Warehouse Restock Radar</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed font-medium">
                    This item is currently sold out. We will monitor the seller's inventory continuously and trigger a priority WhatsApp and SMS dispatch as soon as new stock is added.
                  </p>
                </div>
              )}

              {/* Notification Channel Picker */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Notify Me Via:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'BOTH', label: 'WhatsApp + Email', icon: Sparkles },
                    { id: 'WHATSAPP', label: 'WhatsApp Only', icon: MessageSquare },
                    { id: 'EMAIL', label: 'Email Only', icon: Mail },
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setChannel(ch.id)}
                      className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                        channel === ch.id
                          ? 'border-amber-500 bg-amber-50 text-slate-900 ring-2 ring-amber-400/40 font-black'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 font-bold'
                      }`}
                    >
                      <ch.icon className="w-4 h-4 text-amber-600" />
                      <span className="text-[11px]">{ch.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Inputs */}
              <div className="space-y-3 pt-1">
                {['WHATSAPP', 'BOTH'].includes(channel) && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      WhatsApp Mobile Number:
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="9876543210"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-xs font-bold text-slate-900 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                {['EMAIL', 'BOTH'].includes(channel) && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Email Address:
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="shopper@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-xs font-bold text-slate-900 outline-none transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 rounded-xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 ${
                    alertMode === 'BACK_IN_STOCK'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                      : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20'
                  }`}
                >
                  <Bell className="w-4 h-4 fill-current" />
                  <span>
                    {loading
                      ? 'Activating Alert...'
                      : alertMode === 'BACK_IN_STOCK'
                      ? 'Notify Me When In Stock'
                      : `Set Alert for ₹${customPrice || targetPrice}`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero spam guarantee • 1-click unsubscribe anytime</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
