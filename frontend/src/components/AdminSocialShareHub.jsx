import React, { useState, useEffect } from 'react';
import {
  Share2,
  Globe,
  Twitter,
  Facebook,
  MessageCircle,
  Sparkles,
  Save,
  RotateCcw,
  Check,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  ShieldCheck,
  Code2,
  ExternalLink,
} from 'lucide-react';
import api from '../api/client';

export default function AdminSocialShareHub() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Configuration State
  const [config, setConfig] = useState(null);

  // Debugger / Sandbox State
  const [testTitle, setTestTitle] = useState('Sony WH-1000XM5 Noise Cancelling Headphones');
  const [testPrice, setTestPrice] = useState(26990);
  const [previewResult, setPreviewResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await api.get('/share/admin/config');
      if (res.data?.success) {
        setConfig(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load social share configuration:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    setSaveSuccess(false);
    try {
      const res = await api.put('/share/admin/config', config);
      if (res.data?.success) {
        setConfig(res.data.data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Failed to save social share configuration:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  const runTestPreview = async () => {
    setTesting(true);
    try {
      const res = await api.post('/share/admin/test-url', {
        customTitle: testTitle,
        customPrice: testPrice,
      });
      if (res.data?.success) {
        setPreviewResult(res.data.testResult);
      }
    } catch (err) {
      console.error('Testing failed:', err);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-400">Loading OpenGraph & Social Sharing Studio...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6 bg-red-950/40 border border-red-500/50 rounded-2xl text-red-200">
        Failed to load OpenGraph configuration. Please verify backend connectivity.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-tight">
                Dynamic OpenGraph & Social Preview Studio
              </h2>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-500/40">
                Point #18
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Automated 1200x630 social preview cards, Twitter Cards, Schema.org JSON-LD microdata, and viral WhatsApp share templates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchConfig}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4 text-emerald-950" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving...' : saveSuccess ? 'Saved & Audited!' : 'Save & Publish Rules'}</span>
          </button>
        </div>
      </div>

      {/* ALERT BANNERS */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>OpenGraph & Social Sharing settings updated and recorded in the immutable Audit Trail.</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/50 text-red-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI METRICS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Site Identity</span>
            <Globe className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-white truncate">
            {config.siteName || 'AuraMarket'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Appears in og:site_name on all pages</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Twitter / X Creator</span>
            <Twitter className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-black text-white">
            {config.twitterHandle || '@AuraMarket'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Summary Large Image Card author</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Dynamic Card Engine</span>
            <Sparkles className="w-4 h-4 text-emerald-400 fill-current" />
          </div>
          <div className="text-xl font-black text-emerald-400">
            {config.enableDynamicCards ? 'ACTIVE (1200x630)' : 'PAUSED'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Real-time SVG vector rendering</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Referral Tracking Tag</span>
            <Sliders className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-black text-white font-mono text-sm">
            {config.referralTrackingParam || 'ref=share_social'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Appended to shared canonical shortlinks</p>
        </div>
      </div>

      {/* MASTER OPENGRAPH & TWITTER METADATA SETTINGS */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-md space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sliders className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-black text-white">Global OpenGraph & Metadata Rules</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Site Name */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 block">
              Marketplace Site Name (og:site_name)
            </span>
            <input
              type="text"
              value={config.siteName || ''}
              onChange={(e) => setConfig({ ...config, siteName: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 text-xs font-bold text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Twitter Handle */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 block">
              Twitter / X Handle (twitter:site)
            </span>
            <input
              type="text"
              value={config.twitterHandle || ''}
              onChange={(e) => setConfig({ ...config, twitterHandle: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Facebook App ID */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 block">
              Facebook App ID (fb:app_id)
            </span>
            <input
              type="text"
              placeholder="e.g. 123456789012345"
              value={config.facebookAppId || ''}
              onChange={(e) => setConfig({ ...config, facebookAppId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Default Title */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-1.5 sm:col-span-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 block">
              Default Fallback Title (og:title)
            </span>
            <input
              type="text"
              value={config.defaultTitle || ''}
              onChange={(e) => setConfig({ ...config, defaultTitle: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 text-xs font-medium text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Referral Tracking Tag */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 block">
              Viral Referral Query Param
            </span>
            <input
              type="text"
              value={config.referralTrackingParam || ''}
              onChange={(e) => setConfig({ ...config, referralTrackingParam: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Default Description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-300">
            Default Fallback Meta Description (og:description):
          </label>
          <textarea
            rows={2}
            value={config.defaultDescription || ''}
            onChange={(e) => setConfig({ ...config, defaultDescription: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 text-xs font-medium text-white rounded-xl p-3 focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Dynamic Vector Card Engine Settings */}
        <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 fill-current" />
                Dynamic 1200x630 Vector Social Card Engine
              </h4>
              <p className="text-xs text-slate-400">
                Dynamically renders price tags, discount pills, rating stars and genuine guarantee badges on SVG cards
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableDynamicCards}
                onChange={(e) => setConfig({ ...config, enableDynamicCards: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-300">Brand Tagline on Card:</span>
              <input
                type="text"
                value={config.brandTagline || ''}
                onChange={(e) => setConfig({ ...config, brandTagline: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-300">Accent Glow Color:</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.cardThemeColor || '#f59e0b'}
                  onChange={(e) => setConfig({ ...config, cardThemeColor: e.target.value })}
                  className="w-9 h-8 bg-transparent rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={config.cardThemeColor || '#f59e0b'}
                  onChange={(e) => setConfig({ ...config, cardThemeColor: e.target.value })}
                  className="w-28 bg-slate-900 border border-slate-700 text-xs font-mono text-white rounded-xl px-2.5 py-1.5"
                />
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Viral Message Template */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp Pre-Filled Sharing Copy Template:</span>
            </label>
            <span className="text-[10px] text-amber-400 font-bold">
              Macros: %productTitle%, %price%, %discount%, %rating%, %shareUrl%
            </span>
          </div>
          <textarea
            rows={3}
            value={config.whatsappMessageTemplate || ''}
            onChange={(e) => setConfig({ ...config, whatsappMessageTemplate: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* LIVE INTERACTIVE OPENGRAPH DEBUGGER SANDBOX */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-md space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-white">Live OpenGraph Card & Tag Tester</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Test any sample product title and price to verify generated OpenGraph meta tags
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <span className="text-[11px] font-bold text-slate-400">Sample Product Title:</span>
            <input
              type="text"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400">Sample Price (₹):</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={testPrice}
                onChange={(e) => setTestPrice(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
              />
              <button
                type="button"
                onClick={runTestPreview}
                disabled={testing}
                className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md active:scale-95 transition-all flex-shrink-0"
              >
                {testing ? 'Testing...' : 'Test Card ⚡'}
              </button>
            </div>
          </div>
        </div>

        {previewResult && (
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 animate-in fade-in">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
              Generated OpenGraph Meta Tags Preview:
            </span>
            <div className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-slate-300 space-y-1 border border-slate-800">
              <p><strong className="text-amber-400">&lt;meta property="og:title"</strong> content="{previewResult.metaTagsPreview?.['og:title']}" /&gt;</p>
              <p><strong className="text-amber-400">&lt;meta property="og:image"</strong> content="{previewResult.metaTagsPreview?.['og:image']}" /&gt;</p>
              <p><strong className="text-amber-400">&lt;meta name="twitter:card"</strong> content="{previewResult.metaTagsPreview?.['twitter:card']}" /&gt;</p>
              <p><strong className="text-amber-400">&lt;meta name="twitter:title"</strong> content="{previewResult.metaTagsPreview?.['twitter:title']}" /&gt;</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
