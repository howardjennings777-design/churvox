import React from 'react';

export default function PremiumPage({ children, className = '', maxWidth }) {
  const style = maxWidth ? { maxWidth, width: '100%', margin: '0 auto' } : undefined;
  return <div className={`px-page ${className}`} style={style}>{children}</div>;
}
