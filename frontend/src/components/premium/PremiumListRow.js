import React from 'react';

export default function PremiumListRow({ avatar, title, subtitle, right, onClick, className = '', dataTestId }) {
  return (
    <div onClick={onClick} className={`px-row ${onClick ? 'cursor-pointer' : ''} ${className}`} data-testid={dataTestId}>
      {avatar && (
        <div className="px-row__avatar">{avatar}</div>
      )}
      <div className="px-row__main">
        <div className="px-row__title truncate">{title}</div>
        {subtitle && <div className="px-row__sub truncate">{subtitle}</div>}
      </div>
      {right && <div className="flex items-center gap-2 flex-shrink-0">{right}</div>}
    </div>
  );
}
