import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Layers,
  Palette,
  Link as LinkIcon,
  Tag,
} from 'lucide-react';
import api from '../api/client';

export default function BannerManager() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [positionFilter, setPositionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    badgeText: 'Trending Now',
    imageUrl: '',
    actionLink: '/products',
    buttonText: 'Shop Now',
    position: 'hero_slider',
    displayOrder: 1,
    isActive: true,
    backgroundColor: '#0F172A',
    textColor: '#FFFFFF',
  });

  const defaultBanners = [
    {
      _id: 'bn_hero_1',
      title: 'Next-Gen Wireless Noise Cancelling Over-Ear',
      subtitle: 'Immerse in studio-grade acoustics with 40-hour playtime & dynamic ANC.',
      badgeText: '🔥 Mega Launch 2026',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
      actionLink: '/category/electronics',
      buttonText: 'Shop Electronics',
      position: 'hero_slider',
      displayOrder: 1,
      isActive: true,
      backgroundColor: '#0F172A',
      textColor: '#FFFFFF',
    },
    {
      _id: 'bn_hero_2',
      title: 'Cyberpunk & Minimal Streetwear Drop',
      subtitle: 'Heavyweight organic cotton, boxy oversized cuts, and handcrafted aesthetics.',
      badgeText: '✨ New Arrivals',
      imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80',
      actionLink: '/category/fashion',
      buttonText: 'Explore Fashion',
      position: 'hero_slider',
      displayOrder: 2,
      isActive: true,
      backgroundColor: '#1E1B4B',
      textColor: '#FFFFFF',
    },
    {
      _id: 'bn_hero_3',
      title: 'Titanium Smartwatch Pro Ultra Series',
      subtitle: 'Military-grade rugged durability, multi-day battery, and ECG cardiac sensor.',
      badgeText: '⚡ Limited Flash Deal',
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
      actionLink: '/products',
      buttonText: 'Grab Deal Now',
      position: 'hero_slider',
      displayOrder: 3,
      isActive: true,
      backgroundColor: '#18181B',
      textColor: '#FFFFFF',
    },
    {
      _id: 'bn_promo_1',
      title: 'Festive Electronics Bonanza — Flat 40% OFF',
      subtitle: 'Use coupon FESTIVE500 at checkout on orders above ₹2,499.',
      badgeText: '🎉 Festive Special',
      imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
      actionLink: '/products',
      buttonText: 'Claim 40% OFF',
      position: 'promo_banner_top',
      displayOrder: 1,
      isActive: true,
      backgroundColor: '#F59E0B',
      textColor: '#0B0F17',
    },
    {
      _id: 'bn_promo_2',
      title: 'Join As A Verified Merchant Partner Today',
      subtitle: 'Zero upfront listing fee, 24-hour payouts, and 100k+ active shoppers across India.',
      badgeText: '💼 Vendor Onboarding',
      imageUrl: 'https://images.unsplash.com/photo-1556742049-0a67e5572248?auto=format&fit=crop&w=1200&q=80',
      actionLink: '/vendor/register',
      buttonText: 'Open Your Store',
      position: 'promo_banner_middle',
      displayOrder: 1,
      isActive: true,
      backgroundColor: '#047857',
      textColor: '#FFFFFF',
    },
  ];

  const presetImages = [
    { label: 'Studio Audio', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Cyber Streetwear', url: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Rugged Smartwatch', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Festive Mega Sale', url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Merchant Network', url: 'https://images.unsplash.com/photo-1556742049-0a67e5572248?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Premium Laptops', url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80' },
  ];

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/banners');
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setBanners(res.data.data);
      } else {
        // Fallback to default catalog
        const pubRes = await api.get('/banners?activeOnly=false');
        if (pubRes.data?.success && Array.isArray(pubRes.data.data) && pubRes.data.data.length > 0) {
          setBanners(pubRes.data.data);
        } else {
          setBanners(defaultBanners);
        }
      }
    } catch (_) {
      setBanners(defaultBanners);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const showNotification = (msg, isError = false) => {
    setActionMessage({ text: msg, isError });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleOpenAddModal = (position = 'hero_slider') => {
    setEditingBanner(null);
    setFormData({
      title: '',
      subtitle: '',
      badgeText: 'Trending Now',
      imageUrl: presetImages[0].url,
      actionLink: '/products',
      buttonText: 'Shop Now',
      position,
      displayOrder: banners.filter((b) => b.position === position).length + 1,
      isActive: true,
      backgroundColor: '#0F172A',
      textColor: '#FFFFFF',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      badgeText: banner.badgeText || 'Trending Now',
      imageUrl: banner.imageUrl || '',
      actionLink: banner.actionLink || '/products',
      buttonText: banner.buttonText || 'Shop Now',
      position: banner.position || 'hero_slider',
      displayOrder: banner.displayOrder || 1,
      isActive: banner.isActive !== undefined ? banner.isActive : true,
      backgroundColor: banner.backgroundColor || '#0F172A',
      textColor: banner.textColor || '#FFFFFF',
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (banner) => {
    const updatedStatus = !banner.isActive;
    try {
      await api.patch(`/admin/banners/${banner._id}/toggle`);
      setBanners((prev) =>
        prev.map((b) => (b._id === banner._id ? { ...b, isActive: updatedStatus } : b))
      );
      showNotification(`Banner ${updatedStatus ? 'activated' : 'deactivated'} successfully!`);
    } catch (_) {
      // Local optimistic update
      setBanners((prev) =>
        prev.map((b) => (b._id === banner._id ? { ...b, isActive: updatedStatus } : b))
      );
      showNotification(`Banner status updated (local mode)!`);
    }
  };

  const handleMoveOrder = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredBanners.length) return;

    const newFiltered = [...filteredBanners];
    const temp = newFiltered[index];
    newFiltered[index] = newFiltered[targetIndex];
    newFiltered[targetIndex] = temp;

    // Recalculate displayOrders
    const updatedItems = newFiltered.map((b, i) => ({
      id: b._id,
      displayOrder: i + 1,
    }));

    // Optimistically update
    setBanners((prev) =>
      prev.map((b) => {
        const found = updatedItems.find((u) => u.id === b._id);
        return found ? { ...b, displayOrder: found.displayOrder } : b;
      })
    );

    try {
      await api.put('/admin/banners/reorder', { items: updatedItems });
      showNotification('Banner display order updated successfully!');
    } catch (_) {
      showNotification('Banner order reordered locally');
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    if (!window.confirm('Are you sure you want to delete this promotional banner?')) return;

    try {
      await api.delete(`/admin/banners/${bannerId}`);
      setBanners((prev) => prev.filter((b) => b._id !== bannerId));
      showNotification('Banner deleted successfully!');
    } catch (_) {
      setBanners((prev) => prev.filter((b) => b._id !== bannerId));
      showNotification('Banner deleted locally!');
    }
  };

  const handleSaveBanner = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.imageUrl.trim()) {
      showNotification('Title and Image URL are required', true);
      return;
    }

    setIsSaving(true);
    try {
      if (editingBanner) {
        const res = await api.put(`/admin/banners/${editingBanner._id}`, formData);
        const updated = res.data?.data || { ...editingBanner, ...formData };
        setBanners((prev) => prev.map((b) => (b._id === editingBanner._id ? updated : b)));
        showNotification('Banner updated successfully!');
      } else {
        const res = await api.post('/admin/banners', formData);
        const created = res.data?.data || {
          ...formData,
          _id: `bn_${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        setBanners((prev) => [created, ...prev]);
        showNotification('New Banner created successfully!');
      }
      setIsModalOpen(false);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error saving banner', true);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered banners
  const filteredBanners = banners
    .filter((b) => {
      const matchesPosition = positionFilter === 'all' || b.position === positionFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        (b.title && b.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.subtitle && b.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.badgeText && b.badgeText.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesPosition && matchesSearch;
    })
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const totalCount = banners.length;
  const activeCount = banners.filter((b) => b.isActive).length;
  const heroCount = banners.filter((b) => b.position === 'hero_slider').length;
  const promoCount = banners.filter((b) => b.position !== 'hero_slider').length;

  return (
    <div className="space-y-6">
      {/* Alert Notification Toast */}
      {actionMessage && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium shadow-lg transition-all animate-fade-in ${
            actionMessage.isError
              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
          }`}
        >
          {actionMessage.isError ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <Check className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Header Banner Hub */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Homepage Hero Slider & Promo Banner Manager
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                  Point #38
                </span>
              </h2>
              <p className="text-sm text-slate-400">
                Design, arrange, and schedule high-converting hero carousels and promotional deal banners across customer storefront.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={fetchBanners}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-sm flex items-center gap-2 transition-all border border-slate-700 disabled:opacity-50"
            title="Refresh Banners"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => handleOpenAddModal('hero_slider')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Add New Banner
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Banners</p>
            <p className="text-xl font-bold text-white mt-0.5">{totalCount}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Active On Storefront</p>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">{activeCount}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Hero Carousels</p>
            <p className="text-xl font-bold text-amber-400 mt-0.5">{heroCount}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Promo Deal Banners</p>
            <p className="text-xl font-bold text-purple-400 mt-0.5">{promoCount}</p>
          </div>
        </div>
      </div>

      {/* Position Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Position Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl overflow-x-auto">
          {[
            { id: 'all', label: 'All Banners' },
            { id: 'hero_slider', label: 'Hero Carousel' },
            { id: 'promo_banner_top', label: 'Promo Top Deals' },
            { id: 'promo_banner_middle', label: 'Promo Mid Sections' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPositionFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                positionFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, badge, subtitle..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Banners List / Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-sm font-medium">Loading promotional banners...</p>
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <Sliders className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Banners Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? `No banners match "${searchQuery}". Try clearing search.`
                : 'There are no banners currently configured in this section.'}
            </p>
          </div>
          <button
            onClick={() => handleOpenAddModal(positionFilter === 'all' ? 'hero_slider' : positionFilter)}
            className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-md shadow-amber-500/10"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Create First Banner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredBanners.map((banner, index) => (
            <div
              key={banner._id}
              className={`bg-slate-900/90 border rounded-2xl overflow-hidden transition-all duration-200 hover:border-slate-700 flex flex-col justify-between ${
                banner.isActive
                  ? 'border-slate-800 hover:shadow-xl hover:shadow-amber-500/5'
                  : 'border-slate-800/50 opacity-70'
              }`}
            >
              {/* Visual Banner Preview Card */}
              <div className="relative aspect-[21/9] bg-slate-950 overflow-hidden group">
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent flex flex-col justify-end p-5">
                  {/* Badge Text */}
                  {banner.badgeText && (
                    <span className="inline-block self-start px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950 mb-2 shadow-sm">
                      {banner.badgeText}
                    </span>
                  )}

                  <h4 className="text-base font-bold text-white line-clamp-1">{banner.title}</h4>
                  {banner.subtitle && (
                    <p className="text-xs text-slate-300 line-clamp-1 mt-0.5 font-normal">
                      {banner.subtitle}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    <span className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 border border-white/20">
                      {banner.buttonText || 'Shop Now'}
                      <ExternalLink className="w-3 h-3" />
                    </span>
                    <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                      {banner.actionLink}
                    </span>
                  </div>
                </div>

                {/* Status Indicator Pill */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${
                      banner.isActive
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700'
                    }`}
                  >
                    {banner.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Position Indicator Tag */}
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-950/80 text-slate-300 border border-slate-800 backdrop-blur-md">
                    {banner.position === 'hero_slider'
                      ? 'Hero Carousel'
                      : banner.position === 'promo_banner_top'
                      ? 'Top Promo'
                      : 'Mid Section'}
                  </span>
                </div>
              </div>

              {/* Controls Footer */}
              <div className="p-4 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
                {/* Reorder Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleMoveOrder(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    title="Move Order Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveOrder(index, 'down')}
                    disabled={index === filteredBanners.length - 1}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    title="Move Order Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono font-semibold text-slate-400 ml-1">
                    Order #{banner.displayOrder || index + 1}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(banner)}
                    className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      banner.isActive
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                    }`}
                    title={banner.isActive ? 'Deactivate Banner' : 'Activate Banner'}
                  >
                    {banner.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{banner.isActive ? 'Hide' : 'Show'}</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(banner)}
                    className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all flex items-center gap-1 text-xs font-semibold"
                    title="Edit Banner Details"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDeleteBanner(banner._id)}
                    className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all flex items-center gap-1 text-xs font-semibold"
                    title="Delete Banner"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Banner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-slate-900/95 border-b border-slate-800 px-6 py-4 flex items-center justify-between backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingBanner ? 'Edit Promotional Banner' : 'Create New Promotional Banner'}
                  </h3>
                  <p className="text-xs text-slate-400">Configure visual imagery, target link, and priority</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveBanner} className="p-6 space-y-5">
              {/* Live Preview Card */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  Live Preview as You Type
                </label>
                <div className="relative aspect-[21/9] rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                  <img
                    src={
                      formData.imageUrl ||
                      'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80'
                    }
                    alt={formData.title || 'Preview'}
                    className="w-full h-full object-cover object-center"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent flex flex-col justify-end p-4">
                    {formData.badgeText && (
                      <span className="inline-block self-start px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 mb-1.5">
                        {formData.badgeText}
                      </span>
                    )}
                    <h4 className="text-sm md:text-base font-bold text-white line-clamp-1">
                      {formData.title || 'Enter your headline title...'}
                    </h4>
                    {formData.subtitle && (
                      <p className="text-xs text-slate-300 line-clamp-1 mt-0.5 font-normal">
                        {formData.subtitle}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2.5 py-1 rounded bg-white/20 text-white text-[11px] font-semibold flex items-center gap-1 border border-white/20">
                        {formData.buttonText || 'Shop Now'}
                        <ExternalLink className="w-3 h-3" />
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">{formData.actionLink}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Banner Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Headline Title <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Next-Gen Wireless Noise Cancelling Over-Ear"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-slate-500"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Subtitle Description
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. Studio acoustics with 40-hour playtime & dynamic ANC."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-slate-500"
                />
              </div>

              {/* Badge Text & Button Text Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Badge Pill Text
                  </label>
                  <div className="relative">
                    <Tag className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.badgeText}
                      onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                      placeholder="e.g. 🔥 Mega Launch 2026"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={formData.buttonText}
                    onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                    placeholder="e.g. Shop Now, Explore Collection"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Position & Target Link Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Banner Placement Position
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="hero_slider">Hero Carousel (Top Homepage)</option>
                    <option value="promo_banner_top">Top Promo Bar (Under Nav)</option>
                    <option value="promo_banner_middle">Mid-Page Showcase Banner</option>
                    <option value="sidebar_banner">Sidebar / Deal of the Day</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Target Route / URL Link
                  </label>
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.actionLink}
                      onChange={(e) => setFormData({ ...formData, actionLink: e.target.value })}
                      placeholder="e.g. /category/electronics, /products"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Image URL & Quick Demo Presets */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Banner Image URL <span className="text-amber-500">*</span>
                </label>
                <div className="relative">
                  <ImageIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    required
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-slate-500"
                  />
                </div>

                {/* 1-Click Preset Gallery Chips */}
                <div className="pt-1">
                  <p className="text-[11px] font-medium text-slate-400 mb-1.5">
                    1-Click High-Res Presets:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {presetImages.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: p.url })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                          formData.imageUrl === p.url
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order & Active Switch */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Display Order Index
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 1 })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <p className="text-xs font-semibold text-white">Active Status</p>
                    <p className="text-[11px] text-slate-400">Display immediately on storefront</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  {isSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {editingBanner ? 'Save Changes' : 'Create Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
