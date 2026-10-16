import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Wand2,
  FileText,
  Search,
  Tag,
  HelpCircle,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  Globe,
  Percent,
  ShieldCheck,
  Layers,
  Send,
  Eye,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Zap,
  BookmarkPlus,
  Save,
} from 'lucide-react';
import api from '../api/client';

const DEFAULT_BENCHMARKS = [
  {
    title: 'AuraSound Apex Wireless ANC Headphones',
    category: 'Electronics',
    subCategory: 'Audio & Headphones',
    tone: 'technical',
    targetAudience: 'Tech Enthusiasts & Gamers',
    notes: '40mm titanium drivers, 40-hour battery, active noise cancellation, fast type-c charging, multipoint Bluetooth 5.4',
    brand: 'AuraSound',
  },
  {
    title: 'Obsidian Heavyweight French Terry Hoodie',
    category: 'Fashion',
    subCategory: 'Streetwear & Hoodies',
    tone: 'luxury',
    targetAudience: 'Gen-Z & Trendy Youth',
    notes: '450 GSM organic cotton, boxy drop shoulder cut, brushed fleece interior, double-layered hood',
    brand: 'Obsidian Studio',
  },
  {
    title: 'Titanium Edge S9 Ultra AMOLED Smartwatch',
    category: 'Watches',
    subCategory: 'Smartwatches & Wearables',
    tone: 'minimalist',
    targetAudience: 'Working Professionals & Corporate',
    notes: '1.96-inch always-on display, sapphire crystal glass, ECG sensor, GPS route tracking, 7-day battery life',
    brand: 'Edge Precision',
  },
  {
    title: 'Artisan Ceramic Pour-Over Coffee Dripper & Mug Set',
    category: 'Home & Kitchen',
    subCategory: 'Tableware & Coffee Essentials',
    tone: 'playful',
    targetAudience: 'Home Makers & Families',
    notes: 'Matte glaze ceramic, ribbed heat-retention walls, 400ml matching mug, natural cork heat pad',
    brand: 'Terra Artisan',
  },
];

const TONES = [
  { id: 'persuasive', label: 'Persuasive', desc: 'Direct, benefit-focused & high conversion rate', icon: '🎯' },
  { id: 'luxury', label: 'Luxury & Artisan', desc: 'Prestige, craftsmanship & elevated vocabulary', icon: '💎' },
  { id: 'technical', label: 'Technical & Engineering', desc: 'Architectural precision, hardware specs & metrics', icon: '⚙️' },
  { id: 'minimalist', label: 'Minimalist & Modern', desc: 'Understated, clutter-free & essentialist', icon: '🌿' },
  { id: 'playful', label: 'Playful & Energetic', desc: 'Upbeat vibes, vibrant excitement & emojis', icon: '🎉' },
];

