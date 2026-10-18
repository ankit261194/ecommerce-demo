import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  MoveUp,
  MoveDown,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Star,
  Tag,
  Check,
  X,
  Search,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Smartphone,
  Headphones,
  Watch,
  Laptop,
  Shirt,
  ShoppingBag,
  Tv,
  Camera,
} from 'lucide-react';
import api from '../api/client';

const ICON_PRESETS = [
  { key: 'tag', label: 'General / Tag', Icon: Tag },
  { key: 'smartphone', label: 'Mobile & Tech', Icon: Smartphone },
  { key: 'headphones', label: 'Audio & Music', Icon: Headphones },
  { key: 'watch', label: 'Smartwatches & Accessories', Icon: Watch },
  { key: 'laptop', label: 'Computers & Laptops', Icon: Laptop },
  { key: 'shirt', label: 'Fashion & Apparel', Icon: Shirt },
  { key: 'shopping-bag', label: 'Lifestyle & Bags', Icon: ShoppingBag },
  { key: 'tv', label: 'Appliances & TV', Icon: Tv },
  { key: 'camera', label: 'Cameras & Optics', Icon: Camera },
  { key: 'sparkles', label: 'Premium & Luxury', Icon: Sparkles },
];

export default function CategoryTreeManager() {
  const [categories, setCategories] = useState([]);
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    icon: 'tag',
    parentCategory: 'none',
    isFeatured: false,
    displayOrder: 0,
    isActive: true,
  });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories?tree=true&includeInactive=true');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setTree(res.data.data);
        // Also fetch flat categories for parent dropdown
        const flatRes = await api.get('/categories?includeInactive=true');
        if (flatRes.data?.success && Array.isArray(flatRes.data.data)) {
          setCategories(flatRes.data.data);
        }
        // Auto-expand all root categories
        const rootIds = new Set(res.data.data.map((c) => c._id));
        setExpandedIds(rootIds);
      } else {
        setTree([]);
        setCategories([]);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err?.message);
      setTree([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreateModal = (parentCatId = 'none') => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
      icon: 'tag',
      parentCategory: parentCatId,
      isFeatured: false,
      displayOrder: categories.length + 1,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    const parentId = cat.parentCategory?._id
      ? cat.parentCategory._id
      : cat.parentCategory || 'none';

    setFormData({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      image: cat.image || '',
      icon: cat.icon || 'tag',
      parentCategory: parentId,
      isFeatured: Boolean(cat.isFeatured),
      displayOrder: cat.displayOrder || 0,
      isActive: cat.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        parentCategory: formData.parentCategory === 'none' ? null : formData.parentCategory,
      };

      if (editingCategory) {
        await api.put(`/admin/categories/${editingCategory._id}`, payload);
        showMessage('success', `Category '${formData.name}' updated successfully!`);
      } else {
        await api.post('/admin/categories', payload);
        showMessage('success', `Category '${formData.name}' created successfully!`);
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to save category';
      showMessage('error', errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete category '${cat.name}'?`)) return;

    try {
      const res = await api.delete(`/admin/categories/${cat._id}`);
      if (res.data?.success) {
        showMessage('success', `Category '${cat.name}' deleted successfully!`);
        fetchCategories();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (err.response?.status === 400 && err.response?.data?.productCount) {
        showMessage('error', `Cannot delete: ${err.response.data.productCount} products belong to this category!`);
      } else {
        showMessage('error', msg || 'Failed to delete category');
      }
    }
  };

  const handleMoveOrder = async (cat, direction) => {
    const delta = direction === 'up' ? -1 : 1;
    const newOrder = Math.max(0, (cat.displayOrder || 0) + delta);
    try {
      await api.put(`/admin/categories/${cat._id}`, { displayOrder: newOrder });
      fetchCategories();
    } catch (_) {
      setTree((prev) =>
        prev.map((c) => (c._id === cat._id ? { ...c, displayOrder: newOrder } : c))
      );
    }
  };

  const showMessage = (type, text) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Filter categories by search
  const filteredTree = tree.filter((root) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchRoot = root.name.toLowerCase().includes(q) || root.slug.toLowerCase().includes(q);
    const matchSub = (root.subcategories || []).some(
      (sub) => sub.name.toLowerCase().includes(q) || sub.slug.toLowerCase().includes(q)
    );
    return matchRoot || matchSub;
  });

  const getIconComponent = (iconName) => {
    const found = ICON_PRESETS.find((p) => p.key === iconName);
    return found ? found.Icon : Tag;
  };

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

      {/* Header & Controls */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <FolderTree className="w-6 h-6 text-amber-500" />
              <span>Category & Sub-Category Tree Manager</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Point #36
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Organize your marketplace catalog with unlimited multi-level category trees, custom SVG/PNG icons, display ordering, and instant active toggles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => openCreateModal('none')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Root Category</span>
            </button>
            <button
              onClick={fetchCategories}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-sm"
              title="Refresh Category Tree"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Summary Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories by name or slug..."
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
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>{tree.length} Root Categories</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>
                {tree.reduce((acc, c) => acc + (c.subcategories?.length || 0), 0)} Sub-Categories
              </span>
            </div>
          </div>
        </div>

        {/* Tree List */}
        <div className="space-y-3">
          {filteredTree.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
              <FolderTree className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No Categories Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'No categories match your search keyword. Clear the search to view all categories.'
                  : 'Get started by creating your first root product category.'}
              </p>
            </div>
          ) : (
            filteredTree.map((root, rootIdx) => {
              const isExpanded = expandedIds.has(root._id);
              const subCount = root.subcategories?.length || 0;
              const RootIcon = getIconComponent(root.icon);

              return (
                <div
                  key={root._id}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all hover:border-slate-300"
                >
                  {/* Root Category Row */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      {/* Expand / Collapse Button */}
                      <button
                        onClick={() => toggleExpand(root._id)}
                        className={`p-1.5 rounded-lg border text-slate-500 transition-colors ${
                          subCount > 0
                            ? 'bg-white border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                            : 'opacity-30 cursor-default border-transparent'
                        }`}
                        disabled={subCount === 0}
                        title={subCount > 0 ? (isExpanded ? 'Collapse subcategories' : 'Expand subcategories') : 'No subcategories'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      {/* Icon & Thumbnail */}
                      <div className="relative w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 overflow-hidden">
                        {root.image ? (
                          <img
                            src={root.image}
                            alt={root.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : null}
                        <RootIcon className="w-5 h-5 text-amber-700 absolute inset-0 m-auto" />
                      </div>

                      {/* Category Meta */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-slate-900">{root.name}</h4>
                          {root.isFeatured && (
                            <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Featured
                            </span>
                          )}
                          {!root.isActive && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
                          <span className="font-mono text-slate-400">/{root.slug}</span>
                          <span>•</span>
                          <span>{subCount} Subcategories</span>
                          <span>•</span>
                          <span className="font-bold text-amber-700">{root.productCount || 0} Products</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      {/* Order Controls */}
                      <button
                        onClick={() => handleMoveOrder(root, 'up')}
                        disabled={rootIdx === 0}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 transition-all"
                        title="Move Up"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveOrder(root, 'down')}
                        disabled={rootIdx === filteredTree.length - 1}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 transition-all"
                        title="Move Down"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Add Subcategory Button */}
                      <button
                        onClick={() => openCreateModal(root._id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
                        title="Add child subcategory under this category"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Subcategory</span>
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => openEditModal(root)}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-all"
                        title="Edit Category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteCategory(root)}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subcategories (Accordion Child Nodes) */}
                  {isExpanded && subCount > 0 && (
                    <div className="p-3 pl-8 sm:pl-12 bg-white space-y-2 border-t border-slate-100">
                      {root.subcategories.map((sub, subIdx) => {
                        const SubIcon = getIconComponent(sub.icon);
                        return (
                          <div
                            key={sub._id}
                            className="p-3 rounded-xl border border-slate-150 bg-slate-50/40 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-1.5 h-6 rounded-full bg-amber-400 shrink-0" />
                              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                <SubIcon className="w-4 h-4 text-slate-700" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="font-bold text-xs text-slate-900">{sub.name}</h5>
                                  {!sub.isActive && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-600">
                                      Inactive
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                  <span className="font-mono text-slate-400">/{sub.slug}</span>
                                  <span>•</span>
                                  <span className="font-semibold text-slate-700">
                                    {sub.productCount || 0} Products
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 self-end sm:self-center">
                              <button
                                onClick={() => openEditModal(sub)}
                                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700 transition-all"
                                title="Edit Subcategory"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(sub)}
                                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition-all"
                                title="Delete Subcategory"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Category Creation / Editing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <FolderTree className="w-5 h-5 text-amber-500" />
                  <span>{editingCategory ? 'Edit Category' : 'Create New Category'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure titles, URL slugs, parent relationships, icons, and visibility.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs font-medium">
              {/* Category Name */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Category Name *</label>
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
                      slug: editingCategory ? prev.slug : autoSlug,
                    }));
                  }}
                  placeholder="e.g., Wireless Audio & Headphones"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-xs"
                />
              </div>

              {/* URL Slug & Parent Category in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">URL Slug (SEO friendly) *</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="wireless-audio"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Parent Category</label>
                  <select
                    value={formData.parentCategory}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, parentCategory: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-xs"
                  >
                    <option value="none">None (Root Category)</option>
                    {tree
                      .filter((c) => !editingCategory || c._id !== editingCategory._id)
                      .map((c) => (
                        <option key={c._id} value={c._id}>
                          📁 {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Icon Presets Picker */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Category Icon</label>
                <div className="grid grid-cols-5 gap-2">
                  {ICON_PRESETS.map((p) => {
                    const isSelected = formData.icon === p.key;
                    const IconComp = p.Icon;
                    return (
                      <button
                        type="button"
                        key={p.key}
                        onClick={() => setFormData((prev) => ({ ...prev, icon: p.key }))}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                        title={p.label}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-[9px] font-bold truncate max-w-full">{p.key}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Thumbnail Image URL */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Thumbnail / Cover Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-xs"
                  />
                  {formData.image && (
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                      <img
                        src={formData.image}
                        alt="Preview"
                        className="w-full h-full object-cover"
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
                <label className="font-bold text-slate-700">Category Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Short description displayed on category landing pages..."
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
                    id="isFeatured"
                    checked={formData.isFeatured}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="isFeatured" className="font-bold text-slate-800 cursor-pointer">
                    Featured on Home
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="isActive" className="font-bold text-slate-800 cursor-pointer">
                    Active in Catalog
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
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
                  {isSaving
                    ? 'Saving...'
                    : editingCategory
                    ? 'Save Changes'
                    : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
