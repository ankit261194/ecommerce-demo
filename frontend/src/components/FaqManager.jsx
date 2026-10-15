import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Save,
  CheckCircle,
  XCircle,
  Layers,
  ArrowUpDown,
  X
} from 'lucide-react';
import api from '../api/client';

const CATEGORIES = ['GENERAL', 'ORDERS', 'PAYMENTS', 'SHIPPING', 'RETURNS', 'VENDORS'];

export const FaqManager = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'GENERAL',
    displayOrder: 0,
    isPublished: true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/faqs?all=true');
      if (res.data?.success) {
        setFaqs(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load FAQs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleStartCreate = () => {
    setEditingId(null);
    setFormData({
      question: '',
      answer: '',
      category: 'GENERAL',
      displayOrder: faqs.length + 1,
      isPublished: true,
    });
    setIsEditing(true);
  };

  const handleStartEdit = (faq) => {
    setEditingId(faq._id);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || 'GENERAL',
      displayOrder: faq.displayOrder || 0,
      isPublished: faq.isPublished ?? true,
    });
    setIsEditing(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      if (editingId) {
        const res = await api.put(`/faqs/${editingId}`, formData);
        if (res.data?.success) {
          setMessage({ type: 'success', text: 'FAQ updated successfully!' });
          fetchFaqs();
          setTimeout(() => {
            setIsEditing(false);
            setMessage(null);
          }, 1200);
        }
      } else {
        const res = await api.post('/faqs', formData);
        if (res.data?.success) {
          setMessage({ type: 'success', text: 'FAQ created successfully!' });
          fetchFaqs();
          setTimeout(() => {
            setIsEditing(false);
            setMessage(null);
          }, 1200);
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save FAQ' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, question) => {
    if (!window.confirm(`Delete question: "${question}"?`)) return;

    try {
      const res = await api.delete(`/faqs/${id}`);
      if (res.data?.success) {
        setMessage({ type: 'success', text: 'FAQ deleted successfully' });
        fetchFaqs();
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete FAQ' });
    }
  };

  const filteredFaqs = faqs.filter(item => {
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-amber-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-amber-400/20">
            <HelpCircle className="w-3.5 h-3.5" /> Categorized Interactive FAQ Builder
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            FAQ & Knowledge Base Manager
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Create, categorize, reorder, and review customer feedback on frequently asked questions. Keep customer support inquiries minimal with self-serve resolution.
          </p>
        </div>
        <div>
          <button
            onClick={handleStartCreate}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add New FAQ</span>
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
      {isEditing && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-lg font-black text-slate-900">
              {editingId ? 'Edit FAQ Item' : 'Create New FAQ Item'}
            </h3>
            <button
              onClick={() => setIsEditing(false)}
              className="p-2 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Question *
                </label>
                <input
                  type="text"
                  required
                  value={formData.question}
                  onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                  placeholder="e.g. How does multi-vendor split shipping work?"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Detailed Answer *
              </label>
              <textarea
                rows={5}
                required
                value={formData.answer}
                onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
                placeholder="Explain the process clearly for customers..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 custom-device-scrollbar"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: e.target.value }))}
                    className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-3">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                    className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                  />
                  <span>Publish on Storefront</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save FAQ'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* FAQs List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/60">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search FAQs by question or answer..."
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
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{filteredFaqs.length}</strong> FAQs
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold">Loading FAQs...</p>
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <HelpCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-bold text-slate-600">No FAQs found.</p>
            <p className="text-xs text-slate-400 mt-1">Click "Add New FAQ" to create one.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredFaqs.map(item => (
              <div
                key={item._id}
                className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-slate-50/80 transition-colors"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 font-mono text-[11px] font-bold flex items-center justify-center">
                      #{item.displayOrder || 0}
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm">{item.question}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                      {item.category}
                    </span>
                    {item.isPublished ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                        <CheckCircle className="w-3.5 h-3.5" /> Published
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                        <XCircle className="w-3.5 h-3.5" /> Hidden
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 pl-8 font-medium">
                    {item.answer}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pl-8 pt-1">
                    <span className="flex items-center gap-1 text-emerald-600 font-bold">
                      <ThumbsUp className="w-3 h-3" /> {item.helpfulCount || 0} Helpful
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-rose-500 font-bold">
                      <ThumbsDown className="w-3 h-3" /> {item.unhelpfulCount || 0} Unhelpful
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => handleStartEdit(item)}
                    title="Edit FAQ"
                    className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item._id, item.question)}
                    title="Delete FAQ"
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

export default FaqManager;
