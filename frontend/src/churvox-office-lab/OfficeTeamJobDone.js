import React, { useEffect, useMemo, useState } from "react";
import "./OfficeTeamJobDone.css";
import { fetchJobDoneCloseouts, fetchMoneyRadar, prepareJobDoneCloseout, prepareMoneyRadarItem } from "./OfficeTeamJobDoneApi";

const previewCloseouts = [
  {
    id: "preview-smith",
    job_id: "preview-job-smith",
    job_title: "Smith lawn service",
    closeout_state: "needs_owner",
    status: "open",
    risk_keys: ["extras"],
    risk_count: 1,
    proof: { status: "ready", count: 3, note: "Three completion photos are attached." },
    worker_time: { status: "ready", hours: 2.5, note: "Worker time is ready for review." },
    extras: { status: "review", amount: 45, note: "Extra labour remains editable." },
    invoice: { status: "draft", amount: 247.25, note: "Draft invoice is ready for owner review." },
    recurring: { status: "ready", next_date: "Next fortnight", note: "Next recurring date is ready." },
    source_snapshot: { completed_at: "Today", notes: "Green waste and extra labour recorded." },
  },
  {
    id: "preview-jones",
    job_id: "preview-job-jones",
    job_title: "Jones property tidy",
    closeout_state: "needs_owner",
    status: "open",
    risk_keys: ["proof", "invoice"],
    risk_count: 2,
    proof: { status: "missing", count: 0, note: "Final completion photo is missing." },
    worker_time: { status: "ready", hours: 1.75, note: "Worker time is ready." },
    extras: { status: "clear", amount: 0, note: "No extras recorded." },
    invoice: { status: "missing", amount: 185, note: "No invoice is linked yet." },
    recurring: { status: "not_applicable", next_date: "", note: "One-off job." },
    source_snapshot: { completed_at: "Today", notes: "Final proof needed before closeout." },
  },
];

const previewRadar = {
  metrics: [
    { label: "Finished, not closed", value: 2, note: "Completed work still needing closeout" },
    { label: "Invoice actions", value: 2, note: "Drafts and invoice preparation waiting" },
    { label: "Payment risk", value: 0, note: "No overdue preview invoices" },
    { label: "Worker cost checks", value: 0, note: "No unusual preview timers" },
  ],
  items: previewCloseouts.map((item) => ({
    key: `preview-${item.id}`,
    type: "Earned, not closed",
    title: item.job_title,
    amount: item.invoice?.amount || 0,
    risk: item.risk_keys.join(", ") || "Owner approval waiting",
    next: "Prepare Job Done closeout",
    closeout_id: item.id,
    job_id: item.job_id,
    detail: "Preview closeout connecting proof, time, extras and invoice readiness.",
  })),
};

