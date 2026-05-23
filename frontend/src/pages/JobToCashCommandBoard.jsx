import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

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
  return "AI move";
}

function makeDecision(raw) {
  const payload = raw.payload || raw.draft_payload || {};
  const type = raw.action_type || raw.type || "prepared_action";

  return {
    id: `decision-${idOf(raw)}`,
    rawId: idOf(raw),
    raw,
    lane: "needs",
    source: "AI",
    type,
    label: labelFor(type),
    title: raw.title || raw.summary || "AI decision ready",
    detail: raw.recommendation || raw.reason || raw.owner_facing_explanation || raw.summary || "Review, approve, edit, or skip.",
    status: raw.status || "pending",
    risk: raw.risk || raw.risk_level || "low",
    payload,
  };
}

function makeJob(job, lane = "scheduled") {
  return {
    id: `job-${idOf(job)}`,
    raw: job,
    lane,
    source: "Job",
    type: "job",
    label: lane === "bill" ? "Ready to bill" : "Job",
    title: job.title || job.job_name || job.client_name || "Job",
    detail: job.description || job.address || "Job record",
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
    lane: "pay",
    source: "Invoice",
    type: "invoice",
    label: "Invoice",
    title: `${invoice.customer_name || invoice.client_name || "Client"} · ${nz(invoice.balance_due || invoice.balance || invoice.total || invoice.amount)}`,
    detail: invoice.description || "Invoice waiting for payment or follow-up.",
    status: invoice.status || "open",
    client: invoice.customer_name || invoice.client_name || "Client",
    amount: invoice.balance_due || invoice.balance || invoice.total || invoice.amount || 0,
  };
}

function makeClient(client) {
  return {
    id: `client-${idOf(client)}`,
    raw: client,
    lane: "customers",
    source: "Client",
    type: "client",
    label: "Client",
    title: client.name || client.client_name || client.customer_name || "Client",
    detail: client.email || client.phone || client.address || "Client record",
    status: client.status || "active",
    client: client.name || client.client_name || client.customer_name || "Client",
  };
}

