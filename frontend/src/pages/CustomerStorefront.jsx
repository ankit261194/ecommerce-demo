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
  Filter,
  Flame,
  BadgePercent,
  ArrowUpDown,
} from 'lucide-react';
import { SlideOverDrawer } from '../components/SlideOverDrawer';
import { ProductDetailModal } from '../components/ProductDetailModal';
import CategorySidebar from '../components/CategorySidebar';
import FlashSaleSection from '../components/FlashSaleSection';
import StockUrgencyBadge from '../components/StockUrgencyBadge';
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

  // Wishlist state (persisted in localStorage)
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem('auramarket_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleWishlist = (product, e) => {
    if (e) e.stopPropagation();
    setWishlist(prev => {
      const exists = prev.includes(product._id);
      const updated = exists ? prev.filter(id => id !== product._id) : [...prev, product._id];
      localStorage.setItem('auramarket_wishlist', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('auramarket_wishlist_update'));
      setToastMessage(exists ? `Removed from Wishlist` : `Saved to Wishlist ❤️`);
      setTimeout(() => setToastMessage(null), 2200);
      return updated;
    });
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
      setSelectedCategory('wishlist');
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

    window.addEventListener('auramarket_open_wishlist', handleOpenWishlist);
    window.addEventListener('auramarket_select_category', handleSelectCategory);
    window.addEventListener('auramarket_select_brand', handleSelectBrand);
    window.addEventListener('auramarket_open_product_pdp', handleOpenProductPDP);

    return () => {
      window.removeEventListener('auramarket_open_wishlist', handleOpenWishlist);
      window.removeEventListener('auramarket_select_category', handleSelectCategory);
      window.removeEventListener('auramarket_select_brand', handleSelectBrand);
      window.removeEventListener('auramarket_open_product_pdp', handleOpenProductPDP);
    };
  }, [products]);

  // Checkout address state
  const [address, setAddress] = useState({
    recipientName: user?.name || 'Aman Sharma',
    phone: user?.phone || '9876543214',
    street: 'Flat 402, Green Valley Apartments',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
  });
  const [paymentMethod, setPaymentMethod] = useState('COD');

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
      });

      if (res.data?.success && res.data?.data) {
        const order = res.data.data;
        setActiveOrderConfirmation({
          orderId: order.orderNumber || order._id,
          subOrders: (order.subOrders || []).map(so => ({
            subOrderId: so._id ? `SUB-${so._id.toString().slice(-4)}` : 'SUB-001',
            vendorName: so.vendor?.storeName || 'Verified Partner Store',
            itemsCount: (so.items || []).length,
            subTotal: so.subTotal || 0,
            otp: order.deliveryOtp || '4821',
            status: 'placed',
          })),
          totalAmount: order.totalAmount,
          address,
          paymentMethod,
        });
        clearCart();
        setIsCartOpen(false);
        return;
      }
    } catch (_) {
      // Graceful fallback to rich local confirmation in offline or demo preview
    }

    setActiveOrderConfirmation({
      orderId: fallbackOrderId,
      subOrders: fallbackSubOrdersList,
      totalAmount: cartTotal,
      address,
      paymentMethod,
    });

    clearCart();
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
        {/* Vibrant Clean Hero Banner (Responsive Mobile & Desktop) */}
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-md bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 min-h-[220px] sm:min-h-[280px] lg:min-h-[340px] flex items-center p-5 sm:p-8 lg:p-14 border border-amber-300">
          <div className="max-w-xl space-y-3 sm:space-y-4 z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-slate-950 text-amber-400 text-[10px] sm:text-xs font-black uppercase tracking-wider shadow">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>MEGA FESTIVE DEAL</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black text-slate-950 tracking-tight leading-tight">
              {uiConfig?.heroBanners?.[0]?.title || 'Spatial Audio Reinvented'}
            </h1>

            <p className="text-xs sm:text-sm lg:text-base text-slate-900 leading-relaxed font-semibold line-clamp-2 sm:line-clamp-none">
              {uiConfig?.heroBanners?.[0]?.subtitle ||
                'Studio acoustics with active noise cancellation. Shipped directly from verified electronics distributor.'}
            </p>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setSelectedCategory('electronics-audio')}
                className="px-4 py-2 sm:px-6 sm:py-3 rounded-xl bg-slate-950 hover:bg-slate-850 text-white font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
              >
                <span>Shop Festive Deals</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              </button>
            </div>
          </div>

          {/* Banner Product Showcase Image */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden md:block opacity-90 pointer-events-none">
            <img
              src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1000"
              alt="Hero Showcase"
              className="w-full h-full object-cover object-center"
            />
          </div>
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
                        <span className="text-amber-600 font-bold truncate max-w-[100px]">🏪 {product.vendor.storeName}</span>
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

                      {/* Real-time Stock Urgency Badge (Point #12) */}
                      <div className="pt-0.5">
                        <StockUrgencyBadge stock={product.stock} variant="compact" />
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
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Shipping Destination
                </h3>

                <div className="space-y-2 text-xs">
                  <input
                    type="text"
                    placeholder="Recipient Full Name"
                    value={address.recipientName}
                    onChange={e => setAddress({ ...address, recipientName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Mobile Number"
                    value={address.phone}
                    onChange={e => setAddress({ ...address, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Street Address / Flat No"
                    value={address.street}
                    onChange={e => setAddress({ ...address, street: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-medium"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="City"
                      value={address.city}
                      onChange={e => setAddress({ ...address, city: e.target.value })}
                      className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-medium"
                    />
                    <input
                      type="text"
                      placeholder="Pincode"
                      value={address.pincode}
                      onChange={e => setAddress({ ...address, pincode: e.target.value })}
                      className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Payment Method
                    </h3>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {validGateways.length} Gateways Active
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {validGateways.map(gw => (
                      <button
                        key={gw.id}
                        type="button"
                        onClick={() => setPaymentMethod(gw.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          paymentMethod === gw.id
                            ? 'border-amber-500 bg-amber-50 text-slate-950 ring-2 ring-amber-400/20'
                            : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900">{gw.name}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {gw.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{gw.subtext}</p>
                      </button>
                    ))}
                  </div>
                  {paymentMethod === 'UPI' && (
                    <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 space-y-1">
                      <div className="font-bold flex items-center justify-between">
                        <span>Scan & Pay via any UPI App</span>
                        <span className="font-mono text-purple-700 font-bold">{paymentSettings.upi?.upiId || '8533955333@paytm'}</span>
                      </div>
                      <p className="text-[11px] text-purple-700">
                        Payee: {paymentSettings.upi?.merchantName || 'AuraMarket Store'}. GPay, PhonePe, Paytm, or BHIM.
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'RAZORPAY' && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
                      <div className="font-bold flex items-center justify-between">
                        <span>Razorpay Official Gateway</span>
                        <span className="font-mono text-[10px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded">
                          {paymentSettings.razorpay?.keyId?.startsWith('rzp_test') ? '🧪 TEST MODE' : '🔒 256-BIT SECURE'}
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-700">
                        Supports all Indian Credit/Debit Cards, NetBanking (50+ banks), UPI Apps, and EMI.
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'STRIPE' && (
                    <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 space-y-1">
                      <div className="font-bold flex items-center justify-between">
                        <span>Stripe Worldwide Checkout</span>
                        <span className="font-mono text-[10px] text-indigo-700 font-bold bg-indigo-100 px-2 py-0.5 rounded">
                          {paymentSettings.stripe?.publishableKey?.startsWith('pk_test') ? '🧪 TEST MODE' : '🌐 GLOBAL LIVE'}
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-700">
                        Worldwide multi-currency processing for Visa, MasterCard, Amex, Apple Pay & Google Pay.
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'COD' && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                      <div className="font-bold flex items-center justify-between">
                        <span>Cash on Delivery</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          DOORSTEP VERIFICATION
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700">
                        Pay cash or UPI upon package arrival. A confidential 4-digit OTP will be required by your courier partner.
                      </p>
                    </div>
                  )}
                </div>

                {/* Grand Total & Place Order */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-600">Grand Total Payable:</span>
                    <span className="text-2xl font-black text-slate-950">₹{cartTotal.toLocaleString('en-IN')}</span>
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    className="w-full py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-xl transition-all"
                  >
                    Confirm & Place Split Order
                  </button>
                </div>
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

            <button
              onClick={() => setActiveOrderConfirmation(null)}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md"
            >
              Continue Shopping
            </button>
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
    </div>
  );
};
