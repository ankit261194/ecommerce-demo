import React from 'react';
import { ShoppingBag, Search, MapPin, Sparkles, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export const Navbar = ({ searchQuery, setSearchQuery, uiConfig, onCategorySelect }) => {
  const { user } = useAuth();
  const { cartCount, setIsCartOpen } = useCart();

  const subCategories = [
    { id: 'all', label: 'All Categories' },
    { id: 'electronics-audio', label: 'Electronics & Audio' },
    { id: 'fashion', label: 'Fashion & Apparel' },
    { id: 'watches-accessories', label: 'Watches & Wearables' },
    { id: 'deals', label: "Today's Flash Deals 🔥" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full shadow-md bg-white border-b border-slate-200">
      {/* Top Announcement Bar (Vibrant Festive Amber) */}
      {uiConfig?.showAnnouncement && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 py-1.5 px-4 text-center text-xs font-black flex items-center justify-center gap-2 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-slate-950" />
          <span>{uiConfig?.announcementText || '🔥 Festive Sale Live! Flat 40% OFF with code FESTIVE2026'}</span>
        </div>
      )}

      {/* Main Professional Royal Sapphire / Navy Header (Real E-Commerce Signature) */}
      <div className="bg-[#0f2444] text-white px-4 lg:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 lg:gap-8">
          
          {/* Logo & Deliver to */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5 cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center shadow-md">
                <span className="font-black text-slate-950 text-2xl tracking-tighter">A</span>
              </div>
              <div className="leading-tight">
                <div className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                  {uiConfig?.storeName || 'AuraMarket'}
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-400 text-slate-950">
                    B2B + B2C
                  </span>
                </div>
                <p className="text-[10px] text-blue-200 font-bold tracking-wide">Multi-Vendor Marketplace</p>
              </div>
            </div>

            {/* Deliver To Pin Code */}
            <div className="hidden xl:flex items-center gap-2 text-xs text-blue-100 hover:text-white cursor-pointer pl-4 border-l border-blue-900">
              <MapPin className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-[10px] text-blue-300 font-semibold leading-none">Deliver to</p>
                <p className="font-black text-white text-xs">New Delhi 110001</p>
              </div>
            </div>
          </div>

          {/* Clean High-Contrast Central Search Bar */}
          <div className="flex-1 max-w-2xl relative">
            <div className="flex items-center bg-white rounded-xl overflow-hidden shadow-md border border-white/20 focus-within:ring-2 focus-within:ring-amber-400 transition-all">
              <div className="hidden sm:flex items-center gap-1 px-3.5 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold border-r border-slate-200 cursor-pointer">
                <span>All</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Search products, brands, smartphones, apparel, electronics..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none"
              />
              <button className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-5 py-2.5 font-black flex items-center justify-center transition-colors shadow">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Header Navigation: Account & Cart */}
          <div className="flex items-center gap-4">
            {/* Account / User */}
            <div className="hidden md:flex items-center gap-2.5 cursor-pointer text-xs">
              <div className="w-9 h-9 rounded-full bg-blue-950/70 border border-blue-800 flex items-center justify-center font-black text-amber-400 shadow-inner">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="text-left">
                <p className="text-[10px] text-blue-300 font-semibold leading-tight">Hello, {user?.name?.split(' ')[0] || 'Guest'}</p>
                <p className="font-black text-white leading-tight">Account & Lists</p>
              </div>
            </div>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg transition-all active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="bg-slate-950 text-amber-400 text-xs font-black px-2 py-0.5 rounded-full ml-1 shadow">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Sub-Navbar: Crisp Clean White Categories Bar (Breaks up all dark blocks!) */}
      <div className="bg-white text-slate-700 px-4 lg:px-8 py-2.5 border-b border-slate-200 text-xs font-bold shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto scrollbar-none">
            {subCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => onCategorySelect && onCategorySelect(cat.id)}
                className="px-3 py-1 rounded-lg text-slate-700 hover:text-blue-700 hover:bg-blue-50 whitespace-nowrap transition-colors flex items-center gap-1.5"
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4 text-xs font-bold flex-shrink-0">
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              🛡️ 100% Verified Sellers
            </span>
            <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
              🚚 Express 24h Dispatch
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