function makeQuote(quote) {
  return {
    id: `quote-${idOf(quote)}`,
    raw: quote,
    lane: "needs",
    source: "Quote",
    type: "quote",
    label: "Quote follow-up",
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
  if (!item) return "No decision selected";

  const p = item.payload || {};
  const type = low(item.type || "");
  const client = first(p.client_name, p.customer_name, p.client, item.client);

  if (type.includes("invoice_reminder")) return `Send payment reminder${client ? ` to ${client}` : ""}`;
  if (["create_invoice_draft", "invoice_draft"].includes(type)) return `Create invoice draft${client ? ` for ${client}` : ""}`;
  if (type.includes("assign")) return "Assign crew to a waiting job";
  if (type.includes("quote")) return `Follow up quote${client ? ` for ${client}` : ""}`;
  if (type.includes("customer")) return `Send customer update${client ? ` to ${client}` : ""}`;

  return item.title || "AI decision ready";
}

function displayDetail(item) {
  if (!item) return "Run an AI check or choose a board lane.";

  const p = item.payload || {};
  const type = low(item.type || "");
  const client = first(p.client_name, p.customer_name, p.client, item.client);
  const amount = first(p.amount_due, p.balance_due, p.amount, p.total, item.amount);
  const days = first(p.days_overdue, p.overdue_days, p.invoice_age_days);
  const invoice = first(p.invoice_number, p.invoice_ref, p.invoice_id);

  if (type.includes("invoice_reminder")) {
    const parts = [];
    if (invoice) parts.push(`Invoice ${invoice}`);
    if (days) parts.push(`${days} days overdue`);
    if (amount) parts.push(`${nz(amount)} due`);
    if (client) parts.push(client);
    return `${parts.length ? `${parts.join(" · ")}. ` : ""}Churvox drafted the reminder. Nothing sends until you approve.`;
  }

  if (["create_invoice_draft", "invoice_draft"].includes(type)) {
    const parts = [];
    if (client) parts.push(client);
    if (amount) parts.push(nz(amount));
    if (p.job_id) parts.push("linked to completed job");
    return `${parts.length ? `${parts.join(" · ")}. ` : ""}Approve to create the draft invoice.`;
  }

  return item.detail || "Review this move, then approve, edit, or skip.";
}

function primaryLabel(item) {
  const type = low(item?.type || "");
  if (type.includes("invoice_reminder")) return "Approve & send reminder";
  if (["create_invoice_draft", "invoice_draft"].includes(type)) return "Approve invoice draft";
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
  if (!item) return "Ready";
  const p = item.payload || {};
  return first(
    p.client_name,
    p.customer_name,
    item.client,
    p.invoice_number ? `Invoice ${p.invoice_number}` : "",
    p.job_id ? `Job ${p.job_id}` : "",
    item.worker,
    "Ready"
  );
}

function groupByLabel(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.label || item.type || "Work";
    if (!map.has(key)) map.set(key, { title: key, count: 0, first: item });
    map.get(key).count += 1;
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}

export default function JobToCashCommandBoard() {
  const { get, post, patch } = useApi();

  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [snapshot, setSnapshot] = useState(null);

  const [lane, setLane] = useState("needs");
  const [selected, setSelected] = useState(null);
  const [handled, setHandled] = useState([]);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState("");
  const [ask, setAsk] = useState("");
  const scanned = useRef(false);

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
      if (!quiet) toast.success("Command board updated");
      await load();
      return true;
    }

    if (!quiet) toast.error(res.error || "AI check failed");
    return false;
  }, [load, post]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (scanned.current) return;
    scanned.current = true;

    const key = "churvox_job_to_cash_last_scan";
    const last = Number(localStorage.getItem(key) || 0);

    if (!last || Date.now() - last > 10 * 60 * 1000) {
      localStorage.setItem(key, String(Date.now()));
      scan(true);
    }
  }, [scan]);

  const hidden = useMemo(() => new Set(handled), [handled]);

  const decisions = useMemo(
    () => actions
      .filter((a) => !hidden.has(idOf(a)) && pendingStatuses.has(low(a.status)))
      .slice(0, 80)
      .map(makeDecision),
    [actions, hidden]
  );

  const quoteItems = useMemo(() => quotes.slice(0, 30).map(makeQuote), [quotes]);

  const scheduledJobs = useMemo(
    () => jobs
      .filter((j) => ["scheduled", "assigned", "booked"].includes(low(j.status)))
      .slice(0, 40)
      .map((job) => makeJob(job, "scheduled")),
    [jobs]
  );

  const fieldJobs = useMemo(
    () => jobs
      .filter((j) => ["in_progress", "in progress", "started", "paused"].includes(low(j.status)))
      .slice(0, 40)
      .map((job) => makeJob(job, "field")),
    [jobs]
  );

  const readyBillJobs = useMemo(
    () => jobs
      .filter((j) => ["completed", "done", "complete"].includes(low(j.status)) && !(j.invoice_id || j.draft_invoice_id || j.invoiced))
      .slice(0, 30)
      .map((job) => makeJob(job, "bill")),
    [jobs]
  );

  const waitingPay = useMemo(
    () => invoices
      .filter((i) => ["sent", "open", "overdue", "unpaid", "pending", ""].includes(low(i.status)))
      .slice(0, 40)
      .map(makeInvoice),
    [invoices]
  );

  const clientItems = useMemo(() => clients.slice(0, 40).map(makeClient), [clients]);

  const doneItems = useMemo(
    () => actions
      .filter((a) => doneStatuses.has(low(a.status)))
      .slice(0, 20)
      .map(makeDecision),
    [actions]
  );

  const needsItems = useMemo(
    () => [...decisions, ...quoteItems].slice(0, 80),
    [decisions, quoteItems]
  );

  const lanes = {
    needs: needsItems,
    scheduled: scheduledJobs,
    field: fieldJobs,
    bill: readyBillJobs,
    pay: waitingPay,
    customers: clientItems,
    done: doneItems,
  };

  const activeItems = lanes[lane] || [];
  const current = selected && selected.lane === lane ? selected : (lane === "needs" ? decisions[0] || activeItems[0] : activeItems[0]);
  const grouped = useMemo(() => groupByLabel(decisions), [decisions]);

  useEffect(() => {
    setEditOpen(false);
    setEditText(current?.payload?.message || current?.payload?.description || current?.detail || "");
  }, [current?.id, current?.payload?.message, current?.payload?.description, current?.detail]);

  const openLane = (nextLane) => {
    setLane(nextLane);
    setSelected(null);
  };

  const reviewNext = () => {
    setLane("needs");
    setSelected(decisions[0] || null);
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
      toast.success("Approved. Next decision is ready.");
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
    if (q.includes("money") || q.includes("invoice") || q.includes("bill")) openLane("bill");
    else if (q.includes("pay") || q.includes("overdue")) openLane("pay");
    else if (q.includes("field") || q.includes("active")) openLane("field");
    else if (q.includes("schedule") || q.includes("today")) openLane("scheduled");
    else if (q.includes("client") || q.includes("customer")) openLane("customers");
    else reviewNext();

    toast.message("Command board changed");
  };

  const openTotal = invoices.reduce((sum, invoice) => {
    if (["sent", "open", "overdue", "unpaid", "pending", ""].includes(low(invoice.status))) {
      return sum + Number(invoice.balance_due || invoice.balance || invoice.total || invoice.amount || 0);
    }
    return sum;
  }, 0);

  const pulse = [
    ["AI decisions", decisions.length, "ready", "needs"],
    ["Jobs attention", needsItems.length + scheduledJobs.length, "to review", "needs"],
    ["Ready to bill", readyBillJobs.length, nz(readyBillJobs.reduce((s, j) => s + Number(j.amount || 0), 0)), "bill"],
    ["Waiting pay", waitingPay.length, nz(openTotal), "pay"],
    ["In field", fieldJobs.length, "active", "field"],
  ];

  const boardLanes = [
    { key: "needs", title: "Needs Action", hint: "AI decisions, unassigned work, quote follow-ups.", items: needsItems },
    { key: "scheduled", title: "Scheduled", hint: "Booked jobs and crew commitments.", items: scheduledJobs },
    { key: "field", title: "In Field", hint: "Active jobs, pauses, photos, notes and time.", items: fieldJobs },
    { key: "bill", title: "Ready to Bill", hint: "Completed jobs and invoice drafts.", items: readyBillJobs },
    { key: "pay", title: "Waiting Pay", hint: "Open invoices and payment reminders.", items: waitingPay },
  ];

  return (
    <main className="jtc" data-version="CHURVOX_JOB_TO_CASH_COMMAND_BOARD_20260524">
      <section className="jtc-top">
        <div>
          <p className="jtc-kicker">Churvox Command Board</p>
          <h1>Job-to-cash, live.</h1>
          <p>{snapshot?.next_best_move || "See the workflow from action → schedule → field → bill → payment. Churvox prepares the admin. You approve."}</p>
        </div>

        <div className="jtc-top-actions">
          <button onClick={() => scan(false)} disabled={busy === "scan"}>{busy === "scan" ? "Checking…" : "Run AI check"}</button>
          <button className="jtc-primary" onClick={reviewNext}>Review next</button>
        </div>
      </section>

      <section className="jtc-pulse">
        {pulse.map(([label, value, note, target]) => (
          <button key={label} className={lane === target ? "active" : ""} onClick={() => openLane(target)}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </button>
        ))}
      </section>

      <section className="jtc-layout">
        <section className="jtc-board">
          <div className="jtc-board-head">
            <div>
              <p className="jtc-kicker">Live workflow board</p>
              <h2>Where the business sits right now</h2>
            </div>
            <div className="jtc-live"><i /> AI operator live</div>
          </div>

          <div className="jtc-lanes">
            {boardLanes.map((boardLane) => (
              <button key={boardLane.key} className={`jtc-lane ${lane === boardLane.key ? "active" : ""}`} onClick={() => openLane(boardLane.key)}>
                <div className="jtc-lane-head">
                  <span>{boardLane.title}</span>
                  <strong>{boardLane.items.length}</strong>
                </div>
                <p>{boardLane.hint}</p>
                <div className="jtc-mini-list">
                  {boardLane.items.slice(0, 4).map((item) => <em key={item.id}>{item.title}</em>)}
                  {!boardLane.items.length ? <em>No items waiting</em> : null}
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="jtc-desk">
          <div className="jtc-desk-head">
            <div>
              <p className="jtc-kicker">AI Operator Desk</p>
              <h2>{current ? displayTitle(current) : "Nothing waiting here."}</h2>
            </div>
            <span>{current?.source || "Board"}</span>
          </div>

          {loading ? (
            <p className="jtc-detail">Loading Churvox…</p>
          ) : current ? (
            <>
              <p className="jtc-directive">Do this now: approve, edit, or skip. Churvox moves the next admin step into place.</p>
              <p className="jtc-detail">{displayDetail(current)}</p>

              <div className="jtc-facts">
                <div><span>Result</span><strong>{outcomeLine(current)}</strong></div>
                <div><span>Record</span><strong>{recordLine(current)}</strong></div>
                <div><span>Risk</span><strong>{current.risk || "low"}</strong></div>
              </div>

              {editOpen ? (
                <label className="jtc-editor">
                  <span>Edit before approving</span>
                  <textarea value={editText} onChange={(event) => setEditText(event.target.value)} />
                </label>
              ) : null}

              <div className="jtc-desk-actions">
                {current.rawId ? (
                  <>
                    <button className="jtc-primary" onClick={() => approveCurrent(current)} disabled={busy === current.rawId}>
                      {busy === current.rawId ? "Running…" : primaryLabel(current)}
                    </button>
                    <button onClick={() => setEditOpen((value) => !value)}>Edit first</button>
                    <button onClick={() => skipCurrent(current)} disabled={busy === current.rawId}>Skip</button>
                  </>
                ) : (
                  <>
                    <button className="jtc-primary" onClick={reviewNext}>Back to AI decisions</button>
                    <button onClick={() => scan(false)}>Ask AI to prepare</button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="jtc-empty">
              <h3>Nothing waiting here.</h3>
              <p>Run an AI check or open another workflow lane.</p>
              <button className="jtc-primary" onClick={() => scan(false)}>Run AI check</button>
            </div>
          )}
        </aside>
      </section>

      <section className="jtc-lower">
        <div className="jtc-panel">
          <div>
            <p className="jtc-kicker">Open lane</p>
            <h3>{lane}</h3>
          </div>
          <div className="jtc-card-grid">
            {activeItems.slice(0, 10).map((item) => (
              <button key={item.id} className={current?.id === item.id ? "active" : ""} onClick={() => setSelected(item)}>
                <strong>{item.title}</strong>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="jtc-panel">
          <div>
            <p className="jtc-kicker">Prepared by AI</p>
            <h3>Grouped admin work</h3>
          </div>
          <div className="jtc-stack-grid">
            {grouped.length ? grouped.map((stack) => (
              <button key={stack.title} onClick={() => { setLane("needs"); setSelected(stack.first); }}>
                <strong>{stack.count} · {stack.title}</strong>
                <span>{stack.first.detail}</span>
              </button>
            )) : <p>No prepared decisions waiting.</p>}
          </div>
        </div>
      </section>

      <section className="jtc-strip">
        <div><strong>Crew</strong><span>{crewSummary(fieldJobs, scheduledJobs)}</span></div>
        <div><strong>Money</strong><span>{nz(openTotal)} waiting · {readyBillJobs.length} ready to bill · {waitingPay.length} open invoices</span></div>
      </section>

      <section className="jtc-ask">
        <input
          value={ask}
          onChange={(event) => setAsk(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") askChurvox(); }}
          placeholder="Ask Churvox… show jobs ready to invoice, overdue invoices, active field jobs, today’s schedule"
        />
        <button onClick={askChurvox}>Ask</button>
      </section>
    </main>
  );
}

function crewSummary(fieldJobs, scheduledJobs) {
  const names = [...fieldJobs, ...scheduledJobs]
    .map((j) => j.worker)
    .filter(Boolean)
    .filter((v) => v !== "Unassigned");

  if (!names.length) return "No crew activity loaded yet";

  const counts = names.reduce((acc, name) => {
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).slice(0, 4).map(([name, count]) => `${name} ${count}`).join(" · ");
}
