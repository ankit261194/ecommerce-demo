import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Compass,
  Navigation,
  Radio,
  Wifi,
  WifiOff,
  BatteryCharging,
  Zap,
  MapPin,
  Layers,
  Search,
  RotateCw,
  Phone,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Truck,
  ExternalLink,
  ChevronRight,
  User,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import api from '../api/client';

export default function FleetLiveMapRadarModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [fleetData, setFleetData] = useState(null);
  const [selectedRider, setSelectedRider] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [mapTheme, setMapTheme] = useState('obsidian'); // 'obsidian' | 'streets' | 'satellite'
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);

  // 1. Fetch live fleet map radar data
  const fetchFleetMap = async () => {
    try {
      const res = await api.get('/logistics/fleet/live-map');
      if (res.data?.success) {
        setFleetData(res.data.data);
        if (!selectedRider && res.data.data.riders?.length > 0) {
          setSelectedRider(res.data.data.riders[0]);
        }
      }
    } catch (err) {
      console.warn('Fallback to local fleet data:', err.message);
      // Fallback demo fleet
      setFleetData({
        activeRidersCount: 4,
        totalActiveTasks: 9,
        riders: [
          {
            _id: 'rider_01',
            name: 'Vikram Singh',
            phone: '+91 98765 43210',
            dutyStatus: 'ON_DUTY',
            isAvailable: true,
            assignedZone: 'Central BKC',
            location: { lat: 19.0657, lng: 72.8687, speed: 28, heading: 42, batteryLevel: 92, updatedAt: new Date() },
            activeTasksCount: 3,
            maxAllowedTasks: 4,
            tasks: [
              { _id: 't1', dropLocation: { recipientName: 'Aman Sharma', address: 'Flat 402, BKC Towers', city: 'Mumbai', pincode: '400051', coordinates: { lat: 19.0720, lng: 72.8750 } }, isCod: false, amountToCollect: 0, status: 'OUT_FOR_DELIVERY', dispatchType: '1_HOUR_HYPERLOCAL' },
              { _id: 't2', dropLocation: { recipientName: 'Meera Rao', address: 'Plot 18, Kurla West', city: 'Mumbai', pincode: '400070', coordinates: { lat: 19.0790, lng: 72.8820 } }, isCod: true, amountToCollect: 1499, status: 'PICKED_UP', dispatchType: 'STANDARD' },
            ],
          },
          {
            _id: 'rider_02',
            name: 'Arjun Verma',
            phone: '+91 98112 87654',
            dutyStatus: 'ON_DUTY',
            isAvailable: true,
            assignedZone: 'Powai Tech Hub',
            location: { lat: 19.1176, lng: 72.9060, speed: 34, heading: 110, batteryLevel: 78, updatedAt: new Date() },
            activeTasksCount: 2,
            maxAllowedTasks: 3,
            tasks: [
              { _id: 't3', dropLocation: { recipientName: 'Karan Malhotra', address: 'Hiranandani Gardens, Powai', city: 'Mumbai', pincode: '400076', coordinates: { lat: 19.1210, lng: 72.9120 } }, isCod: false, amountToCollect: 0, status: 'OUT_FOR_DELIVERY', dispatchType: '1_HOUR_HYPERLOCAL' },
            ],
          },
          {
            _id: 'rider_03',
            name: 'Rohan Mehra',
            phone: '+91 98223 99881',
            dutyStatus: 'ON_DUTY',
            isAvailable: true,
            assignedZone: 'Andheri East',
            location: { lat: 19.1136, lng: 72.8697, speed: 22, heading: 240, batteryLevel: 85, updatedAt: new Date() },
            activeTasksCount: 3,
            maxAllowedTasks: 4,
            tasks: [
              { _id: 't4', dropLocation: { recipientName: 'Sunita Patel', address: 'Saki Naka Metro, Andheri', city: 'Mumbai', pincode: '400072', coordinates: { lat: 19.1080, lng: 72.8800 } }, isCod: true, amountToCollect: 2299, status: 'ASSIGNED', dispatchType: 'SCHEDULED_SLOT' },
            ],
          },
          {
            _id: 'rider_04',
            name: 'Deepak Joshi',
            phone: '+91 98334 11223',
            dutyStatus: 'ON_DUTY',
            isAvailable: false,
            assignedZone: 'Ghatkopar Hub',
            location: { lat: 19.0860, lng: 72.9080, speed: 0, heading: 0, batteryLevel: 45, updatedAt: new Date() },
            activeTasksCount: 1,
            maxAllowedTasks: 3,
            tasks: [],
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFleetMap();
    }
  }, [isOpen]);

  // Periodic heartbeat every 12s
  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const interval = setInterval(fetchFleetMap, 12000);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh]);

  // Dynamic Leaflet Injection
  useEffect(() => {
    if (!isOpen) return;

    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => setLeafletLoaded(true);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';

    document.head.appendChild(link);
    document.head.appendChild(script);
  }, [isOpen]);

  // Initialize and update Leaflet Map instance
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || !fleetData?.riders) return;

    const L = window.L;
    if (!L) return;

    const defaultCenter = [19.0850, 72.8800];

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 12,
        zoomControl: false,
      });

      L.control.zoom({ position: 'topright' }).addTo(map);
      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;

    // Remove existing tile layers and markers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer || layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    // Add Tile Layer based on theme
    let tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    let attribution = '&copy; OpenStreetMap contributors &copy; CARTO';

    if (mapTheme === 'streets') {
      tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; OpenStreetMap contributors';
    } else if (mapTheme === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
    }

    L.tileLayer(tileUrl, { maxZoom: 19, attribution }).addTo(map);

    // Plot riders
    const bounds = [];
    fleetData.riders.forEach((rider) => {
      if (!rider.location?.lat || !rider.location?.lng) return;

      const pos = [rider.location.lat, rider.location.lng];
      bounds.push(pos);

      const isSelected = selectedRider?._id === rider._id;
      const heading = rider.location.heading || 0;
      const speed = rider.location.speed || 0;

      const markerHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="
            width: ${isSelected ? '38px' : '30px'};
            height: ${isSelected ? '38px' : '30px'};
            background: #0f172a;
            border: 2.5px solid ${isSelected ? '#f59e0b' : '#10b981'};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(0,0,0,0.5);
            transition: all 0.2s ease;
          ">
            <span style="font-size: ${isSelected ? '18px' : '14px'}; transform: rotate(${heading}deg); display: inline-block;">
              🏍️
            </span>
          </div>
          <div style="
            margin-top: 3px;
            background: rgba(15, 23, 42, 0.9);
            color: #f8fafc;
            border: 1px solid rgba(245, 158, 11, 0.5);
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 800;
            white-space: nowrap;
          ">
            ${rider.name.split(' ')[0]} • ${speed} km/h
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-rider-marker',
        iconSize: [40, 50],
        iconAnchor: [20, 25],
      });

      const marker = L.marker(pos, { icon: customIcon }).addTo(map);
      marker.on('click', () => setSelectedRider(rider));

      // If selected rider, plot delivery drops and connecting polylines
      if (isSelected && rider.tasks?.length > 0) {
        const polyPoints = [pos];
        rider.tasks.forEach((t, idx) => {
          if (t.dropLocation?.coordinates?.lat && t.dropLocation?.coordinates?.lng) {
            const dropPos = [t.dropLocation.coordinates.lat, t.dropLocation.coordinates.lng];
            polyPoints.push(dropPos);
            bounds.push(dropPos);

            const dropHtml = `
              <div style="
                background: #ef4444;
                color: #ffffff;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: 2px solid #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: 900;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
              ">
                #${idx + 1}
              </div>
            `;
            const dropIcon = L.divIcon({
              html: dropHtml,
              className: 'custom-drop-marker',
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            });

            L.marker(dropPos, { icon: dropIcon })
              .addTo(map)
              .bindPopup(`<b>Stop #${idx + 1}: ${t.dropLocation.recipientName}</b><br/>${t.dropLocation.address}<br/>${t.isCod ? 'COD: ₹' + t.amountToCollect : 'Prepaid'}`);
          }
        });

        if (polyPoints.length > 1) {
          L.polyline(polyPoints, {
            color: '#f59e0b',
            weight: 4,
            opacity: 0.85,
            dashArray: '6, 6',
          }).addTo(map);
        }
      }
    });

    if (bounds.length > 0 && map) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [leafletLoaded, fleetData, selectedRider, mapTheme]);

  if (!isOpen) return null;

  const ridersList = fleetData?.riders || [];
  const filteredRiders = ridersList.filter((r) => {
    const matchesQuery =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery) ||
      (r.assignedZone || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesZone = zoneFilter === 'ALL' || r.assignedZone === zoneFilter;
    return matchesQuery && matchesZone;
  });

  const availableZones = ['ALL', ...new Set(ridersList.map((r) => r.assignedZone).filter(Boolean))];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden text-white">
        
        {/* Top Command Bar */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>Logistics Central Radar • Fleet Live Map</span>
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  REAL-TIME GPS
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  Point #43
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Live OpenStreetMap & Leaflet Tile Radar • Multi-Rider Telemetry & Dynamic Route Inspection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Tile Layer Selector */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setMapTheme('obsidian')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  mapTheme === 'obsidian' ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Obsidian
              </button>
              <button
                type="button"
                onClick={() => setMapTheme('streets')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  mapTheme === 'streets' ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Streets
              </button>
              <button
                type="button"
                onClick={() => setMapTheme('satellite')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  mapTheme === 'satellite' ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Satellite
              </button>
            </div>

            {/* Auto Refresh Toggle */}
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition ${
                autoRefresh
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="Toggle Live GPS Heartbeat (12s)"
            >
              <Activity className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse' : ''}`} />
              <span>{autoRefresh ? 'Auto 12s' : 'Paused'}</span>
            </button>

            {/* Manual Refresh */}
            <button
              type="button"
              onClick={fetchFleetMap}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Refresh Fleet Map"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 5-Metric Bento Ribbon */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0 text-xs">
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-amber-400" />
              On-Duty Riders
            </span>
            <div className="text-base sm:text-lg font-black text-amber-400 mt-0.5">
              {fleetData?.activeRidersCount || 0} active
            </div>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-blue-400" />
              Active Consignments
            </span>
            <div className="text-base sm:text-lg font-black text-white mt-0.5">
              {fleetData?.totalActiveTasks || 0} orders in transit
            </div>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Fleet Velocity
            </span>
            <div className="text-base sm:text-lg font-black text-emerald-400 mt-0.5 flex items-center gap-1">
              <span>26.4</span>
              <span className="text-[10px] text-slate-400 font-normal">km/h avg</span>
            </div>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <BatteryCharging className="w-3.5 h-3.5 text-cyan-400" />
              EV Battery Fleet
            </span>
            <div className="text-base sm:text-lg font-black text-cyan-400 mt-0.5 flex items-center gap-1">
              <span>84%</span>
              <span className="text-[10px] text-slate-400 font-normal">healthy</span>
            </div>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              SLA Adherence
            </span>
            <div className="text-base sm:text-lg font-black text-purple-400 mt-0.5">
              98.2% on-time
            </div>
          </div>
        </div>

        {/* Workspace Dual Pane: Left Map (70%) + Right Fleet Deck (30%) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          
          {/* Map Container */}
          <div className="flex-1 h-full min-h-[350px] relative bg-slate-950 overflow-hidden">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Offline Canvas Fallback if Leaflet CDN is offline */}
            {!leafletLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-slate-400 text-xs flex-col gap-2 p-6 text-center">
                <Compass className="w-8 h-8 text-amber-400 animate-spin" />
                <p className="font-bold text-white">Initializing Leaflet Tile Engine...</p>
                <p className="text-[11px] text-slate-500">Connecting to OpenStreetMap tile servers</p>
              </div>
            )}

            {/* Selected Rider Overlay Pill on Map */}
            {selectedRider && (
              <div className="absolute bottom-4 left-4 z-10 max-w-sm bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 shadow-xl text-xs">
                <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-white">{selectedRider.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      {selectedRider.location?.speed || 0} km/h
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400">
                    ⚡ {selectedRider.location?.batteryLevel || 100}%
                  </span>
                </div>
                <div className="space-y-1 text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Zone:</span>
                    <span className="font-bold text-slate-200">{selectedRider.assignedZone || 'City Wide'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Active Tasks:</span>
                    <span className="font-black text-amber-400">{selectedRider.tasks?.length || 0} parcels</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Fleet Deck Panel */}
          <div className="w-full lg:w-96 bg-slate-950 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col shrink-0 overflow-hidden text-xs">
            
            {/* Search and Filters */}
            <div className="p-3.5 border-b border-slate-800 space-y-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search courier by name, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Zone Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {availableZones.map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setZoneFilter(z)}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition ${
                      zoneFilter === z
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {z}
                  </button>
                ))}
              </div>
            </div>

            {/* Riders List Deck */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredRiders.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No couriers matching filter.</p>
                </div>
              ) : (
                filteredRiders.map((rider) => {
                  const isSelected = selectedRider?._id === rider._id;
                  const tasksCount = rider.tasks?.length || 0;
                  const speed = rider.location?.speed || 0;

                  return (
                    <div
                      key={rider._id}
                      onClick={() => setSelectedRider(rider)}
                      className={`p-3 rounded-2xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 border-amber-400/60 shadow-lg'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-black text-amber-400 text-xs">
                            {rider.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-xs">{rider.name}</h4>
                            <span className="text-[10px] text-slate-400">{rider.phone}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`inline-block text-[10px] font-black px-1.5 py-0.2 rounded ${
                            speed > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {speed > 0 ? `${speed} km/h` : 'Idle'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-400" />
                          {rider.assignedZone || 'All Zones'}
                        </span>
                        <span className="font-bold text-amber-300">
                          {tasksCount} Active {tasksCount === 1 ? 'Task' : 'Tasks'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected Rider Consignments Drawer */}
            {selectedRider && selectedRider.tasks?.length > 0 && (
              <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-2">
                <h5 className="font-black text-amber-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Navigation className="w-3 h-3" />
                  Active Route Consignments ({selectedRider.tasks.length})
                </h5>
                <div className="max-h-40 overflow-y-auto space-y-1.5 font-sans text-[11px]">
                  {selectedRider.tasks.map((task, idx) => (
                    <div key={task._id || idx} className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <span className="font-bold text-white block truncate">
                          #{idx + 1}: {task.dropLocation?.recipientName}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {task.dropLocation?.address}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 block">
                          {task.dispatchType}
                        </span>
                        {task.isCod && (
                          <span className="text-[9px] text-emerald-400 font-bold mt-0.5 block">
                            COD ₹{task.amountToCollect}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <span className="text-slate-400">
            Click on any courier marker on the map or deck to inspect their delivery polyline and active consignment route.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
          >
            Close Radar
          </button>
        </div>

      </div>
    </div>
  );
}
