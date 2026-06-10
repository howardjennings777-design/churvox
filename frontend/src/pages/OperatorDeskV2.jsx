import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import "../styles/operatorDeskV2.css";

const arr = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.actions) ? v.actions : Array.isArray(v?.logs) ? v.logs : [];
const idOf = (v) => String(v?.id || v?._id || "");
const low = (v) => String(v || "").toLowerCase();
const money = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
const pending = new Set(["", "pending", "ready", "edited", "draft", "watching"]);
const terminal = new Set(["completed", "approved", "dismissed", "rejected"]);
const first = (...values) => values.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
const lineTotal = (items) => arr(items).reduce((sum, item) => sum + Number(item?.amount ?? item?.total ?? item?.price ?? item?.unit_price ?? 0) * Number(item?.qty || item?.quantity || 1), 0);

function toAction(a) {
  const payload = a.payload || a.draft_payload || {};
  const type = a.action_type || a.type || "prepared_action";
  return {
    id: `a-${idOf(a)}`,
    rawId: idOf(a),
    lane: "approve",
    kind: type,
    raw: a,
    payload,
    title: a.title || a.summary || "Prepared admin task",
    label: String(type).replace(/_/g, " "),
    detail: a.recommendation || a.reason || a.owner_facing_explanation || a.summary || "Churvox prepared this for owner approval.",
    status: a.status || "pending",
    risk: a.risk || a.risk_level || "medium",
  };
}

function jobItem(job, lane) {
  return {
    id: `j-${lane}-${idOf(job)}`,
    lane,
    kind: lane === "money" ? "invoice_ready" : lane === "field" ? "field_work" : "job_attention",
    title: job.title || job.job_name || job.client_name || "Job",
    label: lane === "money" ? "ready to invoice" : lane === "field" ? "crew work" : "needs attention",
    detail: lane === "money" ? "Completed work is ready for invoice/admin prep." : lane === "field" ? "Crew work is active or scheduled." : "Churvox can prepare the next admin move.",
    status: job.status || "open",
    worker: job.assigned_worker_name || job.worker_name || "Unassigned",
    client: job.client_name || job.customer_name || "Client",
  };
}

function invoiceItem(inv) {
  return {
    id: `i-${idOf(inv)}`,
    lane: "money",
    kind: "invoice_follow_up",
    title: `${inv.customer_name || inv.client_name || "Client"} · ${money(inv.balance_due || inv.balance || inv.total || inv.amount)}`,
    label: "money desk",
    detail: "Invoice is draft, open, unpaid, or ready for follow-up.",
    status: inv.status || "open",
    client: inv.customer_name || inv.client_name || "Client",
  };
}

function patchFor(item) {
  const p = item?.payload || item?.raw?.payload || item?.raw?.draft_payload || {};
  const type = low(item?.kind || item?.raw?.type || item?.raw?.action_type);
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
    if (subtotal > 0) {
      patch.subtotal = subtotal;
      patch.amount = subtotal;
      patch.total = subtotal;
    }
    patch.gst_rate = Number(first(p.gst_rate, 0.15));
    const description = first(p.description, arr(p.line_items)[0]?.description, item?.title);
    if (description) patch.description = String(description);
    if (p.job_id) patch.job_id = String(p.job_id);
    if (p.client_id) patch.client_id = String(p.client_id);
  }
  if (["invoice_reminder", "quote_follow_up", "quote_followup", "customer_update"].includes(type)) {
    const message = first(p.message, item?.raw?.generated_message, item?.detail);
    if (message) patch.message = String(message);
  }
  return patch;
}

function labelFor(kind = "") {
  const k = low(kind);
  if (k.includes("invoice_reminder")) return "Payment reminders prepared";
  if (k.includes("invoice")) return "Invoice drafts ready";
  if (k.includes("assign")) return "Worker assignments suggested";
  if (k.includes("quote")) return "Quote follow-ups prepared";
  if (k.includes("customer")) return "Customer updates drafted";
  return "Admin work prepared";
}

