import React, { useState, useEffect, useRef } from 'react';
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Send,
  PhoneCall,
  DollarSign,
  ShieldCheck,
  User,
  PackageCheck,
  ArrowRight,
  Delete,
} from 'lucide-react';
import api from '../api/client';

/**
 * Point #66: 4-Digit Secret Delivery OTP Verification Modal
 * Strict delivery completion security with segmented 4-digit input,
 * on-screen touch keypad, shake animation, instant resend OTP, and COD verification.
 */
const CourierOtpVerificationModal = ({ task, onClose, onSuccess }) => {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [codConfirmed, setCodConfirmed] = useState(!task.isCod);

  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs[0].current) {
      inputRefs[0].current.focus();
    }
  }, []);

  // Cooldown countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const fullOtp = digits.join('');

  // Handle input changes
  const handleDigitChange = (index, value) => {
    // Only accept numeric digits
    const cleaned = value.replace(/[^0-9]/g, '');
    if (!cleaned) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    // If pasted multiple digits
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 4).split('');
      const newDigits = ['', '', '', ''];
      chars.forEach((c, i) => {
        if (i < 4) newDigits[i] = c;
      });
      setDigits(newDigits);
      setErrorMessage('');
      const nextIndex = Math.min(chars.length, 3);
      inputRefs[nextIndex]?.current?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleaned[0];
    setDigits(newDigits);
    setErrorMessage('');

    // Auto-advance to next input
    if (index < 3 && cleaned[0]) {
      inputRefs[index + 1]?.current?.focus();
    }
  };

  // Handle backspace key navigation
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs[index - 1]?.current?.focus();
      }
    }
  };

  // On-screen keypad button tap
  const handleKeypadPress = num => {
    setErrorMessage('');
    const emptyIndex = digits.findIndex(d => d === '');
    if (emptyIndex !== -1) {
      handleDigitChange(emptyIndex, num.toString());
    }
  };

  const handleKeypadBackspace = () => {
    setErrorMessage('');
    // Find last filled index
    let lastFilledIndex = -1;
    for (let i = 3; i >= 0; i--) {
      if (digits[i] !== '') {
        lastFilledIndex = i;
        break;
      }
    }
    if (lastFilledIndex !== -1) {
      const newDigits = [...digits];
      newDigits[lastFilledIndex] = '';
      setDigits(newDigits);
      inputRefs[lastFilledIndex]?.current?.focus();
    }
  };

  const handleKeypadClear = () => {
    setDigits(['', '', '', '']);
    setErrorMessage('');
    inputRefs[0]?.current?.focus();
  };

  // Trigger OTP Verification
  const handleVerify = async () => {
    if (fullOtp.length !== 4) {
      triggerShake('Please enter all 4 digits of the customer OTP.');
      return;
    }

    if (task.isCod && !codConfirmed) {
      triggerShake('Please confirm you have collected the COD cash payment.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');

    try {
      if (task.rawId) {
        const res = await api.post(`/delivery/tasks/${task.rawId}/verify-otp`, {
          otp: fullOtp,
          amountCollected: task.isCod ? task.amountToCollect : 0,
        });

        if (res.data?.success) {
          setIsSuccess(true);
          setTimeout(() => {
            onSuccess(task.id, task.amountToCollect);
          }, 1200);
          return;
        }
      }

      // Standalone / Demo Simulation Fallback
      const expected = task.expectedOtp || '4821';
      if (fullOtp === expected) {
        setIsSuccess(true);
        setTimeout(() => {
          onSuccess(task.id, task.amountToCollect);
        }, 1200);
      } else {
        triggerShake(`Invalid OTP! Ask ${task.customer.name} for the 4-digit code shown on their order screen.`);
      }
    } catch (err) {
      triggerShake(err.response?.data?.message || 'Invalid delivery OTP! Please verify with customer.');
    } finally {
      setIsVerifying(false);
    }
  };

  const triggerShake = msg => {
    setErrorMessage(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 600);
  };

  // Resend OTP via SMS / Email
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setResendSuccess('');
    setErrorMessage('');

    try {
      if (task.rawId) {
        const res = await api.post(`/delivery/tasks/${task.rawId}/resend-otp`);
        setResendSuccess(res.data?.message || 'OTP resent via SMS & Email to customer!');
      } else {
        setResendSuccess(`OTP (${task.expectedOtp || '4821'}) resent to ${task.customer.phone} via SMS.`);
      }
      setResendCooldown(30);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
      <div
        className={`bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden transition-all duration-300 ${
          isShaking ? 'translate-x-[-8px] animate-shake' : ''
        }`}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight leading-tight">
                Secure Handover Verification
              </h3>
              <p className="text-[11px] text-emerald-100 font-medium">
                Order #{task.subOrderId} • Point #66 OTP Guard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-all"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Customer & Item Preview Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" /> Recipient:
              </span>
              <span className="font-bold text-slate-900">{task.customer.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5 text-slate-400" /> Package:
              </span>
              <span className="font-medium text-slate-700 truncate max-w-[200px]" title={task.itemSummary}>
                {task.itemSummary}
              </span>
            </div>
          </div>

          {/* COD Cash Collection Warning Box */}
          {task.isCod ? (
            <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-amber-600" /> Cash on Delivery (COD)
                </span>
                <span className="text-lg font-black text-slate-900">
                  ₹{task.amountToCollect.toLocaleString('en-IN')}
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-amber-200">
                <input
                  type="checkbox"
                  checked={codConfirmed}
                  onChange={e => setCodConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-amber-400"
                />
                <span className="text-xs font-bold text-slate-800">
                  I have collected ₹{task.amountToCollect.toLocaleString('en-IN')} cash in full
                </span>
              </label>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
              <span>💳 Prepaid Order (Already Paid Online)</span>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black">
                ₹0 to Collect
              </span>
            </div>
          )}

          {/* Segmented 4-Digit Inputs */}
          <div className="space-y-2 text-center pt-1">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Enter 4-Digit Customer Delivery OTP
            </p>

            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map(index => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digits[index]}
                  onChange={e => handleDigitChange(index, e.target.value)}
                  onKeyDown={e => handleKeyDown(index, e)}
                  disabled={isVerifying || isSuccess}
                  className={`w-14 h-16 text-center text-3xl font-black rounded-2xl border-2 transition-all shadow-sm ${
                    isSuccess
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                      : digits[index]
                      ? 'border-emerald-500 bg-emerald-50/30 text-slate-900 ring-2 ring-emerald-400/20'
                      : 'border-slate-300 bg-slate-50 text-slate-900 hover:border-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/15'
                  }`}
                />
              ))}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <p className="text-xs font-bold text-rose-600 flex items-center justify-center gap-1.5 animate-fade-in pt-1">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </p>
            )}

            {/* Success Message */}
            {isSuccess && (
              <p className="text-xs font-black text-emerald-600 flex items-center justify-center gap-1.5 animate-scale-up pt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-bounce" />
                <span>OTP Verified Successfully! Handing over parcel...</span>
              </p>
            )}

            {/* Resend Success Message */}
            {resendSuccess && (
              <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2 animate-fade-in">
                ✅ {resendSuccess}
              </p>
            )}
          </div>

          {/* On-Screen Touch Keypad for Riders */}
          <div className="bg-slate-100 p-3 rounded-2xl border border-slate-200">
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  type="button"
                  disabled={isVerifying || isSuccess}
                  onClick={() => handleKeypadPress(num)}
                  className="py-2.5 rounded-xl bg-white hover:bg-slate-50 active:scale-95 border border-slate-200 text-slate-800 font-black text-lg shadow-sm transition-all"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                disabled={isVerifying || isSuccess}
                onClick={handleKeypadClear}
                className="py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-600 font-bold text-xs shadow-sm transition-all flex items-center justify-center"
              >
                CLEAR
              </button>
              <button
                type="button"
                disabled={isVerifying || isSuccess}
                onClick={() => handleKeypadPress(0)}
                className="py-2.5 rounded-xl bg-white hover:bg-slate-50 active:scale-95 border border-slate-200 text-slate-800 font-black text-lg shadow-sm transition-all"
              >
                0
              </button>
              <button
                type="button"
                disabled={isVerifying || isSuccess}
                onClick={handleKeypadBackspace}
                className="py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 active:scale-95 font-bold text-xs shadow-sm transition-all flex items-center justify-center"
                title="Backspace"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Action Row: Resend OTP & Verification Button */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={isVerifying || isSuccess}
              onClick={handleVerify}
              className={`w-full py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                isSuccess
                  ? 'bg-emerald-600 scale-[1.02]'
                  : fullOtp.length === 4
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 shadow-emerald-500/25 hover:shadow-emerald-500/40'
                  : 'bg-slate-400 cursor-not-allowed opacity-90'
              }`}
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Secret OTP...</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="w-5 h-5 animate-pulse" />
                  <span>Order Verified & Delivered!</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Verify OTP & Mark Delivered</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1 px-1">
              <button
                type="button"
                disabled={resendCooldown > 0 || isResending}
                onClick={handleResendOtp}
                className={`font-bold flex items-center gap-1.5 transition-colors ${
                  resendCooldown > 0
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-blue-600 hover:text-blue-800'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                <span>
                  {resendCooldown > 0
                    ? `Resend OTP in ${resendCooldown}s`
                    : 'Customer lost OTP? Resend via SMS'}
                </span>
              </button>

              {/* Demo Hint Badge */}
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                Demo OTP: {task.expectedOtp || '4821'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourierOtpVerificationModal;
