import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  UploadCloud,
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
  ShoppingBag,
  ExternalLink,
  SlidersHorizontal,
  RefreshCw,
  Image as ImageIcon,
  Zap,
  Info,
} from 'lucide-react';
import api from '../api/client';

export default function VisualSearchModal({ isOpen, onClose, onSelectProduct }) {
  const [samples, setSamples] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [detectedFeatures, setDetectedFeatures] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch curated samples on mount or open
  useEffect(() => {
    if (!isOpen) return;

    const fetchSamples = async () => {
      try {
        const res = await api.get('/products/search/visual/samples');
        if (res.data?.samples) {
          setSamples(res.data.samples);
        }
      } catch (err) {
        // Fallback default samples if offline/error
        setSamples([
          {
            id: 'sample_headphones',
            title: 'Studio Over-Ear Headphones',
            category: 'electronics',
            sampleImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
            dominantColors: ['#0F172A', '#D97706'],
            colorNames: ['Black', 'Gold'],
          },
          {
            id: 'sample_smartwatch',
            title: 'AMOLED Fitness Smartwatch',
            category: 'electronics',
            sampleImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
            dominantColors: ['#64748B', '#000000'],
            colorNames: ['Grey', 'Black'],
          },
          {
            id: 'sample_hoodie',
            title: 'Cotton Streetwear Hoodie',
            category: 'fashion',
            sampleImage: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80',
            dominantColors: ['#000000', '#1E293B'],
            colorNames: ['Black', 'Grey'],
          },
        ]);
      }
    };

    fetchSamples();
  }, [isOpen]);

  // Execute Visual Search
  const runVisualSearch = async (imagePayload, cat = categoryFilter) => {
    if (!imagePayload) return;
    setIsScanning(true);
    setError(null);
    setSearchResults([]);
    setDetectedFeatures(null);

    try {
      const res = await api.post('/products/search/visual', {
        image: imagePayload,
        categoryFilter: cat !== 'all' ? cat : undefined,
        limit: 16,
      });

      if (res.data?.success) {
        setDetectedFeatures(res.data.detectedFeatures);
        setSearchResults(res.data.products || []);
      }
    } catch (err) {
      console.error('Visual search failed:', err);
      setError(err.response?.data?.message || 'Visual search failed. Please try a different photo.');
    } finally {
      setIsScanning(false);
    }
  };

  // Handle local image file upload (file reader to Base64)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target.result;
      setSelectedImage(b64);
      setImagePreview(b64);
      runVisualSearch(b64);
    };
    reader.readAsDataURL(file);
  };

  // Handle Drag & Drop
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const b64 = event.target.result;
        setSelectedImage(b64);
        setImagePreview(b64);
        runVisualSearch(b64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle 1-Tap Sample Query Click
  const handleSelectSample = (sample) => {
    setSelectedImage(sample.sampleImage);
    setImagePreview(sample.sampleImage);
    runVisualSearch(sample.id);
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview('');
    setSearchResults([]);
    setDetectedFeatures(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/60 rounded-3xl shadow-2xl text-white overflow-hidden"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
              <Camera className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">Visual Image Search</h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  AI Vision 2.0
                </span>
              </div>
              <p className="text-xs text-slate-400">Upload a photo or screenshot to find visually matching products</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedImage && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Photo</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <Info className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload / Drop Zone when no image selected */}
          {!selectedImage && (
            <div className="space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-amber-400 bg-amber-400/10 scale-[1.01]'
                    : 'border-slate-700 hover:border-amber-400/60 bg-slate-800/40 hover:bg-slate-800/70'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-3xl bg-amber-400/15 text-amber-400 flex items-center justify-center mb-4 shadow-inner">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-white mb-1">
                  Drag & drop your product photo or screenshot here
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mb-4">
                  Supports JPG, PNG, WebP up to 10MB. Or click to browse photos from your device.
                </p>
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Choose Image File</span>
                </button>
              </div>

              {/* 1-Tap Sample Presets */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Or Try 1-Click Sample Visual Queries:
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {samples.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSample(s)}
                      className="group flex flex-col items-center p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-400/50 transition-all text-left"
                    >
                      <div className="w-full aspect-square rounded-xl overflow-hidden mb-2 relative bg-slate-950">
                        <img
                          src={s.sampleImage}
                          alt={s.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                          <span className="text-[10px] font-bold text-amber-300">Scan Now &rarr;</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-white group-hover:text-amber-300 line-clamp-1 w-full text-center">
                        {s.title}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize">{s.category}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Image Inspection & Scanning View */}
          {selectedImage && (
            <div className="space-y-6">
              {/* Image Preview & AI Feature Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                {/* Left: Scanned Image with laser scanning animation */}
                <div className="relative aspect-video sm:aspect-square md:aspect-auto max-h-56 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Query"
                    className="w-full h-full object-contain"
                  />
                  {isScanning && (
                    <>
                      {/* Laser scanning line */}
                      <div className="absolute inset-x-0 h-1 bg-amber-400 shadow-[0_0_15px_#f59e0b] animate-bounce top-1/3" />
                      <div className="absolute inset-0 bg-amber-400/10 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="px-3 py-1.5 rounded-xl bg-slate-950/90 text-amber-300 text-xs font-bold flex items-center gap-2 border border-amber-400/40">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Extracting Visual Features...</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Right: Detected AI Features */}
                <div className="md:col-span-2 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <h4 className="text-sm font-black text-white">Visual Feature Extraction</h4>
                    </div>

                    {detectedFeatures ? (
                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Detected Category:</span>
                          <span className="font-bold text-amber-400 uppercase tracking-wide bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
                            {detectedFeatures.category || 'General Products'}
                          </span>
                        </div>

                        {detectedFeatures.dominantColors && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Dominant Colors:</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {detectedFeatures.dominantColors.map((hex, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-700/60 border border-slate-600 text-[11px]"
                                >
                                  <span
                                    className="w-2.5 h-2.5 rounded-full border border-white/30"
                                    style={{ backgroundColor: hex }}
                                  />
                                  <span>{detectedFeatures.colorNames?.[idx] || hex}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {detectedFeatures.detectedTags && detectedFeatures.detectedTags.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Visual Descriptors:</span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {detectedFeatures.detectedTags.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-700 text-slate-300"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Analyzing visual contours, textures, and color distribution...
                      </p>
                    )}
                  </div>

                  {/* Category Refinement Pills */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60 overflow-x-auto">
                    <span className="text-[11px] text-slate-400 flex-shrink-0">Filter:</span>
                    {['all', 'electronics', 'fashion', 'home'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setCategoryFilter(cat);
                          runVisualSearch(selectedImage, cat);
                        }}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg capitalize transition-all ${
                          categoryFilter === cat
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Search Results Grid */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-black text-white">
                      Visually Similar Products ({searchResults.length} found)
                    </h4>
                  </div>
                </div>

                {isScanning ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
                    <p className="text-sm font-bold text-white">Scanning catalog for closest visual matches...</p>
                    <p className="text-xs text-slate-400 mt-1">Comparing textures, dominant hues, and design silhouettes</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs">
                    No matching products found with high confidence. Try selecting another photo or clearing the category filter.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {searchResults.map((prod) => {
                      const matchPct = prod.visualSimilarity?.matchPercentage || 85;
                      const reasons = prod.visualSimilarity?.matchingReasons || [];
                      const thumbnail =
                        prod.thumbnail ||
                        prod.images?.[0] ||
                        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500';

                      return (
                        <div
                          key={prod._id}
                          className="group flex flex-col justify-between bg-slate-800/70 border border-slate-700/60 hover:border-amber-400/60 rounded-2xl overflow-hidden p-3 transition-all hover:shadow-xl hover:shadow-black/40"
                        >
                          <div>
                            {/* Product Image & Match Percentage Badge */}
                            <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-950 mb-3">
                              <img
                                src={thumbnail}
                                alt={prod.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-black shadow-md">
                                <Sparkles className="w-3 h-3" />
                                <span>{matchPct}% Match</span>
                              </div>
                            </div>

                            {/* Product Info */}
                            <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-0.5">
                              {prod.brand || 'AuraMarket'}
                            </div>
                            <h5 className="text-xs font-bold text-white group-hover:text-amber-300 line-clamp-2 leading-snug mb-1">
                              {prod.title}
                            </h5>

                            {/* Pricing */}
                            <div className="flex items-baseline gap-2 mb-2">
                              <span className="text-sm font-black text-amber-400">
                                ₹{(prod.sellingPrice || 0).toLocaleString('en-IN')}
                              </span>
                              {prod.mrp && prod.mrp > prod.sellingPrice && (
                                <span className="text-[10px] text-slate-500 line-through">
                                  ₹{prod.mrp.toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>

                            {/* Visual Match Reason Snippet */}
                            {reasons.length > 0 && (
                              <div className="text-[10px] text-slate-400 bg-slate-900/60 p-1.5 rounded-lg mb-3 line-clamp-1">
                                💡 {reasons[0]}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-700/60">
                            <button
                              onClick={() => {
                                if (onSelectProduct) onSelectProduct(prod);
                                window.dispatchEvent(
                                  new CustomEvent('auramarket_open_product_pdp', { detail: prod })
                                );
                                onClose();
                              }}
                              className="flex-1 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors flex items-center justify-center gap-1"
                            >
                              <span>View Item</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
