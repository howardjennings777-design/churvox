import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import "../styles/controlSurfaceDashboard.css";

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
    surface: "now",
    source: "AI",
    type,
    stack: stackFor(type),
    label: labelFor(type),
    title: raw.title || raw.summary || "Churvox has the next move ready",
    detail: raw.recommendation || raw.reason || raw.owner_facing_explanation || raw.summary || "Review this move, then approve, edit, or skip.",
    status: raw.status || "pending",
    risk: raw.risk || raw.risk_level || "low",
    payload,
  };
}

function makeJob(job, surface = "jobs") {
  return {
    id: `job-${idOf(job)}`,
    raw: job,
    surface,
    source: "Job",
    type: "job",
    stack: surface === "money" ? "Completed jobs" : "Jobs",
    label: surface === "money" ? "Ready to invoice" : "Job",
    title: job.title || job.job_name || job.client_name || "Job",
    detail: job.description || job.address || "This job can be opened and handled from the surface.",
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
    surface: "money",
    source: "Invoice",
    type: "invoice",
    stack: "Invoices",
    label: "Money",
    title: `${invoice.customer_name || invoice.client_name || "Client"} · ${nzMoney(invoice.balance_due || invoice.balance || invoice.total || invoice.amount)}`,
    detail: invoice.description || "Invoice is open, unpaid, overdue, draft, or ready for follow-up.",
    status: invoice.status || "open",
    client: invoice.customer_name || invoice.client_name || "Client",
    amount: invoice.balance_due || invoice.balance || invoice.total || invoice.amount || 0,
  };
}

function makeClient(client) {
  return {
    id: `client-${idOf(client)}`,
    raw: client,
    surface: "clients",
    source: "Client",
    type: "client",
    stack: "Clients",
    label: "Client",
    title: client.name || client.client_name || client.customer_name || "Client",
    detail: client.email || client.phone || client.address || "Client record is ready on the surface.",
    status: client.status || "active",
    client: client.name || client.client_name || client.customer_name || "Client",
  };
}

