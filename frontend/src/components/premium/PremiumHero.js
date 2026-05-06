import React from 'react';

export default function PremiumHero({
  eyebrow,
  title,
  subtitle,
  actions,
  icon,
  children,
  className = '',
  forceLightText = true,
}) {
  const lightTitleStyle = forceLightText
    ? {
        color: '#ffffff',
        opacity: 1,
        textShadow: '0 2px 18px rgba(0, 0, 0, 0.42)',
      }
    : undefined;

  const lightSubtitleStyle = forceLightText
    ? {
        color: '#dbeafe',
        opacity: 1,
      }
    : undefined;

  const lightEyebrowStyle = forceLightText
    ? {
        color: '#ff6b15',
        background: 'rgba(255, 255, 255, 0.10)',
        borderColor: 'rgba(255, 255, 255, 0.16)',
      }
    : undefined;

  return (
    <header className={`px-hero ${className}`}>
      <div className="flex items-start gap-4 relative z-[1]">
        {icon && (
          <div className="hidden md:flex h-14 w-14 rounded-2xl items-center justify-center bg-white border border-[#cfe0fb] text-[#1d4ed8] shadow-md flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {eyebrow && <span className="px-hero__eyebrow" style={lightEyebrowStyle}>{eyebrow}</span>}
          {title && <h1 className="px-hero__title" style={lightTitleStyle}>{title}</h1>}
          {subtitle && <p className="px-hero__sub" style={lightSubtitleStyle}>{subtitle}</p>}
          {children}
          {actions && <div className="px-hero__actions">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
