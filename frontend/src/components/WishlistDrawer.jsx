import React from 'react';
import {
  X,
  Heart,
  ShoppingBag,
  Trash2,
  Sparkles,
  ArrowRight,
  Eye,
  AlertCircle,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import StockUrgencyBadge from './StockUrgencyBadge';

export const WishlistDrawer = ({
  isOpen,
  onClose,
  wishlist = [],
  products = [],
  onMoveToCart,
  onRemoveItem,
  onClearWishlist,
  onOpenProduct,
}) => {
  if (!isOpen) return null;

  // Resolve wishlisted products
  const savedProducts = wishlist
    .map(item => {
      const id = typeof item === 'object' && item.product ? item.product._id || item.product : item;
      const found = products.find(p => p._id === id || p.id === id);
      if (found) return found;
      if (typeof item === 'object' && item.product && item.product.title) return item.product;
      return null;
    })
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base tracking-tight flex items-center gap-2">
                  <span>Saved Wishlist</span>
                  <span className="bg-rose-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full">
                    {savedProducts.length}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">Save for later & 1-click cart move</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {savedProducts.length > 0 && (
                <button
                  onClick={onClearWishlist}
                  className="text-[11px] font-bold text-slate-400 hover:text-rose-400 px-2 py-1 rounded transition-colors"
                  title="Clear all saved items"
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

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {savedProducts.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 mx-auto flex items-center justify-center text-rose-400">
                  <Heart className="w-8 h-8 stroke-[1.5]" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-slate-900 text-base">Your Wishlist is Empty</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Tap the heart icon on any product to save your favorites for later!
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow transition-all"
                >
                  Explore Catalog
                </button>
              </div>
            ) : (
              savedProducts.map(product => {
                const discount = product.mrp && product.mrp > product.sellingPrice
                  ? Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100)
                  : 0;

                return (
                  <div
                    key={product._id || product.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 shadow-sm transition-all group"
                  >
                    <div className="flex gap-3">
                      {/* Product Thumbnail */}
                      <div
                        onClick={() => {
                          if (onOpenProduct) onOpenProduct(product);
                          onClose();
                        }}
                        className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 cursor-pointer relative group/img border border-slate-100"
                      >
                        <img
                          src={product.image || product.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300'}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 truncate">
                              {product.brand || product.category || 'AuraMarket'}
                            </span>
                            <button
                              onClick={() => onRemoveItem(product._id || product.id)}
                              className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors"
                              title="Remove from wishlist"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <h5
                            onClick={() => {
                              if (onOpenProduct) onOpenProduct(product);
                              onClose();
                            }}
                            className="font-bold text-xs text-slate-900 truncate hover:text-amber-600 cursor-pointer transition-colors"
                          >
                            {product.title}
                          </h5>

                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="font-black text-sm text-slate-950">
                              {formatPrice(product.sellingPrice || product.price || 0)}
                            </span>
                            {product.mrp && product.mrp > (product.sellingPrice || product.price) && (
                              <span className="text-[10px] text-slate-400 line-through">
                                {formatPrice(product.mrp)}
                              </span>
                            )}
                            {discount > 0 && (
                              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded">
                                {discount}% OFF
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stock Urgency & Action */}
                        <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 mt-2">
                          <StockUrgencyBadge stock={product.stock ?? 10} variant="compact" showPulse={false} />

                          <button
                            onClick={() => onMoveToCart(product)}
                            disabled={(product.stock ?? 10) <= 0}
                            className="py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-[11px] shadow-sm hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Move to Cart</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          {savedProducts.length > 0 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>Total Items in Wishlist:</span>
                <span className="font-black text-slate-950">{savedProducts.length} items</span>
              </div>
              <button
                onClick={() => {
                  savedProducts.forEach(prod => {
                    if ((prod.stock ?? 10) > 0) onMoveToCart(prod);
                  });
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Move All Available to Cart</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WishlistDrawer;
