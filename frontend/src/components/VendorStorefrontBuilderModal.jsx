import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Palette,
  Image,
  Megaphone,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ExternalLink,
  Sliders,
  Eye,
  Layers,
  LayoutGrid,
  Move,
  Tag,
  Video,
  User,
  Calendar,
} from 'lucide-react';
import api from '../api/client';

const THEME_PRESETS = [
  { name: 'Indigo Modern', primary: '#4F46E5', accent: '#F59E0B' },
  { name: 'Emerald Artisan', primary: '#059669', accent: '#D97706' },
  { name: 'Rose Luxury', primary: '#E11D48', accent: '#FBBF24' },
  { name: 'Violet Regal', primary: '#7C3AED', accent: '#38BDF8' },
  { name: 'Amber Heritage', primary: '#D97706', accent: '#4F46E5' },
  { name: 'Slate Minimal', primary: '#0F172A', accent: '#06B6D4' },
];

const LAYOUT_STYLES = [
  { id: 'GRID', name: 'Modern Product Grid', desc: 'High-density multi-column showcase ideal for broad catalogs' },
  { id: 'EDITORIAL', name: 'Editorial Storytelling', desc: 'Large hero visual banners with rich story narratives' },
  { id: 'MINIMAL', name: 'Clean Minimalist Studio', desc: 'Distraction-free boutique aesthetic with whitespace focus' },
  { id: 'BOUTIQUE', name: 'Luxury Artisan Showcase', desc: 'Featured collections with founder stories and artisan badges' },
];

