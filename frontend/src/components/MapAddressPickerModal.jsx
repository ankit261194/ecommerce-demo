import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Search,
  Crosshair,
  Navigation,
  Compass,
  Check,
  X,
  Building2,
  Home,
  Briefcase,
  Layers,
  ZoomIn,
  ZoomOut,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import api from '../api/client';

export default function MapAddressPickerModal({
  isOpen,
  onClose,
  onSelectAddress,
  initialCoordinates = { lat: 28.6139, lng: 77.2090 }, // New Delhi default
}) {
  const [coordinates, setCoordinates] = useState(initialCoordinates);
  const [zoomLevel, setZoomLevel] = useState(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Resolved address details
  const [addressDetails, setAddressDetails] = useState({
    street: '',
    sublocality: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    formattedAddress: '',
    tag: 'Home',
    isDefault: false,
    placeId: '',
  });

  const mapCanvasRef = useRef(null);

  // Quick Metro Hubs
  const popularHubs = [
    { name: 'Connaught Place', city: 'Delhi', lat: 28.6315, lng: 77.2167 },
    { name: 'Sector 18', city: 'Noida', lat: 28.5708, lng: 77.3261 },
    { name: 'DLF Cyber City', city: 'Gurugram', lat: 28.4908, lng: 77.0894 },
    { name: 'Bandra West', city: 'Mumbai', lat: 19.0596, lng: 72.8295 },
    { name: 'Indiranagar', city: 'Bengaluru', lat: 12.9784, lng: 77.6408 },
    { name: 'Hitech City', city: 'Hyderabad', lat: 17.4474, lng: 78.3762 },
  ];

  // Trigger reverse geocoding on coordinates change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchAddress = async () => {
      setIsReverseGeocoding(true);
      setErrorMessage('');
      try {
        const res = await api.get(`/maps/reverse-geocode?lat=${coordinates.lat}&lng=${coordinates.lng}`);
        if (res.data?.success && isMounted) {
          const addr = res.data.address;
          setAddressDetails((prev) => ({
            ...prev,
            street: addr.street || prev.street || '',
            sublocality: addr.sublocality || '',
            landmark: addr.landmark || prev.landmark || '',
            city: addr.city || prev.city || '',
            state: addr.state || prev.state || '',
            pincode: addr.pincode || prev.pincode || '',
            country: addr.country || 'India',
            formattedAddress: addr.formattedAddress || '',
            placeId: addr.placeId || '',
          }));
        }
      } catch (err) {
        if (isMounted) {
          console.warn('[MapAddressPicker] Reverse geocoding fallback:', err.message);
        }
      } finally {
        if (isMounted) setIsReverseGeocoding(false);
      }
    };

    const timer = setTimeout(fetchAddress, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [coordinates.lat, coordinates.lng, isOpen]);

  // Handle Search Places
  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim() || q.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await api.get(`/maps/search-places?query=${encodeURIComponent(q)}`);
      if (res.data?.success) {
        setSearchResults(res.data.results || []);
      }
    } catch (err) {
      console.warn('[MapAddressPicker] Search error:', err.message);
    } finally {
      setIsSearching(false);
    }
  };

  // Select place from search or quick hubs
  const selectPlace = (place) => {
    if (place.coordinates) {
      setCoordinates(place.coordinates);
      setSearchQuery('');
      setSearchResults([]);
      setStatusMessage(`📍 Centered to ${place.name || place.city}`);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  // Detect HTML5 Geolocation
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser');
      return;
    }

    setIsDetectingLocation(true);
    setErrorMessage('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingLocation(false);
        const newCoords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        setCoordinates(newCoords);
        setStatusMessage('📍 Live GPS location detected successfully!');
        setTimeout(() => setStatusMessage(''), 3500);
      },
      (err) => {
        setIsDetectingLocation(false);
        setErrorMessage('Location permission denied or unavailable. Centered to default hub.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Click on interactive map canvas to drop pin
  const handleCanvasClick = (e) => {
    if (!mapCanvasRef.current) return;
    const rect = mapCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert relative click position to slight coordinate offset
    const width = rect.width;
    const height = rect.height;

    const deltaX = (x / width - 0.5) * (0.04 / (zoomLevel / 10));
    const deltaY = -(y / height - 0.5) * (0.04 / (zoomLevel / 10));

    setCoordinates((prev) => ({
      lat: Number((prev.lat + deltaY).toFixed(6)),
      lng: Number((prev.lng + deltaX).toFixed(6)),
    }));
  };

  // Confirm selection
  const handleConfirm = async () => {
    if (!addressDetails.street || !addressDetails.city || !addressDetails.pincode) {
      setErrorMessage('Please fill in Street, City, and Pincode before proceeding.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    const finalAddress = {
      ...addressDetails,
      coordinates,
      formattedAddress:
        addressDetails.formattedAddress ||
        `${addressDetails.street}, ${addressDetails.landmark ? addressDetails.landmark + ', ' : ''}${addressDetails.city}, ${addressDetails.state} - ${addressDetails.pincode}`,
    };

    // Attempt saving to user profile if user is logged in
    try {
      const token = localStorage.getItem('auramarket_token');
      if (token) {
        await api.post('/maps/save-address', finalAddress);
      }
    } catch (err) {
      console.warn('[MapAddressPicker] Backend address sync note:', err.message);
    } finally {
      setIsSaving(false);
    }

    if (onSelectAddress) {
      onSelectAddress(finalAddress);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <MapPin className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800">Pin-Drop Delivery Address Picker</h3>
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  GPS Active
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Click anywhere on the map or drag the pin for ultra-accurate doorstep delivery
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Quick Metro Hubs */}
        <div className="px-5 py-3 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search locality, landmark, colony, or city (e.g. Bandra, Connaught Place, Indiranagar)..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-emerald-600 absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin" />
            )}

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto">
                {searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectPlace(res)}
                    className="w-full text-left px-4 py-2.5 hover:bg-emerald-50/70 border-b border-slate-50 last:border-none flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{res.name}</div>
                      <div className="text-xs text-slate-500 truncate">{res.formattedAddress}</div>
                    </div>
                    <span className="text-xs font-medium text-emerald-600 shrink-0 ml-3">Select 📍</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Hub Chips */}
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 text-[11px] font-medium shrink-0 mr-1">Popular Hubs:</span>
            {popularHubs.map((hub, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectPlace(hub)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 text-[11px]"
              >
                <span>📍</span>
                <span>{hub.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body: Map View + Address Form */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
          {/* Left Column: Interactive Map Canvas */}
          <div className="md:w-7/12 p-4 flex flex-col gap-3 bg-slate-50/80">
            <div
              ref={mapCanvasRef}
              onClick={handleCanvasClick}
              className="relative w-full h-72 md:h-96 rounded-2xl overflow-hidden border border-slate-200 shadow-inner cursor-crosshair select-none bg-[#e8ece9]"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(16, 185, 129, 0.08) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(16, 185, 129, 0.08) 1px, transparent 1px),
                  radial-gradient(circle at 50% 50%, #ffffff 0%, #e2e8f0 100%)
                `,
                backgroundSize: '24px 24px, 24px 24px, cover',
              }}
            >
              {/* Map Road Grid Simulation */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                <line x1="0" y1="30%" x2="100%" y2="30%" stroke="#cbd5e1" strokeWidth="8" />
                <line x1="0" y1="70%" x2="100%" y2="70%" stroke="#cbd5e1" strokeWidth="6" />
                <line x1="25%" y1="0" x2="25%" y2="100%" stroke="#cbd5e1" strokeWidth="6" />
                <line x1="65%" y1="0" x2="65%" y2="100%" stroke="#cbd5e1" strokeWidth="8" />
                <circle cx="65%" cy="30%" r="20" fill="none" stroke="#94a3b8" strokeWidth="4" />
              </svg>

              {/* Center Drop Pin Indicator */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none flex flex-col items-center">
                <div className="bg-red-600 text-white p-2 rounded-full shadow-2xl border-2 border-white animate-bounce">
                  <MapPin className="w-6 h-6 fill-red-600 text-white" />
                </div>
                <div className="w-3 h-1.5 bg-black/40 rounded-full blur-[1px] mt-0.5"></div>
              </div>

              {/* Status / Alert Toasts overlay inside map */}
              {statusMessage && (
                <div className="absolute top-3 left-3 right-3 bg-emerald-600 text-white text-xs font-medium px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* Map Controls */}
              <div className="absolute right-3 top-3 flex flex-col gap-1.5 shadow-md">
                <button
                  type="button"
                  title="Detect My Location"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDetectLocation();
                  }}
                  disabled={isDetectingLocation}
                  className="p-2.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-xl border border-slate-200 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isDetectingLocation ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  ) : (
                    <Navigation className="w-4 h-4 text-emerald-600" />
                  )}
                </button>
                <button
                  type="button"
                  title="Zoom In"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomLevel((z) => Math.min(z + 1, 20));
                  }}
                  className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 transition-colors shadow-sm"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Zoom Out"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomLevel((z) => Math.max(z - 1, 10));
                  }}
                  className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 transition-colors shadow-sm"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
              </div>

              {/* Coordinates Pill */}
              <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-mono px-3 py-1.5 rounded-lg flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {coordinates.lat.toFixed(5)}° N, {coordinates.lng.toFixed(5)}° E
                </span>
                <span className="text-slate-400">| Zoom: {zoomLevel}x</span>
              </div>
            </div>

            {/* Hint bar */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5 text-emerald-600" />
                Click map to reposition pin
              </span>
              <button
                type="button"
                onClick={handleDetectLocation}
                className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                <Navigation className="w-3.5 h-3.5" />
                Locate Me
              </button>
            </div>
          </div>

          {/* Right Column: Address Form & Review */}
          <div className="md:w-5/12 p-5 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 bg-white">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Detected Location
                  </span>
                  {isReverseGeocoding && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Resolving...
                    </span>
                  )}
                </div>
                <div className="mt-1.5 p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                  <p className="text-xs font-medium text-emerald-950 leading-relaxed">
                    {addressDetails.formattedAddress || 'Click on the map to pin address'}
                  </p>
                </div>
              </div>

              {/* House / Flat / Street */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Flat / House / Building / Street *
                </label>
                <input
                  type="text"
                  value={addressDetails.street}
                  onChange={(e) => setAddressDetails({ ...addressDetails, street: e.target.value })}
                  placeholder="e.g. Flat 402, Tower B, Galaxy Heights"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Landmark / Sublocality */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Landmark / Area (Optional)
                </label>
                <input
                  type="text"
                  value={addressDetails.landmark}
                  onChange={(e) => setAddressDetails({ ...addressDetails, landmark: e.target.value })}
                  placeholder="e.g. Near Metro Station / Behind Temple"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* City, State & Pincode Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    value={addressDetails.city}
                    onChange={(e) => setAddressDetails({ ...addressDetails, city: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode *</label>
                  <input
                    type="text"
                    value={addressDetails.pincode}
                    onChange={(e) => setAddressDetails({ ...addressDetails, pincode: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* State */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
                <input
                  type="text"
                  value={addressDetails.state}
                  onChange={(e) => setAddressDetails({ ...addressDetails, state: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Address Tag Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Save As</label>
                <div className="flex gap-2">
                  {[
                    { tag: 'Home', icon: Home },
                    { tag: 'Work', icon: Briefcase },
                    { tag: 'Other', icon: Building2 },
                  ].map(({ tag, icon: Icon }) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setAddressDetails({ ...addressDetails, tag })}
                      className={`flex-1 py-1.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                        addressDetails.tag === tag
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Default checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={addressDetails.isDefault}
                  onChange={(e) => setAddressDetails({ ...addressDetails, isDefault: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-600">Set as my default shipping address</span>
              </label>

              {errorMessage && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 mt-4 flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSaving || isReverseGeocoding}
                className="flex-[2] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Location...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Use Location</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
