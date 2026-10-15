import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowLeftRight,
  ShoppingBag,
  Star,
  Check,
  AlertCircle,
  Sparkles,
  Zap,
  CheckCircle2,
  Trash2,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import StockUrgencyBadge from './StockUrgencyBadge';
import api from '../api/client';
import { useLocalization } from '../context/LocalizationContext';

export const ProductCompareModal = ({
  isOpen,
  onClose,
  productIds = [],
  allProducts = [],
  onRemoveProduct,
  onClearAll,
  onAddToCart,
  onOpenProductPDP,
}) => {
  const [loading, setLoading] = useState(false);
  const [compareData, setCompareData] = useState(null);
  const { formatPrice } = useLocalization();
  const [highlightDifferences, setHighlightDifferences] = useState(false);

  useEffect(() => {
    if (isOpen && productIds.length >= 2) {
      setLoading(true);
      api.post('/products/compare', { productIds })
        .then(res => {
          if (res.data?.success) {
            setCompareData(res.data);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch comparison matrix:', err);
          // Fallback to local matrix using allProducts
          const selected = productIds
            .map(id => allProducts.find(p => p._id === id || p.id === id))
            .filter(Boolean);

          const specsMatrix = [
            {
              attribute: 'Brand',
              values: selected.map(p => p.brand || 'AuraMarket Direct'),
              isDifferent: new Set(selected.map(p => p.brand)).size > 1,
            },
            {
              attribute: 'Category',
              values: selected.map(p => p.category?.name || p.category || 'General'),
              isDifferent: new Set(selected.map(p => p.category?.name || p.category)).size > 1,
            },
            {
              attribute: 'Price',
              values: selected.map(p => formatPrice(p.sellingPrice || p.price || 0)),
              isDifferent: new Set(selected.map(p => p.sellingPrice || p.price)).size > 1,
            },
            {
              attribute: 'Customer Rating',
              values: selected.map(p => `★ ${p.ratingsAverage || 4.5} (${p.ratingsQuantity || 12} reviews)`),
              isDifferent: new Set(selected.map(p => p.ratingsAverage)).size > 1,
            },
            {
              attribute: 'Warranty',
              values: selected.map(() => '1 Year Official Manufacturer Warranty'),
              isDifferent: false,
            },
            {
              attribute: 'Return Policy',
              values: selected.map(() => '7-Day Free Replacement'),
              isDifferent: false,
            },
            {
              attribute: 'Delivery Speed',
              values: selected.map(() => 'Express 48h Delivery with OTP'),
              isDifferent: false,
            },
          ];

          setCompareData({
            products: selected,
            specsMatrix,
          });
          setLoading(false);
        });
    }
  }, [isOpen, productIds, allProducts]);

  if (!isOpen) return null;

  const products = compareData?.products || [];
  const specsMatrix = compareData?.specsMatrix || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base tracking-tight flex items-center gap-2">
                <span>Side-by-Side Product Comparison</span>
                <span className="bg-amber-400 text-slate-950 text-[11px] font-black px-2 py-0.5 rounded-full">
                  {products.length} Products
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Compare specifications, prices, and features</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Highlight Differences Switch */}
            <button
              onClick={() => setHighlightDifferences(!highlightDifferences)}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                highlightDifferences
                  ? 'bg-amber-400 text-slate-950 border-amber-400 shadow'
                  : 'bg-white/10 hover:bg-white/15 text-slate-300 border-white/10'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Highlight Differences</span>
            </button>

            {onClearAll && (
              <button
                onClick={() => {
                  onClearAll();
                  onClose();
                }}
                className="text-xs font-bold text-slate-400 hover:text-rose-400 px-2.5 py-1.5 rounded-xl transition-colors"
              >
                Clear All
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Generating comparison matrix...</p>
            </div>
          ) : products.length < 2 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                <ArrowLeftRight className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-900 text-base">Select at least 2 products to compare</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click the compare icon on product cards to add 2 to 4 items for a side-by-side spec comparison.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="p-3 text-left w-44 min-w-[140px] text-slate-400 font-extrabold uppercase text-[10px] tracking-wider align-top bg-slate-50/70 rounded-l-2xl">
                      Product Overview
                    </th>
                    {products.map(prod => (
                      <th
                        key={prod._id}
                        className="p-3 text-left min-w-[200px] max-w-[240px] align-top relative group"
                      >
                        <div className="space-y-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 transition-all">
                          {/* Thumbnail & Remove */}
                          <div className="relative">
                            <div
                              onClick={() => {
                                if (onOpenProductPDP) onOpenProductPDP(prod);
                                onClose();
                              }}
                              className="w-full h-36 rounded-xl overflow-hidden bg-white border border-slate-200 cursor-pointer relative group/img"
                            >
                              <img
                                src={prod.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'}
                                alt={prod.title}
                                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Eye className="w-5 h-5" />
                              </div>
                            </div>

                            <button
                              onClick={() => onRemoveProduct(prod._id)}
                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-900 hover:bg-rose-600 text-white flex items-center justify-center shadow-md transition-all"
                              title="Remove from comparison"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Brand & Title */}
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
                              {prod.brand || 'AuraMarket'}
                            </span>
                            <h4
                              onClick={() => {
                                if (onOpenProductPDP) onOpenProductPDP(prod);
                                onClose();
                              }}
                              className="font-black text-xs text-slate-900 line-clamp-2 hover:text-amber-600 cursor-pointer transition-colors"
                            >
                              {prod.title}
                            </h4>
                          </div>

                          {/* Price & MRP */}
                          <div className="space-y-0.5">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-black text-base text-slate-950">
                                {formatPrice(prod.sellingPrice || 0)}
                              </span>
                              {prod.mrp && prod.mrp > prod.sellingPrice && (
                                <span className="text-[11px] text-slate-400 line-through">
                                  {formatPrice(prod.mrp)}
                                </span>
                              )}
                            </div>
                            <StockUrgencyBadge stock={prod.stock ?? 10} variant="compact" showPulse={false} />
                          </div>

                          {/* Add to Cart Button */}
                          <button
                            onClick={() => onAddToCart(prod)}
                            disabled={(prod.stock ?? 10) <= 0}
                            className="w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-black text-xs shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Add to Cart</span>
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {specsMatrix.map((spec, sIdx) => {
                    const isDiff = highlightDifferences && spec.isDifferent;
                    return (
                      <tr
                        key={sIdx}
                        className={`transition-colors ${
                          isDiff
                            ? 'bg-amber-50/80 font-bold'
                            : sIdx % 2 === 0
                            ? 'bg-slate-50/40'
                            : 'bg-white'
                        }`}
                      >
                        <td className="py-3 px-4 font-black text-slate-800 text-xs w-44 bg-slate-50/60 border-r border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <span>{spec.attribute}</span>
                            {isDiff && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Different across products" />
                            )}
                          </div>
                        </td>
                        {spec.values.map((val, vIdx) => (
                          <td
                            key={vIdx}
                            className="py-3 px-4 text-slate-700 font-medium text-xs border-r border-slate-100 last:border-r-0"
                          >
                            {val}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Select up to 4 products from the catalog to compare simultaneously.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black transition-all"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProductCompareModal;
