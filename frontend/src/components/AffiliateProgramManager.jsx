import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Share2,
  DollarSign,
  Award,
  TrendingUp,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Filter,
  Search,
  Plus,
  RefreshCw,
  FileText,
  Sliders,
  X,
  ChevronRight,
  Wallet,
  Clock,
  ArrowUpRight,
  Sparkles,
  Link2,
  CheckCircle2,
  QrCode,
  Instagram,
  Youtube,
  Globe,
} from 'lucide-react';
import api from '../api/client';

export default function AffiliateProgramManager() {
  const [activeTab, setActiveTab] = useState('partners'); // partners, referrals, payouts, tiers, generator
  const [partners, setPartners] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);

  // Notification Toast
  const [notification, setNotification] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  // Create Partner Form
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    affiliateCode: '',
    tier: 'STANDARD',
    commissionType: 'PERCENTAGE',
    commissionRate: 10,
    payoutDetails: {
      method: 'UPI',
      upiId: '',
      accountHolderName: '',
      bankAccountNumber: '',
      bankIfsc: '',
      bankName: '',
    },
    socialChannels: {
      instagram: '',
      youtube: '',
      website: '',
    },
    notes: '',
  });

  // Payout Form
  const [payoutForm, setPayoutForm] = useState({
    affiliateId: '',
    amount: '',
    payoutMethod: 'UPI',
    transactionReference: '',
    adminNotes: '',
  });

  // Link Generator Form
  const [generatorForm, setGeneratorForm] = useState({
    partnerCode: '',
    productSlug: 'p24-smart-watch-pro',
    campaignTag: 'influencer_blast',
  });
  const [generatedLink, setGeneratedLink] = useState('');

  const showToast = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    showToast('success', `Copied to clipboard: ${text}`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Fetch Analytics & Core Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, partnersRes, settingsRes] = await Promise.all([
        api.get('/admin/affiliates/analytics'),
        api.get('/admin/affiliates'),
        api.get('/admin/affiliates/settings'),
      ]);

      if (analyticsRes.data?.success) setAnalytics(analyticsRes.data.data);
      if (partnersRes.data?.success) setPartners(partnersRes.data.data || []);
      if (settingsRes.data?.success) setSettings(settingsRes.data.data);

      if (partnersRes.data?.data?.length > 0 && !generatorForm.partnerCode) {
        setGeneratorForm((prev) => ({ ...prev, partnerCode: partnersRes.data.data[0].affiliateCode }));
      }
    } catch (err) {
      console.error('Failed to load affiliate program data:', err);
      showToast('error', err.response?.data?.message || 'Failed to load affiliate data');
    } finally {
      setLoading(false);
    }
  }, [generatorForm.partnerCode]);

  // Fetch Referrals
  const fetchReferrals = async () => {
    try {
      const res = await api.get('/admin/affiliates/referrals');
      if (res.data?.success) setReferrals(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch referrals:', err);
    }
  };

  // Fetch Payouts
  const fetchPayouts = async () => {
    try {
      const res = await api.get('/admin/affiliates/payouts');
      if (res.data?.success) setPayouts(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch payouts:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'referrals') fetchReferrals();
    if (activeTab === 'payouts') fetchPayouts();
  }, [activeTab]);

  // Update Link Generator output
  useEffect(() => {
    if (generatorForm.partnerCode) {
      const baseUrl = window.location.origin;
      const slug = generatorForm.productSlug ? `/product/${generatorForm.productSlug}` : '/';
      const link = `${baseUrl}${slug}?ref=${generatorForm.partnerCode}&utm_source=affiliate&utm_campaign=${generatorForm.campaignTag}`;
      setGeneratedLink(link);
    }
  }, [generatorForm]);

  // Handle Create Partner Submit
  const handleCreatePartner = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/affiliates', createForm);
      if (res.data?.success) {
        showToast('success', `Partner ${createForm.name} onboarded with code ${res.data.data.affiliateCode}`);
        setIsCreateModalOpen(false);
        setCreateForm({
          name: '',
          email: '',
          phone: '',
          affiliateCode: '',
          tier: 'STANDARD',
          commissionType: 'PERCENTAGE',
          commissionRate: 10,
          payoutDetails: { method: 'UPI', upiId: '', accountHolderName: '', bankAccountNumber: '', bankIfsc: '', bankName: '' },
          socialChannels: { instagram: '', youtube: '', website: '' },
          notes: '',
        });
        fetchData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to create partner');
    }
  };

  // Handle Edit Partner Submit
  const handleUpdatePartner = async (e) => {
    e.preventDefault();
    if (!selectedPartner) return;
    try {
      const res = await api.put(`/admin/affiliates/${selectedPartner._id}`, selectedPartner);
      if (res.data?.success) {
        showToast('success', `Updated partner ${selectedPartner.name}`);
        setIsEditModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to update partner');
    }
  };

  // Toggle Partner Status
  const handleStatusToggle = async (partner, newStatus) => {
    try {
      const res = await api.put(`/admin/affiliates/${partner._id}/status`, { status: newStatus });
      if (res.data?.success) {
        showToast('success', `Partner status updated to ${newStatus}`);
        fetchData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to change status');
    }
  };

  // Handle Payout Submit
  const handlePayoutSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/affiliates/payouts', payoutForm);
      if (res.data?.success) {
        showToast('success', res.data.message);
        setIsPayoutModalOpen(false);
        fetchData();
        if (activeTab === 'payouts') fetchPayouts();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to process payout');
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      const res = await api.put('/admin/affiliates/settings', settings);
      if (res.data?.success) {
        showToast('success', 'Program settings & tier matrix updated');
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to save settings');
    }
  };

  // Filtered Partners
  const filteredPartners = partners.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.affiliateCode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = tierFilter === 'ALL' || p.tier === tierFilter;
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesTier && matchesStatus;
  });

  const getTierColor = (tier) => {
    switch (tier) {
      case 'VIP_INFLUENCER':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'PLATINUM':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'GOLD':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'SILVER':
        return 'bg-slate-400/10 text-slate-300 border-slate-400/30';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-medium transition-all transform animate-in fade-in slide-in-from-bottom-4 ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/30'
              : 'bg-rose-950/90 text-rose-200 border-rose-500/30'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Affiliate & Influencer Marketing Engine</h1>
              <p className="text-sm text-slate-400">
                Track custom referral links, tier-based commissions, conversion attribution, and automated settlements.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-colors border border-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            Onboard Affiliate
          </button>
        </div>
      </div>

      {/* Bento Grid Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Partners */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Influencers</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{analytics?.activePartners ?? 0}</span>
            <span className="text-xs text-slate-400">of {analytics?.totalPartners ?? 0} partners</span>
          </div>
          <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{analytics?.pendingPartners ?? 0} applications pending</span>
          </div>
        </div>

        {/* Affiliate Revenue (GMV) */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Affiliate GMV</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">₹{(analytics?.totalGmv ?? 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="mt-2 text-xs text-amber-400 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{analytics?.totalConversions ?? 0} referred orders placed</span>
          </div>
        </div>

        {/* Total Commissions Liability */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Liability</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">₹{(analytics?.pendingLiability ?? 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="mt-2 text-xs text-cyan-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>₹{(analytics?.totalPaid ?? 0).toLocaleString('en-IN')} paid out to date</span>
          </div>
        </div>

        {/* Traffic & Conversion */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conversion Velocity</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{analytics?.conversionRate ?? 0}%</span>
            <span className="text-xs text-slate-400">click-to-sale</span>
          </div>
          <div className="mt-2 text-xs text-purple-400 flex items-center gap-1">
            <Link2 className="w-3.5 h-3.5" />
            <span>{(analytics?.totalClicks ?? 0).toLocaleString('en-IN')} link clicks logged</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'partners', label: 'Partners & Influencers', icon: Users, count: partners.length },
          { id: 'referrals', label: 'Referral Orders', icon: FileText, count: referrals.length },
          { id: 'payouts', label: 'Payouts & Settlements', icon: Wallet, count: payouts.length },
          { id: 'tiers', label: 'Commission Tiers & Rules', icon: Sliders },
          { id: 'generator', label: 'Link Generator Sandbox', icon: Link2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PARTNERS & INFLUENCERS DIRECTORY */}
      {activeTab === 'partners' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by influencer name, email, or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-amber-500/50"
              >
                <option value="ALL">All Tiers</option>
                <option value="STANDARD">Standard</option>
                <option value="SILVER">Silver</option>
                <option value="GOLD">Gold</option>
                <option value="PLATINUM">Platinum</option>
                <option value="VIP_INFLUENCER">VIP Influencer</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-amber-500/50"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending Approval</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-4 px-6">Influencer / Partner</th>
                    <th className="py-4 px-6">Referral Code</th>
                    <th className="py-4 px-6">Tier & Rate</th>
                    <th className="py-4 px-6">Sales (GMV)</th>
                    <th className="py-4 px-6">Earned / Pending</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredPartners.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-500">
                        No affiliate partners found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredPartners.map((partner) => {
                      const refLink = `${window.location.origin}/?ref=${partner.affiliateCode}`;
                      return (
                        <tr key={partner._id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-4 px-6">
                            <div>
                              <div className="font-semibold text-white">{partner.name}</div>
                              <div className="text-xs text-slate-400">{partner.email}</div>
                              {partner.phone && <div className="text-xs text-slate-500">{partner.phone}</div>}
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                                {partner.affiliateCode}
                              </span>
                              <button
                                onClick={() => copyToClipboard(refLink, partner._id)}
                                title="Copy Referral Link"
                                className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                              >
                                {copiedCode === partner._id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getTierColor(partner.tier)}`}>
                                {partner.tier}
                              </span>
                              <span className="text-xs text-slate-400">
                                {partner.commissionRate}% {partner.commissionType === 'FLAT' ? 'Flat' : ''}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <div className="font-medium text-white">₹{(partner.stats?.totalRevenue || 0).toLocaleString('en-IN')}</div>
                            <div className="text-xs text-slate-400">{partner.stats?.conversions || 0} orders</div>
                          </td>

                          <td className="py-4 px-6">
                            <div className="text-xs">
                              <span className="text-emerald-400 font-medium">₹{(partner.stats?.totalCommission || 0).toLocaleString('en-IN')}</span>
                              <span className="text-slate-500"> total</span>
                            </div>
                            <div className="text-xs font-semibold text-amber-400">
                              ₹{(partner.stats?.pendingBalance || 0).toLocaleString('en-IN')} pending
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                                partner.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : partner.status === 'PENDING'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}
                            >
                              {partner.status}
                            </span>
                          </td>

                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {partner.stats?.pendingBalance > 0 && (
                                <button
                                  onClick={() => {
                                    setPayoutForm({
                                      affiliateId: partner._id,
                                      amount: partner.stats.pendingBalance,
                                      payoutMethod: partner.payoutDetails?.method || 'UPI',
                                      transactionReference: '',
                                      adminNotes: `Settlement for ${partner.name}`,
                                    });
                                    setIsPayoutModalOpen(true);
                                  }}
                                  className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-colors border border-emerald-500/20"
                                >
                                  Settle ₹{partner.stats.pendingBalance}
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setSelectedPartner(partner);
                                  setIsEditModalOpen(true);
                                }}
                                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                              >
                                Edit
                              </button>

                              {partner.status === 'PENDING' && (
                                <button
                                  onClick={() => handleStatusToggle(partner, 'ACTIVE')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                                >
                                  Approve
                                </button>
                              )}

                              {partner.status === 'ACTIVE' && (
                                <button
                                  onClick={() => handleStatusToggle(partner, 'SUSPENDED')}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition-colors"
                                >
                                  Suspend
                                </button>
                              )}
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
        </div>
      )}

      {/* TAB 2: REFERRAL ORDERS & CONVERSIONS */}
      {activeTab === 'referrals' && (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-white">Referred Purchases & Attributed Conversions</h3>
            <span className="text-xs text-slate-400">{referrals.length} conversions recorded</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-4 px-6">Order Number</th>
                  <th className="py-4 px-6">Affiliate Partner</th>
                  <th className="py-4 px-6">Order Amount</th>
                  <th className="py-4 px-6">Commission</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {referrals.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-500">
                      No referred orders found yet.
                    </td>
                  </tr>
                ) : (
                  referrals.map((ref) => (
                    <tr key={ref._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 font-mono font-medium text-white">{ref.orderNumber}</td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-slate-200">{ref.affiliate?.name || 'Unknown Partner'}</div>
                        <div className="text-xs text-amber-400 font-mono">{ref.affiliateCode}</div>
                      </td>
                      <td className="py-4 px-6 font-medium text-white">₹{ref.orderTotal?.toLocaleString('en-IN')}</td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-emerald-400">₹{ref.commissionAmount?.toLocaleString('en-IN')}</span>
                        <span className="text-xs text-slate-400 ml-1.5">({ref.commissionRate}%)</span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                            ref.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {ref.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400">{new Date(ref.createdAt).toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PAYOUTS & SETTLEMENTS */}
      {activeTab === 'payouts' && (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-white">Affiliate Commission Settlements & Payout Logs</h3>
            <span className="text-xs text-slate-400">{payouts.length} settlements executed</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-4 px-6">Payout #</th>
                  <th className="py-4 px-6">Partner</th>
                  <th className="py-4 px-6">Amount</th>
                  <th className="py-4 px-6">Method & Beneficiary</th>
                  <th className="py-4 px-6">Transaction Ref / UTR</th>
                  <th className="py-4 px-6">Processed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-500">
                      No payouts recorded yet.
                    </td>
                  </tr>
                ) : (
                  payouts.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 font-mono font-medium text-white">{p.payoutNumber}</td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-slate-200">{p.affiliate?.name || 'Partner'}</div>
                        <div className="text-xs text-amber-400 font-mono">{p.affiliate?.affiliateCode}</div>
                      </td>
                      <td className="py-4 px-6 font-bold text-emerald-400">₹{p.amount?.toLocaleString('en-IN')}</td>
                      <td className="py-4 px-6">
                        <div className="text-xs font-semibold text-slate-200">{p.payoutMethod}</div>
                        <div className="text-xs text-slate-400 font-mono">
                          {p.beneficiary?.upiId || p.beneficiary?.bankAccountNumber || 'Direct Deposit'}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-300">{p.transactionReference || 'N/A'}</td>
                      <td className="py-4 px-6 text-xs text-slate-400">{new Date(p.createdAt).toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: COMMISSION TIERS & RULES */}
      {activeTab === 'tiers' && settings && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-semibold text-white mb-4">Program Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Cookie Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={settings.cookieDurationDays || 30}
                  onChange={(e) => setSettings({ ...settings, cookieDurationDays: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Min Payout Threshold (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={settings.minPayoutThreshold || 500}
                  onChange={(e) => setSettings({ ...settings, minPayoutThreshold: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Auto-Approve Applications</label>
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="autoApprove"
                    checked={settings.autoApproveNewPartners || false}
                    onChange={(e) => setSettings({ ...settings, autoApproveNewPartners: e.target.checked })}
                    className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                  />
                  <label htmlFor="autoApprove" className="text-sm text-slate-300 cursor-pointer">
                    Enable Instant Approval
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Tier Matrix */}
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Tier Progression Matrix</h3>
                <p className="text-xs text-slate-400">Influencers automatically advance as their referred GMV milestones are reached.</p>
              </div>
              <button
                onClick={handleSaveSettings}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors"
              >
                Save Settings
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {settings.tiers?.map((tier, idx) => (
                <div key={tier.name} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getTierColor(tier.name)}`}>
                      {tier.name}
                    </span>
                    <div className="mt-3">
                      <label className="text-[11px] font-semibold text-slate-400 uppercase">Min Sales (₹)</label>
                      <input
                        type="number"
                        value={tier.minSales}
                        onChange={(e) => {
                          const updated = [...settings.tiers];
                          updated[idx].minSales = Number(e.target.value);
                          setSettings({ ...settings, tiers: updated });
                        }}
                        className="w-full mt-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs"
                      />
                    </div>
                    <div className="mt-3">
                      <label className="text-[11px] font-semibold text-slate-400 uppercase">Commission %</label>
                      <input
                        type="number"
                        value={tier.defaultRate}
                        onChange={(e) => {
                          const updated = [...settings.tiers];
                          updated[idx].defaultRate = Number(e.target.value);
                          setSettings({ ...settings, tiers: updated });
                        }}
                        className="w-full mt-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-amber-400 font-bold text-xs"
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-400">{tier.perkDescription}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: LINK GENERATOR SANDBOX */}
      {activeTab === 'generator' && (
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Influencer Deep Link Generator Sandbox</h3>
            <p className="text-xs text-slate-400">
              Produce campaign-attributed referral URLs with built-in UTM parameters for social posts, YouTube bios, and Instagram stories.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Affiliate Partner</label>
              <select
                value={generatorForm.partnerCode}
                onChange={(e) => setGeneratorForm({ ...generatorForm, partnerCode: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm"
              >
                {partners.map((p) => (
                  <option key={p._id} value={p.affiliateCode}>
                    {p.name} ({p.affiliateCode} - {p.tier})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Target Product Slug</label>
              <input
                type="text"
                value={generatorForm.productSlug}
                onChange={(e) => setGeneratorForm({ ...generatorForm, productSlug: e.target.value })}
                placeholder="e.g. smart-watch-pro or leave empty for homepage"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Campaign Tag (UTM)</label>
              <input
                type="text"
                value={generatorForm.campaignTag}
                onChange={(e) => setGeneratorForm({ ...generatorForm, campaignTag: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm"
              />
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-3">
            <span className="text-xs font-semibold text-amber-400 uppercase">Generated Shareable Link</span>
            <div className="flex items-center gap-3">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 font-mono text-xs focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(generatedLink, 'generator')}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors"
              >
                {copiedCode === 'generator' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PARTNER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Onboard New Affiliate Partner</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePartner} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Preferred Affiliate Code</label>
                  <input
                    type="text"
                    placeholder="e.g. PRIYA2026 (leave empty to auto-generate)"
                    value={createForm.affiliateCode}
                    onChange={(e) => setCreateForm({ ...createForm, affiliateCode: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tier</label>
                  <select
                    value={createForm.tier}
                    onChange={(e) => setCreateForm({ ...createForm, tier: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="SILVER">Silver</option>
                    <option value="GOLD">Gold</option>
                    <option value="PLATINUM">Platinum</option>
                    <option value="VIP_INFLUENCER">VIP Influencer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Commission Type</label>
                  <select
                    value={createForm.commissionType}
                    onChange={(e) => setCreateForm({ ...createForm, commissionType: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Fee (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Rate (%)</label>
                  <input
                    type="number"
                    value={createForm.commissionRate}
                    onChange={(e) => setCreateForm({ ...createForm, commissionRate: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase mb-3">Settlement / Payout Coordinates</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">UPI ID</label>
                    <input
                      type="text"
                      placeholder="username@okhdfcbank"
                      value={createForm.payoutDetails.upiId}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          payoutDetails: { ...createForm.payoutDetails, upiId: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Beneficiary Name</label>
                    <input
                      type="text"
                      value={createForm.payoutDetails.accountHolderName}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          payoutDetails: { ...createForm.payoutDetails, accountHolderName: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/20"
                >
                  Create Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PARTNER MODAL */}
      {isEditModalOpen && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Edit Partner: {selectedPartner.name}</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePartner} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tier</label>
                  <select
                    value={selectedPartner.tier}
                    onChange={(e) => setSelectedPartner({ ...selectedPartner, tier: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="SILVER">Silver</option>
                    <option value="GOLD">Gold</option>
                    <option value="PLATINUM">Platinum</option>
                    <option value="VIP_INFLUENCER">VIP Influencer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    value={selectedPartner.commissionRate}
                    onChange={(e) => setSelectedPartner({ ...selectedPartner, commissionRate: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">UPI ID</label>
                <input
                  type="text"
                  value={selectedPartner.payoutDetails?.upiId || ''}
                  onChange={(e) =>
                    setSelectedPartner({
                      ...selectedPartner,
                      payoutDetails: { ...selectedPartner.payoutDetails, upiId: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTLE PAYOUT MODAL */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Record Commission Settlement</h2>
              <button onClick={() => setIsPayoutModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePayoutSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Settlement Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={payoutForm.amount}
                  onChange={(e) => setPayoutForm({ ...payoutForm, amount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-bold text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Payout Method</label>
                <select
                  value={payoutForm.payoutMethod}
                  onChange={(e) => setPayoutForm({ ...payoutForm, payoutMethod: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                >
                  <option value="UPI">UPI Instant Transfer</option>
                  <option value="BANK_TRANSFER">Bank NEFT / IMPS</option>
                  <option value="WALLET">In-App Customer Wallet</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Bank / UPI UTR Reference *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR-49281092849"
                  value={payoutForm.transactionReference}
                  onChange={(e) => setPayoutForm({ ...payoutForm, transactionReference: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/20"
                >
                  Record Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
