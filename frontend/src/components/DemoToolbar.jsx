import React from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  ShoppingBag,
  ShieldCheck,
  Store,
  Truck,
  Sparkles,
  LayoutGrid,
  BookOpen,
  Phone,
  MessageCircle,
  KeyRound,
} from 'lucide-react';

export const DemoToolbar = ({
  deviceMode,
  setDeviceMode,
  activeTab,
  setActiveTab,
  switchPersona,
  onResetDemo,
  isBarCollapsed,
  setIsBarCollapsed,
  onOpenDocs,
}) => {
  const portals = [
    { id: 'customer', label: 'Storefront', icon: ShoppingBag, role: 'customer' },
    { id: 'superadmin', label: 'Super Admin', icon: ShieldCheck, role: 'superadmin' },
    { id: 'vendor', label: 'Vendor Portal', icon: Store, role: 'vendor' },
    { id: 'courier', label: 'Courier Hub', icon: Truck, role: 'delivery' },
    { id: 'install', label: 'Web Installer', icon: KeyRound, role: null },
  ];

  if (isBarCollapsed) {
    return (
      <div className="fixed top-3 right-4 z-50 animate-fade-in">
        <button
          onClick={() => setIsBarCollapsed(false)}
          className="px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-xl flex items-center gap-2 border border-amber-300 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Show Demo Toolbar</span>
        </button>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-50 w-full bg-slate-100 text-slate-800 border-b border-slate-300 shadow-sm py-2 px-3 lg:px-6 font-sans">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Left: Back to Hub Button & Brand Tag */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab('hub')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-sm transition-all transform active:scale-95"
            title="Return to All Portals Overview Hub"
          >
            <LayoutGrid className="w-4 h-4" />
            <span>← All Portals Hub</span>
          </button>

          <button
            onClick={onOpenDocs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs shadow-sm transition-all"
            title="A to Z Setup & Developer Guide (Hindi & English)"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>📖 Setup Guide / कैसे यूज़ करें</span>
          </button>

          <div className="h-5 w-px bg-slate-300 hidden xl:block" />

          <span className="font-black text-slate-900 text-xs hidden xl:inline">
            AuraMarket Demo
          </span>
        </div>

        {/* Center: Clean Portal Switcher Tabs (Never Overlapping, Crisp Styling) */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-300 shadow-sm">
          {portals.map(p => {
            const Icon = p.icon;
            const isActive = activeTab === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setActiveTab(p.id);
                  if (p.role) switchPersona(p.role);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#0f2444] text-white font-black shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Device Switcher & Developer WhatsApp / Purchase CTA */}
        <div className="flex items-center gap-2">
          {/* Device Switcher */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-300 shadow-sm">
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                deviceMode === 'desktop'
                  ? 'bg-slate-900 text-white font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Desktop Screen View"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>

            <button
              onClick={() => setDeviceMode('tablet')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                deviceMode === 'tablet'
                  ? 'bg-slate-900 text-white font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tablet (iPad) Preview"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">iPad</span>
            </button>

            <button
              onClick={() => setDeviceMode('android')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                deviceMode === 'android'
                  ? 'bg-emerald-600 text-white font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Android (Samsung / Pixel) Preview (Flutter App)"
            >
              <span className="text-xs">🤖</span>
              <span className="hidden sm:inline">Android</span>
            </button>

            <button
              onClick={() => setDeviceMode('mobile')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                deviceMode === 'mobile'
                  ? 'bg-slate-900 text-white font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Smartphone (iPhone) Preview"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">iPhone</span>
            </button>
          </div>

          {/* Direct Buy / WhatsApp Ankit CTA Button */}
          <a
            href="https://wa.me/918533955333?text=Hi%20Ankit,%20I%20want%20to%20purchase%20AuraMarket%20E-Commerce%20Platform"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-all"
            title="Purchase Code from Ankit Chaudhary (8533955333)"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Buy: 8533955333</span>
          </a>

          <button
            onClick={onResetDemo}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold transition-all active:scale-95 text-xs shadow-sm"
            title="Reset demo data to initial showroom state"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

      </div>
    </div>
  );
};