export function JobDoneBoard({ appMode = "lab", compact = false, go }) {
  const reality = useCloseouts(appMode);
  const closeouts = reality.closeouts;
  const [selectedKey, setSelectedKey] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const selected = closeouts.find((item) => closeoutKey(item) === selectedKey) || closeouts[0] || null;

  useEffect(() => {
    if (selectedKey && !closeouts.some((item) => closeoutKey(item) === selectedKey)) setSelectedKey("");
  }, [closeouts, selectedKey]);

  async function prepare(intent, openCommand = false) {
    if (!selected || busy) return;
    if (reality.preview) {
      setNotice(intent === "review_proof_time"
        ? "Preview review opened. Proof, time and extras remain editable; nothing was changed."
        : "Preview Job Done closeout prepared. Nothing was sent, synced, charged or changed.");
      if (openCommand) go?.("command");
      return;
    }
    setBusy(intent);
    setNotice("");
    try {
      const result = await prepareJobDoneCloseout(selected.id, intent);
      setNotice(result?.existing ? "This closeout is already waiting in Command." : "Job Done is ready in Command for owner approval.");
      if (openCommand) go?.("command");
    } catch (error) {
      setNotice(error?.message || "Could not prepare Job Done. Nothing was changed.");
    } finally {
      setBusy("");
    }
  }

  if (compact) {
    return (
      <article className="cvJobDoneCompact">
        <div>
          <span>Job Done · {reality.preview ? "preview" : reality.source}</span>
          <strong>{reality.loading ? "Checking finished work…" : closeouts.length ? `${closeouts.length} closeout${closeouts.length === 1 ? "" : "s"} ready` : "Closeout queue clear"}</strong>
          <p>Finished work is persisted and checked against proof, linked time, extras, invoice state and recurring follow-up.</p>
        </div>
        <button type="button" onClick={() => go?.("work")}>{closeouts.length ? "Review Job Done" : "Open Jobs"}</button>
      </article>
    );
  }

  return (
    <section className="cvJobDone" aria-label="Job Done closeout">
      <header className="cvJobDoneHero">
        <div>
          <span>Signature workflow · persisted Job Done</span>
          <h3>From finished work to owner-ready admin</h3>
          <p>One stored closeout joins the real job, client, proof, worker time, extras, invoice and next recurring step by ID. Refreshing the page does not lose its progress.</p>
        </div>
        <div className="cvJobDoneStats">
          <article><strong>{closeouts.length}</strong><small>Stored closeouts</small></article>
          <article><strong>{closeouts.filter((item) => Number(item.risk_count || 0) > 0).length}</strong><small>Need a check</small></article>
          <article><strong>{closeouts.filter(invoiceReady).length}</strong><small>Invoice-linked</small></article>
        </div>
      </header>

      <div className="cvJobDoneLayout">
        <div className="cvJobDoneQueue">
          {reality.loading ? <Empty title="Checking completed jobs" text="Churvox is creating or refreshing the persisted closeout records." /> : closeouts.length ? closeouts.map((item) => (
            <button key={closeoutKey(item)} type="button" className={closeoutKey(selected) === closeoutKey(item) ? "active" : ""} onClick={() => setSelectedKey(closeoutKey(item))}>
              <span>{completedWhen(item)}</span>
              <strong>{item.job_title || "Completed job"}</strong>
              <em>{Number(item.risk_count || 0) ? `${item.risk_count} check${Number(item.risk_count) === 1 ? "" : "s"}` : item.status === "approved" ? "Approved" : "Ready"}</em>
              <small>{closeoutSummary(item)}</small>
            </button>
          )) : <Empty title="No finished jobs need the owner" text={reality.error || "Completed work will appear here as a persisted closeout when it is ready."} />}
        </div>

        <aside className="cvJobDoneSheet">
          {selected ? <>
            <div className="cvJobDoneSheetTop"><span>Job Done closeout · {selected.id}</span><em>{selected.closeout_state === "needs_owner" ? "Owner check" : selected.status || "Ready"}</em></div>
            <h3>{selected.job_title || "Completed job"}</h3>
            <p>{selected.source_snapshot?.notes || "Completed work is linked to its structured closeout record."}</p>
            <div className="cvJobDoneChecks">
              {checksFor(selected).map((check) => <article key={check.label} className={check.tone}><span>{check.label}</span><strong>{check.value}</strong><small>{check.note}</small></article>)}
            </div>
            <div className="cvJobDonePrepared">
              <span>Prepared next step</span>
              <strong>{preparedDirection(selected)}</strong>
              <p>Approval may create internal drafts once. It still cannot send, sync, charge, file tax or pay anyone.</p>
            </div>
            <div className="cvSafeControls" aria-label="Job Done owner controls">
              <div className="cvSafeControlButtons">
                <button className="primary" type="button" disabled={Boolean(busy)} onClick={() => prepare("full_closeout")}>{busy === "full_closeout" ? "Preparing…" : "Prepare full closeout"}</button>
                <button type="button" disabled={Boolean(busy)} onClick={() => prepare("review_proof_time")}>{busy === "review_proof_time" ? "Preparing…" : "Review proof and time"}</button>
                <button type="button" disabled={Boolean(busy)} onClick={() => prepare("command", true)}>{busy === "command" ? "Preparing…" : "Send Job Done to Command"}</button>
              </div>
              <small>{reality.preview ? "Preview only. Live owner routes create a persisted Command slip." : "Every action uses this stored closeout ID and creates at most one open Command slip."}</small>
              {notice ? <div className="cvSafeTrail"><p>{notice}</p></div> : null}
            </div>
          </> : <Empty title="Closeout queue clear" text="Churvox will bring back the next persisted finished job when proof, time, extras or money needs the owner." />}
        </aside>
      </div>
    </section>
  );
}