export default function AiSmartProductListingStudio() {
  const [form, setForm] = useState({
    title: 'AcousticPro ANC Wireless Headphones',
    prompt: '40mm titanium drivers, 60-hour battery life, active hybrid noise cancelling, ultra low latency gaming mode',
    category: 'Electronics',
    subCategory: 'Audio & Acoustics',
    tone: 'persuasive',
    targetAudience: 'Working Professionals & Gamers',
    language: 'en',
    brand: 'AuraSound Acoustic',
  });

  const [existingProducts, setExistingProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [output, setOutput] = useState(null);
  const [activeOutputTab, setActiveOutputTab] = useState('copy'); // copy, seo, hsn, faqs
  const [copiedKey, setCopiedKey] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  const [serpViewMode, setSerpViewMode] = useState('desktop'); // desktop, mobile

  useEffect(() => {
    fetchExistingProducts();
  }, []);

  const fetchExistingProducts = async () => {
    try {
      const res = await api.get('/products?limit=30');
      if (res.data?.products) {
        setExistingProducts(res.data.products);
      }
    } catch (_) {}
  };

  const handleApplyBenchmark = (bm) => {
    setForm({
      title: bm.title,
      prompt: bm.notes,
      category: bm.category,
      subCategory: bm.subCategory,
      tone: bm.tone,
      targetAudience: bm.targetAudience,
      language: 'en',
      brand: bm.brand,
    });
    setSelectedProductId('');
    setStatusMessage({ type: 'info', text: `Loaded benchmark preset: "${bm.title}"` });
  };

  const handleSelectExistingProduct = (e) => {
    const prodId = e.target.value;
    setSelectedProductId(prodId);
    if (!prodId) return;

    const matched = existingProducts.find((p) => p._id === prodId);
    if (matched) {
      setForm((prev) => ({
        ...prev,
        title: matched.title,
        prompt: matched.description || prev.prompt,
        category: matched.categoryLabel || matched.category?.name || 'Electronics',
        brand: matched.brand || prev.brand,
      }));
      setStatusMessage({ type: 'info', text: `Loaded product "${matched.title}" from catalog.` });
    }
  };

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!form.title && !form.prompt) {
      setStatusMessage({ type: 'error', text: 'Please enter a product title or key features.' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await api.post('/ai-product/generate', {
        title: form.title,
        prompt: form.prompt,
        category: form.category,
        subCategory: form.subCategory,
        tone: form.tone,
        targetAudience: form.targetAudience,
        language: form.language,
        brand: form.brand,
      });

      if (res.data?.success) {
        setOutput(res.data.data);
        setStatusMessage({
          type: 'success',
          text: `✨ Smart Listing generated successfully! (${res.data.data.isAiModelGenerated ? 'Powered by Google Gemini' : 'Deterministic Conversion Engine'})`,
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to generate smart product listing.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToCatalog = async () => {
    if (!selectedProductId) {
      setStatusMessage({
        type: 'error',
        text: 'Select an existing catalog product from the dropdown above to save and apply.',
      });
      return;
    }

    setApplying(true);
    try {
      const res = await api.post(`/ai-product/optimize-existing/${selectedProductId}`, {
        tone: form.tone,
        targetAudience: form.targetAudience,
        language: form.language,
        applyToDatabase: true,
      });

      if (res.data?.success) {
        setStatusMessage({
          type: 'success',
          text: `🎉 Successfully updated product in database with AI description, SEO title & HSN code!`,
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to apply changes to catalog.',
      });
    } finally {
      setApplying(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                Point #24 • AI Commercial Copywriting
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Google Gemini 1.5 Flash + SERP Engine
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              AI Smart Product Listing & SEO Generator
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Transform product names into high-converting storefront copy, 3 A/B title variations, Google SERP meta tags, statutory HSN codes, and sales FAQs with 1 click.
            </p>
          </div>

          {/* Quick Preset Benchmark Pills */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              1-Click Benchmark Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_BENCHMARKS.map((bm, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyBenchmark(bm)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800/80 hover:bg-indigo-600/40 text-slate-200 border border-slate-700 hover:border-indigo-400/50 transition-all flex items-center gap-1.5"
                >
                  <span>{bm.category === 'Electronics' ? '🎧' : bm.category === 'Fashion' ? '🧥' : bm.category === 'Watches' ? '⌚' : '☕'}</span>
                  <span>{bm.title.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status Feedback Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : statusMessage.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Main Studio Grid: Left Form, Right Generated Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Parameters (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <h2 className="font-bold text-white text-base">Listing Parameters</h2>
            </div>
            {existingProducts.length > 0 && (
              <span className="text-xs text-slate-400">
                {existingProducts.length} Catalog Products Loaded
              </span>
            )}
          </div>

          {/* Quick Select from Existing Catalog */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Optimize Existing Catalog Product (Optional)
            </label>
            <select
              value={selectedProductId}
              onChange={handleSelectExistingProduct}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Or enter product details manually below --</option>
              {existingProducts.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title} ({p.sku}) — ₹{p.sellingPrice}
                </option>
              ))}
            </select>
          </div>

          {/* Product Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Product Title / Model Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. AcousticPro ANC Wireless Headphones"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Raw Features / Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Key Features / Raw Specifications / Notes
            </label>
            <textarea
              rows={3}
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              placeholder="e.g. 40mm titanium drivers, 60h battery, active hybrid noise cancelling, gaming low latency mode"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category & Sub-Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="Electronics">Electronics</option>
                <option value="Audio">Audio & Acoustics</option>
                <option value="Computers">Computers & Tech</option>
                <option value="Mobile">Mobile & Tablets</option>
                <option value="Watches">Watches & Wearables</option>
                <option value="Fashion">Fashion & Apparel</option>
                <option value="Footwear">Footwear</option>
                <option value="Home & Kitchen">Home & Kitchen</option>
                <option value="Beauty">Beauty & Personal Care</option>
                <option value="Jewelry">Jewelry & Accessories</option>
                <option value="Sports">Sports & Fitness</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Brand Name</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="e.g. AuraSound"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Tone Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Copywriting Tone & Persona
            </label>
            <div className="grid grid-cols-1 gap-2">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setForm({ ...form, tone: t.id })}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                    form.tone === t.id
                      ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-lg leading-none mt-0.5">{t.icon}</span>
                  <div>
                    <div className="font-bold text-xs">{t.label}</div>
                    <div className="text-[11px] text-slate-400">{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Target Audience & Language */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Target Audience
              </label>
              <input
                type="text"
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                placeholder="e.g. Tech Enthusiasts"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Language</label>
              <select
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="en">English (Global)</option>
                <option value="hi">Hinglish / Hindi (India)</option>
              </select>
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGenerate}
            className="w-full py-3 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Generating High-Converting Copy...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 text-white" />
                <span>Generate Smart Listing & SEO Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Right Output: Interactive Results & Preview (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            {/* Output Nav Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveOutputTab('copy')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    activeOutputTab === 'copy'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Product Copy</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOutputTab('seo')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    activeOutputTab === 'seo'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Google SERP & SEO</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOutputTab('hsn')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    activeOutputTab === 'hsn'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>HSN & GST Slab</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOutputTab('faqs')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    activeOutputTab === 'faqs'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Customer FAQs</span>
                </button>
              </div>

              {output && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(JSON.stringify(output, null, 2), 'all_json')}
                  className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1"
                >
                  {copiedKey === 'all_json' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedKey === 'all_json' ? 'Copied' : 'JSON'}</span>
                </button>
              )}
            </div>

            {/* If no output yet, display placeholder instructions */}
            {!output && !loading && (
              <div className="py-16 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Ready to craft high-converting product listings
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Select a benchmark preset from the top banner or enter your own product specifications on the left, then click <strong>"Generate Smart Listing"</strong> to preview output.
                </p>
              </div>
            )}

            {/* Loading state skeleton */}
            {loading && (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-10 h-10 mx-auto text-indigo-400 animate-spin" />
                <h3 className="text-sm font-bold text-white animate-pulse">
                  Analyzing market benchmarks, generating title variations & Google SERP preview...
                </h3>
              </div>
            )}

            {/* TAB 1: Product Copy */}
            {output && !loading && activeOutputTab === 'copy' && (
              <div className="space-y-4">
                {/* 3 Title Variations */}
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      3 High-CTR Title Variations (A/B Testing)
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {(output.titleVariations || [output.seoTitle]).map((t, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700 flex items-center justify-between text-xs text-slate-200"
                      >
                        <span className="font-medium">
                          <strong className="text-indigo-400 mr-2">V{idx + 1}:</strong> {t}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(t, `title_${idx}`)}
                          className="p-1 hover:text-white text-slate-400"
                          title="Copy title"
                        >
                          {copiedKey === `title_${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Short Storefront Punchline */}
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Storefront Short Summary
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(output.shortSummary, 'summary')}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'summary' ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copy</span>
                    </button>
                  </div>
                  <p className="text-xs text-indigo-200 font-medium leading-relaxed bg-slate-900/80 p-2.5 rounded-lg border border-slate-700">
                    "{output.shortSummary}"
                  </p>
                </div>

                {/* 5-6 Bullet Points */}
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 space-y-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Feature Bullet Points (High-Conversion Selling Points)
                  </span>
                  <div className="space-y-1.5">
                    {(output.bulletPoints || []).map((b, i) => (
                      <div
                        key={i}
                        className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-700/60 flex items-start gap-2"
                      >
                        <span className="text-indigo-400 font-bold shrink-0">{i + 1}.</span>
                        <div dangerouslySetInnerHTML={{ __html: b.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Marketing Badges */}
                {output.marketingBadges && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {output.marketingBadges.map((badge, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Google SERP & SEO Preview */}
            {output && !loading && activeOutputTab === 'seo' && (
              <div className="space-y-4">
                {/* Device preview switcher */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Interactive Google SERP Card Preview
                  </span>
                  <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setSerpViewMode('desktop')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        serpViewMode === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setSerpViewMode('mobile')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        serpViewMode === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Mobile
                    </button>
                  </div>
                </div>

                {/* Google SERP Simulated Card */}
                <div
                  className={`bg-white text-slate-900 rounded-xl p-4 shadow-md border border-slate-200 font-sans transition-all ${
                    serpViewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center text-[10px] font-black">
                      A
                    </div>
                    <div>
                      <div className="text-[12px] text-slate-800 leading-tight font-medium">AuraMarket</div>
                      <div className="text-[11px] text-slate-500 leading-tight truncate">
                        {output.seoMeta?.serpPreview?.displayUrl || 'shribalajikripadham.online › ecommerce-demo'}
                      </div>
                    </div>
                  </div>
                  <h4 className="text-[#1a0dab] hover:underline cursor-pointer text-base sm:text-lg font-normal leading-snug line-clamp-2 mt-1">
                    {output.seoMeta?.metaTitle || output.seoTitle}
                  </h4>
                  <div className="text-[#006621] text-xs font-semibold mt-0.5">
                    {output.seoMeta?.serpPreview?.rating || '4.8 ★★★★★ (142 reviews)'}
                  </div>
                  <p className="text-[#4d5156] text-xs leading-relaxed mt-1 line-clamp-2">
                    {output.seoMeta?.metaDescription || output.shortSummary}
                  </p>
                </div>

                {/* Meta Tags Details & Counters */}
                <div className="space-y-3 pt-2">
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">
                        Meta Title ({output.seoMeta?.metaTitle?.length || 0} / 60 chars)
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(output.seoMeta?.metaTitle, 'meta_title')}
                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        {copiedKey === 'meta_title' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <div className="text-xs text-white bg-slate-900/80 p-2 rounded border border-slate-700">
                      {output.seoMeta?.metaTitle}
                    </div>
                  </div>

                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">
                        Meta Description ({output.seoMeta?.metaDescription?.length || 0} / 155 chars)
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(output.seoMeta?.metaDescription, 'meta_desc')}
                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        {copiedKey === 'meta_desc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <div className="text-xs text-white bg-slate-900/80 p-2 rounded border border-slate-700">
                      {output.seoMeta?.metaDescription}
                    </div>
                  </div>

                  {/* Search Tags Chips */}
                  {output.seoMeta?.searchTags && (
                    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 space-y-2">
                      <span className="text-xs font-bold text-slate-300">
                        Target Keyword Tags ({output.seoMeta.searchTags.length} generated)
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {output.seoMeta.searchTags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md text-[11px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: HSN & GST Tax Slab */}
            {output && !loading && activeOutputTab === 'hsn' && (
              <div className="space-y-4">
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Tag className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Statutory Tax Harmonized System
                      </span>
                      <h3 className="text-lg font-black text-white">
                        HSN Code: <span className="text-amber-400 font-mono">{output.suggestedHsnCode}</span>
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-900/80 border border-slate-700 p-3 rounded-xl">
                      <span className="text-[11px] text-slate-400 block mb-0.5">Statutory GST Slab</span>
                      <span className="text-xl font-black text-emerald-400">{output.suggestedGstRate}% GST</span>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-700 p-3 rounded-xl">
                      <span className="text-[11px] text-slate-400 block mb-0.5">Matched Category</span>
                      <span className="text-sm font-bold text-slate-200">{output.suggestedCategory}</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-700 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 block mb-1">Official Tariff Classification</span>
                    <p className="text-xs text-slate-300 leading-relaxed font-mono">
                      {output.hsnDescription}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Customer FAQs */}
            {output && !loading && activeOutputTab === 'faqs' && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Pre-Populated Product Storefront FAQs ({output.faqs?.length || 0})
                </span>
                {(output.faqs || []).map((faq, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 space-y-1.5"
                  >
                    <div className="text-xs font-bold text-indigo-300 flex items-start gap-2">
                      <span className="text-indigo-400 font-black">Q{idx + 1}:</span>
                      <span>{faq.question}</span>
                    </div>
                    <p className="text-xs text-slate-300 pl-5 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Bar at bottom */}
          {output && (
            <div className="pt-4 mt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Tone: <strong className="text-slate-200 capitalize">{output.toneUsed}</strong> • Lang:{' '}
                <strong className="text-slate-200 uppercase">{output.languageUsed}</strong>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {selectedProductId && (
                  <button
                    type="button"
                    disabled={applying}
                    onClick={handleApplyToCatalog}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 shadow-md transition-all disabled:opacity-50"
                  >
                    {applying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Apply to Database Product</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => copyToClipboard(output.detailedDescription, 'markdown')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
                >
                  {copiedKey === 'markdown' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Markdown</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
