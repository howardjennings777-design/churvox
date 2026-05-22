import React from 'react';

export default function PremiumCard({
  children,
  title,
  subtitle,
  actions,
  icon,
  variant = 'default',
  hover = false,
  noBody = false,
  className = '',
  bodyClassName = '',
  onClick,
}) {
  const cls = [
    'px-card',
    hover ? 'px-card--hover' : '',
    variant === 'glass' ? 'px-card--glass' : '',
    variant === 'gradient' ? 'px-card--gradient' : '',
    onClick ? 'cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls} onClick={onClick}>
      {(title || actions) && (
        <div className="px-card__head">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <span className="h-9 w-9 rounded-xl px-row__avatar inline-flex items-center justify-center flex-shrink-0">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {title && <h3 className="px-card__title truncate">{title}</h3>}
              {subtitle && <p className="text-xs px-row__sub truncate">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      )}
      {!noBody ? <div className={`px-card__body ${bodyClassName}`}>{children}</div> : children}
    </div>
  );
}