function makeQuote(quote) {
  return {
    id: `quote-${idOf(quote)}`,
    raw: quote,
    surface: "quotes",
    source: "Quote",
    type: "quote",
    stack: "Quotes",
    label: "Quote",
    title: quote.title || quote.customer_name || quote.client_name || "Quote",
    detail: quote.description || "Quote is ready to review from the surface.",
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

function groupStacks(items) {
  const map = new Map();
  for (const item of items) {
    const key = low(item.stack || item.type || item.title).replace(/[^a-z0-9]+/g, "_");
    if (!map.has(key)) {
      map.set(key, { key, title: item.stack || stackFor(item.type), count: 0, first: item });
    }
    map.get(key).count += 1;
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}

function surfaceEvidence(item) {
  if (!item) {
    return [
      "Tap NOW to review the next prepared move.",
      "Tap a business zone to open that area on this same surface.",
      "Ask Churvox can jump the surface to jobs, money, clients, quotes, or crew.",
    ];
  }

  const lines = [];
  if (item.source === "AI") lines.push("AI prepared this move before you opened the page.");
  if (item.type?.includes("invoice")) lines.push("This affects money, invoicing, or payment follow-up.");
  if (item.type?.includes("assign")) lines.push("This helps move work to the right crew member.");
  if (item.source === "Job") lines.push(`Client: ${item.client || "Client"}`);
  if (item.source === "Job") lines.push(`Worker: ${item.worker || "Unassigned"}`);
  if (item.source === "Invoice" || item.source === "Quote") lines.push(`Amount: ${nzMoney(item.amount || 0)}`);
  if (item.payload?.message || item.payload?.description) lines.push("Draft wording is already prepared.");
  if (item.payload?.job_id) lines.push("Linked to a real job record.");
  lines.push("Nothing sends, charges, or changes until you approve.");
  return lines.slice(0, 7);
}

export default function ControlSurfaceDashboard() {
  const { get, post, patch } = useApi();

  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [snapshot, setSnapshot] = useState(null);

  const [surface, setSurface] = useState("now");
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
      if (!quiet) toast.success("Churvox sorted the next moves");
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

    const key = "churvox_control_surface_last_scan";
    const last = Number(localStorage.getItem(key) || 0);

    if (!last || Date.now() - last > 10 * 60 * 1000) {
      localStorage.setItem(key, String(Date.now()));
      scan(true);
    }
  }, [scan]);

  const hidden = useMemo(() => new Set(handled), [handled]);

  const nowItems = useMemo(
    () => actions
      .filter((a) => !hidden.has(idOf(a)) && pending.has(low(a.status)))
      .slice(0, 70)
      .map(makeDecision),
    [actions, hidden]
  );

  const jobsItems = useMemo(() => jobs.slice(0, 50).map((job) => makeJob(job, "jobs")), [jobs]);

  const moneyItems = useMemo(() => {
    const readyJobs = jobs
      .filter((j) => ["completed", "done", "complete"].includes(low(j.status)) && !(j.invoice_id || j.draft_invoice_id || j.invoiced))
      .slice(0, 18)
      .map((job) => makeJob(job, "money"));

    const openInvoices = invoices
      .filter((i) => ["draft", "sent", "open", "overdue", "unpaid", "pending", ""].includes(low(i.status)))
      .slice(0, 36)
      .map(makeInvoice);

    return [...readyJobs, ...openInvoices];
  }, [jobs, invoices]);

  const crewItems = useMemo(
    () => jobs
      .filter((j) => ["assigned", "scheduled", "in_progress", "in progress", "started"].includes(low(j.status)))
      .slice(0, 50)
      .map((job) => makeJob(job, "crew")),
    [jobs]
  );

  const clientItems = useMemo(() => clients.slice(0, 50).map(makeClient), [clients]);
  const quoteItems = useMemo(() => quotes.slice(0, 50).map(makeQuote), [quotes]);

  const doneItems = useMemo(
    () => actions.filter((a) => doneStatuses.has(low(a.status))).slice(0, 18).map(makeDecision),
    [actions]
  );

  const urgent = snapshot?.urgent || {};

  const surfaces = {
    now: nowItems,
    money: moneyItems,
    jobs: jobsItems,
    crew: crewItems,
    clients: clientItems,
    quotes: quoteItems,
    done: doneItems,
  };

  const activeItems = surfaces[surface] || [];
  const current = selected && selected.surface === surface ? selected : activeItems[0];
  const stacks = useMemo(() => groupStacks(nowItems), [nowItems]);
  const evidence = surfaceEvidence(current);

  useEffect(() => {
    setEditOpen(false);
    setEditText(current?.payload?.message || current?.payload?.description || current?.detail || "");
  }, [current?.id]);

  const openSurface = (nextSurface) => {
    setSurface(nextSurface);
    setSelected(null);
  };

  const showNow = () => {
    setSurface("now");
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
      toast.success("Approved. Churvox moved to the next one.");
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
    if (q.includes("money") || q.includes("invoice") || q.includes("paid") || q.includes("payment")) openSurface("money");
    else if (q.includes("job") || q.includes("work")) openSurface("jobs");
    else if (q.includes("crew") || q.includes("worker") || q.includes("staff")) openSurface("crew");
    else if (q.includes("client") || q.includes("customer")) openSurface("clients");
    else if (q.includes("quote")) openSurface("quotes");
    else if (q.includes("done") || q.includes("history")) openSurface("done");
    else showNow();

    toast.message("Churvox moved the surface");
  };

  const zoneData = [
    { key: "money", label: "Money", value: nzMoney(urgent.open_invoices_total || 0), detail: `${moneyItems.length} items waiting`, className: "cs-zone-money" },
    { key: "jobs", label: "Jobs", value: urgent.unassigned_jobs ?? jobsItems.length, detail: "need attention", className: "cs-zone-jobs" },
    { key: "crew", label: "Crew", value: crewItems.length, detail: "active decisions", className: "cs-zone-crew" },
    { key: "clients", label: "Clients", value: clientItems.length, detail: "records on surface", className: "cs-zone-clients" },
    { key: "quotes", label: "Quotes", value: quoteItems.length, detail: "ready to review", className: "cs-zone-quotes" },
  ];

  return (
    <main className="cs" data-version="CHURVOX_CONTROL_SURFACE_20260524">
      <section className="cs-top">
        <div>
          <p className="cs-kicker">Churvox Control Surface</p>
          <h1>AI is sorting the business.</h1>
          <p>Tap a zone. Churvox pulls the work into NOW without making you leave the page.</p>
        </div>

        <div className="cs-signal">
          <span />
          <strong>AI signal</strong>
          <small>{nowItems.length} moves ready · {moneyItems.length} money items</small>
        </div>

        <div className="cs-top-actions">
          <button onClick={() => scan(false)} disabled={busy === "scan"}>
            {busy === "scan" ? "Scanning…" : "Run scan"}
          </button>
          <button className="bronze" onClick={showNow}>NOW</button>
        </div>
      </section>

      <section className="cs-surface">
        <div className="cs-orbit" aria-hidden="true" />

        {zoneData.map((zone) => (
          <button
            key={zone.key}
            type="button"
            className={`cs-zone ${zone.className} ${surface === zone.key ? "active" : ""}`}
            onClick={() => openSurface(zone.key)}
          >
            <span>{zone.label}</span>
            <strong>{zone.value}</strong>
            <small>{zone.detail}</small>
          </button>
        ))}

        <article className={`cs-now ${surface === "now" ? "active" : ""}`}>
          <div className="cs-now-inner">
            {loading ? (
              <div className="cs-empty">Loading Churvox…</div>
            ) : current ? (
              <>
                <div className="cs-now-head">
                  <div>
                    <p className="cs-kicker">{surface === "now" ? "NOW" : surface}</p>
                    <h2>{current.title}</h2>
                  </div>
                  <span>{current.source}</span>
                </div>

                <p className="cs-detail">{current.detail}</p>

                <div className="cs-facts">
                  <div><span>Status</span><strong>{current.status || "ready"}</strong></div>
                  <div><span>Type</span><strong>{current.label || current.type}</strong></div>
                  <div><span>Context</span><strong>{current.payload?.job_id || current.client || current.worker || "ready"}</strong></div>
                </div>

                {editOpen ? (
                  <label className="cs-editor">
                    <span>Edit before approving</span>
                    <textarea value={editText} onChange={(event) => setEditText(event.target.value)} />
                  </label>
                ) : null}

                <div className="cs-actions">
                  {current.rawId ? (
                    <>
                      <button className="bronze" onClick={() => approveCurrent(current)} disabled={busy === current.rawId}>
                        {busy === current.rawId ? "Running…" : "Approve & run"}
                      </button>
                      <button onClick={() => setEditOpen((value) => !value)}>Edit first</button>
                      <button className="ghost" onClick={() => skipCurrent(current)} disabled={busy === current.rawId}>Skip</button>
                    </>
                  ) : (
                    <>
                      <button className="bronze" onClick={showNow}>Back to NOW</button>
                      <button onClick={() => scan(false)}>Ask AI to prepare</button>
                    </>
                  )}
                </div>

                <div className="cs-evidence">
                  <p className="cs-kicker">Why this is here</p>
                  {evidence.map((line) => <span key={line}>{line}</span>)}
                </div>
              </>
            ) : (
              <div className="cs-empty">
                <h2>Nothing waiting here.</h2>
                <p>Run a scan or tap another zone.</p>
                <button className="bronze" onClick={() => scan(false)}>Run scan</button>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="cs-stream">
        <div className="cs-stream-head">
          <div>
            <p className="cs-kicker">Work stream</p>
            <h3>Grouped work. No repeated cards.</h3>
          </div>
          <button className="bronze" onClick={showNow}>Clear NOW</button>
        </div>

        {stacks.length ? (
          <div className="cs-stack-row">
            {stacks.map((stack) => (
              <button key={stack.key} onClick={() => { setSurface("now"); setSelected(stack.first); }}>
                <span>{stack.count}</span>
                <strong>{stack.title}</strong>
                <small>{stack.first.detail}</small>
              </button>
            ))}
          </div>
        ) : (
          <p>No prepared decisions waiting.</p>
        )}
      </section>

      <section className="cs-ask">
        <input
          value={ask}
          onChange={(event) => setAsk(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") askChurvox(); }}
          placeholder="Ask Churvox anything… show money waiting, jobs stuck, unassigned crew, client follow-ups"
        />
        <button onClick={askChurvox}>Ask</button>
      </section>
    </main>
  );
}
