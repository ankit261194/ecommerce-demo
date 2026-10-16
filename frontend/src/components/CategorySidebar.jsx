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
  ShieldCheck,
  Star,
  Flame,
  BadgePercent,
  CheckCircle2,
  Cpu,
  HardDrive,
  Palette,
  Ruler,
  Battery,
  Sliders,
  RotateCcw,
} from 'lucide-react';

const CATEGORY_ICON_MAP = {
  'electronics-audio': Headphones,
  fashion: Shirt,
  'watches-accessories': Watch,
  'home-kitchen': Home,
};

export default function CategorySidebar({
  categoriesTree = [],
  selectedCategory = 'all',
  selectedSubCategory = null,
  onSelectCategory = () => {},
  onSelectSubCategory = () => {},
  onResetAll = () => {},
  totalProductsCount = 0,
  isOpenMobile = false,
  onCloseMobile = () => {},
  isCollapsedDesktop = false,
  onToggleCollapseDesktop = () => {},
  wishlistCount = 0,
  brandsList = [],
  selectedBrand = 'all',
  onSelectBrand = () => {},
  minRating = 0,
  onSelectRating = () => {},
  ratingsCounts = {},
  inStockOnly = false,
  onToggleInStock = () => {},
  onSaleOnly = false,
  onToggleOnSale = () => {},
  inStockCount = 0,
  onSaleCount = 0,
  // Point 14: Dynamic Multi-Facet Attribute Filtering Props
  facets = null,
  priceRange = [0, 50000],
  onPriceRangeChange = () => {},
  selectedRam = [],
  onToggleRam = () => {},
  selectedStorage = [],
  onToggleStorage = () => {},
  selectedColors = [],
  onToggleColor = () => {},
  selectedSizes = [],
  onToggleSize = () => {},
  selectedFabrics = [],
  onToggleFabric = () => {},
  selectedBatteries = [],
  onToggleBattery = () => {},
  onClearAllFacets = () => {},
  formatPrice = (p) => `₹${p}`,
}) {
  // Keep track of which parent categories are expanded in accordion
  const [expandedParents, setExpandedParents] = useState({
    'electronics-audio': true,
    fashion: true,
    'watches-accessories': true,
    'home-kitchen': true,
  });

  // Keep track of which facet accordion sections are open
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    price: true,
    ram: true,
    storage: true,
    colors: true,
    sizes: true,
    fabrics: true,
    battery: true,
    brands: true,
    ratings: true,
    deals: true,
  });

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleExpand = (slug, e) => {
    e.stopPropagation();
    setExpandedParents((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  };

  // Compute total active filters count
  const activeFiltersCount =
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedSubCategory ? 1 : 0) +
    (selectedBrand !== 'all' ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (onSaleOnly ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < 50000 ? 1 : 0) +
    selectedRam.length +
    selectedStorage.length +
    selectedColors.length +
    selectedSizes.length +
    selectedFabrics.length +
    selectedBatteries.length;

  // Default facet options if facets not yet loaded
  const ramOptions = facets?.ram?.length
    ? facets.ram
    : [
        { value: '4 GB', count: 2 },
        { value: '8 GB', count: 4 },
        { value: '16 GB', count: 2 },
      ];

  const storageOptions = facets?.storage?.length
    ? facets.storage
    : [
        { value: '64 GB', count: 2 },
        { value: '128 GB', count: 4 },
        { value: '256 GB', count: 3 },
      ];

  const colorOptions = facets?.color?.length
    ? facets.color
    : [
        { value: 'Obsidian Black', colorCode: '#0F172A', count: 4 },
        { value: 'Titanium Silver', colorCode: '#94A3B8', count: 3 },
        { value: 'Space Gray', colorCode: '#334155', count: 2 },
        { value: 'Navy Blue', colorCode: '#1E3A8A', count: 2 },
      ];

  const sizeOptions = facets?.size?.length
    ? facets.size
    : [
        { value: 'S', count: 2 },
        { value: 'M', count: 4 },
        { value: 'L', count: 5 },
        { value: 'XL', count: 3 },
      ];

  const fabricOptions = facets?.fabric?.length
    ? facets.fabric
    : [
        { value: '100% Combed French Terry Cotton (450 GSM)', count: 3 },
        { value: '100% Pure European Breathable Linen', count: 2 },
      ];

  const batteryOptions = facets?.battery?.length
    ? facets.battery
    : [
        { value: '420mAh (Up to 7 Days)', count: 2 },
        { value: '40 Hours Playback', count: 3 },
        { value: '8000 mAh All-Day Battery', count: 1 },
      ];

  const renderContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 shadow-sm">
            <SlidersHorizontal className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-black text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
              Filters & Facets
              {activeFiltersCount > 0 && (
                <span className="text-[10px] font-black text-white bg-amber-500 px-2 py-0.5 rounded-full shadow-xs">
                  {activeFiltersCount}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">Multi-facet Smart Grid</p>
          </div>
        </div>

        {/* 1-Click Reset All Active Filters Button */}
        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={() => {
              onResetAll();
              onClearAllFacets();
            }}
            className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg transition-all border border-amber-200/80 flex items-center gap-1"
            title="Reset All Active Filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Active Filter Chips Bar (When active) */}
      {activeFiltersCount > 0 && (
        <div className="px-3 py-2 bg-amber-50/60 border-b border-amber-100 flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-700">
          {selectedCategory !== 'all' && (
            <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-amber-200 shadow-2xs">
              Cat: {selectedCategory}
              <button onClick={() => onSelectCategory('all')} className="text-slate-400 hover:text-slate-700">✕</button>
            </span>
          )}
          {selectedSubCategory && (
            <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-amber-200 shadow-2xs">
              Sub: {selectedSubCategory}
              <button onClick={() => onSelectSubCategory(selectedCategory, null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </span>
          )}
          {selectedBrand !== 'all' && (
            <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-amber-200 shadow-2xs">
              {selectedBrand}
              <button onClick={() => onSelectBrand('all')} className="text-slate-400 hover:text-slate-700">✕</button>
            </span>
          )}
          {selectedRam.map((r) => (
            <span key={r} className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-amber-200 shadow-2xs">
              RAM: {r}
              <button onClick={() => onToggleRam(r)} className="text-slate-400 hover:text-slate-700">✕</button>
            </span>
          ))}
          {selectedStorage.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-amber-200 shadow-2xs">
              ROM: {s}
              <button onClick={() => onToggleStorage(s)} className="text-slate-400 hover:text-slate-700">✕</button>
            </span>
          ))}
          {selectedColors.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-amber-200 shadow-2xs">
              Color: {c}
              <button onClick={() => onToggleColor(c)} className="text-slate-400 hover:text-slate-700">✕</button>
            </span>
          ))}
          {selectedSizes.map((sz) => (
            <span key={sz} className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-amber-200 shadow-2xs">
              Size: {sz}
              <button onClick={() => onToggleSize(sz)} className="text-slate-400 hover:text-slate-700">✕</button>
            </span>
          ))}
          {(priceRange[0] > 0 || priceRange[1] < 50000) && (
            <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-amber-200 shadow-2xs">
              ₹{priceRange[0]} - ₹{priceRange[1]}
              <button onClick={() => onPriceRangeChange([0, 50000])} className="text-slate-400 hover:text-slate-700">✕</button>
            </span>
          )}
        </div>
      )}

      {/* Scrollable Filters Canvas */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-device-scrollbar">
        {/* ================================================================= */}
        {/* 1. Category Tree Section */}
        {/* ================================================================= */}
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => toggleSection('categories')}
            className="w-full flex items-center justify-between text-[11px] font-black text-slate-800 uppercase tracking-wider px-2 py-1 hover:text-amber-600 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-amber-500" />
              Categories
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                expandedSections.categories ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSections.categories && (
            <div className="space-y-1 pt-1 animate-fade-in">
              {/* All Products Root Option */}
              <button
                type="button"
                onClick={() => {
                  onResetAll();
                  if (isOpenMobile) onCloseMobile();
                }}
                className={`w-full group text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                  selectedCategory === 'all' && !selectedSubCategory
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm ring-1 ring-amber-400'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">🛍️</span>
                  <span>All Products</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                    selectedCategory === 'all' && !selectedSubCategory
                      ? 'bg-slate-950 text-amber-400'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {totalProductsCount}
                </span>
              </button>

              {/* Saved Wishlist */}
              <button
                type="button"
                onClick={() => {
                  onSelectCategory('wishlist');
                  if (isOpenMobile) onCloseMobile();
                }}
                className={`w-full group text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                  selectedCategory === 'wishlist'
                    ? 'bg-rose-50 text-rose-700 border border-rose-300 font-black'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">❤️</span>
                  <span>Saved Wishlist</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                    selectedCategory === 'wishlist'
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {wishlistCount}
                </span>
              </button>

              {/* Categories Tree Accordion */}
              {categoriesTree.map((parent) => {
                const isParentActive = selectedCategory === parent.slug;
                const isExpanded = expandedParents[parent.slug];
                const IconComponent = CATEGORY_ICON_MAP[parent.slug] || Layers;

                return (
                  <div key={parent._id || parent.slug} className="rounded-xl overflow-hidden">
                    <div
                      onClick={() => {
                        onSelectCategory(parent.slug);
                        if (isOpenMobile && (!parent.subcategories || parent.subcategories.length === 0)) {
                          onCloseMobile();
                        }
                      }}
                      className={`group w-full px-2.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center justify-between ${
                        isParentActive && !selectedSubCategory
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-400'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <IconComponent
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            isParentActive && !selectedSubCategory ? 'text-slate-950' : 'text-amber-500'
                          }`}
                        />
                        <span className="truncate">{parent.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                            isParentActive && !selectedSubCategory
                              ? 'bg-slate-950 text-amber-400'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {parent.productCount}
                        </span>
                        {parent.subcategories && parent.subcategories.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => toggleExpand(parent.slug, e)}
                            className="p-1 rounded hover:bg-black/10 transition-colors"
                          >
                            <ChevronDown
                              className={`w-3 h-3 text-slate-400 transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Subcategories Accordion */}
                    {isExpanded && parent.subcategories && parent.subcategories.length > 0 && (
                      <div className="ml-4 pl-2 border-l border-slate-200 space-y-1 my-1">
                        {parent.subcategories.map((sub) => {
                          const isSubActive = selectedSubCategory === sub.slug;
                          return (
                            <button
                              key={sub._id || sub.slug}
                              type="button"
                              onClick={() => {
                                onSelectSubCategory(parent.slug, sub.slug);
                                if (isOpenMobile) onCloseMobile();
                              }}
                              className={`w-full text-left px-2 py-1 rounded-lg text-[11px] transition-all flex items-center justify-between ${
                                isSubActive
                                  ? 'bg-slate-900 text-amber-400 font-black'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <span className="truncate">{sub.name}</span>
                              <span className="text-[9px] opacity-75 font-semibold">
                                {sub.productCount}
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
          )}
        </div>

        {/* ================================================================= */}
        {/* 2. Interactive Dual Price Range Slider (Point #3 & Point 14) */}
        {/* ================================================================= */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <button
            type="button"
            onClick={() => toggleSection('price')}
            className="w-full flex items-center justify-between text-[11px] font-black text-slate-800 uppercase tracking-wider px-2 py-1 hover:text-amber-600 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-500" />
              Price Range
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                expandedSections.price ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSections.price && (
            <div className="space-y-3 px-1 pt-1 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                  ₹{priceRange[0].toLocaleString()}
                </span>
                <span className="text-slate-400">to</span>
                <span className="bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                  ₹{priceRange[1].toLocaleString()}
                </span>
              </div>

              {/* Slider Input */}
              <input
                type="range"
                min="0"
                max="50000"
                step="500"
                value={priceRange[1]}
                onChange={(e) => onPriceRangeChange([priceRange[0], Number(e.target.value)])}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />

              <div className="flex items-center gap-1.5 pt-1">
                {[
                  { label: '< ₹3,000', range: [0, 3000] },
                  { label: '₹3k - ₹10k', range: [3000, 10000] },
                  { label: '> ₹10,000', range: [10000, 50000] },
                ].map((tier, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onPriceRangeChange(tier.range)}
                    className="flex-1 py-1 text-[10px] font-bold bg-slate-50 hover:bg-amber-50 hover:text-amber-700 text-slate-600 rounded-md border border-slate-200 transition-all text-center"
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* 3. RAM Filter Section (Point 14) */}
        {/* ================================================================= */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <button
            type="button"
            onClick={() => toggleSection('ram')}
            className="w-full flex items-center justify-between text-[11px] font-black text-slate-800 uppercase tracking-wider px-2 py-1 hover:text-amber-600 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              RAM Memory
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                expandedSections.ram ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSections.ram && (
            <div className="flex flex-wrap gap-1.5 pt-1 animate-fade-in">
              {ramOptions.map((item) => {
                const isSelected = selectedRam.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => onToggleRam(item.value)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{item.value}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold ${
                        isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* 4. Internal Storage (ROM) Filter Section (Point 14) */}
        {/* ================================================================= */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <button
            type="button"
            onClick={() => toggleSection('storage')}
            className="w-full flex items-center justify-between text-[11px] font-black text-slate-800 uppercase tracking-wider px-2 py-1 hover:text-amber-600 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-sky-500" />
              Internal Storage
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                expandedSections.storage ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSections.storage && (
            <div className="flex flex-wrap gap-1.5 pt-1 animate-fade-in">
              {storageOptions.map((item) => {
                const isSelected = selectedStorage.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => onToggleStorage(item.value)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{item.value}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold ${
                        isSelected ? 'bg-sky-800 text-sky-100' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* 5. Color Swatches Filter Section (Point 14) */}
        {/* ================================================================= */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <button
            type="button"
            onClick={() => toggleSection('colors')}
            className="w-full flex items-center justify-between text-[11px] font-black text-slate-800 uppercase tracking-wider px-2 py-1 hover:text-amber-600 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-rose-500" />
              Color Swatches
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                expandedSections.colors ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSections.colors && (
            <div className="grid grid-cols-2 gap-1.5 pt-1 animate-fade-in">
              {colorOptions.map((item) => {
                const isSelected = selectedColors.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => onToggleColor(item.value)}
                    className={`flex items-center gap-2 p-1.5 rounded-xl text-left text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-black/20 flex-shrink-0 shadow-2xs"
                      style={{ backgroundColor: item.colorCode || '#475569' }}
                    />
                    <span className="truncate flex-1 text-[11px]">{item.value}</span>
                    <span
                      className={`text-[9px] px-1 rounded font-semibold ${
                        isSelected ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* 6. Apparel Size Chips Filter Section (Point 14) */}
        {/* ================================================================= */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <button
            type="button"
            onClick={() => toggleSection('sizes')}
            className="w-full flex items-center justify-between text-[11px] font-black text-slate-800 uppercase tracking-wider px-2 py-1 hover:text-amber-600 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-emerald-500" />
              Size
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                expandedSections.sizes ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSections.sizes && (
            <div className="flex flex-wrap gap-1.5 pt-1 animate-fade-in">
              {sizeOptions.map((item) => {
                const isSelected = selectedSizes.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => onToggleSize(item.value)}
                    className={`w-10 h-10 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center transition-all border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{item.value}</span>
                    <span
                      className={`text-[8px] font-semibold leading-none ${
                        isSelected ? 'text-emerald-200' : 'text-slate-400'
                      }`}
                    >
                      ({item.count})
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* 7. Fabric / Material Filter Section (Point 14) */}
        {/* ================================================================= */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <button
            type="button"
            onClick={() => toggleSection('fabrics')}
            className="w-full flex items-center justify-between text-[11px] font-black text-slate-800 uppercase tracking-wider px-2 py-1 hover:text-amber-600 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Shirt className="w-3.5 h-3.5 text-violet-500" />
              Fabric & Material
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                expandedSections.fabrics ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSections.fabrics && (
            <div className="space-y-1 pt-1 animate-fade-in">
              {fabricOptions.map((item) => {
                const isSelected = selectedFabrics.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => onToggleFabric(item.value)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all border ${
                      isSelected
                        ? 'bg-violet-50 text-violet-900 border-violet-300 font-bold'
                        : 'text-slate-700 border-transparent hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate pr-2 text-[11px]">{item.value}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-500">
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* 8. Battery Capacity / Life Filter Section (Point 14) */}
        {/* ================================================================= */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <button
            type="button"
            onClick={() => toggleSection('battery')}
            className="w-full flex items-center justify-between text-[11px] font-black text-slate-800 uppercase tracking-wider px-2 py-1 hover:text-amber-600 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Battery className="w-3.5 h-3.5 text-teal-500" />
              Battery Capacity
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                expandedSections.battery ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSections.battery && (
            <div className="space-y-1 pt-1 animate-fade-in">
              {batteryOptions.map((item) => {
                const isSelected = selectedBatteries.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => onToggleBattery(item.value)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all border ${
                      isSelected
                        ? 'bg-teal-50 text-teal-900 border-teal-300 font-bold'
                        : 'text-slate-700 border-transparent hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate pr-2 text-[11px]">{item.value}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-500">
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* 9. Brand Directory Filter Section (Point #5) */}
        {/* ================================================================= */}
        {brandsList.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={() => toggleSection('brands')}
              className="w-full flex items-center justify-between text-[11px] font-black text-slate-800 uppercase tracking-wider px-2 py-1 hover:text-amber-600 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                Brands
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  expandedSections.brands ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedSections.brands && (
              <div className="space-y-1 pt-1 animate-fade-in">
                {brandsList.map((brand) => {
                  const isBrandActive = selectedBrand === brand.name;
                  return (
                    <button
                      key={brand.name}
                      type="button"
                      onClick={() => {
                        onSelectBrand(isBrandActive ? 'all' : brand.name);
                        if (isOpenMobile) onCloseMobile();
                      }}
                      className={`w-full group text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                        isBrandActive
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-400'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={brand.logo}
                          alt={brand.name}
                          className="w-4 h-4 rounded-full object-cover border border-slate-200 flex-shrink-0"
                        />
                        <span className="truncate">{brand.name}</span>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                          isBrandActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {brand.productCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* 10. Customer Ratings Filter Section (Point #6) */}
        {/* ================================================================= */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <button
            type="button"
            onClick={() => toggleSection('ratings')}
            className="w-full flex items-center justify-between text-[11px] font-black text-slate-800 uppercase tracking-wider px-2 py-1 hover:text-amber-600 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              Customer Ratings
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                expandedSections.ratings ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSections.ratings && (
            <div className="space-y-1 pt-1 animate-fade-in">
              {[
                { threshold: 4.8, label: '4.8★ & up', stars: 5 },
                { threshold: 4.5, label: '4.5★ & up', stars: 4 },
                { threshold: 4.0, label: '4.0★ & up', stars: 4 },
                { threshold: 3.0, label: '3.0★ & up', stars: 3 },
              ].map((tier) => {
                const isActive = minRating === tier.threshold;
                const count = ratingsCounts[tier.threshold] || 0;
                return (
                  <button
                    key={tier.threshold}
                    type="button"
                    onClick={() => {
                      onSelectRating(isActive ? 0 : tier.threshold);
                      if (isOpenMobile) onCloseMobile();
                    }}
                    className={`w-full group text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-400'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="flex items-center text-amber-400 flex-shrink-0">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-2.5 h-2.5 ${
                              s <= tier.stars
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-200 fill-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] truncate font-bold">{tier.label}</span>
                    </div>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* 11. Availability & Deals Section (Point #7) */}
        {/* ================================================================= */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <button
            type="button"
            onClick={() => toggleSection('deals')}
            className="w-full flex items-center justify-between text-[11px] font-black text-slate-800 uppercase tracking-wider px-2 py-1 hover:text-amber-600 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <BadgePercent className="w-3.5 h-3.5 text-rose-500" />
              Availability & Deals
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                expandedSections.deals ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSections.deals && (
            <div className="space-y-1.5 pt-1 animate-fade-in">
              <button
                type="button"
                onClick={() => {
                  onToggleInStock(!inStockOnly);
                  if (isOpenMobile) onCloseMobile();
                }}
                className={`w-full group text-left px-2.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                  inStockOnly
                    ? 'bg-emerald-500 text-white font-black shadow-xs ring-1 ring-emerald-400'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-black border transition-all ${
                      inStockOnly
                        ? 'bg-white text-emerald-600 border-white'
                        : 'border-slate-300 text-transparent bg-white group-hover:border-emerald-500'
                    }`}
                  >
                    ✓
                  </span>
                  <span className="text-[11px] truncate font-bold">In Stock Only</span>
                </div>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                    inStockOnly ? 'bg-emerald-950 text-emerald-200' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {inStockCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onToggleOnSale(!onSaleOnly);
                  if (isOpenMobile) onCloseMobile();
                }}
                className={`w-full group text-left px-2.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                  onSaleOnly
                    ? 'bg-rose-500 text-white font-black shadow-xs ring-1 ring-rose-400'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-black border transition-all ${
                      onSaleOnly
                        ? 'bg-white text-rose-600 border-white'
                        : 'border-slate-300 text-transparent bg-white group-hover:border-rose-500'
                    }`}
                  >
                    ✓
                  </span>
                  <span className="text-[11px] truncate font-bold flex items-center gap-1">
                    <span>On Sale / Deals</span>
                    <Flame className="w-3 h-3 text-amber-300 fill-amber-300" />
                  </span>
                </div>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                    onSaleOnly ? 'bg-rose-950 text-rose-200' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {onSaleCount}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info Box */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/60 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Tag className="w-3 h-3 text-amber-500" />
          <span>Point 14 Smart Grid</span>
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
              title="Expand Filter Grid"
            >
              <SlidersHorizontal className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div className="writing-mode-vertical text-[11px] font-black tracking-widest text-slate-400 uppercase py-2">
              Filters
            </div>
            {activeFiltersCount > 0 && (
              <span className="text-[10px] font-black text-white bg-amber-500 px-2 py-1 rounded-full shadow-xs">
                {activeFiltersCount}
              </span>
            )}
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
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span className="font-extrabold text-sm">Filters & Facets</span>
                {activeFiltersCount > 0 && (
                  <span className="text-[10px] font-black text-slate-900 bg-amber-400 px-2 py-0.5 rounded-full">
                    {activeFiltersCount} Active
                  </span>
                )}
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
