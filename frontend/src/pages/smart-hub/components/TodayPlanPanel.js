import React from 'react';

export function TodayPlanPanel({ jobsTodayCount, unassignedJobsCount, readyToBillCount, openInvoicesCount, quotesWaitingCount, availableCrewCount, bestNextMove, onJobsToday, onUnassignedJobs, onReadyToBill, onOpenInvoices, onQuotesWaiting, onCrew }) {
  const items = [["Jobs today", jobsTodayCount, onJobsToday],["Unassigned jobs", unassignedJobsCount, onUnassignedJobs],["Ready to bill", readyToBillCount, onReadyToBill],["Open invoices", openInvoicesCount, onOpenInvoices],["Quotes waiting", quotesWaitingCount, onQuotesWaiting],["Crew available", availableCrewCount, onCrew]];
  return (
    <article className="rounded-2xl border border-[#c7bba9] border-l-4 border-l-[#f97316] bg-[#f4eee4] p-4 text-[#101318] shadow-[0_14px_32px_rgba(15,17,21,0.14)] operator-panel operator-card operator-accent-left" data-smart-hub-card="true">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#5a5146]">Today&apos;s Plan</p>
          <h2 className="mt-1 text-lg font-black text-[#101318]">AI daily run sheet</h2>
        </div>
        <span className="rounded-full bg-[#111317] px-3 py-1 text-xs font-bold text-white">Live</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {items.map(([label, value, onClick]) => (
          <button type="button" key={label} onClick={onClick} className="rounded-xl border border-[#c9bba8] bg-[#ebe2d6] px-3 py-2 text-left text-[#101318] transition hover:border-[#f97316]/70 hover:bg-[#f8f1e7] operator-inner" data-smart-hub-inner="true">
            <p className="text-[11px] font-black uppercase tracking-wide text-[#5a5146]">{label}</p>
            <p className="mt-1 text-2xl font-black text-[#101318]">{value}</p>
          </button>
        ))}
      </div>
      <p className="mt-4 rounded-xl border border-[#d7cbbc] bg-[#fff8ee] px-3 py-2 text-sm font-semibold text-[#2b2118]">
        AI found {readyToBillCount} {readyToBillCount === 1 ? "job" : "jobs"} ready to bill, {unassignedJobsCount} unassigned {unassignedJobsCount === 1 ? "job" : "jobs"}, {openInvoicesCount} open {openInvoicesCount === 1 ? "invoice" : "invoices"} and {quotesWaitingCount} {quotesWaitingCount === 1 ? "quote" : "quotes"} waiting. Best next move: {bestNextMove?.label}
      </p>
    </article>
  );
}
