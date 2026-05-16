// PHASE_177_HIDE_DISPATCH_WORDING_BEHIND_AI_CREW_ASSIGNMENT
import React from 'react';

export function BusinessPulsePanel({ openInvoicesCount, readyToBillCount, unassignedJobsCount, quotesWaitingCount, crewCount, onMoneyWaiting, onBillingReady, onAssign crewPressure, onPipeline, onCrew }) {
  const items = [["Money waiting", openInvoicesCount, onMoneyWaiting],["Billing ready", readyToBillCount, onBillingReady],["Assign crew pressure", unassignedJobsCount, onAssign crewPressure],["Pipeline", quotesWaitingCount, onPipeline],["Crew", crewCount, onCrew]];
  return (
    <article className="rounded-2xl border border-[#c7bba9] border-l-4 border-l-[#f97316] bg-[#f4eee4] p-4 text-[#101318] shadow-[0_14px_32px_rgba(15,17,21,0.14)] operator-panel operator-card operator-accent-left" data-smart-hub-card="true">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#5a5146]">Business Pulse</p>
          <h2 className="mt-1 text-lg font-black text-[#101318]">Owner snapshot</h2>
        </div>
        <span className="rounded-full bg-[#111317] px-3 py-1 text-xs font-bold text-white">Now</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {items.map(([label, value, onClick]) => (
          <button type="button" key={label} onClick={onClick} className="rounded-xl border border-[#c9bba8] bg-[#ebe2d6] p-3 text-left text-[#101318] transition hover:border-[#f97316]/70 hover:bg-[#f8f1e7]">
            <p className="text-[11px] font-black uppercase tracking-wide text-[#5a5146]">{label}</p>
            <p className="mt-1 text-2xl font-black text-[#101318]">{value}</p>
          </button>
        ))}
      </div>
    </article>
  );
}
