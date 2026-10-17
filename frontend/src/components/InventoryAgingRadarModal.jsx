import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  TrendingDown,
  TrendingUp,
  Download,
  Percent,
  Settings,
  CheckCircle2,
  RefreshCw,
  X,
  Search,
  Filter,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  Flame,
  Zap,
  Tag,
  ShieldAlert,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function InventoryAgingRadarModal({ isOpen, onClose, token }) {
  const [toastMessage, setToastMessage] = useState(null);
  const toast = {
    success: msg => {
      setToastMessage({ type: 'success', text: msg });
      setTimeout(() => setToastMessage(null), 4000);
    },
    error: msg => {
      setToastMessage({ type: 'error', text: msg });
      setTimeout(() => setToastMessage(null), 4000);
    },
  };

  const [loading, setLoading] = useState(false);
  const [radarData, setRadarData] = useState(null);
  const [activeBracket, setActiveBracket] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('age_desc');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [applyingNudgeId, setApplyingNudgeId] = useState(null);
  const [bulkApplying, setBulkApplying] = useState(false);
  const [customDiscountMap, setCustomDiscountMap] = useState({});

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    holdingCostMonthlyRate: 2.0,
    freshThresholdDays: 30,
    slowMovingThresholdDays: 60,
    deadStockThresholdDays: 90,
    slowMovingDiscountPercent: 15,
    deadStockDiscountPercent: 35,
  });

  const fetchRadarData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        bracket: activeBracket,
        search: searchQuery,
        sortBy,
        limit: '100',
      });

      const res = await fetch(`${API_BASE}/vendor/inventory/aging-radar?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setRadarData(json);
        if (json.settings) {
          setSettingsForm(prev => ({
            ...prev,
            ...json.settings,
          }));
        }
      } else {
        toast.error(json.message || 'Failed to fetch inventory velocity radar.');
      }
    } catch (err) {
      toast.error('Network error loading inventory aging radar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRadarData();
    }
  }, [isOpen, activeBracket, sortBy]);

  const handleSearchSubmit = e => {
    e.preventDefault();
    fetchRadarData();
  };

  // 1-Click apply single discount nudge
  const handleApplyNudge = async (productId, discountPercent) => {
    setApplyingNudgeId(productId);
    try {
      const res = await fetch(`${API_BASE}/vendor/inventory/apply-discount-nudge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId,
          discountPercent,
          enrollClearance: true,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || `Discount nudge applied!`);
        fetchRadarData();
      } else {
        toast.error(json.message || 'Failed to apply discount nudge.');
      }
    } catch (err) {
      toast.error('Failed to apply discount nudge.');
    } finally {
      setApplyingNudgeId(null);
    }
  };

  // Bulk Apply Nudges
  const handleBulkApplyNudges = async (discountPercent = 30) => {
    const targetIds = selectedProductIds.length > 0
      ? selectedProductIds
      : (radarData?.data || [])
          .filter(i => i.bracket === 'DEAD_STOCK' || i.bracket === 'SLOW')
          .map(i => i._id);

    if (targetIds.length === 0) {
      toast.error('No dead stock or slow moving items selected.');
      return;
    }

    setBulkApplying(true);
    try {
      const res = await fetch(`${API_BASE}/vendor/inventory/bulk-apply-discount-nudges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productIds: targetIds,
          discountPercent,
          enrollClearance: true,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || `Bulk discount nudge applied to ${targetIds.length} items!`);
        setSelectedProductIds([]);
        fetchRadarData();
      } else {
        toast.error(json.message || 'Failed to apply bulk discount nudges.');
      }
    } catch (err) {
      toast.error('Network error during bulk discount application.');
    } finally {
      setBulkApplying(false);
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const res = await fetch(`${API_BASE}/vendor/inventory/aging-radar/export-csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to generate CSV export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-aging-radar-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Inventory aging radar CSV exported successfully!');
    } catch (err) {
      toast.error('Failed to export CSV report.');
    }
  };

  // Save Settings
  const handleSaveSettings = async e => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/vendor/inventory/aging-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settingsForm),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Velocity radar settings saved!');
        setShowSettings(false);
        fetchRadarData();
      } else {
        toast.error(json.message || 'Failed to save settings.');
      }
    } catch (err) {
      toast.error('Network error updating radar settings.');
    }
  };

  const toggleSelectAll = () => {
    if (!radarData?.data) return;
    if (selectedProductIds.length === radarData.data.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(radarData.data.map(i => i._id));
    }
  };

  const toggleSelectProduct = id => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  if (!isOpen) return null;

  const summary = radarData?.summary;
  const breakdown = summary?.breakdown;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-7xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-slate-100 overflow-hidden">
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
            <div
              className={`px-4 py-2.5 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2 backdrop-blur-md ${
                toastMessage.type === 'error'
                  ? 'bg-rose-950/90 text-rose-200 border-rose-700/80'
                  : 'bg-emerald-950/90 text-emerald-200 border-emerald-700/80'
              }`}
            >
              {toastMessage.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              <span>{toastMessage.text}</span>
            </div>
          </div>
        )}

        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-amber-500 to-orange-400 p-0.5 shadow-lg shadow-orange-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Activity className="w-6 h-6 text-orange-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Inventory Aging & Dead-Stock Velocity Radar
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-full shadow-sm">
                  Point #41
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Live velocity telemetry, capital tied up in slow-moving SKUs, holding cost alerts & automated discount nudges
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition"
              title="Export RFC-4180 CSV Report"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              Export CSV
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition"
              title="Radar Settings & Thresholds"
            >
              <Settings className="w-3.5 h-3.5 text-slate-300" />
              Settings
            </button>

            <button
              onClick={fetchRadarData}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Settings Drawer / Panel */}
          {showSettings && (
            <div className="p-5 bg-slate-950/90 border border-slate-700/80 rounded-2xl animate-in fade-in duration-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <Settings className="w-4 h-4" />
                  Velocity Radar Thresholds & Holding Cost Configuration
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Monthly Holding Cost Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={settingsForm.holdingCostMonthlyRate}
                    onChange={e => setSettingsForm({ ...settingsForm, holdingCostMonthlyRate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Estimated warehouse, insurance & decay rate</span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Dead-Stock Aging Threshold (Days)</label>
                  <input
                    type="number"
                    min="30"
                    max="365"
                    value={settingsForm.deadStockThresholdDays}
                    onChange={e => setSettingsForm({ ...settingsForm, deadStockThresholdDays: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Default 90 days with 0 velocity</span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Slow-Moving Threshold (Days)</label>
                  <input
                    type="number"
                    min="15"
                    max="180"
                    value={settingsForm.slowMovingThresholdDays}
                    onChange={e => setSettingsForm({ ...settingsForm, slowMovingThresholdDays: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Default 60 days</span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Dead-Stock Clearance Discount (%)</label>
                  <input
                    type="number"
                    min="5"
                    max="90"
                    value={settingsForm.deadStockDiscountPercent}
                    onChange={e => setSettingsForm({ ...settingsForm, deadStockDiscountPercent: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Default 35% liquidation discount nudge</span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Slow-Moving Early Nudge (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="80"
                    value={settingsForm.slowMovingDiscountPercent}
                    onChange={e => setSettingsForm({ ...settingsForm, slowMovingDiscountPercent: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Default 15% discount nudge</span>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition"
                  >
                    Save Radar Configuration
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Bento KPI Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            {/* Total Tied-Up Capital */}
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2 font-medium">
                <span>Total Active Inventory</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white tracking-tight">
                ₹{summary?.totalTiedUpCapital?.toLocaleString('en-IN') || '0'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                <span className="text-emerald-400 font-semibold">{summary?.totalSkus || 0} SKUs</span>
                <span>• {summary?.totalUnitsInStock || 0} units</span>
              </div>
            </div>

            {/* Dead-Stock Capital at Risk */}
            <div className="p-4 bg-rose-950/30 border border-rose-800/50 rounded-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between text-rose-300 text-xs mb-2 font-medium">
                <span>Critical Dead-Stock</span>
                <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
              </div>
              <div className="text-2xl font-black text-rose-400 tracking-tight">
                ₹{summary?.deadStockCapital?.toLocaleString('en-IN') || '0'}
              </div>
              <div className="text-[11px] text-rose-300/80 mt-1 flex items-center justify-between">
                <span>{breakdown?.deadStock?.count || 0} Stagnant SKUs</span>
                <span className="font-bold">{breakdown?.deadStock?.percentage || 0}% Trapped</span>
              </div>
            </div>

            {/* Slow-Moving Capital */}
            <div className="p-4 bg-amber-950/30 border border-amber-800/50 rounded-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between text-amber-300 text-xs mb-2 font-medium">
                <span>Slow-Moving Capital</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 tracking-tight">
                ₹{summary?.slowMovingCapital?.toLocaleString('en-IN') || '0'}
              </div>
              <div className="text-[11px] text-amber-300/80 mt-1 flex items-center justify-between">
                <span>{breakdown?.slow?.count || 0} Aging SKUs</span>
                <span className="font-bold">{breakdown?.slow?.percentage || 0}% of Stock</span>
              </div>
            </div>

            {/* Monthly Holding Loss */}
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2 font-medium">
                <span>Est. Monthly Holding Loss</span>
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-rose-300 tracking-tight">
                ₹{summary?.estimatedMonthlyHoldingCost?.toLocaleString('en-IN') || '0'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span className="text-rose-400 font-semibold">{settingsForm.holdingCostMonthlyRate}%</span>
                <span>carrying cost / month</span>
              </div>
            </div>

            {/* Health Score Meter */}
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2 font-medium">
                <span>Inventory Health Score</span>
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-black text-emerald-400 tracking-tight">
                  {summary?.inventoryHealthScore || 100}%
                </div>
                <span className="text-[11px] text-slate-400">Turnover Velocity</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-700/60 h-2 rounded-full mt-2.5 overflow-hidden flex">
                <div
                  style={{ width: `${breakdown?.fresh?.percentage || 0}%` }}
                  className="bg-emerald-500 h-full"
                  title={`Fresh: ${breakdown?.fresh?.percentage}%`}
                />
                <div
                  style={{ width: `${breakdown?.normal?.percentage || 0}%` }}
                  className="bg-sky-500 h-full"
                  title={`Normal: ${breakdown?.normal?.percentage}%`}
                />
                <div
                  style={{ width: `${breakdown?.slow?.percentage || 0}%` }}
                  className="bg-amber-500 h-full"
                  title={`Slow: ${breakdown?.slow?.percentage}%`}
                />
                <div
                  style={{ width: `${breakdown?.deadStock?.percentage || 0}%` }}
                  className="bg-rose-500 h-full"
                  title={`Dead-Stock: ${breakdown?.deadStock?.percentage}%`}
                />
              </div>
            </div>
          </div>

          {/* Automated Liquidation Recommendation Ribbon */}
          {((breakdown?.deadStock?.count || 0) > 0 || (breakdown?.slow?.count || 0) > 0) && (
            <div className="p-4 bg-gradient-to-r from-rose-950/60 via-slate-900 to-amber-950/40 border border-rose-800/50 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-500/20 rounded-xl text-rose-400">
                  <Flame className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    Automated Liquidation Clearance Recommendations
                    <span className="px-2 py-0.5 bg-rose-500/30 text-rose-300 text-[10px] rounded-full uppercase font-extrabold">
                      {(breakdown?.deadStock?.count || 0) + (breakdown?.slow?.count || 0)} SKUs at Risk
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Recover up to <strong className="text-emerald-400">₹{((summary?.deadStockCapital || 0) * 0.65 + (summary?.slowMovingCapital || 0) * 0.85).toLocaleString('en-IN')}</strong> in trapped working capital by applying automated clearance discounts before additional monthly holding fees accrue.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <button
                  onClick={() => handleBulkApplyNudges(settingsForm.deadStockDiscountPercent || 35)}
                  disabled={bulkApplying}
                  className="w-full md:w-auto px-4 py-2 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/20 transition flex items-center justify-center gap-2"
                >
                  <Percent className="w-4 h-4" />
                  {bulkApplying ? 'Applying Liquidation...' : `Bulk Apply ${settingsForm.deadStockDiscountPercent || 35}% Clearance Nudge`}
                </button>
              </div>
            </div>
          )}

          {/* Filtering, Search & Tab Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
            {/* Aging Bracket Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl w-full md:w-auto overflow-x-auto">
              {[
                { key: 'ALL', label: 'All Inventory', count: summary?.totalSkus || 0, color: 'text-slate-200' },
                { key: 'FRESH', label: '🟢 Fresh Movers (<30d)', count: breakdown?.fresh?.count || 0, color: 'text-emerald-400' },
                { key: 'NORMAL', label: '🔵 Stable (31-60d)', count: breakdown?.normal?.count || 0, color: 'text-sky-400' },
                { key: 'SLOW', label: '🟠 Slow-Moving (61-90d)', count: breakdown?.slow?.count || 0, color: 'text-amber-400' },
                { key: 'DEAD_STOCK', label: '🔴 Dead-Stock (90d+)', count: breakdown?.deadStock?.count || 0, color: 'text-rose-400' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveBracket(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    activeBracket === tab.key
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-md bg-slate-900 text-[10px] font-bold ${tab.color}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search & Sort Controls */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search SKU, title, brand..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
              </form>

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500 transition"
              >
                <option value="age_desc">Oldest Age First</option>
                <option value="age_asc">Newest Age First</option>
                <option value="capital_desc">Highest Capital Trapped</option>
                <option value="capital_asc">Lowest Capital</option>
                <option value="velocity_desc">Highest Velocity</option>
                <option value="velocity_asc">Lowest Velocity (Dead First)</option>
              </select>
            </div>
          </div>

          {/* Products Radar Table */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-inner">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="p-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.length > 0 && selectedProductIds.length === radarData?.data?.length}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="p-3.5">Product SKU & Title</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5 text-center">Aging Radar</th>
                    <th className="p-3.5 text-center">30D Velocity</th>
                    <th className="p-3.5 text-center">Runout / Supply</th>
                    <th className="p-3.5 text-right">Available Stock</th>
                    <th className="p-3.5 text-right">Tied-Up Capital</th>
                    <th className="p-3.5 text-right">Mo. Holding Loss</th>
                    <th className="p-3.5 text-center">Automated Discount Nudge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="p-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-2" />
                        Scanning warehouse velocity telemetry...
                      </td>
                    </tr>
                  ) : !radarData?.data || radarData.data.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="p-12 text-center text-slate-400">
                        <Package className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        No inventory matching the selected aging bracket or search query.
                      </td>
                    </tr>
                  ) : (
                    radarData.data.map(item => {
                      const isSelected = selectedProductIds.includes(item._id);
                      const customDiscount = customDiscountMap[item._id] || item.recommendedDiscount || 25;

                      return (
                        <tr
                          key={item._id}
                          className={`hover:bg-slate-900/50 transition ${
                            isSelected ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectProduct(item._id)}
                              className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* Product Thumbnail & Title */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="w-10 h-10 rounded-lg object-cover bg-slate-800 border border-slate-700/60 flex-shrink-0"
                                onError={e => {
                                  e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100';
                                }}
                              />
                              <div className="min-w-0 max-w-xs">
                                <div className="font-semibold text-slate-100 truncate text-xs" title={item.title}>
                                  {item.title}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-amber-400/90">{item.sku}</span>
                                  <span>•</span>
                                  <span>₹{item.sellingPrice}</span>
                                  {item.hasClearanceTag && (
                                    <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 rounded text-[9px] font-bold">
                                      CLEARANCE
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="p-3.5 text-slate-300 font-medium">
                            {item.category}
                          </td>

                          {/* Aging Radar Bracket */}
                          <td className="p-3.5 text-center">
                            <div className="inline-flex flex-col items-center">
                              {item.bracket === 'DEAD_STOCK' && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Dead Stock ({item.ageDays}d)
                                </span>
                              )}
                              {item.bracket === 'SLOW' && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Slow ({item.ageDays}d)
                                </span>
                              )}
                              {item.bracket === 'NORMAL' && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                                  Stable ({item.ageDays}d)
                                </span>
                              )}
                              {item.bracket === 'FRESH' && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                  <Zap className="w-3 h-3" />
                                  Fresh ({item.ageDays}d)
                                </span>
                              )}
                              <span className="text-[9px] text-slate-500 mt-0.5">
                                Last sale: {item.daysSinceLastSale === 0 ? 'Today' : `${item.daysSinceLastSale}d ago`}
                              </span>
                            </div>
                          </td>

                          {/* 30D Velocity */}
                          <td className="p-3.5 text-center">
                            <div className="font-bold text-slate-200">
                              {item.unitsSold30d} sold
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {item.dailySalesVelocity} / day ({item.weeklySalesVelocity}/wk)
                            </div>
                          </td>

                          {/* Runout / Days of Supply */}
                          <td className="p-3.5 text-center">
                            {item.daysOfSupply >= 999 ? (
                              <span className="text-rose-400 font-bold text-[11px] flex items-center justify-center gap-1">
                                <TrendingDown className="w-3 h-3" /> Stagnant
                              </span>
                            ) : (
                              <span className={`font-semibold ${
                                item.daysOfSupply <= 15 ? 'text-amber-400' : 'text-slate-300'
                              }`}>
                                {item.daysOfSupply} days
                              </span>
                            )}
                          </td>

                          {/* Stock */}
                          <td className="p-3.5 text-right font-bold text-slate-100">
                            {item.stock} units
                          </td>

                          {/* Tied Up Capital */}
                          <td className="p-3.5 text-right">
                            <div className="font-bold text-slate-100">
                              ₹{item.tiedUpCapital.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              at ₹{item.sellingPrice}/ea
                            </div>
                          </td>

                          {/* Monthly Holding Cost */}
                          <td className="p-3.5 text-right">
                            <div className="font-semibold text-rose-300">
                              ₹{item.monthlyHoldingCost.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[9px] text-slate-500">
                              holding / mo
                            </div>
                          </td>

                          {/* Nudge Action */}
                          <td className="p-3.5 text-center">
                            {item.bracket === 'DEAD_STOCK' || item.bracket === 'SLOW' || item.recommendedDiscount > 0 ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <select
                                  value={customDiscount}
                                  onChange={e =>
                                    setCustomDiscountMap({
                                      ...customDiscountMap,
                                      [item._id]: parseInt(e.target.value, 10),
                                    })
                                  }
                                  className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[11px] text-amber-400 font-bold"
                                >
                                  <option value={15}>15% Off</option>
                                  <option value={20}>20% Off</option>
                                  <option value={25}>25% Off</option>
                                  <option value={30}>30% Off</option>
                                  <option value={35}>35% Off</option>
                                  <option value={40}>40% Off</option>
                                  <option value={50}>50% Off</option>
                                </select>

                                <button
                                  onClick={() => handleApplyNudge(item._id, customDiscount)}
                                  disabled={applyingNudgeId === item._id}
                                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[11px] shadow transition flex items-center gap-1 whitespace-nowrap"
                                  title={`Adjust price to ₹${Math.round((item.mrp || item.sellingPrice) * (1 - customDiscount / 100))}`}
                                >
                                  {applyingNudgeId === item._id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Zap className="w-3 h-3" />
                                  )}
                                  Nudge (₹{Math.round((item.mrp || item.sellingPrice) * (1 - customDiscount / 100))})
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-emerald-400 font-medium flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Optimal Velocity
                              </span>
                            )}
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

        {/* Modal Sticky Footer */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span>
              Showing <strong className="text-white">{radarData?.data?.length || 0}</strong> of <strong className="text-white">{radarData?.pagination?.totalItems || 0}</strong> products
            </span>
            {selectedProductIds.length > 0 && (
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 font-bold rounded-lg border border-amber-500/30">
                {selectedProductIds.length} items selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {selectedProductIds.length > 0 && (
              <button
                onClick={() => handleBulkApplyNudges(30)}
                disabled={bulkApplying}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold rounded-xl shadow transition"
              >
                Apply 30% Clearance Nudge to Selected ({selectedProductIds.length})
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700 transition"
            >
              Close Radar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
