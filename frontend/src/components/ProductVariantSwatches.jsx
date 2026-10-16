import React, { useState } from 'react';
import {
  Check,
  Copy,
  CheckCheck,
  Ruler,
  AlertCircle,
  Sparkles,
  Layers,
  Tag,
} from 'lucide-react';
import StockUrgencyBadge from './StockUrgencyBadge';

// Intelligent Color Resolver
export const resolveColorHex = (colorName, fallback = '#475569') => {
  if (!colorName) return fallback;
  const c = colorName.toLowerCase().trim();
  if (c.includes('black') || c.includes('obsidian') || c.includes('midnight') || c.includes('dark')) return '#0f172a';
  if (c.includes('silver') || c.includes('platinum') || c.includes('slate') || c.includes('grey') || c.includes('gray')) return '#94a3b8';
  if (c.includes('white') || c.includes('snow') || c.includes('pearl') || c.includes('ivory')) return '#f8fafc';
  if (c.includes('red') || c.includes('crimson') || c.includes('ruby') || c.includes('scarlet')) return '#ef4444';
  if (c.includes('blue') || c.includes('navy') || c.includes('cobalt') || c.includes('sapphire')) return '#2563eb';
  if (c.includes('green') || c.includes('emerald') || c.includes('olive') || c.includes('mint')) return '#10b981';
  if (c.includes('gold') || c.includes('amber') || c.includes('yellow') || c.includes('champagne')) return '#f59e0b';
  if (c.includes('purple') || c.includes('violet') || c.includes('amethyst')) return '#8b5cf6';
  if (c.includes('pink') || c.includes('rose') || c.includes('blush')) return '#f43f5e';
  if (c.includes('orange') || c.includes('coral')) return '#f97316';
  if (c.includes('brown') || c.includes('tan') || c.includes('espresso')) return '#78350f';
  return fallback;
};

