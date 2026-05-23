import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import "../styles/commandDeskWorkspace.css";

const arr = (v) =>
  Array.isArray(v) ? v :
  Array.isArray(v?.data) ? v.data :
  Array.isArray(v?.items) ? v.items :
  Array.isArray(v?.actions) ? v.actions :
  Array.isArray(v?.logs) ? v.logs :
  Array.isArray(v?.clients) ? v.clients :
  Array.isArray(v?.jobs) ? v.jobs :
  Array.isArray(v?.invoices) ? v.invoices : [];

const idOf = (v) => String(v?.id || v?._id || "");
const low = (v) => String(v || "").toLowerCase();
const nzMoney = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
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
  return "Admin decision";
}

function groupLabel(type = "") {
  const t = low(type);
  if (t.includes("invoice_reminder")) return "Payment reminders";
  if (t.includes("invoice")) return "Invoice drafts";
  if (t.includes("assign")) return "Crew assignments";
  if (t.includes("quote")) return "Quote follow-ups";
  if (t.includes("customer")) return "Customer updates";
  return "Admin decisions";
}

function makeAction(raw) {
  const payload = raw.payload || raw.draft_payload || {};
  const type = raw.action_type || raw.type || "prepared_action";
  return {
    id: `action-${idOf(raw)}`,
    rawId: idOf(raw),
    raw,
    source: "ai",
    workspace: "decisions",
    type,
    group: groupLabel(type),
    label: actionLabel(type),
    title: raw.title || raw.summary || "Churvox prepared a decision",
    detail: raw.recommendation || raw.reason || raw.owner_facing_explanation || raw.summary || "Review it, then approve, edit, or skip.",
    status: raw.status || "pending",
    risk: raw.risk || raw.risk_level || "low",
    payload,
  };
}

function makeJob(job, workspace = "jobs") {
  return {
    id: `job-${idOf(job)}`,
    raw: job,
    source: "job",
    workspace,
    type: "job",
    group: workspace === "money" ? "Ready to invoice" : "Jobs",
    label: workspace === "money" ? "Ready to invoice" : "Job",
    title: job.title || job.job_name || job.client_name || "Job",
    detail: job.description || job.address || "Open job record.",
    status: job.status || "open",
    client: job.client_name || job.customer_name || "Client",
    worker: job.assigned_worker_name || job.worker_name || "Unassigned",
    amount: job.price || job.job_price || job.fixed_price || job.total || job.amount || 0,
  };
}

function makeInvoice(invoice) {
  return {
    id: `invoice-${idOf(invoice)}`,
    raw: invoice,
    source: "invoice",
    workspace: "money",
    type: "invoice",
    group: "Invoice follow-ups",
    label: "Invoice",
    title: `${invoice.customer_name || invoice.client_name || "Client"} · ${nzMoney(invoice.balance_due || invoice.balance || invoice.total || invoice.amount)}`,
    detail: invoice.description || "Invoice is open, draft, overdue, unpaid, or ready for follow-up.",
    status: invoice.status || "open",
    client: invoice.customer_name || invoice.client_name || "Client",
    amount: invoice.balance_due || invoice.balance || invoice.total || invoice.amount || 0,
  };
}

function makeClient(client) {
  return {
    id: `client-${idOf(client)}`,
    raw: client,
    source: "client",
    workspace: "clients",
    type: "client",
    group: "Clients",
    label: "Client",
    title: client.name || client.client_name || client.customer_name || "Client",
    detail: client.email || client.phone || client.address || "Client record.",
    status: client.status || "active",
    client: client.name || client.client_name || client.customer_name || "Client",
  };
}

function patchFor(item, editText = "") {
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
    const description = first(editText, p.description, arr(p.line_items)[0]?.description, item?.title);
    if (description) patch.description = String(description);
    if (p.job_id) patch.job_id = String(p.job_id);
    if (p.client_id) patch.client_id = String(p.client_id);
  }

  if (["invoice_reminder", "quote_follow_up", "quote_followup", "customer_update"].includes(type)) {
    const message = first(editText, p.message, item?.raw?.generated_message, item?.detail);
    if (message) patch.message = String(message);
  }

  return patch;
}

