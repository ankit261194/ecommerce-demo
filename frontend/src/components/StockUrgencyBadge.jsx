import React from 'react';
import { Flame, Zap, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

/**
 * Reusable Stock Urgency Badge Component (Point #12)
 * Supports multiple visual presentations: 'badge', 'compact', 'detailed', 'banner'
 */
export default function StockUrgencyBadge({
  stock = 0,
  criticalThreshold = 5,
  lowThreshold = 15,
  variant = 'compact',
  className = '',
  showPulse = true,
}) {
  const numStock = Number(stock) || 0;

  // Determine stock urgency state
  let status = 'IN_STOCK';
  if (numStock <= 0) {
    status = 'OUT_OF_STOCK';
  } else if (numStock <= criticalThreshold) {
    status = 'CRITICAL';
  } else if (numStock <= lowThreshold) {
    status = 'LOW';
  }

  // 1. Compact Variant (For product catalog cards and list rows)
  if (variant === 'compact') {
    if (status === 'OUT_OF_STOCK') {
      return (
        <div
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold ${className}`}
        >
          <XCircle className="w-3 h-3 text-rose-600" />
          <span>Out of Stock</span>
        </div>
      );
    }

    if (status === 'CRITICAL') {
      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-300 text-rose-700 text-[10px] font-extrabold shadow-2xs ${className}`}
        >
          {showPulse && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
            </span>
          )}
          <Flame className="w-3 h-3 text-rose-600 fill-rose-600 animate-bounce" />
          <span>Only {numStock} left in stock!</span>
        </div>
      );
    }

    if (status === 'LOW') {
      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-300 text-amber-800 text-[10px] font-bold ${className}`}
        >
          <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
          <span>Low Stock: {numStock} left</span>
        </div>
      );
    }

    // In Stock Healthy
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold ${className}`}
      >
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        <span>In Stock</span>
      </div>
    );
  }

  // 2. Detailed / PDP View Variant (For ProductDetailModal and PDP pages)
  if (variant === 'detailed') {
    if (status === 'OUT_OF_STOCK') {
      return (
        <div
          className={`p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-700 font-bold ${className}`}
        >
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <div>
              <p className="font-extrabold">Currently Out of Stock</p>
              <p className="text-[11px] text-rose-600/80 font-normal">
                Restocking soon. Join waitlist or select an alternative variant.
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-rose-200/60 text-rose-800 text-[10px] font-black uppercase">
            0 Available
          </span>
        </div>
      );
    }

    if (status === 'CRITICAL') {
      return (
        <div
          className={`p-3 rounded-2xl bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border-2 border-rose-300/80 shadow-sm space-y-2 ${className}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
              </span>
              <span className="text-xs font-black text-rose-700 flex items-center gap-1">
                <Flame className="w-4 h-4 text-rose-600 fill-rose-600" />
                Hurry! Only {numStock} left in stock — order soon
              </span>
            </div>
            <span className="text-[11px] font-black text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
              High Demand 🔥
            </span>
          </div>

          {/* Micro Progress Urgency Meter */}
          <div className="w-full h-1.5 rounded-full bg-rose-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-600 to-amber-500 rounded-full transition-all duration-500 animate-pulse"
              style={{ width: `${Math.max(10, Math.min(100, (numStock / criticalThreshold) * 100))}%` }}
            />
          </div>
        </div>
      );
    }

    if (status === 'LOW') {
      return (
        <div
          className={`p-3 rounded-2xl bg-amber-50/90 border border-amber-300 text-xs text-amber-900 font-bold flex items-center justify-between ${className}`}
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600 fill-amber-500 flex-shrink-0" />
            <div>
              <p className="font-extrabold text-amber-950">Limited Stock: Only {numStock} units remaining</p>
              <p className="text-[11px] text-amber-700/90 font-medium">
                Selling fast in your area. Grab before inventory runs out.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md uppercase">
            Fast Selling
          </span>
        </div>
      );
    }

    // In Stock Healthy
    return (
      <div
        className={`p-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-bold ${className}`}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>In Stock — Ready to ship from local fulfillment hub</span>
        </div>
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
          {numStock}+ units
        </span>
      </div>
    );
  }

  // 3. Floating Overlay Badge (Top corner of product cards)
  if (variant === 'badge') {
    if (status === 'OUT_OF_STOCK') {
      return (
        <span className="px-2 py-0.5 rounded-lg bg-slate-900/90 text-rose-300 text-[10px] font-black backdrop-blur uppercase tracking-wider shadow">
          Sold Out
        </span>
      );
    }
    if (status === 'CRITICAL') {
      return (
        <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-black backdrop-blur uppercase tracking-wider shadow flex items-center gap-1 animate-pulse">
          <Flame className="w-3 h-3 fill-white" />
          Only {numStock} Left
        </span>
      );
    }
    if (status === 'LOW') {
      return (
        <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-black backdrop-blur uppercase tracking-wider shadow flex items-center gap-1">
          <Zap className="w-3 h-3 fill-slate-950" />
          Low Stock
        </span>
      );
    }
    return null;
  }

  return null;
}
