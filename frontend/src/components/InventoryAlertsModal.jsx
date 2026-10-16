import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Check,
  RefreshCw,
  Send,
  Package,
  TrendingUp,
  ShieldAlert,
  Sliders,
  ExternalLink,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import api from '../api/client';

export default function InventoryAlertsModal({ isOpen, onClose, isAdmin = false, onRestocked }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState([]);
  const [telemetry, setTelemetry] = useState({
    totalLowStockCount: 0,
    outOfStockCount: 0,
    criticalCount: 0,
    totalAtRiskInventoryValue: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'critical', 'out_of_stock'
  const [globalThreshold, setGlobalThreshold] = useState(5);
  const [savingGlobal, setSavingGlobal] = useState(false);

  // Per-item restock states
  const [restockInputs, setRestockInputs] = useState({});
  const [thresholdInputs, setThresholdInputs] = useState({});
  const [submittingAction, setSubmittingAction] = useState({});

  // WhatsApp Alert states
  const [alertSending, setAlertSending] = useState(false);
  const [alertResult, setAlertResult] = useState(null);
  const [notificationMsg, setNotificationMsg] = useState(null);

  const fetchLowStockData = async () => {
    try {
      setRefreshing(true);
      const endpoint = isAdmin ? '/admin/inventory/low-stock' : '/vendor/inventory/low-stock';
      const res = await api.get(endpoint);
      if (res.data && res.data.success) {
        setProducts(res.data.products || []);
        if (res.data.telemetry) {
          setTelemetry(res.data.telemetry);
        }
        // Initialize editable threshold inputs
        const threshMap = {};
        const restockMap = {};
        (res.data.products || []).forEach((p) => {
          threshMap[p._id] = p.lowStockThreshold;
          restockMap[p._id] = p.suggestedRestockQty || 25;
        });
        setThresholdInputs(threshMap);
        setRestockInputs(restockMap);
      }
    } catch (err) {
      console.error('Failed to load low stock inventory:', err);
      setNotificationMsg({ type: 'error', text: err.response?.data?.message || 'Error loading inventory data.' });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setAlertResult(null);
      setNotificationMsg(null);
      fetchLowStockData();
    }
  }, [isOpen, isAdmin]);

  const handleApplyGlobalThreshold = async () => {
    try {
      setSavingGlobal(true);
      const endpoint = isAdmin ? '/admin/inventory/thresholds' : '/vendor/inventory/thresholds';
      const res = await api.put(endpoint, { defaultThreshold: globalThreshold });
      if (res.data && res.data.success) {
        setNotificationMsg({ type: 'success', text: `Global threshold set to ${globalThreshold} units.` });
        await fetchLowStockData();
      }
    } catch (err) {
      setNotificationMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update global threshold.' });
    } finally {
      setSavingGlobal(false);
    }
  };

  const handleUpdateSingleThreshold = async (productId) => {
    const thresh = thresholdInputs[productId];
    if (thresh === undefined || thresh === '') return;

    try {
      setSubmittingAction((prev) => ({ ...prev, [`thresh_${productId}`]: true }));
      const endpoint = isAdmin ? '/admin/inventory/thresholds' : '/vendor/inventory/thresholds';
      const res = await api.put(endpoint, {
        productId,
        lowStockThreshold: parseInt(thresh, 10),
      });

      if (res.data && res.data.success) {
        setNotificationMsg({ type: 'success', text: 'Threshold updated successfully!' });
        await fetchLowStockData();
      }
    } catch (err) {
      setNotificationMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update threshold.' });
    } finally {
      setSubmittingAction((prev) => ({ ...prev, [`thresh_${productId}`]: false }));
    }
  };

  const handleQuickRestock = async (productId, addQty) => {
    const qty = parseInt(addQty || restockInputs[productId] || 25, 10);
    if (!qty || qty <= 0) return;

    try {
      setSubmittingAction((prev) => ({ ...prev, [`restock_${productId}`]: true }));
      const endpoint = isAdmin ? '/admin/inventory/quick-restock' : '/vendor/inventory/quick-restock';
      const res = await api.patch(endpoint, {
        productId,
        additionalStock: qty,
      });

      if (res.data && res.data.success) {
        setNotificationMsg({ type: 'success', text: `Restocked +${qty} units successfully!` });
        if (onRestocked) onRestocked();
        await fetchLowStockData();
      }
    } catch (err) {
      setNotificationMsg({ type: 'error', text: err.response?.data?.message || 'Failed to quick-restock inventory.' });
    } finally {
      setSubmittingAction((prev) => ({ ...prev, [`restock_${productId}`]: false }));
    }
  };

  const handleBatchRestockAll = async () => {
    const items = filteredProducts.map((p) => ({
      productId: p._id,
      additionalStock: p.suggestedRestockQty || 25,
    }));

    if (items.length === 0) return;

    try {
      setLoading(true);
      const endpoint = isAdmin ? '/admin/inventory/quick-restock' : '/vendor/inventory/quick-restock';
      const res = await api.patch(endpoint, { restockItems: items });

      if (res.data && res.data.success) {
        setNotificationMsg({
          type: 'success',
          text: `Batch restock complete! Replenished ${res.data.updatedCount} products.`,
        });
        if (onRestocked) onRestocked();
        await fetchLowStockData();
      }
    } catch (err) {
      setNotificationMsg({ type: 'error', text: err.response?.data?.message || 'Failed batch restock.' });
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerWhatsAppAlert = async () => {
    try {
      setAlertSending(true);
      setAlertResult(null);
      const endpoint = isAdmin
        ? '/admin/inventory/trigger-restock-alert'
        : '/vendor/inventory/trigger-restock-alert';
      const res = await api.post(endpoint, {});

      if (res.data && res.data.success) {
        setAlertResult(res.data);
        setNotificationMsg({
          type: 'success',
          text: `WhatsApp Red Alert dispatched to +${res.data.recipientPhone} (${res.data.recipientStore}) via Meta Cloud API!`,
        });
      }
    } catch (err) {
      setNotificationMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to trigger WhatsApp restock alert.',
      });
    } finally {
      setAlertSending(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterMode === 'out_of_stock') {
        return p.stock <= 0;
      }
      if (filterMode === 'critical') {
        return p.stock > 0 && p.stock <= 2;
      }
      return true;
    });
  }, [products, searchQuery, filterMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Inventory Low-Stock Threshold & Auto-Restock Studio
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded-full border border-amber-300 dark:border-amber-700/50">
                  Point #10 Master
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Per-SKU safety stock thresholds, WhatsApp Cloud API alert dispatches, and 1-click replenishment.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLowStockData}
              disabled={refreshing}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors title='Refresh Inventory'"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notification feedback */}
          {notificationMsg && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between text-sm ${
                notificationMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {notificationMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                )}
                <span>{notificationMsg.text}</span>
              </div>
              <button
                onClick={() => setNotificationMsg(null)}
                className="text-xs underline opacity-75 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Telemetry KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <span>At-Risk SKUs</span>
                <Package className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {telemetry.totalLowStockCount}
              </div>
              <p className="text-xs text-slate-400 mt-1">Below defined safety threshold</p>
            </div>

            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 shadow-sm">
              <div className="flex items-center justify-between text-red-600 dark:text-red-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <span>Sold Out (0 Stock)</span>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-2xl font-black text-red-600 dark:text-red-400">
                {telemetry.outOfStockCount}
              </div>
              <p className="text-xs text-red-500/80 mt-1">Immediate revenue loss risk</p>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
              <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <span>Critical (1-2 Units)</span>
                <ShieldAlert className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {telemetry.criticalCount}
              </div>
              <p className="text-xs text-amber-500/80 mt-1">Stockout within 24-48 hours</p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <span>Inventory Value At Risk</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ₹{telemetry.totalAtRiskInventoryValue.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-emerald-500/80 mt-1">Total current stock valuation</p>
            </div>
          </div>

          {/* Red Alert Action Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-white animate-ping" />
                <h4 className="font-bold text-base tracking-wide uppercase">
                  Automated Multi-Channel Restock Red Alert
                </h4>
              </div>
              <p className="text-xs text-red-100 max-w-2xl">
                Dispatch instant WhatsApp notifications to the vendor's verified phone via Meta Cloud API v20.0 with
                a detailed SKU breakdown and 1-click replenishment deep-link.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleTriggerWhatsAppAlert}
                disabled={alertSending || telemetry.totalLowStockCount === 0}
                className="px-4 py-2.5 bg-white text-red-600 hover:bg-red-50 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {alertSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send WhatsApp Red Alert</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Alert Result Card if WhatsApp was dispatched */}
          {alertResult && (
            <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>WhatsApp Restock Red Alert Dispatched Successfully</span>
                </div>
                <span className="text-xs bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full font-mono">
                  {alertResult.apiVersion} • {alertResult.latencyMs}ms
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Recipient Store:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{alertResult.recipientStore}</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Recipient Mobile:</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-slate-100">
                    +{alertResult.recipientPhone}
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Meta Message ID:</span>
                  <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300 truncate block">
                    {alertResult.messageId}
                  </span>
                </div>
              </div>
              {alertResult.previewUrl && (
                <div className="flex items-center justify-end">
                  <a
                    href={alertResult.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline"
                  >
                    <span>Open in WhatsApp Web / App</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Quick Controls: Global Threshold Adjuster & Search Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            {/* Global Threshold Form */}
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Default Safety Threshold:
              </span>
              <input
                type="number"
                min="0"
                max="500"
                value={globalThreshold}
                onChange={(e) => setGlobalThreshold(e.target.value)}
                className="w-20 px-2.5 py-1 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
              <button
                onClick={handleApplyGlobalThreshold}
                disabled={savingGlobal}
                className="px-3 py-1 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {savingGlobal ? 'Applying...' : 'Apply Store-Wide'}
              </button>
            </div>

            {/* Filter Chips & Batch Action */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    filterMode === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  All ({products.length})
                </button>
                <button
                  onClick={() => setFilterMode('critical')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    filterMode === 'critical'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-amber-600 dark:text-amber-400 hover:text-amber-700'
                  }`}
                >
                  Critical (1-2)
                </button>
                <button
                  onClick={() => setFilterMode('out_of_stock')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    filterMode === 'out_of_stock'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-red-600 dark:text-red-400 hover:text-red-700'
                  }`}
                >
                  Out of Stock (0)
                </button>
              </div>

              <button
                onClick={handleBatchRestockAll}
                disabled={loading || filteredProducts.length === 0}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Restock All Suggested (+Qty)</span>
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products by title, SKU, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Product Inventory Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                    <th className="py-3 px-4">Product & SKU</th>
                    <th className="py-3 px-4">Urgency Status</th>
                    <th className="py-3 px-4">Current Stock / Threshold</th>
                    <th className="py-3 px-4">Min. Threshold</th>
                    <th className="py-3 px-4 text-right">Quick Restock (+Qty)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                        <p className="font-semibold text-sm">All inventory healthy!</p>
                        <p className="text-xs">No products are currently below the designated safety thresholds.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isSubmittingRestock = submittingAction[`restock_${p._id}`];
                      const isSubmittingThresh = submittingAction[`thresh_${p._id}`];
                      const stockPercent = Math.min(100, Math.round((p.stock / Math.max(1, p.lowStockThreshold)) * 100));

                      return (
                        <tr
                          key={p._id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Product Info */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {p.thumbnail ? (
                                <img
                                  src={p.thumbnail}
                                  alt={p.title}
                                  className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                              <div className="min-w-0 max-w-xs sm:max-w-sm">
                                <div className="font-bold text-slate-900 dark:text-white truncate" title={p.title}>
                                  {p.title}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                    {p.sku}
                                  </span>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    {p.category}
                                  </span>
                                  {isAdmin && p.vendor?.storeName && (
                                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                                      • {p.vendor.storeName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Urgency Badge */}
                          <td className="py-3 px-4">
                            {p.isOutOfStock ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-300 dark:border-red-800">
                                <AlertCircle className="w-3 h-3" />
                                Out of Stock
                              </span>
                            ) : p.isCritical ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                                <AlertTriangle className="w-3 h-3" />
                                Critical
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-800">
                                Low Stock
                              </span>
                            )}
                          </td>

                          {/* Stock vs Threshold Progress Bar */}
                          <td className="py-3 px-4">
                            <div className="space-y-1 w-36">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span
                                  className={
                                    p.stock <= 0
                                      ? 'text-red-600 dark:text-red-400'
                                      : p.stock <= 2
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-slate-800 dark:text-slate-200'
                                  }
                                >
                                  {p.stock} units
                                </span>
                                <span className="text-slate-400 text-[10px]">Min: {p.lowStockThreshold}</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    p.stock <= 0
                                      ? 'bg-red-600'
                                      : p.stock <= 2
                                      ? 'bg-amber-500'
                                      : 'bg-yellow-400'
                                  }`}
                                  style={{ width: `${Math.max(5, stockPercent)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Editable Threshold */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="1000"
                                value={thresholdInputs[p._id] !== undefined ? thresholdInputs[p._id] : p.lowStockThreshold}
                                onChange={(e) =>
                                  setThresholdInputs((prev) => ({ ...prev, [p._id]: e.target.value }))
                                }
                                className="w-16 px-2 py-1 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-slate-900 dark:text-white"
                              />
                              <button
                                onClick={() => handleUpdateSingleThreshold(p._id)}
                                disabled={isSubmittingThresh}
                                title="Save new threshold"
                                className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors disabled:opacity-50"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          </td>

                          {/* Quick Restock Action */}
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {/* Quick chips */}
                              <button
                                onClick={() => handleQuickRestock(p._id, 25)}
                                disabled={isSubmittingRestock}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold transition-colors disabled:opacity-50"
                              >
                                +25
                              </button>
                              <button
                                onClick={() => handleQuickRestock(p._id, 50)}
                                disabled={isSubmittingRestock}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold transition-colors disabled:opacity-50"
                              >
                                +50
                              </button>
                              <button
                                onClick={() => handleQuickRestock(p._id, 100)}
                                disabled={isSubmittingRestock}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold transition-colors disabled:opacity-50"
                              >
                                +100
                              </button>

                              {/* Custom input & Restock */}
                              <div className="flex items-center ml-1">
                                <input
                                  type="number"
                                  min="1"
                                  max="10000"
                                  value={restockInputs[p._id] !== undefined ? restockInputs[p._id] : 25}
                                  onChange={(e) =>
                                    setRestockInputs((prev) => ({ ...prev, [p._id]: e.target.value }))
                                  }
                                  className="w-14 px-1.5 py-1 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-l text-xs font-mono text-slate-900 dark:text-white"
                                />
                                <button
                                  onClick={() => handleQuickRestock(p._id, restockInputs[p._id])}
                                  disabled={isSubmittingRestock}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-r text-xs font-bold transition-colors disabled:opacity-50"
                                >
                                  {isSubmittingRestock ? '...' : 'Restock'}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Real-time DB synchronization with instant audit ledger logging</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors"
          >
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
}
