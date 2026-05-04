import React from 'react';

export function KpiCounters({ readyToBillCount, unassignedJobsCount, openInvoicesCount, availableCrewCount, onReadyToBill, onUnassignedJobs, onOpenInvoices, onCrew }) {
  const items = [
    ['Ready to bill', readyToBillCount, onReadyToBill],
    ['Unassigned jobs', unassignedJobsCount, onUnassignedJobs],
    ['Open invoices', openInvoicesCount, onOpenInvoices],
    ['Crew available', availableCrewCount, onCrew],
  ];
  return <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{items.map(([label, value, onClick]) => <article key={label} className="rounded-2xl border border-[#2a2f36] bg-[#111317] p-4 shadow-[0_14px_35px_rgba(15,17,21,0.20)] transition hover:border-[#d94f17] operator-panel operator-card" data-smart-hub-card="true"><p className="text-xs uppercase tracking-wide text-white/55">{label}</p><button type="button" onClick={onClick} className="mt-2 text-3xl font-black text-white">{value}</button></article>)}</section>;
}