export default function ProductVariantSwatches({
  product,
  selectedVariant,
  onSelectVariant,
  onSwitchImage,
  onOpenSizeGuide,
  formatPrice = price => `₹${Number(price).toLocaleString('en-IN')}`,
  compact = false,
}) {
  const [copiedSku, setCopiedSku] = useState(false);
  const [viewMode, setViewMode] = useState('both'); // 'colors' | 'images' | 'both'

  if (!product || !product.variants || product.variants.length === 0) {
    return null;
  }

  const basePrice = product.sellingPrice || product.price || 0;

  // Extract Swatch Matrix: Colors, Sizes, and Image Thumbnails
  const colorsList = React.useMemo(() => {
    const map = new Map();
    product.variants.forEach(v => {
      const colorName = v.attributes?.color || (v.name && v.name.split('/')[1]?.trim()) || 'Standard';
      const hex = v.colorCode || v.attributes?.colorCode || resolveColorHex(colorName);
      const img = v.image || (product.images && product.images[0]) || product.image;
      if (!map.has(colorName.toLowerCase())) {
        map.set(colorName.toLowerCase(), {
          name: colorName,
          hex,
          image: img,
          variants: [v],
          totalStock: v.stock || 0,
        });
      } else {
        const item = map.get(colorName.toLowerCase());
        item.variants.push(v);
        item.totalStock += (v.stock || 0);
        if (!item.image && v.image) item.image = v.image;
      }
    });
    return Array.from(map.values());
  }, [product.variants, product.images, product.image]);

  const sizesList = React.useMemo(() => {
    const set = new Set();
    product.variants.forEach(v => {
      const sz = v.attributes?.size || v.attributes?.storage || (v.name && v.name.split('/')[0]?.trim());
      if (sz) set.add(sz);
    });
    return Array.from(set);
  }, [product.variants]);

  // Handle color selection
  const handleColorClick = (colorItem) => {
    const currentSize = selectedVariant?.attributes?.size;
    // Find variant matching this color and current size, or first variant of this color
    let matched = colorItem.variants.find(v => {
      const vSize = v.attributes?.size || v.attributes?.storage;
      return currentSize && vSize === currentSize;
    });
    if (!matched) matched = colorItem.variants[0];

    if (matched) {
      onSelectVariant(matched);
      if (onSwitchImage) {
        const targetImage = matched.image || colorItem.image;
        if (targetImage) onSwitchImage(targetImage);
      }
    }
  };

  // Handle size selection
  const handleSizeClick = (size) => {
    const currentColor = selectedVariant?.attributes?.color;
    let matched = product.variants.find(v => {
      const vSize = v.attributes?.size || v.attributes?.storage || (v.name && v.name.split('/')[0]?.trim());
      const vColor = v.attributes?.color || (v.name && v.name.split('/')[1]?.trim());
      return vSize === size && currentColor && vColor?.toLowerCase() === currentColor.toLowerCase();
    });
    if (!matched) {
      matched = product.variants.find(v => {
        const vSize = v.attributes?.size || v.attributes?.storage || (v.name && v.name.split('/')[0]?.trim());
        return vSize === size;
      });
    }
    if (matched) {
      onSelectVariant(matched);
      if (onSwitchImage && matched.image) onSwitchImage(matched.image);
    }
  };

  const handleCopySku = (e) => {
    e.stopPropagation();
    const skuToCopy = selectedVariant?.sku || product.sku;
    if (!skuToCopy) return;
    navigator.clipboard.writeText(skuToCopy);
    setCopiedSku(true);
    setTimeout(() => setCopiedSku(false), 2000);
  };

  const activeColor = selectedVariant?.attributes?.color || (selectedVariant?.name && selectedVariant.name.split('/')[1]?.trim());
  const activeSize = selectedVariant?.attributes?.size || selectedVariant?.attributes?.storage || (selectedVariant?.name && selectedVariant.name.split('/')[0]?.trim());

  return (
    <div className={`space-y-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 ${compact ? 'p-2.5' : 'p-4'}`}>
      
      {/* 1. Header with Active Selection & Dynamic SKU Switch Chip */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-700">
          <Layers className="w-4 h-4 text-amber-600" />
          <span>Variant Selection</span>
        </div>

        {/* Dynamic SKU Chip with Click-to-Copy */}
        <button
          type="button"
          onClick={handleCopySku}
          className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-amber-400 text-slate-600 hover:text-slate-900 shadow-xs transition-all active:scale-95"
          title="Click to copy exact variant SKU"
        >
          <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 group-hover:text-amber-600">
            SKU:
          </span>
          <span className="font-mono font-bold text-slate-900 text-xs">
            {selectedVariant?.sku || product.sku}
          </span>
          {copiedSku ? (
            <span className="flex items-center gap-0.5 text-emerald-600 font-extrabold text-[10px] animate-fade-in">
              <CheckCheck className="w-3.5 h-3.5" /> Copied!
            </span>
          ) : (
            <Copy className="w-3 h-3 text-slate-400 group-hover:text-amber-600 transition-colors" />
          )}
        </button>
      </div>

      {/* 2. Interactive Color & Image Swatches */}
      {colorsList.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-black uppercase tracking-wider text-slate-700">
                Color:
              </span>
              <span className="text-amber-600 font-extrabold">
                {activeColor || colorsList[0]?.name}
              </span>
            </div>
            {selectedVariant && (
              <span className={`text-[11px] font-bold ${selectedVariant.stock <= 5 && selectedVariant.stock > 0 ? 'text-amber-600' : selectedVariant.stock === 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                {selectedVariant.stock <= 5 && selectedVariant.stock > 0
                  ? `Only ${selectedVariant.stock} left in this finish!`
                  : selectedVariant.stock === 0
                  ? 'Currently out of stock'
                  : 'In Stock & Ready to Dispatch'}
              </span>
            )}
          </div>

          {/* Swatch Pill & Thumbnail Carousel */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {colorsList.map(item => {
              const isSelected = activeColor && activeColor.toLowerCase() === item.name.toLowerCase();
              const isOutOfStock = item.totalStock <= 0;

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleColorClick(item)}
                  disabled={isOutOfStock}
                  className={`group relative flex items-center gap-2.5 p-1.5 pr-3 rounded-xl border transition-all text-xs font-bold ${
                    isSelected
                      ? 'border-amber-500 bg-white text-slate-950 ring-2 ring-amber-400/40 shadow-md scale-105'
                      : 'border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white'
                  } ${isOutOfStock ? 'opacity-40 cursor-not-allowed bg-slate-100' : ''}`}
                  title={`${item.name} (${item.totalStock} in stock)`}
                >
                  {/* Image Thumbnail Swatch if available */}
                  {item.image ? (
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200/80 shadow-xs flex-shrink-0 bg-slate-100">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                          <div className="w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Pure Color Swatch Dot */
                    <div
                      className="relative w-6 h-6 rounded-full border border-slate-300 shadow-inner flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: item.hex }}
                    >
                      {isSelected && (
                        <Check
                          className={`w-3.5 h-3.5 stroke-[3] ${
                            ['#f8fafc', '#ffffff', '#e2e8f0'].includes(item.hex.toLowerCase())
                              ? 'text-slate-900'
                              : 'text-white'
                          }`}
                        />
                      )}
                    </div>
                  )}

                  {/* Color Label */}
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-slate-800 leading-tight">
                      {item.name}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] text-amber-600 font-black uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Interactive Size / Capacity Chips */}
      {sizesList.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-slate-200/60">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-black uppercase tracking-wider text-slate-700">
                Size / Option:
              </span>
              <span className="text-amber-600 font-extrabold">
                {activeSize || sizesList[0]}
              </span>
            </div>

            {onOpenSizeGuide && (
              <button
                type="button"
                onClick={onOpenSizeGuide}
                className="flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:underline"
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>Size Guide</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {sizesList.map(sz => {
              const isSelected = activeSize === sz;
              // Check if in stock for current active color
              const matchingVar = product.variants.find(v => {
                const vSize = v.attributes?.size || v.attributes?.storage || (v.name && v.name.split('/')[0]?.trim());
                const vColor = v.attributes?.color || (v.name && v.name.split('/')[1]?.trim());
                return vSize === sz && (!activeColor || vColor?.toLowerCase() === activeColor.toLowerCase());
              });
              const isOutOfStock = matchingVar ? matchingVar.stock <= 0 : false;

              return (
                <button
                  key={sz}
                  type="button"
                  onClick={() => handleSizeClick(sz)}
                  disabled={isOutOfStock}
                  className={`min-w-[48px] px-3.5 py-1.5 rounded-xl border text-xs font-black text-center transition-all ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-amber-400 ring-2 ring-amber-400/30 shadow-md scale-105'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  } ${isOutOfStock ? 'opacity-40 cursor-not-allowed line-through bg-slate-100' : ''}`}
                >
                  {sz}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. All Combinations Grid with Instant Switching */}
      <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
          <span>All Available Configurations:</span>
          <span className="text-amber-600 font-bold">
            {product.variants.length} options
          </span>
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
                onClick={() => {
                  onSelectVariant(variant);
                  if (onSwitchImage && variant.image) onSwitchImage(variant.image);
                }}
                disabled={isOutOfStock}
                className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs font-bold transition-all ${
                  isSelected
                    ? 'border-amber-500 bg-white text-slate-950 ring-2 ring-amber-400/30 shadow-sm'
                    : 'border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300 hover:bg-white'
                } ${isOutOfStock ? 'opacity-40 cursor-not-allowed bg-slate-100' : ''}`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  {variant.image ? (
                    <img
                      src={variant.image}
                      alt={variant.name}
                      className="w-8 h-8 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                    />
                  ) : (
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-300 flex-shrink-0"
                      style={{ backgroundColor: variant.colorCode || resolveColorHex(variant.name) }}
                    />
                  )}
                  <div className="min-w-0">
                    <span className="font-extrabold block truncate text-slate-900">{variant.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {variant.sku}
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="font-black text-slate-900 block">
                    {formatPrice(varPrice)}
                  </span>
                  <span className={`text-[10px] font-bold ${variant.stock <= 3 && variant.stock > 0 ? 'text-amber-600' : isOutOfStock ? 'text-red-500' : 'text-slate-400'}`}>
                    {isOutOfStock ? 'Out of stock' : `${variant.stock} left`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
