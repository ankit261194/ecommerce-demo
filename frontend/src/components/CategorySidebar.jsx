import React, { useState } from 'react';
import {
  FolderTree,
  ChevronRight,
  ChevronDown,
  Layers,
  Headphones,
  Shirt,
  Watch,
  Home,
  Sparkles,
  Check,
  X,
  Filter,
  SlidersHorizontal,
  Tag,
  Radio,
} from 'lucide-react';

const CATEGORY_ICON_MAP = {
  'electronics-audio': Headphones,
  'fashion': Shirt,
  'watches-accessories': Watch,
  'home-kitchen': Home,
};

export default function CategorySidebar({
  categoriesTree = [],
  selectedCategory = 'all',
  selectedSubCategory = null,
  onSelectCategory,
  onSelectSubCategory,
  onResetAll,
  totalProductsCount = 0,
  isOpenMobile = false,
  onCloseMobile = () => {},
  isCollapsedDesktop = false,
  onToggleCollapseDesktop = () => {},
  wishlistCount = 0,
}) {
  // Keep track of which parent categories are expanded in accordion
  const [expandedParents, setExpandedParents] = useState({
    'electronics-audio': true,
    'fashion': true,
    'watches-accessories': true,
    'home-kitchen': true,
  });

  const toggleExpand = (slug, e) => {
    e.stopPropagation();
    setExpandedParents(prev => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  };

  const renderContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 shadow-sm">
            <FolderTree className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-black text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
              Categories
              <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded-full">
                Tree
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">Browse by hierarchy</p>
          </div>
        </div>

        {/* 1-Click Reset Button */}
        {(selectedCategory !== 'all' || selectedSubCategory) && (
          <button
            type="button"
            onClick={onResetAll}
            className="text-[11px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100/80 px-2 py-1 rounded-lg transition-all border border-amber-200/60"
            title="Reset to All Categories"
          >
            ✕ Reset
          </button>
        )}
      </div>

      {/* Categories Tree Accordion List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-device-scrollbar">
        {/* All Products Root Option */}
        <button
          type="button"
          onClick={() => {
            onResetAll();
            if (isOpenMobile) onCloseMobile();
          }}
          className={`w-full group text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
            selectedCategory === 'all' && !selectedSubCategory
              ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
              : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-sm">🛍️</span>
            <span>All Products</span>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              selectedCategory === 'all' && !selectedSubCategory
                ? 'bg-slate-950 text-amber-400'
                : 'bg-slate-200/80 text-slate-600 group-hover:bg-slate-300'
            }`}
          >
            {totalProductsCount}
          </span>
        </button>

        {/* Wishlist Quick Option */}
        <button
          type="button"
          onClick={() => {
            onSelectCategory('wishlist');
            if (isOpenMobile) onCloseMobile();
          }}
          className={`w-full group text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
            selectedCategory === 'wishlist'
              ? 'bg-rose-50 text-rose-700 border border-rose-300 font-black shadow-sm'
              : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-sm">❤️</span>
            <span>Saved Wishlist</span>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              selectedCategory === 'wishlist'
                ? 'bg-rose-500 text-white'
                : 'bg-slate-200/80 text-slate-600 group-hover:bg-slate-300'
            }`}
          >
            {wishlistCount}
          </span>
        </button>

        <div className="pt-2 pb-1 px-1">
          <div className="h-px bg-slate-100" />
        </div>

        {/* Master Categories and Nested Subcategories */}
        {categoriesTree.map(category => {
          const isParentActive = selectedCategory === category.slug && !selectedSubCategory;
          const isAnyChildActive =
            selectedCategory === category.slug && Boolean(selectedSubCategory);
          const isExpanded = expandedParents[category.slug] ?? true;
          const IconComponent = CATEGORY_ICON_MAP[category.slug] || Layers;

          return (
            <div
              key={category._id || category.slug}
              className={`rounded-2xl transition-all border ${
                isParentActive || isAnyChildActive
                  ? 'border-amber-300/80 bg-amber-50/30'
                  : 'border-transparent hover:border-slate-200/60 bg-transparent'
              }`}
            >
              {/* Parent Category Row */}
              <div
                onClick={() => {
                  onSelectCategory(category.slug);
                  if (isOpenMobile && (!category.subcategories || category.subcategories.length === 0)) {
                    onCloseMobile();
                  }
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer group ${
                  isParentActive
                    ? 'bg-amber-400/25 text-slate-950 font-black'
                    : 'text-slate-850 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg transition-all ${
                      isParentActive
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-100 text-slate-600 group-hover:text-amber-600 group-hover:bg-amber-50'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <span className="truncate">{category.name}</span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Category Product Count Badge */}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${
                      isParentActive
                        ? 'bg-slate-950 text-amber-400'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                    }`}
                  >
                    {category.productCount || 0}
                  </span>

                  {/* Accordion Expand/Collapse Chevron */}
                  {category.subcategories && category.subcategories.length > 0 && (
                    <button
                      type="button"
                      onClick={e => toggleExpand(category.slug, e)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all"
                      title={isExpanded ? 'Collapse subcategories' : 'Expand subcategories'}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Nested Subcategories List */}
              {isExpanded && category.subcategories && category.subcategories.length > 0 && (
                <div className="ml-5 pl-3 border-l-2 border-amber-300/40 my-1 space-y-1 py-1">
                  {category.subcategories.map(sub => {
                    const isSubActive =
                      selectedSubCategory === sub.slug || selectedSubCategory === sub._id;

                    return (
                      <button
                        key={sub._id || sub.slug}
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onSelectSubCategory(category.slug, sub.slug);
                          if (isOpenMobile) onCloseMobile();
                        }}
                        className={`w-full group text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-between ${
                          isSubActive
                            ? 'bg-slate-950 text-amber-400 font-black shadow-sm'
                            : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                              isSubActive
                                ? 'bg-amber-400 ring-2 ring-amber-400/40'
                                : 'bg-slate-300 group-hover:bg-amber-500'
                            }`}
                          />
                          <span className="truncate">{sub.name}</span>
                        </div>

                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                            isSubActive
                              ? 'bg-amber-400/20 text-amber-300'
                              : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                          }`}
                        >
                          {sub.productCount || 0}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info Box */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/60 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Tag className="w-3 h-3 text-amber-500" />
          <span>Point #4 Verified Hierarchy</span>
        </span>
        <span className="font-bold text-slate-600">{totalProductsCount} Items</span>
      </div>
    </div>
  );

  return (
    <>
      {/* 🖥️ Desktop Sticky Sidebar */}
      <aside
        className={`hidden lg:block transition-all duration-300 flex-shrink-0 ${
          isCollapsedDesktop ? 'w-12' : 'w-64 xl:w-72'
        }`}
      >
        {isCollapsedDesktop ? (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-2 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={onToggleCollapseDesktop}
              className="p-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-600 transition-all"
              title="Expand Category Tree"
            >
              <FolderTree className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div className="writing-mode-vertical text-[11px] font-black tracking-widest text-slate-400 uppercase py-2">
              Categories
            </div>
            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
              {totalProductsCount}
            </span>
          </div>
        ) : (
          <div className="sticky top-24 bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden h-[calc(100vh-8rem)]">
            {renderContent()}
          </div>
        )}
      </aside>

      {/* 📱 Mobile / Tablet Slide-Over Drawer Modal */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer Sheet */}
          <div className="relative ml-0 mr-auto w-full max-w-xs sm:max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-300">
            <div className="p-3 border-b border-slate-150 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-amber-400" />
                <span className="font-extrabold text-sm">Product Categories</span>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">{renderContent()}</div>
          </div>
        </div>
      )}
    </>
  );
}
