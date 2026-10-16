import React, { useState, useEffect } from 'react';
import {
  Gift,
  Sparkles,
  Settings,
  Plus,
  Trash2,
  Check,
  Eye,
  EyeOff,
  Printer,
  Save,
  RefreshCw,
  Sliders,
  DollarSign,
  Palette,
  FileText,
  AlertCircle,
} from 'lucide-react';
import api from '../api/client';

export const AdminGiftWrapManager = () => {
  const [config, setConfig] = useState({
    isEnabled: true,
    basePrice: 49,
    freeThreshold: 1999,
    allowHidePrice: true,
    maxMessageLength: 250,
    designs: [],
    cardThemes: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' | 'designs' | 'cards' | 'slip-preview'

  // New Design Form State
  const [newDesign, setNewDesign] = useState({
    id: '',
    name: '',
    price: 49,
    color: '#f59e0b',
    previewImage: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&q=80',
    isActive: true,
  });

  // New Theme Form State
  const [newTheme, setNewTheme] = useState({
    theme: '',
    icon: '✨',
    defaultMessage: '',
    isActive: true,
  });

  // Sample Gift Slip State for Live Interactive Simulator
  const [slipPreview, setSlipPreview] = useState({
    recipientName: 'Priya Sharma',
    senderName: 'Aditya Verma & Family',
    message: 'Wishing you endless joy, laughter, and health on your special day! Enjoy this curated gift from AuraMarket.',
    cardTheme: 'Birthday',
    wrapName: 'Royal Gold Velvet',
    hidePrice: true,
  });

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await api.get('/gift-wrap/admin/config');
      if (res.data?.success && res.data.data) {
        setConfig(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load gift wrap admin config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await api.put('/gift-wrap/admin/config', config);
      if (res.data?.success) {
        setConfig(res.data.data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      alert(`Failed to save settings: ${err.response?.data?.message || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddDesign = () => {
    if (!newDesign.name.trim()) return alert('Please enter a design name');
    const id = newDesign.id.trim() || `wrap-${Date.now().toString().slice(-4)}`;
    const updated = [...(config.designs || []), { ...newDesign, id, price: Number(newDesign.price) }];
    setConfig((prev) => ({ ...prev, designs: updated }));
    setNewDesign({
      id: '',
      name: '',
      price: 49,
      color: '#f59e0b',
      previewImage: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&q=80',
      isActive: true,
    });
  };

  const handleRemoveDesign = (id) => {
    const updated = (config.designs || []).filter((d) => d.id !== id);
    setConfig((prev) => ({ ...prev, designs: updated }));
  };

  const handleToggleDesignActive = (id) => {
    const updated = (config.designs || []).map((d) =>
      d.id === id ? { ...d, isActive: !d.isActive } : d
    );
    setConfig((prev) => ({ ...prev, designs: updated }));
  };

  const handleAddTheme = () => {
    if (!newTheme.theme.trim()) return alert('Please enter occasion / theme name');
    const updated = [...(config.cardThemes || []), { ...newTheme }];
    setConfig((prev) => ({ ...prev, cardThemes: updated }));
    setNewTheme({
      theme: '',
      icon: '✨',
      defaultMessage: '',
      isActive: true,
    });
  };

  const handleRemoveTheme = (themeName) => {
    const updated = (config.cardThemes || []).filter((t) => t.theme !== themeName);
    setConfig((prev) => ({ ...prev, cardThemes: updated }));
  };

  const handleToggleThemeActive = (themeName) => {
    const updated = (config.cardThemes || []).map((t) =>
      t.theme === themeName ? { ...t, isActive: !t.isActive } : t
    );
    setConfig((prev) => ({ ...prev, cardThemes: updated }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-amber-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="font-semibold text-sm">Loading Gift Wrapping & Greeting Card Studio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.08)_0,transparent_70%)] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg">
              <Gift className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Gift Wrapping & Greeting Cards Studio
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Point #19
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live Production
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Configure luxury designer gift packaging, occasion greeting themes, free order thresholds & price-concealed 4x6 packing slips.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 animate-fadeIn">
                <Check className="w-4 h-4" /> Changes Saved!
              </span>
            )}
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block">Base Wrap Fee</span>
            <span className="text-lg font-bold text-amber-400">₹{config.basePrice}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block">Free Wrap Threshold</span>
            <span className="text-lg font-bold text-emerald-400">₹{config.freeThreshold}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block">Active Wrap Designs</span>
            <span className="text-lg font-bold text-white">
              {(config.designs || []).filter((d) => d.isActive).length}/{(config.designs || []).length}
            </span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block">Active Card Themes</span>
            <span className="text-lg font-bold text-white">
              {(config.cardThemes || []).filter((t) => t.isActive).length}/{(config.cardThemes || []).length}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'settings'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Global Rules & Pricing
        </button>
        <button
          onClick={() => setActiveTab('designs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'designs'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Palette className="w-4 h-4" />
          Designer Wrap Papers ({(config.designs || []).length})
        </button>
        <button
          onClick={() => setActiveTab('cards')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'cards'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Greeting Card Themes ({(config.cardThemes || []).length})
        </button>
        <button
          onClick={() => setActiveTab('slip-preview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'slip-preview'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <FileText className="w-4 h-4" />
          Printable 4x6 Slip Simulator
        </button>
      </div>

      {/* Tab 1: Global Rules & Pricing */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <DollarSign className="w-4 h-4 text-amber-400" />
              Service & Pricing Rules
            </h3>

            {/* Service Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-800/40 rounded-xl border border-slate-800">
              <div>
                <p className="text-xs font-semibold text-white">Enable Gift Wrap Service Storewide</p>
                <p className="text-[11px] text-slate-400">Display gifting option at checkout & cart drawer</p>
              </div>
              <input
                type="checkbox"
                checked={config.isEnabled}
                onChange={(e) => setConfig((prev) => ({ ...prev, isEnabled: e.target.checked }))}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Base Price */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Standard Base Gift Wrap Price (₹)
              </label>
              <input
                type="number"
                value={config.basePrice}
                onChange={(e) => setConfig((prev) => ({ ...prev, basePrice: Number(e.target.value) }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Default fee charged if not overridden per paper design</p>
            </div>

            {/* Free Threshold */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Free Gift Wrapping Order Threshold (₹)
              </label>
              <input
                type="number"
                value={config.freeThreshold}
                onChange={(e) => setConfig((prev) => ({ ...prev, freeThreshold: Number(e.target.value) }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Cart subtotal equal to or exceeding this amount automatically waives wrap charges (₹0).
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <EyeOff className="w-4 h-4 text-amber-400" />
              Privacy & Greeting Limits
            </h3>

            {/* Hide Price Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-800/40 rounded-xl border border-slate-800">
              <div>
                <p className="text-xs font-semibold text-white">Allow Customers to Conceal Invoice Prices</p>
                <p className="text-[11px] text-slate-400">
                  Replaces price numbers with "Gift Protected" on packing slips
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.allowHidePrice}
                onChange={(e) => setConfig((prev) => ({ ...prev, allowHidePrice: e.target.checked }))}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Max Message Length */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Max Personalized Greeting Message Length (Characters)
              </label>
              <input
                type="number"
                value={config.maxMessageLength}
                onChange={(e) => setConfig((prev) => ({ ...prev, maxMessageLength: Number(e.target.value) }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Standard 4x6 postcards fit up to 250 characters comfortably</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-300">Immutable Audit Trail Enforced</p>
                <p className="text-[11px] text-amber-200/80 mt-0.5">
                  Every change to base prices, thresholds, or designs is cryptographically logged with Super Admin user attribution and IP address.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Designer Wrap Papers */}
      {activeTab === 'designs' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Add New Design */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              Add New Designer Wrap Paper
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Paper Name</label>
                <input
                  type="text"
                  placeholder="e.g., Celestial Silver Star"
                  value={newDesign.name}
                  onChange={(e) => setNewDesign((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Price (₹)</label>
                <input
                  type="number"
                  value={newDesign.price}
                  onChange={(e) => setNewDesign((prev) => ({ ...prev, price: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Accent Hex Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newDesign.color}
                    onChange={(e) => setNewDesign((prev) => ({ ...prev, color: e.target.value }))}
                    className="w-8 h-8 rounded-lg border border-slate-700 bg-transparent cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={newDesign.color}
                    onChange={(e) => setNewDesign((prev) => ({ ...prev, color: e.target.value }))}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Image Preview URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={newDesign.previewImage}
                  onChange={(e) => setNewDesign((prev) => ({ ...prev, previewImage: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="button"
                onClick={handleAddDesign}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Wrap
              </button>
            </div>
          </div>

          {/* Existing Designs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {(config.designs || []).map((d) => (
              <div
                key={d.id}
                className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                  d.isActive ? 'border-slate-800 hover:border-amber-500/50' : 'border-slate-800/40 opacity-60'
                }`}
              >
                <div>
                  <div
                    className="w-full h-28 rounded-xl mb-3 relative overflow-hidden bg-cover bg-center border border-slate-800"
                    style={{ backgroundImage: `url(${d.previewImage})` }}
                  >
                    <div
                      className="absolute inset-0 opacity-40 mix-blend-multiply"
                      style={{ backgroundColor: d.color }}
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-amber-400 font-bold">
                      ₹{d.price}
                    </div>
                  </div>
                  <h5 className="font-semibold text-xs text-white">{d.name}</h5>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {d.id}</p>
                </div>

                <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleToggleDesignActive(d.id)}
                    className={`text-[11px] font-medium px-2 py-1 rounded-lg border transition-colors ${
                      d.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {d.isActive ? 'Active' : 'Disabled'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveDesign(d.id)}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Greeting Card Themes */}
      {activeTab === 'cards' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Add New Theme */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              Add New Occasion & Greeting Card Theme
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Occasion / Theme Name</label>
                <input
                  type="text"
                  placeholder="e.g., Housewarming"
                  value={newTheme.theme}
                  onChange={(e) => setNewTheme((prev) => ({ ...prev, theme: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Emoji Icon</label>
                <input
                  type="text"
                  placeholder="🏡"
                  value={newTheme.icon}
                  onChange={(e) => setNewTheme((prev) => ({ ...prev, icon: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Default Greeting Note Template</label>
                <input
                  type="text"
                  placeholder="Congratulations on your new home..."
                  value={newTheme.defaultMessage}
                  onChange={(e) => setNewTheme((prev) => ({ ...prev, defaultMessage: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="button"
                onClick={handleAddTheme}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Theme
              </button>
            </div>
          </div>

          {/* Existing Themes List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {(config.cardThemes || []).map((t) => (
              <div
                key={t.theme}
                className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                  t.isActive ? 'border-slate-800 hover:border-amber-500/50' : 'border-slate-800/40 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{t.icon}</span>
                    <h5 className="font-semibold text-xs text-white">{t.theme}</h5>
                  </div>
                  <p className="text-[11px] text-slate-400 italic line-clamp-2">
                    "{t.defaultMessage}"
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleToggleThemeActive(t.theme)}
                    className={`text-[11px] font-medium px-2 py-1 rounded-lg border transition-colors ${
                      t.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {t.isActive ? 'Active' : 'Disabled'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveTheme(t.theme)}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Printable 4x6 Slip Simulator */}
      {activeTab === 'slip-preview' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fadeIn">
          {/* Controls */}
          <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Simulator Controls
            </h4>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Recipient Name</label>
              <input
                type="text"
                value={slipPreview.recipientName}
                onChange={(e) => setSlipPreview((prev) => ({ ...prev, recipientName: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Sender Name</label>
              <input
                type="text"
                value={slipPreview.senderName}
                onChange={(e) => setSlipPreview((prev) => ({ ...prev, senderName: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Greeting Message Note</label>
              <textarea
                rows={3}
                value={slipPreview.message}
                onChange={(e) => setSlipPreview((prev) => ({ ...prev, message: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white resize-none"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-300">Conceal Invoice Price Watermark</span>
              <input
                type="checkbox"
                checked={slipPreview.hidePrice}
                onChange={(e) => setSlipPreview((prev) => ({ ...prev, hidePrice: e.target.checked }))}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              Print Sample 4x6 Slip
            </button>
          </div>

          {/* 4x6 Printable Postcard Visual */}
          <div className="md:col-span-7 flex justify-center items-center bg-slate-950/60 p-6 rounded-2xl border border-slate-800">
            <div className="w-[360px] bg-amber-50/95 text-slate-900 border-2 border-dashed border-amber-600/60 rounded-2xl p-6 shadow-2xl space-y-4 font-serif relative">
              {/* Stamp / Occasion Badge */}
              <div className="flex items-start justify-between border-b border-amber-800/20 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-600/20 flex items-center justify-center text-lg">
                    🎁
                  </div>
                  <div>
                    <h5 className="font-bold text-xs font-sans tracking-wide uppercase text-amber-950">
                      AuraMarket Gift Dispatch
                    </h5>
                    <p className="text-[10px] text-amber-800 font-sans">#GIFT-4821 • Verified Packaging</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] px-2 py-0.5 rounded border border-amber-600/30 bg-amber-100 font-sans font-bold text-amber-900">
                    {slipPreview.cardTheme}
                  </span>
                </div>
              </div>

              {/* Recipient */}
              <div className="space-y-1">
                <span className="text-[10px] font-sans text-amber-800/70 uppercase tracking-widest block">
                  Especially Handcrafted For:
                </span>
                <p className="text-base font-bold text-slate-900">
                  {slipPreview.recipientName || 'Valued Recipient'}
                </p>
              </div>

              {/* Message Note */}
              <div className="p-4 rounded-xl bg-white/70 border border-amber-200/60 italic text-xs leading-relaxed text-slate-800">
                "{slipPreview.message}"
              </div>

              {/* Sender & Price Status */}
              <div className="flex items-center justify-between pt-2 border-t border-amber-800/20 font-sans">
                <div>
                  <span className="text-[9px] text-amber-800/70 uppercase tracking-widest block">From:</span>
                  <p className="text-xs font-bold text-slate-900">{slipPreview.senderName}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-amber-800/70 uppercase tracking-widest block">Invoice Price:</span>
                  <p className="text-[11px] font-bold text-emerald-700">
                    {slipPreview.hidePrice ? '★ Gift Item - Value Protected' : '₹1,999.00'}
                  </p>
                </div>
              </div>

              {/* Simulated Barcode */}
              <div className="pt-2 text-center border-t border-dashed border-amber-800/20 font-sans">
                <div className="h-6 mx-auto w-48 bg-[repeating-linear-gradient(90deg,#1e293b,#1e293b_2px,transparent_2px,transparent_4px)] opacity-60" />
                <span className="text-[9px] text-slate-500 tracking-widest font-mono">
                  *ORD-2026-GIFT-9921*
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
