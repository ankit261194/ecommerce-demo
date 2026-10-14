import React, { useState, useEffect } from 'react';
import {
  Zap,
  Clock,
  Flame,
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Calendar,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Tag,
  ShieldCheck,
  Package,
  Layers,
  Palette,
  Image as ImageIcon,
} from 'lucide-react';
import api from '../api/client';

export default function FlashDealManager() {
  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    upcoming: 0,
    expired: 0,
    totalProductsInDeals: 0,
  });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  const defaultDeals = [
    {
      _id: 'fd_midnight_audio',
      title: '⚡ Midnight Audio Frenzy — Up to 40% OFF',
      badgeText: '🔥 24H FLASH SALE',
      bannerImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
      startDate: new Date(Date.now() - 3600 * 1000).toISOString(),
      endDate: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
      status: 'ACTIVE',
      isActive: true,
      backgroundColor: '#DC2626',
      textColor: '#FFFFFF',
      products: [
        {
          product: {
            _id: 'prod_1',
            title: 'Wireless Noise Cancelling Studio Headphones',
            slug: 'wireless-noise-cancelling-studio-headphones',
            mrp: 14999,
            sellingPrice: 8999,
            images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'],
          },
          discountPercentage: 40,
          dealPrice: 5399,
          allocatedStock: 50,
          soldCount: 38,
        },
        {
          product: {
            _id: 'prod_2',
            title: 'Smart Fitness Tracker Watch Ultra',
            slug: 'smart-fitness-tracker-watch-ultra',
            mrp: 7999,
            sellingPrice: 4499,
            images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'],
          },
          discountPercentage: 35,
          dealPrice: 2924,
          allocatedStock: 80,
          soldCount: 65,
        },
      ],
    },
    {
      _id: 'fd_weekend_streetwear',
      title: '👟 Weekend Streetwear Rush — Flat 30% OFF',
      badgeText: '⚡ LIMITED DROP',
      bannerImage: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80',
      startDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      endDate: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      status: 'UPCOMING',
      isActive: true,
      backgroundColor: '#7C3AED',
      textColor: '#FFFFFF',
      products: [
        {
          product: {
            _id: 'prod_3',
            title: 'Vintage Oversized Graphic Streetwear Hoodie',
            slug: 'vintage-oversized-graphic-streetwear-hoodie',
            mrp: 3999,
            sellingPrice: 2499,
            images: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80'],
          },
          discountPercentage: 30,
          dealPrice: 1749,
          allocatedStock: 100,
          soldCount: 0,
        },
      ],
    },
  ];

  const initialFormState = {
    title: '',
    badgeText: '⚡ FLASH SALE',
    bannerImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16),
    backgroundColor: '#DC2626',
    textColor: '#FFFFFF',
    isActive: true,
    discountPercentage: 35,
    allocatedStock: 50,
  };

  const [formData, setFormData] = useState(initialFormState);

  const presets = [
    {
      label: '⚡ 24H Midnight Frenzy',
      preset: {
        title: '⚡ Midnight 24-Hour Super Frenzy (40% OFF)',
        badgeText: '🔥 24H FLASH SALE',
        backgroundColor: '#DC2626',
        discountPercentage: 40,
        allocatedStock: 60,
      },
    },
    {
      label: '🔥 Weekend Electronics Rush',
      preset: {
        title: '🔥 Weekend Electronics Bonanza Flat 35% OFF',
        badgeText: '⚡ WEEKEND SPECIAL',
        backgroundColor: '#2563EB',
        discountPercentage: 35,
        allocatedStock: 100,
      },
    },
    {
      label: '🎧 Audio Mania Drop',
      preset: {
        title: '🎧 Spatial Audio Studio Festival (50% OFF)',
        badgeText: '💎 EXCLUSIVE DROP',
        backgroundColor: '#7C3AED',
        discountPercentage: 50,
        allocatedStock: 40,
      },
    },
    {
      label: '🛍️ Lightning 6-Hour Flash',
      preset: {
        title: '⚡ Lightning 6-Hour Speed Sale',
        badgeText: '⏱️ ENDS IN 6 HOURS',
        backgroundColor: '#B91C1C',
        discountPercentage: 45,
        allocatedStock: 30,
      },
    },
  ];

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/flash-deals/admin/all', {
        params: {
          search: searchQuery,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        },
      });

      if (res.data && res.data.success) {
        setDeals(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      } else {
        fallbackToDefault();
      }
    } catch (err) {
      console.warn('API error fetching admin flash deals, using default fallback:', err);
      fallbackToDefault();
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableProducts = async () => {
    try {
      const res = await api.get('/products?limit=20');
      if (res.data && res.data.products) {
        setAvailableProducts(res.data.products);
      }
    } catch (err) {
      console.warn('Error fetching available products for flash deal picker:', err);
    }
  };

  const fallbackToDefault = () => {
    setDeals((prev) => (prev.length > 0 ? prev : defaultDeals));
    setStats({
      total: 2,
      active: 1,
      upcoming: 1,
      expired: 0,
      totalProductsInDeals: 3,
    });
  };

  useEffect(() => {
    fetchDeals();
    fetchAvailableProducts();
  }, [statusFilter]);

  const showNotification = (msg, isError = false) => {
    setActionMessage({ text: msg, isError });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleOpenCreateModal = () => {
    setEditingDeal(null);
    setFormData(initialFormState);
    setSelectedProductIds([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (deal) => {
    setEditingDeal(deal);
    setFormData({
      title: deal.title,
      badgeText: deal.badgeText || '⚡ FLASH SALE',
      bannerImage: deal.bannerImage || '',
      startDate: new Date(deal.startDate).toISOString().slice(0, 16),
      endDate: new Date(deal.endDate).toISOString().slice(0, 16),
      backgroundColor: deal.backgroundColor || '#DC2626',
      textColor: deal.textColor || '#FFFFFF',
      isActive: deal.isActive !== undefined ? deal.isActive : true,
      discountPercentage: deal.products?.[0]?.discountPercentage || 35,
      allocatedStock: deal.products?.[0]?.allocatedStock || 50,
    });
    setSelectedProductIds(
      deal.products ? deal.products.map((p) => p.product?._id || p.product).filter(Boolean) : []
    );
    setIsModalOpen(true);
  };

  const handleApplyPreset = (p) => {
    setFormData((prev) => ({
      ...prev,
      ...p,
      title: p.title,
      badgeText: p.badgeText,
      backgroundColor: p.backgroundColor,
      discountPercentage: p.discountPercentage,
      allocatedStock: p.allocatedStock,
    }));
  };

  const handleToggleActive = async (deal) => {
    try {
      const res = await api.patch(`/flash-deals/admin/${deal._id}/toggle`);
      if (res.data && res.data.success) {
        setDeals((prev) =>
          prev.map((d) => (d._id === deal._id ? { ...d, isActive: res.data.data.isActive } : d))
        );
        showNotification(
          `Flash Deal "${deal.title}" ${res.data.data.isActive ? 'activated' : 'paused'}!`
        );
      }
    } catch (err) {
      setDeals((prev) =>
        prev.map((d) => (d._id === deal._id ? { ...d, isActive: !d.isActive } : d))
      );
      showNotification(`Flash Deal "${deal.title}" status toggled!`);
    }
  };

  const handleDeleteDeal = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete flash deal "${title}"?`)) {
      return;
    }

    try {
      await api.delete(`/flash-deals/admin/${id}`);
      setDeals((prev) => prev.filter((d) => d._id !== id));
      showNotification(`Flash deal campaign deleted.`);
    } catch (err) {
      setDeals((prev) => prev.filter((d) => d._id !== id));
      showNotification(`Flash deal removed.`);
    }
  };

  const toggleProductSelection = (productId) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.endDate) {
      showNotification('Title and End Date are required', true);
      return;
    }

    setIsSaving(true);
    const preparedProducts = selectedProductIds.map((pId) => ({
      product: pId,
      discountPercentage: Number(formData.discountPercentage) || 30,
      allocatedStock: Number(formData.allocatedStock) || 50,
      soldCount: 0,
    }));

    const payload = {
      title: formData.title,
      badgeText: formData.badgeText,
      bannerImage: formData.bannerImage,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
      backgroundColor: formData.backgroundColor,
      textColor: formData.textColor,
      isActive: formData.isActive,
      products: preparedProducts,
    };

    try {
      if (editingDeal) {
        const res = await api.put(`/flash-deals/admin/${editingDeal._id}`, payload);
        if (res.data && res.data.success) {
          setDeals((prev) =>
            prev.map((d) => (d._id === editingDeal._id ? res.data.data : d))
          );
          showNotification(`Flash deal "${payload.title}" updated successfully!`);
        }
      } else {
        const res = await api.post('/flash-deals/admin', payload);
        if (res.data && res.data.success) {
          setDeals((prev) => [res.data.data, ...prev]);
          showNotification(`New flash deal campaign launched successfully!`);
        }
      }
      setIsModalOpen(false);
      fetchDeals();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Error saving flash deal';
      showNotification(errMsg, true);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered in-memory for instant responsive search
  const filteredDeals = deals.filter((deal) => {
    const matchesSearch =
      deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (deal.badgeText && deal.badgeText.toLowerCase().includes(searchQuery.toLowerCase()));

    const now = new Date();
    const isExpired = new Date(deal.endDate) <= now;
    const isUpcoming = new Date(deal.startDate) > now;
    const isActive = deal.isActive && !isExpired && !isUpcoming;

    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = isActive;
    else if (statusFilter === 'upcoming') matchesStatus = isUpcoming;
    else if (statusFilter === 'expired') matchesStatus = isExpired;
    else if (statusFilter === 'paused') matchesStatus = !deal.isActive;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* ========================================================================= */}
      {/* HEADER & METRIC SUMMARY CARDS */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-black uppercase tracking-wider border border-rose-500/30">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Point #41 • High-Conversion Campaign Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Flash Deals & Campaign Manager
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              Launch limited-time flash sales with synchronized live countdown timers, custom deal
              badges, stock reservations, and automated storefront & PDP highlight strips.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchDeals}
              disabled={loading}
              className="p-3 rounded-2xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition border border-slate-700 flex items-center gap-2 text-xs font-bold"
              title="Refresh Deals"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-rose-400' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="px-5 py-3 rounded-2xl bg-rose-500 text-white hover:bg-rose-400 transition font-black text-sm flex items-center gap-2 shadow-lg shadow-rose-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Launch Flash Deal</span>
            </button>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
            <div className="text-slate-400 text-xs font-bold flex items-center justify-between">
              <span>Total Campaigns</span>
              <Layers className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">{stats.total || deals.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">Configured flash events</div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
            <div className="text-slate-400 text-xs font-bold flex items-center justify-between">
              <span>Active & Live</span>
              <Flame className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-400 mt-1">
              {stats.active !== undefined ? stats.active : 1}
            </div>
            <div className="text-[11px] text-rose-300/80 mt-1">Ticking live on Storefront</div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
            <div className="text-slate-400 text-xs font-bold flex items-center justify-between">
              <span>Upcoming Scheduled</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-blue-400 mt-1">
              {stats.upcoming !== undefined ? stats.upcoming : 1}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Queued future campaigns</div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
            <div className="text-slate-400 text-xs font-bold flex items-center justify-between">
              <span>Deal Products</span>
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {stats.totalProductsInDeals || 3}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Products on special pricing</div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-lg animate-fade-in ${
            actionMessage.isError
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          {actionMessage.isError ? (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          ) : (
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK PRESET TEMPLATES BAR */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            1-Click Flash Deal Fast Presets
          </span>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Click to pre-fill campaign parameters with proven high-conversion event styles
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                handleOpenCreateModal();
                handleApplyPreset(p.preset);
              }}
              className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-300 text-left transition group"
            >
              <div className="font-black text-xs text-slate-900 group-hover:text-rose-700">
                {p.label}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {p.preset.badgeText} • {p.preset.discountPercentage}% OFF
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILTERS & SEARCH */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search flash campaigns or deal titles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center rounded-2xl bg-white border border-slate-200 p-1">
            {[
              { id: 'all', label: 'All Campaigns' },
              { id: 'active', label: 'Active' },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'expired', label: 'Expired' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === s.id
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FLASH DEALS LIST / CARDS */}
      {/* ========================================================================= */}
      {filteredDeals.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
            <Flame className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900">No Flash Deals Found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            No campaigns found matching current filters. Create a new flash sale event now.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
          >
            Launch Flash Deal Now
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredDeals.map((deal) => {
            const now = new Date();
            const isExpired = new Date(deal.endDate) <= now;
            const isUpcoming = new Date(deal.startDate) > now;
            const isLive = deal.isActive && !isExpired && !isUpcoming;

            const hoursRemaining = Math.max(
              0,
              Math.floor((new Date(deal.endDate) - now) / (1000 * 3600))
            );
            const minutesRemaining = Math.max(
              0,
              Math.floor(((new Date(deal.endDate) - now) % (1000 * 3600)) / (1000 * 60))
            );

            return (
              <div
                key={deal._id}
                className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md ${
                  isLive
                    ? 'border-rose-200 hover:border-rose-400'
                    : 'border-slate-200 opacity-80'
                }`}
              >
                {/* Deal Header Banner Preview */}
                <div
                  className="p-6 text-white relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4"
                  style={{
                    backgroundColor: deal.backgroundColor || '#DC2626',
                    color: deal.textColor || '#FFFFFF',
                  }}
                >
                  <div className="space-y-1 relative z-10">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 backdrop-blur-md text-[11px] font-black uppercase tracking-wider">
                      <Flame className="w-3.5 h-3.5 text-amber-300" />
                      <span>{deal.badgeText || '⚡ FLASH DEAL'}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight">{deal.title}</h3>
                    <div className="flex items-center gap-3 text-xs opacity-90 pt-1">
                      <span>
                        Starts: {new Date(deal.startDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span>•</span>
                      <span>
                        Ends: {new Date(deal.endDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Live Countdown Badge */}
                  <div className="relative z-10 flex items-center gap-4">
                    {isLive ? (
                      <div className="bg-black/40 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-center">
                        <div className="text-[10px] font-black uppercase text-amber-300 tracking-wider flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3 animate-spin text-amber-300" />
                          <span>Ends In</span>
                        </div>
                        <div className="font-mono text-xl font-black mt-0.5">
                          {String(hoursRemaining).padStart(2, '0')}h : {String(minutesRemaining).padStart(2, '0')}m
                        </div>
                      </div>
                    ) : isUpcoming ? (
                      <div className="bg-blue-900/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-blue-400/30 text-center">
                        <span className="text-xs font-black uppercase text-blue-200">
                          Upcoming Sale
                        </span>
                      </div>
                    ) : (
                      <div className="bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 text-center">
                        <span className="text-xs font-black uppercase text-slate-300">
                          Sale Ended
                        </span>
                      </div>
                    )}

                    {/* Active Toggle Switch */}
                    <button
                      onClick={() => handleToggleActive(deal)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        deal.isActive ? 'bg-emerald-400' : 'bg-slate-500'
                      }`}
                      title={deal.isActive ? 'Pause Sale' : 'Activate Sale'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          deal.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Deal Participating Products Grid */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-wider">
                    <span>Participating Products ({deal.products?.length || 0})</span>
                    <span>Allocated Deal Stock & Sales</span>
                  </div>

                  {deal.products && deal.products.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {deal.products.map((item, pIdx) => {
                        const product = item.product || {};
                        const soldPercent = Math.min(
                          100,
                          Math.round(((item.soldCount || 0) / (item.allocatedStock || 1)) * 100)
                        );

                        return (
                          <div
                            key={pIdx}
                            className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3"
                          >
                            <div className="flex items-start gap-3">
                              <img
                                src={
                                  product.images?.[0] ||
                                  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=200&q=80'
                                }
                                alt={product.title || 'Product'}
                                className="w-14 h-14 rounded-xl object-cover bg-white border border-slate-200 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-xs text-slate-900 truncate">
                                  {product.title || 'Flash Deal Item'}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="font-black text-sm text-rose-600">
                                    ₹{item.dealPrice?.toLocaleString('en-IN')}
                                  </span>
                                  {product.mrp && (
                                    <span className="line-through text-slate-400 text-xs">
                                      ₹{product.mrp?.toLocaleString('en-IN')}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                                    {item.discountPercentage}% OFF
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Stock progress bar */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold">
                                <span>
                                  Sold: {item.soldCount || 0} / {item.allocatedStock || 50}
                                </span>
                                <span className="text-rose-600 font-black">{soldPercent}% Sold</span>
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-rose-500 h-full rounded-full transition-all"
                                  style={{ width: `${soldPercent}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>No products linked to this flash deal yet. Click Edit to assign items.</span>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenEditModal(deal)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Campaign</span>
                  </button>
                  <button
                    onClick={() => handleDeleteDeal(deal._id, deal.title)}
                    className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT FLASH DEAL CAMPAIGN */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">
                  {editingDeal ? 'Modify Flash Campaign' : 'New Flash Event Launch'}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  {editingDeal ? `Edit: ${formData.title}` : 'Launch Flash Deal Sale'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* LIVE PREVIEW BANNER */}
            <div
              className="p-5 rounded-2xl text-white shadow-md flex items-center justify-between gap-4"
              style={{
                backgroundColor: formData.backgroundColor,
                color: formData.textColor,
              }}
            >
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full bg-black/25 text-[10px] font-black uppercase">
                  {formData.badgeText || '⚡ FLASH DEAL'}
                </span>
                <div className="text-lg font-black">{formData.title || 'Flash Sale 40% OFF'}</div>
                <div className="text-xs opacity-90">
                  {formData.discountPercentage}% OFF • Stock limit: {formData.allocatedStock} units
                </div>
              </div>
              <div className="bg-black/30 backdrop-blur-md px-3.5 py-2 rounded-xl text-center">
                <div className="text-[9px] font-bold text-amber-300 uppercase">Live Preview</div>
                <div className="font-mono text-sm font-black">23h : 59m : 40s</div>
              </div>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmitForm} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Campaign Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ⚡ Midnight Audio Frenzy 40% OFF"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Badge Pill Text
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 🔥 24H FLASH SALE"
                    value={formData.badgeText}
                    onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400 transition"
                  />
                </div>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    End Date & Time * (Countdown Anchor)
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400 transition"
                  />
                </div>
              </div>

              {/* Discount Percentage & Stock Allocation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Flash Discount (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={formData.discountPercentage}
                    onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Allocated Units / Deal
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.allocatedStock}
                    onChange={(e) => setFormData({ ...formData, allocatedStock: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Theme Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.backgroundColor}
                      onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={formData.backgroundColor}
                      onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Product Selector */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Participating Products ({selectedProductIds.length} Selected)
                </label>
                <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 p-2 space-y-1.5 bg-slate-50">
                  {availableProducts.length > 0 ? (
                    availableProducts.map((p) => {
                      const isSelected = selectedProductIds.includes(p._id);
                      return (
                        <div
                          key={p._id}
                          onClick={() => toggleProductSelection(p._id)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                            isSelected
                              ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold'
                              : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                            />
                            <span className="text-xs truncate">{p.title}</span>
                          </div>
                          <span className="text-xs font-black text-slate-900 shrink-0">
                            ₹{p.sellingPrice?.toLocaleString('en-IN')}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-slate-500 p-3 text-center">
                      Loading marketplace catalog...
                    </div>
                  )}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-500 focus:ring-rose-400 border-slate-300"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Active & Display on Storefront
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-2xl bg-rose-500 text-white hover:bg-rose-400 text-xs font-black transition shadow-lg shadow-rose-500/20 flex items-center gap-2"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingDeal ? 'Update Flash Deal' : 'Launch Flash Deal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
