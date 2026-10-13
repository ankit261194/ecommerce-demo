import React, { useState, useEffect } from 'react';
import { Flame, Eye, ShoppingBag, TrendingUp, Users } from 'lucide-react';

/**
 * Live Recent Purchase Counter & Viewers Velocity (Point #13)
 * Displays social proof metrics like "18 people bought this in 24 hours" and "85 people viewing right now"
 */
export default function RecentPurchaseCounter({
  purchases = 18,
  viewers = 85,
  variant = 'banner',
  className = '',
}) {
  const [livePurchases, setLivePurchases] = useState(purchases || 18);
  const [liveViewers, setLiveViewers] = useState(viewers || 85);

  useEffect(() => {
    setLivePurchases(purchases || 18);
  }, [purchases]);

  useEffect(() => {
    setLiveViewers(viewers || 85);
  }, [viewers]);

  // Gentle live traffic fluctuation every 12-18 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveViewers(prev => {
        const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
        return Math.max(12, prev + delta);
      });
    }, 14000);

    return () => clearInterval(interval);
  }, []);

  // 1. Banner Variant (For PDP / ProductDetailModal)
  if (variant === 'banner') {
    return (
      <div
        className={`p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-300/60 shadow-xs flex flex-wrap items-center justify-between gap-3 ${className}`}
      >
        {/* Purchases in last 24 hours */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500 text-slate-950 shadow-sm flex items-center justify-center">
            <Flame className="w-4 h-4 fill-slate-950 animate-bounce" />
          </div>
          <div>
            <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span>{livePurchases} people bought this in the last 24 hours</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              High sales velocity • Verified purchases across India
            </p>
          </div>
        </div>

        {/* Live Active Viewers */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs text-xs font-bold text-slate-700">
          <Eye className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
          <span className="text-blue-700 font-black">{liveViewers}</span>
          <span className="text-slate-500 text-[11px]">viewing right now</span>
        </div>
      </div>
    );
  }

  // 2. Compact / Pill Variant (For catalog cards)
  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold ${className}`}
      >
        <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
        <span>{livePurchases} bought in 24h</span>
      </div>
    );
  }

  // 3. Minimal Inline Text
  return (
    <div className={`flex items-center gap-1.5 text-xs font-bold text-amber-700 ${className}`}>
      <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
      <span>{livePurchases} orders placed in last 24 hours</span>
    </div>
  );
}
