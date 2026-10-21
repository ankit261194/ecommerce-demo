import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  ShoppingBag,
  Star,
  Plus,
  Check,
  Package,
} from 'lucide-react';
import api from '../api/client';
import { useCart } from '../context/CartContext';
import { useLocalization } from '../context/LocalizationContext';

export const PersonalizedRecommendationsShelf = ({ onSelectProduct, title = 'Recommended For You' }) => {
  const { addToCart } = useCart();
  const { formatPrice } = useLocalization();

  const [activeTab, setActiveTab] = useState('personalized');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fbtBundle, setFbtBundle] = useState(null);
  const [addedItemIds, setAddedItemIds] = useState([]);
  const [bundleAdded, setBundleAdded] = useState(false);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/recommendations/personalized?limit=8');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setProducts(res.data.data);
        if (res.data.data.length > 0) {
          fetchFbt(res.data.data[0]._id);
        }
      }
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  const fetchFbt = async (productId) => {
    try {
      const res = await api.get(`/recommendations/fbt/${productId}?discount=10`);
      if (res.data?.success && res.data.data) {
        setFbtBundle(res.data.data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleProductClick = (product) => {
    try {
      api.post('/recommendations/interaction', {
        productId: product._id,
        interactionType: 'VIEW',
        sessionId: localStorage.getItem('auramarket_session_id') || 'guest_session',
      });
    } catch (_) {}

    if (onSelectProduct) {
      onSelectProduct(product);
    }
  };

  const handleAddToCart = (e, product) => {
    e.stopPropagation();
    addToCart(product);
    setAddedItemIds(prev => [...prev, product._id]);

    try {
      api.post('/recommendations/interaction', {
        productId: product._id,
        interactionType: 'ADD_TO_CART',
        sessionId: localStorage.getItem('auramarket_session_id') || 'guest_session',
      });
    } catch (_) {}

    setTimeout(() => {
      setAddedItemIds(prev => prev.filter(id => id !== product._id));
    }, 2000);
  };

  const handleAddBundleToCart = () => {
    if (!fbtBundle) return;
    const items = [fbtBundle.primaryProduct, ...(fbtBundle.bundleItems || [])];
    items.forEach(item => {
      if (item) addToCart(item);
    });
    setBundleAdded(true);
    setTimeout(() => setBundleAdded(false), 2500);
  };

  if (!loading && products.length === 0) return null;

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-400 text-slate-950 font-black shadow-sm">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              AI-Powered Personalized Recommendations
            </h2>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase">
              Point #52
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Collaborative filtering & content similarity calibrated to your browsing velocity
          </p>
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('personalized')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'personalized'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>For You</span>
          </button>

          <button
            onClick={() => setActiveTab('trending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'trending'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
            <span>Trending</span>
          </button>

          {fbtBundle && (
            <button
              onClick={() => setActiveTab('bundle')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'bundle'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-emerald-500" />
              <span>Bundle & Save 10%</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'bundle' && fbtBundle ? (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-2 border-amber-300 dark:border-amber-500/30 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase">
                Frequently Bought Together
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Buy items together & save {fbtBundle.bundleDiscountPercent}% automatically
              </span>
            </div>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 rounded-full">
              Save {formatPrice(fbtBundle.savingsAmount)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-[10px] font-black text-amber-600 uppercase">Main Item</span>
              <img
                src={fbtBundle.primaryProduct?.thumbnail || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'}
                alt={fbtBundle.primaryProduct?.title}
                className="w-full h-32 object-cover rounded-xl"
              />
              <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                {fbtBundle.primaryProduct?.title}
              </p>
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {formatPrice(fbtBundle.primaryProduct?.price)}
              </span>
            </div>

            {fbtBundle.bundleItems?.slice(0, 2).map((item, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 relative">
                <span className="text-[10px] font-black text-blue-600 uppercase">Frequently Paired</span>
                <img
                  src={item?.thumbnail || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400'}
                  alt={item?.title}
                  className="w-full h-32 object-cover rounded-xl"
                />
                <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                  {item?.title}
                </p>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {formatPrice(item?.price)}
                </span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Price for All Items:</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {formatPrice(fbtBundle.finalBundlePrice)}
                </span>
                <span className="text-xs line-through text-slate-400 font-semibold">
                  {formatPrice(fbtBundle.combinedRawPrice)}
                </span>
              </div>
            </div>

            <button
              onClick={handleAddBundleToCart}
              disabled={bundleAdded}
              className={`px-6 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all ${
                bundleAdded
                  ? 'bg-emerald-500 text-white'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/20'
              }`}
            >
              {bundleAdded ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>All Items Added to Cart!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add All 3 Items to Cart (Save 10%)</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {products.map(product => {
            const isAdded = addedItemIds.includes(product._id);
            const discount = product.mrp && product.price && product.mrp > product.price
              ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
              : null;

            return (
              <div
                key={product._id}
                onClick={() => handleProductClick(product)}
                className="group p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 hover:border-amber-400 dark:hover:border-amber-400 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="relative rounded-xl overflow-hidden aspect-square bg-slate-100 dark:bg-slate-900">
                    <img
                      src={product.thumbnail || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {discount && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-rose-500 text-white text-[9px] font-black uppercase">
                        {discount}% OFF
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                      {product.brand || 'Verified Store'}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-amber-500 transition-colors">
                      {product.title}
                    </h3>
                  </div>
                </div>

                <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-black text-slate-900 dark:text-white block">
                      {formatPrice(product.price)}
                    </span>
                    {product.mrp && product.mrp > product.price && (
                      <span className="text-[10px] line-through text-slate-400">
                        {formatPrice(product.mrp)}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleAddToCart(e, product)}
                    className={`p-2 rounded-xl transition-all ${
                      isAdded
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-900 hover:bg-amber-400 text-white hover:text-slate-950 dark:bg-slate-700'
                    }`}
                    title="Add to Cart"
                  >
                    {isAdded ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
