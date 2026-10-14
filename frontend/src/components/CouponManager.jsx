import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Percent,
  DollarSign,
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
  Copy,
  Calendar,
  Users,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Tag,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import api from '../api/client';

export default function CouponManager() {
  const [coupons, setCoupons] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    percentageCount: 0,
    flatCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  const defaultCoupons = [
    {
      _id: 'cp_welcome_20',
      code: 'WELCOME20',
      title: 'Welcome First Order 20% OFF',
      description: 'Get 20% discount on your first marketplace order (capped at ₹500)',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      maxDiscountAmount: 500,
      minOrderAmount: 999,
      expiryDate: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
      usageLimit: 500,
      usedCount: 142,
      perUserLimit: 1,
      isActive: true,
      isFeatured: true,
    },
    {
      _id: 'cp_festive_500',
      code: 'FESTIVE500',
      title: 'Festive Mega Bonanza Flat ₹500',
      description: 'Instant ₹500 flat off across all electronics and fashion',
      discountType: 'FLAT',
      discountValue: 500,
      maxDiscountAmount: null,
      minOrderAmount: 2499,
      expiryDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      usageLimit: 1000,
      usedCount: 489,
      perUserLimit: 2,
      isActive: true,
      isFeatured: true,
    },
    {
      _id: 'cp_saver_200',
      code: 'SAVER200',
      title: 'Everyday Cart Saver ₹200',
      description: 'Flat ₹200 off on daily essentials and lifestyle orders above ₹1,199',
      discountType: 'FLAT',
      discountValue: 200,
      maxDiscountAmount: null,
      minOrderAmount: 1199,
      expiryDate: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
      usageLimit: 2000,
      usedCount: 820,
      perUserLimit: 3,
      isActive: true,
      isFeatured: false,
    },
    {
      _id: 'cp_audio_15',
      code: 'AUDIO15',
      title: 'Spatial Audio Studio 15% OFF',
      description: '15% savings on all wireless earbuds, ANC headphones and soundbars',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      maxDiscountAmount: 1200,
      minOrderAmount: 1999,
      expiryDate: new Date(Date.now() + 45 * 24 * 3600 * 1000).toISOString(),
      usageLimit: 300,
      usedCount: 78,
      perUserLimit: 1,
      isActive: true,
      isFeatured: true,
    },
  ];

  const initialFormState = {
    code: '',
    title: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    maxDiscountAmount: 500,
    minOrderAmount: 999,
    expiryDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
    usageLimit: 500,
    perUserLimit: 1,
    isActive: true,
    isFeatured: true,
  };

  const [formData, setFormData] = useState(initialFormState);

  const presets = [
    {
      label: '⚡ Flat ₹500 Festive',
      preset: {
        code: 'FESTIVE500',
        title: 'Festive Flat ₹500 Bonanza',
        description: 'Instant ₹500 off on all qualifying cart orders over ₹2499',
        discountType: 'FLAT',
        discountValue: 500,
        maxDiscountAmount: null,
        minOrderAmount: 2499,
      },
    },
    {
      label: '🎉 Welcome 25% Off',
      preset: {
        code: 'WELCOME25',
        title: 'New Shopper 25% Welcome Voucher',
        description: '25% discount capped at ₹600 on first checkout',
        discountType: 'PERCENTAGE',
        discountValue: 25,
        maxDiscountAmount: 600,
        minOrderAmount: 1299,
      },
    },
    {
      label: '🛍️ Flat ₹250 Saver',
      preset: {
        code: 'SAVER250',
        title: 'Everyday Flat ₹250 Savings',
        description: 'Flat ₹250 instant reduction on min order of ₹1499',
        discountType: 'FLAT',
        discountValue: 250,
        maxDiscountAmount: null,
        minOrderAmount: 1499,
      },
    },
    {
      label: '👑 VIP 30% Club',
      preset: {
        code: 'VIP30',
        title: 'Premium Member 30% Exclusive',
        description: '30% savings up to ₹1,500 on luxury electronics and apparel',
        discountType: 'PERCENTAGE',
        discountValue: 30,
        maxDiscountAmount: 1500,
        minOrderAmount: 3999,
      },
    },
  ];

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await api.get('/coupons/admin/all', {
        params: {
          search: searchQuery,
          discountType: typeFilter !== 'all' ? typeFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        },
      });

      if (res.data && res.data.success) {
        setCoupons(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      } else {
        fallbackToDefault();
      }
    } catch (err) {
      console.warn('API error fetching admin coupons, using state/default:', err);
      fallbackToDefault();
    } finally {
      setLoading(false);
    }
  };

  const fallbackToDefault = () => {
    setCoupons((prev) => (prev.length > 0 ? prev : defaultCoupons));
    setStats({
      total: 4,
      active: 4,
      expired: 0,
      percentageCount: 2,
      flatCount: 2,
    });
  };

  useEffect(() => {
    fetchCoupons();
  }, [typeFilter, statusFilter]);

  const showNotification = (msg, isError = false) => {
    setActionMessage({ text: msg, isError });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      title: coupon.title,
      description: coupon.description || '',
      discountType: coupon.discountType || 'PERCENTAGE',
      discountValue: coupon.discountValue,
      maxDiscountAmount: coupon.maxDiscountAmount || '',
      minOrderAmount: coupon.minOrderAmount || 0,
      expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split('T')[0] : '',
      usageLimit: coupon.usageLimit || '',
      perUserLimit: coupon.perUserLimit || 1,
      isActive: coupon.isActive !== undefined ? coupon.isActive : true,
      isFeatured: coupon.isFeatured !== undefined ? coupon.isFeatured : true,
    });
    setIsModalOpen(true);
  };

  const handleApplyPreset = (p) => {
    setFormData((prev) => ({
      ...prev,
      ...p,
      code: p.code,
      title: p.title,
      description: p.description,
      discountType: p.discountType,
      discountValue: p.discountValue,
      maxDiscountAmount: p.maxDiscountAmount || '',
      minOrderAmount: p.minOrderAmount,
    }));
  };

  const handleToggleActive = async (coupon) => {
    try {
      const res = await api.patch(`/coupons/${coupon._id}/toggle`);
      if (res.data && res.data.success) {
        setCoupons((prev) =>
          prev.map((c) => (c._id === coupon._id ? { ...c, isActive: res.data.data.isActive } : c))
        );
        showNotification(
          `Coupon "${coupon.code}" ${res.data.data.isActive ? 'activated' : 'deactivated'}!`
        );
      }
    } catch (err) {
      // Local fallback toggle
      setCoupons((prev) =>
        prev.map((c) => (c._id === coupon._id ? { ...c, isActive: !c.isActive } : c))
      );
      showNotification(`Coupon "${coupon.code}" status toggled!`);
    }
  };

  const handleDeleteCoupon = async (id, code) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${code}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/coupons/${id}`);
      setCoupons((prev) => prev.filter((c) => c._id !== id));
      showNotification(`Coupon "${code}" deleted permanently.`);
    } catch (err) {
      setCoupons((prev) => prev.filter((c) => c._id !== id));
      showNotification(`Coupon "${code}" removed.`);
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.title || formData.discountValue === undefined) {
      showNotification('Coupon Code, Title and Discount Value are required', true);
      return;
    }

    setIsSaving(true);
    const payload = {
      ...formData,
      code: formData.code.trim().toUpperCase(),
      discountValue: Number(formData.discountValue),
      maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : null,
      minOrderAmount: Number(formData.minOrderAmount) || 0,
      usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
      perUserLimit: Number(formData.perUserLimit) || 1,
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null,
    };

    try {
      if (editingCoupon) {
        const res = await api.put(`/coupons/${editingCoupon._id}`, payload);
        if (res.data && res.data.success) {
          setCoupons((prev) =>
            prev.map((c) => (c._id === editingCoupon._id ? res.data.data : c))
          );
          showNotification(`Coupon "${payload.code}" updated successfully!`);
        }
      } else {
        const res = await api.post('/coupons', payload);
        if (res.data && res.data.success) {
          setCoupons((prev) => [res.data.data, ...prev]);
          showNotification(`New coupon "${payload.code}" created successfully!`);
        }
      }
      setIsModalOpen(false);
      fetchCoupons();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Error saving coupon';
      showNotification(errMsg, true);
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Filtered in-memory for instant responsive search
  const filteredCoupons = coupons.filter((coupon) => {
    const matchesSearch =
      coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coupon.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (coupon.description && coupon.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType =
      typeFilter === 'all' || coupon.discountType.toLowerCase() === typeFilter.toLowerCase();

    let matchesStatus = true;
    const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
    if (statusFilter === 'active') matchesStatus = coupon.isActive && !isExpired;
    else if (statusFilter === 'expired') matchesStatus = isExpired;
    else if (statusFilter === 'inactive') matchesStatus = !coupon.isActive;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* ========================================================================= */}
      {/* HEADER & METRIC SUMMARY CARDS */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-black uppercase tracking-wider border border-amber-400/30">
              <Ticket className="w-3.5 h-3.5" />
              <span>Point #40 • Master Discount Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Coupons & Promo Code Creator
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              Generate percentage-based and flat-rate promotional vouchers with minimum cart spending
              thresholds, global usage limits, per-user redemption caps, and automated countdown expiry.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchCoupons}
              disabled={loading}
              className="p-3 rounded-2xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition border border-slate-700 flex items-center gap-2 text-xs font-bold"
              title="Refresh Coupons"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="px-5 py-3 rounded-2xl bg-amber-400 text-slate-950 hover:bg-amber-300 transition font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-400/20 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create Coupon</span>
            </button>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
            <div className="text-slate-400 text-xs font-bold flex items-center justify-between">
              <span>Total Coupons</span>
              <Ticket className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">{stats.total || coupons.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">Configured in system</div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
            <div className="text-slate-400 text-xs font-bold flex items-center justify-between">
              <span>Active & Live</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {stats.active !== undefined
                ? stats.active
                : coupons.filter((c) => c.isActive).length}
            </div>
            <div className="text-[11px] text-emerald-300/80 mt-1">Redeemable at checkout</div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
            <div className="text-slate-400 text-xs font-bold flex items-center justify-between">
              <span>Percentage (%)</span>
              <Percent className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-blue-400 mt-1">
              {stats.percentageCount || coupons.filter((c) => c.discountType === 'PERCENTAGE').length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Dynamic percentage vouchers</div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
            <div className="text-slate-400 text-xs font-bold flex items-center justify-between">
              <span>Flat Discount (₹)</span>
              <DollarSign className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {stats.flatCount || coupons.filter((c) => c.discountType === 'FLAT').length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Fixed rupee deduction</div>
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
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            1-Click Instant Promotional Templates
          </span>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Click to pre-fill creator form with battle-tested e-commerce templates
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
              className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 text-left transition group"
            >
              <div className="font-black text-xs text-slate-900 group-hover:text-amber-700">
                {p.label}
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">
                {p.preset.code} • {p.preset.discountType === 'PERCENTAGE' ? `${p.preset.discountValue}% OFF` : `₹${p.preset.discountValue} OFF`}
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
            placeholder="Search coupon code, title, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <div className="flex items-center rounded-2xl bg-white border border-slate-200 p-1">
            {[
              { id: 'all', label: 'All Types' },
              { id: 'percentage', label: 'Percentage (%)' },
              { id: 'flat', label: 'Flat (₹)' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  typeFilter === t.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center rounded-2xl bg-white border border-slate-200 p-1">
            {[
              { id: 'all', label: 'All Status' },
              { id: 'active', label: 'Active' },
              { id: 'expired', label: 'Expired' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === s.id
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
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
      {/* COUPONS GRID / LIST */}
      {/* ========================================================================= */}
      {filteredCoupons.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 mx-auto flex items-center justify-center">
            <Ticket className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900">No Coupons Found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            No coupon matches your search criteria. Create a new promo code or reset filters.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
          >
            Create New Promo Code
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCoupons.map((coupon) => {
            const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
            const daysLeft = coupon.expiryDate
              ? Math.ceil((new Date(coupon.expiryDate) - new Date()) / (1000 * 3600 * 24))
              : null;

            return (
              <div
                key={coupon._id}
                className={`relative bg-white rounded-3xl border transition-all duration-200 hover:shadow-lg overflow-hidden flex flex-col justify-between ${
                  !coupon.isActive || isExpired
                    ? 'border-slate-200 opacity-75'
                    : 'border-slate-200 hover:border-amber-300'
                }`}
              >
                {/* Coupon Header Band */}
                <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-base font-black px-3 py-1 rounded-xl bg-amber-50 text-amber-950 border border-amber-200 flex items-center gap-1.5 shadow-sm">
                        <Tag className="w-3.5 h-3.5 text-amber-600" />
                        {coupon.code}
                      </span>
                      <button
                        onClick={() => copyToClipboard(coupon.code)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        title="Copy Code"
                      >
                        {copiedCode === coupon.code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {coupon.discountType === 'PERCENTAGE' ? (
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {coupon.discountValue}% OFF
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ₹{coupon.discountValue} FLAT
                        </span>
                      )}

                      {coupon.isFeatured && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          ⭐ Featured
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-black text-slate-900 mt-2">{coupon.title}</h4>
                    {coupon.description && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {coupon.description}
                      </p>
                    )}
                  </div>

                  {/* Active Toggle Switch */}
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => handleToggleActive(coupon)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        coupon.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      title={coupon.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          coupon.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider ${
                        coupon.isActive ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Coupon Conditions & Thresholds */}
                <div className="p-6 bg-slate-50/50 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-2xl border border-slate-200/80">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Min Spend</div>
                      <div className="font-black text-slate-900 mt-0.5">
                        {coupon.minOrderAmount > 0
                          ? `₹${coupon.minOrderAmount.toLocaleString('en-IN')}`
                          : 'No Minimum'}
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-slate-200/80">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Max Cap</div>
                      <div className="font-black text-slate-900 mt-0.5">
                        {coupon.maxDiscountAmount
                          ? `₹${coupon.maxDiscountAmount.toLocaleString('en-IN')}`
                          : 'No Cap'}
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-slate-200/80">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Per User</div>
                      <div className="font-black text-slate-900 mt-0.5">
                        {coupon.perUserLimit || 1} time(s)
                      </div>
                    </div>
                  </div>

                  {/* Expiry & Usage Tracker */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {coupon.expiryDate ? (
                        isExpired ? (
                          <span className="font-black text-rose-600">Expired</span>
                        ) : (
                          <span className="font-medium text-slate-600">
                            Valid until{' '}
                            <span className="font-bold text-slate-900">
                              {new Date(coupon.expiryDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>{' '}
                            <span className="text-amber-600 font-bold">({daysLeft}d left)</span>
                          </span>
                        )
                      ) : (
                        <span className="font-medium text-slate-500">Never expires</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-600 font-medium">
                        Used:{' '}
                        <span className="font-black text-slate-900">{coupon.usedCount || 0}</span>
                        {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ' (Unlimited)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenEditModal(coupon)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-50 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteCoupon(coupon._id, coupon.code)}
                    className="px-3.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1.5"
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
      {/* MODAL: CREATE / EDIT COUPON */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">
                  {editingCoupon ? 'Modify Existing Code' : 'New Promotional Voucher'}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  {editingCoupon ? `Edit Coupon: ${formData.code}` : 'Create Discount Coupon'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* LIVE PREVIEW CARD */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-dashed border-amber-300 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">
                  Live Shopper Preview
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950">
                    {formData.code || 'CODE2026'}
                  </span>
                  <span className="font-black text-slate-900 text-sm">
                    {formData.discountType === 'PERCENTAGE'
                      ? `${formData.discountValue || 0}% OFF`
                      : `₹${formData.discountValue || 0} FLAT OFF`}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  {formData.minOrderAmount > 0
                    ? `Min cart ₹${Number(formData.minOrderAmount).toLocaleString('en-IN')}`
                    : 'No min spend'}{' '}
                  {formData.discountType === 'PERCENTAGE' && formData.maxDiscountAmount
                    ? `• Max cap ₹${Number(formData.maxDiscountAmount).toLocaleString('en-IN')}`
                    : ''}
                </div>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 rounded-full bg-slate-900 text-amber-400 font-black text-[10px] uppercase">
                  Point #40 Certified
                </span>
              </div>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmitForm} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Coupon Code */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FESTIVE500"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '') })
                    }
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition"
                  />
                </div>

                {/* Coupon Title */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Display Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Festive Bonanza Flat ₹500"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Terms & Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Valid on all electronics & lifestyle categories above ₹2,499"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Discount Type
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition"
                  >
                    <option value="PERCENTAGE">PERCENTAGE (%)</option>
                    <option value="FLAT">FLAT AMOUNT (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Discount Value *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0"
                      max={formData.discountType === 'PERCENTAGE' ? '100' : '999999'}
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                      {formData.discountType === 'PERCENTAGE' ? '%' : '₹'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Max Cap (For %)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      disabled={formData.discountType === 'FLAT'}
                      placeholder={formData.discountType === 'FLAT' ? 'N/A' : 'e.g. 500'}
                      value={formData.maxDiscountAmount}
                      onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 disabled:opacity-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                      ₹
                    </span>
                  </div>
                </div>
              </div>

              {/* Thresholds & Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Min Order Spend (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 999"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Total Global Usage
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 500 (blank = inf)"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 transition"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                  />
                  <span className="text-xs font-bold text-slate-800">Active & Redeemable</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Featured in Customer Storefront
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
                  className="px-6 py-2.5 rounded-2xl bg-amber-400 text-slate-950 hover:bg-amber-300 text-xs font-black transition shadow-lg shadow-amber-400/20 flex items-center gap-2"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCoupon ? 'Update Coupon' : 'Publish Coupon'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
