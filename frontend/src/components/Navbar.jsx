import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, MapPin, Sparkles, ChevronDown, Heart, X, Check, Truck, Wallet, Coins, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLocalization } from '../context/LocalizationContext';
import LiveSearchAutocomplete from './LiveSearchAutocomplete';
import TopAnnouncementBar from './TopAnnouncementBar';
import LocalizationSelector from './LocalizationSelector';
import NotificationCenterModal from './NotificationCenterModal';
import api from '../api/client';

export const Navbar = ({ searchQuery, setSearchQuery, uiConfig, onCategorySelect, isMobileMode = false }) => {
  const { user } = useAuth();
  const { cartCount, setIsCartOpen } = useCart();
  const { t } = useLocalization();

  // Location selector state
  const [deliveryLocation, setDeliveryLocation] = useState(() => {
    return localStorage.getItem('auramarket_location') || 'New Delhi, 110001';
  });
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [tempPincode, setTempPincode] = useState('');
  const [tempCity, setTempCity] = useState('');

  // Wishlist count state
  const [wishlistCount, setWishlistCount] = useState(() => {
    try {
      const saved = localStorage.getItem('auramarket_wishlist');
      return saved ? JSON.parse(saved).length : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const handleWishlistChange = () => {
      try {
        const saved = localStorage.getItem('auramarket_wishlist');
        setWishlistCount(saved ? JSON.parse(saved).length : 0);
      } catch {
        setWishlistCount(0);
      }
    };
    window.addEventListener('auramarket_wishlist_update', handleWishlistChange);
    window.addEventListener('storage', handleWishlistChange);
    return () => {
      window.removeEventListener('auramarket_wishlist_update', handleWishlistChange);
      window.removeEventListener('storage', handleWishlistChange);
    };
  }, []);

  // Point #31: Wallet & Coins preview state
  const [walletPreview, setWalletPreview] = useState(() => {
    try {
      const saved = localStorage.getItem('auramarket_wallet_preview');
      return saved ? JSON.parse(saved) : { coins: 500, balance: 250 };
    } catch {
      return { coins: 500, balance: 250 };
    }
  });

  useEffect(() => {
    const handleWalletUpdate = (e) => {
      if (e.detail) {
        setWalletPreview(e.detail);
        localStorage.setItem('auramarket_wallet_preview', JSON.stringify(e.detail));
      }
    };
    const handleStorageUpdate = (e) => {
      if (e.key === 'auramarket_wallet_sync' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setWalletPreview(parsed);
          localStorage.setItem('auramarket_wallet_preview', JSON.stringify(parsed));
        } catch (_) {}
      }
    };
    window.addEventListener('auramarket_wallet_update', handleWalletUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('auramarket_wallet_update', handleWalletUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  // Point #2: Customer Notification Center State
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);

  const fetchUnreadNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data?.success) {
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchUnreadNotifications();
    const handleOpenNotif = () => setIsNotificationOpen(true);
    const handleRefreshNotif = () => fetchUnreadNotifications();
    window.addEventListener('auramarket_open_notifications', handleOpenNotif);
    window.addEventListener('auramarket_refresh_notifications', handleRefreshNotif);
    return () => {
      window.removeEventListener('auramarket_open_notifications', handleOpenNotif);
      window.removeEventListener('auramarket_refresh_notifications', handleRefreshNotif);
    };
  }, []);

  const handleSaveLocation = (loc) => {
    setDeliveryLocation(loc);
    localStorage.setItem('auramarket_location', loc);
    setIsLocationModalOpen(false);
  };

  const popularCities = [
    { city: 'New Delhi', pin: '110001' },
    { city: 'Mumbai', pin: '400001' },
    { city: 'Bengaluru', pin: '560001' },
    { city: 'Hyderabad', pin: '500001' },
    { city: 'Ahmedabad', pin: '380001' },
    { city: 'Kolkata', pin: '700001' },
  ];

  const subCategories = [
    { id: 'all', label: 'All Categories' },
    { id: 'electronics-audio', label: 'Electronics & Audio' },
    { id: 'fashion', label: 'Fashion & Apparel' },
    { id: 'watches-accessories', label: 'Watches & Wearables' },
    { id: 'deals', label: "Today's Flash Deals 🔥" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full shadow-md bg-white border-b border-slate-200">
      {/* Top Dynamic Announcement Bar (Point #39) */}
      <TopAnnouncementBar uiConfig={uiConfig} />

      {/* Main Professional Royal Sapphire / Navy Header (Responsive 2-Row on Mobile, 1-Row on Desktop) */}
      <div className="bg-[#0f2444] text-white px-3 sm:px-4 lg:px-8 py-2.5 sm:py-3.5 shadow-sm">
        <div className={`max-w-7xl mx-auto flex ${isMobileMode ? 'flex-col items-stretch gap-2.5' : 'flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-6'}`}>
          
          {/* Top Bar on Mobile: Brand Logo + Location + Cart + Account */}
          <div className={`flex items-center justify-between gap-2 sm:gap-3 w-full ${isMobileMode ? '' : 'md:w-auto'}`}>
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

            {/* Desktop Location Pill (Right next to Logo) */}
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-left text-xs transition-all flex-shrink-0"
              title="Change Delivery Location"
            >
              <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div className="leading-tight">
                <p className="text-[9px] text-blue-200 uppercase font-bold">Deliver to</p>
                <div className="flex items-center gap-1 font-black text-white text-xs truncate max-w-[130px]">
                  <span>{deliveryLocation}</span>
                  <ChevronDown className="w-3 h-3 text-amber-400" />
                </div>
              </div>
            </button>

            {/* Mobile Header Actions (Wishlist, Cart, Avatar) */}
            <div className={`flex items-center gap-1.5 ${isMobileMode ? 'flex' : 'md:hidden'}`}>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('auramarket_open_wishlist'));
                }}
                className="relative p-2 rounded-lg bg-white/10 text-white hover:text-rose-400 transition-colors"
                title="Wishlist"
              >
                <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'text-rose-400 fill-rose-400' : ''}`} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* Point #2: Mobile Notification Center Bell */}
              <button
                onClick={() => setIsNotificationOpen(true)}
                className="relative p-2 rounded-lg bg-white/10 text-amber-400 hover:text-amber-300 transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Track Order Link Mobile */}
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('auramarket_open_order_tracker'));
                }}
                className="relative p-2 rounded-lg bg-white/10 text-emerald-400 hover:text-emerald-300 transition-colors"
                title="Track Order"
              >
                <Truck className="w-4 h-4" />
              </button>

              {/* Point #31: In-App Wallet & Coins Mobile */}
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('auramarket_open_wallet'));
                }}
                className="relative p-2 rounded-lg bg-white/10 text-amber-400 hover:text-amber-300 transition-colors"
                title="Rewards & Wallet"
              >
                <Wallet className="w-4 h-4" />
              </button>

              {/* Point #78: Mobile Currency & Language Switcher */}
              <LocalizationSelector variant="compact" />

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow transition-all active:scale-95"
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

          {/* Point #9 Live Search with Autocomplete & Search History Suggestions */}
          <div className={`w-full ${isMobileMode ? 'w-full' : 'md:flex-1 md:max-w-2xl'} relative`}>
            <LiveSearchAutocomplete
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectCategory={catSlug => {
                if (onCategorySelect) onCategorySelect(catSlug);
                window.dispatchEvent(new CustomEvent('auramarket_select_category', { detail: catSlug }));
              }}
              onSelectBrand={bName => {
                window.dispatchEvent(new CustomEvent('auramarket_select_brand', { detail: bName }));
              }}
              onSelectProduct={prod => {
                window.dispatchEvent(new CustomEvent('auramarket_open_product_pdp', { detail: prod }));
              }}
            />
          </div>

          {/* Desktop Right Header Navigation: Location, Wishlist, Account & Cart */}
          <div className={`${isMobileMode ? 'hidden' : 'hidden md:flex'} items-center gap-3.5 flex-shrink-0`}>
            {/* Live Order Tracker */}
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('auramarket_open_order_tracker'));
              }}
              className="relative p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all flex items-center gap-1.5"
              title="Track Order"
            >
              <Truck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold hidden lg:inline">Track Order</span>
            </button>

            {/* Point #2: Desktop Notification Center Bell */}
            <button
              onClick={() => setIsNotificationOpen(true)}
              className="relative p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all flex items-center gap-1.5"
              title="Notifications & Live Alerts"
            >
              <div className="relative">
                <Bell className="w-4 h-4 text-amber-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold hidden lg:inline">Alerts</span>
            </button>

            {/* Wishlist Link */}
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('auramarket_open_wishlist'));
              }}
              className="relative p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all flex items-center gap-1.5"
              title="My Wishlist"
            >
              <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'text-rose-400 fill-rose-400' : 'text-slate-200'}`} />
              <span className="text-xs font-bold hidden lg:inline">Wishlist</span>
              {wishlistCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Point #31: In-App Wallet & Coins Desktop */}
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('auramarket_open_wallet'));
              }}
              className="relative p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all flex items-center gap-1.5"
              title="AuraMarket Wallet & Reward Coins"
            >
              <Wallet className="w-4 h-4 text-amber-400" />
              <div className="text-left hidden lg:block leading-tight">
                <span className="text-[10px] text-amber-300 font-bold block">Rewards & Wallet</span>
                <span className="text-xs font-black text-white">{walletPreview.coins} 🪙</span>
              </div>
            </button>

            {/* Account / User */}
            <div className="flex items-center gap-2 cursor-pointer text-xs">
              <div className="w-8 h-8 rounded-full bg-blue-950/70 border border-blue-800 flex items-center justify-center font-black text-amber-400 shadow-inner flex-shrink-0">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden lg:block">
                <p className="text-[10px] text-blue-300 font-semibold leading-tight">Hello, {user?.name?.split(' ')[0] || 'Guest'}</p>
                <p className="font-black text-white leading-tight">Account & Lists</p>
              </div>
            </div>

            {/* Point #78: Real-Time Multi-Currency & Multi-Language Switcher */}
            <LocalizationSelector />

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95"
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

      {/* Mobile Location Sub-Bar (Matches Screenshot 1 eShop Look) */}
      <div className="flex md:hidden items-center justify-between px-3 py-1.5 bg-[#0b1c36] text-blue-200 text-xs border-t border-white/10">
        <button
          onClick={() => setIsLocationModalOpen(true)}
          className="flex items-center gap-1.5 text-left truncate w-full"
        >
          <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="text-[10px] text-slate-300 font-semibold flex-shrink-0">Deliver to:</span>
          <span className="text-xs font-bold text-white truncate">{deliveryLocation}</span>
          <ChevronDown className="w-3 h-3 text-amber-400 flex-shrink-0 ml-auto" />
        </button>
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

      {/* Interactive Delivery Location Modal (Amazon / eShop Style) */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-slate-900 text-sm">Choose Delivery Location</h3>
              </div>
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select your delivery location to view accurate product availability and delivery timelines.
            </p>

            {/* Custom Pincode Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-500">Enter Pincode or City</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 110001 or New Delhi"
                  value={tempPincode}
                  onChange={e => setTempPincode(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  onClick={() => {
                    if (tempPincode.trim()) {
                      handleSaveLocation(tempPincode.trim());
                      setTempPincode('');
                    }
                  }}
                  className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow transition-all"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Popular Cities Grid */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-[11px] font-black uppercase text-slate-400">Popular Cities</label>
              <div className="grid grid-cols-2 gap-2">
                {popularCities.map(item => (
                  <button
                    key={item.city}
                    onClick={() => handleSaveLocation(`${item.city}, ${item.pin}`)}
                    className="p-2 rounded-xl text-left border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-xs font-semibold text-slate-700 transition-all flex items-center justify-between"
                  >
                    <span>{item.city}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{item.pin}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Point #2: Real-Time Customer Notification Center Drawer Modal */}
      <NotificationCenterModal
        isOpen={isNotificationOpen}
        onClose={() => {
          setIsNotificationOpen(false);
          fetchUnreadNotifications();
        }}
        onTrackOrder={(ordNumber) => {
          window.dispatchEvent(new CustomEvent('auramarket_open_order_tracker', { detail: ordNumber }));
        }}
      />
    </header>
  );
};
