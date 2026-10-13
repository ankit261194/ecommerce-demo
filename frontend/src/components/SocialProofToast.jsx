import React, { useState, useEffect } from 'react';
import { CheckCircle2, ShieldCheck, X, ShoppingBag, MapPin, Sparkles } from 'lucide-react';

/**
 * Live Social Proof Toast Popups (Point #14)
 * Bottom-left corner purchase alerts that motivate visitors with authentic peer verification.
 */
export default function SocialProofToast({ onSelectProduct, currency = '₹' }) {
  const [activities, setActivities] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Fetch recent activities from backend API
  useEffect(() => {
    let isMounted = true;
    const fetchActivities = async () => {
      try {
        const res = await fetch('/api/products/social-proof/recent-activities');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.data?.length > 0) {
            setActivities(data.data);
          }
        }
      } catch (err) {
        console.warn('Social proof fetch fallback:', err);
      }
    };

    fetchActivities();
    return () => {
      isMounted = false;
    };
  }, []);

  // Display cycle: Show for 6.5 seconds, hide for 8 seconds, then show next
  useEffect(() => {
    if (isDismissed || activities.length === 0 || isPaused) return;

    let hideTimeout;
    let nextTimeout;

    // Show after initial delay
    const initialDelay = setTimeout(() => {
      setIsVisible(true);

      // Hide after 6.5s
      hideTimeout = setTimeout(() => {
        setIsVisible(false);

        // Advance to next after 7.5s off-screen
        nextTimeout = setTimeout(() => {
          setCurrentIndex(prev => (prev + 1) % activities.length);
          setIsVisible(true);
        }, 7500);
      }, 6500);
    }, 4000);

    return () => {
      clearTimeout(initialDelay);
      clearTimeout(hideTimeout);
      clearTimeout(nextTimeout);
    };
  }, [activities.length, currentIndex, isPaused, isDismissed]);

  if (isDismissed || activities.length === 0) return null;

  const current = activities[currentIndex];
  if (!current || !current.product) return null;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 max-w-[340px] sm:max-w-sm transition-all duration-500 ease-out transform ${
        isVisible
          ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto'
          : 'translate-y-8 opacity-0 scale-95 pointer-events-none'
      }`}
    >
      <div
        onClick={() => {
          if (onSelectProduct && current.product) {
            onSelectProduct(current.product);
          }
        }}
        className="relative bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 shadow-2xl border border-amber-300/80 hover:border-amber-400 transition-all cursor-pointer group flex items-start gap-3 ring-1 ring-black/5"
      >
        {/* Product Image Thumbnail */}
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
          <img
            src={current.product.image}
            alt={current.product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute top-1 left-1 bg-amber-500 text-slate-950 p-0.5 rounded-full shadow-xs">
            <ShoppingBag className="w-2.5 h-2.5" />
          </div>
        </div>

        {/* Content details */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-900 leading-none mb-1">
            <span className="truncate">{current.customerName}</span>
            <span className="text-slate-400 font-medium">in</span>
            <span className="text-slate-700 truncate font-semibold">{current.city.split(',')[0]}</span>
          </div>

          <p className="text-xs text-slate-600 line-clamp-1 font-bold group-hover:text-amber-700 transition-colors">
            Purchased {current.product.title}
          </p>

          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 font-semibold">
            <span className="text-amber-600 font-black">
              {currency}{current.product.sellingPrice?.toLocaleString('en-IN')}
            </span>
            <span>•</span>
            <span className="text-slate-400">{current.timeAgo}</span>
            <span>•</span>
            <span className="text-emerald-700 font-extrabold flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Verified
            </span>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            setIsDismissed(true);
          }}
          className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          title="Dismiss purchase notification"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
