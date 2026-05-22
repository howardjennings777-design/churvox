import React from 'react';

export default function PremiumStatusBadge({ status, className = '' }) {
  const raw = String(status || 'Open');
  const safe = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const label = raw.replace(/_/g, ' ');
  return <span className={`px-badge status-badge status-${safe} ${className}`}>{label}</span>;
}
