import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import "../styles/operatorFloorDashboard.css";

const arr = (v) =>
  Array.isArray(v) ? v :
  Array.isArray(v?.data) ? v.data :
  Array.isArray(v?.items) ? v.items :
  Array.isArray(v?.actions) ? v.actions :
  Array.isArray(v?.logs) ? v.logs : [];

const idOf = (v) => String(v?.id || v?._id || "");
const low = (v) => String(v || "").toLowerCase();
const money = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
const pending = new Set(["", "pending", "ready", "edited", "draft", "watching"]);
const doneStatuses = new Set(["completed", "approved", "dismissed", "rejected"]);

const first = (...values) => values.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
const lineTotal = (items) => arr(items).reduce((sum, item) => {
  const qty = Number(item?.qty || item?.quantity || 1);
  const unit = Number(item?.amount ?? item?.total ?? item?.price ?? item?.unit_price ?? 0);
  return sum + qty * unit;
}, 0);

function actionLabel(type = "") {
  const t = low(type);
  if (t.includes("invoice_reminder")) return "Payment reminder";
  if (t.includes("invoice")) return "Invoice draft";
  if (t.includes("assign")) return "Crew assignment";
  if (t.includes("quote")) return "Quote follow-up";
  if (t.includes("customer")) return "Customer update";
  return "Admin move";
}

function trayLabel(type = "") {
  const t = low(type);
  if (t.includes("invoice_reminder")) return "Payment reminders prepared";
  if (t.includes("invoice")) return "Invoice drafts ready";
  if (t.includes("assign")) return "Crew assignments suggested";
  if (t.includes("quote")) return "Quote follow-ups ready";
  if (t.includes("customer")) return "Customer updates drafted";
  return "Admin work prepared";
}

function toAction(a) {
  const payload = a.payload || a.draft_payload || {};
  const type = a.action_type || a.type || "prepared_action";
  return {
    id: `a-${idOf(a)}`,
    rawId: idOf(a),
    raw: a,
    lane: "approvals",
    type,
    label: actionLabel(type),
    title: a.title || a.summary || "Prepared admin move",
    detail: a.recommendation || a.reason || a.owner_facing_explanation || a.summary || "Churvox prepared this for owner approval.",
    status: a.status || "pending",
    risk: a.risk || a.risk_level || "normal",
    payload,
  };
}

function toJob(job, lane) {
  const isMoney = lane === "money";
  return {
    id: `job-${lane}-${idOf(job)}`,
    lane,
    type: isMoney ? "invoice_ready" : "job_attention",
    label: isMoney ? "Ready to invoice" : "Job attention",
    title: job.title || job.job_name || job.client_name || "Job",
    detail: isMoney ? "Completed work can be turned into an invoice or follow-up." : "This job needs an assignment or admin decision.",
    status: job.status || "open",
    client: job.client_name || job.customer_name || "Client",
    worker: job.assigned_worker_name || job.worker_name || "Unassigned",
  };
}

function toInvoice(invoice) {
  return {
    id: `invoice-${idOf(invoice)}`,
    lane: "money",
    type: "invoice_follow_up",
    label: "Money desk",
    title: `${invoice.customer_name || invoice.client_name || "Client"} · ${money(invoice.balance_due || invoice.balance || invoice.total || invoice.amount)}`,
    detail: "Invoice is open, unpaid, overdue, or ready for follow-up.",
    status: invoice.status || "open",
    client: invoice.customer_name || invoice.client_name || "Client",
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

function groupActions(actions) {
  const groups = new Map();

  for (const action of actions) {
    const key = low(action.type || "admin").replace(/[^a-z0-9]+/g, "_");
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title: trayLabel(action.type),
        count: 0,
        first: action,
      });
    }
    groups.get(key).count += 1;
  }

  return [...groups.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}

