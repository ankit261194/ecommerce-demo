import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Smartphone,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Key,
  Lock,
  User,
  Store,
  Truck,
  Crown,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function FrictionlessAuthModal({
  isOpen,
  onClose,
  initialTab = 'OTP', // 'OTP' | 'GOOGLE' | 'PASSWORD'
  onSuccess = null,
}) {
  const { login: setAuthSession } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab || 'OTP');

  // Phone OTP State
  const [phone, setPhone] = useState('9876543210');
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [demoCode, setDemoCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [fullName, setFullName] = useState('');
  const otpInputsRef = useRef([]);

  // Traditional Password State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // General State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  if (!isOpen) return null;

  // Handle OTP digit changes
  const handleOtpChange = (index, value) => {
    const val = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = val;
    setOtpDigits(newDigits);
    setError('');

    // Auto-advance
    if (val && index < 5 && otpInputsRef.current[index + 1]) {
      otpInputsRef.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    if (pasted.length === 6) {
      handleVerifyOtp(pasted);
    }
  };

  // Request SMS OTP
  const handleRequestOtp = async () => {
    const clean = phone.replace(/\D/g, '').slice(0, 10);
    if (!/^[6-9]\d{9}$/.test(clean)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/otp/request', { phone: clean });
      if (res.data?.success) {
        setOtpSent(true);
        setDemoCode(res.data.demoOtp || '123456');
        setCountdown(30);
        setSuccessMsg(res.data.message || `Code sent to +91 ${clean}`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setTimeout(() => {
          if (otpInputsRef.current[0]) otpInputsRef.current[0].focus();
        }, 100);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (codeOverride) => {
    const fullCode = codeOverride || otpDigits.join('');
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits of your verification code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/otp/verify', {
        phone: phone.replace(/\D/g, '').slice(0, 10),
        otp: fullCode,
        name: fullName.trim() || undefined,
      });

      if (res.data?.success && res.data.token) {
        completeLogin(res.data.token, res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  // Google 1-Tap Login
  const handleGoogleLogin = async (customPayload = null) => {
    setLoading(true);
    setError('');
    try {
      const payload = customPayload || {
        email: 'aman.sharma@example.com',
        name: 'Aman Sharma',
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        sub: 'google_oauth_sub_2026_test',
      };

      const res = await api.post('/auth/google/one-tap', payload);
      if (res.data?.success && res.data.token) {
        completeLogin(res.data.token, res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  // Traditional Email/Password Login
  const handlePasswordLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data?.success && res.data.token) {
        completeLogin(res.data.token, res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Finalize Session
  const completeLogin = (token, user) => {
    try {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (_) {}

    if (setAuthSession) {
      setAuthSession(token, user);
    }

    setSuccessMsg('Signed in successfully! Redirecting...');
    setTimeout(() => {
      if (onSuccess) onSuccess(user);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
              ⚡
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <span>Frictionless Sign In</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Password-Free
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Instant access to orders, wishlist & wallet</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-5 relative z-10">
          <button
            type="button"
            onClick={() => {
              setActiveTab('OTP');
              setError('');
            }}
            className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'OTP'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile OTP</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('GOOGLE');
              setError('');
            }}
            className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'GOOGLE'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Google 1-Tap</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('PASSWORD');
              setError('');
            }}
            className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'PASSWORD'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Demo Keys</span>
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: Mobile SMS OTP */}
        {activeTab === 'OTP' && (
          <div className="space-y-4">
            {!otpSent ? (
              <>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Enter Mobile Number
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-300 font-mono font-bold flex items-center gap-1">
                      🇮🇳 +91
                    </span>
                    <input
                      type="text"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono outline-none tracking-wider"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    We will send a 6-digit one-time password via SMS to verify.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Full Name (Optional for first-time signups)
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rohan Sharma"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={loading || phone.length !== 10}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending SMS...</span>
                    </>
                  ) : (
                    <>
                      <span>Get Login OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs text-slate-300 pb-1">
                  <span>Code sent to <strong className="text-amber-400">+91 {phone}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpDigits(['', '', '', '', '', '']);
                    }}
                    className="text-amber-400 hover:underline text-[11px]"
                  >
                    Edit Phone
                  </button>
                </div>

                {/* 6-Digit Individual Inputs */}
                <div className="flex items-center justify-between gap-1.5 py-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputsRef.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-12 h-12 text-center text-lg font-mono font-bold bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-amber-400 outline-none transition"
                    />
                  ))}
                </div>

                {/* Demo autofill hint */}
                {demoCode && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-[11px] text-amber-300">
                    <span>Demo Verification Code: <strong className="font-mono text-white text-xs">{demoCode}</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        const arr = demoCode.split('');
                        setOtpDigits(arr);
                        handleVerifyOtp(demoCode);
                      }}
                      className="px-2 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-[10px]"
                    >
                      Auto-Fill
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  {countdown > 0 ? (
                    <span>Resend OTP in <strong className="text-slate-200">{countdown}s</strong></span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      className="text-amber-400 hover:underline font-bold"
                    >
                      Resend Code
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleVerifyOtp()}
                  disabled={loading || otpDigits.join('').length !== 6}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify & Access Account</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {/* TAB 2: Google 1-Tap */}
        {activeTab === 'GOOGLE' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-white mx-auto flex items-center justify-center shadow-md">
                {/* Official Google G Logo */}
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-100">Sign in with Google</h4>
                <p className="text-[11px] text-slate-400">Zero passwords. 1-Tap secure token generation.</p>
              </div>

              {/* Simulated Google One-Tap account card */}
              <div
                onClick={() => handleGoogleLogin()}
                className="p-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-400 cursor-pointer transition flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80"
                    alt="Aman Sharma"
                    className="w-8 h-8 rounded-full border border-slate-600 object-cover"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-100 group-hover:text-amber-400 transition">
                      Aman Sharma
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">aman.sharma@gmail.com</div>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-1 rounded bg-blue-500/20 text-blue-300 font-bold">
                  Continue
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleGoogleLogin()}
                disabled={loading}
                className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-slate-900" /> : null}
                <span>Continue with Google Account</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Demo Keys & Personas */}
        {activeTab === 'PASSWORD' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@auramarket.com');
                  setPassword('admin123456');
                }}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-400 text-left transition"
              >
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs mb-0.5">
                  <Crown className="w-3.5 h-3.5" />
                  <span>Super Admin</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">admin@auramarket.com</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('apex@auramarket.com');
                  setPassword('vendor123456');
                }}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-400 text-left transition"
              >
                <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs mb-0.5">
                  <Store className="w-3.5 h-3.5" />
                  <span>Merchant</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">apex@auramarket.com</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('rider@auramarket.com');
                  setPassword('rider123456');
                }}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-400 text-left transition"
              >
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs mb-0.5">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Express Rider</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">rider@auramarket.com</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('customer@auramarket.com');
                  setPassword('customer123456');
                }}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-400 text-left transition"
              >
                <div className="flex items-center gap-1.5 text-purple-400 font-bold text-xs mb-0.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Customer</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">customer@auramarket.com</div>
              </button>
            </div>

            <form onSubmit={handlePasswordLogin} className="space-y-3 pt-2 border-t border-slate-800">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@auramarket.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : null}
                <span>Sign In with Credentials</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
