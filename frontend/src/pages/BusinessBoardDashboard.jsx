import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import "../styles/churvoxBusinessBoardTheme.css";

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
const money = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
const pending = new Set(["", "pending", "ready", "edited", "draft", "watching"]);
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

function groupFor(type = "") {
  const t = low(type);
  if (t.includes("invoice_reminder")) return "Payment reminders";
  if (t.includes("invoice")) return "Invoice drafts";
  if (t.includes("assign")) return "Crew assignments";
  if (t.includes("quote")) return "Quote follow-ups";
  if (t.includes("customer")) return "Customer updates";
  return "Admin moves";
}

function makeDecision(raw) {
  const payload = raw.payload || raw.draft_payload || {};
  const type = raw.action_type || raw.type || "prepared_action";

  return {
    id: `decision-${idOf(raw)}`,
    rawId: idOf(raw),
    raw,
    board: "now",
    source: "AI",
    type,
    group: groupFor(type),
    label: labelFor(type),
    title: raw.title || raw.summary || "Churvox has the next move ready",
    detail: raw.recommendation || raw.reason || raw.owner_facing_explanation || raw.summary || "Review this move, then approve, edit, or skip.",
    status: raw.status || "pending",
    risk: raw.risk || raw.risk_level || "low",
    payload,
  };
}

function makeJob(job, board = "jobs") {
  return {
    id: `job-${idOf(job)}`,
    raw: job,
    board,
    source: "Job",
    type: "job",
    group: board === "money" ? "Completed jobs" : "Jobs",
    label: board === "money" ? "Ready to invoice" : "Job",
    title: job.title || job.job_name || job.client_name || "Job",
    detail: job.description || job.address || "This job can be reviewed from the board.",
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
    board: "money",
    source: "Invoice",
    type: "invoice",
    group: "Invoices",
    label: "Money",
    title: `${invoice.customer_name || invoice.client_name || "Client"} · ${money(invoice.balance_due || invoice.balance || invoice.total || invoice.amount)}`,
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
    board: "clients",
    source: "Client",
    type: "client",
    group: "Clients",
    label: "Client",
    title: client.name || client.client_name || client.customer_name || "Client",
    detail: client.email || client.phone || client.address || "Client record is ready on the board.",
    status: client.status || "active",
    client: client.name || client.client_name || client.customer_name || "Client",
  };
}

