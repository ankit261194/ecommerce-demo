import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Check,
  Copy,
  Wand2,
  Search,
  Globe,
  Tag,
  FileText,
  Percent,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import axios from 'axios';

export default function AiProductCopyModal({
  isOpen,
  onClose,
  initialTitle = '',
  initialCategory = 'Electronics',
  onApply,
}) {
  const [prompt, setPrompt] = useState(initialTitle || '');
  const [category, setCategory] = useState(initialCategory || 'Electronics');
  const [tone, setTone] = useState('persuasive'); // 'persuasive' | 'luxury' | 'technical' | 'casual' | 'festive'
  const [targetAudience, setTargetAudience] = useState('General Consumers');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [copiedField, setCopiedField] = useState(null);

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        '/api/vendor/ai-generator/product-copy',
        {
          prompt: prompt.trim(),
          title: prompt.trim(),
          category,
          tone,
          targetAudience,
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.success && res.data.data) {
        setResult(res.data.data);
        setSelectedTitle(res.data.data.titles?.[0] || prompt);
      }
    } catch (err) {
      console.error('Failed to generate AI product copy:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleApplyToForm = () => {
    if (!result) return;
    if (onApply) {
      onApply({
        title: selectedTitle || result.titles?.[0] || prompt,
        description: result.description || '',
        bullets: result.bullets || [],
        metaTitle: result.seoMeta?.metaTitle || selectedTitle,
        metaDescription: result.seoMeta?.metaDescription || '',
        searchTags: result.seoMeta?.searchTags || [],
        hsnCode: result.suggestedHsnCode || '85183000',
        gstRate: result.suggestedGstRate || 18,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white flex items-center justify-between border-b border-indigo-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center font-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white tracking-tight">
                  AI Product Copywriter & SEO Assistant
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950">
                  Point #76
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/30 text-purple-200 border border-purple-400/30">
                  Gemini GenAI
                </span>
              </div>
              <p className="text-xs text-purple-200">
                Generate high-converting titles, bullet points, SEO meta tags & HSN codes in seconds
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Input Control Deck */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
                Product Keywords or Rough Concept
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Wireless Noise Cancelling Over-Ear Headphones with 40H Battery and Bass Boost"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Writing Copy...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>Generate Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Parameter Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Target Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                >
                  <option value="Electronics">Electronics & Audio</option>
                  <option value="Computers">Computers & Accessories</option>
                  <option value="Fashion">Fashion & Apparel</option>
                  <option value="Footwear">Footwear & Shoes</option>
                  <option value="Home">Home & Furniture</option>
                  <option value="Kitchen">Kitchen Appliances</option>
                  <option value="Beauty">Health & Beauty</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Tone of Voice</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                >
                  <option value="persuasive">Persuasive (High Conversion)</option>
                  <option value="luxury">Luxury & Premium</option>
                  <option value="technical">Technical & Detailed</option>
                  <option value="casual">Friendly & Casual</option>
                  <option value="festive">Festive / Holiday Special</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Target Audience</label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                >
                  <option value="General Consumers">General Consumers</option>
                  <option value="Students & Youth">Students & Youth</option>
                  <option value="Professionals & Executives">Professionals & Executives</option>
                  <option value="Gamers & Tech Enthusiasts">Gamers & Tech Enthusiasts</option>
                  <option value="Modern Families">Modern Families</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Display */}
          {result && (
            <div className="space-y-6 animate-fade-in">
              {/* 1. Catchy Titles Selector */}
              <div className="space-y-2">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  Select High-Converting Title (A/B Variations)
                </span>
                <div className="space-y-2">
                  {result.titles?.map((t, idx) => (
                    <label
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        selectedTitle === t
                          ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="ai_title"
                        checked={selectedTitle === t}
                        onChange={() => setSelectedTitle(t)}
                        className="mt-1 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-bold text-slate-900 flex-1">{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 2. Feature Bullets Preview */}
              <div className="space-y-2">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Storefront Key Feature Bullets ({result.bullets?.length || 0})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.bullets?.map((b, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
                      dangerouslySetInnerHTML={{ __html: b.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                    />
                  ))}
                </div>
              </div>

              {/* 3. Commercial Product Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    Engaging Product Description
                  </span>
                  <button
                    onClick={() => handleCopy(result.description, 'desc')}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    {copiedField === 'desc' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'desc' ? 'Copied' : 'Copy Text'}</span>
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium whitespace-pre-line leading-relaxed max-h-44 overflow-y-auto">
                  {result.description}
                </div>
              </div>

              {/* 4. Google SERP Simulator Card */}
              <div className="space-y-2">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-600" />
                  Google SERP Search Preview (SEO Optimized)
                </span>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span>https://auramarket.com</span>
                    <span>›</span>
                    <span className="text-slate-600 font-medium">{category.toLowerCase()}</span>
                    <span>›</span>
                    <span className="truncate max-w-[200px] text-slate-600">
                      {(selectedTitle || prompt).toLowerCase().replace(/\s+/g, '-')}
                    </span>
                  </div>
                  <div className="text-base font-semibold text-[#1a0dab] hover:underline cursor-pointer truncate">
                    {result.seoMeta?.metaTitle || selectedTitle}
                  </div>
                  <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {result.seoMeta?.metaDescription}
                  </div>
                  <div className="pt-2 flex items-center gap-4 text-[10px] text-slate-400 font-mono">
                    <span>
                      Title:{' '}
                      <strong className="text-emerald-700 font-bold">
                        {(result.seoMeta?.metaTitle || selectedTitle).length}/60 chars
                      </strong>
                    </span>
                    <span>
                      Meta Desc:{' '}
                      <strong className="text-emerald-700 font-bold">
                        {(result.seoMeta?.metaDescription || '').length}/160 chars
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Search Tags & HSN Compliance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[11px] font-black uppercase text-slate-600 tracking-wider block">
                    High-Ranking Search Tags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.seoMeta?.searchTags?.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[10px] font-bold"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1 text-xs">
                  <span className="text-[11px] font-black uppercase text-amber-900 tracking-wider flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-amber-700" />
                    GST Tax & HSN Recommendation
                  </span>
                  <div className="flex items-center justify-between font-bold pt-1">
                    <span className="text-slate-600">Suggested HSN Code:</span>
                    <span className="font-mono text-slate-900 font-black">{result.suggestedHsnCode}</span>
                  </div>
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-600">Standard GST Tax Rate:</span>
                    <span className="font-mono text-emerald-700 font-black">{result.suggestedGstRate}% GST</span>
                  </div>
                  <p className="text-[10px] text-slate-500 pt-0.5">{result.hsnDescription}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApplyToForm}
            disabled={!result}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-95 text-white font-black text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Apply 1-Click to Product Form</span>
          </button>
        </div>
      </div>
    </div>
  );
}
