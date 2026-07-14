import React, { useMemo, useState } from "react";
import "./OfficeTeamJobDone.css";
import OfficeTeamSafeControls from "./OfficeTeamSafeControls";
import { rowKey, useOfficeTeamRows } from "./OfficeTeamLiveRows";

const previewJobs = [
  ["Today", "Completed job A", "Completed · evidence ready", "3 photos · 2.5 hours · extra labour noted"],
  ["Today", "Completed job B", "Completed · needs check", "Final photo missing · invoice not prepared"],
];

const previewInvoices = [
  ["Draft", "Completed job A", "$247.25", "Ready for owner review"],
  ["Waiting", "Completed job B", "$185.00", "Completion evidence needs checking first"],
];

const previewPayroll = [
  ["This week", "Worker A", "36.5 hrs", "One completed-job timer needs review"],
];

export function JobDoneBoard({ appMode = "lab", compact = false, go }) {
  const ownerRoute = isOwnerRoute();
  const allowFallback = appMode !== "owner" && !ownerRoute;
  const jobs = useOfficeTeamRows("work", previewJobs, { allowFallback, emptyMessage: "No completed jobs are waiting for closeout." });
  const invoices = useOfficeTeamRows("invoices", previewInvoices, { allowFallback, emptyMessage: "No invoice drafts are waiting." });
  const payroll = useOfficeTeamRows("payroll", previewPayroll, { allowFallback, emptyMessage: "No worker-time reviews are waiting." });
  const candidates = useMemo(() => closeoutCandidates(jobs.rows, invoices.rows, payroll.rows), [jobs.rows, invoices.rows, payroll.rows]);
  const [selectedKey, setSelectedKey] = useState("");
  const selected = candidates.find((item) => item.key === selectedKey) || candidates[0] || null;

  if (compact) {
    return (
      <article className="cvJobDoneCompact">
        <div><span>Job Done</span><strong>{candidates.length ? `${candidates.length} closeout${candidates.length === 1 ? "" : "s"} ready` : "Closeout queue clear"}</strong><p>Finished work is checked for completion evidence, time, extras and invoice readiness before anything reaches the customer or accounting.</p></div>
        <button type="button" onClick={() => go?.("work")}>{candidates.length ? "Review Job Done" : "Open Jobs"}</button>
      </article>
    );
  }

  return (
    <section className="cvJobDone" aria-label="Job Done closeout">
      <header className="cvJobDoneHero">
        <div><span>Job Done</span><h3>From finished work to owner-ready admin</h3><p>Churvox checks completion evidence, worker time, extras, invoice readiness and the next booking. The owner reviews one closeout instead of chasing separate screens.</p></div>
        <div className="cvJobDoneStats"><article><strong>{candidates.length}</strong><small>Ready to review</small></article><article><strong>{candidates.filter((item) => item.riskCount).length}</strong><small>Need a check</small></article><article><strong>{candidates.filter((item) => item.invoiceReady).length}</strong><small>Invoice-ready</small></article></div>
      </header>

      <div className="cvJobDoneLayout">
        <div className="cvJobDoneQueue">
          {candidates.length ? candidates.map((item) => (
            <button key={item.key} type="button" className={selected?.key === item.key ? "active" : ""} onClick={() => setSelectedKey(item.key)}>
              <span>{item.when}</span><strong>{item.title}</strong><em>{item.riskCount ? `${item.riskCount} check${item.riskCount === 1 ? "" : "s"}` : "Ready"}</em><small>{item.summary}</small>
            </button>
          )) : <article className="cvJobDoneEmpty"><strong>No finished jobs need the owner</strong><p>Completed work will appear here when there is a closeout to check.</p></article>}
        </div>

        <aside className="cvJobDoneSheet">
          {selected ? <>
            <div className="cvJobDoneSheetTop"><span>Job Done closeout</span><em>{selected.riskCount ? "Owner check" : "Ready"}</em></div>
            <h3>{selected.title}</h3><p>{selected.detail}</p>
            <div className="cvJobDoneChecks">
              {selected.checks.map((check) => <article key={check.label} className={check.tone}><span>{check.label}</span><strong>{check.value}</strong><small>{check.note}</small></article>)}
            </div>
            <div className="cvJobDonePrepared"><span>Prepared next step</span><strong>{selected.prepared}</strong><p>Nothing has been sent, synced, charged or changed. Approval creates only the owner-approved internal draft and records the decision.</p></div>
            <OfficeTeamSafeControls area="job-done" record={selected.record} primary="Prepare full closeout" secondary="Review evidence and time" command="Send Job Done to Command" />
          </> : <article className="cvJobDoneEmpty"><strong>Closeout queue clear</strong><p>Churvox will bring back the next finished job when evidence, time, extras or money needs the owner.</p></article>}
        </aside>
      </div>
    </section>
  );
}

