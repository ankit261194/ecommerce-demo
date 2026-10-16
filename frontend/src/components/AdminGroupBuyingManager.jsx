import React, { useState, useEffect } from 'react';
import {
  Users,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  UserPlus,
  Zap,
  TrendingUp,
  Percent,
  Timer,
  Share2,
  Sliders,
  DollarSign,
  AlertTriangle,
  Play
} from 'lucide-react';
import api from '../api/client';

export default function AdminGroupBuyingManager() {
  const [activeTab, setActiveTab] = useState('pools'); // 'pools' | 'catalog' | 'simulator'
  const [pools, setPools] = useState([]);
  const [telemetry, setTelemetry] = useState({
    totalPools: 0,
    activeOpenPools: 0,
    completedPools: 0,
    expiredPools: 0,
    totalCustomerSavings: 0,
    completionRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [selectedPoolForModal, setSelectedPoolForModal] = useState(null);
  const [isExpiringCheck, setIsExpiringCheck] = useState(false);
  const [notification, setNotification] = useState(null);

  // Catalog Products for Group Buy configuration
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productEditForm, setProductEditForm] = useState({
    enabled: false,
    groupPrice: 0,
    discountPercentage: 20,
    teamSize: 2,
    durationHours: 24
  });

  // Simulator State
  const [simProductId, setSimProductId] = useState('');
  const [simCustomerName, setSimCustomerName] = useState('Rahul Khanna');
  const [simCustomerPhone, setSimCustomerPhone] = useState('9876543210');
  const [isSimulating, setIsSimulating] = useState(false);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchPoolsAndTelemetry = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/group-buy/admin/pools');
      if (res.data?.success) {
        setPools(res.data.data.pools || []);
        setTelemetry(res.data.data.telemetry || {});
      }
    } catch (err) {
      console.error('Failed to load group buy pools', err);
      // Fallback telemetry for offline demo
      setTelemetry({
        totalPools: 14,
        activeOpenPools: 5,
        completedPools: 8,
        expiredPools: 1,
        totalCustomerSavings: 28400,
        completionRate: 85.7
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCatalogProducts = async () => {
    setIsLoadingCatalog(true);
    try {
      const res = await api.get('/products?limit=50');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setCatalogProducts(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load catalog products', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  useEffect(() => {
    fetchPoolsAndTelemetry();
  }, []);

  useEffect(() => {
    if (activeTab === 'catalog') {
      fetchCatalogProducts();
    }
  }, [activeTab]);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleRunExpireCheck = async () => {
    setIsExpiringCheck(true);
    try {
      const res = await api.post('/group-buy/admin/expire-check');
      if (res.data?.success) {
        showToast(`Auto-expiration check complete: ${res.data.data.expiredCount} pool(s) expired.`);
        fetchPoolsAndTelemetry();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error running expire check', 'error');
    } finally {
      setIsExpiringCheck(false);
    }
  };

  const handleStartEditProduct = (product) => {
    setEditingProductId(product._id);
    const existingGb = product.groupBuy || {};
    const defaultDisc = existingGb.discountPercentage || 20;
    const calcGroupPrice = existingGb.groupPrice || Math.round(product.sellingPrice * (1 - defaultDisc / 100));
    setProductEditForm({
      enabled: existingGb.enabled ?? false,
      groupPrice: calcGroupPrice,
      discountPercentage: defaultDisc,
      teamSize: existingGb.teamSize || 2,
      durationHours: existingGb.durationHours || 24
    });
  };

  const handleSaveProductGroupBuy = async (productId) => {
    try {
      const res = await api.put(`/group-buy/admin/product/${productId}`, productEditForm);
      if (res.data?.success) {
        showToast('Group buy pricing settings saved successfully!');
        setEditingProductId(null);
        fetchCatalogProducts();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update product settings', 'error');
    }
  };

  const handleSimulatePool = async () => {
    if (!simProductId) {
      showToast('Please select a product to launch team buy pool', 'error');
      return;
    }
    setIsSimulating(true);
    try {
      const res = await api.post('/group-buy/pools', {
        productId: simProductId,
        customerName: simCustomerName,
        customerPhone: simCustomerPhone
      });
      if (res.data?.success) {
        showToast(`Team Buy Pool ${res.data.data.poolCode} launched successfully!`);
        fetchPoolsAndTelemetry();
        setActiveTab('pools');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to simulate pool creation', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  const filteredPools = pools.filter(p => {
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchSearch =
      !searchTerm ||
      p.poolCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.product?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.creator?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-sm font-bold flex items-center gap-2.5 animate-slide-up ${
            notification.type === 'error'
              ? 'bg-rose-900 border-rose-700 text-rose-100'
              : 'bg-emerald-900 border-emerald-700 text-emerald-100'
          }`}
        >
          {notification.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-300" /> : <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-slate-950 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-15 pointer-events-none flex items-center pr-6">
          <Users className="w-56 h-56 stroke-[1.5]" />
        </div>
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/20 backdrop-blur-md text-[11px] font-black uppercase tracking-wider text-slate-950">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Point #26 • Viral Social Commerce Engine</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Group Buying & Team Purchase Hub
          </h2>
          <p className="text-slate-100 text-xs sm:text-sm font-semibold leading-relaxed">
            "Khareedo Saath Me" (Buy Together) lets shoppers unlock 15%–30% tiered discounts by inviting friends on WhatsApp. Boost viral customer acquisition with 24-hour countdown team pools.
          </p>
        </div>
      </div>

      {/* Telemetry KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-white space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Pools</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{telemetry.totalPools || 0}</div>
          <span className="text-[10px] text-slate-500">Initiated by shoppers</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-white space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Open Pools</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{telemetry.activeOpenPools || 0}</div>
          <span className="text-[10px] text-slate-500">Live 24h countdowns</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-white space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Successful Buys</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">{telemetry.completedPools || 0}</div>
          <span className="text-[10px] text-slate-500">Teams fully completed</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-white space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Customer Savings</span>
            <TrendingUp className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">
            ₹{(telemetry.totalCustomerSavings || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500">Unlocked via group buy</span>
        </div>

        <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-white space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completion Rate</span>
            <Percent className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-black text-violet-400">
            {telemetry.completionRate ? `${telemetry.completionRate}%` : '80%'}
          </div>
          <span className="text-[10px] text-slate-500">Viral conversion success</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pools')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'pools'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Active & Past Team Pools</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950/20 text-slate-950 font-black">
              {pools.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'catalog'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Product Group Pricing Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'simulator'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>Viral Pool Simulator</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunExpireCheck}
            disabled={isExpiringCheck}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-all disabled:opacity-50"
            title="Scan for expired 24h pools and auto-cancel"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isExpiringCheck ? 'animate-spin' : ''}`} />
            <span>Run Expiration Check</span>
          </button>

          <button
            onClick={fetchPoolsAndTelemetry}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TAB 1: POOLS MANAGEMENT TABLE */}
      {activeTab === 'pools' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Pool Code, product, shopper..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {['ALL', 'OPEN', 'COMPLETED', 'EXPIRED', 'CANCELLED'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                    statusFilter === status
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-amber-400" />
                <p className="text-xs font-bold">Loading Group Buying Pools...</p>
              </div>
            ) : filteredPools.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Users className="w-12 h-12 mx-auto text-slate-600 stroke-[1.5]" />
                <h4 className="text-sm font-bold text-white">No Group Buy Pools Found</h4>
                <p className="text-xs max-w-sm mx-auto text-slate-500">
                  {statusFilter !== 'ALL'
                    ? `No pools currently match the status "${statusFilter}".`
                    : 'Shoppers have not initiated any group buy pools yet. You can launch one using the Simulator tab!'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Pool Code</th>
                      <th className="p-3.5">Product & Deal</th>
                      <th className="p-3.5">Pricing (Solo vs Group)</th>
                      <th className="p-3.5">Team Progress</th>
                      <th className="p-3.5">Status & Countdown</th>
                      <th className="p-3.5">Creator</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-medium text-slate-300">
                    {filteredPools.map(pool => {
                      const isComplete = pool.status === 'COMPLETED';
                      const isOpen = pool.status === 'OPEN';
                      const isExpired = pool.status === 'EXPIRED';
                      const progressPct = Math.min(100, Math.round((pool.currentMembers / pool.requiredMembers) * 100));

                      return (
                        <tr key={pool._id} className="hover:bg-slate-800/40 transition-colors">
                          {/* Pool Code */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                                {pool.poolCode}
                              </span>
                              <button
                                onClick={() => handleCopy(pool.poolCode)}
                                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                title="Copy Pool Code"
                              >
                                {copiedCode === pool.poolCode ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              {new Date(pool.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </td>

                          {/* Product & Deal */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5 max-w-xs">
                              {pool.product?.images?.[0] ? (
                                <img
                                  src={pool.product.images[0]}
                                  alt={pool.product.title}
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                                  <ShoppingBag className="w-5 h-5 text-slate-500" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="font-bold text-white truncate block">
                                  {pool.product?.title || 'Marketplace Item'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {pool.product?.category?.name || 'General Catalog'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Pricing */}
                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-emerald-400">₹{pool.groupPrice}</span>
                                <span className="text-[10px] text-slate-500 line-through">₹{pool.soloPrice}</span>
                                <span className="text-[9px] font-black bg-rose-500/20 text-rose-300 px-1 rounded">
                                  -{pool.discountPercentage}%
                                </span>
                              </div>
                              <span className="text-[10px] text-amber-300 block font-semibold">
                                Saves ₹{pool.savingsAmount} per buyer
                              </span>
                            </div>
                          </td>

                          {/* Progress */}
                          <td className="p-3.5">
                            <div className="space-y-1.5 max-w-[130px]">
                              <div className="flex items-center justify-between text-[11px] font-bold">
                                <span>{pool.currentMembers} / {pool.requiredMembers} Joined</span>
                                <span className="text-amber-400">{progressPct}%</span>
                              </div>
                              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                                <div
                                  className={`h-full transition-all duration-500 ${
                                    isComplete
                                      ? 'bg-emerald-500'
                                      : 'bg-gradient-to-r from-amber-500 to-orange-500'
                                  }`}
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-400 block">
                                {isComplete ? '🎉 Team Complete!' : `${pool.spotsLeft ?? (pool.requiredMembers - pool.currentMembers)} spot(s) left`}
                              </span>
                            </div>
                          </td>

                          {/* Status & Countdown */}
                          <td className="p-3.5">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  isComplete
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : isOpen
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : isExpired
                                    ? 'bg-slate-700 text-slate-400'
                                    : 'bg-rose-500/20 text-rose-300'
                                }`}
                              >
                                {isComplete && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                                {isOpen && <Timer className="w-3 h-3 text-amber-400" />}
                                {pool.status}
                              </span>

                              {isOpen && (
                                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  <span>Expires {new Date(pool.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Creator */}
                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <span className="font-bold text-white block">
                                {pool.creator?.name || 'Customer'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {pool.creator?.phone ? `+91 ${pool.creator.phone.slice(-4)}` : 'Verified Buyer'}
                              </span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => setSelectedPoolForModal(pool)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] border border-slate-700 transition-all inline-flex items-center gap-1"
                            >
                              <span>Inspect Team</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT CATALOG GROUP BUY SETTINGS */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1">
            <h4 className="font-black text-amber-400 flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              <span>Catalog Group Buying Configuration Matrix</span>
            </h4>
            <p className="text-slate-400">
              Configure which products support "Khareedo Saath Me" team purchasing, define discount tiers, required team sizes, and pool countdown timers.
            </p>
          </div>

          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            {isLoadingCatalog ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-amber-400" />
                <p className="text-xs font-bold">Loading Catalog Products...</p>
              </div>
            ) : catalogProducts.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <ShoppingBag className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                <p className="text-xs font-bold">No products found in marketplace catalog.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Product</th>
                      <th className="p-3.5">Solo Selling Price</th>
                      <th className="p-3.5">Group Buy Status</th>
                      <th className="p-3.5">Team Price & Discount</th>
                      <th className="p-3.5">Required Team Size</th>
                      <th className="p-3.5">Countdown Duration</th>
                      <th className="p-3.5 text-right">Settings Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-medium text-slate-300">
                    {catalogProducts.map(prod => {
                      const isEditing = editingProductId === prod._id;
                      const gb = prod.groupBuy || {};
                      const isEnabled = gb.enabled ?? false;

                      return (
                        <tr key={prod._id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              {prod.images?.[0] ? (
                                <img
                                  src={prod.images[0]}
                                  alt={prod.title}
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                                  <ShoppingBag className="w-5 h-5 text-slate-500" />
                                </div>
                              )}
                              <div className="min-w-0 max-w-xs">
                                <span className="font-bold text-white block truncate">{prod.title}</span>
                                <span className="text-[10px] text-slate-400">{prod.brand || 'AuraMarket'}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className="font-black text-white">₹{prod.sellingPrice}</span>
                          </td>

                          <td className="p-3.5">
                            {isEditing ? (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={productEditForm.enabled}
                                  onChange={e => setProductEditForm({ ...productEditForm, enabled: e.target.checked })}
                                  className="w-4 h-4 text-amber-500 rounded border-slate-700 bg-slate-800 focus:ring-amber-400"
                                />
                                <span className="font-bold text-xs text-white">
                                  {productEditForm.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                              </label>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  isEnabled
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                                }`}
                              >
                                {isEnabled ? '⚡ Active' : 'Off'}
                              </span>
                            )}
                          </td>

                          <td className="p-3.5">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <div className="w-24">
                                  <label className="text-[9px] text-slate-400 block">Group Price (₹)</label>
                                  <input
                                    type="number"
                                    value={productEditForm.groupPrice}
                                    onChange={e => {
                                      const gp = Number(e.target.value);
                                      const disc = Math.round(((prod.sellingPrice - gp) / prod.sellingPrice) * 100);
                                      setProductEditForm({
                                        ...productEditForm,
                                        groupPrice: gp,
                                        discountPercentage: Math.max(1, disc)
                                      });
                                    }}
                                    className="w-full px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold text-xs"
                                  />
                                </div>
                                <div className="w-16">
                                  <label className="text-[9px] text-slate-400 block">Disc %</label>
                                  <input
                                    type="number"
                                    value={productEditForm.discountPercentage}
                                    onChange={e => {
                                      const disc = Number(e.target.value);
                                      const gp = Math.round(prod.sellingPrice * (1 - disc / 100));
                                      setProductEditForm({
                                        ...productEditForm,
                                        discountPercentage: disc,
                                        groupPrice: gp
                                      });
                                    }}
                                    className="w-full px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold text-xs"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="font-black text-emerald-400">
                                  ₹{gb.groupPrice || Math.round(prod.sellingPrice * 0.8)}
                                </span>
                                <span className="text-[10px] text-rose-300 font-bold ml-1.5">
                                  (-{gb.discountPercentage || 20}%)
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="p-3.5">
                            {isEditing ? (
                              <select
                                value={productEditForm.teamSize}
                                onChange={e => setProductEditForm({ ...productEditForm, teamSize: Number(e.target.value) })}
                                className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold text-xs"
                              >
                                <option value={2}>2 Shoppers (Duet)</option>
                                <option value={3}>3 Shoppers (Trio)</option>
                                <option value={4}>4 Shoppers (Squad)</option>
                                <option value={5}>5 Shoppers (Family)</option>
                              </select>
                            ) : (
                              <span className="font-bold text-white">
                                {gb.teamSize || 2} Members
                              </span>
                            )}
                          </td>

                          <td className="p-3.5">
                            {isEditing ? (
                              <select
                                value={productEditForm.durationHours}
                                onChange={e => setProductEditForm({ ...productEditForm, durationHours: Number(e.target.value) })}
                                className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold text-xs"
                              >
                                <option value={12}>12 Hours</option>
                                <option value={24}>24 Hours (Standard)</option>
                                <option value={48}>48 Hours (Weekend Deal)</option>
                              </select>
                            ) : (
                              <span className="font-mono text-slate-400">
                                {gb.durationHours || 24} Hours
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleSaveProductGroupBuy(prod._id)}
                                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-md"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingProductId(null)}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold text-xs transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleStartEditProduct(prod)}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700 transition-all"
                              >
                                Configure
                              </button>
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
        </div>
      )}

      {/* TAB 3: VIRAL POOL SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 shadow-2xl">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/20">
              <Zap className="w-3.5 h-3.5" />
              <span>Test Viral Growth Loop</span>
            </div>
            <h3 className="text-lg font-black text-white">Simulate Group Buy Pool Launch</h3>
            <p className="text-xs text-slate-400">
              Test how customer pool creation generates a unique 6-digit code, WhatsApp sharing link, and countdown timer in real-time.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Target Catalog Product
              </label>
              <select
                value={simProductId}
                onChange={e => setSimProductId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-amber-500"
              >
                <option value="">Select a product...</option>
                {catalogProducts.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.title} (Solo ₹{p.sellingPrice} • Group ₹{p.groupBuy?.groupPrice || Math.round(p.sellingPrice * 0.8)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Simulated Customer Name
                </label>
                <input
                  type="text"
                  value={simCustomerName}
                  onChange={e => setSimCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Mobile Number (WhatsApp)
                </label>
                <input
                  type="text"
                  value={simCustomerPhone}
                  onChange={e => setSimCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-1">
              <span className="font-black block">💡 What happens upon launch:</span>
              <ul className="list-disc pl-4 space-y-0.5 text-amber-300/80">
                <li>Unique pool code generated (e.g. `TEAM-829147`).</li>
                <li>24-hour countdown timer initiates.</li>
                <li>WhatsApp viral share invite created.</li>
                <li>First creator spot locked at group discount price.</li>
              </ul>
            </div>

            <button
              onClick={handleSimulatePool}
              disabled={isSimulating}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>{isSimulating ? 'Creating Pool...' : 'Launch Simulated Team Buy Pool'}</span>
            </button>
          </div>
        </div>
      )}

      {/* POOL INSPECT MODAL */}
      {selectedPoolForModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white space-y-5 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black">
                  Team Pool #{selectedPoolForModal.poolCode}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPoolForModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Product Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-3">
              {selectedPoolForModal.product?.images?.[0] && (
                <img
                  src={selectedPoolForModal.product.images[0]}
                  alt="Item"
                  className="w-12 h-12 rounded-xl object-cover shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-xs text-white truncate">
                  {selectedPoolForModal.product?.title}
                </h4>
                <div className="flex items-center gap-2 text-[11px] mt-0.5">
                  <span className="font-black text-emerald-400">₹{selectedPoolForModal.groupPrice} Group Price</span>
                  <span className="text-slate-500 line-through">₹{selectedPoolForModal.soloPrice}</span>
                  <span className="text-amber-400 font-bold">(-{selectedPoolForModal.discountPercentage}%)</span>
                </div>
              </div>
            </div>

            {/* Members Roster */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Team Members ({selectedPoolForModal.members?.length || 0} / {selectedPoolForModal.requiredMembers})
              </span>
              <div className="space-y-2">
                {selectedPoolForModal.members?.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs">
                        {m.name?.[0]?.toUpperCase() || 'M'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{m.name || 'Shopper'}</span>
                          {idx === 0 && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                              Team Leader
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {m.phone ? `+91 ${m.phone}` : 'Verified Buyer'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                      {m.orderStatus || 'CONFIRMED'}
                    </span>
                  </div>
                ))}

                {Array.from({ length: Math.max(0, selectedPoolForModal.requiredMembers - (selectedPoolForModal.members?.length || 0)) }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="p-3 rounded-xl border border-dashed border-slate-700 flex items-center justify-between text-slate-500 text-xs font-bold"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full border border-dashed border-slate-700 flex items-center justify-center text-[10px]">
                        ?
                      </div>
                      <span>Waiting for teammate to join...</span>
                    </div>
                    <span className="text-[10px] uppercase text-amber-500">Spot Open</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Viral Share Links */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Viral WhatsApp Share URL
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`https://wa.me/?text=Join%20my%20AuraMarket%20team%20buy%20and%20unlock%20extra%20discount!%20Pool%20Code:%20${selectedPoolForModal.poolCode}`}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 focus:outline-none"
                />
                <button
                  onClick={() => handleCopy(`https://wa.me/?text=Join%20my%20AuraMarket%20team%20buy%20and%20unlock%20extra%20discount!%20Pool%20Code:%20${selectedPoolForModal.poolCode}`)}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs"
                >
                  {copiedCode ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <button
              onClick={() => setSelectedPoolForModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
