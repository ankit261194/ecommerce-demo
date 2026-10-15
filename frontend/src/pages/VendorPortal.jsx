import React, { useState, useEffect } from 'react';
import {
  Package,
  PlusCircle,
  Truck,
  Wallet,
  TrendingUp,
  Star,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Boxes,
  Palette,
  Camera,
  Image as ImageIcon,
  AlertTriangle,
  RotateCw,
  FileSpreadsheet,
  ShieldCheck,
  Printer,
  Store,
  Palmtree,
  QrCode,
} from 'lucide-react';
import { BentoGrid, BentoCard } from '../components/BentoGrid';
import { SlideOverDrawer } from '../components/SlideOverDrawer';
import MultiVariantProductModal from '../components/MultiVariantProductModal';
import ProductGalleryUploader from '../components/ProductGalleryUploader';
import BulkProductExcelModal from '../components/BulkProductExcelModal';
import ShippingLabelPrinterModal from '../components/ShippingLabelPrinterModal';
import SmartSplitPackingSlipModal from '../components/SmartSplitPackingSlipModal';
import ThermalReceiptPrinterModal from '../components/ThermalReceiptPrinterModal';
import VendorStoreProfileModal from '../components/VendorStoreProfileModal';
import VendorPublicStoreModal from '../components/VendorPublicStoreModal';
import VacationModeModal from '../components/VacationModeModal';
import VendorReviewsModal from '../components/VendorReviewsModal';
import VendorWalletLedgerModal from '../components/VendorWalletLedgerModal';
import VendorPayoutModal from '../components/VendorPayoutModal';
import api from '../api/client';

