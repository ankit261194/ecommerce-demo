import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Navigation,
  Package,
  Layers,
  MapPin,
  RefreshCw,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Truck,
  ArrowRight,
  ShieldCheck,
  Edit,
  Trash2,
  Sliders,
  X,
  ExternalLink,
  ChevronRight,
  Box,
  TrendingUp,
  Map,
  Compass,
  Zap,
} from 'lucide-react';
import api from '../api/client';
import StockTransferOrderManager from './StockTransferOrderManager';

export default function MultiWarehouseRoutingHub() {
  const [activeTab, setActiveTab] = useState('network'); // 'network' | 'simulator' | 'inventory'
  const [warehouses, setWarehouses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [notification, setNotification] = useState(null);

  // Modal states
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockTargetWarehouse, setStockTargetWarehouse] = useState(null);

  // Warehouse Form State
  const [formData, setFormData] = useState({
    name: '',
    warehouseCode: '',
    type: 'REGIONAL_DC',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    contact: {
      managerName: '',
      phone: '',
      email: '',
    },
    servicedPincodesInput: '',
    capacity: {
      maxDailyShipments: 5000,
      totalPalletCapacity: 1200,
      usedPalletCapacity: 450,
    },
    dispatchCutoffTime: '18:00',
    slaHours: 24,
    operatingHours: '08:00 - 22:00',
    isPrimaryDefault: false,
    status: 'ACTIVE',
  });

  // Stock Adjust Form State
  const [stockFormData, setStockFormData] = useState({
    productId: '',
    sku: '',
    quantityDelta: 50,
    reason: 'RESTOCK',
  });

  // Simulator State
  const [simPincode, setSimPincode] = useState('110001');
  const [simItems, setSimItems] = useState([
    { product: '66fa1b111111111111111111', sku: 'SKU-SMARTPHONE-01', title: 'Aura Smartphone Pro Max', quantity: 1 },
    { product: '66fa1b222222222222222222', sku: 'SKU-HEADPHONES-02', title: 'Noise Cancelling Headphones', quantity: 2 },
  ]);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  // Show Toast
  const showToast = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  // Fetch Warehouses & Analytics
  const fetchNetworkData = useCallback(async () => {
    setLoading(true);
    try {
      const [whRes, analyticsRes] = await Promise.all([
        api.get('/admin/warehouses'),
        api.get('/admin/warehouses/analytics'),
      ]);

      if (whRes.data?.success) {
        setWarehouses(whRes.data.data || []);
      }
      if (analyticsRes.data?.success) {
        setAnalytics(analyticsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load multi-warehouse data:', err);
      showToast('error', err.response?.data?.message || 'Failed to fetch warehouse data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNetworkData();
  }, [fetchNetworkData]);

  // Handle Create / Edit Warehouse Submit
  const handleSaveWarehouse = async (e) => {
    e.preventDefault();
    try {
      const servicedPincodes = formData.servicedPincodesInput
        ? formData.servicedPincodesInput
            .split(',')
            .map((p) => p.trim())
            .filter((p) => /^\d{6}$/.test(p))
        : [];

      const payload = {
        name: formData.name,
        warehouseCode: formData.warehouseCode.trim().toUpperCase(),
        type: formData.type,
        address: formData.address,
        contact: formData.contact,
        servicedPincodes,
        capacity: formData.capacity,
        dispatchCutoffTime: formData.dispatchCutoffTime,
        slaHours: Number(formData.slaHours),
        operatingHours: formData.operatingHours,
        isPrimaryDefault: Boolean(formData.isPrimaryDefault),
        status: formData.status,
      };

      if (editingWarehouse) {
        const res = await api.put(`/admin/warehouses/${editingWarehouse._id}`, payload);
        if (res.data?.success) {
          showToast('success', `Warehouse '${payload.warehouseCode}' updated successfully!`);
        }
      } else {
        const res = await api.post('/admin/warehouses', payload);
        if (res.data?.success) {
          showToast('success', `Warehouse '${payload.warehouseCode}' created successfully!`);
        }
      }

      setIsWarehouseModalOpen(false);
      setEditingWarehouse(null);
      fetchNetworkData();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to save warehouse.');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (wh) => {
    setEditingWarehouse(wh);
    setFormData({
      name: wh.name || '',
      warehouseCode: wh.warehouseCode || '',
      type: wh.type || 'REGIONAL_DC',
      address: {
        street: wh.address?.street || '',
        city: wh.address?.city || '',
        state: wh.address?.state || '',
        pincode: wh.address?.pincode || '',
        country: wh.address?.country || 'India',
      },
      contact: {
        managerName: wh.contact?.managerName || '',
        phone: wh.contact?.phone || '',
        email: wh.contact?.email || '',
      },
      servicedPincodesInput: (wh.servicedPincodes || []).join(', '),
      capacity: {
        maxDailyShipments: wh.capacity?.maxDailyShipments || 5000,
        totalPalletCapacity: wh.capacity?.totalPalletCapacity || 1200,
        usedPalletCapacity: wh.capacity?.usedPalletCapacity || 450,
      },
      dispatchCutoffTime: wh.dispatchCutoffTime || '18:00',
      slaHours: wh.slaHours || 24,
      operatingHours: wh.operatingHours || '08:00 - 22:00',
      isPrimaryDefault: Boolean(wh.isPrimaryDefault),
      status: wh.status || 'ACTIVE',
    });
    setIsWarehouseModalOpen(true);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingWarehouse(null);
    setFormData({
      name: '',
      warehouseCode: `WH-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      type: 'REGIONAL_DC',
      address: {
        street: 'Logistics Park, Phase 1',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110037',
        country: 'India',
      },
      contact: {
        managerName: 'Rajesh Sharma',
        phone: '+91 98765 43210',
        email: 'ops.delhi@auramarket.com',
      },
      servicedPincodesInput: '110001, 110002, 110037, 122001, 201301',
      capacity: {
        maxDailyShipments: 8000,
        totalPalletCapacity: 1500,
        usedPalletCapacity: 600,
      },
      dispatchCutoffTime: '19:00',
      slaHours: 24,
      operatingHours: '08:00 - 23:00',
      isPrimaryDefault: false,
      status: 'ACTIVE',
    });
    setIsWarehouseModalOpen(true);
  };

  // Handle Archive / Delete Warehouse
  const handleDeleteWarehouse = async (id, code) => {
    if (!window.confirm(`Are you sure you want to deactivate and archive warehouse '${code}'?`)) return;
    try {
      const res = await api.delete(`/admin/warehouses/${id}`);
      if (res.data?.success) {
        showToast('success', res.data.message || 'Warehouse archived successfully.');
        fetchNetworkData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to archive warehouse.');
    }
  };

  // Handle Stock Adjust Submit
  const handleStockAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!stockTargetWarehouse) return;
    try {
      const res = await api.post(`/admin/warehouses/${stockTargetWarehouse._id}/stock-adjust`, {
        productId: stockFormData.productId,
        sku: stockFormData.sku,
        quantityDelta: Number(stockFormData.quantityDelta),
        reason: stockFormData.reason,
      });

      if (res.data?.success) {
        showToast('success', res.data.message || 'Stock adjusted successfully!');
        setIsStockModalOpen(false);
        fetchNetworkData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to adjust stock.');
    }
  };

  // Run Route Simulation
  const handleRunSimulation = async (e) => {
    e?.preventDefault();
    setSimulating(true);
    setSimulationResult(null);
    try {
      const res = await api.post('/admin/warehouses/route-simulation', {
        destinationPincode: simPincode.trim(),
        items: simItems,
      });

      if (res.data?.success) {
        setSimulationResult(res.data.data);
        showToast('success', 'Route optimization and stock allocation calculated successfully!');
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to simulate routing.');
    } finally {
      setSimulating(false);
    }
  };

  // Filtered Warehouses
  const filteredWarehouses = warehouses.filter((wh) => {
    const matchesSearch =
      !searchQuery ||
      wh.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wh.warehouseCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wh.address?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wh.address?.pincode?.includes(searchQuery);

    const matchesStatus = statusFilter === 'ALL' || wh.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-bold backdrop-blur-md transition-all ${
            notification.type === 'error'
              ? 'bg-rose-50/95 border-rose-200 text-rose-800'
              : 'bg-emerald-50/95 border-emerald-200 text-emerald-800'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-black uppercase tracking-wider mb-3">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>Pillar 2 • Point 24</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-bold">Smart Logistics Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Multi-Warehouse & Inventory Routing Hub
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-2xl">
              Automatic stock allocation by closest delivery pincode, Great-Circle Haversine distance optimization, multi-box split fulfillment, and nationwide fulfillment center governance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchNetworkData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Network</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all shadow-lg shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>New Fulfillment Hub</span>
            </button>
          </div>
        </div>

        {/* Bento Grid Analytics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Total Hubs</span>
              <Building2 className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              {analytics?.totalHubs ?? warehouses.length}
            </div>
            <div className="text-[11px] text-emerald-400 font-medium mt-0.5">
              {analytics?.activeHubs ?? warehouses.filter((w) => w.status === 'ACTIVE').length} Active Hubs Online
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Dark Stores / QC Hubs</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              {analytics?.darkStores ?? warehouses.filter((w) => w.type === 'DARK_STORE').length}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">Instant 10-20m Delivery</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Pallet Capacity</span>
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              {analytics?.networkCapacity?.utilizationPercentage ?? 42}%
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {analytics?.networkCapacity?.usedPallets ?? 0} / {analytics?.networkCapacity?.totalPallets ?? 0} Pallets
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Routing Engine</span>
              <Navigation className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-base font-black text-emerald-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>SMART_ALLOC</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">Haversine + Pincode Match</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('network')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs sm:text-sm transition-all ${
            activeTab === 'network'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Fulfillment Hubs ({warehouses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs sm:text-sm transition-all ${
            activeTab === 'simulator'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>Pincode Routing Simulator</span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
            Live Sandbox
          </span>
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs sm:text-sm transition-all ${
            activeTab === 'transfers'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Stock Transfers (STO)</span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 text-[10px] font-bold">
            Point #25
          </span>
        </button>
      </div>

      {/* TAB 1: FULFILLMENT NETWORK */}
      {activeTab === 'network' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search warehouse by code, city, pincode, or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 ml-1" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="INACTIVE">Inactive / Archived</option>
              </select>
            </div>
          </div>

          {/* Warehouse Hubs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWarehouses.map((wh) => {
              const palletPct =
                wh.capacity?.totalPalletCapacity > 0
                  ? Math.round(
                      ((wh.capacity?.usedPalletCapacity || 0) / wh.capacity.totalPalletCapacity) * 100
                    )
                  : 0;

              return (
                <div
                  key={wh._id}
                  className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {wh.warehouseCode}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              wh.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : wh.status === 'MAINTENANCE'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {wh.status}
                          </span>
                          {wh.isPrimaryDefault && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-black text-slate-900 leading-snug">{wh.name}</h3>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(wh)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                          title="Edit Hub Details"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteWarehouse(wh._id, wh.warehouseCode)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          title="Archive Hub"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Location & Pincode */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mb-3">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>
                        {wh.address?.city}, {wh.address?.state} ({wh.address?.pincode})
                      </span>
                    </div>

                    {/* Pallet Capacity Meter */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 mb-3.5">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-500 font-bold">Pallet Space</span>
                        <span className="font-mono font-bold text-slate-800">
                          {wh.capacity?.usedPalletCapacity || 0} / {wh.capacity?.totalPalletCapacity || 1200} ({palletPct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            palletPct > 85 ? 'bg-rose-500' : palletPct > 65 ? 'bg-amber-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${Math.min(100, palletPct)}%` }}
                        />
                      </div>
                    </div>

                    {/* Serviced Pincodes Preview */}
                    <div className="mb-3">
                      <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center justify-between">
                        <span>Direct Pincodes ({wh.servicedPincodes?.length || 0})</span>
                        <span className="text-[10px] text-slate-400 font-mono">Cutoff: {wh.dispatchCutoffTime}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(wh.servicedPincodes || []).slice(0, 4).map((pin) => (
                          <span
                            key={pin}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold"
                          >
                            {pin}
                          </span>
                        ))}
                        {(wh.servicedPincodes?.length || 0) > 4 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                            +{wh.servicedPincodes.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-slate-400">Total Stock: </span>
                      <span className="font-black text-slate-800">{wh.totalAvailableStock ?? 0} units</span>
                    </div>

                    <button
                      onClick={() => {
                        setStockTargetWarehouse(wh);
                        setStockFormData({
                          productId: '',
                          sku: '',
                          quantityDelta: 50,
                          reason: 'RESTOCK',
                        });
                        setIsStockModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Adjust Stock</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredWarehouses.length === 0 && (
              <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-700">No fulfillment warehouses found</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Create your first regional distribution hub or adjust your search filter.
                </p>
                <button
                  onClick={handleOpenCreate}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-500"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Fulfillment Hub</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PINCODE ROUTING SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Simulator Controls (Left Column) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Destination & Cart Inputs</h3>
              </div>
              <p className="text-xs text-slate-500">
                Input any customer delivery pincode to simulate real-time Great-Circle distance, nearest warehouse allocation, and multi-box split shipments.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Delivery Pincode (India)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    maxLength={6}
                    value={simPincode}
                    onChange={(e) => setSimPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 110001, 560001, 400001"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-1.5 mt-2">
                  {['110001 (Delhi)', '560001 (BLR)', '400001 (MUM)', '700001 (KOL)'].map((preset) => {
                    const pin = preset.split(' ')[0];
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSimPincode(pin)}
                        className="text-[10px] font-mono px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all"
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cart Items in Simulation */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Order Items to Fulfill</label>
                <div className="space-y-2">
                  {simItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-slate-400" />
                        <div>
                          <div className="font-bold text-slate-800">{item.title}</div>
                          <div className="font-mono text-[10px] text-slate-400">{item.sku}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-500">Qty:</span>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...simItems];
                            newItems[idx].quantity = Math.max(1, parseInt(e.target.value) || 1);
                            setSimItems(newItems);
                          }}
                          className="w-14 px-2 py-1 rounded-lg bg-white border border-slate-200 text-center font-bold text-slate-800"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleRunSimulation}
                disabled={simulating || !simPincode}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-indigo-600/30 transition-all"
              >
                <Navigation className={`w-4 h-4 ${simulating ? 'animate-spin' : ''}`} />
                <span>{simulating ? 'Computing Optimal Route...' : 'Run Smart Route Allocation'}</span>
              </button>
            </div>
          </div>

          {/* Simulation Output Diagram (Right Column) */}
          <div className="lg:col-span-7">
            {simulationResult ? (
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
                {/* Result Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-black px-3 py-1 rounded-full ${
                          simulationResult.splitShipment
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {simulationResult.splitShipment ? 'MULTI-WAREHOUSE SPLIT SHIPMENT' : 'SINGLE WAREHOUSE DIRECT'}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-400">
                        ({simulationResult.routingDurationMs}ms calculation)
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Destination:{' '}
                      <strong className="text-slate-800">
                        {simulationResult.destination?.pincode} ({simulationResult.destination?.zone})
                      </strong>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400">Total Packages: </span>
                    <span className="font-mono text-lg font-black text-indigo-600">
                      {simulationResult.totalPackages}
                    </span>
                  </div>
                </div>

                {/* Warehouse Allocations Visual Cards */}
                <div className="space-y-4">
                  {simulationResult.warehouseAllocations?.map((alloc) => (
                    <div
                      key={alloc.packageNumber}
                      className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-indigo-100 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                            P{alloc.packageNumber}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{alloc.warehouseName}</span>
                              <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 font-bold">
                                {alloc.warehouseCode}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500">
                              {alloc.city}, {alloc.state}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-black text-slate-800">{alloc.distanceKm} km</div>
                          <div className="text-[11px] font-bold text-emerald-600">{alloc.estimatedTAT}</div>
                        </div>
                      </div>

                      {/* Items inside this package */}
                      <div className="bg-white rounded-xl p-3 border border-slate-200/80">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                          Manifest Items in this Shipment:
                        </div>
                        <div className="space-y-1">
                          {alloc.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <span className="font-medium text-slate-700">{item.title}</span>
                              <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                {item.allocatedQuantity} units
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Speed Tier: <strong className="text-slate-700">{alloc.speedTier}</strong></span>
                        <span>Estimated Transit Fee: <strong className="text-slate-800">₹{alloc.estimatedShippingFee}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shortfalls Warning (if any) */}
                {simulationResult.outOfStockShortfalls?.length > 0 && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                    <div className="font-black flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Stock Shortfall / Backorder Detected:</span>
                    </div>
                    {simulationResult.outOfStockShortfalls.map((s, idx) => (
                      <div key={idx} className="pl-5 text-rose-700">
                        • {s.title}: Requested {s.requested}, Allocated {s.allocated} (Missing {s.shortfall} units across all hubs)
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center rounded-3xl bg-slate-50 border border-dashed border-slate-300">
                <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-700">Routing Simulator Ready</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Click 'Run Smart Route Allocation' to see how the system chooses the nearest warehouse based on customer pincode and available stock.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: INTERNAL STOCK TRANSFER ORDERS (Point 25) */}
      {activeTab === 'transfers' && (
        <StockTransferOrderManager />
      )}

      {/* CREATE / EDIT WAREHOUSE MODAL */}
      {isWarehouseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsWarehouseModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {editingWarehouse ? 'Edit Fulfillment Hub' : 'Register New Fulfillment Hub'}
                </h3>
                <p className="text-xs text-slate-500">Configure regional warehouse coordinates, capacity, and pincodes</p>
              </div>
            </div>

            <form onSubmit={handleSaveWarehouse} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Warehouse Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. North DC - Delhi NCR Hub"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Warehouse Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.warehouseCode}
                    onChange={(e) => setFormData({ ...formData, warehouseCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. WH-DEL-01"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hub Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="CENTRAL_HUB">Central Mother Hub</option>
                    <option value="REGIONAL_DC">Regional DC</option>
                    <option value="DARK_STORE">Dark Store (Quick Commerce)</option>
                    <option value="RETURN_FACILITY">Return & RTO Facility</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ACTIVE">Active (Online)</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dispatch Cutoff</label>
                  <input
                    type="text"
                    value={formData.dispatchCutoffTime}
                    onChange={(e) => setFormData({ ...formData, dispatchCutoffTime: e.target.value })}
                    placeholder="18:00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Address Section */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block">Hub Physical Address & Coordinates</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={formData.address.city}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, city: e.target.value },
                        })
                      }
                      placeholder="e.g. New Delhi"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">State *</label>
                    <input
                      type="text"
                      required
                      value={formData.address.state}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, state: e.target.value },
                        })
                      }
                      placeholder="e.g. Delhi"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">Pincode *</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={formData.address.pincode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, pincode: e.target.value.replace(/\D/g, '') },
                        })
                      }
                      placeholder="110037"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Serviced Pincodes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Direct Serviced Pincodes (Comma separated)
                </label>
                <textarea
                  rows={2}
                  value={formData.servicedPincodesInput}
                  onChange={(e) => setFormData({ ...formData, servicedPincodesInput: e.target.value })}
                  placeholder="e.g. 110001, 110002, 122001, 201301"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Capacity Specs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Pallet Capacity</label>
                  <input
                    type="number"
                    value={formData.capacity.totalPalletCapacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacity: { ...formData.capacity, totalPalletCapacity: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Daily Shipments</label>
                  <input
                    type="number"
                    value={formData.capacity.maxDailyShipments}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacity: { ...formData.capacity, maxDailyShipments: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWarehouseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md"
                >
                  {editingWarehouse ? 'Update Hub' : 'Register Hub'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {isStockModalOpen && stockTargetWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setIsStockModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Adjust Hub Inventory</h3>
                <p className="text-xs text-slate-500 font-mono">{stockTargetWarehouse.warehouseCode} ({stockTargetWarehouse.name})</p>
              </div>
            </div>

            <form onSubmit={handleStockAdjustSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product ID (MongoDB ObjectId) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 66fa1b111111111111111111"
                  value={stockFormData.productId}
                  onChange={(e) => setStockFormData({ ...stockFormData, productId: e.target.value.trim() })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">SKU Code</label>
                <input
                  type="text"
                  placeholder="e.g. SKU-DEL-PRO-01"
                  value={stockFormData.sku}
                  onChange={(e) => setStockFormData({ ...stockFormData, sku: e.target.value.trim() })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantity Delta (+/-)</label>
                  <input
                    type="number"
                    required
                    value={stockFormData.quantityDelta}
                    onChange={(e) => setStockFormData({ ...stockFormData, quantityDelta: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reason</label>
                  <select
                    value={stockFormData.reason}
                    onChange={(e) => setStockFormData({ ...stockFormData, reason: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800"
                  >
                    <option value="RESTOCK">Restock / Purchase Receipt</option>
                    <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
                    <option value="INITIAL_IMPORT">Initial Import</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md"
                >
                  Save Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
