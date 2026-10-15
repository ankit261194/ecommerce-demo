import React, { useState, useEffect } from 'react';
import {
  MapPin,
  CheckCircle2,
  XCircle,
  Truck,
  Zap,
  CreditCard,
  Banknote,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import api from '../api/client';

export default function PincodeChecker({
  initialPincode = '',
  onPincodeVerified = null,
  compact = false,
  className = '',
}) {
  const [pincode, setPincode] = useState(initialPincode || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // If not passed initially, try restoring from local storage
    if (!initialPincode) {
      try {
        const saved = localStorage.getItem('auramarket_pincode_info');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.pincode) {
            setPincode(parsed.pincode);
            setResult(parsed);
            if (onPincodeVerified) onPincodeVerified(parsed);
          }
        }
      } catch (_) {}
    } else {
      handleCheck(initialPincode);
    }
  }, [initialPincode]);

  const handleCheck = async (pinToCheck) => {
    const targetPin = (pinToCheck || pincode || '').trim();
    if (!targetPin) {
      setError('Please enter a 6-digit pincode');
      return;
    }
    if (!/^\d{6}$/.test(targetPin)) {
      setError('Pincode must be exactly 6 digits');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/pincodes/check/${targetPin}`);
      if (response.data && response.data.success) {
        const data = response.data.data;
        setResult(data);
        setIsEditing(false);
        try {
          localStorage.setItem('auramarket_pincode_info', JSON.stringify(data));
        } catch (_) {}
        if (onPincodeVerified) {
          onPincodeVerified(data);
        }
      } else {
        setError(response.data?.message || 'Could not verify pincode');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to check delivery serviceability';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCheck();
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(val);
    setError('');
    if (val.length === 6) {
      handleCheck(val);
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all ${
        result?.isDeliverable
          ? 'border-emerald-500/30 bg-emerald-950/10'
          : result && !result.isDeliverable
          ? 'border-rose-500/30 bg-rose-950/10'
          : 'border-slate-800 bg-slate-900/60'
      } ${compact ? 'p-3' : 'p-4'} ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Delivery & COD Serviceability
          </span>
        </div>
        {result && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs text-amber-400 hover:text-amber-300 underline font-medium"
          >
            Change
          </button>
        )}
      </div>

      {(!result || isEditing) ? (
        <div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={pincode}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Enter 6-digit Pincode"
                maxLength={6}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors tracking-wide font-mono"
              />
            </div>
            <button
              type="button"
              onClick={() => handleCheck()}
              disabled={loading || pincode.length !== 6}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Checking...
                </>
              ) : (
                'Check'
              )}
            </button>
          </div>
          {error && (
            <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </p>
          )}
          <p className="mt-1.5 text-[11px] text-slate-400">
            Enter your destination pincode to check instant delivery ETA, COD status & shipping fee.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {result.isDeliverable ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-slate-100">
                      Deliverable to {result.city}, {result.state} ({result.pincode})
                    </span>
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      {result.zone} Zone
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery ETA & Shipping */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-slate-300">
                <div className="flex items-center gap-2 bg-slate-950/50 rounded-xl px-2.5 py-2 border border-slate-800/80">
                  <Truck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-emerald-300 text-xs">
                      {result.estimatedDeliveryText || `${result.estimatedDays} Days`}
                    </div>
                    {result.etaFormatted && (
                      <div className="text-[10px] text-slate-400">
                        Est: <span className="text-slate-200">{result.etaFormatted}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* COD Status */}
                <div className="flex items-center gap-2 bg-slate-950/50 rounded-xl px-2.5 py-2 border border-slate-800/80">
                  {result.isCodAvailable ? (
                    <>
                      <Banknote className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-emerald-300 text-xs">
                          Cash on Delivery (COD)
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Available at this pincode
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-amber-300 text-xs">
                          Prepaid Orders Only
                        </div>
                        <div className="text-[10px] text-slate-400">
                          COD not supported in this region
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Shipping Charges & Express Details */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                <span>
                  Shipping:{' '}
                  <strong className="text-slate-200">
                    {result.standardShippingFee === 0
                      ? 'FREE'
                      : `₹${result.standardShippingFee}`}
                  </strong>
                </span>
                {result.expressAvailable && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Zap className="w-3 h-3 fill-amber-400" /> Express Delivery (₹{result.expressShippingFee})
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-start gap-2 text-rose-300 text-xs">
              <XCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-300">
                  Currently Non-Serviceable ({result.pincode})
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {result.remarks ||
                    'We do not deliver to this pincode at this moment. Please check with an alternate address.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
