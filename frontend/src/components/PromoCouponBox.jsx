import React, { useState, useEffect } from 'react';
import { Tag, Sparkles, CheckCircle2, X, ChevronDown, ChevronUp, AlertCircle, Percent, ArrowRight } from 'lucide-react';
import api from '../api/client';

export const PromoCouponBox = ({
  cartTotal = 0,
  appliedCoupon = null,
  onApplyCoupon,
  onRemoveCoupon,
}) => {
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [showOffers, setShowOffers] = useState(false);

  // Fetch active promo codes
  useEffect(() => {
    api.get('/coupons')
      .then(res => {
        if (res.data?.success && res.data.data?.length > 0) {
          setAvailableCoupons(res.data.data);
        } else {
          // Fallback demo offers
          setAvailableCoupons([
            {
              code: 'AURAFIRST',
              title: 'Welcome 20% Off',
              description: 'Save 20% up to ₹1,000 on orders above ₹999.',
              discountType: 'PERCENTAGE',
              discountValue: 20,
              minOrderAmount: 999,
            },
            {
              code: 'FESTIVE500',
              title: 'Flat ₹500 Mega Festive Savings',
              description: 'Get flat ₹500 off on orders above ₹2,499.',
              discountType: 'FLAT',
              discountValue: 500,
              minOrderAmount: 2499,
            },
            {
              code: 'SUPER10',
              title: 'Everyday Saver 10% Off',
              description: '10% instant discount across all catalog items.',
              discountType: 'PERCENTAGE',
              discountValue: 10,
              minOrderAmount: 0,
            },
          ]);
        }
      })
      .catch(() => {
        setAvailableCoupons([
          {
            code: 'AURAFIRST',
            title: 'Welcome 20% Off',
            description: 'Save 20% up to ₹1,000 on orders above ₹999.',
            discountType: 'PERCENTAGE',
            discountValue: 20,
            minOrderAmount: 999,
          },
          {
            code: 'FESTIVE500',
            title: 'Flat ₹500 Mega Festive Savings',
            description: 'Get flat ₹500 off on orders above ₹2,499.',
            discountType: 'FLAT',
            discountValue: 500,
            minOrderAmount: 2499,
          },
        ]);
      });
  }, []);

  const handleApply = async (codeToUse) => {
    const targetCode = (codeToUse || couponCode).trim().toUpperCase();
    if (!targetCode) {
      setError('Please enter a promo code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/coupons/validate', {
        code: targetCode,
        cartTotal,
      });

      if (res.data?.success && res.data.coupon) {
        if (onApplyCoupon) {
          onApplyCoupon(res.data.coupon);
        }
        setCouponCode('');
        setError(null);
      } else {
        setError(res.data?.message || 'Invalid promo code');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not validate promo code. Please check and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
          <Tag className="w-3.5 h-3.5 text-amber-500" />
          <span>Apply Promo Code / Coupon</span>
        </div>
        {availableCoupons.length > 0 && !appliedCoupon && (
          <button
            type="button"
            onClick={() => setShowOffers(!showOffers)}
            className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-0.5"
          >
            <span>{availableCoupons.length} Offers</span>
            {showOffers ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* APPLIED COUPON STATE */}
      {appliedCoupon ? (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Sparkles className="w-4 h-4 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xs text-slate-900 tracking-wider">
                  {appliedCoupon.code}
                </span>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                  APPLIED
                </span>
              </div>
              <p className="text-[11px] font-bold text-emerald-700">
                You saved ₹{appliedCoupon.discountAmount?.toLocaleString('en-IN')}!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onRemoveCoupon) onRemoveCoupon();
              setError(null);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Remove coupon"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* INPUT FORM */
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Enter coupon (e.g. AURAFIRST)"
                value={couponCode}
                onChange={e => {
                  setCouponCode(e.target.value.toUpperCase());
                  if (error) setError(null);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApply();
                  }
                }}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase tracking-wider"
              />
            </div>
            <button
              type="button"
              onClick={() => handleApply()}
              disabled={loading || !couponCode.trim()}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs transition-all shadow-sm flex items-center gap-1.5"
            >
              {loading ? (
                <span>Checking...</span>
              ) : (
                <>
                  <span>Apply</span>
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
            </button>
          </div>

          {/* Validation Error Message */}
          {error && (
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold animate-fade-in">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* EXPANDABLE AVAILABLE COUPONS LIST */}
      {showOffers && !appliedCoupon && (
        <div className="pt-2 border-t border-slate-200 space-y-2 animate-fade-in">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
            Tap to apply available promo codes:
          </span>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {availableCoupons.map(coupon => {
              const meetsMinOrder = !coupon.minOrderAmount || cartTotal >= coupon.minOrderAmount;
              const shortfall = coupon.minOrderAmount ? coupon.minOrderAmount - cartTotal : 0;

              return (
                <div
                  key={coupon.code}
                  className={`p-2.5 rounded-xl border transition-all text-xs flex items-center justify-between gap-2 ${
                    meetsMinOrder
                      ? 'bg-white border-slate-200 hover:border-amber-400 shadow-xs'
                      : 'bg-slate-100/70 border-slate-200 opacity-70'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 tracking-wider">
                        {coupon.code}
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                        {coupon.discountType === 'PERCENTAGE'
                          ? `${coupon.discountValue}% OFF`
                          : `₹${coupon.discountValue} OFF`}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {coupon.description || coupon.title}
                    </p>
                    {!meetsMinOrder && (
                      <p className="text-[10px] font-bold text-rose-600">
                        Add ₹{shortfall.toLocaleString('en-IN')} more to unlock this offer
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApply(coupon.code)}
                    disabled={!meetsMinOrder || loading}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all flex-shrink-0 ${
                      meetsMinOrder
                        ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 active:scale-95'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Apply
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoCouponBox;
