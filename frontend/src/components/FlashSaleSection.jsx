import React, { useState, useEffect } from 'react';
import {
  Zap,
  Clock,
  Flame,
  ChevronRight,
  ChevronLeft,
  ShoppingBag,
  Sparkles,
  Eye,
  TrendingUp,
  Percent,
} from 'lucide-react';

export default function FlashSaleSection({
  onSelectProduct,
  onAddToCart,
  currency = '₹',
}) {
  const [deals, setDeals] = useState([]);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 8, minutes: 42, seconds: 19 });

  // Fetch Flash Deals from Backend API
  useEffect(() => {
    let isMounted = true;
    const fetchDeals = async () => {
      try {
        // 1. Try fetching live Flash Deal Campaign managed by Super Admin (Point #41)
        const resFlash = await fetch('/api/flash-deals/active');
        if (resFlash.ok) {
          const flashData = await resFlash.json();
          if (isMounted && flashData.hasActiveDeal && flashData.data && flashData.data.products?.length > 0) {
            const mappedDeals = flashData.data.products.map((item) => ({
              ...(item.product || {}),
              _id: item.product?._id || item._id,
              title: item.product?.title || 'Flash Deal Item',
              sellingPrice: item.dealPrice,
              originalSellingPrice: item.product?.sellingPrice || item.dealPrice,
              mrp: item.product?.mrp || Math.round(item.dealPrice * 1.4),
              discountPercent: item.discountPercentage || 35,
              dealStock: item.allocatedStock || 50,
              claimedPercent: Math.min(
                100,
                Math.round(((item.soldCount || 0) / (item.allocatedStock || 1)) * 100)
              ),
              dealBadge: flashData.data.badgeText || '⚡ FLASH SALE',
            }));

            setDeals(mappedDeals);
            setCampaign({
              title: flashData.data.title,
              subtitle: `Limited promotional campaign: ${flashData.data.title}`,
              endsAt: flashData.data.endDate,
            });

            if (flashData.data.endDate) {
              const diffMs = new Date(flashData.data.endDate).getTime() - Date.now();
              if (diffMs > 0) {
                const totalSeconds = Math.floor(diffMs / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                setTimeLeft({ hours, minutes, seconds });
              }
            }
            setLoading(false);
            return;
          }
        }

        // 2. Fallback to general flash deals products endpoint
        const res = await fetch('/api/products/flash-deals');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success) {
            setDeals(data.data || []);
            setCampaign(data.campaign || null);

            // Calculate initial time left from endsAt timestamp
            if (data.campaign?.endsAt) {
              const diffMs = new Date(data.campaign.endsAt).getTime() - Date.now();
              if (diffMs > 0) {
                const totalSeconds = Math.floor(diffMs / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                setTimeLeft({ hours, minutes, seconds });
              }
            }
          }
        }
      } catch (err) {
        console.warn('Using fallback local flash deals:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDeals();
    return () => {
      isMounted = false;
    };
  }, []);

  // 1-second countdown interval
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          // Reset 24-hour cycle when reached zero
          return { hours: 23, minutes: 59, seconds: 59 };
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format two digits
  const pad = n => String(n).padStart(2, '0');

  const scrollLeft = () => {
    const el = document.getElementById('flash-deals-scroller');
    if (el) el.scrollBy({ left: -320, behavior: 'smooth' });
  };

  const scrollRight = () => {
    const el = document.getElementById('flash-deals-scroller');
    if (el) el.scrollBy({ left: 320, behavior: 'smooth' });
  };

  if (!loading && deals.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/80 p-5 sm:p-7 text-white shadow-2xl border border-amber-500/20">
      {/* Background ambient lighting */}
      <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

      {/* Header Bar: Title, Live Countdown Timer, Controls */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black uppercase tracking-wider animate-pulse">
            <Zap className="w-3.5 h-3.5 fill-amber-400" />
            <span>Lightning Deal of the Day</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Limited Stock</span>
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            Flash Sale Frenzy
            <span className="text-xs sm:text-sm font-bold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-lg border border-amber-400/20">
              Save Up to 65%
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            {campaign?.subtitle || 'Prices slash every 24 hours. Grab these authorized brand deals before countdown expires!'}
          </p>
        </div>

        {/* Live Countdown Timer Digits */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-amber-500/30 shadow-inner">
            <Clock className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider mr-1 hidden sm:inline">
              Ends In:
            </span>

            {/* Hours Block */}
            <div className="flex flex-col items-center">
              <span className="w-10 h-9 sm:w-11 sm:h-10 bg-slate-950 rounded-xl flex items-center justify-center font-black text-amber-400 text-base sm:text-lg border border-amber-400/30 shadow-md">
                {pad(timeLeft.hours)}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                Hours
              </span>
            </div>

            <span className="font-black text-amber-400 text-lg mb-3">:</span>

            {/* Minutes Block */}
            <div className="flex flex-col items-center">
              <span className="w-10 h-9 sm:w-11 sm:h-10 bg-slate-950 rounded-xl flex items-center justify-center font-black text-amber-400 text-base sm:text-lg border border-amber-400/30 shadow-md">
                {pad(timeLeft.minutes)}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                Mins
              </span>
            </div>

            <span className="font-black text-amber-400 text-lg mb-3">:</span>

            {/* Seconds Block */}
            <div className="flex flex-col items-center">
              <span className="w-10 h-9 sm:w-11 sm:h-10 bg-rose-950/80 rounded-xl flex items-center justify-center font-black text-rose-400 text-base sm:text-lg border border-rose-500/40 shadow-md animate-pulse">
                {pad(timeLeft.seconds)}
              </span>
              <span className="text-[9px] font-bold text-rose-400 uppercase tracking-tighter mt-0.5">
                Secs
              </span>
            </div>
          </div>

          {/* Carousel Nav Arrows */}
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <button
              onClick={scrollLeft}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-white/10 active:scale-95"
              title="Previous Deals"
              aria-label="Previous Deals"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={scrollRight}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-white/10 active:scale-95"
              title="Next Deals"
              aria-label="Next Deals"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Carousel Scroller of Flash Deals */}
      <div
        id="flash-deals-scroller"
        className="relative z-10 mt-6 flex gap-4 overflow-x-auto pb-3 custom-device-scrollbar scroll-smooth"
      >
        {deals.map(deal => {
          const discount = deal.discountPercentage || Math.round(((deal.mrp - deal.sellingPrice) / deal.mrp) * 100) || 50;
          const claimedPercent = deal.claimedPercent || 78;
          const imgUrl = deal.images?.[0] || 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600';

          return (
            <div
              key={deal._id}
              onClick={() => onSelectProduct && onSelectProduct(deal)}
              className="flex-shrink-0 w-[260px] sm:w-[290px] bg-slate-900/90 rounded-2xl border border-white/10 p-4 hover:border-amber-400/50 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
            >
              {/* Product Top: Badges & Thumbnail */}
              <div className="space-y-3">
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-950">
                  <img
                    src={imgUrl}
                    alt={deal.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60" />

                  {/* Discount Badge */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-rose-600 text-white text-[11px] font-black px-2 py-0.5 rounded-lg shadow-lg">
                    <Flame className="w-3 h-3 fill-white" />
                    <span>{discount}% OFF</span>
                  </div>

                  {/* Lightning Tag */}
                  <div className="absolute top-2.5 right-2.5 bg-amber-500/90 backdrop-blur-sm text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow">
                    <Zap className="w-3 h-3 fill-slate-950" />
                    <span>FLASH</span>
                  </div>

                  {/* Quick View Button on Hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/40 backdrop-blur-[2px]">
                    <span className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      <Eye className="w-3.5 h-3.5" />
                      Quick View
                    </span>
                  </div>
                </div>

                {/* Brand & Title */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-400/90 mb-1">
                    <span>{deal.brand || 'Authorized Seller'}</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      ★ {deal.ratingsAverage || 4.8}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-sm text-white line-clamp-2 leading-snug group-hover:text-amber-300 transition-colors">
                    {deal.title}
                  </h3>
                </div>

                {/* Pricing: Selling Price vs MRP */}
                <div className="pt-1 flex items-baseline gap-2">
                  <span className="text-lg font-black text-white">
                    {currency}{deal.sellingPrice?.toLocaleString('en-IN')}
                  </span>
                  {deal.mrp > deal.sellingPrice && (
                    <span className="text-xs text-slate-500 line-through font-semibold">
                      {currency}{deal.mrp?.toLocaleString('en-IN')}
                    </span>
                  )}
                  <span className="text-[11px] font-extrabold text-emerald-400 ml-auto">
                    Save {currency}{(deal.mrp - deal.sellingPrice)?.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Product Bottom: Claimed Progress Meter & Action */}
              <div className="mt-4 pt-3 border-t border-white/5 space-y-2.5">
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between items-center text-[11px] font-bold mb-1">
                    <span className="text-slate-400 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-amber-400" />
                      Claimed: {claimedPercent}%
                    </span>
                    <span className="text-amber-400 font-extrabold">
                      {deal.stock ? `${deal.stock} left` : 'Few left'}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-1000"
                      style={{ width: `${claimedPercent}%` }}
                    />
                  </div>
                </div>

                {/* 1-Click Claim Deal Button */}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    if (onAddToCart) onAddToCart(deal);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Claim Flash Deal</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
