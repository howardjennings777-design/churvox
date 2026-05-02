import React from 'react';

export default function PremiumBadge({ children, tone = 'slate', className = '', icon }) {
  return (
    <span className={`px-badge px-badge--${tone} ${className}`}>
      {icon}
      {children}
    </span>
  );
}
