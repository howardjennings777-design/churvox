import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import "../styles/commandTableWorkspace.css";

const arr = (v) =>
  Array.isArray(v) ? v :
  Array.isArray(v?.data) ? v.data :
  Array.isArray(v?.items) ? v.items :
  Array.isArray(v?.actions) ? v.actions :
  Array.isArray(v?.logs) ? v.logs :
  Array.isArray(v?.jobs) ? v.jobs :
  Array.isArray(v?.clients) ? v.clients :
  Array.isArray(v?.invoices) ? v.invoices :
  Array.isArray(v?.quotes) ? v.quotes : [];

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

function decisionLabel(type = "") {
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

function makeDecision(raw) {
  const payload = raw.payload || raw.draft_payload || {};
  const type = raw.action_type || raw.type || "prepared_action";

  return {
    id: `decision-${idOf(raw)}`,
    rawId: idOf(raw),
    raw,
    mode: "desk",
    source: "AI",
    type,
    group: groupLabel(type),
    label: decisionLabel(type),
    title: raw.title || raw.summary || "Churvox prepared a decision",
    detail: raw.recommendation || raw.reason || raw.owner_facing_explanation || raw.summary || "Review this move, then approve, edit, or skip.",
    status: raw.status || "pending",
    risk: raw.risk || raw.risk_level || "low",
    payload,
  };
}

function makeJob(job, mode = "jobs") {
  return {
    id: `job-${idOf(job)}`,
    raw: job,
    mode,
    source: "Job",
    type: "job",
    group: mode === "money" ? "Completed jobs" : "Jobs",
    label: mode === "money" ? "Ready to invoice" : "Job",
    title: job.title || job.job_name || job.client_name || "Job",
    detail: job.description || job.address || "Job record is ready to review inside the desk.",
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
    mode: "money",
    source: "Invoice",
    type: "invoice",
    group: "Invoices",
    label: "Money",
    title: `${invoice.customer_name || invoice.client_name || "Client"} · ${nzMoney(invoice.balance_due || invoice.balance || invoice.total || invoice.amount)}`,
    detail: invoice.description || "Invoice is open, draft, unpaid, overdue, or ready for follow-up.",
    status: invoice.status || "open",
    client: invoice.customer_name || invoice.client_name || "Client",
    amount: invoice.balance_due || invoice.balance || invoice.total || invoice.amount || 0,
  };
}

function makeClient(client) {
  return {
    id: `client-${idOf(client)}`,
    raw: client,
    mode: "clients",
    source: "Client",
    type: "client",
    group: "Clients",
    label: "Client",
    title: client.name || client.client_name || client.customer_name || "Client",
    detail: client.email || client.phone || client.address || "Client record is ready inside the desk.",
    status: client.status || "active",
    client: client.name || client.client_name || client.customer_name || "Client",
  };
}

function makeQuote(quote) {
  return {
    id: `quote-${idOf(quote)}`,
    raw: quote,
    mode: "quotes",
    source: "Quote",
    type: "quote",
    group: "Quotes",
    label: "Quote",
    title: quote.title || quote.customer_name || quote.client_name || "Quote",
    detail: quote.description || "Quote is ready to review inside the desk.",
    status: quote.status || "draft",
    client: quote.customer_name || quote.client_name || "Client",
    amount: quote.total || quote.amount || quote.price || 0,
  };
}

function patchFor(item, editedText = "") {
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
    const description = first(editedText, p.description, arr(p.line_items)[0]?.description, item?.title);
    if (description) patch.description = String(description);
    if (p.job_id) patch.job_id = String(p.job_id);
    if (p.client_id) patch.client_id = String(p.client_id);
  }

  if (["invoice_reminder", "quote_follow_up", "quote_followup", "customer_update"].includes(type)) {
    const message = first(editedText, p.message, item?.raw?.generated_message, item?.detail);
    if (message) patch.message = String(message);
  }

  return patch;
}

