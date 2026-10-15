import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Printer,
  PauseCircle,
  PlayCircle,
  X,
  CreditCard,
  QrCode,
  IndianRupee,
  User,
  Phone,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Receipt,
  Layers,
  Percent,
} from 'lucide-react';
import api from '../api/client';

const PosCounterScreen = ({ isOpen, onClose, storeName = 'AuraMarket Store' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Cart State
  const [cart, setCart] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [customer, setCustomer] = useState({ name: 'Walk-in Customer', phone: '' });

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cashTendered, setCashTendered] = useState('');
  const [paperSize, setPaperSize] = useState('80mm'); // '80mm' | '58mm'

  // Parked Carts
  const [parkedCarts, setParkedCarts] = useState([]);
  const [isParkedModalOpen, setIsParkedModalOpen] = useState(false);

  // Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Daily Metrics
  const [dailyMetrics, setDailyMetrics] = useState({
    totalOrders: 0,
    totalSales: 0,
    cashCollected: 0,
    upiCollected: 0,
    cardCollected: 0,
  });

  const barcodeInputRef = useRef(null);

  // Load products on mount
  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchParkedCarts();
      fetchPosOrdersSummary();
    }
  }, [isOpen, selectedCategory]);

  // Keyboard Shortcuts (F2 search, F4 clear, F8 pay, F9 park)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (confirm('Clear current POS cart?')) {
          setCart([]);
          setDiscountAmount(0);
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) {
          handleCompleteOrder();
        }
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) {
          handleParkCart();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, cart, paymentMethod, cashTendered, discountAmount, customer]);

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const res = await api.get('/pos/products', {
        params: {
          q: searchTerm,
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        },
      });
      if (res.data?.success) {
        setProducts(res.data.data);
      }
    } catch (err) {
      console.warn('POS Product API fallback:', err.message);
      // Fallback demo items
      setProducts([
        {
          _id: 'prod-101',
          title: 'Aura Pro ANC Headphones',
          sku: 'APX-HEAD-001',
          barcode: '8901234567890',
          price: 8999,
          stock: 42,
          category: 'Electronics & Audio',
          thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200',
          taxRate: 18,
          hsnCode: '8518',
        },
        {
          _id: 'prod-102',
          title: 'AeroWatch S9 Ultra Smartwatch',
          sku: 'APX-WTCH-002',
          barcode: '8901234567891',
          price: 4499,
          stock: 19,
          category: 'Watches & Accessories',
          thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200',
          taxRate: 18,
          hsnCode: '9102',
        },
        {
          _id: 'prod-103',
          title: 'Organic Fairtrade Coffee Beans 500g',
          sku: 'APX-GROC-003',
          barcode: '8901234567892',
          price: 650,
          stock: 65,
          category: 'Grocery & Gourmet',
          thumbnail: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=200',
          taxRate: 5,
          hsnCode: '0901',
        },
        {
          _id: 'prod-104',
          title: 'Casual Linen Summer Shirt',
          sku: 'APX-FASH-004',
          barcode: '8901234567893',
          price: 1899,
          stock: 28,
          category: 'Fashion & Apparel',
          thumbnail: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=200',
          taxRate: 12,
          hsnCode: '6205',
        },
      ]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const fetchParkedCarts = async () => {
    try {
      const res = await api.get('/pos/parked');
      if (res.data?.success) {
        setParkedCarts(res.data.data);
      }
    } catch (err) {
      console.warn('Fetch parked carts fallback');
    }
  };

  const fetchPosOrdersSummary = async () => {
    try {
      const res = await api.get('/pos/orders');
      if (res.data?.success && res.data.metrics) {
        setDailyMetrics(res.data.metrics);
      }
    } catch (err) {
      console.warn('POS orders summary fallback');
    }
  };

  // Add item to cart
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      if (existing) {
        return prev.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [
        ...prev,
        {
          _id: product._id,
          productId: product._id,
          title: product.title,
          sku: product.sku,
          barcode: product.barcode,
          price: product.price,
          quantity: 1,
          subtotal: product.price,
          taxRate: product.taxRate || 18,
          hsn: product.hsnCode || '8518',
        },
      ];
    });
  };

  // Update item quantity
  const updateQuantity = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item._id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0
              ? { ...item, quantity: newQty, subtotal: newQty * item.price }
              : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item._id !== id));
  };

  // Barcode enter handler
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    const term = searchTerm.trim().toLowerCase();
    const match = products.find(
      (p) =>
        p.barcode?.toLowerCase() === term ||
        p.sku?.toLowerCase() === term ||
        p.title.toLowerCase().includes(term)
    );

    if (match) {
      addToCart(match);
      setSearchTerm('');
    } else {
      fetchProducts();
    }
  };

  // Totals calculations
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const discount = Math.max(0, parseFloat(discountAmount) || 0);
  const grandTotal = Math.max(0, subtotal - discount);
  const taxEstimated = Math.round(grandTotal * 0.18 * 100) / 100;

  // Change Return Calculation
  const tendered = parseFloat(cashTendered) || 0;
  const changeDue = paymentMethod === 'CASH' && tendered >= grandTotal ? tendered - grandTotal : 0;

  // Handle Complete Order
  const handleCompleteOrder = async () => {
    if (cart.length === 0) return;

    setIsPrinting(true);
    try {
      const payload = {
        items: cart.map((i) => ({
          productId: i.productId || i._id,
          title: i.title,
          price: i.price,
          quantity: i.quantity,
          taxRate: i.taxRate,
          hsn: i.hsn,
        })),
        customer,
        paymentMethod,
        paymentDetails: {
          cashTendered: tendered,
          cashChangeDue: changeDue,
        },
        paperSize,
        discountAmount: discount,
      };

      const res = await api.post('/pos/orders', payload);
      if (res.data?.success) {
        const orderData = res.data.data;
        // Fetch receipt format
        const receiptRes = await api.get(`/pos/orders/${orderData._id}/receipt`);
        if (receiptRes.data?.success) {
          setActiveReceipt(receiptRes.data.receipt);
        } else {
          setActiveReceipt({
            invoiceNumber: orderData.posInvoiceNumber,
            createdAt: orderData.createdAt,
            paperSize,
            store: { name: storeName, address: 'High Street Galleria, Mumbai', phone: '+91 98765 43210', gstin: '27AABCA1234F1Z5' },
            cashier: { name: orderData.cashierName || 'Cashier' },
            customer,
            items: orderData.items,
            summary: { subtotal, discountAmount: discount, grandTotal, taxTotal: taxEstimated },
            payment: { method: paymentMethod, details: { cashTendered: tendered, cashChangeDue: changeDue } },
          });
        }

        // Clear active cart & refresh metrics
        setCart([]);
        setDiscountAmount(0);
        setCashTendered('');
        fetchPosOrdersSummary();
      }
    } catch (err) {
      console.warn('POS order error fallback:', err.message);
      // Local fallback for offline/demo operation
      setActiveReceipt({
        invoiceNumber: `POS-${Date.now().toString().slice(-6)}`,
        createdAt: new Date().toISOString(),
        paperSize,
        store: { name: storeName, address: 'High Street Galleria, Mumbai 400051', phone: '+91 98765 43210', gstin: '27AABCA1234F1Z5' },
        cashier: { name: 'Counter Cashier' },
        customer,
        items: cart,
        summary: { subtotal, discountAmount: discount, grandTotal, taxTotal: taxEstimated },
        payment: { method: paymentMethod, details: { cashTendered: tendered, cashChangeDue: changeDue } },
      });
      setCart([]);
      setDiscountAmount(0);
      setCashTendered('');
    } finally {
      setIsPrinting(false);
    }
  };

  // Park Cart
  const handleParkCart = async () => {
    if (cart.length === 0) return;

    try {
      const res = await api.post('/pos/park', {
        items: cart,
        customer,
        discountAmount: discount,
        parkedNotes: `${customer.name} (${cart.length} items)`,
      });
      if (res.data?.success) {
        setCart([]);
        setCustomer({ name: 'Walk-in Customer', phone: '' });
        setDiscountAmount(0);
        fetchParkedCarts();
      }
    } catch (err) {
      console.warn('Park cart fallback');
      setParkedCarts((prev) => [
        ...prev,
        {
          _id: `park-${Date.now()}`,
          posInvoiceNumber: `HOLD-${Date.now().toString().slice(-4)}`,
          customer,
          items: cart,
          grandTotal,
          parkedNotes: `${customer.name} (${cart.length} items)`,
          createdAt: new Date().toISOString(),
        },
      ]);
      setCart([]);
      setDiscountAmount(0);
    }
  };

  // Resume Parked Cart
  const handleResumeCart = async (parkedOrder) => {
    try {
      await api.delete(`/pos/parked/${parkedOrder._id}`);
    } catch (err) {
      console.warn('Resume cart API fallback');
    }

    setCart(
      parkedOrder.items.map((i) => ({
        _id: i.product?._id || i.product || i._id,
        productId: i.product?._id || i.product || i._id,
        title: i.title,
        price: i.price,
        quantity: i.quantity,
        subtotal: i.subtotal || i.price * i.quantity,
      }))
    );
    if (parkedOrder.customer) setCustomer(parkedOrder.customer);
    setParkedCarts((prev) => prev.filter((p) => p._id !== parkedOrder._id));
    setIsParkedModalOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4">
      <div className="relative w-full max-w-7xl h-[95vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">{storeName}</h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ⚡ Offline POS Counter Terminal
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Point #18
                </span>
              </div>
              <p className="text-xs text-slate-400">
                High-Speed Barcode Billing, Multi-Queue Parking & Instant 80mm/58mm Thermal Slip Printing
              </p>
            </div>
          </div>

          {/* Right Header Badges & Actions */}
          <div className="flex items-center gap-3">
            {/* Today Sales Summary */}
            <div className="hidden lg:flex items-center gap-4 px-4 py-2 rounded-2xl bg-slate-800/60 border border-slate-700/50 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block font-semibold uppercase">Bills Today</span>
                <span className="font-black text-white">{dailyMetrics.totalOrders || 0}</span>
              </div>
              <div className="w-px h-6 bg-slate-700"></div>
              <div>
                <span className="text-slate-400 text-[10px] block font-semibold uppercase">Today Sales</span>
                <span className="font-black text-emerald-400">₹{dailyMetrics.totalSales.toLocaleString('en-IN')}</span>
              </div>
              <div className="w-px h-6 bg-slate-700"></div>
              <div>
                <span className="text-slate-400 text-[10px] block font-semibold uppercase">Cash / UPI</span>
                <span className="font-bold text-slate-300">
                  ₹{dailyMetrics.cashCollected} / ₹{dailyMetrics.upiCollected}
                </span>
              </div>
            </div>

            {/* Parked Carts Button */}
            <button
              type="button"
              onClick={() => setIsParkedModalOpen(true)}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold transition-all"
            >
              <PauseCircle className="w-4 h-4" />
              <span>Parked ({parkedCarts.length})</span>
              {parkedCarts.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 text-slate-950 rounded-full text-[10px] font-black flex items-center justify-center">
                  {parkedCarts.length}
                </span>
              )}
            </button>

            {/* Thermal Slip Size Selector */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPaperSize('80mm')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  paperSize === '80mm' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('58mm')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  paperSize === '58mm' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                58mm
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content: Split Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* Left Column: Product Search & Quick Catalog (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col border-r border-slate-800 overflow-hidden bg-slate-950/40">
            
            {/* Search & Barcode Input */}
            <div className="p-4 border-b border-slate-800 flex items-center gap-3">
              <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
                <Barcode className="w-5 h-5 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Scan barcode gun or type SKU / title (Press Enter to add / F2 to focus)..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-2xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                />
              </form>

              <button
                type="button"
                onClick={fetchProducts}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                title="Refresh Product Catalog"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Category Quick Pills */}
            <div className="px-4 py-2 border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {['ALL', 'Electronics & Audio', 'Watches & Accessories', 'Fashion & Apparel', 'Grocery & Gourmet'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50'
                  }`}
                >
                  {cat === 'ALL' ? '📦 All Items' : cat}
                </button>
              ))}
            </div>

            {/* Product Cards Grid */}
            <div className="flex-1 p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
              {isLoadingProducts ? (
                <div className="col-span-full py-16 text-center text-slate-500 text-sm">
                  Loading catalog inventory...
                </div>
              ) : products.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-500 text-sm">
                  No matching products found. Try scanning another barcode or SKU.
                </div>
              ) : (
                products.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => addToCart(p)}
                    className="flex flex-col text-left p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-400/50 transition-all group relative overflow-hidden"
                  >
                    <div className="aspect-video w-full rounded-xl bg-slate-950 overflow-hidden mb-2 relative">
                      <img
                        src={p.thumbnail}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md bg-slate-950/80 text-[10px] font-black text-amber-400 border border-amber-400/30">
                        {p.stock} left
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-1 mb-1 group-hover:text-amber-400 transition-colors">
                      {p.title}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-mono text-[10px]">{p.sku}</span>
                      <span className="text-slate-500">GST {p.taxRate}%</span>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-1 border-t border-slate-800">
                      <span className="text-sm font-black text-white">₹{p.price.toLocaleString('en-IN')}</span>
                      <span className="p-1.5 rounded-lg bg-amber-400 text-slate-950 group-hover:scale-110 transition-transform">
                        <Plus className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Column: POS Cart & Instant Counter Checkout (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col bg-slate-900 overflow-hidden">
            
            {/* Customer Details Strip */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/30 grid grid-cols-2 gap-3">
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  placeholder="Customer Name"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  placeholder="Mobile (For SMS Bill)"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-2">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                  <div className="w-16 h-16 rounded-3xl bg-slate-800/50 flex items-center justify-center mb-3">
                    <Receipt className="w-8 h-8 text-slate-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-400">POS Cart is Empty</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Scan a product barcode or click items on the left to start billing.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                    <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">F2</kbd> Scan
                    <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 ml-2">F9</kbd> Park
                    <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 ml-2">F8</kbd> Pay
                  </div>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item._id}
                    className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="font-mono">{item.sku}</span>
                        <span>•</span>
                        <span>₹{item.price.toLocaleString('en-IN')} ea</span>
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item._id, -1)}
                        className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center font-bold text-xs text-white">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item._id, 1)}
                        className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right w-20">
                      <span className="text-xs font-black text-white block">
                        ₹{item.subtotal.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item._id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Calculations & Payment Section */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 space-y-3">
              
              {/* Discount Input & Subtotal */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Subtotal ({cart.reduce((sum, i) => sum + i.quantity, 0)} items)</span>
                <span className="font-bold text-white">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-amber-400" /> Special Discount
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">₹</span>
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    placeholder="0"
                    className="w-20 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-right text-amber-400 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Big Grand Total */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                    Grand Total Payable
                  </span>
                  <span className="text-xs text-slate-400">Inclusive of All GST & Taxes</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-white tracking-tight">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'CASH', label: '💵 Cash', icon: IndianRupee },
                  { id: 'UPI', label: '📱 UPI QR', icon: QrCode },
                  { id: 'CARD', label: '💳 Card', icon: CreditCard },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                      paymentMethod === m.id
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Cash Tendered & Change Return Calculator */}
              {paymentMethod === 'CASH' && (
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Cash Tendered by Customer:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">₹</span>
                      <input
                        type="number"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        placeholder={grandTotal.toString()}
                        className="w-24 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-right text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {/* Quick Tender Buttons */}
                  <div className="flex items-center gap-1.5 justify-end">
                    {[grandTotal, 100, 200, 500, 2000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCashTendered(amt.toString())}
                        className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300"
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>

                  {/* Live Change Due Badge */}
                  {changeDue > 0 && (
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs font-bold text-emerald-400">
                      <span>Change to Return to Customer:</span>
                      <span className="text-sm font-black">₹{changeDue.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* UPI QR Display */}
              {paymentMethod === 'UPI' && (
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                  <div className="w-14 h-14 bg-white p-1 rounded-xl shrink-0 flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-slate-950" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Dynamic Bharat-Pe UPI QR</h5>
                    <p className="text-[10px] text-slate-400">
                      Ask customer to scan using GPay, PhonePe, or Paytm for ₹{grandTotal}
                    </p>
                    <span className="text-[10px] font-mono text-amber-400">auramarket.store@okaxis</span>
                  </div>
                </div>
              )}

              {/* Action Buttons: Hold Cart & Print Receipt */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleParkCart}
                  disabled={cart.length === 0}
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-bold border border-slate-700 transition-all"
                  title="F9: Hold customer cart to serve next person in queue"
                >
                  <PauseCircle className="w-4 h-4 text-amber-400" />
                  <span>Hold Cart (F9)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCompleteOrder}
                  disabled={cart.length === 0 || isPrinting}
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all"
                  title="F8: Record payment & print thermal receipt"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isPrinting ? 'Processing...' : 'Pay & Print (F8)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Parked Carts Modal */}
        {isParkedModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <PauseCircle className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">Parked Carts Queue</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsParkedModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-3 max-h-80 overflow-y-auto">
                {parkedCarts.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-6">No held carts in queue.</p>
                ) : (
                  parkedCarts.map((p) => (
                    <div
                      key={p._id}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400">
                            {p.posInvoiceNumber}
                          </span>
                          <span className="text-xs text-white font-medium">{p.customer?.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {p.items?.length || 0} items • ₹{p.grandTotal} • {new Date(p.createdAt).toLocaleTimeString()}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleResumeCart(p)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold"
                      >
                        <PlayCircle className="w-4 h-4" />
                        <span>Resume</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Thermal Receipt Print Modal (80mm / 58mm) */}
        {activeReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <div className="w-full max-w-md bg-white text-slate-950 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col font-mono text-xs max-h-[90vh]">
              
              <div className="flex items-center justify-between pb-3 border-b border-dashed border-slate-300 no-print">
                <span className="text-[11px] font-bold text-slate-600 uppercase">
                  Thermal Slip Preview ({activeReceipt.paperSize || paperSize})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveReceipt(null)}
                    className="p-1 text-slate-500 hover:text-slate-900"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Printable Thermal Receipt Content */}
              <div className="py-4 overflow-y-auto space-y-2 text-center" id="thermal-receipt-area">
                <h2 className="text-base font-black tracking-tight">{activeReceipt.store?.name}</h2>
                <p className="text-[10px] text-slate-600">{activeReceipt.store?.address}</p>
                <p className="text-[10px] text-slate-600">Tel: {activeReceipt.store?.phone}</p>
                <p className="text-[10px] font-bold">GSTIN: {activeReceipt.store?.gstin}</p>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                <div className="text-left text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Invoice: {activeReceipt.invoiceNumber}</span>
                    <span>Date: {new Date(activeReceipt.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cashier: {activeReceipt.cashier?.name}</span>
                    <span>Time: {new Date(activeReceipt.createdAt).toLocaleTimeString()}</span>
                  </div>
                  {activeReceipt.customer?.phone && (
                    <div>Customer: {activeReceipt.customer.name} ({activeReceipt.customer.phone})</div>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Items Table */}
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="border-b border-dashed border-slate-300">
                      <th className="py-1">ITEM</th>
                      <th className="text-center py-1">QTY</th>
                      <th className="text-right py-1">PRICE</th>
                      <th className="text-right py-1">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeReceipt.items?.map((it, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-1 font-sans">{it.title}</td>
                        <td className="text-center py-1">{it.quantity}</td>
                        <td className="text-right py-1">{it.price}</td>
                        <td className="text-right py-1 font-bold">₹{it.subtotal || it.price * it.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Summary Table */}
                <div className="text-right text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{activeReceipt.summary?.subtotal}</span>
                  </div>
                  {activeReceipt.summary?.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span>-₹{activeReceipt.summary?.discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-black border-t border-slate-300 pt-1">
                    <span>GRAND TOTAL:</span>
                    <span>₹{activeReceipt.summary?.grandTotal}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Payment ({activeReceipt.payment?.method}):</span>
                    <span>₹{activeReceipt.summary?.grandTotal}</span>
                  </div>
                  {activeReceipt.payment?.details?.cashChangeDue > 0 && (
                    <div className="flex justify-between text-[10px] text-slate-800 font-bold">
                      <span>Change Returned:</span>
                      <span>₹{activeReceipt.payment.details.cashChangeDue}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-400 my-3"></div>

                <div className="text-center space-y-1 text-[9px] text-slate-600">
                  <p>*** THANK YOU FOR VISITING ***</p>
                  <p>Goods once sold can be exchanged within 7 days.</p>
                  <p className="font-mono pt-1 text-[8px]">{activeReceipt.invoiceNumber}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveReceipt(null)}
                className="w-full mt-3 py-2 bg-slate-900 text-white rounded-xl font-sans text-xs font-bold no-print"
              >
                Close Receipt & Ready for Next Customer
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PosCounterScreen;
