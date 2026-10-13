import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star, ShoppingBag, Eye, Sparkles, TrendingUp, Flame } from 'lucide-react';
import api from '../api/client';
import StockUrgencyBadge from './StockUrgencyBadge';

export const ProductRecommendationSlider = ({
  productId,
  mainProduct,
  onSelectProduct,
  onAddToCart,
}) => {
  const [data, setData] = useState({ related: [], alsoViewed: [] });
  const [loading, setLoading] = useState(true);
  const relatedScrollRef = useRef(null);
  const alsoViewedScrollRef = useRef(null);

  useEffect(() => {
    const id = productId || mainProduct?._id || mainProduct?.slug;
    if (!id) return;

    setLoading(true);
    api.get(`/products/${id}/recommendations`)
      .then(res => {
        if (res.data?.success) {
          setData({
            related: res.data.related || [],
            alsoViewed: res.data.alsoViewed || [],
          });
        }
        setLoading(false);
      })
      .catch(() => {
        // Fallback gracefully if endpoint is unavailable
        setData({ related: [], alsoViewed: [] });
        setLoading(false);
      });
  }, [productId, mainProduct]);

  const scroll = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const renderProductCard = (item) => {
    const imgUrl = item.image || item.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';
    const mrp = item.mrp || Math.round((item.sellingPrice || item.price || 999) * 1.35);
    const price = item.sellingPrice || item.price || 0;
    const discount = item.discountPercent || (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);

    return (
      <div
        key={item._id}
        className="flex-shrink-0 w-60 sm:w-64 bg-white rounded-2xl border border-slate-200/90 hover:border-amber-400/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group overflow-hidden"
      >
        {/* Top Image & Badges */}
        <div className="relative aspect-square w-full bg-slate-50 flex items-center justify-center p-3 overflow-hidden">
          <img
            src={imgUrl}
            alt={item.title}
            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />

          {discount > 0 && (
            <span className="absolute top-2.5 left-2.5 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
              {discount}% OFF
            </span>
          )}

          {item.recentPurchases24h > 15 && (
            <span className="absolute top-2.5 right-2.5 bg-amber-500/95 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Flame className="w-3 h-3 fill-current text-rose-600" /> Hot
            </span>
          )}

          {/* Quick Action Overlay on Desktop */}
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-3 backdrop-blur-[2px]">
            {onSelectProduct && (
              <button
                onClick={() => onSelectProduct(item)}
                className="p-2.5 rounded-xl bg-white text-slate-900 hover:bg-amber-400 hover:text-slate-950 font-bold text-xs shadow-md transition-transform hover:scale-105 flex items-center gap-1.5"
                title="Quick View"
              >
                <Eye className="w-4 h-4" />
                <span>View</span>
              </button>
            )}
            {onAddToCart && (
              <button
                onClick={() => onAddToCart(item, null, 1)}
                className="p-2.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold text-xs shadow-md transition-transform hover:scale-105 flex items-center gap-1.5"
                title="Add to Cart"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Cart</span>
              </button>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1">
              <span className="uppercase text-amber-600 font-bold">{item.brand || 'AuraChoice'}</span>
              <div className="flex items-center gap-1 text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="font-bold">{item.ratingsAverage || 4.5}</span>
              </div>
            </div>

            <h4
              onClick={() => onSelectProduct && onSelectProduct(item)}
              className="text-xs sm:text-sm font-bold text-slate-900 hover:text-amber-600 line-clamp-2 cursor-pointer transition-colors leading-snug"
            >
              {item.title}
            </h4>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-base sm:text-lg font-black text-slate-950">
                ₹{price.toLocaleString('en-IN')}
              </span>
              {mrp > price && (
                <span className="text-xs text-slate-400 line-through font-semibold">
                  ₹{mrp.toLocaleString('en-IN')}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <StockUrgencyBadge stock={item.stock} variant="compact" />
              {onAddToCart && (
                <button
                  onClick={() => onAddToCart(item, null, 1)}
                  className="sm:hidden p-1.5 bg-amber-500 rounded-lg text-slate-950 font-bold"
                  aria-label="Add to cart"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSliderSection = (title, icon, items, scrollRef) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="space-y-3 pt-4">
        {/* Section Header with Left/Right Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              {icon}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {items.length} handpicked recommendations matching your interests
              </p>
            </div>
          </div>

          {items.length > 2 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scroll(scrollRef, 'left')}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition-all"
                title="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll(scrollRef, 'right')}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition-all"
                title="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Horizontal Carousel */}
        <div
          ref={scrollRef}
          className="flex items-stretch gap-3.5 overflow-x-auto pb-3 pt-1 scroll-smooth no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map(item => renderProductCard(item))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="py-6 space-y-4">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="w-60 h-72 bg-slate-100 rounded-2xl animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (data.related.length === 0 && data.alsoViewed.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 pt-4 border-t border-slate-200">
      {/* 1. Related Products in Same Category */}
      {renderSliderSection(
        'Related Products in this Category',
        <Sparkles className="w-4 h-4" />,
        data.related,
        relatedScrollRef
      )}

      {/* 2. Customers Also Viewed */}
      {renderSliderSection(
        'Customers Also Viewed',
        <TrendingUp className="w-4 h-4" />,
        data.alsoViewed,
        alsoViewedScrollRef
      )}
    </div>
  );
};
