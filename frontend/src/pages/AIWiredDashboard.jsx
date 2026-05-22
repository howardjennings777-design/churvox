import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const arr = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.actions) ? v.actions : Array.isArray(v?.logs) ? v.logs : [];
const idOf = (v) => String(v?.id || v?._id || "");
const low = (v) => String(v || "").toLowerCase();
const nzMoney = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
const first = (...values) => values.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
const lineTotal = (items) => arr(items).reduce((sum, item) => sum + Number(item?.amount ?? item?.total ?? item?.price ?? item?.unit_price ?? 0) * Number(item?.qty || item?.quantity || 1), 0);
const pending = new Set(["", "pending", "ready", "edited", "draft", "watching"]);

function makeAction(a) {
  const payload = a.payload || a.draft_payload || {};
  const type = a.action_type || a.type || "prepared_action";
  return {
    id: `a-${idOf(a)}`,
    rawId: idOf(a),
    raw: a,
    lane: "approve",
    label: "AI prepared",
    title: a.title || a.summary || "Prepared business action",
    detail: a.recommendation || a.reason || a.owner_facing_explanation || a.summary || "Ready for owner approval.",
    type,
    status: a.status || "pending",
    risk: a.risk || a.risk_level || "medium",
    payload,
    facts: [
      ["Action", String(type).replace(/_/g, " ")],
      ["Risk", a.risk || a.risk_level || "medium"],
      ["Status", a.status || "pending"],
    ],
  };
}

function makeJob(j, lane) {
  return {
    id: `j-${lane}-${idOf(j)}`,
    lane,
    title: j.title || j.job_name || j.client_name || "Job",
    label: lane === "money" ? "Ready for money desk" : lane === "field" ? "Field work" : "Needs AI prep",
    detail: lane === "money" ? "Completed work can be turned into draft invoice/admin follow-up." : lane === "field" ? "Active or scheduled field work." : "Unassigned or incomplete work can be prepared by AI.",
    facts: [["Client", j.client_name || j.customer_name || "Client"], ["Worker", j.assigned_worker_name || j.worker_name || "Unassigned"], ["Status", j.status || "Open"]],
  };
}

function makeInvoice(i) {
  return {
    id: `i-${idOf(i)}`,
    lane: "money",
    title: `${i.customer_name || i.client_name || "Client"} · ${nzMoney(i.balance_due || i.balance || i.total || i.amount)}`,
    label: "Money desk",
    detail: "Invoice is open, overdue or waiting for follow-up.",
    facts: [["Customer", i.customer_name || i.client_name || "Client"], ["Amount", nzMoney(i.balance_due || i.balance || i.total || i.amount)], ["Status", i.status || "Open"]],
  };
}

function patchFor(item) {
  const p = item?.payload || item?.raw?.payload || item?.raw?.draft_payload || {};
  const type = low(item?.type || item?.raw?.type || item?.raw?.action_type);
  const patch = {};
  if (type === "assign_worker") {
    const workerId = first(p.worker_id, p.recommended_worker_id, p.assigned_worker_id, p.suggested_worker_id, item?.raw?.worker_id);
    if (workerId) {
      patch.worker_id = String(workerId);
      patch.recommended_worker_id = String(workerId);
    }
  }
  if (["create_invoice_draft", "invoice_draft"].includes(type)) {
    const subtotal = Number(first(p.subtotal, p.amount, p.total, lineTotal(p.line_items)) || 0);
    if (subtotal > 0) patch.subtotal = subtotal;
    patch.gst_rate = Number(first(p.gst_rate, 0.1));
    const description = first(p.description, arr(p.line_items)[0]?.description, item?.title);
    if (description) patch.description = String(description);
  }
  if (["invoice_reminder", "quote_follow_up", "quote_followup", "customer_update"].includes(type)) {
    const message = first(p.message, item?.raw?.generated_message, item?.detail);
    if (message) patch.message = String(message);
  }
  return patch;
}

