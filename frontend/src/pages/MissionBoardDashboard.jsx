import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import "../styles/churvoxMissionBoard.css";

const arr = (v) =>
  Array.isArray(v) ? v :
  Array.isArray(v?.data) ? v.data :
  Array.isArray(v?.items) ? v.items :
  Array.isArray(v?.actions) ? v.actions :
  Array.isArray(v?.jobs) ? v.jobs :
  Array.isArray(v?.clients) ? v.clients :
  Array.isArray(v?.invoices) ? v.invoices :
  Array.isArray(v?.quotes) ? v.quotes : [];

const idOf = (v) => String(v?.id || v?._id || "");
const low = (v) => String(v || "").toLowerCase();
const nz = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
const pendingStatuses = new Set(["", "pending", "ready", "edited", "draft", "watching"]);
const doneStatuses = new Set(["completed", "approved", "dismissed", "rejected"]);
const first = (...values) => values.find((v) => v !== undefined && v !== null && String(v).trim() !== "");

const lineTotal = (items) => arr(items).reduce((sum, item) => {
  const qty = Number(item?.qty || item?.quantity || 1);
  const unit = Number(item?.amount ?? item?.total ?? item?.price ?? item?.unit_price ?? 0);
  return sum + qty * unit;
}, 0);

function labelFor(type = "") {
  const t = low(type);
  if (t.includes("invoice_reminder")) return "Payment reminder";
  if (t.includes("invoice")) return "Invoice draft";
  if (t.includes("assign")) return "Crew assignment";
  if (t.includes("quote")) return "Quote follow-up";
  if (t.includes("customer")) return "Customer update";
  return "Admin move";
}

function stackFor(type = "") {
  const t = low(type);
  if (t.includes("invoice_reminder")) return "Reminders";
  if (t.includes("invoice")) return "Invoices";
  if (t.includes("assign")) return "Crew";
  if (t.includes("quote")) return "Quotes";
  if (t.includes("customer")) return "Customers";
  return "Admin";
}

function makeDecision(raw) {
  const payload = raw.payload || raw.draft_payload || {};
  const type = raw.action_type || raw.type || "prepared_action";
  return {
    id: `decision-${idOf(raw)}`,
    rawId: idOf(raw),
    raw,
    area: "now",
    source: "AI",
    type,
    label: labelFor(type),
    stack: stackFor(type),
    title: raw.title || raw.summary || "Churvox has the next move ready",
    detail: raw.recommendation || raw.reason || raw.owner_facing_explanation || raw.summary || "Review this move, then approve, edit, or skip.",
    status: raw.status || "pending",
    risk: raw.risk || raw.risk_level || "low",
    payload,
  };
}

function makeJob(job, area = "jobs") {
  return {
    id: `job-${idOf(job)}`,
    raw: job,
    area,
    source: "Job",
    type: "job",
    label: area === "money" ? "Ready to invoice" : "Job",
    stack: area === "money" ? "Ready to invoice" : "Jobs",
    title: job.title || job.job_name || job.client_name || "Job",
    detail: job.description || job.address || "Job work item.",
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
    area: "money",
    source: "Invoice",
    type: "invoice",
    label: "Money",
    stack: "Invoices",
    title: `${invoice.customer_name || invoice.client_name || "Client"} · ${nz(invoice.balance_due || invoice.balance || invoice.total || invoice.amount)}`,
    detail: invoice.description || "Invoice waiting for review or follow-up.",
    status: invoice.status || "open",
    client: invoice.customer_name || invoice.client_name || "Client",
    amount: invoice.balance_due || invoice.balance || invoice.total || invoice.amount || 0,
  };
}

function makeClient(client) {
  return {
    id: `client-${idOf(client)}`,
    raw: client,
    area: "clients",
    source: "Client",
    type: "client",
    label: "Client",
    stack: "Clients",
    title: client.name || client.client_name || client.customer_name || "Client",
    detail: client.email || client.phone || client.address || "Client record.",
    status: client.status || "active",
    client: client.name || client.client_name || client.customer_name || "Client",
  };
}

