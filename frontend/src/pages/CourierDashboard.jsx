import React, { useState, useEffect } from 'react';
import {
  Truck,
  MapPin,
  Phone,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Navigation,
  KeyRound,
  AlertCircle,
  FileText,
  Search,
  X,
  MessageSquare,
  ExternalLink,
  PhoneCall,
  RefreshCw,
  Compass,
  Check,
} from 'lucide-react';
import { BentoGrid, BentoCard } from '../components/BentoGrid';
import { CourierNavigationModal } from '../components/CourierNavigationModal';
import { CourierContactModal } from '../components/CourierContactModal';
import api from '../api/client';

export const CourierDashboard = () => {
  const [selectedTaskForNav, setSelectedTaskForNav] = useState(null);
  const [selectedTaskForContact, setSelectedTaskForContact] = useState(null);
  const [riderStats, setRiderStats] = useState({
    name: 'Vikram Singh',
    assignedTasks: 2,
    deliveredToday: 6,
    codCollectedToday: 4499,
  });

  const [tasks, setTasks] = useState([
    {
      id: 'DEL-101',
      rawId: null,
      subOrderId: 'SUB-9821',
      vendor: {
        storeName: 'Apex Tech Hub',
        phone: '9876543211',
        address: 'Shop 14, Commercial Complex, Sector 18, Noida',
        city: 'Noida',
        pincode: '201301',
      },
      customer: {
        name: 'Aman Sharma',
        phone: '9876543214',
        address: 'Flat 402, Green Valley Apartments, Sector 62',
        city: 'New Delhi',
        pincode: '110001',
        landmark: 'Near City Centre Gate #3',
      },
      itemSummary: '1x Aura Pro ANC Wireless Headphones',
      isCod: false,
      amountToCollect: 0,
      status: 'OUT_FOR_DELIVERY', // 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'
      expectedOtp: '4821', // Matches customer's secret OTP
      deliveryInstructions: 'Leave with security guard. Ring bell once.',
      mapUrl: 'https://maps.google.com/?q=Sector+62+New+Delhi+110001',
    },
    {
      id: 'DEL-102',
      rawId: null,
      subOrderId: 'SUB-7612',
      vendor: {
        storeName: 'Vogue Trends Apparel',
        phone: '9876543212',
        address: 'Unit 402, Fashion District, Sector 29, Gurugram',
        city: 'Gurugram',
        pincode: '122002',
      },
      customer: {
        name: 'Priya Mehta',
        phone: '9876543299',
        address: 'House 88, Vasant Vihar, Block C',
        city: 'New Delhi',
        pincode: '110057',
        landmark: 'Opposite Community Center',
      },
      itemSummary: '2x AeroWatch S9 Ultra Smartwatch',
      isCod: true,
      amountToCollect: 4499,
      status: 'PICKED_UP',
      expectedOtp: '9104',
      deliveryInstructions: 'Call before arriving. Gate #3 entrance.',
      mapUrl: 'https://maps.google.com/?q=House+88+Vasant+Vihar+New+Delhi+110057',
    },
  ]);

  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'ASSIGNED' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTaskForOtp, setSelectedTaskForOtp] = useState(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchTasks = async () => {
    setIsRefreshing(true);
    try {
      const res = await api.get('/delivery/tasks');
      if (res.data?.success && res.data?.data?.length > 0) {
        const mapped = res.data.data.map(t => {
          const dropAddr = t.dropLocation?.address || 'Flat 402, Green Valley Apartments';
          const dropCity = t.dropLocation?.city || 'New Delhi';
          const dropPin = t.dropLocation?.pincode || '110001';
          const mapQuery = encodeURIComponent(`${dropAddr}, ${dropCity} ${dropPin}`);

          return {
            id: `DEL-${t._id.toString().slice(-3).toUpperCase()}`,
            rawId: t._id,
            subOrderId: t.subOrder?._id ? `SUB-${t.subOrder._id.toString().slice(-4)}` : 'SUB-PARCEL',
            vendor: {
              storeName: t.subOrder?.vendor?.storeName || t.pickupLocation?.storeName || 'Apex Tech Hub',
              phone: t.pickupLocation?.phone || '9876543211',
              address: t.pickupLocation?.address || 'Shop 14, Sector 18, Noida',
              city: t.pickupLocation?.city || 'Noida',
              pincode: t.pickupLocation?.pincode || '',
            },
            customer: {
              name: t.subOrder?.customer?.name || t.dropLocation?.recipientName || 'Aman Sharma',
              phone: t.dropLocation?.phone || '9876543214',
              address: dropAddr,
              city: dropCity,
              pincode: dropPin,
              landmark: t.dropLocation?.landmark || '',
            },
            itemSummary:
              t.subOrder?.items?.map(i => `${i.quantity}x ${i.title}`).join(', ') ||
              '1x Aura Pro ANC Wireless Headphones',
            isCod: t.isCod,
            amountToCollect: t.amountToCollect || 0,
            status: t.status,
            expectedOtp: t.subOrder?.deliveryOtp || '4821',
            deliveryInstructions: t.deliveryInstructions || t.subOrder?.deliveryInstructions || '',
            mapUrl: t.dropLocation?.mapUrl || `https://maps.google.com/?q=${mapQuery}`,
          };
        });
        setTasks(mapped);

        // Update stats if backend returned aggregated stats
        if (res.data.stats) {
          setRiderStats(prev => ({
            ...prev,
            assignedTasks: res.data.stats.activeTransit,
            deliveredToday: res.data.stats.deliveredToday,
            codCollectedToday: res.data.stats.codCollectedToday,
          }));
        } else {
          const deliveredCount = mapped.filter(m => m.status === 'DELIVERED').length;
          const codSum = mapped
            .filter(m => m.status === 'DELIVERED' && m.isCod)
            .reduce((s, m) => s + m.amountToCollect, 0);

          setRiderStats(prev => ({
            ...prev,
            assignedTasks: mapped.filter(m => m.status !== 'DELIVERED').length,
            deliveredToday: deliveredCount > 0 ? deliveredCount : prev.deliveredToday,
            codCollectedToday: codSum > 0 ? codSum : prev.codCollectedToday,
          }));
        }
      }
    } catch (_) {
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Update Status to Picked Up or Out For Delivery
  const handleAdvanceStatus = async (taskId, newStatus) => {
    const target = tasks.find(t => t.id === taskId);
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    setSuccessMessage(`Delivery status updated to ${newStatus.replace(/_/g, ' ')}`);

    if (target?.rawId) {
      try {
        await api.put(`/delivery/tasks/${target.rawId}/status`, { status: newStatus });
        fetchTasks();
      } catch (err) {
        if (err.response?.data?.message) {
          setErrorMessage(err.response.data.message);
          setSuccessMessage('');
          setTasks(prev =>
            prev.map(t => (t.id === taskId ? { ...t, status: target.status } : t))
          );
        }
      }
    }
  };

  // Verify 4-Digit Customer OTP
  const handleVerifyOtp = async () => {
    if (!enteredOtp || enteredOtp.length !== 4) {
      setErrorMessage('Please enter a valid 4-digit numeric OTP.');
      return;
    }

    if (selectedTaskForOtp?.rawId) {
      try {
        const res = await api.post(`/delivery/tasks/${selectedTaskForOtp.rawId}/verify-otp`, {
          otp: enteredOtp,
          amountCollected: selectedTaskForOtp.amountToCollect,
        });

        if (res.data?.success) {
          setTasks(prev =>
            prev.map(t => (t.id === selectedTaskForOtp.id ? { ...t, status: 'DELIVERED' } : t))
          );

          if (selectedTaskForOtp.isCod) {
            setRiderStats(prev => ({
              ...prev,
              codCollectedToday: prev.codCollectedToday + selectedTaskForOtp.amountToCollect,
            }));
          }

          setRiderStats(prev => ({
            ...prev,
            deliveredToday: prev.deliveredToday + 1,
            assignedTasks: Math.max(0, prev.assignedTasks - 1),
          }));

          setSuccessMessage(`✅ Delivery Complete! Sub-order #${selectedTaskForOtp.subOrderId} verified via OTP.`);
          setSelectedTaskForOtp(null);
          setEnteredOtp('');
          setErrorMessage('');
          fetchTasks();
          return;
        }
      } catch (err) {
        setErrorMessage(err.response?.data?.message || '❌ Invalid OTP! Ask customer for code.');
        return;
      }
    }

    // Fallback simulation check
    if (enteredOtp !== selectedTaskForOtp.expectedOtp) {
      setErrorMessage('❌ Invalid OTP! Ask the customer for the 4-digit code shown on their order screen.');
      return;
    }

    // Success OTP simulation
    setTasks(prev =>
      prev.map(t => (t.id === selectedTaskForOtp.id ? { ...t, status: 'DELIVERED' } : t))
    );

    if (selectedTaskForOtp.isCod) {
      setRiderStats(prev => ({
        ...prev,
        codCollectedToday: prev.codCollectedToday + selectedTaskForOtp.amountToCollect,
      }));
    }

    setRiderStats(prev => ({
      ...prev,
      deliveredToday: prev.deliveredToday + 1,
      assignedTasks: Math.max(0, prev.assignedTasks - 1),
    }));

    setSuccessMessage(`✅ Delivery Complete! Sub-order #${selectedTaskForOtp.subOrderId} marked as DELIVERED.`);
    setSelectedTaskForOtp(null);
    setEnteredOtp('');
    setErrorMessage('');
  };

  // Filter tasks based on status tab and search query
  const filteredTasks = tasks.filter(task => {
    // Tab Filter
    if (filterTab === 'ACTIVE' && task.status === 'DELIVERED') return false;
    if (filterTab === 'ASSIGNED' && task.status !== 'ASSIGNED') return false;
    if (filterTab === 'OUT_FOR_DELIVERY' && !['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(task.status)) return false;
    if (filterTab === 'DELIVERED' && task.status !== 'DELIVERED') return false;

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchCustomer = task.customer?.name?.toLowerCase().includes(q);
      const matchPhone = task.customer?.phone?.includes(q);
      const matchAddress = task.customer?.address?.toLowerCase().includes(q) || task.customer?.city?.toLowerCase().includes(q);
      const matchPincode = task.customer?.pincode?.includes(q);
      const matchSub = task.subOrderId?.toLowerCase().includes(q) || task.id?.toLowerCase().includes(q);
      const matchVendor = task.vendor?.storeName?.toLowerCase().includes(q);

      return matchCustomer || matchPhone || matchAddress || matchPincode || matchSub || matchVendor;
    }

    return true;
  });

  const activeCount = tasks.filter(t => t.status !== 'DELIVERED').length;
  const assignedCount = tasks.filter(t => t.status === 'ASSIGNED').length;
  const transitCount = tasks.filter(t => ['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(t.status)).length;
  const deliveredCount = tasks.filter(t => t.status === 'DELIVERED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in text-slate-800">
      {successMessage && (
        <div className="p-4 rounded-xl text-sm font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-sm animate-fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            {successMessage}
          </span>
          <button onClick={() => setSuccessMessage('')} className="text-xs underline font-bold hover:text-emerald-950">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Courier & Express Logistics Hub
            <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              Field Partner
            </span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Point #63: Assigned drops dashboard with interactive map pins, customer direct phone & live route navigation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Rider Active & On Duty</span>
          </div>
          <button
            onClick={fetchTasks}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm transition-all flex items-center gap-1.5 text-xs font-bold disabled:opacity-50"
            title="Refresh Deliveries"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Bento Grid Metrics */}
      <BentoGrid>
        <BentoCard
          title="Active Assigned Drops"
          value={activeCount.toString()}
          subtitle="Drops in route or ready for pickup"
          icon={Truck}
          badge="Live Transit"
          badgeColor="text-blue-800 bg-blue-50 border-blue-200"
          accentColor="text-blue-600"
        />

        <BentoCard
          title="Successfully Delivered"
          value={riderStats.deliveredToday.toString()}
          subtitle="Confirmed via customer 4-digit OTP"
          icon={ShieldCheck}
          badge="Verified"
          badgeColor="text-emerald-800 bg-emerald-50 border-emerald-200"
          accentColor="text-emerald-600"
        />

        <BentoCard
          title="Cash on Delivery (COD)"
          value={`₹${riderStats.codCollectedToday.toLocaleString('en-IN')}`}
          subtitle="Total physical cash in hand to reconcile"
          icon={DollarSign}
          badge="Cash In Hand"
          badgeColor="text-amber-800 bg-amber-50 border-amber-200"
          accentColor="text-amber-600"
        />

        <BentoCard
          title="Delivery Partner"
          value={riderStats.name}
          subtitle="Express Logistics Division #402"
          icon={Navigation}
          badge="Active Shift"
          badgeColor="text-emerald-800 bg-emerald-50 border-emerald-200"
          accentColor="text-emerald-600"
        />
      </BentoGrid>

      {/* Point #63: Search & Status Filter Controls */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'ALL', label: 'All Drops', count: tasks.length },
              { id: 'ACTIVE', label: 'In Route', count: activeCount },
              { id: 'ASSIGNED', label: 'Store Pickup', count: assignedCount },
              { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', count: transitCount },
              { id: 'DELIVERED', label: 'Completed', count: deliveredCount },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  filterTab === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    filterTab === tab.id
                      ? 'bg-slate-700 text-amber-300'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 md:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer, phone, PIN, address..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Summary */}
        {(filterTab !== 'ALL' || searchQuery) && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>
              Showing <strong className="text-slate-900">{filteredTasks.length}</strong> of{' '}
              {tasks.length} assigned delivery drops
              {searchQuery && ` matching "${searchQuery}"`}
            </span>
            <button
              onClick={() => {
                setFilterTab('ALL');
                setSearchQuery('');
              }}
              className="text-amber-600 hover:text-amber-700 font-bold underline text-[11px]"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Point #63: Assigned Delivery Tasks Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-500" />
            <span>Assigned Drops Stream</span>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'} found
          </span>
        </h2>

        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-800 text-base">No Deliveries Matching Query</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              Try adjusting your search query or switch back to the 'All Drops' view to see all scheduled assignments.
            </p>
            <button
              onClick={() => {
                setFilterTab('ALL');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm"
            >
              View All Assigned Tasks
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredTasks.map(task => (
              <div
                key={task.id}
                className={`bg-white rounded-2xl p-6 border shadow-sm transition-all hover:shadow-md ${
                  task.status === 'DELIVERED'
                    ? 'border-emerald-200 bg-emerald-50/15'
                    : task.status === 'OUT_FOR_DELIVERY'
                    ? 'border-amber-300 ring-1 ring-amber-400/30'
                    : 'border-slate-200'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-base">{task.id}</span>
                      <span className="text-xs font-bold text-slate-400 font-mono">({task.subOrderId})</span>
                    </div>
                    <p className="text-xs text-slate-700 font-bold mt-0.5 line-clamp-1">{task.itemSummary}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                        task.status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : task.status === 'OUT_FOR_DELIVERY'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : task.status === 'PICKED_UP'
                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {task.status.replace(/_/g, ' ')}
                    </span>

                    {/* COD vs Prepaid indicator */}
                    {task.isCod ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                        COD: ₹{task.amountToCollect.toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Prepaid (No Cash)
                      </span>
                    )}
                  </div>
                </div>

                {/* Locations Routing & Contacts */}
                <div className="space-y-3.5 text-xs">
                  {/* Point #63: PROMINENT Customer Destination (Drop Location) with Map Pin */}
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/90 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-sm flex-shrink-0 mt-0.5">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                              Customer Destination (Drop Pin)
                            </span>
                          </div>
                          <span className="font-black text-slate-900 text-sm block mt-0.5">
                            {task.customer.name}
                          </span>
                          <span className="text-slate-600 block mt-0.5 font-medium leading-relaxed">
                            {task.customer.address}, {task.customer.city} — PIN: {task.customer.pincode}
                          </span>
                          {task.customer.landmark && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded bg-white text-emerald-900 font-bold text-[10px] border border-emerald-200">
                              Landmark: {task.customer.landmark}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Point #64: 1-Click GPS Navigation Modal Trigger */}
                      <button
                        onClick={() => setSelectedTaskForNav(task)}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 font-black shadow-xs flex items-center gap-1.5 flex-shrink-0 transition-all text-xs"
                        title="1-Click GPS Navigation (Google Maps / Apple Maps / Waze)"
                      >
                        <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">Navigate</span>
                      </button>
                    </div>

                    {/* Point #63: PROMINENT Customer Phone Contact Badge & Quick Triggers */}
                    <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="font-bold text-slate-900">Phone:</span>
                        <a
                          href={`tel:${task.customer.phone}`}
                          className="font-black text-emerald-800 hover:text-emerald-950 underline font-mono tracking-wide"
                        >
                          +91 {task.customer.phone}
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${task.customer.phone}`}
                          className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-all"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>Call</span>
                        </a>

                        <button
                          onClick={() => setSelectedTaskForContact(task)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-[11px] flex items-center gap-1 border border-emerald-300 shadow-xs transition-all"
                          title="Instant WhatsApp Quick Templates Hub"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-700" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Merchant Pickup Warehouse */}
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-700 flex-shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-slate-900 block truncate">
                        Pickup: {task.vendor.storeName}
                      </span>
                      <span className="text-slate-500 block mt-0.5 line-clamp-1">{task.vendor.address}</span>
                      <div className="flex items-center gap-3 mt-1 text-[11px]">
                        <span className="text-amber-800 font-bold flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {task.vendor.phone}
                        </span>
                        <a
                          href={`tel:${task.vendor.phone}`}
                          className="text-amber-700 hover:underline font-bold"
                        >
                          Call Merchant
                        </a>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedTaskForNav(task)}
                      className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm flex-shrink-0"
                      title="Open Navigation Hub"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* COD Cash to Collect Banner */}
                  {task.isCod && task.status !== 'DELIVERED' && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 font-bold flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-amber-600" />
                        <span>Collect Cash on Delivery:</span>
                      </div>
                      <span className="text-base text-slate-900 font-black">
                        ₹{task.amountToCollect.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  {/* Doorstep Rider Notes */}
                  {task.deliveryInstructions && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-300 text-amber-950">
                      <FileText className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-black text-[10px] uppercase tracking-wider text-amber-800 block">
                          📝 Rider Instructions / Doorstep Notes:
                        </span>
                        <p className="font-semibold text-xs text-slate-800 mt-0.5">{task.deliveryInstructions}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5 flex-wrap">
                  {task.status === 'ASSIGNED' && (
                    <button
                      onClick={() => handleAdvanceStatus(task.id, 'PICKED_UP')}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Confirm Store Pickup</span>
                    </button>
                  )}

                  {task.status === 'PICKED_UP' && (
                    <button
                      onClick={() => handleAdvanceStatus(task.id, 'OUT_FOR_DELIVERY')}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Start Transit (Out for Delivery)</span>
                    </button>
                  )}

                  {task.status === 'OUT_FOR_DELIVERY' && (
                    <button
                      onClick={() => {
                        setSelectedTaskForOtp(task);
                        setErrorMessage('');
                        setEnteredOtp('');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Verify Customer OTP & Deliver</span>
                    </button>
                  )}

                  {task.status === 'DELIVERED' && (
                    <span className="text-xs font-black text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Delivered & OTP Verified</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4-Digit OTP Verification Modal */}
      {selectedTaskForOtp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-5 animate-scale-up">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Enter Customer Delivery OTP</h3>
              <p className="text-xs text-slate-500 font-medium">
                Ask <strong className="text-slate-900">{selectedTaskForOtp.customer.name}</strong> for the 4-digit code shown on their order screen.
              </p>
            </div>

            {selectedTaskForOtp.isCod && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold text-center">
                💵 Collect Cash: <strong className="text-base text-slate-900 font-black">₹{selectedTaskForOtp.amountToCollect.toLocaleString('en-IN')}</strong>
              </div>
            )}

            <div>
              <input
                type="text"
                maxLength="4"
                placeholder="4-digit OTP (e.g. 4821)"
                value={enteredOtp}
                onChange={e => {
                  setEnteredOtp(e.target.value);
                  setErrorMessage('');
                }}
                className="w-full text-center tracking-widest text-2xl font-black py-3 rounded-xl bg-slate-50 border-2 border-slate-300 text-slate-900 focus:outline-none focus:border-amber-500"
              />
              {errorMessage && (
                <p className="text-xs text-rose-600 font-bold mt-2 text-center flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errorMessage}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTaskForOtp(null)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyOtp}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md"
              >
                Verify & Handover
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Point #64: 1-Click GPS Navigation Hub Modal */}
      {selectedTaskForNav && (
        <CourierNavigationModal
          task={selectedTaskForNav}
          onClose={() => setSelectedTaskForNav(null)}
        />
      )}
      {/* Point #65: Instant WhatsApp & Direct Call Modal */}
      {selectedTaskForContact && (
        <CourierContactModal
          task={selectedTaskForContact}
          onClose={() => setSelectedTaskForContact(null)}
        />
      )}
    </div>
  );
};
