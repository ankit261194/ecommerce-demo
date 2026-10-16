import React, { useState } from 'react';
import { Heart, Bike, Sparkles, Check, DollarSign } from 'lucide-react';

const TIP_OPTIONS = [
  { amount: 0, label: 'No Tip', icon: null },
  { amount: 20, label: '₹20', subLabel: '😊 Kind', popular: false },
  { amount: 30, label: '₹30', subLabel: '👍 Popular', popular: true },
  { amount: 50, label: '₹50', subLabel: '🌟 Generous', popular: false },
  { amount: 100, label: '₹100', subLabel: '💖 Hero', popular: false },
];

export default function RiderTipPicker({ selectedTip = 0, onTipChange }) {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const handleSelectTip = (amt) => {
    setIsCustom(false);
    setCustomValue('');
    if (onTipChange) {
      onTipChange(amt);
    }
  };

  const handleCustomApply = (e) => {
    e.preventDefault();
    const parsed = Math.max(0, Math.floor(Number(customValue) || 0));
    if (onTipChange) {
      onTipChange(parsed);
    }
  };

  const isPresetSelected = (amt) => !isCustom && selectedTip === amt;

  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-50/70 via-amber-50/40 to-slate-50 border border-rose-200/80 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-xs">
            <Bike className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black text-slate-900 tracking-tight">Tip your delivery partner</h4>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider">
                <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500" /> 100% to rider
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Say thanks for timely and careful doorstep delivery
            </p>
          </div>
        </div>
        {selectedTip > 0 && (
          <span className="text-xs font-black text-rose-600 bg-rose-100/80 px-2 py-0.5 rounded-lg border border-rose-200">
            +₹{selectedTip}
          </span>
        )}
      </div>

      {/* Preset Chips */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {TIP_OPTIONS.map((opt) => {
          const selected = isPresetSelected(opt.amount);
          return (
            <button
              key={opt.amount}
              type="button"
              onClick={() => handleSelectTip(opt.amount)}
              className={`relative px-2 py-2 rounded-xl text-center border transition-all flex flex-col items-center justify-center ${
                selected
                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-200 ring-2 ring-rose-300'
                  : 'bg-white hover:bg-rose-50/50 text-slate-700 border-slate-200 hover:border-rose-200'
              }`}
            >
              {opt.popular && !selected && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 text-[8px] font-black uppercase px-1 rounded-full shadow-xs">
                  Popular
                </span>
              )}
              <span className={`text-xs font-black ${selected ? 'text-white' : 'text-slate-900'}`}>
                {opt.label}
              </span>
              {opt.subLabel && (
                <span className={`text-[9px] font-semibold mt-0.5 ${selected ? 'text-rose-100' : 'text-slate-400'}`}>
                  {opt.subLabel}
                </span>
              )}
            </button>
          );
        })}

        {/* Custom Button */}
        <button
          type="button"
          onClick={() => setIsCustom(true)}
          className={`px-2 py-2 rounded-xl text-center border transition-all flex flex-col items-center justify-center ${
            isCustom
              ? 'bg-rose-500 text-white border-rose-500 shadow-sm ring-2 ring-rose-300'
              : 'bg-white hover:bg-rose-50/50 text-slate-700 border-slate-200 hover:border-rose-200'
          }`}
        >
          <span className={`text-xs font-black ${isCustom ? 'text-white' : 'text-slate-900'}`}>
            Custom
          </span>
          <span className={`text-[9px] font-semibold mt-0.5 ${isCustom ? 'text-rose-100' : 'text-slate-400'}`}>
            ✏️ Any
          </span>
        </button>
      </div>

      {/* Custom Amount Input Drawer */}
      {isCustom && (
        <form onSubmit={handleCustomApply} className="flex items-center gap-2 pt-1 animate-in fade-in duration-150">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
            <input
              type="number"
              min="0"
              max="5000"
              placeholder="Enter tip (e.g. 75)"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              autoFocus
              className="w-full pl-7 pr-3 py-1.5 rounded-xl bg-white border border-rose-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs shadow-xs transition-colors"
          >
            Apply Tip
          </button>
        </form>
      )}

      {/* Acknowledgement banner */}
      {selectedTip > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50/80 px-2.5 py-1.5 rounded-xl border border-emerald-200">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span>
            Thank you! <strong>₹{selectedTip}</strong> will be passed directly to your delivery partner upon completion.
          </span>
        </div>
      )}
    </div>
  );
}
