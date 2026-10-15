import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Truck,
  Printer,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Search,
  Check,
  X,
  Package,
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  ShieldCheck,
  QrCode,
  Download,
  Barcode,
  Layers,
} from 'lucide-react';
import api from '../api/client';

export default function ShippingManifestManager() {
  const [activeCourier, setActiveCourier] = useState('AuraExpress Prime');
  const [eligibleParcels, setEligibleParcels] = useState([]);
  const [selectedParcelIds, setSelectedParcelIds] = useState([]);
  const [manifests, setManifests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notification, setNotification] = useState(null);

  // Modals
  const [activeManifestModal, setActiveManifestModal] = useState(null);
  const [handoverModalData, setHandoverModalData] = useState(null);
  const [driverForm, setDriverForm] = useState({
    courierDriverName: '',
    courierDriverPhone: '',
    courierVehicleNumber: '',
    courierSignatureNote: 'Received all verified sealed parcels in good condition.',
  });
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);

  const couriers = [
    'AuraExpress Prime',
    'BlueDart Express',
    'Delhivery Logistics',
    'Shadowfax',
    'DTDC Express',
  ];

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [parcelsRes, manifestsRes] = await Promise.allSettled([
        api.get(`/manifests/eligible-parcels?courier=${encodeURIComponent(activeCourier)}`),
        api.get('/manifests'),
      ]);

      if (parcelsRes.status === 'fulfilled' && parcelsRes.value.data?.data) {
        const pList = parcelsRes.value.data.data;
        setEligibleParcels(pList);
        // Default select all
        setSelectedParcelIds(pList.map((p, idx) => p.subOrderId || p.orderNumber || idx));
      }
      if (manifestsRes.status === 'fulfilled' && manifestsRes.value.data?.data) {
        setManifests(manifestsRes.value.data.data);
      }
    } catch (err) {
      console.error('Failed to load manifest data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeCourier]);

  const toggleSelectAll = () => {
    if (selectedParcelIds.length === eligibleParcels.length) {
      setSelectedParcelIds([]);
    } else {
      setSelectedParcelIds(eligibleParcels.map((p, idx) => p.subOrderId || p.orderNumber || idx));
    }
  };

  const toggleSelectParcel = (id) => {
    if (selectedParcelIds.includes(id)) {
      setSelectedParcelIds(selectedParcelIds.filter((item) => item !== id));
    } else {
      setSelectedParcelIds([...selectedParcelIds, id]);
    }
  };

  const selectedParcels = eligibleParcels.filter((p, idx) =>
    selectedParcelIds.includes(p.subOrderId || p.orderNumber || idx)
  );

  const totalWeight = selectedParcels.reduce((sum, p) => sum + (Number(p.weightKg) || 0.5), 0);
  const totalCod = selectedParcels.reduce((sum, p) => sum + (Number(p.collectibleAmount) || 0), 0);
  const totalDeclared = selectedParcels.reduce((sum, p) => sum + (Number(p.declaredValue) || 0), 0);

  const handleGenerateManifest = async () => {
    if (selectedParcels.length === 0) {
      showNotification('error', 'Please select at least 1 parcel to generate manifest');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await api.post('/manifests/generate', {
        courierPartner: activeCourier,
        parcels: selectedParcels,
      });

      if (res.data?.success) {
        showNotification('success', res.data.message || 'Manifest generated successfully!');
        setActiveManifestModal(res.data.data);
        fetchData();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to generate manifest');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenHandover = (manifest) => {
    setHandoverModalData(manifest);
    setDriverForm({
      courierDriverName: manifest.courierDriverName || '',
      courierDriverPhone: manifest.courierDriverPhone || '',
      courierVehicleNumber: manifest.courierVehicleNumber || '',
      courierSignatureNote: manifest.courierSignatureNote || 'Received all verified sealed parcels in good condition.',
    });
  };

  const handleSubmitHandover = async (e) => {
    e.preventDefault();
    if (!driverForm.courierDriverName || !driverForm.courierDriverPhone) {
      showNotification('error', 'Please provide driver name and phone number');
      return;
    }

    setIsSubmittingHandover(true);
    try {
      const res = await api.patch(`/manifests/${handoverModalData._id}/handover`, driverForm);
      if (res.data?.success) {
        showNotification('success', res.data.message);
        setHandoverModalData(null);
        fetchData();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to submit handover');
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  const handlePrint = (manifestId) => {
    window.open(`/api/manifests/${manifestId}/print`, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-semibold transition-all transform animate-bounce-short ${
            notification.type === 'success'
              ? 'bg-slate-900 border-amber-500/40 text-amber-300'
              : 'bg-rose-950 border-rose-500 text-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-amber-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-amber-400" />
                Point #12 Master Enterprise
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Bulk Dispatch Handover
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <FileText className="w-7 h-7 text-amber-400" />
              <span>Daily Courier Shipping Manifest & Handover Slip</span>
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Generate authenticated parcel handover sheets with individual barcodes, physical courier driver signature lines, and COD cash reconciliation.
            </p>
          </div>

          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Parcels</span>
          </button>
        </div>

        {/* Courier Selector Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-slate-800/80 overflow-x-auto pb-1">
          {couriers.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCourier(c)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeCourier === c
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Dispatch Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-500">Parcels Selected</div>
          <div className="text-2xl font-black text-slate-900">
            {selectedParcels.length} / {eligibleParcels.length}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Ready for handover</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-500">Gross Weight</div>
          <div className="text-2xl font-black text-blue-600">
            {totalWeight.toFixed(2)} kg
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Total shipment weight</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-500">COD to Collect</div>
          <div className="text-2xl font-black text-amber-600">
            ₹{totalCod.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Courier cash remittance</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-500">Declared Value</div>
          <div className="text-2xl font-black text-purple-600">
            ₹{totalDeclared.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Insurance valuation</div>
        </div>
      </div>

      {/* Main Grid: Parcels Selection + Generator */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-500" />
              <span>Ready-To-Ship Parcels Queue &bull; {activeCourier}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select packed orders to bundle into today's official handover manifest.
            </p>
          </div>

          <button
            onClick={handleGenerateManifest}
            disabled={isGenerating || selectedParcels.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>
              {isGenerating
                ? 'Compiling Manifest...'
                : `Generate Handover Manifest (${selectedParcels.length})`}
            </span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 uppercase font-black tracking-wider">
              <tr>
                <th className="py-3.5 px-6 w-12">
                  <input
                    type="checkbox"
                    checked={eligibleParcels.length > 0 && selectedParcelIds.length === eligibleParcels.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-amber-600 accent-amber-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Order & Tracking</th>
                <th className="py-3.5 px-4">Customer & Destination</th>
                <th className="py-3.5 px-4">Weight</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">COD Collectible</th>
                <th className="py-3.5 px-6 text-right">Declared Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {eligibleParcels.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 italic">
                    No pending parcels found for {activeCourier}. All shipments are up to date!
                  </td>
                </tr>
              ) : (
                eligibleParcels.map((parcel, idx) => {
                  const parcelKey = parcel.subOrderId || parcel.orderNumber || idx;
                  const isChecked = selectedParcelIds.includes(parcelKey);
                  return (
                    <tr
                      key={parcelKey}
                      className={`hover:bg-amber-50/20 transition-colors ${isChecked ? 'bg-amber-50/10' : ''}`}
                    >
                      <td className="py-3.5 px-6">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectParcel(parcelKey)}
                          className="w-4 h-4 rounded text-amber-600 accent-amber-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-black text-slate-900 text-xs">{parcel.orderNumber}</div>
                        <div className="font-mono text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                          {parcel.trackingNumber}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{parcel.customerName}</div>
                        <div className="text-[11px] text-slate-500">
                          {parcel.destinationCity} ({parcel.destinationPincode}) &bull; {parcel.customerPhone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {parcel.weightKg} kg
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            parcel.paymentMode === 'COD'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {parcel.paymentMode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {parcel.paymentMode === 'COD' ? `₹${parcel.collectibleAmount?.toLocaleString()}` : '₹0'}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono font-black text-slate-900">
                        ₹{parcel.declaredValue?.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Manifests Section */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-500" />
            <span>Generated Courier Shipping Manifests Archive</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Legal handover logs, driver signature records, and printable duplicate manifests.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 uppercase font-black tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Manifest No.</th>
                <th className="py-3.5 px-4">Courier Partner</th>
                <th className="py-3.5 px-4">Dispatch Date</th>
                <th className="py-3.5 px-4">Parcels & Weight</th>
                <th className="py-3.5 px-4">COD Total</th>
                <th className="py-3.5 px-4">Handover Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {manifests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 italic">
                    No manifests generated yet. Create your first courier handover above!
                  </td>
                </tr>
              ) : (
                manifests.map((man) => (
                  <tr key={man._id || man.manifestNumber} className="hover:bg-amber-50/20 transition-colors">
                    <td className="py-4 px-6 font-mono font-black text-slate-900">
                      <div>{man.manifestNumber}</div>
                      <div className="text-[10px] text-slate-400 font-sans">
                        Supervisor: {man.supervisorName}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900">
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs">
                        {man.courierPartner}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      {new Date(man.dispatchDate).toLocaleDateString()}
                      <div className="text-[10px] text-slate-400">
                        {new Date(man.dispatchDate).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono">
                      <div className="font-bold text-slate-900">{man.totalParcels} Parcels</div>
                      <div className="text-[10px] text-slate-500 font-sans">{man.totalWeightKg} kg</div>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-amber-600">
                      ₹{man.totalCodAmount?.toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      {man.status === 'HANDED_OVER' ? (
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            Handed Over
                          </span>
                          <div className="text-[10px] text-slate-500">
                            Driver: {man.courierDriverName}
                          </div>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                          Awaiting Pickup
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        {man.status !== 'HANDED_OVER' && (
                          <button
                            onClick={() => handleOpenHandover(man)}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs transition-all shadow-sm active:scale-95"
                          >
                            Sign Handover
                          </button>
                        )}
                        <button
                          onClick={() => handlePrint(man._id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all shadow-sm active:scale-95"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print Slip</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Driver Handover Sign-Off Modal */}
      {handoverModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleSubmitHandover}
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200 relative animate-scale-up"
          >
            <button
              type="button"
              onClick={() => setHandoverModalData(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center">
                <Truck className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Courier Driver Handover Sign-Off
              </h3>
              <p className="text-xs text-slate-500">
                Manifest: <span className="font-mono font-bold">{handoverModalData.manifestNumber}</span> ({handoverModalData.totalParcels} Parcels)
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Driver / Representative Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Singh"
                  value={driverForm.courierDriverName}
                  onChange={(e) => setDriverForm({ ...driverForm, courierDriverName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Driver Mobile Phone</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={driverForm.courierDriverPhone}
                  onChange={(e) => setDriverForm({ ...driverForm, courierDriverPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Courier Vehicle / Bike Plate No.</label>
                <input
                  type="text"
                  placeholder="e.g. DL 01 AB 1234"
                  value={driverForm.courierVehicleNumber}
                  onChange={(e) => setDriverForm({ ...driverForm, courierVehicleNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-amber-500 uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Physical Signature Note</label>
                <textarea
                  rows="2"
                  value={driverForm.courierSignatureNote}
                  onChange={(e) => setDriverForm({ ...driverForm, courierSignatureNote: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setHandoverModalData(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingHandover}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isSubmittingHandover ? 'Recording Sign-Off...' : 'Confirm Handover & Sign'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Generated Success Modal with Direct Print Option */}
      {activeManifestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200 relative animate-scale-up text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Shipping Manifest Ready!
              </h3>
              <p className="font-mono text-sm font-black text-amber-600">
                {activeManifestModal.manifestNumber}
              </p>
              <p className="text-xs text-slate-500">
                {activeManifestModal.totalParcels} parcels assigned to {activeManifestModal.courierPartner}.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Dispatch Weight:</span>
                <span className="font-mono font-bold text-slate-900">{activeManifestModal.totalWeightKg} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total COD Collectible:</span>
                <span className="font-mono font-bold text-amber-700">₹{activeManifestModal.totalCodAmount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Declared Goods Value:</span>
                <span className="font-mono font-bold text-slate-900">₹{activeManifestModal.totalDeclaredValue?.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setActiveManifestModal(null)}
                className="w-1/2 py-2.5 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handlePrint(activeManifestModal._id);
                  setActiveManifestModal(null);
                }}
                className="w-1/2 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Manifest</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
