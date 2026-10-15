import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Save,
  Globe,
  Sparkles,
  Code,
  Layers,
  ArrowRight,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import api from '../api/client';

const TEMPLATES = [
  {
    name: 'Standard Privacy Policy (DPDP / GDPR)',
    category: 'LEGAL',
    title: 'Customer Data Privacy Policy',
    slug: 'privacy-policy',
    content: `<h2>1. Data Collection</h2><p>AuraMarket collects customer information such as name, email, phone number, and delivery addresses strictly for order fulfillment, fraud prevention, and OTP verification.</p><h2>2. Data Protection</h2><p>All sensitive information is processed over 256-bit SSL encrypted channels. User credentials are securely hashed.</p><h2>3. Your Rights</h2><p>You may request access to, correction of, or deletion of your personal data by contacting our grievance officer.</p>`,
  },
  {
    name: 'Multi-Vendor Marketplace Terms of Service',
    category: 'LEGAL',
    title: 'Marketplace Terms of Service',
    slug: 'terms-and-conditions',
    content: `<h2>1. Marketplace Model</h2><p>AuraMarket connects independent third-party vendors with end customers. Orders may be fulfilled in split sub-orders by multiple merchants.</p><h2>2. Product Listings</h2><p>Merchants guarantee accurate product listings, genuine warranties, and timely courier dispatch.</p><h2>3. Delivery OTP</h2><p>Customer handover is authenticated exclusively via a 4-digit secret delivery OTP.</p>`,
  },
  {
    name: '7-Day Return, Exchange & Reverse Pickup Policy',
    category: 'POLICIES',
    title: 'Return, 1-Click Exchange & Refund Policy',
    slug: 'refund-and-cancellation',
    content: `<h2>1. Return Window</h2><p>Customers can initiate returns or 1-click product exchanges within 7 calendar days of delivery for eligible items.</p><h2>2. Doorstep Reverse Pickup</h2><p>A reverse pickup courier is dispatched to your doorstep. Handover is validated via a 4-digit reverse pickup OTP.</p><h2>3. Instant Wallet Refund</h2><p>Refunds can be credited instantly to your AuraMarket Wallet or processed back to your original payment method in 3-5 business days.</p>`,
  },
];

