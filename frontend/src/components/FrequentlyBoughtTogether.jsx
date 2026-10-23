import React, { useState, useEffect } from 'react';
import { Plus, ShoppingBag, Sparkles, Check, CheckCircle2, ShieldCheck } from 'lucide-react';
import api from '../api/client';
import { useLocalization } from '../context/LocalizationContext';

export const FrequentlyBoughtTogether = ({
  productId,
  mainProduct,
  onAddBundleToCart,
}) => {
  const [bundleData, setBundleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const { formatPrice, t } = useLocalization();

  useEffect(() => {
    const id = productId || mainProduct?._id || mainProduct?.slug;
    if (!id) return;

    setLoading(true);
    api.get(`/products/${id}/bundle`)
      .then(res => {
        if (res.data?.success && res.data.bundleItems?.length > 0) {
          setBundleData(res.data);
          const allIds = new Set([
            res.data.mainProduct._id,
            ...res.data.bundleItems.map(item => item._id),
          ]);
          setSelectedIds(allIds);
        }
        setLoading(false);
      })
      .catch(() => {
        setBundleData(null);
        setLoading(false);
      });
  }, [productId, mainProduct]);

  if (loading || !bundleData || !bundleData.bundleItems || bundleData.bundleItems.length === 0) {
    return null;
  }

  const allItems = [bundleData.mainProduct, ...bundleData.bundleItems];

  const handleToggleItem = (itemId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        if (next.size <= 1) return prev; // Keep at least one item
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Calculate dynamic bundle prices for currently selected items
  const selectedItems = allItems.filter(item => selectedIds.has(item._id));
  const rawSellingTotal = selectedItems.reduce((acc, item) => acc + (item.sellingPrice || 0), 0);
  const rawMrpTotal = selectedItems.reduce((acc, item) => acc + (item.mrp || Math.round(item.sellingPrice * 1.4)), 0);

  // Bundle combo discount: 10% additional off when at least 2 items are selected
  const hasBundleDiscount = selectedItems.length >= 2;
  const bundleDiscountPercent = hasBundleDiscount ? 10 : 0;
  const bundleDiscountAmount = Math.round((rawSellingTotal * bundleDiscountPercent) / 100);
  const finalBundlePrice = rawSellingTotal - bundleDiscountAmount;
  const totalSavings = rawMrpTotal - finalBundlePrice;

  const handleAddToCart = () => {
    if (onAddBundleToCart) {
      onAddBundleToCart(selectedItems);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/60 via-white to-slate-50 border border-amber-200/80 shadow-sm space-y-4">
      {/* Title & Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-sm">
            <Sparkles className="w-4 h-4 fill-slate-950" />
          </div>
          <div>
            <h4 className="font-black text-sm sm:text-base text-slate-900 tracking-tight">
              Frequently Bought Together
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Save extra 10% when you purchase this bundle combination
            </p>
          </div>
        </div>

        {hasBundleDiscount && (
          <span className="bg-emerald-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Combo Save 10% OFF</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left: Product Images with Plus icons */}
        <div className="lg:col-span-7 flex items-center justify-start gap-2 sm:gap-3 overflow-x-auto py-1">
          {allItems.map((item, idx) => {
            const isSelected = selectedIds.has(item._id);
            return (
              <React.Fragment key={item._id}>
                {idx > 0 && (
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center flex-shrink-0 font-black text-xs">
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
                <div
                  onClick={() => handleToggleItem(item._id)}
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-1 border-2 transition-all cursor-pointer flex-shrink-0 relative overflow-hidden group shadow-sm ${
                    isSelected
                      ? 'border-amber-500 ring-2 ring-amber-400/20'
                      : 'border-slate-200 opacity-40 hover:opacity-75'
                  }`}
                  title={`${item.title} — Click to toggle`}
                >
                  <img
                    src={item.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'}
                    alt={item.title}
                    className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform"
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Right: Price & 1-Click Bundle Add */}
        <div className="lg:col-span-5 p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
              Bundle Total ({selectedItems.length} items):
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-slate-950">
                {formatPrice(finalBundlePrice)}
              </span>
              {rawMrpTotal > finalBundlePrice && (
                <span className="text-xs text-slate-400 line-through">
                  {formatPrice(rawMrpTotal)}
                </span>
              )}
            </div>
            {totalSavings > 0 && (
              <p className="text-[11px] font-black text-emerald-600">
                {t('save', 'You save')} {formatPrice(totalSavings)} with this combo!
              </p>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 transform active:scale-98"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            <span>Add All {selectedItems.length} to Cart</span>
          </button>
        </div>
      </div>

      {/* Item Checkbox Selector List */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        {allItems.map((item, idx) => {
          const isSelected = selectedIds.has(item._id);
          const isMain = idx === 0;

          return (
            <label
              key={item._id}
              className={`flex items-start gap-2.5 text-xs cursor-pointer select-none transition-colors ${
                isSelected ? 'text-slate-800' : 'text-slate-400 line-through'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggleItem(item._id)}
                className="mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
              />
              <span className="font-medium leading-relaxed">
                <strong className="text-slate-900 font-black">
                  {isMain ? 'This item: ' : ''}
                </strong>
                {item.title} —{' '}
                <span className="font-black text-slate-900">
                  {formatPrice(item.sellingPrice || 0)}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default FrequentlyBoughtTogether;
