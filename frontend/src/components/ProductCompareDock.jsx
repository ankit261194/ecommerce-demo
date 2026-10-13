import React from 'react';
import { ArrowLeftRight, X, Sparkles, Check } from 'lucide-react';

export const ProductCompareDock = ({
  compareIds = [],
  allProducts = [],
  onRemoveItem,
  onClearAll,
  onOpenModal,
}) => {
  if (compareIds.length === 0) return null;

  const selectedProducts = compareIds
    .map(id => allProducts.find(p => p._id === id || p.id === id))
    .filter(Boolean);

  const canCompare = selectedProducts.length >= 2;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl bg-slate-900/95 backdrop-blur-md text-white p-2.5 sm:p-3 rounded-2xl shadow-2xl border border-slate-700/80 animate-slide-up flex items-center justify-between gap-3">
      
      {/* Left: Indicator & Thumbnails */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black flex-shrink-0 shadow">
          <ArrowLeftRight className="w-4 h-4" />
        </div>

        <div className="hidden sm:block leading-tight flex-shrink-0 pr-1">
          <span className="text-xs font-black text-white block">
            Compare ({selectedProducts.length}/4)
          </span>
          <span className="text-[10px] text-slate-400">
            {canCompare ? 'Ready to compare' : 'Add 1 more item'}
          </span>
        </div>

        {/* Selected Product Thumbnails */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {selectedProducts.map(prod => (
            <div
              key={prod._id}
              className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white p-0.5 border border-slate-600 flex-shrink-0 group"
            >
              <img
                src={prod.image || prod.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100'}
                alt={prod.title}
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                onClick={() => onRemoveItem(prod._id)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-800 text-white hover:bg-rose-500 flex items-center justify-center transition-colors shadow"
                title="Remove"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}

          {/* Empty slot indicators up to 4 */}
          {Array.from({ length: 4 - selectedProducts.length }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-dashed border-slate-700/80 flex items-center justify-center text-slate-600 text-[10px] font-bold flex-shrink-0"
            >
              +{idx + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onClearAll}
          className="text-[11px] font-bold text-slate-400 hover:text-white px-2 py-1 rounded transition-colors hidden sm:inline"
        >
          Clear
        </button>

        <button
          onClick={onOpenModal}
          disabled={!canCompare}
          className="px-3.5 sm:px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          <span>Compare Now</span>
          <ArrowLeftRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};

export default ProductCompareDock;