function grouped(items) {
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

function contextLines(item) {
  if (!item) return ["Press Now to review the next move.", "Everything stays on this page unless you choose to open a full page."];

  const lines = [];

  if (item.source === "AI") lines.push("Churvox has prepared this admin move.");
  if (item.type?.includes("invoice")) lines.push("This affects invoicing, money, or payment follow-up.");
  if (item.type?.includes("assign")) lines.push("This helps get work assigned without digging through jobs.");
  if (item.source === "Job") lines.push(`Client: ${item.client || "Client"}`);
  if (item.source === "Job") lines.push(`Worker: ${item.worker || "Unassigned"}`);
  if (item.source === "Invoice" || item.source === "Quote") lines.push(`Amount: ${nzMoney(item.amount || 0)}`);
  if (item.payload?.message || item.payload?.description) lines.push("Draft wording is ready to review.");
  if (item.payload?.job_id) lines.push("Linked to a real job record.");
  lines.push("Nothing sends, charges, or changes until you approve.");

  return lines.slice(0, 7);
}

export default function CommandTableWorkspace() {
  const { get, post, patch } = useApi();

  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [logs, setLogs] = useState([]);

  const [mode, setMode] = useState("desk");
  const [selected, setSelected] = useState(null);
  const [handled, setHandled] = useState([]);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState("");
  const once = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);

    const [a, s, logRes, j, c, i, q] = await Promise.all([
      get("/ai-operator/actions"),
      get("/ai-operator/command-snapshot"),
      get("/ai-operator/audit-log"),
      get("/jobs"),
      get("/clients"),
      get("/invoices"),
      get("/quotes"),
    ]);

    if (a.success) setActions(arr(a.actions || a.data || a));
    if (s.success) setSnapshot(s.data || s);
    if (logRes.success) setLogs(arr(logRes.logs || logRes.data || logRes).slice(0, 12));
    if (j.success) setJobs(arr(j.data || j));
    if (c.success) setClients(arr(c.data || c));
    if (i.success) setInvoices(arr(i.data || i));
    if (q.success) setQuotes(arr(q.data || q));

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

    const key = "churvox_command_table_last_scan";
    const last = Number(localStorage.getItem(key) || 0);

    if (!last || Date.now() - last > 10 * 60 * 1000) {
      localStorage.setItem(key, String(Date.now()));
      scan(true);
    }
  }, [scan]);

  const hidden = useMemo(() => new Set(handled), [handled]);

  const decisions = useMemo(
    () => actions
      .filter((a) => !hidden.has(idOf(a)) && pending.has(low(a.status)))
      .slice(0, 60)
      .map(makeDecision),
    [actions, hidden]
  );

  const done = useMemo(
    () => actions
      .filter((a) => doneStatuses.has(low(a.status)))
      .slice(0, 12)
      .map(makeDecision),
    [actions]
  );

  const jobItems = useMemo(() => jobs.slice(0, 40).map((job) => makeJob(job, "jobs")), [jobs]);

  const moneyItems = useMemo(() => {
    const readyJobs = jobs
      .filter((j) => ["completed", "done", "complete"].includes(low(j.status)) && !(j.invoice_id || j.draft_invoice_id || j.invoiced))
      .slice(0, 16)
      .map((job) => makeJob(job, "money"));

    const openInvoices = invoices
      .filter((i) => ["draft", "sent", "open", "overdue", "unpaid", "pending", ""].includes(low(i.status)))
      .slice(0, 30)
      .map(makeInvoice);

    return [...readyJobs, ...openInvoices];
  }, [jobs, invoices]);

  const crewItems = useMemo(
    () => jobs
      .filter((j) => ["assigned", "scheduled", "in_progress", "in progress", "started"].includes(low(j.status)))
      .slice(0, 40)
      .map((job) => makeJob(job, "crew")),
    [jobs]
  );

  const clientItems = useMemo(() => clients.slice(0, 40).map(makeClient), [clients]);
  const quoteItems = useMemo(() => quotes.slice(0, 40).map(makeQuote), [quotes]);

  const urgent = snapshot?.urgent || {};

  const modes = {
    desk: decisions,
    money: moneyItems,
    jobs: jobItems,
    crew: crewItems,
    clients: clientItems,
    quotes: quoteItems,
    done,
  };

  const rail = [
    ["desk", "Now", decisions.length],
    ["money", "Money", moneyItems.length],
    ["jobs", "Jobs", urgent.unassigned_jobs ?? jobItems.length],
    ["crew", "Crew", crewItems.length],
    ["clients", "Clients", clientItems.length],
    ["quotes", "Quotes", quoteItems.length],
    ["done", "Done", done.length],
  ];

  const activeItems = modes[mode] || [];
  const current = selected && selected.mode === mode ? selected : activeItems[0];
  const groups = useMemo(() => grouped(decisions), [decisions]);
  const reasons = contextLines(current);

  useEffect(() => {
    setEditOpen(false);
    setEditText(current?.payload?.message || current?.payload?.description || current?.detail || "");
  }, [current?.id]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setSelected(null);
  };

  const reviewNow = () => {
    setMode("desk");
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
        toast.error(prep.error || "Churvox could not prepare final payload");
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

  const skipOne = async (item) => {
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
    <main className="ct" data-version="CHURVOX_COMMAND_TABLE_20260524">
      <section className="ct-ribbon">
        <div>
          <p className="ct-kicker">Churvox Command Table</p>
          <h1>Now. Money. Jobs. Crew. Clients. One desk.</h1>
        </div>

        <div className="ct-ai">
          <span />
          <strong>AI active</strong>
          <small>{decisions.length} moves prepared · {moneyItems.length} money items</small>
        </div>

        <div className="ct-ribbon-actions">
          <button onClick={() => scan(false)} disabled={busy === "scan"}>{busy === "scan" ? "Scanning…" : "Run AI scan"}</button>
          <button className="secondary" onClick={reviewNow}>Start with Now</button>
          <button className="ghost" onClick={() => switchMode("done")}>History</button>
        </div>
      </section>

      <section className="ct-start">
        <div>
          <p className="ct-kicker">Start here</p>
          <h2>{decisions.length ? "Churvox has the next move ready." : "Your command table is clear."}</h2>
          <p>{snapshot?.next_best_move || "Review the next move, approve it, edit it, or skip it. Jobs, money, clients and crew stay inside this desk."}</p>
        </div>

        <button className="ct-now-button" onClick={reviewNow}>
          Review Now
          <span>{decisions.length} waiting</span>
        </button>
      </section>

      <section className="ct-grid">
        <aside className="ct-rail">
          <p className="ct-kicker">Work queue</p>
          {rail.map(([key, label, count]) => (
            <button
              key={key}
              className={mode === key ? "active" : ""}
              onClick={() => switchMode(key)}
            >
              <span>{label}</span>
              <strong>{count}</strong>
            </button>
          ))}
        </aside>

        <article className="ct-surface">
          <div className="ct-surface-inner">
            {loading ? (
              <div className="ct-empty">
                <p>Loading Churvox…</p>
              </div>
            ) : current ? (
              <>
                <div className="ct-work-head">
                  <div>
                    <p className="ct-kicker">{mode === "desk" ? "Now" : mode}</p>
                    <h2>{current.title}</h2>
                  </div>
                  <span className="ct-source">{current.source}</span>
                </div>

                <p className="ct-detail">{current.detail}</p>

                <div className="ct-facts">
                  <div><span>Status</span><strong>{current.status || "ready"}</strong></div>
                  <div><span>Type</span><strong>{current.label || current.type}</strong></div>
                  <div><span>Context</span><strong>{current.payload?.job_id || current.client || current.worker || "ready"}</strong></div>
                </div>

                {editOpen ? (
                  <label className="ct-editor">
                    <span>Edit before approving</span>
                    <textarea value={editText} onChange={(event) => setEditText(event.target.value)} />
                  </label>
                ) : null}

                <div className="ct-actions">
                  {current.rawId ? (
                    <>
                      <button onClick={() => approveOne(current)} disabled={busy === current.rawId}>
                        {busy === current.rawId ? "Running…" : "Approve & run"}
                      </button>
                      <button className="secondary" onClick={() => setEditOpen((value) => !value)}>Edit first</button>
                      <button className="ghost" onClick={() => skipOne(current)} disabled={busy === current.rawId}>Skip</button>
                    </>
                  ) : (
                    <>
                      <button onClick={reviewNow}>Back to Now</button>
                      {mode === "jobs" ? <Link to="/jobs">Open full jobs</Link> : null}
                      {mode === "money" ? <Link to="/invoices">Open money desk</Link> : null}
                      {mode === "clients" ? <Link to="/clients">Open full clients</Link> : null}
                      {mode === "quotes" ? <Link to="/quotes">Open full quotes</Link> : null}
                    </>
                  )}
                </div>

                <div className="ct-inline-list">
                  {activeItems.slice(0, 8).map((item) => (
                    <button
                      key={item.id}
                      className={current.id === item.id ? "active" : ""}
                      onClick={() => setSelected(item)}
                    >
                      <strong>{item.title}</strong>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="ct-empty">
                <h2>Nothing waiting here.</h2>
                <p>Run AI scan or choose another queue.</p>
                <button onClick={() => scan(false)}>Run AI scan</button>
              </div>
            )}
          </div>
        </article>

        <aside className="ct-inspector">
          <p className="ct-kicker">Inspector</p>
          <h3>{current ? "Why this is here" : "Nothing selected"}</h3>

          <ul>
            {reasons.map((line) => <li key={line}>{line}</li>)}
          </ul>

          <div className="ct-mini">
            <div><span>Ready</span><strong>{decisions.length}</strong></div>
            <div><span>Money</span><strong>{nzMoney(urgent.open_invoices_total || 0)}</strong></div>
            <div><span>Jobs</span><strong>{urgent.unassigned_jobs ?? jobItems.length}</strong></div>
          </div>
        </aside>
      </section>

      <section className="ct-trays">
        <div className="ct-trays-head">
          <div>
            <p className="ct-kicker">Work trays</p>
            <h3>Grouped work. No repeated-card mess.</h3>
          </div>
          <button onClick={reviewNow}>Start reviewing</button>
        </div>

        {groups.length ? (
          <div className="ct-tray-grid">
            {groups.map((group) => (
              <button key={group.key} onClick={() => { setMode("desk"); setSelected(group.first); }}>
                <span>{group.count}</span>
                <strong>{group.title}</strong>
                <small>{group.first.detail}</small>
              </button>
            ))}
          </div>
        ) : (
          <p>No prepared decisions waiting.</p>
        )}
      </section>
    </main>
  );
}