export const CmsPageBuilderManager = ({ onViewPublicPage }) => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'preview'
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    category: 'LEGAL',
    contentHtml: '',
    metaTitle: '',
    metaDescription: '',
    isPublished: true,
  });
  const [editingSlug, setEditingSlug] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await api.get('/cms/pages');
      if (res.data?.success) {
        setPages(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load CMS pages', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleStartCreate = () => {
    setEditingSlug(null);
    setFormData({
      title: '',
      slug: '',
      category: 'LEGAL',
      contentHtml: '<h2>New Legal Document</h2><p>Draft your official policy content here...</p>',
      metaTitle: '',
      metaDescription: '',
      isPublished: true,
    });
    setIsEditing(true);
    setActiveTab('editor');
  };

  const handleStartEdit = (page) => {
    setEditingSlug(page.slug);
    setFormData({
      title: page.title,
      slug: page.slug,
      category: page.category || 'LEGAL',
      contentHtml: page.contentHtml,
      metaTitle: page.metaTitle || '',
      metaDescription: page.metaDescription || '',
      isPublished: page.isPublished ?? true,
    });
    setIsEditing(true);
    setActiveTab('editor');
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    if (!editingSlug) {
      const slug = title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
      setFormData(prev => ({ ...prev, title, slug, metaTitle: title }));
    } else {
      setFormData(prev => ({ ...prev, title }));
    }
  };

  const handleApplyTemplate = (tpl) => {
    setFormData(prev => ({
      ...prev,
      title: tpl.title,
      slug: prev.slug || tpl.slug,
      category: tpl.category,
      contentHtml: tpl.content,
      metaTitle: `${tpl.title} | AuraMarket`,
    }));
    setMessage({ type: 'success', text: `Loaded template: ${tpl.name}` });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      if (editingSlug) {
        // Update
        const res = await api.put(`/cms/pages/${editingSlug}`, formData);
        if (res.data?.success) {
          setMessage({ type: 'success', text: 'CMS Page updated successfully!' });
          fetchPages();
          setTimeout(() => {
            setIsEditing(false);
            setMessage(null);
          }, 1200);
        }
      } else {
        // Create
        const res = await api.post('/cms/pages', formData);
        if (res.data?.success) {
          setMessage({ type: 'success', text: 'CMS Page published successfully!' });
          fetchPages();
          setTimeout(() => {
            setIsEditing(false);
            setMessage(null);
          }, 1200);
        }
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save page.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slug, title) => {
    if (!window.confirm(`Are you sure you want to delete '${title}'? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await api.delete(`/cms/pages/${slug}`);
      if (res.data?.success) {
        setMessage({ type: 'success', text: `Page '${title}' deleted.` });
        fetchPages();
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete page.' });
    }
  };

  const filteredPages = pages.filter(p => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-indigo-400/20">
            <FileText className="w-3.5 h-3.5" /> Full Dynamic CMS & Legal Policy Pages Builder
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Storefront Policy & Content Engine
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Draft, publish, and version your marketplace terms, privacy policies, return rules, and custom content pages with live preview and SEO indexing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleStartCreate}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Policy</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm font-bold ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs uppercase opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Editor Modal / Card */}
      {isEditing ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {editingSlug ? `Edit Policy: ${formData.title}` : 'Draft New Policy Document'}
              </h3>
              <p className="text-xs text-slate-500">Configure title, slug, content HTML, and SEO tags</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save & Publish'}</span>
              </button>
            </div>
          </div>

          {/* Quick Template Picker */}
          {!editingSlug && (
            <div className="px-6 py-3 bg-amber-50/50 border-b border-amber-100 flex items-center gap-3 overflow-x-auto text-xs">
              <span className="font-bold text-amber-800 flex items-center gap-1 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Quick Boilerplates:
              </span>
              {TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100/60 border border-amber-200 text-amber-900 rounded-md font-semibold shrink-0 transition-colors"
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSave} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={handleTitleChange}
                  placeholder="e.g. Privacy Policy"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingSlug}
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().trim() }))}
                  placeholder="privacy-policy"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="LEGAL">LEGAL</option>
                  <option value="POLICIES">POLICIES</option>
                  <option value="COMPANY">COMPANY</option>
                  <option value="HELP">HELP</option>
                </select>
              </div>
            </div>

            {/* SEO Metadata Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" /> Search Engine Optimization (SEO) Metadata
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    value={formData.metaTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, metaTitle: e.target.value }))}
                    placeholder="e.g. Privacy Policy | AuraMarket"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Meta Description
                  </label>
                  <input
                    type="text"
                    value={formData.metaDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
                    placeholder="Brief description for search engine snippets"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* HTML Editor & Live Preview Switch */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('editor')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      activeTab === 'editor'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    HTML Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      activeTab === 'preview'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Live Storefront Preview
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                      className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                    />
                    <span>Publish Immediately</span>
                  </label>
                </div>
              </div>

              {activeTab === 'editor' ? (
                <div>
                  <textarea
                    rows={12}
                    value={formData.contentHtml}
                    onChange={(e) => setFormData(prev => ({ ...prev, contentHtml: e.target.value }))}
                    placeholder="<h2>Section Title</h2><p>Policy content paragraph...</p>"
                    className="w-full font-mono text-xs p-4 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 custom-device-scrollbar leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Standard HTML tags supported: &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;a&gt;.
                  </p>
                </div>
              ) : (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl min-h-[260px] custom-device-scrollbar">
                  <div
                    className="prose prose-slate max-w-none text-sm text-slate-800 leading-relaxed space-y-4"
                    dangerouslySetInnerHTML={{ __html: formData.contentHtml || '<p>Preview will render here...</p>' }}
                  />
                </div>
              )}
            </div>
          </form>
        </div>
      ) : null}

      {/* List of Existing Pages */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters and Search Toolbar */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/60">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search policies by title or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Categories</option>
              <option value="LEGAL">Legal</option>
              <option value="POLICIES">Policies</option>
              <option value="COMPANY">Company</option>
              <option value="HELP">Help</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{filteredPages.length}</strong> of {pages.length} CMS Pages
          </div>
        </div>

        {/* Table / Cards */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold">Loading legal policies catalog...</p>
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-bold text-slate-600">No CMS pages found.</p>
            <p className="text-xs text-slate-400 mt-1">Click "Create New Policy" above to draft a document.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredPages.map(page => (
              <div
                key={page._id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h4 className="font-extrabold text-slate-900 text-sm">{page.title}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 text-slate-600">
                      /{page.slug}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        page.category === 'LEGAL'
                          ? 'bg-purple-100 text-purple-700'
                          : page.category === 'POLICIES'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {page.category}
                    </span>
                    {page.isPublished ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                        <CheckCircle className="w-3.5 h-3.5" /> Published
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                        <XCircle className="w-3.5 h-3.5" /> Draft
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                    <span>Revision: v{page.version || 1}.0</span>
                    <span>•</span>
                    <span>Updated: {new Date(page.updatedAt).toLocaleDateString()}</span>
                    {page.metaDescription && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-sm text-slate-400">{page.metaDescription}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {onViewPublicPage && (
                    <button
                      onClick={() => onViewPublicPage(page.slug)}
                      title="Preview on Storefront"
                      className="p-2 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleStartEdit(page)}
                    title="Edit Document"
                    className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(page.slug, page.title)}
                    title="Delete Policy"
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CmsPageBuilderManager;
