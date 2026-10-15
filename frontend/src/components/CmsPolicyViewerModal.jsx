import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  ShieldCheck,
  Scale,
  RotateCcw,
  Truck,
  Building,
  Printer,
  Copy,
  Check,
  Calendar,
  ExternalLink,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import api from '../api/client';

const QUICK_POLICIES = [
  { slug: 'privacy-policy', label: 'Privacy Policy', icon: ShieldCheck, category: 'LEGAL' },
  { slug: 'terms-and-conditions', label: 'Terms & Conditions', icon: Scale, category: 'LEGAL' },
  { slug: 'refund-and-cancellation', label: 'Refund & Returns', icon: RotateCcw, category: 'POLICIES' },
  { slug: 'shipping-and-delivery', label: 'Shipping & Delivery', icon: Truck, category: 'POLICIES' },
  { slug: 'about-us', label: 'About AuraMarket', icon: Building, category: 'COMPANY' },
];

export const CmsPolicyViewerModal = ({ isOpen, onClose, initialSlug = 'privacy-policy' }) => {
  const [currentSlug, setCurrentSlug] = useState(initialSlug);
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialSlug) {
      setCurrentSlug(initialSlug);
    }
  }, [initialSlug]);

  useEffect(() => {
    if (!isOpen || !currentSlug) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    api.get(`/cms/pages/${currentSlug}`)
      .then(res => {
        if (isMounted && res.data?.success) {
          setPageData(res.data.data);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load policy document.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentSlug]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/policy/${currentSlug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'LEGAL':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'POLICIES':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'COMPANY':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'HELP':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  {pageData?.title || 'Policy & Legal Document'}
                </h3>
                {pageData?.category && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getCategoryBadgeClass(pageData.category)}`}>
                    {pageData.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Official Marketplace Terms, Privacy Standards & Regulatory Policies
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              title="Copy Policy Link"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handlePrint}
              title="Print Document"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Nav Bar */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 overflow-x-auto text-xs font-semibold select-none custom-device-scrollbar">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider flex items-center gap-1 font-bold shrink-0 mr-1">
            <BookOpen className="w-3.5 h-3.5" /> Navigate:
          </span>
          {QUICK_POLICIES.map(item => {
            const Icon = item.icon;
            const isActive = currentSlug === item.slug;
            return (
              <button
                key={item.slug}
                onClick={() => setCurrentSlug(item.slug)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all font-bold ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-device-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-semibold">Retrieving verified policy document...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <X className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">Document Unavailable</h4>
              <p className="text-sm text-slate-500 max-w-md mx-auto">{error}</p>
            </div>
          ) : (
            <div>
              {/* Document Meta info bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-6 mb-6 border-b border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Last Updated: {pageData?.updatedAt ? new Date(pageData.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recently'}
                  </span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold text-[11px]">
                    v{pageData?.version || 1}.0
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span>🔒 Enforced by AuraMarket Platform Terms</span>
                </div>
              </div>

              {/* Document Body Content */}
              <div
                className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed font-normal space-y-4"
                dangerouslySetInnerHTML={{ __html: pageData?.contentHtml || '<p>No content specified.</p>' }}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <p className="text-[11px]">
            For legal inquiries, contact <strong className="text-slate-800">legal@auramarket.com</strong>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors"
          >
            Close Document
          </button>
        </div>

      </div>
    </div>
  );
};

export default CmsPolicyViewerModal;