function makeQuote(quote) {
  return {
    id: `quote-${idOf(quote)}`,
    raw: quote,
    board: "quotes",
    source: "Quote",
    type: "quote",
    group: "Quotes",
    label: "Quote",
    title: quote.title || quote.customer_name || quote.client_name || "Quote",
    detail: quote.description || "Quote is ready to review.",
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
  if (!item) return "Nothing waiting here.";

  const p = item.payload || {};
  const type = low(item.type || "");
  const client = first(p.client_name, p.customer_name, p.client, item.client);

  if (type.includes("invoice_reminder")) return `Send payment reminder${client ? ` to ${client}` : ""}`;
  if (["create_invoice_draft", "invoice_draft"].includes(type)) return `Create invoice draft${client ? ` for ${client}` : ""}`;
  if (type.includes("assign")) return "Assign crew to a waiting job";
  if (type.includes("quote")) return `Follow up quote${client ? ` for ${client}` : ""}`;
  if (type.includes("customer")) return `Send customer update${client ? ` to ${client}` : ""}`;

  return item.title || "Churvox has the next move ready";
}

function displayDetail(item) {
  if (!item) return "";

  const p = item.payload || {};
  const type = low(item.type || "");
  const client = first(p.client_name, p.customer_name, p.client, item.client);
  const amount = first(p.amount_due, p.balance_due, p.amount, p.total, item.amount);
  const days = first(p.days_overdue, p.overdue_days, p.invoice_age_days);
  const invoice = first(p.invoice_number, p.invoice_ref, p.invoice_id);

  if (type.includes("invoice_reminder")) {
    const bits = [];
    if (invoice) bits.push(`Invoice ${invoice}`);
    if (days) bits.push(`is ${days} days overdue`);
    if (amount) bits.push(`amount due ${money(amount)}`);
    if (client) bits.push(`client ${client}`);
    return `${bits.length ? `${bits.join(". ")}. ` : ""}Churvox has drafted the reminder. Nothing sends until you approve.`;
  }

  if (["create_invoice_draft", "invoice_draft"].includes(type)) {
    const bits = [];
    if (client) bits.push(`Client: ${client}`);
    if (amount) bits.push(`Amount: ${money(amount)}`);
    if (p.job_id) bits.push("linked to a completed job");
    return `${bits.length ? `${bits.join(". ")}. ` : ""}Churvox can create the draft invoice. It will not be sent without approval.`;
  }

  return item.detail || "Churvox prepared this move so you can approve, edit, or skip it.";
}

function primaryLabel(item) {
  const type = low(item?.type || "");
  if (type.includes("invoice_reminder")) return "Approve & send reminder";
  if (["create_invoice_draft", "invoice_draft"].includes(type)) return "Approve draft invoice";
  if (type.includes("assign")) return "Approve assignment";
  if (type.includes("quote")) return "Approve follow-up";
  if (type.includes("customer")) return "Approve update";
  return "Approve & run";
}

function outcomeLine(item) {
  const type = low(item?.type || "");
  if (type.includes("invoice_reminder")) return "Reminder sends after approval";
  if (["create_invoice_draft", "invoice_draft"].includes(type)) return "Draft invoice is created";
  if (type.includes("assign")) return "Crew assignment is saved";
  if (type.includes("quote")) return "Follow-up is prepared";
  if (type.includes("customer")) return "Customer update is prepared";
  return item?.rawId ? "Action runs after approval" : "Open inside this board";
}

function recordLine(item) {
  if (!item) return "ready";
  const p = item.payload || {};
  return first(
    p.client_name,
    p.customer_name,
    item.client,
    p.invoice_number ? `Invoice ${p.invoice_number}` : "",
    p.job_id ? `Job ${p.job_id}` : "",
    item.worker,
    "ready"
  );
}

function evidenceFor(item) {
  if (!item) {
    return [
      "Press NOW to review the next prepared move.",
      "Use the board areas to open money, jobs, crew, clients or quotes.",
      "Churvox keeps the work on this page first.",
    ];
  }

  const lines = [];
  if (item.source === "AI") lines.push("AI prepared this before you opened the page.");
  if (item.type?.includes("invoice")) lines.push("This affects invoicing, money, or payment follow-up.");
  if (item.type?.includes("assign")) lines.push("This helps move work to the right crew member.");
  if (item.source === "Job") lines.push(`Client: ${item.client || "Client"}`);
  if (item.source === "Job") lines.push(`Worker: ${item.worker || "Unassigned"}`);
  if (item.source === "Invoice" || item.source === "Quote") lines.push(`Amount: ${money(item.amount || 0)}`);
  if (item.payload?.message || item.payload?.description) lines.push("Draft wording is ready to review.");
  lines.push("Nothing sends, charges, or changes until you approve.");
  return lines.slice(0, 7);
}

function groupStacks(items) {
  const map = new Map();
  for (const item of items) {
    const key = low(item.group || item.type || item.title).replace(/[^a-z0-9]+/g, "_");
    if (!map.has(key)) map.set(key, { key, title: item.group || groupFor(item.type), count: 0, first: item });
    map.get(key).count += 1;
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}

export default function BusinessBoardDashboard() {
  const { get, post, patch } = useApi();

  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [snapshot, setSnapshot] = useState(null);

  const [board, setBoard] = useState("now");
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
      if (!quiet) toast.success("Churvox updated the board");
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

    const key = "churvox_business_board_last_scan";
    const last = Number(localStorage.getItem(key) || 0);

    if (!last || Date.now() - last > 10 * 60 * 1000) {
      localStorage.setItem(key, String(Date.now()));
      scan(true);
    }
  }, [scan]);

  const hidden = useMemo(() => new Set(handled), [handled]);

  const nowItems = useMemo(
    () => actions.filter((a) => !hidden.has(idOf(a)) && pending.has(low(a.status))).slice(0, 80).map(makeDecision),
    [actions, hidden]
  );

  const jobItems = useMemo(() => jobs.slice(0, 60).map((job) => makeJob(job, "jobs")), [jobs]);

  const moneyItems = useMemo(() => {
    const readyJobs = jobs
      .filter((j) => ["completed", "done", "complete"].includes(low(j.status)) && !(j.invoice_id || j.draft_invoice_id || j.invoiced))
      .slice(0, 20)
      .map((job) => makeJob(job, "money"));

    const openInvoices = invoices
      .filter((i) => ["draft", "sent", "open", "overdue", "unpaid", "pending", ""].includes(low(i.status)))
      .slice(0, 40)
      .map(makeInvoice);

    return [...readyJobs, ...openInvoices];
  }, [jobs, invoices]);

  const crewItems = useMemo(
    () => jobs.filter((j) => ["assigned", "scheduled", "in_progress", "in progress", "started"].includes(low(j.status))).slice(0, 60).map((job) => makeJob(job, "crew")),
    [jobs]
  );

  const clientItems = useMemo(() => clients.slice(0, 60).map(makeClient), [clients]);
  const quoteItems = useMemo(() => quotes.slice(0, 60).map(makeQuote), [quotes]);

  const doneItems = useMemo(
    () => actions.filter((a) => doneStatuses.has(low(a.status))).slice(0, 20).map(makeDecision),
    [actions]
  );

  const urgent = snapshot?.urgent || {};

  const boards = {
    now: nowItems,
    money: moneyItems,
    jobs: jobItems,
    crew: crewItems,
    clients: clientItems,
    quotes: quoteItems,
    done: doneItems,
  };

  const activeItems = boards[board] || [];
  const current = selected && selected.board === board ? selected : activeItems[0];
  const stacks = useMemo(() => groupStacks(nowItems), [nowItems]);
  const evidence = evidenceFor(current);

  useEffect(() => {
    setEditOpen(false);
    setEditText(current?.payload?.message || current?.payload?.description || current?.detail || "");
  }, [current?.id]);

  const openBoard = (nextBoard) => {
    setBoard(nextBoard);
    setSelected(null);
  };

  const showNow = () => {
    setBoard("now");
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
        toast.error(prep.error || "Churvox could not prepare final payload");
        return;
      }
    }

    const res = await post(`/ai-operator/actions/${item.rawId}/approve`, {});
    setBusy("");

    if (res.success) {
      toast.success("Approved. Next one is ready.");
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
    if (q.includes("money") || q.includes("invoice") || q.includes("paid") || q.includes("payment")) openBoard("money");
    else if (q.includes("job") || q.includes("work")) openBoard("jobs");
    else if (q.includes("crew") || q.includes("worker") || q.includes("staff")) openBoard("crew");
    else if (q.includes("client") || q.includes("customer")) openBoard("clients");
    else if (q.includes("quote")) openBoard("quotes");
    else if (q.includes("done") || q.includes("history")) openBoard("done");
    else showNow();

    toast.message("Board changed");
  };

  const boardAreas = [
    { key: "now", label: "Now", value: nowItems.length, detail: "review next move" },
    { key: "money", label: "Money", value: money(urgent.open_invoices_total || 0), detail: `${moneyItems.length} items waiting` },
    { key: "jobs", label: "Jobs", value: urgent.unassigned_jobs ?? jobItems.length, detail: "fix stuck work" },
    { key: "crew", label: "Crew", value: crewItems.length, detail: "assign / track" },
    { key: "clients", label: "Clients", value: clientItems.length, detail: "customer records" },
    { key: "quotes", label: "Quotes", value: quoteItems.length, detail: "follow-ups" },
  ];

  return (
    <main className="bb" data-version="CHURVOX_BUSINESS_BOARD_20260524">
      <section className="bb-top">
        <div>
          <p className="bb-kicker">Churvox Business Board</p>
          <h1>Today’s work, sorted into one board.</h1>
          <p>{snapshot?.next_best_move || "Start with NOW, then open money, jobs, crew, clients or quotes without leaving the board."}</p>
        </div>

        <div className="bb-status">
          <span />
          <strong>AI board live</strong>
          <small>{nowItems.length} moves · {moneyItems.length} money items · {jobItems.length} jobs</small>
        </div>

        <div className="bb-actions">
          <button onClick={() => scan(false)} disabled={busy === "scan"}>{busy === "scan" ? "Checking…" : "Run AI check"}</button>
          <button className="primary" onClick={showNow}>Review NOW</button>
        </div>
      </section>

      <section className="bb-areas">
        {boardAreas.map((area) => (
          <button key={area.key} className={board === area.key ? "active" : ""} onClick={() => openBoard(area.key)}>
            <span>{area.label}</span>
            <strong>{area.value}</strong>
            <small>{area.detail}</small>
          </button>
        ))}
      </section>

      <section className="bb-main">
        <article className="bb-now">
          <div className="bb-now-sheet">
            {loading ? (
              <div className="bb-empty">Loading Churvox…</div>
            ) : current ? (
              <>
                <div className="bb-now-head">
                  <div>
                    <p className="bb-kicker">{board === "now" ? "Do this now" : board}</p>
                    <h2>{displayTitle(current)}</h2>
                  </div>
                  <span>{current.source}</span>
                </div>

                <p className="bb-directive">Review this move. Approve it, edit it, or skip it. Churvox will bring the next one.</p>
                <p className="bb-detail">{displayDetail(current)}</p>

                <div className="bb-facts">
                  <div><span>What happens</span><strong>{outcomeLine(current)}</strong></div>
                  <div><span>Record</span><strong>{recordLine(current)}</strong></div>
                  <div><span>Risk</span><strong>{current.risk || "low"}</strong></div>
                </div>

                {editOpen ? (
                  <label className="bb-editor">
                    <span>Edit before approving</span>
                    <textarea value={editText} onChange={(event) => setEditText(event.target.value)} />
                  </label>
                ) : null}

                <div className="bb-now-actions">
                  {current.rawId ? (
                    <>
                      <button className="primary" onClick={() => approveCurrent(current)} disabled={busy === current.rawId}>
                        {busy === current.rawId ? "Running…" : primaryLabel(current)}
                      </button>
                      <button onClick={() => setEditOpen((value) => !value)}>Edit first</button>
                      <button className="ghost" onClick={() => skipCurrent(current)} disabled={busy === current.rawId}>Skip</button>
                    </>
                  ) : (
                    <>
                      <button className="primary" onClick={showNow}>Back to NOW</button>
                      <button onClick={() => scan(false)}>Ask AI to prepare</button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="bb-empty">
                <h2>Nothing waiting here.</h2>
                <p>Run an AI check or open another board area.</p>
                <button className="primary" onClick={() => scan(false)}>Run AI check</button>
              </div>
            )}
          </div>
        </article>

        <aside className="bb-proof">
          <p className="bb-kicker">Why this is here</p>
          <h3>Decision proof</h3>
          <div className="bb-proof-list">
            {evidence.map((line) => <span key={line}>{line}</span>)}
          </div>

          <div className="bb-board-mini">
            <div><span>Ready</span><strong>{nowItems.length}</strong></div>
            <div><span>Cashflow</span><strong>{money(urgent.open_invoices_total || 0)}</strong></div>
            <div><span>Jobs</span><strong>{urgent.unassigned_jobs ?? jobItems.length}</strong></div>
          </div>
        </aside>
      </section>

      <section className="bb-lists">
        <div className="bb-list">
          <div className="bb-list-head">
            <p className="bb-kicker">Active board</p>
            <h3>{board}</h3>
          </div>
          <div className="bb-item-grid">
            {activeItems.slice(0, 8).map((item) => (
              <button key={item.id} className={current?.id === item.id ? "active" : ""} onClick={() => setSelected(item)}>
                <strong>{item.title}</strong>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bb-list">
          <div className="bb-list-head">
            <p className="bb-kicker">Prepared work</p>
            <h3>Grouped stack</h3>
          </div>
          <div className="bb-stack-grid">
            {stacks.length ? stacks.map((stack) => (
              <button key={stack.key} onClick={() => { setBoard("now"); setSelected(stack.first); }}>
                <span>{stack.count}</span>
                <strong>{stack.title}</strong>
                <small>{stack.first.detail}</small>
              </button>
            )) : <p>No prepared decisions waiting.</p>}
          </div>
        </div>
      </section>

      <section className="bb-ask">
        <input
          value={ask}
          onChange={(event) => setAsk(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") askChurvox(); }}
          placeholder="Ask Churvox… show money waiting, jobs stuck, unassigned crew, client follow-ups"
        />
        <button onClick={askChurvox}>Ask</button>
      </section>
    </main>
  );
}
