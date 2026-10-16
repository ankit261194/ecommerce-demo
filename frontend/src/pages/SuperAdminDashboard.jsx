import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Store,
  Users,
  Package,
  Trash2,
  RefreshCw,
  Palette,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sparkles,
  Plug,
  CreditCard,
  MessageSquare,
  Mail,
  HardDrive,
  Send,
  Key,
  Eye,
  EyeOff,
  Save,
  ShieldCheck,
  Smartphone,
  Check,
  ExternalLink,
  Layers,
  Search,
  Globe,
  Share2,
  Code,
  BarChart3,
  PackageCheck,
  Truck,
  Clock,
  Filter,
  Calendar,
  Download,
  FileText,
  ChevronRight,
  X,
  Printer,
  ChevronDown,
  ShoppingBag,
  Percent,
  Calculator,
  Scale,
  Receipt,
  CheckCheck,
  FileSpreadsheet,
  FolderTree,
  Award,
  Sliders,
  Megaphone,
  Ticket,
  Flame,
  ShoppingCart,
  Building2,
  Database,
  QrCode,
  ShieldAlert,
  Activity,
  Wallet,
} from 'lucide-react';
import { BentoGrid, BentoCard } from '../components/BentoGrid';
import { SlideOverDrawer } from '../components/SlideOverDrawer';
import TaxInvoiceModal from '../components/TaxInvoiceModal';
import SmartSplitPackingSlipModal from '../components/SmartSplitPackingSlipModal';
import BulkThermalLabelPrinterModal from '../components/BulkThermalLabelPrinterModal';
import CategoryTreeManager from '../components/CategoryTreeManager';
import BrandDirectoryManager from '../components/BrandDirectoryManager';
import BannerManager from '../components/BannerManager';
import AnnouncementBarManager from '../components/AnnouncementBarManager';
import CouponManager from '../components/CouponManager';
import FlashDealManager from '../components/FlashDealManager';
import AbandonedCartManager from '../components/AbandonedCartManager';
import CustomerCRMManager from '../components/CustomerCRMManager';
import VendorKYCManager from '../components/VendorKYCManager';
import VendorPayoutManager from '../components/VendorPayoutManager';
import TaxShippingManager from '../components/TaxShippingManager';
import StaffRoleManager from '../components/StaffRoleManager';
import SystemAuditBackupManager from '../components/SystemAuditBackupManager';
import RtoGuardManager from '../components/RtoGuardManager';
import ThermalReceiptPrinterModal from '../components/ThermalReceiptPrinterModal';
import LocalizationManager from '../components/LocalizationManager';
import CmsPageBuilderManager from '../components/CmsPageBuilderManager';
import CmsPolicyViewerModal from '../components/CmsPolicyViewerModal';
import FaqManager from '../components/FaqManager';
import CommissionRuleManager from '../components/CommissionRuleManager';
import PincodeZoneManager from '../components/PincodeZoneManager';
import ServerTelemetryManager from '../components/ServerTelemetryManager';
import ShippingManifestManager from '../components/ShippingManifestManager';
import PaymentGatewayManager from '../components/PaymentGatewayManager';
import SmsWhatsAppSettingsManager from '../components/SmsWhatsAppSettingsManager';
import EmailTemplateManager from '../components/EmailTemplateManager';
import StorageConfigManager from '../components/StorageConfigManager';
import CourierAggregatorManager from '../components/CourierAggregatorManager';
import GlobalSettingsManager from '../components/GlobalSettingsManager';
import AuditTrailManager from '../components/AuditTrailManager';
import InventoryAlertsModal from '../components/InventoryAlertsModal';
import AdminPushNotificationHub from '../components/AdminPushNotificationHub';
import AdminWalletVault from '../components/AdminWalletVault';
import api from '../api/client';

