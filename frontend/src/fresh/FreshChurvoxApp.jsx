
import { useEffect, useMemo, useState } from "react";
import "./SmartHubDashboardFix.css";

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
  return [];
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

function titleOf(item, fallback) {
  return item?.title || item?.name || item?.job_title || item?.description || item?.subject || fallback;
}

function clientOf(item) {
  return item?.client_name || item?.client || item?.customer_name || item?.customer || "Client";
}

function addressOf(item) {
  return item?.address || item?.site_address || item?.job_address || item?.location || "No address saved";
}

function statusOf(item) {
  return String(item?.status || item?.job_status || "open").toLowerCase();
}

export default function DashboardPage() {
  const [state, setState] = useState({
    loading: true,
    jobs: [],
    invoices: [],
    quotes: [],
    workers: [],
    error: "",
  });

  useEffect(() => {
    let alive = true;

    async function loadOne(path) {
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

    async function load() {
      try {
        const [jobs, invoices, quotes, workers] = await Promise.all([
          loadOne("/jobs"),
          loadOne("/invoices"),
          loadOne("/quotes"),
          loadOne("/team/workers"),
        ]);

        if (!alive) return;
        setState({
          loading: false,
          jobs,
          invoices,
          quotes,
          workers,
          error: "",
        });
      } catch (err) {
        if (!alive) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: "Could not load live dashboard data. Showing empty Smart Hub shell.",
        }));
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const data = useMemo(() => {
    const jobs = state.jobs || [];
    const invoices = state.invoices || [];
    const quotes = state.quotes || [];
    const workers = state.workers || [];

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
      const value =
        invoice.total ||
        invoice.amount ||
        invoice.balance ||
        invoice.outstanding ||
        invoice.total_amount ||
        0;
      return sum + Number(value || 0);
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
    { name: "Available worker", full_name: "Available worker", region: "nearby area" };

  const workerName = bestWorker.full_name || bestWorker.name || bestWorker.email || "Available worker";
  const workerRegion = bestWorker.region || bestWorker.area || bestWorker.location || "nearby area";

  const nextJob = data.unassignedJobs[0] || data.jobs[0];

  return (
    <main className="smartdash">
      <section className="smartdash-shell">
        <header className="smartdash-top">
          <div>
            <p>SMART HUB · AI OPERATOR</p>
            <h1>Today’s business is under control.</h1>
            <span>
              Jobs, crew, proof, invoices and follow-ups are organised into owner-approved next moves.
            </span>
          </div>

          <div className="smartdash-actions">
            <a href="/jobs">Jobs</a>
            <a href="/invoices">Invoices</a>
            <a href="/quotes">Quotes</a>
            <a className="primary" href="/jobs/new">New job</a>
          </div>
        </header>

        {state.error ? <div className="smartdash-error">{state.error}</div> : null}

        <section className="smartdash-metrics">
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
            <span>Completed work to review</span>
          </article>
          <article>
            <small>Cash actions</small>
            <strong>{money(data.invoiceValue)}</strong>
            <span>Unpaid invoice value</span>
          </article>
        </section>

        <section className="smartdash-main-grid">
          <article className="smartdash-card smartdash-hero-card">
            <div className="smartdash-card-head">
              <small>AI NEXT BEST MOVE</small>
              <span className="live-dot">Live</span>
            </div>

            <h2>
              {nextJob
                ? `Assign ${workerName} to ${addressOf(nextJob)}`
                : "Create your first job to activate dispatch"}
            </h2>

            <p>
              {nextJob
                ? `${workerName} is recommended from ${workerRegion}. Churvox prepares the dispatch action, but the owner approves before it changes the job.`
                : "Once jobs and workers are added, Churvox will prepare owner-approved dispatch actions here."}
            </p>

            <div className="smartdash-job-preview">
              <strong>{nextJob ? titleOf(nextJob, "Unassigned job") : "No open jobs yet"}</strong>
              <span>{nextJob ? `${clientOf(nextJob)} · ${addressOf(nextJob)}` : "Add a job to start using AI dispatch."}</span>
            </div>

            <div className="smartdash-button-row">
              <a href="/jobs">Open jobs workspace</a>
              <a href="/team">View crew</a>
            </div>
          </article>

          <article className="smartdash-card">
            <div className="smartdash-card-head">
              <small>CASHFLOW OVERVIEW</small>
              <span className="live-dot">Live</span>
            </div>

            <div className="smartdash-cash-number">{money(data.invoiceValue)}</div>
            <p>
              {data.unpaidInvoices.length
                ? `${data.unpaidInvoices.length} unpaid invoice action${data.unpaidInvoices.length === 1 ? "" : "s"} ready for review.`
                : "No unpaid invoice value found from live data."}
            </p>

            <div className="smartdash-mini-list">
              {data.unpaidInvoices.slice(0, 3).map((invoice, index) => (
                <a href="/invoices" key={invoice.id || invoice._id || index}>
                  <strong>{titleOf(invoice, `Invoice ${index + 1}`)}</strong>
                  <span>{clientOf(invoice)} · {money(invoice.total || invoice.amount || invoice.balance || invoice.outstanding)}</span>
                </a>
              ))}
              {!data.unpaidInvoices.length ? (
                <div className="smartdash-empty">Invoices will appear here once created.</div>
              ) : null}
            </div>
          </article>
        </section>

        <section className="smartdash-lower-grid">
          <article className="smartdash-card">
            <div className="smartdash-card-head">
              <small>AI WORK QUEUE</small>
              <a href="/ai-work-queue">Open queue</a>
            </div>

            <div className="smartdash-queue">
              <div>
                <b>Dispatch</b>
                <strong>{data.unassignedJobs.length} jobs need crew</strong>
                <span>AI can recommend by area, availability and workload.</span>
              </div>
              <div>
                <b>Proof-to-Paid</b>
                <strong>{data.completedJobs.length} jobs ready</strong>
                <span>Completed work can move into invoice review.</span>
              </div>
              <div>
                <b>Follow-ups</b>
                <strong>{data.quoteFollowups.length} quotes active</strong>
                <span>Quote reminders can be prepared before leads go cold.</span>
              </div>
            </div>
          </article>

          <article className="smartdash-card">
            <div className="smartdash-card-head">
              <small>CREW SNAPSHOT</small>
              <a href="/team">Manage team</a>
            </div>

            <div className="smartdash-workers">
              {data.workers.slice(0, 4).map((worker, index) => (
                <div key={worker.id || worker._id || worker.email || index}>
                  <strong>{worker.full_name || worker.name || worker.email || `Worker ${index + 1}`}</strong>
                  <span>{worker.role || "Worker"} · {worker.region || worker.area || "No region"}</span>
                </div>
              ))}
              {!data.workers.length ? (
                <div className="smartdash-empty">Add workers to start dispatching jobs.</div>
              ) : null}
            </div>
          </article>
        </section>

        {state.loading ? <div className="smartdash-loading">Loading live Churvox data...</div> : null}
      </section>
    </main>
  );
}
