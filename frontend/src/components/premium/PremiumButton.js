import React from 'react';

export default function PremiumButton({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  iconLeft,
  iconRight,
  disabled,
  onClick,
  dataTestId,
  ...rest
}) {
  const variantCls = {
    primary: 'px-btn--primary',
    secondary: 'px-btn--secondary',
    ghost: 'px-btn--ghost',
    danger: 'px-btn--danger',
    success: 'px-btn--success',
  }[variant] || 'px-btn--primary';
  const sizeCls = size === 'sm' ? 'px-btn--sm' : size === 'lg' ? 'px-btn--lg' : '';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-testid={dataTestId}
      className={`px-btn ${variantCls} ${sizeCls} ${className}`}
      {...rest}
    >
      {iconLeft}
      <span>{children}</span>
      {iconRight}
    </button>
  );
}
