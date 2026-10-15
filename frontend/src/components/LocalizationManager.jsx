import React, { useState, useEffect } from 'react';
import {
  Globe,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertCircle,
  Calculator,
  ArrowRightLeft,
  Languages,
  Sparkles,
} from 'lucide-react';
import api from '../api/client';
import { useLocalization } from '../context/LocalizationContext';

export default function LocalizationManager() {
  const { currencies, languages, currency, language, setCurrency, setLanguage } = useLocalization();

  const [rates, setRates] = useState({
    INR: 1.0,
    USD: 0.012,
    EUR: 0.011,
    AED: 0.044,
  });

  const [lastUpdated, setLastUpdated] = useState(new Date().toISOString());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Conversion Calculator State
  const [calcAmount, setCalcAmount] = useState(2499);
  const [calcFrom, setCalcFrom] = useState('INR');
  const [calcTo, setCalcTo] = useState('USD');
  const [calcResult, setCalcResult] = useState(null);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/localization/currencies');
      if (res.data?.success && Array.isArray(res.data.currencies)) {
        const rateMap = {};
        res.data.currencies.forEach((c) => {
          rateMap[c.code] = c.rate;
        });
        setRates(rateMap);
        if (res.data.lastRatesUpdated) {
          setLastUpdated(res.data.lastRatesUpdated);
        }
      }
    } catch (err) {
      console.warn('Could not fetch rates from server:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleRateChange = (code, val) => {
    setRates((prev) => ({
      ...prev,
      [code]: Number(val),
    }));
  };

  const saveRates = async () => {
    setSaving(true);
    try {
      const res = await api.put('/admin/localization/rates', { rates });
      if (res.data?.success) {
        setNotification({ type: 'success', text: 'Exchange rates saved successfully! Live across entire marketplace.' });
        fetchRates();
      }
    } catch (err) {
      setNotification({ type: 'error', text: err.response?.data?.message || 'Failed to save rates' });
    } finally {
      setSaving(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const runCalculator = async () => {
    try {
      const res = await api.get('/localization/convert', {
        params: {
          amount: calcAmount,
          from: calcFrom,
          to: calcTo,
        },
      });
      if (res.data?.success) {
        setCalcResult(res.data);
      }
    } catch (err) {
      console.warn('Conversion calc error:', err);
    }
  };

  useEffect(() => {
    runCalculator();
  }, [calcAmount, calcFrom, calcTo, rates]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-900 border border-indigo-700/50 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-black uppercase mb-2">
              <Globe className="w-3.5 h-3.5" />
              Point #78 • Multi-Currency & Multi-Language
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Real-Time Multi-Currency (₹, $, €, AED) & Multi-Language Switcher
            </h2>
            <p className="text-sm text-indigo-200/80 mt-1 max-w-2xl">
              Live automated exchange rates, localized price recalculation across catalog and checkout, and Hindi / English bilingual dictionary switching.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchRates}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Rates
            </button>
            <button
              onClick={saveRates}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Exchange Rates'}
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-bold ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Grid: Exchange Rates & Live Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Currencies & Rates Editor (2 Columns) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                Live Currency Exchange Rates (Base: INR ₹)
              </h3>
              <p className="text-xs text-slate-400">
                1 INR = Target Currency rate. Update anytime to adjust global catalog pricing.
              </p>
            </div>
            <div className="text-[11px] text-slate-400">
              Updated: <span className="text-slate-200 font-bold">{new Date(lastUpdated).toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currencies.map((c) => {
              const currentRate = rates[c.code] !== undefined ? rates[c.code] : c.rate;
              return (
                <div
                  key={c.code}
                  className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{c.flag}</span>
                      <div>
                        <div className="font-black text-white text-sm flex items-center gap-1.5">
                          <span>{c.name}</span>
                          <span className="text-xs text-amber-400 font-mono">({c.code})</span>
                        </div>
                        <div className="text-[11px] text-slate-400">Symbol: <span className="font-bold text-slate-200">{c.symbol}</span></div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                      Active
                    </span>
                  </div>

                  <div className="mt-2">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      1 INR (₹) =
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.0001"
                        min="0.000001"
                        disabled={c.code === 'INR'}
                        value={currentRate}
                        onChange={(e) => handleRateChange(c.code, e.target.value)}
                        className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-sm font-mono text-white ${
                          c.code === 'INR' ? 'border-slate-800 text-slate-500 cursor-not-allowed' : 'border-slate-700 focus:border-amber-400'
                        }`}
                      />
                      <span className="text-xs font-black text-slate-300 w-12">{c.code}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {c.code === 'INR'
                        ? 'Base currency of AuraMarket'
                        : `1 ${c.code} ≈ ₹${(1 / (currentRate || 1)).toFixed(2)} INR`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Currency Calculator & Preview (1 Column) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
              <Calculator className="w-4 h-4 text-indigo-400" />
              <h3 className="text-base font-black text-white">Live Conversion Sandbox</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Source Amount</label>
                <input
                  type="number"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">From</label>
                  <select
                    value={calcFrom}
                    onChange={(e) => setCalcFrom(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold"
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">To</label>
                  <select
                    value={calcTo}
                    onChange={(e) => setCalcTo(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold"
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {calcResult && (
                <div className="mt-4 p-4 rounded-xl bg-indigo-950/60 border border-indigo-700/40 text-center">
                  <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-1">
                    Converted Result
                  </div>
                  <div className="text-2xl font-black text-amber-400 font-mono">
                    {calcResult.formatted}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Rate: 1 {calcFrom} = {calcResult.rate} {calcTo}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Customer Storefront Preview:</span>
            <span className="font-bold text-amber-400">
              {calcResult?.formatted || '₹2,499'}
            </span>
          </div>
        </div>
      </div>

      {/* Languages & Locales Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-black text-white">Bilingual Storefront Engines (English & Hindi)</h3>
          </div>
          <span className="text-xs font-bold text-slate-400">2 Locales Enabled</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {languages.map((l) => (
            <div
              key={l.code}
              className={`p-4 rounded-xl border flex items-center justify-between ${
                language === l.code
                  ? 'bg-amber-400/10 border-amber-400/40'
                  : 'bg-slate-800/60 border-slate-700/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{l.flag}</span>
                <div>
                  <div className="text-sm font-black text-white flex items-center gap-2">
                    <span>{l.name}</span>
                    <span className="text-amber-400">({l.nativeName})</span>
                  </div>
                  <div className="text-xs text-slate-400">Locale Code: {l.code}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {language === l.code ? (
                  <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs">
                    Current Active
                  </span>
                ) : (
                  <button
                    onClick={() => setLanguage(l.code)}
                    className="px-3 py-1 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition-all"
                  >
                    Switch to {l.name}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
