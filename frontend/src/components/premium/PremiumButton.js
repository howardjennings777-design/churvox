import React from 'react';

export default function PremiumButton({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button type={type} className={`px-btn px-btn--${variant} px-btn--${size} ${className}`} {...props}>
      {children}
    </button>
  );
}
