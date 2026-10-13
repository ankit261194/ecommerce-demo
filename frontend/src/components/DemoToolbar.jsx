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
}) => {
  const portals = [
    { id: 'customer', label: 'Storefront', icon: ShoppingBag, role: 'customer' },
    { id: 'superadmin', label: 'Super Admin', icon: ShieldCheck, role: 'superadmin' },
    { id: 'vendor', label: 'Vendor Portal', icon: Store, role: 'vendor' },
    { id: 'courier', label: 'Courier Hub', icon: Truck, role: 'delivery' },
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

          <div className="h-5 w-px bg-slate-300 hidden sm:block" />

          <span className="font-black text-slate-900 text-xs hidden sm:inline">
            AuraMarket Demo
          </span>
          <span className="hidden xl:inline text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            ● 4 Portals Live
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
                  switchPersona(p.role);
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

        {/* Right: Device Viewport Switcher & Reset Button */}
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
              title="Tablet (iPad) Mockup"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">iPad</span>
            </button>

            <button
              onClick={() => setDeviceMode('mobile')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                deviceMode === 'mobile'
                  ? 'bg-slate-900 text-white font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Smartphone (iPhone) Mockup"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">iPhone</span>
            </button>
          </div>

          <button
            onClick={onResetDemo}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold transition-all active:scale-95 text-xs shadow-sm"
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
