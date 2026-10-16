import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Compass,
  Navigation,
  Zap,
  ShieldAlert,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  Eye,
  Crosshair,
  Sliders,
  DollarSign,
  Clock,
  ChevronRight,
  Sparkles,
  Info,
  X,
  Layers,
  Map,
} from 'lucide-react';
import api from '../api/client';

export const HyperlocalGeofenceManager = () => {
  const [darkStores, setDarkStores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);
  const [activeCityFilter, setActiveCityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Hub for Map Radar Focus & Inspection
  const [selectedHub, setSelectedHub] = useState(null);

  // Modal State for Create / Edit Hub
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHubId, setEditingHubId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    hubCode: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: '',
    centerLat: 12.9352,
    centerLng: 77.6245,
    geofenceType: 'RADIUS_CIRCLE',
    radiusKm: 5,
    polygonCoordinates: [
      { lat: 12.9400, lng: 77.6150 },
      { lat: 12.9450, lng: 77.6350 },
      { lat: 12.9250, lng: 77.6400 },
      { lat: 12.9200, lng: 77.6200 },
    ],
    minMinutes: 15,
    maxMinutes: 30,
    badgeText: '⚡ 15-Min Rocket Delivery',
    baseDeliveryFee: 35,
    freeThreshold: 499,
    isSurgeActive: false,
    surgeFee: 30,
    surgeReason: 'High Demand & Peak Rain',
    isActive: true,
  });

  // GPS Boundary Tester State
  const [testLat, setTestLat] = useState('12.9360');
  const [testLng, setTestLng] = useState('77.6260');
  const [testResult, setTestResult] = useState(null);
  const [isTestingGps, setIsTestingGps] = useState(false);

  // Fetch all dark stores
  const fetchDarkStores = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/hyperlocal/admin/dark-stores');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setDarkStores(res.data.data);
        if (res.data.data.length > 0 && !selectedHub) {
          setSelectedHub(res.data.data[0]);
        }
      }
    } catch (err) {
      // In case demo server or fallback
      console.warn('Hyperlocal fetch fallback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDarkStores();
  }, []);

  // Quick Notification
  const showToast = (type, text) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // 1-Click Surge Pricing Toggle
  const handleToggleSurge = async (hub) => {
    try {
      const res = await api.post(`/hyperlocal/admin/dark-stores/${hub._id}/toggle-surge`);
      if (res.data?.success) {
        showToast(
          'success',
          res.data.data.isSurgeActive
            ? `⚡ Surge Pricing ACTIVATED for ${hub.name} (+₹${hub.pricing?.surgeFee || 30})`
            : `✅ Surge Pricing DEACTIVATED for ${hub.name}`
        );
        fetchDarkStores();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to toggle surge pricing');
    }
  };

  // Delete Hub
  const handleDeleteHub = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete dark store "${name}"? All associated geofences will be deactivated.`)) return;
    try {
      const res = await api.delete(`/hyperlocal/admin/dark-stores/${id}`);
      if (res.data?.success) {
        showToast('success', `Dark store "${name}" deleted.`);
        fetchDarkStores();
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to delete hub');
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingHubId(null);
    setFormData({
      name: '',
      hubCode: `HUB-${Math.floor(100 + Math.random() * 900)}`,
      city: 'Bengaluru',
      state: 'Karnataka',
      address: '',
      centerLat: 12.9352,
      centerLng: 77.6245,
      geofenceType: 'RADIUS_CIRCLE',
      radiusKm: 5,
      polygonCoordinates: [
        { lat: 12.9400, lng: 77.6150 },
        { lat: 12.9450, lng: 77.6350 },
        { lat: 12.9250, lng: 77.6400 },
        { lat: 12.9200, lng: 77.6200 },
      ],
      minMinutes: 15,
      maxMinutes: 30,
      badgeText: '⚡ 15-Min Quick Commerce',
      baseDeliveryFee: 35,
      freeThreshold: 499,
      isSurgeActive: false,
      surgeFee: 30,
      surgeReason: 'Peak Demand & Rush Hour',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (hub) => {
    setEditingHubId(hub._id);
    setFormData({
      name: hub.name || '',
      hubCode: hub.hubCode || '',
      city: hub.city || 'Bengaluru',
      state: hub.state || 'Karnataka',
      address: hub.address || '',
      centerLat: hub.centerLocation?.lat || 12.9352,
      centerLng: hub.centerLocation?.lng || 77.6245,
      geofenceType: hub.geofenceType || 'RADIUS_CIRCLE',
      radiusKm: hub.radiusKm || 5,
      polygonCoordinates: (hub.polygonCoordinates && hub.polygonCoordinates.length > 0)
        ? hub.polygonCoordinates
        : [
            { lat: 12.9400, lng: 77.6150 },
            { lat: 12.9450, lng: 77.6350 },
            { lat: 12.9250, lng: 77.6400 },
            { lat: 12.9200, lng: 77.6200 },
          ],
      minMinutes: hub.deliveryPromise?.minMinutes || 15,
      maxMinutes: hub.deliveryPromise?.maxMinutes || 30,
      badgeText: hub.deliveryPromise?.badgeText || '⚡ 15-Min Delivery',
      baseDeliveryFee: hub.pricing?.baseDeliveryFee || 35,
      freeThreshold: hub.pricing?.freeThreshold || 499,
      isSurgeActive: !!hub.pricing?.isSurgeActive,
      surgeFee: hub.pricing?.surgeFee || 30,
      surgeReason: hub.pricing?.surgeReason || 'Rain / Peak Traffic',
      isActive: hub.isActive !== false,
    });
    setIsModalOpen(true);
  };

  // Submit Hub Form
  const handleSubmitHub = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        hubCode: formData.hubCode,
        city: formData.city,
        state: formData.state,
        address: formData.address,
        centerLocation: {
          lat: parseFloat(formData.centerLat),
          lng: parseFloat(formData.centerLng),
        },
        geofenceType: formData.geofenceType,
        radiusKm: parseFloat(formData.radiusKm),
        polygonCoordinates: formData.polygonCoordinates.map((p) => ({
          lat: parseFloat(p.lat),
          lng: parseFloat(p.lng),
        })),
        deliveryPromise: {
          minMinutes: parseInt(formData.minMinutes, 10),
          maxMinutes: parseInt(formData.maxMinutes, 10),
          badgeText: formData.badgeText,
        },
        pricing: {
          baseDeliveryFee: parseFloat(formData.baseDeliveryFee),
          freeThreshold: parseFloat(formData.freeThreshold),
          isSurgeActive: formData.isSurgeActive,
          surgeFee: parseFloat(formData.surgeFee),
          surgeReason: formData.surgeReason,
        },
        isActive: formData.isActive,
      };

      if (editingHubId) {
        const res = await api.put(`/hyperlocal/admin/dark-stores/${editingHubId}`, payload);
        if (res.data?.success) {
          showToast('success', `Dark store "${formData.name}" updated successfully!`);
        }
      } else {
        const res = await api.post('/hyperlocal/admin/dark-stores', payload);
        if (res.data?.success) {
          showToast('success', `New dark store "${formData.name}" geofence created!`);
        }
      }
      setIsModalOpen(false);
      fetchDarkStores();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Error saving dark store');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Run GPS Boundary Check
  const handleVerifyBoundary = async () => {
    const lat = parseFloat(testLat);
    const lng = parseFloat(testLng);
    if (isNaN(lat) || isNaN(lng)) {
      showToast('error', 'Please enter valid numerical Latitude and Longitude');
      return;
    }

    setIsTestingGps(true);
    setTestResult(null);
    try {
      const res = await api.post('/hyperlocal/check-boundary', { lat, lng });
      if (res.data?.success) {
        setTestResult(res.data.data);
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to verify GPS boundary');
    } finally {
      setIsTestingGps(false);
    }
  };

  // Use Browser Geolocation
  const handleUseBrowserGps = () => {
    if (!navigator.geolocation) {
      showToast('error', 'Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTestLat(pos.coords.latitude.toFixed(6));
        setTestLng(pos.coords.longitude.toFixed(6));
        showToast('success', `Captured live GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      (err) => {
        showToast('error', `GPS Capture Error: ${err.message}`);
      },
      { timeout: 10000 }
    );
  };

  // Filtered Dark Stores
  const filteredStores = useMemo(() => {
    return darkStores.filter((hub) => {
      const matchesCity = activeCityFilter === 'ALL' || hub.city.toLowerCase() === activeCityFilter.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        hub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hub.hubCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hub.address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCity && matchesSearch;
    });
  }, [darkStores, activeCityFilter, searchQuery]);

  // Cities List for Filter Pills
  const cities = useMemo(() => {
    const set = new Set(darkStores.map((h) => h.city).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [darkStores]);

  // Polygon Coordinate Management in Form
  const handleAddPolygonPoint = () => {
    setFormData((prev) => ({
      ...prev,
      polygonCoordinates: [
        ...prev.polygonCoordinates,
        { lat: (prev.centerLat || 12.9352) + 0.005, lng: (prev.centerLng || 77.6245) + 0.005 },
      ],
    }));
  };

  const handleRemovePolygonPoint = (idx) => {
    if (formData.polygonCoordinates.length <= 3) {
      showToast('error', 'A polygon geofence must have at least 3 vertices.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      polygonCoordinates: prev.polygonCoordinates.filter((_, i) => i !== idx),
    }));
  };

  const handleUpdatePolygonPoint = (idx, field, val) => {
    setFormData((prev) => {
      const updated = [...prev.polygonCoordinates];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, polygonCoordinates: updated };
    });
  };

  // Radar SVG Visualization Parameters
  // Computes bounding box from selected or first hub
  const activeFocusHub = selectedHub || filteredStores[0];
  const centerLat = activeFocusHub?.centerLocation?.lat || 12.9352;
  const centerLng = activeFocusHub?.centerLocation?.lng || 77.6245;

  // Lat/Lng to SVG coordinate mapper (500x500 box, span 0.15 deg ~ 16 km)
  const mapSpan = 0.16;
  const toSvgX = (lng) => {
    return 250 + ((lng - centerLng) / mapSpan) * 450;
  };
  const toSvgY = (lat) => {
    return 250 - ((lat - centerLat) / mapSpan) * 450;
  };

  // Convert km radius to SVG pixels (roughly 1 deg lat ~ 111 km)
  const kmToSvgRadius = (km) => {
    const deg = km / 111;
    return (deg / mapSpan) * 450;
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      {/* Toast Notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-black shadow-lg transition-all ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500 text-white shadow-emerald-500/20'
              : 'bg-rose-500 text-white shadow-rose-500/20'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-white" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-indigo-900/40 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-amber-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-black uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" />
              <span>Point #22: Hyperlocal Geofence Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Dark Store Hubs & Custom Geofence Radii
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Create and calibrate quick-commerce micro-fulfillment centers. Define polygon delivery boundaries or radius circles, automate 15-minute SLA dispatch promises, and toggle real-time surge pricing during peak hours.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchDarkStores}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Geofences</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 transition-all shadow-xl shadow-amber-500/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create Dark Store</span>
            </button>
          </div>
        </div>

        {/* Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Active Hubs</div>
            <div className="text-xl font-black text-white mt-0.5">{darkStores.filter((h) => h.isActive).length} Micro-Hubs</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Geofence Types</div>
            <div className="text-xl font-black text-amber-400 mt-0.5">
              {darkStores.filter((h) => h.geofenceType === 'POLYGON').length} Polygons • {darkStores.filter((h) => h.geofenceType === 'RADIUS_CIRCLE').length} Radii
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Surge Pricing</div>
            <div className="text-xl font-black text-rose-400 mt-0.5">
              {darkStores.filter((h) => h.pricing?.isSurgeActive).length} Hubs in Surge
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fastest SLA Promise</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">15 Minutes</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Visual Map Radar & Boundary Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Interactive SVG Geofence Radar Visualizer */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Map className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Tactical Geofence Radar Visualizer
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Click anywhere on the radar canvas to test customer GPS coordinates in real-time.
                </p>
              </div>
            </div>

            {/* City Selector */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setActiveCityFilter(city)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    activeCityFilter === city
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Map Canvas */}
          <div className="relative w-full aspect-square max-h-[460px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center select-none shadow-inner">
            <svg
              viewBox="0 0 500 500"
              className="w-full h-full cursor-crosshair"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = ((e.clientX - rect.left) / rect.width) * 500;
                const clickY = ((e.clientY - rect.top) / rect.height) * 500;
                // Convert back from SVG X/Y to Lat/Lng
                const lng = centerLng + ((clickX - 250) / 450) * mapSpan;
                const lat = centerLat - ((clickY - 250) / 450) * mapSpan;
                setTestLat(lat.toFixed(6));
                setTestLng(lng.toFixed(6));
                setTestResult(null);
              }}
            >
              {/* Radar Grid Lines */}
              <defs>
                <pattern id="radarGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1E293B" strokeWidth="0.8" />
                </pattern>
                <radialGradient id="hubRadarGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
                  <stop offset="70%" stopColor="#6366F1" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                </radialGradient>
              </defs>

              <rect width="500" height="500" fill="#0B0F19" />
              <rect width="500" height="500" fill="url(#radarGrid)" />

              {/* Concentric distance rings */}
              <circle cx="250" cy="250" r="75" fill="none" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />
              <circle cx="250" cy="250" r="150" fill="none" stroke="#334155" strokeDasharray="4 4" strokeWidth="0.8" />
              <circle cx="250" cy="250" r="225" fill="none" stroke="#334155" strokeDasharray="4 4" strokeWidth="0.8" />

              {/* Radar crosshairs */}
              <line x1="250" y1="0" x2="250" y2="500" stroke="#1E293B" strokeWidth="1" />
              <line x1="0" y1="250" x2="500" y2="250" stroke="#1E293B" strokeWidth="1" />

              {/* Render Dark Store Hub Geofences */}
              {filteredStores.map((hub) => {
                const isSelected = selectedHub?._id === hub._id;
                const isSurge = hub.pricing?.isSurgeActive;
                const hx = toSvgX(hub.centerLocation?.lng || 0);
                const hy = toSvgY(hub.centerLocation?.lat || 0);

                if (hub.geofenceType === 'RADIUS_CIRCLE') {
                  const rPx = kmToSvgRadius(hub.radiusKm || 5);
                  return (
                    <g key={hub._id} onClick={(e) => { e.stopPropagation(); setSelectedHub(hub); }} className="cursor-pointer">
                      {/* Radius Circle Area */}
                      <circle
                        cx={hx}
                        cy={hy}
                        r={rPx}
                        fill={isSurge ? '#F43F5E' : '#6366F1'}
                        fillOpacity={isSelected ? 0.25 : 0.12}
                        stroke={isSurge ? '#FB7185' : '#818CF8'}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        strokeDasharray={isSelected ? 'none' : '4 3'}
                      />
                      {/* Hub Center Pin */}
                      <circle cx={hx} cy={hy} r={6} fill={isSurge ? '#F43F5E' : '#38BDF8'} />
                      <circle cx={hx} cy={hy} r={10} fill="none" stroke={isSurge ? '#FDA4AF' : '#7DD3FC'} strokeWidth="1.5" className="animate-ping opacity-60" />
                      <text x={hx} y={hy - 14} fill="#F8FAFC" fontSize="10" fontWeight="bold" textAnchor="middle">
                        {hub.name} ({hub.radiusKm}km)
                      </text>
                    </g>
                  );
                }

                if (hub.geofenceType === 'POLYGON' && hub.polygonCoordinates?.length > 0) {
                  const pointsStr = hub.polygonCoordinates
                    .map((p) => `${toSvgX(p.lng)},${toSvgY(p.lat)}`)
                    .join(' ');
                  return (
                    <g key={hub._id} onClick={(e) => { e.stopPropagation(); setSelectedHub(hub); }} className="cursor-pointer">
                      <polygon
                        points={pointsStr}
                        fill={isSurge ? '#F43F5E' : '#10B981'}
                        fillOpacity={isSelected ? 0.3 : 0.14}
                        stroke={isSurge ? '#FB7185' : '#34D399'}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                      />
                      {/* Vertices */}
                      {hub.polygonCoordinates.map((v, idx) => (
                        <circle key={idx} cx={toSvgX(v.lng)} cy={toSvgY(v.lat)} r={3.5} fill="#34D399" />
                      ))}
                      {/* Hub Center Pin */}
                      <circle cx={hx} cy={hy} r={6} fill={isSurge ? '#F43F5E' : '#10B981'} />
                      <text x={hx} y={hy - 14} fill="#F8FAFC" fontSize="10" fontWeight="bold" textAnchor="middle">
                        {hub.name} (Polygon)
                      </text>
                    </g>
                  );
                }
                return null;
              })}

              {/* Render Tested GPS Pin if coordinates set */}
              {testLat && testLng && (
                <g>
                  <circle
                    cx={toSvgX(parseFloat(testLng))}
                    cy={toSvgY(parseFloat(testLat))}
                    r={8}
                    fill={testResult?.isDeliverable ? '#10B981' : '#EF4444'}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <circle
                    cx={toSvgX(parseFloat(testLng))}
                    cy={toSvgY(parseFloat(testLat))}
                    r={18}
                    fill="none"
                    stroke={testResult?.isDeliverable ? '#10B981' : '#EF4444'}
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  <text
                    x={toSvgX(parseFloat(testLng))}
                    y={toSvgY(parseFloat(testLat)) + 22}
                    fill="#F8FAFC"
                    fontSize="10"
                    fontWeight="black"
                    textAnchor="middle"
                    className="bg-slate-900"
                  >
                    📍 Test Point
                  </text>
                </g>
              )}
            </svg>

            {/* Radar Coordinates Overlay */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 text-[10px] font-mono text-slate-300">
              Center: {centerLat.toFixed(4)}°N, {centerLng.toFixed(4)}°E • Span: ~16km
            </div>

            <div className="absolute top-3 right-3 flex items-center gap-2">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-700 text-indigo-300 text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-indigo-400" /> Circle
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Polygon
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-700 text-rose-300 text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" /> Surge
              </span>
            </div>
          </div>
        </div>

        {/* Right Col: Live GPS Boundary Verification Engine */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-slate-900 text-sm">
                  Customer GPS Boundary Tester
                </h3>
              </div>
              <button
                type="button"
                onClick={handleUseBrowserGps}
                className="text-[11px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>My Live GPS</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Input customer destination latitude & longitude to verify if order qualifies for 15-minute quick commerce, calculate delivery fee & detect surge surcharges.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  Latitude (°N)
                </label>
                <input
                  type="text"
                  value={testLat}
                  onChange={(e) => setTestLat(e.target.value)}
                  placeholder="12.9360"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  Longitude (°E)
                </label>
                <input
                  type="text"
                  value={testLng}
                  onChange={(e) => setTestLng(e.target.value)}
                  placeholder="77.6260"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              onClick={handleVerifyBoundary}
              disabled={isTestingGps}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
            >
              <Compass className={`w-4 h-4 ${isTestingGps ? 'animate-spin' : ''}`} />
              <span>{isTestingGps ? 'Calculating Geodesic Boundary...' : 'Verify Delivery Boundary'}</span>
            </button>

            {/* Test Results Output Card */}
            {testResult && (
              <div
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  testResult.isDeliverable
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50/70 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {testResult.isDeliverable ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600" />
                    )}
                    <span className="font-black text-sm">
                      {testResult.isDeliverable ? 'Inside Quick Commerce Geofence' : 'Outside Hyperlocal Zone'}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      testResult.isDeliverable ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                    }`}
                  >
                    {testResult.isDeliverable ? '15-Min Ready' : 'Standard Courier'}
                  </span>
                </div>

                {testResult.isDeliverable ? (
                  <div className="text-xs space-y-1.5 pt-1 border-t border-emerald-200/60">
                    <div className="flex justify-between">
                      <span className="text-emerald-800 font-bold">Fulfilling Hub:</span>
                      <span className="font-black text-slate-900">{testResult.darkStore?.name} ({testResult.darkStore?.hubCode})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-800 font-bold">Delivery SLA Promise:</span>
                      <span className="font-black text-indigo-700">⚡ {testResult.deliveryPromise?.minMinutes}-{testResult.deliveryPromise?.maxMinutes} mins</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-800 font-bold">Base Delivery Fee:</span>
                      <span className="font-black text-slate-900">₹{testResult.pricing?.baseDeliveryFee} (Free above ₹{testResult.pricing?.freeThreshold})</span>
                    </div>
                    {testResult.pricing?.isSurgeActive && (
                      <div className="flex justify-between text-rose-700 font-bold">
                        <span>⚡ Surge Surcharge:</span>
                        <span>+₹{testResult.pricing?.surgeFee} ({testResult.pricing?.surgeReason || 'High Demand'})</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-emerald-200/60 font-black text-slate-900">
                      <span>Effective Delivery Fee:</span>
                      <span>₹{testResult.pricing?.effectiveDeliveryFee}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-rose-800 space-y-1">
                    <p className="font-medium">
                      This GPS coordinate does not fall inside any registered 15-minute quick commerce polygon or radius.
                    </p>
                    <p className="font-bold text-[11px] text-slate-700 pt-1">
                      📦 Fallback: Customer will receive regular 2-4 day surface courier shipping via BlueDart / Delhivery.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Presets for Demo Hubs */}
          <div className="p-4 rounded-3xl bg-slate-900 text-white space-y-3 shadow-sm border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Hyperlocal Benchmark Hubs</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Click any benchmark to set test coordinates and focus radar:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTestLat('12.9360');
                  setTestLng('77.6260');
                  setTestResult(null);
                }}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-all"
              >
                <div className="text-xs font-bold text-slate-200">Koramangala Hub</div>
                <div className="text-[10px] font-mono text-emerald-400">12.9360, 77.6260 (Inside)</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTestLat('12.9150');
                  setTestLng('77.6350');
                  setTestResult(null);
                }}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-all"
              >
                <div className="text-xs font-bold text-slate-200">HSR Layout Sector 1</div>
                <div className="text-[10px] font-mono text-emerald-400">12.9150, 77.6350 (Inside)</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTestLat('19.0650');
                  setTestLng('72.8680');
                  setTestResult(null);
                }}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-all"
              >
                <div className="text-xs font-bold text-slate-200">Mumbai BKC Central</div>
                <div className="text-[10px] font-mono text-amber-400">19.0650, 72.8680</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTestLat('13.1500');
                  setTestLng('77.8000');
                  setTestResult(null);
                }}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-all"
              >
                <div className="text-xs font-bold text-slate-200">Outside Boundary</div>
                <div className="text-[10px] font-mono text-rose-400">13.1500, 77.8000 (Outside)</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dark Stores Master Directory */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600" />
              <span>Registered Micro-Fulfillment Dark Stores ({filteredStores.length})</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live status, instant surge pricing toggles, and delivery promise settings across cities.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dark store or code..."
                className="pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 w-52 sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Dark Stores Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Hub & Location</th>
                <th className="py-3 px-3">Geofence Type</th>
                <th className="py-3 px-3">Center Lat / Lng</th>
                <th className="py-3 px-3">Delivery SLA</th>
                <th className="py-3 px-3">Pricing & Threshold</th>
                <th className="py-3 px-3 text-center">Surge Pricing</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredStores.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 font-bold">
                    No dark store hubs found matching criteria. Click "+ Create Dark Store" above to add one.
                  </td>
                </tr>
              ) : (
                filteredStores.map((hub) => (
                  <tr
                    key={hub._id}
                    className={`hover:bg-slate-50 transition-colors ${
                      selectedHub?._id === hub._id ? 'bg-indigo-50/50' : ''
                    }`}
                  >
                    {/* Hub & Location */}
                    <td className="py-4 px-3">
                      <div className="font-black text-slate-900">{hub.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {hub.hubCode} • {hub.city}, {hub.state}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{hub.address}</div>
                    </td>

                    {/* Geofence Type */}
                    <td className="py-4 px-3">
                      {hub.geofenceType === 'RADIUS_CIRCLE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <span>Radius Circle</span>
                          <span className="bg-indigo-200 text-indigo-900 px-1 rounded text-[10px]">
                            {hub.radiusKm} km
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span>Multi-Polygon</span>
                          <span className="bg-emerald-200 text-emerald-900 px-1 rounded text-[10px]">
                            {hub.polygonCoordinates?.length || 0} pts
                          </span>
                        </span>
                      )}
                    </td>

                    {/* Center Coordinates */}
                    <td className="py-4 px-3 font-mono text-[11px] text-slate-600">
                      {hub.centerLocation?.lat?.toFixed(4)}, {hub.centerLocation?.lng?.toFixed(4)}
                    </td>

                    {/* Delivery SLA */}
                    <td className="py-4 px-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1 text-xs">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{hub.deliveryPromise?.minMinutes}-{hub.deliveryPromise?.maxMinutes} Mins</span>
                      </div>
                      <div className="text-[10px] text-amber-700 font-bold">{hub.deliveryPromise?.badgeText}</div>
                    </td>

                    {/* Pricing */}
                    <td className="py-4 px-3">
                      <div className="font-bold text-slate-900">Base: ₹{hub.pricing?.baseDeliveryFee}</div>
                      <div className="text-[10px] text-emerald-600 font-semibold">
                        Free above ₹{hub.pricing?.freeThreshold}
                      </div>
                    </td>

                    {/* Surge Surcharge & 1-Click Toggle */}
                    <td className="py-4 px-3 text-center">
                      <button
                        onClick={() => handleToggleSurge(hub)}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 mx-auto ${
                          hub.pricing?.isSurgeActive
                            ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/20'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                        }`}
                        title="Click to toggle surge pricing (+₹30)"
                      >
                        <Zap className={`w-3.5 h-3.5 ${hub.pricing?.isSurgeActive ? 'fill-white' : ''}`} />
                        <span>{hub.pricing?.isSurgeActive ? `Surge Active (+₹${hub.pricing?.surgeFee})` : 'Normal Pricing'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedHub(hub);
                            setTestLat(hub.centerLocation?.lat?.toFixed(6) || '12.9352');
                            setTestLng(hub.centerLocation?.lng?.toFixed(6) || '77.6245');
                          }}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                          title="Focus Geofence on Radar Visualizer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(hub)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          title="Edit Hub & Geofence Boundary"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteHub(hub._id, hub.name)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                          title="Delete Dark Store"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal: Create / Edit Dark Store Hub */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {editingHubId ? 'Edit Dark Store & Geofence' : 'Create Quick Commerce Dark Store'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Configure location, delivery polygon boundaries, and quick commerce pricing rules.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitHub} className="space-y-4">
              {/* Row 1: Name & Hub Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                    Dark Store Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Koramangala Rocket Hub"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                    Hub Code (Unique) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.hubCode}
                    onChange={(e) => setFormData({ ...formData, hubCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. BLR-KOR-01"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>
              </div>

              {/* Row 2: City, State, Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Bengaluru"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g. Karnataka"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                  Physical Hub Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Plot 42, 80 Feet Rd, 4th Block, Koramangala"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Row 3: Center Coordinates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                    Center Latitude (°N) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.centerLat}
                    onChange={(e) => setFormData({ ...formData, centerLat: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                    Center Longitude (°E) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.centerLng}
                    onChange={(e) => setFormData({ ...formData, centerLng: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Row 4: Geofence Type Selector */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3">
                <label className="text-xs font-black text-indigo-900 uppercase tracking-wider block">
                  Geofence Boundary Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, geofenceType: 'RADIUS_CIRCLE' })}
                    className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all border ${
                      formData.geofenceType === 'RADIUS_CIRCLE'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Radius Circle (Km)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, geofenceType: 'POLYGON' })}
                    className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all border ${
                      formData.geofenceType === 'POLYGON'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Custom Polygon Boundary
                  </button>
                </div>

                {formData.geofenceType === 'RADIUS_CIRCLE' ? (
                  <div className="pt-2">
                    <div className="flex justify-between text-xs font-bold text-indigo-950 mb-1">
                      <span>Delivery Radius:</span>
                      <span className="font-black text-indigo-600">{formData.radiusKm} Kilometers</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      step="0.5"
                      value={formData.radiusKm}
                      onChange={(e) => setFormData({ ...formData, radiusKm: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                ) : (
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-950">
                        Polygon Vertices ({formData.polygonCoordinates.length} Points):
                      </span>
                      <button
                        type="button"
                        onClick={handleAddPolygonPoint}
                        className="text-[11px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Vertex</span>
                      </button>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                      {formData.polygonCoordinates.map((pt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 w-4">#{idx + 1}</span>
                          <input
                            type="number"
                            step="any"
                            value={pt.lat}
                            onChange={(e) => handleUpdatePolygonPoint(idx, 'lat', e.target.value)}
                            placeholder="Lat"
                            className="w-1/2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono"
                          />
                          <input
                            type="number"
                            step="any"
                            value={pt.lng}
                            onChange={(e) => handleUpdatePolygonPoint(idx, 'lng', e.target.value)}
                            placeholder="Lng"
                            className="w-1/2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePolygonPoint(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Row 5: SLA Delivery Promise */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                    Min Mins
                  </label>
                  <input
                    type="number"
                    value={formData.minMinutes}
                    onChange={(e) => setFormData({ ...formData, minMinutes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                    Max Mins
                  </label>
                  <input
                    type="number"
                    value={formData.maxMinutes}
                    onChange={(e) => setFormData({ ...formData, maxMinutes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                    Badge Text
                  </label>
                  <input
                    type="text"
                    value={formData.badgeText}
                    onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                    placeholder="⚡ 15-Min Rocket Delivery"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Row 6: Pricing & Surge Rules */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                    Base Delivery Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.baseDeliveryFee}
                    onChange={(e) => setFormData({ ...formData, baseDeliveryFee: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                    Free Threshold (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.freeThreshold}
                    onChange={(e) => setFormData({ ...formData, freeThreshold: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                    Surge Surcharge (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.surgeFee}
                    onChange={(e) => setFormData({ ...formData, surgeFee: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Surge Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs">
                <div>
                  <span className="font-bold text-amber-950 block">⚡ Surge Pricing Enabled</span>
                  <span className="text-[11px] text-amber-800">Immediately applies surge fee during checkout in this zone.</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isSurgeActive}
                  onChange={(e) => setFormData({ ...formData, isSurgeActive: e.target.checked })}
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-lg shadow-indigo-600/20"
                >
                  {isSubmitting ? 'Saving Geofence...' : editingHubId ? 'Update Dark Store' : 'Create Dark Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HyperlocalGeofenceManager;
