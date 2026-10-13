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

      {/* Commercial Author & Developer Purchase Footer (Ankit Chaudhary) */}
      <footer className="border-t border-slate-200 bg-white py-10 px-4 text-center text-xs text-slate-600 space-y-3">
        <div className="max-w-xl mx-auto p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-2">
          <p className="font-black text-slate-950 text-sm">
            Developed by Ankit Chaudhary (8533955333)
          </p>
          <p className="text-xs text-slate-700 font-semibold">
            अगर purchase करना है तो इस नंबर पर संपर्क करें: <strong className="text-slate-950 font-black">+91 8533955333</strong>
          </p>
          <div className="flex items-center justify-center gap-3 pt-1">
            <a
              href="https://wa.me/918533955333?text=Hi%20Ankit,%20I%20want%20to%20purchase%20AuraMarket%20E-Commerce%20Platform"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp: 8533955333</span>
            </a>
            <a
              href="tel:8533955333"
              className="px-4 py-2 rounded-xl bg-[#0f2444] hover:bg-[#1a3a6b] text-white font-bold text-xs flex items-center gap-1.5 shadow"
            >
              <Phone className="w-4 h-4 text-amber-400" />
              <span>Call: 8533955333</span>
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

        <p className="text-slate-400 font-medium">
          © 2026 {uiConfig.storeName} — Enterprise Multi-Vendor Marketplace Platform (React, Node.js & Flutter).
        </p>
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
        <div className="flex-1 py-10 px-4 flex justify-center items-start bg-slate-200/80 overflow-y-auto">
          <div className="w-[768px] min-h-[900px] rounded-[36px] p-4 bg-slate-900 border-4 border-slate-800 shadow-2xl relative overflow-hidden flex flex-col animate-scale-up">
            <div className="w-20 h-1 bg-slate-600 rounded-full mx-auto mb-3" />
            <div className="flex-1 rounded-2xl overflow-y-auto bg-slate-50 shadow-inner">
              {renderAppContent()}
            </div>
          </div>
        </div>
      )}

      {deviceMode === 'mobile' && (
        <div className="flex-1 py-8 px-4 flex justify-center items-start bg-slate-200/80 overflow-y-auto">
          {/* Realistic Smartphone Frame Mockup with Dynamic Island / Speaker */}
          <div className="w-[390px] h-[820px] rounded-[48px] p-3.5 bg-slate-900 border-4 border-slate-800 shadow-2xl relative flex flex-col animate-scale-up">
            {/* Dynamic Island Pill */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-50 flex items-center justify-end pr-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 animate-pulse" />
            </div>

            {/* Inner Mobile Canvas */}
            <div className="flex-1 rounded-[38px] overflow-y-auto overflow-x-hidden bg-slate-50 scrollbar-none pt-2 shadow-inner">
              {renderAppContent()}
            </div>

            {/* Bottom Home Indicator Bar */}
            <div className="w-32 h-1 bg-white/40 rounded-full mx-auto mt-2" />
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
