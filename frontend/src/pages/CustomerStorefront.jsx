import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Truck,
  RotateCcw,
  CreditCard,
  KeyRound,
  Trash2,
  PackageCheck,
  Clock,
  Layers,
  Heart,
  Share2,
  MessageCircle,
  Check,
  X,
  MapPin,
  Eye,
  SlidersHorizontal,
  FolderTree,
  ChevronRight,
  ChevronLeft,
  Filter,
  Flame,
  BadgePercent,
  ArrowUpDown,
  ArrowLeftRight,
  FileText,
  Printer,
  Wallet,
  Coins,
  MessageSquare,
} from 'lucide-react';
import { SlideOverDrawer } from '../components/SlideOverDrawer';
import { ProductDetailModal } from '../components/ProductDetailModal';
import WishlistDrawer from '../components/WishlistDrawer';
import ProductCompareModal from '../components/ProductCompareModal';
import ProductCompareDock from '../components/ProductCompareDock';
import FreeShippingMeter from '../components/FreeShippingMeter';
import CategorySidebar from '../components/CategorySidebar';
import FlashSaleSection from '../components/FlashSaleSection';
import StockUrgencyBadge from '../components/StockUrgencyBadge';
import RecentPurchaseCounter from '../components/RecentPurchaseCounter';
import SocialProofToast from '../components/SocialProofToast';
import PromoCouponBox from '../components/PromoCouponBox';
import StorefrontOffersHub from '../components/StorefrontOffersHub';
import ScratchCardModal from '../components/ScratchCardModal';
import AddressBookModal from '../components/AddressBookModal';
import DynamicCheckoutPayment from '../components/DynamicCheckoutPayment';
import LiveOrderTrackerModal from '../components/LiveOrderTrackerModal';
import TaxInvoiceModal from '../components/TaxInvoiceModal';
import WalletDrawer from '../components/WalletDrawer';
import VendorPublicStoreModal from '../components/VendorPublicStoreModal';
import WhatsAppOrderBotModal from '../components/WhatsAppOrderBotModal';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export const CustomerStorefront = ({ searchQuery, uiConfig, activeCategoryFilter }) => {
  const { cartItems, isCartOpen, setIsCartOpen, addToCart, updateQuantity, removeFromCart, clearCart, cartTotal, vendorBreakdown } = useCart();
  const { user } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState(activeCategoryFilter || 'all');
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [sortBy, setSortBy] = useState('popularity');
  const [isOpenCategoryDrawer, setIsOpenCategoryDrawer] = useState(false);
  const [isCollapsedCategorySidebar, setIsCollapsedCategorySidebar] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [activeOrderConfirmation, setActiveOrderConfirmation] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isWishlistDrawerOpen, setIsWishlistDrawerOpen] = useState(false);
  const [compareList, setCompareList] = useState([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isOffersHubOpen, setIsOffersHubOpen] = useState(false);
  const [isScratchCardOpen, setIsScratchCardOpen] = useState(false);
  const [scratchCardOrderId, setScratchCardOrderId] = useState(null);
  const [isOrderTrackerOpen, setIsOrderTrackerOpen] = useState(false);
  const [trackedOrderId, setTrackedOrderId] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceOrderId, setInvoiceOrderId] = useState(null);
  const [selectedVendorForModal, setSelectedVendorForModal] = useState(null); // Point #58: Public Storefront Showcase
  const [isWhatsAppBotOpen, setIsWhatsAppBotOpen] = useState(false); // Point #71: WhatsApp Order Bot
  const [whatsAppBotOrder, setWhatsAppBotOrder] = useState(null);

  // Point #31: In-App Wallet & Reward Coins State
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [redeemedCoins, setRedeemedCoins] = useState(0);
  const [customerWallet, setCustomerWallet] = useState({ coins: 500, balance: 250 });

  // Point #38: Homepage Hero Slider & Promo Banners State
  const [heroBanners, setHeroBanners] = useState([
    {
      _id: 'bn_hero_1',
      title: uiConfig?.heroBanners?.[0]?.title || 'Spatial Audio Reinvented',
      subtitle: uiConfig?.heroBanners?.[0]?.subtitle || 'Studio acoustics with active noise cancellation. Shipped directly from verified electronics distributor.',
      badgeText: uiConfig?.heroBanners?.[0]?.badgeText || 'MEGA FESTIVE DEAL',
      imageUrl: uiConfig?.heroBanners?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200',
      actionLink: uiConfig?.heroBanners?.[0]?.actionLink || '/category/electronics-audio',
      buttonText: 'Shop Festive Deals',
      backgroundColor: '#0F172A',
      textColor: '#FFFFFF',
    },
    {
      _id: 'bn_hero_2',
      title: 'Cyberpunk & Minimal Streetwear Drop',
      subtitle: 'Heavyweight organic cotton, boxy oversized cuts, and handcrafted aesthetics.',
      badgeText: '✨ New Arrivals',
      imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80',
      actionLink: '/category/fashion',
      buttonText: 'Explore Fashion',
      backgroundColor: '#1E1B4B',
      textColor: '#FFFFFF',
    },
    {
      _id: 'bn_hero_3',
      title: 'Titanium Smartwatch Pro Ultra Series',
      subtitle: 'Military-grade rugged durability, multi-day battery, and ECG cardiac sensor.',
      badgeText: '⚡ Limited Flash Deal',
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
      actionLink: '/products',
      buttonText: 'Grab Deal Now',
      backgroundColor: '#18181B',
      textColor: '#FFFFFF',
    },
  ]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isSlidePaused, setIsSlidePaused] = useState(false);
  const [topPromoBanner, setTopPromoBanner] = useState(null);

  // Fetch live banners from backend
  useEffect(() => {
    api.get('/banners?position=hero_slider&activeOnly=true')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setHeroBanners(res.data.data);
        }
      })
      .catch(() => {});

    api.get('/banners?position=promo_banner_top&activeOnly=true')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setTopPromoBanner(res.data.data[0]);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-advance hero slides every 5 seconds unless hovered/paused
  useEffect(() => {
    if (isSlidePaused || heroBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % heroBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isSlidePaused, heroBanners.length]);

  // Sync wallet on mount & listen to custom open event
  useEffect(() => {
    const fetchWalletState = () => {
      api.get('/wallet')
        .then(res => {
          if (res.data?.success && res.data.data) {
            setCustomerWallet({
              coins: res.data.data.walletCoins ?? 500,
              balance: res.data.data.walletBalance ?? 250,
            });
            window.dispatchEvent(new CustomEvent('auramarket_wallet_update', {
              detail: {
                coins: res.data.data.walletCoins ?? 500,
                balance: res.data.data.walletBalance ?? 250,
              }
            }));
          }
        })
        .catch(() => {});
    };

    fetchWalletState();

    const handleWalletUpdate = (e) => {
      if (e.detail) {
        setCustomerWallet((prev) => ({
          coins: e.detail.coins ?? e.detail.walletCoins ?? prev.coins,
          balance: e.detail.balance ?? e.detail.walletBalance ?? prev.balance,
        }));
      }
    };
    window.addEventListener('auramarket_wallet_update', handleWalletUpdate);

    const handleOpenWallet = () => setIsWalletOpen(true);
    window.addEventListener('auramarket_open_wallet', handleOpenWallet);
    return () => {
      window.removeEventListener('auramarket_wallet_update', handleWalletUpdate);
      window.removeEventListener('auramarket_open_wallet', handleOpenWallet);
    };
  }, []);

  // Wishlist state (persisted in localStorage + synced with backend /api/wishlist)
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem('auramarket_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Initial sync with backend wishlist
  useEffect(() => {
    api.get('/wishlist')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.items) && res.data.items.length > 0) {
          const backendIds = res.data.items.map(i => i.product?._id || i.product).filter(Boolean);
          setWishlist(prev => {
            const merged = Array.from(new Set([...prev, ...backendIds]));
            localStorage.setItem('auramarket_wishlist', JSON.stringify(merged));
            window.dispatchEvent(new CustomEvent('auramarket_wishlist_update'));
            return merged;
          });
        }
      })
      .catch(() => {});
  }, []);

  const toggleWishlist = (product, e) => {
    if (e) e.stopPropagation();
    const prodId = product._id || product.id;
    setWishlist(prev => {
      const exists = prev.includes(prodId);
      const updated = exists ? prev.filter(id => id !== prodId) : [...prev, prodId];
      localStorage.setItem('auramarket_wishlist', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('auramarket_wishlist_update'));
      setToastMessage(exists ? `Removed from Wishlist` : `Saved to Wishlist ❤️`);
      setTimeout(() => setToastMessage(null), 2200);
      return updated;
    });

    // Backend sync
    api.post('/wishlist/toggle', { productId: prodId }).catch(() => {});
  };

  const toggleCompare = (product, e) => {
    if (e) e.stopPropagation();
    const prodId = product._id || product.id;
    setCompareList(prev => {
      const exists = prev.includes(prodId);
      if (exists) {
        setToastMessage(`Removed from comparison`);
        setTimeout(() => setToastMessage(null), 2000);
        return prev.filter(id => id !== prodId);
      }
      if (prev.length >= 4) {
        setToastMessage(`You can compare up to 4 products at once`);
        setTimeout(() => setToastMessage(null), 2500);
        return prev;
      }
      const updated = [...prev, prodId];
      setToastMessage(`Added to comparison (${updated.length}/4) ⚖️`);
      setTimeout(() => setToastMessage(null), 2000);
      return updated;
    });
  };

  const handleMoveToCartFromWishlist = (product) => {
    const prodId = product._id || product.id;
    addToCart(product, 1);
    setWishlist(prev => {
      const updated = prev.filter(id => id !== prodId);
      localStorage.setItem('auramarket_wishlist', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('auramarket_wishlist_update'));
      return updated;
    });
    api.delete(`/wishlist/item/${prodId}`).catch(() => {});
    setToastMessage(`Moved "${product.title}" to Cart 🛍️`);
    setTimeout(() => setToastMessage(null), 2200);
  };

  const handleRemoveFromWishlist = (productId) => {
    setWishlist(prev => {
      const updated = prev.filter(id => id !== productId);
      localStorage.setItem('auramarket_wishlist', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('auramarket_wishlist_update'));
      return updated;
    });
    api.delete(`/wishlist/item/${productId}`).catch(() => {});
    setToastMessage('Item removed from Wishlist');
    setTimeout(() => setToastMessage(null), 2200);
  };

  const handleClearWishlist = () => {
    setWishlist([]);
    localStorage.setItem('auramarket_wishlist', JSON.stringify([]));
    window.dispatchEvent(new CustomEvent('auramarket_wishlist_update'));
    api.delete('/wishlist/clear').catch(() => {});
    setToastMessage('Wishlist cleared');
    setTimeout(() => setToastMessage(null), 2200);
  };

  const handleShareProduct = (product, e) => {
    if (e) e.stopPropagation();
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: product.title,
        text: `Check out ${product.title} on ${uiConfig?.storeName || 'AuraMarket'} for only ₹${product.sellingPrice}!`,
        url: shareUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      setToastMessage('Product link copied! 📋');
      setTimeout(() => setToastMessage(null), 2200);
    }
  };

  useEffect(() => {
    const handleOpenWishlist = () => {
      setIsWishlistDrawerOpen(true);
    };
    const handleSelectCategory = e => {
      if (e.detail) {
        setSelectedCategory(e.detail);
        setSelectedSubCategory(null);
      }
    };
    const handleSelectBrand = e => {
      if (e.detail) {
        setSelectedBrand(e.detail);
      }
    };
    const handleOpenProductPDP = e => {
      if (e.detail) {
        const prod = products.find(p => p._id === e.detail._id) || e.detail;
        setSelectedProduct(prod);
        if (prod.hasVariants && prod.variants?.length > 0) {
          setSelectedVariant(prod.variants[0]);
        }
      }
    };

    const handleOpenOrderTracker = e => {
      if (e?.detail) {
        setTrackedOrderId(e.detail);
      }
      setIsOrderTrackerOpen(true);
    };

    window.addEventListener('auramarket_open_wishlist', handleOpenWishlist);
    window.addEventListener('auramarket_open_order_tracker', handleOpenOrderTracker);
    window.addEventListener('auramarket_select_category', handleSelectCategory);
    window.addEventListener('auramarket_select_brand', handleSelectBrand);
    window.addEventListener('auramarket_open_product_pdp', handleOpenProductPDP);

    return () => {
      window.removeEventListener('auramarket_open_wishlist', handleOpenWishlist);
      window.removeEventListener('auramarket_open_order_tracker', handleOpenOrderTracker);
      window.removeEventListener('auramarket_select_category', handleSelectCategory);
      window.removeEventListener('auramarket_select_brand', handleSelectBrand);
      window.removeEventListener('auramarket_open_product_pdp', handleOpenProductPDP);
    };
  }, [products]);

  // Point #24: Checkout Address & Multi-Address Book State
  const [isAddressBookOpen, setIsAddressBookOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [address, setAddress] = useState({
    recipientName: user?.name || 'Aman Sharma',
    phone: user?.phone || '9876543214',
    alternatePhone: '',
    street: 'Flat 402, Green Valley Apartments, Sector 62',
    landmark: 'Near Metro Station Gate 2',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
    type: 'HOME',
  });

  // Fetch initial default address from backend
  useEffect(() => {
    api.get('/auth/addresses').then(res => {
      if (res.data?.success && Array.isArray(res.data.addresses) && res.data.addresses.length > 0) {
        const def = res.data.addresses.find(a => a.isDefault) || res.data.addresses[0];
        setSelectedAddressId(def._id);
        setAddress({
          recipientName: def.recipientName || 'Aman Sharma',
          phone: def.phone || '9876543214',
          alternatePhone: def.alternatePhone || '',
          street: def.street || 'Flat 402, Green Valley Apartments, Sector 62',
          landmark: def.landmark || '',
          city: def.city || 'New Delhi',
          state: def.state || 'Delhi',
          pincode: def.pincode || '110001',
          type: def.type || 'HOME',
        });
      }
    }).catch(() => {});
  }, [user]);

  // Point #25: Order Delivery Instructions / Rider Notes State
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  // Point #26: Multi-Gateway Dynamic Checkout Payment Details State
  const [paymentDetails, setPaymentDetails] = useState({ gateway: 'COD' });

  // Point #19, #22, #26, #31: Dynamic Grand Total Payable
  const grandTotalPayable = useMemo(() => {
    const freeThresh = uiConfig?.shipping?.freeShippingThreshold ?? 999;
    const defaultShipFee = uiConfig?.shipping?.defaultShippingFee ?? 99;
    const isFree = cartTotal >= freeThresh;
    const activeShipFee = isFree ? 0 : defaultShipFee;
    const couponDiscount = appliedCoupon?.discountAmount || 0;
    const coinDiscount = Number(redeemedCoins || 0);
    return Math.max(0, cartTotal - couponDiscount + activeShipFee - coinDiscount);
  }, [cartTotal, appliedCoupon, uiConfig, redeemedCoins]);

  // Dynamic Payment Gateways from Super Admin Integrations Hub
  const paymentSettings = uiConfig?.integrations?.payments || {
    cod: { enabled: true, label: 'Cash on Delivery (COD)' },
    upi: { enabled: true, upiId: '8533955333@paytm', merchantName: 'AuraMarket Store' },
    razorpay: { enabled: true },
    stripe: { enabled: true },
  };

  const validGateways = useMemo(() => {
    const active = [];
    if (paymentSettings.cod?.enabled !== false) {
      active.push({
        id: 'COD',
        name: paymentSettings.cod?.label || 'Cash on Delivery (COD)',
        badge: '💵 Doorstep Cash',
        subtext: 'Pay cash or UPI upon package arrival',
      });
    }
    if (paymentSettings.upi?.enabled !== false) {
      active.push({
        id: 'UPI',
        name: 'Direct UPI & Dynamic QR',
        badge: '⚡ Instant 0% Fee',
        subtext: `Pay directly to ${paymentSettings.upi?.upiId || '8533955333@paytm'}`,
      });
    }
    if (paymentSettings.razorpay?.enabled !== false) {
      active.push({
        id: 'RAZORPAY',
        name: 'Razorpay Secure',
        badge: '💳 Cards & NetBanking',
        subtext: 'Cards, NetBanking & UPI via Razorpay',
      });
    }
    if (paymentSettings.stripe?.enabled !== false) {
      active.push({
        id: 'STRIPE',
        name: 'Stripe Global Checkout',
        badge: '🌐 Global Cards',
        subtext: 'International cards, Apple Pay & Google Pay',
      });
    }
    // Point #31: In-App Wallet Balance Gateway Option
    active.push({
      id: 'WALLET',
      name: `In-App Wallet (₹${customerWallet.balance || 0})`,
      badge: '🪙 Instant 0-Fee',
      subtext: `Pay using your in-app cash balance (Available: ₹${customerWallet.balance || 0})`,
    });

    return active.length > 0
      ? active
      : [{ id: 'COD', name: 'Cash on Delivery (COD)', badge: '💵 Doorstep Cash', subtext: 'Pay upon delivery' }];
  }, [paymentSettings]);

  useEffect(() => {
    if (!validGateways.some(g => g.id === paymentMethod)) {
      setPaymentMethod(validGateways[0]?.id || 'COD');
    }
  }, [validGateways, paymentMethod]);

  // Rich Product Catalog with Variants, Vendors & Hierarchical Subcategories (Point #4)
  const [products] = useState([
    {
      _id: 'prod_001',
      title: 'Aura Pro ANC Wireless Noise-Cancelling Headphones',
      description: 'Studio-grade spatial acoustics with 40-hour battery life and custom titanium drivers.',
      category: 'electronics-audio',
      categoryLabel: 'Electronics & Audio',
      subCategory: 'wireless-headphones',
      subCategoryLabel: 'Wireless Headphones',
      brand: 'AuraAudio',
      mrp: 14999,
      sellingPrice: 8999,
      stock: 45,
      sku: 'APX-HEAD-001',
      images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80'],
      ratingsAverage: 4.8,
      ratingsQuantity: 142,
      vendor: { _id: 'vnd_001', storeName: 'Apex Tech Hub', rating: 4.9 },
      hasVariants: true,
      variants: [
        { sku: 'APX-HEAD-BLK', name: 'Color: Midnight Black', additionalPrice: 0, stock: 25 },
        { sku: 'APX-HEAD-SLV', name: 'Color: Silver Matte', additionalPrice: 500, stock: 20 },
      ],
    },
    {
      _id: 'prod_002',
      title: 'AeroWatch S9 Ultra Smartwatch with AMOLED Display',
      description: 'Titanium chassis, ECG heart tracking, GPS routing, and IP68 waterproof rating.',
      category: 'watches-accessories',
      categoryLabel: 'Watches & Accessories',
      subCategory: 'smartwatches-wearables',
      subCategoryLabel: 'Smartwatches & Wearables',
      brand: 'AeroTech',
      mrp: 9999,
      sellingPrice: 4499,
      stock: 30,
      sku: 'APX-WTCH-002',
      images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80'],
      ratingsAverage: 4.7,
      ratingsQuantity: 88,
      vendor: { _id: 'vnd_001', storeName: 'Apex Tech Hub', rating: 4.9 },
      hasVariants: false,
    },
    {
      _id: 'prod_003',
      title: 'Obsidian Oversized Heavyweight Cotton Hoodie',
      description: '450 GSM French terry cotton with tailored dropped shoulders and ribbed cuffs.',
      category: 'fashion',
      categoryLabel: 'Fashion & Apparel',
      subCategory: 'streetwear-hoodies',
      subCategoryLabel: 'Streetwear & Hoodies',
      brand: 'Vogue Urban',
      mrp: 3999,
      sellingPrice: 1999,
      stock: 60,
      sku: 'VOG-HOD-001',
      images: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&q=80'],
      ratingsAverage: 4.9,
      ratingsQuantity: 215,
      vendor: { _id: 'vnd_002', storeName: 'Vogue Trends Apparel', rating: 4.8 },
      hasVariants: true,
      variants: [
        { sku: 'VOG-HOD-M', name: 'Size: M (Medium)', additionalPrice: 0, stock: 20 },
        { sku: 'VOG-HOD-L', name: 'Size: L (Large)', additionalPrice: 0, stock: 25 },
        { sku: 'VOG-HOD-XL', name: 'Size: XL (Extra Large)', additionalPrice: 100, stock: 15 },
      ],
    },
    {
      _id: 'prod_004',
      title: 'Tailored Linen Minimalist Casual Blazer',
      description: 'Breathable pure European linen engineered for lightweight summer styling.',
      category: 'fashion',
      categoryLabel: 'Fashion & Apparel',
      subCategory: 'blazers-formal',
      subCategoryLabel: 'Tailored Blazers',
      brand: 'Vogue Luxe',
      mrp: 7999,
      sellingPrice: 4299,
      stock: 25,
      sku: 'VOG-BLZ-002',
      images: ['https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&q=80'],
      ratingsAverage: 4.6,
      ratingsQuantity: 49,
      vendor: { _id: 'vnd_002', storeName: 'Vogue Trends Apparel', rating: 4.8 },
      hasVariants: false,
    },
    {
      _id: 'prod_005',
      title: 'SonicPulse 360 Portable Bluetooth Speaker',
      description: '360-degree immersive acoustic sound, IPX7 waterproof rating, and 24-hour playtime.',
      category: 'electronics-audio',
      categoryLabel: 'Electronics & Audio',
      subCategory: 'bluetooth-speakers',
      subCategoryLabel: 'Bluetooth Speakers',
      brand: 'AuraAudio',
      mrp: 4999,
      sellingPrice: 2499,
      stock: 50,
      sku: 'APX-SPK-003',
      images: ['https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500&q=80'],
      ratingsAverage: 4.8,
      ratingsQuantity: 65,
      vendor: { _id: 'vnd_001', storeName: 'Apex Tech Hub', rating: 4.9 },
      hasVariants: false,
    },
    {
      _id: 'prod_006',
      title: 'Aura Luma Ambient Smart Desk Lamp',
      description: 'Stepless color temperature dimming, wireless phone charging base, and gentle eye-care light.',
      category: 'home-kitchen',
      categoryLabel: 'Home & Kitchen',
      subCategory: 'smart-lighting',
      subCategoryLabel: 'Smart Lighting',
      brand: 'AuraLiving',
      mrp: 5999,
      sellingPrice: 3199,
      stock: 35,
      sku: 'APX-LMP-004',
      images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&q=80'],
      ratingsAverage: 4.7,
      ratingsQuantity: 28,
      vendor: { _id: 'vnd_001', storeName: 'Apex Tech Hub', rating: 4.9 },
      hasVariants: false,
    },
  ]);

  // Hierarchical Multi-Level Categories Tree with Dynamic Live Counts (Point #4)
  const categoriesTree = useMemo(() => {
    const rootStructure = [
      {
        _id: 'cat_electronics',
        name: 'Electronics & Audio',
        slug: 'electronics-audio',
        icon: 'headphones',
        subcategories: [
          { _id: 'sub_headphones', name: 'Wireless Headphones', slug: 'wireless-headphones' },
          { _id: 'sub_smartwatches', name: 'Smartwatches & Wearables', slug: 'smartwatches-wearables' },
          { _id: 'sub_speakers', name: 'Bluetooth Speakers', slug: 'bluetooth-speakers' },
        ],
      },
      {
        _id: 'cat_fashion',
        name: 'Men & Women Fashion',
        slug: 'fashion',
        icon: 'shirt',
        subcategories: [
          { _id: 'sub_hoodies', name: 'Streetwear & Hoodies', slug: 'streetwear-hoodies' },
          { _id: 'sub_blazers', name: 'Tailored Blazers', slug: 'blazers-formal' },
          { _id: 'sub_footwear', name: 'Footwear & Sneakers', slug: 'footwear-sneakers' },
        ],
      },
      {
        _id: 'cat_watches',
        name: 'Watches & Accessories',
        slug: 'watches-accessories',
        icon: 'watch',
        subcategories: [
          { _id: 'sub_chronographs', name: 'Luxury Chronographs', slug: 'luxury-chronographs' },
          { _id: 'sub_smartbands', name: 'Smart Bands & Straps', slug: 'smart-bands' },
          { _id: 'sub_leather', name: 'Leather Straps & Wallets', slug: 'leather-wallets' },
        ],
      },
      {
        _id: 'cat_home',
        name: 'Home & Kitchen',
        slug: 'home-kitchen',
        icon: 'home',
        subcategories: [
          { _id: 'sub_lighting', name: 'Smart Lighting', slug: 'smart-lighting' },
          { _id: 'sub_kitchen', name: 'Kitchen & Dining', slug: 'cookware-appliances' },
        ],
      },
    ];

    return rootStructure.map(parent => {
      const subWithCounts = parent.subcategories.map(sub => {
        const count = products.filter(p => p.subCategory === sub.slug).length;
        return { ...sub, productCount: count };
      });
      const subSlugs = new Set(subWithCounts.map(s => s.slug));
      const parentCount = products.filter(
        p => p.category === parent.slug || subSlugs.has(p.subCategory)
      ).length;
      return {
        ...parent,
        productCount: parentCount,
        subcategories: subWithCounts,
      };
    });
  }, [products]);

  const categories = [
    { id: 'all', label: 'All Products', icon: '🛍️' },
    { id: 'electronics-audio', label: 'Electronics & Audio', icon: '🎧' },
    { id: 'fashion', label: 'Fashion & Apparel', icon: '👕' },
    { id: 'watches-accessories', label: 'Watches & Wearables', icon: '⌚' },
    { id: 'home-kitchen', label: 'Home & Kitchen', icon: '🏠' },
    { id: 'wishlist', label: `My Wishlist (${wishlist.length})`, icon: '❤️' },
  ];

  // Active Category & Subcategory Labels for Breadcrumb
  const activeCategoryObj = useMemo(
    () => categoriesTree.find(c => c.slug === selectedCategory),
    [categoriesTree, selectedCategory]
  );

  const activeCategoryLabel = useMemo(() => {
    if (selectedCategory === 'wishlist') return 'Saved Wishlist';
    if (selectedCategory === 'all') return 'All Categories';
    return activeCategoryObj?.name || 'Selected Category';
  }, [selectedCategory, activeCategoryObj]);

  const activeSubCategoryLabel = useMemo(() => {
    if (!selectedSubCategory || !activeCategoryObj) return null;
    const sub = activeCategoryObj.subcategories?.find(s => s.slug === selectedSubCategory);
    return sub?.name || selectedSubCategory;
  }, [selectedSubCategory, activeCategoryObj]);

  // Distinct Brands Directory with Logos & Product Counts (Point #5)
  const brandsList = useMemo(() => {
    const brandMetaMap = {
      'AuraAudio': {
        logo: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=120',
        origin: 'Acoustic Labs',
      },
      'AeroTech': {
        logo: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=120',
        origin: 'Smart Wearables',
      },
      'Vogue Urban': {
        logo: 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=120',
        origin: 'Streetwear Couture',
      },
      'Vogue Luxe': {
        logo: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=120',
        origin: 'Luxury Tailoring',
      },
      'AuraLiving': {
        logo: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=120',
        origin: 'Smart Home & Living',
      },
    };

    const counts = {};
    products.forEach(p => {
      const b = (p.brand || 'Generic').trim();
      counts[b] = (counts[b] || 0) + 1;
    });

    return Object.keys(counts).map(name => ({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      productCount: counts[name],
      logo: brandMetaMap[name]?.logo || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120',
      origin: brandMetaMap[name]?.origin || 'Verified Partner',
    }));
  }, [products]);

  // Ratings Threshold Product Counts (Point #6)
  const ratingsCounts = useMemo(() => {
    return {
      4.8: products.filter(p => p.ratingsAverage >= 4.8).length,
      4.5: products.filter(p => p.ratingsAverage >= 4.5).length,
      4.0: products.filter(p => p.ratingsAverage >= 4.0).length,
      3.0: products.filter(p => p.ratingsAverage >= 3.0).length,
    };
  }, [products]);

  // Availability & Deals Live Counts (Point #7)
  const inStockCount = useMemo(() => products.filter(p => p.stock > 0).length, [products]);
  const onSaleCount = useMemo(() => products.filter(p => p.mrp > p.sellingPrice).length, [products]);

  // Price Range Filter State (Point #3)
  const [priceRange, setPriceRange] = useState([0, 50000]);

  // Filtering products with Multi-Level Category, Subcategory, Brand, Price, Rating, In-Stock & Deals (Points #3, #4, #5, #6 & #7)
  const filteredProducts = products.filter(p => {
    if (selectedCategory === 'wishlist') {
      return wishlist.includes(p._id);
    }
    const matchesCategory =
      selectedCategory === 'all' ||
      p.category === selectedCategory ||
      (activeCategoryObj?.subcategories || []).some(s => s.slug === p.subCategory);

    const matchesSubCategory = !selectedSubCategory || p.subCategory === selectedSubCategory;

    const matchesBrand =
      selectedBrand === 'all' ||
      p.brand.toLowerCase() === selectedBrand.toLowerCase();

    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice = p.sellingPrice >= priceRange[0] && p.sellingPrice <= priceRange[1];
    const matchesRating = minRating === 0 || p.ratingsAverage >= minRating;
    const matchesInStock = !inStockOnly || p.stock > 0;
    const matchesOnSale = !onSaleOnly || p.mrp > p.sellingPrice;

    return (
      matchesCategory &&
      matchesSubCategory &&
      matchesBrand &&
      matchesSearch &&
      matchesPrice &&
      matchesRating &&
      matchesInStock &&
      matchesOnSale
    );
  });

  // Smart Product Sorting Options & Computation (Point #8)
  const SORT_OPTIONS = [
    { id: 'popularity', label: '🔥 Most Popular', desc: 'Highest sales & customer reviews' },
    { id: 'newest', label: '✨ New Arrivals', desc: 'Latest products in store' },
    { id: 'price_asc', label: '💰 Price: Low to High', desc: 'Budget-friendly deals first' },
    { id: 'price_desc', label: '💎 Price: High to Low', desc: 'Premium flagship items first' },
    { id: 'rating', label: '⭐ Highest Rating', desc: 'Top 4.8★ & 4.9★ rated items' },
    { id: 'discount', label: '🏷️ Biggest Discount %', desc: 'Maximum deal savings' },
  ];

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    if (sortBy === 'price_asc') {
      return list.sort((a, b) => a.sellingPrice - b.sellingPrice);
    }
    if (sortBy === 'price_desc') {
      return list.sort((a, b) => b.sellingPrice - a.sellingPrice);
    }
    if (sortBy === 'rating') {
      return list.sort((a, b) => (b.ratingsAverage || 0) - (a.ratingsAverage || 0));
    }
    if (sortBy === 'newest') {
      return list.sort((a, b) => b._id.localeCompare(a._id));
    }
    if (sortBy === 'discount') {
      return list.sort((a, b) => {
        const discA = ((a.mrp - a.sellingPrice) / a.mrp) || 0;
        const discB = ((b.mrp - b.sellingPrice) / b.mrp) || 0;
        return discB - discA;
      });
    }
    // Default 'popularity': sort by reviews count and rating
    return list.sort((a, b) => {
      const popA = (a.ratingsQuantity || 0) * (a.ratingsAverage || 4.5);
      const popB = (b.ratingsQuantity || 0) * (b.ratingsAverage || 4.5);
      return popB - popA;
    });
  }, [filteredProducts, sortBy]);

  // Inject JSON-LD ItemList Schema for Product Catalog
  useEffect(() => {
    if (uiConfig?.seo?.enableRichSnippets === false) {
      const existing = document.getElementById('jsonld-storefront-products');
      if (existing) existing.remove();
      return;
    }

    let productListSchema = document.getElementById('jsonld-storefront-products');
    if (!productListSchema) {
      productListSchema = document.createElement('script');
      productListSchema.id = 'jsonld-storefront-products';
      productListSchema.type = 'application/ld+json';
      document.head.appendChild(productListSchema);
    }

    const items = (products || []).slice(0, 10).map((prod, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Product',
        name: prod.title,
        image: prod.images?.[0] || prod.image,
        description: prod.description,
        sku: prod.sku || prod._id,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'INR',
          price: prod.sellingPrice || prod.price,
          availability: prod.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          seller: {
            '@type': 'Organization',
            name: prod.vendor?.storeName || 'AuraMarket Partner',
          },
        },
      },
    }));

    productListSchema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'AuraMarket Featured Catalog',
      itemListElement: items,
    });

    return () => {
      const el = document.getElementById('jsonld-storefront-products');
      if (el) el.remove();
    };
  }, [products, uiConfig?.seo?.enableRichSnippets]);

  // Inject JSON-LD Product Schema and Dynamic Meta Tags when a Product is Selected
  useEffect(() => {
    if (selectedProduct) {
      const prevTitle = document.title;
      const store = uiConfig?.storeName || 'AuraMarket';
      document.title = `${selectedProduct.title} | ${store}`;

      // Helper to update meta tag content
      const setMeta = (attr, key, val) => {
        if (!val) return;
        let el = document.querySelector(`meta[${attr}="${key}"]`);
        if (el) el.setAttribute('content', val);
      };

      const prevDesc = document.querySelector('meta[name="description"]')?.getAttribute('content');
      const prevOgTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
      const prevOgDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
      const prevOgImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
      const prevTwTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute('content');
      const prevTwDesc = document.querySelector('meta[name="twitter:description"]')?.getAttribute('content');
      const prevTwImage = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');

      const prodImg = selectedProduct.images?.[0] || selectedProduct.image || '';
      const prodDesc = selectedProduct.description || '';

      if (prodDesc) {
        setMeta('name', 'description', prodDesc);
        setMeta('property', 'og:description', prodDesc);
        setMeta('name', 'twitter:description', prodDesc);
      }
      setMeta('property', 'og:title', `${selectedProduct.title} | ${store}`);
      setMeta('name', 'twitter:title', `${selectedProduct.title} | ${store}`);
      if (prodImg) {
        setMeta('property', 'og:image', prodImg);
        setMeta('name', 'twitter:image', prodImg);
      }

      if (uiConfig?.seo?.enableRichSnippets !== false) {
        let singleSchema = document.getElementById('jsonld-selected-product');
        if (!singleSchema) {
          singleSchema = document.createElement('script');
          singleSchema.id = 'jsonld-selected-product';
          singleSchema.type = 'application/ld+json';
          document.head.appendChild(singleSchema);
        }
        singleSchema.textContent = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: selectedProduct.title,
          image: prodImg,
          description: prodDesc,
          sku: selectedProduct.sku || selectedProduct._id,
          brand: {
            '@type': 'Brand',
            name: selectedProduct.brand || 'AuraMarket Choice',
          },
          offers: {
            '@type': 'Offer',
            priceCurrency: 'INR',
            price: selectedProduct.sellingPrice || selectedProduct.price,
            availability: selectedProduct.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
        });
      }

      return () => {
        document.title = prevTitle;
        if (prevDesc) setMeta('name', 'description', prevDesc);
        if (prevOgTitle) setMeta('property', 'og:title', prevOgTitle);
        if (prevOgDesc) setMeta('property', 'og:description', prevOgDesc);
        if (prevOgImage) setMeta('property', 'og:image', prevOgImage);
        if (prevTwTitle) setMeta('name', 'twitter:title', prevTwTitle);
        if (prevTwDesc) setMeta('name', 'twitter:description', prevTwDesc);
        if (prevTwImage) setMeta('name', 'twitter:image', prevTwImage);
        const el = document.getElementById('jsonld-selected-product');
        if (el) el.remove();
      };
    }
  }, [selectedProduct, uiConfig?.storeName, uiConfig?.seo?.enableRichSnippets]);

  // Handle Checkout Order Placement
  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;

    const fallbackOrderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const fallbackSubOrdersList = Object.keys(vendorBreakdown).map(vId => {
      const vData = vendorBreakdown[vId];
      return {
        subOrderId: `SUB-${Math.floor(1000 + Math.random() * 9000)}`,
        vendorName: vData.vendorName,
        itemsCount: vData.items.length,
        subTotal: vData.subTotal,
        otp: '4821', // Secret 4-digit code shown to customer
        status: 'placed',
      };
    });

    try {
      const res = await api.post('/orders', {
        items: cartItems.map(item => ({
          productId: item.productId,
          variantSku: item.variantSku,
          quantity: item.quantity,
        })),
        shippingAddress: {
          recipientName: address.recipientName || 'Aman Sharma',
          phone: address.phone || '9876543214',
          street: address.street || 'Flat 402, Green Valley Apartments',
          city: address.city || 'New Delhi',
          state: address.state || 'Delhi',
          pincode: address.pincode || '110001',
        },
        paymentMethod,
        paymentDetails,
        couponCode: appliedCoupon?.code || undefined,
        deliveryInstructions: deliveryInstructions || undefined,
        coinsToRedeem: redeemedCoins > 0 ? redeemedCoins : undefined,
      });

      if (res.data?.success && res.data?.data) {
        const order = res.data.data;
        const placedOrderId = order.orderNumber || order._id;
        localStorage.setItem('last_placed_order_id', placedOrderId);
        setActiveOrderConfirmation({
          orderId: placedOrderId,
          subOrders: (order.subOrders || []).map(so => ({
            subOrderId: so._id ? `SUB-${so._id.toString().slice(-4)}` : 'SUB-001',
            vendorName: so.vendor?.storeName || 'Verified Partner Store',
            itemsCount: (so.items || []).length,
            subTotal: so.subTotal || 0,
            otp: order.deliveryOtp || '4821',
            status: 'placed',
          })),
          totalAmount: order.totalAmount,
          walletCoinsUsed: order.walletCoinsUsed || redeemedCoins,
          cashbackEarned: order.cashbackEarned || Math.max(10, Math.round(order.totalAmount * 0.05)),
          address,
          paymentMethod,
          paymentDetails: order.paymentDetails || paymentDetails,
          paymentStatus: order.paymentStatus || (paymentMethod === 'COD' ? 'PENDING' : 'PAID'),
          deliveryInstructions: order.deliveryInstructions || deliveryInstructions,
        });
        clearCart();
        setAppliedCoupon(null);
        setRedeemedCoins(0);
        setDeliveryInstructions('');
        setIsCartOpen(false);

        // Sync fresh wallet balance & coins after order
        api.get('/wallet').then(wRes => {
          if (wRes.data?.data) {
            setCustomerWallet({
              coins: wRes.data.data.walletCoins,
              balance: wRes.data.data.walletBalance,
            });
            window.dispatchEvent(new CustomEvent('auramarket_wallet_update', {
              detail: {
                coins: wRes.data.data.walletCoins,
                balance: wRes.data.data.walletBalance,
              }
            }));
          }
        }).catch(() => {});

        return;
      }
    } catch (_) {
      // Graceful fallback to rich local confirmation in offline or demo preview
    }

    const freeThresh = uiConfig?.shipping?.freeShippingThreshold ?? 999;
    const defaultShipFee = uiConfig?.shipping?.defaultShippingFee ?? 99;
    const isFree = cartTotal >= freeThresh;
    const activeShipFee = isFree ? 0 : defaultShipFee;
    const couponDiscount = appliedCoupon?.discountAmount || 0;
    const fallbackTotal = Math.max(0, cartTotal - couponDiscount + activeShipFee);

    localStorage.setItem('last_placed_order_id', fallbackOrderId);
    setActiveOrderConfirmation({
      orderId: fallbackOrderId,
      subOrders: fallbackSubOrdersList,
      totalAmount: fallbackTotal,
      address,
      paymentMethod,
      paymentDetails,
      paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PAID',
      deliveryInstructions,
    });

    clearCart();
    setAppliedCoupon(null);
    setDeliveryInstructions('');
    setIsCartOpen(false);
  };

  return (
    <div className="bg-slate-50 text-slate-800 min-h-screen pb-16">
      {/* Trust Badges Bar (Amazon-Style Quality Guarantees) */}
      <div className="bg-white border-b border-slate-200 py-2.5 px-4 lg:px-8 text-xs font-semibold text-slate-600">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto gap-4 scrollbar-none">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-500" />
            <span>Fast Express Delivery</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>100% Verified Sellers & Genuine Products</span>
          </div>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-blue-600" />
            <span>7-Day Easy Returns Guarantee</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-600" />
            <span>Cash on Delivery & Instant UPI Available</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8">
        {/* Point #23: Interactive 1-Click Copy Coupons & Scratch Card Strip */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 px-4 py-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm border border-amber-300">
          <div className="flex items-center gap-2.5 text-xs font-black">
            <span className="p-1.5 rounded-lg bg-slate-950 text-amber-400 shadow-xs">🎁</span>
            <span className="leading-tight">
              FESTIVE VOUCHERS: Save up to 25% OFF or Flat ₹500 on all orders with 1-Click Coupons & Scratch Card!
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setIsOffersHubOpen(true)}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-black text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span>View All Coupons</span>
            </button>
            <button
              type="button"
              onClick={() => setIsScratchCardOpen(true)}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50 text-slate-950 font-black text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 border border-amber-300"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Scratch Card</span>
            </button>
          </div>
        </div>

        {/* Top Promo Banner Strip (Point #38) */}
        {topPromoBanner && topPromoBanner.isActive && (
          <div className="relative rounded-2xl overflow-hidden shadow-sm border border-amber-300 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 p-3 sm:p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {topPromoBanner.badgeText && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-950 text-amber-400 tracking-wider shadow-xs">
                  {topPromoBanner.badgeText}
                </span>
              )}
              <div>
                <h4 className="text-xs sm:text-sm font-black">{topPromoBanner.title}</h4>
                {topPromoBanner.subtitle && (
                  <p className="text-[11px] text-slate-900 font-medium hidden sm:block">
                    {topPromoBanner.subtitle}
                  </p>
                )}
              </div>
            </div>
            <a
              href={topPromoBanner.actionLink || '/products'}
              onClick={(e) => {
                if (topPromoBanner.actionLink?.startsWith('/category/')) {
                  e.preventDefault();
                  const catSlug = topPromoBanner.actionLink.replace('/category/', '');
                  setSelectedCategory(catSlug);
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-black text-xs whitespace-nowrap shadow-md transition-all flex items-center gap-1.5 flex-shrink-0"
            >
              <span>{topPromoBanner.buttonText || 'Claim Deal'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </a>
          </div>
        )}

        {/* Dynamic Homepage Hero Slider Carousel (Point #38) */}
        <div
          onMouseEnter={() => setIsSlidePaused(true)}
          onMouseLeave={() => setIsSlidePaused(false)}
          className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg bg-slate-950 text-white min-h-[240px] sm:min-h-[300px] lg:min-h-[360px] flex items-center p-6 sm:p-10 lg:p-14 border border-slate-800 group"
        >
          {/* Background Image with Dark Gradient Overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src={heroBanners[currentSlideIndex]?.imageUrl}
              alt={heroBanners[currentSlideIndex]?.title}
              className="w-full h-full object-cover object-center transition-all duration-700 transform scale-105 group-hover:scale-100"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/30" />
          </div>

          {/* Slide Text Content */}
          <div className="relative z-10 max-w-xl space-y-3 sm:space-y-4">
            {heroBanners[currentSlideIndex]?.badgeText && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-[10px] sm:text-xs font-black uppercase tracking-wider shadow">
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>{heroBanners[currentSlideIndex]?.badgeText}</span>
              </div>
            )}

            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black text-white tracking-tight leading-tight line-clamp-2">
              {heroBanners[currentSlideIndex]?.title}
            </h1>

            {heroBanners[currentSlideIndex]?.subtitle && (
              <p className="text-xs sm:text-sm lg:text-base text-slate-300 leading-relaxed font-normal line-clamp-2 sm:line-clamp-none">
                {heroBanners[currentSlideIndex]?.subtitle}
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  const link = heroBanners[currentSlideIndex]?.actionLink || '/products';
                  if (link.startsWith('/category/')) {
                    const catSlug = link.replace('/category/', '');
                    setSelectedCategory(catSlug);
                  } else {
                    setSelectedCategory('all');
                  }
                }}
                className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <span>{heroBanners[currentSlideIndex]?.buttonText || 'Shop Now'}</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Next / Previous Carousel Navigation Arrows */}
          {heroBanners.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setCurrentSlideIndex((prev) => (prev === 0 ? heroBanners.length - 1 : prev - 1))
                }
                className="absolute left-3 sm:left-4 z-20 p-2 sm:p-2.5 rounded-full bg-slate-950/70 hover:bg-slate-900 text-white backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                title="Previous Slide"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                type="button"
                onClick={() =>
                  setCurrentSlideIndex((prev) => (prev + 1) % heroBanners.length)
                }
                className="absolute right-3 sm:right-4 z-20 p-2 sm:p-2.5 rounded-full bg-slate-950/70 hover:bg-slate-900 text-white backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                title="Next Slide"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Carousel Dot Indicators */}
              <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-slate-950/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                {heroBanners.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentSlideIndex
                        ? 'w-6 bg-amber-400'
                        : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                    title={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Flash Sale Frenzy & Deal of the Day with Live Countdown Timer (Point #11) */}
        <FlashSaleSection
          onSelectProduct={p => setSelectedProduct(p)}
          onAddToCart={deal => {
            const prod = products.find(p => p._id === deal._id) || deal;
            addToCart(prod, 1);
            setToastMessage(`⚡ "${deal.title}" claimed and added to cart!`);
            setTimeout(() => setToastMessage(null), 2500);
          }}
          currency="₹"
        />

        {/* Category Circular Cards / Filter Pills */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500" />
              Shop by Category
            </h2>
            <span className="text-xs text-slate-500 font-bold">Multi-Vendor Catalog</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {categories.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3.5 ${
                    isSelected
                      ? 'bg-amber-50 border-amber-400 text-slate-950 shadow-md ring-2 ring-amber-400/40'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <span className="text-2xl p-2 rounded-xl bg-slate-100">{cat.icon}</span>
                  <div>
                    <h3 className="font-extrabold text-sm">{cat.label}</h3>
                    <p className="text-[11px] text-slate-400 font-semibold">Verified Stores</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Brand Filter Bar with Brand Logos & Live Counts (Point #5) */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  Filter by Brand Partner
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Verified
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Click a brand to explore official certified manufacturers
                </p>
              </div>
            </div>

            {selectedBrand !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedBrand('all')}
                className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-xl transition-all border border-amber-200/60"
              >
                ✕ All Brands
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 custom-device-scrollbar">
            {/* All Brands Pill */}
            <button
              type="button"
              onClick={() => setSelectedBrand('all')}
              className={`px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${
                selectedBrand === 'all'
                  ? 'bg-slate-900 text-amber-400 border-slate-900 shadow-md ring-2 ring-amber-400/30'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300'
              }`}
            >
              <span>✨</span>
              <span>All Brands</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  selectedBrand === 'all'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {products.length}
              </span>
            </button>

            {/* Individual Brand Cards */}
            {brandsList.map(brand => {
              const isSelected = selectedBrand.toLowerCase() === brand.name.toLowerCase();
              return (
                <button
                  key={brand.name}
                  type="button"
                  onClick={() => setSelectedBrand(isSelected ? 'all' : brand.name)}
                  className={`px-3 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2.5 group ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md ring-2 ring-amber-400/40 font-black'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-amber-300 hover:shadow-xs'
                  }`}
                >
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="w-5 h-5 rounded-full object-cover border border-slate-200/80 shadow-inner group-hover:scale-105 transition-transform"
                  />
                  <span>{brand.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      isSelected
                        ? 'bg-slate-950 text-amber-400'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                    }`}
                  >
                    {brand.productCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Dual-Handle Price Range Slider & Budget Filter (Point #3) */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                <SlidersHorizontal className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Filter by Budget & Price Range
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Select price bracket or adjust slider to refine marketplace items
                </p>
              </div>
            </div>

            {/* Active Range Display & Reset Pill */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shadow-inner">
                ₹{priceRange[0].toLocaleString('en-IN')} — ₹{priceRange[1].toLocaleString('en-IN')}
              </span>
              {(priceRange[0] > 0 || priceRange[1] < 50000) && (
                <button
                  type="button"
                  onClick={() => setPriceRange([0, 50000])}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-xl transition-all border border-amber-200/60"
                >
                  ✕ Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* Quick Preset Budget Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-device-scrollbar">
            {[
              { label: 'All Budgets', min: 0, max: 50000 },
              { label: 'Under ₹2,000', min: 0, max: 2000 },
              { label: '₹2,000 - ₹5,000', min: 2000, max: 5000 },
              { label: '₹5,000 - ₹10,000', min: 5000, max: 10000 },
              { label: 'Above ₹10,000', min: 10000, max: 50000 },
            ].map(preset => {
              const isSelected = priceRange[0] === preset.min && priceRange[1] === preset.max;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setPriceRange([preset.min, preset.max])}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-slate-900 text-amber-400 border-slate-900 ring-2 ring-amber-400/30 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Dual Range Sliders & Exact Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-500">
                <span>Min Price: ₹{priceRange[0].toLocaleString('en-IN')}</span>
                <span>₹0</span>
              </div>
              <input
                type="range"
                min={0}
                max={50000}
                step={250}
                value={priceRange[0]}
                onChange={e => {
                  const val = Math.min(Number(e.target.value), priceRange[1] - 250);
                  setPriceRange([val, priceRange[1]]);
                }}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-500">
                <span>Max Price: ₹{priceRange[1].toLocaleString('en-IN')}</span>
                <span>₹50,000</span>
              </div>
              <input
                type="range"
                min={0}
                max={50000}
                step={250}
                value={priceRange[1]}
                onChange={e => {
                  const val = Math.max(Number(e.target.value), priceRange[0] + 250);
                  setPriceRange([priceRange[0], val]);
                }}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Main Catalog View: Multi-Level Category Sidebar + Products Grid (Point #4) */}
        <div className="flex flex-col lg:flex-row items-start gap-6 pt-1">
          {/* Multi-Level Category & Subcategory Sidebar */}
          <CategorySidebar
            categoriesTree={categoriesTree}
            selectedCategory={selectedCategory}
            selectedSubCategory={selectedSubCategory}
            onSelectCategory={slug => {
              setSelectedCategory(slug);
              setSelectedSubCategory(null);
            }}
            onSelectSubCategory={(parentSlug, subSlug) => {
              setSelectedCategory(parentSlug);
              setSelectedSubCategory(subSlug);
            }}
            onResetAll={() => {
              setSelectedCategory('all');
              setSelectedSubCategory(null);
              setSelectedBrand('all');
              setMinRating(0);
              setInStockOnly(false);
              setOnSaleOnly(false);
            }}
            totalProductsCount={products.length}
            isOpenMobile={isOpenCategoryDrawer}
            onCloseMobile={() => setIsOpenCategoryDrawer(false)}
            isCollapsedDesktop={isCollapsedCategorySidebar}
            onToggleCollapseDesktop={() => setIsCollapsedCategorySidebar(prev => !prev)}
            wishlistCount={wishlist.length}
            brandsList={brandsList}
            selectedBrand={selectedBrand}
            onSelectBrand={bName => setSelectedBrand(bName)}
            minRating={minRating}
            onSelectRating={r => setMinRating(r)}
            ratingsCounts={ratingsCounts}
            inStockOnly={inStockOnly}
            onToggleInStock={setInStockOnly}
            onSaleOnly={onSaleOnly}
            onToggleOnSale={setOnSaleOnly}
            inStockCount={inStockCount}
            onSaleCount={onSaleCount}
          />

          {/* Catalog Content Area */}
          <div className="flex-1 w-full space-y-4">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  {/* Mobile Category Drawer Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsOpenCategoryDrawer(true)}
                    className="lg:hidden px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-sm transition-all"
                  >
                    <FolderTree className="w-4 h-4" />
                    <span>Categories</span>
                  </button>

                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      Featured Marketplace Products
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Showing {filteredProducts.length} verified merchant listings
                    </p>
                  </div>
                </div>

                {/* Point #7 Quick Availability & Deals Toggle Pills + Point #8 Smart Sort */}
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setInStockOnly(prev => !prev)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
                      inStockOnly
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${inStockOnly ? 'bg-white' : 'bg-emerald-500 animate-pulse'}`} />
                    <span>In-Stock ({inStockCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOnSaleOnly(prev => !prev)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
                      onSaleOnly
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <Flame className={`w-3.5 h-3.5 ${onSaleOnly ? 'text-white fill-white' : 'text-rose-500 fill-rose-500'}`} />
                    <span>Deals ({onSaleCount})</span>
                  </button>

                  {/* Point #8 Smart Product Sorting Selector */}
                  <div className="flex items-center gap-1.5 bg-slate-100/80 hover:bg-slate-100 border border-slate-200 rounded-2xl px-2.5 py-1 transition-all">
                    <ArrowUpDown className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value)}
                      className="bg-transparent text-xs font-extrabold text-slate-900 border-none outline-none cursor-pointer pr-1 py-0.5 focus:ring-0"
                    >
                      {SORT_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id} className="font-semibold text-slate-800 bg-white">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Active Filter Breadcrumb (Point #4, #5, #6, #7 & #8) */}
              {(selectedCategory !== 'all' || selectedSubCategory || selectedBrand !== 'all' || minRating > 0 || inStockOnly || onSaleOnly || sortBy !== 'popularity') && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-xs shadow-xs animate-in fade-in duration-200">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-bold text-slate-800">
                    <FolderTree className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-slate-500 text-[11px] uppercase tracking-wider">Filtered:</span>
                    {selectedCategory !== 'all' && (
                      <span className="font-extrabold text-amber-950 bg-amber-200/70 px-2 py-0.5 rounded-md text-xs">
                        {activeCategoryLabel}
                      </span>
                    )}
                    {activeSubCategoryLabel && (
                      <>
                        <ChevronRight className="w-3.5 h-3.5 text-amber-600" />
                        <span className="font-extrabold text-slate-950 bg-white px-2 py-0.5 rounded-md shadow-xs border border-amber-300 text-xs">
                          {activeSubCategoryLabel}
                        </span>
                      </>
                    )}
                    {selectedBrand !== 'all' && (
                      <span className="font-extrabold text-slate-950 bg-white px-2 py-0.5 rounded-md shadow-xs border border-amber-300 text-xs flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                        <span>Brand: {selectedBrand}</span>
                      </span>
                    )}
                    {minRating > 0 && (
                      <span className="font-extrabold text-slate-950 bg-white px-2 py-0.5 rounded-md shadow-xs border border-amber-300 text-xs flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>Rating: {minRating}★ & above</span>
                        <button
                          type="button"
                          onClick={() => setMinRating(0)}
                          className="hover:text-red-500 ml-1 text-slate-400 font-bold"
                          title="Remove rating filter"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    {inStockOnly && (
                      <span className="font-extrabold text-slate-950 bg-white px-2 py-0.5 rounded-md shadow-xs border border-emerald-300 text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>In-Stock Only</span>
                        <button
                          type="button"
                          onClick={() => setInStockOnly(false)}
                          className="hover:text-red-500 ml-1 text-slate-400 font-bold"
                          title="Remove in-stock filter"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    {onSaleOnly && (
                      <span className="font-extrabold text-slate-950 bg-white px-2 py-0.5 rounded-md shadow-xs border border-rose-300 text-xs flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                        <span>On Sale / Deals</span>
                        <button
                          type="button"
                          onClick={() => setOnSaleOnly(false)}
                          className="hover:text-red-500 ml-1 text-slate-400 font-bold"
                          title="Remove on-sale filter"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    {sortBy !== 'popularity' && (
                      <span className="font-extrabold text-slate-950 bg-white px-2 py-0.5 rounded-md shadow-xs border border-amber-400 text-xs flex items-center gap-1.5">
                        <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" />
                        <span>Sort: {SORT_OPTIONS.find(o => o.id === sortBy)?.label}</span>
                        <button
                          type="button"
                          onClick={() => setSortBy('popularity')}
                          className="hover:text-red-500 ml-1 text-slate-400 font-bold"
                          title="Reset to default popularity sort"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    <span className="text-slate-500 font-semibold text-[11px]">
                      ({sortedProducts.length} {sortedProducts.length === 1 ? 'item' : 'items'} found)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSelectedSubCategory(null);
                      setSelectedBrand('all');
                      setMinRating(0);
                      setInStockOnly(false);
                      setOnSaleOnly(false);
                      setSortBy('popularity');
                    }}
                    className="font-black text-[11px] text-amber-800 hover:text-amber-950 bg-amber-200/70 hover:bg-amber-300/80 px-2.5 py-1 rounded-xl transition-all flex items-center gap-1"
                  >
                    ✕ Clear All
                  </button>
                </div>
              )}
            </div>

            {sortedProducts.length === 0 ? (
              <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-2xl shadow-inner">
                  🔍
                </div>
                <h3 className="font-extrabold text-base text-slate-900">
                  No products found matching filters
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No items match the selected category or price bracket. Try resetting filters.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSelectedSubCategory(null);
                      setSelectedBrand('all');
                      setPriceRange([0, 50000]);
                      setMinRating(0);
                      setInStockOnly(false);
                      setOnSaleOnly(false);
                      setSortBy('popularity');
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all"
                  >
                    Reset All Filters
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-6">
            {sortedProducts.map(product => {
              const discount = Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100);
              const isWishlisted = wishlist.includes(product._id);
              const isCompared = compareList.includes(product._id);
              return (
                <div
                  key={product._id}
                  className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative"
                >
                  {/* Product Image & Badges */}
                  <div
                    onClick={() => {
                      setSelectedProduct(product);
                      if (product.hasVariants) setSelectedVariant(product.variants[0]);
                    }}
                    className="relative overflow-hidden aspect-square bg-slate-100 cursor-pointer"
                  >
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Discount Badge & Stock Urgency Badge */}
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1 items-start z-10 pointer-events-none">
                      <div className="bg-rose-600 text-white text-[9px] sm:text-[10px] font-black uppercase px-1.5 py-0.5 sm:px-2 rounded-md sm:rounded-lg shadow">
                        {discount}% OFF
                      </div>
                      {product.stock <= 5 && (
                        <StockUrgencyBadge stock={product.stock} variant="badge" />
                      )}
                    </div>

                    {/* Quick Actions: Quick View Eye, Share & Wishlist Heart */}
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex items-center gap-1 sm:gap-1.5 z-10">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedProduct(product);
                          if (product.hasVariants) setSelectedVariant(product.variants[0]);
                        }}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-amber-600 flex items-center justify-center shadow-md backdrop-blur transition-all active:scale-90"
                        title="Quick View Details"
                      >
                        <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={e => handleShareProduct(product, e)}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-slate-950 flex items-center justify-center shadow-md backdrop-blur transition-all active:scale-90"
                        title="Share product"
                      >
                        <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={e => toggleCompare(product, e)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-md backdrop-blur transition-all active:scale-90 ${
                          isCompared
                            ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-400/50 shadow-amber-200'
                            : 'bg-white/90 hover:bg-white text-slate-700 hover:text-amber-600'
                        }`}
                        title={isCompared ? 'Remove from comparison' : 'Compare with other products'}
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={e => toggleWishlist(product, e)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-md backdrop-blur transition-all active:scale-90 ${
                          isWishlisted ? 'text-rose-600' : 'text-slate-400 hover:text-rose-500'
                        }`}
                        title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isWishlisted ? 'fill-rose-600' : ''}`} />
                      </button>
                    </div>

                    {/* Bottom Image Overlay: Multi-Angle Dots & Rating Pill */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                      <div className="flex items-center gap-1 bg-black/40 backdrop-blur px-1.5 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        <span className="w-1 h-1 rounded-full bg-white/70"></span>
                        <span className="w-1 h-1 rounded-full bg-white/70"></span>
                      </div>
                      <div className="bg-white/95 backdrop-blur px-1.5 py-0.5 sm:px-2 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-black text-amber-600 flex items-center gap-1 shadow-sm">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{product.ratingsAverage}</span>
                        <span className="text-slate-400 text-[9px] hidden sm:inline">({product.ratingsQuantity})</span>
                      </div>
                    </div>
                  </div>

                  {/* Product Content */}
                  <div className="p-2.5 sm:p-4 space-y-2 sm:space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 uppercase font-black tracking-wider">
                        <span className="truncate max-w-[90px]">{product.brand}</span>
                        {product.vendor && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVendorForModal(product.vendor);
                            }}
                            className="text-amber-600 hover:text-amber-700 font-bold truncate max-w-[120px] hover:underline flex items-center gap-1 transition-colors"
                            title={`View ${product.vendor.storeName} storefront`}
                          >
                            <span>🏪 {product.vendor.storeName}</span>
                          </button>
                        )}
                      </div>

                      <h3
                        onClick={() => {
                          setSelectedProduct(product);
                          if (product.hasVariants) setSelectedVariant(product.variants[0]);
                        }}
                        className="font-extrabold text-slate-900 text-xs sm:text-sm line-clamp-2 mt-1 leading-snug cursor-pointer hover:text-blue-700 transition-colors"
                      >
                        {product.title}
                      </h3>
                    </div>

                    {/* Price & Action */}
                    <div className="pt-2 border-t border-slate-100 space-y-2 sm:space-y-3">
                      <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
                        <span className="text-base sm:text-xl font-black text-slate-950">
                          ₹{product.sellingPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] sm:text-xs text-slate-400 line-through font-semibold">
                          ₹{product.mrp.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] sm:text-xs font-black text-emerald-600 ml-auto hidden xs:inline">
                          Save ₹{(product.mrp - product.sellingPrice).toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Real-time Stock Urgency Badge & Recent Purchase Counter (Points #12 & #13) */}
                      <div className="pt-0.5 flex items-center justify-between gap-1 flex-wrap">
                        <StockUrgencyBadge stock={product.stock} variant="compact" />
                        <RecentPurchaseCounter
                          purchases={product.recentPurchases24h}
                          viewers={product.recentViewsPerHour}
                          variant="pill"
                        />
                      </div>

                      {product.stock <= 0 ? (
                        <button
                          disabled
                          className="w-full py-2 sm:py-2.5 rounded-xl bg-slate-200 text-slate-500 text-[11px] sm:text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          <span>Out of Stock</span>
                        </button>
                      ) : product.hasVariants ? (
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setSelectedVariant(product.variants[0]);
                          }}
                          className="w-full py-2 sm:py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] sm:text-xs font-bold transition-all shadow"
                        >
                          Select Options
                        </button>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          className="w-full py-2 sm:py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] sm:text-xs font-black shadow flex items-center justify-center gap-1.5 transition-all transform active:scale-95"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>Add to Cart</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
      </div>

      {/* Rich Product Detail Page (PDP) & Quick-View Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(prod, variant, qty = 1) => {
          for (let i = 0; i < qty; i++) {
            addToCart(prod, variant);
          }
          setToastMessage(`Added ${qty}x ${prod.title} to cart! 🛍️`);
          setTimeout(() => setToastMessage(null), 2500);
        }}
        onBuyNow={(prod, variant, qty = 1) => {
          for (let i = 0; i < qty; i++) {
            addToCart(prod, variant);
          }
          setSelectedProduct(null);
          setIsCartOpen(true);
        }}
        isWishlisted={selectedProduct ? wishlist.includes(selectedProduct._id) : false}
        onToggleWishlist={toggleWishlist}
        onSelectProduct={(prod) => {
          const fullProduct = products.find(p => p._id === prod._id || p.slug === prod.slug) || prod;
          setSelectedProduct(fullProduct);
          if (fullProduct.hasVariants && fullProduct.variants?.length > 0) {
            setSelectedVariant(fullProduct.variants[0]);
          }
        }}
        onOpenVendorStore={(vendor) => {
          setSelectedProduct(null);
          setSelectedVendorForModal(vendor);
        }}
      />

      {/* Point #17: Dedicated Wishlist Slide-Over Drawer */}
      <WishlistDrawer
        isOpen={isWishlistDrawerOpen}
        onClose={() => setIsWishlistDrawerOpen(false)}
        wishlist={wishlist}
        products={products}
        onMoveToCart={handleMoveToCartFromWishlist}
        onRemoveItem={handleRemoveFromWishlist}
        onClearWishlist={handleClearWishlist}
        onOpenProduct={prod => {
          setSelectedProduct(prod);
          if (prod.hasVariants && prod.variants?.length > 0) {
            setSelectedVariant(prod.variants[0]);
          }
        }}
      />

      {/* Point #18: Floating Product Comparison Dock */}
      <ProductCompareDock
        compareIds={compareList}
        allProducts={products}
        onRemoveItem={id => setCompareList(prev => prev.filter(item => item !== id))}
        onClearAll={() => setCompareList([])}
        onOpenModal={() => setIsCompareModalOpen(true)}
      />

      {/* Point #18: Side-by-Side Product Comparison Modal */}
      <ProductCompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        productIds={compareList}
        allProducts={products}
        onRemoveProduct={id => setCompareList(prev => prev.filter(item => item !== id))}
        onClearAll={() => setCompareList([])}
        onAddToCart={prod => {
          addToCart(prod, 1);
          setToastMessage(`Added "${prod.title}" to cart! 🛍️`);
          setTimeout(() => setToastMessage(null), 2200);
        }}
        onOpenProductPDP={prod => {
          setSelectedProduct(prod);
          if (prod.hasVariants && prod.variants?.length > 0) {
            setSelectedVariant(prod.variants[0]);
          }
        }}
      />

      {/* Cart & Multi-Vendor Split Checkout SlideOver Drawer */}
      <SlideOverDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        title="Your Shopping Cart"
        width="max-w-lg"
      >
        <div className="space-y-6 text-slate-800">
          {cartItems.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-500">Your cart is empty</p>
            </div>
          ) : (
            <>
              {/* Point #19: Free Shipping Dynamic Progress Meter */}
              <FreeShippingMeter
                cartTotal={cartTotal}
                threshold={uiConfig?.shipping?.freeShippingThreshold ?? 999}
                defaultFee={uiConfig?.shipping?.defaultShippingFee ?? 99}
              />

              {/* Multi-Vendor Order Splitting Notification */}
              {Object.keys(vendorBreakdown).length > 1 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold space-y-1">
                  <p className="font-black flex items-center gap-1.5 text-slate-950">
                    <Truck className="w-4 h-4 text-amber-600" /> Multi-Vendor Order Splitting Notice
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Your cart contains items from {Object.keys(vendorBreakdown).length} distinct partner stores. Each store will dispatch their package directly for faster delivery.
                  </p>
                </div>
              )}

              {/* Items grouped by Vendor */}
              <div className="space-y-4">
                {Object.keys(vendorBreakdown).map(vId => {
                  const group = vendorBreakdown[vId];
                  return (
                    <div key={vId} className="space-y-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                        <span className="font-extrabold text-slate-900">Package from: {group.vendorName}</span>
                        <span className="font-black text-amber-600">Subtotal: ₹{group.subTotal.toLocaleString('en-IN')}</span>
                      </div>

                      {group.items.map(item => (
                        <div key={item.variantSku} className="flex items-center justify-between gap-3 text-xs">
                          <img src={item.image} alt={item.title} className="w-12 h-12 rounded-lg object-cover border border-slate-100" />
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-900 line-clamp-1">{item.title}</h4>
                            <p className="text-slate-500 text-[10px]">{item.variantName}</p>
                            <span className="text-slate-950 font-black">₹{item.price.toLocaleString('en-IN')}</span>
                          </div>

                          <div className="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 font-bold">
                            <button
                              onClick={() => updateQuantity(item.productId, item.variantSku, item.quantity - 1)}
                              className="px-1 text-slate-700 hover:text-black"
                            >
                              -
                            </button>
                            <span className="text-slate-900">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.productId, item.variantSku, item.quantity + 1)}
                              className="px-1 text-slate-700 hover:text-black"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.productId, item.variantSku)}
                            className="p-1.5 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Delivery Address & Payment */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Shipping Destination
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAddressBookOpen(true)}
                    className="text-[11px] font-black text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1 transition-colors"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>Change / Address Book</span>
                  </button>
                </div>

                {/* Selected Address Display Card */}
                <div className="p-3.5 rounded-2xl border border-amber-300 bg-amber-50/50 relative space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        address.type === 'WORK'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : address.type === 'OTHER'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {address.type || 'HOME'}
                      </span>
                      <span className="text-xs font-black text-slate-900">{address.recipientName}</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-600">{address.phone}</span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-normal">
                    {address.street}
                  </p>
                  {address.landmark && (
                    <p className="text-[11px] text-amber-700 font-medium">
                      Landmark: {address.landmark}
                    </p>
                  )}
                  <p className="text-xs font-bold text-slate-800">
                    {address.city}, {address.state || 'Delhi'} - <span className="font-mono font-black text-slate-950">{address.pincode}</span>
                  </p>

                  <button
                    type="button"
                    onClick={() => setIsAddressBookOpen(true)}
                    className="mt-1.5 w-full py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-98"
                  >
                    <MapPin className="w-3 h-3 text-amber-500" />
                    <span>Select From Saved Addresses or Add New</span>
                  </button>
                </div>

                {/* Point #25: Order Delivery Instructions / Rider Notes Box */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                      <span>Rider Notes & Doorstep Instructions</span>
                    </h4>
                    {deliveryInstructions && (
                      <button
                        type="button"
                        onClick={() => setDeliveryInstructions('')}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* 1-Click Quick Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Leave with security / guard',
                      'Ring bell & leave at door',
                      'Do not ring bell (Baby sleeping)',
                      'Call before arriving',
                      'Leave with neighbor',
                    ].map((chip) => {
                      const isSelected = deliveryInstructions.includes(chip);
                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setDeliveryInstructions((prev) =>
                                prev
                                  .replace(chip, '')
                                  .replace(/^,\s*|,\s*$/g, '')
                                  .replace(/,\s*,/g, ',')
                                  .trim()
                              );
                            } else {
                              setDeliveryInstructions((prev) =>
                                prev ? `${prev}, ${chip}` : chip
                              );
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                            isSelected
                              ? 'bg-amber-400 border-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-400/40'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {chip}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Note Textarea */}
                  <textarea
                    rows={2}
                    placeholder="e.g. Flat on 4th floor, elevator code #402, please do not ring doorbell..."
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none font-medium"
                  />
                </div>

                {/* Point #26: Multi-Gateway Dynamic Checkout UI (COD, Razorpay, Stripe, Direct UPI QR) */}
                <DynamicCheckoutPayment
                  activeGateway={paymentMethod}
                  onChangeGateway={setPaymentMethod}
                  validGateways={validGateways}
                  paymentSettings={paymentSettings}
                  amountPayable={grandTotalPayable}
                  user={user}
                  onPaymentDetailsChange={setPaymentDetails}
                  paymentDetails={paymentDetails}
                />

                {/* Point #22: Real Promo Code / Coupon Engine at Checkout */}
                <div className="pt-3">
                  <PromoCouponBox
                    cartTotal={cartTotal}
                    appliedCoupon={appliedCoupon}
                    onApplyCoupon={(couponData) => {
                      setAppliedCoupon(couponData);
                      setToastMessage(`Coupon "${couponData.code}" applied! Saved ₹${couponData.discountAmount} 🎉`);
                      setTimeout(() => setToastMessage(null), 2500);
                    }}
                    onRemoveCoupon={() => {
                      setAppliedCoupon(null);
                      setToastMessage('Coupon removed');
                      setTimeout(() => setToastMessage(null), 2000);
                    }}
                  />
                </div>

                {/* Point #31: In-App Wallet Reward Coins Redemption */}
                {customerWallet.coins > 0 && cartTotal > 0 && (
                  <div className="pt-3">
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-300 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shadow-xs">
                            <Coins className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-amber-950 block leading-tight">
                              Redeem Reward Coins
                            </span>
                            <span className="text-[10px] text-amber-700 font-semibold">
                              1 Coin = ₹1 instant discount
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 border border-amber-300">
                          {customerWallet.coins} Available
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-bold">Applied Discount:</span>
                          <span className="font-black text-amber-800 font-mono">
                            -₹{redeemedCoins} ({redeemedCoins} Coins)
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={Math.min(customerWallet.coins, Math.max(0, cartTotal - (appliedCoupon?.discountAmount || 0)))}
                          step={10}
                          value={redeemedCoins}
                          onChange={(e) => setRedeemedCoins(Number(e.target.value))}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500">₹0 OFF</span>
                          <button
                            type="button"
                            onClick={() =>
                              setRedeemedCoins(
                                Math.min(
                                  customerWallet.coins,
                                  Math.max(0, cartTotal - (appliedCoupon?.discountAmount || 0))
                                )
                              )
                            }
                            className="font-black text-amber-800 hover:text-amber-950 underline cursor-pointer"
                          >
                            Apply Max (₹{Math.min(customerWallet.coins, Math.max(0, cartTotal - (appliedCoupon?.discountAmount || 0)))})
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Point #19 & Point #22 & Point #31: Dynamic Bill Breakdown & Grand Total */}
                {(() => {
                  const freeThresh = uiConfig?.shipping?.freeShippingThreshold ?? 999;
                  const defaultShipFee = uiConfig?.shipping?.defaultShippingFee ?? 99;
                  const isFree = cartTotal >= freeThresh;
                  const activeShipFee = isFree ? 0 : defaultShipFee;
                  const couponDiscount = appliedCoupon?.discountAmount || 0;
                  const coinDiscount = Number(redeemedCoins || 0);
                  const grandTotalPayable = Math.max(0, cartTotal - couponDiscount + activeShipFee - coinDiscount);

                  return (
                    <div className="pt-4 border-t border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
                        <span>Items Subtotal:</span>
                        <span className="font-black text-slate-900">₹{cartTotal.toLocaleString('en-IN')}</span>
                      </div>

                      {appliedCoupon && (
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                          <span className="flex items-center gap-1.5">
                            <span className="font-black tracking-wider uppercase text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded">
                              {appliedCoupon.code}
                            </span>
                            <span>Promo Discount:</span>
                          </span>
                          <span className="font-black">-₹{couponDiscount.toLocaleString('en-IN')}</span>
                        </div>
                      )}

                      {redeemedCoins > 0 && (
                        <div className="flex items-center justify-between text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200">
                          <span className="flex items-center gap-1.5">
                            <Coins className="w-3.5 h-3.5 text-amber-600" />
                            <span>Reward Coins Discount:</span>
                          </span>
                          <span className="font-black">-₹{redeemedCoins.toLocaleString('en-IN')}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-600">Doorstep Express Delivery:</span>
                        {isFree ? (
                          <span className="text-emerald-700 font-black flex items-center gap-1.5">
                            <span className="line-through text-slate-400 font-normal">₹{defaultShipFee}</span>
                            <span>FREE 🎉</span>
                          </span>
                        ) : (
                          <span className="text-slate-900 font-black">₹{defaultShipFee}</span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm">
                        <div>
                          <span className="font-black text-slate-900 block leading-tight">Grand Total Payable:</span>
                          {(couponDiscount > 0 || redeemedCoins > 0) && (
                            <span className="text-[10px] text-emerald-600 font-bold">
                              You save ₹{(couponDiscount + redeemedCoins).toLocaleString('en-IN')} on this order!
                            </span>
                          )}
                        </div>
                        <span className="text-2xl font-black text-slate-950">₹{grandTotalPayable.toLocaleString('en-IN')}</span>
                      </div>

                      <button
                        onClick={handlePlaceOrder}
                        className="w-full py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-xl transition-all"
                      >
                        Confirm & Place Split Order
                      </button>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      </SlideOverDrawer>

      {/* Order Confirmation & Customer Delivery OTP Modal */}
      {activeOrderConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 lg:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-6 text-slate-800">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Order Confirmed!</h2>
              <p className="text-xs text-slate-500 font-semibold">
                Master Order ID: <strong className="text-slate-900">{activeOrderConfirmation.orderId}</strong>
              </p>
            </div>

            {/* Secret Delivery OTP Display Box */}
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-center space-y-2 shadow-sm">
              <span className="text-xs font-black uppercase tracking-wider text-amber-700 flex items-center justify-center gap-1.5">
                <KeyRound className="w-4 h-4" /> Secure Delivery Handover OTP
              </span>
              <div className="text-4xl font-black tracking-widest text-slate-900">
                4821
              </div>
              <p className="text-[11px] text-slate-600 max-w-xs mx-auto font-medium">
                Share this 4-digit secret code with the courier rider (<strong className="text-slate-900">Vikram Singh</strong>) only when you receive your physical parcel.
              </p>
            </div>

            {/* Sub-Orders List for Vendors */}
            <div className="space-y-2 text-xs">
              <span className="font-black text-slate-500 uppercase text-[10px]">
                Shipments Split By Store ({activeOrderConfirmation.subOrders.length} Packages)
              </span>
              {activeOrderConfirmation.subOrders.map(sub => (
                <div
                  key={sub.subOrderId}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <div>
                    <span className="font-extrabold text-slate-900 block">{sub.vendorName}</span>
                    <span className="text-[10px] text-slate-500">Tracking Code: {sub.subOrderId}</span>
                  </div>
                  <span className="font-black text-slate-950">₹{sub.subTotal.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            {/* Point #25: Order Delivery Instructions / Rider Notes in Confirmation */}
            {activeOrderConfirmation.deliveryInstructions && (
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-300 text-left space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  Rider Doorstep Instructions:
                </span>
                <p className="text-xs font-semibold text-slate-800">
                  {activeOrderConfirmation.deliveryInstructions}
                </p>
              </div>
            )}

            {/* Point #26: Payment Method & Transaction Reference in Confirmation */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">Payment Mode</span>
                <span className="font-black text-slate-900">{activeOrderConfirmation.paymentMethod}</span>
                {activeOrderConfirmation.paymentDetails?.transactionId && (
                  <span className="text-[10px] font-mono text-slate-500 block truncate max-w-[200px]">
                    Ref: {activeOrderConfirmation.paymentDetails.transactionId}
                  </span>
                )}
                {activeOrderConfirmation.paymentDetails?.upiUtr && (
                  <span className="text-[10px] font-mono text-purple-700 font-bold block">
                    UTR: {activeOrderConfirmation.paymentDetails.upiUtr}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  activeOrderConfirmation.paymentStatus === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {activeOrderConfirmation.paymentStatus === 'PAID' ? '✓ PAID PREPAID' : '💵 COD PAY AT DOOR'}
                </span>
                <span className="block text-slate-900 font-black text-sm mt-0.5">
                  ₹{activeOrderConfirmation.totalAmount?.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Point #31: Cashback Reward Notification */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-300 flex items-center justify-between text-xs text-amber-950">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block leading-tight">5% Cashback Coins Awarded!</span>
                  <span className="text-[11px] text-amber-800 font-medium">Added directly to your rewards wallet</span>
                </div>
              </div>
              <span className="text-xs font-black text-amber-900 bg-amber-200/80 px-2 py-1 rounded-lg font-mono">
                +{activeOrderConfirmation.cashbackEarned || Math.max(10, Math.round((activeOrderConfirmation.totalAmount || 0) * 0.05))} 🪙
              </span>
            </div>

            {/* Point #72: Gamified Post-Purchase Scratch Card Reward System */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 border-2 border-amber-400/50 flex items-center justify-between text-xs text-amber-950 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black shadow-sm shrink-0">
                  <Gift className="w-5 h-5 fill-current" />
                </div>
                <div className="text-left">
                  <span className="font-black block leading-tight text-slate-900 text-[13px]">
                    🎁 Post-Purchase Scratch Card!
                  </span>
                  <span className="text-[11px] text-amber-900 font-semibold block">
                    Scratch & win instant coins or wallet cash
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setScratchCardOrderId(activeOrderConfirmation.orderId);
                  setIsScratchCardOpen(true);
                }}
                className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 active:scale-95 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-1.5 shrink-0"
              >
                <span>Scratch Now</span>
                <Sparkles className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>

            {/* Point #30: 1-Click Tax Invoice Download Button */}
            <button
              onClick={() => {
                setInvoiceOrderId(activeOrderConfirmation.orderId);
                setIsInvoiceModalOpen(true);
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
              title="Download GST Compliant Tax Invoice"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              Download GST Tax Invoice (PDF)
            </button>

            {/* Point #71: 1-Click WhatsApp Order Confirmation & AI Tracking Bot */}
            <button
              onClick={() => {
                setWhatsAppBotOrder({
                  _id: activeOrderConfirmation.orderId,
                  orderNumber: activeOrderConfirmation.orderId,
                  totalAmount: activeOrderConfirmation.totalAmount,
                  deliveryOtp: activeOrderConfirmation.subOrders?.[0]?.otp || '4821',
                  shippingAddress: activeOrderConfirmation.address,
                  customer: activeOrderConfirmation.address,
                });
                setIsWhatsAppBotOpen(true);
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-[#00a884] font-black text-xs border border-emerald-500/30 flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
              title="1-Click WhatsApp Order Confirmation & Interactive Bot Assistant"
            >
              <MessageSquare className="w-4 h-4 fill-current" />
              <span>1-Click WhatsApp Confirmation & Bot</span>
            </button>

            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  setTrackedOrderId(activeOrderConfirmation.orderId);
                  setIsOrderTrackerOpen(true);
                  setActiveOrderConfirmation(null);
                }}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Truck className="w-4 h-4" />
                Track Order Live
              </button>
              <button
                onClick={() => setActiveOrderConfirmation(null)}
                className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition active:scale-95"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button: Quick WhatsApp Support */}
      <a
        href={uiConfig?.demoWhatsAppUrl || 'https://wa.me/918533955333?text=Hi%20Ankit,%20I%20have%20an%20inquiry%20about%20AuraMarket'}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-16 right-3 sm:bottom-6 sm:right-6 z-40 w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-2xl border-2 border-white transition-all transform hover:scale-110 active:scale-95 group"
        title="Direct WhatsApp Support"
      >
        <MessageCircle className="w-6 h-6 fill-white" />
        <span className="hidden group-hover:block absolute right-14 whitespace-nowrap bg-slate-900 text-white text-xs font-bold py-1 px-2.5 rounded-lg shadow-lg">
          Chat on WhatsApp
        </span>
      </a>

      {/* Mobile Floating Cart Summary Pill (Like eShop / Swiggy / Blinkit) */}
      {cartItems.length > 0 && (
        <div className="md:hidden fixed bottom-14 left-3 right-16 z-40 animate-slide-up">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-slate-950 text-white px-3.5 py-2.5 rounded-2xl shadow-2xl flex items-center justify-between border border-amber-400/40 active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs">
                {cartItems.length}
              </div>
              <div className="text-left leading-tight">
                <p className="text-xs font-black text-white">₹{cartTotal.toLocaleString('en-IN')}</p>
                <p className="text-[9px] text-slate-400">View items in cart</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-amber-400 font-black text-xs">
              <span>Cart</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* Interactive Toast Notification (For Wishlist & Share actions) */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-2xl border border-slate-700 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
      {/* Live Social Proof Toast Popups (Point #14) */}
      <SocialProofToast
        onSelectProduct={prod => {
          const fullProduct = products.find(p => p._id === prod._id || p.slug === prod.slug) || prod;
          setSelectedProduct(fullProduct);
          if (fullProduct.hasVariants && fullProduct.variants?.length > 0) {
            setSelectedVariant(fullProduct.variants[0]);
          }
        }}
        currency="₹"
      />

      {/* Point #23: Interactive 1-Click Copy Coupons & Gamified Scratch Card */}
      <StorefrontOffersHub
        isOpen={isOffersHubOpen}
        onClose={() => setIsOffersHubOpen(false)}
        onOpenScratchCard={() => {
          setIsOffersHubOpen(false);
          setIsScratchCardOpen(true);
        }}
        onApplyCouponToCart={(code) => {
          setIsOffersHubOpen(false);
          setIsCartOpen(true);
          api.post('/coupons/validate', { code, cartTotal }).then(res => {
            if (res.data?.success && res.data.coupon) {
              setAppliedCoupon(res.data.coupon);
              setToastMessage(`Coupon "${code}" applied to cart! 🎉`);
              setTimeout(() => setToastMessage(null), 2500);
            }
          }).catch(err => {
            const msg = err.response?.data?.message || 'Could not apply coupon';
            setToastMessage(msg);
            setTimeout(() => setToastMessage(null), 3000);
          });
        }}
      />

      <ScratchCardModal
        isOpen={isScratchCardOpen}
        orderId={scratchCardOrderId}
        onClose={() => {
          setIsScratchCardOpen(false);
          setScratchCardOrderId(null);
        }}
        onApplyCouponCode={(code) => {
          setIsScratchCardOpen(false);
          setScratchCardOrderId(null);
          setIsCartOpen(true);
          api.post('/coupons/validate', { code, cartTotal }).then(res => {
            if (res.data?.success && res.data.coupon) {
              setAppliedCoupon(res.data.coupon);
              setToastMessage(`Revealed reward "${code}" applied to cart! 🎉`);
              setTimeout(() => setToastMessage(null), 2500);
            }
          }).catch(err => {
            const msg = err.response?.data?.message || 'Could not apply coupon';
            setToastMessage(msg);
            setTimeout(() => setToastMessage(null), 3000);
          });
        }}
      />

      {/* Point #24: Multi-Address Book (Home, Work, Other) Modal */}
      <AddressBookModal
        isOpen={isAddressBookOpen}
        onClose={() => setIsAddressBookOpen(false)}
        selectedAddressId={selectedAddressId}
        onSelectAddress={(selected) => {
          setSelectedAddressId(selected._id);
          setAddress({
            recipientName: selected.recipientName,
            phone: selected.phone,
            alternatePhone: selected.alternatePhone || '',
            street: selected.street,
            landmark: selected.landmark || '',
            city: selected.city,
            state: selected.state || 'Delhi',
            pincode: selected.pincode,
            type: selected.type || 'HOME',
          });
          setToastMessage(`Delivering to ${selected.recipientName} (${selected.type || 'HOME'}) 📍`);
          setTimeout(() => setToastMessage(null), 2200);
        }}
      />

      {/* Point #27: Live Visual Step-by-Step Order Tracker Modal */}
      <LiveOrderTrackerModal
        isOpen={isOrderTrackerOpen}
        onClose={() => setIsOrderTrackerOpen(false)}
        initialOrderId={trackedOrderId}
        apiUrl="/api"
      />

      {/* Point #30: 1-Click Tax Invoice Download Modal */}
      <TaxInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        orderId={invoiceOrderId}
        apiUrl="/api"
      />

      {/* Point #31: Customer In-App Wallet & Reward Coins Drawer */}
      <WalletDrawer
        isOpen={isWalletOpen}
        onClose={() => {
          setIsWalletOpen(false);
          api.get('/wallet').then((res) => {
            if (res.data?.data) {
              setCustomerWallet({
                coins: res.data.data.walletCoins ?? 500,
                balance: res.data.data.walletBalance ?? 250,
              });
            }
          }).catch(() => {});
        }}
      />

      {/* Point #58: Public Vendor Storefront Showcase Modal */}
      <VendorPublicStoreModal
        isOpen={Boolean(selectedVendorForModal)}
        onClose={() => setSelectedVendorForModal(null)}
        storeSlugOrId={selectedVendorForModal?.storeSlug || selectedVendorForModal?._id}
        initialStoreData={selectedVendorForModal}
        onAddToCart={(prod) => {
          addToCart(prod, null, 1);
          setToastMessage(`Added ${prod.title} to your cart! 🛍️`);
          setTimeout(() => setToastMessage(null), 2500);
        }}
        onSelectProduct={(prod) => {
          setSelectedVendorForModal(null);
          setSelectedProduct(prod);
        }}
      />

      {/* Point #71: WhatsApp Order Confirmation & Bot Modal */}
      {isWhatsAppBotOpen && whatsAppBotOrder && (
        <WhatsAppOrderBotModal
          isOpen={isWhatsAppBotOpen}
          onClose={() => setIsWhatsAppBotOpen(false)}
          order={whatsAppBotOrder}
        />
      )}
    </div>
  );
};
