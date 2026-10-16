import React, { useState, useEffect } from 'react';
import {
  Tag,
  Gift,
  Flame,
  Plus,
  RefreshCw,
  Sliders,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ShoppingBag,
  Trash2,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Percent,
  Copy,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import api from '../api/client';

export default function VendorPromotionsManager({ isOpen, onClose, storeProducts = [], onPromoUpdated }) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [promotions, setPromotions] = useState([]);
  const [telemetry, setTelemetry] = useState({
    totalPromotions: 0,
    totalActive: 0,
    bogoCount: 0,
    totalDiscountFunded: 0,
    totalOrdersDriven: 0,
  });

  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create'
  const [editingPromoId, setEditingPromoId] = useState(null);

  // Form state
  const initialForm = {
    code: '',
    title: '',
    description: '',
    promotionType: 'BOGO', // 'BOGO' | 'BUY_X_GET_Y' | 'DISCOUNT_CODE'
    discountType: 'PERCENTAGE',
    discountValue: 100,
    maxDiscountAmount: '',
    minOrderAmount: 0,
    expiryDate: '',
    usageLimit: 100,
    perUserLimit: 1,
    storeWide: true,
    applicableProducts: [],
    bogoConfig: {
      buyQty: 1,
      getQty: 1,
      discountPercentage: 100,
      applicableProducts: [],
    },
    bannerBadge: {
      enabled: true,
      badgeText: 'BUY 1 GET 1 FREE',
      badgeColor: '#DC2626',
      bannerMessage: 'Exclusive Seller Offer: Buy 1 Get 1 Free on Select Items!',
    },
  };

  const [formData, setFormData] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPromotions = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/vendor/promotions');
      if (res.data && res.data.success) {
        setPromotions(res.data.data || []);
        if (res.data.telemetry) {
          setTelemetry(res.data.telemetry);
        }
      }
    } catch (err) {
      console.error('Failed to load promotions:', err);
      setNotification({
        type: 'error',
        text: err.response?.data?.message || 'Failed to fetch vendor promotions.',
      });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setNotification(null);
      fetchPromotions();
    }
  }, [isOpen]);

  const handleSelectDealType = (type) => {
    let newBadgeText = 'PROMO';
    let newBuyQty = 1;
    let newGetQty = 1;
    let newDiscountPct = 100;
    let newBannerMsg = '';

    if (type === 'BOGO') {
      newBadgeText = 'BUY 1 GET 1 FREE';
      newBuyQty = 1;
      newGetQty = 1;
      newDiscountPct = 100;
      newBannerMsg = 'Special Store Deal: Buy 1 Get 1 Free!';
    } else if (type === 'BUY_X_GET_Y') {
      newBadgeText = 'BUY 2 GET 1 AT 50% OFF';
      newBuyQty = 2;
      newGetQty = 1;
      newDiscountPct = 50;
      newBannerMsg = 'Volume Savings: Buy 2, Get the 3rd at 50% OFF!';
    } else {
      newBadgeText = 'SELLER VOUCHER 20% OFF';
      newDiscountPct = 20;
      newBannerMsg = 'Exclusive Store Voucher: 20% OFF your entire order!';
    }

    setFormData((prev) => ({
      ...prev,
      promotionType: type,
      discountValue: type === 'BOGO' ? 100 : prev.discountValue,
      bogoConfig: {
        ...prev.bogoConfig,
        buyQty: newBuyQty,
        getQty: newGetQty,
        discountPercentage: newDiscountPct,
      },
      bannerBadge: {
        ...prev.bannerBadge,
        badgeText: newBadgeText,
        bannerMessage: newBannerMsg,
      },
    }));
  };

  const handleGenerateCode = () => {
    const prefix = formData.promotionType === 'BOGO' ? 'BOGO' : formData.promotionType === 'BUY_X_GET_Y' ? 'SAVE' : 'VND';
    const rand = Math.floor(1000 + Math.random() * 9000);
    setFormData((prev) => ({ ...prev, code: `${prefix}-${rand}` }));
  };

  const handleToggleProductSelection = (productId) => {
    setFormData((prev) => {
      const currentList = prev.bogoConfig.applicableProducts || [];
      const updated = currentList.includes(productId)
        ? currentList.filter((id) => id !== productId)
        : [...currentList, productId];

      return {
        ...prev,
        storeWide: updated.length === 0,
        bogoConfig: {
          ...prev.bogoConfig,
          applicableProducts: updated,
        },
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) {
      setNotification({ type: 'error', text: 'Please provide a promotion title.' });
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingPromoId) {
        const res = await api.put(`/vendor/promotions/${editingPromoId}`, formData);
        if (res.data?.success) {
          setNotification({ type: 'success', text: 'Promotion updated successfully!' });
        }
      } else {
        const res = await api.post('/vendor/promotions', formData);
        if (res.data?.success) {
          setNotification({ type: 'success', text: `Promotion "${res.data.data.code}" created and live!` });
        }
      }

      setFormData(initialForm);
      setEditingPromoId(null);
      setActiveTab('list');
      await fetchPromotions();
      if (onPromoUpdated) onPromoUpdated();
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save promotion.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (promoId) => {
    try {
      const res = await api.patch(`/vendor/promotions/${promoId}/toggle`);
      if (res.data?.success) {
        setNotification({
          type: 'success',
          text: `Promotion ${res.data.data.isActive ? 'activated' : 'paused'}.`,
        });
        await fetchPromotions();
        if (onPromoUpdated) onPromoUpdated();
      }
    } catch (err) {
      setNotification({ type: 'error', text: 'Failed to toggle status.' });
    }
  };

  const handleDelete = async (promoId) => {
    if (!window.confirm('Are you sure you want to delete this promotion?')) return;

    try {
      const res = await api.delete(`/vendor/promotions/${promoId}`);
      if (res.data?.success) {
        setNotification({ type: 'success', text: 'Promotion removed successfully.' });
        await fetchPromotions();
        if (onPromoUpdated) onPromoUpdated();
      }
    } catch (err) {
      setNotification({ type: 'error', text: 'Failed to delete promotion.' });
    }
  };

  const handleStartEdit = (promo) => {
    setEditingPromoId(promo._id);
    setFormData({
      code: promo.code,
      title: promo.title,
      description: promo.description || '',
      promotionType: promo.promotionType || 'DISCOUNT_CODE',
      discountType: promo.discountType || 'PERCENTAGE',
      discountValue: promo.discountValue || 0,
      maxDiscountAmount: promo.maxDiscountAmount || '',
      minOrderAmount: promo.minOrderAmount || 0,
      expiryDate: promo.expiryDate ? promo.expiryDate.split('T')[0] : '',
      usageLimit: promo.usageLimit || '',
      perUserLimit: promo.perUserLimit || 1,
      storeWide: promo.storeWide ?? true,
      bogoConfig: {
        buyQty: promo.bogoConfig?.buyQty || 1,
        getQty: promo.bogoConfig?.getQty || 1,
        discountPercentage: promo.bogoConfig?.discountPercentage ?? 100,
        applicableProducts: (promo.bogoConfig?.applicableProducts || []).map((p) => p._id || p),
      },
      bannerBadge: {
        enabled: promo.bannerBadge?.enabled ?? true,
        badgeText: promo.bannerBadge?.badgeText || 'PROMO',
        badgeColor: promo.bannerBadge?.badgeColor || '#DC2626',
        bannerMessage: promo.bannerBadge?.bannerMessage || '',
      },
    });
    setActiveTab('create');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/20">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Vendor-Funded Custom Promotions & BOGO Studio
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded-full border border-amber-300 dark:border-amber-700/50">
                  Point #11 Master
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Create Buy 1 Get 1 Free, tiered bundle deals, and custom vouchers. Vendor-funded discount attribution preserves platform commission.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPromotions}
              disabled={refreshing}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors title='Refresh'"
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
          {notification && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between text-sm ${
                notification.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {notification.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                )}
                <span>{notification.text}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
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
                <span>Active Promotions</span>
                <Tag className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {telemetry.totalActive} / {telemetry.totalPromotions}
              </div>
              <p className="text-xs text-slate-400 mt-1">Live deals on storefront</p>
            </div>

            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm">
              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <span>BOGO / Bundle Deals</span>
                <Flame className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {telemetry.bogoCount}
              </div>
              <p className="text-xs text-rose-500/80 mt-1">High conversion volume drivers</p>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
              <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <span>Vendor Discount Funded</span>
                <DollarSign className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                ₹{telemetry.totalDiscountFunded.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-amber-500/80 mt-1">Self-funded store savings</p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <span>Orders Driven</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {telemetry.totalOrdersDriven}
              </div>
              <p className="text-xs text-emerald-500/80 mt-1">Orders converted via deals</p>
            </div>
          </div>

          {/* Attribution Notice */}
          <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 text-xs flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <strong>Vendor-Funded Discount Attribution Protocol:</strong> Discounts are absorbed directly by the seller payout ledger. The marketplace platform commission rate is calculated strictly on the agreed gross base, ensuring zero commission leakage for marketplace operators.
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveTab('list');
                  setEditingPromoId(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'list'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Active Promotions ({promotions.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('create');
                  if (!editingPromoId) setFormData(initialForm);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'create'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{editingPromoId ? 'Edit Promotion' : 'Create New Promotion / BOGO'}</span>
              </button>
            </div>
          </div>

          {/* TAB 1: LIST PROMOTIONS */}
          {activeTab === 'list' && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                      <th className="py-3 px-4">Promo Code & Title</th>
                      <th className="py-3 px-4">Deal Structure</th>
                      <th className="py-3 px-4">Storefront Badge</th>
                      <th className="py-3 px-4">Performance</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {promotions.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-400 dark:text-slate-500">
                          <Gift className="w-10 h-10 text-amber-500 mx-auto mb-2 opacity-80" />
                          <p className="font-semibold text-sm">No custom promotions yet!</p>
                          <p className="text-xs">
                            Launch a Buy 1 Get 1 Free deal or store discount voucher to boost store velocity.
                          </p>
                          <button
                            onClick={() => setActiveTab('create')}
                            className="mt-3 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-bold rounded-xl shadow-md"
                          >
                            + Create First BOGO / Deal
                          </button>
                        </td>
                      </tr>
                    ) : (
                      promotions.map((p) => {
                        const isBogo = ['BOGO', 'BUY_X_GET_Y'].includes(p.promotionType);

                        return (
                          <tr
                            key={p._id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            {/* Code & Title */}
                            <td className="py-3 px-4">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
                                    {p.code}
                                  </span>
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300">
                                    {p.promotionType}
                                  </span>
                                </div>
                                <div className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                                  {p.title}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {p.storeWide
                                    ? 'Store-wide applicable'
                                    : `${p.bogoConfig?.applicableProducts?.length || 0} designated product(s)`}
                                </div>
                              </div>
                            </td>

                            {/* Deal Structure */}
                            <td className="py-3 px-4">
                              {isBogo ? (
                                <div className="space-y-0.5 font-semibold text-slate-800 dark:text-slate-200">
                                  <div>
                                    Buy <span className="font-bold text-rose-600">{p.bogoConfig?.buyQty || 1}</span>, Get{' '}
                                    <span className="font-bold text-rose-600">{p.bogoConfig?.getQty || 1}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    Discount: {p.bogoConfig?.discountPercentage ?? 100}% OFF Free Units
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-0.5 font-semibold text-slate-800 dark:text-slate-200">
                                  <div>
                                    {p.discountType === 'PERCENTAGE' ? `${p.discountValue}% OFF` : `₹${p.discountValue} FLAT`}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    Min Cart: ₹{p.minOrderAmount || 0}
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Banner Badge */}
                            <td className="py-3 px-4">
                              {p.bannerBadge?.enabled ? (
                                <span
                                  className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider text-white shadow-xs"
                                  style={{ backgroundColor: p.bannerBadge.badgeColor || '#DC2626' }}
                                >
                                  {p.bannerBadge.badgeText}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">No storefront badge</span>
                              )}
                            </td>

                            {/* Performance */}
                            <td className="py-3 px-4">
                              <div className="space-y-0.5 text-[11px]">
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {p.usedCount || 0}
                                  </span>{' '}
                                  <span className="text-slate-500">uses</span>
                                </div>
                                <div className="text-amber-600 dark:text-amber-400 font-semibold">
                                  ₹{(p.totalDiscountGiven || 0).toLocaleString('en-IN')} funded
                                </div>
                              </div>
                            </td>

                            {/* Status Toggle */}
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleToggleActive(p._id)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${
                                  p.isActive
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                              >
                                {p.isActive ? 'Active' : 'Paused'}
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={() => handleStartEdit(p)}
                                  className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                  title="Edit promotion"
                                >
                                  <Sliders className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(p._id)}
                                  className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                                  title="Delete promotion"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
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
          )}

          {/* TAB 2: CREATE / EDIT PROMOTION STUDIO */}
          {activeTab === 'create' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Promotion Type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  1. Choose Promotion Structure:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div
                    onClick={() => handleSelectDealType('BOGO')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      formData.promotionType === 'BOGO'
                        ? 'border-red-500 bg-red-50/60 dark:bg-red-950/30 ring-2 ring-red-400'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white">
                      <Gift className="w-4 h-4 text-red-600" />
                      <span>Buy 1 Get 1 Free (BOGO)</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Shopper buys 1 product, gets a 2nd identical or eligible unit at 100% discount.
                    </p>
                  </div>

                  <div
                    onClick={() => handleSelectDealType('BUY_X_GET_Y')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      formData.promotionType === 'BUY_X_GET_Y'
                        ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 ring-2 ring-rose-400'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white">
                      <Flame className="w-4 h-4 text-rose-600" />
                      <span>Tiered Bundle (Buy X Get Y)</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      e.g. Buy 2 Get 1 Free, or Buy 1 Get 2nd at 50% Off for volume order incentive.
                    </p>
                  </div>

                  <div
                    onClick={() => handleSelectDealType('DISCOUNT_CODE')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      formData.promotionType === 'DISCOUNT_CODE'
                        ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 ring-2 ring-amber-400'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white">
                      <Tag className="w-4 h-4 text-amber-600" />
                      <span>Store Discount Voucher</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Percentage or Flat Rupee coupon code valid exclusively on your store catalog.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2: Core Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Promotion Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Festive Audio BOGO: Buy 1 Aura Pro, Get 1 Free!"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Promo Code (Uppercase)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. BOGO2026"
                      value={formData.code}
                      onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg shrink-0"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                {/* BOGO Parameters (if BOGO or BUY_X_GET_Y) */}
                {['BOGO', 'BUY_X_GET_Y'].includes(formData.promotionType) && (
                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Buy Quantity (X)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.bogoConfig.buyQty}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            bogoConfig: { ...prev.bogoConfig, buyQty: parseInt(e.target.value, 10) || 1 },
                          }))
                        }
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Get Quantity (Y)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.bogoConfig.getQty}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            bogoConfig: { ...prev.bogoConfig, getQty: parseInt(e.target.value, 10) || 1 },
                          }))
                        }
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Discount on Get Item (% off)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.bogoConfig.discountPercentage}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            bogoConfig: {
                              ...prev.bogoConfig,
                              discountPercentage: parseInt(e.target.value, 10) || 100,
                            },
                          }))
                        }
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-white font-mono"
                      />
                      <span className="text-[10px] text-slate-500">100% = 100% Free; 50% = Half Price</span>
                    </div>
                  </div>
                )}

                {/* Voucher parameters (if DISCOUNT_CODE) */}
                {formData.promotionType === 'DISCOUNT_CODE' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Discount Type
                      </label>
                      <select
                        value={formData.discountType}
                        onChange={(e) => setFormData((prev) => ({ ...prev, discountType: e.target.value }))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                      >
                        <option value="PERCENTAGE">Percentage (% Off)</option>
                        <option value="FLAT">Flat Amount (₹ Off)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Discount Value ({formData.discountType === 'PERCENTAGE' ? '%' : '₹'})
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.discountValue}
                        onChange={(e) => setFormData((prev) => ({ ...prev, discountValue: e.target.value }))}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Minimum Order Cart Value (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, minOrderAmount: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Redemptions Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 500"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, usageLimit: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Step 3: Product Scope Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    2. Product Eligibility Scope:
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          storeWide: true,
                          bogoConfig: { ...prev.bogoConfig, applicableProducts: [] },
                        }))
                      }
                      className={`px-3 py-1 rounded text-xs font-bold ${
                        formData.storeWide
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Entire Store Catalog
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, storeWide: false }))}
                      className={`px-3 py-1 rounded text-xs font-bold ${
                        !formData.storeWide
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Select Products ({formData.bogoConfig?.applicableProducts?.length || 0})
                    </button>
                  </div>
                </div>

                {!formData.storeWide && (
                  <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/50 dark:bg-slate-900">
                    {storeProducts.length === 0 ? (
                      <p className="text-xs text-slate-400 col-span-2 text-center py-4">
                        No products available in vendor catalog.
                      </p>
                    ) : (
                      storeProducts.map((p) => {
                        const isSelected = formData.bogoConfig.applicableProducts.includes(p.id || p._id);

                        return (
                          <div
                            key={p.id || p._id}
                            onClick={() => handleToggleProductSelection(p.id || p._id)}
                            className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer text-xs transition-all ${
                              isSelected
                                ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="w-4 h-4 rounded text-red-600 cursor-pointer"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-900 dark:text-white truncate">
                                {p.title}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                ₹{p.sellingPrice} • SKU: {p.sku}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Step 4: Storefront Promo Banner Studio & Live Preview */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      3. Storefront Promo Sticker & Banner Studio
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.bannerBadge.enabled}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          bannerBadge: { ...prev.bannerBadge, enabled: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 text-red-600 rounded"
                    />
                    <span>Show on Storefront & Product Cards</span>
                  </label>
                </div>

                {formData.bannerBadge.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Sticker Badge Text
                      </label>
                      <input
                        type="text"
                        value={formData.bannerBadge.badgeText}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            bannerBadge: { ...prev.bannerBadge, badgeText: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Banner Message
                      </label>
                      <input
                        type="text"
                        value={formData.bannerBadge.bannerMessage}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            bannerBadge: { ...prev.bannerBadge, bannerMessage: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>

                    {/* Live Visual Preview */}
                    <div className="md:col-span-2 p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Live Storefront Preview to Customers:</span>
                      </div>
                      <div className="p-3 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between gap-3 shadow-md">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider text-white shadow"
                            style={{ backgroundColor: formData.bannerBadge.badgeColor || '#DC2626' }}
                          >
                            {formData.bannerBadge.badgeText || 'SPECIAL DEAL'}
                          </span>
                          <span className="text-xs font-bold">
                            {formData.bannerBadge.bannerMessage || 'Special promotion active!'}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-black bg-white/20 px-2 py-0.5 rounded text-amber-300">
                          {formData.code || 'BOGO-PROMO'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingPromoId ? 'Update Promotion' : 'Publish Vendor Deal'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Audited vendor promotional ledger • Platform commission safe</span>
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
