import React from 'react';
import { Inbox, AlertTriangle } from 'lucide-react';

export default function PremiumEmptyState({ icon, title = 'Nothing here yet', subtitle, action, className = '' }) {
  return (
    <div className={`px-empty ${className}`}>
      <div className="px-empty__icon">{icon || <Inbox className="h-6 w-6" />}</div>
      <h3 className="px-empty__title">{title}</h3>
      {subtitle && <p className="px-empty__sub">{subtitle}</p>}
      {action && <div className="px-empty__cta">{action}</div>}
    </div>
  );
}

export function PremiumLoadingState({ title = 'Loading…', subtitle }) {
  return (
    <div className="px-loading">
      <div className="px-loading__spinner" />
      <h3 className="px-empty__title">{title}</h3>
      {subtitle && <p className="px-empty__sub">{subtitle}</p>}
    </div>
  );
}

export function PremiumErrorState({ title = 'Something went wrong', subtitle, action }) {
  return (
    <div className="px-error">
      <div className="px-error__icon"><AlertTriangle className="h-6 w-6" /></div>
      <h3 className="px-empty__title">{title}</h3>
      {subtitle && <p className="px-empty__sub">{subtitle}</p>}
      {action && <div className="px-empty__cta">{action}</div>}
    </div>
  );
}
