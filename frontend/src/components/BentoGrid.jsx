import React from 'react';

export const BentoGrid = ({ children, className = '' }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 ${className}`}>
      {children}
    </div>
  );
};

export const BentoCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeColor = 'text-amber-700 bg-amber-50 border-amber-200',
  accentColor = 'text-amber-600',
  colSpan = 'col-span-1',
  children,
}) => {
  return (
    <div
      className={`bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md hover:border-slate-300 transition-all ${colSpan}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {title}
          </span>
          {value !== undefined && (
            <h3 className="text-2xl lg:text-3xl font-black text-slate-900 mt-1 tracking-tight">
              {value}
            </h3>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl bg-slate-50 border border-slate-100 ${accentColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
      )}

      {badge && (
        <div className="mt-3">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeColor}`}
          >
            {badge}
          </span>
        </div>
      )}

      {children}
    </div>
  );
};
