import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function PremiumActionCard({ icon, title, description, onClick, dataTestId, className = '', tone = 'blue' }) {
  const iconBg = {
    blue: 'bg-[#eff4ff] text-[#1d4ed8]',
    teal: 'bg-[#ccfbf1] text-[#0d9488]',
    amber: 'bg-[#fff1d6] text-[#d97706]',
    red: 'bg-[#ffe1e1] text-[#dc2626]',
    sky: 'bg-[#e0f2fe] text-[#0284c7]',
    violet: 'bg-[#ede4ff] text-[#7c3aed]',
  }[tone] || 'bg-[#eff4ff] text-[#1d4ed8]';

  return (
    <button type="button" onClick={onClick} className={`px-action group ${className}`} data-testid={dataTestId}>
      <div className="flex items-start gap-3">
        {icon && (
          <span className={`h-10 w-10 rounded-xl inline-flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            {icon}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="px-action__title truncate">{title}</h4>
            <ArrowRight className="h-4 w-4 text-[#94a3b8] group-hover:text-[#1d4ed8] transition" />
          </div>
          {description && <p className="px-action__desc">{description}</p>}
        </div>
      </div>
    </button>
  );
}
