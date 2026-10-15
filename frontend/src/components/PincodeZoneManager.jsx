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
} from 'lucide-react';
import api from '../api/client';

export default function PincodeZoneManager() {
  const [pincodes, setPincodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [stats, setStats] = useState({ totalCount: 0, deliverableCount: 0, codCount: 0, metroCount: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  
  // Quick test state
  const [testPin, setTestPin] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState('');

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
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
      const params = {
        page,
        limit: 10,
      };
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

  useEffect(() => {
    fetchPincodes(1);
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
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to seed default pincodes');
    } finally {
      setLoading(false);
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
          setTimeout(() => setActionSuccess(''), 3000);
        }
      } else {
        const res = await api.put(`/pincodes/${editingId}`, formData);
        if (res.data?.success) {
          setShowModal(false);
          setActionSuccess(`Pincode ${formData.pincode} updated successfully!`);
          fetchPincodes(pagination.page);
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
        setActionSuccess(`Pincode rule ${pin} removed!`);
        fetchPincodes(pagination.page);
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete pincode rule');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-slate-400 text-xs font-semibold">Configured Pincodes</div>
          <div className="text-xl font-bold text-slate-100 mt-1 font-mono">{stats.totalCount || pincodes.length}</div>
        </div>
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-emerald-400 text-xs font-semibold">Deliverable Hubs</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">{stats.deliverableCount}</div>
        </div>
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-blue-400 text-xs font-semibold">COD Enabled</div>
          <div className="text-xl font-bold text-blue-400 mt-1 font-mono">{stats.codCount}</div>
        </div>
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-amber-400 text-xs font-semibold">Metro Fast-Track</div>
          <div className="text-xl font-bold text-amber-400 mt-1 font-mono">{stats.metroCount}</div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Simulator / Quick Tester Bar */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Live Pincode Serviceability Inspector
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">Tests full resolution algorithm & fallback logic</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={testPin}
              onChange={(e) => setTestPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter any 6-digit Pincode (e.g. 110001, 400001, 190001)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>
          <button
            type="button"
            onClick={handleQuickTest}
            disabled={testLoading || testPin.length !== 6}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
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
          <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <span className="text-slate-400 text-[10px] block">Location:</span>
              <strong className="text-slate-200">{testResult.city}, {testResult.state}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Zone:</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-amber-300 font-mono">
                {testResult.zone}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">COD Availability:</span>
              <span className={testResult.isCodAvailable ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {testResult.isCodAvailable ? 'Available (COD)' : 'Prepaid Only'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Estimated Delivery:</span>
              <strong className="text-emerald-400">{testResult.estimatedDeliveryText || `${testResult.estimatedDays} Days`}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Action Controls & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pincode, city, or state..."
              className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
          >
            <option value="">All Zones</option>
            <option value="METRO">Metro</option>
            <option value="TIER_1">Tier 1</option>
            <option value="TIER_2">Tier 2</option>
            <option value="REMOTE">Remote</option>
            <option value="SPECIAL">Special</option>
          </select>

          <button
            type="button"
            onClick={handleSeedDefaults}
            title="Seed Core Indian Metros"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition flex items-center gap-1 whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Seed Hubs</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Zone</span>
          </button>
        </div>
      </div>

      {/* Pincodes Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Pincode</th>
                <th className="py-3 px-4">Region / City</th>
                <th className="py-3 px-4">Zone</th>
                <th className="py-3 px-4">Serviceability</th>
                <th className="py-3 px-4">COD</th>
                <th className="py-3 px-4">Transit / ETA</th>
                <th className="py-3 px-4">Charges</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Loading delivery zones...
                  </td>
                </tr>
              ) : pincodes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No custom pincode rules found. Click "Seed Hubs" or "Add Zone" to configure.
                  </td>
                </tr>
              ) : (
                pincodes.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      {item.pincode}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-100">{item.city}</div>
                      <div className="text-[10px] text-slate-400">{item.state}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {item.zone}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {item.isDeliverable ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Deliverable
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 text-[11px] font-medium">
                          <XCircle className="w-3.5 h-3.5" /> Blocked
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.isCodAvailable ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                          <Banknote className="w-3.5 h-3.5" /> COD Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-400 text-[11px]">
                          <CreditCard className="w-3.5 h-3.5" /> Prepaid Only
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-200">{item.estimatedDeliveryText || `${item.estimatedDays} Days`}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[11px]">
                        Std: <strong className="text-slate-200">{item.standardShippingFee === 0 ? 'FREE' : `₹${item.standardShippingFee}`}</strong>
                      </div>
                      {item.expressAvailable && (
                        <div className="text-[10px] text-amber-400">
                          Exp: ₹{item.expressShippingFee}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          title="Edit Zone Rule"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item._id, item.pincode)}
                          title="Delete Zone Rule"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
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

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing {pincodes.length} of {pagination.total} entries
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => fetchPincodes(pagination.page - 1)}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchPincodes(pagination.page + 1)}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-400" />
              <span>{modalMode === 'add' ? 'Add Pincode Zone Rule' : `Edit Pincode ${formData.pincode}`}</span>
            </h3>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    6-Digit Pincode *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    disabled={modalMode === 'edit'}
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    placeholder="110001"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Zone Tier *
                  </label>
                  <select
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                  >
                    <option value="METRO">Metro (Fast-Track)</option>
                    <option value="TIER_1">Tier 1</option>
                    <option value="TIER_2">Tier 2</option>
                    <option value="REMOTE">Remote / Out of Area</option>
                    <option value="SPECIAL">Special (Prepaid Only)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    City / Town *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. New Delhi"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g. Delhi"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDeliverable}
                    onChange={(e) => setFormData({ ...formData, isDeliverable: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-0"
                  />
                  <span className="text-xs text-slate-200 font-medium">Deliverable Service</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isCodAvailable}
                    onChange={(e) => setFormData({ ...formData, isCodAvailable: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-0"
                  />
                  <span className="text-xs text-slate-200 font-medium">COD Available</span>
                </label>
              </div>

              {/* Delivery Days & Fees */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Est Days
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={formData.estimatedDays}
                    onChange={(e) => setFormData({ ...formData, estimatedDays: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Std Fee (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.standardShippingFee}
                    onChange={(e) => setFormData({ ...formData, standardShippingFee: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Exp Fee (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.expressShippingFee}
                    onChange={(e) => setFormData({ ...formData, expressShippingFee: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Delivery Transit Label
                </label>
                <input
                  type="text"
                  value={formData.estimatedDeliveryText}
                  onChange={(e) => setFormData({ ...formData, estimatedDeliveryText: e.target.value })}
                  placeholder="e.g. Next-Day Delivery or 2-3 Business Days"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition"
                >
                  {formSaving ? 'Saving...' : 'Save Zone Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
