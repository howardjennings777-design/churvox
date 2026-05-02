import React from 'react';

export default function PremiumHero({
  eyebrow,
  title,
  subtitle,
  actions,
  icon,
  children,
  className = '',
}) {
  return (
    <header className={`px-hero ${className}`}>
      <div className="flex items-start gap-4 relative z-[1]">
        {icon && (
          <div className="hidden md:flex h-14 w-14 rounded-2xl items-center justify-center bg-white border border-[#cfe0fb] text-[#1d4ed8] shadow-md flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {eyebrow && <span className="px-hero__eyebrow">{eyebrow}</span>}
          {title && <h1 className="px-hero__title">{title}</h1>}
          {subtitle && <p className="px-hero__sub">{subtitle}</p>}
          {children}
          {actions && <div className="px-hero__actions">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
