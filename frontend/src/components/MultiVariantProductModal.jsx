import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Check,
  Palette,
  Sparkles,
  Boxes,
  Tag,
  DollarSign,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';

const POPULAR_COLORS = [
  { name: 'Obsidian Black', hex: '#0F172A' },
  { name: 'Royal Cobalt', hex: '#2563EB' },
  { name: 'Crimson Fire', hex: '#DC2626' },
  { name: 'Emerald Forest', hex: '#16A34A' },
  { name: 'Pure Platinum', hex: '#E2E8F0' },
  { name: 'Sunset Amber', hex: '#D97706' },
  { name: 'Deep Amethyst', hex: '#7C3AED' },
  { name: 'Rose Blush', hex: '#F43F5E' },
];

const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', 'Free Size'];

export default function MultiVariantProductModal({
  isOpen,
  onClose,
  onProductCreated,
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Electronics & Audio');
  const [brand, setBrand] = useState('Apex Tech');
  const [baseMrp, setBaseMrp] = useState(2999);
  const [baseSellingPrice, setBaseSellingPrice] = useState(1799);
  const [baseSku, setBaseSku] = useState('APX-VAR-' + Math.floor(100 + Math.random() * 900));

  // Variant Matrix Configuration
  const [hasVariants, setHasVariants] = useState(true);
  const [selectedColors, setSelectedColors] = useState([
    { name: 'Obsidian Black', hex: '#0F172A' },
    { name: 'Royal Cobalt', hex: '#2563EB' },
  ]);
  const [selectedSizes, setSelectedSizes] = useState(['M', 'L']);
  const [customColorName, setCustomColorName] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#4F46E5');

  // Generated Variants List
  const [variants, setVariants] = useState([
    {
      id: 'v1',
      sku: 'APX-VAR-BLK-M',
      name: 'Medium / Obsidian Black',
      attributes: { size: 'M', color: 'Obsidian Black', colorCode: '#0F172A' },
      colorCode: '#0F172A',
      additionalPrice: 0,
      stock: 15,
      lowStockThreshold: 4,
    },
    {
      id: 'v2',
      sku: 'APX-VAR-BLK-L',
      name: 'Large / Obsidian Black',
      attributes: { size: 'L', color: 'Obsidian Black', colorCode: '#0F172A' },
      colorCode: '#0F172A',
      additionalPrice: 0,
      stock: 12,
      lowStockThreshold: 4,
    },
    {
      id: 'v3',
      sku: 'APX-VAR-BLU-M',
      name: 'Medium / Royal Cobalt',
      attributes: { size: 'M', color: 'Royal Cobalt', colorCode: '#2563EB' },
      colorCode: '#2563EB',
      additionalPrice: 150,
      stock: 10,
      lowStockThreshold: 3,
    },
    {
      id: 'v4',
      sku: 'APX-VAR-BLU-L',
      name: 'Large / Royal Cobalt',
      attributes: { size: 'L', color: 'Royal Cobalt', colorCode: '#2563EB' },
      colorCode: '#2563EB',
      additionalPrice: 150,
      stock: 8,
      lowStockThreshold: 3,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Total computed stock
  const totalStock = hasVariants
    ? variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
    : 25;

  const handleToggleColor = (colorObj) => {
    const exists = selectedColors.some((c) => c.name === colorObj.name);
    if (exists) {
      setSelectedColors(selectedColors.filter((c) => c.name !== colorObj.name));
    } else {
      setSelectedColors([...selectedColors, colorObj]);
    }
  };

  const handleAddCustomColor = (e) => {
    e.preventDefault();
    if (!customColorName.trim()) return;
    const newC = { name: customColorName.trim(), hex: customColorHex };
    if (!selectedColors.some((c) => c.name.toLowerCase() === newC.name.toLowerCase())) {
      setSelectedColors([...selectedColors, newC]);
    }
    setCustomColorName('');
  };

  const handleToggleSize = (size) => {
    if (selectedSizes.includes(size)) {
      setSelectedSizes(selectedSizes.filter((s) => s !== size));
    } else {
      setSelectedSizes([...selectedSizes, size]);
    }
  };

  // Generate Matrix (Colors × Sizes)
  const handleGenerateMatrix = () => {
    if (selectedColors.length === 0 || selectedSizes.length === 0) {
      alert('Please select at least 1 color swatch and 1 size to generate variants.');
      return;
    }

    const generated = [];
    selectedColors.forEach((color) => {
      selectedSizes.forEach((size) => {
        const colorCodePrefix = color.name.slice(0, 3).toUpperCase();
        generated.push({
          id: `var_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          sku: `${baseSku || 'APX'}-${colorCodePrefix}-${size}`,
          name: `${size} / ${color.name}`,
          attributes: { size, color: color.name, colorCode: color.hex },
          colorCode: color.hex,
          additionalPrice: 0,
          stock: 10,
          lowStockThreshold: 3,
        });
      });
    });

    setVariants(generated);
  };

  const handleUpdateVariant = (id, field, value) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const handleRemoveVariant = (id) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Product title is required.');
      return;
    }

    if (hasVariants && variants.length === 0) {
      alert('Please generate or add at least one variant.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title,
      category,
      brand,
      mrp: Number(baseMrp),
      sellingPrice: Number(baseSellingPrice),
      stock: totalStock,
      sku: baseSku,
      hasVariants,
      variants: hasVariants ? variants : [],
      images: [
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500',
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
      ],
    };

    onProductCreated(payload);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30">
                Point #51 Feature
              </span>
              <span className="text-xs font-medium text-amber-100 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Seller Central Variant Engine
              </span>
            </div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Palette className="w-6 h-6 text-amber-200" />
              Multi-Variant Product Creator (Color Swatches & Size Matrix)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg font-bold transition-colors"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-slate-800 dark:text-slate-200">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-amber-600" />
              1. Basic Product Specifications
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex HyperFleece Ergonomic Zip Hoodie"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Master SKU Prefix *
                </label>
                <input
                  type="text"
                  required
                  value={baseSku}
                  onChange={(e) => setBaseSku(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Base Selling Price (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={baseSellingPrice}
                  onChange={(e) => setBaseSellingPrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Original MRP (₹)
                </label>
                <input
                  type="number"
                  value={baseMrp}
                  onChange={(e) => setBaseMrp(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Electronics & Audio">Electronics & Audio</option>
                  <option value="Watches & Accessories">Watches & Accessories</option>
                  <option value="Fashion & Apparel">Fashion & Apparel</option>
                  <option value="Footwear & Sneakers">Footwear & Sneakers</option>
                </select>
              </div>
            </div>

            {/* Point #53: Live Discount Preview Calculator */}
            {baseMrp > baseSellingPrice && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-black text-[11px]">
                    {Math.round(((baseMrp - baseSellingPrice) / baseMrp) * 100)}% OFF
                  </span>
                  <span>Point #53 Automatic Discount Badge</span>
                </span>
                <span className="font-semibold text-xs">
                  Customer Saves ₹{(baseMrp - baseSellingPrice).toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>

          {/* Section 2: Variant Options Configurator */}
          <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-slate-800/40 border border-amber-200/60 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-amber-600" />
                  2. Color Swatches & Size Matrix Builder
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select available colors and sizes, then click "Generate Matrix" to build SKUs.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasVariants}
                  onChange={(e) => setHasVariants(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span>Enable Multi-Variant Matrix</span>
              </label>
            </div>

            {hasVariants && (
              <div className="space-y-4 pt-2">
                {/* Color Swatches Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    A. Color Swatches ({selectedColors.length} chosen):
                  </label>
                  <div className="flex flex-wrap gap-2.5 items-center">
                    {POPULAR_COLORS.map((col) => {
                      const isSelected = selectedColors.some((c) => c.name === col.name);
                      return (
                        <button
                          type="button"
                          key={col.name}
                          onClick={() => handleToggleColor(col)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                            isSelected
                              ? 'bg-amber-100 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 shadow-sm scale-105'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0 shadow-sm"
                            style={{ backgroundColor: col.hex }}
                          />
                          <span>{col.name}</span>
                          {isSelected && <Check className="w-3 h-3 text-amber-600" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Add Custom Color Input */}
                  <div className="flex items-center gap-2 mt-2.5">
                    <input
                      type="color"
                      value={customColorHex}
                      onChange={(e) => setCustomColorHex(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5 bg-transparent"
                      title="Choose custom hex"
                    />
                    <input
                      type="text"
                      placeholder="Custom color name (e.g. Desert Sand)"
                      value={customColorName}
                      onChange={(e) => setCustomColorName(e.target.value)}
                      className="px-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomColor}
                      className="px-3 py-1 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
                    >
                      + Add Swatch
                    </button>
                  </div>
                </div>

                {/* Size Matrix Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                    B. Size Matrix ({selectedSizes.length} chosen):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {STANDARD_SIZES.map((sz) => {
                      const isSelected = selectedSizes.includes(sz);
                      return (
                        <button
                          type="button"
                          key={sz}
                          onClick={() => handleToggleSize(sz)}
                          className={`w-12 h-9 rounded-xl text-xs font-bold border transition-all ${
                            isSelected
                              ? 'bg-amber-600 border-amber-600 text-white shadow-md scale-105'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Generate Matrix Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleGenerateMatrix}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Matrix ({selectedColors.length} Colors × {selectedSizes.length} Sizes = {selectedColors.length * selectedSizes.length} SKUs)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Generated Variants Matrix Table */}
          {hasVariants && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-600" />
                  3. Generated SKU Matrix ({variants.length} Variants)
                </h4>
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Combined Total Stock: {totalStock} units
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3">Swatch & Variant Name</th>
                      <th className="px-4 py-3">Variant SKU</th>
                      <th className="px-4 py-3">Extra Fee (₹)</th>
                      <th className="px-4 py-3">Inventory Stock</th>
                      <th className="px-4 py-3">Low Stock Alert</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {variants.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        {/* Swatch & Name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-4 h-4 rounded-full border border-black/20 shrink-0 shadow-sm"
                              style={{ backgroundColor: v.colorCode || '#000000' }}
                            />
                            <span className="font-bold text-slate-900 dark:text-white">
                              {v.name}
                            </span>
                          </div>
                        </td>

                        {/* SKU */}
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={v.sku}
                            onChange={(e) => handleUpdateVariant(v.id, 'sku', e.target.value)}
                            className="w-32 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px]"
                          />
                        </td>

                        {/* Extra Price */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span>+₹</span>
                            <input
                              type="number"
                              value={v.additionalPrice || 0}
                              onChange={(e) =>
                                handleUpdateVariant(v.id, 'additionalPrice', Number(e.target.value))
                              }
                              className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                            />
                          </div>
                        </td>

                        {/* Stock */}
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            value={v.stock}
                            onChange={(e) =>
                              handleUpdateVariant(v.id, 'stock', Number(e.target.value))
                            }
                            className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-emerald-600 dark:text-emerald-400"
                          />
                        </td>

                        {/* Low Stock Alert */}
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="1"
                            value={v.lowStockThreshold || 3}
                            onChange={(e) =>
                              handleUpdateVariant(v.id, 'lowStockThreshold', Number(e.target.value))
                            }
                            className="w-14 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-amber-600"
                          />
                        </td>

                        {/* Delete */}
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(v.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {hasVariants ? `${variants.length} Variants Configured` : 'Standard Single SKU'}
              </span>{' '}
              | Combined Stock: <span className="font-bold text-emerald-600">{totalStock} units</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isSubmitting ? 'Publishing...' : 'Publish Multi-Variant Product'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
