import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Phone,
  Mail,
  Sparkles,
  CheckCircle2,
  Package,
  CreditCard,
  Truck,
  RotateCcw,
  Store,
  Layers
} from 'lucide-react';
import api from '../api/client';

const CATEGORIES = [
  { key: 'ALL', label: 'All Questions', icon: Layers },
  { key: 'ORDERS', label: 'Orders & Tracking', icon: Package },
  { key: 'PAYMENTS', label: 'Payments & COD', icon: CreditCard },
  { key: 'RETURNS', label: '1-Click Exchanges', icon: RotateCcw },
  { key: 'SHIPPING', label: 'Delivery & SLAs', icon: Truck },
  { key: 'VENDORS', label: 'Selling on AuraMarket', icon: Store },
];

export const FaqSection = ({ isModal = false, onClose = null }) => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [votedMap, setVotedMap] = useState({}); // { [faqId]: 'helpful' | 'unhelpful' }

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/faqs', { params });
      if (res.data?.success) {
        setFaqs(res.data.data);
        if (res.data.data.length > 0 && !expandedId) {
          setExpandedId(res.data.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load FAQs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFaqs();
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleVote = async (e, id, type) => {
    e.stopPropagation();
    if (votedMap[id]) return;

    try {
      const res = await api.post(`/faqs/${id}/vote`, { type });
      if (res.data?.success) {
        setVotedMap(prev => ({ ...prev, [id]: type }));
        setFaqs(prev =>
          prev.map(item => {
            if (item._id === id) {
              return {
                ...item,
                helpfulCount: res.data.data.helpfulCount,
                unhelpfulCount: res.data.data.unhelpfulCount,
              };
            }
            return item;
          })
        );
      }
    } catch (err) {
      console.error('Vote failed:', err);
    }
  };

  const content = (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-black uppercase tracking-wider border border-amber-500/20">
          <HelpCircle className="w-4 h-4" /> Categorized Interactive FAQ Hub
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Frequently Asked Questions
        </h2>
        <p className="text-sm text-slate-500 max-w-2xl mx-auto font-medium">
          Find instant answers to multi-vendor split shipping, 1-click doorstep exchange, delivery OTP security, and payment options.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto pt-2">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, e.g. COD, delivery OTP, exchange, split orders..."
              className="w-full pl-12 pr-24 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Category Pills */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black scale-105'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold">Loading answered questions...</p>
          </div>
        ) : faqs.length === 0 ? (
          <div className="py-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">
            <HelpCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-bold text-slate-700">No matching questions found.</p>
            <p className="text-xs text-slate-400 mt-1">Try another search keyword or contact our 24/7 support.</p>
          </div>
        ) : (
          faqs.map(item => {
            const isExpanded = expandedId === item._id;
            const userVote = votedMap[item._id];

            return (
              <div
                key={item._id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'bg-white border-amber-300 shadow-md ring-1 ring-amber-200/50'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                {/* Question Row */}
                <button
                  onClick={() => toggleExpand(item._id)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 select-none focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                        isExpanded ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      Q
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">
                        {item.question}
                      </h4>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-slate-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-amber-600" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {/* Answer Content */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/50 animate-fade-in">
                    <p className="text-sm text-slate-700 leading-relaxed font-normal pl-11">
                      {item.answer}
                    </p>

                    {/* Was this helpful feedback bar */}
                    <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-500 pl-11">
                      <span className="font-medium text-[11px]">Was this answer helpful?</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleVote(e, item._id, 'helpful')}
                          disabled={!!userVote}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                            userVote === 'helpful'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Yes ({item.helpfulCount || 0})</span>
                        </button>

                        <button
                          onClick={(e) => handleVote(e, item._id, 'unhelpful')}
                          disabled={!!userVote}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                            userVote === 'unhelpful'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50'
                          }`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5 text-rose-600" />
                          <span>No ({item.unhelpfulCount || 0})</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Support Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shrink-0">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-black text-base tracking-tight">Still have questions?</h4>
            <p className="text-xs text-slate-300">
              Our 24/7 human customer support team is always ready to assist you.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="mailto:support@auramarket.com"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors border border-white/20"
          >
            <Mail className="w-3.5 h-3.5 text-amber-400" />
            <span>Email Support</span>
          </a>
          <a
            href="tel:+918533955333"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call Helpline</span>
          </a>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
        <div className="bg-slate-50 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h3 className="font-black text-slate-900 text-base">AuraMarket Help & Knowledge Center</h3>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
            )}
          </div>
          <div className="p-6 sm:p-8 overflow-y-auto custom-device-scrollbar flex-1">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="py-12 px-4 sm:px-6">
      {content}
    </section>
  );
};

export default FaqSection;
