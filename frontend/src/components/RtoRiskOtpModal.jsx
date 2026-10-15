import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  X,
  Phone,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
  Lock,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import axios from 'axios';

export default function RtoRiskOtpModal({
  isOpen,
  onClose,
  order,
  onVerified,
}) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  if (!isOpen || !order) return null;

  const orderId = order._id || order.id || order.orderNumber;
  const phone = order.shippingAddress?.phone || '9876543210';
  const riskScore = order.rtoRiskScore || 75;
  const riskReasons = order.rtoRiskReasons || ['High COD order value requiring security verification'];

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setError('Please enter the 6-digit security verification code');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `/api/orders/${orderId}/verify-rto-risk`,
        { otp: otp.trim() },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.success) {
        setSuccess(true);
        setTimeout(() => {
          if (onVerified) onVerified(res.data.data || order);
          onClose();
        }, 1500);
      } else {
        setError(res.data?.message || 'Verification failed. Please check the code.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `/api/orders/${orderId}/resend-rto-otp`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.data?.success) {
        setResendCooldown(30);
      } else {
        setError(res.data?.message || 'Failed to resend code');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend verification code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100 relative">
        {/* Header Banner */}
        <div className="p-6 bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-white">COD Security Verification</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30">
              Risk Score: {riskScore}/100
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Order <span className="font-mono text-slate-200">#{order.orderNumber || orderId}</span> requires 1-time verification to prevent fake COD orders.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {success ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-base text-white">Order Verified & Confirmed!</h4>
              <p className="text-xs text-slate-400">
                Merchant has been notified to proceed with packaging and dispatch.
              </p>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              {/* Risk Reasons Checklist */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 text-xs space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  RTO Guard Evaluation:
                </span>
                {riskReasons.map((reason, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-amber-300 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>

              {/* OTP Input Field */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Enter 6-Digit Verification Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl py-3 px-4 font-mono text-center tracking-[0.4em] text-xl font-bold text-white focus:outline-none focus:border-amber-500 transition-colors"
                    autoFocus
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
                <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-500" />
                    Sent to {phone.slice(0, 3)}****{phone.slice(-3)}
                  </span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || resending}
                    className="text-amber-400 hover:text-amber-300 font-bold transition-colors disabled:opacity-50"
                  >
                    {resending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length < 4}
                  className="flex-2 py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify & Confirm Order</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