export const VendorPortal = () => {
  // Vendor store state
  const [vendorData, setVendorData] = useState({
    storeName: 'Apex Tech Hub',
    storeSlug: 'apex-tech-hub',
    storeLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200',
    storeBanner: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200',
    bio: 'Premier supplier of audiophile gear, smart home electronics, and next-gen wearable gadgets since 2020.',
    walletBalance: 24500,
    totalSales: 185000,
    commissionRate: 8,
    rating: 4.9,
    vacationMode: {
      isVacation: false,
      noticeMessage: '',
      disableOrdering: true,
    },
  });

  const [products, setProducts] = useState([
    {
      id: 'p1',
      title: 'Aura Pro ANC Wireless Noise-Cancelling Headphones',
      sku: 'APX-HEAD-001',
      mrp: 14999,
      sellingPrice: 8999,
      stock: 45,
      lowStockThreshold: 10,
      category: 'Electronics & Audio',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
      thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
      gallery: [
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500',
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500',
        'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500',
      ],
      variantsCount: 3,
      colorSwatches: ['#0F172A', '#2563EB', '#DC2626'],
      sizeMatrix: ['S', 'M', 'L'],
    },
    {
      id: 'p2',
      title: 'AeroWatch S9 Ultra Smartwatch with AMOLED Display',
      sku: 'APX-WTCH-002',
      mrp: 9999,
      sellingPrice: 4499,
      stock: 3,
      lowStockThreshold: 5,
      category: 'Watches & Accessories',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
      thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
      gallery: [
        'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=500',
        'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500',
      ],
      variantsCount: 2,
      colorSwatches: ['#1E293B', '#F59E0B'],
      sizeMatrix: ['42mm', '46mm'],
    },
    {
      id: 'p3',
      title: 'AuraStudio True Wireless ANC Earbuds (Demo Out-of-Stock)',
      sku: 'APX-EAR-003',
      mrp: 4999,
      sellingPrice: 2499,
      stock: 0,
      lowStockThreshold: 5,
      category: 'Electronics & Audio',
      image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500',
      thumbnail: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500',
      gallery: [],
      variantsCount: 0,
      colorSwatches: ['#000000'],
      sizeMatrix: ['Standard'],
    },
  ]);

  const [subOrders, setSubOrders] = useState([
    {
      id: 'SUB-9821',
      rawId: null,
      customerName: 'Aman Sharma',
      items: [{ title: 'Aura Pro ANC Headphones', qty: 1, price: 8999 }],
      subTotal: 8999,
      commissionCut: 719.92,
      vendorEarning: 8279.08,
      status: 'confirmed',
      deliveryOtp: '4821',
      date: 'Today, 02:40 PM',
    },
    {
      id: 'SUB-7612',
      rawId: null,
      customerName: 'Priya Mehta',
      items: [{ title: 'AeroWatch S9 Ultra', qty: 2, price: 4499 }],
      subTotal: 8998,
      commissionCut: 719.84,
      vendorEarning: 8278.16,
      status: 'placed',
      deliveryOtp: '9104',
      date: 'Today, 11:15 AM',
    },
  ]);

  const [isAddProductDrawerOpen, setIsAddProductDrawerOpen] = useState(false);
  const [isMultiVariantModalOpen, setIsMultiVariantModalOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [selectedProductForMedia, setSelectedProductForMedia] = useState(null);
  const [mediaDraft, setMediaDraft] = useState({ thumbnail: '', gallery: [] });
  const [stockFilter, setStockFilter] = useState('all'); // Point #54: all | in_stock | low_stock | out_of_stock
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false); // Point #55: Bulk Excel / CSV Suite
  const [orderFilter, setOrderFilter] = useState('all'); // Point #56: all | pending | packaging | ready_for_pickup | dispatched | delivered
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false); // Point #57: Thermal & A4 Shipping Label Printer
  const [selectedOrderForLabel, setSelectedOrderForLabel] = useState(null);
  const [isSplitSlipModalOpen, setIsSplitSlipModalOpen] = useState(false); // Point #73: Smart Multi-Vendor Split Packing Slip with QR Codes
  const [selectedOrderForSplitSlip, setSelectedOrderForSplitSlip] = useState(null);
  const [isThermalModalOpen, setIsThermalModalOpen] = useState(false); // Point #75: Thermal Receipt Printer Modal
  const [selectedOrderForThermal, setSelectedOrderForThermal] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); // Point #58: Store Profile Customization
  const [isPublicStorePreviewOpen, setIsPublicStorePreviewOpen] = useState(false); // Point #58: Public Storefront Preview
  const [isVacationModalOpen, setIsVacationModalOpen] = useState(false); // Point #59: Vacation Mode Toggle
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false); // Point #60: Customer Reviews Management
  const [isWalletLedgerModalOpen, setIsWalletLedgerModalOpen] = useState(false); // Point #61: Financial Wallet & Ledger
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('10000');
  const [notification, setNotification] = useState(null);

  const [newProduct, setNewProduct] = useState({
    title: '',
    category: 'Electronics & Audio',
    mrp: '',
    sellingPrice: '',
    stock: '',
    lowStockThreshold: 5,
    sku: '',
    colorVariant: '',
    sizeVariant: '',
    thumbnail: '',
    gallery: [],
  });

  const fetchVendorData = async () => {
    try {
      const [dashRes, prodRes, ordRes] = await Promise.allSettled([
        api.get('/vendor/dashboard'),
        api.get('/vendor/products'),
        api.get('/vendor/orders'),
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value.data?.data) {
        const d = dashRes.value.data.data;
        setVendorData(prev => ({
          ...prev,
          storeName: d.vendor?.storeName || prev.storeName,
          walletBalance: d.vendor?.walletBalance ?? prev.walletBalance,
          totalSales: d.vendor?.totalSales ?? prev.totalSales,
          commissionRate: d.vendor?.commissionRate ?? prev.commissionRate,
          rating: d.vendor?.rating ?? prev.rating,
          vacationMode: d.vendor?.vacationMode || prev.vacationMode,
        }));
      }

      if (prodRes.status === 'fulfilled' && prodRes.value.data?.data?.length > 0) {
        const pList = prodRes.value.data.data.map(p => ({
          id: p._id,
          title: p.title,
          sku: p.sku,
          mrp: p.mrp,
          sellingPrice: p.sellingPrice,
          stock: p.stock,
          lowStockThreshold: p.lowStockThreshold !== undefined ? p.lowStockThreshold : 5,
          category: p.category?.name || 'General',
          image: p.thumbnail || p.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
          thumbnail: p.thumbnail || p.images?.[0] || '',
          gallery: Array.isArray(p.gallery) ? p.gallery : (p.images?.length > 1 ? p.images.slice(1) : []),
          variantsCount: p.variants?.length || 0,
          colorSwatches: p.variants?.map(v => v.colorCode).filter(Boolean) || [],
          sizeMatrix: Array.from(new Set(p.variants?.map(v => v.attributes?.size).filter(Boolean))) || [],
        }));
        setProducts(pList);
      }

      if (ordRes.status === 'fulfilled' && ordRes.value.data?.data?.length > 0) {
        const oList = ordRes.value.data.data.map(so => ({
          id: `SUB-${so._id.toString().slice(-4)}`,
          rawId: so._id,
          customerName: so.customer?.name || 'Customer',
          items: so.items || [],
          subTotal: so.subTotal,
          commissionCut: so.platformCommissionAmount,
          vendorEarning: so.vendorEarning,
          status: so.status,
          deliveryOtp: so.deliveryOtp,
          date: new Date(so.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
        setSubOrders(oList);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchVendorData();
  }, []);

  // Handle Order Status Stepper
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    const target = subOrders.find(o => o.id === orderId);
    setSubOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    setNotification(`Sub-order ${orderId} marked as ${newStatus.toUpperCase()}`);

    if (target?.rawId) {
      try {
        await api.put(`/vendor/orders/${target.rawId}/status`, { status: newStatus });
      } catch (err) {
        if (err.response?.data?.message) {
          setNotification(`Error: ${err.response.data.message}`);
          setSubOrders(prev =>
            prev.map(o => (o.id === orderId ? { ...o, status: target.status } : o))
          );
        }
      }
    }
  };

  // Handle Add Product
  const handleAddProduct = async e => {
    e.preventDefault();
    if (!newProduct.title || !newProduct.sellingPrice || !newProduct.stock) {
      alert('Please fill product title, price and stock');
      return;
    }

    const primaryImg = newProduct.thumbnail || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500';
    const prodGallery = newProduct.gallery || [];
    const allImgs = [primaryImg, ...prodGallery.filter(g => g !== primaryImg)];

    try {
      const catRes = await api.get('/products/categories');
      const firstCatId = catRes.data?.data?.[0]?._id;

      await api.post('/vendor/products', {
        title: newProduct.title,
        sellingPrice: Number(newProduct.sellingPrice),
        mrp: Number(newProduct.mrp) || Number(newProduct.sellingPrice) * 1.3,
        stock: Number(newProduct.stock),
        sku: newProduct.sku || 'SKU-' + Date.now().toString().slice(-4),
        category: firstCatId || '66a123456789012345678901',
        description: `${newProduct.title} - Official authentic stock.`,
        thumbnail: primaryImg,
        gallery: prodGallery,
        images: allImgs,
      });
      await fetchVendorData();
    } catch (_) {}

    const created = {
      id: 'p_' + Date.now(),
      title: newProduct.title,
      sku: newProduct.sku || 'SKU-' + Date.now().toString().slice(-4),
      mrp: Number(newProduct.mrp) || Number(newProduct.sellingPrice) * 1.3,
      sellingPrice: Number(newProduct.sellingPrice),
      stock: Number(newProduct.stock),
      category: newProduct.category,
      image: primaryImg,
      thumbnail: primaryImg,
      gallery: prodGallery,
      variantsCount: newProduct.colorVariant || newProduct.sizeVariant ? 2 : 0,
    };

    setProducts(prev => [created, ...prev]);
    setIsAddProductDrawerOpen(false);
    setNewProduct({
      title: '',
      category: 'Electronics & Audio',
      mrp: '',
      sellingPrice: '',
      stock: '',
      sku: '',
      colorVariant: '',
      sizeVariant: '',
      thumbnail: '',
      gallery: [],
    });
    setNotification(`Product '${created.title}' added to store inventory successfully!`);
  };

  // Point #52: Media Manager Handlers
  const handleOpenMediaModal = (product) => {
    setSelectedProductForMedia(product);
    setMediaDraft({
      thumbnail: product.thumbnail || product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
      gallery: product.gallery || [],
    });
    setIsMediaModalOpen(true);
  };

  const handleSaveMedia = async () => {
    if (!selectedProductForMedia) return;

    const { thumbnail, gallery } = mediaDraft;
    const cleanThumb = thumbnail || selectedProductForMedia.thumbnail || selectedProductForMedia.image;
    const cleanGal = Array.isArray(gallery) ? gallery.filter(g => g !== cleanThumb) : [];

    try {
      if (
        selectedProductForMedia.id &&
        !selectedProductForMedia.id.startsWith('p_') &&
        !selectedProductForMedia.id.startsWith('p1') &&
        !selectedProductForMedia.id.startsWith('p2')
      ) {
        await api.put(`/vendor/products/${selectedProductForMedia.id}/media`, {
          thumbnail: cleanThumb,
          gallery: cleanGal,
        });
      }
    } catch (_) {}

    setProducts(prev =>
      prev.map(p =>
        p.id === selectedProductForMedia.id
          ? {
              ...p,
              image: cleanThumb,
              thumbnail: cleanThumb,
              gallery: cleanGal,
            }
          : p
      )
    );

    setIsMediaModalOpen(false);
    setSelectedProductForMedia(null);
    setNotification(`Photo gallery updated for '${selectedProductForMedia.title}'!`);
  };

  // Point #54: Quick Restock Inventory Handler
  const handleQuickRestock = async (productId, amountToAdd) => {
    const qty = Number(amountToAdd) || 10;
    try {
      if (
        productId &&
        !productId.startsWith('p_') &&
        !productId.startsWith('p1') &&
        !productId.startsWith('p2') &&
        !productId.startsWith('p3')
      ) {
        await api.patch(`/vendor/products/${productId}/stock`, {
          additionalStock: qty,
        });
      }
    } catch (_) {}

    setProducts(prev =>
      prev.map(p =>
        p.id === productId
          ? { ...p, stock: p.stock + qty }
          : p
      )
    );

    setNotification(`⚡ Inventory Replenished: +${qty} units added successfully!`);
  };

  // Point #51: Handle Multi-Variant Product Publishing
  const handleMultiVariantCreated = async (payload) => {
    try {
      const catRes = await api.get('/products/categories');
      const firstCatId = catRes.data?.data?.[0]?._id;

      await api.post('/vendor/products', {
        ...payload,
        category: firstCatId || '66a123456789012345678901',
      });
      await fetchVendorData();
    } catch (_) {}

    const colorSwatches = Array.from(
      new Set(payload.variants.map((v) => v.colorCode).filter(Boolean))
    );
    const sizeMatrix = Array.from(
      new Set(payload.variants.map((v) => v.attributes?.size).filter(Boolean))
    );

    const created = {
      id: 'p_' + Date.now(),
      title: payload.title,
      sku: payload.sku || 'SKU-' + Date.now().toString().slice(-4),
      mrp: payload.mrp,
      sellingPrice: payload.sellingPrice,
      stock: payload.stock,
      category: payload.category,
      image: payload.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500',
      variantsCount: payload.variants.length,
      hasVariants: true,
      colorSwatches,
      sizeMatrix,
    };

    setProducts((prev) => [created, ...prev]);
    setNotification(
      `Multi-variant product '${created.title}' published with ${payload.variants.length} SKUs and ${payload.stock} total stock!`
    );
  };

  // Handle Payout Withdrawal
  const handlePayoutSubmit = async () => {
    const amt = Number(payoutAmount);
    if (amt <= 0 || amt > vendorData.walletBalance) {
      alert('Invalid withdrawal amount');
      return;
    }

    setVendorData(prev => ({ ...prev, walletBalance: prev.walletBalance - amt }));
    setIsPayoutModalOpen(false);
    setNotification(`Withdrawal request of ₹${amt.toLocaleString('en-IN')} submitted to HDFC Bank (A/C: ****4092)`);

    try {
      await api.post('/vendor/payout', { amount: amt });
    } catch (_) {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in text-slate-800">
      {notification && (
        <div className="p-4 rounded-xl text-sm font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-sm">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-xs underline font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            {vendorData.storeName}
            <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Verified Partner
            </span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Product Catalog, Multi-Variant SKU Inventory & Order Dispatch Center
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setIsVacationModalOpen(true)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
              vendorData.vacationMode?.isVacation
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-600 ring-2 ring-amber-400/50'
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
            }`}
            title="Configure Store Vacation / Holiday Mode"
          >
            <Palmtree className={`w-4 h-4 ${vendorData.vacationMode?.isVacation ? 'text-slate-950 animate-bounce' : 'text-slate-500'}`} />
            <span>
              {vendorData.vacationMode?.isVacation ? '🌴 Vacation Mode ON' : '🌴 Vacation Mode'}
            </span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${vendorData.vacationMode?.isVacation ? 'bg-slate-950 text-amber-400' : 'bg-slate-100 text-slate-700'}`}>
              #59
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
            title="Customize Shop Logo, Cover Banner, Bio, Slug & Social Links"
          >
            <Store className="w-4 h-4 text-amber-400" />
            <span>Store Branding & Profile</span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950">
              #58
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsReviewsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
            title="Customer Reviews & Reputation Management: View ratings & post official replies"
          >
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>Customer Reviews</span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950">
              #60
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsWalletLedgerModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
            title="Real-Time Vendor Financial Wallet & Audited Transaction Ledger"
          >
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>Wallet & Ledger</span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-400 text-slate-950">
              #61
            </span>
          </button>

          <button
            onClick={() => setIsPayoutModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold shadow-sm transition-all"
          >
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>Withdraw Payout</span>
          </button>

          <button
            onClick={() => setIsAddProductDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Point 59: Vacation Mode Active Banner */}
      {vendorData.vacationMode?.isVacation && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-400 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm font-black">
              <Palmtree className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md">
                  Vacation Mode Active
                </span>
                <span className="text-xs font-bold text-amber-900">
                  Customer order placement is paused
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Notice displayed to shoppers: "{vendorData.vacationMode.noticeMessage || 'Store is on vacation'}"
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsVacationModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shrink-0 transition-all shadow-sm"
          >
            Modify / Turn Off
          </button>
        </div>
      )}

      {/* Bento Grid Metrics */}
      <BentoGrid>
        <BentoCard
          title="Available Wallet Balance"
          value={`₹${vendorData.walletBalance.toLocaleString('en-IN')}`}
          subtitle="Ready for instant bank withdrawal"
          icon={Wallet}
          badge="8% Platform Cut Deducted"
          badgeColor="text-emerald-800 bg-emerald-50 border-emerald-200"
          accentColor="text-emerald-600"
        />

        <BentoCard
          title="Store Gross Sales"
          value={`₹${vendorData.totalSales.toLocaleString('en-IN')}`}
          subtitle="Total customer volume generated"
          icon={TrendingUp}
          badge="+24% vs Last Month"
          badgeColor="text-amber-800 bg-amber-50 border-amber-200"
          accentColor="text-amber-600"
        />

        <BentoCard
          title="Active Inventory SKUs"
          value={products.length.toString()}
          subtitle="Listed in customer search catalog"
          icon={Package}
          badge="In Stock"
          badgeColor="text-blue-800 bg-blue-50 border-blue-200"
          accentColor="text-blue-600"
        />

        <BentoCard
          title="Merchant Rating"
          value={`${vendorData.rating} ★`}
          subtitle="Based on customer fulfillment reviews"
          icon={Star}
          badge="Top Rated"
          badgeColor="text-amber-800 bg-amber-50 border-amber-200"
          accentColor="text-amber-600"
        />
      </BentoGrid>

      {/* Order Fulfillment Workflow (Point #56: Vendor Sub-Orders Lifecycle) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-500" />
              <span>Orders Assigned to Your Store (Package Dispatch Lifecycle)</span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                Point #56
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Strict 4-stage lifecycle: Pending → Packaging → Ready for Pickup → Handed to Courier (OTP Protected).
            </p>
          </div>

          {/* Quick Lifecycle Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs font-bold">
            <button
              type="button"
              onClick={() => setOrderFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                orderFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({subOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setOrderFilter('pending')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                orderFilter === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              ⚡ Pending ({subOrders.filter(o => ['placed', 'pending'].includes(o.status)).length})
            </button>
            <button
              type="button"
              onClick={() => setOrderFilter('packaging')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                orderFilter === 'packaging'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              📦 Packaging ({subOrders.filter(o => ['confirmed', 'packaging'].includes(o.status)).length})
            </button>
            <button
              type="button"
              onClick={() => setOrderFilter('ready_for_pickup')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                orderFilter === 'ready_for_pickup'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
              }`}
            >
              ✅ Ready ({subOrders.filter(o => ['packed', 'ready_for_pickup'].includes(o.status)).length})
            </button>
            <button
              type="button"
              onClick={() => setOrderFilter('dispatched')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                orderFilter === 'dispatched'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
              }`}
            >
              🚚 Dispatched ({subOrders.filter(o => ['dispatched', 'handed_to_courier', 'out_for_delivery'].includes(o.status)).length})
            </button>
          </div>
        </div>

        {/* Filtered Sub-Orders Grid */}
        <div className="space-y-4">
          {subOrders
            .filter(order => {
              if (orderFilter === 'pending') return ['placed', 'pending'].includes(order.status);
              if (orderFilter === 'packaging') return ['confirmed', 'packaging'].includes(order.status);
              if (orderFilter === 'ready_for_pickup') return ['packed', 'ready_for_pickup'].includes(order.status);
              if (orderFilter === 'dispatched') return ['dispatched', 'handed_to_courier', 'out_for_delivery'].includes(order.status);
              if (orderFilter === 'delivered') return order.status === 'delivered';
              return true;
            })
            .map(order => {
              const isPending = ['placed', 'pending'].includes(order.status);
              const isPackaging = ['confirmed', 'packaging'].includes(order.status);
              const isReady = ['packed', 'ready_for_pickup'].includes(order.status);
              const isDispatched = ['dispatched', 'handed_to_courier', 'out_for_delivery'].includes(order.status);
              const isDelivered = order.status === 'delivered';

              return (
                <div
                  key={order.id}
                  className="bg-slate-50 rounded-2xl p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all space-y-4"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900 text-base">{order.id}</span>
                        <span className="text-xs text-slate-400 font-medium">{order.date}</span>
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            isDelivered
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isDispatched
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : isReady
                              ? 'bg-teal-100 text-teal-800 border border-teal-200'
                              : isPackaging
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Customer: <span className="font-bold text-slate-900">{order.customerName}</span> | Items:{' '}
                        {order.items.map(i => `${i.title} (${i.qty}x)`).join(', ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-bold bg-white px-3.5 py-2 rounded-xl border border-slate-200">
                      <span className="text-slate-600">Total: ₹{order.subTotal.toLocaleString('en-IN')}</span>
                      <span className="text-slate-400">Commission: -₹{order.commissionCut.toFixed(2)}</span>
                      <span className="text-emerald-700 font-black">
                        Net Payout: ₹{order.vendorEarning.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* 4-Stage Lifecycle Stepper */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200/80">
                    {/* Step 1: Placed */}
                    <div className={`p-2 rounded-xl border text-center transition-all ${
                      isPending
                        ? 'bg-amber-500/10 border-amber-500 text-amber-900 font-black ring-1 ring-amber-400'
                        : isPackaging || isReady || isDispatched || isDelivered
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}>
                      <p className="text-[10px] uppercase tracking-wider">1. Placed</p>
                      <p className="text-[11px] mt-0.5 flex items-center justify-center gap-1">
                        {isPackaging || isReady || isDispatched || isDelivered ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                        )}
                        <span>{isPending ? 'Action Required' : 'Accepted'}</span>
                      </p>
                    </div>

                    {/* Step 2: Packaging */}
                    <div className={`p-2 rounded-xl border text-center transition-all ${
                      isPackaging
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-900 font-black ring-1 ring-indigo-400'
                        : isReady || isDispatched || isDelivered
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}>
                      <p className="text-[10px] uppercase tracking-wider">2. Packaging</p>
                      <p className="text-[11px] mt-0.5 flex items-center justify-center gap-1">
                        {isReady || isDispatched || isDelivered ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : isPackaging ? (
                          <Package className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                        ) : (
                          <span className="text-slate-300">○</span>
                        )}
                        <span>{isPackaging ? 'Packing Now' : isReady || isDispatched || isDelivered ? 'Packed' : 'Pending'}</span>
                      </p>
                    </div>

                    {/* Step 3: Ready for Pickup */}
                    <div className={`p-2 rounded-xl border text-center transition-all ${
                      isReady
                        ? 'bg-teal-500/10 border-teal-500 text-teal-900 font-black ring-1 ring-teal-400'
                        : isDispatched || isDelivered
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}>
                      <p className="text-[10px] uppercase tracking-wider">3. Ready for Pickup</p>
                      <p className="text-[11px] mt-0.5 flex items-center justify-center gap-1">
                        {isDispatched || isDelivered ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : isReady ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <span className="text-slate-300">○</span>
                        )}
                        <span>{isReady ? 'Sealed & Labeled' : isDispatched || isDelivered ? 'Handed Over' : 'Waiting'}</span>
                      </p>
                    </div>

                    {/* Step 4: Handed to Courier */}
                    <div className={`p-2 rounded-xl border text-center transition-all ${
                      isDispatched
                        ? 'bg-blue-500/10 border-blue-500 text-blue-900 font-black ring-1 ring-blue-400'
                        : isDelivered
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}>
                      <p className="text-[10px] uppercase tracking-wider">4. Handed to Courier</p>
                      <p className="text-[11px] mt-0.5 flex items-center justify-center gap-1">
                        {isDelivered ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : isDispatched ? (
                          <Truck className="w-3.5 h-3.5 text-blue-600 animate-bounce" />
                        ) : (
                          <span className="text-slate-300">○</span>
                        )}
                        <span>{isDelivered ? 'Delivered' : isDispatched ? 'With Rider' : 'Unassigned'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions & OTP Protection Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
                    <div className="flex items-center gap-2 text-[11px] text-slate-600">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>OTP Protection:</strong> Delivery rider verifies customer 4-digit secret OTP on doorstep to release funds.
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrderForLabel(order);
                          setIsLabelModalOpen(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                        title="Print 4x6 Thermal Shipping Label or A4 Tax Invoice / Packing Slip"
                      >
                        <Printer className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Print Label / Slip</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrderForSplitSlip(order.rawId || order.id);
                          setIsSplitSlipModalOpen(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs border border-indigo-200"
                        title="Smart Split Packing Slip with Live Tracking QR Code (Point #73)"
                      >
                        <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Split Slip (QR)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrderForThermal(order.rawId || order.id);
                          setIsThermalModalOpen(true);
                        }}
                        className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs border border-amber-300"
                        title="In-Browser Direct Thermal Receipt Printer (ESC/POS 80mm & 58mm) (Point #75)"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-600" />
                        <span>Thermal POS</span>
                      </button>

                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleUpdateOrderStatus(order.id, 'packaging')}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition-all hover:scale-105 flex items-center gap-1.5"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>Accept & Start Packaging</span>
                        </button>
                      )}

                      {isPackaging && (
                        <button
                          type="button"
                          onClick={() => handleUpdateOrderStatus(order.id, 'ready_for_pickup')}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md transition-all hover:scale-105 flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Ready for Pickup</span>
                        </button>
                      )}

                      {isReady && (
                        <button
                          type="button"
                          onClick={() => handleUpdateOrderStatus(order.id, 'dispatched')}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md transition-all hover:scale-105 flex items-center gap-1.5"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Handover to Courier Rider</span>
                        </button>
                      )}

                      {isDispatched && (
                        <span className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-blue-600" />
                          <span>In Transit with Courier</span>
                        </span>
                      )}

                      {isDelivered && (
                        <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Delivered (OTP Verified)</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Inventory & Products Catalog */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Boxes className="w-5 h-5 text-amber-500" />
              Store Product Catalog ({products.length} Items)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage variants, color swatches, stock inventories, and selling prices.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                if (products.length > 0) {
                  handleOpenMediaModal(products[0]);
                } else {
                  setIsAddProductDrawerOpen(true);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all hover:scale-105"
            >
              <Camera className="w-4 h-4 text-indigo-200" />
              <span>+ Multi-Image Uploader (Point #52)</span>
            </button>
            <button
              onClick={() => setIsMultiVariantModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all hover:scale-105"
            >
              <Palette className="w-4 h-4" />
              <span>+ Multi-Variant Creator (Point #51)</span>
            </button>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-105"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>Bulk Excel / CSV (Point #55)</span>
            </button>
            <button
              onClick={() => setIsAddProductDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              <span>+ Quick Item</span>
            </button>
          </div>
        </div>

        {/* Point #54: Low Stock Alert Warning Banner */}
        {products.some(p => p.stock <= (p.lowStockThreshold || 5)) && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-900 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-600">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <p className="text-xs font-bold flex items-center gap-2">
                  <span>Inventory Alert (Point #54):</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                    {products.filter(p => p.stock <= (p.lowStockThreshold || 5)).length} Items Running Low / Out
                  </span>
                </p>
                <p className="text-[11px] text-amber-700">
                  Products are below safety threshold. Restock now to prevent missed orders.
                </p>
              </div>
            </div>
            <button
              onClick={() => setStockFilter('low_stock')}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm transition-all shrink-0"
            >
              Filter Low Stock
            </button>
          </div>
        )}

        {/* Point #54: Inventory Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              stockFilter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Products ({products.length})
          </button>
          <button
            onClick={() => setStockFilter('in_stock')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              stockFilter === 'in_stock'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            In Stock ({products.filter(p => p.stock > (p.lowStockThreshold || 5)).length})
          </button>
          <button
            onClick={() => setStockFilter('low_stock')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
              stockFilter === 'low_stock'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Low Stock ({products.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold || 5)).length})</span>
          </button>
          <button
            onClick={() => setStockFilter('out_of_stock')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              stockFilter === 'out_of_stock'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Out of Stock ({products.filter(p => p.stock <= 0).length})
          </button>
        </div>

        {/* Products Grid */}
        {products
          .filter(p => {
            if (stockFilter === 'in_stock') return p.stock > (p.lowStockThreshold || 5);
            if (stockFilter === 'low_stock') return p.stock > 0 && p.stock <= (p.lowStockThreshold || 5);
            if (stockFilter === 'out_of_stock') return p.stock <= 0;
            return true;
          })
          .length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-slate-500">
            <Boxes className="w-10 h-10 mx-auto text-slate-400 mb-2 stroke-1" />
            <p className="text-sm font-bold text-slate-700">No products found in '{stockFilter}' filter</p>
            <button
              onClick={() => setStockFilter('all')}
              className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
            >
              Switch back to All Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products
              .filter(p => {
                if (stockFilter === 'in_stock') return p.stock > (p.lowStockThreshold || 5);
                if (stockFilter === 'low_stock') return p.stock > 0 && p.stock <= (p.lowStockThreshold || 5);
                if (stockFilter === 'out_of_stock') return p.stock <= 0;
                return true;
              })
              .map(p => {
                const isOut = p.stock <= 0;
                const isLow = p.stock > 0 && p.stock <= (p.lowStockThreshold || 5);

                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-xl p-4 border shadow-sm space-y-3 hover:shadow-md transition-all ${
                      isOut
                        ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/20'
                        : isLow
                        ? 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="relative group">
                      <img src={p.image} alt={p.title} className="w-full h-44 object-cover rounded-lg border border-slate-100" />
                      <button
                        type="button"
                        onClick={() => handleOpenMediaModal(p)}
                        className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/80 hover:bg-black text-white text-[10px] font-bold rounded-lg shadow-md flex items-center gap-1 backdrop-blur-xs transition-transform hover:scale-105"
                      >
                        <Camera className="w-3.5 h-3.5 text-amber-400" />
                        <span>Media ({1 + (p.gallery?.length || 0)})</span>
                      </button>
                      {/* Out of Stock / Low Stock Corner Badge */}
                      {isOut && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow">
                          Out of Stock
                        </span>
                      )}
                      {isLow && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3" /> Low Stock
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{p.title}</h3>
                      <p className="text-xs text-slate-400 font-medium">SKU: {p.sku}</p>
                    </div>

                    {/* Point #51: Multi-Variant Color Swatches & Size Matrix Badges */}
                    {(p.colorSwatches?.length > 0 || p.variantsCount > 0) && (
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-semibold">Swatches:</span>
                          <div className="flex items-center -space-x-1">
                            {(p.colorSwatches || ['#0F172A', '#2563EB', '#DC2626']).slice(0, 4).map((hex, i) => (
                              <span
                                key={i}
                                className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-800 shadow-sm"
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                          </div>
                        </div>
                        {p.sizeMatrix?.length > 0 && (
                          <div className="flex items-center gap-1">
                            {p.sizeMatrix.slice(0, 3).map((sz) => (
                              <span key={sz} className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                {sz}
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          {p.variantsCount || 2} Variants
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-slate-900 text-sm">₹{p.sellingPrice}</span>
                          {p.mrp > p.sellingPrice && (
                            <span className="text-slate-400 line-through text-xs font-medium">₹{p.mrp}</span>
                          )}
                          {p.mrp > p.sellingPrice && (
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded-md">
                              {Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100)}% OFF
                            </span>
                          )}
                        </div>
                        {p.mrp > p.sellingPrice && (
                          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                            Customer saves ₹{(p.mrp - p.sellingPrice).toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>

                      {/* Stock Urgency Tag */}
                      {isOut ? (
                        <span className="font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full shrink-0">
                          Stock: 0
                        </span>
                      ) : isLow ? (
                        <span className="font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full shrink-0 flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-amber-600" /> Only {p.stock} left
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shrink-0">
                          Stock: {p.stock}
                        </span>
                      )}
                    </div>

                    {/* Point #54: Quick 1-Click Inventory Restock Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                        <RotateCw className="w-3 h-3 text-slate-400" />
                        Quick Restock:
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuickRestock(p.id, 10)}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 text-[10px] font-bold transition-colors"
                          title="Add 10 units"
                        >
                          +10
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickRestock(p.id, 25)}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 text-[10px] font-bold transition-colors"
                          title="Add 25 units"
                        >
                          +25
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickRestock(p.id, 50)}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 text-[10px] font-bold transition-colors"
                          title="Add 50 units"
                        >
                          +50
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Add Product SlideOver Drawer */}
      <SlideOverDrawer
        isOpen={isAddProductDrawerOpen}
        onClose={() => setIsAddProductDrawerOpen(false)}
        title="Add New Catalog Product"
        width="max-w-lg"
      >
        <form onSubmit={handleAddProduct} className="space-y-4 text-slate-800">
          <div>
            <label className="text-xs font-bold uppercase text-slate-600">Product Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Pro Sound Wireless Earbuds"
              value={newProduct.title}
              onChange={e => setNewProduct({ ...newProduct, title: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase text-slate-600">Selling Price (₹)</label>
              <input
                type="number"
                required
                placeholder="2499"
                value={newProduct.sellingPrice}
                onChange={e => setNewProduct({ ...newProduct, sellingPrice: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-600">Original MRP (₹)</label>
              <input
                type="number"
                placeholder="4999"
                value={newProduct.mrp}
                onChange={e => setNewProduct({ ...newProduct, mrp: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Point #53: Live Discount Preview Calculator Badge */}
          {newProduct.sellingPrice && newProduct.mrp && Number(newProduct.mrp) > Number(newProduct.sellingPrice) && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between animate-fadeIn">
              <span className="font-bold flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-black text-[11px]">
                  {Math.round(((Number(newProduct.mrp) - Number(newProduct.sellingPrice)) / Number(newProduct.mrp)) * 100)}% OFF
                </span>
                <span>Point #53 Automatic Discount</span>
              </span>
              <span className="font-semibold text-emerald-700">
                Buyer Saves ₹{(Number(newProduct.mrp) - Number(newProduct.sellingPrice)).toLocaleString('en-IN')}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase text-slate-600">Available Stock</label>
              <input
                type="number"
                required
                placeholder="50"
                value={newProduct.stock}
                onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-600">SKU Code</label>
              <input
                type="text"
                placeholder="APX-EAR-01"
                value={newProduct.sku}
                onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-600">Variants (Optional)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Color: Black, Silver"
                value={newProduct.colorVariant}
                onChange={e => setNewProduct({ ...newProduct, colorVariant: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
              />
              <input
                type="text"
                placeholder="Size: S, M, L"
                value={newProduct.sizeVariant}
                onChange={e => setNewProduct({ ...newProduct, sizeVariant: e.target.value })}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
              />
            </div>
          </div>

          {/* Point #52: Embedded Photo Gallery & Thumbnail Uploader */}
          <div className="pt-2">
            <ProductGalleryUploader
              thumbnail={newProduct.thumbnail}
              gallery={newProduct.gallery}
              onChange={({ thumbnail, gallery }) =>
                setNewProduct(prev => ({ ...prev, thumbnail, gallery }))
              }
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md transition-all mt-4"
          >
            Publish to Marketplace
          </button>
        </form>
      </SlideOverDrawer>

      {/* Point #62: Payout Withdrawal Request Flow (Bank NEFT / IMPS / UPI) */}
      <VendorPayoutModal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        walletBalance={vendorData.walletBalance}
        initialBankDetails={vendorData.bankDetails || {
          accountHolder: vendorData.storeName || 'Apex Tech Enterprise',
          bankName: 'HDFC Bank Ltd',
          accountNumber: '50100492810234',
          ifscCode: 'HDFC0001024',
          upiId: 'apextech@okhdfcbank',
        }}
        onPayoutSuccess={(result) => {
          setVendorData(prev => ({
            ...prev,
            walletBalance: result.remainingBalance !== undefined ? result.remainingBalance : prev.walletBalance - result.amount,
          }));
          setNotification(
            `Withdrawal of ₹${result.amount.toLocaleString('en-IN')} via ${result.mode} (${result.recipient}) submitted successfully!`
          );
          fetchVendorData();
        }}
      />

      {/* Point #51: Multi-Variant Product Creator Modal */}
      <MultiVariantProductModal
        isOpen={isMultiVariantModalOpen}
        onClose={() => setIsMultiVariantModalOpen(false)}
        onProductCreated={handleMultiVariantCreated}
      />

      {/* Point #52: Media Gallery Studio Modal */}
      {isMediaModalOpen && selectedProductForMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-indigo-400" />
                  Media Gallery Studio — {selectedProductForMedia.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Select primary thumbnail cover, add high-res photos, and reorder customer gallery carousel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMediaModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg hover:bg-slate-800"
              >
                ✕ Close
              </button>
            </div>

            <ProductGalleryUploader
              thumbnail={mediaDraft.thumbnail}
              gallery={mediaDraft.gallery}
              onChange={({ thumbnail, gallery }) => setMediaDraft({ thumbnail, gallery })}
            />

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsMediaModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMedia}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
              >
                Save Media Gallery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Point #55: Bulk Product Excel / CSV Upload & Export Modal */}
      <BulkProductExcelModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        currentProducts={products}
        vendorToken={localStorage.getItem('token')}
        onProductsImported={(importedList) => {
          setProducts(prev => {
            const updated = [...prev];
            importedList.forEach(item => {
              const idx = updated.findIndex(p => p.sku === item.sku || p.id === item._id || p.id === item.id);
              const formatted = {
                id: item._id || item.id || 'p-bulk-' + Date.now(),
                title: item.title,
                sku: item.sku,
                category: item.category?.name || item.category || 'Electronics',
                brand: item.brand || 'Apex Tech',
                mrp: item.mrp || item.sellingPrice,
                sellingPrice: item.sellingPrice,
                stock: item.stock,
                lowStockThreshold: item.lowStockThreshold || 5,
                image: item.thumbnail || (item.images && item.images[0]) || item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
                thumbnail: item.thumbnail || (item.images && item.images[0]) || item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
                gallery: item.gallery || [],
                description: item.description,
              };
              if (idx >= 0) {
                updated[idx] = { ...updated[idx], ...formatted };
              } else {
                updated.unshift(formatted);
              }
            });
            return updated;
          });
          setNotification({
            type: 'success',
            message: `Successfully synchronized ${importedList.length} products to store catalog.`,
          });
        }}
      />

      {/* Point 57: Shipping Label & Packing Slip Printer Modal */}
      <ShippingLabelPrinterModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        order={selectedOrderForLabel}
        vendorData={vendorData}
      />

      {/* Point 73: Smart Multi-Vendor Split Packing Slip with QR Codes Modal */}
      <SmartSplitPackingSlipModal
        isOpen={isSplitSlipModalOpen}
        onClose={() => {
          setIsSplitSlipModalOpen(false);
          setSelectedOrderForSplitSlip(null);
        }}
        orderId={selectedOrderForSplitSlip}
        role="vendor"
      />

      {/* Point 75: In-Browser Direct Thermal Receipt Printer (ESC/POS) Modal */}
      <ThermalReceiptPrinterModal
        isOpen={isThermalModalOpen}
        onClose={() => {
          setIsThermalModalOpen(false);
          setSelectedOrderForThermal(null);
        }}
        orderId={selectedOrderForThermal}
        role="vendor"
      />

      {/* Point 58: Vendor Store Profile Customization Modal */}
      <VendorStoreProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        initialData={vendorData}
        onProfileUpdated={(updated) => {
          setVendorData(prev => ({
            ...prev,
            storeName: updated.storeName || prev.storeName,
            storeSlug: updated.storeSlug || prev.storeSlug,
            storeLogo: updated.storeLogo || prev.storeLogo,
            storeBanner: updated.storeBanner || prev.storeBanner,
            bio: updated.bio || prev.bio,
          }));
          setNotification(`Store profile '${updated.storeName}' updated successfully!`);
        }}
        onOpenPublicPreview={() => {
          setIsProfileModalOpen(false);
          setIsPublicStorePreviewOpen(true);
        }}
      />

      {/* Point 58: Vendor Public Storefront Showcase Modal */}
      <VendorPublicStoreModal
        isOpen={isPublicStorePreviewOpen}
        onClose={() => setIsPublicStorePreviewOpen(false)}
        storeSlugOrId={vendorData.storeSlug}
        initialStoreData={{
          storeName: vendorData.storeName,
          storeSlug: vendorData.storeSlug || 'apex-tech-enterprise',
          storeLogo: vendorData.storeLogo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200',
          storeBanner: vendorData.storeBanner || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200',
          bio: vendorData.bio || 'Premier supplier of audiophile gear, smart home electronics, and next-gen wearable gadgets.',
          rating: vendorData.rating || 4.9,
          products: products,
        }}
        onAddToCart={(p) => {
          setNotification(`Added '${p.title}' to cart!`);
        }}
      />

      {/* Point 59: Vacation Mode Modal */}
      <VacationModeModal
        isOpen={isVacationModalOpen}
        onClose={() => setIsVacationModalOpen(false)}
        currentVacationMode={vendorData.vacationMode}
        onVacationUpdated={(updated) => {
          setVendorData(prev => ({
            ...prev,
            vacationMode: updated,
          }));
          setNotification(
            updated.isVacation
              ? '🌴 Vacation mode enabled. Store ordering has been paused with notice.'
              : '🌴 Vacation mode disabled. Store ordering is now live!'
          );
        }}
      />

      {/* Point 60: Customer Reviews & Reputation Management Modal */}
      <VendorReviewsModal
        isOpen={isReviewsModalOpen}
        onClose={() => setIsReviewsModalOpen(false)}
        onRefreshStoreData={fetchVendorData}
      />

      {/* Point 61: Real-Time Vendor Financial Wallet & Ledger Modal */}
      <VendorWalletLedgerModal
        isOpen={isWalletLedgerModalOpen}
        onClose={() => setIsWalletLedgerModalOpen(false)}
        onOpenWithdrawal={() => setIsPayoutModalOpen(true)}
        onRefreshData={fetchVendorData}
      />
    </div>
  );
};

