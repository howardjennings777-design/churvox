import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";

const asArray = (v) =>
  Array.isArray(v) ? v :
  Array.isArray(v?.data) ? v.data :
  Array.isArray(v?.items) ? v.items :
  Array.isArray(v?.actions) ? v.actions :
  Array.isArray(v?.logs) ? v.logs : [];

const idOf = (x) => String(x?.id || x?._id || "");
const money = (n) => `$${Number(n || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
const lower = (v) => String(v || "").toLowerCase();
const pendingStatuses = new Set(["pending", "ready", "edited", "draft", "watching", ""]);

function actionMove(a) {
  const id = idOf(a);
  const type = a.action_type || a.type || "prepared_action";
  const risk = a.risk || a.risk_level || "medium";
  const payload = a.payload || a.draft_payload || {};
  const related = a.related_type || a.related_entity_type || "business";
  const result = a.result || {};
  return {
    id: `a-${id}`,
    rawId: id,
    raw: a,
    lane: "approve",
    label: "AI ready",
    type,
    risk,
    status: a.status || "pending",
    title: a.title || a.summary || "Prepared owner action",
    detail: a.recommendation || a.reason || a.owner_facing_explanation || a.summary || "Churvox prepared this admin move for owner review.",
    cta: "Approve and run",
    facts: [
      ["Type", type.replace(/_/g, " ")],
      ["Risk", risk],
      ["Source", related.replace(/_/g, " ")],
      ["Status", a.status || "pending"],
    ],
    payload,
    result,
  };
}

function jobMove(j, lane) {
  const title = j.title || j.job_name || j.client_name || "Job";
  const client = j.client_name || j.customer_name || "Client";
  const worker = j.assigned_worker_name || j.worker_name || "Unassigned";
  return {
    id: `j-${lane}-${idOf(j)}`,
    lane,
    label: lane === "fix" ? "Needs fixing" : lane === "money" ? "Money move" : "Field move",
    title,
    detail:
      lane === "fix"
        ? "This work needs a worker or missing details. Run AI and it will prepare the assignment action."
        : lane === "money"
        ? "Completed work is ready for AI invoice/admin preparation."
        : "This job is active or scheduled in the field.",
    cta: lane === "fix" || lane === "money" ? "Run AI prep" : "Open",
    facts: [
      ["Client", client],
      ["Worker", worker],
      ["Status", j.status || "Open"],
    ],
  };
}

function invoiceMove(i) {
  const customer = i.customer_name || i.client_name || "Client";
  const total = i.balance_due || i.balance || i.total || i.amount || 0;
  return {
    id: `i-${idOf(i)}`,
    lane: "money",
    label: "Money desk",
    title: `${customer} · ${money(total)}`,
    detail: "This invoice needs review, payment follow-up, or cashflow attention. AI can prepare the follow-up for approval.",
    cta: "Prepare follow-up",
    facts: [
      ["Customer", customer],
      ["Amount", money(total)],
      ["Status", i.status || "Open"],
    ],
  };
}

function WorkhorseDashboard() {
  const { get, post } = useApi();
  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [setup, setSetup] = useState(null);
  const [logs, setLogs] = useState([]);
  const [lane, setLane] = useState("approve");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [actingId, setActingId] = useState("");
  const autoScanRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, snap, setupRes, audit, j, i] = await Promise.all([
      get("/ai-operator/actions"),
      get("/ai-operator/command-snapshot"),
      get("/ai-operator/setup-status"),
      get("/ai-operator/audit-log"),
      get("/jobs"),
      get("/invoices"),
    ]);
    if (a.success) setActions(asArray(a.actions || a.data || a));
    if (snap.success) setSnapshot(snap.data || snap);
    if (setupRes.success) setSetup(setupRes.data || setupRes);
    if (audit.success) setLogs(asArray(audit.logs || audit.data || audit).slice(0, 8));
    if (j.success) setJobs(asArray(j.data || j));
    if (i.success) setInvoices(asArray(i.data || i));
    setLoading(false);
  }, [get]);

  const runScan = useCallback(async (quiet = false) => {
    setScanning(true);
    const res = await post("/ai/operator/run-daily-check", {});
    setScanning(false);
    if (res.success) {
      if (!quiet) toast.success("AI Operator scanned the business and prepared actions");
      await load();
      return true;
    }
    if (!quiet) toast.error(res.error || "AI scan failed");
    return false;
  }, [load, post]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (autoScanRef.current) return;
    autoScanRef.current = true;
    const key = "churvox_ai_operator_last_auto_scan";
    const last = Number(localStorage.getItem(key) || 0);
    const tenMinutes = 10 * 60 * 1000;
    if (!last || Date.now() - last > tenMinutes) {
      localStorage.setItem(key, String(Date.now()));
      runScan(true);
    }
  }, [runScan]);

  const approve = useMemo(
    () => actions.filter((a) => pendingStatuses.has(lower(a.status))).slice(0, 30).map(actionMove),
    [actions]
  );

  const completedActions = useMemo(
    () => actions.filter((a) => ["completed", "approved", "dismissed", "rejected"].includes(lower(a.status))).slice(0, 8),
    [actions]
  );

  const fix = useMemo(
    () => jobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !["completed", "done", "cancelled"].includes(lower(j.status))).slice(0, 12).map((j) => jobMove(j, "fix")),
    [jobs]
  );

  const field = useMemo(
    () => jobs.filter((j) => ["assigned", "scheduled", "in_progress", "in progress", "started"].includes(lower(j.status))).slice(0, 12).map((j) => jobMove(j, "field")),
    [jobs]
  );

  const moneyLane = useMemo(() => {
    const readyJobs = jobs.filter((j) => ["completed", "done", "complete"].includes(lower(j.status)) && !(j.invoice_id || j.draft_invoice_id || j.invoiced)).slice(0, 8).map((j) => jobMove(j, "money"));
    const openInvoices = invoices.filter((i) => ["draft", "sent", "open", "overdue", "unpaid", "pending", ""].includes(lower(i.status))).slice(0, 8).map(invoiceMove);
    return [...readyJobs, ...openInvoices];
  }, [jobs, invoices]);

  const lanes = { approve, fix, field, money: moneyLane };
  const visible = lanes[lane] || [];
  const current = selected && selected.lane === lane ? selected : visible[0];
  const total = approve.length + fix.length + field.length + moneyLane.length;
  const urgent = snapshot?.urgent || {};
  const approvals = snapshot?.approvals || {};

  const approveAction = async (item) => {
    if (!item?.rawId) return;
    setActingId(item.rawId);
    const res = await post(`/ai-operator/actions/${item.rawId}/approve`, {});
    setActingId("");
    if (res.success) {
      toast.success("AI completed the approved action");
      setSelected(null);
      await load();
    } else {
      toast.error(res.error || "AI could not complete that action");
    }
  };

  const rejectAction = async (item) => {
    if (!item?.rawId) return;
    setActingId(item.rawId);
    const res = await post(`/ai-operator/actions/${item.rawId}/reject`, {});
    setActingId("");
    if (res.success) {
      toast.success("AI action rejected");
      setSelected(null);
      await load();
    } else {
      toast.error(res.error || "Could not reject action");
    }
  };

  const approveVisible = async () => {
    const ids = approve.map((a) => a.rawId).filter(Boolean).slice(0, 12);
    if (!ids.length) return toast.message("No AI actions waiting");
    setActingId("bulk");
    const res = await post("/ai-operator/actions/bulk-approve", { action_ids: ids });
    setActingId("");
    if (res.success) {
      toast.success(`AI processed ${res.succeeded || ids.length} approved actions`);
      setSelected(null);
      await load();
    } else {
      toast.error(res.error || "Bulk approve failed");
    }
  };

  return (
    <main className="wh-shell wh-ai-operator">
      <section className="px-hero wh-ai-hero">
        <p className="px-hero__eyebrow">AI Operator is running</p>
        <h1 className="px-hero__title">Churvox scans the business, prepares the admin, then waits for owner approval.</h1>
        <p className="px-hero__sub">
          {snapshot?.next_best_move || "AI is watching jobs, invoices, quotes, workers and setup. Approve a prepared action and Churvox executes the safe backend step."}
        </p>
        <div className="px-hero__actions">
          <button className="px-btn px-btn--primary" onClick={() => runScan(false)} disabled={scanning}>
            {scanning ? "AI scanning…" : "Run AI now"}
          </button>
          <button className="px-btn" onClick={approveVisible} disabled={!approve.length || actingId === "bulk"}>
            {actingId === "bulk" ? "AI processing…" : `Approve visible (${approve.length})`}
          </button>
          <Link className="px-btn" to="/invoices">Money desk</Link>
        </div>
      </section>

      <section className="wh-ai-strip">
        <div className="wh-ai-meter">
          <span>Waiting approval</span><strong>{approve.length || approvals.total_pending || 0}</strong>
        </div>
        <div className="wh-ai-meter">
          <span>Unassigned jobs</span><strong>{urgent.unassigned_jobs ?? fix.length}</strong>
        </div>
        <div className="wh-ai-meter">
          <span>Ready to invoice</span><strong>{urgent.completed_no_invoice ?? moneyLane.length}</strong>
        </div>
        <div className="wh-ai-meter">
          <span>Open cashflow</span><strong>{money(urgent.open_invoices_total || 0)}</strong>
        </div>
      </section>

      <section className="wh-board">
        <aside className="px-card">
          <div className="px-card__body">
            <p className="wh-kicker">AI operating lanes</p>
            <div className="wh-zone-stack">
              {[
                ["approve", "Ready to approve", approve.length],
                ["fix", "Needs fixing", fix.length],
                ["field", "Field & crew", field.length],
                ["money", "Money desk", moneyLane.length],
              ].map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  className={`wh-zone ${lane === key ? "is-active" : ""}`}
                  onClick={() => { setLane(key); setSelected(null); }}
                >
                  <span>{label}</span>
                  <strong>{count}</strong>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <article className="px-card wh-ai-slip">
          <div className="px-card__body">
            {loading ? (
              <p className="px-hero__sub">AI Operator is loading the command desk…</p>
            ) : current ? (
              <>
                <p className="wh-kicker">{current.label}</p>
                <h2 className="wh-slip-title">{current.title}</h2>
                <p className="px-hero__sub">{current.detail}</p>
                <div className="wh-facts">
                  {current.facts.map(([a, b]) => (
                    <div className="wh-fact" key={a}><span>{a}</span><strong>{b}</strong></div>
                  ))}
                </div>
                {current.payload && Object.keys(current.payload).length ? (
                  <pre className="wh-ai-payload">{JSON.stringify(current.payload, null, 2)}</pre>
                ) : null}
                {current.rawId ? (
                  <div className="wh-ai-actions">
                    <button className="px-btn px-btn--primary" disabled={actingId === current.rawId} onClick={() => approveAction(current)}>
                      {actingId === current.rawId ? "AI running…" : "Approve and let AI do it"}
                    </button>
                    <button className="px-btn" disabled={actingId === current.rawId} onClick={() => rejectAction(current)}>Reject</button>
                  </div>
                ) : (
                  <div className="wh-ai-actions"><button className="px-btn px-btn--primary" onClick={() => runScan(false)}>Ask AI to prepare this</button></div>
                )}
              </>
            ) : (
              <>
                <p className="wh-kicker">AI clear</p>
                <h2 className="wh-slip-title">No prepared moves in this lane.</h2>
                <p className="px-hero__sub">Run AI now to scan for new work across jobs, clients, quotes, invoices and crew.</p>
              </>
            )}
          </div>
        </article>

        <aside className="px-card">
          <div className="px-card__body">
            <p className="wh-kicker">Operator safety</p>
            <div className="px-stat">
              <span className="px-stat__label">Prepared work</span>
              <strong className="px-stat__value">{total}</strong>
              <span className="px-stat__delta">AI prepares. Owner approves. Backend executes safe approved actions.</span>
            </div>
            <div className="wh-ai-safe">
              <span>Email/SMS: approval first</span>
              <span>Payroll/pricing: locked</span>
              <span>MYOB/payment: no auto-sync without approval</span>
              <span>AI setup: {setup?.ai?.ready ? "ready" : "fallback/check env"}</span>
            </div>
          </div>
        </aside>
      </section>

      <section className="px-card" style={{ marginTop: 14 }}>
        <div className="px-card__body">
          <p className="wh-kicker">AI prepared queue</p>
          <div className="wh-queue">
            {visible.length ? visible.map((item) => (
              <button key={item.id} type="button" className={`wh-task ${current?.id === item.id ? "is-active" : ""}`} onClick={() => setSelected(item)}>
                <span className="wh-pill">{item.cta}</span>
                <h3>{item.title}</h3>
                <p className="px-row__sub">{item.detail}</p>
              </button>
            )) : <p className="px-hero__sub">No work waiting here.</p>}
          </div>
        </div>
      </section>

      <section className="wh-ai-bottom-grid">
        <article className="px-card"><div className="px-card__body"><p className="wh-kicker">Recently completed by AI</p>{completedActions.length ? completedActions.map((a) => <div key={idOf(a)} className="wh-ai-log"><strong>{a.title || a.type || "AI action"}</strong><span>{a.status}</span></div>) : <p className="px-row__sub">Nothing completed yet.</p>}</div></article>
        <article className="px-card"><div className="px-card__body"><p className="wh-kicker">Audit trail</p>{logs.length ? logs.map((l) => <div key={idOf(l)} className="wh-ai-log"><strong>{l.message || l.event_type || "AI log"}</strong><span>{l.event_type || "log"}</span></div>) : <p className="px-row__sub">No audit logs yet.</p>}</div></article>
      </section>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <WorkhorseDashboard />
    </SmartHubErrorBoundary>
  );
}
