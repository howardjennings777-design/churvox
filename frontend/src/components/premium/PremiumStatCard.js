import React from 'react';

export default function PremiumStatCard({ label, value, icon, tone = 'blue', delta, onClick, dataTestId, className = '' }) {
  const toneCls = {
    blue: '',
    teal: 'px-stat__icon--teal',
    amber: 'px-stat__icon--amber',
    red: 'px-stat__icon--red',
    sky: 'px-stat__icon--sky',
    violet: 'px-stat__icon--violet',
  }[tone] || '';

  return (
    <button type="button" onClick={onClick} className={`px-stat ${className}`} data-testid={dataTestId}>
      <div className="px-stat__top">
        <span className="px-stat__label">{label}</span>
        {icon && <span className={`px-stat__icon ${toneCls}`}>{icon}</span>}
      </div>
      <div className="px-stat__value">{value}</div>
      {delta && <div className="px-stat__delta">{delta}</div>}
    </button>
  );
}