export default function OperatorFloorDashboard() {
  const { get, post, patch } = useApi();

  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [setup, setSetup] = useState(null);
  const [logs, setLogs] = useState([]);
  const [lane, setLane] = useState("approvals");
  const [selected, setSelected] = useState(null);
  const [handled, setHandled] = useState([]);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
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
      if (!quiet) toast.success("Churvox prepared the next admin moves");
      await load();
      return true;
    }
    if (!quiet) toast.error(res.error || "AI scan failed");
    return false;
  }, [load, post]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const key = "churvox_operator_floor_last_scan";
    const last = Number(localStorage.getItem(key) || 0);
    if (!last || Date.now() - last > 10 * 60 * 1000) {
      localStorage.setItem(key, String(Date.now()));
      scan(true);
    }
  }, [scan]);

  const hidden = useMemo(() => new Set(handled), [handled]);

  const approvals = useMemo(
    () => actions
      .filter((a) => !hidden.has(idOf(a)) && pending.has(low(a.status)))
      .slice(0, 50)
      .map(toAction),
    [actions, hidden]
  );

  const completed = useMemo(
    () => actions.filter((a) => doneStatuses.has(low(a.status))).slice(0, 8).map(toAction),
    [actions]
  );

  const attention = useMemo(
    () => jobs
      .filter((j) => !j.assigned_worker_id && !j.worker_id && !["completed", "done", "cancelled"].includes(low(j.status)))
      .slice(0, 16)
      .map((j) => toJob(j, "attention")),
    [jobs]
  );

  const crew = useMemo(
    () => jobs
      .filter((j) => ["assigned", "scheduled", "in_progress", "in progress", "started"].includes(low(j.status)))
      .slice(0, 16)
      .map((j) => toJob(j, "crew")),
    [jobs]
  );

  const moneyItems = useMemo(() => {
    const readyJobs = jobs
      .filter((j) => ["completed", "done", "complete"].includes(low(j.status)) && !(j.invoice_id || j.draft_invoice_id || j.invoiced))
      .slice(0, 12)
      .map((j) => toJob(j, "money"));

    const openInvoices = invoices
      .filter((i) => ["draft", "sent", "open", "overdue", "unpaid", "pending", ""].includes(low(i.status)))
      .slice(0, 12)
      .map(toInvoice);

    return [...readyJobs, ...openInvoices];
  }, [jobs, invoices]);

  const lanes = {
    approvals,
    attention,
    crew,
    money: moneyItems,
    done: completed,
  };

  const laneItems = lanes[lane] || [];
  const visibleItems = useMemo(() => {
    const seen = new Set();
    return laneItems.filter((item) => {
      const key = `${item.type || ""}|${item.title || ""}|${item.detail || ""}`.toLowerCase().replace(/\s+/g, " ").slice(0, 180);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 12);
  }, [laneItems]);

  const current = selected && selected.lane === lane ? selected : visibleItems[0];
  const groups = useMemo(() => groupActions(approvals), [approvals]);
  const urgent = snapshot?.urgent || {};

  const markHandled = (ids) => {
    setHandled((prev) => Array.from(new Set([...prev, ...arr(ids).map(String).filter(Boolean)])));
  };

  const approveOne = async (item) => {
    if (!item?.rawId) return;

    setBusy(item.rawId);

    const payload = patchFor(item);
    if (Object.keys(payload).length) {
      const prep = await patch(`/ai-operator/actions/${item.rawId}`, payload);
      if (!prep.success) {
        setBusy("");
        toast.error(prep.error || "Churvox could not prepare the final payload");
        return;
      }
    }

    const res = await post(`/ai-operator/actions/${item.rawId}/approve`, {});
    setBusy("");

    if (res.success) {
      toast.success("Approved. Churvox completed the admin move.");
      markHandled([item.rawId]);
      setActions((prev) => prev.filter((a) => idOf(a) !== item.rawId));
      setSelected(null);
      await load();
    } else {
      toast.error(res.error || "Churvox could not complete that action");
    }
  };

  const rejectOne = async (item) => {
    if (!item?.rawId) return;

    setBusy(item.rawId);
    const res = await post(`/ai-operator/actions/${item.rawId}/reject`, {});
    setBusy("");

    if (res.success) {
      toast.success("Skipped. Churvox removed it from the approval desk.");
      markHandled([item.rawId]);
      setActions((prev) => prev.filter((a) => idOf(a) !== item.rawId));
      setSelected(null);
      await load();
    } else {
      toast.error(res.error || "Could not reject action");
    }
  };

  const approveVisible = async () => {
    const items = approvals.filter((a) => a.rawId).slice(0, 12);
    if (!items.length) return toast.message("No approval slips waiting");

    setBusy("bulk");

    for (const item of items) {
      const payload = patchFor(item);
      if (Object.keys(payload).length) await patch(`/ai-operator/actions/${item.rawId}`, payload);
    }

    const res = await post("/ai-operator/actions/bulk-approve", {
      action_ids: items.map((a) => a.rawId),
    });

    setBusy("");

    if (res.success) {
      markHandled(items.map((a) => a.rawId));
      setActions((prev) => prev.filter((a) => !items.some((item) => item.rawId === idOf(a))));
      toast.success(`Approved ${res.succeeded || items.length} prepared moves`);
      setSelected(null);
      await load();
    } else {
      toast.error(res.error || "Bulk approve failed");
    }
  };

  const laneRows = [
    ["approvals", "Approvals", approvals.length],
    ["attention", "Needs attention", attention.length],
    ["crew", "Crew", crew.length],
    ["money", "Money", moneyItems.length],
    ["done", "Done", completed.length],
  ];

  return (
    <main className="opf" data-version="CHURVOX_OPERATOR_FLOOR_20260524">
      <section className="opf-hero">
        <div>
          <p className="opf-eyebrow">Churvox Operator Floor</p>
          <h1>Work comes in. Churvox prepares it. You approve the move.</h1>
          <p>{snapshot?.next_best_move || "Your AI operator sorts jobs, money, crew and customer follow-ups into clear approval slips."}</p>
        </div>

        <div className="opf-hero-actions">
          <button onClick={() => setLane("approvals")}>Review approvals</button>
          <button onClick={() => scan(false)} disabled={busy === "scan"}>{busy === "scan" ? "Scanning…" : "Run AI scan"}</button>
          <Link to="/invoices">Money desk</Link>
        </div>
      </section>

      <section className="opf-metrics">
        <div><span>Waiting approval</span><strong>{approvals.length}</strong></div>
        <div><span>Jobs needing attention</span><strong>{urgent.unassigned_jobs ?? attention.length}</strong></div>
        <div><span>Ready to invoice</span><strong>{urgent.completed_no_invoice ?? moneyItems.length}</strong></div>
        <div><span>Open cashflow</span><strong>{money(urgent.open_invoices_total || 0)}</strong></div>
      </section>

      <section className="opf-floor">
        <aside className="opf-panel opf-lanes">
          <p className="opf-kicker">Action trays</p>
          {laneRows.map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              className={lane === key ? "active" : ""}
              onClick={() => { setLane(key); setSelected(null); }}
            >
              <span>{label}</span>
              <strong>{count}</strong>
            </button>
          ))}
        </aside>

        <article className="opf-panel opf-slip">
          {loading ? (
            <p className="opf-muted">Churvox is loading the operator floor…</p>
          ) : current ? (
            <>
              <p className="opf-kicker">Main work slip · {current.label}</p>
              <h2>{current.title}</h2>
              <p>{current.detail}</p>

              <div className="opf-slip-grid">
                <div><span>Risk</span><strong>{current.risk || "normal"}</strong></div>
                <div><span>Status</span><strong>{current.status || "ready"}</strong></div>
                <div><span>Prepared detail</span><strong>{current.payload?.description || current.payload?.message || current.payload?.job_id || current.client || "ready"}</strong></div>
              </div>

              {current.rawId ? (
                <div className="opf-buttons">
                  <button onClick={() => approveOne(current)} disabled={busy === current.rawId}>
                    {busy === current.rawId ? "Completing…" : "Approve & run"}
                  </button>
                  <button className="secondary" onClick={() => rejectOne(current)} disabled={busy === current.rawId}>
                    Skip
                  </button>
                </div>
              ) : (
                <div className="opf-buttons">
                  <button onClick={() => scan(false)}>Prepare next move</button>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="opf-kicker">All clear</p>
              <h2>No work slips waiting here.</h2>
              <p>Run an AI scan or open another action tray.</p>
            </>
          )}
        </article>

        <aside className="opf-panel opf-glance">
          <p className="opf-kicker">At a glance</p>

          <div className="opf-glance-block">
            <span>Money</span>
            <strong>{money(urgent.open_invoices_total || 0)}</strong>
            <small>{moneyItems.length} money items waiting</small>
          </div>

          <div className="opf-glance-block">
            <span>Jobs</span>
            <strong>{attention.length}</strong>
            <small>need a decision or assignment</small>
          </div>

          <div className="opf-glance-block">
            <span>Crew</span>
            <strong>{crew.length}</strong>
            <small>active or scheduled jobs</small>
          </div>

          <div className="opf-safe">
            <span>Approval-first</span>
            <span>Pricing locked</span>
            <span>Payments require approval</span>
            <span>AI setup: {setup?.ai?.ready ? "ready" : "waiting"}</span>
          </div>
        </aside>
      </section>

      <section className="opf-panel opf-groups">
        <div className="opf-section-head">
          <div>
            <p className="opf-kicker">Grouped queue</p>
            <h3>Prepared work, grouped so the owner sees the day without opening everything.</h3>
          </div>
          <button onClick={approveVisible} disabled={!approvals.length || busy === "bulk"}>
            {busy === "bulk" ? "Processing…" : `Approve visible (${approvals.length})`}
          </button>
        </div>

        {groups.length ? (
          <div className="opf-group-grid">
            {groups.map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => { setLane("approvals"); setSelected(group.first); }}
              >
                <span>{group.count}</span>
                <strong>{group.title}</strong>
                <small>{group.first.detail}</small>
              </button>
            ))}
          </div>
        ) : (
          <p className="opf-muted">No grouped approval work waiting.</p>
        )}
      </section>

      <section className="opf-history">
        <div className="opf-panel">
          <p className="opf-kicker">Recently completed</p>
          {completed.length ? completed.map((item) => (
            <div className="opf-log" key={item.id}>
              <strong>{item.title}</strong>
              <span>{item.status}</span>
            </div>
          )) : <p className="opf-muted">Nothing completed yet.</p>}
        </div>

        <div className="opf-panel">
          <p className="opf-kicker">Operator history</p>
          {logs.length ? logs.map((log) => (
            <div className="opf-log" key={idOf(log)}>
              <strong>{log.message || log.event_type || "AI log"}</strong>
              <span>{log.event_type || "log"}</span>
            </div>
          )) : <p className="opf-muted">No operator history yet.</p>}
        </div>
      </section>
    </main>
  );
}
