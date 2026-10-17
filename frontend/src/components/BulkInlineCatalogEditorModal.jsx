import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Table,
  FileSpreadsheet,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Save,
  RotateCcw,
  Download,
  Copy,
  Check,
  Percent,
  TrendingUp,
  Sparkles,
  Sliders,
  X,
  Layers,
  Boxes,
  Tag,
  ChevronDown,
  Edit3,
  DollarSign,
  Package,
  Eye,
  RefreshCw,
} from 'lucide-react';
import api from '../api/client';

export default function BulkInlineCatalogEditorModal({
  isOpen,
  onClose,
  initialProducts = [],
  onProductsUpdated,
}) {
  const [products, setProducts] = useState([]);
  const [originalMap, setOriginalMap] = useState({});
  const [editedRows, setEditedRows] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL'); // ALL | IN_STOCK | LOW_STOCK | OUT_OF_STOCK | DRAFTS | MODIFIED
  const [sortField, setSortField] = useState('title');
  const [sortOrder, setSortOrder] = useState('asc'); // asc | desc
  const [copiedSku, setCopiedSku] = useState(null);
  const [notification, setNotification] = useState(null);

  // Bulk Operations Toolbar State
  const [bulkMode, setBulkMode] = useState('price'); // price | stock | status | discount
  const [priceAdjustType, setPriceAdjustType] = useState('PERCENT_INCREASE'); // PERCENT_INCREASE | PERCENT_DECREASE | FLAT_ADD | FLAT_SUBTRACT
  const [priceAdjustValue, setPriceAdjustValue] = useState('10');
  const [stockAdjustType, setStockAdjustType] = useState('ADD_STOCK'); // SET_EXACT | ADD_STOCK | SET_THRESHOLD
  const [stockAdjustValue, setStockAdjustValue] = useState('10');
  const [bulkStatusTarget, setBulkStatusTarget] = useState('published');
  const [bulkDiscountPercent, setBulkDiscountPercent] = useState('20');

  // Input ref tracking for keyboard navigation
  const inputRefs = useRef({});

  // Initialize or fetch products when opened
  useEffect(() => {
    if (!isOpen) return;

    const loadCatalog = async () => {
      setLoading(true);
      try {
        const res = await api.get('/vendor/products');
        const list = res.data?.data || initialProducts || [];
        initializeCatalog(list);
      } catch (err) {
        console.warn('Failed to load fresh vendor products, falling back to initial props', err);
        initializeCatalog(initialProducts || []);
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, [isOpen]);

  const initializeCatalog = (list) => {
    setProducts(list);
    const orig = {};
    list.forEach((p) => {
      const pid = String(p._id || p.id);
      orig[pid] = {
        mrp: Number(p.mrp || p.sellingPrice || 0),
        sellingPrice: Number(p.sellingPrice || p.price || 0),
        stock: Number(p.stock || 0),
        lowStockThreshold: Number(p.lowStockThreshold !== undefined ? p.lowStockThreshold : 5),
        status: p.status || (p.isPublished ? 'published' : 'draft'),
      };
    });
    setOriginalMap(orig);
    setEditedRows({});
    setSelectedIds(new Set());
  };

  // Check how many rows are modified
  const modifiedCount = useMemo(() => {
    return Object.keys(editedRows).length;
  }, [editedRows]);

  // Handle single cell edit
  const handleCellChange = (productId, field, value) => {
    const pid = String(productId);
    const original = originalMap[pid] || {};
    const current = editedRows[pid] || { ...original };

    const updated = { ...current };

    if (field === 'mrp' || field === 'sellingPrice' || field === 'stock' || field === 'lowStockThreshold') {
      const numVal = Number(value);
      updated[field] = isNaN(numVal) ? 0 : Math.max(0, numVal);

      // Auto ensure mrp >= sellingPrice
      if (field === 'sellingPrice' && updated.mrp < updated.sellingPrice) {
        updated.mrp = updated.sellingPrice;
      }
    } else if (field === 'status') {
      updated.status = value;
    }

    // Check if updated state is identical to original
    const isDifferent =
      updated.mrp !== original.mrp ||
      updated.sellingPrice !== original.sellingPrice ||
      updated.stock !== original.stock ||
      updated.lowStockThreshold !== original.lowStockThreshold ||
      updated.status !== original.status;

    setEditedRows((prev) => {
      const next = { ...prev };
      if (isDifferent) {
        next[pid] = updated;
      } else {
        delete next[pid];
      }
      return next;
    });
  };

  // Revert single product to original state
  const handleRevertRow = (productId) => {
    const pid = String(productId);
    setEditedRows((prev) => {
      const next = { ...prev };
      delete next[pid];
      return next;
    });
  };

  // Revert all edits
  const handleRevertAll = () => {
    if (modifiedCount === 0) return;
    if (window.confirm(`Discard all unsaved edits across ${modifiedCount} products?`)) {
      setEditedRows({});
      setNotification({
        type: 'info',
        message: 'All unsaved spreadsheet changes have been reverted.',
      });
    }
  };

  // Copy SKU helper
  const handleCopySku = (sku) => {
    if (!sku) return;
    navigator.clipboard?.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 1800);
  };

  // Select / Deselect All
  const handleToggleSelectAll = (filteredList) => {
    if (selectedIds.size === filteredList.length && filteredList.length > 0) {
      setSelectedIds(new Set());
    } else {
      const newSet = new Set(filteredList.map((p) => String(p._id || p.id)));
      setSelectedIds(newSet);
    }
  };

  // Toggle single row selection
  const handleToggleSelectRow = (productId) => {
    const pid = String(productId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) {
        next.delete(pid);
      } else {
        next.add(pid);
      }
      return next;
    });
  };

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      const catName = p.category?.name || p.category || 'General';
      if (catName) set.add(catName);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered and Sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const pid = String(p._id || p.id);
        const original = originalMap[pid] || {};
        const current = editedRows[pid] || original;
        const currentStock = current.stock !== undefined ? current.stock : p.stock;
        const currentThreshold = current.lowStockThreshold !== undefined ? current.lowStockThreshold : (p.lowStockThreshold || 5);
        const currentStatus = current.status || (p.isPublished ? 'published' : 'draft');
        const isModified = Boolean(editedRows[pid]);

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const title = (p.title || '').toLowerCase();
          const sku = (p.sku || '').toLowerCase();
          const brand = (p.brand || '').toLowerCase();
          if (!title.includes(q) && !sku.includes(q) && !brand.includes(q)) {
            return false;
          }
        }

        // Category filter
        if (selectedCategory !== 'ALL') {
          const catName = p.category?.name || p.category || 'General';
          if (catName !== selectedCategory) return false;
        }

        // Stock status filter
        if (stockFilter === 'IN_STOCK' && currentStock <= currentThreshold) return false;
        if (stockFilter === 'LOW_STOCK' && (currentStock <= 0 || currentStock > currentThreshold)) return false;
        if (stockFilter === 'OUT_OF_STOCK' && currentStock > 0) return false;
        if (stockFilter === 'DRAFTS' && currentStatus !== 'draft') return false;
        if (stockFilter === 'MODIFIED' && !isModified) return false;

        return true;
      })
      .sort((a, b) => {
        const pidA = String(a._id || a.id);
        const pidB = String(b._id || b.id);
        const curA = editedRows[pidA] || originalMap[pidA] || {};
        const curB = editedRows[pidB] || originalMap[pidB] || {};

        let valA = curA[sortField] !== undefined ? curA[sortField] : a[sortField];
        let valB = curB[sortField] !== undefined ? curB[sortField] : b[sortField];

        if (sortField === 'title') {
          valA = (a.title || '').toLowerCase();
          valB = (b.title || '').toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [products, originalMap, editedRows, searchQuery, selectedCategory, stockFilter, sortField, sortOrder]);

  // Execute Quick Bulk Operation
  const applyBulkOperation = () => {
    const targetProducts =
      selectedIds.size > 0
        ? filteredProducts.filter((p) => selectedIds.has(String(p._id || p.id)))
        : filteredProducts;

    if (targetProducts.length === 0) {
      setNotification({
        type: 'warning',
        message: 'No products match your current selection or filter.',
      });
      return;
    }

    const nextEdits = { ...editedRows };
    let affectedCount = 0;

    targetProducts.forEach((p) => {
      const pid = String(p._id || p.id);
      const original = originalMap[pid] || {};
      const current = nextEdits[pid] || { ...original };
      const updated = { ...current };

      if (bulkMode === 'price') {
        const val = Number(priceAdjustValue) || 0;
        let baseSelling = current.sellingPrice;

        if (priceAdjustType === 'PERCENT_INCREASE') {
          baseSelling = Math.round(baseSelling * (1 + val / 100));
        } else if (priceAdjustType === 'PERCENT_DECREASE') {
          baseSelling = Math.max(1, Math.round(baseSelling * (1 - val / 100)));
        } else if (priceAdjustType === 'FLAT_ADD') {
          baseSelling = Math.round(baseSelling + val);
        } else if (priceAdjustType === 'FLAT_SUBTRACT') {
          baseSelling = Math.max(1, Math.round(baseSelling - val));
        }

        updated.sellingPrice = baseSelling;
        if (updated.mrp < updated.sellingPrice) {
          updated.mrp = updated.sellingPrice;
        }
      } else if (bulkMode === 'stock') {
        const val = Number(stockAdjustValue) || 0;
        if (stockAdjustType === 'SET_EXACT') {
          updated.stock = Math.max(0, val);
        } else if (stockAdjustType === 'ADD_STOCK') {
          updated.stock = Math.max(0, updated.stock + val);
        } else if (stockAdjustType === 'SET_THRESHOLD') {
          updated.lowStockThreshold = Math.max(0, val);
        }
      } else if (bulkMode === 'status') {
        updated.status = bulkStatusTarget;
      } else if (bulkMode === 'discount') {
        const discPct = Math.min(90, Math.max(0, Number(bulkDiscountPercent) || 0));
        const mrp = updated.mrp || updated.sellingPrice || 100;
        const newSelling = Math.max(1, Math.round(mrp * (1 - discPct / 100)));
        updated.sellingPrice = newSelling;
      }

      // Check if actually modified from original
      const isDifferent =
        updated.mrp !== original.mrp ||
        updated.sellingPrice !== original.sellingPrice ||
        updated.stock !== original.stock ||
        updated.lowStockThreshold !== original.lowStockThreshold ||
        updated.status !== original.status;

      if (isDifferent) {
        nextEdits[pid] = updated;
        affectedCount++;
      }
    });

    setEditedRows(nextEdits);
    setNotification({
      type: 'success',
      message: `Quick Bulk Operation applied to ${affectedCount} product(s). Review cells and click 'Save All Changes'.`,
    });
  };

  // Save all modified rows to backend via PATCH /api/vendor/products/bulk-inline-update
  const handleSaveAll = async () => {
    if (modifiedCount === 0) return;

    const updates = Object.entries(editedRows).map(([productId, changes]) => ({
      productId,
      mrp: changes.mrp,
      sellingPrice: changes.sellingPrice,
      stock: changes.stock,
      lowStockThreshold: changes.lowStockThreshold,
      status: changes.status,
    }));

    setSaving(true);
    setNotification(null);

    try {
      const res = await api.patch('/vendor/products/bulk-inline-update', { updates });

      if (res.data?.success) {
        // Update local original map
        const newOriginals = { ...originalMap };
        Object.entries(editedRows).forEach(([pid, changes]) => {
          newOriginals[pid] = { ...newOriginals[pid], ...changes };
        });
        setOriginalMap(newOriginals);

        // Update local products list
        setProducts((prev) =>
          prev.map((p) => {
            const pid = String(p._id || p.id);
            if (editedRows[pid]) {
              const c = editedRows[pid];
              const mrp = c.mrp;
              const sellingPrice = c.sellingPrice;
              const savings = Math.max(0, mrp - sellingPrice);
              const discountPercentage = mrp > 0 ? Math.round((savings / mrp) * 100) : 0;
              return {
                ...p,
                mrp,
                sellingPrice,
                stock: c.stock,
                lowStockThreshold: c.lowStockThreshold,
                status: c.status,
                isPublished: c.status === 'published',
                savingsAmount: savings,
                discountPercentage,
              };
            }
            return p;
          })
        );

        setEditedRows({});
        setNotification({
          type: 'success',
          message: `🎉 Successfully synchronized ${updates.length} products to database in bulk!`,
        });

        if (onProductsUpdated) {
          onProductsUpdated(res.data.data);
        }
      } else {
        setNotification({
          type: 'error',
          message: res.data?.message || 'Failed to apply bulk updates.',
        });
      }
    } catch (err) {
      console.error('Bulk update error', err);
      const errMsg = err.response?.data?.message || err.message || 'Error occurred while saving bulk updates.';
      setNotification({
        type: 'error',
        message: errMsg,
      });
    } finally {
      setSaving(false);
    }
  };

  // Export current table view to CSV
  const handleExportCSV = () => {
    if (products.length === 0) return;

    const headers = [
      'Product ID',
      'Title',
      'SKU',
      'Category',
      'Brand',
      'MRP (INR)',
      'Selling Price (INR)',
      'Discount %',
      'Stock',
      'Low Stock Threshold',
      'Status',
    ];

    const escapeCSV = (str) => {
      const s = String(str ?? '').replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = filteredProducts.map((p) => {
      const pid = String(p._id || p.id);
      const current = editedRows[pid] || originalMap[pid] || {};
      const mrp = current.mrp !== undefined ? current.mrp : p.mrp;
      const selling = current.sellingPrice !== undefined ? current.sellingPrice : p.sellingPrice;
      const stock = current.stock !== undefined ? current.stock : p.stock;
      const threshold = current.lowStockThreshold !== undefined ? current.lowStockThreshold : (p.lowStockThreshold || 5);
      const status = current.status || (p.isPublished ? 'published' : 'draft');
      const discount = mrp > 0 ? Math.round(((mrp - selling) / mrp) * 100) : 0;

      return [
        escapeCSV(pid),
        escapeCSV(p.title),
        escapeCSV(p.sku),
        escapeCSV(p.category?.name || p.category || 'General'),
        escapeCSV(p.brand || 'Generic'),
        mrp,
        selling,
        `${discount}%`,
        stock,
        threshold,
        escapeCSV(status),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `auramarket_catalog_spreadsheet_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle safe close
  const handleClose = () => {
    if (modifiedCount > 0) {
      if (window.confirm(`You have unsaved changes on ${modifiedCount} product(s). Are you sure you want to discard them?`)) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-7xl max-h-[94vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Table className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight">Bulk Inline Spreadsheet Catalog Editor</h1>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 shadow-sm">
                  Point #38
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {products.length} Total SKUs
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Fast Excel-like inline grid for real-time prices, MRP, inventory counts, safety thresholds, and publication status.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {modifiedCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{modifiedCount} Unsaved</span>
              </span>
            )}

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
              title="Export Current Table as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Export CSV</span>
            </button>

            <button
              onClick={handleClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700"
              title="Close Spreadsheet"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Bulk Operations Ribbon ("Excel Toolbar") */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-slate-700 flex items-center gap-1 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Bulk Quick-Tools:</span>
            </span>

            {/* Mode Selector Tabs */}
            <div className="flex items-center bg-slate-200 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setBulkMode('price')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  bulkMode === 'price' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Price Adjust
              </button>
              <button
                type="button"
                onClick={() => setBulkMode('stock')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  bulkMode === 'stock' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Stock Adjust
              </button>
              <button
                type="button"
                onClick={() => setBulkMode('discount')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  bulkMode === 'discount' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Margin / Discount
              </button>
              <button
                type="button"
                onClick={() => setBulkMode('status')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  bulkMode === 'status' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Publish Status
              </button>
            </div>

            {/* Price Adjust Controls */}
            {bulkMode === 'price' && (
              <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl border border-slate-300">
                <select
                  value={priceAdjustType}
                  onChange={(e) => setPriceAdjustType(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 outline-none text-xs"
                >
                  <option value="PERCENT_INCREASE">+ % Increase Price</option>
                  <option value="PERCENT_DECREASE">- % Discount Price</option>
                  <option value="FLAT_ADD">+ Flat ₹ Add</option>
                  <option value="FLAT_SUBTRACT">- Flat ₹ Reduce</option>
                </select>
                <input
                  type="number"
                  min="0"
                  value={priceAdjustValue}
                  onChange={(e) => setPriceAdjustValue(e.target.value)}
                  className="w-16 px-2 py-0.5 rounded-md border border-slate-300 text-center font-bold text-slate-900 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Stock Adjust Controls */}
            {bulkMode === 'stock' && (
              <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl border border-slate-300">
                <select
                  value={stockAdjustType}
                  onChange={(e) => setStockAdjustType(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 outline-none text-xs"
                >
                  <option value="ADD_STOCK">+ Add Inventory Units</option>
                  <option value="SET_EXACT">Set Exact Stock Count</option>
                  <option value="SET_THRESHOLD">Set Low-Stock Threshold</option>
                </select>
                <input
                  type="number"
                  min="0"
                  value={stockAdjustValue}
                  onChange={(e) => setStockAdjustValue(e.target.value)}
                  className="w-16 px-2 py-0.5 rounded-md border border-slate-300 text-center font-bold text-slate-900 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Discount Markup Controls */}
            {bulkMode === 'discount' && (
              <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl border border-slate-300">
                <span className="font-bold text-slate-600">Set Selling Price to</span>
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={bulkDiscountPercent}
                  onChange={(e) => setBulkDiscountPercent(e.target.value)}
                  className="w-14 px-2 py-0.5 rounded-md border border-slate-300 text-center font-bold text-slate-900 text-xs focus:ring-1 focus:ring-indigo-500"
                />
                <span className="font-bold text-slate-600">% OFF MRP</span>
              </div>
            )}

            {/* Status Change Controls */}
            {bulkMode === 'status' && (
              <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl border border-slate-300">
                <span className="font-bold text-slate-600">Change Status to:</span>
                <select
                  value={bulkStatusTarget}
                  onChange={(e) => setBulkStatusTarget(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none text-xs"
                >
                  <option value="published">🟢 Published (Active)</option>
                  <option value="draft">🟡 Draft (Hidden)</option>
                  <option value="archived">⚪ Archived</option>
                </select>
              </div>
            )}

            {/* Apply Button */}
            <button
              type="button"
              onClick={applyBulkOperation}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>Apply to {selectedIds.size > 0 ? `${selectedIds.size} Selected` : 'All Filtered'}</span>
            </button>
          </div>

          <div className="text-slate-500 text-[11px] font-medium self-end lg:self-center">
            {selectedIds.size > 0 ? (
              <span className="text-indigo-600 font-bold">{selectedIds.size} product(s) selected</span>
            ) : (
              <span>Targeting all {filteredProducts.length} filtered items</span>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Search Input */}
          <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Title, SKU, or Brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'ALL', label: 'All', count: products.length },
              {
                id: 'IN_STOCK',
                label: 'In Stock',
                count: products.filter((p) => {
                  const pid = String(p._id || p.id);
                  const cur = editedRows[pid] || originalMap[pid] || {};
                  const s = cur.stock !== undefined ? cur.stock : p.stock;
                  const th = cur.lowStockThreshold !== undefined ? cur.lowStockThreshold : (p.lowStockThreshold || 5);
                  return s > th;
                }).length,
              },
              {
                id: 'LOW_STOCK',
                label: 'Low Stock',
                count: products.filter((p) => {
                  const pid = String(p._id || p.id);
                  const cur = editedRows[pid] || originalMap[pid] || {};
                  const s = cur.stock !== undefined ? cur.stock : p.stock;
                  const th = cur.lowStockThreshold !== undefined ? cur.lowStockThreshold : (p.lowStockThreshold || 5);
                  return s > 0 && s <= th;
                }).length,
              },
              {
                id: 'OUT_OF_STOCK',
                label: 'Out of Stock',
                count: products.filter((p) => {
                  const pid = String(p._id || p.id);
                  const cur = editedRows[pid] || originalMap[pid] || {};
                  const s = cur.stock !== undefined ? cur.stock : p.stock;
                  return s <= 0;
                }).length,
              },
              {
                id: 'DRAFTS',
                label: 'Drafts',
                count: products.filter((p) => {
                  const pid = String(p._id || p.id);
                  const cur = editedRows[pid] || originalMap[pid] || {};
                  const st = cur.status || (p.isPublished ? 'published' : 'draft');
                  return st === 'draft';
                }).length,
              },
              {
                id: 'MODIFIED',
                label: 'Modified Only',
                count: modifiedCount,
                highlight: modifiedCount > 0,
              },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStockFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs flex items-center gap-1.5 ${
                  stockFilter === f.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : f.highlight
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    stockFilter === f.id
                      ? 'bg-slate-800 text-white'
                      : f.highlight
                      ? 'bg-amber-500 text-white font-black'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Notification Alert Banner */}
        {notification && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center justify-between gap-3 animate-fadeIn ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-200'
                : notification.type === 'error'
                ? 'bg-red-50 text-red-900 border-b border-red-200'
                : 'bg-blue-50 text-blue-900 border-b border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : notification.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span className="font-bold">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Spreadsheet Grid Container */}
        <div className="flex-1 overflow-auto bg-slate-100/60 p-4">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm font-bold">Loading product catalog into spreadsheet grid...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-500 bg-white rounded-2xl border border-slate-200">
              <FileSpreadsheet className="w-10 h-10 text-slate-300" />
              <p className="text-sm font-black text-slate-700">No products match current filters</p>
              <p className="text-xs text-slate-400">Try adjusting your search query or reset filter pills.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setStockFilter('ALL');
                }}
                className="mt-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-200 font-black uppercase text-[10px] tracking-wider sticky top-0 z-10 select-none">
                    {/* Master Checkbox */}
                    <th className="py-3 px-3 w-10 text-center border-b border-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                        onChange={() => handleToggleSelectAll(filteredProducts)}
                        className="rounded border-slate-600 text-indigo-600 focus:ring-0 cursor-pointer w-4 h-4"
                        title="Select/Deselect All Filtered Rows"
                      />
                    </th>

                    {/* Product & SKU */}
                    <th className="py-3 px-4 border-b border-slate-700 min-w-[260px]">
                      <button
                        type="button"
                        onClick={() => {
                          if (sortField === 'title') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('title');
                            setSortOrder('asc');
                          }
                        }}
                        className="flex items-center gap-1.5 hover:text-white transition-colors"
                      >
                        <span>Product Title & SKU</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </button>
                    </th>

                    {/* Category */}
                    <th className="py-3 px-3 border-b border-slate-700 hidden sm:table-cell min-w-[120px]">
                      Category
                    </th>

                    {/* MRP / Compare Price */}
                    <th className="py-3 px-3 border-b border-slate-700 w-32 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (sortField === 'mrp') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('mrp');
                            setSortOrder('asc');
                          }
                        }}
                        className="flex items-center gap-1 justify-end w-full hover:text-white"
                      >
                        <span>MRP (₹)</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </button>
                    </th>

                    {/* Selling Price */}
                    <th className="py-3 px-3 border-b border-slate-700 w-32 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (sortField === 'sellingPrice') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('sellingPrice');
                            setSortOrder('asc');
                          }
                        }}
                        className="flex items-center gap-1 justify-end w-full text-emerald-400 hover:text-emerald-300"
                      >
                        <span>Sale Price (₹)</span>
                        <ArrowUpDown className="w-3 h-3 text-emerald-400" />
                      </button>
                    </th>

                    {/* Dynamic Discount % */}
                    <th className="py-3 px-3 border-b border-slate-700 w-24 text-center">
                      Margin / Off
                    </th>

                    {/* Stock Count */}
                    <th className="py-3 px-3 border-b border-slate-700 w-28 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (sortField === 'stock') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('stock');
                            setSortOrder('asc');
                          }
                        }}
                        className="flex items-center gap-1 justify-center w-full hover:text-white"
                      >
                        <span>Stock Units</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </button>
                    </th>

                    {/* Low-Stock Threshold */}
                    <th className="py-3 px-3 border-b border-slate-700 w-24 text-center hidden md:table-cell">
                      Threshold
                    </th>

                    {/* Inventory Status */}
                    <th className="py-3 px-3 border-b border-slate-700 w-28 text-center">
                      Stock Status
                    </th>

                    {/* Publish Status */}
                    <th className="py-3 px-3 border-b border-slate-700 w-32 text-center">
                      Catalog Status
                    </th>

                    {/* Actions / Row Revert */}
                    <th className="py-3 px-3 border-b border-slate-700 w-16 text-center">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p, index) => {
                    const pid = String(p._id || p.id);
                    const original = originalMap[pid] || {};
                    const current = editedRows[pid] || original;
                    const isModified = Boolean(editedRows[pid]);
                    const isSelected = selectedIds.has(pid);

                    // Compute dynamic values
                    const mrp = current.mrp !== undefined ? current.mrp : (p.mrp || 0);
                    const sellingPrice = current.sellingPrice !== undefined ? current.sellingPrice : (p.sellingPrice || 0);
                    const stock = current.stock !== undefined ? current.stock : (p.stock || 0);
                    const threshold = current.lowStockThreshold !== undefined ? current.lowStockThreshold : (p.lowStockThreshold || 5);
                    const status = current.status || (p.isPublished ? 'published' : 'draft');

                    const savings = Math.max(0, mrp - sellingPrice);
                    const discountPct = mrp > 0 ? Math.round((savings / mrp) * 100) : 0;

                    const isOutOfStock = stock <= 0;
                    const isLowStock = stock > 0 && stock <= threshold;

                    return (
                      <tr
                        key={pid}
                        className={`transition-colors group hover:bg-slate-50 ${
                          isModified ? 'bg-amber-50/60 ring-1 ring-inset ring-amber-300' : isSelected ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(pid)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer w-4 h-4"
                          />
                        </td>

                        {/* Title & SKU */}
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.thumbnail || (p.images && p.images[0]) || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}
                              alt=""
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-slate-50 shrink-0 shadow-xs"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-900 truncate text-xs leading-snug" title={p.title}>
                                {p.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                                  <span>{p.sku || 'NO-SKU'}</span>
                                  {p.sku && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopySku(p.sku)}
                                      className="text-slate-400 hover:text-slate-700 ml-0.5"
                                      title="Copy SKU"
                                    >
                                      {copiedSku === p.sku ? (
                                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-2.5 h-2.5" />
                                      )}
                                    </button>
                                  )}
                                </span>
                                {isModified && (
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
                                    MODIFIED
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-2.5 px-3 text-slate-600 hidden sm:table-cell">
                          <span className="truncate block max-w-[120px] text-xs font-medium">
                            {p.category?.name || p.category || 'General'}
                          </span>
                        </td>

                        {/* MRP Input */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="relative inline-block w-full">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                              ₹
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={mrp}
                              onChange={(e) => handleCellChange(pid, 'mrp', e.target.value)}
                              className={`w-full pl-6 pr-2 py-1 text-right font-bold text-xs rounded-lg border outline-none transition-all ${
                                current.mrp !== original.mrp
                                  ? 'border-amber-400 bg-amber-50/80 text-amber-950 ring-1 ring-amber-400'
                                  : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700'
                              }`}
                            />
                          </div>
                        </td>

                        {/* Selling Price Input */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="relative inline-block w-full">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600 text-xs font-bold">
                              ₹
                            </span>
                            <input
                              type="number"
                              min="1"
                              value={sellingPrice}
                              onChange={(e) => handleCellChange(pid, 'sellingPrice', e.target.value)}
                              className={`w-full pl-6 pr-2 py-1 text-right font-black text-xs rounded-lg border outline-none transition-all ${
                                current.sellingPrice !== original.sellingPrice
                                  ? 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-400'
                                  : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-emerald-700'
                              }`}
                            />
                          </div>
                        </td>

                        {/* Margin / Discount Badge */}
                        <td className="py-2.5 px-3 text-center">
                          {discountPct > 0 ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                              <Percent className="w-2.5 h-2.5" />
                              <span>{discountPct}% OFF</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">—</span>
                          )}
                        </td>

                        {/* Stock Units Input */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="relative inline-block w-full">
                            <input
                              type="number"
                              min="0"
                              value={stock}
                              onChange={(e) => handleCellChange(pid, 'stock', e.target.value)}
                              className={`w-full px-2 py-1 text-center font-black text-xs rounded-lg border outline-none transition-all ${
                                current.stock !== original.stock
                                  ? 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-400'
                                  : isOutOfStock
                                  ? 'border-red-300 bg-red-50 text-red-700'
                                  : isLowStock
                                  ? 'border-amber-300 bg-amber-50 text-amber-700'
                                  : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-slate-900'
                              }`}
                            />
                          </div>
                        </td>

                        {/* Low-Stock Threshold Input */}
                        <td className="py-2.5 px-3 text-center hidden md:table-cell">
                          <input
                            type="number"
                            min="0"
                            value={threshold}
                            onChange={(e) => handleCellChange(pid, 'lowStockThreshold', e.target.value)}
                            className={`w-16 px-2 py-1 text-center font-bold text-xs rounded-lg border outline-none transition-all ${
                              current.lowStockThreshold !== original.lowStockThreshold
                                ? 'border-amber-400 bg-amber-50 text-amber-950 ring-1 ring-amber-400'
                                : 'border-slate-200 bg-slate-50 focus:bg-white text-slate-600'
                            }`}
                          />
                        </td>

                        {/* Stock Status Indicator */}
                        <td className="py-2.5 px-3 text-center">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-black">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                              <span>OUT OF STOCK</span>
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>LOW ({stock})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>IN STOCK</span>
                            </span>
                          )}
                        </td>

                        {/* Status Select */}
                        <td className="py-2.5 px-3 text-center">
                          <select
                            value={status}
                            onChange={(e) => handleCellChange(pid, 'status', e.target.value)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold border outline-none transition-all ${
                              current.status !== original.status
                                ? 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-400'
                                : status === 'published'
                                ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
                                : status === 'draft'
                                ? 'border-amber-200 bg-amber-50/70 text-amber-800'
                                : 'border-slate-200 bg-slate-100 text-slate-600'
                            }`}
                          >
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                            <option value="archived">Archived</option>
                          </select>
                        </td>

                        {/* Action: Revert row */}
                        <td className="py-2.5 px-3 text-center">
                          {isModified ? (
                            <button
                              type="button"
                              onClick={() => handleRevertRow(pid)}
                              className="p-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 transition-all"
                              title="Revert Row to Original Values"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sticky Bottom Actions Bar */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
          <div className="flex items-center gap-3">
            {modifiedCount > 0 ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="font-bold text-amber-300">
                  {modifiedCount} product(s) modified with unsaved changes.
                </span>
                <button
                  type="button"
                  onClick={handleRevertAll}
                  className="ml-2 text-slate-400 hover:text-white underline text-[11px] font-medium"
                >
                  Discard All Edits
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>All catalog prices and stock are synchronized with cloud database.</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={modifiedCount === 0 || saving}
              onClick={handleSaveAll}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black shadow-lg transition-all ${
                modifiedCount === 0 || saving
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/25 active:scale-95'
              }`}
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synchronizing {modifiedCount} Products...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save All Changes ({modifiedCount})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
