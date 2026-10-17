import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  TrendingUp,
  Target,
  DollarSign,
  Search,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  Eye,
  MousePointerClick,
  Percent,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers,
  ChevronRight,
  ArrowUpRight,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import api from '../api/client';

export default function SponsoredAdsManagerModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('campaigns'); // 'campaigns' | 'create' | 'keywords'
  const [campaigns, setCampaigns] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Products for Campaign Creation
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // New Campaign Form
  const [formCampaignName, setFormCampaignName] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formDailyBudget, setFormDailyBudget] = useState(150);
  const [formDefaultBid, setFormDefaultBid] = useState(2.5);
  const [formPlacement, setFormPlacement] = useState('ALL');
  const [formKeywords, setFormKeywords] = useState([
    { keyword: 'online shopping', matchType: 'BROAD', bidCpc: 2.5 },
  ]);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [newKeywordMatchType, setNewKeywordMatchType] = useState('BROAD');
  const [newKeywordBid, setNewKeywordBid] = useState(2.5);

  // Keyword Suggestions Tab
  const [searchSuggestionQuery, setSearchSuggestionQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Keyword Editor Drawer for existing campaign
  const [selectedCampaignForKeywords, setSelectedCampaignForKeywords] = useState(null);
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCampaigns();
      fetchVendorProducts();
    }
  }, [isOpen]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/vendor/ads/campaigns');
      if (res.data?.success) {
        setCampaigns(res.data.data.campaigns || []);
        setSummary(res.data.data.summary || null);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError(err.response?.data?.message || 'Failed to load ad campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorProducts = async () => {
    try {
      setProductsLoading(true);
      const res = await api.get('/vendor/products');
      if (res.data?.success) {
        const prodList = res.data.data?.products || res.data.products || [];
        setProducts(prodList);
        if (prodList.length > 0 && !formProductId) {
          setFormProductId(prodList[0]._id);
          fetchKeywordSuggestionsForProduct(prodList[0]._id);
        }
      }
    } catch (err) {
      console.error('Error fetching vendor products:', err);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchKeywordSuggestionsForProduct = async (pId) => {
    try {
      const res = await api.get(`/vendor/ads/keyword-suggestions?productId=${pId}`);
      if (res.data?.success && res.data.data) {
        setSuggestions(res.data.data);
      }
    } catch (e) {}
  };

  const handleProductSelectChange = (pId) => {
    setFormProductId(pId);
    fetchKeywordSuggestionsForProduct(pId);
  };

  const handleToggleStatus = async (campaignId) => {
    try {
      const res = await api.patch(`/vendor/ads/campaigns/${campaignId}/toggle`);
      if (res.data?.success) {
        setCampaigns((prev) =>
          prev.map((c) => (c._id === campaignId ? { ...c, status: res.data.data.status } : c))
        );
        showSuccess(`Campaign status updated to ${res.data.data.status}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to archive this ad campaign?')) return;
    try {
      const res = await api.delete(`/vendor/ads/campaigns/${campaignId}`);
      if (res.data?.success) {
        setCampaigns((prev) => prev.filter((c) => c._id !== campaignId));
        showSuccess('Campaign archived successfully');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete campaign');
    }
  };

  const handleAddKeywordToForm = () => {
    if (!newKeywordInput.trim()) return;
    setFormKeywords((prev) => [
      ...prev,
      {
        keyword: newKeywordInput.trim().toLowerCase(),
        matchType: newKeywordMatchType,
        bidCpc: Number(newKeywordBid) || formDefaultBid,
      },
    ]);
    setNewKeywordInput('');
  };

  const handleRemoveKeywordFromForm = (idx) => {
    setFormKeywords((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreateCampaignSubmit = async (e) => {
    e.preventDefault();
    if (!formCampaignName.trim()) {
      setError('Please provide a campaign name.');
      return;
    }
    if (!formProductId) {
      setError('Please select a product to sponsor.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/vendor/ads/campaigns', {
        campaignName: formCampaignName.trim(),
        productId: formProductId,
        dailyBudget: Number(formDailyBudget),
        defaultBidCpc: Number(formDefaultBid),
        placement: formPlacement,
        keywords: formKeywords,
      });

      if (res.data?.success) {
        showSuccess(`Campaign '${res.data.data.campaignName}' created and launched!`);
        setFormCampaignName('');
        setActiveTab('campaigns');
        fetchCampaigns();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSuggestions = async (e) => {
    e.preventDefault();
    if (!searchSuggestionQuery.trim()) return;
    try {
      setSuggestionsLoading(true);
      const res = await api.get(`/vendor/ads/keyword-suggestions?query=${encodeURIComponent(searchSuggestionQuery)}`);
      if (res.data?.success) {
        setSuggestions(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">Seller Sponsored Ads & CPC Bidding Hub</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Point #40
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Auction Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Boost product search rankings, bid on buyer keywords, and maximize ROAS with instant CPC attribution.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Bento KPI Performance Ribbon */}
        {summary && (
          <div className="p-6 border-b border-slate-800 bg-slate-950/30 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-amber-400" /> Total Ad Spend
              </span>
              <p className="text-lg font-black text-white mt-1">₹{summary.totalSpend.toLocaleString('en-IN')}</p>
              <span className="text-[10px] text-slate-400">Cap: ₹{summary.totalDailyBudget}/day</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Eye className="w-3 h-3 text-sky-400" /> Impressions
              </span>
              <p className="text-lg font-black text-white mt-1">{summary.totalImpressions.toLocaleString('en-IN')}</p>
              <span className="text-[10px] text-slate-400">Search & Category</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <MousePointerClick className="w-3 h-3 text-indigo-400" /> Total Clicks
              </span>
              <p className="text-lg font-black text-white mt-1">{summary.totalClicks.toLocaleString('en-IN')}</p>
              <span className="text-[10px] text-slate-400">
                Avg CPC: ₹{summary.totalClicks > 0 ? (summary.totalSpend / summary.totalClicks).toFixed(2) : '0.00'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Percent className="w-3 h-3 text-teal-400" /> Click-Through Rate
              </span>
              <p className="text-lg font-black text-white mt-1">{summary.averageCtr}%</p>
              <span className="text-[10px] text-emerald-400 font-bold">Industry High</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" /> Ad Sales Revenue
              </span>
              <p className="text-lg font-black text-emerald-400 mt-1">₹{summary.totalSalesRevenue.toLocaleString('en-IN')}</p>
              <span className="text-[10px] text-slate-400">Attributed Orders</span>
            </div>

            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Portfolio ROAS
              </span>
              <p className="text-xl font-black text-amber-400 mt-1">{summary.averageRoas}x</p>
              <span className="text-[10px] text-amber-300/80 font-bold">ACOS: {summary.averageAcos}%</span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('campaigns')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'campaigns'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Active Campaigns ({campaigns.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'create'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Launch New Campaign</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('keywords')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'keywords'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Keyword Bid Planner</span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchCampaigns}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'campaigns' && (
            <div className="space-y-4">
              {campaigns.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 rounded-3xl border border-slate-800">
                  <Megaphone className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white">No Sponsored Ad Campaigns Yet</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
                    Drive up to 300% more sales by sponsoring your top products on high-intent search keywords.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Your First Campaign</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/30">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400 bg-slate-900/80">
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Campaign & Product</th>
                        <th className="py-3 px-4">Daily Budget</th>
                        <th className="py-3 px-4 text-center">Keywords</th>
                        <th className="py-3 px-4 text-right">Spend</th>
                        <th className="py-3 px-4 text-right">Clicks / Imp</th>
                        <th className="py-3 px-4 text-right">ROAS</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {campaigns.map((c) => {
                        const product = c.product || {};
                        const isActive = c.status === 'ACTIVE';
                        const spentPercent = Math.min(100, Math.round(((c.todaySpent || 0) / c.dailyBudget) * 100));

                        return (
                          <tr key={c._id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(c._id)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 transition-all ${
                                  isActive
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                                }`}
                              >
                                {isActive ? <Play className="w-2.5 h-2.5 fill-current" /> : <Pause className="w-2.5 h-2.5" />}
                                <span>{c.status}</span>
                              </button>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={product.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80'}
                                  alt={product.title || c.campaignName}
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                                />
                                <div>
                                  <p className="font-bold text-white text-sm">{c.campaignName}</p>
                                  <p className="text-[11px] text-slate-400 truncate max-w-xs">{product.title}</p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="space-y-1">
                                <span className="font-bold text-white">₹{c.dailyBudget}/day</span>
                                <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${spentPercent > 90 ? 'bg-rose-500' : 'bg-amber-400'}`}
                                    style={{ width: `${spentPercent}%` }}
                                  />
                                </div>
                                <span className="text-[9px] text-slate-400">₹{c.todaySpent || 0} spent today</span>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCampaignForKeywords(c);
                                  setIsKeywordModalOpen(true);
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold inline-flex items-center gap-1 border border-slate-700 transition-colors"
                              >
                                <Sliders className="w-3 h-3 text-amber-400" />
                                <span>{c.keywords?.length || 0} Targets</span>
                              </button>
                            </td>

                            <td className="py-3 px-4 text-right font-bold text-slate-200">
                              ₹{(c.spentAmount || 0).toLocaleString('en-IN')}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="font-bold text-white">{c.metrics?.clicks || 0} Clicks</div>
                              <div className="text-[10px] text-slate-400">
                                {c.metrics?.impressions || 0} views &bull; {c.metrics?.ctr || 0}% CTR
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="font-black text-amber-400 text-sm">
                                {c.metrics?.roas || 0}x
                              </div>
                              <div className="text-[10px] text-emerald-400">
                                ₹{(c.metrics?.salesRevenue || 0).toLocaleString('en-IN')}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteCampaign(c._id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Archive campaign"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreateCampaignSubmit} className="max-w-3xl mx-auto space-y-6">
              <div className="p-6 bg-slate-950/40 rounded-3xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span>1. Campaign Essentials & Product Target</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Campaign Name</label>
                    <input
                      type="text"
                      value={formCampaignName}
                      onChange={(e) => setFormCampaignName(e.target.value)}
                      placeholder="e.g., Wireless ANC Top Searches Q4"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:ring-1 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Target Product</label>
                    <select
                      value={formProductId}
                      onChange={(e) => handleProductSelectChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:ring-1 focus:ring-amber-400 focus:outline-none"
                    >
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.title} (₹{p.sellingPrice} | Stock: {p.stock})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Daily Budget (₹)</label>
                    <input
                      type="number"
                      min="50"
                      step="10"
                      value={formDailyBudget}
                      onChange={(e) => setFormDailyBudget(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:ring-1 focus:ring-amber-400 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400">Min: ₹50.00 / day</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Default CPC Bid (₹)</label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.1"
                      value={formDefaultBid}
                      onChange={(e) => setFormDefaultBid(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:ring-1 focus:ring-amber-400 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400">Min: ₹0.50 / click</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Placement</label>
                    <select
                      value={formPlacement}
                      onChange={(e) => setFormPlacement(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:ring-1 focus:ring-amber-400 focus:outline-none"
                    >
                      <option value="ALL">All Placements (Recommended)</option>
                      <option value="SEARCH_TOP">Top of Search Results</option>
                      <option value="PRODUCT_DETAIL">Product Detail Pages</option>
                      <option value="HOMEPAGE_FEATURED">Homepage Showcase</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Keyword Bidding Section */}
              <div className="p-6 bg-slate-950/40 rounded-3xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    <span>2. Keyword Targets & CPC Bids</span>
                  </h3>
                  <span className="text-xs text-slate-400">{formKeywords.length} Keywords Targeted</span>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <input
                    type="text"
                    value={newKeywordInput}
                    onChange={(e) => setNewKeywordInput(e.target.value)}
                    placeholder="Enter search keyword (e.g., bluetooth earbuds)"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
                  />
                  <select
                    value={newKeywordMatchType}
                    onChange={(e) => setNewKeywordMatchType(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  >
                    <option value="BROAD">Broad Match</option>
                    <option value="PHRASE">Phrase Match</option>
                    <option value="EXACT">Exact Match</option>
                  </select>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={newKeywordBid}
                    onChange={(e) => setNewKeywordBid(e.target.value)}
                    placeholder="Bid (₹)"
                    className="w-24 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeywordToForm}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shrink-0 transition-all"
                  >
                    Add Target
                  </button>
                </div>

                {/* Keyword Pills List */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {formKeywords.map((kw, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs flex items-center gap-2 font-medium"
                    >
                      <span className="text-white font-bold">{kw.keyword}</span>
                      <span className="text-[10px] text-amber-400 font-mono font-bold">₹{kw.bidCpc}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
                        {kw.matchType}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveKeywordFromForm(idx)}
                        className="text-slate-500 hover:text-rose-400 ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Quick Add Suggestions */}
                {suggestions.length > 0 && (
                  <div className="pt-3 border-t border-slate-800/80">
                    <p className="text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Recommended for this product (Click to add):</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (!formKeywords.some((k) => k.keyword === s.keyword)) {
                              setFormKeywords((prev) => [
                                ...prev,
                                { keyword: s.keyword, matchType: s.matchType, bidCpc: s.suggestedBid },
                              ]);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/40 text-[11px] text-slate-300 hover:text-amber-300 flex items-center gap-1.5 transition-all"
                        >
                          <span>+ {s.keyword}</span>
                          <span className="text-[9px] text-amber-400 font-bold font-mono">₹{s.suggestedBid}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('campaigns')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>{loading ? 'Launching Campaign...' : 'Launch Sponsored Ad Campaign'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'keywords' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="p-6 bg-slate-950/40 rounded-3xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  <span>Keyword Bid Explorer & Volume Estimator</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Inspect high-converting search keywords with estimated monthly search volumes and competitive benchmark bids.
                </p>

                <form onSubmit={handleSearchSuggestions} className="flex gap-2">
                  <input
                    type="text"
                    value={searchSuggestionQuery}
                    onChange={(e) => setSearchSuggestionQuery(e.target.value)}
                    placeholder="Enter search phrase (e.g. smartwatch, shoes, headphones)..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all"
                  >
                    Analyze Keywords
                  </button>
                </form>

                {suggestions.length > 0 && (
                  <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 mt-4">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400 bg-slate-900/80">
                          <th className="py-3 px-4">Search Term</th>
                          <th className="py-3 px-4">Match Type</th>
                          <th className="py-3 px-4 text-center">Monthly Searches</th>
                          <th className="py-3 px-4 text-center">Competition</th>
                          <th className="py-3 px-4 text-right">Suggested CPC</th>
                          <th className="py-3 px-4 text-right">Bid Range</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {suggestions.map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4 font-bold text-white">{s.keyword}</td>
                            <td className="py-3 px-4 text-[11px] text-slate-400">{s.matchType}</td>
                            <td className="py-3 px-4 text-center font-mono text-slate-300">
                              {s.estimatedMonthlySearches?.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  s.competition === 'HIGH'
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    : s.competition === 'MEDIUM'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}
                              >
                                {s.competition}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-amber-400 font-mono">
                              ₹{s.suggestedBid}
                            </td>
                            <td className="py-3 px-4 text-right text-[10px] text-slate-400 font-mono">
                              ₹{s.bidRange?.min} - ₹{s.bidRange?.max}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
