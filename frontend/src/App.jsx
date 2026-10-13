import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { DemoToolbar } from './components/DemoToolbar';
import { DemoHub } from './components/DemoHub';
import { DocumentationModal } from './components/DocumentationModal';
import { CustomerStorefront } from './pages/CustomerStorefront';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { VendorPortal } from './pages/VendorPortal';
import { CourierDashboard } from './pages/CourierDashboard';
import { ShoppingBag, Flame, Layers, LayoutGrid, MessageCircle, Phone, BookOpen } from 'lucide-react';

const MainLayout = () => {
  // 'hub' | 'customer' | 'superadmin' | 'vendor' | 'courier'
  const [activeTab, setActiveTab] = useState('hub');
  const [deviceMode, setDeviceMode] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [isBarCollapsed, setIsBarCollapsed] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { switchPersona } = useAuth();
  const { cartCount, setIsCartOpen, clearCart } = useCart();

  const [uiConfig, setUiConfig] = useState({
    storeName: 'AuraMarket',
    tagline: 'The Next-Gen Multi-Vendor Commerce Platform',
    primaryColor: '#F59E0B',
    announcementText: '🔥 Festive Sale Live! Up to 40% OFF with code FESTIVE2026',
    showAnnouncement: true,
    footerText: '© 2026 AuraMarket — Enterprise Multi-Vendor Marketplace Platform. All rights reserved.',
    supportPhone: '+91 8533955333',
    supportEmail: 'support@auramarket.com',
    showDemoNotice: true,
    heroBanners: [
      {
        title: 'Spatial Audio Reinvented',
        subtitle: 'Immerse yourself in studio-grade acoustics with our flagship ANC wireless series.',
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200',
        badgeText: 'Featured Deal',
        isActive: true,
      },
    ],
  });

  const handleResetDemo = () => {
    clearCart();
    setActiveTab('hub');
    switchPersona('customer');
    alert('✨ Demo reset to CodeCanyon Showcase Hub state!');
  };

  const handleSelectPortalFromHub = (portalId, mode = 'desktop') => {
    setActiveTab(portalId);
    setDeviceMode(mode);
    switchPersona(portalId === 'courier' ? 'delivery' : portalId);
  };

  // Render Inner Content of the Active Portal
  const renderAppContent = () => (
    <div className="min-h-full flex flex-col bg-slate-50 text-slate-800 pb-20 md:pb-0">
      {/* Top Navbar with Dynamic Branding & Search */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        uiConfig={uiConfig}
      />

      {/* Main Panel Content Area */}
      <main className="flex-1">
        {activeTab === 'customer' && (
          <CustomerStorefront searchQuery={searchQuery} uiConfig={uiConfig} />
        )}
        {activeTab === 'superadmin' && (
          <SuperAdminDashboard uiConfig={uiConfig} setUiConfig={setUiConfig} />
        )}
        {activeTab === 'vendor' && <VendorPortal />}
        {activeTab === 'courier' && <CourierDashboard />}
      </main>

      {/* Real Customer Mobile Bottom Navigation Bar (No role clutter!) */}
      {activeTab === 'customer' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex flex-col items-center gap-1 text-[10px] font-bold text-amber-600 font-black"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Shop</span>
          </button>

          <button
            onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })}
            className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-700"
          >
            <Layers className="w-5 h-5" />
            <span>Categories</span>
          </button>

          <button
            onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}
            className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-700"
          >
            <Flame className="w-5 h-5" />
            <span>Deals</span>
          </button>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex flex-col items-center gap-1 text-[10px] font-bold text-slate-600"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                {cartCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('hub')}
            className="flex flex-col items-center gap-1 text-[10px] font-bold text-slate-700 hover:text-amber-600"
          >
            <LayoutGrid className="w-5 h-5 text-amber-500" />
            <span>Portals</span>
          </button>
        </div>
      )}

      {/* Enterprise Multi-Vendor Footer with Dynamic White-Label & Optional Showroom Demo Box */}
      <footer className="border-t border-slate-200 bg-white pt-10 pb-8 px-4 sm:px-6 lg:px-8 text-slate-600">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Optional Commercial Author & Demo Purchase Callout (Configurable from Super Admin) */}
          {(uiConfig.showDemoNotice ?? true) && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-center max-w-2xl mx-auto shadow-sm space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                <span>Official Showroom & Commercial License Notice</span>
              </div>
              <p className="font-black text-slate-950 text-sm">
                Developed by Ankit Chaudhary ({uiConfig.supportPhone || '+91 8533955333'})
              </p>
              <p className="text-xs text-slate-700 font-semibold">
                अगर purchase करना है तो इस नंबर पर संपर्क करें: <strong className="text-slate-950 font-black">{uiConfig.supportPhone || '+91 8533955333'}</strong>
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <a
                  href={`https://wa.me/918533955333?text=Hi%20Ankit,%20I%20want%20to%20purchase%20${encodeURIComponent(uiConfig.storeName)}%20Platform`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp: {uiConfig.supportPhone || '8533955333'}</span>
                </a>
                <a
                  href={`tel:${(uiConfig.supportPhone || '8533955333').replace(/[^0-9+]/g, '')}`}
                  className="px-4 py-2 rounded-xl bg-[#0f2444] hover:bg-[#1a3a6b] text-white font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Phone className="w-4 h-4 text-amber-400" />
                  <span>Call: {uiConfig.supportPhone || '8533955333'}</span>
                </a>
                <button
                  onClick={() => setIsDocsOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>Setup Guide</span>
                </button>
              </div>
            </div>
          )}

          {/* Standard White-Label Multi-Vendor Client Storefront Footer */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-4 border-t border-slate-100 text-xs text-left">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center font-black text-slate-950 text-base shadow">
                  {uiConfig.storeName ? uiConfig.storeName.charAt(0) : 'A'}
                </div>
                <span className="text-base font-black text-slate-900 tracking-tight">
                  {uiConfig.storeName}
                </span>
              </div>
              <p className="text-slate-500 leading-relaxed font-medium">
                {uiConfig.tagline}
              </p>
              <div className="text-[11px] text-slate-400 space-y-1">
                <p>🔒 256-bit SSL Secure Checkout</p>
                <p>🛡️ Verified Merchant Guarantee</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
                Marketplace
              </h4>
              <ul className="space-y-1.5 text-slate-600 font-medium">
                <li><button onClick={() => { setActiveTab('customer'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-amber-600">All Products</button></li>
                <li><button onClick={() => { setActiveTab('customer'); window.scrollTo({ top: 400, behavior: 'smooth' }); }} className="hover:text-amber-600">Featured Categories</button></li>
                <li><button onClick={() => { setActiveTab('customer'); window.scrollTo({ top: 700, behavior: 'smooth' }); }} className="hover:text-amber-600">Flash Deals & Discounts</button></li>
                <li><button onClick={() => setIsCartOpen(true)} className="hover:text-amber-600">Shopping Cart</button></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
                Customer Support
              </h4>
              <ul className="space-y-1.5 text-slate-600 font-medium">
                <li>Helpline: <strong className="text-slate-800">{uiConfig.supportPhone}</strong></li>
                <li>Email: <strong className="text-slate-800">{uiConfig.supportEmail}</strong></li>
                <li><span>24/7 Order Tracking with OTP</span></li>
                <li><span>Express 24h Courier Dispatch</span></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
                Business Portals
              </h4>
              <ul className="space-y-1.5 text-slate-600 font-medium">
                <li><button onClick={() => { setActiveTab('vendor'); switchPersona('vendor'); }} className="hover:text-amber-600 font-bold">🏪 Vendor Central Portal</button></li>
                <li><button onClick={() => { setActiveTab('courier'); switchPersona('delivery'); }} className="hover:text-amber-600 font-bold">🚚 Courier & Logistics Hub</button></li>
                <li><button onClick={() => { setActiveTab('superadmin'); switchPersona('superadmin'); }} className="hover:text-amber-600 font-bold">👑 Super Admin Center</button></li>
                <li><button onClick={() => setActiveTab('hub')} className="hover:text-amber-600 text-blue-600 font-bold">← All Portals Overview Hub</button></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <p className="font-medium text-center sm:text-left">
              {uiConfig.footerText || `© 2026 ${uiConfig.storeName}. All rights reserved.`}
            </p>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">Node.js + React 18 + Flutter</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );

  // If in Demo Hub mode, show the CodeCanyon Master Showcase Landing Page
  if (activeTab === 'hub') {
    return (
      <>
        <DemoHub
          onSelectPortal={handleSelectPortalFromHub}
          uiConfig={uiConfig}
          onOpenDocs={() => setIsDocsOpen(true)}
        />
        <DocumentationModal
          isOpen={isDocsOpen}
          onClose={() => setIsDocsOpen(false)}
        />
      </>
    );
  }

  // If viewing a specific portal, render with the CodeCanyon top demo toolbar
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* CodeCanyon Style Top Demo Control Toolbar */}
      <DemoToolbar
        deviceMode={deviceMode}
        setDeviceMode={setDeviceMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        switchPersona={switchPersona}
        onResetDemo={handleResetDemo}
        isBarCollapsed={isBarCollapsed}
        setIsBarCollapsed={setIsBarCollapsed}
        onOpenDocs={() => setIsDocsOpen(true)}
      />

      {/* Interactive Device Viewport Simulator */}
      {deviceMode === 'desktop' && (
        <div className="flex-1 w-full animate-fade-in">
          {renderAppContent()}
        </div>
      )}

      {deviceMode === 'tablet' && (
        <div className="flex-1 py-4 sm:py-6 px-3 flex justify-center items-start bg-slate-200/90">
          <div className="w-full max-w-[768px] h-[calc(100vh-85px)] min-h-[580px] rounded-3xl p-3 bg-slate-900 border-4 border-slate-700 shadow-2xl relative flex flex-col animate-scale-up">
            {/* Tablet Status Header */}
            <div className="flex items-center justify-between px-4 py-1.5 text-[11px] font-bold text-slate-400 bg-slate-950/80 rounded-t-xl mb-1 select-none">
              <span className="text-blue-400 font-extrabold flex items-center gap-1.5">
                💻 iPad View (768px)
              </span>
              <span className="text-amber-400 font-extrabold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                ↕ Scroll to Explore Entire Store
              </span>
              <span>100% 🔋</span>
            </div>

            {/* Inner Tablet Canvas with ALWAYS VISIBLE DRAGGABLE SCROLLBAR */}
            <div className="flex-1 rounded-2xl overflow-y-scroll overflow-x-hidden bg-slate-50 shadow-inner custom-device-scrollbar">
              {renderAppContent()}
            </div>

            {/* Bottom Home Indicator Bar */}
            <div className="w-36 h-1.5 bg-slate-600 rounded-full mx-auto mt-2" />
          </div>
        </div>
      )}

      {deviceMode === 'mobile' && (
        <div className="flex-1 py-4 sm:py-6 px-3 flex justify-center items-start bg-slate-200/90">
          <div className="w-full max-w-[414px] h-[calc(100vh-85px)] min-h-[580px] rounded-3xl p-3 bg-slate-900 border-4 border-slate-700 shadow-2xl relative flex flex-col animate-scale-up">
            {/* Mobile Status Header (Clean & Unobstructed!) */}
            <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-400 bg-slate-950/80 rounded-t-xl mb-1 select-none">
              <span className="text-emerald-400 font-extrabold flex items-center gap-1.5">
                📱 iPhone View (414px)
              </span>
              <span className="text-amber-400 font-extrabold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                ↕ Scroll to Explore Entire Store
              </span>
              <span>5G • 100% 🔋</span>
            </div>

            {/* Inner Mobile Canvas with ALWAYS VISIBLE DRAGGABLE SCROLLBAR */}
            <div className="flex-1 rounded-2xl overflow-y-scroll overflow-x-hidden bg-slate-50 shadow-inner custom-device-scrollbar">
              {renderAppContent()}
            </div>

            {/* Bottom Home Indicator Bar */}
            <div className="w-28 h-1.5 bg-slate-600 rounded-full mx-auto mt-2" />
          </div>
        </div>
      )}

      {/* Documentation Modal */}
      <DocumentationModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <MainLayout />
      </CartProvider>
    </AuthProvider>
  );
}
