import React, { useState, useEffect } from 'react';
import {
  X,
  Store,
  ShieldCheck,
  Star,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Globe,
  Package,
  Search,
  ShoppingCart,
  Check,
  FileText,
  BadgePercent,
  Clock,
  Palmtree,
  Sparkles,
  Megaphone,
  Award,
  Video,
} from 'lucide-react';
import api from '../api/client';

const VendorPublicStoreModal = ({
  isOpen,
  onClose,
  storeSlugOrId,
  initialStoreData,
  onAddToCart,
  onSelectProduct,
}) => {
  const [storeData, setStoreData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addedItemSku, setAddedItemSku] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (storeSlugOrId) {
        fetchPublicStore(storeSlugOrId);
      } else if (initialStoreData) {
        setStoreData({
          ...initialStoreData,
          products: initialStoreData.products || [],
        });
      }
    }
  }, [isOpen, storeSlugOrId, initialStoreData]);

  const fetchPublicStore = async (identifier) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/vendor/store/${identifier}`);
      if (res.data?.success && res.data.data) {
        setStoreData(res.data.data);
      } else {
        fallbackToInitial();
      }
    } catch (_) {
      fallbackToInitial();
    } finally {
      setIsLoading(false);
    }
  };

  const fallbackToInitial = () => {
    if (initialStoreData) {
      setStoreData(initialStoreData);
    } else {
      setStoreData({
        storeName: 'Apex Tech Enterprise',
        storeSlug: 'apex-tech-enterprise',
        storeLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200',
        storeBanner: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200',
        bio: 'Premier supplier of audiophile gear, smart home electronics, and next-gen wearable gadgets since 2020.',
        rating: 4.9,
        supportPhone: '+91 98765 43210',
        supportEmail: 'support@apextech.io',
        pickupCity: 'Bengaluru',
        pickupState: 'Karnataka',
        socialLinks: {
          instagram: 'https://instagram.com/apextechhub',
          twitter: 'https://x.com/apextechhub',
          website: 'https://apextechhub.io',
        },
        returnPolicy: 'Hassle-free 10-day replacement on all electronic items.',
        products: [],
      });
    }
  };

  if (!isOpen) return null;

  const filteredProducts = (storeData?.products || []).filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.category?.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase?.().includes(q)
    );
  });

  const handleCartAdd = (product) => {
    if (onAddToCart) {
      onAddToCart(product);
      setAddedItemSku(product.sku || product._id || product.id);
      setTimeout(() => setAddedItemSku(null), 1800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Point 36: Merchant Custom Announcement Ticker */}
        {storeData?.storefrontCustomization?.announcementBar?.isEnabled &&
          storeData.storefrontCustomization.announcementBar.text && (
            <div
              style={{
                backgroundColor: storeData.storefrontCustomization.announcementBar.bgColor || '#1E1B4B',
                color: storeData.storefrontCustomization.announcementBar.textColor || '#E0E7FF',
              }}
              className="px-4 py-2 text-xs font-semibold flex items-center justify-between gap-3 shrink-0 shadow-xs border-b border-white/10 z-30"
            >
              <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                <Megaphone className="w-3.5 h-3.5 shrink-0 animate-bounce" />
                <span className="truncate">{storeData.storefrontCustomization.announcementBar.text}</span>
              </div>
              {storeData.storefrontCustomization.announcementBar.link && (
                <a
                  href={storeData.storefrontCustomization.announcementBar.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-[11px] font-black shrink-0 transition-all"
                >
                  <span>Learn More</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

        {/* Banner with Close Button */}
        <div className="relative h-44 sm:h-56 w-full bg-slate-900 shrink-0 overflow-hidden">
          <img
            src={storeData?.storeBanner || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200'}
            alt="Store Banner"
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-slate-950/60 hover:bg-slate-950 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all z-20 shadow-md"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Public Storefront Indicator Pill */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/90 text-slate-950 text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-md flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5" />
              <span>Verified Brand Showcase</span>
            </span>
          </div>
        </div>

        {/* Store Header & Stats Bar */}
        <div className="px-6 sm:px-8 pb-5 bg-white border-b border-slate-200 relative shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 relative z-10">
            {/* Logo and Brand Info */}
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border-4 border-white bg-white shadow-2xl overflow-hidden shrink-0">
                <img
                  src={storeData?.storeLogo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'}
                  alt={storeData?.storeName || 'Store Logo'}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {storeData?.storeName || 'Apex Tech Hub'}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>AuraMarket Verified</span>
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold flex-wrap">
                  <span className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{storeData?.rating || 4.9} Merchant Rating</span>
                  </span>

                  {(storeData?.pickupCity || storeData?.pickupState) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {storeData.pickupCity}
                        {storeData.pickupState ? `, ${storeData.pickupState}` : ''}
                      </span>
                    </span>
                  )}

                  <span className="font-mono text-indigo-600 font-bold">
                    /store/{storeData?.storeSlug || 'apex-tech'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Contact & Social Handles */}
            <div className="flex items-center gap-2 flex-wrap">
              {storeData?.supportPhone && (
                <a
                  href={`tel:${storeData.supportPhone}`}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Call Store</span>
                </a>
              )}

              {storeData?.supportEmail && (
                <a
                  href={`mailto:${storeData.supportEmail}`}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Email</span>
                </a>
              )}

              {storeData?.socialLinks?.instagram && (
                <a
                  href={storeData.socialLinks.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-200 flex items-center justify-center transition-all"
                  title="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}

              {storeData?.socialLinks?.twitter && (
                <a
                  href={storeData.socialLinks.twitter}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200 flex items-center justify-center transition-all"
                  title="Twitter / X"
                >
                  <Twitter className="w-4 h-4" />
                </a>
              )}

              {storeData?.socialLinks?.facebook && (
                <a
                  href={storeData.socialLinks.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 flex items-center justify-center transition-all"
                  title="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
              )}

              {storeData?.socialLinks?.youtube && (
                <a
                  href={storeData.socialLinks.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 flex items-center justify-center transition-all"
                  title="YouTube"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              )}

              {storeData?.socialLinks?.website && (
                <a
                  href={storeData.socialLinks.website}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center transition-all"
                  title="Official Website"
                >
                  <Globe className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Point 59: Vacation Notice Banner */}
          {storeData?.vacationMode?.isVacation && (
            <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3 shadow-xs animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-bold">
                <Palmtree className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-black text-amber-900 flex items-center gap-1.5">
                  <span>Store Currently on Holiday Break</span>
                  {storeData.vacationMode.disableOrdering && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] uppercase font-black">
                      Orders Paused
                    </span>
                  )}
                </p>
                <p className="text-amber-800 font-medium mt-0.5">
                  {storeData.vacationMode.noticeMessage || 'This store is temporarily on vacation. Orders will resume shortly.'}
                </p>
                {storeData.vacationMode.endDate && (
                  <p className="text-[11px] text-amber-900 font-bold mt-1">
                    🗓️ Operations resume on {new Date(storeData.vacationMode.endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Bio & Return Guarantee Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
            <div className="md:col-span-2 text-slate-600 leading-relaxed font-medium">
              <strong className="text-slate-900 font-bold block mb-0.5">Brand Story & Mission:</strong>
              {storeData?.bio || storeData?.description || 'Official certified distributor offering genuine manufacturer warranty and express doorstep fulfillment.'}
            </div>

            <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-950 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-indigo-900">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Buyer Protection</span>
              </div>
              <p className="text-[11px] text-indigo-800 leading-tight">
                {storeData?.returnPolicy || '7-day replacement guarantee on all delivered products.'}
              </p>
            </div>
          </div>
        </div>

        {/* Store Catalog Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {/* Point 36: Custom Hero Showcase Banners */}
          {storeData?.storefrontCustomization?.heroBanners?.filter((b) => b.isActive).length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {storeData.storefrontCustomization.heroBanners
                  .filter((b) => b.isActive)
                  .map((banner, idx) => (
                    <div
                      key={banner.id || idx}
                      className="relative rounded-2xl overflow-hidden shadow-md group border border-slate-200 aspect-[21/9] sm:aspect-[16/7]"
                    >
                      <img
                        src={banner.imageUrl}
                        alt={banner.title || 'Store Banner'}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex flex-col justify-end p-5 text-white">
                        {banner.title && (
                          <h3 className="text-base sm:text-lg font-black tracking-tight">{banner.title}</h3>
                        )}
                        {banner.subtitle && (
                          <p className="text-xs text-slate-300 font-medium line-clamp-2 mt-0.5">
                            {banner.subtitle}
                          </p>
                        )}
                        {banner.buttonText && (
                          <div className="mt-3">
                            {banner.targetUrl ? (
                              <a
                                href={banner.targetUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black transition-all shadow-md"
                              >
                                <span>{banner.buttonText}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-black shadow-md">
                                {banner.buttonText}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Point 36: Artisan Heritage & Founder Story */}
          {storeData?.storefrontCustomization?.brandStory?.storyText && (
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-xl border border-indigo-800/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row items-start gap-5">
                {storeData.storefrontCustomization.brandStory.founderPhoto && (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border-2 border-amber-400/60 shadow-lg">
                    <img
                      src={storeData.storefrontCustomization.brandStory.founderPhoto}
                      alt={storeData.storefrontCustomization.brandStory.founderName || 'Founder'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-400/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>Artisan Heritage</span>
                    </span>
                    {storeData.storefrontCustomization.brandStory.foundedYear && (
                      <span className="text-[11px] text-slate-400 font-semibold">
                        Est. {storeData.storefrontCustomization.brandStory.foundedYear}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                    {storeData.storefrontCustomization.brandStory.title || 'Our Craft & Heritage'}
                  </h3>
                  {storeData.storefrontCustomization.brandStory.founderName && (
                    <p className="text-xs text-amber-400 font-bold">
                      Narrated by {storeData.storefrontCustomization.brandStory.founderName}
                    </p>
                  )}
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    {storeData.storefrontCustomization.brandStory.storyText}
                  </p>

                  {/* Badges */}
                  {storeData.storefrontCustomization.brandStory.badges?.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pt-2">
                      {storeData.storefrontCustomization.brandStory.badges.map((badge, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-xl bg-white/10 text-white text-[11px] font-semibold border border-white/10 flex items-center gap-1"
                        >
                          <Award className="w-3 h-3 text-amber-400" />
                          <span>{badge}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Video URL */}
                  {storeData.storefrontCustomization.brandStory.videoUrl && (
                    <div className="pt-2">
                      <a
                        href={storeData.storefrontCustomization.brandStory.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Watch Artisan Workshop Tour</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                <span>Products from {storeData?.storeName || 'Merchant'}</span>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {filteredProducts.length} items
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                All inventory ships directly from this merchant's verified dispatch center.
              </p>
            </div>

            {/* Catalog Search Filter */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search this store..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold">Loading merchant catalog...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 space-y-2">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No products match your search</p>
              <p className="text-xs text-slate-400">Try clearing filters or search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock <= 0;
                const isLow = p.stock > 0 && p.stock <= (p.lowStockThreshold || 5);
                const discount = p.mrp && p.sellingPrice ? Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100) : 0;
                const pId = p.sku || p._id || p.id;
                const isJustAdded = addedItemSku === pId;
                const isVacationOrderingPaused = Boolean(storeData?.vacationMode?.isVacation && storeData?.vacationMode?.disableOrdering !== false);

                return (
                  <div
                    key={pId}
                    className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all p-3.5 flex flex-col justify-between"
                  >
                    <div>
                      {/* Product Thumbnail with Badges */}
                      <div className="relative h-44 w-full rounded-xl overflow-hidden bg-slate-100 mb-3">
                        <img
                          src={p.thumbnail || (p.images && p.images[0]) || p.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'}
                          alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                        />

                        {discount > 0 && (
                          <div className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm">
                            {discount}% OFF
                          </div>
                        )}

                        {isOutOfStock ? (
                          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center">
                            <span className="text-xs font-black uppercase text-white px-3 py-1 rounded-full bg-rose-600 shadow-md">
                              Out of Stock
                            </span>
                          </div>
                        ) : isLow ? (
                          <div className="absolute bottom-2 left-2 bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Only {p.stock} left</span>
                          </div>
                        ) : null}
                      </div>

                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {p.category?.name || p.category || 'Electronics'}
                      </p>
                      <h3
                        onClick={() => onSelectProduct && onSelectProduct(p)}
                        className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mt-0.5 cursor-pointer"
                        title={p.title}
                      >
                        {p.title}
                      </h3>
                    </div>

                    <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-black text-slate-900">
                            ₹{p.sellingPrice?.toLocaleString('en-IN')}
                          </span>
                          {p.mrp && p.mrp > p.sellingPrice && (
                            <span className="text-[11px] text-slate-400 line-through">
                              ₹{p.mrp?.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isOutOfStock || isVacationOrderingPaused}
                        onClick={() => handleCartAdd(p)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                          isOutOfStock
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : isVacationOrderingPaused
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed'
                            : isJustAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                        }`}
                      >
                        {isJustAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added!</span>
                          </>
                        ) : isVacationOrderingPaused ? (
                          <>
                            <Palmtree className="w-3.5 h-3.5 text-amber-700" />
                            <span>On Vacation</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorPublicStoreModal;
