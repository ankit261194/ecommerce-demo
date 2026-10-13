import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const SlideOverDrawer = ({ isOpen, onClose, title, children, width = 'max-w-md' }) => {
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className={`w-screen ${width} transform transition-transform ease-in-out duration-300`}>
          <div className="flex h-full flex-col bg-white text-slate-900 border-l border-slate-200 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                {title}
              </h2>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-white">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
