import React from 'react';

export default function PremiumFormSection({ title, subtitle, children, actions, className = '' }) {
  return (
    <div className={`px-form-section ${className}`}>
      {(title || actions) && (
        <div className="px-form-section__head flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="px-form-section__title">{title}</h3>}
            {subtitle && <p className="px-form-section__sub">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
