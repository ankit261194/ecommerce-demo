import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Search,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Truck,
  CreditCard,
  Banknote,
  RefreshCw,
  AlertTriangle,
  Zap,
  Globe,
  Database,
  Check,
  ChevronLeft,
  ChevronRight,
  Sliders,
  ShieldAlert,
  Layers,
  Save,
  X
} from 'lucide-react';
import api from '../api/client';

export default function PincodeZoneManager() {
  const [pincodes, setPincodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [stats, setStats] = useState({ totalCount: 0, deliverableCount: 0, codCount: 0, metroCount: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Zone Breakdown Summaries (Point #10)
  const [zoneSummaries, setZoneSummaries] = useState([]);

  // Zone Bulk Config Modal State (Point #10)
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState('METRO');
  const [zoneConfig, setZoneConfig] = useState({
    isDeliverable: true,
    isCodAvailable: true,
    standardShippingFee: 49,
    expressShippingFee: 99,
    expressAvailable: true,
    minOrderForFreeShipping: 799,
    estimatedDays: 2,
  });
  const [zoneSaving, setZoneSaving] = useState(false);
  
  // Quick test state
  const [testPin, setTestPin] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState('');

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    pincode: '',
    city: '',
    state: '',
    district: '',
    zone: 'TIER_1',
    isDeliverable: true,
    isCodAvailable: true,
    estimatedDays: 3,
    estimatedDeliveryText: '2-3 Business Days',
    standardShippingFee: 49,
    expressShippingFee: 99,
    expressAvailable: true,
    minOrderForFreeShipping: 999,
    remarks: '',
  });
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchPincodes = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
      if (zoneFilter) params.zone = zoneFilter;

      const res = await api.get('/pincodes', { params });
      if (res.data?.success) {
        setPincodes(res.data.data || []);
        if (res.data.pagination) setPagination(res.data.pagination);
        if (res.data.stats) setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Error fetching pincodes:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchZoneSummary = async () => {
    try {
      const res = await api.get('/pincodes/zones/summary');
      if (res.data?.success) {
        setZoneSummaries(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching zone summaries:', err);
    }
  };

  useEffect(() => {
    fetchPincodes(1);
    fetchZoneSummary();
  }, [zoneFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPincodes(1);
  };

  const handleSeedDefaults = async () => {
    try {
      setLoading(true);
      const res = await api.post('/pincodes/seed-defaults');
      if (res.data?.success) {
        setActionSuccess('Core delivery zones seeded successfully!');
        fetchPincodes(1);
        fetchZoneSummary();
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to seed default pincodes');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCod = async (id) => {
    try {
      const res = await api.patch(`/pincodes/${id}/toggle-cod`);
      if (res.data?.success) {
        setActionSuccess(res.data.message);
        fetchPincodes(pagination.page);
        fetchZoneSummary();
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle COD');
    }
  };

  const handleToggleDelivery = async (id) => {
    try {
      const res = await api.patch(`/pincodes/${id}/toggle-delivery`);
      if (res.data?.success) {
        setActionSuccess(res.data.message);
        fetchPincodes(pagination.page);
        fetchZoneSummary();
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle delivery');
    }
  };

  const openZoneConfig = (zoneItem) => {
    setSelectedZone(zoneItem.zone);
    setZoneConfig({
      isDeliverable: zoneItem.isDeliverableGlobally !== false,
      isCodAvailable: zoneItem.isCodEnabledGlobally !== false,
      standardShippingFee: zoneItem.avgStandardFee || 49,
      expressShippingFee: zoneItem.avgExpressFee || 99,
      expressAvailable: true,
      minOrderForFreeShipping: zoneItem.zone === 'METRO' ? 499 : 799,
      estimatedDays: zoneItem.zone === 'METRO' ? 1 : zoneItem.zone === 'REMOTE' ? 6 : 3,
    });
    setShowZoneModal(true);
  };

  const handleSaveZoneConfig = async (e) => {
    e.preventDefault();
    setZoneSaving(true);
    try {
      const res = await api.put(`/pincodes/zones/${selectedZone}/config`, zoneConfig);
      if (res.data?.success) {
        setShowZoneModal(false);
        setActionSuccess(res.data.message);
        fetchPincodes(pagination.page);
        fetchZoneSummary();
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update zone configuration');
    } finally {
      setZoneSaving(false);
    }
  };

  const handleQuickTest = async () => {
    if (!testPin || testPin.length !== 6) {
      setTestError('Please enter a valid 6-digit pincode');
      return;
    }
    setTestLoading(true);
    setTestError('');
    setTestResult(null);
    try {
      const res = await api.get(`/pincodes/check/${testPin}`);
      if (res.data?.success) {
        setTestResult(res.data.data);
      } else {
        setTestError(res.data?.message || 'Serviceability check failed');
      }
    } catch (err) {
      setTestError(err.response?.data?.message || 'Error checking pincode');
    } finally {
      setTestLoading(false);
    }
  };

  const openAddModal = () => {
    setModalMode('add');
    setEditingId(null);
    setFormData({
      pincode: '',
      city: '',
      state: '',
      district: '',
      zone: 'TIER_1',
      isDeliverable: true,
      isCodAvailable: true,
      estimatedDays: 3,
      estimatedDeliveryText: '2-3 Business Days',
      standardShippingFee: 49,
      expressShippingFee: 99,
      expressAvailable: true,
      minOrderForFreeShipping: 999,
      remarks: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setModalMode('edit');
    setEditingId(item._id);
    setFormData({
      pincode: item.pincode,
      city: item.city,
      state: item.state,
      district: item.district || '',
      zone: item.zone || 'TIER_1',
      isDeliverable: item.isDeliverable ?? true,
      isCodAvailable: item.isCodAvailable ?? true,
      estimatedDays: item.estimatedDays ?? 3,
      estimatedDeliveryText: item.estimatedDeliveryText || '',
      standardShippingFee: item.standardShippingFee ?? 49,
      expressShippingFee: item.expressShippingFee ?? 99,
      expressAvailable: item.expressAvailable ?? true,
      minOrderForFreeShipping: item.minOrderForFreeShipping ?? 999,
      remarks: item.remarks || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!formData.pincode || !/^\d{6}$/.test(formData.pincode)) {
      setFormError('Pincode must be exactly 6 digits');
      return;
    }
    if (!formData.city || !formData.state) {
      setFormError('City and State are required');
      return;
    }

    setFormSaving(true);
    setFormError('');
    try {
      if (modalMode === 'add') {
        const res = await api.post('/pincodes', formData);
        if (res.data?.success) {
          setShowModal(false);
          setActionSuccess(`Pincode ${formData.pincode} configured successfully!`);
          fetchPincodes(1);
          fetchZoneSummary();
          setTimeout(() => setActionSuccess(''), 3000);
        }
      } else {
        const res = await api.put(`/pincodes/${editingId}`, formData);
        if (res.data?.success) {
          setShowModal(false);
          setActionSuccess(`Pincode ${formData.pincode} updated successfully!`);
          fetchPincodes(pagination.page);
          fetchZoneSummary();
          setTimeout(() => setActionSuccess(''), 3000);
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save pincode');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (id, pin) => {
    if (!window.confirm(`Are you sure you want to delete pincode rule for ${pin}?`)) return;
    try {
      const res = await api.delete(`/pincodes/${id}`);
      if (res.data?.success) {
        setActionSuccess(`Rule for ${pin} deleted.`);
        fetchPincodes(pagination.page);
        fetchZoneSummary();
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete pincode rule');
    }
  };
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/40 border border-amber-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-semibold mb-3">
              <Truck className="w-3.5 h-3.5" />
              <span>Point #1 & Point #10 Delivery Logistics Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Pincode & Delivery Zone Logistics Manager
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
              Full enterprise logistics command: manage Metro, Tier 1/2, Remote & Special zones, live standard/express shipping fees, bulk COD enable/disable per zone, and 6-digit postal coverage.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleSeedDefaults}
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/80 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-sm"
              title="Seed core Indian metro hubs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Seed Default Hubs</span>
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Pincode Rule</span>
            </button>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-sm flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Point #10: Zone-Level Logistics Overview & Bulk Control Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Zone-Level Logistics & Bulk COD Controls (Point #10)</span>
          </h3>
          <span className="text-xs text-slate-400">1-Click bulk configure all pincodes per delivery zone</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {zoneSummaries.map((z) => (
            <div
              key={z.zone}
              className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {z.zone}
                  </span>
                  <span className="text-xs font-mono text-slate-400">{z.total} Pincodes</span>
                </div>

                <div className="space-y-1.5 mt-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Delivery:</span>
                    <span className={z.deliverable > 0 ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                      {z.deliverable}/{z.total} Allowed
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">COD Status:</span>
                    <span className={z.codAvailable > 0 ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                      {z.codAvailable > 0 ? `${z.codAvailable} Active` : 'Prepaid Only'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Standard Fee:</span>
                    <span className="text-white font-mono font-bold">
                      {z.avgStandardFee === 0 ? 'FREE' : `₹${z.avgStandardFee}`}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openZoneConfig(z)}
                className="mt-4 w-full py-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Configure {z.zone}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Simulator / Quick Inspector Bar */}
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Live Customer Pincode Serviceability Inspector
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">Verifies live customer PDP/Cart resolution, transit days & COD lock</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={testPin}
              onChange={(e) => setTestPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter any 6-digit Pincode (e.g. 110001, 400001, 190001, 799001, 999999)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>
          <button
            type="button"
            onClick={handleQuickTest}
            disabled={testLoading || testPin.length !== 6}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md"
          >
            {testLoading ? 'Checking...' : 'Inspect Serviceability'}
          </button>
        </div>

        {testError && (
          <p className="mt-2 text-xs text-rose-400 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> {testError}
          </p>
        )}

        {testResult && (
          <div className="mt-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
            <div>
              <span className="text-slate-400 text-[10px] block">Location:</span>
              <strong className="text-white text-sm">{testResult.city}, {testResult.state}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Deliverability:</span>
              {testResult.isDeliverable ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Deliverable ({testResult.zone})
                </span>
              ) : (
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Blocked / Non-Serviceable
                </span>
              )}
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Payment Availability:</span>
              {testResult.isCodAvailable ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5" /> COD + Online Accepted
                </span>
              ) : (
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" /> Prepaid Only (COD Disabled)
                </span>
              )}
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Estimated Transit & Fee:</span>
              <strong className="text-amber-400 text-sm">{testResult.estimatedDeliveryText}</strong>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Std: ₹{testResult.standardShippingFee} | Express: ₹{testResult.expressShippingFee}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by 6-digit PIN, city, or state..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
          >
            <option value="">All Zones</option>
            <option value="METRO">Metro</option>
            <option value="TIER_1">Tier 1</option>
            <option value="TIER_2">Tier 2</option>
            <option value="REMOTE">Remote</option>
            <option value="SPECIAL">Special</option>
          </select>
        </div>
      </div>
      {/* Pincodes Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Pincode</th>
                <th className="py-3 px-4">Region / City</th>
                <th className="py-3 px-4">Zone</th>
                <th className="py-3 px-4">Serviceability (Click to Toggle)</th>
                <th className="py-3 px-4">COD (Click to Toggle)</th>
                <th className="py-3 px-4">Transit / ETA</th>
                <th className="py-3 px-4">Charges</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading delivery zones...
                  </td>
                </tr>
              ) : pincodes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No custom pincode rules found. Click "Seed Default Hubs" or "Add Pincode Rule" to configure.
                  </td>
                </tr>
              ) : (
                pincodes.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      {item.pincode}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{item.city}</div>
                      <div className="text-[10px] text-slate-400">{item.state}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {item.zone}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleDelivery(item._id)}
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full transition ${
                          item.isDeliverable
                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
                        }`}
                        title="Click to toggle delivery status"
                      >
                        {item.isDeliverable ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Deliverable
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" /> Blocked
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleCod(item._id)}
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full transition ${
                          item.isCodAvailable
                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
                        }`}
                        title="Click to toggle COD status"
                      >
                        {item.isCodAvailable ? (
                          <>
                            <Banknote className="w-3.5 h-3.5" /> COD Active
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-3.5 h-3.5" /> Prepaid Only
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-200">{item.estimatedDeliveryText || `${item.estimatedDays} Days`}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[11px]">
                        Std: <strong className="text-white">{item.standardShippingFee === 0 ? 'FREE' : `₹${item.standardShippingFee}`}</strong>
                        {item.expressAvailable && (
                          <span className="text-slate-400 block text-[10px]">
                            Exp: ₹{item.expressShippingFee}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1 text-slate-400 hover:text-amber-400 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item._id, item.pincode)}
                          className="p-1 text-slate-400 hover:text-rose-400 transition"
                          title="Delete"
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

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} rules)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fetchPincodes(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => fetchPincodes(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Point #10: Zone-Level Bulk Logistics Configuration Modal */}
      {showZoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Bulk Configure Zone Logistics: {selectedZone}
                </h3>
              </div>
              <button
                onClick={() => setShowZoneModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveZoneConfig} className="p-5 space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
                Any changes made here will be instantly applied across <strong className="text-amber-400">ALL pincodes</strong> currently registered under the <strong className="text-white">{selectedZone}</strong> logistics zone.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <input
                    type="checkbox"
                    id="zoneDeliverable"
                    checked={zoneConfig.isDeliverable}
                    onChange={(e) => setZoneConfig({ ...zoneConfig, isDeliverable: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="zoneDeliverable" className="text-xs text-slate-200 font-semibold cursor-pointer">
                    Enable Delivery Coverage
                  </label>
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <input
                    type="checkbox"
                    id="zoneCod"
                    checked={zoneConfig.isCodAvailable}
                    onChange={(e) => setZoneConfig({ ...zoneConfig, isCodAvailable: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="zoneCod" className="text-xs text-slate-200 font-semibold cursor-pointer">
                    Enable Cash on Delivery (COD)
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Standard Delivery Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={zoneConfig.standardShippingFee}
                    onChange={(e) => setZoneConfig({ ...zoneConfig, standardShippingFee: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Express Delivery Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={zoneConfig.expressShippingFee}
                    onChange={(e) => setZoneConfig({ ...zoneConfig, expressShippingFee: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Free Shipping Above (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={zoneConfig.minOrderForFreeShipping}
                    onChange={(e) => setZoneConfig({ ...zoneConfig, minOrderForFreeShipping: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Estimated Transit Days</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={zoneConfig.estimatedDays}
                    onChange={(e) => setZoneConfig({ ...zoneConfig, estimatedDays: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowZoneModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={zoneSaving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{zoneSaving ? 'Applying...' : `Apply to All ${selectedZone} Pincodes`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Individual Pincode Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
              <h3 className="text-base font-bold text-white">
                {modalMode === 'add' ? 'Add Delivery Pincode Rule' : `Edit Pincode: ${formData.pincode}`}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">6-Digit PIN *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    disabled={modalMode === 'edit'}
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })}
                    placeholder="e.g. 110001"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white disabled:opacity-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Logistics Zone *</label>
                  <select
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="METRO">METRO</option>
                    <option value="TIER_1">TIER_1</option>
                    <option value="TIER_2">TIER_2</option>
                    <option value="REMOTE">REMOTE</option>
                    <option value="SPECIAL">SPECIAL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">City / Hub *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <input
                    type="checkbox"
                    id="isDeliverableCheck"
                    checked={formData.isDeliverable}
                    onChange={(e) => setFormData({ ...formData, isDeliverable: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="isDeliverableCheck" className="text-xs text-slate-200 cursor-pointer">
                    Deliverable
                  </label>
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <input
                    type="checkbox"
                    id="isCodCheck"
                    checked={formData.isCodAvailable}
                    onChange={(e) => setFormData({ ...formData, isCodAvailable: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="isCodCheck" className="text-xs text-slate-200 cursor-pointer">
                    COD Available
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Standard Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.standardShippingFee}
                    onChange={(e) => setFormData({ ...formData, standardShippingFee: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Express Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.expressShippingFee}
                    onChange={(e) => setFormData({ ...formData, expressShippingFee: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{formSaving ? 'Saving...' : modalMode === 'add' ? 'Save Rule' : 'Update Rule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
