import clsx from 'clsx';

export default function TradieButton({
  as: Component = 'button',
  variant = 'primary',
  className,
  children,
  ...props
}) {
  return (
    <Component
      className={clsx('tradie-btn', `tradie-btn--${variant}`, className)}
      {...props}
    >
      {children}
    </Component>
  );
}
