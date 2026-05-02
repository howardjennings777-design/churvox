import React from 'react';

export default function PremiumPage({ children, className = '', maxWidth }) {
  const style = maxWidth ? { maxWidth } : undefined;
  return (
    <div className={`px-page ${className}`} style={style}>
      {children}
    </div>
  );
}
