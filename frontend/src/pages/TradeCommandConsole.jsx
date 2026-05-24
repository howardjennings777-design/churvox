import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import "../styles/churvoxTradeCommandConsole.css";

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
const money = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
const first = (...values) => values.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
const pending = new Set(["", "pending", "ready", "edited", "draft", "watching"]);

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
  return "AI action";
}

function actionLane(type = "") {
  const t = low(type);
  if (t.includes("reminder")) return "pay";
  if (t.includes("invoice")) return "bill";
  if (t.includes("assign")) return "schedule";
  return "action";
}

function makeAction(raw) {
  const payload = raw.payload || raw.draft_payload || {};
  const type = raw.action_type || raw.type || "prepared_action";
  return {
    id: `ai-${idOf(raw)}`,
    rawId: idOf(raw),
    raw,
    lane: actionLane(type),
    source: "AI",
    type,
    label: actionLabel(type),
    title: raw.title || raw.summary || "AI action ready",
    detail: raw.recommendation || raw.reason || raw.owner_facing_explanation || raw.summary || "Review, approve, edit, or skip.",
    status: raw.status || "pending",
    risk: raw.risk || raw.risk_level || "low",
    payload,
  };
}

function makeJob(job) {
  const status = low(job.status);
  let lane = "schedule";
  if (!job.assigned_worker_id && !job.assigned_worker_name && !job.worker_name) lane = "action";
  if (["in_progress", "in progress", "started", "paused"].includes(status)) lane = "field";
  if (["completed", "done", "complete"].includes(status) && !(job.invoice_id || job.draft_invoice_id || job.invoiced)) lane = "bill";

  return {
    id: `job-${idOf(job)}`,
    raw: job,
    lane,
    source: "Job",
    type: "job",
    label: lane === "bill" ? "Ready to bill" : "Job",
    title: job.title || job.job_name || job.client_name || "Job",
    detail: job.address || job.description || "Job record",
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
    label: "Waiting payment",
    title: `${invoice.customer_name || invoice.client_name || "Client"} · ${money(invoice.balance_due || invoice.balance || invoice.total || invoice.amount)}`,
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
    lane: "action",
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

function titleFor(item) {
  if (!item) return "Nothing waiting.";

  const p = item.payload || {};
  const type = low(item.type || "");
  const client = first(p.client_name, p.customer_name, p.client, item.client);

  if (type.includes("invoice_reminder")) return `Send payment reminder${client ? ` to ${client}` : ""}`;
  if (["create_invoice_draft", "invoice_draft"].includes(type)) return `Create invoice${client ? ` for ${client}` : ""}`;
  if (type.includes("assign")) return "Assign crew to job";
  if (type.includes("quote")) return `Follow up quote${client ? ` for ${client}` : ""}`;
  if (type.includes("customer")) return `Update customer${client ? ` ${client}` : ""}`;
  return item.title || "Review this item";
}

function detailFor(item) {
  if (!item) return "Run AI or choose a lane.";

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
    if (amount) bits.push(`${money(amount)} due`);
    if (client) bits.push(client);
    return `${bits.length ? `${bits.join(" · ")}. ` : ""}Churvox drafted the reminder. Nothing sends until you approve.`;
  }

  if (["create_invoice_draft", "invoice_draft"].includes(type)) {
    const bits = [];
    if (client) bits.push(client);
    if (amount) bits.push(money(amount));
    if (p.job_id) bits.push("linked to completed job");
    return `${bits.length ? `${bits.join(" · ")}. ` : ""}Approve to create the draft invoice.`;
  }

  return item.detail || "Review this item.";
}

function primaryText(item) {
  const type = low(item?.type || "");
  if (type.includes("invoice_reminder")) return "Approve & send";
  if (["create_invoice_draft", "invoice_draft"].includes(type)) return "Approve invoice";
  if (type.includes("assign")) return "Approve assignment";
  if (type.includes("quote")) return "Approve follow-up";
  if (type.includes("customer")) return "Approve update";
  return "Approve";
}

function resultFor(item) {
  const type = low(item?.type || "");
  if (type.includes("invoice_reminder")) return "Reminder sends";
  if (["create_invoice_draft", "invoice_draft"].includes(type)) return "Draft invoice created";
  if (type.includes("assign")) return "Crew assignment saved";
  if (type.includes("quote")) return "Follow-up prepared";
  if (type.includes("customer")) return "Customer update prepared";
  return item?.rawId ? "Action runs" : "View item";
}

function recordFor(item) {
  if (!item) return "Ready";
  const p = item.payload || {};
  return first(p.client_name, p.customer_name, item.client, p.invoice_number ? `Invoice ${p.invoice_number}` : "", p.job_id ? `Job ${p.job_id}` : "", item.worker, "Ready");
}

function groupByWorker(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.worker || "Unassigned";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return [...map.entries()].map(([worker, jobs]) => ({ worker, jobs })).slice(0, 7);
}

export default function TradeCommandConsole() {
  const { get, post, patch } = useApi();

  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [lane, setLane] = useState("action");
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

    const [a, s, j, i, q] = await Promise.all([
      get("/ai-operator/actions"),
      get("/ai-operator/command-snapshot"),
      get("/jobs"),
      get("/invoices"),
      get("/quotes"),
    ]);

    if (a.success) setActions(arr(a.actions || a.data || a));
    if (s.success) setSnapshot(s.data || s);
    if (j.success) setJobs(arr(j.data || j));
    if (i.success) setInvoices(arr(i.data || i));
    if (q.success) setQuotes(arr(q.data || q));

    setLoading(false);
  }, [get]);

  const runAI = useCallback(async (quiet = false) => {
    setBusy("scan");
    const res = await post("/ai/operator/run-daily-check", {});
    setBusy("");

    if (res.success) {
      if (!quiet) toast.success("Command Console updated");
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

    const key = "churvox_trade_console_last_scan";
    const last = Number(localStorage.getItem(key) || 0);

    if (!last || Date.now() - last > 10 * 60 * 1000) {
      localStorage.setItem(key, String(Date.now()));
      runAI(true);
    }
  }, [runAI]);

  const hidden = useMemo(() => new Set(handled), [handled]);

  const aiItems = useMemo(
    () => actions.filter((a) => !hidden.has(idOf(a)) && pending.has(low(a.status))).slice(0, 80).map(makeAction),
    [actions, hidden]
  );

  const jobItems = useMemo(() => jobs.slice(0, 80).map(makeJob), [jobs]);
  const quoteItems = useMemo(() => quotes.slice(0, 30).map(makeQuote), [quotes]);
  const invoiceItems = useMemo(() => invoices.filter((i) => ["sent", "open", "overdue", "unpaid", "pending", ""].includes(low(i.status))).slice(0, 50).map(makeInvoice), [invoices]);

  const actionItems = useMemo(() => [...aiItems.filter((i) => i.lane === "action"), ...jobItems.filter((i) => i.lane === "action"), ...quoteItems], [aiItems, jobItems, quoteItems]);
  const scheduleItems = useMemo(() => [...jobItems.filter((i) => i.lane === "schedule"), ...aiItems.filter((i) => i.lane === "schedule")], [jobItems, aiItems]);
  const fieldItems = useMemo(() => jobItems.filter((i) => i.lane === "field"), [jobItems]);
  const billItems = useMemo(() => [...jobItems.filter((i) => i.lane === "bill"), ...aiItems.filter((i) => i.lane === "bill")], [jobItems, aiItems]);
  const payItems = useMemo(() => [...invoiceItems, ...aiItems.filter((i) => i.lane === "pay")], [invoiceItems, aiItems]);

  const lanes = {
    action: actionItems,
    schedule: scheduleItems,
    field: fieldItems,
    bill: billItems,
    pay: payItems,
  };

  const laneItems = lanes[lane] || [];
  const current = selected || aiItems[0] || laneItems[0] || null;
  const crewRows = useMemo(() => groupByWorker([...scheduleItems, ...fieldItems]), [scheduleItems, fieldItems]);

  const openTotal = invoiceItems.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const readyBillTotal = billItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  useEffect(() => {
    setEditOpen(false);
    setEditText(current?.payload?.message || current?.payload?.description || current?.detail || "");
  }, [current?.id, current?.payload?.message, current?.payload?.description, current?.detail]);

  const openLane = (nextLane) => {
    setLane(nextLane);
    setSelected(null);
  };

  const reviewNext = () => {
    setLane("action");
    setSelected(aiItems[0] || null);
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
      toast.success("Approved. Next action ready.");
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
    if (q.includes("schedule") || q.includes("crew") || q.includes("dispatch")) openLane("schedule");
    else if (q.includes("field") || q.includes("active")) openLane("field");
    else if (q.includes("invoice") || q.includes("bill")) openLane("bill");
    else if (q.includes("pay") || q.includes("overdue")) openLane("pay");
    else reviewNext();

    toast.message("Console changed");
  };

  const laneConfig = [
    ["action", "Action", actionItems.length, "AI + issues"],
    ["schedule", "Schedule", scheduleItems.length, "crew booked"],
    ["field", "Field", fieldItems.length, "active work"],
    ["bill", "Bill", billItems.length, money(readyBillTotal)],
    ["pay", "Pay", payItems.length, money(openTotal)],
  ];

  return (
    <main className="tcc" data-version="CHURVOX_TRADE_COMMAND_CONSOLE_20260524">
      <header className="tcc-top">
        <div>
          <p>CHURVOX COMMAND CONSOLE</p>
          <h1>Run today’s trade work from one screen.</h1>
        </div>

        <div className="tcc-snapshot">
          <span>{aiItems.length} AI ready</span>
          <span>{scheduleItems.length + fieldItems.length} jobs moving</span>
          <span>{billItems.length} ready to bill</span>
          <span>{money(openTotal)} waiting</span>
        </div>

        <div className="tcc-top-actions">
          <button onClick={() => runAI(false)} disabled={busy === "scan"}>{busy === "scan" ? "Checking…" : "Run AI"}</button>
          <button className="primary" onClick={reviewNext}>Review next</button>
        </div>
      </header>

      <section className="tcc-board">
        <div className="tcc-runsheet">
          <div className="tcc-section-head">
            <div>
              <p>RUN SHEET</p>
              <h2>Crew and jobs</h2>
            </div>
            <button onClick={() => openLane("schedule")}>Schedule</button>
          </div>

          <div className="tcc-crew-list">
            {crewRows.length ? crewRows.map((row) => (
              <div className="tcc-crew-row" key={row.worker}>
                <div>
                  <strong>{row.worker}</strong>
                  <span>{row.jobs.length} jobs</span>
                </div>
                <div>
                  {row.jobs.slice(0, 4).map((job) => (
                    <button key={job.id} onClick={() => { openLane(job.lane); setSelected(job); }}>
                      {job.title}
                    </button>
                  ))}
                </div>
              </div>
            )) : <div className="tcc-empty-small">No crew jobs loaded yet.</div>}
          </div>
        </div>

        <div className="tcc-workflow">
          <div className="tcc-section-head">
            <div>
              <p>WORKFLOW</p>
              <h2>Action → Schedule → Field → Bill → Pay</h2>
            </div>
          </div>

          <div className="tcc-lanes">
            {laneConfig.map(([key, title, count, note]) => (
              <button key={key} className={`tcc-lane ${lane === key ? "active" : ""}`} onClick={() => openLane(key)}>
                <span>{title}</span>
                <strong>{count}</strong>
                <small>{note}</small>
              </button>
            ))}
          </div>

          <div className="tcc-lane-list">
            {laneItems.slice(0, 10).map((item) => (
              <button key={item.id} className={current?.id === item.id ? "active" : ""} onClick={() => setSelected(item)}>
                <span>{item.label}</span>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </button>
            ))}
            {!laneItems.length ? <div className="tcc-empty-small">Nothing waiting in this lane.</div> : null}
          </div>
        </div>

        <aside className="tcc-ai">
          <div className="tcc-ai-live"><i /> AI OPERATOR</div>

          {loading ? (
            <p className="tcc-detail">Loading Churvox…</p>
          ) : current ? (
            <>
              <div className="tcc-ai-head">
                <span>{current.source}</span>
                <h2>{titleFor(current)}</h2>
              </div>

              <p className="tcc-directive">Approve, edit, or skip. Churvox keeps the next admin move ready.</p>
              <p className="tcc-detail">{detailFor(current)}</p>

              <div className="tcc-facts">
                <div><span>Result</span><strong>{resultFor(current)}</strong></div>
                <div><span>Record</span><strong>{recordFor(current)}</strong></div>
                <div><span>Risk</span><strong>{current.risk || "low"}</strong></div>
              </div>

              {editOpen ? (
                <label className="tcc-editor">
                  <span>Edit before approving</span>
                  <textarea value={editText} onChange={(event) => setEditText(event.target.value)} />
                </label>
              ) : null}

              <div className="tcc-ai-actions">
                {current.rawId ? (
                  <>
                    <button className="primary" onClick={() => approveCurrent(current)} disabled={busy === current.rawId}>
                      {busy === current.rawId ? "Running…" : primaryText(current)}
                    </button>
                    <button onClick={() => setEditOpen((v) => !v)}>Edit</button>
                    <button onClick={() => skipCurrent(current)} disabled={busy === current.rawId}>Skip</button>
                  </>
                ) : (
                  <>
                    <button className="primary" onClick={reviewNext}>Back to AI</button>
                    <button onClick={() => runAI(false)}>Prepare actions</button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="tcc-empty">
              <h2>Nothing waiting.</h2>
              <p>Run AI or open a workflow lane.</p>
              <button className="primary" onClick={() => runAI(false)}>Run AI</button>
            </div>
          )}
        </aside>
      </section>

      <section className="tcc-bottom">
        <div>
          <p>MONEY</p>
          <strong>{money(openTotal)} waiting</strong>
          <span>{billItems.length} ready to bill · {payItems.length} payment items</span>
        </div>
        <div>
          <p>NEXT BEST MOVE</p>
          <strong>{snapshot?.next_best_move || "Review the next AI action."}</strong>
          <span>Nothing sends or changes until you approve.</span>
        </div>
      </section>

      <section className="tcc-ask">
        <input
          value={ask}
          onChange={(event) => setAsk(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") askChurvox(); }}
          placeholder="Ask Churvox… show schedule, field jobs, ready to bill, overdue payments"
        />
        <button onClick={askChurvox}>Ask</button>
      </section>
    </main>
  );
}
