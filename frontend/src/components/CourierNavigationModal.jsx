import React, { useState } from 'react';
import {
  Navigation,
  MapPin,
  X,
  Copy,
  Check,
  ExternalLink,
  Car,
  Compass,
  PhoneCall,
  Store,
  User,
} from 'lucide-react';

export const CourierNavigationModal = ({ task, onClose }) => {
  const [destinationType, setDestinationType] = useState('DROP'); // 'DROP' | 'PICKUP'
  const [copiedType, setCopiedType] = useState(null); // 'ADDRESS' | 'COORDS'

  if (!task) return null;

  const isDrop = destinationType === 'DROP';

  const destinationData = isDrop
    ? {
        title: 'Customer Doorstep (Drop)',
        name: task.customer?.name || 'Customer',
        phone: task.customer?.phone || '',
        address: `${task.customer?.address || ''}, ${task.customer?.city || ''} — PIN: ${task.customer?.pincode || ''}`,
        cleanAddress: `${task.customer?.address || ''}, ${task.customer?.city || ''} ${task.customer?.pincode || ''}`.trim(),
        landmark: task.customer?.landmark || '',
        lat: 28.5355,
        lng: 77.391,
      }
    : {
        title: 'Merchant Warehouse (Pickup)',
        name: task.vendor?.storeName || 'Merchant Store',
        phone: task.vendor?.phone || '',
        address: `${task.vendor?.address || ''}, ${task.vendor?.city || ''} ${task.vendor?.pincode || ''}`,
        cleanAddress: `${task.vendor?.address || ''}, ${task.vendor?.city || ''} ${task.vendor?.pincode || ''}`.trim(),
        landmark: 'Commercial Complex Entrance',
        lat: 28.5721,
        lng: 77.3245,
      };

  const encodedDest = encodeURIComponent(destinationData.cleanAddress);
  const coordsQuery = `${destinationData.lat},${destinationData.lng}`;

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedDest}&travelmode=driving`;
  const appleMapsUrl = `https://maps.apple.com/?daddr=${encodedDest}&dirflg=d`;
  const wazeUrl = `https://waze.com/ul?ll=${coordsQuery}&navigate=yes`;

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-slate-800">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-6 animate-scale-up max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">1-Click GPS Navigation</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Point #64
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Turn-by-turn driving directions for Sub-Order #{task.subOrderId}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Destination Toggle Tabs */}
        <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setDestinationType('DROP')}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
              isDrop
                ? 'bg-white text-emerald-700 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Customer Doorstep</span>
          </button>

          <button
            onClick={() => setDestinationType('PICKUP')}
            className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
              !isDrop
                ? 'bg-white text-amber-700 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Merchant Warehouse</span>
          </button>
        </div>

        {/* Destination Address Card */}
        <div
          className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
            isDrop
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/70 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${
                isDrop ? 'text-emerald-800' : 'text-amber-800'
              }`}
            >
              Target Destination
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-500">
              GPS: {destinationData.lat}, {destinationData.lng}
            </span>
          </div>

          <div>
            <h4 className="text-base font-black text-slate-900">{destinationData.name}</h4>
            <p className="text-xs text-slate-700 font-medium mt-0.5 leading-relaxed">
              {destinationData.address}
            </p>
            {destinationData.landmark && (
              <p className="text-[11px] font-bold text-emerald-800 mt-1">
                📍 Landmark: {destinationData.landmark}
              </p>
            )}
          </div>

          {destinationData.phone && (
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Contact: +91 {destinationData.phone}</span>
              <a
                href={`tel:${destinationData.phone}`}
                className="text-xs font-black text-emerald-700 hover:underline flex items-center gap-1"
              >
                <PhoneCall className="w-3 h-3" />
                <span>Call Now</span>
              </a>
            </div>
          )}
        </div>

        {/* 1-Click Navigation Providers */}
        <div className="space-y-3">
          <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
            Select Navigation App
          </label>

          {/* Google Maps Card */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/30 transition-all group shadow-xs hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                🗺️
              </div>
              <div>
                <span className="font-black text-slate-900 text-sm block group-hover:text-emerald-700">
                  Google Maps Driving GPS
                </span>
                <span className="text-xs text-slate-500 block">
                  Live traffic, fastest route & voice turn-by-turn
                </span>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </a>

          {/* Apple Maps Card */}
          <a
            href={appleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50 transition-all group shadow-xs hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                🍎
              </div>
              <div>
                <span className="font-black text-slate-900 text-sm block">
                  Apple Maps Navigation
                </span>
                <span className="text-xs text-slate-500 block">
                  Optimized for iPhone, CarPlay & iOS devices
                </span>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition-colors" />
          </a>

          {/* Waze Card */}
          <a
            href={wazeUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-cyan-400 bg-white hover:bg-cyan-50/30 transition-all group shadow-xs hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                🚗
              </div>
              <div>
                <span className="font-black text-slate-900 text-sm block group-hover:text-cyan-700">
                  Waze Live Community Navigation
                </span>
                <span className="text-xs text-slate-500 block">
                  Real-time speed traps, police & road hazard alerts
                </span>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
          </a>
        </div>

        {/* Quick Utility Tools (Copy Address & Coords) */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
          <button
            onClick={() => handleCopy(destinationData.cleanAddress, 'ADDRESS')}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            {copiedType === 'ADDRESS' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-black">Address Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Address</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleCopy(coordsQuery, 'COORDS')}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            {copiedType === 'COORDS' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-black">GPS Copied!</span>
              </>
            ) : (
              <>
                <Compass className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy GPS Lat/Lng</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
