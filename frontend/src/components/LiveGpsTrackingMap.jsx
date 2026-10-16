import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Navigation,
  Phone,
  MessageSquare,
  Clock,
  Zap,
  Play,
  RotateCw,
  Compass,
  ShieldCheck,
  CheckCircle2,
  Truck,
  Flame,
  Radio,
  BatteryCharging,
  Layers,
  History,
  Activity,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../api/client';

export default function LiveGpsTrackingMap({
  orderId,
  subOrderId,
  deliveryOtp = '4821',
  recipientName = 'Customer',
  deliveryAddress = 'Doorstep Delivery',
}) {
  const [gpsData, setGpsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [progress, setProgress] = useState(0.65); // 0 to 1 along polyline
  const [countdownSeconds, setCountdownSeconds] = useState(360);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const [lastTelemetryPing, setLastTelemetryPing] = useState(null);
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [mapTheme, setMapTheme] = useState('obsidian'); // obsidian, blueprint, satellite
  const [speedGauge, setSpeedGauge] = useState(28);
  const [batteryLevel, setBatteryLevel] = useState(92);
  const [headingDegrees, setHeadingDegrees] = useState(42);

  const socketRef = useRef(null);
  const simIntervalRef = useRef(null);
  const identifier = subOrderId || orderId || 'DEMO-ORDER';

  // 1. Fetch initial GPS and route data
  useEffect(() => {
    let isMounted = true;
    const fetchGps = async () => {
      try {
        const res = await api.get(`/delivery/live-tracking/${identifier}`);
        if (res.data?.success && isMounted) {
          const d = res.data.data;
          setGpsData(d);
          setCountdownSeconds(d.route?.etaSeconds || 360);
          setSpeedGauge(d.rider?.speedKmH || 28);
          setHeadingDegrees(d.rider?.headingDegrees || 42);
          setBatteryLevel(d.rider?.batteryLevel || 92);
          if (d.telemetryHistory) setTelemetryHistory(d.telemetryHistory);
        }
      } catch (err) {
        console.warn('Fallback to local GPS data:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchGps();
    return () => {
      isMounted = false;
    };
  }, [identifier]);

  // 2. Setup Real-time Socket.io Telemetry Gateway
  useEffect(() => {
    // Determine socket server URL based on current host
    const socketUrl = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
      ? 'http://localhost:5000'
      : window.location.origin;

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      setSocketId(socket.id);
      // Join order-specific telemetry room
      socket.emit('join_tracking_room', {
        orderId: identifier,
        role: 'customer',
      });
    });

    socket.on('joined_room', (data) => {
      setSocketConnected(true);
    });

    // Handle real-time incoming rider GPS coordinates broadcast
    socket.on('rider:location_update', (event) => {
      if (event?.location) {
        const loc = event.location;
        setLastTelemetryPing(new Date());
        if (loc.speed !== undefined) setSpeedGauge(loc.speed);
        if (loc.heading !== undefined) setHeadingDegrees(loc.heading);
        if (loc.batteryLevel !== undefined) setBatteryLevel(loc.batteryLevel);

        setGpsData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            rider: {
              ...prev.rider,
              currentLocation: { lat: loc.lat, lng: loc.lng },
              speedKmH: loc.speed || prev.rider?.speedKmH,
              headingDegrees: loc.heading || prev.rider?.headingDegrees,
              batteryLevel: loc.batteryLevel || prev.rider?.batteryLevel,
            },
          };
        });

        setTelemetryHistory((prev) => [
          ...prev.slice(-15),
          {
            lat: loc.lat,
            lng: loc.lng,
            speed: loc.speed,
            heading: loc.heading,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    });

    // Handle real-time ETA & distance update
    socket.on('telemetry:eta_update', (event) => {
      if (event?.eta) {
        if (event.eta.etaSeconds !== undefined) setCountdownSeconds(event.eta.etaSeconds);
        setGpsData((prev) => {
          if (!prev?.route) return prev;
          return {
            ...prev,
            route: {
              ...prev.route,
              distanceRemainingKm: event.eta.distanceRemainingKm ?? prev.route.distanceRemainingKm,
              etaMinutes: event.eta.etaMinutes ?? prev.route.etaMinutes,
              etaSeconds: event.eta.etaSeconds ?? prev.route.etaSeconds,
            },
          };
        });
      }
    });

    // Handle order status transitions
    socket.on('order:status_update', (event) => {
      if (event?.status) {
        setGpsData((prev) => (prev ? { ...prev, status: event.status } : prev));
      }
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('connect_error', () => {
      setSocketConnected(false);
    });

    return () => {
      if (socket) {
        socket.emit('leave_tracking_room', { orderId: identifier });
        socket.disconnect();
      }
    };
  }, [identifier]);

  // 3. Live countdown timer ticking down
  useEffect(() => {
    if (countdownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdownSeconds]);

  // 4. Server-synced simulation of bike moving along route polyline
  const startSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setProgress(0);

    let step = 0;
    const totalSteps = 8;

    simIntervalRef.current = setInterval(async () => {
      step += 1;
      const newProgress = Math.min(1, step / totalSteps);
      setProgress(newProgress);

      try {
        const res = await api.post(`/delivery/live-tracking/${identifier}/simulate-step`, {
          stepIndex: step,
          customSpeed: step === totalSteps ? 0 : 32,
        });
        if (res.data?.success) {
          const loc = res.data.data.location;
          setSpeedGauge(loc.speed);
          setHeadingDegrees(loc.heading);
          setBatteryLevel(loc.batteryLevel);
          if (res.data.data.route?.etaSeconds !== undefined) {
            setCountdownSeconds(res.data.data.route.etaSeconds);
          }
        }
      } catch (err) {
        console.warn('Simulation step local fallback:', err.message);
      }

      if (step >= totalSteps) {
        clearInterval(simIntervalRef.current);
        setIsSimulating(false);
      }
    }, 1600);
  };

  const stopSimulation = () => {
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    setIsSimulating(false);
  };

  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  // Default coordinate set if API loading or offline
  const routePoints = gpsData?.route?.polyline || [
    [19.0760, 72.8777],
    [19.0810, 72.8760],
    [19.0880, 72.8740],
    [19.0950, 72.8720],
    [19.1020, 72.8705],
    [19.1090, 72.8700],
    [19.1136, 72.8697],
  ];

  // Map projection helpers for SVG coordinate system (viewBox 0 0 600 320)
  const lats = routePoints.map((p) => p[0]);
  const lngs = routePoints.map((p) => p[1]);
  const minLat = Math.min(...lats) - 0.002;
  const maxLat = Math.max(...lats) + 0.002;
  const minLng = Math.min(...lngs) - 0.002;
  const maxLng = Math.max(...lngs) + 0.002;

  const project = (lat, lng) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 520 + 40;
    const y = 300 - (((lat - minLat) / (maxLat - minLat)) * 240 + 40);
    return { x, y };
  };

  // Convert polyline to SVG path string
  const svgPathData = routePoints
    .map((pt, i) => {
      const { x, y } = project(pt[0], pt[1]);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Compute interpolated bike position based on progress
  const totalSegments = routePoints.length - 1;
  const floatIndex = progress * totalSegments;
  const segIndex = Math.min(Math.floor(floatIndex), totalSegments - 1);
  const segFraction = floatIndex - segIndex;

  const p1 = routePoints[segIndex];
  const p2 = routePoints[Math.min(segIndex + 1, totalSegments)];

  const curLat = p1[0] + (p2[0] - p1[0]) * segFraction;
  const curLng = p1[1] + (p2[1] - p1[1]) * segFraction;
  const bikePos = project(curLat, curLng);

  // Compute heading angle for bike rotation
  const deltaX = project(p2[0], p2[1]).x - project(p1[0], p1[1]).x;
  const deltaY = project(p2[0], p2[1]).y - project(p1[0], p1[1]).y;
  const calculatedAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
  const activeHeading = isSimulating ? calculatedAngle : headingDegrees;

  const startPoint = project(routePoints[0][0], routePoints[0][1]);
  const endPoint = project(routePoints[routePoints.length - 1][0], routePoints[routePoints.length - 1][1]);

  const remainingDistance = Math.max(0, (1 - progress) * (gpsData?.route?.totalDistanceKm || 4.2)).toFixed(1);
  const minutes = Math.floor(countdownSeconds / 60);
  const seconds = countdownSeconds % 60;

  const rider = gpsData?.rider || {
    name: 'Vikram Singh',
    phone: '+91 98765 43210',
    vehicle: 'Hero Electric Splendor • DL 04 EV 8892',
    rating: 4.9,
    speedKmH: 28,
  };

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl text-white relative">
      
      {/* Top Telemetry & Socket Status Header */}
      <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                <span>Live Moving Rider Map & Telemetry</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                  REAL-TIME
                </span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  #16
                </span>
              </h4>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                socketConnected ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {socketConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span>Socket.IO Connected (Room: order_{identifier.substring(0, 10)})</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-amber-400" />
                    <span>Live Telemetry Active (REST Polling fallback)</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Map Theme Toggle */}
          <button
            type="button"
            onClick={() => {
              const themes = ['obsidian', 'blueprint', 'satellite'];
              const next = themes[(themes.indexOf(mapTheme) + 1) % themes.length];
              setMapTheme(next);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition"
            title="Switch Map Theme"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="capitalize">{mapTheme}</span>
          </button>

          {/* Breadcrumbs History Toggle */}
          <button
            type="button"
            onClick={() => setShowHistoryModal(!showHistoryModal)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="View GPS Breadcrumb History"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
          </button>

          {/* Simulate Movement Button */}
          <button
            type="button"
            onClick={isSimulating ? stopSimulation : startSimulation}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
              isSimulating
                ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
            }`}
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{isSimulating ? 'Stop Telemetry' : 'Simulate Rider Movement'}</span>
          </button>

          {/* Recenter Button */}
          <button
            type="button"
            onClick={() => {
              setProgress(0.65);
              setCountdownSeconds(360);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
            title="Recenter Tracking Coordinates"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating HUD Badges */}
      <div className="p-4 bg-slate-900/90 grid grid-cols-2 sm:grid-cols-5 gap-2.5 border-b border-slate-800 text-xs">
        <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            Live ETA Countdown
          </span>
          <div className="text-base sm:text-lg font-black text-amber-400 font-mono mt-0.5">
            {progress >= 1 ? (
              <span className="text-emerald-400">ARRIVED</span>
            ) : (
              `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
            )}
          </div>
        </div>

        <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <Navigation className="w-3 h-3 text-blue-400" />
            Distance Remaining
          </span>
          <div className="text-base sm:text-lg font-black text-white font-mono mt-0.5">
            {progress >= 1 ? '0.0 km' : `${remainingDistance} km`}
          </div>
        </div>

        <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-emerald-400" />
            Live Rider Speed
          </span>
          <div className="text-base sm:text-lg font-black text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
            <span>{progress >= 1 ? '0' : speedGauge}</span>
            <span className="text-[11px] text-slate-400 font-normal">km/h</span>
          </div>
        </div>

        <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <BatteryCharging className="w-3 h-3 text-cyan-400" />
            Rider Battery
          </span>
          <div className="text-base sm:text-lg font-black text-cyan-400 font-mono mt-0.5 flex items-center gap-1">
            <span>{batteryLevel}%</span>
            <span className="text-[10px] text-slate-400 font-normal">EV</span>
          </div>
        </div>

        <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/30 col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-amber-300 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            Handover OTP
          </span>
          <div className="text-base sm:text-lg font-black text-amber-300 font-mono tracking-widest mt-0.5">
            {deliveryOtp}
          </div>
        </div>
      </div>

      {/* SVG Interactive GPS Map Canvas */}
      <div className={`relative w-full h-72 sm:h-84 overflow-hidden select-none transition-colors duration-500 ${
        mapTheme === 'obsidian' ? 'bg-[#0b1329]' : mapTheme === 'blueprint' ? 'bg-[#0f284e]' : 'bg-[#14231f]'
      }`}>
        
        {/* Subtle Map Grid lines */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke={mapTheme === 'blueprint' ? '#1e40af' : '#1e293b'} strokeWidth="0.8" opacity="0.6" />
            </pattern>
            {/* Road route gradient */}
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid background */}
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* City Street Blocks Simulation */}
          <rect x="50" y="30" width="130" height="70" rx="8" fill="#1e293b" opacity="0.35" />
          <text x="115" y="70" fill="#64748b" fontSize="10" textAnchor="middle" fontWeight="bold">Fulfillment District</text>

          <rect x="220" y="50" width="140" height="80" rx="8" fill="#1e293b" opacity="0.35" />
          <text x="290" y="95" fill="#64748b" fontSize="10" textAnchor="middle" fontWeight="bold">Transit Expressway</text>

          <rect x="390" y="140" width="140" height="90" rx="8" fill="#1e293b" opacity="0.35" />
          <text x="460" y="190" fill="#64748b" fontSize="10" textAnchor="middle" fontWeight="bold">Destination Enclave</text>

          {/* Breadcrumb Trail from Telemetry History */}
          {telemetryHistory.map((pt, i) => {
            const pos = project(pt.lat, pt.lng);
            return (
              <circle
                key={`crumb-${i}`}
                cx={pos.x}
                cy={pos.y}
                r="3"
                fill="#38bdf8"
                opacity="0.5"
              />
            );
          })}

          {/* Polyline Route Glow Line */}
          <path
            d={svgPathData}
            fill="none"
            stroke="#10b981"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.2"
          />

          {/* Polyline Route Track */}
          <path
            d={svgPathData}
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 3"
          />

          {/* Origin Marker (Fulfillment Hub) */}
          <g transform={`translate(${startPoint.x}, ${startPoint.y})`}>
            <circle r="16" fill="#3b82f6" opacity="0.25" />
            <circle r="9" fill="#1e40af" stroke="#60a5fa" strokeWidth="2" />
            <circle r="4" fill="#ffffff" />
            <text y="-14" fill="#93c5fd" fontSize="10" textAnchor="middle" fontWeight="bold">
              Hub / Merchant
            </text>
          </g>

          {/* Destination Marker (Customer Doorstep with Pulsating Ripple) */}
          <g transform={`translate(${endPoint.x}, ${endPoint.y})`}>
            <circle r="22" fill="#ef4444" opacity="0.2" className="animate-ping" />
            <circle r="14" fill="#ef4444" opacity="0.3" />
            <circle r="8" fill="#b91c1c" stroke="#fca5a5" strokeWidth="2" />
            <circle r="3" fill="#ffffff" />
            <text y="-14" fill="#fca5a5" fontSize="10" textAnchor="middle" fontWeight="bold">
              {recipientName} (Doorstep)
            </text>
          </g>

          {/* Moving Delivery Rider Bike Marker */}
          <g transform={`translate(${bikePos.x}, ${bikePos.y})`}>
            {/* Radar Pulsing Wave */}
            <circle r="22" fill="#f59e0b" opacity="0.3" className="animate-ping" />
            <circle r="14" fill="#d97706" opacity="0.4" />

            {/* Bike Outer Circle Container */}
            <circle r="12" fill="#0f172a" stroke="#f59e0b" strokeWidth="2.5" />

            {/* Direction Pointer Arrow with dynamic heading */}
            <g transform={`rotate(${activeHeading})`}>
              <polygon points="0,-10 6,4 0,1 -6,4" fill="#fbbf24" />
            </g>

            {/* Rider Label Tooltip with Live Speed */}
            <g transform="translate(0, 24)">
              <rect x="-48" y="-10" width="96" height="16" rx="4" fill="#0f172a" stroke="#d97706" strokeWidth="1" />
              <text y="2" fill="#fef08a" fontSize="9" textAnchor="middle" fontWeight="black">
                🏍️ {rider.name?.split(' ')[0] || 'Rider'} ({progress >= 1 ? '0' : speedGauge} km/h)
              </text>
            </g>
          </g>
        </svg>

        {/* Floating Compass and Traffic Chip */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Traffic: Moderate & Clear</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-slate-900/90 border border-slate-700 flex items-center justify-center text-slate-400 shadow-md">
            <Compass className="w-4 h-4 text-amber-400" />
          </div>
        </div>

        {/* Destination Address Pill */}
        <div className="absolute bottom-3 left-3 max-w-[70%] bg-slate-950/85 backdrop-blur border border-slate-800 rounded-xl p-2.5 text-xs shadow-lg">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="truncate">
              <span className="font-bold text-white block truncate">{recipientName}</span>
              <span className="text-[11px] text-slate-400 block truncate">{deliveryAddress}</span>
            </div>
          </div>
        </div>
      </div>

      {/* GPS Breadcrumbs Modal / Drawer */}
      {showHistoryModal && (
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Live Telemetry Ping History ({telemetryHistory.length} breadcrumbs)
            </h5>
            <button
              type="button"
              onClick={() => setShowHistoryModal(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1.5 font-mono text-[11px]">
            {telemetryHistory.length === 0 ? (
              <p className="text-slate-500 py-2">No telemetry breadcrumbs recorded yet. Start simulation or rider ping to stream live coordinates.</p>
            ) : (
              telemetryHistory.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-1.5 bg-slate-900 rounded border border-slate-800 text-slate-300">
                  <span>GPS: {Number(item.lat).toFixed(4)}, {Number(item.lng).toFixed(4)}</span>
                  <span className="text-emerald-400">{item.speed || 0} km/h</span>
                  <span className="text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Rider Profile Card & Action Bar */}
      <div className="p-4 bg-slate-950 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center font-black text-white text-sm shadow">
              {rider.name?.charAt(0) || 'V'}
            </div>
            <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 absolute -bottom-0.5 -right-0.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h5 className="font-bold text-white text-xs sm:text-sm">{rider.name}</h5>
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ★ {rider.rating || '4.9'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {rider.vehicle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`tel:${rider.phone}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-sm"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call Rider</span>
          </a>

          <a
            href={`https://wa.me/${(rider.phone || '').replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(rider.name)},%20I%20am%20tracking%20my%20AuraMarket%20order.`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold transition shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>

    </div>
  );
}
