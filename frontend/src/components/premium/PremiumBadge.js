import React from 'react';

export default function PremiumBadge({ children, className = '', tone = '' }) {
  return <span className={`px-badge ${tone ? `px-badge--${tone}` : ''} ${className}`}>{children}</span>;
}