function makeQuote(quote) {
  return {
    id: `quote-${idOf(quote)}`,
    raw: quote,
    area: "quotes",
    source: "Quote",
    type: "quote",
    label: "Quote",
    stack: "Quotes",
    title: quote.title || quote.customer_name || quote.client_name || "Quote",
    detail: quote.description || "Quote waiting for review or follow-up.",
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

function displayTitle(item) {
  if (!item) return "No mission selected.";
  const p = item.payload || {};
  const type = low(item.type || "");
  const client = first(p.client_name, p.customer_name, p.client, item.client);

  if (type.includes("invoice_reminder")) return `Send reminder${client ? ` to ${client}` : ""}`;
  if (["create_invoice_draft", "invoice_draft"].includes(type)) return `Create invoice${client ? ` for ${client}` : ""}`;
  if (type.includes("assign")) return "Assign crew to job";
  if (type.includes("quote")) return `Follow up quote${client ? ` for ${client}` : ""}`;
  if (type.includes("customer")) return `Update customer${client ? ` ${client}` : ""}`;
  return item.title || "Churvox has the next move ready";
}

function displayDetail(item) {
  if (!item) return "Run an AI check or open a board lane.";
  const p = item.payload || {};
  const type = low(item.type || "");
  const client = first(p.client_name, p.customer_name, p.client, item.client);
  const amount = first(p.amount_due, p.balance_due, p.amount, p.total, item.amount);
  const days = first(p.days_overdue, p.overdue_days, p.invoice_age_days);
  const invoice = first(p.invoice_number, p.invoice_ref, p.invoice_id);

  if (type.includes("invoice_reminder")) {
    const bits = [];
    if (invoice) bits.push(`Invoice ${invoice}`);
    if (days) bits.push(`${days} days overdue`);
    if (amount) bits.push(`${nz(amount)} due`);
    if (client) bits.push(client);
    return `${bits.length ? bits.join(" · ") + ". " : ""}Churvox drafted the reminder. Nothing sends until you approve.`;
  }

  if (["create_invoice_draft", "invoice_draft"].includes(type)) {
    const bits = [];
    if (client) bits.push(client);
    if (amount) bits.push(nz(amount));
    if (p.job_id) bits.push("linked to completed job");
    return `${bits.length ? bits.join(" · ") + ". " : ""}Approve to create the draft invoice.`;
  }

  return item.detail || "Review, approve, edit, or skip this move.";
}

function primaryLabel(item) {
  const type = low(item?.type || "");
  if (type.includes("invoice_reminder")) return "Approve & send";
  if (["create_invoice_draft", "invoice_draft"].includes(type)) return "Approve invoice";
  if (type.includes("assign")) return "Approve assignment";
  if (type.includes("quote")) return "Approve follow-up";
  if (type.includes("customer")) return "Approve update";
  return "Approve & run";
}

function outcomeLine(item) {
  const type = low(item?.type || "");
  if (type.includes("invoice_reminder")) return "Reminder sends";
  if (["create_invoice_draft", "invoice_draft"].includes(type)) return "Draft invoice created";
  if (type.includes("assign")) return "Crew assignment saved";
  if (type.includes("quote")) return "Follow-up prepared";
  if (type.includes("customer")) return "Customer update prepared";
  return item?.rawId ? "Action runs" : "Open inside board";
}

function recordLine(item) {
  if (!item) return "ready";
  const p = item.payload || {};
  return first(p.client_name, p.customer_name, item.client, p.invoice_number ? `Invoice ${p.invoice_number}` : "", p.job_id ? `Job ${p.job_id}` : "", item.worker, "ready");
}

function groupStacks(items) {
  const map = new Map();
  for (const item of items) {
    const key = low(item.stack || item.type || item.title).replace(/[^a-z0-9]+/g, "_");
    if (!map.has(key)) map.set(key, { key, title: item.stack || stackFor(item.type), count: 0, first: item });
    map.get(key).count += 1;
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}

export default function MissionBoardDashboard() {
  const { get, post, patch } = useApi();

  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [area, setArea] = useState("now");
  const [selected, setSelected] = useState(null);
  const [handled, setHandled] = useState([]);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState("");
  const [ask, setAsk] = useState("");
  const once = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, s, j, c, i, q] = await Promise.all([
      get("/ai-operator/actions"),
      get("/ai-operator/command-snapshot"),
      get("/jobs"),
      get("/clients"),
      get("/invoices"),
      get("/quotes"),
    ]);

    if (a.success) setActions(arr(a.actions || a.data || a));
    if (s.success) setSnapshot(s.data || s);
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
      if (!quiet) toast.success("Mission board updated");
      await load();
      return true;
    }
    if (!quiet) toast.error(res.error || "AI check failed");
    return false;
  }, [load, post]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const key = "churvox_mission_board_last_scan";
    const last = Number(localStorage.getItem(key) || 0);
    if (!last || Date.now() - last > 10 * 60 * 1000) {
      localStorage.setItem(key, String(Date.now()));
      scan(true);
    }
  }, [scan]);

  const hidden = useMemo(() => new Set(handled), [handled]);

  const nowItems = useMemo(
    () => actions.filter((a) => !hidden.has(idOf(a)) && pendingStatuses.has(low(a.status))).slice(0, 80).map(makeDecision),
    [actions, hidden]
  );

  const jobItems = useMemo(() => jobs.slice(0, 60).map((job) => makeJob(job, "jobs")), [jobs]);

  const moneyItems = useMemo(() => {
    const completedNotInvoiced = jobs
      .filter((j) => ["completed", "done", "complete"].includes(low(j.status)) && !(j.invoice_id || j.draft_invoice_id || j.invoiced))
      .slice(0, 20)
      .map((job) => makeJob(job, "money"));

    const openInvoices = invoices
      .filter((i) => ["draft", "sent", "open", "overdue", "unpaid", "pending", ""].includes(low(i.status)))
      .slice(0, 40)
      .map(makeInvoice);

    return [...completedNotInvoiced, ...openInvoices];
  }, [jobs, invoices]);

  const crewItems = useMemo(
    () => jobs.filter((j) => ["assigned", "scheduled", "in_progress", "in progress", "started"].includes(low(j.status))).slice(0, 60).map((job) => makeJob(job, "crew")),
    [jobs]
  );

  const clientItems = useMemo(() => clients.slice(0, 60).map(makeClient), [clients]);
  const quoteItems = useMemo(() => quotes.slice(0, 60).map(makeQuote), [quotes]);
  const doneItems = useMemo(() => actions.filter((a) => doneStatuses.has(low(a.status))).slice(0, 20).map(makeDecision), [actions]);

  const urgent = snapshot?.urgent || {};
  const boards = { now: nowItems, money: moneyItems, jobs: jobItems, crew: crewItems, clients: clientItems, quotes: quoteItems, done: doneItems };
  const activeItems = boards[area] || [];
  const current = selected && selected.area === area ? selected : activeItems[0];
  const stacks = useMemo(() => groupStacks(nowItems), [nowItems]);

  useEffect(() => {
    setEditOpen(false);
    setEditText(current?.payload?.message || current?.payload?.description || current?.detail || "");
  }, [current?.id, current?.payload?.message, current?.payload?.description, current?.detail]);

  const openArea = (nextArea) => {
    setArea(nextArea);
    setSelected(null);
  };

  const showNow = () => {
    setArea("now");
    setSelected(nowItems[0] || null);
  };

  const approveCurrent = async (item) => {
    if (!item?.rawId) return;
    setBusy(item.rawId);

    const payload = patchFor(item, editOpen ? editText : "");
    if (Object.keys(payload).length) {
      const prep = await patch(`/ai-operator/actions/${item.rawId}`, payload);
      if (!prep.success) {
        setBusy("");
        toast.error(prep.error || "Could not prepare final payload");
        return;
      }
    }

    const res = await post(`/ai-operator/actions/${item.rawId}/approve`, {});
    setBusy("");

    if (res.success) {
      toast.success("Approved. Next move ready.");
      setHandled((prev) => Array.from(new Set([...prev, item.rawId])));
      setActions((prev) => prev.filter((a) => idOf(a) !== item.rawId));
      setSelected(null);
      setEditOpen(false);
      await load();
    } else {
      toast.error(res.error || "Could not approve action");
    }
  };

  const skipCurrent = async (item) => {
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

  const askChurvox = () => {
    const q = low(ask);
    if (!q.trim()) return;
    if (q.includes("money") || q.includes("invoice") || q.includes("paid") || q.includes("payment")) openArea("money");
    else if (q.includes("job") || q.includes("work")) openArea("jobs");
    else if (q.includes("crew") || q.includes("worker") || q.includes("staff")) openArea("crew");
    else if (q.includes("client") || q.includes("customer")) openArea("clients");
    else if (q.includes("quote")) openArea("quotes");
    else if (q.includes("done") || q.includes("history")) openArea("done");
    else showNow();
    toast.message("Mission board changed");
  };

  const lanes = [
    { key: "money", title: "Money", value: nz(urgent.open_invoices_total || 0), hint: "Invoices, drafts, overdue balances", items: moneyItems },
    { key: "jobs", title: "Jobs", value: urgent.unassigned_jobs ?? jobItems.length, hint: "Stuck, scheduled, active, complete", items: jobItems },
    { key: "crew", title: "Crew", value: crewItems.length, hint: "Assigned and active field work", items: crewItems },
    { key: "clients", title: "Clients", value: clientItems.length, hint: "Customer records and context", items: clientItems },
    { key: "quotes", title: "Quotes", value: quoteItems.length, hint: "Quotes waiting for follow-up", items: quoteItems },
  ];

  const topStats = [
    ["NOW", nowItems.length, "moves ready", "now"],
    ["MONEY", nz(urgent.open_invoices_total || 0), `${moneyItems.length} items`, "money"],
    ["JOBS", urgent.unassigned_jobs ?? jobItems.length, "need eyes", "jobs"],
    ["CREW", crewItems.length, "active", "crew"],
  ];

  return (
    <main className="mb" data-version="CHURVOX_MISSION_BOARD_20260524">
      <aside className="mb-brand">
        <div className="mb-brand-mark">CVX</div>
        <div>
          <p>Mission Board</p>
          <strong>Today</strong>
        </div>
      </aside>

      <section className="mb-hero">
        <div>
          <p className="mb-kicker">Churvox Mission Board</p>
          <h1>The day is laid out. Clear the next move.</h1>
          <p>{snapshot?.next_best_move || "Money, jobs, crew and customers stay on the board while Churvox hands you the next admin decision."}</p>
        </div>
        <div className="mb-hero-actions">
          <button onClick={() => scan(false)} disabled={busy === "scan"}>{busy === "scan" ? "Checking…" : "Run AI check"}</button>
          <button className="mb-primary" onClick={showNow}>Review next move</button>
        </div>
      </section>

      <section className="mb-stats">
        {topStats.map(([label, value, hint, target]) => (
          <button key={label} className={area === target ? "active" : ""} onClick={() => openArea(target)}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{hint}</small>
          </button>
        ))}
      </section>

      <section className="mb-layout">
        <section className="mb-map">
          <div className="mb-section-title">
            <p className="mb-kicker">Business board</p>
            <h2>Where work sits right now</h2>
          </div>

          <div className="mb-lanes">
            {lanes.map((lane) => (
              <button key={lane.key} className={`mb-lane ${area === lane.key ? "active" : ""}`} onClick={() => openArea(lane.key)}>
                <div>
                  <span>{lane.title}</span>
                  <strong>{lane.value}</strong>
                </div>
                <p>{lane.hint}</p>
                <ul>
                  {lane.items.slice(0, 3).map((item) => <li key={item.id}>{item.title}</li>)}
                  {!lane.items.length ? <li>No items waiting</li> : null}
                </ul>
              </button>
            ))}
          </div>
        </section>

        <aside className="mb-ticket">
          <div className="mb-ticket-pin">NEXT</div>
          {loading ? (
            <p>Loading Churvox…</p>
          ) : current ? (
            <>
              <div className="mb-ticket-head">
                <p className="mb-kicker">{area === "now" ? "Do this now" : area}</p>
                <span>{current.source}</span>
              </div>
              <h2>{displayTitle(current)}</h2>
              <p className="mb-directive">Approve, edit, or skip. Churvox moves the next task into place.</p>
              <p className="mb-detail">{displayDetail(current)}</p>

              <div className="mb-proof">
                <div><span>Result</span><strong>{outcomeLine(current)}</strong></div>
                <div><span>Record</span><strong>{recordLine(current)}</strong></div>
                <div><span>Risk</span><strong>{current.risk || "low"}</strong></div>
              </div>

              {editOpen ? (
                <label className="mb-editor">
                  <span>Edit before approving</span>
                  <textarea value={editText} onChange={(event) => setEditText(event.target.value)} />
                </label>
              ) : null}

              <div className="mb-ticket-actions">
                {current.rawId ? (
                  <>
                    <button className="mb-primary" onClick={() => approveCurrent(current)} disabled={busy === current.rawId}>
                      {busy === current.rawId ? "Running…" : primaryLabel(current)}
                    </button>
                    <button onClick={() => setEditOpen((value) => !value)}>Edit</button>
                    <button onClick={() => skipCurrent(current)} disabled={busy === current.rawId}>Skip</button>
                  </>
                ) : (
                  <>
                    <button className="mb-primary" onClick={showNow}>Back to NOW</button>
                    <button onClick={() => scan(false)}>Ask AI to prepare</button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="mb-empty">
              <h2>Nothing waiting here.</h2>
              <p>Run an AI check or open another lane.</p>
              <button className="mb-primary" onClick={() => scan(false)}>Run AI check</button>
            </div>
          )}
        </aside>
      </section>

      <section className="mb-bottom">
        <div className="mb-open">
          <div className="mb-section-title">
            <p className="mb-kicker">Open lane</p>
            <h3>{area}</h3>
          </div>
          <div className="mb-card-grid">
            {activeItems.slice(0, 8).map((item) => (
              <button key={item.id} className={current?.id === item.id ? "active" : ""} onClick={() => setSelected(item)}>
                <strong>{item.title}</strong>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-stack">
          <div className="mb-section-title">
            <p className="mb-kicker">AI stack</p>
            <h3>Grouped work</h3>
          </div>
          <div className="mb-card-grid">
            {stacks.length ? stacks.map((stack) => (
              <button key={stack.key} onClick={() => { setArea("now"); setSelected(stack.first); }}>
                <strong>{stack.count} · {stack.title}</strong>
                <span>{stack.first.detail}</span>
              </button>
            )) : <p>No prepared decisions waiting.</p>}
          </div>
        </div>
      </section>

      <section className="mb-ask">
        <input
          value={ask}
          onChange={(event) => setAsk(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") askChurvox(); }}
          placeholder="Ask Churvox… show money waiting, stuck jobs, unassigned crew, client follow-ups"
        />
        <button onClick={askChurvox}>Ask</button>
      </section>
    </main>
  );
}
