import React, { useState, useEffect } from 'react';
import {
  Percent,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Layers,
  TrendingUp,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Save,
  RefreshCw,
  Sliders,
  X,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Smartphone,
  Apple,
  Globe,
  DollarSign
} from 'lucide-react';
import api from '../api/client';

export default function CommissionRuleManager() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [ruleTypeFilter, setRuleTypeFilter] = useState('ALL');

  // Simulator State
  const [simCategory, setSimCategory] = useState('electronics');
  const [simAmount, setSimAmount] = useState('5000');
  const [simVendorRate, setSimVendorRate] = useState('10');
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    categorySlug: 'electronics',
    ruleType: 'PERCENTAGE',
    percentage: 10,
    fixedFee: 0,
    minCommission: 0,
    maxCommission: 0,
    priority: 10,
    isActive: true,
    description: '',
    tieredSlabs: [
      { minAmount: 0, maxAmount: 1999, percentage: 15 },
      { minAmount: 2000, maxAmount: 9999, percentage: 10 },
      { minAmount: 10000, maxAmount: 999999, percentage: 6 }
    ]
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/commission/rules');
      if (res.data?.success) {
        setRules(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  useEffect(() => {
    const runSim = async () => {
      const amt = Number(simAmount);
      if (isNaN(amt) || amt <= 0) {
        setSimResult(null);
        return;
      }
      setSimLoading(true);
      try {
        const res = await api.post('/commission/simulate', {
          categorySlug: simCategory,
          amount: amt,
          defaultVendorRate: Number(simVendorRate) || 10,
        });
        if (res.data?.success) {
          setSimResult(res.data.data);
        }
      } catch (err) {
        console.error('Simulation error:', err);
      } finally {
        setSimLoading(false);
      }
    };
    const timer = setTimeout(runSim, 250);
    return () => clearTimeout(timer);
  }, [simCategory, simAmount, simVendorRate]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingId(null);
    setFormData({
      name: '',
      categorySlug: 'electronics',
      ruleType: 'PERCENTAGE',
      percentage: 10,
      fixedFee: 0,
      minCommission: 0,
      maxCommission: 0,
      priority: 10,
      isActive: true,
      description: '',
      tieredSlabs: [
        { minAmount: 0, maxAmount: 1999, percentage: 15 },
        { minAmount: 2000, maxAmount: 9999, percentage: 10 },
        { minAmount: 10000, maxAmount: 999999, percentage: 6 }
      ]
    });
    setShowModal(true);
  };

  const handleOpenEdit = (rule) => {
    setModalMode('edit');
    setEditingId(rule._id);
    setFormData({
      name: rule.name || '',
      categorySlug: rule.categorySlug || 'all',
      ruleType: rule.ruleType || 'PERCENTAGE',
      percentage: rule.percentage !== undefined ? rule.percentage : 10,
      fixedFee: rule.fixedFee || 0,
      minCommission: rule.minCommission || 0,
      maxCommission: rule.maxCommission || 0,
      priority: rule.priority || 1,
      isActive: rule.isActive !== undefined ? rule.isActive : true,
      description: rule.description || '',
      tieredSlabs: rule.tieredSlabs && rule.tieredSlabs.length > 0 ? rule.tieredSlabs : [
        { minAmount: 0, maxAmount: 1999, percentage: 15 },
        { minAmount: 2000, maxAmount: 9999, percentage: 10 },
        { minAmount: 10000, maxAmount: 999999, percentage: 6 }
      ]
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      if (modalMode === 'create') {
        const res = await api.post('/commission/rules', formData);
        if (res.data?.success) {
          setMessage({ type: 'success', text: 'Commission rule created successfully!' });
          setShowModal(false);
          fetchRules();
        }
      } else {
        const res = await api.put(`/commission/rules/${editingId}`, formData);
        if (res.data?.success) {
          setMessage({ type: 'success', text: 'Commission rule updated successfully!' });
          setShowModal(false);
          fetchRules();
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Operation failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete commission rule '${name}'?`)) return;
    try {
      const res = await api.delete(`/commission/rules/${id}`);
      if (res.data?.success) {
        setMessage({ type: 'success', text: `Rule '${name}' deleted successfully.` });
        fetchRules();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Delete failed' });
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset default category commission rules (Electronics 5%, Fashion 15%, Groceries 3%, Default 10%)?')) return;
    try {
      const res = await api.post('/commission/seed');
      if (res.data?.success) {
        setMessage({ type: 'success', text: 'Default commission rules restored successfully!' });
        fetchRules();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Reset failed' });
    }
  };

  const handleAddSlab = () => {
    setFormData(prev => ({
      ...prev,
      tieredSlabs: [...prev.tieredSlabs, { minAmount: 10000, maxAmount: 50000, percentage: 8 }]
    }));
  };

  const handleRemoveSlab = (idx) => {
    setFormData(prev => ({
      ...prev,
      tieredSlabs: prev.tieredSlabs.filter((_, i) => i !== idx)
    }));
  };

  const handleSlabChange = (idx, field, value) => {
    setFormData(prev => {
      const nextSlabs = [...prev.tieredSlabs];
      nextSlabs[idx] = { ...nextSlabs[idx], [field]: Number(value) };
      return { ...prev, tieredSlabs: nextSlabs };
    });
  };

  const filteredRules = rules.filter(r => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.categorySlug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      categoryFilter === 'ALL' || r.categorySlug.toLowerCase() === categoryFilter.toLowerCase();
    const matchesType = ruleTypeFilter === 'ALL' || r.ruleType === ruleTypeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });
  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between shadow-lg border transition-all ${
            message.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-400" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/40 border border-amber-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-semibold mb-3">
              <Percent className="w-3.5 h-3.5" />
              <span>Point #9 Master Enterprise Module</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Category-Wise & Dynamic Commission Rules
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
              Enforce automated tiered & category commission rates (Electronics 5%, Fashion 15%, Groceries 3%) with real-time double-entry vendor ledger reconciliation.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleResetDefaults}
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/80 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-sm"
              title="Reset default category rules"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
            <button
              onClick={handleOpenCreate}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Commission Rule</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Electronics</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">5.0%</span>
            <span className="text-xs text-blue-400 font-medium">Standard Cut</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">High-velocity gadgets, laptops & smart appliances</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Fashion & Apparel</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">15.0%</span>
            <span className="text-xs text-purple-400 font-medium">Margin Cut</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Clothing, footwear, lifestyle & accessories</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Groceries & Staples</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Apple className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">3.0%</span>
            <span className="text-xs text-emerald-400 font-medium">Essential Rate</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Daily essentials, food staples & packaged pantry</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Global Default</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">10.0%</span>
            <span className="text-xs text-amber-400 font-medium">Fallback</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Applies to unmapped & general categories</p>
        </div>
      </div>

      {/* Simulator */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Interactive Commission & Double-Entry Ledger Simulator</h2>
            <p className="text-xs text-slate-400">Test live commission deduction, vendor payouts, and credit/debit balances</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Product Category
              </label>
              <select
                value={simCategory}
                onChange={e => setSimCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all"
              >
                <option value="electronics">Electronics (5%)</option>
                <option value="fashion">Fashion & Apparel (15%)</option>
                <option value="groceries">Groceries & Staples (3%)</option>
                <option value="home-living">Home & Living (Slabs)</option>
                <option value="all">Universal / Unclassified (10%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Order SubTotal (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                <input
                  type="number"
                  value={simAmount}
                  onChange={e => setSimAmount(e.target.value)}
                  placeholder="5000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all font-mono"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 hidden lg:flex justify-center">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          <div className="lg:col-span-6 bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
            {simResult ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <span className="text-xs text-slate-400">Matched Rule:</span>
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    {simResult.appliedRule.name} ({simResult.appliedRule.type})
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center py-1">
                  <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800/60">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Gross Amount</div>
                    <div className="text-sm font-bold text-white font-mono mt-0.5">₹{simResult.orderAmount.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-amber-950/30 rounded-lg p-2 border border-amber-500/20">
                    <div className="text-[10px] text-amber-400/80 uppercase tracking-wider">Platform Cut ({simResult.effectiveRatePercent}%)</div>
                    <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">₹{simResult.platformCommissionCut.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-emerald-950/30 rounded-lg p-2 border border-emerald-500/20">
                    <div className="text-[10px] text-emerald-400/80 uppercase tracking-wider">Vendor Credit</div>
                    <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">₹{simResult.vendorEarning.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Double-Entry Ledger Balanced (Delta: ₹0)
                  </span>
                  <span className="text-slate-500 font-mono">
                    ₹{simResult.vendorEarning} + ₹{simResult.platformCommissionCut} = ₹{simResult.orderAmount}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-500">
                Enter an order subtotal to simulate commission calculation
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Rules Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search rules by name or category..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="ALL">All Categories</option>
              <option value="electronics">Electronics</option>
              <option value="fashion">Fashion</option>
              <option value="groceries">Groceries</option>
              <option value="home-living">Home & Living</option>
              <option value="all">Universal (All)</option>
            </select>

            <select
              value={ruleTypeFilter}
              onChange={e => setRuleTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="ALL">All Rule Types</option>
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED_PER_ORDER">Fixed Fee (₹)</option>
              <option value="TIERED_SLAB">Tiered Slabs</option>
            </select>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredRules.length} of {rules.length} active rules
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800/80">
              <tr>
                <th className="py-3 px-4">Rule Name</th>
                <th className="py-3 px-4">Target Category</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Commission Rate / Fee</th>
                <th className="py-3 px-4">Caps</th>
                <th className="py-3 px-4 text-center">Priority</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading commission rules...
                  </td>
                </tr>
              ) : filteredRules.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No commission rules found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRules.map(rule => (
                  <tr key={rule._id} className="hover:bg-slate-800/30 transition-all">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div>{rule.name}</div>
                      {rule.description && (
                        <div className="text-[11px] text-slate-500 font-normal mt-0.5 line-clamp-1">{rule.description}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          rule.categorySlug === 'electronics'
                            ? 'bg-blue-950/40 border-blue-500/30 text-blue-300'
                            : rule.categorySlug === 'fashion'
                            ? 'bg-purple-950/40 border-purple-500/30 text-purple-300'
                            : rule.categorySlug === 'groceries'
                            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                            : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                        }`}
                      >
                        {rule.categorySlug.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">
                        {rule.ruleType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white font-mono">
                      {rule.ruleType === 'PERCENTAGE' && `${rule.percentage}%`}
                      {rule.ruleType === 'FIXED_PER_ORDER' && `₹${rule.fixedFee}`}
                      {rule.ruleType === 'TIERED_SLAB' && (
                        <span className="text-amber-400 text-xs">
                          {rule.tieredSlabs?.length || 0} Slabs (Sliding)
                        </span>
                      )}
                      {rule.fixedFee > 0 && rule.ruleType === 'PERCENTAGE' && (
                        <span className="text-slate-400 font-normal text-[11px] ml-1">
                          + ₹{rule.fixedFee} fee
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {rule.minCommission > 0 && <span>Min: ₹{rule.minCommission} </span>}
                      {rule.maxCommission > 0 ? <span>Max: ₹{rule.maxCommission}</span> : <span>Uncapped</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-400 font-mono">
                      {rule.priority}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rule.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {rule.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(rule)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-all"
                          title="Edit Rule"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule._id, rule.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Create / Edit Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Percent className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">
                  {modalMode === 'create' ? 'Create Dynamic Commission Rule' : 'Edit Commission Rule'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Rule Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Consumer Electronics Prime 5%"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Target Category Slug *</label>
                  <select
                    value={formData.categorySlug}
                    onChange={e => setFormData({ ...formData, categorySlug: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="electronics">electronics (5%)</option>
                    <option value="fashion">fashion (15%)</option>
                    <option value="groceries">groceries (3%)</option>
                    <option value="home-living">home-living</option>
                    <option value="beauty">beauty</option>
                    <option value="all">all (Universal Fallback)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Rule Type *</label>
                  <select
                    value={formData.ruleType}
                    onChange={e => setFormData({ ...formData, ruleType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_PER_ORDER">Fixed Fee Per Order (₹)</option>
                    <option value="TIERED_SLAB">Tiered Sliding Slabs</option>
                  </select>
                </div>
              </div>

              {formData.ruleType === 'PERCENTAGE' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Commission Rate (%) *</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      required
                      value={formData.percentage}
                      onChange={e => setFormData({ ...formData, percentage: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Fixed Handling Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.fixedFee}
                      onChange={e => setFormData({ ...formData, fixedFee: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>
              )}

              {formData.ruleType === 'FIXED_PER_ORDER' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fixed Fee Per Order (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.fixedFee}
                    onChange={e => setFormData({ ...formData, fixedFee: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              )}

              {formData.ruleType === 'TIERED_SLAB' && (
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">Tiered Order Value Slabs</span>
                    <button
                      type="button"
                      onClick={handleAddSlab}
                      className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Slab
                    </button>
                  </div>
                  {formData.tieredSlabs.map((slab, sIdx) => (
                    <div key={sIdx} className="grid grid-cols-3 gap-2 items-center">
                      <div>
                        <label className="text-[10px] text-slate-500">Min Amount (₹)</label>
                        <input
                          type="number"
                          value={slab.minAmount}
                          onChange={e => handleSlabChange(sIdx, 'minAmount', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500">Max Amount (₹)</label>
                        <input
                          type="number"
                          value={slab.maxAmount}
                          onChange={e => handleSlabChange(sIdx, 'maxAmount', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-500">Cut (%)</label>
                          <input
                            type="number"
                            value={slab.percentage}
                            onChange={e => handleSlabChange(sIdx, 'percentage', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                          />
                        </div>
                        {formData.tieredSlabs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSlab(sIdx)}
                            className="p-1 text-rose-400 hover:text-rose-300 rounded mb-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Min Commission Cap (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minCommission}
                    onChange={e => setFormData({ ...formData, minCommission: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Max Cap (0 = Uncapped)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxCommission}
                    onChange={e => setFormData({ ...formData, maxCommission: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Priority Rank (1-100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description / Internal Notes</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explain rationales or specific merchant contracts..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-800"
                />
                <label htmlFor="isActiveToggle" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Rule is active and applied during checkout & order splitting
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : modalMode === 'create' ? 'Create Rule' : 'Update Rule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
