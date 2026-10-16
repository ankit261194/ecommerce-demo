import React, { useState, useEffect } from 'react';
import {
  Video,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  ShoppingBag,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Radio,
  Clock,
  Layers,
  Sliders,
  DollarSign,
  Tag,
  Search,
  ExternalLink,
  RefreshCw,
  Flame,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import api from '../api/client';

export default function AdminLiveVideoShoppingManager() {
  const [activeTab, setActiveTab] = useState('reels'); // 'reels' | 'create' | 'studio'
  const [reels, setReels] = useState([]);
  const [telemetry, setTelemetry] = useState({
    totalReels: 0,
    activeReels: 0,
    liveStreamsCount: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    estimatedGmv: 0,
    clickThroughRate: 0
  });
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [previewReel, setPreviewReel] = useState(null);

  // New Reel Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-listening-to-music-with-headphones-40994-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
    status: 'ACTIVE',
    isLive: false,
    liveViewerCount: 120,
    scheduledAt: '',
    selectedProductId: '',
    customPrice: '',
    tagX: 50,
    tagY: 70
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Studio Simulator State
  const [studioIsPlaying, setStudioIsPlaying] = useState(true);
  const [studioIsMuted, setStudioIsMuted] = useState(true);
  const [studioHearts, setStudioHearts] = useState([]);
  const [studioComments, setStudioComments] = useState([
    { id: 1, user: 'Aman S.', text: 'Is this eligible for 15-minute quick delivery?' },
    { id: 2, user: 'Priya K.', text: 'Audio quality is so punchy! Just ordered 1 pair.' },
    { id: 3, user: 'Dev R.', text: 'Can we pay via Cash on Delivery with OTP?' }
  ]);
  const [newStudioComment, setNewStudioComment] = useState('');

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAdminReels = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/video-shopping/admin/reels');
      if (res.data?.success) {
        setReels(res.data.data.reels || []);
        setTelemetry(res.data.data.telemetry || {});
        if (res.data.data.reels?.length > 0 && !previewReel) {
          setPreviewReel(res.data.data.reels[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load reels', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?limit=50');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setCatalogProducts(res.data.data);
        if (res.data.data.length > 0 && !formData.selectedProductId) {
          setFormData(prev => ({
            ...prev,
            selectedProductId: res.data.data[0]._id,
            customPrice: Math.round(res.data.data[0].sellingPrice * 0.85)
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load products', err);
    }
  };

  useEffect(() => {
    fetchAdminReels();
    fetchProducts();
  }, []);

  const handleCreateReel = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.videoUrl) {
      showToast('Title and video URL are required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        videoUrl: formData.videoUrl,
        thumbnailUrl: formData.thumbnailUrl,
        status: formData.status,
        isLive: formData.isLive,
        liveViewerCount: formData.isLive ? Number(formData.liveViewerCount || 100) : 0,
        scheduledAt: formData.scheduledAt || null,
        products: formData.selectedProductId
          ? [
              {
                product: formData.selectedProductId,
                tagX: formData.tagX,
                tagY: formData.tagY,
                customPrice: formData.customPrice ? Number(formData.customPrice) : null,
                isFeatured: true
              }
            ]
          : []
      };

      const res = await api.post('/video-shopping/admin/reels', payload);
      if (res.data?.success) {
        showToast('Shoppable Reel published successfully!');
        setFormData({
          title: '',
          description: '',
          videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-man-adjusting-a-watch-41122-large.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
          status: 'ACTIVE',
          isLive: false,
          liveViewerCount: 120,
          scheduledAt: '',
          selectedProductId: catalogProducts[0]?._id || '',
          customPrice: catalogProducts[0] ? Math.round(catalogProducts[0].sellingPrice * 0.85) : '',
          tagX: 50,
          tagY: 70
        });
        fetchAdminReels();
        setActiveTab('reels');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create reel', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLive = async (reel) => {
    try {
      const res = await api.put(`/video-shopping/admin/reels/${reel._id}`, {
        isLive: !reel.isLive,
        liveViewerCount: !reel.isLive ? 180 : 0
      });
      if (res.data?.success) {
        showToast(reel.isLive ? 'Live broadcast ended' : '🔴 Reel switched to LIVE stream mode!');
        fetchAdminReels();
      }
    } catch (err) {
      showToast('Error toggling live state', 'error');
    }
  };

  const handleDeleteReel = async (id) => {
    if (!window.confirm('Are you sure you want to delete this shoppable reel?')) return;
    try {
      const res = await api.delete(`/video-shopping/admin/reels/${id}`);
      if (res.data?.success) {
        showToast('Reel deleted successfully');
        fetchAdminReels();
        if (previewReel?._id === id) setPreviewReel(null);
      }
    } catch (err) {
      showToast('Failed to delete reel', 'error');
    }
  };

  const handleAddStudioHeart = () => {
    const id = Date.now();
    setStudioHearts(prev => [...prev, id]);
    setTimeout(() => {
      setStudioHearts(prev => prev.filter(h => h !== id));
    }, 2000);
  };

  const handleSendStudioComment = (e) => {
    e.preventDefault();
    if (!newStudioComment.trim()) return;
    setStudioComments(prev => [
      ...prev,
      { id: Date.now(), user: 'You (Host)', text: newStudioComment.trim() }
    ]);
    setNewStudioComment('');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-sm font-bold flex items-center gap-2.5 animate-slide-up ${
            notification.type === 'error'
              ? 'bg-rose-900 border-rose-700 text-rose-100'
              : 'bg-emerald-900 border-emerald-700 text-emerald-100'
          }`}
        >
          {notification.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-300" /> : <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-15 pointer-events-none flex items-center pr-6">
          <Video className="w-56 h-56 stroke-[1.5]" />
        </div>
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black uppercase tracking-wider text-white">
            <Radio className="w-3.5 h-3.5 text-white animate-pulse" />
            <span>Point #27 • Live Video Shopping & Shoppable Reels Studio</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Live Stream Shopping & Vertical Reels Hub
          </h2>
          <p className="text-pink-100 text-xs sm:text-sm font-semibold leading-relaxed">
            Boost storefront engagement with Instagram/TikTok-style 9:16 shoppable video feeds. Tag products directly on videos with live checkout overlays and real-time interactive audience reactions.
          </p>
        </div>
      </div>

      {/* Telemetry KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-white space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Reels</span>
            <Video className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-black text-pink-400">{telemetry.totalReels || 0}</div>
          <span className="text-[10px] text-slate-500">{telemetry.activeReels || 0} active in feed</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-white space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Live Broadcasts</span>
            <Radio className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-400">{telemetry.liveStreamsCount || 0}</div>
          <span className="text-[10px] text-slate-500">Currently broadcasting</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-white space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Views</span>
            <Eye className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {(telemetry.totalViews || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500">Video impressions</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-white space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Video Commerce GMV</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            ₹{(telemetry.estimatedGmv || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500">Direct reel checkouts</span>
        </div>

        <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-white space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Click-Through</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {telemetry.clickThroughRate ? `${telemetry.clickThroughRate}%` : '8.5%'}
          </div>
          <span className="text-[10px] text-slate-500">Reel to product cart</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('reels')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'reels'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Shoppable Reels Feed</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950/30 text-white font-black">
              {reels.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'create'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Upload & Tag Products</span>
          </button>

          <button
            onClick={() => setActiveTab('studio')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'studio'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Radio className="w-4 h-4 text-rose-300" />
            <span>Interactive Live Studio Simulator</span>
          </button>
        </div>

        <button
          onClick={fetchAdminReels}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700"
          title="Refresh Feed"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* TAB 1: ALL REELS CATALOG */}
      {activeTab === 'reels' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-3 p-12 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-rose-500 mb-2" />
              <p className="text-xs font-bold">Loading Shoppable Reels...</p>
            </div>
          ) : reels.length === 0 ? (
            <div className="col-span-3 p-12 text-center text-slate-400 bg-slate-900/60 rounded-3xl border border-slate-800 space-y-2">
              <Video className="w-12 h-12 mx-auto text-slate-600 mb-2" />
              <h4 className="text-sm font-bold text-white">No Reels Found</h4>
              <p className="text-xs text-slate-500">Click "Upload & Tag Products" to add your first shoppable reel.</p>
            </div>
          ) : (
            reels.map(reel => {
              const primaryProduct = reel.products?.[0]?.product;
              return (
                <div
                  key={reel._id}
                  className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all group"
                >
                  {/* Video Thumbnail Preview */}
                  <div className="relative aspect-[9/12] bg-slate-950 overflow-hidden">
                    <img
                      src={reel.thumbnailUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600'}
                      alt={reel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Live Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      {reel.isLive ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          <span>LIVE • {reel.liveViewerCount || 120} watching</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-slate-300 font-bold text-[10px] uppercase">
                          {reel.status}
                        </span>
                      )}
                    </div>

                    {/* Stats Overlay */}
                    <div className="absolute top-3 right-3 flex flex-col gap-1.5 text-white text-[10px] font-bold">
                      <span className="bg-slate-950/70 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Eye className="w-3 h-3 text-slate-400" />
                        <span>{reel.viewsCount || 0}</span>
                      </span>
                      <span className="bg-slate-950/70 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                        <span>{reel.likesCount || 0}</span>
                      </span>
                    </div>

                    {/* Tagged Product Card Overlay */}
                    {primaryProduct && (
                      <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-white/10 flex items-center gap-2.5 text-white">
                        {primaryProduct.images?.[0] ? (
                          <img
                            src={primaryProduct.images[0]}
                            alt={primaryProduct.title}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-700"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                            <ShoppingBag className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-[11px] truncate block text-white">
                            {primaryProduct.title}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                            <span className="font-black text-emerald-400">
                              ₹{reel.products[0].customPrice || primaryProduct.sellingPrice}
                            </span>
                            <span className="text-slate-400 line-through">
                              ₹{primaryProduct.mrp}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reel Info & Actions */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h4 className="font-bold text-white text-xs line-clamp-1">{reel.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                        {reel.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                      <button
                        onClick={() => handleToggleLive(reel)}
                        className={`px-3 py-1.5 rounded-xl font-black text-[11px] transition-all flex items-center gap-1.5 ${
                          reel.isLive
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Radio className="w-3.5 h-3.5 text-rose-400" />
                        <span>{reel.isLive ? 'End Live' : 'Go Live'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteReel(reel._id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete Reel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: UPLOAD & TAG PRODUCTS */}
      {activeTab === 'create' && (
        <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 shadow-2xl">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-rose-500" />
              <span>Create Shoppable Reel / Live Shopping Stream</span>
            </h3>
            <p className="text-xs text-slate-400">
              Provide a vertical video link (MP4/CDN), associate catalog products, and set custom flash discount pricing.
            </p>
          </div>

          <form onSubmit={handleCreateReel} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Reel Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. 🎧 Studio Acoustics: ANC In-Depth Look"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Description / Caption
              </label>
              <textarea
                rows="2"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell shoppers what makes this product special..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Video URL (MP4 / CDN)
                </label>
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
                  placeholder="https://domain.com/video.mp4"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Thumbnail Image URL
                </label>
                <input
                  type="url"
                  value={formData.thumbnailUrl}
                  onChange={e => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                  placeholder="https://domain.com/thumb.jpg"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Video Presets Picker */}
            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Video Presets (Test CDN Media)
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-listening-to-music-with-headphones-40994-large.mp4',
                    thumbnailUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600'
                  })}
                  className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] font-bold"
                >
                  🎧 Audio / Headphones
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-man-adjusting-a-watch-41122-large.mp4',
                    thumbnailUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'
                  })}
                  className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] font-bold"
                >
                  ⌚ Smartwatch / Tech
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-modeling-a-dress-41006-large.mp4',
                    thumbnailUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600'
                  })}
                  className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] font-bold"
                >
                  👗 Apparel / Fashion
                </button>
              </div>
            </div>

            {/* Tagged Product Section */}
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-3">
              <span className="text-xs font-black text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-rose-400" />
                <span>Tag Shoppable Product Over Video</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-300 block mb-1">Catalog Item</label>
                  <select
                    value={formData.selectedProductId}
                    onChange={e => {
                      const prod = catalogProducts.find(p => p._id === e.target.value);
                      setFormData({
                        ...formData,
                        selectedProductId: e.target.value,
                        customPrice: prod ? Math.round(prod.sellingPrice * 0.85) : ''
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-rose-500"
                  >
                    <option value="">None (General Reel)</option>
                    {catalogProducts.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.title} (₹{p.sellingPrice})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-300 block mb-1">Video Flash Price (₹)</label>
                  <input
                    type="number"
                    value={formData.customPrice}
                    onChange={e => setFormData({ ...formData, customPrice: e.target.value })}
                    placeholder="Leave empty for regular price"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* Live Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700">
              <div>
                <span className="font-bold text-white text-xs block">Broadcast as Live Shopping Stream</span>
                <span className="text-[10px] text-slate-400">Shows flashing red LIVE badge and viewer count</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isLive}
                  onChange={e => setFormData({ ...formData, isLive: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>{isSubmitting ? 'Publishing Reel...' : 'Publish Shoppable Reel to Storefront'}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: LIVE BROADCAST STUDIO SIMULATOR */}
      {activeTab === 'studio' && (
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Phone Frame Simulator */}
          <div className="mx-auto w-full max-w-[340px] aspect-[9/16] bg-black rounded-[42px] border-[6px] border-slate-800 shadow-2xl relative overflow-hidden flex flex-col justify-between">
            {/* Native Video Player */}
            <video
              src={reels[0]?.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-listening-to-music-with-headphones-40994-large.mp4'}
              autoPlay
              loop
              muted={studioIsMuted}
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Floating Top Bar */}
            <div className="relative z-10 p-4 pt-6 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] uppercase flex items-center gap-1 shadow-md animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span>LIVE</span>
                </span>
                <span className="text-[10px] font-bold bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full">
                  👀 248 Viewers
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStudioIsMuted(!studioIsMuted)}
                  className="p-1.5 rounded-full bg-black/40 backdrop-blur-md text-white"
                >
                  {studioIsMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Floating Hearts Animation */}
            <div className="absolute right-4 bottom-24 z-20 pointer-events-none flex flex-col gap-2">
              {studioHearts.map(h => (
                <Heart
                  key={h}
                  className="w-6 h-6 text-rose-500 fill-rose-500 animate-bounce transition-all opacity-80"
                />
              ))}
            </div>

            {/* Right Engagement Rail */}
            <div className="absolute right-3 bottom-20 z-10 flex flex-col items-center gap-3">
              <button
                onClick={handleAddStudioHeart}
                className="flex flex-col items-center text-white"
              >
                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:scale-110 active:scale-95 transition-transform text-rose-500">
                  <Heart className="w-5 h-5 fill-rose-500" />
                </div>
                <span className="text-[10px] font-black mt-0.5">3.8k</span>
              </button>

              <button className="flex flex-col items-center text-white">
                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:scale-110 transition-transform">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black mt-0.5">142</span>
              </button>

              <button className="flex flex-col items-center text-white">
                <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:scale-110 transition-transform text-emerald-400">
                  <Share2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black mt-0.5">Share</span>
              </button>
            </div>

            {/* Bottom Shoppable Product Card Overlay */}
            <div className="relative z-10 p-3 bg-gradient-to-t from-black via-black/80 to-transparent space-y-2">
              {/* Live Comments Stream */}
              <div className="space-y-1 max-h-24 overflow-y-auto pointer-events-none text-[11px] pr-12">
                {studioComments.slice(-3).map(c => (
                  <div key={c.id} className="bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-lg text-white">
                    <span className="font-black text-rose-300 mr-1.5">{c.user}:</span>
                    <span>{c.text}</span>
                  </div>
                ))}
              </div>

              {/* Tagged Product Pill with Direct Add to Cart */}
              <div className="p-2 rounded-2xl bg-white/95 backdrop-blur-md text-slate-900 flex items-center justify-between gap-2 shadow-2xl">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100"
                    alt="Product"
                    className="w-9 h-9 rounded-xl object-cover shrink-0 border border-slate-200"
                  />
                  <div className="min-w-0">
                    <span className="font-extrabold text-[11px] truncate block text-slate-900">
                      Aura Pro ANC Headphones
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="font-black text-emerald-600">₹2,499</span>
                      <span className="text-slate-400 line-through">₹4,999</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => showToast('Demo: Added to cart with video flash discount!')}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 text-white font-black text-[10px] shrink-0 hover:bg-slate-800 transition-colors"
                >
                  Buy Now
                </button>
              </div>
            </div>
          </div>

          {/* Studio Control Panel */}
          <div className="space-y-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 inline-block">
                Broadcast Controls
              </span>
              <h3 className="text-base font-black text-white">Live Host Interaction Panel</h3>
              <p className="text-xs text-slate-400">
                Engage with live shoppers, broadcast flash discount announcements, and pin featured products during the live stream.
              </p>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800">
              <label className="text-xs font-bold text-slate-300 block">
                Post Live Stream Announcement / Host Reply
              </label>
              <form onSubmit={handleSendStudioComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Flash 10% coupon LIVE10 active for next 5 mins!"
                  value={newStudioComment}
                  onChange={e => setNewStudioComment(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-colors"
                >
                  Send
                </button>
              </form>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1.5">
              <span className="font-black block">💡 Shoppable Reels Features Included:</span>
              <ul className="list-disc pl-4 space-y-1 text-slate-300">
                <li>Double tap video for animated heart reaction.</li>
                <li>Tap pinned product tag to open instant PDP checkout drawer.</li>
                <li>WhatsApp 1-click share with pre-filled video preview link.</li>
                <li>Seamless swipe / arrow navigation between active reels.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
