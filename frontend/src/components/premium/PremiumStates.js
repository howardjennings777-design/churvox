import React from 'react';

export default function PremiumEmptyState({ title = 'Nothing here yet', description, action }) {
  return (
    <div className="px-empty px-card__body">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function PremiumLoadingState({ title = 'Loading…', description }) {
  return (
    <div className="px-loading px-card__body">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
}

export function PremiumErrorState({ title = 'Something went wrong', description, action }) {
  return (
    <div className="px-error px-card__body">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
