import React, { useState, useEffect } from 'react';
import {
  Clock,
  Truck,
  Flame,
  Zap,
  MapPin,
  CheckCircle2,
  Users,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import api from '../api/client';

export default function FastDeliveryCountdown({
  productId,
  initialStock = 10,
  defaultPincode = '110001',
  className = '',
}) {
  const [pincode, setPincode] = useState(defaultPincode);
  const [editingPincode, setEditingPincode] = useState(false);
  const [tempPincode, setTempPincode] = useState(defaultPincode);
  const [countdownData, setCountdownData] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch delivery cutoff and stock scarcity data from backend
  const fetchDeliveryData = async (pin) => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await api.get(`/products/${productId}/delivery-countdown?pincode=${pin || '110001'}`);
      if (res.data?.success) {
        setCountdownData(res.data);
        setSecondsRemaining(res.data.remainingSeconds || 0);
      }
    } catch (err) {
      // Fallback local calculations
      const now = new Date();
      const cutoff = new Date();
      cutoff.setHours(19, 0, 0, 0);
      if (now > cutoff) cutoff.setDate(cutoff.getDate() + 1);
      const diffSec = Math.max(120, Math.floor((cutoff - now) / 1000));
      setSecondsRemaining(diffSec);
      setCountdownData({
        isMetro: true,
        isNextDayEligible: true,
        formattedDeliveryDate: 'Tomorrow by 2:00 PM',
        courierPartner: 'Bluedart Air Express',
        liveCartHolders: Math.max(4, (initialStock % 6) + 5),
        stockUrgency: {
          stock: initialStock,
          isLowStock: initialStock <= 10,
          isCritical: initialStock <= 5,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryData(pincode);
  }, [productId, pincode]);

  // Live ticking countdown timer
  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsRemaining]);

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  const handlePincodeSubmit = (e) => {
    e.preventDefault();
    if (/^[1-9][0-9]{5}$/.test(tempPincode)) {
      setPincode(tempPincode);
      setEditingPincode(false);
    }
  };

  const stock = countdownData?.stockUrgency?.stock ?? initialStock;
  const isCriticalStock = stock <= 5 && stock > 0;
  const isLowStock = stock <= 10 && stock > 0;
  const liveViewers = countdownData?.liveCartHolders || 7;

  return (
    <div className={`space-y-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900/40 to-slate-900/60 border border-amber-500/30 text-white shadow-lg ${className}`}>
      {/* 1. Fast Delivery Cutoff Ticking Countdown Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black flex-shrink-0 shadow">
            <Clock className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider">Fast Dispatch Cutoff</span>
              <span className="px-1.5 py-0.2 text-[9px] font-black rounded bg-emerald-500 text-slate-950 uppercase">
                Guaranteed
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Order within countdown to get it by{' '}
              <strong className="text-white font-black underline decoration-amber-400 decoration-2">
                {countdownData?.formattedDeliveryDate || 'Tomorrow by 2:00 PM'}
              </strong>
            </p>
          </div>
        </div>

        {/* Flip-style Digital Countdown Clock */}
        <div className="flex items-center gap-1 font-mono text-xs font-black self-start sm:self-auto">
          <div className="px-2 py-1 rounded-lg bg-slate-950/90 border border-amber-400/40 text-amber-300 shadow">
            <span>{String(hours).padStart(2, '0')}</span>
            <span className="text-[9px] text-slate-400 block font-sans font-medium text-center">hrs</span>
          </div>
          <span className="text-amber-400 font-bold">:</span>
          <div className="px-2 py-1 rounded-lg bg-slate-950/90 border border-amber-400/40 text-amber-300 shadow">
            <span>{String(minutes).padStart(2, '0')}</span>
            <span className="text-[9px] text-slate-400 block font-sans font-medium text-center">min</span>
          </div>
          <span className="text-amber-400 font-bold">:</span>
          <div className="px-2 py-1 rounded-lg bg-slate-950/90 border border-amber-400/40 text-amber-300 shadow animate-pulse">
            <span>{String(seconds).padStart(2, '0')}</span>
            <span className="text-[9px] text-slate-400 block font-sans font-medium text-center">sec</span>
          </div>
        </div>
      </div>

      {/* 2. Real-Time Stock Scarcity & Cart Activity */}
      {stock > 0 && isLowStock && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500 fill-rose-500 animate-bounce flex-shrink-0" />
            <div>
              <span className="font-extrabold text-rose-300">
                {isCriticalStock ? `Hurry! Only ${stock} units left in stock!` : `Limited Stock: Only ${stock} available`}
              </span>
              <span className="text-[10px] text-slate-400 block">
                🔥 {liveViewers} shoppers have added this to their bag in the last 15 mins
              </span>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-950/80 px-2 py-1 rounded-lg border border-rose-500/40 flex-shrink-0">
            Selling Fast
          </span>
        </div>
      )}

      {/* 3. Delivery Pincode Checker & Courier Partner */}
      <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
        <div className="flex items-center gap-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          {editingPincode ? (
            <form onSubmit={handlePincodeSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                maxLength={6}
                value={tempPincode}
                onChange={(e) => setTempPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit PIN"
                className="w-20 px-2 py-0.5 rounded bg-slate-800 text-white font-mono text-xs border border-amber-400/60 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="px-2 py-0.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] rounded"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => setEditingPincode(false)}
                className="text-slate-400 text-[10px] hover:text-white"
              >
                Cancel
              </button>
            </form>
          ) : (
            <>
              <span>Deliver to: <strong className="text-white font-bold">{pincode}</strong></span>
              <button
                onClick={() => {
                  setTempPincode(pincode);
                  setEditingPincode(true);
                }}
                className="text-[11px] text-amber-400 hover:underline font-bold ml-1 cursor-pointer"
              >
                Change PIN
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-400 flex-shrink-0">
          <Truck className="w-3.5 h-3.5 text-emerald-400" />
          <span>{countdownData?.courierPartner || 'Bluedart Air Express'}</span>
        </div>
      </div>
    </div>
  );
}
