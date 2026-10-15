import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Truck,
  CheckCircle,
  AlertTriangle,
  Save,
  RotateCcw,
  Percent,
  Sliders,
  DollarSign,
  ShieldCheck,
  Building,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Zap,
  MapPin,
} from 'lucide-react';
import api from '../api/client';

export default function TaxShippingManager({ onConfigSaved }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [saveErrorMessage, setSaveErrorMessage] = useState('');

  // Tax Settings State
  const [taxSettings, setTaxSettings] = useState({
    enabled: true,
    defaultGSTRate: 18,
    calculationMode: 'INCLUSIVE',
    companyName: 'AuraMarket E-Commerce Private Limited',
    gstin: '07AAAAA0000A1Z5',
    pan: 'AAAAA0000A',
    cin: 'U72900DL2026PTC389102',
    defaultHsn: '85183000',
    state: 'Delhi',
    stateCode: '07',
  });

  // Dynamic Shipping Settings State
  const [shippingSettings, setShippingSettings] = useState({
    enabled: true,
    freeShippingThreshold: 999,
    defaultShippingFee: 99,
    expressShippingFee: 149,
    codFee: 0,
    estimatedStandardDays: '2-4 business days',
    estimatedExpressDays: '24-48 hours',
  });

  // Live Simulator State
  const [simCartAmount, setSimCartAmount] = useState(1200);
  const [simShippingMethod, setSimShippingMethod] = useState('STANDARD');
  const [simPaymentMethod, setSimPaymentMethod] = useState('PREPAID');
  const [simDestinationState, setSimDestinationState] = useState('Delhi');

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/ui/config');
      if (res.data?.success && res.data.data) {
        const d = res.data.data;
        if (d.taxSettings) {
          setTaxSettings((prev) => ({
            ...prev,
            ...d.taxSettings,
          }));
        }
        if (d.shipping) {
          setShippingSettings((prev) => ({
            ...prev,
            ...d.shipping,
          }));
        }
      }
    } catch (err) {
      console.warn('Could not fetch tax/shipping config, using defaults:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccessMessage('');
    setSaveErrorMessage('');
    try {
      const res = await api.put('/ui/config', {
        taxSettings,
        shipping: shippingSettings,
      });
      if (res.data?.success) {
        setSaveSuccessMessage('Tax (GST) and Dynamic Shipping settings saved successfully!');
        if (onConfigSaved) onConfigSaved(res.data.data);
      }
    } catch (err) {
      setSaveErrorMessage(err.response?.data?.message || 'Failed to update settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setTaxSettings({
      enabled: true,
      defaultGSTRate: 18,
      calculationMode: 'INCLUSIVE',
      companyName: 'AuraMarket E-Commerce Private Limited',
      gstin: '07AAAAA0000A1Z5',
      pan: 'AAAAA0000A',
      cin: 'U72900DL2026PTC389102',
      defaultHsn: '85183000',
      state: 'Delhi',
      stateCode: '07',
    });
    setShippingSettings({
      enabled: true,
      freeShippingThreshold: 999,
      defaultShippingFee: 99,
      expressShippingFee: 149,
      codFee: 0,
      estimatedStandardDays: '2-4 business days',
      estimatedExpressDays: '24-48 hours',
    });
    setSaveSuccessMessage('Reset to factory recommended values. Click "Save Settings" to persist.');
  };

  // Real-time calculation for Simulator
  const isFreeDelivery = simCartAmount >= shippingSettings.freeShippingThreshold;
  const simShippingFee =
    simShippingMethod === 'EXPRESS'
      ? shippingSettings.expressShippingFee
      : isFreeDelivery
      ? 0
      : shippingSettings.defaultShippingFee;
  const simCodFee = simPaymentMethod === 'COD' ? shippingSettings.codFee : 0;

  const isIntraState =
    taxSettings.state.trim().toLowerCase() === simDestinationState.trim().toLowerCase();
  const gstRate = taxSettings.enabled ? taxSettings.defaultGSTRate : 0;

  let calculatedTax = 0;
  if (taxSettings.enabled && gstRate > 0) {
    if (taxSettings.calculationMode === 'EXCLUSIVE') {
      calculatedTax = Math.round((simCartAmount * gstRate) / 100);
    } else {
      calculatedTax = Math.round(simCartAmount - simCartAmount / (1 + gstRate / 100));
    }
  }

  const simFinalPayable =
    taxSettings.calculationMode === 'EXCLUSIVE'
      ? simCartAmount + calculatedTax + simShippingFee + simCodFee
      : simCartAmount + simShippingFee + simCodFee;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Tax (GST/VAT) & Dynamic Shipping Charges Engine
                <span className="text-xs bg-amber-400/10 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-400/20">
                  Point #48
                </span>
              </h2>
              <p className="text-sm text-slate-400">
                Configure GST/VAT calculation modes, intra-state vs inter-state tax splits, free shipping thresholds,
                standard/express delivery fees, and COD handling charges.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleResetDefaults}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition w-full md:w-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-400/20 transition w-full md:w-auto whitespace-nowrap"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMessage('')}
            className="text-xs text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {saveErrorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{saveErrorMessage}</span>
          </div>
          <button
            onClick={() => setSaveErrorMessage('')}
            className="text-xs text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Tax + Shipping Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ================= TAX (GST) ENGINE CARD ================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Tax (GST) Platform Engine</h3>
                <p className="text-xs text-slate-400">Goods and Services Tax calculation rules</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={taxSettings.enabled}
                onChange={(e) => setTaxSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* GST Rate Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Default GST Slab Rate (%):</span>
              <span className="text-blue-400 font-mono text-sm">{taxSettings.defaultGSTRate}%</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[0, 5, 12, 18, 28].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setTaxSettings((prev) => ({ ...prev, defaultGSTRate: rate }))}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    taxSettings.defaultGSTRate === rate
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>

          {/* Tax Calculation Mode */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              Tax Calculation Display Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTaxSettings((prev) => ({ ...prev, calculationMode: 'INCLUSIVE' }))}
                className={`p-3 rounded-2xl border text-left transition ${
                  taxSettings.calculationMode === 'INCLUSIVE'
                    ? 'bg-blue-600/10 border-blue-500/40 text-blue-300'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5 text-white">
                  <span>Inclusive of Tax</span>
                  {taxSettings.calculationMode === 'INCLUSIVE' && (
                    <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Product prices include GST. Invoice shows transparent CGST/SGST breakdown.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTaxSettings((prev) => ({ ...prev, calculationMode: 'EXCLUSIVE' }))}
                className={`p-3 rounded-2xl border text-left transition ${
                  taxSettings.calculationMode === 'EXCLUSIVE'
                    ? 'bg-blue-600/10 border-blue-500/40 text-blue-300'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5 text-white">
                  <span>Exclusive (Added at checkout)</span>
                  {taxSettings.calculationMode === 'EXCLUSIVE' && (
                    <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  GST is calculated and added onto product subtotal during final payment.
                </p>
              </button>
            </div>
          </div>

          {/* Tax Legal Identifiers */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tax Registration Details (Printed on Tax Invoices)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Company Legal Name
                </label>
                <input
                  type="text"
                  value={taxSettings.companyName}
                  onChange={(e) => setTaxSettings((prev) => ({ ...prev, companyName: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  GSTIN (15 Digits)
                </label>
                <input
                  type="text"
                  value={taxSettings.gstin}
                  onChange={(e) => setTaxSettings((prev) => ({ ...prev, gstin: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Base Origin State (for CGST/SGST)
                </label>
                <input
                  type="text"
                  value={taxSettings.state}
                  onChange={(e) => setTaxSettings((prev) => ({ ...prev, state: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Default HSN / SAC Code
                </label>
                <input
                  type="text"
                  value={taxSettings.defaultHsn}
                  onChange={(e) => setTaxSettings((prev) => ({ ...prev, defaultHsn: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================= DYNAMIC SHIPPING CHARGES CARD ================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Dynamic Shipping Charges Engine</h3>
                <p className="text-xs text-slate-400">Thresholds, flat delivery rates & express transit</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={shippingSettings.enabled}
                onChange={(e) => setShippingSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Free Shipping Threshold */}
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Free Shipping Minimum Order Value (₹)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Orders equal or exceeding this amount receive 100% FREE standard delivery.
                </p>
              </div>
              <span className="text-xl font-black text-emerald-400 font-mono">
                ₹{shippingSettings.freeShippingThreshold}
              </span>
            </div>
            <input
              type="number"
              min="0"
              step="50"
              value={shippingSettings.freeShippingThreshold}
              onChange={(e) =>
                setShippingSettings((prev) => ({
                  ...prev,
                  freeShippingThreshold: Number(e.target.value),
                }))
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-400 font-mono"
            />
          </div>

          {/* Standard Delivery Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Standard Shipping Fee (₹)
              </label>
              <input
                type="number"
                min="0"
                value={shippingSettings.defaultShippingFee}
                onChange={(e) =>
                  setShippingSettings((prev) => ({
                    ...prev,
                    defaultShippingFee: Number(e.target.value),
                  }))
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-400 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Applied when cart &lt; ₹{shippingSettings.freeShippingThreshold}
              </span>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Estimated Standard Delivery Transit
              </label>
              <input
                type="text"
                value={shippingSettings.estimatedStandardDays}
                onChange={(e) =>
                  setShippingSettings((prev) => ({
                    ...prev,
                    estimatedStandardDays: e.target.value,
                  }))
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-400"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Displayed on Product Detail Page</span>
            </div>
          </div>

          {/* Express & COD Surcharge Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Express Delivery Surcharge (₹)
              </label>
              <input
                type="number"
                min="0"
                value={shippingSettings.expressShippingFee}
                onChange={(e) =>
                  setShippingSettings((prev) => ({
                    ...prev,
                    expressShippingFee: Number(e.target.value),
                  }))
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Next-day / Same-day express charge</span>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Cash on Delivery (COD) Fee (₹)
              </label>
              <input
                type="number"
                min="0"
                value={shippingSettings.codFee}
                onChange={(e) =>
                  setShippingSettings((prev) => ({
                    ...prev,
                    codFee: Number(e.target.value),
                  }))
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-400 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">0 = Free Cash on Delivery</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= LIVE INTERACTIVE CHECKOUT SIMULATOR ================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-white text-base">Live Interactive Checkout Simulator</h3>
              <p className="text-xs text-slate-400">
                Test how your tax and shipping rules calculate dynamically for customer checkouts in real-time.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            Real-Time Engine Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Simulator Inputs */}
          <div className="md:col-span-2 space-y-4 p-4 bg-slate-800/40 rounded-2xl border border-slate-800">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                <span>Simulated Cart Subtotal:</span>
                <span className="text-amber-400 font-mono text-sm">₹{simCartAmount}</span>
              </div>
              <input
                type="range"
                min="200"
                max="3000"
                step="50"
                value={simCartAmount}
                onChange={(e) => setSimCartAmount(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>₹200 (Under Threshold)</span>
                <span>₹{shippingSettings.freeShippingThreshold} (Free Line)</span>
                <span>₹3,000</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Shipping Option:
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSimShippingMethod('STANDARD')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition ${
                      simShippingMethod === 'STANDARD'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimShippingMethod('EXPRESS')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition ${
                      simShippingMethod === 'EXPRESS'
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    Express
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Destination State:
                </label>
                <select
                  value={simDestinationState}
                  onChange={(e) => setSimDestinationState(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                >
                  <option value="Delhi">Delhi (Intra-state: CGST + SGST)</option>
                  <option value="Maharashtra">Maharashtra (Inter-state: IGST)</option>
                  <option value="Karnataka">Karnataka (Inter-state: IGST)</option>
                  <option value="Uttar Pradesh">Uttar Pradesh (Inter-state: IGST)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Simulator Bill Receipt */}
          <div className="md:col-span-2 p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Customer Order Summary Preview</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {taxSettings.calculationMode} mode
              </span>
            </h4>

            <div className="space-y-1.5 text-xs border-b border-slate-700 pb-2.5">
              <div className="flex justify-between text-slate-300">
                <span>Items Subtotal:</span>
                <span className="font-mono">₹{simCartAmount.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span className="flex items-center gap-1">
                  Delivery Charges:
                  {isFreeDelivery && simShippingMethod === 'STANDARD' && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1 rounded font-bold">
                      FREE!
                    </span>
                  )}
                </span>
                <span className="font-mono">
                  {simShippingFee === 0 ? (
                    <span className="text-emerald-400 font-bold">FREE</span>
                  ) : (
                    `₹${simShippingFee}`
                  )}
                </span>
              </div>

              {simCodFee > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>COD Handling Fee:</span>
                  <span className="font-mono">₹{simCodFee}</span>
                </div>
              )}

              {/* Tax Details */}
              <div className="flex justify-between text-slate-400 text-[11px] pt-1">
                <span>
                  {isIntraState
                    ? `CGST (${(gstRate / 2).toFixed(1)}%) + SGST (${(gstRate / 2).toFixed(1)}%):`
                    : `IGST (${gstRate}%):`}
                </span>
                <span className="font-mono">
                  ₹{calculatedTax.toLocaleString('en-IN')}{' '}
                  <span className="text-[10px]">({taxSettings.calculationMode.toLowerCase()})</span>
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-black text-white">Estimated Payable:</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                ₹{simFinalPayable.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