export function MoneyRadar({ appMode = "lab", go }) {
  const ownerRoute = isOwnerRoute();
  const allowFallback = appMode !== "owner" && !ownerRoute;
  const jobs = useOfficeTeamRows("work", previewJobs, { allowFallback });
  const invoices = useOfficeTeamRows("invoices", previewInvoices, { allowFallback });
  const money = useOfficeTeamRows("money", previewInvoices, { allowFallback });
  const payroll = useOfficeTeamRows("payroll", previewPayroll, { allowFallback });
  const radar = useMemo(() => buildRadar(jobs.rows, invoices.rows, money.rows, payroll.rows), [jobs.rows, invoices.rows, money.rows, payroll.rows]);
  const [selected, setSelected] = useState(radar.items[0] || null);

  return (
    <section className="cvSiteScreen cvMoneyRadar">
      <header className="cvMoneyRadarHero"><div><span>Money Radar</span><h2>See what is earned, waiting and at risk</h2><p>Churvox connects completed work, draft invoices, payment follow-up and worker time. It prepares the next money step but keeps sends, charges, accounting sync and payroll locked until approval.</p></div><button type="button" onClick={() => go?.("command")}>Open money decisions</button></header>
      <div className="cvMoneyRadarMetrics">
        {radar.metrics.map((metric) => <article key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small></article>)}
      </div>
      <div className="cvMoneyRadarLayout">
        <section className="cvMoneyRadarList"><header><strong>What needs attention</strong><small>Current read-only checks</small></header>{radar.items.length ? radar.items.map((item) => <button key={item.key} type="button" className={selected?.key === item.key ? "active" : ""} onClick={() => setSelected(item)}><span>{item.type}</span><strong>{item.title}</strong><em>{item.amount}</em><small>{item.detail}</small></button>) : <article className="cvJobDoneEmpty"><strong>Money queue clear</strong><p>No completed work, invoice or payment exception currently needs review.</p></article>}</section>
        <aside className="cvMoneyRadarDetail">{selected ? <><span>{selected.type}</span><h3>{selected.title}</h3><strong>{selected.amount}</strong><p>{selected.detail}</p><dl><div><dt>Risk</dt><dd>{selected.risk}</dd></div><div><dt>Prepared</dt><dd>{selected.next}</dd></div><div><dt>Owner control</dt><dd>Required</dd></div></dl><OfficeTeamSafeControls area="money-radar" record={selected.record} primary={selected.next} secondary="Review source records" command="Prepare money decision" /></> : <article className="cvJobDoneEmpty"><strong>Nothing selected</strong><p>Select a money item to review the prepared next step.</p></article>}</aside>
      </div>
      <JobDoneBoard appMode={appMode} go={go} />
    </section>
  );
}

