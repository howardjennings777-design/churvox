import React from 'react';

export default function PremiumFormSection({ title, description, actions, children, className = '' }) {
  return (
    <section className={`px-form-section ${className}`}>
      {(title || description || actions) && (
        <div className="px-card__head">
          <div>
            {title && <h3 className="px-card__title">{title}</h3>}
            {description && <p className="px-row__sub" style={{ marginTop: 4 }}>{description}</p>}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className="px-card__body">{children}</div>
    </section>
  );
}
