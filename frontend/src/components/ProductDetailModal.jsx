import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  ShoppingBag,
  Zap,
  Heart,
  Share2,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Layers,
  Store,
  Check,
  ThumbsUp,
  MessageSquare,
  Palmtree,
  Ruler,
  Bell,
  TrendingDown,
} from 'lucide-react';
import StockUrgencyBadge from './StockUrgencyBadge';
import RecentPurchaseCounter from './RecentPurchaseCounter';
import ProductReviewsSection from './ProductReviewsSection';
import ProductQnASection from './ProductQnASection';
import FrequentlyBoughtTogether from './FrequentlyBoughtTogether';
import { ProductRecommendationSlider } from './ProductRecommendationSlider';
import PincodeChecker from './PincodeChecker';
import SizeGuideModal from './SizeGuideModal';
import PriceDropAlertModal from './PriceDropAlertModal';
import { useLocalization } from '../context/LocalizationContext';

export const ProductDetailModal = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onBuyNow,
  isWishlisted,
  onToggleWishlist,
  onSelectProduct,
  onOpenVendorStore,
}) => {
  const { formatPrice, t } = useLocalization();
  if (!isOpen || !product) return null;

  // Active Image Gallery State
  const images = product.images && product.images.length > 0
    ? product.images
    : [product.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'];
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Active Variant State
  const [selectedVariant, setSelectedVariant] = useState(
    product.hasVariants && product.variants?.length > 0 ? product.variants[0] : null
  );

  // Quantity State
  const [quantity, setQuantity] = useState(1);

  // Active Tab: 'overview' | 'specs' | 'reviews' | 'seller'
  const [activeTab, setActiveTab] = useState('overview');

  // Copy share feedback
  const [copiedShare, setCopiedShare] = useState(false);

  // Size Guide Modal state (Point #4)
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  // Price Drop Alert Modal state (Point #6)
  const [isPriceDropModalOpen, setIsPriceDropModalOpen] = useState(false);

  // Hover zoom coordinates
  const [zoomStyle, setZoomStyle] = useState({ display: 'none' });

  // Multi-Attribute Matrix Extraction (Colors, Sizes, Attributes)
  const availableColors = React.useMemo(() => {
    if (!product.variants || product.variants.length === 0) return [];
    const set = new Set();
    product.variants.forEach(v => {
      const c = v.attributes?.color;
      if (c) set.add(c);
      else if (v.name) {
        const lower = v.name.toLowerCase();
        if (lower.includes('black')) set.add('Black');
        else if (lower.includes('silver')) set.add('Silver');
        else if (lower.includes('white')) set.add('White');
        else if (lower.includes('blue')) set.add('Blue');
        else if (lower.includes('red')) set.add('Red');
        else if (lower.includes('obsidian')) set.add('Obsidian');
      }
    });
    return Array.from(set);
  }, [product.variants]);

  const availableSizes = React.useMemo(() => {
    if (!product.variants || product.variants.length === 0) return [];
    const set = new Set();
    product.variants.forEach(v => {
      const s = v.attributes?.size || v.attributes?.storage;
      if (s) set.add(s);
      else if (v.name) {
        if (v.name.includes('Medium') || v.name.includes('/ M') || v.name.includes('M /')) set.add('M');
        if (v.name.includes('Large') || v.name.includes('/ L') || v.name.includes('L /')) set.add('L');
        if (v.name.includes('XL')) set.add('XL');
        if (v.name.includes('Small') || v.name.includes('/ S') || v.name.includes('S /')) set.add('S');
      }
    });
    return Array.from(set);
  }, [product.variants]);

  const getColorHex = colorName => {
    const c = (colorName || '').toLowerCase();
    if (c.includes('black') || c.includes('obsidian')) return '#0f172a';
    if (c.includes('silver') || c.includes('grey') || c.includes('gray')) return '#94a3b8';
    if (c.includes('white')) return '#f8fafc';
    if (c.includes('red') || c.includes('crimson')) return '#ef4444';
    if (c.includes('blue') || c.includes('navy')) return '#3b82f6';
    if (c.includes('green') || c.includes('olive')) return '#10b981';
    if (c.includes('gold') || c.includes('yellow')) return '#f59e0b';
    return '#64748b';
  };

  const handleSelectColor = col => {
    const currentSize = selectedVariant?.attributes?.size;
    const match = product.variants.find(v => {
      const vColor = v.attributes?.color || v.name;
      const vSize = v.attributes?.size;
      return vColor?.toLowerCase().includes(col.toLowerCase()) && (!currentSize || vSize === currentSize);
    }) || product.variants.find(v => (v.attributes?.color || v.name)?.toLowerCase().includes(col.toLowerCase()));
    if (match) setSelectedVariant(match);
  };

  const handleSelectSize = sz => {
    const currentColor = selectedVariant?.attributes?.color;
    const match = product.variants.find(v => {
      const vColor = v.attributes?.color;
      const vSize = v.attributes?.size || v.name;
      return vSize?.includes(sz) && (!currentColor || vColor === currentColor);
    }) || product.variants.find(v => (v.attributes?.size || v.name)?.includes(sz));
    if (match) setSelectedVariant(match);
  };

  // Reset states when product changes
  useEffect(() => {
    setActiveImageIndex(0);
    setSelectedVariant(product.hasVariants && product.variants?.length > 0 ? product.variants[0] : null);
    setQuantity(1);
    setActiveTab('overview');
  }, [product]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Calculated Pricing
  const basePrice = product.sellingPrice || product.price || 0;
  const variantAdditional = selectedVariant?.additionalPrice || 0;
  const currentSellingPrice = basePrice + variantAdditional;
  const currentMrp = (product.mrp || Math.round(basePrice * 1.5)) + variantAdditional;
  const discountAmount = Math.max(0, currentMrp - currentSellingPrice);
  const discountPercentage = currentMrp > 0 ? Math.round((discountAmount / currentMrp) * 100) : 0;

  // Current Stock
  const currentStock = selectedVariant ? selectedVariant.stock : (product.stock ?? 10);

  // Vacation Mode Detection (Point #59)
  const vendorVacation = product.vendor?.vacationMode;
  const isVendorOnVacation = Boolean(vendorVacation?.isVacation);
  const isOrderingPaused = isVendorOnVacation && (vendorVacation?.disableOrdering !== false);
  const vacationNotice = vendorVacation?.noticeMessage || 'Merchant is currently away on vacation. Orders will resume shortly.';
  const vacationEndDate = vendorVacation?.endDate
    ? new Date(vendorVacation.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: product.title,
        text: `Check out ${product.title} for ₹${currentSellingPrice}!`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handleMouseMove = e => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      display: 'block',
      transformOrigin: `${x}% ${y}%`,
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: 'none' });
  };

  // Structured Specs
  const specs = product.specifications && product.specifications.length > 0
    ? product.specifications
    : [
        { key: 'Brand', value: product.brand || 'AuraChoice' },
        { key: 'SKU', value: selectedVariant?.sku || product.sku || 'N/A' },
        { key: 'Category', value: product.category?.name || 'General' },
        { key: 'Stock Availability', value: currentStock > 0 ? `${currentStock} Units in Stock` : 'Out of Stock' },
        { key: 'Warranty', value: '1 Year Brand Manufacturer Warranty' },
        { key: 'Country of Origin', value: 'India' },
        { key: 'Condition', value: '100% Brand New & Factory Sealed' },
      ];

  // Authentic Buyer Reviews Mockup
  const sampleReviews = [
    {
      id: 1,
      author: 'Rohit Verma',
      rating: 5,
      date: '2 days ago',
      verified: true,
      title: 'Exceeded my expectations!',
      comment: 'Audio quality is punchy and build quality feels remarkably premium. Packaging was sturdy and courier arrived with OTP verification within 48 hours.',
      likes: 12,
    },
    {
      id: 2,
      author: 'Pooja Nair',
      rating: 5,
      date: '1 week ago',
      verified: true,
      title: 'Must-buy for everyday use',
      comment: 'Matches the description 100%. Got an amazing deal during the festive sale. Highly recommended seller!',
      likes: 8,
    },
    {
      id: 3,
      author: 'Sameer Khan',
      rating: 4,
      date: '2 weeks ago',
      verified: true,
      title: 'Great value for money',
      comment: 'Very solid craftsmanship. Battery backup matches specifications. Fast delivery as well.',
      likes: 5,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Main Modal Card */}
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[92vh] animate-scale-up">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Home</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-amber-600 font-bold">{product.category?.name || 'Catalog'}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
            <span className="font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs hidden sm:inline">
              {product.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              title="Share Product"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-all relative"
            >
              <Share2 className="w-4 h-4" />
              {copiedShare && (
                <span className="absolute -bottom-8 right-0 text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-bold whitespace-nowrap shadow-md">
                  Link Copied!
                </span>
              )}
            </button>

            <button
              onClick={e => onToggleWishlist(product, e)}
              title="Save to Wishlist"
              className={`p-2 rounded-xl transition-all ${
                isWishlisted
                  ? 'text-red-500 bg-red-50 hover:bg-red-100'
                  : 'text-slate-500 hover:text-red-500 hover:bg-slate-200/60'
              }`}
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={onClose}
              title="Close (Esc)"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 transition-all"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto custom-device-scrollbar flex-1 p-5 sm:p-7">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: Multi-Image Zoom Gallery (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Main Image Container with Lens Zoom on Hover */}
              <div
                className="relative aspect-square w-full rounded-2xl bg-slate-100 border border-slate-200/80 overflow-hidden group shadow-inner flex items-center justify-center cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <img
                  src={images[activeImageIndex]}
                  alt={product.title}
                  className="w-full h-full object-cover transition-transform duration-200"
                  style={zoomStyle.display === 'block' ? { transform: 'scale(1.5)', ...zoomStyle } : {}}
                />

                {/* Overlaid Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
                  {discountPercentage > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-black uppercase tracking-wider shadow-md">
                      {discountPercentage}% OFF
                    </span>
                  )}
                  {product.isFeatured && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Featured Choice
                    </span>
                  )}
                </div>

                {/* Zoom Hint */}
                <div className="absolute bottom-2.5 right-2.5 bg-slate-900/75 backdrop-blur-sm text-white px-2 py-1 rounded-md text-[10px] font-bold pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                  🔍 Hover to Zoom
                </div>
              </div>

              {/* Thumbnails Row */}
              {images.length > 1 && (
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 custom-device-scrollbar">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                        activeImageIndex === idx
                          ? 'border-amber-500 ring-2 ring-amber-400/30 scale-105 shadow-md'
                          : 'border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300'
                      }`}
                    >
                      <img src={img} alt={`Angle ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Verified Seller Badge Card */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/60 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      <span>{product.vendor?.storeName || 'Verified Partner Store'}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
                    </p>
                    <p className="text-[11px] text-slate-500">
                      ★ {product.vendor?.rating || '4.8'} Seller Rating • 99% Dispatch Speed
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                  Official Merchant
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN: Product Details, Pricing, Variants & Actions (7 Cols) */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Brand & Title */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/50">
                    {product.brand || 'AuraChoice'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    SKU: {selectedVariant?.sku || product.sku}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                  {product.title}
                </h1>
              </div>

              {/* Rating & Social Urgency */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex items-center gap-1 bg-amber-500 text-slate-950 px-2.5 py-1 rounded-lg text-xs font-black shadow-sm">
                  <span>{product.ratingsAverage || 4.8}</span>
                  <Star className="w-3.5 h-3.5 fill-current" />
                </div>
                <span className="text-xs text-slate-500 font-semibold">
                  {product.ratingsQuantity || 42} Verified Ratings & Reviews
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 100% Genuine Guarantee
                </span>
              </div>

              {/* Live Recent Purchase Counter & Viewers Velocity (Point #13) */}
              <RecentPurchaseCounter
                purchases={product.recentPurchases24h}
                viewers={product.recentViewsPerHour}
                variant="banner"
              />

              {/* Price & Savings Block */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
                    {formatPrice(currentSellingPrice)}
                  </span>
                  {currentMrp > currentSellingPrice && (
                    <span className="text-base sm:text-lg text-slate-400 font-bold line-through">
                      {formatPrice(currentMrp)}
                    </span>
                  )}
                  {discountPercentage > 0 && (
                    <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300">
                      {t('save', 'Save')} {formatPrice(discountAmount)} ({discountPercentage}% OFF)
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                  <p className="text-[11px] font-medium text-slate-500">
                    Inclusive of all taxes • Free express shipping on this order
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsPriceDropModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 px-2.5 py-1 rounded-xl transition-all shadow-xs active:scale-95"
                    title="Get instant WhatsApp / Email alert when price drops"
                  >
                    <Bell className="w-3.5 h-3.5 fill-current text-amber-600" />
                    <span>Price Drop Alert</span>
                  </button>
                </div>
              </div>

              {/* Real-time Stock Urgency Status (Point #12) */}
              <div>
                <StockUrgencyBadge stock={currentStock} variant="detailed" />
              </div>

              {/* Multi-Attribute Product Variants Matrix (Point #2) */}
              {product.hasVariants && product.variants?.length > 0 && (
                <div className="space-y-3.5 pt-1 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200">
                  
                  {/* 1. Color Swatches Row (if colors present) */}
                  {availableColors.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black uppercase tracking-wider text-slate-700">
                          Color Swatch:
                        </span>
                        <span className="text-amber-600 font-extrabold">
                          {selectedVariant?.attributes?.color || selectedVariant?.name || 'Selected'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {availableColors.map(col => {
                          const isSelected = (selectedVariant?.attributes?.color || selectedVariant?.name || '').toLowerCase().includes(col.toLowerCase());
                          const hex = getColorHex(col);
                          return (
                            <button
                              key={col}
                              type="button"
                              onClick={() => handleSelectColor(col)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                                isSelected
                                  ? 'border-amber-500 bg-amber-50 text-slate-950 ring-2 ring-amber-400/40 shadow-sm scale-105'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-inner flex-shrink-0"
                                style={{ backgroundColor: hex }}
                              />
                              <span>{col}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. Size / Capacity Chips Row (if sizes present) */}
                  {availableSizes.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-black uppercase tracking-wider text-slate-700">
                            Size / Option:
                          </span>
                          <span className="text-amber-600 font-extrabold">
                            {selectedVariant?.attributes?.size || 'Standard Fit'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsSizeGuideOpen(true)}
                          className="flex items-center gap-1.5 text-xs font-black text-amber-600 hover:text-amber-700 py-0.5 px-2 rounded-lg hover:bg-amber-50 border border-amber-200/60 shadow-xs transition-all active:scale-95"
                          title="Open Interactive Apparel & Footwear Size Guide"
                        >
                          <Ruler className="w-3.5 h-3.5" />
                          <span>Size Guide</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {availableSizes.map(sz => {
                          const isSelected = (selectedVariant?.attributes?.size || selectedVariant?.name || '').includes(sz);
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => handleSelectSize(sz)}
                              className={`min-w-[48px] px-3.5 py-1.5 rounded-xl border text-xs font-black text-center transition-all ${
                                isSelected
                                  ? 'border-slate-900 bg-slate-900 text-amber-400 ring-2 ring-amber-400/30 shadow-md scale-105'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. Comprehensive Variant Options Cards */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
                      <span>All Available Combinations:</span>
                      <span className="text-slate-700 font-black">Active SKU: {selectedVariant?.sku}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {product.variants.map(variant => {
                        const isSelected = selectedVariant?.sku === variant.sku;
                        const varPrice = basePrice + (variant.additionalPrice || 0);
                        const isOutOfStock = variant.stock <= 0;
                        return (
                          <button
                            key={variant.sku}
                            type="button"
                            onClick={() => setSelectedVariant(variant)}
                            disabled={isOutOfStock}
                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs font-bold transition-all ${
                              isSelected
                                ? 'border-amber-500 bg-white text-slate-950 ring-2 ring-amber-400/30 shadow-sm'
                                : 'border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300 hover:bg-white'
                            } ${isOutOfStock ? 'opacity-40 cursor-not-allowed bg-slate-100' : ''}`}
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-extrabold block truncate text-slate-900">{variant.name}</span>
                              <div className="mt-0.5">
                                <StockUrgencyBadge stock={variant.stock} variant="compact" showPulse={false} />
                              </div>
                            </div>
                            <span className="font-black text-slate-900 flex-shrink-0">
                              {formatPrice(varPrice)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* Point 59: Vacation Mode Alert Banner */}
              {isVendorOnVacation && (
                <div className={`p-4 rounded-2xl border flex items-start gap-3.5 text-xs transition-all shadow-sm ${
                  isOrderingPaused
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 text-amber-950'
                    : 'bg-gradient-to-r from-blue-50 to-sky-50 border-blue-200 text-blue-950'
                }`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    isOrderingPaused ? 'bg-amber-500 text-slate-950' : 'bg-blue-500 text-white'
                  }`}>
                    <Palmtree className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        isOrderingPaused
                          ? 'bg-amber-100/80 text-amber-900 border-amber-300'
                          : 'bg-blue-100/80 text-blue-900 border-blue-300'
                      }`}>
                        {isOrderingPaused ? '🌴 Store on Vacation • Ordering Paused' : '🌴 Vacation Notice • Delayed Shipping'}
                      </span>
                      {vacationEndDate && (
                        <span className="text-[11px] font-extrabold text-slate-600 bg-white/70 px-2 py-0.5 rounded border border-slate-200">
                          Reopening: {vacationEndDate}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-700 leading-relaxed text-xs">
                      {vacationNotice}
                    </p>
                    {isOrderingPaused && (
                      <p className="text-[11px] font-bold text-amber-800">
                        Orders for this merchant are temporarily paused until vacation ends.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Quantity Selector & Purchase Actions */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center border-2 border-slate-200 rounded-xl bg-white overflow-hidden font-extrabold text-sm">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1 || isOrderingPaused}
                      className="px-3.5 py-2.5 text-slate-600 hover:text-slate-950 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                    >
                      -
                    </button>
                    <span className="px-4 py-2.5 text-slate-950 text-center select-none font-black min-w-[40px]">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(q => Math.min(currentStock || 10, q + 1))}
                      disabled={quantity >= currentStock || isOrderingPaused}
                      className="px-3.5 py-2.5 text-slate-600 hover:text-slate-950 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      onAddToCart(product, selectedVariant, quantity);
                    }}
                    disabled={currentStock <= 0 || isOrderingPaused}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-sm shadow-lg hover:shadow-xl transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                    <span>{isOrderingPaused ? '🌴 Merchant on Vacation' : 'Add to Cart'}</span>
                  </button>

                  <button
                    onClick={() => {
                      onBuyNow(product, selectedVariant, quantity);
                    }}
                    disabled={currentStock <= 0 || isOrderingPaused}
                    className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-black text-sm shadow-lg hover:shadow-xl transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Zap className="w-4 h-4 fill-amber-400 text-amber-400 stroke-none" />
                    <span>{isOrderingPaused ? '🌴 Orders Paused' : t('buyNow', 'Buy Now')}</span>
                  </button>
                </div>
              </div>

              {/* Point #1: Pincode Delivery & COD Serviceability Engine */}
              <div className="pt-1">
                <PincodeChecker compact={false} />
              </div>

              {/* Trust Badges Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-[11px]">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                  <Truck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="font-bold leading-tight">Express 48h Delivery</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-bold leading-tight">1-Year Warranty</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                  <RotateCcw className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="font-bold leading-tight">7-Day Free Returns</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <span className="font-bold leading-tight">OTP Delivery Proof</span>
                </div>
              </div>

            </div>
          </div>

          {/* BOTTOM TABS SECTION: Overview | Specifications | Reviews | Seller Info */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            {/* Tab Navigation Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-px">
              {[
                { id: 'overview', label: '📖 Overview & Description' },
                { id: 'bundle', label: '🎁 Combo Bundle & Save 10%' },
                { id: 'specs', label: `⚙️ Specifications (${specs.length})` },
                { id: 'reviews', label: `⭐ Reviews & Ratings (${sampleReviews.length})` },
                { id: 'qna', label: '💬 Customer Q&A' },
                { id: 'seller', label: '🏪 Merchant Information' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-xs font-black rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
                    activeTab === tab.id
                      ? 'border-amber-500 text-slate-950 bg-amber-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="py-5">
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-4 text-slate-700 text-xs sm:text-sm leading-relaxed animate-fade-in">
                  <p className="font-medium text-slate-600">{product.description}</p>
                  
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Key Product Highlights
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 font-medium">
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>Engineered with premium durable materials for long-lasting performance</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>Factory calibrated for optimal acoustics and energy efficiency</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>Seamless compatibility across Android, iOS, and PC ecosystems</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>Certified BIS / CE standards with full manufacturer compliance</span>
                      </li>
                    </ul>
                  </div>

                  {/* Point #20: Frequently Bought Together Combo Module */}
                  <div className="pt-2">
                    <FrequentlyBoughtTogether
                      productId={product._id}
                      mainProduct={product}
                      onAddBundleToCart={(items) => {
                        items.forEach(it => onAddToCart(it, null, 1));
                      }}
                    />
                  </div>

                  <div className="text-[11px] text-slate-400">
                    <span className="font-bold text-slate-600">Tags: </span>
                    {product.tags?.map((t, idx) => (
                      <span key={idx} className="mr-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: COMBO BUNDLE */}
              {activeTab === 'bundle' && (
                <div className="animate-fade-in py-2">
                  <FrequentlyBoughtTogether
                    productId={product._id}
                    mainProduct={product}
                    onAddBundleToCart={(items) => {
                      items.forEach(it => onAddToCart(it, null, 1));
                    }}
                  />
                </div>
              )}

              {/* TAB 3: SPECIFICATIONS */}
              {activeTab === 'specs' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-xs text-left">
                      <tbody>
                        {specs.map((item, idx) => (
                          <tr
                            key={idx}
                            className={`border-b border-slate-100 last:border-0 ${
                              idx % 2 === 0 ? 'bg-slate-50/70' : 'bg-white'
                            }`}
                          >
                            <td className="py-3 px-4 font-black text-slate-800 w-1/3 sm:w-1/4">
                              {item.key}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-600">
                              {item.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: REVIEWS & RATINGS (Point #15) */}
              {activeTab === 'reviews' && (
                <div className="animate-fade-in">
                  <ProductReviewsSection
                    productId={product._id}
                    productTitle={product.title}
                    initialAverageRating={product.ratingsAverage || 4.8}
                    initialTotalReviews={product.ratingsQuantity || 42}
                  />
                </div>
              )}

              {/* TAB 4: CUSTOMER Q&A (Point #16) */}
              {activeTab === 'qna' && (
                <div className="animate-fade-in">
                  <ProductQnASection
                    productId={product._id}
                    productTitle={product.title}
                  />
                </div>
              )}

              {/* TAB 5: SELLER INFORMATION */}
              {activeTab === 'seller' && (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-fade-in text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-md">
                      {product.vendor?.storeName?.[0] || 'A'}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                        {product.vendor?.storeName || 'AuraAudio Verified Merchant'}
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                      </h4>
                      <p className="text-slate-500 text-[11px]">
                        Registered Marketplace Merchant since 2024
                      </p>
                    </div>
                  </div>

                  {isVendorOnVacation && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-center gap-2.5 font-bold text-xs">
                      <Palmtree className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Merchant is on vacation mode{vacationEndDate ? ` until ${vacationEndDate}` : ''}. {isOrderingPaused ? 'Orders are temporarily paused.' : 'Orders will be dispatched upon return.'}
                      </span>
                    </div>
                  )}

                  {onOpenVendorStore && product.vendor && (
                    <button
                      type="button"
                      onClick={() => onOpenVendorStore(product.vendor)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm w-fit"
                    >
                      <Store className="w-3.5 h-3.5 text-amber-400" />
                      <span>Visit {product.vendor?.storeName || 'Merchant'} Storefront</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  )}

                  <p className="text-slate-600 font-medium">
                    {product.vendor?.description ||
                      'Authorized distributor offering genuine branded products with official warranty and direct doorstep express shipping.'}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Seller Rating</span>
                      <span className="text-sm font-black text-slate-900">★ {product.vendor?.rating || '4.8'} / 5.0</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Fulfillment Rate</span>
                      <span className="text-sm font-black text-emerald-700">99.4% On Time</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Returns Accepted</span>
                      <span className="text-sm font-black text-slate-900">7 Days Return</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Point #21: Related Products & Customers Also Viewed Recommendation Sliders */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <ProductRecommendationSlider
              productId={product._id}
              mainProduct={product}
              onSelectProduct={(item) => {
                if (onSelectProduct) {
                  onSelectProduct(item);
                }
              }}
              onAddToCart={(item, variant, qty) => {
                if (onAddToCart) {
                  onAddToCart(item, variant, qty);
                }
              }}
            />
          </div>

        </div>

      </div>

      {/* Point 4: Interactive Apparel Size Guide & Measurements Modal */}
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        productTitle={product.title}
        currentSelectedSize={selectedVariant?.attributes?.size || ''}
        onSelectSize={(sz) => {
          handleSelectSize(sz);
        }}
      />

      {/* Point 6: Smart Price Drop Alert Subscription Modal */}
      <PriceDropAlertModal
        isOpen={isPriceDropModalOpen}
        onClose={() => setIsPriceDropModalOpen(false)}
        product={product}
      />
    </div>
  );
};
