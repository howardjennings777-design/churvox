import React from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';

export default function PremiumAIBox({
  title = 'AI Business Assistant',
  subtitle = 'AI checked live data and prepares owner-approved actions from your live business data',
  chip = 'Approval-first',
  suggestions = [],
  notice = 'Approval-first: review every prepared action before anything is sent or changed. Customer messages are logged and controlled by your auto-send settings.',
  children,
  actions,
  className = '',
  dataTestId = 'premium-ai-box',
}) {
  return (
    <div className={`px-ai ${className}`} data-testid={dataTestId}>
      <div className="px-ai__head">
        <div className="px-ai__icon"><Sparkles className="h-5 w-5" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="px-ai__title">{title}</h3>
            {chip && <span className="px-ai__chip"><ShieldCheck className="h-3 w-3" />{chip}</span>}
          </div>
          {subtitle && <p className="px-ai__sub">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>

      {Array.isArray(suggestions) && suggestions.length > 0 && (
        <div className="relative z-[1]">
          {suggestions.map((s, i) => (
            <div key={i} className="px-ai__suggestion">
              {s.icon && (
                <span className="h-9 w-9 rounded-xl bg-[#ede4ff] text-[#7c3aed] inline-flex items-center justify-center flex-shrink-0">
                  {s.icon}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold text-[#0d1b34]">{s.title}</p>
                {s.description && <p className="text-[12.5px] text-[#5b6c87] mt-0.5">{s.description}</p>}
              </div>
              {s.action && <div className="flex-shrink-0">{s.action}</div>}
            </div>
          ))}
        </div>
      )}

      {children && <div className="relative z-[1] mt-3">{children}</div>}
      {notice && <div className="px-ai__notice relative z-[1]">{notice}</div>}
    </div>
  );
}
