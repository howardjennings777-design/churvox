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
        textShadow: '0 2px 18px rgba(0, 0, 0, 0.38)',
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
        color: '#93c5fd',
        background: 'rgba(255, 255, 255, 0.08)',
        borderColor: 'rgba(147, 197, 253, 0.22)',
      }
    : undefined;

  return (
    <header className={`px-hero ${className}`}>
      <div className="px-hero__content">
        {icon && <div className="px-hero__icon">{icon}</div>}
        <div className="px-hero__text">
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
