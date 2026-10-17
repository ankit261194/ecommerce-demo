import React, { useState, useEffect, useCallback } from 'react';
import {
  Crown,
  Award,
  Sparkles,
  ShieldCheck,
  Gem,
  Coins,
  Users,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  RefreshCw,
  Sliders,
  X,
  Wallet,
  Clock,
  ArrowUpRight,
  ChevronRight,
  Lock,
  Unlock,
  Gift,
  Truck,
  Percent,
  PlusCircle,
  MinusCircle,
  Save,
  CalendarCheck,
  Flame,
} from 'lucide-react';
import api from '../api/client';

export default function LoyaltyTierManager() {
  const [activeTab, setActiveTab] = useState('tiers'); // tiers, customers, rules, ledger
  const [config, setConfig] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters & Pagination for Customers
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('lifetimeSpend');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters for Ledger
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('ALL');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [totalLedgerPages, setTotalLedgerPages] = useState(1);

  // Modals
  const [isEditTierModalOpen, setIsEditTierModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
  const [isTierOverrideModalOpen, setIsTierOverrideModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Notification Toast
  const [notification, setNotification] = useState(null);

  // Form states
  const [pointsForm, setPointsForm] = useState({
    points: 100,
    type: 'CREDIT',
    reason: '',
  });

  const [tierOverrideForm, setTierOverrideForm] = useState({
    tier: 'GOLD',
    tierLock: true,
    customDiscountPercentage: 0,
    reason: '',
  });

  const [rulesForm, setRulesForm] = useState({
    programEnabled: true,
    pointsToRupeeRatio: 1,
    minRedeemPoints: 50,
    maxRedeemPercentagePerOrder: 50,
    dailyCheckInBasePoints: 10,
    dailyCheckInStreakBonus: 5,
    welcomeBonusPoints: 200,
    autoPromoteEnabled: true,
  });

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch Loyalty Program Config & Analytics
  const fetchConfigAndAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const [configRes, analyticsRes] = await Promise.all([
        api.get('/admin/loyalty/config'),
        api.get('/admin/loyalty/analytics'),
      ]);

      if (configRes.data?.success) {
        setConfig(configRes.data.data);
        setRulesForm({
          programEnabled: configRes.data.data.programEnabled !== false,
          pointsToRupeeRatio: configRes.data.data.pointsToRupeeRatio || 1,
          minRedeemPoints: configRes.data.data.minRedeemPoints ?? 50,
          maxRedeemPercentagePerOrder: configRes.data.data.maxRedeemPercentagePerOrder ?? 50,
          dailyCheckInBasePoints: configRes.data.data.dailyCheckInBasePoints ?? 10,
          dailyCheckInStreakBonus: configRes.data.data.dailyCheckInStreakBonus ?? 5,
          welcomeBonusPoints: configRes.data.data.welcomeBonusPoints ?? 200,
          autoPromoteEnabled: configRes.data.data.autoPromoteEnabled !== false,
        });
      }

      if (analyticsRes.data?.success) {
        setAnalytics(analyticsRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching loyalty configuration:', err);
      showNotification('error', 'Failed to load loyalty configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Customers Directory
  const fetchCustomers = useCallback(async () => {
    try {
      let url = `/admin/loyalty/customers?page=${page}&limit=15&sortBy=${sortBy}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      if (tierFilter !== 'ALL') url += `&tier=${tierFilter}`;

      const res = await api.get(url);
      if (res.data?.success) {
        setCustomers(res.data.data.customers || []);
        setTotalPages(res.data.data.pagination?.pages || 1);
      }
    } catch (err) {
      console.error('Error fetching loyalty customers:', err);
    }
  }, [page, searchQuery, tierFilter, sortBy]);

  // Fetch Activity Ledger
  const fetchLedger = useCallback(async () => {
    try {
      let url = `/admin/loyalty/logs?page=${ledgerPage}&limit=20`;
      if (ledgerTypeFilter !== 'ALL') url += `&type=${ledgerTypeFilter}`;

      const res = await api.get(url);
      if (res.data?.success) {
        setLogs(res.data.data.logs || []);
        setTotalLedgerPages(res.data.data.pagination?.pages || 1);
      }
    } catch (err) {
      console.error('Error fetching loyalty ledger:', err);
    }
  }, [ledgerPage, ledgerTypeFilter]);

  useEffect(() => {
    fetchConfigAndAnalytics();
  }, [fetchConfigAndAnalytics]);

  useEffect(() => {
    if (activeTab === 'customers') {
      fetchCustomers();
    } else if (activeTab === 'ledger') {
      fetchLedger();
    }
  }, [activeTab, fetchCustomers, fetchLedger]);

  // Handle Edit Tier Save
  const handleSaveTier = async (e) => {
    e.preventDefault();
    if (!selectedTier || !config) return;

    try {
      setLoading(true);
      const updatedTiers = config.tiers.map((t) =>
        t.tier === selectedTier.tier ? selectedTier : t
      );

      const res = await api.put('/admin/loyalty/config', {
        ...config,
        tiers: updatedTiers,
      });

      if (res.data?.success) {
        setConfig(res.data.data);
        setIsEditTierModalOpen(false);
        showNotification('success', `Tier ${selectedTier.name} updated successfully!`);
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to update tier');
    } finally {
      setLoading(false);
    }
  };

  // Handle Points Adjustment
  const handleAdjustPoints = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      setLoading(true);
      const res = await api.post('/admin/loyalty/adjust-points', {
        userId: selectedCustomer._id,
        points: Number(pointsForm.points),
        type: pointsForm.type,
        reason: pointsForm.reason,
      });

      if (res.data?.success) {
        setIsPointsModalOpen(false);
        setPointsForm({ points: 100, type: 'CREDIT', reason: '' });
        showNotification('success', res.data.message);
        fetchCustomers();
        fetchConfigAndAnalytics();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to adjust points');
    } finally {
      setLoading(false);
    }
  };

  // Handle Tier Override
  const handleOverrideTier = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      setLoading(true);
      const res = await api.post('/admin/loyalty/override-tier', {
        userId: selectedCustomer._id,
        tier: tierOverrideForm.tier,
        tierLock: tierOverrideForm.tierLock,
        customDiscountPercentage: Number(tierOverrideForm.customDiscountPercentage || 0),
        reason: tierOverrideForm.reason,
      });

      if (res.data?.success) {
        setIsTierOverrideModalOpen(false);
        setTierOverrideForm({ tier: 'GOLD', tierLock: true, customDiscountPercentage: 0, reason: '' });
        showNotification('success', res.data.message);
        fetchCustomers();
        fetchConfigAndAnalytics();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to update customer tier');
    } finally {
      setLoading(false);
    }
  };

  // Handle Save System Rules
  const handleSaveRules = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.put('/admin/loyalty/config', {
        ...rulesForm,
      });
      if (res.data?.success) {
        setConfig(res.data.data);
        showNotification('success', 'Loyalty rules updated successfully!');
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to update rules');
    } finally {
      setLoading(false);
    }
  };

  const getTierBadgeClass = (tier) => {
    switch (tier) {
      case 'DIAMOND':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'PLATINUM':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'GOLD':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'SILVER':
        return 'bg-slate-300/10 text-slate-300 border-slate-400/30';
      default:
        return 'bg-amber-700/10 text-amber-600 border-amber-700/30';
    }
  };

  const getTierIcon = (tier) => {
    switch (tier) {
      case 'DIAMOND':
        return <Gem className="w-5 h-5 text-cyan-400" />;
      case 'PLATINUM':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'GOLD':
        return <Crown className="w-5 h-5 text-amber-400" />;
      case 'SILVER':
        return <ShieldCheck className="w-5 h-5 text-slate-300" />;
      default:
        return <Award className="w-5 h-5 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold border backdrop-blur-md animate-slide-in ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500 text-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" /> Point #27 VIP Loyalty Matrix
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  config?.programEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
              >
                {config?.programEnabled ? '● Program Active' : '○ Paused'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              VIP Loyalty Points & Customer Tier Matrix
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Configure tiered VIP member privileges (Bronze, Silver, Gold, Platinum, Diamond) with automatic lifetime spend promotion, multi-level cashback multipliers, and free delivery perks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchConfigAndAnalytics();
                if (activeTab === 'customers') fetchCustomers();
                if (activeTab === 'ledger') fetchLedger();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-bold transition-all shadow-md"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Bento Metrics Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/60">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold">Total Members</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {analytics?.totalCustomers?.toLocaleString('en-IN') || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-amber-400 font-bold">
                ₹{((analytics?.totalLifetimeSpend || 0) / 100000).toFixed(1)}L
              </span>
              <span>All-time Gross GMV</span>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold">Circulating Coins</span>
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400">
              {analytics?.totalPointsInCirculation?.toLocaleString('en-IN') || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              In customer active wallets
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold">Financial Liability</span>
              <Wallet className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-white">
              ₹{analytics?.financialLiabilityInr?.toLocaleString('en-IN') || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Redemption liability (₹1/pt)
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-bold">VIP Elite (Plat/Dia)</span>
              <Gem className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-cyan-400">
              {((analytics?.distribution?.PLATINUM || 0) + (analytics?.distribution?.DIAMOND || 0)).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              High tier royalty shoppers
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('tiers')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black transition-all ${
            activeTab === 'tiers'
              ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>Tier Architecture & Perks</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black transition-all ${
            activeTab === 'customers'
              ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>VIP Customers Directory</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black transition-all ${
            activeTab === 'rules'
              ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Gamification & Rules Engine</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black transition-all ${
            activeTab === 'ledger'
              ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Points Audit Ledger</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TIER ARCHITECTURE & MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'tiers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Configured Membership Tiers</h2>
              <p className="text-xs text-slate-500">
                Customers auto-promote as their lifetime spend or order thresholds are fulfilled.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            {(config?.tiers || []).map((tier) => (
              <div
                key={tier.tier}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      {getTierIcon(tier.tier)}
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${getTierBadgeClass(
                        tier.tier
                      )}`}
                    >
                      {tier.tier}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900">{tier.name}</h3>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <span>Min Spend:</span>
                    <span className="font-bold text-slate-900">
                      {tier.minSpend > 0 ? `₹${tier.minSpend.toLocaleString('en-IN')}` : '₹0 (Default)'}
                    </span>
                  </div>

                  {tier.minOrders > 0 && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      Or Min Orders: <span className="font-bold text-slate-900">{tier.minOrders} orders</span>
                    </div>
                  )}

                  {/* Highlights Grid */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Cashback Multiplier:</span>
                      <span className="font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/50">
                        {tier.cashbackMultiplier}x
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Cart Discount:</span>
                      <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/50">
                        {tier.discountPercentage > 0 ? `${tier.discountPercentage}%` : '0%'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Free Shipping:</span>
                      <span
                        className={`font-bold text-[11px] px-2 py-0.5 rounded-lg ${
                          tier.freeShippingAlways
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-slate-400'
                        }`}
                      >
                        {tier.freeShippingAlways ? 'Always Free' : 'Standard'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Birthday Bonus:</span>
                      <span className="font-bold text-slate-800">
                        🪙 {tier.birthdayBonusCoins || 50}
                      </span>
                    </div>
                  </div>

                  {/* Perks List */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Active Privileges
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {(tier.perks || []).slice(0, 3).map((perk, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setSelectedTier({ ...tier });
                      setIsEditTierModalOpen(true);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Edit Tier Config</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VIP CUSTOMERS DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'customers' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Customer Loyalty Registry</h2>
              <p className="text-xs text-slate-500">
                View customer tier standing, points balances, or manually credit/debit points.
              </p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500 w-56 sm:w-64"
                />
              </div>

              <select
                value={tierFilter}
                onChange={(e) => {
                  setTierFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Tiers</option>
                <option value="BRONZE">Bronze</option>
                <option value="SILVER">Silver</option>
                <option value="GOLD">Gold</option>
                <option value="PLATINUM">Platinum</option>
                <option value="DIAMOND">Diamond</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500"
              >
                <option value="lifetimeSpend">Sort: Highest Spend</option>
                <option value="pointsBalance">Sort: Most Coins</option>
                <option value="lifetimeOrdersCount">Sort: Most Orders</option>
                <option value="createdAt">Sort: Newest</option>
              </select>
            </div>
          </div>

          {/* Customer Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Tier Status</th>
                  <th className="py-3 px-4">Lifetime Spend</th>
                  <th className="py-3 px-4">Orders</th>
                  <th className="py-3 px-4">Reward Coins</th>
                  <th className="py-3 px-4">Tier Lock</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No customers match the filter criteria.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => {
                    const tierName = c.loyalty?.tier || 'BRONZE';
                    return (
                      <tr key={c._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-200">
                              {c.name ? c.name[0].toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{c.name}</div>
                              <div className="text-[11px] text-slate-400">{c.email}</div>
                              <div className="text-[10px] text-slate-400">{c.phone}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${getTierBadgeClass(
                              tierName
                            )}`}
                          >
                            {getTierIcon(tierName)}
                            <span>{tierName}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 font-black text-slate-900">
                          ₹{(c.loyalty?.lifetimeSpend || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-700">
                          {c.loyalty?.lifetimeOrdersCount || 0} orders
                        </td>

                        <td className="py-3 px-4 font-black text-amber-600">
                          🪙 {(c.walletCoins || c.loyalty?.pointsBalance || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-4">
                          {c.loyalty?.tierLock ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                              <Unlock className="w-3 h-3" /> Dynamic
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSelectedCustomer(c);
                              setPointsForm({ points: 100, type: 'CREDIT', reason: '' });
                              setIsPointsModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg border border-amber-200 transition-all text-[11px]"
                          >
                            Adjust Coins
                          </button>

                          <button
                            onClick={() => {
                              setSelectedCustomer(c);
                              setTierOverrideForm({
                                tier: c.loyalty?.tier || 'BRONZE',
                                tierLock: Boolean(c.loyalty?.tierLock),
                                customDiscountPercentage: c.loyalty?.customDiscountPercentage || 0,
                                reason: '',
                              });
                              setIsTierOverrideModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-all text-[11px]"
                          >
                            Set Tier
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 font-bold"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 font-bold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GAMIFICATION & RULES ENGINE */}
      {/* ========================================================================= */}
      {activeTab === 'rules' && (
        <form onSubmit={handleSaveRules} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900">Loyalty & Gamification Engine Settings</h2>
            <p className="text-xs text-slate-500">
              Configure daily attendance rewards, coin conversion values, and automated promotion logic.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            {/* Daily Check-In Gamification */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
                <CalendarCheck className="w-5 h-5 text-amber-600" />
                <span>Daily Check-in Attendance Rewards</span>
              </div>
              <p className="text-xs text-slate-600">
                Encourage daily app retention by rewarding shoppers with coins every day they open the storefront.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Base Day 1 Coins</label>
                  <input
                    type="number"
                    min="1"
                    value={rulesForm.dailyCheckInBasePoints}
                    onChange={(e) =>
                      setRulesForm({ ...rulesForm, dailyCheckInBasePoints: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Streak Bonus / Day</label>
                  <input
                    type="number"
                    min="0"
                    value={rulesForm.dailyCheckInStreakBonus}
                    onChange={(e) =>
                      setRulesForm({ ...rulesForm, dailyCheckInStreakBonus: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Redemption & Coin Value */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                <Coins className="w-5 h-5 text-indigo-600" />
                <span>Coin Redemption Value</span>
              </div>
              <p className="text-xs text-slate-600">
                1 Coin = ₹1 discount by default. Set minimum coin thresholds to prevent micro-redemptions.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">INR per Coin (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={rulesForm.pointsToRupeeRatio}
                    onChange={(e) =>
                      setRulesForm({ ...rulesForm, pointsToRupeeRatio: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Coins to Redeem</label>
                  <input
                    type="number"
                    min="0"
                    value={rulesForm.minRedeemPoints}
                    onChange={(e) =>
                      setRulesForm({ ...rulesForm, minRedeemPoints: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Welcome Bonus & Max Cap */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                <Gift className="w-5 h-5 text-rose-600" />
                <span>New Shopper Incentives</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Welcome Signup Bonus</label>
                  <input
                    type="number"
                    min="0"
                    value={rulesForm.welcomeBonusPoints}
                    onChange={(e) =>
                      setRulesForm({ ...rulesForm, welcomeBonusPoints: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Order % Redeemable</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={rulesForm.maxRedeemPercentagePerOrder}
                    onChange={(e) =>
                      setRulesForm({ ...rulesForm, maxRedeemPercentagePerOrder: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Program Toggles */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                <Flame className="w-5 h-5 text-emerald-600" />
                <span>Automation Switches</span>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Program Master Switch</div>
                    <div className="text-[11px] text-slate-500">Allow customers to earn and redeem coins</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={rulesForm.programEnabled}
                    onChange={(e) => setRulesForm({ ...rulesForm, programEnabled: e.target.checked })}
                    className="w-5 h-5 accent-amber-500 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Auto Tier Promotions</div>
                    <div className="text-[11px] text-slate-500">Auto promote customer when spend threshold is met</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={rulesForm.autoPromoteEnabled}
                    onChange={(e) => setRulesForm({ ...rulesForm, autoPromoteEnabled: e.target.checked })}
                    className="w-5 h-5 accent-amber-500 rounded"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save System Rules</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: POINTS AUDIT LEDGER */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Loyalty Movement Audit Ledger</h2>
              <p className="text-xs text-slate-500">
                Immutable activity records for every coin credited, burned, or manually adjusted.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={ledgerTypeFilter}
                onChange={(e) => {
                  setLedgerTypeFilter(e.target.value);
                  setLedgerPage(1);
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Event Types</option>
                <option value="EARN_ORDER">Order Cashback</option>
                <option value="REDEEM_ORDER">Checkout Redemption</option>
                <option value="DAILY_CHECKIN">Daily Check-in</option>
                <option value="TIER_UPGRADE">Tier Upgrades</option>
                <option value="ADMIN_ADJUSTMENT">Admin Adjustments</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Coins Shift</th>
                  <th className="py-3 px-4">Balance After</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Authorized By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No loyalty audit records found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900">
                        {log.user?.name || 'Customer'}
                        <div className="text-[10px] text-slate-400 font-normal">
                          {log.user?.email}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                          {log.type}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-black">
                        {log.points > 0 ? (
                          <span className="text-emerald-600">+{log.points}</span>
                        ) : log.points < 0 ? (
                          <span className="text-rose-600">{log.points}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        🪙 {log.balanceAfter}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getTierBadgeClass(log.tier)}`}>
                          {log.tier}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 text-[11px] max-w-xs truncate">
                        {log.description || log.title}
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {log.performedBy?.name || 'System Auto'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Ledger Pagination */}
          {totalLedgerPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <span>
                Page {ledgerPage} of {totalLedgerPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={ledgerPage <= 1}
                  onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 font-bold"
                >
                  Previous
                </button>
                <button
                  disabled={ledgerPage >= totalLedgerPages}
                  onClick={() => setLedgerPage((p) => Math.min(totalLedgerPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 font-bold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT TIER THRESHOLDS & PERKS */}
      {/* ========================================================================= */}
      {isEditTierModalOpen && selectedTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                {getTierIcon(selectedTier.tier)}
                <h3 className="text-lg font-black text-slate-900">
                  Edit Tier: {selectedTier.name}
                </h3>
              </div>
              <button
                onClick={() => setIsEditTierModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTier} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={selectedTier.name}
                  onChange={(e) => setSelectedTier({ ...selectedTier, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Spend (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={selectedTier.minSpend}
                    onChange={(e) => setSelectedTier({ ...selectedTier, minSpend: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Completed Orders</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={selectedTier.minOrders}
                    onChange={(e) => setSelectedTier({ ...selectedTier, minOrders: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cashback Multiplier</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    required
                    value={selectedTier.cashbackMultiplier}
                    onChange={(e) => setSelectedTier({ ...selectedTier, cashbackMultiplier: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cart Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={selectedTier.discountPercentage}
                    onChange={(e) => setSelectedTier({ ...selectedTier, discountPercentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Birthday Bonus Coins</label>
                  <input
                    type="number"
                    min="0"
                    value={selectedTier.birthdayBonusCoins || 50}
                    onChange={(e) => setSelectedTier({ ...selectedTier, birthdayBonusCoins: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={selectedTier.freeShippingAlways}
                      onChange={(e) => setSelectedTier({ ...selectedTier, freeShippingAlways: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                    <span>Unconditional Free Shipping</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditTierModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md"
                >
                  Save Tier Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MANUAL POINTS ADJUSTMENT */}
      {/* ========================================================================= */}
      {isPointsModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Adjust Customer Coins</h3>
                <p className="text-xs text-slate-500">
                  {selectedCustomer.name} ({selectedCustomer.email})
                </p>
              </div>
              <button
                onClick={() => setIsPointsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/50 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800">Current Balance:</span>
              <span className="text-sm font-black text-amber-600">
                🪙 {(selectedCustomer.walletCoins || 0).toLocaleString('en-IN')} Coins
              </span>
            </div>

            <form onSubmit={handleAdjustPoints} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPointsForm({ ...pointsForm, type: 'CREDIT' })}
                    className={`py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
                      pointsForm.type === 'CREDIT'
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" /> Credit Coins
                  </button>

                  <button
                    type="button"
                    onClick={() => setPointsForm({ ...pointsForm, type: 'DEBIT' })}
                    className={`py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
                      pointsForm.type === 'DEBIT'
                        ? 'bg-rose-500 text-white border-rose-500 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <MinusCircle className="w-4 h-4" /> Debit Coins
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Number of Coins</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={pointsForm.points}
                  onChange={(e) => setPointsForm({ ...pointsForm, points: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mandatory Audit Reason Note
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Goodwill gesture for delayed transit or festive promotion bonus..."
                  value={pointsForm.reason}
                  onChange={(e) => setPointsForm({ ...pointsForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPointsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-md"
                >
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MANUAL TIER OVERRIDE */}
      {/* ========================================================================= */}
      {isTierOverrideModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">VIP Tier Override</h3>
                <p className="text-xs text-slate-500">
                  {selectedCustomer.name} (Current: {selectedCustomer.loyalty?.tier || 'BRONZE'})
                </p>
              </div>
              <button
                onClick={() => setIsTierOverrideModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOverrideTier} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target VIP Tier</label>
                <select
                  value={tierOverrideForm.tier}
                  onChange={(e) => setTierOverrideForm({ ...tierOverrideForm, tier: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:border-amber-500"
                >
                  <option value="BRONZE">Bronze Explorer</option>
                  <option value="SILVER">Silver Patron</option>
                  <option value="GOLD">Gold Premier</option>
                  <option value="PLATINUM">Platinum Elite</option>
                  <option value="DIAMOND">Diamond Royalty</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Custom Permanent Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={tierOverrideForm.customDiscountPercentage}
                  onChange={(e) =>
                    setTierOverrideForm({
                      ...tierOverrideForm,
                      customDiscountPercentage: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Tier Lock Protection</div>
                    <div className="text-[11px] text-slate-500">
                      Prevent auto-demotion or automated tier recalculations
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={tierOverrideForm.tierLock}
                    onChange={(e) =>
                      setTierOverrideForm({ ...tierOverrideForm, tierLock: e.target.checked })
                    }
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. VIP Influencer sponsorship agreement..."
                  value={tierOverrideForm.reason}
                  onChange={(e) => setTierOverrideForm({ ...tierOverrideForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTierOverrideModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md"
                >
                  Save Tier Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
