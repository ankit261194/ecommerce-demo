import React, { useState, useEffect } from 'react';
import {
  Award,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Search,
  RefreshCw,
  Star,
  Check,
  X,
  AlertCircle,
  Globe,
  Package,
  Image as ImageIcon,
} from 'lucide-react';
import api from '../api/client';

export default function BrandDirectoryManager() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logo: '',
    description: '',
    website: '',
    isFeatured: false,
    isActive: true,
    displayOrder: 0,
  });

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const res = await api.get('/brands?includeInactive=true');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setBrands(res.data.data);
      } else {
        setBrands([]);
      }
    } catch (err) {
      console.error('Failed to fetch brands:', err?.message);
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const openCreateModal = () => {
    setEditingBrand(null);
    setFormData({
      name: '',
      slug: '',
      logo: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300',
      description: '',
      website: '',
      isFeatured: false,
      isActive: true,
      displayOrder: brands.length + 1,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (b) => {
    setEditingBrand(b);
    setFormData({
      name: b.name || '',
      slug: b.slug || '',
      logo: b.logo || '',
      description: b.description || '',
      website: b.website || '',
      isFeatured: Boolean(b.isFeatured),
      isActive: b.isActive !== false,
      displayOrder: b.displayOrder || 0,
    });
    setIsModalOpen(true);
  };

  const handleSaveBrand = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSaving(true);
    try {
      if (editingBrand) {
        await api.put(`/admin/brands/${editingBrand._id}`, formData);
        showMessage('success', `Brand '${formData.name}' updated successfully!`);
      } else {
        await api.post('/admin/brands', formData);
        showMessage('success', `Brand '${formData.name}' created successfully!`);
      }
      setIsModalOpen(false);
      fetchBrands();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to save brand';
      showMessage('error', errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBrand = async (b) => {
    if (!window.confirm(`Are you sure you want to delete brand '${b.name}'?`)) return;

    try {
      const res = await api.delete(`/admin/brands/${b._id}`);
      if (res.data?.success) {
        showMessage('success', `Brand '${b.name}' deleted successfully!`);
        fetchBrands();
      }
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.productCount) {
        showMessage('error', `Cannot delete: ${err.response.data.productCount} products are linked to ${b.name}!`);
      } else {
        const errMsg = err.response?.data?.message || err.message || 'Failed to delete brand';
        showMessage('error', errMsg);
      }
    }
  };

  const showMessage = (type, text) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 3500);
  };

  const filteredBrands = brands.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Alert */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold border animate-slide-down ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)}>
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}

      {/* Header & Quick Summary */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Award className="w-6 h-6 text-amber-500" />
              <span>Brand Directory & Manufacturer Hub</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Point #37
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Curate top authentic brands, showcase verified manufacturer logos, link external brand stores, and boost customer conversion.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Brand</span>
            </button>
            <button
              onClick={fetchBrands}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-sm"
              title="Refresh Brands"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Search & Stats Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search brands by name or slug..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>{brands.length} Total Brands</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>{brands.filter((b) => b.isFeatured).length} Featured Brands</span>
            </div>
          </div>
        </div>

        {/* Brands Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredBrands.length === 0 ? (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
              <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No Brands Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'No brands match your search query.'
                  : 'Start adding world-class brands to your marketplace catalog.'}
              </p>
            </div>
          ) : (
            filteredBrands.map((b) => (
              <div
                key={b._id}
                className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    {/* Brand Logo */}
                    <div className="w-14 h-14 rounded-2xl border border-slate-100 bg-slate-50 p-2 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                      {b.logo ? (
                        <img
                          src={b.logo}
                          alt={b.name}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Award className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    {/* Status & Featured Pills */}
                    <div className="flex flex-col items-end gap-1">
                      {b.isFeatured && (
                        <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Featured
                        </span>
                      )}
                      {!b.isActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-black text-sm text-slate-900">{b.name}</h4>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">/{b.slug}</p>
                    {b.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1.5">{b.description}</p>
                    )}
                  </div>
                </div>

                {/* Footer Meta & Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]">
                      <Package className="w-3 h-3 text-slate-500" />
                      {b.productCount || 0} items
                    </span>
                    {b.website && (
                      <a
                        href={b.website}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                        title="Visit Official Website"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(b)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-all"
                      title="Edit Brand"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteBrand(b)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all"
                      title="Delete Brand"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Brand Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span>{editingBrand ? 'Edit Brand' : 'Register New Brand'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure brand identification, logos, and verified store website link.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="space-y-4 text-xs font-medium">
              {/* Brand Name */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Brand Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoSlug = name
                      .toLowerCase()
                      .trim()
                      .replace(/[\s\W-]+/g, '-')
                      .replace(/^-+|-+$/g, '');
                    setFormData((prev) => ({
                      ...prev,
                      name,
                      slug: editingBrand ? prev.slug : autoSlug,
                    }));
                  }}
                  placeholder="e.g., Apple, Sony, Nike"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-xs"
                />
              </div>

              {/* URL Slug & Website in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">URL Slug *</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="apple"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Official Website URL</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                    placeholder="https://brand.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-xs"
                  />
                </div>
              </div>

              {/* Logo URL */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Brand Logo / SVG URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.logo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, logo: e.target.value }))}
                    placeholder="https://images.unsplash.com/... or SVG link"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-xs"
                  />
                  {formData.logo && (
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-50 p-1 flex items-center justify-center">
                      <img
                        src={formData.logo}
                        alt="Logo preview"
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Brand Story / Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Short summary of brand craftsmanship and heritage..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-xs"
                />
              </div>

              {/* Display Order & Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Display Order</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        displayOrder: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-xs font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="brandIsFeatured"
                    checked={formData.isFeatured}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="brandIsFeatured" className="font-bold text-slate-800 cursor-pointer">
                    Featured Brand
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="brandIsActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="brandIsActive" className="font-bold text-slate-800 cursor-pointer">
                    Active in Store
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black transition-all shadow-sm disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingBrand ? 'Save Changes' : 'Register Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
