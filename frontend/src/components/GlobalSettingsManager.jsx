import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldAlert,
  Globe,
  Image,
  Save,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Eye,
  Sliders,
  DollarSign,
  Palette,
  Clock,
  Sparkles,
} from 'lucide-react';
import api from '../api/client';

export default function GlobalSettingsManager({ onConfigSaved }) {
  const [activeTab, setActiveTab] = useState('maintenance'); // 'maintenance' | 'branding' | 'currency'
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingRates, setIsSyncingRates] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [saveErrorMessage, setSaveErrorMessage] = useState('');
  const [copiedBypass, setCopiedBypass] = useState(false);

  // Branding State
  const [branding, setBranding] = useState({
    storeName: 'AuraMarket',
    tagline: 'The Next-Gen Multi-Vendor Commerce Platform',
    logoUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&h=200&fit=crop',
    faviconUrl: '/favicon.ico',
    copyrightText: '© 2026 AuraMarket — Enterprise Multi-Vendor Marketplace Platform. All rights reserved.',
    primaryColor: '#F59E0B',
    secondaryColor: '#0B0F17',
    supportPhone: '+91 8533955333',
    supportEmail: 'admin@auramarket.com',
  });

  // Maintenance Mode State
  const [maintenance, setMaintenance] = useState({
    enabled: false,
    title: 'Scheduled System Maintenance',
    message: 'We are currently performing scheduled platform enhancements. We will be back online shortly!',
    expectedEndTime: '',
    secretBypassKey: 'auramarket_admin_bypass_2026',
    allowedIps: ['127.0.0.1'],
  });

  // Multi-Currency State
  const [localization, setLocalization] = useState({
    baseCurrency: 'INR',
    defaultLanguage: 'en',
    lastRatesUpdated: null,
    currencies: [
      { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', rate: 1.0, decimals: 0, position: 'before', isActive: true },
      { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', rate: 0.01202, decimals: 2, position: 'before', isActive: true },
      { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', rate: 0.01108, decimals: 2, position: 'before', isActive: true },
      { code: 'AED', name: 'UAE Dirham', symbol: 'AED ', flag: '🇦🇪', rate: 0.04415, decimals: 2, position: 'before', isActive: true },
      { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', rate: 0.00945, decimals: 2, position: 'before', isActive: true },
    ],
  });

  // Add Currency Modal State
  const [showAddCurrencyModal, setShowAddCurrencyModal] = useState(false);
  const [newCurrency, setNewCurrency] = useState({
    code: '',
    name: '',
    symbol: '',
    flag: '🌐',
    rate: 1.0,
    decimals: 2,
    position: 'before',
    isActive: true,
  });

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/global-settings/settings');
      if (res.data?.success && res.data.data) {
        const d = res.data.data;
        if (d.branding) setBranding(d.branding);
        if (d.maintenanceMode) setMaintenance(d.maintenanceMode);
        if (d.localization) setLocalization(d.localization);
      }
    } catch (err) {
      console.warn('Could not load global settings, using defaults:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveBranding = async () => {
    setIsSaving(true);
    setSaveSuccessMessage('');
    setSaveErrorMessage('');
    try {
      const res = await api.put('/admin/global-settings/settings', branding);
      if (res.data?.success) {
        setSaveSuccessMessage('Branding, Logo, Favicon & Copyright settings saved successfully!');
        if (onConfigSaved) onConfigSaved(branding);
      }
    } catch (err) {
      setSaveErrorMessage(err.response?.data?.message || 'Failed to save branding.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleMaintenance = async (newStatus) => {
    setIsSaving(true);
    setSaveSuccessMessage('');
    setSaveErrorMessage('');
    try {
      const payload = {
        ...maintenance,
        enabled: newStatus !== undefined ? newStatus : !maintenance.enabled,
      };
      const res = await api.patch('/admin/global-settings/maintenance', payload);
      if (res.data?.success) {
        setMaintenance(res.data.maintenanceMode);
        setSaveSuccessMessage(res.data.message);
      }
    } catch (err) {
      setSaveErrorMessage(err.response?.data?.message || 'Failed to update maintenance mode.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncExchangeRates = async () => {
    setIsSyncingRates(true);
    setSaveSuccessMessage('');
    setSaveErrorMessage('');
    try {
      const res = await api.post('/admin/global-settings/sync-currency-rates');
      if (res.data?.success) {
        setLocalization((prev) => ({
          ...prev,
          currencies: res.data.currencies,
          lastRatesUpdated: res.data.lastRatesUpdated,
        }));
        setSaveSuccessMessage(res.data.message);
      }
    } catch (err) {
      setSaveErrorMessage(err.response?.data?.message || 'Failed to sync exchange rates.');
    } finally {
      setIsSyncingRates(false);
    }
  };

  const handleSaveCurrencies = async () => {
    setIsSaving(true);
    setSaveSuccessMessage('');
    setSaveErrorMessage('');
    try {
      const res = await api.put('/admin/global-settings/currencies', {
        currencies: localization.currencies,
        baseCurrency: localization.baseCurrency,
      });
      if (res.data?.success) {
        setSaveSuccessMessage('Multi-currency configuration persisted successfully!');
      }
    } catch (err) {
      setSaveErrorMessage(err.response?.data?.message || 'Failed to save currencies.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyBypassKey = () => {
    navigator.clipboard?.writeText(maintenance.secretBypassKey);
    setCopiedBypass(true);
    setTimeout(() => setCopiedBypass(false), 2000);
  };

  const handleAddCurrency = () => {
    if (!newCurrency.code || !newCurrency.name || !newCurrency.symbol) {
      alert('Please fill currency code, name, and symbol');
      return;
    }
    const cleanCode = newCurrency.code.trim().toUpperCase();
    const updated = [
      ...localization.currencies.filter((c) => c.code !== cleanCode),
      { ...newCurrency, code: cleanCode, rate: Number(newCurrency.rate) || 1 },
    ];
    setLocalization({ ...localization, currencies: updated });
    setShowAddCurrencyModal(false);
    setNewCurrency({
      code: '',
      name: '',
      symbol: '',
      flag: '🌐',
      rate: 1.0,
      decimals: 2,
      position: 'before',
      isActive: true,
    });
  };

  const toggleCurrencyActive = (code) => {
    if (code === localization.baseCurrency) return; // cannot disable base
    setLocalization({
      ...localization,
      currencies: localization.currencies.map((c) =>
        c.code === code ? { ...c, isActive: !c.isActive } : c
      ),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Site Maintenance, Multi-Currency & Global Settings
                <span className="text-xs bg-amber-400/10 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-400/20">
                  Point #6 (28 Master Features)
                </span>
              </h2>
              <p className="text-sm text-slate-400">
                1-Click maintenance lock, branding logo/favicon studio, copyright editor & live auto-exchange multi-currency switcher.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={fetchSettings}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition w-full md:w-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reload
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button onClick={() => setSaveSuccessMessage('')} className="text-xs text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {saveErrorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{saveErrorMessage}</span>
          </div>
          <button onClick={() => setSaveErrorMessage('')} className="text-xs text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'maintenance'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Site Maintenance Mode</span>
          {maintenance.enabled && (
            <span className="w-2 h-2 rounded-full bg-rose-300 animate-ping"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'branding'
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Logo, Favicon & Branding</span>
        </button>

        <button
          onClick={() => setActiveTab('currency')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'currency'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Multi-Currency & Forex ({localization.currencies.length})</span>
        </button>
      </div>

      {/* ================= TAB 1: SITE MAINTENANCE MODE ================= */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6 animate-fade-in">
          {/* Status Alert Banner */}
          <div
            className={`p-6 rounded-3xl border shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition ${
              maintenance.enabled
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-200 shadow-rose-950/20'
                : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200 shadow-emerald-950/20'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-2xl border ${
                  maintenance.enabled
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                }`}
              >
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black tracking-tight">
                    {maintenance.enabled ? 'Site is LOCKED in Maintenance Mode' : 'Storefront is LIVE & Operational'}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      maintenance.enabled ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-slate-950'
                    }`}
                  >
                    {maintenance.enabled ? 'LOCKED' : 'ONLINE'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {maintenance.enabled
                    ? 'Customers browsing the store are shown the scheduled maintenance screen. Admins can bypass with the secret key below.'
                    : 'Normal customer checkouts, browsing, order creation, and vendor actions are running without restrictions.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggleMaintenance()}
              disabled={isSaving}
              className={`px-6 py-2.5 rounded-2xl text-xs font-black transition shadow-lg whitespace-nowrap ${
                maintenance.enabled
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
              }`}
            >
              {maintenance.enabled ? '🔓 Take Site Back LIVE' : '🔒 Enable Maintenance Mode'}
            </button>
          </div>

          {/* Maintenance Configuration Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h4 className="font-bold text-white text-base flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sliders className="w-5 h-5 text-rose-400" />
              <span>Maintenance Screen Content & Bypass Controls</span>
            </h4>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Maintenance Title (Displayed to Visitors)
                  </label>
                  <input
                    type="text"
                    value={maintenance.title}
                    onChange={(e) => setMaintenance({ ...maintenance, title: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Expected Online Completion (ETA)
                  </label>
                  <input
                    type="datetime-local"
                    value={maintenance.expectedEndTime ? maintenance.expectedEndTime.substring(0, 16) : ''}
                    onChange={(e) => setMaintenance({ ...maintenance, expectedEndTime: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Maintenance Message / Notice
                </label>
                <textarea
                  rows={3}
                  value={maintenance.message}
                  onChange={(e) => setMaintenance({ ...maintenance, message: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-400 leading-relaxed"
                />
              </div>

              {/* Secret Admin Bypass Key */}
              <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700 space-y-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>🔑 Secret Admin Bypass Key</span>
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Admins can append <code className="text-amber-400">?bypass={maintenance.secretBypassKey}</code> to any URL to access the platform while under maintenance.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={maintenance.secretBypassKey}
                      onChange={(e) => setMaintenance({ ...maintenance, secretBypassKey: e.target.value })}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-amber-400 font-mono w-56"
                    />
                    <button
                      type="button"
                      onClick={handleCopyBypassKey}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedBypass ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleToggleMaintenance(maintenance.enabled)}
                disabled={isSaving}
                className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/20 transition"
              >
                {isSaving ? 'Updating...' : 'Save Maintenance Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: LOGO, FAVICON & BRANDING ================= */}
      {activeTab === 'branding' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Palette className="w-5 h-5 text-amber-400" />
                  <span>Marketplace Visual Identity & Branding Studio</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Configure store name, slogans, logo, browser favicon, and copyright footer notices.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveBranding}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-400/20 transition"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Branding'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form Controls */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Storefront Name
                    </label>
                    <input
                      type="text"
                      value={branding.storeName}
                      onChange={(e) => setBranding({ ...branding, storeName: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Brand Tagline / Slogan
                    </label>
                    <input
                      type="text"
                      value={branding.tagline}
                      onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Header Logo Image URL
                  </label>
                  <input
                    type="text"
                    value={branding.logoUrl}
                    onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Browser Favicon URL (.ico or .png)
                  </label>
                  <input
                    type="text"
                    value={branding.faviconUrl}
                    onChange={(e) => setBranding({ ...branding, faviconUrl: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Copyright Notice (Footer)
                  </label>
                  <textarea
                    rows={2}
                    value={branding.copyrightText}
                    onChange={(e) => setBranding({ ...branding, copyrightText: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400 leading-relaxed"
                  />
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>Live Storefront Branding Preview</span>
                </h4>

                {/* Header Mockup */}
                <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 space-y-3">
                  <span className="text-[10px] text-slate-500 uppercase block">Header Navigation Preview</span>
                  <div className="flex items-center gap-3">
                    <img
                      src={branding.logoUrl}
                      alt="Logo Preview"
                      className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow"
                      onError={(e) => (e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&h=200&fit=crop')}
                    />
                    <div>
                      <h5 className="font-bold text-white text-base">{branding.storeName}</h5>
                      <p className="text-[11px] text-slate-400">{branding.tagline}</p>
                    </div>
                  </div>
                </div>

                {/* Browser Tab Mockup */}
                <div className="bg-slate-900 rounded-xl p-3 border border-slate-700 space-y-2">
                  <span className="text-[10px] text-slate-500 uppercase block">Browser Tab Mockup</span>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 text-xs text-slate-200">
                    <img
                      src={branding.faviconUrl}
                      alt="Favicon"
                      className="w-4 h-4 object-contain"
                      onError={(e) => (e.target.src = '/favicon.ico')}
                    />
                    <span className="truncate max-w-xs">{branding.storeName} — {branding.tagline}</span>
                  </div>
                </div>

                {/* Footer Mockup */}
                <div className="bg-slate-900 rounded-xl p-3 border border-slate-700">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Footer Copyright Preview</span>
                  <p className="text-xs text-slate-400 leading-relaxed font-mono">{branding.copyrightText}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: MULTI-CURRENCY & LIVE RATES ================= */}
      {activeTab === 'currency' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-400" />
                  <span>Multi-Currency & Automated Exchange Rates</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Base currency: <strong className="text-white">{localization.baseCurrency}</strong>. Customers can dynamically switch currencies on storefront header.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSyncExchangeRates}
                  disabled={isSyncingRates}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/20 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRates ? 'animate-spin' : ''}`} />
                  <span>{isSyncingRates ? 'Syncing Rates...' : 'Sync Live Exchange Rates'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddCurrencyModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Currency</span>
                </button>
              </div>
            </div>

            {/* Currencies Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Currency</th>
                    <th className="py-3 px-3">Symbol</th>
                    <th className="py-3 px-3">Exchange Rate (1 {localization.baseCurrency} =)</th>
                    <th className="py-3 px-3 text-center">Decimals</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {localization.currencies.map((curr) => (
                    <tr key={curr.code} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{curr.flag || '🌐'}</span>
                          <div>
                            <span className="font-bold text-white font-mono">{curr.code}</span>
                            <span className="text-[11px] text-slate-400 block">{curr.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-amber-400 text-sm">
                        {curr.symbol}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-200">
                        {curr.code === localization.baseCurrency ? (
                          <span className="text-emerald-400 font-bold">1.0 (BASE CURRENCY)</span>
                        ) : (
                          <input
                            type="number"
                            step="0.0001"
                            value={curr.rate}
                            onChange={(e) => {
                              const r = parseFloat(e.target.value);
                              setLocalization({
                                ...localization,
                                currencies: localization.currencies.map((c) =>
                                  c.code === curr.code ? { ...c, rate: r } : c
                                ),
                              });
                            }}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono w-28"
                          />
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-300">{curr.decimals}</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleCurrencyActive(curr.code)}
                          disabled={curr.code === localization.baseCurrency}
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold transition ${
                            curr.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                        >
                          {curr.isActive ? 'ACTIVE' : 'DISABLED'}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {curr.code !== localization.baseCurrency && (
                          <button
                            type="button"
                            onClick={() =>
                              setLocalization({
                                ...localization,
                                currencies: localization.currencies.filter((c) => c.code !== curr.code),
                              })
                            }
                            className="p-1 text-slate-500 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSaveCurrencies}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 transition"
              >
                {isSaving ? 'Saving...' : 'Save Currencies Configuration'}
              </button>
            </div>
          </div>

          {/* Add Currency Modal */}
          {showAddCurrencyModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4 text-blue-400" />
                    <span>Add New Currency</span>
                  </h4>
                  <button onClick={() => setShowAddCurrencyModal(false)} className="text-slate-400 hover:text-white">
                    ×
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Currency Code (3 Letters)</label>
                    <input
                      type="text"
                      maxLength={3}
                      placeholder="e.g. CAD, AUD, SGD"
                      value={newCurrency.code}
                      onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Currency Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Canadian Dollar"
                      value={newCurrency.name}
                      onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Symbol</label>
                      <input
                        type="text"
                        placeholder="e.g. CA$"
                        value={newCurrency.symbol}
                        onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Rate (vs Base)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={newCurrency.rate}
                        onChange={(e) => setNewCurrency({ ...newCurrency, rate: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddCurrencyModal(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCurrency}
                    className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                  >
                    Add Currency
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
