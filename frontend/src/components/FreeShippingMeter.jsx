import React from 'react';
import { Truck, Sparkles, CheckCircle2 } from 'lucide-react';

export const FreeShippingMeter = ({
  cartTotal = 0,
  threshold = 999,
  defaultFee = 99,
}) => {
  const isUnlocked = cartTotal >= threshold;
  const amountLeft = Math.max(0, threshold - cartTotal);
  const percent = threshold > 0 ? Math.min(100, Math.round((cartTotal / threshold) * 100)) : 100;

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 ${
        isUnlocked
          ? 'bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 border-emerald-300 shadow-sm'
          : 'bg-amber-50/70 border-amber-200/80 shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {isUnlocked ? (
            <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center shadow-sm animate-pulse">
              <Truck className="w-4 h-4 stroke-[2.5]" />
            </div>
          )}

          <div className="leading-tight">
            {isUnlocked ? (
              <p className="text-xs font-black text-emerald-950 flex items-center gap-1">
                <span>Free Express Delivery Unlocked!</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              </p>
            ) : (
              <p className="text-xs font-black text-slate-900">
                Add <span className="text-amber-600 font-extrabold">₹{amountLeft.toLocaleString('en-IN')}</span> more for <span className="text-emerald-700 underline decoration-amber-400 decoration-2">FREE Delivery</span>
              </p>
            )}
            <p className="text-[10px] text-slate-500 font-medium">
              {isUnlocked
                ? 'Standard ₹' + defaultFee + ' shipping fee is waived on this order'
                : 'Free doorstep shipping on orders above ₹' + threshold.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <span
          className={`text-xs font-black px-2 py-0.5 rounded-full ${
            isUnlocked
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-amber-200 text-amber-950'
          }`}
        >
          {percent}%
        </span>
      </div>

      {/* Progress Track */}
      <div className="relative w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden p-0.5 shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isUnlocked
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm'
              : 'bg-gradient-to-r from-amber-500 to-amber-400'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Footer milestone hint */}
      {!isUnlocked && (
        <div className="mt-1.5 flex justify-between items-center text-[10px] text-slate-500 font-bold">
          <span>₹0</span>
          <span className="text-amber-700">₹{threshold.toLocaleString('en-IN')} (Target)</span>
        </div>
      )}
    </div>
  );
};

export default FreeShippingMeter;
