import React, { useState, useEffect } from 'react';
import {
  X,
  Store,
  Image,
  Globe,
  Share2,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Check,
  Save,
  Sparkles,
  ExternalLink,
  Eye,
  AlertCircle,
  FileText,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
} from 'lucide-react';
import api from '../api/client';

const BANNER_PRESETS = [
  {
    name: 'Cyber Tech & Obsidian',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&q=80',
  },
  {
    name: 'Studio Minimalist',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80',
  },
  {
    name: 'Electric Neon Audio',
    url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=80',
  },
  {
    name: 'Luxury Lifestyle',
    url: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&q=80',
  },
];

const LOGO_PRESETS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&q=80',
  'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=200&q=80',
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=200&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&q=80',
];

const VendorStoreProfileModal = ({
  isOpen,
  onClose,
  initialData,
  onProfileUpdated,
  onOpenPublicPreview,
}) => {
  const [formData, setFormData] = useState({
    storeName: '',
    storeSlug: '',
    storeLogo: '',
    storeBanner: '',
    description: '',
    bio: '',
    supportPhone: '',
    supportEmail: '',
    returnPolicy: '',
    pickupAddress: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
    },
    socialLinks: {
      instagram: '',
      twitter: '',
      facebook: '',
      youtube: '',
      website: '',
    },
  });

  const [activeTab, setActiveTab] = useState('branding'); // branding | contact | policies | preview
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen, initialData]);

  const loadProfile = async () => {
    try {
      const res = await api.get('/vendor/profile');
      if (res.data?.success && res.data.data) {
        const v = res.data.data;
        setFormData({
          storeName: v.storeName || '',
          storeSlug: v.storeSlug || '',
          storeLogo: v.storeLogo || LOGO_PRESETS[0],
          storeBanner: v.storeBanner || BANNER_PRESETS[0].url,
          description: v.description || '',
          bio: v.bio || v.description || '',
          supportPhone: v.supportPhone || v.pickupAddress?.phone || '',
          supportEmail: v.supportEmail || '',
          returnPolicy: v.returnPolicy || 'Standard 7-day return and replacement policy for damaged or defective items.',
          pickupAddress: {
            street: v.pickupAddress?.street || '',
            city: v.pickupAddress?.city || '',
            state: v.pickupAddress?.state || '',
            pincode: v.pickupAddress?.pincode || '',
            phone: v.pickupAddress?.phone || '',
          },
          socialLinks: {
            instagram: v.socialLinks?.instagram || '',
            twitter: v.socialLinks?.twitter || '',
            facebook: v.socialLinks?.facebook || '',
            youtube: v.socialLinks?.youtube || '',
            website: v.socialLinks?.website || '',
          },
        });
        return;
      }
    } catch (_) {}

    // Fallback to initialData if offline/mock
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        storeName: initialData.storeName || 'Apex Tech Hub',
        storeSlug: (initialData.storeName || 'apex-tech-hub').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        storeLogo: initialData.storeLogo || LOGO_PRESETS[0],
        storeBanner: initialData.storeBanner || BANNER_PRESETS[0].url,
        bio: initialData.bio || 'Official verified flagship store specializing in premium audiophile electronics.',
      }));
    }
  };

  const handleSlugify = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await api.put('/vendor/profile', formData);
      if (res.data?.success) {
        setFeedback({ type: 'success', message: 'Store profile & branding successfully published!' });
        if (onProfileUpdated) {
          onProfileUpdated(res.data.data);
        }
      } else {
        setFeedback({ type: 'error', message: res.data?.message || 'Failed to update store profile.' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error saving store profile.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Vendor Store Profile & Customization
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Point #58
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Customize your public storefront brand identity, cover banner, custom slug, bio, and customer support.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-slate-50 border-b border-slate-200 overflow-x-auto text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'branding'
                ? 'border-indigo-600 text-indigo-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Image className="w-4 h-4" />
            <span>Storefront Branding & Images</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'contact'
                ? 'border-indigo-600 text-indigo-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Phone className="w-4 h-4" />
            <span>Support & Warehouse Address</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('social')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'social'
                ? 'border-indigo-600 text-indigo-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Social Media & Handles</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('policies')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'policies'
                ? 'border-indigo-600 text-indigo-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Return & Refund Policy</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              {feedback.message}
            </span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Live Storefront Preview Card (Always visible on top for instant feedback) */}
          <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-md">
            <div className="relative h-32 sm:h-40 w-full overflow-hidden bg-slate-800">
              <img
                src={formData.storeBanner || BANNER_PRESETS[0].url}
                alt="Store Banner Preview"
                className="w-full h-full object-cover opacity-90 transition-all duration-300"
                onError={(e) => {
                  e.target.src = BANNER_PRESETS[0].url;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-950/80 text-white backdrop-blur-md border border-white/20 flex items-center gap-1.5">
                  <Eye className="w-3 h-3 text-amber-400" />
                  <span>Live Preview</span>
                </span>
                {onOpenPublicPreview && (
                  <button
                    type="button"
                    onClick={() => onOpenPublicPreview(formData)}
                    className="text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all flex items-center gap-1"
                  >
                    <span>Full Storefront</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 sm:-mt-12 relative z-10">
              <div className="flex items-end gap-3.5">
                <div className="w-20 h-20 rounded-2xl border-4 border-slate-900 bg-white overflow-hidden shadow-xl shrink-0">
                  <img
                    src={formData.storeLogo || LOGO_PRESETS[0]}
                    alt="Store Logo Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = LOGO_PRESETS[0];
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white tracking-tight">
                      {formData.storeName || 'Your Store Name'}
                    </h3>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" title="Verified Merchant" />
                  </div>
                  <p className="text-xs text-amber-400 font-mono mt-0.5">
                    auramarket.online/store/{formData.storeSlug || 'your-slug'}
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-300 max-w-sm line-clamp-2">
                {formData.bio || 'Add your store bio and brand story to showcase your unique offerings.'}
              </div>
            </div>
          </div>

          {/* TAB 1: BRANDING & IMAGES */}
          {activeTab === 'branding' && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Store Display Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.storeName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        storeName: val,
                        // Auto-suggest slug if empty or freshly typing
                        storeSlug: prev.storeSlug ? prev.storeSlug : handleSlugify(val),
                      }));
                    }}
                    placeholder="e.g. Apex Tech Hub"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Custom Store URL Slug <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                    <span className="bg-slate-100 text-slate-500 text-xs px-3 py-2.5 font-mono select-none border-r border-slate-300">
                      /store/
                    </span>
                    <input
                      type="text"
                      value={formData.storeSlug}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          storeSlug: handleSlugify(e.target.value),
                        }))
                      }
                      placeholder="apex-tech-hub"
                      className="w-full px-3 py-2.5 text-sm font-mono text-slate-900 outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Your public link: <span className="font-mono text-indigo-600">auramarket.online/store/{formData.storeSlug || '...'}</span>
                  </p>
                </div>
              </div>

              {/* Logo URL & Presets */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Store Logo (Square 1:1)
                  </label>
                  <span className="text-[11px] text-slate-500">Paste direct image URL or choose preset</span>
                </div>
                <input
                  type="url"
                  value={formData.storeLogo}
                  onChange={(e) => setFormData(prev => ({ ...prev, storeLogo: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 bg-white"
                />
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs font-bold text-slate-500">Quick Logo Presets:</span>
                  <div className="flex items-center gap-2">
                    {LOGO_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, storeLogo: p }))}
                        className={`w-9 h-9 rounded-xl border-2 overflow-hidden transition-all hover:scale-105 ${
                          formData.storeLogo === p ? 'border-indigo-600 ring-2 ring-indigo-300' : 'border-slate-300'
                        }`}
                      >
                        <img src={p} alt={`Logo Preset ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cover Banner URL & Presets */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Store Cover Banner (Wide 16:9 or 3:1)
                  </label>
                  <span className="text-[11px] text-slate-500">Recommended 1200x400 px</span>
                </div>
                <input
                  type="url"
                  value={formData.storeBanner}
                  onChange={(e) => setFormData(prev => ({ ...prev, storeBanner: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 bg-white"
                />
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-500">Curated Banner Themes:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {BANNER_PRESETS.map((b, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, storeBanner: b.url }))}
                        className={`group relative h-16 rounded-xl overflow-hidden border-2 text-left transition-all ${
                          formData.storeBanner === b.url
                            ? 'border-indigo-600 ring-2 ring-indigo-300'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <img src={b.url} alt={b.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-950/60 p-1.5 flex items-end">
                          <span className="text-[10px] font-bold text-white leading-tight">{b.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Store Bio / Brand Story */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Store Bio & Brand Story
                </label>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell customers about your brand legacy, product authenticity, warranties, and commitments..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                />
                <p className="text-[11px] text-slate-400 text-right mt-1">
                  {formData.bio.length} characters (Recommended 100-300 characters)
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: SUPPORT & DISPATCH ADDRESS */}
          {activeTab === 'contact' && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Customer Support Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={formData.supportPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, supportPhone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Customer Support Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={formData.supportEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, supportEmail: e.target.value }))}
                      placeholder="support@yourbrand.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Warehouse Pickup Address */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider">
                    Warehouse & Dispatch Address (Printed on Shipping Slips)
                  </h4>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Street / Facility / Industrial Unit
                  </label>
                  <input
                    type="text"
                    value={formData.pickupAddress.street}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        pickupAddress: { ...prev.pickupAddress, street: e.target.value },
                      }))
                    }
                    placeholder="Plot 42, Electronic City Phase 1"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.pickupAddress.city}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          pickupAddress: { ...prev.pickupAddress, city: e.target.value },
                        }))
                      }
                      placeholder="Bengaluru"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">State</label>
                    <input
                      type="text"
                      value={formData.pickupAddress.state}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          pickupAddress: { ...prev.pickupAddress, state: e.target.value },
                        }))
                      }
                      placeholder="Karnataka"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Pincode</label>
                    <input
                      type="text"
                      value={formData.pickupAddress.pincode}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          pickupAddress: { ...prev.pickupAddress, pincode: e.target.value },
                        }))
                      }
                      placeholder="560100"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SOCIAL MEDIA */}
          {activeTab === 'social' && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-xs text-slate-600">
                Connect your brand's official social channels. These links will appear as verified badges on your public store page.
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-200 text-pink-600 flex items-center justify-center shrink-0">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <input
                    type="url"
                    value={formData.socialLinks.instagram}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, instagram: e.target.value },
                      }))
                    }
                    placeholder="https://instagram.com/yourhandle"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center shrink-0">
                    <Twitter className="w-5 h-5" />
                  </div>
                  <input
                    type="url"
                    value={formData.socialLinks.twitter}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, twitter: e.target.value },
                      }))
                    }
                    placeholder="https://x.com/yourhandle"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                    <Facebook className="w-5 h-5" />
                  </div>
                  <input
                    type="url"
                    value={formData.socialLinks.facebook}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, facebook: e.target.value },
                      }))
                    }
                    placeholder="https://facebook.com/yourpage"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <input
                    type="url"
                    value={formData.socialLinks.youtube}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, youtube: e.target.value },
                      }))
                    }
                    placeholder="https://youtube.com/@yourchannel"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <input
                    type="url"
                    value={formData.socialLinks.website}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, website: e.target.value },
                      }))
                    }
                    placeholder="https://yourbrand.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RETURN POLICIES */}
          {activeTab === 'policies' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Storefront Return & Replacement Policy
                </label>
                <textarea
                  rows={5}
                  value={formData.returnPolicy}
                  onChange={(e) => setFormData(prev => ({ ...prev, returnPolicy: e.target.value }))}
                  placeholder="Specify return window (e.g. 7 days), conditions for acceptable returns, warranty coverage..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                />
                <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Clear return terms build customer trust and reduce RTO disputes by up to 35%.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Slug: <span className="font-mono font-bold text-slate-800">/store/{formData.storeSlug}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all w-1/2 sm:w-auto"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-1.5 w-1/2 sm:w-auto disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Store Profile</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorStoreProfileModal;