export function MoneyRadar({ appMode = "lab", go }) {
  const ownerRoute = isOwnerRoute();
  const preview = appMode !== "owner" && !ownerRoute;
  const [state, setState] = useState(() => preview ? { loading: false, ...previewRadar, source: "preview" } : { loading: true, metrics: [], items: [], source: "loading" });
  const [selectedKey, setSelectedKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (preview) return undefined;
    let active = true;
    fetchMoneyRadar().then((result) => {
      if (active) setState({ loading: false, metrics: result.metrics, items: result.items, source: result.source, error: "" });
    }).catch((error) => {
      if (active) setState({ loading: false, metrics: [], items: [], source: "error", error: error?.message || "Money Radar unavailable" });
    });
    return () => { active = false; };
  }, [preview]);

  const selected = state.items.find((item) => item.key === selectedKey) || state.items[0] || null;

  async function prepareSelected() {
    if (!selected || busy || preview) return;
    setBusy(true);
    setNotice("");
    try {
      const result = await prepareMoneyRadarItem(selected);
      setNotice(result?.existing ? "This money closeout is already waiting in Command." : "Money decision is ready in Command.");
    } catch (error) {
      setNotice(error?.message || "Could not prepare the money decision. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cvSiteScreen cvMoneyRadar">
      <header className="cvMoneyRadarHero">
        <div><span>Money Radar · {state.source}</span><h2>See what is earned, waiting and at risk</h2><p>Money Radar reads persisted closeouts and real invoice states. It does not estimate relationships from display text.</p></div>
        <button type="button" onClick={() => go?.("command")}>Open money decisions</button>
      </header>
      <div className="cvMoneyRadarMetrics">
        {(state.metrics.length ? state.metrics : emptyMetrics).map((metric) => <article key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small></article>)}
      </div>
      <div className="cvMoneyRadarLayout">
        <section className="cvMoneyRadarList">
          <header><strong>What needs attention</strong><small>{preview ? "Example preview" : "Persisted business records"}</small></header>
          {state.loading ? <Empty title="Loading Money Radar" text="Churvox is joining completed work and money records." /> : state.items.length ? state.items.map((item) => (
            <button key={item.key} type="button" className={selected?.key === item.key ? "active" : ""} onClick={() => setSelectedKey(item.key)}>
              <span>{item.type}</span><strong>{item.title}</strong><em>{formatMoney(item.amount)}</em><small>{item.detail}</small>
            </button>
          )) : <Empty title="Money queue clear" text={state.error || "No completed work, invoice or payment exception currently needs review."} />}
        </section>
        <aside className="cvMoneyRadarDetail">
          {selected ? <>
            <span>{selected.type}</span><h3>{selected.title}</h3><strong>{formatMoney(selected.amount)}</strong><p>{selected.detail}</p>
            <dl><div><dt>Risk</dt><dd>{selected.risk}</dd></div><div><dt>Prepared</dt><dd>{selected.next}</dd></div><div><dt>Owner control</dt><dd>Required</dd></div></dl>
            <div className="cvSafeControls"><div className="cvSafeControlButtons"><button className="primary" type="button" disabled={busy || preview} onClick={prepareSelected}>{busy ? "Preparing…" : selected.next}</button><button type="button" onClick={() => go?.("command")}>Open Command</button></div><small>{preview ? "Preview only." : "Uses the persisted closeout ID. Duplicate drafts are blocked."}</small>{notice ? <div className="cvSafeTrail"><p>{notice}</p></div> : null}</div>
          </> : <Empty title="Nothing selected" text="Select a persisted money item to review its prepared next step." />}
        </aside>
      </div>
      <JobDoneBoard appMode={appMode} go={go} />
    </section>
  );
}

function useCloseouts(appMode) {
  const ownerRoute = isOwnerRoute();
  const preview = appMode !== "owner" && !ownerRoute;
  const [state, setState] = useState(() => preview ? { loading: false, closeouts: previewCloseouts, source: "preview", preview: true } : { loading: true, closeouts: [], source: "loading", preview: false });
  useEffect(() => {
    if (preview) return undefined;
    let active = true;
    fetchJobDoneCloseouts().then((result) => {
      if (active) setState({ loading: false, closeouts: result.closeouts, source: result.source, preview: false, error: "" });
    }).catch((error) => {
      if (active) setState({ loading: false, closeouts: [], source: "error", preview: false, error: error?.message || "Job Done unavailable" });
    });
    return () => { active = false; };
  }, [preview]);
  return state;
}

const emptyMetrics = [
  { label: "Finished, not closed", value: 0, note: "No persisted closeouts waiting" },
  { label: "Invoice actions", value: 0, note: "No invoice actions waiting" },
  { label: "Payment risk", value: 0, note: "No overdue items visible" },
  { label: "Worker cost checks", value: 0, note: "No hours checks waiting" },
];

function closeoutKey(item = {}) { return String(item.id || item.job_id || item.job_title || "closeout"); }
function completedWhen(item = {}) { return String(item.source_snapshot?.completed_at || item.source_snapshot?.scheduled_date || "Completed").slice(0, 22); }
function invoiceReady(item = {}) { return Boolean(item.invoice?.invoice_id) || !["", "missing"].includes(String(item.invoice?.status || "").toLowerCase()); }
function closeoutSummary(item = {}) { return Number(item.risk_count || 0) ? `${item.risk_count} structured check${Number(item.risk_count) === 1 ? "" : "s"}: ${(item.risk_keys || []).join(", ")}` : "Proof, time, money and recurring checks are linked"; }
function formatMoney(value) { const amount = Number(value || 0); return Number.isFinite(amount) && amount ? `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Value needs review"; }
function preparedDirection(item = {}) { if (item.proof?.status === "missing") return "Prepare a proof request and hold invoice approval"; if (item.extras?.status === "review") return "Prepare the invoice draft with extras editable"; if (!invoiceReady(item)) return "Prepare the closeout and one internal invoice draft"; return "Prepare the complete closeout handoff in Command"; }
function checksFor(item = {}) {
  return [
    { label: "Proof", value: item.proof?.status || "check", note: item.proof?.note || "Proof status needs review.", tone: item.proof?.status === "ready" ? "good" : "warn" },
    { label: "Worker time", value: item.worker_time?.hours ? `${item.worker_time.hours} hrs` : item.worker_time?.status || "check", note: item.worker_time?.note || "Worker time needs review.", tone: item.worker_time?.status === "ready" ? "good" : "warn" },
    { label: "Extras", value: item.extras?.amount ? formatMoney(item.extras.amount) : item.extras?.status || "clear", note: item.extras?.note || "Extras need review.", tone: item.extras?.status === "review" ? "warn" : "good" },
    { label: "Invoice", value: item.invoice?.amount ? formatMoney(item.invoice.amount) : item.invoice?.status || "missing", note: item.invoice?.note || "Invoice status needs review.", tone: invoiceReady(item) ? "good" : "neutral" },
    { label: "Next work", value: item.recurring?.next_date || item.recurring?.status || "not applicable", note: item.recurring?.note || "Recurring status needs review.", tone: item.recurring?.status === "review" ? "warn" : "good" },
  ];
}
function Empty({ title, text }) { return <article className="cvJobDoneEmpty"><strong>{title}</strong><p>{text}</p></article>; }
function isOwnerRoute() { return typeof window !== "undefined" && window.location.pathname.includes("dashboard"); }
