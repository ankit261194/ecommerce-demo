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
} from 'lucide-react';
import { BentoGrid, BentoCard } from '../components/BentoGrid';
import api from '../api/client';

export const CourierDashboard = () => {
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
      },
      customer: {
        name: 'Aman Sharma',
        phone: '9876543214',
        address: 'Flat 402, Green Valley Apartments, New Delhi',
        pincode: '110001',
      },
      itemSummary: '1x Aura Pro ANC Wireless Headphones',
      isCod: false,
      amountToCollect: 0,
      status: 'OUT_FOR_DELIVERY', // 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'
      expectedOtp: '4821', // Matches customer's secret OTP
    },
    {
      id: 'DEL-102',
      rawId: null,
      subOrderId: 'SUB-7612',
      vendor: {
        storeName: 'Apex Tech Hub',
        phone: '9876543211',
        address: 'Shop 14, Commercial Complex, Sector 18, Noida',
      },
      customer: {
        name: 'Priya Mehta',
        phone: '9876543299',
        address: 'House 88, Vasant Vihar, New Delhi',
        pincode: '110057',
      },
      itemSummary: '2x AeroWatch S9 Ultra Smartwatch',
      isCod: true,
      amountToCollect: 4499,
      status: 'PICKED_UP',
      expectedOtp: '9104',
    },
  ]);

  const [selectedTaskForOtp, setSelectedTaskForOtp] = useState(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchTasks = async () => {
    try {
      const res = await api.get('/delivery/tasks');
      if (res.data?.success && res.data?.data?.length > 0) {
        const mapped = res.data.data.map(t => ({
          id: `DEL-${t._id.toString().slice(-3).toUpperCase()}`,
          rawId: t._id,
          subOrderId: t.subOrder?._id ? `SUB-${t.subOrder._id.toString().slice(-4)}` : 'SUB-PARCEL',
          vendor: {
            storeName: t.subOrder?.vendor?.storeName || t.pickupLocation?.storeName || 'Apex Tech Hub',
            phone: t.pickupLocation?.phone || '9876543211',
            address: t.pickupLocation?.address || 'Shop 14, Sector 18, Noida',
          },
          customer: {
            name: t.subOrder?.customer?.name || t.dropLocation?.recipientName || 'Aman Sharma',
            phone: t.dropLocation?.phone || '9876543214',
            address: t.dropLocation?.address || 'Flat 402, Green Valley Apartments, New Delhi',
            pincode: t.dropLocation?.pincode || '110001',
          },
          itemSummary:
            t.subOrder?.items?.map(i => `${i.quantity}x ${i.title}`).join(', ') ||
            '1x Aura Pro ANC Wireless Headphones',
          isCod: t.isCod,
          amountToCollect: t.amountToCollect || 0,
          status: t.status,
          expectedOtp: t.subOrder?.deliveryOtp || '4821',
        }));
        setTasks(mapped);

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
    } catch (_) {}
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
    setSuccessMessage(`Task ${taskId} updated to ${newStatus}`);

    if (target?.rawId) {
      try {
        await api.put(`/delivery/tasks/${target.rawId}/status`, { status: newStatus });
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

    // Success OTP
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

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in text-slate-800">
      {successMessage && (
        <div className="p-4 rounded-xl text-sm font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-sm">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="text-xs underline font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          Courier & Express Logistics Hub
          <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            Field Partner
          </span>
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Pickups from merchant warehouses, drop navigation, and secure customer OTP verification
        </p>
      </div>

      {/* Bento Grid Metrics */}
      <BentoGrid>
        <BentoCard
          title="Active Assigned Drops"
          value={tasks.filter(t => t.status !== 'DELIVERED').length.toString()}
          subtitle="Orders currently in route"
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
          badge="On Duty"
          badgeColor="text-emerald-800 bg-emerald-50 border-emerald-200"
          accentColor="text-emerald-600"
        />
      </BentoGrid>

      {/* Assigned Delivery Tasks */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Truck className="w-5 h-5 text-amber-500" /> Assigned Delivery Tasks
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tasks.map(task => (
            <div
              key={task.id}
              className={`bg-white rounded-2xl p-6 border shadow-sm transition-all ${
                task.status === 'DELIVERED'
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : 'border-slate-200 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-base">{task.id}</span>
                    <span className="text-xs text-slate-400 font-medium">({task.subOrderId})</span>
                  </div>
                  <p className="text-xs text-slate-700 font-bold mt-0.5">{task.itemSummary}</p>
                </div>

                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                    task.status === 'DELIVERED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : task.status === 'OUT_FOR_DELIVERY'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  {task.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Locations Routing */}
              <div className="space-y-3 text-xs">
                {/* Pickup (Vendor) */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 block">Pickup: {task.vendor.storeName}</span>
                    <span className="text-slate-500 block mt-0.5">{task.vendor.address}</span>
                    <span className="text-amber-800 font-bold block mt-1">Phone: {task.vendor.phone}</span>
                  </div>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(task.vendor.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm"
                    title="Open Maps"
                  >
                    <Navigation className="w-4 h-4" />
                  </a>
                </div>

                {/* Drop (Customer) */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 block">Drop: {task.customer.name}</span>
                    <span className="text-slate-500 block mt-0.5">{task.customer.address} (PIN: {task.customer.pincode})</span>
                    <span className="text-emerald-800 font-bold block mt-1">Customer Phone: {task.customer.phone}</span>
                  </div>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(task.customer.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm"
                    title="Open Maps"
                  >
                    <Navigation className="w-4 h-4" />
                  </a>
                </div>

                {/* COD Payment Alert */}
                {task.isCod && task.status !== 'DELIVERED' && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold flex items-center justify-between">
                    <span>💵 Collect COD Cash:</span>
                    <span className="text-base text-slate-900 font-black">₹{task.amountToCollect.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                {task.status === 'ASSIGNED' && (
                  <button
                    onClick={() => handleAdvanceStatus(task.id, 'PICKED_UP')}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    Confirm Store Pickup
                  </button>
                )}

                {task.status === 'PICKED_UP' && (
                  <button
                    onClick={() => handleAdvanceStatus(task.id, 'OUT_FOR_DELIVERY')}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    Start Transit (Out for Delivery)
                  </button>
                )}

                {task.status === 'OUT_FOR_DELIVERY' && (
                  <button
                    onClick={() => {
                      setSelectedTaskForOtp(task);
                      setErrorMessage('');
                      setEnteredOtp('');
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 shadow-md transition-all"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Verify Customer OTP & Deliver</span>
                  </button>
                )}

                {task.status === 'DELIVERED' && (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Delivered & Verified
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4-Digit OTP Verification Modal */}
      {selectedTaskForOtp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-5">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Enter Customer Delivery OTP</h3>
              <p className="text-xs text-slate-500">
                Ask <strong className="text-slate-900">{selectedTaskForOtp.customer.name}</strong> for the 4-digit code shown on their order screen.
              </p>
            </div>

            {selectedTaskForOtp.isCod && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold text-center">
                Cash to collect: ₹{selectedTaskForOtp.amountToCollect.toLocaleString('en-IN')}
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
    </div>
  );
};