function closeoutCandidates(jobRows, invoiceRows, payrollRows) {
  const completed = (jobRows || []).filter((row) => /complete|completed|done|finished|closed|evidence ready|needs check|proof ready/i.test(`${row?.[2]} ${row?.[3]}`));
  return completed.map((row, index) => {
    const text = row.join(" ");
    const missingEvidence = /missing.*photo|missing.*proof|missing.*evidence|no proof|proof missing|evidence missing/i.test(text);
    const hasEvidence = /photo|proof|checklist|evidence/i.test(text) && !missingEvidence;
    const extra = /extra|over|additional|material/i.test(text);
    const timerRisk = /timer|hour|time|longer/i.test(text);
    const invoice = findRelated(invoiceRows, row[1]);
    const payroll = findRelated(payrollRows, row[1]);
    const riskCount = [missingEvidence, extra, timerRisk].filter(Boolean).length;
    const checks = [
      { label: "Completion evidence", value: missingEvidence ? "Missing" : hasEvidence ? "Ready" : "Check", note: missingEvidence ? "Ask the worker before customer closeout." : "Customer-visible evidence is ready for review.", tone: missingEvidence ? "warn" : "good" },
      { label: "Worker time", value: payroll?.[2] || (timerRisk ? "Review" : "Ready"), note: timerRisk ? "Compare the timer with the planned work." : "No unusual time is visible in the closeout.", tone: timerRisk ? "warn" : "good" },
      { label: "Extras", value: extra ? "Detected" : "None found", note: extra ? "Confirm the amount before the invoice draft is approved." : "No extra charge is currently flagged.", tone: extra ? "warn" : "good" },
      { label: "Invoice", value: invoice?.[2] || "Not prepared", note: invoice ? invoice[3] || "Draft is ready for review." : "Prepare a draft after evidence and extras are confirmed.", tone: invoice ? "good" : "neutral" },
    ];
    return {
      key: rowKey(row), record: [row[0], row[1], row[2], row[3]], when: row[0] || "Completed", title: row[1] || `Completed job ${index + 1}`,
      detail: row[3] || "Completed work is ready for a joined-up closeout review.", summary: riskCount ? `${riskCount} exception${riskCount === 1 ? "" : "s"} before closeout` : "Evidence, time and money ready for review",
      riskCount, invoiceReady: Boolean(invoice), checks,
      prepared: missingEvidence ? "Prepare a worker evidence request and hold the invoice" : extra ? "Prepare the invoice draft with extras left editable" : invoice ? "Prepare the complete customer and invoice handoff" : "Prepare the closeout and invoice draft",
    };
  });
}

function buildRadar(jobRows, invoiceRows, moneyRows, payrollRows) {
  const completed = (jobRows || []).filter((row) => /complete|done|finished|closed/i.test(`${row?.[2]} ${row?.[3]}`));
  const drafts = [...(invoiceRows || []), ...(moneyRows || [])].filter((row) => /draft|waiting|due|overdue|follow|review|ready/i.test(row.join(" ")));
  const overdue = drafts.filter((row) => /overdue|late|past due|follow-up/i.test(row.join(" ")));
  const workerChecks = (payrollRows || []).filter((row) => /review|odd|check|timer|prepared/i.test(row.join(" ")));
  const items = [];
  completed.forEach((row) => items.push(radarItem("Earned, not closed", row, amountFrom(row) || "Value needs review", "Completed work still needs its closeout and invoice direction.", "Closeout gap", "Prepare Job Done closeout")));
  drafts.forEach((row) => items.push(radarItem(/overdue|late|past due/i.test(row.join(" ")) ? "Payment risk" : "Invoice waiting", row, amountFrom(row) || "Amount saved", row[3] || row[2] || "Owner review is waiting.", overdue.includes(row) ? "Cash delayed" : "Approval waiting", overdue.includes(row) ? "Prepare payment follow-up" : "Prepare invoice approval")));
  workerChecks.forEach((row) => items.push(radarItem("Worker cost", row, row[2] || "Hours need review", row[3] || "Worker time needs checking before payroll.", "Cost not confirmed", "Prepare hours review")));
  return {
    metrics: [
      { label: "Finished, not closed", value: completed.length, note: "Jobs that may still need evidence, time or invoice review" },
      { label: "Invoice actions", value: drafts.length, note: "Drafts, due items and follow-ups waiting" },
      { label: "Payment risk", value: overdue.length, note: "Late or follow-up items that could delay cash" },
      { label: "Worker cost checks", value: workerChecks.length, note: "Hours or timers needing owner review" },
    ],
    items: dedupe(items),
  };
}

function radarItem(type, row, amount, detail, risk, next) { return { key: `${type}-${rowKey(row)}`, type, title: row[1] || row[0] || type, amount, detail, risk, next, record: [row[0], row[1], row[2], row[3]] }; }
function findRelated(rows = [], title = "") { const needle = String(title || "").toLowerCase(); return rows.find((row) => needle && row.join(" ").toLowerCase().includes(needle)) || rows[0] || null; }
function amountFrom(row = []) { return row.find((part) => /[$£€]\s?\d|\d+\.\d{2}/.test(String(part || ""))) || ""; }
function dedupe(items) { const seen = new Set(); return items.filter((item) => { const key = `${item.type}-${item.title}-${item.amount}`; if (seen.has(key)) return false; seen.add(key); return true; }); }
function isOwnerRoute() { return typeof window !== "undefined" && window.location.pathname.includes("dashboard"); }
