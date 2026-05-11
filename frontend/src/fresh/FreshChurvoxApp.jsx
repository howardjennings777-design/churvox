import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

function readToken() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

async function api(path, options = {}) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  const t = readToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}/${String(path).replace(/^\/+/, "")}`, {
    method: options.method || "GET",
    credentials: "include",
    headers,
    body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body,
  });

  const text = await res.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!res.ok) throw new Error(payload?.detail || payload?.message || payload?.error || `${path} failed`);
  return payload;
}

function toArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of keys) if (Array.isArray(payload[key])) return payload[key];
  for (const key of ["data", "items", "results"]) if (Array.isArray(payload[key])) return payload[key];
  return Object.values(payload).find(Array.isArray) || [];
}

function titleOf(item, fallback) {
  return item?.title || item?.name || item?.client_name || item?.customer_name || item?.invoice_number || item?.quote_number || item?.email || fallback;
}

function statusOf(item, fallback = "active") {
  return String(item?.status || item?.job_status || item?.payment_status || item?.quote_status || item?.state || fallback).replaceAll("_", " ");
}

function money(item) {
  const value = Number(item?.total || item?.amount || item?.price || item?.balance || 0);
  if (!Number.isFinite(value) || value <= 0) return "";
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(value);
}

function useLiveData() {
  const [state, setState] = useState({ loading: true, error: "", jobs: [], clients: [], quotes: [], invoices: [], team: [] });

  async function load() {
    setState((s) => ({ ...s, loading: true, error: "" }));
    const calls = await Promise.allSettled([
      api("/jobs"),
      api("/clients"),
      api("/quotes"),
      api("/invoices"),
      api("/team/workers"),
    ]);

    setState({
      loading: false,
      error: calls.some((c) => c.status === "rejected") ? "Some live data could not load. Showing the Operator OS shell." : "",
      jobs: calls[0].status === "fulfilled" ? toArray(calls[0].value, ["jobs"]) : [],
      clients: calls[1].status === "fulfilled" ? toArray(calls[1].value, ["clients"]) : [],
      quotes: calls[2].status === "fulfilled" ? toArray(calls[2].value, ["quotes"]) : [],
      invoices: calls[3].status === "fulfilled" ? toArray(calls[3].value, ["invoices"]) : [],
      team: calls[4].status === "fulfilled" ? toArray(calls[4].value, ["workers", "team"]) : [],
    });
  }

  useEffect(() => { load(); }, []);
  return { ...state, reload: load };
}

function ChurvoxLogo() {
  return (
    <div className="op-logo">
      <img className="op-logo-img" src="/brand/churvox-holo-c.svg" alt="Churvox" />
      <div>
        <strong>CHURVOX</strong>
        <small>OPERATOR OS</small>
      </div>
    </div>
  );
}

function Shell({ children }) {
  const location = useLocation();
  const nav = [
    ["Command", "/dashboard", "⬡", "Approval Command Centre"],
    ["Jobs", "/jobs", "⌘", "Schedule & Dispatch"],
    ["Crew", "/team", "♧", "People & Availability"],
    ["Quotes", "/quotes", "▤", "Estimates & Follow-ups"],
    ["Invoices", "/invoices", "▥", "Billing & Payments"],
    ["Clients", "/clients", "◎", "Customers & Sites"],
    ["Settings", "/settings", "⚙", "System & Preferences"],
  ];

  return (
    <div className="op-shell">
      <aside className="op-rail">
        <ChurvoxLogo />

        <nav className="op-nav">
          {nav.map(([label, href, icon, sub]) => (
            <Link key={href} to={href} className={location.pathname === href ? "active" : ""}>
              <i>{icon}</i>
              <span>
                <b>{label}</b>
                <small>{sub}</small>
              </span>
            </Link>
          ))}
        </nav>

        <section className="op-ai-mode">
          <p>AI OPERATOR</p>
          <strong>Active & running 24/7</strong>
          <small>Approval-first automation monitor</small>
        </section>

        <section className="op-user">
          <div className="op-avatar">A</div>
          <div>
            <strong>{localStorage.getItem("churvox_owner_name") || "Owner"}</strong>
            <small>Business Owner</small>
          </div>
        </section>
      </aside>

      <main className="op-main">{children}</main>
    </div>
  );
}

function Topbar() {
  return (
    <div className="op-topbar">
      <span>☼ {`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${localStorage.getItem("churvox_owner_name") || "Owner"}.`}</span>
      <div>
        <button>⌂ All locations</button>
        <button>🔔</button>
        <button>{new Date().toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</button>
      </div>
    </div>
  );
}

function Hero({ data, prepared }) {
  return (
    <section className="op-hero">
      <div className="op-hero-copy">
        <p>CHURVOX OPERATOR OS</p>
        <h1>AI runs the admin.<br /><span>You approve the moves.</span></h1>
        <small>Churvox Operator OS handles jobs, invoices, quote follow-ups and admin busywork so you can keep the business moving.</small>
      </div>

      <div className="op-orb-wrap">
        <div className="op-radar" />
        <div className="op-orb">
          <img className="op-orb-logo-img" src="/brand/churvox-holo-c.svg" alt="Churvox Operator" />
        </div>
      </div>

      <aside className="op-status">
        <p>AI OPERATOR</p>
        <strong>Always on. Always working.</strong>
        <span>✓ Monitoring everything</span>
        <span>✓ Managing the admin</span>
        <span>✓ Preparing decisions</span>
      </aside>

      <aside className="op-prepared">
        <strong>{prepared}</strong>
        <span>Prepared actions</span>
        <small>Ready for your approval</small>
      </aside>
    </section>
  );
}


function buildApprovalActions({ unassigned = 0, openInvoices = 0, openQuotes = 0, completedNeedsInvoice = 0 }) {
  const actions = [];

  if (unassigned > 0) {
    actions.push({
      icon: "♧",
      label: "DISPATCH",
      title: `Assign ${unassigned} unassigned ${unassigned === 1 ? "job" : "jobs"}`,
      text: "AI found jobs without a worker assigned.",
      why: "Why: Churvox can recommend the best available worker using active status, region and current workload.",
      guardrail: "Owner approval required before any worker is assigned.",
      confidence: "Ready",
      tone: "blue",
    });
  }

  if (openInvoices > 0) {
    actions.push({
      icon: "✉",
      label: "CASHFLOW",
      title: `Prepare reminders for ${openInvoices} open ${openInvoices === 1 ? "invoice" : "invoices"}`,
      text: "AI found invoices that may need payment follow-up.",
      why: "Why: Draft reminders can help cashflow without auto-sending anything.",
      guardrail: "Nothing is sent to customers until the owner approves.",
      confidence: "Ready",
      tone: "amber",
    });
  }

  if (openQuotes > 0) {
    actions.push({
      icon: "☷",
      label: "SALES",
      title: `Follow up ${openQuotes} open ${openQuotes === 1 ? "quote" : "quotes"}`,
      text: "AI found quotes still waiting for a customer decision.",
      why: "Why: A timely follow-up can recover work that may otherwise go cold.",
      guardrail: "AI prepares editable follow-up drafts only.",
      confidence: "Ready",
      tone: "purple",
    });
  }

  if (completedNeedsInvoice > 0) {
    actions.push({
      icon: "▤",
      label: "INVOICE",
      title: `Draft ${completedNeedsInvoice} invoice ${completedNeedsInvoice === 1 ? "from completed work" : "from completed jobs"}`,
      text: "AI found completed jobs that do not appear to have linked invoices yet.",
      why: "Why: Completed work should move into proof, invoice draft and owner approval.",
      guardrail: "AI creates draft invoices only. Owner still approves before sending.",
      confidence: "Ready",
      tone: "green",
    });
  }

  return actions;
}

function ApprovalQueue({ unassigned, openInvoices, openQuotes, completedNeedsInvoice, onAction }) {
  const actions = buildApprovalActions({ unassigned, openInvoices, openQuotes, completedNeedsInvoice });

  return (
    <section className="op-approval">
      <header>
        <div>
          <h2>AI APPROVAL QUEUE <b>{actions.length}</b></h2>
          <p>{actions.length ? "Real actions ready for owner approval" : "No AI actions need approval right now"}</p>
        </div>
        <div className="op-confidence">
          AI mode <span>Approval-first</span>
          {actions.length ? (
            <button onClick={() => onAction?.({
              label: "Operator",
              title: "Review prepared actions",
              text: "Review the real approval queue and decide which AI-prepared moves should run.",
              why: "Owner approval is required before Churvox performs sensitive admin actions."
            }, "review")}>Review all</button>
          ) : null}
        </div>
      </header>

      {!actions.length ? (
        <div className="op-approval-empty">
          <strong>Nothing urgent waiting.</strong>
          <span>Churvox will show dispatch, invoice, quote and cashflow approvals here when real records need attention.</span>
        </div>
      ) : (
        <div className="op-approval-list">
          {actions.map((a) => (
            <article className={`op-action ${a.tone}`} key={a.label}>
              <i>{a.icon}</i>
              <div>
                <span>{a.label}</span>
                <strong>{a.title}</strong>
                <p>{a.text}</p>
                <small>{a.why}</small>
                <small>{a.guardrail}</small>
              </div>
              <em>{a.confidence}<b>LIVE</b></em>
              <div className="op-action-buttons">
                <button onClick={() => onAction?.(a, "approve")}>Approve</button>
                <button onClick={() => onAction?.(a, "review")}>Review</button>
              </div>
            </article>
          ))}
        </div>
      )}

      <footer>
        <span>{actions.length} {actions.length === 1 ? "action" : "actions"} ready</span>
        <strong>Owner approval required</strong>
      </footer>
    </section>
  );
}



function jobPhotos(job) {
  const raw = job.photos || job.job_photos || job.proof_photos || job.completion_photos || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => typeof p === "string" ? p : p?.url || p?.src || p?.path).filter(Boolean);
}

function jobProofSummary(job) {
  return (
    job.ai_summary ||
    job.completion_summary ||
    job.ai_invoice_description ||
    job.invoice_description_draft ||
    job.worker_completion_notes ||
    job.completion_notes ||
    job.worker_notes ||
    job.notes ||
    "Completed work is ready for owner review. Add proof notes/photos before sending anything to the client if needed."
  );
}

function ProofToPaid({ jobs = [], invoices = [], reload }) {
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const invoicedJobIds = new Set(invoices.map((i) => String(i.job_id || i.source_job_id || i.linked_job_id || "")).filter(Boolean));
  const candidates = jobs
    .filter((j) => ["completed", "done", "closed"].includes(statusSlug(j)))
    .filter((j) => !invoicedJobIds.has(String(j.id || j._id || "")))
    .slice(0, 8);

  async function createDraftInvoice(job) {
    if (!job || busy) return;
    setBusy(true);
    setNotice("");

    const total = Number(job.total || job.amount || job.price || job.job_price || job.subtotal || 0);
    const customerName = job.client_name || job.customer_name || job.customer || job.client || "Client";
    const description = jobProofSummary(job);

    const body = {
      job_id: job.id || job._id,
      source_job_id: job.id || job._id,
      client_id: job.client_id || job.customer_id || "",
      customer_id: job.customer_id || job.client_id || "",
      customer_name: customerName,
      client_name: customerName,
      customer_email: job.customer_email || job.client_email || "",
      address: job.address || job.site_address || job.job_address || "",
      description,
      subtotal: total,
      amount: total,
      total,
      status: "draft",
      created_by_ai: true,
      source: "proof_to_paid",
    };

    let ok = false;
    for (const path of ["/invoices", "/invoices/create"]) {
      try {
        await api(path, { method: "POST", body });
        ok = true;
        break;
      } catch {}
    }

    if (ok) {
      setNotice("Draft invoice created from completed job proof.");
      setSelected(null);
      await reload?.();
    } else {
      const drafts = readLocalList("churvox_operator_drafts");
      drafts.unshift({
        id: `proof-${Date.now()}`,
        type: "proof_to_paid_invoice_draft",
        title: `Invoice draft for ${titleOf(job, "completed job")}`,
        target: "/invoices",
        created_at: new Date().toISOString(),
        job_id: job.id || job._id,
        description,
        amount: total,
      });
      saveLocalList("churvox_operator_drafts", drafts);
      setNotice("Backend did not accept invoice creation yet. Draft saved for owner review.");
    }

    setBusy(false);
  }

  return (
    <section className="op-proof-live">
      <header>
        <div>
          <p>PROOF TO PAID</p>
          <h2>Completed work ready to invoice.</h2>
          <span>{candidates.length} completed {candidates.length === 1 ? "job" : "jobs"} waiting for invoice review</span>
        </div>
        <Link to="/invoices">Open invoices</Link>
      </header>

      {notice ? <div className="op-warning">{notice}</div> : null}

      {!candidates.length ? (
        <div className="op-approval-empty">
          <strong>No completed jobs waiting for invoice.</strong>
          <span>When workers complete jobs, Churvox will collect proof, prepare a summary and move the job toward a draft invoice.</span>
        </div>
      ) : (
        <div className="op-proof-live-grid">
          {candidates.map((job, index) => {
            const photos = jobPhotos(job);
            return (
              <article className="op-proof-live-card" key={job.id || job._id || index}>
                <div>
                  <span>COMPLETED</span>
                  <strong>{titleOf(job, `Completed job ${index + 1}`)}</strong>
                  <small>{[job.client_name || job.customer_name, job.address || job.site_address, money(job)].filter(Boolean).join(" · ") || "Ready for review"}</small>
                </div>

                <section>
                  <b>AI proof summary</b>
                  <p>{jobProofSummary(job)}</p>
                </section>

                <footer>
                  <small>{photos.length} proof {photos.length === 1 ? "photo" : "photos"}</small>
                  <button type="button" onClick={() => setSelected(job)}>Review proof</button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {selected ? (
        <div className="op-modal-backdrop" role="presentation" onClick={!busy ? () => setSelected(null) : undefined}>
          <section className="op-modal op-proof-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="op-modal-glow" />
            <header>
              <p>PROOF REVIEW</p>
              <button type="button" onClick={() => setSelected(null)} disabled={busy}>×</button>
            </header>

            <div className="op-modal-body">
              <span>COMPLETED JOB</span>
              <h2>{titleOf(selected, "Completed job")}</h2>
              <p>{jobProofSummary(selected)}</p>

              <div className="op-modal-reason">
                <strong>Job details</strong>
                <small>{[
                  selected.client_name || selected.customer_name,
                  selected.address || selected.site_address,
                  selected.completed_at ? `Completed ${new Date(selected.completed_at).toLocaleString()}` : "",
                  money(selected) || "Amount needs review"
                ].filter(Boolean).join(" · ")}</small>
              </div>

              <div className="op-modal-reason">
                <strong>Owner approval guardrail</strong>
                <small>Churvox will create a draft invoice only. Nothing is sent to the client until the owner approves it.</small>
              </div>

              {jobPhotos(selected).length ? (
                <div className="op-proof-photo-grid">
                  {jobPhotos(selected).slice(0, 6).map((src, idx) => (
                    <img key={`${src}-${idx}`} src={src} alt={`Job proof ${idx + 1}`} />
                  ))}
                </div>
              ) : (
                <div className="op-approval-empty">
                  <strong>No proof photos found.</strong>
                  <span>You can still create a draft invoice, but owner review is recommended before sending.</span>
                </div>
              )}
            </div>

            <footer>
              <button type="button" className="op-modal-secondary" onClick={() => setSelected(null)} disabled={busy}>Cancel</button>
              <button type="button" className="op-modal-primary" onClick={() => createDraftInvoice(selected)} disabled={busy}>
                {busy ? "Creating draft..." : "Create draft invoice"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}


function CrewStatus({ team }) {
  const rows = team.slice(0, 6);

  return (
    <section className="op-panel op-crew">
      <header><h3>CREW STATUS</h3><Link to="/team">View all crew</Link></header>
      {rows.length ? rows.map((w, i) => (
        <div className="op-crew-row" key={w.id || w._id || i}>
          <i>{(titleOf(w, "W")[0] || "W").toUpperCase()}</i>
          <strong>{titleOf(w, `Worker ${i + 1}`)}</strong>
          <span className={statusOf(w, "active").toLowerCase().replace(" ", "-")}>● {statusOf(w, "active")}</span>
          <small>⌖ {w.region || w.location || w.suburb || "Region not set"}</small>
        </div>
      )) : <div className="op-empty">No crew added yet</div>}
      <footer>{team.length} crew members</footer>
    </section>
  );
}

function Cashflow({ invoices }) {
  const invoiced = invoices.reduce((sum, x) => sum + Number(x.total || x.amount || 0), 0);
  const received = invoices.filter((x) => String(statusOf(x,"")).toLowerCase().includes("paid")).reduce((sum, x) => sum + Number(x.total || x.amount || 0), 0);
  const outstanding = Math.max(invoiced - received, 0);
  return (
    <section className="op-panel op-cash">
      <header><h3>CASHFLOW OVERVIEW</h3><Link to="/invoices">Live</Link></header>
      <div className="op-cash-grid">
        <div className="op-donut" />
        <div>
          <strong>{money({ total: received }) || "$0"}</strong>
          <span>Received payments</span>
          <p><i className="blue" /> Invoiced {money({ total: invoiced }) || "$0"}</p>
          <p><i className="green" /> Received {money({ total: received }) || "$0"}</p>
          <p><i className="orange" /> Outstanding {money({ total: outstanding }) || "$0"}</p>
        </div>
      </div>
    </section>
  );
}

function Schedule({ jobs }) {
  const rows = jobs.filter((j) => !["completed","done","cancelled"].includes(statusSlug(j))).slice(0, 6);
  return (
    <section className="op-panel">
      <header><h3>TODAY'S SCHEDULE <b>{rows.length}</b></h3><Link to="/jobs">View full schedule</Link></header>
      {!rows.length ? <div className="op-empty">No jobs yet</div> : rows.map((r, idx) => (
        <div className="op-schedule-row" key={r.id || r._id || idx}>
          <span>▦ {r.scheduled_time || r.start_time || "Time TBD"}</span>
          <strong>{titleOf(r, `Job ${idx+1}`)}<small>{r.assigned_worker_name || r.worker_name || "Unassigned"}</small></strong>
          <em>⌖ {r.address || r.site_address || r.region || "Location TBD"}</em>
        </div>
      ))}
    </section>
  );
}

function QuotePipeline({ quotes }) {
  const open = quotes.filter((q) => ["open","sent","pending","waiting","draft"].includes(statusSlug(q)));
  return (
    <section className="op-pipeline">
      <h3>QUOTE PIPELINE <b>{open.length}</b></h3>
      {!open.length ? <div className="op-empty">No quotes awaiting follow-up</div> : open.slice(0, 5).map((q, i) => (
        <article key={q.id || q._id || i}><span>{statusOf(q, "open")}</span><strong>{titleOf(q, `Quote ${i+1}`)}</strong><small>{money(q) || "Amount needs review"}</small></article>
      ))}
    </section>
  );
}

function LiveActivity({ history }) {
  return (
    <section className="op-panel op-activity">
      <header><h3>LIVE ACTIVITY</h3><Link to="/dashboard">View all activity</Link></header>
      {!history.length ? <div className="op-empty">No activity yet</div> : history.map((h) => (
        <div className="op-activity-row" key={h.id}><i>✓</i><span>{h.title}</span><small>{new Date(h.created_at).toLocaleString()}</small></div>
      ))}
    </section>
  );
}

function DataPanel({ title, items, type }) {
  const list = items.length ? items.slice(0, 6) : [];
  return (
    <section className="op-panel op-data">
      <header><h3>{title} <b>{list.length}</b></h3><a>View all {type}</a></header>
      {!list.length ? <div className="op-empty">{type === "jobs" ? "No jobs yet" : type === "invoices" ? "No invoices yet" : type === "quotes" ? "No quotes awaiting follow-up" : "No data yet"}</div> : null}
      {list.map((item, index) => (
        <div className="op-data-row" key={item?.id || item?._id || index}>
          <div>
            <strong>{titleOf(item, `${type} ${index + 1}`)}</strong>
            <small>{[item.client_name || item.customer_name, item.address || item.site_address, money(item)].filter(Boolean).join(" · ")}</small>
          </div>
          <span>{statusOf(item, type === "invoices" ? "draft" : "assigned")}</span>
        </div>
      ))}
    </section>
  );
}


function actionTarget(action) {
  const label = String(action?.label || action?.title || "").toLowerCase();

  if (label.includes("dispatch") || label.includes("assign") || label.includes("job")) return "/jobs";
  if (label.includes("cashflow") || label.includes("invoice") || label.includes("payment")) return "/invoices";
  if (label.includes("sales") || label.includes("quote")) return "/quotes";
  if (label.includes("crew")) return "/team";
  return "/dashboard";
}

function readLocalList(key) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}

function saveLocalList(key, rows, max = 80) {
  localStorage.setItem(key, JSON.stringify(rows.slice(0, max)));
}

function saveApprovalLog(action, mode, result = "reviewed") {
  try {
    const existing = readLocalList("churvox_operator_approval_log");
    existing.unshift({
      id: `${Date.now()}`,
      mode,
      result,
      label: action?.label || "AI Action",
      title: action?.title || "Prepared action",
      target: actionTarget(action),
      created_at: new Date().toISOString(),
    });
    saveLocalList("churvox_operator_approval_log", existing, 40);
  } catch {}
}

function statusSlug(item) { return statusOf(item, "").toLowerCase().trim(); }
function isUnassigned(job) { return !(job?.assigned_worker_id || job?.worker_id || job?.assigned_to); }
function isActiveWorker(worker) { return ["active", "available", "on_site", "busy"].includes(String(worker?.status || "active").toLowerCase()); }

function chooseDispatchCandidate(jobs, team) {
  const unassigned = jobs.filter(isUnassigned).filter((j) => !["completed", "cancelled", "closed", "done"].includes(statusSlug(j)));
  const activeWorkers = team.filter(isActiveWorker);
  if (!unassigned.length || !activeWorkers.length) return { job: unassigned[0], worker: activeWorkers[0], reason: "No eligible dispatch records found." };
  const job = unassigned[0];
  const assignedCount = new Map();
  jobs.forEach((j) => {
    const key = String(j.assigned_worker_id || j.worker_id || j.assigned_to || "");
    if (key) assignedCount.set(key, (assignedCount.get(key) || 0) + 1);
  });
  const jobRegion = String(job.region || job.location || job.suburb || "").toLowerCase();
  const sorted = [...activeWorkers].sort((a, b) => {
    const aMatch = jobRegion && String(a.region || a.location || a.suburb || "").toLowerCase() === jobRegion ? 1 : 0;
    const bMatch = jobRegion && String(b.region || b.location || b.suburb || "").toLowerCase() === jobRegion ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;
    const aCount = assignedCount.get(String(a.id || a._id || "")) || 0;
    const bCount = assignedCount.get(String(b.id || b._id || "")) || 0;
    return aCount - bCount;
  });
  const worker = sorted[0] || activeWorkers[0];
  return { job, worker, reason: "Worker selected using active status, regional match, and lowest assigned load." };
}

function buildActionPreview(action, data) {
  const label = String(action?.label || "").toLowerCase();
  if (label.includes("dispatch")) {
    const pick = chooseDispatchCandidate(data.jobs, data.team);
    return { records: pick.job && pick.worker ? [pick.job, pick.worker] : [], reason: pick.reason, pick };
  }
  if (label.includes("cashflow")) {
    const invoices = data.invoices.filter((x) => ["open", "unpaid", "draft", "sent", "overdue"].includes(statusSlug(x))).filter((x) => !["paid", "void", "cancelled"].includes(statusSlug(x))).slice(0, 20);
    return { records: invoices, reason: "Prepared reminder drafts only for open invoices." };
  }
  if (label.includes("sales")) {
    const quotes = data.quotes.filter((x) => ["open", "sent", "pending", "waiting", "draft"].includes(statusSlug(x))).filter((x) => !["accepted", "declined", "converted"].includes(statusSlug(x))).slice(0, 20);
    return { records: quotes, reason: "Prepared follow-up drafts only for quotes awaiting response." };
  }
  if (label.includes("invoice")) {
    const invoicedIds = new Set(data.invoices.map((i) => String(i.job_id || i.source_job_id || i.linked_job_id || "")).filter(Boolean));
    const jobs = data.jobs.filter((j) => ["completed", "done", "closed"].includes(statusSlug(j))).filter((j) => !invoicedIds.has(String(j.id || j._id || ""))).slice(0, 10);
    return { records: jobs, reason: "Completed jobs without invoice detected for draft invoice preparation." };
  }
  return { records: [], reason: "Owner review required." };
}

function ActionModal({ modal, onClose, onConfirm, busy }) {
  if (!modal) return null;
  const { action = {}, mode = "review", preview = {} } = modal;
  const target = actionTarget(action);
  return (<div className="op-modal-backdrop" role="presentation" onClick={!busy ? onClose : undefined}>
    <section className="op-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
      <div className="op-modal-glow" />
      <header><p>{mode === "approve" ? "APPROVE AI MOVE" : "REVIEW AI MOVE"}</p><button type="button" onClick={onClose} disabled={busy}>×</button></header>
      <div className="op-modal-body">
        <span>{action.label || "AI OPERATOR"}</span><h2>{action.title || "Prepared action"}</h2><p>{action.text || "Churvox has prepared this move for your approval."}</p>
        <div className="op-modal-reason"><strong>AI reasoning</strong><small>{preview.reason || action.why || "Based on live data and approval-first policy."}</small></div>
        <div className="op-modal-reason"><strong>Owner approval required</strong><small>No customer messages, invoice sends, charges or payroll actions will run automatically.</small></div>
        <div className="op-modal-records">{(preview.records || []).slice(0, 6).map((item, idx)=><div key={item.id || item._id || idx}><b>{titleOf(item, `Record ${idx+1}`)}</b><small>{statusOf(item, "ready")} · {money(item) || item.address || item.region || item.email || ""}</small></div>)}</div>
        <div className="op-modal-route"><b>Review workspace</b><em>{target}</em></div>
      </div>
      <footer>
        <button type="button" className="op-modal-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className="op-modal-secondary" onClick={() => onConfirm("review")} disabled={busy}>Review workspace</button>
        <button type="button" className="op-modal-primary" onClick={() => onConfirm("approve")} disabled={busy}>{busy ? "Working..." : "Approve action"}</button>
      </footer>
    </section></div>);
}



function recommendWorkerForJob(job, jobs, team) {
  const activeWorkers = team.filter(isActiveWorker);
  if (!activeWorkers.length) return { worker: null, reason: "No active workers available yet." };

  const assignedCount = new Map();
  jobs.forEach((j) => {
    const key = String(j.assigned_worker_id || j.worker_id || j.assigned_to || "");
    if (key) assignedCount.set(key, (assignedCount.get(key) || 0) + 1);
  });

  const jobRegion = String(job.region || job.location || job.suburb || job.address || "").toLowerCase();

  const sorted = [...activeWorkers].sort((a, b) => {
    const aArea = String(a.region || a.location || a.suburb || "").toLowerCase();
    const bArea = String(b.region || b.location || b.suburb || "").toLowerCase();

    const aMatch = jobRegion && aArea && jobRegion.includes(aArea) ? 1 : 0;
    const bMatch = jobRegion && bArea && jobRegion.includes(bArea) ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;

    const aCount = assignedCount.get(String(a.id || a._id || "")) || 0;
    const bCount = assignedCount.get(String(b.id || b._id || "")) || 0;
    if (aCount !== bCount) return aCount - bCount;

    return titleOf(a, "").localeCompare(titleOf(b, ""));
  });

  const worker = sorted[0];
  const load = assignedCount.get(String(worker.id || worker._id || "")) || 0;
  const regionText = worker.region || worker.location || worker.suburb ? "area match checked" : "no worker region set";
  return {
    worker,
    reason: `Recommended from active workers using ${regionText} and current workload (${load} assigned).`,
  };
}

function hasScheduleConflict(worker, job, jobs) {
  const workerId = String(worker?.id || worker?._id || "");
  if (!workerId) return false;

  const jobDate = String(job?.scheduled_date || job?.date || "").slice(0, 10);
  const jobTime = String(job?.scheduled_time || job?.start_time || "");
  if (!jobDate && !jobTime) return false;

  return jobs.some((j) => {
    if (String(j.id || j._id || "") === String(job.id || job._id || "")) return false;
    const assigned = String(j.assigned_worker_id || j.worker_id || j.assigned_to || "");
    if (assigned !== workerId) return false;
    const otherDate = String(j.scheduled_date || j.date || "").slice(0, 10);
    const otherTime = String(j.scheduled_time || j.start_time || "");
    return (jobDate && otherDate && jobDate === otherDate) && (!jobTime || !otherTime || jobTime === otherTime);
  });
}

function DispatchBoard({ jobs, team, reload }) {
  const [selected, setSelected] = useState(null);
  const [workerId, setWorkerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const unassigned = jobs
    .filter(isUnassigned)
    .filter((j) => !["completed", "cancelled", "closed", "done"].includes(statusSlug(j)))
    .slice(0, 12);

  function openAssign(job) {
    const pick = recommendWorkerForJob(job, jobs, team);
    setSelected({ job, pick });
    setWorkerId(String(pick.worker?.id || pick.worker?._id || ""));
    setNotice("");
  }

  async function approveAssignment() {
    if (!selected?.job || !workerId || busy) return;

    const job = selected.job;
    const worker = team.find((w) => String(w.id || w._id || "") === String(workerId));
    const jobId = job.id || job._id;

    setBusy(true);
    setNotice("");

    const payloads = [
      { worker_id: workerId, assigned_worker_id: workerId, assigned_worker_name: titleOf(worker, "Worker") },
      { assigned_worker_id: workerId, assigned_worker_name: titleOf(worker, "Worker") },
      { worker_id: workerId, worker_name: titleOf(worker, "Worker") },
    ];

    const calls = [
      () => api(`/jobs/${jobId}/assign`, { method: "POST", body: payloads[0] }),
      () => api(`/jobs/${jobId}/assign-worker`, { method: "POST", body: payloads[1] }),
      () => api(`/jobs/${jobId}`, { method: "PATCH", body: payloads[1] }),
      () => api(`/jobs/${jobId}`, { method: "PUT", body: payloads[2] }),
    ];

    let ok = false;
    for (const fn of calls) {
      try {
        await fn();
        ok = true;
        break;
      } catch {}
    }

    if (ok) {
      setNotice("Worker assigned successfully.");
      setSelected(null);
      await reload?.();
    } else {
      setNotice("Backend did not accept assignment yet. Review job assignment endpoint wiring.");
    }

    setBusy(false);
  }

  return (
    <section className="op-dispatch">
      <header>
        <div>
          <p>AI DISPATCH BOARD</p>
          <h2>Unassigned work, matched to your crew.</h2>
          <span>{unassigned.length} unassigned {unassigned.length === 1 ? "job" : "jobs"} · {team.length} crew members</span>
        </div>
        <Link to="/jobs">Open jobs workspace</Link>
      </header>

      {notice ? <div className="op-warning">{notice}</div> : null}

      {!unassigned.length ? (
        <div className="op-approval-empty">
          <strong>No dispatch needed right now.</strong>
          <span>When jobs are created without workers, Churvox will show them here with an AI worker recommendation.</span>
        </div>
      ) : (
        <div className="op-dispatch-grid">
          {unassigned.map((job, index) => {
            const pick = recommendWorkerForJob(job, jobs, team);
            const conflict = pick.worker ? hasScheduleConflict(pick.worker, job, jobs) : false;

            return (
              <article className="op-dispatch-card" key={job.id || job._id || index}>
                <div>
                  <span>{statusOf(job, "unassigned")}</span>
                  <strong>{titleOf(job, `Job ${index + 1}`)}</strong>
                  <small>{[job.client_name || job.customer_name, job.address || job.site_address || job.region, job.scheduled_time || "Time TBD"].filter(Boolean).join(" · ")}</small>
                </div>

                <section>
                  <b>AI recommends</b>
                  <strong>{pick.worker ? titleOf(pick.worker, "Worker") : "Add a worker first"}</strong>
                  <small>{pick.reason}</small>
                  {conflict ? <em>Schedule conflict warning</em> : null}
                </section>

                <button type="button" onClick={() => openAssign(job)} disabled={!team.length}>
                  Assign worker
                </button>
              </article>
            );
          })}
        </div>
      )}

      {selected ? (
        <div className="op-modal-backdrop" role="presentation" onClick={!busy ? () => setSelected(null) : undefined}>
          <section className="op-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="op-modal-glow" />
            <header>
              <p>APPROVE DISPATCH</p>
              <button type="button" onClick={() => setSelected(null)} disabled={busy}>×</button>
            </header>

            <div className="op-modal-body">
              <span>WORKER MATCH</span>
              <h2>{titleOf(selected.job, "Unassigned job")}</h2>
              <p>{selected.pick.reason}</p>

              <div className="op-modal-reason">
                <strong>Job</strong>
                <small>{[selected.job.client_name || selected.job.customer_name, selected.job.address || selected.job.site_address, selected.job.scheduled_time || "Time TBD"].filter(Boolean).join(" · ")}</small>
              </div>

              <div className="op-modal-reason">
                <strong>Choose worker</strong>
                <select className="op-select" value={workerId} onChange={(event) => setWorkerId(event.target.value)}>
                  <option value="">Select worker</option>
                  {team.map((worker) => (
                    <option key={worker.id || worker._id || worker.email} value={worker.id || worker._id}>
                      {titleOf(worker, "Worker")} · {worker.region || worker.location || worker.suburb || "No region"}
                    </option>
                  ))}
                </select>
              </div>

              {workerId && hasScheduleConflict(team.find((w) => String(w.id || w._id || "") === String(workerId)), selected.job, jobs) ? (
                <div className="op-modal-reason danger">
                  <strong>Conflict warning</strong>
                  <small>This worker appears to have another job scheduled at the same date/time. Review before approving.</small>
                </div>
              ) : null}
            </div>

            <footer>
              <button type="button" className="op-modal-secondary" onClick={() => setSelected(null)} disabled={busy}>Cancel</button>
              <button type="button" className="op-modal-primary" onClick={approveAssignment} disabled={busy || !workerId}>
                {busy ? "Assigning..." : "Approve assignment"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}


function Dashboard() {
  const data = useLiveData();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const history = useMemo(() => readLocalList("churvox_operator_approval_log").slice(0,5), [tick]);
  const drafts = useMemo(() => readLocalList("churvox_operator_drafts").slice(0,5), [tick]);

  function openAction(action, mode) { setModal({ action, mode, preview: buildActionPreview(action, data) }); }
  function pushDraft(draft) { const rows = readLocalList("churvox_operator_drafts"); rows.unshift({ id:`d-${Date.now()}`, created_at:new Date().toISOString(), ...draft }); saveLocalList("churvox_operator_drafts", rows); setTick((x)=>x+1); }

  async function tryDispatch(preview) {
    const job = preview?.pick?.job; const worker = preview?.pick?.worker;
    if (!job || !worker) throw new Error("No eligible job/worker found.");
    const jobId = job.id || job._id; const workerId = worker.id || worker._id;
    const payloads = [{ worker_id: workerId, assigned_worker_id: workerId },{ assigned_worker_id: workerId },{ worker_id: workerId }];
    const calls = [
      () => api(`/jobs/${jobId}/assign`, { method: "POST", body: payloads[0] }),
      () => api(`/jobs/${jobId}/assign-worker`, { method: "POST", body: payloads[1] }),
      () => api(`/jobs/${jobId}`, { method: "PATCH", body: payloads[1] }),
      () => api(`/jobs/${jobId}`, { method: "PUT", body: payloads[2] }),
    ];
    for (const fn of calls) { try { await fn(); return { job, worker }; } catch {} }
    pushDraft({ type:"assignment_recommendation", title:`Assign ${titleOf(job,'job')} to ${titleOf(worker,'worker')}`, target:"/jobs" });
    setToast("Backend did not accept assignment yet. Recommendation saved.");
    return null;
  }

  async function confirmAction(intent) {
    if (!modal || busy) return;
    const target = actionTarget(modal.action);
    if (intent === "review") { saveApprovalLog(modal.action, "review", "reviewed"); setModal(null); setTick((x)=>x+1); navigate(target); return; }
    setBusy(true);
    try {
      const label = String(modal.action?.label || "").toLowerCase();
      if (label.includes("dispatch")) {
        const result = await tryDispatch(modal.preview);
        saveApprovalLog(modal.action, "approve", result ? "approved" : "drafted");
        if (result) { await data.reload(); setToast("Dispatch approved and assignment updated."); }
      } else if (label.includes("cashflow")) {
        (modal.preview.records || []).forEach((inv) => pushDraft({ type:"payment_reminder", title:`Reminder draft for ${titleOf(inv,'invoice')}`, target:"/invoices" }));
        saveApprovalLog(modal.action, "approve", "drafted"); setToast("Payment reminder drafts prepared. Nothing was sent.");
      } else if (label.includes("sales")) {
        (modal.preview.records || []).forEach((q) => pushDraft({ type:"quote_followup", title:`Follow-up draft for ${titleOf(q,'quote')}`, target:"/quotes" }));
        saveApprovalLog(modal.action, "approve", "drafted"); setToast("Quote follow-up drafts prepared. Nothing was sent.");
      } else if (label.includes("invoice")) {
        const job = modal.preview.records?.[0];
        if (job) {
          const body = { job_id: job.id || job._id, client_id: job.client_id || job.customer_id, customer_id: job.customer_id || job.client_id, client_name: job.client_name || job.customer_name, status: "draft", amount: Number(job.total || job.amount || job.price || 0), total: Number(job.total || job.amount || job.price || 0), description: `Draft invoice for ${job.title || 'completed job'} at ${job.address || job.site_address || 'client site'}`, created_by_ai: true };
          let ok = false; for (const path of ["/invoices", "/invoices/create"]) { try { await api(path, { method: "POST", body }); ok = true; break; } catch {} }
          if (!ok) { pushDraft({ type:"invoice_draft", title:`Invoice draft for ${titleOf(job,'completed job')}`, target:"/invoices" }); setToast("Invoice draft saved locally for review."); saveApprovalLog(modal.action, "approve", "drafted"); }
          else { await data.reload(); saveApprovalLog(modal.action, "approve", "approved"); setToast("Invoice draft created for review."); navigate('/invoices'); }
        }
      }
    } finally { setBusy(false); setModal(null); setTick((x)=>x+1); }
  }

  const openInvoices = data.invoices.filter((x) => !["paid", "void", "cancelled"].includes(statusOf(x).toLowerCase()));
  const openQuotes = data.quotes.filter((x) => !["accepted", "declined", "converted"].includes(statusOf(x).toLowerCase()));
  const unassigned = data.jobs.filter(isUnassigned);
  const invoicedJobIds = new Set(data.invoices.map((i) => String(i.job_id || i.source_job_id || i.linked_job_id || "")).filter(Boolean));
  const completedNeedsInvoice = data.jobs
    .filter((j) => ["completed", "done", "closed"].includes(statusSlug(j)))
    .filter((j) => !invoicedJobIds.has(String(j.id || j._id || "")));
  const prepared = unassigned.length + openInvoices.length + openQuotes.length + completedNeedsInvoice.length;

  return <Shell><Topbar />{toast ? <div className="op-warning">{toast}</div> : null}<ActionModal modal={modal} onClose={() => setModal(null)} onConfirm={confirmAction} busy={busy} />{data.error ? <div className="op-warning">{data.error}</div> : null}<Hero data={data} prepared={prepared} />
  <section className="op-top-grid"><ApprovalQueue unassigned={unassigned.length} openInvoices={openInvoices.length} openQuotes={openQuotes.length} completedNeedsInvoice={completedNeedsInvoice.length} onAction={openAction} /><ProofToPaid jobs={data.jobs} invoices={data.invoices} reload={data.reload} /></section>
  <DispatchBoard jobs={data.jobs} team={data.team} reload={data.reload} />
  <section className="op-mid-grid"><CrewStatus team={data.team} /><Cashflow invoices={data.invoices} /><Schedule jobs={data.jobs} /><LiveActivity history={history} /></section>
  <section className="op-bottom-grid"><DataPanel title="TODAY'S SCHEDULE" type="jobs" items={data.jobs} /><DataPanel title="QUOTE PIPELINE" type="quotes" items={data.quotes} /></section>
  <section className="op-bottom-grid"><section className="op-panel"><h3>APPROVAL HISTORY</h3>{history.map((h)=><div className="op-data-row" key={h.id}><strong>{h.result || h.mode}</strong><small>{h.title} · {new Date(h.created_at).toLocaleString()} · {h.target}</small></div>)}</section><section className="op-panel"><h3>OPERATOR DRAFTS</h3>{drafts.map((d)=><div className="op-data-row" key={d.id}><strong>{d.title}</strong><small>{d.type} · {new Date(d.created_at).toLocaleString()} · {d.target}</small></div>)}</section></section>
  <QuotePipeline quotes={data.quotes} /></Shell>;
}


function Workspace({ kind }) {
  const data = useLiveData();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [jobActionBusy, setJobActionBusy] = useState(false);
  const [workspaceToast, setWorkspaceToast] = useState("");

  const map = {
    jobs: ["Jobs Command", "Schedule, dispatch, prove and complete work.", data.jobs, "jobs"],
    clients: ["Client Command", "Customers, sites and repeat work.", data.clients, "clients"],
    quotes: ["Quote Command", "Follow-ups, approvals and conversion.", data.quotes, "quotes"],
    invoices: ["Money Command", "Draft, send, follow up and collect.", data.invoices, "invoices"],
    team: ["Crew Command", "Availability, roles and dispatch.", data.team, "crew"],
  };

  const [title, subtitle, items, type] = map[kind] || map.jobs;

  const drafts = readLocalList("churvox_operator_drafts").filter((draft) => {
    const target = String(draft.target || "").toLowerCase();
    const draftType = String(draft.type || "").toLowerCase();

    if (kind === "jobs") return target.includes("jobs") || draftType.includes("assignment");
    if (kind === "invoices") return target.includes("invoice") || draftType.includes("payment");
    if (kind === "quotes") return target.includes("quote");
    return target.includes(kind);
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      const haystack = [
        titleOf(item, ""),
        item.client_name,
        item.customer_name,
        item.address,
        item.site_address,
        item.email,
        item.phone,
        item.region,
        item.role,
        statusOf(item, ""),
        money(item),
      ].filter(Boolean).join(" ").toLowerCase();

      return haystack.includes(q);
    });
  }, [items, query]);

  function primaryLine(item) {
    if (kind === "jobs") {
      return [item.client_name || item.customer_name, item.address || item.site_address, item.assigned_worker_name || item.worker_name].filter(Boolean).join(" · ");
    }

    if (kind === "invoices" || kind === "quotes") {
      return [item.client_name || item.customer_name, money(item), item.due_date || item.created_at].filter(Boolean).join(" · ");
    }

    if (kind === "clients") {
      return [item.email, item.phone, item.address].filter(Boolean).join(" · ");
    }

    if (kind === "team") {
      return [item.role, item.email, item.phone, item.region].filter(Boolean).join(" · ");
    }

    return "";
  }

  function aiHint(item) {
    if (kind !== "jobs") return "";

    if (isUnassigned(item)) return "AI: needs worker assignment";

    const s = statusOf(item, "").toLowerCase();
    if (s.includes("complete")) return "AI: ready for invoice check";

    return "AI: watching job progress";
  }

  function statusClass(item) {
    const s = statusOf(item, "").toLowerCase();

    if (s.includes("complete") || s.includes("paid") || s.includes("accepted") || s.includes("active")) return "good";
    if (s.includes("overdue") || s.includes("cancel") || s.includes("declin")) return "bad";
    if (s.includes("draft") || s.includes("pending") || s.includes("sent") || s.includes("assigned")) return "wait";

    return "info";
  }


  function workspaceRecordId(item) {
    return item?.id || item?._id || item?.job_id || item?.worker_id || "";
  }

  function saveWorkspaceDraft(draft) {
    const rows = readLocalList("churvox_operator_drafts");
    rows.unshift({
      id: `d-${Date.now()}`,
      created_at: new Date().toISOString(),
      ...draft,
    });
    saveLocalList("churvox_operator_drafts", rows);
  }

  function activeWorkers() {
    return data.team.filter((worker) => isActiveWorker(worker));
  }

  function saveJobAssignmentRecommendation() {
    if (kind !== "jobs" || !selected) return;

    const workers = activeWorkers();
    const worker =
      workers.find((w) => String(workspaceRecordId(w)) === String(selectedWorkerId)) ||
      workers[0];

    if (!worker) {
      setWorkspaceToast("No active worker found.");
      return;
    }

    saveWorkspaceDraft({
      type: "assignment_recommendation",
      title: `Assign ${titleOf(selected, "job")} to ${titleOf(worker, "worker")}`,
      target: "/jobs",
      job_id: workspaceRecordId(selected),
      worker_id: workspaceRecordId(worker),
    });

    saveApprovalLog(
      { label: "DISPATCH", title: `Assignment prepared for ${titleOf(selected, "job")}` },
      "drafted",
      "drafted"
    );

    setWorkspaceToast("Assignment recommendation saved for approval.");
  }

  function saveJobInvoiceDraft() {
    if (kind !== "jobs" || !selected) return;

    const amount = Number(selected.total || selected.amount || selected.price || selected.job_price || 0) || 0;

    saveWorkspaceDraft({
      type: "invoice_draft",
      title: `Invoice draft for ${titleOf(selected, "job")}`,
      target: "/invoices",
      record: {
        job_id: workspaceRecordId(selected),
        client_id: selected.client_id || selected.customer_id || "",
        client_name: selected.client_name || selected.customer_name || "",
        status: "draft",
        amount,
        total: amount,
        description: `Draft invoice for ${titleOf(selected, "completed job")} at ${selected.address || selected.site_address || "client site"}. Prepared by Churvox Operator OS.`,
        created_by_ai: true,
      },
    });

    saveApprovalLog(
      { label: "INVOICE", title: `Invoice draft prepared for ${titleOf(selected, "job")}` },
      "drafted",
      "drafted"
    );

    setWorkspaceToast("Invoice draft saved for review.");
  }


  function workspaceRecordId(item) {
    return item?.id || item?._id || item?.job_id || item?.worker_id || "";
  }

  function saveWorkspaceDraft(draft) {
    const rows = readLocalList("churvox_operator_drafts");
    rows.unshift({
      id: `d-${Date.now()}`,
      created_at: new Date().toISOString(),
      ...draft,
    });
    saveLocalList("churvox_operator_drafts", rows);
  }

  function activeWorkers() {
    return data.team.filter((worker) => isActiveWorker(worker));
  }

  async function prepareJobAssignmentDraft() {
    if (kind !== "jobs" || !selected || jobActionBusy) return;

    const workers = activeWorkers();
    const worker =
      workers.find((w) => String(workspaceRecordId(w)) === String(selectedWorkerId)) ||
      workers[0];

    if (!worker) {
      setWorkspaceToast("No active worker found. Add a worker first.");
      return;
    }

    const jobId = workspaceRecordId(selected);
    const workerId = workspaceRecordId(worker);

    if (!jobId || !workerId) {
      saveWorkspaceDraft({
        type: "assignment_recommendation",
        title: `Assign ${titleOf(selected, "job")} to ${titleOf(worker, "worker")}`,
        target: "/jobs",
        job_id: jobId,
        worker_id: workerId,
        job_title: titleOf(selected, "job"),
        worker_name: titleOf(worker, "worker"),
        text: "Could not safely find job/worker IDs, so this was saved as a recommendation.",
      });

      saveApprovalLog(
        { label: "DISPATCH", title: `Assignment recommendation saved for ${titleOf(selected, "job")}` },
        "drafted",
        "drafted"
      );

      setWorkspaceToast("Missing job or worker ID. Recommendation saved.");
      return;
    }

    const payloads = [
      {
        worker_id: workerId,
        assigned_worker_id: workerId,
        assigned_to: workerId,
        assigned_worker_name: titleOf(worker, "Worker"),
      },
      {
        assigned_worker_id: workerId,
        assigned_worker_name: titleOf(worker, "Worker"),
      },
      {
        worker_id: workerId,
        assigned_worker_name: titleOf(worker, "Worker"),
      },
    ];

    const calls = [
      () => api(`/jobs/${jobId}/assign`, { method: "POST", body: payloads[0] }),
      () => api(`/jobs/${jobId}/assign-worker`, { method: "POST", body: payloads[0] }),
      () => api(`/jobs/${jobId}`, { method: "PATCH", body: payloads[1] }),
      () => api(`/jobs/${jobId}`, { method: "PUT", body: payloads[2] }),
    ];

    setJobActionBusy(true);

    try {
      let success = false;

      for (const call of calls) {
        try {
          await call();
          success = true;
          break;
        } catch {
          // Try the next safe endpoint.
        }
      }

      if (!success) {
        saveWorkspaceDraft({
          type: "assignment_recommendation",
          title: `Assign ${titleOf(selected, "job")} to ${titleOf(worker, "worker")}`,
          target: "/jobs",
          job_id: jobId,
          worker_id: workerId,
          job_title: titleOf(selected, "job"),
          worker_name: titleOf(worker, "worker"),
          text: "Backend did not accept assignment yet. Recommendation saved for owner review.",
        });

        saveApprovalLog(
          { label: "DISPATCH", title: `Assignment recommendation saved for ${titleOf(selected, "job")}` },
          "drafted",
          "drafted"
        );

        setWorkspaceToast("Backend did not accept assignment yet. Recommendation saved.");
        return;
      }

      saveApprovalLog(
        { label: "DISPATCH", title: `Assigned ${titleOf(selected, "job")} to ${titleOf(worker, "worker")}` },
        "approve",
        "approved"
      );

      setWorkspaceToast(`Assigned ${titleOf(selected, "job")} to ${titleOf(worker, "worker")}.`);
      await data.reload();
      setSelected(null);
    } finally {
      setJobActionBusy(false);
    }
  }
async function prepareJobInvoiceDraft() {
    if (kind !== "jobs" || !selected || jobActionBusy) return;

    const jobId = workspaceRecordId(selected);
    const amount = Number(selected.total || selected.amount || selected.price || selected.job_price || 0) || 0;

    const body = {
      job_id: jobId,
      client_id: selected.client_id || selected.customer_id || "",
      customer_id: selected.customer_id || selected.client_id || "",
      client_name: selected.client_name || selected.customer_name || "",
      status: "draft",
      amount,
      total: amount,
      description: `Draft invoice for ${titleOf(selected, "completed job")} at ${selected.address || selected.site_address || "client site"}. Prepared by Churvox Operator OS.`,
      created_by_ai: true,
    };

    setJobActionBusy(true);

    try {
      let success = false;

      for (const path of ["/invoices", "/invoices/create"]) {
        try {
          await api(path, { method: "POST", body });
          success = true;
          break;
        } catch {
          // Try the next safe endpoint.
        }
      }

      if (!success) {
        saveWorkspaceDraft({
          type: "invoice_draft",
          title: `Invoice draft for ${titleOf(selected, "job")}`,
          target: "/invoices",
          record: body,
          text: body.description,
        });

        saveApprovalLog(
          { label: "INVOICE", title: `Invoice draft saved locally for ${titleOf(selected, "job")}` },
          "drafted",
          "drafted"
        );

        setWorkspaceToast("Backend did not accept invoice creation yet. Draft saved locally for review.");
        return;
      }

      saveApprovalLog(
        { label: "INVOICE", title: `Draft invoice created for ${titleOf(selected, "job")}` },
        "approve",
        "approved"
      );

      setWorkspaceToast("Draft invoice created for review.");
      await data.reload();
      setSelected(null);
    } finally {
      setJobActionBusy(false);
    }
  }



  function prepareInvoiceReminderDraft() {
    if (kind !== "invoices" || !selected) return;

    saveWorkspaceDraft({
      type: "payment_reminder",
      title: `Payment reminder draft for ${titleOf(selected, "invoice")}`,
      target: "/invoices",
      invoice_id: workspaceRecordId(selected),
      invoice_title: titleOf(selected, "invoice"),
      client_name: selected.client_name || selected.customer_name || "",
      amount: money(selected),
      text: `Friendly payment reminder for ${titleOf(selected, "invoice")} prepared by Churvox Operator OS. Nothing has been sent.`,
    });

    saveApprovalLog(
      { label: "CASHFLOW", title: `Payment reminder prepared for ${titleOf(selected, "invoice")}` },
      "drafted",
      "drafted"
    );

    setWorkspaceToast("Payment reminder draft saved. Nothing was sent.");
  }

  function prepareQuoteFollowupDraft() {
    if (kind !== "quotes" || !selected) return;

    saveWorkspaceDraft({
      type: "quote_followup",
      title: `Quote follow-up draft for ${titleOf(selected, "quote")}`,
      target: "/quotes",
      quote_id: workspaceRecordId(selected),
      quote_title: titleOf(selected, "quote"),
      client_name: selected.client_name || selected.customer_name || "",
      amount: money(selected),
      text: `Quote follow-up for ${titleOf(selected, "quote")} prepared by Churvox Operator OS. Nothing has been sent.`,
    });

    saveApprovalLog(
      { label: "SALES", title: `Quote follow-up prepared for ${titleOf(selected, "quote")}` },
      "drafted",
      "drafted"
    );

    setWorkspaceToast("Quote follow-up draft saved. Nothing was sent.");
  }

  function DetailModal() {
    if (!selected) return null;

    const fields = [
      ["Status", statusOf(selected, "ready")],
      ["Client", selected.client_name || selected.customer_name],
      ["Address", selected.address || selected.site_address],
      ["Email", selected.email],
      ["Phone", selected.phone],
      ["Worker", selected.assigned_worker_name || selected.worker_name || selected.assigned_to],
      ["Role", selected.role],
      ["Region", selected.region || selected.location || selected.suburb],
      ["Amount", money(selected)],
      ["Date", selected.scheduled_date || selected.date || selected.created_at],
      ["ID", selected.id || selected._id],
    ].filter(([, value]) => value);

    return (
      <div className="op-modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
        <section className="op-modal op-workspace-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
          <div className="op-modal-glow" />

          <header>
            <p>{type.toUpperCase()} DETAIL</p>
            <button type="button" onClick={() => setSelected(null)}>×</button>
          </header>

          <div className="op-modal-body">
            <span>{statusOf(selected, "ready")}</span>
            <h2>{titleOf(selected, `${type} detail`)}</h2>
            <p>{primaryLine(selected) || "Churvox is showing the live record details available for this item."}</p>

            {kind === "jobs" ? (
              <>
                <div className="op-modal-reason">
                  <strong>AI job read</strong>
                  <small>{aiHint(selected)}</small>
                </div>

                <div className="op-job-action-box">
                  <strong>Job actions</strong>
                  <small>Prepare dispatch and invoice work from this popup. Nothing is sent automatically.</small>

                  <select value={selectedWorkerId} onChange={(event) => setSelectedWorkerId(event.target.value)}>
                    <option value="">Best available worker</option>
                    {activeWorkers().map((worker) => (
                      <option key={workspaceRecordId(worker) || titleOf(worker, "worker")} value={workspaceRecordId(worker)}>
                        {titleOf(worker, "Worker")} {worker.region ? `· ${worker.region}` : ""}
                      </option>
                    ))}
                  </select>

                  <div>
                    <button type="button" onClick={saveJobAssignmentRecommendation}>Prepare assignment</button>
                    <button type="button" onClick={saveJobInvoiceDraft}>Prepare invoice draft</button>
                  </div>
                </div>
              </>
            ) : null}

            {kind === "invoices" ? (
              <div className="op-money-action-box">
                <strong>Cashflow action</strong>
                <small>Prepare a payment reminder draft for this invoice. Nothing is sent automatically.</small>
                <button type="button" onClick={prepareInvoiceReminderDraft}>Prepare reminder draft</button>
              </div>
            ) : null}

            {kind === "quotes" ? (
              <div className="op-money-action-box">
                <strong>Sales action</strong>
                <small>Prepare a quote follow-up draft for this quote. Nothing is sent automatically.</small>
                <button type="button" onClick={prepareQuoteFollowupDraft}>Prepare follow-up draft</button>
              </div>
            ) : null}

            <div className="op-detail-grid">
              {fields.map(([label, value]) => (
                <div key={label}>
                  <b>{label}</b>
                  <small>{String(value)}</small>
                </div>
              ))}
            </div>
          </div>

          <footer>
            <button type="button" className="op-modal-secondary" onClick={() => setSelected(null)}>Close</button>
            <button type="button" className="op-modal-primary" onClick={data.reload}>Run scan</button>
          </footer>
        </section>
      </div>
    );
  }

  return (
    <Shell>
      <Topbar />
      <DetailModal />
      {workspaceToast ? <div className="op-warning">{workspaceToast}</div> : null}

      <section className="op-page-hero op-workspace-hero">
        <p>CHURVOX COMMAND</p>
        <h1>{title}</h1>
        <span>{subtitle}</span>

        <div className="op-workspace-actions">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${type}...`}
            aria-label={`Search ${type}`}
          />
          <button type="button" onClick={data.reload}>Run AI scan</button>
        </div>
      </section>

      {data.error ? <div className="op-warning">{data.error}</div> : null}
      {data.loading ? <div className="op-warning">Loading live {type} data...</div> : null}

      {drafts.length ? (
        <section className="op-panel op-drafts-strip">
          <header>
            <h3>OPERATOR DRAFTS <b>{drafts.length}</b></h3>
            <span>Approval-first drafts. Nothing auto-sent.</span>
          </header>

          {drafts.slice(0, 6).map((draft) => (
            <div className="op-draft-row op-draft-row-action" key={draft.id || draft.created_at || draft.title}>
              <div>
                <strong>{draft.title || "Operator draft"}</strong>
                <small>{draft.type || "draft"} · {draft.created_at || "saved"}</small>
              </div>

              <button
                type="button"
                onClick={() => {
                  setWorkspaceToast(`${draft.title || "Draft"} is ready for owner review. Nothing has been sent.`);
                }}
              >
                Review
              </button>
            </div>
          ))}
        </section>
      ) : null}

      <section className="op-panel op-workspace-list">
        <header>
          <h3>{title.toUpperCase()} <b>{filtered.length}</b></h3>
          <span>{query ? "Filtered live records" : "Live records"}</span>
        </header>

        {!filtered.length && !data.loading ? (
          <div className="op-empty-mini">No {type} found yet.</div>
        ) : null}

        {filtered.slice(0, 40).map((item, index) => (
          <button
            type="button"
            className="op-workspace-row"
            key={item.id || item._id || `${type}-${index}`}
            onClick={() => { setSelected(item); setSelectedWorkerId(""); setWorkspaceToast(""); }}
          >
            <i>{kind === "jobs" ? "⌘" : kind === "invoices" ? "▥" : kind === "quotes" ? "▤" : kind === "team" ? "♧" : "◎"}</i>

            <span>
              <b>{titleOf(item, `${type} ${index + 1}`)}</b>
              <small>{primaryLine(item) || "Tap to inspect record"}</small>
              {kind === "jobs" ? <em>{aiHint(item)}</em> : null}
            </span>

            <strong className={`op-row-status ${statusClass(item)}`}>{statusOf(item, "ready")}</strong>
          </button>
        ))}
      </section>
    </Shell>
  );
}

