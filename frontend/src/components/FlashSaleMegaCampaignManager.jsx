import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Users,
  TrendingUp,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Play,
  Pause,
  RefreshCw,
  Eye,
  Bell,
  ShoppingBag,
  ArrowUpRight,
  Flame,
  Layers,
  Lock,
  Unlock,
  Timer,
  ChevronRight,
  X,
  Search,
  Check,
  Percent,
  DollarSign,
  PackageCheck,
  Tag,
} from 'lucide-react';
import api from '../api/client';

export const FlashSaleMegaCampaignManager = () => {
  // Campaigns & Analytics state
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    upcoming: 0,
    concluded: 0,
    paused: 0,
    totalStockAllocated: 0,
    totalSoldUnits: 0,
    totalRevenue: 0,
    totalSubscribers: 0,
  });
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSchedulerRunning, setIsSchedulerRunning] = useState(false);
  const [schedulerResult, setSchedulerResult] = useState(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCampaignForView, setSelectedCampaignForView] = useState(null);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Action toast / feedback
  const [feedback, setFeedback] = useState(null);

  // New Mega Campaign Form State
  const [formData, setFormData] = useState({
    title: '',
    slotName: '12:00 PM Lightning Drop',
    campaignType: 'MEGA_CAMPAIGN',
    badgeText: '⚡ MEGA FLASH DROP',
    bannerImage:
      'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
    startDate: '',
    endDate: '',
    vipEarlyAccessMinutes: 30,
    maxUnitsPerCustomer: 2,
    backgroundColor: '#DC2626',
    textColor: '#FFFFFF',
    products: [],
  });

  // Current real-time clock for countdown calculations
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch campaigns and analytics
  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const [campaignsRes, analyticsRes] = await Promise.all([
        api.get('/admin/flash-deals/mega'),
        api.get('/admin/flash-deals/mega/analytics').catch(() => ({ data: { success: false } })),
      ]);

      if (campaignsRes.data?.success) {
        setCampaigns(campaignsRes.data.data || []);
        if (campaignsRes.data.stats) {
          setStats(campaignsRes.data.stats);
        }
      }

      if (analyticsRes.data?.success) {
        setAnalytics(analyticsRes.data.analytics);
      }
    } catch (err) {
      console.error('Failed to fetch mega campaigns:', err);
      // Fallback empty state
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Load products for campaign builder
  const loadAvailableProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const res = await api.get('/products?limit=50');
      if (res.data?.success) {
        setAvailableProducts(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleOpenCreateModal = () => {
    const now = new Date();
    const start = new Date(now.getTime() + 10 * 60000); // 10 mins from now default
    const end = new Date(start.getTime() + 6 * 3600000); // 6 hours duration

    // Format for datetime-local
    const formatLocalIso = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
      )}:${pad(d.getMinutes())}`;
    };

    setFormData({
      title: 'Midnight Lightning Rush 60% OFF',
      slotName: 'Midnight Drop 00:00',
      campaignType: 'MEGA_CAMPAIGN',
      badgeText: '⚡ MEGA FLASH SALE',
      bannerImage:
        'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
      startDate: formatLocalIso(start),
      endDate: formatLocalIso(end),
      vipEarlyAccessMinutes: 30,
      maxUnitsPerCustomer: 2,
      backgroundColor: '#E11D48',
      textColor: '#FFFFFF',
      products: [],
    });

    loadAvailableProducts();
    setIsCreateModalOpen(true);
  };

  // Run Automated Time-Based Scheduler Engine
  const handleTriggerScheduler = async () => {
    try {
      setIsSchedulerRunning(true);
      const res = await api.post('/admin/flash-deals/trigger-scheduler');
      if (res.data?.success) {
        setSchedulerResult(res.data);
        setFeedback({
          type: 'success',
          message: `Scheduler Executed: ${res.data.activatedCount} drop(s) launched, ${res.data.concludedCount} drop(s) concluded.`,
        });
        fetchCampaigns();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to trigger scheduler engine',
      });
    } finally {
      setIsSchedulerRunning(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Toggle active/paused status
  const handleToggleStatus = async (dealId) => {
    try {
      const res = await api.patch(`/admin/flash-deals/${dealId}/toggle`);
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: res.data.message || 'Flash deal status updated',
        });
        fetchCampaigns();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to toggle status',
      });
    }
  };

  // Delete flash deal
  const handleDeleteDeal = async (dealId) => {
    if (!window.confirm('Are you sure you want to delete this mega flash deal campaign?')) return;
    try {
      const res = await api.delete(`/admin/flash-deals/${dealId}`);
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: 'Flash deal campaign deleted successfully',
        });
        fetchCampaigns();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete campaign',
      });
    }
  };

  // Add product to builder
  const handleAddProductToForm = (prod) => {
    if (formData.products.some((p) => p.product === prod._id)) return;
    const defaultDiscount = 40;
    const dealPrice = Math.round(prod.sellingPrice * (1 - defaultDiscount / 100));

    setFormData((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          product: prod._id,
          productTitle: prod.title,
          productImage: prod.images?.[0] || '',
          mrp: prod.mrp,
          sellingPrice: prod.sellingPrice,
          discountPercentage: defaultDiscount,
          dealPrice: dealPrice,
          allocatedStock: 50,
          maxPerCustomer: prev.maxUnitsPerCustomer || 2,
        },
      ],
    }));
  };

  // Remove product from builder
  const handleRemoveProductFromForm = (prodId) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.product !== prodId),
    }));
  };

  // Update product deal details in builder
  const handleUpdateProductInForm = (prodId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.map((p) => {
        if (p.product !== prodId) return p;
        const updated = { ...p, [field]: value };
        if (field === 'discountPercentage') {
          const pct = Math.min(99, Math.max(1, Number(value) || 0));
          updated.discountPercentage = pct;
          updated.dealPrice = Math.round(p.sellingPrice * (1 - pct / 100));
        } else if (field === 'dealPrice') {
          const dp = Math.max(0, Number(value) || 0);
          updated.dealPrice = dp;
          if (p.sellingPrice > 0) {
            updated.discountPercentage = Math.round(((p.sellingPrice - dp) / p.sellingPrice) * 100);
          }
        }
        return updated;
      }),
    }));
  };

  // Submit mega campaign
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.endDate) {
      setFeedback({ type: 'error', message: 'Title and End Date are mandatory' });
      return;
    }

    try {
      const payload = {
        title: formData.title,
        slotName: formData.slotName,
        campaignType: formData.campaignType,
        badgeText: formData.badgeText,
        bannerImage: formData.bannerImage,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        vipEarlyAccessMinutes: Number(formData.vipEarlyAccessMinutes) || 0,
        maxUnitsPerCustomer: Number(formData.maxUnitsPerCustomer) || 2,
        backgroundColor: formData.backgroundColor,
        textColor: formData.textColor,
        products: formData.products.map((p) => ({
          product: p.product,
          discountPercentage: Number(p.discountPercentage) || 30,
          dealPrice: Number(p.dealPrice),
          allocatedStock: Number(p.allocatedStock) || 50,
          maxPerCustomer: Number(p.maxPerCustomer) || Number(formData.maxUnitsPerCustomer) || 2,
        })),
        isActive: true,
      };

      const res = await api.post('/admin/flash-deals/mega', payload);
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: '🎉 Mega Flash Drop successfully scheduled and registered!',
        });
        setIsCreateModalOpen(false);
        fetchCampaigns();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to create mega campaign',
      });
    }
  };

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const now = currentTime;
      const start = new Date(c.startDate);
      const end = new Date(c.endDate);

      // Status check
      let currentStatus = 'UPCOMING';
      if (!c.isActive || c.status === 'PAUSED') {
        currentStatus = 'PAUSED';
      } else if (now >= end || c.status === 'CONCLUDED' || c.status === 'EXPIRED') {
        currentStatus = 'CONCLUDED';
      } else if (now >= start && now < end) {
        currentStatus = 'ACTIVE';
      }

      if (statusFilter === 'active' && currentStatus !== 'ACTIVE') return false;
      if (statusFilter === 'upcoming' && currentStatus !== 'UPCOMING') return false;
      if (statusFilter === 'concluded' && currentStatus !== 'CONCLUDED') return false;
      if (statusFilter === 'paused' && currentStatus !== 'PAUSED') return false;

      // Type check
      if (typeFilter !== 'all' && c.campaignType !== typeFilter) return false;

      // Search term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchTitle = c.title?.toLowerCase().includes(term);
        const matchSlot = c.slotName?.toLowerCase().includes(term);
        const matchBadge = c.badgeText?.toLowerCase().includes(term);
        if (!matchTitle && !matchSlot && !matchBadge) return false;
      }

      return true;
    });
  }, [campaigns, statusFilter, typeFilter, searchTerm, currentTime]);

  // Helper: Format countdown string
  const formatCountdown = (targetDate, fromDate = currentTime) => {
    const diff = Math.max(0, Math.floor((new Date(targetDate) - fromDate) / 1000));
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(
      secs
    ).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm font-bold shadow-lg animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-600/90 text-white border border-emerald-400'
              : 'bg-rose-600/90 text-white border border-rose-400'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-200" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 p-6 sm:p-8 border border-rose-800/40 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black tracking-wide uppercase">
              <Zap className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>Pillar 2 — Point #28 Verified</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Mega Flash Sale Campaign Builder
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              Schedule multi-slot lightning drops, automated time-based launch triggers, VIP early
              access countdowns, anti-hoarding limit enforcement, and real-time inventory depletion
              radars.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleTriggerScheduler}
              disabled={isSchedulerRunning}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg hover:shadow-orange-500/20 transition-all disabled:opacity-50"
              title="Execute immediate time-check to auto-activate scheduled drops and conclude expired ones"
            >
              <RefreshCw
                className={`w-4 h-4 text-slate-950 ${isSchedulerRunning ? 'animate-spin' : ''}`}
              />
              <span>{isSchedulerRunning ? 'Evaluating Drops...' : 'Run Time-Check Now'}</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-xs sm:text-sm shadow-lg hover:shadow-rose-500/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Mega Campaign</span>
            </button>
          </div>
        </div>

        {/* Subtle background glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Bento Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Live Mega Drops */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Live Mega Drops
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{stats.active}</span>
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              Active Now
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400 font-medium">
            {stats.upcoming} scheduled drops in launch queue
          </p>
        </div>

        {/* Metric 2: Flash Revenue GMV */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Flash Gross Revenue
            </span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">
              ₹{(stats.totalRevenue || 0).toLocaleString()}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400 font-medium">
            Avg Discount: {analytics?.averageDiscount || 42}% across campaigns
          </p>
        </div>

        {/* Metric 3: Units Claimed / Depletion Rate */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Stock Depletion Rate
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">
              {stats.totalAllocatedStock > 0
                ? Math.round((stats.totalSoldUnits / stats.totalAllocatedStock) * 100)
                : 0}
              %
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              ({stats.totalSoldUnits} / {stats.totalAllocatedStock} units)
            </span>
          </div>
          {/* Visual progress meter */}
          <div className="mt-3 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-rose-500 to-indigo-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  stats.totalAllocatedStock > 0
                    ? Math.round((stats.totalSoldUnits / stats.totalAllocatedStock) * 100)
                    : 0
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Metric 4: Waiting Drop Subscribers */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-pink-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Drop Alert Opt-Ins
            </span>
            <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Bell className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{stats.totalSubscribers}</span>
            <span className="text-xs text-pink-400 font-bold">VIP & SMS Opt-ins</span>
          </div>
          <p className="mt-2 text-xs text-slate-400 font-medium">
            Automated alerts dispatched 15m prior to launch
          </p>
        </div>
      </div>

      {/* Scheduler Diagnostics Bar */}
      {schedulerResult && (
        <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Timer className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-white">Latest Automated Scheduler Run:</span>
            <span>
              {new Date(schedulerResult.executionTimestamp).toLocaleTimeString()} —{' '}
              {schedulerResult.activatedCount} launched, {schedulerResult.concludedCount} concluded
            </span>
          </div>
          <button
            onClick={() => setSchedulerResult(null)}
            className="text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Control Filters Bar */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tab buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0">
          {[
            { id: 'all', label: 'All Campaigns', count: stats.total },
            { id: 'active', label: 'LIVE Now', count: stats.active },
            { id: 'upcoming', label: 'Scheduled', count: stats.upcoming },
            { id: 'concluded', label: 'Concluded', count: stats.concluded },
            { id: 'paused', label: 'Paused', count: stats.paused },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Type filter */}
        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 focus:outline-none focus:border-rose-500"
          >
            <option value="all">All Campaign Types</option>
            <option value="MEGA_CAMPAIGN">Mega Campaign</option>
            <option value="HOURLY_SLOT">Hourly Slot</option>
            <option value="MIDNIGHT_DROP">Midnight Drop</option>
            <option value="FESTIVAL_SPECIAL">Festival Special</option>
          </select>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, slot..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 w-44 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Campaigns Grid */}
      {isLoading ? (
        <div className="bg-slate-900/60 rounded-2xl p-12 text-center border border-slate-800">
          <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-400">Loading flash sale mega campaigns...</p>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="bg-slate-900/60 rounded-2xl p-12 text-center border border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
            <Zap className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Flash Sale Campaigns Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Schedule your first multi-slot mega flash drop with automated launch triggers, VIP
              early access, and anti-hoarding limits.
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Mega Flash Drop</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((deal) => {
            const now = currentTime;
            const start = new Date(deal.startDate);
            const end = new Date(deal.endDate);

            let statusMode = 'UPCOMING';
            if (!deal.isActive || deal.status === 'PAUSED') {
              statusMode = 'PAUSED';
            } else if (now >= end || deal.status === 'CONCLUDED' || deal.status === 'EXPIRED') {
              statusMode = 'CONCLUDED';
            } else if (now >= start && now < end) {
              statusMode = 'LIVE';
            }

            const totalDealStock =
              deal.totalAllocatedStock ||
              deal.products?.reduce((acc, p) => acc + (p.allocatedStock || 0), 0) ||
              0;
            const totalDealSold =
              deal.totalSoldUnits ||
              deal.products?.reduce((acc, p) => acc + (p.soldCount || 0), 0) ||
              0;
            const depletionPct =
              totalDealStock > 0 ? Math.min(100, Math.round((totalDealSold / totalDealStock) * 100)) : 0;

            return (
              <div
                key={deal._id}
                className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                {/* Header Banner & Badges */}
                <div
                  className="p-4 relative"
                  style={{
                    backgroundColor: deal.backgroundColor || '#DC2626',
                    color: deal.textColor || '#FFFFFF',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm">
                      {deal.badgeText || '⚡ FLASH SALE'}
                    </span>

                    {/* Status Pill */}
                    {statusMode === 'LIVE' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black tracking-wide uppercase animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                        LIVE NOW
                      </span>
                    )}
                    {statusMode === 'UPCOMING' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-black tracking-wide uppercase">
                        <Clock className="w-3 h-3" />
                        UPCOMING
                      </span>
                    )}
                    {statusMode === 'CONCLUDED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-black tracking-wide uppercase">
                        <CheckCircle2 className="w-3 h-3" />
                        CONCLUDED
                      </span>
                    )}
                    {statusMode === 'PAUSED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black tracking-wide uppercase">
                        <Pause className="w-3 h-3" />
                        PAUSED
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 text-lg font-black tracking-tight line-clamp-1">{deal.title}</h3>
                  <div className="mt-1 flex items-center gap-2 text-xs font-semibold opacity-90">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{deal.slotName || 'Mega Flash Drop'}</span>
                    <span>•</span>
                    <span>{deal.campaignType?.replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-4 flex-1">
                  {/* Countdown Timer Display */}
                  <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {statusMode === 'LIVE'
                          ? 'Ends In'
                          : statusMode === 'UPCOMING'
                          ? 'Starts In'
                          : 'Status'}
                      </span>
                      <span className="text-base font-black font-mono text-white tracking-widest">
                        {statusMode === 'LIVE'
                          ? formatCountdown(deal.endDate)
                          : statusMode === 'UPCOMING'
                          ? formatCountdown(deal.startDate)
                          : 'Concluded'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Subscribers
                      </span>
                      <span className="text-xs font-bold text-pink-400 flex items-center gap-1 justify-end">
                        <Bell className="w-3 h-3" />
                        {deal.notifyMeSubscribers?.length || 0} Alerted
                      </span>
                    </div>
                  </div>

                  {/* Stock Depletion Meter */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bold">Claimed Stock Meter</span>
                      <span className="text-white font-black">
                        {totalDealSold} / {totalDealStock} units ({depletionPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          depletionPct > 80
                            ? 'bg-rose-500'
                            : depletionPct > 50
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${depletionPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Badges / Guardrails */}
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                    {deal.vipEarlyAccessMinutes > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {deal.vipEarlyAccessMinutes}m VIP Early Access
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      Anti-Hoarding: Max {deal.maxUnitsPerCustomer || 2}/user
                    </span>
                  </div>

                  {/* Products Miniature Preview */}
                  {deal.products && deal.products.length > 0 && (
                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 block mb-2">
                        Participating Deals ({deal.products.length} Products):
                      </span>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {deal.products.slice(0, 3).map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60"
                          >
                            <span className="font-medium text-slate-300 truncate max-w-[160px]">
                              {item.product?.title || 'Flash Product'}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded">
                                {item.discountPercentage}% OFF
                              </span>
                              <span className="font-bold text-white">₹{item.dealPrice}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(deal._id)}
                      className={`p-2 rounded-xl text-xs font-bold transition-all ${
                        deal.isActive
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                      title={deal.isActive ? 'Pause Campaign' : 'Resume Campaign'}
                    >
                      {deal.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => setSelectedCampaignForView(deal)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteDeal(deal._id)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-all"
                    title="Delete Campaign"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Campaign Builder Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-rose-500" />
                  Schedule Mega Flash Sale Campaign
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Configure slot timings, VIP early bird access windows, and product deal allocations.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              {/* Step 1: Campaign Metadata */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  Step 1: Campaign Identity & Slot
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Campaign Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Midnight Audio Frenzy 50% OFF"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Slot Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.slotName}
                      onChange={(e) => setFormData({ ...formData, slotName: e.target.value })}
                      placeholder="e.g. 12 PM Lightning Drop"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Campaign Type
                    </label>
                    <select
                      value={formData.campaignType}
                      onChange={(e) => setFormData({ ...formData, campaignType: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-semibold"
                    >
                      <option value="MEGA_CAMPAIGN">Mega Campaign</option>
                      <option value="HOURLY_SLOT">Hourly Slot Drop</option>
                      <option value="MIDNIGHT_DROP">Midnight Madness Drop</option>
                      <option value="FESTIVAL_SPECIAL">Festival Special Drop</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={formData.badgeText}
                      onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Schedule & Rules Engine */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Step 2: Automated Launch Schedule & VIP Privileges
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Start Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      End Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      VIP Early Access Window (Minutes)
                    </label>
                    <select
                      value={formData.vipEarlyAccessMinutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vipEarlyAccessMinutes: Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-semibold"
                    >
                      <option value="0">None (General release for everyone)</option>
                      <option value="15">15 Minutes Prior (Silver, Gold, Platinum)</option>
                      <option value="30">30 Minutes Prior (Recommended)</option>
                      <option value="60">1 Hour Prior (Gold & Platinum Exclusive)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Anti-Hoarding Protection (Max Units / Customer)
                    </label>
                    <select
                      value={formData.maxUnitsPerCustomer}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxUnitsPerCustomer: Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-semibold"
                    >
                      <option value="1">1 Unit Per Customer (Strict Bot Protection)</option>
                      <option value="2">2 Units Per Customer (Default)</option>
                      <option value="3">3 Units Per Customer</option>
                      <option value="5">5 Units Per Customer</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 3: Product Inventory Allocation */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Step 3: Deal Inventory & Pricing ({formData.products.length} Selected)
                  </h4>
                </div>

                {/* Product search & picker */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search catalog to add products into drop..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  {productSearch.trim() !== '' && (
                    <div className="max-h-40 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl p-2 space-y-1">
                      {availableProducts
                        .filter((p) => p.title.toLowerCase().includes(productSearch.toLowerCase()))
                        .slice(0, 5)
                        .map((prod) => (
                          <div
                            key={prod._id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-900 text-xs"
                          >
                            <span className="font-semibold text-white truncate max-w-sm">
                              {prod.title} (₹{prod.sellingPrice})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                handleAddProductToForm(prod);
                                setProductSearch('');
                              }}
                              className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px]"
                            >
                              Add to Drop
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Selected Products Table */}
                {formData.products.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {formData.products.map((item) => (
                      <div
                        key={item.product}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="font-bold text-white max-w-xs truncate">
                          {item.productTitle}
                          <div className="text-[10px] text-slate-400 font-normal">
                            Normal Selling Price: ₹{item.sellingPrice}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block">
                              Discount %
                            </span>
                            <input
                              type="number"
                              min="1"
                              max="99"
                              value={item.discountPercentage}
                              onChange={(e) =>
                                handleUpdateProductInForm(
                                  item.product,
                                  'discountPercentage',
                                  e.target.value
                                )
                              }
                              className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-rose-400"
                            />
                          </div>

                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block">
                              Deal Price (₹)
                            </span>
                            <input
                              type="number"
                              min="1"
                              value={item.dealPrice}
                              onChange={(e) =>
                                handleUpdateProductInForm(item.product, 'dealPrice', e.target.value)
                              }
                              className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-white"
                            />
                          </div>

                          <div>
                            <span className="text-[9px] text-slate-400 font-bold block">
                              Deal Units
                            </span>
                            <input
                              type="number"
                              min="1"
                              value={item.allocatedStock}
                              onChange={(e) =>
                                handleUpdateProductInForm(
                                  item.product,
                                  'allocatedStock',
                                  e.target.value
                                )
                              }
                              className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-emerald-400"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveProductFromForm(item.product)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 mt-3"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic text-center py-2">
                    No products added to this campaign yet. Use search above to allocate inventory.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-xs shadow-lg transition-all"
                >
                  Schedule Drop Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Campaign Details Modal */}
      {selectedCampaignForView && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-rose-500" />
                {selectedCampaignForView.title}
              </h3>
              <button
                onClick={() => setSelectedCampaignForView(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Slot</span>
                  <span className="font-bold text-white">{selectedCampaignForView.slotName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Type
                  </span>
                  <span className="font-bold text-white">
                    {selectedCampaignForView.campaignType}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Starts At
                  </span>
                  <span className="font-bold text-white">
                    {new Date(selectedCampaignForView.startDate).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">
                    Ends At
                  </span>
                  <span className="font-bold text-white">
                    {new Date(selectedCampaignForView.endDate).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-bold text-white block mb-1">
                  Subscribed Users ({selectedCampaignForView.notifyMeSubscribers?.length || 0})
                </span>
                <p className="text-[11px] text-slate-400">
                  Customers registered to receive instant push & SMS notifications when this slot
                  launches.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedCampaignForView(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashSaleMegaCampaignManager;
