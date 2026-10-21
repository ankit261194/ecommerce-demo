import React, { useState, useEffect } from 'react';
import {
  Globe,
  Plane,
  Truck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Clock,
  ArrowRight,
  X,
  RefreshCw,
  Scale,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import api from '../api/client';
import { useLocalization } from '../context/LocalizationContext';

export const InternationalShippingModal = ({ isOpen, onClose, initialCartTotal = 2500, initialWeightKg = 0.8 }) => {
  const { currency, formatPrice } = useLocalization();

  const [destinationCountry, setDestinationCountry] = useState('US');
  const [weightKg, setWeightKg] = useState(initialWeightKg);
  const [cartTotal, setCartTotal] = useState(initialCartTotal);
  const [loading, setLoading] = useState(false);
  const [quoteData, setQuoteData] = useState(null);
  const [error, setError] = useState('');

  // Sample destination countries
  const countries = [
    { code: 'US', name: 'United States of America', flag: '🇺🇸', zone: 'North America' },
    { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', zone: 'Middle East GCC' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', zone: 'Europe' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪', zone: 'European Union' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦', zone: 'North America' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺', zone: 'Asia-Pacific' },
    { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', zone: 'Middle East GCC' },
    { code: 'SG', name: 'Singapore', flag: '🇸🇬', zone: 'Asia-Pacific' },
  ];

  const fetchQuotes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/shipping/international/quotes', {
        destinationCountry,
        weightKg: Number(weightKg),
        cartTotal: Number(cartTotal),
        currency,
        hsCodes: ['8518.30.00'],
      });
      if (res.data?.success) {
        setQuoteData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch international shipping quotes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchQuotes();
    }
  }, [isOpen, destinationCountry, weightKg, cartTotal, currency]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0f2444] to-[#1e3a8a] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">Cross-Border International Shipping</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                  Point #51
                </span>
              </div>
              <p className="text-xs text-blue-200 font-medium">Delivered Duty Paid (DDP) Customs & Carrier Calculator</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Controls */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Destination Country */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Destination Country
              </label>
              <select
                value={destinationCountry}
                onChange={e => setDestinationCountry(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {countries.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Consignment Weight */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Gross Weight</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">{weightKg} kg</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="30"
                value={weightKg}
                onChange={e => setWeightKg(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>

            {/* Merchandise Value */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Declared Cart Value (INR)
              </label>
              <input
                type="number"
                step="100"
                min="0"
                value={cartTotal}
                onChange={e => setCartTotal(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* DDP Assurance Notice */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs">
              <p className="font-black text-emerald-900 dark:text-emerald-200">
                100% Guaranteed Delivered Duty Paid (DDP)
              </p>
              <p className="text-emerald-700 dark:text-emerald-400 leading-relaxed text-[11px]">
                All customs clearance fees, import duties, and border taxes are collected upfront. No surprise fees upon delivery at destination.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Carrier Options List */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
              <p className="text-xs font-medium">Calculating customs slabs & carrier rates...</p>
            </div>
          ) : quoteData?.quotes ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold uppercase tracking-wider text-[10px]">
                  Available Carrier Services for {quoteData.zoneName}
                </span>
                {quoteData.isDutyExempt && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-black">
                    Under De Minimis Threshold (Duty Free)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quoteData.quotes.map((quote, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3 hover:border-amber-500 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Plane className="w-3.5 h-3.5 text-amber-500" />
                          <span>{quote.carrierName}</span>
                        </h4>
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px] font-black uppercase">
                          {quote.serviceCode}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-amber-600 dark:text-amber-400">
                          {formatPrice(quote.shippingFeeBase)}
                        </span>
                        <p className="text-[10px] text-slate-400">Freight Cost</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] space-y-1 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Estimated Transit:</span>
                        </span>
                        <strong className="text-slate-800 dark:text-slate-200">{quote.estimatedDeliveryDays}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Customs Duty + VAT:</span>
                        <strong className="text-slate-800 dark:text-slate-200">{formatPrice(quote.customsDutyAndTaxBase)}</strong>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700/60 font-bold text-slate-900 dark:text-white">
                        <span>Total Landed Cost:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-black">
                          {formatPrice(quote.shippingFeeBase + quote.customsDutyAndTaxBase)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Documentation Footnote */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Mandatory Documents: Commercial Invoice & CN22 Export Declaration</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">HS Code: 8518.30.00</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Active Currency: <strong className="text-slate-900 dark:text-white font-mono">{currency}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
          >
            Close Calculator
          </button>
        </div>
      </div>
    </div>
  );
};
