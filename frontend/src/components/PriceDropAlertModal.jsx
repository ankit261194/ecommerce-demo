import React, { useState } from 'react';
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
  RefreshCw
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export default function PriceDropAlertModal({
  isOpen,
  onClose,
  product,
  customerUser,
}) {
  if (!isOpen || !product) return null;

  const currentPrice = product.sellingPrice || product.price || 0;

  // Preset target prices
  const preset5 = Math.round(currentPrice * 0.95);
  const preset10 = Math.round(currentPrice * 0.90);
  const preset15 = Math.round(currentPrice * 0.85);

  const [targetPrice, setTargetPrice] = useState(preset10);
  const [customPrice, setCustomPrice] = useState(String(preset10));
  const [email, setEmail] = useState(customerUser?.email || '');
  const [phone, setPhone] = useState(customerUser?.phone || '');
  const [channel, setChannel] = useState('BOTH'); // 'EMAIL' | 'WHATSAPP' | 'BOTH'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

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

    const numeric = parseFloat(customPrice);
    if (isNaN(numeric) || numeric <= 0) {
      setError('Please specify a valid target price.');
      return;
    }
    if (numeric >= currentPrice) {
      setError(`Target price must be lower than current price (₹${currentPrice.toLocaleString('en-IN')}).`);
      return;
    }

    if (!email || !email.includes('@')) {
      setError('A valid email address is required to receive drop alerts.');
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
          targetPrice: numeric,
          email: email.trim(),
          phone: phone.trim(),
          name: customerUser?.name || 'Valued Shopper',
          channel,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create price drop alert');
      }

      setSuccessData(data.data);
    } catch (err) {
      setError(err.message || 'Failed to set price drop alert.');
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
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-sm">
              <TrendingDown className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  Smart Price Drop Alert
                </h3>
                <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                  Point #6 Certified
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Instant WhatsApp & Email notification the moment price drops
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
                  Price Drop Alert Activated!
                </h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  We've successfully subscribed you to price updates for <strong className="text-slate-900">{product.title}</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Current Selling Price:</span>
                  <span className="font-bold text-slate-800 line-through">₹{currentPrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Your Target Alert Price:</span>
                  <span className="font-black text-emerald-600 text-sm">₹{successData.targetPrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Notification Channel:</span>
                  <span className="font-bold text-slate-800 uppercase text-[11px] bg-slate-200 px-2 py-0.5 rounded">
                    {successData.channel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Destination:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[200px]">
                    {successData.customerEmail}
                  </span>
                </div>
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
                      Current: ₹{currentPrice.toLocaleString('en-IN')}
                    </span>
                    {product.mrp && product.mrp > currentPrice && (
                      <span className="text-[10px] text-slate-400 line-through">
                        MRP ₹{product.mrp.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Target Price Presets */}
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
                    <div className="text-[10px] text-amber-700 font-black uppercase">5% OFF</div>
                    <div className="text-xs font-black">₹{preset5.toLocaleString('en-IN')}</div>
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
                    <div className="text-[10px] text-emerald-700 font-black uppercase">10% OFF</div>
                    <div className="text-xs font-black">₹{preset10.toLocaleString('en-IN')}</div>
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
                    <div className="text-[10px] text-indigo-700 font-black uppercase">15% OFF</div>
                    <div className="text-xs font-black">₹{preset15.toLocaleString('en-IN')}</div>
                  </button>
                </div>

                {/* Custom Target Input */}
                <div className="relative mt-2">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max={currentPrice - 1}
                    value={customPrice}
                    onChange={handleCustomChange}
                    placeholder="Enter custom target price"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                    Target Price
                  </span>
                </div>
              </div>

              {/* Notification Channel */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Notification Channel:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setChannel('EMAIL')}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                      channel === 'EMAIL'
                        ? 'bg-slate-900 text-amber-400 border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannel('WHATSAPP')}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                      channel === 'WHATSAPP'
                        ? 'bg-slate-900 text-amber-400 border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannel('BOTH')}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                      channel === 'BOTH'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-black'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>Both</span>
                  </button>
                </div>
              </div>

              {/* Contact Details Inputs */}
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Email Address:
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>

                {['WHATSAPP', 'BOTH'].includes(channel) && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      WhatsApp Phone Number:
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bell className="w-4 h-4 fill-current" />
                  )}
                  <span>Notify Me at ₹{parseFloat(customPrice || 0).toLocaleString('en-IN')}</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero spam guarantee • 1-Click unsubscribe link in every alert</span>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
