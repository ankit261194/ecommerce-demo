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
  Layers,
  Search,
  Plus,
  Trash2,
  ArrowRightLeft,
  Tag,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import api from '../api/client';
import PincodeZoneManager from './PincodeZoneManager';

const INDIAN_STATES = [
  { name: 'Andhra Pradesh', code: '37' },
  { name: 'Assam', code: '18' },
  { name: 'Bihar', code: '10' },
  { name: 'Chandigarh', code: '04' },
  { name: 'Delhi', code: '07' },
  { name: 'Gujarat', code: '24' },
  { name: 'Haryana', code: '06' },
  { name: 'Karnataka', code: '29' },
  { name: 'Kerala', code: '32' },
  { name: 'Madhya Pradesh', code: '23' },
  { name: 'Maharashtra', code: '27' },
  { name: 'Punjab', code: '03' },
  { name: 'Rajasthan', code: '08' },
  { name: 'Tamil Nadu', code: '33' },
  { name: 'Telangana', code: '36' },
  { name: 'Uttar Pradesh', code: '09' },
  { name: 'West Bengal', code: '19' },
];

export default function TaxShippingManager({ onConfigSaved }) {
  const [activeSection, setActiveSection] = useState('gst-matrix'); // 'gst-matrix' | 'hsn-directory' | 'shipping' | 'simulator' | 'pincode'
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [saveErrorMessage, setSaveErrorMessage] = useState('');

  // Tax Matrix Settings
  const [taxMatrix, setTaxMatrix] = useState({
    isGstEnabled: true,
    calculationMode: 'INCLUSIVE',
    adminBusinessState: 'Delhi',
    adminStateCode: '07',
    adminGstin: '07AAAAA0000A1Z5',
    panNumber: 'AAAAA0000A',
    autoInterstateIgst: true,
    reverseChargeMechanism: false,
    slabs: [
      { rate: 0, name: 'Nil / Exempt (0%)', description: 'Essential fresh groceries, unprocessed foods, books, grains', isActive: true, isDefault: false },
      { rate: 5, name: 'Essential Goods (5%)', description: 'Packaged food staples, footwear under ₹1,000, cotton apparel, edible oils', isActive: true, isDefault: false },
      { rate: 12, name: 'Standard Low (12%)', description: 'Processed foods, business computers, mobile accessories, dairy products', isActive: true, isDefault: false },
      { rate: 18, name: 'Standard Standard (18%)', description: 'Electronics, headphones, IT hardware, footwear > ₹1,000, industrial components', isActive: true, isDefault: true },
      { rate: 28, name: 'Luxury & Sin (28%)', description: 'High-end luxury smart electronics, automobiles, air conditioners, aerated drinks', isActive: true, isDefault: false },
    ],
    hsnMappings: [
      { hsnCode: '85183000', category: 'Electronics', description: 'Headphones, earphones and acoustic sound headsets', gstRate: 18, cessRate: 0, isExempt: false },
      { hsnCode: '85176290', category: 'Wearables', description: 'Smartwatches, wireless communicators & wearable gadgets', gstRate: 18, cessRate: 0, isExempt: false },
      { hsnCode: '85044090', category: 'Accessories', description: 'Power banks, fast chargers and static converters', gstRate: 18, cessRate: 0, isExempt: false },
      { hsnCode: '61091000', category: 'Fashion & Apparel', description: 'T-shirts, singlets and vests of cotton, knitted or crocheted', gstRate: 5, cessRate: 0, isExempt: false },
      { hsnCode: '64039990', category: 'Footwear', description: 'Footwear with outer soles of rubber/plastic and leather upper', gstRate: 12, cessRate: 0, isExempt: false },
      { hsnCode: '91021100', category: 'Watches', description: 'Wrist-watches with mechanical or electronic display', gstRate: 18, cessRate: 0, isExempt: false },
      { hsnCode: '85287219', category: 'Home Entertainment', description: '4K Ultra-HD Smart televisions and smart displays', gstRate: 28, cessRate: 0, isExempt: false },
      { hsnCode: '04090000', category: 'Organic Foods', description: 'Natural organic honey and unprocessed farm goods', gstRate: 0, cessRate: 0, isExempt: true },
    ],
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

  // HSN Filter & Add Form State
  const [hsnSearch, setHsnSearch] = useState('');
  const [newHsn, setNewHsn] = useState({
    hsnCode: '',
    category: 'Electronics',
    description: '',
    gstRate: 18,
    cessRate: 0,
    isExempt: false,
  });
  const [showAddHsnModal, setShowAddHsnModal] = useState(false);

  // Live Simulator State
  const [simCartAmount, setSimCartAmount] = useState(1200);
  const [simSelectedHsn, setSimSelectedHsn] = useState('85183000');
  const [simShippingMethod, setSimShippingMethod] = useState('STANDARD');
  const [simPaymentMethod, setSimPaymentMethod] = useState('PREPAID');
  const [simOriginState, setSimOriginState] = useState('Delhi');
  const [simDestinationState, setSimDestinationState] = useState('Maharashtra');

  // Load Settings
  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const [taxRes, uiRes] = await Promise.allSettled([
        api.get('/admin/tax/settings'),
        api.get('/ui/config'),
      ]);

      if (taxRes.status === 'fulfilled' && taxRes.value.data?.success && taxRes.value.data.data) {
        setTaxMatrix(taxRes.value.data.data);
      }

      if (uiRes.status === 'fulfilled' && uiRes.value.data?.success && uiRes.value.data.data) {
        const d = uiRes.value.data.data;
        if (d.shipping) {
          setShippingSettings((prev) => ({ ...prev, ...d.shipping }));
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
      const [taxSaveRes, uiSaveRes] = await Promise.all([
        api.put('/admin/tax/settings', taxMatrix),
        api.put('/ui/config', {
          taxSettings: {
            enabled: taxMatrix.isGstEnabled,
            defaultGSTRate: taxMatrix.slabs.find((s) => s.isDefault)?.rate || 18,
            calculationMode: taxMatrix.calculationMode,
            companyName: 'AuraMarket E-Commerce Private Limited',
            gstin: taxMatrix.adminGstin,
            pan: taxMatrix.panNumber,
            state: taxMatrix.adminBusinessState,
            stateCode: taxMatrix.adminStateCode,
            defaultHsn: '85183000',
          },
          shipping: shippingSettings,
        }),
      ]);

      if (taxSaveRes.data?.success) {
        setSaveSuccessMessage('Dynamic GST Slabs Matrix, HSN Mappings & Shipping settings saved successfully!');
        if (onConfigSaved) onConfigSaved({ ...taxMatrix, shipping: shippingSettings });
      }
    } catch (err) {
      setSaveErrorMessage(err.response?.data?.message || 'Failed to update settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setTaxMatrix({
      isGstEnabled: true,
      calculationMode: 'INCLUSIVE',
      adminBusinessState: 'Delhi',
      adminStateCode: '07',
      adminGstin: '07AAAAA0000A1Z5',
      panNumber: 'AAAAA0000A',
      autoInterstateIgst: true,
      reverseChargeMechanism: false,
      slabs: [
        { rate: 0, name: 'Nil / Exempt (0%)', description: 'Essential fresh groceries, unprocessed foods, books, grains', isActive: true, isDefault: false },
        { rate: 5, name: 'Essential Goods (5%)', description: 'Packaged food staples, footwear under ₹1,000, cotton apparel, edible oils', isActive: true, isDefault: false },
        { rate: 12, name: 'Standard Low (12%)', description: 'Processed foods, business computers, mobile accessories, dairy products', isActive: true, isDefault: false },
        { rate: 18, name: 'Standard Standard (18%)', description: 'Electronics, headphones, IT hardware, footwear > ₹1,000, industrial components', isActive: true, isDefault: true },
        { rate: 28, name: 'Luxury & Sin (28%)', description: 'High-end luxury smart electronics, automobiles, air conditioners, aerated drinks', isActive: true, isDefault: false },
      ],
      hsnMappings: [
        { hsnCode: '85183000', category: 'Electronics', description: 'Headphones, earphones and acoustic sound headsets', gstRate: 18, cessRate: 0, isExempt: false },
        { hsnCode: '85176290', category: 'Wearables', description: 'Smartwatches, wireless communicators & wearable gadgets', gstRate: 18, cessRate: 0, isExempt: false },
        { hsnCode: '85044090', category: 'Accessories', description: 'Power banks, fast chargers and static converters', gstRate: 18, cessRate: 0, isExempt: false },
        { hsnCode: '61091000', category: 'Fashion & Apparel', description: 'T-shirts, singlets and vests of cotton, knitted or crocheted', gstRate: 5, cessRate: 0, isExempt: false },
        { hsnCode: '64039990', category: 'Footwear', description: 'Footwear with outer soles of rubber/plastic and leather upper', gstRate: 12, cessRate: 0, isExempt: false },
        { hsnCode: '91021100', category: 'Watches', description: 'Wrist-watches with mechanical or electronic display', gstRate: 18, cessRate: 0, isExempt: false },
        { hsnCode: '85287219', category: 'Home Entertainment', description: '4K Ultra-HD Smart televisions and smart displays', gstRate: 28, cessRate: 0, isExempt: false },
        { hsnCode: '04090000', category: 'Organic Foods', description: 'Natural organic honey and unprocessed farm goods', gstRate: 0, cessRate: 0, isExempt: true },
      ],
    });
    setSaveSuccessMessage('Reset to factory GST slabs and rules. Click "Save Settings" to persist.');
  };

  // HSN Operations
  const handleAddHsn = () => {
    if (!newHsn.hsnCode || !newHsn.description) {
      alert('Please provide HSN Code and Description');
      return;
    }
    const cleanCode = newHsn.hsnCode.trim();
    const existingIdx = taxMatrix.hsnMappings.findIndex((h) => h.hsnCode === cleanCode);
    let updated;
    if (existingIdx >= 0) {
      updated = [...taxMatrix.hsnMappings];
      updated[existingIdx] = { ...newHsn, hsnCode: cleanCode };
    } else {
      updated = [...taxMatrix.hsnMappings, { ...newHsn, hsnCode: cleanCode }];
    }
    setTaxMatrix((prev) => ({ ...prev, hsnMappings: updated }));
    setShowAddHsnModal(false);
    setNewHsn({
      hsnCode: '',
      category: 'Electronics',
      description: '',
      gstRate: 18,
      cessRate: 0,
      isExempt: false,
    });
  };

  const handleDeleteHsn = (hsnCode) => {
    setTaxMatrix((prev) => ({
      ...prev,
      hsnMappings: prev.hsnMappings.filter((h) => h.hsnCode !== hsnCode),
    }));
  };

  const setDefaultSlab = (rate) => {
    setTaxMatrix((prev) => ({
      ...prev,
      slabs: prev.slabs.map((s) => ({ ...s, isDefault: s.rate === rate })),
    }));
  };

  // Real-time calculation for Simulator
  const isIntraState = simOriginState.trim().toLowerCase() === simDestinationState.trim().toLowerCase();
  const selectedHsnObj = taxMatrix.hsnMappings.find((h) => h.hsnCode === simSelectedHsn);
  const activeSlabRate = taxMatrix.isGstEnabled
    ? (selectedHsnObj ? (selectedHsnObj.isExempt ? 0 : selectedHsnObj.gstRate) : 18)
    : 0;

  const isFreeDelivery = simCartAmount >= shippingSettings.freeShippingThreshold;
  const simShippingFee =
    simShippingMethod === 'EXPRESS'
      ? shippingSettings.expressShippingFee
      : isFreeDelivery
      ? 0
      : shippingSettings.defaultShippingFee;
  const simCodFee = simPaymentMethod === 'COD' ? shippingSettings.codFee : 0;

  let calculatedTaxable = simCartAmount;
  let calculatedTax = 0;

  if (taxMatrix.isGstEnabled && activeSlabRate > 0) {
    if (taxMatrix.calculationMode === 'EXCLUSIVE') {
      calculatedTaxable = simCartAmount;
      calculatedTax = Math.round((simCartAmount * activeSlabRate) / 100);
    } else {
      calculatedTaxable = Math.round((simCartAmount / (1 + activeSlabRate / 100)) * 100) / 100;
      calculatedTax = Math.round((simCartAmount - calculatedTaxable) * 100) / 100;
    }
  }

  const cgstAmount = isIntraState ? Math.round((calculatedTax / 2) * 100) / 100 : 0;
  const sgstAmount = isIntraState ? Math.round((calculatedTax - cgstAmount) * 100) / 100 : 0;
  const igstAmount = isIntraState ? 0 : calculatedTax;

  const simFinalPayable =
    taxMatrix.calculationMode === 'EXCLUSIVE'
      ? simCartAmount + calculatedTax + simShippingFee + simCodFee
      : simCartAmount + simShippingFee + simCodFee;

  const filteredHsnMappings = taxMatrix.hsnMappings.filter(
    (h) =>
      h.hsnCode.includes(hsnSearch) ||
      h.description.toLowerCase().includes(hsnSearch.toLowerCase()) ||
      h.category.toLowerCase().includes(hsnSearch.toLowerCase())
  );

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
                Dynamic Tax & GST Slab Matrix Engine
                <span className="text-xs bg-amber-400/10 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-400/20">
                  Point #4 (28 Master Features)
                </span>
              </h2>
              <p className="text-sm text-slate-400">
                0%, 5%, 12%, 18%, 28% GST Slabs Matrix, HSN Code Mapping, and State-to-State Auto-Switching CGST/SGST vs IGST Engine.
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
          <button onClick={() => setSaveSuccessMessage('')} className="text-xs text-slate-400 hover:text-white">
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
          <button onClick={() => setSaveErrorMessage('')} className="text-xs text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSection('gst-matrix')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSection === 'gst-matrix'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>5 GST Slabs Matrix</span>
        </button>

        <button
          onClick={() => setActiveSection('hsn-directory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSection === 'hsn-directory'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>HSN Code Directory ({taxMatrix.hsnMappings.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('simulator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSection === 'simulator'
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>State-to-State Tax Simulator</span>
        </button>

        <button
          onClick={() => setActiveSection('shipping')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSection === 'shipping'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Dynamic Shipping Charges</span>
        </button>

        <button
          onClick={() => setActiveSection('pincode')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSection === 'pincode'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Pincode Logistics Hub</span>
        </button>
      </div>

      {/* SECTION 1: 5 GST SLABS MATRIX */}
      {activeSection === 'gst-matrix' && (
        <div className="space-y-6 animate-fade-in">
          {/* Master Tax Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">GST Engine Global Parameters</h3>
                  <p className="text-xs text-slate-400">Master tax toggle, business GSTIN, and calculation rules</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-300">
                  {taxMatrix.isGstEnabled ? 'GST Enabled' : 'GST Disabled (0% Tax)'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxMatrix.isGstEnabled}
                    onChange={(e) => setTaxMatrix((prev) => ({ ...prev, isGstEnabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Business State & GSTIN Details */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Platform Operating State (Origin)
                </label>
                <select
                  value={taxMatrix.adminBusinessState}
                  onChange={(e) => {
                    const found = INDIAN_STATES.find((s) => s.name === e.target.value);
                    setTaxMatrix((prev) => ({
                      ...prev,
                      adminBusinessState: e.target.value,
                      adminStateCode: found ? found.code : '07',
                    }));
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-400"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.name}>
                      {s.name} (Code: {s.code})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Determines Intra vs Inter-State supply</span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Super Admin GSTIN (15 Digits)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={taxMatrix.adminGstin}
                  onChange={(e) => setTaxMatrix((prev) => ({ ...prev, adminGstin: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-400"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">State code prefix: {taxMatrix.adminStateCode}</span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Tax Calculation Mode
                </label>
                <select
                  value={taxMatrix.calculationMode}
                  onChange={(e) => setTaxMatrix((prev) => ({ ...prev, calculationMode: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-400"
                >
                  <option value="INCLUSIVE">Prices Inclusive of GST (MRP mode)</option>
                  <option value="EXCLUSIVE">Prices Exclusive (GST added at Checkout)</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Default for Indian E-Commerce is Inclusive</span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Auto Inter-State IGST Switching
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="autoIgst"
                    checked={taxMatrix.autoInterstateIgst}
                    onChange={(e) => setTaxMatrix((prev) => ({ ...prev, autoInterstateIgst: e.target.checked }))}
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <label htmlFor="autoIgst" className="text-xs text-slate-300">
                    Auto-split CGST+SGST vs IGST
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 5 GST Slabs Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Standard Indian GST 5-Slab Structure</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {taxMatrix.slabs.map((slab) => {
                const colorMap = {
                  0: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/40 text-emerald-400',
                  5: 'from-blue-500/20 to-blue-600/5 border-blue-500/40 text-blue-400',
                  12: 'from-amber-500/20 to-amber-600/5 border-amber-500/40 text-amber-400',
                  18: 'from-indigo-500/20 to-indigo-600/5 border-indigo-500/40 text-indigo-400',
                  28: 'from-rose-500/20 to-rose-600/5 border-rose-500/40 text-rose-400',
                };

                const hsnCount = taxMatrix.hsnMappings.filter((h) => h.gstRate === slab.rate).length;

                return (
                  <div
                    key={slab.rate}
                    className={`bg-gradient-to-b ${colorMap[slab.rate] || 'border-slate-800'} border rounded-3xl p-5 shadow-xl flex flex-col justify-between relative transition hover:scale-[1.02]`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl font-black font-mono">{slab.rate}%</span>
                        {slab.isDefault && (
                          <span className="text-[10px] bg-blue-500 text-white font-bold px-2 py-0.5 rounded-full">
                            DEFAULT
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-white text-sm mb-1">{slab.name}</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-4">{slab.description}</p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-800/80">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Mapped HSNs:</span>
                        <span className="font-bold text-white">{hsnCount} items</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDefaultSlab(slab.rate)}
                        disabled={slab.isDefault}
                        className={`w-full py-1.5 rounded-xl text-[11px] font-bold transition ${
                          slab.isDefault
                            ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 cursor-default'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {slab.isDefault ? 'Platform Default' : 'Set as Default'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: HSN CODE DIRECTORY & MAPPING */}
      {activeSection === 'hsn-directory' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Tag className="w-5 h-5 text-blue-400" />
                  <span>Harmonized System of Nomenclature (HSN) Directory</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Assign GST slabs to product categories and HSN codes for automatic invoice calculation.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search HSN code, name..."
                    value={hsnSearch}
                    onChange={(e) => setHsnSearch(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddHsnModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition whitespace-nowrap shadow-md shadow-blue-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add HSN Code</span>
                </button>
              </div>
            </div>

            {/* HSN Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">HSN / SAC</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Goods Description</th>
                    <th className="py-3 px-3 text-center">GST Slab</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredHsnMappings.map((hsn) => (
                    <tr key={hsn.hsnCode} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">{hsn.hsnCode}</td>
                      <td className="py-3 px-3 text-slate-300 font-medium">{hsn.category}</td>
                      <td className="py-3 px-3 text-slate-400 max-w-xs truncate">{hsn.description}</td>
                      <td className="py-3 px-3 text-center">
                        <select
                          value={hsn.gstRate}
                          onChange={(e) => {
                            const newRate = Number(e.target.value);
                            setTaxMatrix((prev) => ({
                              ...prev,
                              hsnMappings: prev.hsnMappings.map((item) =>
                                item.hsnCode === hsn.hsnCode
                                  ? { ...item, gstRate: newRate, isExempt: newRate === 0 }
                                  : item
                              ),
                            }));
                          }}
                          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-bold"
                        >
                          <option value="0">0% (Nil / Exempt)</option>
                          <option value="5">5% (Essential)</option>
                          <option value="12">12% (Standard Low)</option>
                          <option value="18">18% (Standard High)</option>
                          <option value="28">28% (Luxury)</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {hsn.isExempt ? (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                            Exempt
                          </span>
                        ) : (
                          <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold">
                            Taxable
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteHsn(hsn.hsnCode)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition"
                          title="Delete HSN"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredHsnMappings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        No HSN codes matched your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add HSN Modal */}
          {showAddHsnModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="font-bold text-white text-base flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-400" />
                    <span>Add / Map New HSN Code</span>
                  </h4>
                  <button
                    onClick={() => setShowAddHsnModal(false)}
                    className="text-slate-400 hover:text-white text-lg font-bold"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      HSN / SAC Code (6 to 8 Digits)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 84713010"
                      value={newHsn.hsnCode}
                      onChange={(e) => setNewHsn({ ...newHsn, hsnCode: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Computers & Laptops"
                      value={newHsn.category}
                      onChange={(e) => setNewHsn({ ...newHsn, category: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Personal portable automatic data processing computers"
                      value={newHsn.description}
                      onChange={(e) => setNewHsn({ ...newHsn, description: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">GST Slab Rate</label>
                    <select
                      value={newHsn.gstRate}
                      onChange={(e) => {
                        const r = Number(e.target.value);
                        setNewHsn({ ...newHsn, gstRate: r, isExempt: r === 0 });
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
                    >
                      <option value="0">0% (Nil / Exempt)</option>
                      <option value="5">5% (Essential Staples)</option>
                      <option value="12">12% (Standard Low)</option>
                      <option value="18">18% (Standard Standard)</option>
                      <option value="28">28% (Luxury Goods)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddHsnModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddHsn}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/20"
                  >
                    Save HSN Mapping
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: STATE-TO-STATE TAX SIMULATOR */}
      {activeSection === 'simulator' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">State-to-State Auto-Switching Tax Sandbox</h3>
                <p className="text-xs text-slate-400">
                  Verify how CGST/SGST vs IGST automatically split based on Origin State vs Destination State
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isIntraState ? (
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  INTRA-STATE (CGST + SGST)
                </span>
              ) : (
                <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  INTER-STATE (IGST 100%)
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Input Controls */}
            <div className="space-y-4 bg-slate-800/40 p-5 rounded-2xl border border-slate-800">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Origin State (Seller Hub):</label>
                <select
                  value={simOriginState}
                  onChange={(e) => setSimOriginState(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.name}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Destination State (Buyer Location):</label>
                <select
                  value={simDestinationState}
                  onChange={(e) => setSimDestinationState(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.name}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Select HSN / Commodity:</label>
                <select
                  value={simSelectedHsn}
                  onChange={(e) => setSimSelectedHsn(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {taxMatrix.hsnMappings.map((h) => (
                    <option key={h.hsnCode} value={h.hsnCode}>
                      {h.hsnCode} - {h.category} ({h.gstRate}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                  <span>Product Amount (₹):</span>
                  <span className="text-amber-400 font-mono font-black text-sm">₹{simCartAmount}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="100000"
                  step="100"
                  value={simCartAmount}
                  onChange={(e) => setSimCartAmount(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Tax Matrix Output */}
            <div className="md:col-span-2 bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between border-b border-slate-700 pb-3">
                <span>Tax Breakdown Analysis</span>
                <span className="text-[11px] text-blue-400 font-mono font-normal">
                  Calculation Mode: {taxMatrix.calculationMode}
                </span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Gross Amount</span>
                  <span className="text-base font-bold text-white font-mono">₹{simCartAmount.toLocaleString('en-IN')}</span>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Taxable Base</span>
                  <span className="text-base font-bold text-slate-200 font-mono">₹{calculatedTaxable.toLocaleString('en-IN')}</span>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Total GST ({activeSlabRate}%)</span>
                  <span className="text-base font-bold text-amber-400 font-mono">₹{calculatedTax.toLocaleString('en-IN')}</span>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Supply Route</span>
                  <span className={`text-xs font-black ${isIntraState ? 'text-emerald-400' : 'text-indigo-400'}`}>
                    {isIntraState ? 'Intra-State' : 'Inter-State'}
                  </span>
                </div>
              </div>

              {/* CGST / SGST vs IGST Table */}
              <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs py-1 text-slate-300 border-b border-slate-800/80">
                  <span>Supply Nature:</span>
                  <span className="font-semibold text-white">
                    {simOriginState} → {simDestinationState}
                  </span>
                </div>

                {isIntraState ? (
                  <>
                    <div className="flex justify-between text-xs py-1 text-emerald-300">
                      <span>Central GST (CGST @ {(activeSlabRate / 2).toFixed(1)}%):</span>
                      <span className="font-mono font-bold">₹{cgstAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 text-emerald-300">
                      <span>State GST (SGST @ {(activeSlabRate / 2).toFixed(1)}%):</span>
                      <span className="font-mono font-bold">₹{sgstAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 text-slate-500">
                      <span>Integrated GST (IGST @ 0%):</span>
                      <span className="font-mono">₹0.00</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-xs py-1 text-slate-500">
                      <span>Central GST (CGST @ 0%):</span>
                      <span className="font-mono">₹0.00</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 text-slate-500">
                      <span>State GST (SGST @ 0%):</span>
                      <span className="font-mono">₹0.00</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 text-indigo-300">
                      <span>Integrated GST (IGST @ {activeSlabRate}%):</span>
                      <span className="font-mono font-bold">₹{igstAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-700">
                  <span>Total Tax Included:</span>
                  <span className="text-amber-400 font-mono">₹{calculatedTax.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: DYNAMIC SHIPPING CHARGES */}
      {activeSection === 'shipping' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 animate-fade-in">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Free Shipping Minimum Order Value (₹)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Orders equal or exceeding this amount receive 100% FREE delivery.
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

            <div className="grid grid-cols-2 gap-3">
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
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Express Delivery Surcharge (₹)
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
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: PINCODE DELIVERY LOGISTICS */}
      {activeSection === 'pincode' && (
        <div className="space-y-4 animate-fade-in">
          <PincodeZoneManager />
        </div>
      )}
    </div>
  );
}
