
import { useEffect, useMemo, useState } from "react";
import "./SmartHubClean.css";

const RAW_API_BASE =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  "https://grassley-backend.onrender.com";

const API_BASE = RAW_API_BASE.replace(/\/$/, "").endsWith("/api")
  ? RAW_API_BASE.replace(/\/$/, "")
  : `${RAW_API_BASE.replace(/\/$/, "")}/api`;

function getToken() {
  try {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("access_token") ||
      ""
    );
  } catch {
    return "";
  }
}

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.jobs)) return payload.jobs;
  if (Array.isArray(payload?.invoices)) return payload.invoices;
  if (Array.isArray(payload?.quotes)) return payload.quotes;
  if (Array.isArray(payload?.workers)) return payload.workers;
  if (Array.isArray(payload?.actions)) return payload.actions;
  if (Array.isArray(payload?.approvals)) return payload.approvals;
  return [];
}

function statusOf(item) {
  return String(item?.status || item?.job_status || "").toLowerCase();
}

function titleOf(item, fallback) {
  return item?.title || item?.name || item?.job_title || item?.description || item?.subject || fallback;
}

function clientOf(item) {
  return item?.client_name || item?.client || item?.customer_name || item?.customer || "No client set";
}

function addressOf(item) {
  return item?.address || item?.site_address || item?.job_address || item?.location || "No address set";
}

function money(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "$0";
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(n);
}

async function fetchList(path) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) return [];
  const payload = await res.json().catch(() => []);
  return asArray(payload);
}

