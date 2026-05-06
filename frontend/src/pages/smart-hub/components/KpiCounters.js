import React from 'react';

export function KpiCounters({ readyToBillCount, unassignedJobsCount, openInvoicesCount, availableCrewCount, onReadyToBill, onUnassignedJobs, onOpenInvoices, onCrew }) {
  const items = [
    ['Ready to bill', readyToBillCount, onReadyToBill, 'Completed work waiting for an invoice'],
    ['Unassigned jobs', unassignedJobsCount, onUnassignedJobs, 'Jobs AI checked and can help place with crew'],
    ['Open invoices', openInvoicesCount, onOpenInvoices, 'Money still waiting to come in'],
    ['Crew available', availableCrewCount, onCrew, 'Workers ready for dispatch'],
  ];

  return (
    <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(([label, value, onClick, hint]) => (
        <article
          key={label}
          className="group rounded-2xl border border-[#c7bba9] bg-[#f5efe5] p-4 text-[#101318] shadow-[0_14px_32px_rgba(15,17,21,0.14)] transition hover:-translate-y-0.5 hover:border-[#f97316]/70 hover:shadow-[0_18px_42px_rgba(15,17,21,0.20)]"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#5a5146]">{label}</p>
          <button
            type="button"
            onClick={onClick}
            className="mt-2 block text-left text-4xl font-black leading-none text-[#101318]"
          >
            {value}
          </button>
          <p className="mt-2 hidden text-xs font-semibold text-[#6f6558] sm:block">{hint}</p>
        </article>
      ))}
    </section>
  );
}