export default function AIWiredDashboard() {
  const { get, post, patch } = useApi();
  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [setup, setSetup] = useState(null);
  const [logs, setLogs] = useState([]);
  const [lane, setLane] = useState("approve");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [handledActionIds, setHandledActionIds] = useState([]);
  const once = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, s, setupRes, audit, j, i] = await Promise.all([
      get("/ai-operator/actions"),
      get("/ai-operator/command-snapshot"),
      get("/ai-operator/setup-status"),
      get("/ai-operator/audit-log"),
      get("/jobs"),
      get("/invoices"),
    ]);
    if (a.success) setActions(arr(a.actions || a.data || a));
    if (s.success) setSnapshot(s.data || s);
    if (setupRes.success) setSetup(setupRes.data || setupRes);
    if (audit.success) setLogs(arr(audit.logs || audit.data || audit).slice(0, 8));
    if (j.success) setJobs(arr(j.data || j));
    if (i.success) setInvoices(arr(i.data || i));
    setLoading(false);
  }, [get]);

  const scan = useCallback(async (quiet = false) => {
    setBusy("scan");
    const res = await post("/ai/operator/run-daily-check", {});
    setBusy("");
    if (res.success) {
      if (!quiet) toast.success("AI Operator prepared new actions");
      await load();
      return true;
    }
    if (!quiet) toast.error(res.error || "AI scan failed");
    return false;
  }, [load, post]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const key = "churvox_ai_operator_last_auto_scan";
    const last = Number(localStorage.getItem(key) || 0);
    if (!last || Date.now() - last > 10 * 60 * 1000) {
      localStorage.setItem(key, String(Date.now()));
      scan(true);
    }
  }, [scan]);

  const hiddenActionIds = useMemo(() => new Set(handledActionIds), [handledActionIds]);

  const markHandled = useCallback((ids) => {
    const clean = arr(ids).map(String).filter(Boolean);
    if (!clean.length) return;
    setHandledActionIds((prev) => Array.from(new Set([...prev, ...clean])));
  }, []);

  const refreshAfterAction = useCallback(async () => {
    // CHURVOX_LAUNCH_OPERATOR_LANES_REALTIME_FIX
    await load();
  }, [load]);

  const approve = useMemo(() => actions.filter((a) => !hiddenActionIds.has(idOf(a)) && pending.has(low(a.status))).slice(0, 30).map(makeAction), [actions, hiddenActionIds]);
  const done = useMemo(() => actions.filter((a) => ["completed", "approved", "dismissed", "rejected"].includes(low(a.status))).slice(0, 8), [actions]);
  const fix = useMemo(() => jobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !["completed", "done", "cancelled"].includes(low(j.status))).slice(0, 12).map((j) => makeJob(j, "fix")), [jobs]);
  const field = useMemo(() => jobs.filter((j) => ["assigned", "scheduled", "in_progress", "in progress", "started"].includes(low(j.status))).slice(0, 12).map((j) => makeJob(j, "field")), [jobs]);
  const money = useMemo(() => {
    const ready = jobs.filter((j) => ["completed", "done", "complete"].includes(low(j.status)) && !(j.invoice_id || j.draft_invoice_id || j.invoiced)).slice(0, 8).map((j) => makeJob(j, "money"));
    const open = invoices.filter((i) => ["draft", "sent", "open", "overdue", "unpaid", "pending", ""].includes(low(i.status))).slice(0, 8).map(makeInvoice);
    return [...ready, ...open];
  }, [jobs, invoices]);

  const lanes = { approve, fix, field, money };
  const visible = lanes[lane] || [];
  const current = selected && selected.lane === lane ? selected : visible[0];
  const urgent = snapshot?.urgent || {};
  const approvals = snapshot?.approvals || {};

  const preflight = async (item) => {
    const payload = patchFor(item);
    if (!item?.rawId || !Object.keys(payload).length) return true;
    const res = await patch(`/ai-operator/actions/${item.rawId}`, payload);
    if (!res.success) toast.error(res.error || "AI could not prepare final payload");
    return !!res.success;
  };

  const approveOne = async (item) => {
    if (!item?.rawId) return;
    setBusy(item.rawId);
    const ok = await preflight(item);
    if (!ok) { setBusy(""); return; }
    const res = await post(`/ai-operator/actions/${item.rawId}/approve`, {});
    setBusy("");
    if (res.success) {
      toast.success(`AI completed: ${String(res.result?.action || "approved action").replace(/_/g, " ")}`);
      markHandled([item.rawId]);
      setActions((prev) => prev.filter((a) => idOf(a) !== item.rawId));
      setSelected(null);
      await refreshAfterAction();
    } else toast.error(res.error || "AI could not complete that action");
  };

  const rejectOne = async (item) => {
    if (!item?.rawId) return;
    setBusy(item.rawId);
    const res = await post(`/ai-operator/actions/${item.rawId}/reject`, {});
    setBusy("");
    if (res.success) {
      toast.success("AI action rejected");
      markHandled([item.rawId]);
      setActions((prev) => prev.filter((a) => idOf(a) !== item.rawId));
      setSelected(null);
      await refreshAfterAction();
    }
    else toast.error(res.error || "Could not reject action");
  };

  const approveVisible = async () => {
    const items = approve.filter((a) => a.rawId).slice(0, 12);
    if (!items.length) return toast.message("No AI actions waiting");
    setBusy("bulk");
    for (const item of items) await preflight(item);
    const res = await post("/ai-operator/actions/bulk-approve", { action_ids: items.map((a) => a.rawId) });
    setBusy("");
    if (res.success) {
      const approvedIds = items.map((a) => a.rawId);
      const approvedSet = new Set(approvedIds);
      markHandled(approvedIds);
      setActions((prev) => prev.filter((a) => !approvedSet.has(idOf(a))));
      toast.success(`AI processed ${res.succeeded || items.length} approved actions`);
      setSelected(null);
      await refreshAfterAction();
    }
    else toast.error(res.error || "Bulk approve failed");
  };

  return (
    <main className="wh-shell wh-ai-operator">
      <section className="px-hero wh-ai-hero">
        <p className="px-hero__eyebrow">AI Operator is running</p>
        <h1 className="px-hero__title">Churvox prepares the admin. You approve the move.</h1>
        <p className="px-hero__sub">{snapshot?.next_best_move || "AI scans jobs, invoices, quotes, workers and setup. Approved actions run through safe backend endpoints."}</p>
        <div className="px-hero__actions">
          <button className="px-btn px-btn--primary" onClick={() => scan(false)} disabled={busy === "scan"}>{busy === "scan" ? "AI scanning…" : "Run AI now"}</button>
          <button className="px-btn" onClick={approveVisible} disabled={!approve.length || busy === "bulk"}>{busy === "bulk" ? "AI processing…" : `Approve visible (${approve.length})`}</button>
          <Link className="px-btn" to="/invoices">Money desk</Link>
        </div>
      </section>

      <section className="wh-ai-strip">
        <div className="wh-ai-meter"><span>Waiting approval</span><strong>{approve.length || approvals.total_pending || 0}</strong></div>
        <div className="wh-ai-meter"><span>Unassigned jobs</span><strong>{urgent.unassigned_jobs ?? fix.length}</strong></div>
        <div className="wh-ai-meter"><span>Ready to invoice</span><strong>{urgent.completed_no_invoice ?? money.length}</strong></div>
        <div className="wh-ai-meter"><span>Open cashflow</span><strong>{nzMoney(urgent.open_invoices_total || 0)}</strong></div>
      </section>

      <section className="wh-board">
        <aside className="px-card"><div className="px-card__body"><p className="wh-kicker">AI operating lanes</p><div className="wh-zone-stack">{[["approve", "Ready to approve", approve.length], ["fix", "Needs fixing", fix.length], ["field", "Field & crew", field.length], ["money", "Money desk", money.length]].map(([key, label, count]) => <button key={key} type="button" className={`wh-zone ${lane === key ? "is-active" : ""}`} onClick={() => { setLane(key); setSelected(null); }}><span>{label}</span><strong>{count}</strong></button>)}</div></div></aside>

        <article className="px-card wh-ai-slip"><div className="px-card__body">{loading ? <p className="px-hero__sub">AI Operator is loading…</p> : current ? <><p className="wh-kicker">{current.label}</p><h2 className="wh-slip-title">{current.title}</h2><p className="px-hero__sub">{current.detail}</p><div className="wh-facts">{current.facts.map(([a, b]) => <div className="wh-fact" key={a}><span>{a}</span><strong>{b}</strong></div>)}</div>{current.payload && Object.keys(current.payload).length ? <pre className="wh-ai-payload">{JSON.stringify(current.payload, null, 2)}</pre> : null}{current.rawId ? <div className="wh-ai-actions"><button className="px-btn px-btn--primary" disabled={busy === current.rawId} onClick={() => approveOne(current)}>{busy === current.rawId ? "AI running…" : "Approve action"}</button><button className="px-btn" disabled={busy === current.rawId} onClick={() => rejectOne(current)}>Reject</button></div> : <div className="wh-ai-actions"><button className="px-btn px-btn--primary" onClick={() => scan(false)}>Prepare action</button></div>}</> : <><p className="wh-kicker">AI clear</p><h2 className="wh-slip-title">No prepared moves in this lane.</h2><p className="px-hero__sub">Run AI now to scan for new work.</p></>}</div></article>

        <aside className="px-card"><div className="px-card__body"><p className="wh-kicker">Operator safety</p><div className="px-stat"><span className="px-stat__label">Prepared work</span><strong className="px-stat__value">{approve.length + fix.length + field.length + money.length}</strong><span className="px-stat__delta">Approval-first. High-risk work stays draft-only.</span></div><div className="wh-ai-safe"><span>Email/SMS: approval first</span><span>Payroll/pricing: locked</span><span>MYOB/payment: approval first</span><span>AI setup: {setup?.ai?.ready ? "ready" : "check env"}</span></div></div></aside>
      </section>

      <section className="px-card" style={{ marginTop: 14 }}><div className="px-card__body"><p className="wh-kicker">AI prepared queue</p><div className="wh-queue">{visible.length ? visible.map((item) => <button key={item.id} type="button" className={`wh-task ${current?.id === item.id ? "is-active" : ""}`} onClick={() => setSelected(item)}><span className="wh-pill">{item.rawId ? "Action" : "Prep"}</span><h3>{item.title}</h3><p className="px-row__sub">{item.detail}</p></button>) : <p className="px-hero__sub">No work waiting here.</p>}</div></div></section>

      <section className="wh-ai-bottom-grid">
        <article className="px-card"><div className="px-card__body"><p className="wh-kicker">Recently completed by AI</p>{done.length ? done.map((a) => <div key={idOf(a)} className="wh-ai-log"><strong>{a.title || a.type || "AI action"}</strong><span>{a.status}</span></div>) : <p className="px-row__sub">Nothing completed yet.</p>}</div></article>
        <article className="px-card"><div className="px-card__body"><p className="wh-kicker">Audit trail</p>{logs.length ? logs.map((l) => <div key={idOf(l)} className="wh-ai-log"><strong>{l.message || l.event_type || "AI log"}</strong><span>{l.event_type || "log"}</span></div>) : <p className="px-row__sub">No audit logs yet.</p>}</div></article>
      </section>
    </main>
  );
}
