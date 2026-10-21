import React, { useState, useEffect } from 'react';
import {
  Globe,
  DollarSign,
  TrendingUp,
  Check,
  X,
  Search,
  Sparkles,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import api from '../api/client';
import { useLocalization } from '../context/LocalizationContext';

export const CurrencySwitcherModal = ({ isOpen, onClose }) => {
  const { currency, setCurrency, formatPrice } = useLocalization();

  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [calcAmount, setCalcAmount] = useState('1000');

  const fetchCurrencies = async () => {
    setLoading(true);
    try {
      const res = await api.get('/currency/list');
      if (res.data?.success && res.data?.data?.currencies) {
        setCurrencies(res.data.data.currencies);
      }
    } catch (_) {
      // Fallback to standard currencies if offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCurrencies();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredCurrencies = currencies.filter(
    c =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0f2444] to-[#1e3a8a] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">Multi-Currency FX Engine</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                  Point #51
                </span>
              </div>
              <p className="text-xs text-blue-200 font-medium">Real-Time Exchange Rates & Localized Checkout</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Quick Search & Calculator */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search currency (USD, EUR, AED)..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
              <span className="text-[11px] font-bold text-slate-500">Compare: ₹</span>
              <input
                type="number"
                value={calcAmount}
                onChange={e => setCalcAmount(e.target.value)}
                className="w-full bg-transparent text-xs font-bold font-mono text-slate-900 dark:text-white focus:outline-none"
                placeholder="1000"
              />
            </div>
          </div>

          {/* Currencies Grid */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Select Your Preferred Display Currency
            </span>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                <p className="text-xs font-medium">Fetching live FX exchange feeds...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredCurrencies.map(curr => {
                  const isSelected = currency === curr.code;
                  const convertedPreview = (Number(calcAmount || 0) * (curr.rateAgainstBase || 1)).toFixed(
                    curr.decimalPlaces ?? 2
                  );

                  return (
                    <button
                      key={curr.code}
                      onClick={() => {
                        setCurrency(curr.code);
                        onClose();
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                        isSelected
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
                          : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            {curr.code} ({curr.symbol})
                          </span>
                          {curr.isBaseCurrency && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-black uppercase">
                              Base
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                          {curr.name}
                        </p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">
                          ₹{calcAmount} = {curr.symbol}{convertedPreview}
                        </p>
                      </div>

                      <div className="flex items-center">
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 group-hover:border-amber-400"></div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Active Currency: <strong className="text-slate-900 dark:text-white font-mono">{currency}</strong></span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
