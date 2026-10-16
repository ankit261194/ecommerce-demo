import React, { useState, useEffect } from 'react';
import { Bell, BellRing, BellOff, Check, X, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import {
  isPushSupported,
  getPermissionStatus,
  requestAndSubscribe,
  unsubscribePush,
} from '../utils/pushNotifications';

export default function WebPushOptInBanner({ customerEmail = '', onSubscribed = () => {} }) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isVisible, setIsVisible] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const isSupp = isPushSupported();
    setSupported(isSupp);
    if (!isSupp) return;

    const perm = getPermissionStatus();
    setPermission(perm);

    // If permission is 'default', check if user dismissed banner recently
    if (perm === 'default') {
      const dismissedUntil = localStorage.getItem('auramarket_push_dismissed');
      if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
        // Show banner after 3 seconds of browsing
        const timer = setTimeout(() => setIsVisible(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleEnablePush = async () => {
    setIsSubscribing(true);
    try {
      await requestAndSubscribe(customerEmail);
      setPermission('granted');
      setIsVisible(false);
      setToast('🎉 Web Push Alerts Activated! You will receive instant order & deal updates.');
      setTimeout(() => setToast(null), 4000);
      onSubscribed();
    } catch (err) {
      console.warn('Could not enable push:', err);
      setToast(`Notice: ${err.message || 'Notification permission not granted'}`);
      setTimeout(() => setToast(null), 4000);
      setPermission(getPermissionStatus());
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Dismiss for 7 days
    localStorage.setItem(
      'auramarket_push_dismissed',
      String(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );
  };

  const handleToggleFromBell = async () => {
    if (permission === 'granted') {
      const confirmed = window.confirm('Do you want to disable Web Push notifications from AuraMarket?');
      if (confirmed) {
        await unsubscribePush();
        setPermission('default');
        setToast('Web Push alerts paused.');
        setTimeout(() => setToast(null), 3000);
      }
    } else {
      handleEnablePush();
    }
  };

  if (!supported) return null;

  return (
    <>
      {/* Floating Bell Icon for 1-Click Status & Quick Toggle */}
      <div className="fixed bottom-24 right-5 z-40">
        <button
          type="button"
          onClick={handleToggleFromBell}
          className={`relative p-3 rounded-2xl shadow-xl transition-all duration-300 flex items-center justify-center ${
            permission === 'granted'
              ? 'bg-slate-900 text-emerald-400 hover:bg-slate-800 ring-2 ring-emerald-400/40'
              : 'bg-amber-500 text-slate-950 hover:bg-amber-400 ring-2 ring-amber-400/50 hover:scale-105'
          }`}
          title={
            permission === 'granted'
              ? 'Web Push Alerts Active (Tap to manage)'
              : 'Turn on Instant Order & Deal Alerts'
          }
        >
          {permission === 'granted' ? (
            <BellRing className="w-5 h-5 animate-pulse" />
          ) : (
            <Bell className="w-5 h-5" />
          )}

          {permission === 'granted' && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white ring-1 ring-emerald-300" />
          )}
        </button>
      </div>

      {/* Slide-Up Opt-In Prompt Card */}
      {isVisible && permission === 'default' && (
        <div className="fixed bottom-5 left-5 right-5 sm:left-auto sm:right-6 sm:w-96 z-50 bg-white/95 backdrop-blur-md border border-amber-200/90 rounded-3xl p-4 shadow-2xl shadow-amber-900/10 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-md">
              <BellRing className="w-5 h-5" />
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-700 flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-amber-500" /> Native Push Alerts
                </span>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h4 className="text-sm font-black text-slate-900">
                Never Miss a Flash Deal or Order Update
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Get real-time live dispatch tracking and exclusive 1-hour festive discounts directly on your device.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubscribing}
                  onClick={handleEnablePush}
                  className="flex-1 py-2 px-3 bg-slate-950 hover:bg-slate-800 text-amber-400 text-xs font-black rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubscribing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <BellRing className="w-3.5 h-3.5" />
                      <span>Enable Alerts</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Toast */}
      {toast && (
        <div className="fixed top-20 right-5 z-50 bg-slate-950 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </>
  );
}
