import React, { useState, useEffect } from 'react';
import {
  Flame,
  Clock,
  Sparkles,
  ArrowRight,
  ShoppingBag,
  Zap,
  Tag,
  Star,
} from 'lucide-react';
import api from '../api/client';

export default function FlashDealSection({ onSelectProduct, onAddToCart }) {
  const [deal, setDeal] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [loading, setLoading] = useState(true);

  const fallbackDeal = {
    title: '⚡ Midnight Flash Frenzy — Up to 40% OFF',
    badgeText: '🔥 24H FLASH SALE',
    endDate: new Date(Date.now() + 14 * 3600 * 1000 + 42 * 60 * 1000).toISOString(),
    backgroundColor: '#DC2626',
    textColor: '#FFFFFF',
    products: [
      {
        product: {
          _id: 'prod_fallback_1',
          title: 'Wireless Noise Cancelling Studio Headphones',
          slug: 'wireless-noise-cancelling-studio-headphones',
          mrp: 14999,
          sellingPrice: 8999,
          ratingsAverage: 4.8,
          brand: 'AuraSound',
          images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'],
        },
        discountPercentage: 40,
        dealPrice: 5399,
        allocatedStock: 50,
        soldCount: 38,
      },
      {
        product: {
          _id: 'prod_fallback_2',
          title: 'Smart Fitness Tracker Watch Ultra',
          slug: 'smart-fitness-tracker-watch-ultra',
          mrp: 7999,
          sellingPrice: 4499,
          ratingsAverage: 4.7,
          brand: 'Chronos',
          images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'],
        },
        discountPercentage: 35,
        dealPrice: 2924,
        allocatedStock: 80,
        soldCount: 65,
      },
      {
        product: {
          _id: 'prod_fallback_3',
          title: 'Cyberpunk Minimalist Mechanical Keyboard RGB',
          slug: 'cyberpunk-minimalist-mechanical-keyboard',
          mrp: 6499,
          sellingPrice: 3899,
          ratingsAverage: 4.9,
          brand: 'KeyMatrix',
          images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80'],
        },
        discountPercentage: 45,
        dealPrice: 2144,
        allocatedStock: 40,
        soldCount: 32,
      },
    ],
  };

  useEffect(() => {
    let isMounted = true;
    const fetchActiveDeal = async () => {
      try {
        const res = await api.get('/flash-deals/active');
        if (isMounted) {
          if (res.data && res.data.hasActiveDeal && res.data.data) {
            setDeal(res.data.data);
          } else {
            setDeal(fallbackDeal);
          }
        }
      } catch (err) {
        if (isMounted) {
          setDeal(fallbackDeal);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchActiveDeal();
    return () => {
      isMounted = false;
    };
  }, []);

  // Real-time ticking countdown clock
  useEffect(() => {
    if (!deal || !deal.endDate) return;

    const updateTimer = () => {
      const now = new Date();
      const end = new Date(deal.endDate);
      const diffMs = end - now;

      if (diffMs <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hours = Math.floor(diffMs / (1000 * 3600));
      const minutes = Math.floor((diffMs % (1000 * 3600)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deal]);

  if (loading || !deal || !deal.products || deal.products.length === 0) {
    return null;
  }

  return (
    <section className="my-10 relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      {/* FLASH DEAL HEADER BANNER */}
      <div
        className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
        style={{
          backgroundColor: deal.backgroundColor || '#DC2626',
          color: deal.textColor || '#FFFFFF',
        }}
      >
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/25 backdrop-blur-md text-xs font-black uppercase tracking-wider">
            <Flame className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>{deal.badgeText || '⚡ FLASH SALE'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{deal.title}</h2>
          <p className="text-xs sm:text-sm opacity-90 max-w-xl">
            Limited stock allocated at special promotional flash discount prices. Grab before the timer expires!
          </p>
        </div>

        {/* TICKING COUNTDOWN CLOCK */}
        <div className="flex items-center gap-2 sm:gap-3 bg-black/35 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/20 self-start md:self-auto shrink-0 shadow-lg">
          <div className="text-center">
            <div className="text-[10px] uppercase font-bold text-amber-300">Hours</div>
            <div className="font-mono text-2xl font-black">
              {String(timeLeft.hours).padStart(2, '0')}
            </div>
          </div>
          <span className="font-mono text-xl font-black opacity-60">:</span>
          <div className="text-center">
            <div className="text-[10px] uppercase font-bold text-amber-300">Mins</div>
            <div className="font-mono text-2xl font-black">
              {String(timeLeft.minutes).padStart(2, '0')}
            </div>
          </div>
          <span className="font-mono text-xl font-black opacity-60">:</span>
          <div className="text-center">
            <div className="text-[10px] uppercase font-bold text-amber-300">Secs</div>
            <div className="font-mono text-2xl font-black text-amber-300">
              {String(timeLeft.seconds).padStart(2, '0')}
            </div>
          </div>
        </div>
      </div>

      {/* PRODUCTS CAROUSEL / GRID */}
      <div className="p-6 sm:p-8 bg-slate-950">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {deal.products.map((item, idx) => {
            const product = item.product || {};
            const soldCount = item.soldCount || 0;
            const allocatedStock = item.allocatedStock || 50;
            const remainingStock = Math.max(0, allocatedStock - soldCount);
            const percentSold = Math.min(100, Math.round((soldCount / allocatedStock) * 100));

            return (
              <div
                key={idx}
                className="bg-slate-900 rounded-3xl border border-slate-800/80 p-5 flex flex-col justify-between space-y-4 hover:border-rose-500/50 transition-all duration-300 group shadow-md"
              >
                {/* Product Image & Badges */}
                <div className="relative rounded-2xl overflow-hidden bg-slate-800 aspect-square">
                  <img
                    src={
                      product.images?.[0] ||
                      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'
                    }
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    <span className="px-2.5 py-1 rounded-xl bg-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-white" />
                      {item.discountPercentage}% OFF
                    </span>
                    {product.brand && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-950/80 backdrop-blur-sm text-slate-300 font-bold text-[10px] uppercase">
                        {product.brand}
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-slate-950/80 backdrop-blur-sm text-amber-400 font-bold text-xs flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{product.ratingsAverage || 4.8}</span>
                  </div>
                </div>

                {/* Title & Price */}
                <div className="space-y-2">
                  <h3
                    onClick={() => onSelectProduct && onSelectProduct(product)}
                    className="font-bold text-white text-sm line-clamp-2 hover:text-amber-400 cursor-pointer transition"
                  >
                    {product.title}
                  </h3>

                  <div className="flex items-baseline gap-2">
                    <span className="font-black text-xl text-rose-500">
                      ₹{item.dealPrice?.toLocaleString('en-IN')}
                    </span>
                    {product.mrp && (
                      <span className="line-through text-xs font-semibold text-slate-500">
                        ₹{product.mrp?.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  {/* Stock Left & Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bold text-[11px]">
                        Available: <span className="text-white font-black">{remainingStock}</span> left
                      </span>
                      <span className="text-rose-400 font-black text-[11px]">
                        {percentSold}% Claimed
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full transition-all"
                        style={{ width: `${percentSold}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* 1-Click Action Button */}
                <button
                  onClick={() => {
                    if (onSelectProduct) {
                      onSelectProduct(product);
                    } else if (onAddToCart) {
                      onAddToCart(product);
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 active:scale-98"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Claim Flash Deal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
