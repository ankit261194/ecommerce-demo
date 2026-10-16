import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Building2,
  Zap,
  Percent,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Sparkles,
  Calculator,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Settings,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';
import api from '../api/client';

export default function AdminEmiManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [config, setConfig] = useState(null);

  // Simulation State
  const [simulationPrice, setSimulationPrice] = useState(25000);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    fetchAdminConfig();
  }, []);

  const fetchAdminConfig = async () => {
    setLoading(true);
    try {
      const res = await api.get('/emi/admin/config');
      if (res.data?.success) {
        setConfig(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load admin EMI config:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load EMI configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    setSaveSuccess(false);
    try {
      const res = await api.put('/emi/admin/config', config);
      if (res.data?.success) {
        setConfig(res.data.data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Failed to save EMI configuration:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to save EMI configuration.');
    } finally {
      setSaving(false);
    }
  };

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const res = await api.post('/emi/calculate', { price: simulationPrice });
      if (res.data?.success) {
        setSimulationResult(res.data);
      }
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setSimulating(false);
    }
  };

  // Toggle bank active status
  const handleToggleBank = (index) => {
    const updatedBanks = [...config.banks];
    updatedBanks[index].isActive = !updatedBanks[index].isActive;
    setConfig({ ...config, banks: updatedBanks });
  };

  // Toggle bank tenure No-Cost status
  const handleToggleBankTenureNoCost = (bankIndex, tenureIndex) => {
    const updatedBanks = [...config.banks];
    const tenure = updatedBanks[bankIndex].tenures[tenureIndex];
    tenure.isNoCost = !tenure.isNoCost;
    setConfig({ ...config, banks: updatedBanks });
  };

  // Toggle bank tenure active status
  const handleToggleBankTenureActive = (bankIndex, tenureIndex) => {
    const updatedBanks = [...config.banks];
    const tenure = updatedBanks[bankIndex].tenures[tenureIndex];
    tenure.isActive = !tenure.isActive;
    setConfig({ ...config, banks: updatedBanks });
  };

  // Change bank tenure interest rate
  const handleBankTenureRateChange = (bankIndex, tenureIndex, rate) => {
    const updatedBanks = [...config.banks];
    updatedBanks[bankIndex].tenures[tenureIndex].annualInterestRate = Number(rate);
    setConfig({ ...config, banks: updatedBanks });
  };

  // Toggle BNPL provider active status
  const handleToggleBnpl = (index) => {
    const updated = [...config.bnplProviders];
    updated[index].isActive = !updated[index].isActive;
    setConfig({ ...config, bnplProviders: updated });
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-400">Loading EMI & BNPL Configuration Studio...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6 bg-red-950/40 border border-red-500/50 rounded-2xl text-red-200">
        Failed to load configuration. Please verify backend connectivity.
      </div>
    );
  }

  const activeBanksCount = config.banks?.filter((b) => b.isActive).length || 0;
  const activeBnplCount = config.bnplProviders?.filter((p) => p.isActive).length || 0;

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-tight">
                Real-Time EMI & Buy Now Pay Later (BNPL) Studio
              </h2>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-500/40">
                Point #17
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Multi-bank reducing balance calculations, No-Cost EMI seller subventions, and cardless BNPL rules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchAdminConfig}
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
          <span>Platform EMI & BNPL rules successfully updated and logged in the immutable Audit Trail.</span>
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
            <span>Active Partner Banks</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {activeBanksCount} <span className="text-xs text-slate-500 font-bold">/ {config.banks?.length || 0} Banks</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">HDFC, ICICI, SBI, Axis, Kotak</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>BNPL & NBFC Integrations</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {activeBnplCount} <span className="text-xs text-slate-500 font-bold">Active</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Bajaj Finserv, Snapmint, Simpl, LazyPay</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Min EMI Order Value</span>
            <Percent className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">
            ₹{config.minOrderAmount?.toLocaleString('en-IN') || 2500}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Transactions below this use standard pay</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>No Cost EMI Subvention</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {config.noCostEmiEnabled ? 'ACTIVE (0% Interest)' : 'PAUSED'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Subsidized by: {config.subsidizedBy || 'PLATFORM'}</p>
        </div>
      </div>

      {/* MASTER PLATFORM RULES CARD */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-md space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Settings className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-black text-white">Global EMI & Subvention Controls</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Global EMI Toggle */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 block">
                Enable Platform EMI Engine
              </span>
              <span className="text-[11px] text-slate-400">
                Display EMI tables and breakdown on products
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.isEnabled}
                onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* No Cost EMI Toggle */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 block">
                No Cost EMI (0% Interest)
              </span>
              <span className="text-[11px] text-slate-400">
                Absorb interest as upfront seller discount
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.noCostEmiEnabled}
                onChange={(e) => setConfig({ ...config, noCostEmiEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Subsidized By */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 block">
              Subvention Funded By
            </span>
            <select
              value={config.subsidizedBy || 'PLATFORM'}
              onChange={(e) => setConfig({ ...config, subsidizedBy: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 text-xs font-bold text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500"
            >
              <option value="PLATFORM">Platform Funded (100% AuraMarket)</option>
              <option value="VENDOR">Vendor Funded (Deducted from Payout)</option>
              <option value="SHARED">50-50 Shared Platform & Vendor</option>
            </select>
          </div>

          {/* Min Order Amount */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 block">
              Min Product Price for EMI (₹)
            </span>
            <input
              type="number"
              min={500}
              step={100}
              value={config.minOrderAmount || 2500}
              onChange={(e) => setConfig({ ...config, minOrderAmount: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Default Processing Fee */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 block">
              Default Bank Processing Fee (₹)
            </span>
            <input
              type="number"
              min={0}
              value={config.defaultProcessingFee || 199}
              onChange={(e) => setConfig({ ...config, defaultProcessingFee: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Processing Fee GST % */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 block">
              Processing Fee GST Rate (%)
            </span>
            <input
              type="number"
              min={0}
              max={28}
              value={config.processingFeeGstRate || 18}
              onChange={(e) => setConfig({ ...config, processingFeeGstRate: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Banner Message Editor */}
        <div className="space-y-1.5">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-300">
            Storefront Promotional Banner Copy (Use <code className="text-amber-400">%minEmi%</code> for live price):
          </label>
          <input
            type="text"
            value={config.bannerMessage || ''}
            onChange={(e) => setConfig({ ...config, bannerMessage: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 text-xs font-medium text-white rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* BANK PARTNERS & TENURE MATRIX */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-md space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-white">Bank EMI Partners & Tenure Rules</h3>
          </div>
          <span className="text-xs font-bold text-slate-400">
            Configure interest rates and No Cost eligibility per bank tenure
          </span>
        </div>

        <div className="space-y-4">
          {config.banks?.map((bank, bankIdx) => (
            <div
              key={bank.bankCode}
              className={`p-4 rounded-2xl border transition-all ${
                bank.isActive
                  ? 'bg-slate-800/40 border-slate-700'
                  : 'bg-slate-900/30 border-slate-800 opacity-60'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: bank.color || '#004c8f' }}
                  />
                  <div>
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      {bank.bankName} ({bank.bankCode})
                      {bank.isActive ? (
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-700 text-slate-400">
                          Disabled
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Cards: {bank.cardTypes?.join(', ') || 'CREDIT_CARD'} • Fee: ₹{bank.processingFee} + {bank.processingFeeGst || 18}% GST
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleBank(bankIdx)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                      bank.isActive
                        ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {bank.isActive ? 'Disable Bank' : 'Enable Bank'}
                  </button>
                </div>
              </div>

              {/* Tenures Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
                {bank.tenures?.map((t, tenureIdx) => (
                  <div
                    key={tenureIdx}
                    className={`p-2.5 rounded-xl border text-xs space-y-1.5 ${
                      t.isActive
                        ? t.isNoCost
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-900/60 border-slate-700 text-slate-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-500 line-through'
                    }`}
                  >
                    <div className="flex items-center justify-between font-black">
                      <span>{t.months} Months</span>
                      <input
                        type="checkbox"
                        checked={t.isActive}
                        onChange={() => handleToggleBankTenureActive(bankIdx, tenureIdx)}
                        title="Toggle tenure active"
                        className="rounded bg-slate-800 text-amber-500"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step={0.5}
                        min={0}
                        max={36}
                        value={t.annualInterestRate}
                        onChange={(e) => handleBankTenureRateChange(bankIdx, tenureIdx, e.target.value)}
                        className="w-14 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-mono text-white text-right"
                      />
                      <span className="text-[10px] text-slate-400">% p.a.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleBankTenureNoCost(bankIdx, tenureIdx)}
                      className={`w-full py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                        t.isNoCost
                          ? 'bg-emerald-500 text-slate-950 shadow-xs'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {t.isNoCost ? '✨ 0% No Cost' : 'Standard'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BNPL & CARDLESS PROVIDERS */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-md space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400 fill-current" />
            <h3 className="text-base font-black text-white">Cardless NBFC & Buy Now Pay Later (BNPL)</h3>
          </div>
          <span className="text-xs font-bold text-slate-400">
            Bajaj Finserv Insta Card, Snapmint, Simpl & LazyPay
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {config.bnplProviders?.map((prov, provIdx) => (
            <div
              key={prov.providerCode}
              className={`p-4 rounded-2xl border transition-all space-y-3 ${
                prov.isActive
                  ? 'bg-slate-800/40 border-slate-700'
                  : 'bg-slate-900/30 border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: prov.color || '#2563eb' }}
                  />
                  <h4 className="text-xs font-black text-white">{prov.providerName}</h4>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prov.isActive}
                    onChange={() => handleToggleBnpl(provIdx)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="space-y-1 text-[11px] text-slate-400">
                <p>Type: <strong className="text-slate-200">{prov.type}</strong></p>
                <p>Fee: <strong className="text-slate-200">₹{prov.processingFee || 0}</strong></p>
                <p>Limits: <strong className="text-slate-200">₹{prov.minAmount?.toLocaleString('en-IN')} - ₹{prov.maxAmount?.toLocaleString('en-IN')}</strong></p>
              </div>

              <div className="pt-1 flex items-center gap-1 flex-wrap">
                {prov.tenures?.map((t, tIdx) => (
                  <span
                    key={tIdx}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    {t.months}m (0%)
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LIVE INTERACTIVE SIMULATOR SANDBOX */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 shadow-md space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-white">Live Financial Calculation Sandbox</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Test any product or cart amount against the active platform rules
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5">
            <span className="text-xs font-bold text-slate-400">Test Amount: ₹</span>
            <input
              type="number"
              min={100}
              step={1000}
              value={simulationPrice}
              onChange={(e) => setSimulationPrice(Number(e.target.value))}
              className="w-28 bg-transparent text-sm font-mono font-black text-white focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={runSimulation}
            disabled={simulating}
            className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md active:scale-95 transition-all"
          >
            {simulating ? 'Calculating...' : 'Run Live Math Simulation ⚡'}
          </button>
        </div>

        {simulationResult && (
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="font-bold text-slate-300">
                Calculation Result for <strong className="text-white">₹{simulationPrice.toLocaleString('en-IN')}</strong>:
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-black border border-emerald-400/30">
                Lowest Monthly EMI: ₹{simulationResult.minMonthlyEmi?.toLocaleString('en-IN') || 0}/mo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Credit Card Options</span>
                <span className="text-sm font-bold text-white">
                  {simulationResult.breakdown?.creditCards?.length || 0} Banks Eligible
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Debit Card Options</span>
                <span className="text-sm font-bold text-white">
                  {simulationResult.breakdown?.debitCards?.length || 0} Banks Eligible
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Cardless NBFC</span>
                <span className="text-sm font-bold text-white">
                  {simulationResult.breakdown?.cardlessEmi?.length || 0} Providers Eligible
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Pay Later BNPL</span>
                <span className="text-sm font-bold text-white">
                  {simulationResult.breakdown?.payLater?.length || 0} Providers Eligible
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
