import React, { useState, useRef, useEffect } from 'react';
import { Globe, DollarSign, ChevronDown, Check } from 'lucide-react';
import { useLocalization } from '../context/LocalizationContext';

export default function LocalizationSelector({ variant = 'navbar', className = '' }) {
  const { currency, setCurrency, language, setLanguage, currencies, languages, activeCurrencyConfig, t } =
    useLocalization();

  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null); // 'currency' | 'language' | null
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setActiveDropdown(null);
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLang = languages.find((l) => l.code === language) || languages[0];

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1.5 text-xs font-bold ${className}`} ref={containerRef}>
        {/* Currency Switcher */}
        <div className="relative">
          <button
            onClick={() => setActiveDropdown(activeDropdown === 'currency' ? null : 'currency')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all text-xs"
            title="Switch Currency"
          >
            <span>{activeCurrencyConfig?.flag}</span>
            <span className="font-black text-amber-400">{activeCurrencyConfig?.symbol}</span>
            <span className="text-[11px] text-slate-300">{currency}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {activeDropdown === 'currency' && (
            <div className="absolute right-0 mt-1.5 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1 text-[10px] font-black uppercase text-slate-400 border-b border-slate-800 mb-1">
                Select Currency
              </div>
              {currencies.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    setCurrency(c.code);
                    setActiveDropdown(null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-800 transition-all ${
                    currency === c.code ? 'text-amber-400 font-bold bg-slate-800/60' : 'text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{c.flag}</span>
                    <span className="font-mono font-bold text-amber-300/90">{c.symbol}</span>
                    <span>{c.code}</span>
                  </span>
                  {currency === c.code && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Language Switcher */}
        <div className="relative">
          <button
            onClick={() => setActiveDropdown(activeDropdown === 'language' ? null : 'language')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all text-xs"
            title="Switch Language"
          >
            <span>{activeLang?.flag}</span>
            <span className="text-[11px] text-slate-300">{activeLang?.nativeName || activeLang?.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {activeDropdown === 'language' && (
            <div className="absolute right-0 mt-1.5 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1 text-[10px] font-black uppercase text-slate-400 border-b border-slate-800 mb-1">
                Select Language
              </div>
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLanguage(l.code);
                    setActiveDropdown(null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-800 transition-all ${
                    language === l.code ? 'text-amber-400 font-bold bg-slate-800/60' : 'text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{l.flag}</span>
                    <span>{l.nativeName}</span>
                  </span>
                  {language === l.code && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default Navbar / Topbar Pill Variant
  return (
    <div className={`flex items-center gap-2 ${className}`} ref={containerRef}>
      {/* Currency Dropdown */}
      <div className="relative">
        <button
          onClick={() => setActiveDropdown(activeDropdown === 'currency' ? null : 'currency')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-100 border border-slate-700/80 shadow-sm transition-all text-xs font-bold"
          aria-label="Currency Selector"
        >
          <span className="text-sm">{activeCurrencyConfig?.flag}</span>
          <span className="font-extrabold text-amber-400">{activeCurrencyConfig?.symbol}</span>
          <span className="text-slate-300 text-[11px]">{currency}</span>
          <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
        </button>

        {activeDropdown === 'currency' && (
          <div className="absolute right-0 mt-2 w-52 bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
            <div className="px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1 flex items-center justify-between">
              <span>{t('currency', 'Currency')}</span>
              <span className="text-amber-400/80 font-normal">Real-Time Rates</span>
            </div>
            {currencies.map((c) => (
              <button
                key={c.code}
                onClick={() => {
                  setCurrency(c.code);
                  setActiveDropdown(null);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs transition-all ${
                  currency === c.code
                    ? 'text-amber-400 font-black bg-amber-400/10'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{c.flag}</span>
                  <div className="text-left">
                    <div className="font-bold flex items-center gap-1.5">
                      <span className="font-mono text-amber-300">{c.symbol}</span>
                      <span>{c.code}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">{c.name}</div>
                  </div>
                </div>
                {currency === c.code && <Check className="w-4 h-4 text-amber-400" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Language Toggle Pill */}
      <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 shadow-sm text-xs font-bold">
        {languages.map((l) => {
          const isSelected = language === l.code;
          return (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all text-xs ${
                isSelected
                  ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.nativeName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
