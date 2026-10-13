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
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 py-1 px-3 text-center text-[11px] sm:text-xs font-black flex items-center justify-center gap-1.5 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-slate-950 flex-shrink-0" />
          <span className="truncate">{uiConfig?.announcementText || '🔥 Festive Sale Live! Flat 40% OFF with code FESTIVE2026'}</span>
        </div>
      )}

      {/* Main Professional Royal Sapphire / Navy Header (Responsive 2-Row on Mobile, 1-Row on Desktop) */}
      <div className="bg-[#0f2444] text-white px-3 sm:px-4 lg:px-8 py-2.5 sm:py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-6">
          
          {/* Top Bar on Mobile: Brand Logo + Cart + Account */}
          <div className="flex items-center justify-between gap-3 w-full md:w-auto">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group flex-shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-400 flex items-center justify-center shadow-md flex-shrink-0">
                <span className="font-black text-slate-950 text-xl sm:text-2xl tracking-tighter">A</span>
              </div>
              <div className="leading-tight">
                <div className="text-base sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>{uiConfig?.storeName || 'AuraMarket'}</span>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 whitespace-nowrap">
                    B2B+B2C
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-blue-200 font-bold tracking-wide">Multi-Vendor Marketplace</p>
              </div>
            </div>

            {/* Mobile Header Actions (Cart & Avatar) */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="w-8 h-8 rounded-full bg-blue-950 border border-blue-700 flex items-center justify-center font-black text-amber-400 text-xs shadow-inner">
                {user?.name?.charAt(0) || 'U'}
              </div>

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow transition-all active:scale-95"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Cart</span>
                {cartCount > 0 && (
                  <span className="bg-slate-950 text-amber-400 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Clean High-Contrast Search Bar (Full Width on Mobile!) */}
          <div className="w-full md:flex-1 md:max-w-2xl relative">
            <div className="flex items-center bg-white rounded-xl overflow-hidden shadow-sm border border-white/20 focus-within:ring-2 focus-within:ring-amber-400 transition-all">
              <div className="hidden sm:flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold border-r border-slate-200 cursor-pointer flex-shrink-0">
                <span>All</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Search products, brands, smartphones, electronics..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none"
              />
              <button className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2 sm:py-2.5 font-black flex items-center justify-center transition-colors shadow flex-shrink-0">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Desktop Right Header Navigation: Account & Cart */}
          <div className="hidden md:flex items-center gap-4 flex-shrink-0">
            {/* Account / User */}
            <div className="flex items-center gap-2.5 cursor-pointer text-xs">
              <div className="w-9 h-9 rounded-full bg-blue-950/70 border border-blue-800 flex items-center justify-center font-black text-amber-400 shadow-inner flex-shrink-0">
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
              className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="bg-slate-950 text-amber-400 text-xs font-black px-2 py-0.5 rounded-full ml-1 shadow">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Sub-Navbar: Clean Crisp Categories Bar (Swipeable on Mobile) */}
      <div className="bg-white text-slate-700 px-3 sm:px-4 lg:px-8 py-2 border-b border-slate-200 text-xs font-bold shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 w-full lg:w-auto">
            {subCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => onCategorySelect && onCategorySelect(cat.id)}
                className="px-3 py-1.5 rounded-lg text-slate-700 hover:text-blue-700 hover:bg-blue-50 whitespace-nowrap transition-colors flex items-center gap-1.5 flex-shrink-0 bg-slate-50 border border-slate-200/80"
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