function Settings() {
  return (
    <Shell>
      <Topbar />
      <section className="op-page-hero">
        <p>SYSTEM CONTROL</p>
        <h1>Settings Command</h1>
        <span>Plan, billing, MYOB, SMS and AI Operator rules.</span>
      </section>
      <section className="op-settings-grid">
        {["Plan & Billing", "MYOB Sync", "SMS Credits", "AI Operator Rules"].map((name) => (
          <article className="op-panel" key={name}>
            <h3>{name}</h3>
            <p>Ready for the next rebuild layer.</p>
          </article>
        ))}
      </section>
    </Shell>
  );
}

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMessage("Signing in...");
    try {
      const res = await api("/auth/login", { method: "POST", body: form });
      const access = res?.token || res?.access_token || res?.accessToken;
      if (access) localStorage.setItem("token", access);
      navigate("/dashboard");
    } catch (err) {
      setMessage(err.message || "Login failed.");
    }
  }

  return (
    <main className="op-login">
      <form onSubmit={submit}>
        <ChurvoxLogo />
        <h1>Open Operator OS.</h1>
        <p>AI runs the admin. You approve the moves.</p>
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button type="submit">Sign in</button>
        {message ? <small>{message}</small> : null}
      </form>
    </main>
  );
}

export default function FreshChurvoxApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/jobs" element={<Workspace kind="jobs" />} />
        <Route path="/clients" element={<Workspace kind="clients" />} />
        <Route path="/quotes" element={<Workspace kind="quotes" />} />
        <Route path="/invoices" element={<Workspace kind="invoices" />} />
        <Route path="/team" element={<Workspace kind="team" />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
