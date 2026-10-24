import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  ArrowRight,
  Package,
  Layers,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Plus,
  Search,
  Filter,
  FileText,
  Sliders,
  X,
  ShieldCheck,
  ChevronRight,
  Eye,
  Send,
  Download,
  Check,
  Compass,
  CornerDownRight,
  UserCheck,
  Navigation,
} from 'lucide-react';
import api from '../api/client';

export default function StockTransferOrderManager() {
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [notification, setNotification] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isManifestModalOpen, setIsManifestModalOpen] = useState(false);
  const [activeTransfer, setActiveTransfer] = useState(null);

  // Create Form State
  const [formData, setFormData] = useState({
    sourceWarehouse: '',
    destinationWarehouse: '',
    priority: 'STANDARD',
    notes: '',
    items: [{ product: '', sku: '', title: 'Smart Watch Pro', quantity: 20 }],
  });

  // Dispatch Form State
  const [dispatchData, setDispatchData] = useState({
    courierPartner: 'BlueDart Surface Logistics',
    trackingNumber: '',
    vehicleNumber: 'DL-01-AB-8822',
    driverName: 'Ramesh Chander',
    driverPhone: '+91 98765 11223',
    estimatedArrival: '',
  });

  // Receive Form State
  const [receiveData, setReceiveData] = useState({
    receivedItems: [],
    remarks: '',
  });

  // Toast
  const showToast = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  // Fetch Transfers, Warehouses & Analytics
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [transRes, whRes, analyticsRes] = await Promise.all([
        api.get('/admin/stock-transfers'),
        api.get('/admin/warehouses'),
        api.get('/admin/stock-transfers/analytics'),
      ]);

      if (transRes.data?.success) setTransfers(transRes.data.data || []);
      if (whRes.data?.success) setWarehouses(whRes.data.data || []);
      if (analyticsRes.data?.success) setAnalytics(analyticsRes.data.data);
    } catch (err) {
      console.error('Failed to load stock transfers data:', err);
      showToast('error', err.response?.data?.message || 'Failed to fetch transfer data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Create Wizard
  const handleOpenCreate = () => {
    const defaultSrc = warehouses[0]?._id || '';
    const defaultDst = warehouses[1]?._id || '';
    setFormData({
      sourceWarehouse: defaultSrc,
      destinationWarehouse: defaultDst,
      priority: 'STANDARD',
      notes: 'Routine replenishment transfer order',
      items: [{ product: '66fa1b111111111111111111', sku: 'P24-WATCH-01', title: 'Smart Watch Pro', quantity: 20 }],
    });
    setIsCreateModalOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (formData.sourceWarehouse === formData.destinationWarehouse) {
      showToast('error', 'Source and Destination warehouses must be distinct.');
      return;
    }
    try {
      const res = await api.post('/admin/stock-transfers', {
        sourceWarehouse: formData.sourceWarehouse,
        destinationWarehouse: formData.destinationWarehouse,
        priority: formData.priority,
        notes: formData.notes,
        items: formData.items.map((i) => ({
          product: i.product,
          sku: i.sku,
          title: i.title,
          requestedQuantity: Number(i.quantity),
        })),
      });

      if (res.data?.success) {
        showToast('success', `Transfer Order '${res.data.data.transferNumber}' created!`);
        setIsCreateModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to create transfer order.');
    }
  };

  // Handle Approve
  const handleApprove = async (id, transferNum) => {
    try {
      const res = await api.post(`/admin/stock-transfers/${id}/approve`);
      if (res.data?.success) {
        showToast('success', `Order '${transferNum}' approved! Stock reserved at source hub.`);
        fetchData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to approve transfer.');
    }
  };

  // Open Dispatch Modal
  const handleOpenDispatch = (transfer) => {
    setActiveTransfer(transfer);
    setDispatchData({
      courierPartner: 'BlueDart Surface Logistics',
      trackingNumber: `AWB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      vehicleNumber: 'HR-26-EQ-4401',
      driverName: 'Vikram Singh',
      driverPhone: '+91 98111 44556',
      estimatedArrival: new Date(Date.now() + 48 * 3600000).toISOString().slice(0, 16),
    });
    setIsDispatchModalOpen(true);
  };

  // Submit Dispatch
  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    if (!activeTransfer) return;
    try {
      const res = await api.post(`/admin/stock-transfers/${activeTransfer._id}/dispatch`, dispatchData);
      if (res.data?.success) {
        showToast('success', `Order '${activeTransfer.transferNumber}' dispatched! Status: IN_TRANSIT.`);
        setIsDispatchModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to dispatch transfer.');
    }
  };

  // Open Receive Modal
  const handleOpenReceive = (transfer) => {
    setActiveTransfer(transfer);
    setReceiveData({
      receivedItems: transfer.items.map((i) => ({
        product: i.product?._id || i.product,
        sku: i.sku,
        title: i.title,
        dispatchedQuantity: i.dispatchedQuantity || i.requestedQuantity,
        receivedQuantity: i.dispatchedQuantity || i.requestedQuantity,
        damagedQuantity: 0,
      })),
      remarks: 'All items received in pristine condition.',
    });
    setIsReceiveModalOpen(true);
  };

  // Submit Receive
  const handleReceiveSubmit = async (e) => {
    e.preventDefault();
    if (!activeTransfer) return;
    try {
      const res = await api.post(`/admin/stock-transfers/${activeTransfer._id}/receive`, {
        receivedItems: receiveData.receivedItems.map((r) => ({
          product: r.product,
          receivedQuantity: Number(r.receivedQuantity),
          damagedQuantity: Number(r.damagedQuantity || 0),
        })),
        remarks: receiveData.remarks,
      });

      if (res.data?.success) {
        showToast('success', `Transfer '${activeTransfer.transferNumber}' received & inventory stocked!`);
        setIsReceiveModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to receive transfer.');
    }
  };

  // Handle Cancel
  const handleCancel = async (id, transferNum) => {
    if (!window.confirm(`Are you sure you want to cancel Transfer Order '${transferNum}'?`)) return;
    try {
      const res = await api.post(`/admin/stock-transfers/${id}/cancel`, {
        reason: 'Cancelled by superadmin',
      });
      if (res.data?.success) {
        showToast('success', `Transfer '${transferNum}' cancelled.`);
        fetchData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to cancel transfer.');
    }
  };

  // Filtered transfers
  const filteredTransfers = transfers.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.transferNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.transitDetails?.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.transitDetails?.vehicleNumber?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
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
              <Truck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Pillar 2 • Point 25</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-bold">Inter-Warehouse Logistics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Internal Stock Transfer Orders (STO)
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-2xl">
              Inter-warehouse stock rebalancing, fleet manifests, multi-SKU dispatch tracking, driver handovers, and destination receiving inspections with automatic inventory reservation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Fleet</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all shadow-lg shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Initiate Stock Transfer</span>
            </button>
          </div>
        </div>

        {/* Bento Grid Analytics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Total Transfers</span>
              <Truck className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              {analytics?.totalTransfers ?? transfers.length}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">Network Lifetime STOs</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">In Transit</span>
              <Navigation className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-cyan-400">
              {analytics?.inTransit ?? transfers.filter((t) => t.status === 'IN_TRANSIT').length}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {analytics?.unitsInTransit ?? 0} Units Moving
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Pending Approvals</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-400">
              {analytics?.pendingApproval ?? transfers.filter((t) => t.status === 'REQUESTED').length}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">Awaiting Source Reserve</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Fulfillment Accuracy</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-400">
              {analytics?.accuracyRate ?? 98.4}%
            </div>
            <div className="text-[11px] text-emerald-400 font-medium mt-0.5">Zero Loss Benchmark</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by transfer number (STO-...), AWB tracking, or vehicle..."
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
            <option value="REQUESTED">Pending Approval</option>
            <option value="APPROVED">Approved (Reserved)</option>
            <option value="IN_TRANSIT">In Transit (Fleet)</option>
            <option value="RECEIVED">Received & Stocked</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Transfer Orders List */}
      <div className="space-y-4">
        {filteredTransfers.map((t) => {
          const statusColors = {
            REQUESTED: 'bg-amber-50 text-amber-800 border-amber-200',
            APPROVED: 'bg-indigo-50 text-indigo-800 border-indigo-200',
            IN_TRANSIT: 'bg-cyan-50 text-cyan-800 border-cyan-200',
            RECEIVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            PARTIALLY_RECEIVED: 'bg-purple-50 text-purple-800 border-purple-200',
            CANCELLED: 'bg-rose-50 text-rose-800 border-rose-200',
          };

          return (
            <div
              key={t._id}
              className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              {/* Row 1: STO Header & Routing */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-black px-3 py-1 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
                    {t.transferNumber}
                  </span>
                  <span
                    className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                      statusColors[t.status] || 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {t.status}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {t.priority}
                  </span>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  Created {new Date(t.createdAt).toLocaleDateString()} by {t.createdBy}
                </div>
              </div>

              {/* Row 2: Origin to Destination Visual Route */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Source Hub */}
                <div className="md:col-span-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Origin Warehouse (Source)
                  </div>
                  <div className="font-black text-sm text-slate-900">{t.sourceWarehouse?.name}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    {t.sourceWarehouse?.warehouseCode} • {t.sourceWarehouse?.address?.city}
                  </div>
                </div>

                {/* Arrow Connector */}
                <div className="md:col-span-2 flex flex-col items-center justify-center text-indigo-600">
                  <Truck className="w-5 h-5 mb-1 animate-pulse" />
                  <ArrowRight className="w-5 h-5 hidden md:block" />
                  <span className="text-[10px] font-black text-slate-400 font-mono">
                    {t.totalUnitsRequested} Units
                  </span>
                </div>

                {/* Destination Hub */}
                <div className="md:col-span-5 p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                  <div className="text-[10px] font-black uppercase text-indigo-500 tracking-wider mb-1">
                    Destination Warehouse (Target)
                  </div>
                  <div className="font-black text-sm text-indigo-950">{t.destinationWarehouse?.name}</div>
                  <div className="text-xs text-indigo-700 font-mono mt-0.5">
                    {t.destinationWarehouse?.warehouseCode} • {t.destinationWarehouse?.address?.city}
                  </div>
                </div>
              </div>

              {/* Transit Details Banner (if dispatched) */}
              {t.transitDetails?.trackingNumber && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold">Courier: </span>
                    <span className="font-bold text-slate-800">{t.transitDetails.courierPartner}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold">AWB: </span>
                    <span className="font-mono font-bold text-indigo-600">{t.transitDetails.trackingNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold">Vehicle: </span>
                    <span className="font-bold text-slate-800">{t.transitDetails.vehicleNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold">Driver: </span>
                    <span className="font-bold text-slate-800">{t.transitDetails.driverName} ({t.transitDetails.driverPhone})</span>
                  </div>
                </div>
              )}

              {/* Row 3: Items Manifest & Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-100">
                <div className="text-xs text-slate-600">
                  <strong>Items:</strong> {t.items?.map((i) => `${i.title} (${i.requestedQuantity} pcs)`).join(', ')}
                </div>

                <div className="flex items-center gap-2">
                  {/* Approve Action */}
                  {t.status === 'REQUESTED' && (
                    <button
                      onClick={() => handleApprove(t._id, t.transferNumber)}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-sm"
                    >
                      Approve & Reserve Stock
                    </button>
                  )}

                  {/* Dispatch Action */}
                  {t.status === 'APPROVED' && (
                    <button
                      onClick={() => handleOpenDispatch(t)}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Dispatch Fleet</span>
                    </button>
                  )}

                  {/* Receive Action */}
                  {t.status === 'IN_TRANSIT' && (
                    <button
                      onClick={() => handleOpenReceive(t)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Inspect & Receive</span>
                    </button>
                  )}

                  {/* Cancel Action */}
                  {(t.status === 'REQUESTED' || t.status === 'APPROVED') && (
                    <button
                      onClick={() => handleCancel(t._id, t.transferNumber)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-xs transition-all"
                    >
                      Cancel
                    </button>
                  )}

                  {/* Manifest & Timeline Inspector */}
                  <button
                    onClick={() => {
                      setActiveTransfer(t);
                      setIsManifestModalOpen(true);
                    }}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                    title="View Manifest & Timeline"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredTransfers.length === 0 && (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-700">No stock transfer orders found</h4>
            <p className="text-xs text-slate-400 mt-1">
              Initiate an inter-warehouse transfer order to redistribute inventory across fulfillment hubs.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-500"
            >
              <Plus className="w-4 h-4" />
              <span>Create Transfer Order</span>
            </button>
          </div>
        )}
      </div>

      {/* CREATE TRANSFER WIZARD MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Initiate Inter-Warehouse Transfer</h3>
                <p className="text-xs text-slate-500">Plan and authorize stock transfer between regional hubs</p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Source Warehouse (Origin) *</label>
                  <select
                    required
                    value={formData.sourceWarehouse}
                    onChange={(e) => setFormData({ ...formData, sourceWarehouse: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800"
                  >
                    <option value="">Select Origin Hub</option>
                    {warehouses.map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.warehouseCode} - {w.name} ({w.address?.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Destination Warehouse (Target) *</label>
                  <select
                    required
                    value={formData.destinationWarehouse}
                    onChange={(e) => setFormData({ ...formData, destinationWarehouse: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800"
                  >
                    <option value="">Select Destination Hub</option>
                    {warehouses.map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.warehouseCode} - {w.name} ({w.address?.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Priority Level</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800"
                >
                  <option value="STANDARD">Standard Transfer (Surface 48-72h)</option>
                  <option value="URGENT">Urgent Stock Rebalance (Air/Express 24h)</option>
                  <option value="STOCKOUT_PREVENTION">Stockout Prevention Alert</option>
                </select>
              </div>

              {/* Items Section */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block">Manifest Items to Transfer</span>
                {formData.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Product ID / ObjectId"
                      value={item.product}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[idx].product = e.target.value.trim();
                        setFormData({ ...formData, items: newItems });
                      }}
                      className="col-span-5 px-3 py-2 rounded-lg bg-white border border-slate-200 font-mono text-[11px]"
                    />
                    <input
                      type="text"
                      placeholder="Title / Description"
                      value={item.title}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[idx].title = e.target.value;
                        setFormData({ ...formData, items: newItems });
                      }}
                      className="col-span-4 px-3 py-2 rounded-lg bg-white border border-slate-200 text-[11px]"
                    />
                    <input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[idx].quantity = e.target.value;
                        setFormData({ ...formData, items: newItems });
                      }}
                      className="col-span-3 px-3 py-2 rounded-lg bg-white border border-slate-200 font-bold text-center"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Transfer Purpose & Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Stock rebalancing before festive weekend sale"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md"
                >
                  Submit Transfer Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH FLEET MODAL */}
      {isDispatchModalOpen && activeTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setIsDispatchModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-cyan-50 text-cyan-600">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Dispatch Transfer Shipment</h3>
                <p className="text-xs text-slate-500 font-mono">{activeTransfer.transferNumber}</p>
              </div>
            </div>

            <form onSubmit={handleDispatchSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Logistics / Courier Partner</label>
                <input
                  type="text"
                  required
                  value={dispatchData.courierPartner}
                  onChange={(e) => setDispatchData({ ...dispatchData, courierPartner: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">AWB / Tracking Number</label>
                  <input
                    type="text"
                    required
                    value={dispatchData.trackingNumber}
                    onChange={(e) => setDispatchData({ ...dispatchData, trackingNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle Plate Number</label>
                  <input
                    type="text"
                    required
                    value={dispatchData.vehicleNumber}
                    onChange={(e) => setDispatchData({ ...dispatchData, vehicleNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Driver Name</label>
                  <input
                    type="text"
                    required
                    value={dispatchData.driverName}
                    onChange={(e) => setDispatchData({ ...dispatchData, driverName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Driver Phone</label>
                  <input
                    type="text"
                    required
                    value={dispatchData.driverPhone}
                    onChange={(e) => setDispatchData({ ...dispatchData, driverPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                <strong>Notice:</strong> Dispatching will permanently deduct {activeTransfer.totalUnitsRequested} reserved units from source warehouse inventory.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black shadow-md"
                >
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIVE & INSPECT MODAL */}
      {isReceiveModalOpen && activeTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsReceiveModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Destination Receiving Inspection</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {activeTransfer.transferNumber} • Destination: {activeTransfer.destinationWarehouse?.name}
                </p>
              </div>
            </div>

            <form onSubmit={handleReceiveSubmit} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block">Item Verification (Received vs Damaged)</span>
                {receiveData.receivedItems.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{item.title}</span>
                      <span className="font-mono text-slate-500">Dispatched: {item.dispatchedQuantity}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-500 font-bold mb-1">Accepted Units</label>
                        <input
                          type="number"
                          min={0}
                          max={item.dispatchedQuantity}
                          value={item.receivedQuantity}
                          onChange={(e) => {
                            const newRec = [...receiveData.receivedItems];
                            newRec[idx].receivedQuantity = Number(e.target.value);
                            setReceiveData({ ...receiveData, receivedItems: newRec });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-bold text-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-500 font-bold mb-1">Damaged in Transit</label>
                        <input
                          type="number"
                          min={0}
                          value={item.damagedQuantity}
                          onChange={(e) => {
                            const newRec = [...receiveData.receivedItems];
                            newRec[idx].damagedQuantity = Number(e.target.value);
                            setReceiveData({ ...receiveData, receivedItems: newRec });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-bold text-rose-600"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Receiving Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={receiveData.remarks}
                  onChange={(e) => setReceiveData({ ...receiveData, remarks: e.target.value })}
                  placeholder="Verification notes..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md"
                >
                  Confirm & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANIFEST & TIMELINE INSPECTOR MODAL */}
      {isManifestModalOpen && activeTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsManifestModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Transfer Manifest & Audit Timeline</h3>
                <p className="text-xs text-slate-500 font-mono">{activeTransfer.transferNumber}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Manifest Overview Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Route:</span>
                  <span className="font-bold text-slate-800">
                    {activeTransfer.sourceWarehouse?.name} → {activeTransfer.destinationWarehouse?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Priority & Status:</span>
                  <span className="font-bold text-indigo-600">
                    {activeTransfer.priority} ({activeTransfer.status})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Total Dispatched / Received:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {activeTransfer.totalUnitsDispatched} units dispatched / {activeTransfer.totalUnitsReceived} units accepted
                  </span>
                </div>
              </div>

              {/* Activity Timeline */}
              <div>
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                  Chain-of-Custody Activity Timeline
                </h4>
                <div className="space-y-2.5">
                  {(activeTransfer.activityTimeline || []).map((event, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{event.status}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] mt-0.5">{event.note}</p>
                        <span className="text-[10px] text-slate-400">By: {event.performedBy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsManifestModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
                >
                  Close Manifest
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
