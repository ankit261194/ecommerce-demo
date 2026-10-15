import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Star,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Plus,
  Sparkles,
  Check,
  Eye,
  Camera,
  Layers,
} from 'lucide-react';

const SAMPLE_GALLERY_PRESETS = [
  {
    name: 'Acoustic Headphones',
    thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    gallery: [
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800',
      'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800',
    ],
  },
  {
    name: 'Smart AMOLED Watch',
    thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    gallery: [
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800',
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800',
      'https://images.unsplash.com/photo-1510017803434-a899398421b3?w=800',
    ],
  },
  {
    name: 'Running Pro Sneakers',
    thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
    gallery: [
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800',
      'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800',
    ],
  },
  {
    name: 'Minimalist Designer Bag',
    thumbnail: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800',
    gallery: [
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800',
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800',
    ],
  },
];

export const ProductGalleryUploader = ({
  thumbnail = '',
  gallery = [],
  onChange,
  maxImages = 8,
}) => {
  const [newUrl, setNewUrl] = useState('');
  const [activePreview, setActivePreview] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleAddImage = (urlToAdd) => {
    const url = (urlToAdd || newUrl).trim();
    if (!url) return;

    // If no thumbnail exists, make this the thumbnail
    if (!thumbnail) {
      onChange({
        thumbnail: url,
        gallery: gallery.filter((img) => img !== url),
      });
      showToast('Set as primary cover thumbnail!');
    } else if (thumbnail === url || gallery.includes(url)) {
      showToast('Image already present in media suite.');
      return;
    } else {
      if (gallery.length + 1 >= maxImages) {
        showToast(`Maximum limit of ${maxImages} images reached.`);
        return;
      }
      onChange({
        thumbnail,
        gallery: [...gallery, url],
      });
      showToast('Photo added to gallery!');
    }
    setNewUrl('');
  };

  const handleSetPrimary = (galleryItemUrl) => {
    const oldPrimary = thumbnail;
    const newGallery = gallery
      .filter((img) => img !== galleryItemUrl)
      .concat(oldPrimary ? [oldPrimary] : []);

    onChange({
      thumbnail: galleryItemUrl,
      gallery: newGallery,
    });
    showToast('Swapped to Primary Cover photo!');
  };

  const handleRemovePrimary = () => {
    if (gallery.length > 0) {
      const nextThumb = gallery[0];
      const remainingGallery = gallery.slice(1);
      onChange({
        thumbnail: nextThumb,
        gallery: remainingGallery,
      });
      showToast('Promoted next gallery photo to primary cover.');
    } else {
      onChange({
        thumbnail: '',
        gallery: [],
      });
      showToast('Cover photo removed.');
    }
  };

  const handleRemoveGalleryItem = (indexToRemove) => {
    const updatedGallery = gallery.filter((_, idx) => idx !== indexToRemove);
    onChange({
      thumbnail,
      gallery: updatedGallery,
    });
    showToast('Gallery photo deleted.');
  };

  const handleMoveGalleryItem = (currentIndex, direction) => {
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= gallery.length) return;

    const copy = [...gallery];
    const temp = copy[currentIndex];
    copy[currentIndex] = copy[targetIndex];
    copy[targetIndex] = temp;

    onChange({
      thumbnail,
      gallery: copy,
    });
  };

  const handleApplyPreset = (preset) => {
    onChange({
      thumbnail: preset.thumbnail,
      gallery: preset.gallery,
    });
    showToast(`Applied studio sample: ${preset.name}`);
  };

  const totalImages = (thumbnail ? 1 : 0) + gallery.length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Camera className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Multi-Image Media Uploader
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                  Point #52
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Primary thumbnail cover + secondary gallery photos with instant reordering & swap
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">
            Capacity:{' '}
            <strong className="text-white font-mono">
              {totalImages} / {maxImages}
            </strong>
          </span>
          <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                totalImages >= maxImages ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.min((totalImages / maxImages) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-2 rounded-xl flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* URL Input Bar & 1-Click Studio Presets */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-300 block">
          Add Photo via Image URL:
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddImage();
              }
            }}
            placeholder="https://images.unsplash.com/... or CDN link"
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          <button
            type="button"
            onClick={() => handleAddImage()}
            disabled={!newUrl.trim() || totalImages >= maxImages}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Photo
          </button>
        </div>

        {/* 1-Click Studio Photo Samples */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Quick Presets:
          </span>
          {SAMPLE_GALLERY_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Workspace: Primary Cover vs Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Primary Thumbnail Card */}
        <div className="md:col-span-5 bg-slate-950/70 border border-indigo-500/30 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              Primary Cover / Thumbnail
            </span>
            {thumbnail && (
              <button
                type="button"
                onClick={handleRemovePrimary}
                className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-1 rounded-md transition-colors"
                title="Remove cover"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center group">
            {thumbnail ? (
              <>
                <img
                  src={thumbnail}
                  alt="Product Primary Cover"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setActivePreview(thumbnail)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs gap-1 transition-opacity backdrop-blur-xs"
                >
                  <Eye className="w-4 h-4" /> Full Preview
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-2">
                <ImageIcon className="w-10 h-10 stroke-1" />
                <p className="text-xs font-medium">No cover image selected</p>
                <p className="text-[11px] text-slate-600">
                  Add a photo above or choose a preset to set primary cover
                </p>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400 text-center mt-3">
            Displayed on store search catalog, cards & shopping cart.
          </p>
        </div>

        {/* Secondary Gallery Photos */}
        <div className="md:col-span-7 bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Layers className="w-4 h-4 text-indigo-400" />
              Gallery Photos ({gallery.length})
            </span>
            <span className="text-[11px] text-slate-500">
              Click ⭐ to promote any photo to Primary Cover
            </span>
          </div>

          {gallery.length === 0 ? (
            <div className="h-56 rounded-xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center p-6 text-center text-slate-500">
              <Camera className="w-8 h-8 text-slate-600 mb-2 stroke-1" />
              <p className="text-xs font-medium text-slate-400">No gallery photos added yet</p>
              <p className="text-[11px] text-slate-600 max-w-xs mt-1">
                Add side angles, packaging, or dimension photos to build customer purchase confidence.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-68 pr-1">
              {gallery.map((imgUrl, index) => (
                <div
                  key={`${imgUrl}-${index}`}
                  className="group relative aspect-square rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col justify-between"
                >
                  <img
                    src={imgUrl}
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
                    }}
                  />

                  {/* Index badge */}
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/75 text-[10px] font-mono text-slate-300 backdrop-blur-xs">
                    #{index + 1}
                  </span>

                  {/* Overlay Controls */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(imgUrl)}
                        title="Set as Primary Cover"
                        className="p-1 rounded-md bg-amber-500/80 hover:bg-amber-400 text-slate-950 transition-colors shadow"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryItem(index)}
                        title="Delete photo"
                        className="p-1 rounded-md bg-rose-500/80 hover:bg-rose-400 text-white transition-colors shadow"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Reordering Controls */}
                    <div className="flex items-center justify-between bg-black/60 rounded-lg p-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveGalleryItem(index, -1)}
                        className="p-1 text-slate-300 hover:text-white disabled:opacity-20 disabled:hover:text-slate-300"
                        title="Move left"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePreview(imgUrl)}
                        className="text-[10px] text-slate-300 hover:text-white"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5 inline" />
                      </button>
                      <button
                        type="button"
                        disabled={index === gallery.length - 1}
                        onClick={() => handleMoveGalleryItem(index, 1)}
                        className="p-1 text-slate-300 hover:text-white disabled:opacity-20 disabled:hover:text-slate-300"
                        title="Move right"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] text-slate-400 text-center mt-3">
            Customers can swipe or click through these photos in the PDP Image Carousel.
          </p>
        </div>
      </div>

      {/* Full-size Image Preview Modal */}
      {activePreview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setActivePreview(null)}
        >
          <div
            className="max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-200">
                Photo High-Res Preview
              </span>
              <button
                type="button"
                onClick={() => setActivePreview(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-md hover:bg-slate-800"
              >
                Close ✕
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center">
              <img
                src={activePreview}
                alt="Enlarged Preview"
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductGalleryUploader;
