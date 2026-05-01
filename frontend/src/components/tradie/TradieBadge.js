import clsx from 'clsx';

export default function TradieBadge({ tone = 'default', children, className }) {
  return (
    <span className={clsx('tradie-badge', `tradie-badge--${tone}`, className)}>
      {children}
    </span>
  );
}