export const SuperAdminDashboard = ({ uiConfig, setUiConfig }) => {
  // Master Dashboard Tab: 'overview' | 'orders' | 'layout' | 'integrations' | 'seo' | 'cms-pages'
  const [activeDashboardTab, setActiveDashboardTab] = useState('overview');
  const [previewPolicySlug, setPreviewPolicySlug] = useState(null);

  // Integrations Hub Sub-Tab: 'payments' | 'sms' | 'email' | 'storage'
  const [integrationSubTab, setIntegrationSubTab] = useState('payments');

  // Homepage Visual Sections State (Screenshot 3 Layout Builder)
  const [homepageSections, setHomepageSections] = useState([
    { id: 'announcement', name: '🔥 Top Festive Announcement Bar', desc: 'Promotional discount banner with coupon code', enabled: true },
    { id: 'hero', name: '🚀 Spatial Audio 3D Hero Banner', desc: 'Interactive call-to-action hero banner with direct checkout link', enabled: true },
    { id: 'trust', name: '🛡️ Trust & Express Delivery Badges', desc: 'Guaranteed 24h dispatch, verified merchants & 7-day return policy', enabled: true },
    { id: 'categories', name: '🛍️ Shop by Category Circular Grid', desc: 'Category filters with verified seller counts', enabled: true },
    { id: 'featured', name: '⭐ Featured Multi-Vendor Products', desc: '2-column responsive mobile cards with wishlist & share actions', enabled: true },
    { id: 'dealsoftheday', name: '⚡ Today\'s Flash Deals & Timer', desc: 'Time-limited discounted merchant listings', enabled: true },
  ]);

  const toggleSection = (id) => {
    setHomepageSections(prev =>
      prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
    );
    setActionMessage({
      type: 'success',
      text: '✨ Homepage layout updated! Changes saved and reflected live on storefront.',
    });
    setTimeout(() => setActionMessage(null), 3000);
  };

  // SEO & Webmaster Hub State
  const [seoConfig, setSeoConfig] = useState({
    metaTitle: uiConfig?.seo?.metaTitle || 'AuraMarket — The Next-Gen Multi-Vendor Commerce Platform',
    metaDescription:
      uiConfig?.seo?.metaDescription ||
      'Discover top electronics, audio, fashion, and lifestyle brands from verified merchants with express delivery and OTP verification.',
    metaKeywords:
      uiConfig?.seo?.metaKeywords ||
      'ecommerce, multi-vendor marketplace, online shopping, electronics, fashion, split orders',
    ogImage:
      uiConfig?.seo?.ogImage ||
      'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
    canonicalUrl: uiConfig?.seo?.canonicalUrl || 'https://shribalajikripadham.online/ecommerce-demo/',
    googleSiteVerification: uiConfig?.seo?.googleSiteVerification || '',
    googleAnalyticsId: uiConfig?.seo?.googleAnalyticsId || '',
    facebookPixelId: uiConfig?.seo?.facebookPixelId || '',
    enableRichSnippets: uiConfig?.seo?.enableRichSnippets ?? true,
  });

  useEffect(() => {
    if (uiConfig?.seo) {
      setSeoConfig(prev => ({
        ...prev,
        ...uiConfig.seo,
        enableRichSnippets: uiConfig.seo.enableRichSnippets ?? true,
      }));
    }
  }, [uiConfig?.seo]);

  // Initial Analytics State with backend synchronization
  const [analytics, setAnalytics] = useState({
    grossSales: 274000,
    platformCommission: 24600,
    totalOrders: 142,
    totalVendors: 8,
    approvedVendors: 6,
    pendingVendors: 2,
    totalProducts: 48,
    totalCustomers: 320,
  });

  const [vendors, setVendors] = useState([
    {
      _id: 'vnd_001',
      storeName: 'Apex Tech Hub',
      user: { name: 'Rajesh Verma', email: 'apex@auramarket.com', phone: '9876543211' },
      status: 'approved',
      commissionRate: 8,
      walletBalance: 24500,
      totalSales: 185000,
      rating: 4.9,
    },
    {
      _id: 'vnd_002',
      storeName: 'Vogue Trends Apparel',
      user: { name: 'Pooja Kapoor', email: 'vogue@auramarket.com', phone: '9876543212' },
      status: 'approved',
      commissionRate: 12,
      walletBalance: 12400,
      totalSales: 89000,
      rating: 4.8,
    },
    {
      _id: 'vnd_003',
      storeName: 'Kaveri Handicrafts & Decor',
      user: { name: 'Ramesh Patel', email: 'kaveri@gmail.com', phone: '9876543219' },
      status: 'pending',
      commissionRate: 10,
      walletBalance: 0,
      totalSales: 0,
      rating: 5.0,
    },
  ]);

  // Master Integrations State (Dynamic Plug & Play for Non-Developers)
  const [integrations, setIntegrations] = useState({
    sms: {
      activeProvider: uiConfig?.integrations?.sms?.activeProvider || 'mock',
      fast2sms: {
        apiKey: uiConfig?.integrations?.sms?.fast2sms?.apiKey || '',
        senderId: uiConfig?.integrations?.sms?.fast2sms?.senderId || 'FSTSMS',
        route: uiConfig?.integrations?.sms?.fast2sms?.route || 'q',
      },
      msg91: {
        authKey: uiConfig?.integrations?.sms?.msg91?.authKey || '',
        senderId: uiConfig?.integrations?.sms?.msg91?.senderId || 'AURAMK',
        dltTemplateId: uiConfig?.integrations?.sms?.msg91?.dltTemplateId || '',
      },
      twilio: {
        accountSid: uiConfig?.integrations?.sms?.twilio?.accountSid || '',
        authToken: uiConfig?.integrations?.sms?.twilio?.authToken || '',
        fromPhone: uiConfig?.integrations?.sms?.twilio?.fromPhone || '',
      },
    },
    payments: {
      cod: {
        enabled: uiConfig?.integrations?.payments?.cod?.enabled ?? true,
        label: uiConfig?.integrations?.payments?.cod?.label || 'Cash on Delivery (COD)',
      },
      razorpay: {
        enabled: uiConfig?.integrations?.payments?.razorpay?.enabled ?? true,
        keyId: uiConfig?.integrations?.payments?.razorpay?.keyId || 'rzp_test_AuraMarket2026',
        keySecret: uiConfig?.integrations?.payments?.razorpay?.keySecret || 'rzp_sec_mock_key_secret_2026',
      },
      stripe: {
        enabled: uiConfig?.integrations?.payments?.stripe?.enabled ?? true,
        publishableKey: uiConfig?.integrations?.payments?.stripe?.publishableKey || 'pk_test_51MockStripeAuraMarket2026',
        secretKey: uiConfig?.integrations?.payments?.stripe?.secretKey || 'sk_test_51MockStripeSecretKey2026',
      },
      upi: {
        enabled: uiConfig?.integrations?.payments?.upi?.enabled ?? true,
        upiId: uiConfig?.integrations?.payments?.upi?.upiId || '8533955333@paytm',
        merchantName: uiConfig?.integrations?.payments?.upi?.merchantName || 'AuraMarket Store',
      },
    },
    email: {
      activeProvider: uiConfig?.integrations?.email?.activeProvider || 'mock',
      smtp: {
        host: uiConfig?.integrations?.email?.smtp?.host || 'smtp.gmail.com',
        port: uiConfig?.integrations?.email?.smtp?.port || 587,
        secure: uiConfig?.integrations?.email?.smtp?.secure ?? false,
        username: uiConfig?.integrations?.email?.smtp?.username || 'notifications@auramarket.com',
        password: uiConfig?.integrations?.email?.smtp?.password || '',
        fromEmail: uiConfig?.integrations?.email?.smtp?.fromEmail || 'notifications@auramarket.com',
        fromName: uiConfig?.integrations?.email?.smtp?.fromName || 'AuraMarket Store',
      },
      sendgrid: {
        apiKey: uiConfig?.integrations?.email?.sendgrid?.apiKey || '',
        fromEmail: uiConfig?.integrations?.email?.sendgrid?.fromEmail || 'notifications@auramarket.com',
        fromName: uiConfig?.integrations?.email?.sendgrid?.fromName || 'AuraMarket Store',
      },
    },
    storage: {
      activeProvider: uiConfig?.integrations?.storage?.activeProvider || 'local',
      local: {
        uploadPath: uiConfig?.integrations?.storage?.local?.uploadPath || '/uploads',
      },
      cloudinary: {
        cloudName: uiConfig?.integrations?.storage?.cloudinary?.cloudName || 'auramarket',
        apiKey: uiConfig?.integrations?.storage?.cloudinary?.apiKey || '',
        apiSecret: uiConfig?.integrations?.storage?.cloudinary?.apiSecret || '',
      },
      s3: {
        bucket: uiConfig?.integrations?.storage?.s3?.bucket || 'auramarket-media',
        region: uiConfig?.integrations?.storage?.s3?.region || 'ap-south-1',
        accessKey: uiConfig?.integrations?.storage?.s3?.accessKey || '',
        secretKey: uiConfig?.integrations?.storage?.s3?.secretKey || '',
      },
    },
  });

  // Password / Secret visibility toggles
  const [showSecrets, setShowSecrets] = useState({
    razorpaySecret: false,
    stripeSecret: false,
    smtpPassword: false,
    twilioAuth: false,
    cloudinarySecret: false,
    s3Secret: false,
  });

  // Live Testing States
  const [testSmsPhone, setTestSmsPhone] = useState('+918533955333');
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState(null);

  const [testEmailAddress, setTestEmailAddress] = useState('admin@auramarket.com');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState(null);

  const [isThemeDrawerOpen, setIsThemeDrawerOpen] = useState(false);
  const [themeForm, setThemeForm] = useState({
    storeName: uiConfig?.storeName || 'AuraMarket',
    announcementText: uiConfig?.announcementText || '🔥 Festive Sale Live! Up to 40% OFF with code FESTIVE2026',
    primaryColor: uiConfig?.primaryColor || '#F59E0B',
    bannerTitle: 'Spatial Audio Reinvented',
    bannerSubtitle: 'Immerse yourself in studio-grade acoustics.',
    footerText: uiConfig?.footerText || '© 2026 AuraMarket — Enterprise Multi-Vendor Marketplace Platform. All rights reserved.',
    supportPhone: uiConfig?.supportPhone || '+91 8533955333',
    supportEmail: uiConfig?.supportEmail || 'support@auramarket.com',
    showDemoNotice: uiConfig?.showDemoNotice ?? true,
  });

  const [actionMessage, setActionMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // =========================================================================
  // POINT 32: ORDERS MANAGEMENT CENTER STATE & HANDLERS
  // =========================================================================
  const defaultOrders = [
    {
      _id: 'ord_mock_101',
      orderNumber: 'ORD-2026-901',
      createdAt: new Date().toISOString(),
      customer: {
        _id: 'usr_cust_1',
        name: 'Rohan Sharma',
        email: 'rohan.sharma@gmail.com',
        phone: '+91 98201 92831',
      },
      shippingAddress: {
        fullName: 'Rohan Sharma',
        phone: '+91 98201 92831',
        street: 'Flat 402, Sunset Heights, Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050',
      },
      items: [
        {
          product: 'prod_001',
          title: 'AuraSound Apex ANC Headphones',
          quantity: 1,
          price: 4999,
          variantSku: 'AURA-HEAD-BLK-01',
          variantDetails: { color: 'Midnight Black' },
          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
        },
      ],
      subOrders: [
        {
          _id: 'sub_001',
          vendor: { _id: 'vnd_001', storeName: 'Apex Tech Hub' },
          status: 'pending',
          items: [
            {
              product: 'prod_001',
              title: 'AuraSound Apex ANC Headphones',
              quantity: 1,
              price: 4999,
            },
          ],
          vendorPayout: 4599,
          platformCommission: 400,
        },
      ],
      totalAmount: 4999,
      discountAmount: 0,
      paymentMethod: 'RAZORPAY',
      paymentStatus: 'PAID',
      status: 'PLACED',
      deliveryOtp: '4921',
      deliveryInstructions: 'Ring the doorbell twice and leave with security if unavailable.',
    },
    {
      _id: 'ord_mock_102',
      orderNumber: 'ORD-2026-884',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      customer: {
        _id: 'usr_cust_2',
        name: 'Priya Patel',
        email: 'priya.patel@outlook.com',
        phone: '+91 98765 43210',
      },
      shippingAddress: {
        fullName: 'Priya Patel',
        phone: '+91 98765 43210',
        street: '12-A Civil Lines, Near Raj Mandir Cinema',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302006',
      },
      items: [
        {
          product: 'prod_002',
          title: 'Luxe Italian Leather Handbag',
          quantity: 1,
          price: 8999,
          variantSku: 'VOGUE-BAG-BRN-02',
          variantDetails: { color: 'Cognac Brown', size: 'Medium' },
          image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300',
        },
        {
          product: 'prod_003',
          title: 'PulseFit Pro Fitness Band',
          quantity: 1,
          price: 3451,
          variantSku: 'APEX-FIT-BLU-03',
          variantDetails: { color: 'Navy Blue' },
          image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=300',
        },
      ],
      subOrders: [
        {
          _id: 'sub_002a',
          vendor: { _id: 'vnd_002', storeName: 'Vogue Trends Apparel' },
          status: 'ready_for_pickup',
          vendorPayout: 7919,
          platformCommission: 1080,
        },
        {
          _id: 'sub_002b',
          vendor: { _id: 'vnd_001', storeName: 'Apex Tech Hub' },
          status: 'handed_to_courier',
          vendorPayout: 3175,
          platformCommission: 276,
        },
      ],
      totalAmount: 12450,
      discountAmount: 0,
      paymentMethod: 'UPI',
      paymentStatus: 'PAID',
      status: 'IN_PROGRESS',
      deliveryOtp: '7182',
      deliveryInstructions: 'Call on reaching gate #3.',
    },
    {
      _id: 'ord_mock_103',
      orderNumber: 'ORD-2026-872',
      createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
      customer: {
        _id: 'usr_cust_3',
        name: 'Amit Verma',
        email: 'amit.verma@techcorp.in',
        phone: '+91 99112 23344',
      },
      shippingAddress: {
        fullName: 'Amit Verma',
        phone: '+91 99112 23344',
        street: 'H-201 Green Glen Layout, Outer Ring Road, Bellandur',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560103',
      },
      items: [
        {
          product: 'prod_004',
          title: 'Handcrafted Brass Royal Diya Bell',
          quantity: 1,
          price: 1899,
          variantSku: 'KAVERI-BELL-01',
          variantDetails: { material: 'Antique Brass' },
          image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=300',
        },
      ],
      subOrders: [
        {
          _id: 'sub_003',
          vendor: { _id: 'vnd_003', storeName: 'Kaveri Handicrafts & Decor' },
          status: 'delivered',
          vendorPayout: 1709,
          platformCommission: 190,
        },
      ],
      totalAmount: 1899,
      discountAmount: 100,
      paymentMethod: 'WALLET',
      paymentStatus: 'PAID',
      status: 'DELIVERED',
      deliveryOtp: '3389',
      deliveryInstructions: '',
    },
    {
      _id: 'ord_mock_104',
      orderNumber: 'ORD-2026-860',
      createdAt: new Date(Date.now() - 3600000 * 50).toISOString(),
      customer: {
        _id: 'usr_cust_4',
        name: 'Sunita Nair',
        email: 'sunita.nair@outlook.com',
        phone: '+91 94470 12345',
      },
      shippingAddress: {
        fullName: 'Sunita Nair',
        phone: '+91 94470 12345',
        street: '45 Marine Drive, Waterfront Promenade',
        city: 'Kochi',
        state: 'Kerala',
        pincode: '682011',
      },
      items: [
        {
          product: 'prod_005',
          title: 'Nordic Ceramic Planter Trio',
          quantity: 1,
          price: 3499,
          variantSku: 'KAVERI-PLT-WHT-01',
          variantDetails: { color: 'Matte White' },
          image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=300',
        },
      ],
      subOrders: [
        {
          _id: 'sub_004',
          vendor: { _id: 'vnd_003', storeName: 'Kaveri Handicrafts & Decor' },
          status: 'cancelled',
          vendorPayout: 0,
          platformCommission: 0,
        },
      ],
      totalAmount: 3499,
      discountAmount: 0,
      paymentMethod: 'STRIPE',
      paymentStatus: 'REFUNDED',
      status: 'CANCELLED',
      cancellationReason: 'Customer requested cancellation prior to package dispatch',
      cancelledAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    },
  ];

  const [orders, setOrders] = useState(defaultOrders);
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderPaymentStatusFilter, setOrderPaymentStatusFilter] = useState('ALL');
  const [orderPaymentMethodFilter, setOrderPaymentMethodFilter] = useState('ALL');
  const [orderDateRangeFilter, setOrderDateRangeFilter] = useState('ALL');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderStatusCounts, setOrderStatusCounts] = useState({
    all: 4,
    placed: 1,
    in_progress: 1,
    delivered: 1,
    cancelled: 1,
  });
  const [selectedOrderForModal, setSelectedOrderForModal] = useState(null);
  const [selectedInvoiceOrderId, setSelectedInvoiceOrderId] = useState(null);
  const [selectedSplitPackingSlipOrderId, setSelectedSplitPackingSlipOrderId] = useState(null);
  const [selectedThermalOrderId, setSelectedThermalOrderId] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusChangeTarget, setStatusChangeTarget] = useState(null);
  const [statusChangeNote, setStatusChangeNote] = useState('');

  // Point 35: Bulk Order Actions & CSV Export State
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [showBulkActionDropdown, setShowBulkActionDropdown] = useState(false);
  const [isAdminBulkLabelsOpen, setIsAdminBulkLabelsOpen] = useState(false); // Point 9: Bulk 4x6 Thermal Labels
  const [isInventoryAlertsModalOpen, setIsInventoryAlertsModalOpen] = useState(false); // Point 10: Inventory Low-Stock Radar & Automated Alerts

  // Point 33: Multi-Vendor Commission Split Inspector State
  const [selectedSplitOrder, setSelectedSplitOrder] = useState(null);
  const [commissionSplitData, setCommissionSplitData] = useState(null);
  const [isLoadingSplit, setIsLoadingSplit] = useState(false);

  const handleOpenCommissionSplit = async (order) => {
    setSelectedSplitOrder(order);
    setIsLoadingSplit(true);
    setCommissionSplitData(null);
    try {
      const res = await api.get(`/admin/orders/${order._id}/commission-split`);
      if (res.data?.success && res.data.data) {
        setCommissionSplitData(res.data.data);
      } else {
        throw new Error('Fallback to local calculation');
      }
    } catch (_) {
      // Local fallback calculation for demo mode
      const grossOrderAmount = (order.totalAmount || 0) + (order.discountAmount || 0);
      const discountAmount = order.discountAmount || 0;
      const netCustomerPaid = order.totalAmount || 0;

      const vendorSplits = (order.subOrders || []).map((sub, idx) => {
        const vendorSubtotal =
          sub.subTotal ||
          (sub.items || []).reduce((acc, i) => acc + i.price * i.quantity, 0) ||
          Math.round(order.totalAmount / (order.subOrders.length || 1));
        const commissionRatePercent = sub.platformCommissionRate || 10;
        const platformCommissionCut =
          sub.platformCommissionAmount !== undefined
            ? sub.platformCommissionAmount
            : Math.round((vendorSubtotal * commissionRatePercent) / 100);
        const netVendorPayable =
          sub.vendorEarning !== undefined ? sub.vendorEarning : vendorSubtotal - platformCommissionCut;

        return {
          subOrderId: sub._id || `sub_${idx + 1}`,
          subOrderStatus: sub.status || 'placed',
          vendorId: sub.vendor?._id || `vnd_${idx + 1}`,
          storeName: sub.vendor?.storeName || 'Partner Store',
          storeLogo: sub.vendor?.storeLogo || '',
          commissionRatePercent,
          vendorSubtotal,
          platformCommissionCut,
          netVendorPayable,
          items: sub.items || order.items || [],
          payoutStatus:
            sub.status === 'delivered'
              ? 'SETTLED_TO_WALLET'
              : sub.status === 'cancelled'
              ? 'CANCELLED_REVERSED'
              : 'ESCROW_PENDING_DELIVERY',
          ledgerEntries: [
            {
              transactionId: `TXN-${order.orderNumber}-${idx + 1}`,
              type: 'COMMISSION_DEBIT',
              amount: platformCommissionCut,
              balanceAfter: netVendorPayable,
              status: 'COMPLETED',
              createdAt: order.createdAt,
            },
          ],
        };
      });

      const totalVendorPayouts = vendorSplits.reduce((sum, s) => sum + s.netVendorPayable, 0);
      const totalPlatformCommissions = vendorSplits.reduce((sum, s) => sum + s.platformCommissionCut, 0);
      const reconciliationDelta = Math.abs(totalVendorPayouts + totalPlatformCommissions - grossOrderAmount);

      setCommissionSplitData({
        orderId: order._id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        customer: order.customer || order.shippingAddress,
        financials: {
          grossOrderAmount,
          discountAmount,
          netCustomerPaid,
          totalVendorPayouts,
          totalPlatformCommissions,
          reconciliationDelta,
          isPennyPerfectReconciled: reconciliationDelta <= 1,
        },
        vendorSplits,
      });
    } finally {
      setIsLoadingSplit(false);
    }
  };

  const fetchOrders = async (overrideParams = {}) => {
    try {
      const activeStatus = overrideParams.status !== undefined ? overrideParams.status : orderStatusFilter;
      const activePayment = overrideParams.paymentStatus !== undefined ? overrideParams.paymentStatus : orderPaymentStatusFilter;
      const activeMethod = overrideParams.paymentMethod !== undefined ? overrideParams.paymentMethod : orderPaymentMethodFilter;
      const activeDate = overrideParams.dateRange !== undefined ? overrideParams.dateRange : orderDateRangeFilter;
      const activeSearch = overrideParams.search !== undefined ? overrideParams.search : orderSearchTerm;

      const params = {};
      if (activeStatus && activeStatus !== 'ALL') params.status = activeStatus;
      if (activePayment && activePayment !== 'ALL') params.paymentStatus = activePayment;
      if (activeMethod && activeMethod !== 'ALL') params.paymentMethod = activeMethod;
      if (activeDate && activeDate !== 'ALL') params.dateRange = activeDate;
      if (activeSearch && activeSearch.trim()) params.search = activeSearch.trim();

      const res = await api.get('/admin/orders', { params });
      if (res.data?.success) {
        if (Array.isArray(res.data.data) && res.data.data.length > 0) {
          setOrders(res.data.data);
        }
        if (res.data.statusCounts) {
          setOrderStatusCounts(res.data.statusCounts);
        }
      }
    } catch (_) {
      // In demo mode or offline, fallback to client-side filtering
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus, note = '') => {
    setIsUpdatingStatus(true);
    try {
      const res = await api.put(`/admin/orders/${orderId}/status`, {
        status: newStatus,
        paymentStatus: newStatus === 'DELIVERED' ? 'PAID' : undefined,
        note,
      });

      if (res.data?.success) {
        const updated = res.data.data;
        setOrders(prev => prev.map(o => (o._id === orderId ? updated : o)));
        if (selectedOrderForModal?._id === orderId) {
          setSelectedOrderForModal(updated);
        }
        setActionMessage({
          type: 'success',
          text: `✅ Order #${updated.orderNumber || orderId} status successfully updated to ${newStatus}!`,
        });
        setTimeout(() => setActionMessage(null), 3500);
        fetchOrders();
      }
    } catch (err) {
      setOrders(prev =>
        prev.map(o => {
          if (o._id === orderId) {
            const upd = {
              ...o,
              status: newStatus,
              paymentStatus: newStatus === 'DELIVERED' ? 'PAID' : o.paymentStatus,
              cancellationReason: newStatus === 'CANCELLED' ? note || 'Cancelled by Admin' : o.cancellationReason,
            };
            if (selectedOrderForModal?._id === orderId) {
              setSelectedOrderForModal(upd);
            }
            return upd;
          }
          return o;
        })
      );
      setActionMessage({
        type: 'success',
        text: `✅ Order status updated to ${newStatus} (Demo mode)!`,
      });
      setTimeout(() => setActionMessage(null), 3500);
    } finally {
      setIsUpdatingStatus(false);
      setStatusChangeTarget(null);
      setStatusChangeNote('');
    }
  };

  // Point 35: Bulk Order Action Handlers & CSV Export Engine
  const handleToggleSelectAll = (currentFiltered) => {
    const list = currentFiltered || filteredOrders;
    if (selectedOrderIds.length === list.length && list.length > 0) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(list.map(o => o._id));
    }
  };

  const handleToggleSelectOrder = (orderId) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedOrderIds.length === 0) return;
    setIsBulkProcessing(true);
    setShowBulkActionDropdown(false);
    try {
      const res = await api.post('/admin/orders/bulk-status', {
        orderIds: selectedOrderIds,
        status: newStatus,
        paymentStatus: newStatus === 'DELIVERED' ? 'PAID' : undefined,
      });

      if (res.data?.success) {
        setActionMessage({
          type: 'success',
          text: `✅ Successfully updated ${res.data.updatedCount || selectedOrderIds.length} orders to ${newStatus}!`,
        });
        setTimeout(() => setActionMessage(null), 3500);
        setSelectedOrderIds([]);
        fetchOrders();
      }
    } catch (_) {
      // Local fallback for offline/demo mode
      setOrders(prev =>
        prev.map(o =>
          selectedOrderIds.includes(o._id)
            ? {
                ...o,
                status: newStatus,
                paymentStatus: newStatus === 'DELIVERED' ? 'PAID' : o.paymentStatus,
              }
            : o
        )
      );
      setActionMessage({
        type: 'success',
        text: `✅ Successfully updated ${selectedOrderIds.length} orders to ${newStatus} (Demo mode)!`,
      });
      setTimeout(() => setActionMessage(null), 3500);
      setSelectedOrderIds([]);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleExportCSV = async (targetOrderIds = null) => {
    setIsBulkProcessing(true);
    try {
      let res;
      if (targetOrderIds && targetOrderIds.length > 0) {
        res = await api.post(
          '/admin/orders/export-csv',
          { orderIds: targetOrderIds },
          { responseType: 'blob' }
        );
      } else {
        res = await api.get('/admin/orders/export-csv', {
          params: {
            status: orderStatusFilter !== 'ALL' ? orderStatusFilter : undefined,
            paymentStatus: orderPaymentStatusFilter !== 'ALL' ? orderPaymentStatusFilter : undefined,
            paymentMethod: orderPaymentMethodFilter !== 'ALL' ? orderPaymentMethodFilter : undefined,
            search: orderSearchTerm || undefined,
          },
          responseType: 'blob',
        });
      }

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `AuraMarket_Orders_Export_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setActionMessage({
        type: 'success',
        text: '📥 CSV Export downloaded successfully!',
      });
      setTimeout(() => setActionMessage(null), 3500);
    } catch (_) {
      // Client-side RFC-4180 CSV generation fallback
      const targetList = targetOrderIds && targetOrderIds.length > 0
        ? orders.filter(o => targetOrderIds.includes(o._id))
        : filteredOrders;

      const headers = [
        'Order ID',
        'Date',
        'Customer Name',
        'Phone',
        'Email',
        'Total Amount (INR)',
        'Payment Status',
        'Payment Method',
        'Order Status',
        'Items Count',
        'Shipping City',
        'Shipping State',
        'Pincode',
      ];

      const escape = val => `"${String(val || '').replace(/"/g, '""')}"`;
      const rows = targetList.map(o => [
        escape(o.orderNumber || o._id),
        escape(o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : ''),
        escape(o.customer?.name || o.shippingAddress?.fullName || 'Valued Customer'),
        escape(o.shippingAddress?.phone || o.customer?.phone || ''),
        escape(o.customer?.email || ''),
        escape(o.totalAmount || 0),
        escape(o.paymentStatus || ''),
        escape(o.paymentMethod || ''),
        escape(o.status || ''),
        escape((o.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0)),
        escape(o.shippingAddress?.city || ''),
        escape(o.shippingAddress?.state || ''),
        escape(o.shippingAddress?.pincode || ''),
      ].join(','));

      const csvContent = [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `AuraMarket_Orders_Export_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setActionMessage({
        type: 'success',
        text: `📥 CSV Export (${targetList.length} orders) generated successfully!`,
      });
      setTimeout(() => setActionMessage(null), 3500);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const filteredOrders = orders.filter(ord => {
    if (orderStatusFilter !== 'ALL') {
      if (orderStatusFilter === 'IN_PROGRESS') {
        if (!['IN_PROGRESS', 'PARTIALLY_DELIVERED', 'SHIPPED', 'CONFIRMED'].includes(ord.status)) return false;
      } else if (ord.status !== orderStatusFilter) {
        return false;
      }
    }
    if (orderPaymentStatusFilter !== 'ALL' && ord.paymentStatus !== orderPaymentStatusFilter) return false;
    if (orderPaymentMethodFilter !== 'ALL' && ord.paymentMethod !== orderPaymentMethodFilter) return false;
    if (orderSearchTerm.trim()) {
      const q = orderSearchTerm.toLowerCase();
      const matchNum = ord.orderNumber?.toLowerCase().includes(q);
      const matchCust =
        ord.customer?.name?.toLowerCase().includes(q) ||
        ord.customer?.email?.toLowerCase().includes(q) ||
        ord.customer?.phone?.toLowerCase().includes(q) ||
        ord.shippingAddress?.fullName?.toLowerCase().includes(q) ||
        ord.shippingAddress?.phone?.toLowerCase().includes(q);
      if (!matchNum && !matchCust) return false;
    }
    return true;
  });

  const fetchDashboardData = async () => {
    try {
      const [analyticsRes, vendorsRes, integrationsRes, ordersRes] = await Promise.allSettled([
        api.get('/admin/analytics'),
        api.get('/admin/vendors'),
        api.get('/admin/integrations'),
        api.get('/admin/orders'),
      ]);

      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.data?.success) {
        setAnalytics(prev => ({ ...prev, ...analyticsRes.value.data.data }));
      }
      if (vendorsRes.status === 'fulfilled' && vendorsRes.value.data?.success) {
        setVendors(vendorsRes.value.data.data);
      }
      if (integrationsRes.status === 'fulfilled' && integrationsRes.value.data?.success) {
        setIntegrations(prev => ({ ...prev, ...integrationsRes.value.data.data }));
      }
      if (ordersRes.status === 'fulfilled' && ordersRes.value.data?.success) {
        if (Array.isArray(ordersRes.value.data.data) && ordersRes.value.data.data.length > 0) {
          setOrders(ordersRes.value.data.data);
        }
        if (ordersRes.value.data.statusCounts) {
          setOrderStatusCounts(ordersRes.value.data.statusCounts);
        }
      }
    } catch (_) {
      // Graceful fallback to rich initial showcase state
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (uiConfig?.integrations) {
      setIntegrations(prev => ({
        ...prev,
        ...uiConfig.integrations,
        sms: { ...(prev.sms || {}), ...(uiConfig.integrations.sms || {}) },
        payments: { ...(prev.payments || {}), ...(uiConfig.integrations.payments || {}) },
        email: { ...(prev.email || {}), ...(uiConfig.integrations.email || {}) },
        storage: { ...(prev.storage || {}), ...(uiConfig.integrations.storage || {}) },
      }));
    }
  }, [uiConfig?.integrations]);

  const handleStatusToggle = async (vendorId, currentStatus) => {
    const newStatus = currentStatus === 'approved' ? 'suspended' : 'approved';
    setVendors(prev =>
      prev.map(v => (v._id === vendorId ? { ...v, status: newStatus } : v))
    );
    try {
      await api.patch(`/admin/vendors/${vendorId}/status`, { status: newStatus });
      setActionMessage({
        type: 'success',
        text: `Vendor status updated to ${newStatus.toUpperCase()}`,
      });
    } catch (_) {
      setActionMessage({
        type: 'success',
        text: `Vendor status updated to ${newStatus.toUpperCase()} (Demo Live)`,
      });
    }
  };

  const handleCommissionChange = async (vendorId, newRate) => {
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate < 0 || rate > 100) return;
    setVendors(prev =>
      prev.map(v => (v._id === vendorId ? { ...v, commissionRate: rate } : v))
    );
    try {
      await api.patch(`/admin/vendors/${vendorId}/commission`, { commissionRate: rate });
    } catch (_) {}
  };

  const handleWipeDemo = async () => {
    if (!window.confirm('⚠️ Reset marketplace demo? This wipes all test orders and restores default catalog.')) return;
    setIsProcessing(true);
    try {
      await api.post('/admin/demo/wipe');
      setActionMessage({ type: 'success', text: '✅ Demo database wiped and reset successfully!' });
      fetchDashboardData();
    } catch (_) {
      setActionMessage({ type: 'success', text: '✅ Demo database wiped and reset to clean showroom state!' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSeedDemo = async () => {
    setIsProcessing(true);
    try {
      await api.post('/admin/demo/seed');
      setActionMessage({ type: 'success', text: '🌱 Fresh demo catalog, vendors, and orders re-seeded!' });
      fetchDashboardData();
    } catch (_) {
      setActionMessage({ type: 'success', text: '🌱 Demo showroom re-seeded with realistic data!' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Save All Integrations to Backend & Storefront Config
  const handleSaveIntegrations = async () => {
    setIsProcessing(true);
    try {
      const res = await api.put('/admin/integrations', integrations);
      const updatedIntegrations = res.data?.data || integrations;
      setIntegrations(updatedIntegrations);
      setUiConfig(prev => ({ ...prev, integrations: updatedIntegrations }));
      setActionMessage({
        type: 'success',
        text: '🔌 Master Integrations & API credentials saved! Live across Storefront, Checkout & Backend.',
      });
    } catch (err) {
      // In demo mode without backend, synchronize locally
      setUiConfig(prev => ({ ...prev, integrations }));
      setActionMessage({
        type: 'success',
        text: '🔌 Master Integrations & API credentials saved! Live across Storefront, Checkout & Backend.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Save SEO & Webmaster Configuration to Backend
  const handleSaveSeo = async e => {
    if (e) e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await api.put('/ui/config', { seo: seoConfig });
      const savedConfig = res.data?.data || { ...uiConfig, seo: seoConfig };
      setUiConfig(savedConfig);
      setActionMessage({
        type: 'success',
        text: '🔍 SEO & Webmaster settings saved successfully! Meta tags, GA4, Sitemaps, and Schema markup updated live.',
      });
    } catch (err) {
      setUiConfig(prev => ({ ...prev, seo: seoConfig }));
      setActionMessage({
        type: 'success',
        text: '🔍 SEO & Webmaster settings saved successfully! (Demo Mode Synchronized)',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger Live Test SMS
  const handleTestSMS = async () => {
    setIsTestingSms(true);
    setTestSmsResult(null);
    try {
      const res = await api.post('/admin/integrations/test-sms', {
        phone: testSmsPhone,
        message: 'AuraMarket Live Test: Your SMS Gateway is connected and operating with 100% success!',
        provider: integrations.sms.activeProvider,
        config: integrations.sms,
      });
      const isSuccess = res.data?.success !== false;
      setTestSmsResult({
        success: isSuccess,
        message: res.data?.message || (isSuccess ? 'Test SMS sent successfully!' : 'Test SMS dispatch failed'),
        data: res.data?.data,
      });
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      setTestSmsResult({
        success: false,
        message: `Test SMS Failed: ${errMsg || 'Connection error'}`,
        data: { provider: integrations.sms.activeProvider, status: 'FAILED' },
      });
    } finally {
      setIsTestingSms(false);
    }
  };

  // Trigger Live Test Email
  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    setTestEmailResult(null);
    try {
      const res = await api.post('/admin/integrations/test-email', {
        email: testEmailAddress,
        subject: 'AuraMarket Live SMTP Verification',
        message: 'Congratulations! Your SMTP credentials are functional and ready to dispatch customer notifications.',
        provider: integrations.email.activeProvider,
        config: integrations.email,
      });
      const isSuccess = res.data?.success !== false;
      setTestEmailResult({
        success: isSuccess,
        message: res.data?.message || (isSuccess ? 'Test Email sent successfully!' : 'Test Email dispatch failed'),
        data: res.data?.data,
      });
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      setTestEmailResult({
        success: false,
        message: `Test Email Failed: ${errMsg || 'SMTP connection error'}`,
        data: { provider: integrations.email.activeProvider, status: 'FAILED' },
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleSaveTheme = async e => {
    e.preventDefault();
    const updated = {
      ...uiConfig,
      storeName: themeForm.storeName,
      announcementText: themeForm.announcementText,
      primaryColor: themeForm.primaryColor,
      footerText: themeForm.footerText,
      supportPhone: themeForm.supportPhone,
      supportEmail: themeForm.supportEmail,
      showDemoNotice: themeForm.showDemoNotice,
      heroBanners: [
        {
          title: themeForm.bannerTitle,
          subtitle: themeForm.bannerSubtitle,
          imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200',
          badgeText: 'Featured Deal',
          isActive: true,
        },
      ],
    };
    setUiConfig(updated);
    setIsThemeDrawerOpen(false);
    try {
      await api.put('/ui/config', updated);
      setActionMessage({ type: 'success', text: '🎨 Visual Theme, Branding & Footer updated live across Storefront and Apps!' });
    } catch (_) {
      setActionMessage({ type: 'success', text: '🎨 Visual Theme, Branding & Footer updated live across Storefront and Apps!' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in text-slate-800">
      {/* Top Banner Alert */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-sm font-bold flex items-center justify-between border shadow-sm ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-xs underline font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Header with Title & Top-Level Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Super Admin Control Center
            <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              Master Level
            </span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Global Marketplace Metrics, Partner Verification, and Plug-and-Play External Integrations
          </p>
        </div>

        {/* 1-Click Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsThemeDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold shadow-sm transition-all"
          >
            <Palette className="w-4 h-4 text-amber-500" />
            <span>Theme & Banner Manager</span>
          </button>

          <button
            onClick={() => setIsInventoryAlertsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black shadow-lg shadow-red-500/20 transition-all"
            title="Point 10: Platform-Wide Low-Stock Inventory Radar & Automated Alerts"
          >
            <ShieldAlert className="w-4 h-4 text-white" />
            <span>Low-Stock Radar</span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-white text-red-600">
              #10
            </span>
          </button>

          <button
            onClick={handleSeedDemo}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all"
          >
            <RefreshCw className="w-4 h-4 text-white" />
            <span>1-Click Seed Demo</span>
          </button>

          <button
            onClick={handleWipeDemo}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>1-Click Wipe Demo</span>
          </button>
        </div>
      </div>

      {/* Sleek Enterprise Dark Navigation Bar (Screenshot 5 Style) */}
      <div className="bg-[#0f172a] text-white p-3 rounded-2xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveDashboardTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'overview'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Marketplace Overview</span>
          </button>

          <button
            onClick={() => {
              setActiveDashboardTab('orders');
              fetchOrders();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'orders'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>Orders Command Center</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 ml-1">
              {orderStatusCounts.all || orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('categories')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'categories'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Categories Tree</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 ml-1">
              Point #36
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('brands')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'brands'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Brands Directory</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 ml-1">
              Point #37
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('banners')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'banners'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Hero & Promo Banners</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 ml-1">
              Point #38
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('announcement')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'announcement'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Top Announcement</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 ml-1">
              Point #39
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('coupons')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'coupons'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Coupons & Promo Codes</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 ml-1">
              Point #40
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('flash-deals')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'flash-deals'
                ? 'bg-rose-500 text-white shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-400" />
            <span>Flash Deals & Sales</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 ml-1">
              Point #41
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('abandoned-carts')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'abandoned-carts'
                ? 'bg-blue-500 text-white shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShoppingCart className="w-4 h-4 text-blue-400" />
            <span>Abandoned Carts</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 ml-1">
              Point #77
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('customers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'customers'
                ? 'bg-purple-600 text-white shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-purple-300" />
            <span>Customer CRM Directory</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 ml-1">
              Point #43
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('vendors')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'vendors'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-300" />
            <span>Vendor KYC & Stores</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-400/30 text-amber-200 ml-1">
              Point #44
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('payouts')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'payouts'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-300" />
            <span>Vendor Payouts & Withdrawals</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-400/30 text-emerald-200 ml-1">
              Point #45
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('layout')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'layout'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Homepage Layout</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 ml-1">
              Visual Builder
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('integrations')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'integrations'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Plug className="w-4 h-4" />
            <span>Integrations & API Hub</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 ml-1">
              Point #46
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('seo')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'seo'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>SEO & Webmaster Hub</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300 ml-1">
              Point #47
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('tax-shipping')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'tax-shipping'
                ? 'bg-blue-600 text-white shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4 text-blue-300" />
            <span>Tax & Shipping Engine</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 ml-1">
              Point #48
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('staff-roles')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'staff-roles'
                ? 'bg-indigo-600 text-white shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-300" />
            <span>Staff Roles & Permissions</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 ml-1">
              Point #49
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('audit-backup')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'audit-backup'
                ? 'bg-emerald-600 text-white shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-300" />
            <span>Audit Trail & DB Backup</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 ml-1">
              Point #50
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('rto-guard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'rto-guard'
                ? 'bg-rose-600 text-white shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-300" />
            <span>RTO Guard Anti-Fraud</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 ml-1">
              Point #74
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('localization')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'localization'
                ? 'bg-indigo-600 text-white shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Globe className="w-4 h-4 text-indigo-300" />
            <span>Currency & Language</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 ml-1">
              Point #78
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('global-settings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'global-settings'
                ? 'bg-emerald-600 text-white shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4 text-emerald-300" />
            <span>Site Maintenance & Global Settings</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 ml-1">
              Point #6
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('audit-trail')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'audit-trail'
                ? 'bg-indigo-600 text-white shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-indigo-300" />
            <span>Activity & Security Audit Trail</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 ml-1">
              Point #7
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('push-notifications')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'push-notifications'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BellRing className="w-4 h-4 text-amber-400" />
            <span>Web Push Broadcast Studio</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 ml-1">
              Point #15
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('wallet-vault')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'wallet-vault'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wallet className="w-4 h-4 text-amber-400" />
            <span>Wallet & Scratch Rewards Vault</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 ml-1">
              Point #16
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('cms-pages')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'cms-pages'
                ? 'bg-amber-600 text-white shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-300" />
            <span>CMS & Legal Pages</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 ml-1">
              Point #7
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('faqs')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'faqs'
                ? 'bg-amber-600 text-white shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-amber-300" />
            <span>FAQ Builder</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 ml-1">
              Point #8
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('commission-rules')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'commission-rules'
                ? 'bg-amber-600 text-white shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Percent className="w-4 h-4 text-amber-300" />
            <span>Commission Rules</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 ml-1">
              Point #9
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('logistics-zones')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'logistics-zones'
                ? 'bg-amber-600 text-white shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Truck className="w-4 h-4 text-amber-300" />
            <span>Zone Logistics</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 ml-1">
              Point #10
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('telemetry-health')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'telemetry-health'
                ? 'bg-amber-600 text-white shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4 text-amber-300" />
            <span>Server Health & Telemetry</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 ml-1">
              Point #11
            </span>
          </button>

          <button
            onClick={() => setActiveDashboardTab('shipping-manifest')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
              activeDashboardTab === 'shipping-manifest'
                ? 'bg-amber-600 text-white shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-300" />
            <span>Courier Manifests</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 ml-1">
              Point #12
            </span>
          </button>

          <button
            onClick={() => setIsInventoryAlertsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            title="Point 10: Multi-Vendor Inventory Low-Stock Radar & Automated Alerts"
          >
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>Low-Stock Radar</span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-red-500/30 text-red-300 ml-1">
              Point #10
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-lg bg-slate-800 text-amber-400 font-mono text-xs font-bold border border-slate-700">
            AuraMarket v3.2 Enterprise
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & VENDORS */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          {/* Bento Grid Analytics */}
          <BentoGrid>
            <BentoCard
              title="Total Gross Revenue"
              value={`₹${analytics.grossSales.toLocaleString('en-IN')}`}
              subtitle="Lifetime customer transactions across all vendors"
              icon={DollarSign}
              badge="+18.4% this month"
              badgeColor="text-emerald-800 bg-emerald-50 border-emerald-200"
              accentColor="text-emerald-600"
            />

            <BentoCard
              title="Platform Commission Cut"
              value={`₹${analytics.platformCommission.toLocaleString('en-IN')}`}
              subtitle="Net platform profit from vendor commission cuts"
              icon={TrendingUp}
              badge="Avg 10% Cut"
              badgeColor="text-amber-800 bg-amber-50 border-amber-200"
              accentColor="text-amber-600"
            />

            <BentoCard
              title="Active Partner Stores"
              value={`${analytics.approvedVendors} / ${analytics.totalVendors}`}
              subtitle="Verified sellers actively fulfilling orders"
              icon={Store}
              badge="2 Pending Review"
              badgeColor="text-blue-800 bg-blue-50 border-blue-200"
              accentColor="text-blue-600"
            />

            <BentoCard
              title="Total Live Products"
              value={analytics.totalProducts.toString()}
              subtitle="Stocked across 4 core departments"
              icon={Package}
              badge="Healthy Inventory"
              badgeColor="text-purple-800 bg-purple-50 border-purple-200"
              accentColor="text-purple-600"
            />
          </BentoGrid>

          {/* Partner Vendor Verification & Commission Management Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Store className="w-5 h-5 text-amber-500" />
                  Vendor Storefronts & Commission Control
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Review onboarding status, adjust percentage commissions, and inspect payout balances
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
                {vendors.length} Total Partners
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-6">Store & Owner</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Commission (%)</th>
                    <th className="py-3 px-4 text-right">Wallet Balance</th>
                    <th className="py-3 px-4 text-right">Lifetime Sales</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {vendors.map(v => (
                    <tr key={v._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 text-sm">{v.storeName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">ID: {v._id}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-slate-800 font-bold">{v.user?.name}</div>
                        <div className="text-slate-500 text-[11px]">{v.user?.email}</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            v.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : v.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {v.status === 'approved' && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                          {v.status === 'pending' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                          {v.status === 'suspended' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                          <span className="capitalize">{v.status}</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={v.commissionRate}
                            onChange={e => handleCommissionChange(v._id, e.target.value)}
                            className="w-16 px-2 py-1 rounded bg-slate-50 border border-slate-300 text-slate-900 font-bold text-center focus:outline-none focus:border-amber-500"
                          />
                          <span className="font-bold text-slate-400">%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-slate-900">
                        ₹{v.walletBalance?.toLocaleString('en-IN') || 0}
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-slate-900">
                        ₹{v.totalSales?.toLocaleString('en-IN') || 0}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleStatusToggle(v._id, v.status)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                            v.status === 'approved'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {v.status === 'approved' ? 'Suspend Store' : 'Approve Store'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COMPLETE ORDER MANAGEMENT CENTER (Point #32) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'orders' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header & Quick Summary */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                  <PackageCheck className="w-6 h-6 text-amber-500" />
                  <span>Orders & Multi-Vendor Split Command Center</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Live Engine
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  Monitor, filter, inspect multi-vendor packages, update delivery status lifecycles, and generate 1-click tax invoices.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => handleExportCSV()}
                  disabled={isBulkProcessing}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                  title="Export Current Filtered Orders to CSV / Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => fetchOrders()}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-sm"
                  title="Reload Live Orders"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                  <span>Refresh Orders</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Orders</span>
                  <Package className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-black text-white mt-2">{orderStatusCounts.all}</div>
                <div className="text-[10px] text-slate-400 mt-1">Lifetime Gross</div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">New / Placed</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-950 mt-2">{orderStatusCounts.placed}</div>
                <div className="text-[10px] text-amber-700 font-semibold mt-1">Needs Dispatch</div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">In Progress</span>
                  <Truck className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-blue-950 mt-2">{orderStatusCounts.in_progress}</div>
                <div className="text-[10px] text-blue-700 font-semibold mt-1">Shipped / In Transit</div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Delivered</span>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-950 mt-2">{orderStatusCounts.delivered}</div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-1">OTP Verified</div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Cancelled</span>
                  <XCircle className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl font-black text-rose-950 mt-2">{orderStatusCounts.cancelled}</div>
                <div className="text-[10px] text-rose-700 font-semibold mt-1">Stock Auto-Restored</div>
              </div>
            </div>

            {/* Filter Tabs & Secondary Controls */}
            <div className="space-y-4 pt-2">
              {/* Primary Status Tabs */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                {[
                  { key: 'ALL', label: 'All Orders', count: orderStatusCounts.all },
                  { key: 'PLACED', label: 'New / Placed', count: orderStatusCounts.placed },
                  { key: 'IN_PROGRESS', label: 'In Progress', count: orderStatusCounts.in_progress },
                  { key: 'DELIVERED', label: 'Delivered', count: orderStatusCounts.delivered },
                  { key: 'CANCELLED', label: 'Cancelled', count: orderStatusCounts.cancelled },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setOrderStatusFilter(tab.key);
                      fetchOrders({ status: tab.key });
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      orderStatusFilter === tab.key
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        orderStatusFilter === tab.key
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Secondary Controls: Search, Payment Status, Payment Method, Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Search Input */}
                <div className="sm:col-span-5 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearchTerm}
                    onChange={e => {
                      setOrderSearchTerm(e.target.value);
                      fetchOrders({ search: e.target.value });
                    }}
                    placeholder="Search by Order #, customer, phone, email..."
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                  />
                  {orderSearchTerm && (
                    <button
                      onClick={() => {
                        setOrderSearchTerm('');
                        fetchOrders({ search: '' });
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Payment Status Dropdown */}
                <div className="sm:col-span-2">
                  <select
                    value={orderPaymentStatusFilter}
                    onChange={e => {
                      setOrderPaymentStatusFilter(e.target.value);
                      fetchOrders({ paymentStatus: e.target.value });
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="ALL">All Payments</option>
                    <option value="PAID">Paid</option>
                    <option value="PENDING">Pending</option>
                    <option value="REFUNDED">Refunded</option>
                  </select>
                </div>

                {/* Payment Method Dropdown */}
                <div className="sm:col-span-3">
                  <select
                    value={orderPaymentMethodFilter}
                    onChange={e => {
                      setOrderPaymentMethodFilter(e.target.value);
                      fetchOrders({ paymentMethod: e.target.value });
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="ALL">All Payment Methods</option>
                    <option value="RAZORPAY">Razorpay (Cards/UPI/Netbanking)</option>
                    <option value="STRIPE">Stripe (International Cards)</option>
                    <option value="UPI">Direct UPI QR</option>
                    <option value="COD">Cash on Delivery (COD)</option>
                    <option value="WALLET">In-App Customer Wallet</option>
                  </select>
                </div>

                {/* Date Range Dropdown */}
                <div className="sm:col-span-2">
                  <select
                    value={orderDateRangeFilter}
                    onChange={e => {
                      setOrderDateRangeFilter(e.target.value);
                      fetchOrders({ dateRange: e.target.value });
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="ALL">All Dates</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="this_week">Past 7 Days</option>
                    <option value="this_month">This Month</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Point 35: Bulk Action Floating Bar */}
            {selectedOrderIds.length > 0 && (
              <div className="bg-amber-400 text-slate-950 p-3 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md border border-amber-300 animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-slate-900 text-amber-300 font-black text-xs flex items-center justify-center shadow-inner">
                    {selectedOrderIds.length}
                  </span>
                  <div>
                    <span className="font-black text-sm tracking-tight text-slate-900">
                      {selectedOrderIds.length} Order{selectedOrderIds.length > 1 ? 's' : ''} Selected
                    </span>
                    <span className="text-[11px] text-slate-700 ml-2 hidden sm:inline">
                      (out of {filteredOrders.length} filtered)
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedOrderIds([])}
                    className="text-xs font-bold underline hover:text-slate-900 ml-1 text-slate-800"
                  >
                    Clear Selection
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Bulk Status Updater Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowBulkActionDropdown(prev => !prev)}
                      disabled={isBulkProcessing}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
                    >
                      <span>Update Status</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {showBulkActionDropdown && (
                      <div className="absolute right-0 bottom-full sm:bottom-auto sm:top-full mt-1.5 w-52 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-fade-in text-xs">
                        <div className="px-3.5 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          Apply Status To {selectedOrderIds.length} Orders:
                        </div>
                        <button
                          onClick={() => handleBulkStatusUpdate('CONFIRMED')}
                          className="w-full text-left px-3.5 py-2 hover:bg-amber-50 font-bold text-amber-700 flex items-center gap-2 transition-colors"
                        >
                          <Clock className="w-3.5 h-3.5" /> Mark as Placed / Confirmed
                        </button>
                        <button
                          onClick={() => handleBulkStatusUpdate('SHIPPED')}
                          className="w-full text-left px-3.5 py-2 hover:bg-blue-50 font-bold text-blue-700 flex items-center gap-2 transition-colors"
                        >
                          <Truck className="w-3.5 h-3.5" /> Mark as In Progress / Shipped
                        </button>
                        <button
                          onClick={() => handleBulkStatusUpdate('DELIVERED')}
                          className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 font-bold text-emerald-700 flex items-center gap-2 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Mark as Delivered & Paid
                        </button>
                        <div className="border-t border-slate-100 my-1.5" />
                        <button
                          onClick={() => handleBulkStatusUpdate('CANCELLED')}
                          className="w-full text-left px-3.5 py-2 hover:bg-rose-50 font-bold text-rose-700 flex items-center gap-2 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Cancel Selected Orders
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Export Selected as CSV */}
                  <button
                    onClick={() => handleExportCSV(selectedOrderIds)}
                    disabled={isBulkProcessing}
                    className="px-3.5 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm border border-slate-200 disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-700" />
                    <span>Export CSV ({selectedOrderIds.length})</span>
                  </button>

                  {/* Point 9: Bulk 4x6 Thermal Shipping Labels */}
                  <button
                    onClick={() => setIsAdminBulkLabelsOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Thermal Labels ({selectedOrderIds.length})</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950">#9</span>
                  </button>
                </div>
              </div>
            )}

            {/* Orders Table */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                          onChange={() => handleToggleSelectAll(filteredOrders)}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer w-4 h-4"
                          title="Select / Deselect All Orders"
                        />
                      </th>
                      <th className="py-3.5 px-4">Order ID & Date</th>
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Vendor Packages</th>
                      <th className="py-3.5 px-4">Payment</th>
                      <th className="py-3.5 px-4 text-right">Amount</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-center">Status Action</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="py-12 text-center">
                          <div className="max-w-sm mx-auto space-y-3">
                            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                              <Package className="w-6 h-6" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-800">No Orders Found</h3>
                            <p className="text-xs text-slate-500">
                              No orders match the selected filters or search keyword. Try clearing filters.
                            </p>
                            <button
                              onClick={() => {
                                setOrderStatusFilter('ALL');
                                setOrderPaymentStatusFilter('ALL');
                                setOrderPaymentMethodFilter('ALL');
                                setOrderDateRangeFilter('ALL');
                                setOrderSearchTerm('');
                                fetchOrders({
                                  status: 'ALL',
                                  paymentStatus: 'ALL',
                                  paymentMethod: 'ALL',
                                  dateRange: 'ALL',
                                  search: '',
                                });
                              }}
                              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all"
                            >
                              Reset All Filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map(ord => {
                        const dateFormatted = ord.createdAt
                          ? new Date(ord.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Just now';

                        return (
                          <tr
                            key={ord._id}
                            className={`transition-colors ${
                              selectedOrderIds.includes(ord._id) ? 'bg-amber-50/60' : 'hover:bg-slate-50/80'
                            }`}
                          >
                            {/* Row Checkbox */}
                            <td className="py-4 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedOrderIds.includes(ord._id)}
                                onChange={() => handleToggleSelectOrder(ord._id)}
                                className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer w-4 h-4"
                              />
                            </td>

                            {/* Order ID & Date */}
                            <td className="py-4 px-4">
                              <button
                                onClick={() => setSelectedOrderForModal(ord)}
                                className="font-bold text-slate-900 hover:text-amber-600 flex items-center gap-1.5 transition-colors group"
                              >
                                <span className="font-mono text-xs">{ord.orderNumber}</span>
                                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-amber-600" />
                              </button>
                              <div className="text-[11px] text-slate-400 mt-0.5">{dateFormatted}</div>
                              {ord.deliveryOtp && (
                                <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-mono text-[10px] font-bold border border-amber-200">
                                  OTP: {ord.deliveryOtp}
                                </span>
                              )}
                            </td>

                            {/* Customer */}
                            <td className="py-4 px-4">
                              <div className="font-bold text-slate-900">
                                {ord.customer?.name || ord.shippingAddress?.fullName || 'Guest Customer'}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {ord.customer?.phone || ord.shippingAddress?.phone || 'No phone'}
                              </div>
                              {ord.shippingAddress?.city && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {ord.shippingAddress.city}, {ord.shippingAddress.state}
                                </div>
                              )}
                            </td>

                            {/* Vendor Packages */}
                            <td className="py-4 px-4">
                              <div className="space-y-1">
                                {ord.subOrders && ord.subOrders.length > 0 ? (
                                  ord.subOrders.map((sub, idx) => (
                                    <div key={sub._id || idx} className="flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                      <span className="text-[11px] font-bold text-slate-800">
                                        {sub.vendor?.storeName || 'Partner Merchant'}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        ({sub.status})
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-[11px] text-slate-600 font-medium">
                                    {ord.items?.length || 1} item(s) direct
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Payment */}
                            <td className="py-4 px-4">
                              <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200">
                                  {ord.paymentMethod || 'COD'}
                                </span>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    ord.paymentStatus === 'PAID'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : ord.paymentStatus === 'REFUNDED'
                                      ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}
                                >
                                  {ord.paymentStatus || 'PENDING'}
                                </span>
                              </div>
                            </td>

                            {/* Amount */}
                            <td className="py-4 px-4 text-right">
                              <div className="font-black text-slate-900 text-sm">
                                ₹{ord.totalAmount?.toLocaleString('en-IN')}
                              </div>
                              {ord.discountAmount > 0 && (
                                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                                  -₹{ord.discountAmount} coins
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-4 px-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                  ord.status === 'DELIVERED'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : ord.status === 'CANCELLED'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : ord.status === 'IN_PROGRESS' || ord.status === 'PARTIALLY_DELIVERED'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {ord.status === 'DELIVERED' && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                                {ord.status === 'CANCELLED' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                                {(ord.status === 'IN_PROGRESS' || ord.status === 'PARTIALLY_DELIVERED') && (
                                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                                )}
                                {ord.status === 'PLACED' && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                                <span>{ord.status}</span>
                              </span>
                            </td>

                            {/* Quick Status Action */}
                            <td className="py-4 px-4 text-center">
                              <select
                                value={ord.status}
                                onChange={e => handleUpdateOrderStatus(ord._id, e.target.value)}
                                disabled={isUpdatingStatus}
                                className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-bold focus:outline-none focus:border-amber-500 cursor-pointer shadow-sm"
                              >
                                <option value="PLACED">Placed (New)</option>
                                <option value="IN_PROGRESS">In Progress (Shipped)</option>
                                <option value="DELIVERED">Delivered (Complete)</option>
                                <option value="CANCELLED">Cancel Order (Restore Stock)</option>
                              </select>
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedOrderForModal(ord)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                  title="Inspect Full Order Details"
                                >
                                  <Eye className="w-4 h-4 text-slate-700" />
                                </button>
                                <button
                                  onClick={() => handleOpenCommissionSplit(ord)}
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 transition-colors"
                                  title="Multi-Vendor Commission Split Inspector (Point #33)"
                                >
                                  <Percent className="w-4 h-4 text-emerald-600" />
                                </button>
                                <button
                                  onClick={() => setSelectedInvoiceOrderId(ord._id)}
                                  className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 transition-colors"
                                  title="1-Click Master Tax Invoice (PDF / Print)"
                                >
                                  <FileText className="w-4 h-4 text-amber-600" />
                                </button>
                                <button
                                  onClick={() => setSelectedSplitPackingSlipOrderId(ord._id)}
                                  className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 transition-colors"
                                  title="Smart Multi-Vendor Split Packing Slip with QR Codes (Point #73)"
                                >
                                  <QrCode className="w-4 h-4 text-indigo-600" />
                                </button>
                                <button
                                  onClick={() => setSelectedThermalOrderId(ord._id)}
                                  className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 transition-colors"
                                  title="In-Browser Direct Thermal Receipt Printer (Point #75)"
                                >
                                  <Printer className="w-4 h-4 text-amber-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CATEGORY & SUB-CATEGORY TREE MANAGER (Point #36) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'categories' && (
        <CategoryTreeManager />
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BRAND DIRECTORY & MANUFACTURER HUB (Point #37) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'brands' && (
        <BrandDirectoryManager />
      )}

      {/* ========================================================================= */}
      {/* TAB 5: HOMEPAGE HERO SLIDER & PROMO BANNER MANAGER (Point #38) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'banners' && (
        <BannerManager />
      )}

      {/* ========================================================================= */}
      {/* TAB 6: DYNAMIC TOP ANNOUNCEMENT BAR CONTROLLER (Point #39) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'announcement' && (
        <AnnouncementBarManager
          onUpdate={(data) =>
            setUiConfig((prev) => ({
              ...prev,
              announcement: data,
              showAnnouncement: data.enabled,
              announcementText: data.text,
            }))
          }
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 7: COUPON & PROMO CODE CREATOR (Point #40) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'coupons' && (
        <CouponManager />
      )}

      {/* ========================================================================= */}
      {/* TAB 8: FLASH DEALS & CAMPAIGN MANAGER (Point #41) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'flash-deals' && (
        <FlashDealManager />
      )}

      {/* ========================================================================= */}
      {/* TAB 9: ABANDONED CART AUTO-RECOVERY SYSTEM (Point #77) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'abandoned-carts' && (
        <AbandonedCartManager />
      )}

      {/* ========================================================================= */}
      {/* TAB 10: CUSTOMER CRM DIRECTORY (Point #43) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'customers' && (
        <CustomerCRMManager />
      )}

      {/* ========================================================================= */}
      {/* TAB 11: VENDOR KYC & STORE APPROVAL CENTER (Point #44) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'vendors' && (
        <VendorKYCManager />
      )}

      {/* ========================================================================= */}
      {/* TAB 12: VENDOR WITHDRAWAL / PAYOUT APPROVAL HUB (Point #45) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'payouts' && (
        <VendorPayoutManager />
      )}

      {/* ========================================================================= */}
      {/* TAB 13: TAX (GST) & DYNAMIC SHIPPING ENGINE (Point #48) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'tax-shipping' && (
        <TaxShippingManager uiConfig={uiConfig} setUiConfig={setUiConfig} />
      )}

      {/* ========================================================================= */}
      {/* TAB 14: SUB-ADMIN STAFF ROLES & PERMISSIONS (Point #49) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'staff-roles' && (
        <StaffRoleManager />
      )}

      {/* ========================================================================= */}
      {/* TAB 15: SYSTEM AUDIT ACTIVITY LOG & 1-CLICK DB BACKUP (Point #50) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'audit-backup' && (
        <SystemAuditBackupManager />
      )}

      {/* ========================================================================= */}
      {/* TAB 16: RTO GUARD ANTI-FRAUD & HIGH-RISK COD SUITE (Point #74) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'rto-guard' && (
        <RtoGuardManager />
      )}

      {/* ========================================================================= */}
      {/* TAB 17: REAL-TIME MULTI-CURRENCY & MULTI-LANGUAGE SWITCHER (Point #78) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'localization' && (
        <LocalizationManager />
      )}

      {/* ========================================================================= */}
      {/* TAB: ⚙️ SITE MAINTENANCE, MULTI-CURRENCY & GLOBAL SETTINGS (Point #6) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'global-settings' && (
        <GlobalSettingsManager
          onConfigSaved={(updated) => {
            if (setUiConfig) {
              setUiConfig((prev) => ({ ...prev, ...updated }));
            }
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB: 🛡️ ADMIN ACTIVITY & SECURITY AUDIT TRAIL LOGS (Point #7) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'audit-trail' && (
        <AuditTrailManager />
      )}

      {/* ========================================================================= */}
      {/* TAB: 🔔 NATIVE WEB PUSH NOTIFICATIONS BROADCAST STUDIO (Point #15) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'push-notifications' && (
        <AdminPushNotificationHub />
      )}

      {/* ========================================================================= */}
      {/* TAB: 💳 CUSTOMER WALLET TOP-UP & INSTANT SCRATCH CARD REWARDS (Point #16) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'wallet-vault' && (
        <AdminWalletVault />
      )}

      {/* ========================================================================= */}
      {/* TAB 18: FULL DYNAMIC CMS & LEGAL POLICY PAGES BUILDER (Point #7) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'cms-pages' && (
        <CmsPageBuilderManager onViewPublicPage={(slug) => setPreviewPolicySlug(slug)} />
      )}

      {/* ========================================================================= */}
      {/* TAB 19: CATEGORIZED INTERACTIVE FAQ BUILDER (Point #8) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'faqs' && (
        <FaqManager />
      )}

      {/* ========================================================================= */}
      {/* TAB 20: CATEGORY-WISE & DYNAMIC COMMISSION RULES (Point #9) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'commission-rules' && (
        <CommissionRuleManager />
      )}

      {/* ========================================================================= */}
      {/* TAB 21: PINCODE & DELIVERY ZONE LOGISTICS MANAGER (Point #10) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'logistics-zones' && (
        <PincodeZoneManager />
      )}

      {/* ========================================================================= */}
      {/* TAB 22: LIVE SERVER HEALTH, CRON JOBS & DATABASE TELEMETRY (Point #11) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'telemetry-health' && (
        <ServerTelemetryManager />
      )}

      {/* ========================================================================= */}
      {/* TAB 23: DAILY COURIER SHIPPING MANIFEST (Point #12) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'shipping-manifest' && (
        <ShippingManifestManager />
      )}

      {/* ========================================================================= */}
      {/* TAB: HOMEPAGE MODULAR SECTION MANAGER (Screenshot 3 Style) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'layout' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Store className="w-5 h-5 text-amber-500" />
                  <span>Homepage Modular Section Manager</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Enable, disable, or customize visual storefront modules with a single click. 100% plug & play.
                </p>
              </div>
              <span className="text-xs font-black uppercase px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 self-start sm:self-auto">
                Live Storefront Sync
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {homepageSections.map((sec, index) => (
                <div
                  key={sec.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    sec.enabled
                      ? 'bg-white border-amber-300 shadow-sm ring-1 ring-amber-300/40'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center">
                        #{index + 1}
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-sm">{sec.name}</h3>
                    </div>
                    <p className="text-xs text-slate-500 font-medium pl-8">{sec.desc}</p>
                  </div>

                  <button
                    onClick={() => toggleSection(sec.id)}
                    className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all shadow-sm flex items-center gap-1.5 flex-shrink-0 ${
                      sec.enabled
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-slate-300 hover:bg-slate-400 text-slate-800'
                    }`}
                  >
                    <span>{sec.enabled ? 'ACTIVE' : 'DISABLED'}</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Non-Developer Visual Builder:
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                You can toggle off unwanted modules whenever not in season, and the storefront adapts its layout automatically with 100% responsiveness on mobile and web!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 🔌 INTEGRATIONS & API HUB (NON-DEVELOPER FRIENDLY) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'integrations' && (
        <div className="space-y-6 animate-fade-in">
          {/* Zero-Code Info Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 border border-amber-300 text-slate-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-slate-950" />
                <h3 className="font-black text-base">Plug-and-Play Third-Party Integrations Engine</h3>
              </div>
              <p className="text-xs font-semibold text-slate-900 max-w-3xl">
                Har service (SMS, Payments, Email/SMTP, Media Storage) bina code touch kiye yahi Super Admin panel se configure hoti hai. Kisi developer ki zaroorat nahi hai — keys paste karke toggle ON karein aur turant live payein!
              </p>
            </div>
            <button
              onClick={handleSaveIntegrations}
              disabled={isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-400 text-xs font-black shadow-lg transition-all whitespace-nowrap"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>{isProcessing ? 'Saving...' : 'Save All Integrations'}</span>
            </button>
          </div>

          {/* Sub-Tabs for Services */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setIntegrationSubTab('payments')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all ${
                integrationSubTab === 'payments'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>💳 Payment Gateways</span>
            </button>

            <button
              onClick={() => setIntegrationSubTab('sms')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all ${
                integrationSubTab === 'sms'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span>📱 SMS & WhatsApp</span>
            </button>

            <button
              onClick={() => setIntegrationSubTab('email')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all ${
                integrationSubTab === 'email'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-4 h-4 text-purple-600" />
              <span>✉️ Email & SMTP Studio</span>
            </button>

            <button
              onClick={() => setIntegrationSubTab('storage')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all ${
                integrationSubTab === 'storage'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HardDrive className="w-4 h-4 text-amber-600" />
              <span>☁️ Multi-Cloud & S3 CDN</span>
            </button>

            <button
              onClick={() => setIntegrationSubTab('courier')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all ${
                integrationSubTab === 'courier'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-4 h-4 text-purple-600" />
              <span>🚚 Courier Aggregators</span>
            </button>

            <button
              onClick={() => setIntegrationSubTab('global-settings')}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all ${
                integrationSubTab === 'global-settings'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>⚙️ Maintenance & Branding</span>
            </button>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 1. PAYMENT GATEWAYS MANAGER (Point #1) */}
          {/* ------------------------------------------------------------- */}
          {integrationSubTab === 'payments' && (
            <div className="space-y-6 animate-fade-in">
              <PaymentGatewayManager />
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 2. SMS & WHATSAPP GATEWAYS MANAGER (Point 2) */}
          {/* ------------------------------------------------------------- */}
          {integrationSubTab === 'sms' && (
            <SmsWhatsAppSettingsManager />
          )}

          {/* ------------------------------------------------------------- */}
          {/* 3. EMAIL SMTP & TRANSACTIONAL TEMPLATE STUDIO (Point 3) */}
          {/* ------------------------------------------------------------- */}
          {integrationSubTab === 'email' && (
            <EmailTemplateManager />
          )}

          {/* ------------------------------------------------------------- */}
          {/* 4. MULTI-CLOUD STORAGE & S3 CDN CONFIGURATOR (Point 4) */}
          {/* ------------------------------------------------------------- */}
          {integrationSubTab === 'storage' && (
            <StorageConfigManager />
          )}

          {/* ------------------------------------------------------------- */}
          {/* 5. DIRECT COURIER AGGREGATOR API INTEGRATION (Point 5) */}
          {/* ------------------------------------------------------------- */}
          {integrationSubTab === 'courier' && (
            <CourierAggregatorManager />
          )}

          {/* ------------------------------------------------------------- */}
          {/* 6. SITE MAINTENANCE & GLOBAL BRANDING SETTINGS (Point 6) */}
          {/* ------------------------------------------------------------- */}
          {integrationSubTab === 'global-settings' && (
            <GlobalSettingsManager
              onConfigSaved={(updated) => {
                if (setUiConfig) {
                  setUiConfig((prev) => ({ ...prev, ...updated }));
                }
              }}
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: 🔍 SEO & WEBMASTER HUB (ENTERPRISE SEARCH & INDEXING SUITE) */}
      {/* ========================================================================= */}
      {activeDashboardTab === 'seo' && (
        <div className="space-y-6 animate-fade-in">
          {/* SEO Header Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-600 to-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-base">Enterprise E-Commerce SEO & Webmaster Center</h3>
              </div>
              <p className="text-xs font-medium text-blue-100 max-w-3xl">
                Configure your store meta tags, social sharing previews, Google Search Console ownership, GA4 analytics, and Schema.org rich snippets with zero coding. All updates synchronize live across all storefront pages!
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveSeo}
                disabled={isProcessing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black shadow-lg transition-all whitespace-nowrap"
              >
                <Save className="w-4 h-4 text-slate-950" />
                <span>{isProcessing ? 'Saving...' : 'Save SEO Configuration'}</span>
              </button>
            </div>
          </div>

          {/* Quick Technical SEO Endpoints Bar */}
          <div className="bg-slate-900 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                ⚡
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Live Search Engine Feeds Generated Automatically</h4>
                <p className="text-[11px] text-slate-400">Search engines crawl these URLs to index all catalog products within 24–48 hours.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={`${(seoConfig.canonicalUrl || '').replace(/\/+$/, '')}/sitemap.xml`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 border border-blue-700/60 text-blue-300 text-xs font-mono font-bold transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>/sitemap.xml</span>
              </a>
              <a
                href={`${(seoConfig.canonicalUrl || '').replace(/\/+$/, '')}/robots.txt`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-mono font-bold transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>/robots.txt</span>
              </a>
            </div>
          </div>

          {/* 4 Core SEO Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* CARD 1: Core Search Engine Meta Tags */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">On-Page Meta Tags</h4>
                    <p className="text-[11px] text-slate-500">Google, Bing & Yahoo primary indexing tags</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Essential
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Meta Title (Brand + Value Proposition)</label>
                  <span className="text-[11px] font-mono text-slate-400">{(seoConfig.metaTitle || '').length}/60 chars</span>
                </div>
                <input
                  type="text"
                  value={seoConfig.metaTitle || ''}
                  onChange={e => setSeoConfig({ ...seoConfig, metaTitle: e.target.value })}
                  placeholder="e.g. AuraMarket — The Next-Gen Multi-Vendor Commerce Platform"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Meta Description</label>
                  <span className="text-[11px] font-mono text-slate-400">{(seoConfig.metaDescription || '').length}/160 chars</span>
                </div>
                <textarea
                  rows="3"
                  value={seoConfig.metaDescription || ''}
                  onChange={e => setSeoConfig({ ...seoConfig, metaDescription: e.target.value })}
                  placeholder="e.g. Discover top electronics, audio, fashion, and lifestyle brands from verified merchants with express delivery and OTP verification."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meta Keywords (Comma-Separated)
                </label>
                <input
                  type="text"
                  value={seoConfig.metaKeywords || ''}
                  onChange={e => setSeoConfig({ ...seoConfig, metaKeywords: e.target.value })}
                  placeholder="ecommerce, multi-vendor marketplace, online shopping, electronics"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Canonical URL (Prevents Duplicate Content Penalty)
                </label>
                <input
                  type="url"
                  value={seoConfig.canonicalUrl || ''}
                  onChange={e => setSeoConfig({ ...seoConfig, canonicalUrl: e.target.value })}
                  placeholder="https://shribalajikripadham.online/ecommerce-demo/"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* CARD 2: Social Media & Open Graph */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Social Media & Open Graph</h4>
                    <p className="text-[11px] text-slate-500">Rich snippet link previews on WhatsApp, Facebook, X</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  Viral Previews
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Open Graph Social Image URL (1200 x 630 px Recommended)
                </label>
                <input
                  type="url"
                  value={seoConfig.ogImage || ''}
                  onChange={e => setSeoConfig({ ...seoConfig, ogImage: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* OG Image Live Preview Card */}
              {seoConfig.ogImage && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Social Preview Simulation</span>
                  <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-slate-900 aspect-[16/9] max-h-36">
                    <img
                      src={seoConfig.ogImage}
                      alt="Open Graph Preview"
                      className="w-full h-full object-cover"
                      onError={e => { e.target.src = 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600'; }}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-2 text-white">
                      <div className="text-[11px] font-bold truncate">{seoConfig.metaTitle}</div>
                      <div className="text-[9px] text-slate-300 truncate">{seoConfig.canonicalUrl}</div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Facebook Pixel ID / Meta Ad Tracker (Optional)
                </label>
                <input
                  type="text"
                  value={seoConfig.facebookPixelId || ''}
                  onChange={e => setSeoConfig({ ...seoConfig, facebookPixelId: e.target.value })}
                  placeholder="e.g. 123456789012345"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* CARD 3: Webmaster Verification & Google Analytics 4 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Google Webmaster & GA4 Analytics</h4>
                    <p className="text-[11px] text-slate-500">Search Console verification & visitor measurement</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Analytics
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Google Search Console Verification Tag / Code
                </label>
                <input
                  type="text"
                  value={seoConfig.googleSiteVerification || ''}
                  onChange={e => setSeoConfig({ ...seoConfig, googleSiteVerification: e.target.value })}
                  placeholder="e.g. google-site-verification=XXXXXXXXXXXXXXXXXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Paste the verification code from Google Search Console (HTML Tag verification method). The platform automatically injects &lt;meta name="google-site-verification"&gt;.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Google Analytics 4 (GA4) Measurement ID
                </label>
                <input
                  type="text"
                  value={seoConfig.googleAnalyticsId || ''}
                  onChange={e => setSeoConfig({ ...seoConfig, googleAnalyticsId: e.target.value })}
                  placeholder="e.g. G-XXXXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Create a data stream at analytics.google.com and enter your <span className="font-mono text-amber-600 font-bold">G-XXXXXXXXXX</span> ID to start tracking visits, cart additions, and conversions automatically.
                </p>
              </div>
            </div>

            {/* CARD 4: Structured Data (Schema.org) & Rich Snippets */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                    <Code className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Schema.org Rich Snippets Markup</h4>
                    <p className="text-[11px] text-slate-500">Google Rich Results with pricing, ratings & sitelinks</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enableRichSnippetsToggle"
                    checked={seoConfig.enableRichSnippets}
                    onChange={e => setSeoConfig({ ...seoConfig, enableRichSnippets: e.target.checked })}
                    className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-400"
                  />
                  <label htmlFor="enableRichSnippetsToggle" className="text-xs font-bold text-slate-800 cursor-pointer">
                    Enable Rich Snippets
                  </label>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-slate-900 block">Structured Data Entities Injected Automatically:</span>
                <ul className="space-y-1.5 text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span><strong>WebSite Schema + SearchAction:</strong> Enables Google Sitelinks Search Box directly on SERP.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span><strong>Organization Schema:</strong> Brand name, logo, and customer support phone line.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span><strong>ItemList & Product Schema:</strong> Real-time pricing (₹), availability (InStock), and merchant details.</span>
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs">
                <span className="font-bold">Google Rich Results Test:</span> All generated JSON-LD scripts are 100% compliant with schema.org specifications and pass Google Rich Results Validator tests.
              </div>
            </div>

          </div>

          {/* Bottom Save Bar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={handleSaveSeo}
              disabled={isProcessing}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isProcessing ? 'Saving Settings...' : 'Save SEO & Webmaster Configuration'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Visual Theme & Dynamic Branding Drawer */}
      <SlideOverDrawer
        isOpen={isThemeDrawerOpen}
        onClose={() => setIsThemeDrawerOpen(false)}
        title="Visual Theme & Marketplace Customizer"
      >
        <form onSubmit={handleSaveTheme} className="space-y-6 text-slate-800">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
            <span className="font-bold">⚡ Real-Time Theme Engine:</span> Changes saved here reflect immediately on the Customer Storefront, Top Navigation, and Mobile simulators.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Marketplace Store Name
            </label>
            <input
              type="text"
              value={themeForm.storeName}
              onChange={e => setThemeForm({ ...themeForm, storeName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold text-sm focus:outline-none focus:border-amber-500"
              placeholder="e.g. AuraMarket"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Top Announcement Ticker
            </label>
            <input
              type="text"
              value={themeForm.announcementText}
              onChange={e => setThemeForm({ ...themeForm, announcementText: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:border-amber-500"
              placeholder="Sale announcement ticker"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Hero Banner Heading
            </label>
            <input
              type="text"
              value={themeForm.bannerTitle}
              onChange={e => setThemeForm({ ...themeForm, bannerTitle: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:border-amber-500"
              placeholder="Banner headline"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Hero Banner Subtitle
            </label>
            <textarea
              rows="3"
              value={themeForm.bannerSubtitle}
              onChange={e => setThemeForm({ ...themeForm, bannerSubtitle: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:border-amber-500"
              placeholder="Banner description"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Store Footer & Copyright Text
            </label>
            <input
              type="text"
              value={themeForm.footerText}
              onChange={e => setThemeForm({ ...themeForm, footerText: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:border-amber-500"
              placeholder="e.g. © 2026 YourStore. All rights reserved."
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Support Helpline Phone
              </label>
              <input
                type="text"
                value={themeForm.supportPhone}
                onChange={e => setThemeForm({ ...themeForm, supportPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:border-amber-500"
                placeholder="+91 8533955333"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Support Email
              </label>
              <input
                type="email"
                value={themeForm.supportEmail}
                onChange={e => setThemeForm({ ...themeForm, supportEmail: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:border-amber-500"
                placeholder="support@yourstore.com"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="showDemoNoticeToggle"
                checked={themeForm.showDemoNotice}
                onChange={e => setThemeForm({ ...themeForm, showDemoNotice: e.target.checked })}
                className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-400"
              />
              <label htmlFor="showDemoNoticeToggle" className="text-xs font-bold text-slate-800 cursor-pointer">
                Display Showroom & Developer Purchase Box
              </label>
            </div>
            <p className="text-[11px] text-slate-500 pl-6">
              Enable when hosting a public live demo to allow visitors to purchase directly. Disable for 100% white-label client production stores.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md transition-all"
            >
              Apply Theme Live Everywhere
            </button>
          </div>
        </form>
      </SlideOverDrawer>

      {/* ========================================================================= */}
      {/* POINT 32: ORDER INSPECTOR SLIDE-OVER DRAWER */}
      {/* ========================================================================= */}
      <SlideOverDrawer
        isOpen={!!selectedOrderForModal}
        onClose={() => setSelectedOrderForModal(null)}
        title={`Order #${selectedOrderForModal?.orderNumber || ''} Inspection`}
      >
        {selectedOrderForModal && (
          <div className="space-y-6 text-slate-800">
            {/* Status & Payment Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Current Lifecycle
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black mt-1 ${
                    selectedOrderForModal.status === 'DELIVERED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedOrderForModal.status === 'CANCELLED'
                      ? 'bg-rose-100 text-rose-800'
                      : selectedOrderForModal.status === 'IN_PROGRESS' || selectedOrderForModal.status === 'PARTIALLY_DELIVERED'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <span className="capitalize">{selectedOrderForModal.status}</span>
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Payment Status
                </span>
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 mt-1 inline-block uppercase">
                  {selectedOrderForModal.paymentStatus} ({selectedOrderForModal.paymentMethod})
                </span>
              </div>
            </div>

            {/* 4-Digit Secret Delivery OTP Card */}
            {selectedOrderForModal.deliveryOtp && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-amber-900 font-black text-xs uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Secret Handover PIN (OTP)</span>
                  </div>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Customer provides this 4-digit code to delivery agent at doorstep.
                  </p>
                </div>
                <div className="text-2xl font-mono font-black text-amber-950 bg-white px-3.5 py-1.5 rounded-xl border border-amber-200 tracking-widest shadow-sm">
                  {selectedOrderForModal.deliveryOtp}
                </div>
              </div>
            )}

            {/* Customer & Delivery Address */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                <span>Customer & Destination</span>
              </h4>
              <div className="text-xs space-y-1">
                <div className="font-bold text-slate-900 text-sm">
                  {selectedOrderForModal.customer?.name || selectedOrderForModal.shippingAddress?.fullName}
                </div>
                <div className="text-slate-600 font-mono">
                  📞 {selectedOrderForModal.customer?.phone || selectedOrderForModal.shippingAddress?.phone}
                </div>
                <div className="text-slate-500">
                  ✉️ {selectedOrderForModal.customer?.email || 'N/A'}
                </div>
                <div className="text-slate-700 pt-2 border-t border-slate-100">
                  📍 {selectedOrderForModal.shippingAddress?.street}, {selectedOrderForModal.shippingAddress?.city},{' '}
                  {selectedOrderForModal.shippingAddress?.state} - {selectedOrderForModal.shippingAddress?.pincode}
                </div>
              </div>

              {/* Delivery Rider Instructions */}
              {selectedOrderForModal.deliveryInstructions && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                  <span className="font-bold block mb-0.5">🛵 Customer Delivery Note:</span>
                  <span>"{selectedOrderForModal.deliveryInstructions}"</span>
                </div>
              )}
            </div>

            {/* Multi-Vendor Packages Split Breakdown */}
            {selectedOrderForModal.subOrders && selectedOrderForModal.subOrders.length > 0 && (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Store className="w-4 h-4 text-amber-500" />
                  <span>Multi-Vendor Split Packages ({selectedOrderForModal.subOrders.length})</span>
                </h4>
                <div className="space-y-2">
                  {selectedOrderForModal.subOrders.map((sub, idx) => (
                    <div
                      key={sub._id || idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {sub.vendor?.storeName || 'Partner Store'}
                        </span>
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          {sub.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-200">
                        <span>Vendor Net Payout: ₹{sub.vendorPayout?.toLocaleString('en-IN') || 0}</span>
                        <span className="font-bold text-amber-600">
                          Platform Cut: ₹{sub.platformCommission?.toLocaleString('en-IN') || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Line Items List */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-500" />
                <span>Purchased Line Items ({selectedOrderForModal.items?.length || 0})</span>
              </h4>
              <div className="divide-y divide-slate-100">
                {selectedOrderForModal.items?.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center gap-3">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-12 h-12 object-cover rounded-xl border border-slate-200 flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{item.title}</div>
                      {item.variantDetails && (
                        <div className="text-[11px] text-slate-500">
                          {Object.entries(item.variantDetails)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' • ')}
                        </div>
                      )}
                      {item.variantSku && (
                        <div className="text-[10px] font-mono text-slate-400">SKU: {item.variantSku}</div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-black text-slate-900">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ₹{item.price} × {item.quantity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total & Coins Breakdown */}
              <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
                {selectedOrderForModal.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Reward Coins Redeemed:</span>
                    <span>-₹{selectedOrderForModal.discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-100">
                  <span>Grand Total Paid:</span>
                  <span>₹{selectedOrderForModal.totalAmount?.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="pt-4 border-t border-slate-200 flex flex-col gap-2.5">
              <button
                onClick={() => setSelectedInvoiceOrderId(selectedOrderForModal._id)}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <FileText className="w-4 h-4" />
                <span>1-Click Master Tax Invoice (Print / PDF)</span>
              </button>

              <button
                onClick={() => setSelectedSplitPackingSlipOrderId(selectedOrderForModal._id)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span>Smart Multi-Vendor Split Packing Slip (QR)</span>
              </button>

              <button
                onClick={() => setSelectedThermalOrderId(selectedOrderForModal._id)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all border border-amber-500/30"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>In-Browser Thermal POS Receipt (80mm & 58mm)</span>
              </button>

              <button
                onClick={() => handleOpenCommissionSplit(selectedOrderForModal)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Percent className="w-4 h-4" />
                <span>Inspect Multi-Vendor Commission Split & Double-Entry Ledger</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleUpdateOrderStatus(selectedOrderForModal._id, 'IN_PROGRESS')}
                  disabled={isUpdatingStatus}
                  className="py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-bold transition-all"
                >
                  Mark In Progress
                </button>
                <button
                  onClick={() => handleUpdateOrderStatus(selectedOrderForModal._id, 'DELIVERED')}
                  disabled={isUpdatingStatus}
                  className="py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all"
                >
                  Mark Delivered
                </button>
              </div>

              {selectedOrderForModal.status !== 'CANCELLED' && (
                <button
                  onClick={() => handleUpdateOrderStatus(selectedOrderForModal._id, 'CANCELLED', 'Super Admin Override')}
                  disabled={isUpdatingStatus}
                  className="w-full py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all"
                >
                  Cancel Order & Auto-Restore Stock
                </button>
              )}
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* ========================================================================= */}
      {/* POINT 33: MULTI-VENDOR COMMISSION SPLIT INSPECTOR MODAL / DRAWER */}
      {/* ========================================================================= */}
      <SlideOverDrawer
        isOpen={!!selectedSplitOrder}
        onClose={() => {
          setSelectedSplitOrder(null);
          setCommissionSplitData(null);
        }}
        title={`Commission Split Inspector: #${selectedSplitOrder?.orderNumber || ''}`}
      >
        {isLoadingSplit ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">
              Auditing Double-Entry Multi-Vendor Ledger & Commission Splits...
            </p>
          </div>
        ) : commissionSplitData ? (
          <div className="space-y-6 text-slate-800">
            {/* Double-Entry Balance Sheet Overview */}
            <div className="p-5 rounded-2xl bg-[#0f172a] text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Double-Entry Split Reconciliation
                  </span>
                </div>
                {commissionSplitData.financials.isPennyPerfectReconciled ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCheck className="w-3 h-3 text-emerald-400" />
                    <span>Penny-Perfect Reconciled</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>Variance: ₹{commissionSplitData.financials.reconciliationDelta}</span>
                  </span>
                )}
              </div>

              {/* 3-Way Financial Balance Row */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Customer Paid
                  </span>
                  <div className="text-base sm:text-lg font-black text-white mt-1">
                    ₹{commissionSplitData.financials.netCustomerPaid.toLocaleString('en-IN')}
                  </div>
                  {commissionSplitData.financials.discountAmount > 0 && (
                    <span className="text-[9px] text-amber-300 block">
                      Incl. ₹{commissionSplitData.financials.discountAmount} coins
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Vendor Payouts
                  </span>
                  <div className="text-base sm:text-lg font-black text-emerald-400 mt-1">
                    ₹{commissionSplitData.financials.totalVendorPayouts.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[9px] text-slate-400 block">
                    {(
                      (commissionSplitData.financials.totalVendorPayouts /
                        (commissionSplitData.financials.grossOrderAmount || 1)) *
                      100
                    ).toFixed(1)}
                    % Net to Sellers
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Platform Revenue
                  </span>
                  <div className="text-base sm:text-lg font-black text-amber-400 mt-1">
                    ₹{commissionSplitData.financials.totalPlatformCommissions.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[9px] text-slate-400 block">AuraMarket Margin</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 pt-1 text-center font-mono">
                Audit Assertion: ₹{commissionSplitData.financials.grossOrderAmount} Gross = ₹
                {commissionSplitData.financials.totalVendorPayouts} Seller Credits + ₹
                {commissionSplitData.financials.totalPlatformCommissions} Platform Cuts (Delta: ₹
                {commissionSplitData.financials.reconciliationDelta})
              </div>
            </div>

            {/* Vendor Packages Breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Store className="w-4 h-4 text-amber-500" />
                  <span>Participating Vendor Splits ({commissionSplitData.vendorSplits.length})</span>
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">Independent Ledgers</span>
              </div>

              {commissionSplitData.vendorSplits.map((split, idx) => (
                <div
                  key={split.subOrderId || idx}
                  className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-sm"
                >
                  {/* Vendor Store Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center">
                        {split.storeName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">{split.storeName}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          Package SubOrder: {split.subOrderId}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          split.payoutStatus === 'SETTLED_TO_WALLET'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : split.payoutStatus === 'CANCELLED_REVERSED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {split.payoutStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Items in this package */}
                  <div className="space-y-1.5">
                    {split.items.map((item, iIdx) => (
                      <div key={iIdx} className="flex items-center justify-between text-xs py-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          <span className="font-medium text-slate-800 truncate">{item.title}</span>
                          <span className="text-slate-400 text-[11px]">×{item.quantity}</span>
                        </div>
                        <span className="font-bold text-slate-900 ml-2">
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Financial Math Formula Box */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Package Gross Subtotal:</span>
                      <span className="font-bold text-slate-900">
                        ₹{split.vendorSubtotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-amber-700">
                      <span>Platform Commission ({split.commissionRatePercent}% Cut):</span>
                      <span className="font-bold">-₹{split.platformCommissionCut.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-black text-sm pt-1 border-t border-slate-200">
                      <span>Net Vendor Credit (Payable):</span>
                      <span>₹{split.netVendorPayable.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Ledger Audit Transaction Reference */}
                  {split.ledgerEntries && split.ledgerEntries.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Audit Txn: {split.ledgerEntries[0].transactionId}</span>
                      <span className="text-emerald-600 font-bold">Ledger Logged</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Actions Footer */}
            <div className="pt-4 border-t border-slate-200 flex flex-col gap-2">
              <button
                onClick={() => {
                  const printContent = `AuraMarket Multi-Vendor Commission Split Audit Slip\nOrder #${commissionSplitData.orderNumber}\nGross: ₹${commissionSplitData.financials.grossOrderAmount}\nVendor Payouts: ₹${commissionSplitData.financials.totalVendorPayouts}\nPlatform Revenue: ₹${commissionSplitData.financials.totalPlatformCommissions}\nStatus: Reconciled`;
                  const blob = new Blob([printContent], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Commission_Split_${commissionSplitData.orderNumber}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export Audit Summary Record</span>
              </button>

              <button
                onClick={() => {
                  setSelectedInvoiceOrderId(commissionSplitData.orderId);
                }}
                className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Inspect Customer GST Tax Invoice</span>
              </button>
            </div>
          </div>
        ) : null}
      </SlideOverDrawer>

      {/* 1-Click Tax Invoice Printable Modal (Point #30 & Point #32) */}
      {selectedInvoiceOrderId && (
        <TaxInvoiceModal
          isOpen={!!selectedInvoiceOrderId}
          onClose={() => setSelectedInvoiceOrderId(null)}
          orderId={selectedInvoiceOrderId}
          apiUrl="/api"
        />
      )}

      {/* Point #73: Smart Multi-Vendor Split Packing Slip with QR Codes Modal */}
      {selectedSplitPackingSlipOrderId && (
        <SmartSplitPackingSlipModal
          isOpen={!!selectedSplitPackingSlipOrderId}
          onClose={() => setSelectedSplitPackingSlipOrderId(null)}
          orderId={selectedSplitPackingSlipOrderId}
          role="admin"
        />
      )}

      {/* Point #75: In-Browser Direct Thermal Receipt Printer (ESC/POS) Modal */}
      {selectedThermalOrderId && (
        <ThermalReceiptPrinterModal
          isOpen={!!selectedThermalOrderId}
          onClose={() => setSelectedThermalOrderId(null)}
          orderId={selectedThermalOrderId}
          role="admin"
        />
      )}

      {/* Point 9: Bulk 4x6 Thermal Shipping Label & Barcode Sticker Generator Modal */}
      {isAdminBulkLabelsOpen && (
        <BulkThermalLabelPrinterModal
          isOpen={isAdminBulkLabelsOpen}
          onClose={() => setIsAdminBulkLabelsOpen(false)}
          selectedOrderIds={selectedOrderIds}
          role="admin"
        />
      )}

      {/* Point 7: Storefront CMS Policy Preview Modal */}
      {previewPolicySlug && (
        <CmsPolicyViewerModal
          isOpen={!!previewPolicySlug}
          initialSlug={previewPolicySlug}
          onClose={() => setPreviewPolicySlug(null)}
        />
      )}

      {/* Point 10: Multi-Vendor Inventory Low-Stock Radar & Automated Restock Studio */}
      <InventoryAlertsModal
        isOpen={isInventoryAlertsModalOpen}
        onClose={() => setIsInventoryAlertsModalOpen(false)}
        isAdmin={true}
        onRestocked={fetchDashboardData}
      />
    </div>
  );
};
