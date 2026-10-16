import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useLocalization } from '../context/LocalizationContext';
import { ShoppingBag, Clock, Sparkles, Check, Copy, X, ArrowRight, Tag } from 'lucide-react';
import api from '../api/client';

export const ExitIntentCartModal = () => {
  const { cartItems, cartTotal, cartCount, setIsCartOpen } = useCart();
  const { formatPrice } = useLocalization();

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState({
    enabled: true,
    headline: "Wait! Don't leave your cart behind!",
    subheadline: 'Complete your purchase now and enjoy an instant exclusive discount.',
    discountPercentage: 10,
    couponCode: 'SAVE10NOW',
    countdownSeconds: 900,
  });
  const [timeLeft, setTimeLeft] = useState(900);

  // Fetch dynamic exit-intent configuration from backend
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/abandoned-carts/exit-intent-config');
        if (res.data?.success && res.data.exitIntent) {
          setConfig(res.data.exitIntent);
          setTimeLeft(res.data.exitIntent.countdownSeconds || 900);
        }
      } catch (err) {
        console.warn('Failed to load exit-intent config:', err);
      }
    };
    fetchConfig();
  }, []);

  // Exit-Intent Mouse Movement Detection
  useEffect(() => {
    if (!config.enabled || cartCount === 0) return;

    const handleMouseLeave = (e) => {
      // Trigger if cursor leaves towards the top of the viewport
      if (e.clientY <= 15) {
        const hasTriggered = sessionStorage.getItem('auramarket_exit_intent_seen');
        if (!hasTriggered) {
          setIsOpen(true);
          sessionStorage.setItem('auramarket_exit_intent_seen', 'true');

          // Log trigger event to backend telemetry
          api.post('/abandoned-carts/exit-intent-event', {
            event: 'TRIGGERED',
            couponCode: config.couponCode,
          }).catch(() => {});
        }
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [config, cartCount]);

  // Live Countdown Timer
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, timeLeft]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCopyCoupon = () => {
    if (navigator.clipboard && config.couponCode) {
      navigator.clipboard.writeText(config.couponCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleClaimDiscount = async () => {
    // Record converted event
    try {
      await api.post('/abandoned-carts/exit-intent-event', {
        event: 'CONVERTED',
        couponCode: config.couponCode,
      });
    } catch (_) {}

    // Copy coupon and save applied coupon hint
    if (navigator.clipboard && config.couponCode) {
      navigator.clipboard.writeText(config.couponCode);
    }
    localStorage.setItem('applied_recovery_coupon', config.couponCode);

    setIsOpen(false);
    setIsCartOpen(true);
  };

  if (!isOpen || cartCount === 0) return null;

  const discountAmount = (cartTotal * (config.discountPercentage || 10)) / 100;
  const discountedTotal = Math.max(0, cartTotal - discountAmount);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-amber-200 overflow-hidden transform transition-all animate-scale-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-modal-title"
      >
        {/* Top Gradient Ribbon */}
        <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 px-6 py-4 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-white/20 rounded-full animate-pulse">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full">
              Exclusive Cart Reservation Deal
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
            title="Close popup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Headline & Countdown */}
          <div className="text-center space-y-2">
            <h2 id="exit-modal-title" className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {config.headline || "Wait! Don't leave your cart empty"}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-sm mx-auto">
              {config.subheadline || 'Claim your special discount before reservation timer expires!'}
            </p>

            {/* Live Countdown Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-full text-rose-600 text-xs font-bold mt-2">
              <Clock className="w-4 h-4 animate-spin-slow" />
              <span>Offer Expires in:</span>
              <span className="font-mono text-sm tracking-widest font-black text-rose-700">
                {formatTimer(timeLeft)}
              </span>
            </div>
          </div>

          {/* Cart Items Preview Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pb-1 border-b border-slate-200">
              <span className="flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                Reserved Items ({cartCount})
              </span>
              <span className="text-slate-400">Inventory held temporarily</span>
            </div>
            
            <div className="flex items-center gap-3 overflow-x-auto py-1">
              {cartItems.slice(0, 4).map((item, idx) => (
                <div key={idx} className="flex-shrink-0 flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-slate-100 shadow-xs">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-9 h-9 object-cover rounded-lg border border-slate-200"
                  />
                  <div className="max-w-[110px] text-left">
                    <p className="text-xs font-bold text-slate-800 truncate">{item.title}</p>
                    <p className="text-[11px] text-slate-500 font-medium">Qty: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Before / After Display */}
            <div className="flex items-center justify-between pt-2 text-sm">
              <span className="text-slate-600 font-medium">Cart Subtotal:</span>
              <div className="text-right">
                <span className="text-xs text-slate-400 line-through mr-2">
                  {formatPrice(cartTotal)}
                </span>
                <span className="text-base font-extrabold text-emerald-600">
                  {formatPrice(discountedTotal)}
                </span>
                <span className="ml-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  SAVE {config.discountPercentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Exclusive Coupon Code Box */}
          <div className="bg-amber-50/80 border-2 border-dashed border-amber-400 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Your Exclusive Coupon</p>
                <p className="font-mono text-lg font-black text-amber-950 tracking-wider">
                  {config.couponCode}
                </p>
              </div>
            </div>

            <button
              onClick={handleCopyCoupon}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                copied
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm active:scale-95'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Code
                </>
              )}
            </button>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2.5 pt-1">
            <button
              onClick={handleClaimDiscount}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Claim {config.discountPercentage}% OFF & Checkout Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
            >
              No thanks, I'll pay full price later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
