import React from 'react';

export function ApprovalCentreSummary({ approvalCounts, priorityItems = [], bestNextMove, onOpen, onRunPlan }) {
  const totalApprovals = approvalCounts.all || 0;
  const stats = [
    ['Need decision', approvalCounts.needs_decision || 0],
    ['Ready', approvalCounts.ready || 0],
    ['Drafts', approvalCounts.drafts || 0],
    ['Watching', approvalCounts.watching || 0],
  ];

  return (
    <section className="mt-6 rounded-2xl border border-[#c7bba9] border-l-4 border-l-[#f97316] bg-[#f4eee4] p-4 text-[#101318] shadow-[0_14px_32px_rgba(15,17,21,0.14)] operator-panel operator-card operator-accent-left" data-smart-hub-card="true">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#5a5146]">AI Approval Centre</p>
          <h2 className="mt-1 text-lg font-black text-[#101318]">Owner approval queue</h2>
          <p className="mt-1 text-sm font-semibold text-[#6f6558]">AI prepares the work. You approve what happens next.</p>
        </div>
        <button type="button" onClick={() => onOpen('all')} className="rounded-full bg-[#111317] px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-[0_10px_22px_rgba(0,0,0,0.18)]">
          {totalApprovals} approvals
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <button key={label} type="button" onClick={() => onOpen(label === 'Need decision' ? 'needs_decision' : label.toLowerCase())} className="rounded-xl border border-[#c9bba8] bg-[#ebe2d6] px-3 py-2 text-left transition hover:border-[#f97316]/70 hover:bg-[#f8f1e7]">
            <span className="block text-[10px] font-black uppercase tracking-wide text-[#5a5146]">{label}</span>
            <span className="mt-1 block text-2xl font-black text-[#101318]">{value}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {!!priorityItems.length ? priorityItems.slice(0, 3).map((item) => (
          <button key={item.id} type="button" onClick={() => onOpen(bestNextMove?.approvalTab || 'all')} className="w-full rounded-xl border border-[#c9bba8] bg-[#fff8ee] px-3 py-3 text-left text-[#101318] transition hover:border-[#f97316]/70 hover:bg-white">
            <p className="text-sm font-black">{item.meta?.title || item.title}</p>
            {item.meta?.subtitle ? <p className="mt-1 text-xs font-semibold text-[#6f6558]">{item.meta.subtitle}</p> : null}
          </button>
        )) : (
          <div className="rounded-xl border border-[#c9bba8] bg-[#fff8ee] px-3 py-3 text-sm font-semibold text-[#5a5146]">No approvals waiting right now.</div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => onOpen('all')} className="rounded-xl bg-[#f97316] px-4 py-2.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(249,115,22,0.28)] transition hover:bg-[#ea580c] operator-primary" data-operator-primary="true">Open Approval Centre</button>
        <button type="button" onClick={onRunPlan} className="rounded-xl bg-[#111317] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#050607]">Run today's AI plan</button>
      </div>
    </section>
  );
}