function groupQueue(items) {
  const groups = new Map();
  for (const item of items) {
    const key = low(item.kind || item.label || item.title || "work").replace(/[^a-z0-9]+/g, "_");
    if (!groups.has(key)) groups.set(key, { key, first: item, count: 0, title: labelFor(item.kind) });
    groups.get(key).count += 1;
  }
  return [...groups.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}

export default function OperatorDeskV2() {
  const { get, post, patch } = useApi();
  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [setup, setSetup] = useState(null);
  const [logs, setLogs] = useState([]);
  const [lane, setLane] = useState("approve");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [handled, setHandled] = useState([]);
  const once = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, s, setRes, logRes, j, i] = await Promise.all([
      get("/ai-operator/actions"),
      get("/ai-operator/command-snapshot"),
      get("/ai-operator/setup-status"),
      get("/ai-operator/audit-log"),
      get("/jobs"),
      get("/invoices"),
    ]);
    if (a.success) setActions(arr(a.actions || a.data || a));
    if (s.success) setSnapshot(s.data || s);
    if (setRes.success) setSetup(setRes.data || setRes);
    if (logRes.success) setLogs(arr(logRes.logs || logRes.data || logRes).slice(0, 8));
    if (j.success) setJobs(arr(j.data || j));
    if (i.success) setInvoices(arr(i.data || i));
    setLoading(false);
  }, [get]);

  const scan = useCallback(async (quiet = false) => {
    setBusy("scan");
    const res = await post("/ai/operator/run-daily-check", {});
    setBusy("");
    if (res.success) {
      if (!quiet) toast.success("Churvox prepared the next admin moves");
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
    const key = "churvox_operator_desk_v2_last_scan";
    const last = Number(localStorage.getItem(key) || 0);
    if (!last || Date.now() - last > 10 * 60 * 1000) {
      localStorage.setItem(key, String(Date.now()));
      scan(true);
    }
  }, [scan]);

  const hidden = useMemo(() => new Set(handled), [handled]);
  const approve = useMemo(() => actions.filter((a) => !hidden.has(idOf(a)) && pending.has(low(a.status))).slice(0, 40).map(toAction), [actions, hidden]);
  const done = useMemo(() => actions.filter((a) => terminal.has(low(a.status))).slice(0, 8), [actions]);
  const fix = useMemo(() => jobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !["completed", "done", "cancelled"].includes(low(j.status))).slice(0, 12).map((j) => jobItem(j, "fix")), [jobs]);
  const field = useMemo(() => jobs.filter((j) => ["assigned", "scheduled", "in_progress", "in progress", "started"].includes(low(j.status))).slice(0, 12).map((j) => jobItem(j, "field")), [jobs]);
  const moneyItems = useMemo(() => {
    const readyJobs = jobs.filter((j) => ["completed", "done", "complete"].includes(low(j.status)) && !(j.invoice_id || j.draft_invoice_id || j.invoiced)).slice(0, 8).map((j) => jobItem(j, "money"));
    const openInvoices = invoices.filter((i) => ["draft", "sent", "open", "overdue", "unpaid", "pending", ""].includes(low(i.status))).slice(0, 8).map(invoiceItem);
    return [...readyJobs, ...openInvoices];
  }, [jobs, invoices]);

  const lanes = { approve, fix, field, money: moneyItems, done: done.map(toAction) };
  const visible = lanes[lane] || [];
  const visibleCards = useMemo(() => {
    const seen = new Set();
    return visible.filter((item) => {
      const key = `${item.kind || ""}|${item.title || ""}|${item.detail || ""}`.toLowerCase().replace(/\s+/g, " ").slice(0, 180);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 12);
  }, [visible]);
  const current = selected && selected.lane === lane ? selected : visibleCards[0];
  const grouped = useMemo(() => groupQueue(approve), [approve]);
  const urgent = snapshot?.urgent || {};

  const markDone = (ids) => setHandled((prev) => Array.from(new Set([...prev, ...arr(ids).map(String).filter(Boolean)])));

  const preflight = async (item) => {
    const payload = patchFor(item);
    if (!item?.rawId || !Object.keys(payload).length) return true;
    const res = await patch(`/ai-operator/actions/${item.rawId}`, payload);
    if (!res.success) toast.error(res.error || "Churvox could not prepare final payload");
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
      toast.success("Approved. Churvox completed the admin move.");
      markDone([item.rawId]);
      setActions((prev) => prev.filter((a) => idOf(a) !== item.rawId));
      setSelected(null);
      await load();
    } else toast.error(res.error || "Churvox could not complete that action");
  };

  const rejectOne = async (item) => {
    if (!item?.rawId) return;
    setBusy(item.rawId);
    const res = await post(`/ai-operator/actions/${item.rawId}/reject`, {});
    setBusy("");
    if (res.success) {
      toast.success("Skipped. Churvox removed it from the approval desk.");
      markDone([item.rawId]);
      setActions((prev) => prev.filter((a) => idOf(a) !== item.rawId));
      setSelected(null);
      await load();
    } else toast.error(res.error || "Could not reject action");
  };

  const approveVisible = async () => {
    const items = approve.filter((a) => a.rawId).slice(0, 12);
    if (!items.length) return toast.message("No approval slips waiting");
    setBusy("bulk");
    for (const item of items) await preflight(item);
    const res = await post("/ai-operator/actions/bulk-approve", { action_ids: items.map((a) => a.rawId) });
    setBusy("");
    if (res.success) {
      markDone(items.map((a) => a.rawId));
      setActions((prev) => prev.filter((a) => !items.some((item) => item.rawId === idOf(a))));
      toast.success(`Approved ${res.succeeded || items.length} prepared moves`);
      setSelected(null);
      await load();
    } else toast.error(res.error || "Bulk approve failed");
  };

  const laneRows = [["approve", "Approvals", approve.length], ["fix", "Needs attention", fix.length], ["field", "Crew", field.length], ["money", "Money", moneyItems.length], ["done", "Done", done.length]];

  return (
    <main className="opdesk" data-version="CHURVOX_OPERATOR_DESK_V2_20260524">
      <section className="opdesk-brief">
        <div><p className="opdesk-eyebrow">Operator Desk</p><h1>Churvox has prepared today’s admin.</h1><p>{snapshot?.next_best_move || "Review the work slips, approve what is ready, and let Churvox handle the admin behind the scenes."}</p></div>
        <div className="opdesk-actions"><button onClick={() => scan(false)} disabled={busy === "scan"}>{busy === "scan" ? "Scanning…" : "Run AI scan"}</button><button className="secondary" onClick={approveVisible} disabled={!approve.length || busy === "bulk"}>Approve visible ({approve.length})</button><Link to="/invoices">Open money desk</Link></div>
      </section>
      <section className="opdesk-metrics"><div><span>Waiting approval</span><strong>{approve.length}</strong></div><div><span>Jobs needing attention</span><strong>{urgent.unassigned_jobs ?? fix.length}</strong></div><div><span>Ready to invoice</span><strong>{urgent.completed_no_invoice ?? moneyItems.length}</strong></div><div><span>Open cashflow</span><strong>{money(urgent.open_invoices_total || 0)}</strong></div></section>
      <section className="opdesk-grid">
        
        <article className="opdesk-card opdesk-slip">{loading ? <p>Loading Operator Desk…</p> : current ? <><p className="opdesk-kicker">Work slip · {current.label}</p><h2>{current.title}</h2><p>{current.detail}</p><div className="opdesk-slip-meta"><div><span>Risk</span><strong>{current.risk || "normal"}</strong></div><div><span>Status</span><strong>{current.status || "ready"}</strong></div><div><span>Prepared detail</span><strong>{current.payload?.description || current.payload?.message || current.payload?.job_id || current.client || "ready"}</strong></div></div>{current.rawId ? <div className="opdesk-slip-actions"><button onClick={() => approveOne(current)} disabled={busy === current.rawId}>{busy === current.rawId ? "Completing…" : "Approve & run"}</button><button className="secondary" onClick={() => rejectOne(current)} disabled={busy === current.rawId}>Skip</button></div> : <div className="opdesk-slip-actions"><button onClick={() => scan(false)}>Prepare this</button></div>}</> : <><p className="opdesk-kicker">All clear</p><h2>No work slips waiting here.</h2><p>Run an AI scan or open another lane to review prepared admin.</p></>}</article>
        
      </section>
      <section className="opdesk-card opdesk-queue"><div className="opdesk-section-head"><div><p className="opdesk-kicker">Grouped queue</p><h3>Prepared work, grouped like a real front desk.</h3></div><span>{approve.length} waiting</span></div>{grouped.length ? <div className="opdesk-groups">{grouped.map((group) => <button key={group.key} onClick={() => { setLane("approve"); setSelected(group.first); }}><span>{group.count}</span><strong>{group.title}</strong><small>{group.first.detail}</small></button>)}</div> : <p>No grouped approval work waiting.</p>}</section>
      <section className="opdesk-history"><div className="opdesk-card"><p className="opdesk-kicker">Recently completed</p>{done.length ? done.map((a) => <div className="opdesk-log" key={idOf(a)}><strong>{a.title || a.type || "AI action"}</strong><span>{a.status}</span></div>) : <p>Nothing completed yet.</p>}</div><div className="opdesk-card"><p className="opdesk-kicker">Operator history</p>{logs.length ? logs.map((l) => <div className="opdesk-log" key={idOf(l)}><strong>{l.message || l.event_type || "AI log"}</strong><span>{l.event_type || "log"}</span></div>) : <p>No operator history yet.</p>}</div></section>
    </main>
  );
}
