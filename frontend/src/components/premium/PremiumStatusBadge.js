import React from 'react';
import PremiumBadge from './PremiumBadge';

const MAP = {
  // Job
  completed: { tone: 'green', label: 'Completed' },
  in_progress: { tone: 'blue', label: 'In progress' },
  paused: { tone: 'amber', label: 'Paused' },
  acknowledged: { tone: 'sky', label: 'Acknowledged' },
  assigned: { tone: 'slate', label: 'Assigned' },
  scheduled: { tone: 'slate', label: 'Scheduled' },
  cancelled: { tone: 'red', label: 'Cancelled' },
  // Quote
  draft: { tone: 'slate', label: 'Draft' },
  sent: { tone: 'blue', label: 'Sent' },
  accepted: { tone: 'green', label: 'Accepted' },
  declined: { tone: 'red', label: 'Declined' },
  // Invoice
  paid: { tone: 'green', label: 'Paid' },
  overdue: { tone: 'red', label: 'Overdue' },
  unpaid: { tone: 'amber', label: 'Unpaid' },
  pending: { tone: 'amber', label: 'Pending' },
  // Generic
  active: { tone: 'green', label: 'Active' },
  inactive: { tone: 'slate', label: 'Inactive' },
  failed: { tone: 'red', label: 'Failed' },
  success: { tone: 'green', label: 'Success' },
};

export default function PremiumStatusBadge({ status, label, tone, className = '' }) {
  const key = String(status || '').toLowerCase();
  const cfg = MAP[key] || { tone: tone || 'slate', label: label || status || 'Unknown' };
  return (
    <PremiumBadge tone={tone || cfg.tone} className={className}>
      {label || cfg.label}
    </PremiumBadge>
  );
}