export default function VendorStorefrontBuilderModal({ isOpen, onClose, onStorefrontUpdated }) {
  const [activeTab, setActiveTab] = useState('theme');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Customization Form States
  const [themeColor, setThemeColor] = useState('#4F46E5');
  const [accentColor, setAccentColor] = useState('#F59E0B');
  const [layoutStyle, setLayoutStyle] = useState('GRID');

  // Hero Banners
  const [heroBanners, setHeroBanners] = useState([]);
  const [newBanner, setNewBanner] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    targetUrl: '',
    buttonText: 'Shop Collection',
  });
  const [showAddBannerForm, setShowAddBannerForm] = useState(false);

  // Announcement Bar
  const [announcementBar, setAnnouncementBar] = useState({
    isEnabled: false,
    text: '',
    link: '',
    bgColor: '#1E1B4B',
    textColor: '#E0E7FF',
  });

  // Brand Story
  const [brandStory, setBrandStory] = useState({
    title: 'Our Craft & Heritage',
    storyText: '',
    founderName: '',
    founderPhoto: '',
    foundedYear: '',
    videoUrl: '',
    badges: [],
  });
  const [badgeInput, setBadgeInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCustomization();
    }
  }, [isOpen]);

  const fetchCustomization = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/vendor/storefront/customization');
      if (res.data?.success && res.data.data?.customization) {
        const c = res.data.data.customization;
        if (c.themeColor) setThemeColor(c.themeColor);
        if (c.accentColor) setAccentColor(c.accentColor);
        if (c.layoutStyle) setLayoutStyle(c.layoutStyle);
        if (Array.isArray(c.heroBanners)) setHeroBanners(c.heroBanners);
        if (c.announcementBar) setAnnouncementBar(c.announcementBar);
        if (c.brandStory) {
          setBrandStory({
            ...c.brandStory,
            badges: Array.isArray(c.brandStory.badges) ? c.brandStory.badges : [],
          });
        }
      }
    } catch (err) {
      console.error('Error fetching storefront customization:', err);
      setError(err.response?.data?.message || 'Failed to load storefront customization');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccessMsg('');
      const payload = {
        themeColor,
        accentColor,
        layoutStyle,
        heroBanners,
        announcementBar,
        brandStory,
        isPublished: true,
      };
      const res = await api.put('/vendor/storefront/customization', payload);
      if (res.data?.success) {
        setSuccessMsg(res.data.message || 'Micro-storefront published successfully!');
        if (onStorefrontUpdated) onStorefrontUpdated();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save micro-storefront customization');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBanner = async (e) => {
    e.preventDefault();
    if (!newBanner.imageUrl.trim()) {
      setError('Banner image URL is required');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const res = await api.post('/vendor/storefront/banner', newBanner);
      if (res.data?.success) {
        setHeroBanners([...heroBanners, res.data.data]);
        setNewBanner({
          title: '',
          subtitle: '',
          imageUrl: '',
          targetUrl: '',
          buttonText: 'Shop Collection',
        });
        setShowAddBannerForm(false);
        setSuccessMsg('Hero promotional banner added!');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add hero banner');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    try {
      setSaving(true);
      setError('');
      const res = await api.delete(`/vendor/storefront/banner/${bannerId}`);
      if (res.data?.success) {
        setHeroBanners(res.data.data || heroBanners.filter((b) => b.id !== bannerId));
        setSuccessMsg('Banner removed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete banner');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBadge = () => {
    if (!badgeInput.trim()) return;
    if (!brandStory.badges.includes(badgeInput.trim())) {
      setBrandStory({
        ...brandStory,
        badges: [...brandStory.badges, badgeInput.trim()],
      });
    }
    setBadgeInput('');
  };

  const handleRemoveBadge = (badgeToRemove) => {
    setBrandStory({
      ...brandStory,
      badges: brandStory.badges.filter((b) => b !== badgeToRemove),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl my-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="relative px-8 py-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner border border-white/20"
              style={{ backgroundColor: `${themeColor}25` }}
            >
              <Sparkles className="w-6 h-6" style={{ color: themeColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-white tracking-tight">
                  Vendor Micro-Storefront Builder Studio
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Point #36
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Design custom storefront themes, promotional hero sliders, announcement bars & brand storytelling
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-8 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'theme', label: 'Theme & Layout', icon: Palette },
            { id: 'banners', label: 'Hero Banners & Sliders', icon: Image, badge: heroBanners.length },
            { id: 'announcement', label: 'Announcement Bar', icon: Megaphone },
            { id: 'story', label: 'Brand Story & Heritage', icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400 text-xs font-semibold">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: THEME & LAYOUT */}
          {activeTab === 'theme' && (
            <div className="space-y-6">
              {/* Presets */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Brand Color Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {THEME_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setThemeColor(p.primary);
                        setAccentColor(p.accent);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        themeColor === p.primary
                          ? 'bg-slate-800 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                          : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="w-4 h-4 rounded-full shadow" style={{ backgroundColor: p.primary }} />
                        <span className="w-3 h-3 rounded-full shadow" style={{ backgroundColor: p.accent }} />
                      </div>
                      <p className="text-xs font-bold text-white truncate">{p.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Hex Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Primary Theme Color (Hex)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      placeholder="#4F46E5"
                      maxLength={7}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs uppercase focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Accent Brand Color (Hex)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      placeholder="#F59E0B"
                      maxLength={7}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs uppercase focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Layout Styles */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Storefront Layout Architecture
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {LAYOUT_STYLES.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setLayoutStyle(style.id)}
                      className={`p-5 rounded-2xl border text-left transition-all ${
                        layoutStyle === style.id
                          ? 'bg-indigo-950/20 border-indigo-500 shadow-lg ring-2 ring-indigo-500/20'
                          : 'bg-slate-800/30 border-slate-700/60 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-black text-white">{style.name}</span>
                        {layoutStyle === style.id && (
                          <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{style.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HERO BANNERS */}
          {activeTab === 'banners' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">Hero Promotional Sliders</h3>
                  <p className="text-xs text-slate-400">Add rotating hero banners showcased at the top of your store</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddBannerForm(!showAddBannerForm)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Promotional Banner</span>
                </button>
              </div>

              {/* Add Banner Form */}
              {showAddBannerForm && (
                <form
                  onSubmit={handleAddBanner}
                  className="p-5 rounded-2xl bg-slate-800/60 border border-indigo-500/30 space-y-4"
                >
                  <h4 className="text-xs font-black text-indigo-300 uppercase tracking-wider">New Hero Banner</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                        Banner Headline
                      </label>
                      <input
                        type="text"
                        value={newBanner.title}
                        onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                        placeholder="e.g. Pure Heritage Handlooms"
                        className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                        Sub-Headline / Offer
                      </label>
                      <input
                        type="text"
                        value={newBanner.subtitle}
                        onChange={(e) => setNewBanner({ ...newBanner, subtitle: e.target.value })}
                        placeholder="e.g. Handcrafted with traditional wooden looms"
                        className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                        Image URL (High-Res 1200x500)
                      </label>
                      <input
                        type="url"
                        value={newBanner.imageUrl}
                        onChange={(e) => setNewBanner({ ...newBanner, imageUrl: e.target.value })}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                        Target Link / Category
                      </label>
                      <input
                        type="text"
                        value={newBanner.targetUrl}
                        onChange={(e) => setNewBanner({ ...newBanner, targetUrl: e.target.value })}
                        placeholder="/store/apex-tech?cat=silk"
                        className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddBannerForm(false)}
                      className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md"
                    >
                      {saving ? 'Adding...' : 'Save Banner'}
                    </button>
                  </div>
                </form>
              )}

              {/* Banners List */}
              {heroBanners.length === 0 ? (
                <div className="py-12 text-center text-slate-500 bg-slate-800/20 rounded-2xl border border-slate-800">
                  <Image className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="text-xs font-bold text-slate-400">No custom hero promotional banners added</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Click 'Add Promotional Banner' above to create one</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {heroBanners.map((banner, index) => (
                    <div
                      key={banner.id || index}
                      className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <img
                          src={banner.imageUrl}
                          alt=""
                          className="w-24 h-14 rounded-xl object-cover bg-slate-900 border border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{banner.title || 'Promotional Banner'}</p>
                          <p className="text-[11px] text-slate-400 truncate">{banner.subtitle || banner.targetUrl}</p>
                          <span className="text-[10px] text-indigo-400 font-mono mt-0.5 block">
                            Slot #{index + 1}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Delete Banner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ANNOUNCEMENT BAR */}
          {activeTab === 'announcement' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-white">Top Promotional Announcement Bar</h3>
                    <p className="text-xs text-slate-400">Display marquee or fixed announcement ticker on your store</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={announcementBar.isEnabled}
                      onChange={(e) => setAnnouncementBar({ ...announcementBar, isEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                  </label>
                </div>

                {announcementBar.isEnabled && (
                  <div className="space-y-4 pt-3 border-t border-slate-800">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                        Announcement Text
                      </label>
                      <input
                        type="text"
                        value={announcementBar.text}
                        onChange={(e) => setAnnouncementBar({ ...announcementBar, text: e.target.value })}
                        placeholder="🎉 Flat 20% OFF on all handcrafted collections! Use code HERITAGE20 at checkout."
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                        Destination Link / Promo Code Target
                      </label>
                      <input
                        type="text"
                        value={announcementBar.link}
                        onChange={(e) => setAnnouncementBar({ ...announcementBar, link: e.target.value })}
                        placeholder="/store/apex-tech?promo=HERITAGE20"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Live Preview */}
                    <div className="pt-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Live Preview</p>
                      <div
                        className="p-2.5 rounded-xl text-center text-xs font-bold shadow-inner"
                        style={{ backgroundColor: announcementBar.bgColor, color: announcementBar.textColor }}
                      >
                        {announcementBar.text || 'Your promotional announcement message will appear here'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: BRAND STORY */}
          {activeTab === 'story' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Brand Story Section Title
                </label>
                <input
                  type="text"
                  value={brandStory.title}
                  onChange={(e) => setBrandStory({ ...brandStory, title: e.target.value })}
                  placeholder="Our Heritage, Craft & Master Artisans"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  The Maker's Journey / Brand Story Narrative
                </label>
                <textarea
                  value={brandStory.storyText}
                  onChange={(e) => setBrandStory({ ...brandStory, storyText: e.target.value })}
                  placeholder="Describe your craft, materials used, ethical sourcing, village artisans, and brand mission..."
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Founder / Master Artisan</label>
                  <input
                    type="text"
                    value={brandStory.founderName}
                    onChange={(e) => setBrandStory({ ...brandStory, founderName: e.target.value })}
                    placeholder="e.g. Ramesh Chandra Sharma"
                    className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Year Established</label>
                  <input
                    type="number"
                    value={brandStory.foundedYear || ''}
                    onChange={(e) => setBrandStory({ ...brandStory, foundedYear: e.target.value })}
                    placeholder="e.g. 1984"
                    className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Craft Video Embed URL</label>
                  <input
                    type="url"
                    value={brandStory.videoUrl}
                    onChange={(e) => setBrandStory({ ...brandStory, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Artisan Badges */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Artisan & Authenticity Trust Badges
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={badgeInput}
                    onChange={(e) => setBadgeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddBadge();
                      }
                    }}
                    placeholder="e.g. 100% Handloom, Direct From Weavers, Zero Chemical Dyes"
                    className="flex-1 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddBadge}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                  >
                    Add Badge
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {brandStory.badges.map((b, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700 flex items-center gap-1.5"
                    >
                      <Tag className="w-3 h-3 text-indigo-400" />
                      <span>{b}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBadge(b)}
                        className="text-slate-500 hover:text-rose-400 ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full shadow-inner"
              style={{ backgroundColor: themeColor }}
            />
            <span className="text-xs text-slate-400">
              Active Style: <span className="text-white font-bold">{layoutStyle}</span> ({themeColor})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Publishing Changes...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Save & Publish Storefront</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
