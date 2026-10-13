import React, { useState, useEffect } from 'react';
import { X, Tag, Copy, Check, Sparkles, Gift, Percent, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import api from '../api/client';

export const StorefrontOffersHub = ({
  isOpen,
  onClose,
  onOpenScratchCard,
  onApplyCouponToCart,
}) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    api.get('/coupons')
      .then(res => {
        if (res.data?.success && res.data.data?.length > 0) {
          setCoupons(res.data.data);
        } else {
          setCoupons([
            {
              code: 'AURAFIRST',
              title: 'Welcome 20% Off',
              description: 'Save 20% up to ₹1,000 on your first purchase above ₹999.',
              discountType: 'PERCENTAGE',
              discountValue: 20,
              minOrderAmount: 999,
              isFeatured: true,
            },
            {
              code: 'FESTIVE500',
              title: 'Grand Festive ₹500 Discount',
              description: 'Get flat ₹500 instant discount on orders above ₹2,499.',
              discountType: 'FLAT',
              discountValue: 500,
              minOrderAmount: 2499,
              isFeatured: true,
            },
            {
              code: 'SUPER10',
              title: 'Everyday Saver 10% Off',
              description: 'Enjoy 10% instant discount across all catalog items with no min spend.',
              discountType: 'PERCENTAGE',
              discountValue: 10,
              minOrderAmount: 0,
              isFeatured: false,
            },
          ]);
        }
        setLoading(false);
      })
      .catch(() => {
        setCoupons([
          {
            code: 'AURAFIRST',
            title: 'Welcome 20% Off',
            description: 'Save 20% up to ₹1,000 on your first purchase above ₹999.',
            discountType: 'PERCENTAGE',
            discountValue: 20,
            minOrderAmount: 999,
          },
          {
            code: 'FESTIVE500',
            title: 'Grand Festive ₹500 Discount',
            description: 'Get flat ₹500 instant discount on orders above ₹2,499.',
            discountType: 'FLAT',
            discountValue: 500,
            minOrderAmount: 2499,
          },
        ]);
        setLoading(false);
      });
  }, [isOpen]);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white">
                Coupons & Exclusive Offers
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                1-Click copy & apply discounts directly at checkout
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Scratch & Win Gamified Banner */}
          <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 shadow-md">
            <div className="flex items-center justify-between gap-3 relative z-10">
              <div className="space-y-1">
                <span className="inline-block px-2 py-0.5 rounded-full bg-slate-950 text-amber-400 text-[10px] font-black uppercase">
                  Gamified Reward
                </span>
                <h4 className="text-sm font-black text-slate-950">
                  Scratch & Win Up to 25% OFF! 🎁
                </h4>
                <p className="text-[11px] font-semibold text-slate-900">
                  Try your luck with our interactive digital scratch card.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onOpenScratchCard) {
                    onOpenScratchCard();
                  }
                }}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5 flex-shrink-0 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Scratch Card</span>
              </button>
            </div>
          </div>

          {/* Active Promo Codes List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Available Promo Codes
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">
                {coupons.length} Active Vouchers
              </span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {coupons.map(coupon => {
                  const isCopied = copiedCode === coupon.code;
                  const discountBadge = coupon.discountType === 'PERCENTAGE'
                    ? `${coupon.discountValue}% OFF`
                    : `₹${coupon.discountValue} FLAT OFF`;

                  return (
                    <div
                      key={coupon.code}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-amber-400 transition-all shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {/* Coupon Code Pill */}
                            <span className="font-mono font-black text-sm text-slate-950 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 tracking-wider">
                              {coupon.code}
                            </span>
                            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {discountBadge}
                            </span>
                          </div>
                          <h5 className="text-xs font-black text-slate-900 pt-0.5">
                            {coupon.title}
                          </h5>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {coupon.description}
                          </p>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                        <span className="text-slate-400 font-semibold">
                          {coupon.minOrderAmount > 0
                            ? `Min spend: ₹${coupon.minOrderAmount.toLocaleString('en-IN')}`
                            : 'No minimum purchase required'}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(coupon.code)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-600" />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>

                          {onApplyCouponToCart && (
                            <button
                              type="button"
                              onClick={() => {
                                onApplyCouponToCart(coupon.code);
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors"
                            >
                              Apply
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorefrontOffersHub;