export default function SmartHubCleanPage() {
  const [state, setState] = useState({
    loading: true,
    jobs: [],
    invoices: [],
    quotes: [],
    workers: [],
    approvals: [],
    error: "",
    busy: "",
  });

  async function load() {
    try {
      const [jobs, invoices, quotes, workers, approvals] = await Promise.all([
        fetchList("/jobs"),
        fetchList("/invoices"),
        fetchList("/quotes"),
        fetchList("/team/workers"),
        fetchList("/ai/operator/approvals"),
      ]);

      setState((current) => ({
        ...current,
        loading: false,
        jobs,
        invoices,
        quotes,
        workers,
        approvals,
        error: "",
      }));
    } catch (err) {
      setState((current) => ({
        ...current,
        loading: false,
        error: "Could not load everything. Showing the Smart Hub shell.",
      }));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const data = useMemo(() => {
    const jobs = state.jobs || [];
    const invoices = state.invoices || [];
    const quotes = state.quotes || [];
    const workers = state.workers || [];
    const approvals = state.approvals || [];

    const unassignedJobs = jobs.filter((job) => {
      const status = statusOf(job);
      return (
        status.includes("unassigned") ||
        status.includes("new") ||
        (!job.assigned_worker_id && !job.worker_id && !job.assigned_to && !job.worker)
      );
    });

    const activeJobs = jobs.filter((job) => {
      const status = statusOf(job);
      return status.includes("progress") || status.includes("assigned") || status.includes("scheduled");
    });

    const completedJobs = jobs.filter((job) => {
      const status = statusOf(job);
      return status.includes("complete") || status.includes("done");
    });

    const unpaidInvoices = invoices.filter((invoice) => {
      const status = statusOf(invoice);
      return !status.includes("paid") && !status.includes("void") && !status.includes("cancel");
    });

    const invoiceValue = unpaidInvoices.reduce((sum, invoice) => {
      return sum + Number(invoice.total || invoice.amount || invoice.balance || invoice.outstanding || invoice.total_amount || 0);
    }, 0);

    const quoteFollowups = quotes.filter((quote) => {
      const status = statusOf(quote);
      return status.includes("sent") || status.includes("pending") || status.includes("open") || status.includes("draft");
    });

    return {
      jobs,
      invoices,
      quotes,
      workers,
      approvals,
      unassignedJobs,
      activeJobs,
      completedJobs,
      unpaidInvoices,
      invoiceValue,
      quoteFollowups,
    };
  }, [state]);

  const bestWorker =
    data.workers.find((worker) => String(worker.status || "").toLowerCase().includes("active")) ||
    data.workers[0] ||
    { name: "Available worker", full_name: "Available worker", region: "your service area" };

  const nextJob = data.unassignedJobs[0] || data.jobs[0];
  const workerName = bestWorker.full_name || bestWorker.name || bestWorker.email || "Available worker";
  const workerRegion = bestWorker.region || bestWorker.area || bestWorker.location || "your service area";

  const preparedActions = [
    {
      type: "Dispatch",
      title: nextJob ? `Assign ${workerName} to ${addressOf(nextJob)}` : "Create your first job",
      detail: nextJob
        ? `${workerName} is the best current match from ${workerRegion}. Owner approval is required before assignment.`
        : "Add jobs and workers so Churvox can prepare dispatch actions.",
      href: "/jobs",
    },
    {
      type: "Proof-to-Paid",
      title: `${data.completedJobs.length} completed job${data.completedJobs.length === 1 ? "" : "s"} ready for review`,
      detail: "Worker proof, notes and completion details can be turned into invoice-ready drafts.",
      href: "/invoices",
    },
    {
      type: "Cashflow",
      title: `${data.unpaidInvoices.length} invoice action${data.unpaidInvoices.length === 1 ? "" : "s"} prepared`,
      detail: "Churvox keeps invoice follow-ups visible without sending anything unless approved.",
      href: "/invoices",
    },
  ];

  async function approveDemo(label) {
    setState((current) => ({ ...current, busy: label }));
    setTimeout(() => {
      setState((current) => ({ ...current, busy: "" }));
      alert(`${label} prepared. In the live app, Churvox waits for owner approval before making important changes.`);
    }, 450);
  }

  return (
    <main className="cleanhub">
      <section className="cleanhub-shell">
        <header className="cleanhub-header">
          <div>
            <p>SMART HUB · AI OPERATOR</p>
            <h1>Approval-first admin, ready to run.</h1>
            <span>
              Churvox turns jobs, crew, proof, quotes and invoices into clear owner-approved actions.
            </span>
          </div>

          <nav>
            <a href="/jobs">Jobs</a>
            <a href="/team">Crew</a>
            <a href="/invoices">Invoices</a>
            <a className="primary" href="/jobs/new">New job</a>
          </nav>
        </header>

        {state.error ? <div className="cleanhub-alert">{state.error}</div> : null}

        <section className="cleanhub-metrics">
          <article>
            <small>Needs crew</small>
            <strong>{data.unassignedJobs.length}</strong>
            <span>Jobs AI can help dispatch</span>
          </article>
          <article>
            <small>Active jobs</small>
            <strong>{data.activeJobs.length}</strong>
            <span>Assigned or in progress</span>
          </article>
          <article>
            <small>Proof-to-Paid</small>
            <strong>{data.completedJobs.length}</strong>
            <span>Completed jobs to review</span>
          </article>
          <article>
            <small>Money watch</small>
            <strong>{money(data.invoiceValue)}</strong>
            <span>Unpaid invoice value</span>
          </article>
        </section>

        <section className="cleanhub-grid">
          <article className="cleanhub-card cleanhub-main-card">
            <div className="cleanhub-card-top">
              <small>AI WORK QUEUE</small>
              <b>Live</b>
            </div>

            <h2>Prepared for approval.</h2>
            <p>
              The AI has prepared the next best moves. Nothing is assigned, sent, charged or synced until the owner approves.
            </p>

            <div className="cleanhub-actions">
              {preparedActions.map((item) => (
                <article key={item.type}>
                  <div>
                    <span>{item.type}</span>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <footer>
                    <a href={item.href}>Review</a>
                    <button onClick={() => approveDemo(item.type)} disabled={state.busy === item.type}>
                      {state.busy === item.type ? "Preparing..." : "Approve"}
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          </article>

          <aside className="cleanhub-side">
            <article className="cleanhub-card">
              <div className="cleanhub-card-top">
                <small>TODAY’S RUN SHEET</small>
                <a href="/jobs">Open</a>
              </div>
              <strong className="cleanhub-big">{data.jobs.length}</strong>
              <div className="cleanhub-list">
                {data.jobs.slice(0, 5).map((job, index) => (
                  <a href="/jobs" key={job.id || job._id || index}>
                    <strong>{titleOf(job, `Job ${index + 1}`)}</strong>
                    <span>{clientOf(job)} · {addressOf(job)}</span>
                  </a>
                ))}
                {!data.jobs.length ? <div className="cleanhub-empty">No jobs yet. Create your first job to activate Smart Hub.</div> : null}
              </div>
            </article>

            <article className="cleanhub-card">
              <div className="cleanhub-card-top">
                <small>PROOF-TO-PAID</small>
                <a href="/invoices">Open</a>
              </div>
              <strong className="cleanhub-big">{data.completedJobs.length}</strong>
              <p>Completed work ready for invoice review, proof checks and owner approval.</p>
            </article>

            <article className="cleanhub-card">
              <div className="cleanhub-card-top">
                <small>CREW WATCH</small>
                <a href="/team">Open</a>
              </div>
              <strong className="cleanhub-big">{data.workers.length}</strong>
              <div className="cleanhub-list">
                {data.workers.slice(0, 4).map((worker, index) => (
                  <a href="/team" key={worker.id || worker._id || worker.email || index}>
                    <strong>{worker.full_name || worker.name || worker.email || `Worker ${index + 1}`}</strong>
                    <span>{worker.role || "Worker"} · {worker.region || worker.area || "No region"}</span>
                  </a>
                ))}
                {!data.workers.length ? <div className="cleanhub-empty">Add workers to unlock AI dispatch recommendations.</div> : null}
              </div>
            </article>
          </aside>
        </section>

        <section className="cleanhub-lower">
          <article className="cleanhub-card">
            <div className="cleanhub-card-top">
              <small>QUOTE FOLLOW-UPS</small>
              <a href="/quotes">Open</a>
            </div>
            <strong className="cleanhub-big">{data.quoteFollowups.length}</strong>
            <p>Open quotes that may need a follow-up drafted for approval.</p>
          </article>

          <article className="cleanhub-card">
            <div className="cleanhub-card-top">
              <small>CASHFLOW</small>
              <a href="/invoices">Open</a>
            </div>
            <strong className="cleanhub-big">{money(data.invoiceValue)}</strong>
            <p>Unpaid invoices Churvox can help keep visible.</p>
          </article>

          <article className="cleanhub-card">
            <div className="cleanhub-card-top">
              <small>OWNER CONTROL</small>
              <b>Safe</b>
            </div>
            <strong className="cleanhub-big">AI</strong>
            <p>AI prepares admin. The owner approves before important actions happen.</p>
          </article>
        </section>

        {state.loading ? <div className="cleanhub-loading">Loading live Smart Hub data...</div> : null}
      </section>
    </main>
  );
}
