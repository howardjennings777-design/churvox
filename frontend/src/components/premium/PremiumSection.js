import React from 'react';

export default function PremiumSection({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`px-section ${className}`}>
      {(title || actions) && (
        <div className="px-section__head">
          <div>
            {title && <h2 className="px-section__title">{title}</h2>}
            {subtitle && <p className="px-section__sub">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
