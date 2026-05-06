import React from "react";
import { ShieldCheck, Sparkles } from "lucide-react";

export default function AIPageAssistant({
  pageName,
  autoCheckStatus = "ON",
  lastScanLabel = "Just now",
  outcomeRows = [],
  compact = false,
  checkedCount = 0,
  foundCount = 0,
  preparedCount = 0,
  approvalCount = 0,
    recommendation,
  actions = [],
  safetyNote,
  loading = false,
  emptyMessage = "All clear. No action needed right now.",
  }) {
  const hasCounts = [checkedCount, foundCount, preparedCount, approvalCount].some((v) => Number(v) > 0);
  const defaultRows = [
    { label: "Checked", value: checkedCount, text: "records" },
    { label: "Found", value: foundCount, text: "items needing attention" },
    { label: "Prepared", value: preparedCount, text: "drafts/actions" },
    { label: "Approval needed", value: approvalCount, text: "items" },
  ];

  return (
    <section className={compact ? "" : "px-card"}>
      <div className="px-card__body space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-heading text-lg font-bold text-[#0d1b34]">AI {pageName} Assistant</h3>
            <p className="text-sm text-[#5b6c87] mt-1">Auto-check: {autoCheckStatus} · Last scan: {lastScanLabel}</p>
          </div>
          <div className="flex gap-2 text-[11px] font-semibold">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-2.5 py-1">AUTO-CHECK ON</span>
            <span className="rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2.5 py-1">APPROVAL-FIRST</span>
          </div>
        </div>

        {loading ? <p className="text-sm text-[#5b6c87]">AI is checking this page…</p> : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {(outcomeRows.length ? outcomeRows : defaultRows).map((row) => (
            <div key={row.label} className="rounded-xl border border-[#dbe6f6] bg-[#f8fbff] px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-[#5b6c87]">{row.label}</p>
              <p className="text-sm font-semibold text-[#0d1b34]">{Number(row.value || 0)} {row.text}</p>
            </div>
          ))}
        </div>

        {}

        <div className="rounded-xl border border-[#dbe6f6] bg-white px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-[#5b6c87]">Recommended action</p>
          <p className="text-sm text-[#0d1b34] mt-1">{recommendation || (hasCounts ? "Review prepared items and approve the next safe action." : "All clear. No action needed right now.")}</p>
          {!hasCounts ? <p className="text-sm text-[#5b6c87] mt-1">{emptyMessage}</p> : null}
          <div className="flex flex-wrap gap-2 mt-3">
            {actions.length ? actions : <button type="button" className="px-btn px-btn--secondary px-btn--sm">Review</button>}
          </div>
        </div>

        <p className="text-xs text-[#5b6c87] flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> {safetyNote || "Auto-send is OFF. AI prepares drafts for review., no auto-charge, no payroll changes, and no MYOB writes without owner approval."}</p>
      </div>
    </section>
  );
}
