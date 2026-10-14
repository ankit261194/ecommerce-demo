import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Copy, Check, X, Clock, Flame, Tag } from 'lucide-react';
import api from '../api/client';

export default function TopAnnouncementBar({ uiConfig }) {
  const [config, setConfig] = useState(null);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('auramarket_announcement_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [isCopied, setIsCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  // Initial config from prop or API
  useEffect(() => {
    if (uiConfig?.announcement) {
      setConfig(uiConfig.announcement);
    } else {
      api.get('/ui/announcement')
        .then((res) => {
          if (res.data?.success && res.data.data) {
            setConfig(res.data.data);
          }
        })
        .catch(() => {
          setConfig({
            enabled: uiConfig?.showAnnouncement ?? true,
            text: uiConfig?.announcementText || '🔥 Festive Sale Live! Get up to 40% OFF with code FESTIVE2026',
            bgColor: '#F59E0B',
            textColor: '#0B0F17',
            couponCode: 'FESTIVE2026',
            actionLink: '/products',
            buttonText: 'Shop Now',
            isDismissible: true,
            countdownEnd: null,
          });
        });
    }
  }, [uiConfig]);

  // Countdown timer calculations
  useEffect(() => {
    if (!config?.countdownEnd) return;

    const targetDate = new Date(config.countdownEnd).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = targetDate - now;

      if (diff <= 0) {
        setTimeLeft('00:00:00');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [config?.countdownEnd]);

  if (isDismissed || !config || config.enabled === false) {
    return null;
  }

  const handleCopyCode = (e) => {
    e.stopPropagation();
    if (!config.couponCode) return;
    navigator.clipboard.writeText(config.couponCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('auramarket_announcement_dismissed', 'true');
    } catch (_) {}
  };

  return (
    <div
      style={{
        backgroundColor: config.bgColor || '#F59E0B',
        color: config.textColor || '#0B0F17',
      }}
      className="relative z-40 px-3 sm:px-6 py-2.5 sm:py-2 text-xs font-semibold shadow-sm transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
        {/* Main Ticker Message with Icon */}
        <div className="flex items-center gap-2 text-center sm:text-left flex-wrap justify-center sm:justify-start">
          <span className="p-1 rounded-full bg-black/10 flex items-center justify-center">
            <Flame className="w-3.5 h-3.5 fill-current" />
          </span>
          <span className="leading-tight font-bold">{config.text}</span>

          {/* Optional Live Countdown Timer */}
          {timeLeft && (
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/15 text-[11px] font-mono font-bold tracking-wider">
              <Clock className="w-3 h-3" />
              <span>Ends in: {timeLeft}</span>
            </div>
          )}
        </div>

        {/* Action Controls: Coupon Code Pill + CTA Link + Close Button */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-center sm:justify-end">
          {/* 1-Click Coupon Code Pill */}
          {config.couponCode && (
            <button
              onClick={handleCopyCode}
              type="button"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 backdrop-blur-sm text-[11px] font-mono font-extrabold transition-all border border-black/10 active:scale-95"
              title="Click to copy promo code"
            >
              <Tag className="w-3 h-3" />
              <span>{config.couponCode}</span>
              {isCopied ? (
                <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded font-sans font-bold flex items-center gap-0.5">
                  <Check className="w-2.5 h-2.5 stroke-[3]" /> Copied!
                </span>
              ) : (
                <Copy className="w-3 h-3 opacity-70" />
              )}
            </button>
          )}

          {/* CTA Link Button */}
          {config.buttonText && config.actionLink && (
            <a
              href={config.actionLink}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-black text-white hover:bg-black/80 font-bold text-[11px] transition-all shadow-sm"
            >
              <span>{config.buttonText}</span>
              <ArrowRight className="w-3 h-3 stroke-[2.5]" />
            </a>
          )}

          {/* Dismiss (X) Button */}
          {config.isDismissible && (
            <button
              onClick={handleDismiss}
              type="button"
              className="p-1 rounded-full hover:bg-black/15 transition-all text-current opacity-70 hover:opacity-100 ml-1"
              title="Close announcement"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
