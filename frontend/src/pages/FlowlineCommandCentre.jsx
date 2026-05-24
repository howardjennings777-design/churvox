import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import "../styles/churvoxFlowlineCommandCentre.css";

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
  return "AI action";
}

function makeDecision(raw) {
  const payload = raw.payload || raw.draft_payload || {};
  const type = raw.action_type || raw.type || "prepared_action";
  const t = low(type);

  let lane = "inbox";
  if (t.includes("quote")) lane = "quote";
  if (t.includes("assign")) lane = "dispatch";
  if (t.includes("invoice") && !t.includes("reminder")) lane = "bill";
  if (t.includes("reminder")) lane = "pay";

  return {
    id: `decision-${idOf(raw)}`,
    rawId: idOf(raw),
    raw,
    lane,
    source: "AI",
    type,
    label: labelFor(type),
    title: raw.title || raw.summary || "AI action ready",
    detail: raw.recommendation || raw.reason || raw.owner_facing_explanation || raw.summary || "Review, approve, edit, or skip.",
    status: raw.status || "pending",
    risk: raw.risk || raw.risk_level || "low",
    payload,
  };
}

function makeJob(job, lane = "dispatch") {
  return {
    id: `job-${idOf(job)}`,
    raw: job,
    lane,
    source: "Job",
    type: "job",
    label: lane === "bill" ? "Ready to invoice" : "Job",
    title: job.title || job.job_name || job.client_name || "Job",
    detail: job.description || job.address || "Job record",
    status: job.status || "open",
    client: job.client_name || job.customer_name || "Client",
    worker: job.assigned_worker_name || job.worker_name || "Unassigned",
    amount: job.price || job.job_price || job.fixed_price || job.total || job.amount || 0,
    time: job.scheduled_time || job.start_time || job.due_time || job.scheduled_at || "",
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

function makeQuote(quote) {
  return {
    id: `quote-${idOf(quote)}`,
    raw: quote,
    lane: "quote",
    source: "Quote",
    type: "quote",
    label: "Quote",
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
  if (!item) return "No action selected";

  const p = item.payload || {};
  const type = low(item.type || "");
  const client = first(p.client_name, p.customer_name, p.client, item.client);

  if (type.includes("invoice_reminder")) return `Send reminder${client ? ` to ${client}` : ""}`;
  if (["create_invoice_draft", "invoice_draft"].includes(type)) return `Create invoice${client ? ` for ${client}` : ""}`;
  if (type.includes("assign")) return "Assign crew to job";
  if (type.includes("quote")) return `Follow up quote${client ? ` for ${client}` : ""}`;
  if (type.includes("customer")) return `Update customer${client ? ` ${client}` : ""}`;
  return item.title || "AI action ready";
}

function displayDetail(item) {
  if (!item) return "Run an AI check or open a Flowline station.";

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
  if (type.includes("invoice_reminder")) return "Approve & send";
  if (["create_invoice_draft", "invoice_draft"].includes(type)) return "Approve invoice";
  if (type.includes("assign")) return "Approve assignment";
  if (type.includes("quote")) return "Approve follow-up";
  if (type.includes("customer")) return "Approve update";
  return "Approve";
}

function outcomeLine(item) {
  const type = low(item?.type || "");
  if (type.includes("invoice_reminder")) return "Reminder sends";
  if (["create_invoice_draft", "invoice_draft"].includes(type)) return "Draft invoice created";
  if (type.includes("assign")) return "Crew assignment saved";
  if (type.includes("quote")) return "Follow-up prepared";
  if (type.includes("customer")) return "Customer update prepared";
  return item?.rawId ? "Action runs" : "Open in Flowline";
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

function groupByWorker(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.worker || "Unassigned";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }

  return [...map.entries()]
    .map(([worker, jobs]) => ({ worker, jobs }))
    .sort((a, b) => {
      if (a.worker === "Unassigned") return -1;
      if (b.worker === "Unassigned") return 1;
      return b.jobs.length - a.jobs.length;
    })
    .slice(0, 6);
}

function groupByLabel(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.label || item.type || "Work";
    if (!map.has(key)) map.set(key, { title: key, count: 0, first: item });
    map.get(key).count += 1;
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 6);
}

export default function FlowlineCommandCentre() {
  const { get, post, patch } = useApi();

  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [snapshot, setSnapshot] = useState(null);

  const [station, setStation] = useState("inbox");
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
      if (!quiet) toast.success("Flowline updated");
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

    const key = "churvox_flowline_last_scan";
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

  const dispatchJobs = useMemo(
    () => jobs
      .filter((j) => ["scheduled", "assigned", "booked"].includes(low(j.status)))
      .slice(0, 50)
      .map((job) => makeJob(job, "dispatch")),
    [jobs]
  );

  const fieldJobs = useMemo(
    () => jobs
      .filter((j) => ["in_progress", "in progress", "started", "paused"].includes(low(j.status)))
      .slice(0, 50)
      .map((job) => makeJob(job, "field")),
    [jobs]
  );

  const readyBillJobs = useMemo(
    () => jobs
      .filter((j) => ["completed", "done", "complete"].includes(low(j.status)) && !(j.invoice_id || j.draft_invoice_id || j.invoiced))
      .slice(0, 40)
      .map((job) => makeJob(job, "bill")),
    [jobs]
  );

  const waitingPay = useMemo(
    () => invoices
      .filter((i) => ["sent", "open", "overdue", "unpaid", "pending", ""].includes(low(i.status)))
      .slice(0, 50)
      .map(makeInvoice),
    [invoices]
  );

  const inboxItems = useMemo(() => decisions.filter((d) => d.lane === "inbox"), [decisions]);
  const quoteStation = useMemo(() => [...quoteItems, ...decisions.filter((d) => d.lane === "quote")], [quoteItems, decisions]);
  const dispatchStation = useMemo(() => [...dispatchJobs, ...decisions.filter((d) => d.lane === "dispatch")], [dispatchJobs, decisions]);
  const fieldStation = fieldJobs;
  const billStation = useMemo(() => [...readyBillJobs, ...decisions.filter((d) => d.lane === "bill")], [readyBillJobs, decisions]);
  const payStation = useMemo(() => [...waitingPay, ...decisions.filter((d) => d.lane === "pay")], [waitingPay, decisions]);

  const stations = {
    inbox: inboxItems,
    quote: quoteStation,
    dispatch: dispatchStation,
    field: fieldStation,
    bill: billStation,
    pay: payStation,
  };

  const activeItems = stations[station] || [];
  const current = selected && selected.lane === station ? selected : decisions[0] || activeItems[0];
  const dispatchRows = useMemo(() => groupByWorker([...dispatchJobs, ...fieldJobs]), [dispatchJobs, fieldJobs]);
  const grouped = useMemo(() => groupByLabel(decisions), [decisions]);

  useEffect(() => {
    setEditOpen(false);
    setEditText(current?.payload?.message || current?.payload?.description || current?.detail || "");
  }, [current?.id, current?.payload?.message, current?.payload?.description, current?.detail]);

  const openStation = (nextStation) => {
    setStation(nextStation);
    setSelected(null);
  };

  const reviewNext = () => {
    setStation("inbox");
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
      toast.success("Approved. Next action is ready.");
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
    if (q.includes("quote")) openStation("quote");
    else if (q.includes("dispatch") || q.includes("schedule") || q.includes("crew")) openStation("dispatch");
    else if (q.includes("field") || q.includes("active")) openStation("field");
    else if (q.includes("invoice") || q.includes("bill")) openStation("bill");
    else if (q.includes("pay") || q.includes("overdue")) openStation("pay");
    else reviewNext();

    toast.message("Flowline moved");
  };

  const openTotal = invoices.reduce((sum, invoice) => {
    if (["sent", "open", "overdue", "unpaid", "pending", ""].includes(low(invoice.status))) {
      return sum + Number(invoice.balance_due || invoice.balance || invoice.total || invoice.amount || 0);
    }
    return sum;
  }, 0);

  const stationConfig = [
    { key: "inbox", title: "Inbox", sub: "AI actions", items: inboxItems },
    { key: "quote", title: "Quote", sub: "Win work", items: quoteStation },
    { key: "dispatch", title: "Dispatch", sub: "Book crew", items: dispatchStation },
    { key: "field", title: "Field", sub: "Work happening", items: fieldStation },
    { key: "bill", title: "Bill", sub: "Ready invoice", items: billStation },
    { key: "pay", title: "Pay", sub: "Chase money", items: payStation },
  ];

  return (
    <main className="flc" data-version="CHURVOX_FLOWLINE_COMMAND_CENTRE_20260524">
      <nav className="flc-rail" aria-label="Churvox areas">
        <div className="flc-mark">C</div>
        {stationConfig.map((s) => (
          <button key={s.key} className={station === s.key ? "active" : ""} onClick={() => openStation(s.key)}>
            {s.title.slice(0, 1)}
          </button>
        ))}
      </nav>

      <header className="flc-topbar">
        <div>
          <p>CHURVOX FLOWLINE</p>
          <strong>Work enters → crew moves → invoice prepared → payment chased</strong>
        </div>
        <div className="flc-pulse">
          <span>{decisions.length} AI</span>
          <span>{dispatchJobs.length + fieldJobs.length} jobs moving</span>
          <span>{billStation.length} ready bill</span>
          <span>{nz(openTotal)} waiting</span>
        </div>
        <div className="flc-actions">
          <button onClick={() => scan(false)} disabled={busy === "scan"}>{busy === "scan" ? "Checking…" : "Run AI"}</button>
          <button className="primary" onClick={reviewNext}>Review next</button>
        </div>
      </header>

      <section className="flc-flow">
        <div className="flc-flow-head">
          <div>
            <p className="flc-kicker">Live Flowline</p>
            <h1>Run the day from the line.</h1>
          </div>
          <p>{snapshot?.next_best_move || "Each station shows where work is sitting. The AI tape on the right prepares the next admin move."}</p>
        </div>

        <div className="flc-track">
          <div className="flc-line" />
          {stationConfig.map((s, index) => (
            <button key={s.key} className={`flc-station ${station === s.key ? "active" : ""}`} onClick={() => openStation(s.key)}>
              <span className="flc-dot">{index + 1}</span>
              <strong>{s.title}</strong>
              <small>{s.sub}</small>
              <em>{s.items.length}</em>
            </button>
          ))}
        </div>

        <div className="flc-station-list">
          {activeItems.slice(0, 8).map((item) => (
            <button key={item.id} className={current?.id === item.id ? "active" : ""} onClick={() => setSelected(item)}>
              <span>{item.label}</span>
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
            </button>
          ))}
          {!activeItems.length ? <div className="flc-empty-line">No items sitting in this station.</div> : null}
        </div>
      </section>

      <aside className="flc-ai">
        <div className="flc-ai-status"><i /> AI OPERATOR TAPE</div>

        {loading ? (
          <p className="flc-detail">Loading Churvox…</p>
        ) : current ? (
          <>
            <div className="flc-ai-head">
              <span>{current.source}</span>
              <h2>{displayTitle(current)}</h2>
            </div>

            <p className="flc-directive">Approve it, edit it, or skip it. Churvox moves the next admin step into place.</p>
            <p className="flc-detail">{displayDetail(current)}</p>

            <div className="flc-facts">
              <div><span>Result</span><strong>{outcomeLine(current)}</strong></div>
              <div><span>Record</span><strong>{recordLine(current)}</strong></div>
              <div><span>Risk</span><strong>{current.risk || "low"}</strong></div>
            </div>

            {editOpen ? (
              <label className="flc-editor">
                <span>Edit before approving</span>
                <textarea value={editText} onChange={(event) => setEditText(event.target.value)} />
              </label>
            ) : null}

            <div className="flc-ai-actions">
              {current.rawId ? (
                <>
                  <button className="primary" onClick={() => approveCurrent(current)} disabled={busy === current.rawId}>
                    {busy === current.rawId ? "Running…" : primaryLabel(current)}
                  </button>
                  <button onClick={() => setEditOpen((value) => !value)}>Edit</button>
                  <button onClick={() => skipCurrent(current)} disabled={busy === current.rawId}>Skip</button>
                </>
              ) : (
                <>
                  <button className="primary" onClick={reviewNext}>Back to AI actions</button>
                  <button onClick={() => scan(false)}>Ask AI to prepare</button>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flc-ai-empty">
            <h2>Nothing waiting.</h2>
            <p>Run AI or open another Flowline station.</p>
            <button className="primary" onClick={() => scan(false)}>Run AI</button>
          </div>
        )}

        <div className="flc-ai-stack">
          <p className="flc-kicker">Prepared stack</p>
          {grouped.length ? grouped.map((g) => (
            <button key={g.title} onClick={() => { openStation(g.first.lane || "inbox"); setSelected(g.first); }}>
              <strong>{g.count}</strong>
              <span>{g.title}</span>
            </button>
          )) : <span>No AI stack waiting.</span>}
        </div>
      </aside>

      <section className="flc-crew">
        <div className="flc-crew-head">
          <div>
            <p className="flc-kicker">Crew Timeline</p>
            <h3>Who is moving today</h3>
          </div>
          <button onClick={() => openStation("dispatch")}>Open dispatch</button>
        </div>

        <div className="flc-timeline">
          <div className="flc-time-head">Crew</div>
          <div className="flc-time-head">Morning</div>
          <div className="flc-time-head">Midday</div>
          <div className="flc-time-head">Afternoon</div>

          {dispatchRows.length ? dispatchRows.map((row) => (
            <React.Fragment key={row.worker}>
              <div className="flc-worker-name">
                <strong>{row.worker}</strong>
                <span>{row.jobs.length} jobs</span>
              </div>
              {[0, 1, 2].map((slot) => (
                <div key={`${row.worker}-${slot}`} className="flc-time-cell">
                  {row.jobs.filter((_, index) => index % 3 === slot).slice(0, 2).map((job) => (
                    <button key={job.id} onClick={() => { openStation(job.lane || "dispatch"); setSelected(job); }}>
                      {job.title}
                    </button>
                  ))}
                </div>
              ))}
            </React.Fragment>
          )) : (
            <div className="flc-no-crew">No scheduled or active crew work loaded yet.</div>
          )}
        </div>
      </section>

      <section className="flc-command">
        <input
          value={ask}
          onChange={(event) => setAsk(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") askChurvox(); }}
          placeholder="Ask Churvox… show dispatch, ready to bill, overdue invoices, field jobs"
        />
        <button onClick={askChurvox}>Ask</button>
      </section>
    </main>
  );
}
