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
} from 'lucide-react';
import { BentoGrid, BentoCard } from '../components/BentoGrid';
import { SlideOverDrawer } from '../components/SlideOverDrawer';
import api from '../api/client';

export const VendorPortal = () => {
  // Vendor store state
  const [vendorData, setVendorData] = useState({
    storeName: 'Apex Tech Hub',
    walletBalance: 24500,
    totalSales: 185000,
    commissionRate: 8,
    rating: 4.9,
  });

  const [products, setProducts] = useState([
    {
      id: 'p1',
      title: 'Aura Pro ANC Wireless Noise-Cancelling Headphones',
      sku: 'APX-HEAD-001',
      mrp: 14999,
      sellingPrice: 8999,
      stock: 45,
      category: 'Electronics & Audio',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
      variantsCount: 2,
    },
    {
      id: 'p2',
      title: 'AeroWatch S9 Ultra Smartwatch with AMOLED Display',
      sku: 'APX-WTCH-002',
      mrp: 9999,
      sellingPrice: 4499,
      stock: 30,
      category: 'Watches & Accessories',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
      variantsCount: 0,
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
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('10000');
  const [notification, setNotification] = useState(null);

  const [newProduct, setNewProduct] = useState({
    title: '',
    category: 'Electronics & Audio',
    mrp: '',
    sellingPrice: '',
    stock: '',
    sku: '',
    colorVariant: '',
    sizeVariant: '',
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
          category: p.category?.name || 'General',
          image: p.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
          variantsCount: p.variants?.length || 0,
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
        images: ['https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500'],
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
      image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500',
      variantsCount: newProduct.colorVariant || newProduct.sizeVariant ? 2 : 0,
    };

    setProducts(prev => [created, ...prev]);
    setIsAddProductDrawerOpen(false);
    setNotification(`Product '${created.title}' added to store inventory successfully!`);
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

        <div className="flex items-center gap-3">
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

      {/* Order Fulfillment Workflow (Multi-Vendor Split Tracking) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-500" />
            Orders Assigned to Your Store (Package Dispatch)
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Customer orders split into store-specific packing slips. Update status for courier pickup.
          </p>
        </div>

        <div className="space-y-4">
          {subOrders.map(order => (
            <div
              key={order.id}
              className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-300 transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-black text-slate-900 text-base">{order.id}</span>
                  <span className="text-xs text-slate-400 font-medium">{order.date}</span>
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      order.status === 'dispatched'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : order.status === 'packed'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600">
                  Customer: <span className="font-bold text-slate-900">{order.customerName}</span> | Items:{' '}
                  {order.items.map(i => `${i.title} (${i.qty}x)`).join(', ')}
                </p>

                <div className="flex items-center gap-4 text-xs font-bold pt-1">
                  <span className="text-slate-900">Subtotal: ₹{order.subTotal.toLocaleString('en-IN')}</span>
                  <span className="text-slate-500">Fee (8%): -₹{order.commissionCut.toFixed(2)}</span>
                  <span className="text-emerald-700 font-black">
                    Net Payout: ₹{order.vendorEarning.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Status Stepper Actions */}
              <div className="flex items-center gap-2">
                {order.status === 'placed' && (
                  <button
                    onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                  >
                    Accept Order
                  </button>
                )}

                {order.status === 'confirmed' && (
                  <button
                    onClick={() => handleUpdateOrderStatus(order.id, 'packed')}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm"
                  >
                    Mark as Packed
                  </button>
                )}

                {order.status === 'packed' && (
                  <button
                    onClick={() => handleUpdateOrderStatus(order.id, 'dispatched')}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                  >
                    Handover to Courier
                  </button>
                )}

                {order.status === 'dispatched' && (
                  <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Dispatched
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inventory & Products Catalog */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Boxes className="w-5 h-5 text-amber-500" />
          Store Product Catalog ({products.length} Items)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map(p => (
            <div key={p.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3 hover:shadow-md transition-shadow">
              <img src={p.image} alt={p.title} className="w-full h-44 object-cover rounded-lg border border-slate-100" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{p.title}</h3>
                <p className="text-xs text-slate-400 font-medium">SKU: {p.sku}</p>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 line-through mr-1.5 font-medium">₹{p.mrp}</span>
                  <span className="font-black text-slate-900 text-sm">₹{p.sellingPrice}</span>
                </div>
                <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Stock: {p.stock}
                </span>
              </div>
            </div>
          ))}
        </div>
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

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md transition-all mt-4"
          >
            Publish to Marketplace
          </button>
        </form>
      </SlideOverDrawer>

      {/* Payout Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" /> Withdraw Earnings
            </h3>
            <p className="text-xs text-slate-600">
              Available Balance: <strong className="text-slate-900">₹{vendorData.walletBalance.toLocaleString('en-IN')}</strong>
            </p>
            <div>
              <label className="text-xs font-bold uppercase text-slate-600">Amount to Transfer</label>
              <input
                type="number"
                value={payoutAmount}
                max={vendorData.walletBalance}
                onChange={e => setPayoutAmount(e.target.value)}
                className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              Transfer to: <strong>HDFC Bank A/C ****4092 (IFSC: HDFC0001024)</strong>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handlePayoutSubmit}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