function groupActions(items) {
  const map = new Map();
  for (const item of items) {
    const key = low(item.group || item.type || item.title).replace(/[^a-z0-9]+/g, "_");
    if (!map.has(key)) {
      map.set(key, { key, title: item.group || groupLabel(item.type), count: 0, first: item });
    }
    map.get(key).count += 1;
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}

function contextFor(item) {
  if (!item) return ["Choose a row on the left or press Review next decision."];
  const lines = [];

  if (item.source === "ai") lines.push("Churvox has already prepared this admin step.");
  if (item.type?.includes("invoice")) lines.push("This affects money, invoice creation, or payment follow-up.");
  if (item.type?.includes("assign")) lines.push("This helps place work with the right crew member.");
  if (item.source === "job") lines.push(`Client: ${item.client || "Client"}`);
  if (item.source === "job") lines.push(`Worker: ${item.worker || "Unassigned"}`);
  if (item.source === "invoice") lines.push(`Amount: ${nzMoney(item.amount || 0)}`);
  if (item.payload?.message || item.payload?.description) lines.push("Draft wording is ready to review.");
  if (item.payload?.job_id) lines.push("Linked to a real job record.");
  lines.push("Nothing is sent, charged, or changed until you approve.");

  return lines.slice(0, 7);
}

export default function CommandDeskWorkspace() {
  const { get, post, patch } = useApi();
  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [logs, setLogs] = useState([]);
  const [workspace, setWorkspace] = useState("decisions");
  const [selected, setSelected] = useState(null);
  const [handled, setHandled] = useState([]);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState("");
  const once = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, s, logRes, j, c, i] = await Promise.all([
      get("/ai-operator/actions"),
      get("/ai-operator/command-snapshot"),
      get("/ai-operator/audit-log"),
      get("/jobs"),
      get("/clients"),
      get("/invoices"),
    ]);

    if (a.success) setActions(arr(a.actions || a.data || a));
    if (s.success) setSnapshot(s.data || s);
    if (logRes.success) setLogs(arr(logRes.logs || logRes.data || logRes).slice(0, 10));
    if (j.success) setJobs(arr(j.data || j));
    if (c.success) setClients(arr(c.data || c));
    if (i.success) setInvoices(arr(i.data || i));

    setLoading(false);
  }, [get]);

  const scan = useCallback(async (quiet = false) => {
    setBusy("scan");
    const res = await post("/ai/operator/run-daily-check", {});
    setBusy("");
    if (res.success) {
      if (!quiet) toast.success("Churvox prepared the next moves");
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
    const key = "churvox_command_desk_last_scan";
    const last = Number(localStorage.getItem(key) || 0);
    if (!last || Date.now() - last > 10 * 60 * 1000) {
      localStorage.setItem(key, String(Date.now()));
      scan(true);
    }
  }, [scan]);

  const hidden = useMemo(() => new Set(handled), [handled]);

  const decisions = useMemo(
    () => actions.filter((a) => !hidden.has(idOf(a)) && pending.has(low(a.status))).slice(0, 60).map(makeAction),
    [actions, hidden]
  );

  const done = useMemo(
    () => actions.filter((a) => doneStatuses.has(low(a.status))).slice(0, 10).map(makeAction),
    [actions]
  );

  const jobItems = useMemo(() => jobs.slice(0, 30).map((j) => makeJob(j, "jobs")), [jobs]);

  const moneyItems = useMemo(() => {
    const readyJobs = jobs
      .filter((j) => ["completed", "done", "complete"].includes(low(j.status)) && !(j.invoice_id || j.draft_invoice_id || j.invoiced))
      .slice(0, 16)
      .map((j) => makeJob(j, "money"));

    const openInvoices = invoices
      .filter((i) => ["draft", "sent", "open", "overdue", "unpaid", "pending", ""].includes(low(i.status)))
      .slice(0, 20)
      .map(makeInvoice);

    return [...readyJobs, ...openInvoices];
  }, [jobs, invoices]);

  const crewItems = useMemo(
    () => jobs.filter((j) => ["assigned", "scheduled", "in_progress", "in progress", "started"].includes(low(j.status))).slice(0, 30).map((j) => makeJob(j, "crew")),
    [jobs]
  );

  const clientItems = useMemo(() => clients.slice(0, 30).map(makeClient), [clients]);

  const urgent = snapshot?.urgent || {};
  const workspaceItems = {
    decisions,
    jobs: jobItems,
    money: moneyItems,
    crew: crewItems,
    clients: clientItems,
    done,
  };

  const rail = [
    ["decisions", "Ready for you", decisions.length],
    ["money", "Money waiting", moneyItems.length],
    ["jobs", "Jobs", urgent.unassigned_jobs ?? jobItems.length],
    ["crew", "Crew", crewItems.length],
    ["clients", "Clients", clientItems.length],
    ["done", "Done today", done.length],
  ];

  const currentItems = workspaceItems[workspace] || [];
  const current = selected && selected.workspace === workspace ? selected : currentItems[0];
  const groups = useMemo(() => groupActions(decisions), [decisions]);
  const contextLines = contextFor(current);

  useEffect(() => {
    setEditOpen(false);
    const draft = current?.payload?.message || current?.payload?.description || current?.detail || "";
    setEditText(draft);
  }, [current?.id]);

  const selectWorkspace = (key) => {
    setWorkspace(key);
    setSelected(null);
  };

  const reviewNext = () => {
    setWorkspace("decisions");
    setSelected(decisions[0] || null);
  };

  const approveOne = async (item) => {
    if (!item?.rawId) return;
    setBusy(item.rawId);

    const payload = patchFor(item, editOpen ? editText : "");
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
      toast.success("Approved. Churvox completed it.");
      setHandled((prev) => Array.from(new Set([...prev, item.rawId])));
      setActions((prev) => prev.filter((a) => idOf(a) !== item.rawId));
      setSelected(null);
      setEditOpen(false);
      await load();
    } else {
      toast.error(res.error || "Could not approve action");
    }
  };

  const rejectOne = async (item) => {
    if (!item?.rawId) return;
    setBusy(item.rawId);

    const res = await post(`/ai-operator/actions/${item.rawId}/reject`, {});
    setBusy("");

    if (res.success) {
      toast.success("Skipped.");
      setHandled((prev) => Array.from(new Set([...prev, item.rawId])));
      setActions((prev) => prev.filter((a) => idOf(a) !== item.rawId));
      setSelected(null);
      setEditOpen(false);
      await load();
    } else {
      toast.error(res.error || "Could not skip action");
    }
  };

  return (
    <main className="cmd-desk" data-version="CHURVOX_COMMAND_DESK_WORKSPACE_20260524">
      <section className="cmd-topbar">
        <div>
          <p className="cmd-kicker">Churvox Command Desk</p>
          <h1>Everything opens here.</h1>
          <p>Churvox lines up decisions, jobs, money, clients and crew without making you leave the desk.</p>
        </div>

        <div className="cmd-status">
          <span className="cmd-live-dot" />
          <strong>AI active</strong>
          <small>{decisions.length} moves prepared · {moneyItems.length} money items</small>
        </div>

        <div className="cmd-top-actions">
          <button onClick={() => scan(false)} disabled={busy === "scan"}>{busy === "scan" ? "Scanning…" : "Run AI scan"}</button>
          <button className="secondary" onClick={reviewNext}>Review next</button>
          <Link to="/settings">History</Link>
        </div>
      </section>

      <section className="cmd-start">
        <div>
          <p className="cmd-kicker">Start here</p>
          <h2>Churvox has prepared the work.</h2>
          <p>{snapshot?.next_best_move || "Press Review next decision, then approve, edit, or skip. The next move slides in after you finish."}</p>
        </div>
        <button className="cmd-primary-big" onClick={reviewNext}>
          Review next decision
          <span>{decisions.length} waiting</span>
        </button>
      </section>

      <section className="cmd-layout">
        <aside className="cmd-rail">
          <p className="cmd-kicker">AI work rail</p>
          {rail.map(([key, label, count]) => (
            <button key={key} className={workspace === key ? "active" : ""} onClick={() => selectWorkspace(key)}>
              <span>{label}</span>
              <strong>{count}</strong>
            </button>
          ))}
        </aside>

        <article className="cmd-workspace">
          <div className="cmd-work-head">
            <div>
              <p className="cmd-kicker">{workspace === "decisions" ? "Next decision" : workspace}</p>
              <h2>{current?.title || (loading ? "Loading Churvox…" : "Nothing waiting here.")}</h2>
            </div>
            {current?.source !== "ai" && current?.source ? <span className="cmd-pill">{current.source}</span> : null}
          </div>

          {current ? (
            <>
              <p className="cmd-work-detail">{current.detail}</p>

              <div className="cmd-meta">
                <div><span>Status</span><strong>{current.status || "ready"}</strong></div>
                <div><span>Type</span><strong>{current.label || current.type}</strong></div>
                <div><span>Detail</span><strong>{current.payload?.job_id || current.client || current.worker || "ready"}</strong></div>
              </div>

              {editOpen ? (
                <label className="cmd-editor">
                  <span>Edit before approving</span>
                  <textarea value={editText} onChange={(event) => setEditText(event.target.value)} />
                </label>
              ) : null}

              <div className="cmd-actions">
                {current.rawId ? (
                  <>
                    <button onClick={() => approveOne(current)} disabled={busy === current.rawId}>
                      {busy === current.rawId ? "Running…" : "Approve & run"}
                    </button>
                    <button className="secondary" onClick={() => setEditOpen((value) => !value)}>Edit first</button>
                    <button className="ghost" onClick={() => rejectOne(current)} disabled={busy === current.rawId}>Skip</button>
                  </>
                ) : (
                  <>
                    {current.source === "job" ? <Link to="/jobs" className="cmd-link-button">Open jobs page</Link> : null}
                    {current.source === "invoice" ? <Link to="/invoices" className="cmd-link-button">Open money desk</Link> : null}
                    {current.source === "client" ? <Link to="/clients" className="cmd-link-button">Open clients page</Link> : null}
                    <button className="secondary" onClick={reviewNext}>Back to decisions</button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="cmd-empty">
              <p>No work is waiting in this area.</p>
              <button onClick={() => scan(false)}>Run AI scan</button>
            </div>
          )}
        </article>

        <aside className="cmd-context">
          <p className="cmd-kicker">Why / context</p>
          <h3>{current ? "Why this is here" : "Nothing selected"}</h3>
          <ul>
            {contextLines.map((line) => <li key={line}>{line}</li>)}
          </ul>

          <div className="cmd-context-mini">
            <div><span>Ready</span><strong>{decisions.length}</strong></div>
            <div><span>Money</span><strong>{nzMoney(urgent.open_invoices_total || 0)}</strong></div>
            <div><span>Jobs</span><strong>{urgent.unassigned_jobs ?? jobItems.length}</strong></div>
          </div>
        </aside>
      </section>

      <section className="cmd-trays">
        <div className="cmd-trays-head">
          <div>
            <p className="cmd-kicker">Prepared work trays</p>
            <h3>Grouped work, not repeated cards.</h3>
          </div>
          <button onClick={reviewNext}>Start reviewing</button>
        </div>

        {groups.length ? (
          <div className="cmd-tray-grid">
            {groups.map((group) => (
              <button key={group.key} onClick={() => { setWorkspace("decisions"); setSelected(group.first); }}>
                <span>{group.count}</span>
                <strong>{group.title}</strong>
                <small>{group.first.detail}</small>
              </button>
            ))}
          </div>
        ) : (
          <p>No grouped approval work waiting.</p>
        )}
      </section>

      <section className="cmd-history">
        <div>
          <p className="cmd-kicker">Recently completed</p>
          {done.length ? done.map((item) => (
            <div className="cmd-log" key={item.id}>
              <strong>{item.title}</strong>
              <span>{item.status}</span>
            </div>
          )) : <p>No completed AI moves yet.</p>}
        </div>

        <div>
          <p className="cmd-kicker">Operator history</p>
          {logs.length ? logs.map((log) => (
            <div className="cmd-log" key={idOf(log)}>
              <strong>{log.message || log.event_type || "AI log"}</strong>
              <span>{log.event_type || "log"}</span>
            </div>
          )) : <p>No history yet.</p>}
        </div>
      </section>
    </main>
  );
}
