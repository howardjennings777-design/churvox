// PHASE_177_HIDE_DISPATCH_WORDING_BEHIND_AI_CREW_ASSIGNMENT
import React, { useEffect, useMemo, useState } from "react";
import "./TopPlayerFeatureStack.css";

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

function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function money(value) {
  const n = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 2,
  }).format(n);
}

function itemId(item = {}) {
  return clean(item.id || item._id || item.job_id || item.client_id || item.source_id || "");
}

function itemTitle(item = {}, fallback = "Record") {
  return clean(
    item.title ||
      item.job_title ||
      item.name ||
      item.client_name ||
      item.customer_name ||
      item.invoice_number ||
      item.quote_number ||
      item.job_title ||
      item.job?.title,
    fallback
  );
}

function itemClient(item = {}) {
  return clean(
    item.client_name ||
      item.customer_name ||
      item.client?.name ||
      item.job?.client_name ||
      item.job?.customer_name,
    "Client"
  );
}

function rawArrays(data = {}) {
  const raw = data.raw || {};
  return {
    jobs: Array.isArray(raw.jobs) ? raw.jobs : Array.isArray(data.jobs) ? data.jobs : [],
    clients: Array.isArray(raw.clients) ? raw.clients : Array.isArray(data.clients) ? data.clients : [],
    team: Array.isArray(raw.team) ? raw.team : Array.isArray(raw.workers) ? raw.workers : Array.isArray(data.team) ? data.team : [],
    quotes: Array.isArray(raw.quotes) ? raw.quotes : Array.isArray(data.quotes) ? data.quotes : [],
    invoices: Array.isArray(raw.invoices) ? raw.invoices : Array.isArray(data.invoices) ? data.invoices : [],
  };
}

async function api(path, method = "GET", body) {
  const token = readToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(method === "GET" ? {} : { body: JSON.stringify(body || {}) }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.detail || payload.message || payload.error || `${path} failed`);
  }
  return payload;
}

const TABS = [
  ["overview", "Overview"],
  ["command", "Customer Links"],
  ["growth", "Growth Loop"],
  ["dispatch", "Assign crew"],
  ["margin", "Margin Guard"],
  ["packs", "Work Packs"],
];

function ResultBox({ result }) {
  if (!result) return null;
  return (
    <section className="omtp-result">
      <span>Latest output</span>
      <strong>{result.title}</strong>
      <pre>{JSON.stringify(result.payload, null, 2).slice(0, 1800)}</pre>
    </section>
  );
}

function FeatureHeader({ title, body, stat, action, busy, onAction }) {
  return (
    <header className="omtp-feature-head">
      <div>
        <span>Churvox top-player feature</span>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
      <aside>
        <b>{stat}</b>
        {action ? (
          <button type="button" disabled={busy} onClick={onAction}>
            {busy ? "Working..." : action}
          </button>
        ) : null}
      </aside>
    </header>
  );
}

export default function TopPlayerFeatureStack({ data = {} }) {
  const arrays = useMemo(() => rawArrays(data), [data]);
  const [summary, setSummary] = useState({});
  const [tab, setTab] = useState("overview");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);

  const [links, setLinks] = useState([]);
  const [growthActions, setGrowthActions] = useState([]);
  const [dispatchPlan, setAssign crewPlan] = useState([]);
  const [marginSuggestions, setMarginSuggestions] = useState([]);
  const [templates, setTemplates] = useState({});

  async function loadSummary() {
    try {
      const payload = await api("/top-player/summary");
      setSummary(payload.summary || {});
    } catch (err) {
      setMessage(err.message || "Top-player feature stack is waiting for backend deploy.");
    }
  }

  async function loadLinks() {
    const payload = await api("/top-player/customer-command-links");
    setLinks(payload.links || []);
    return payload;
  }

  async function loadGrowth() {
    const payload = await api("/top-player/growth-loop/actions");
    setGrowthActions(payload.actions || []);
    return payload;
  }

  async function loadAssign crew() {
    const payload = await api("/top-player/dispatch-commander/plan", "POST", {});
    setAssign crewPlan(payload.recommendations || []);
    return payload;
  }

  async function loadMargins() {
    const payload = await api("/top-player/margin-guard/suggestions");
    setMarginSuggestions(payload.suggestions || []);
    return payload;
  }

  async function loadTemplates() {
    const payload = await api("/top-player/work-packs/templates");
    setTemplates(payload.templates || {});
    return payload;
  }

  async function run(label, fn) {
    setBusy(label);
    setMessage("");
    try {
      const payload = await fn();
      setResult({ title: label, payload });
      setMessage(payload.message || `${label} updated.`);
      await loadSummary();
    } catch (err) {
      setMessage(err.message || `${label} could not run yet.`);
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    if (tab === "command") run("Customer Command Links", loadLinks);
    if (tab === "growth") run("Growth Loop", loadGrowth);
    if (tab === "dispatch") run("AI Assign crew Commander", loadAssign crew);
    if (tab === "margin") run("AI Margin Guard", loadMargins);
    if (tab === "packs") run("AI Work Packs", loadTemplates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function createCommandLink(source = {}) {
    const payload = {
      source_type: source.source_type || "client",
      source_id: source.source_id || itemId(source),
      client_id: source.client_id || itemId(source),
      job_id: source.job_id || "",
      quote_id: source.quote_id || "",
      invoice_id: source.invoice_id || "",
      title: source.title || itemTitle(source, "Customer Command Link"),
    };

    await run("Create Customer Command Link", async () => {
      const out = await api("/top-player/customer-command-links", "POST", payload);
      await loadLinks();
      return out;
    });
  }

  async function prepareGrowth() {
    await run("Prepare Growth Loop", async () => {
      const out = await api("/top-player/growth-loop/prepare", "POST", {});
      await loadGrowth();
      return out;
    });
  }

  async function approveGrowth(action) {
    await run("Approve Growth Action", async () => {
      const out = await api(`/top-player/growth-loop/actions/${encodeURIComponent(itemId(action))}/approve`, "POST", {});
      await loadGrowth();
      return out;
    });
  }

  async function approveAssign crew(row) {
    const worker = row.recommended_worker || {};
    await run("Approve Assign crew", async () => {
      const out = await api("/top-player/dispatch-commander/approve", "POST", {
        job_id: row.job_id,
        worker_id: worker.worker_id,
        reason: (worker.reasons || []).join(", "),
      });
      await loadAssign crew();
      return out;
    });
  }

  async function analyseMargin(record, sourceType) {
    await run("Analyse Margin", async () => api("/top-player/margin-guard/analyse", "POST", {
      source_type: sourceType,
      source_id: itemId(record),
      record,
      save: true,
    }));
  }

  async function preparePack(job) {
    await run("Prepare Work Pack", async () => {
      const out = await api(`/top-player/work-packs/jobs/${encodeURIComponent(itemId(job))}/prepare`, "POST", {});
      return out;
    });
  }

  const commandCandidates = [
    ...arrays.clients.slice(0, 6).map((x) => ({ ...x, source_type: "client", source_id: itemId(x) })),
    ...arrays.jobs.slice(0, 6).map((x) => ({ ...x, source_type: "job", source_id: itemId(x), job_id: itemId(x) })),
  ].filter((x) => itemId(x));

  const overviewCards = [
    ["Customer Links", summary.customer_command_links || 0, "portal links"],
    ["Growth Ready", summary.growth_loop_ready || 0, "reviews/referrals"],
    ["Ready to assign", summary.dispatch_needed || 0, "unassigned jobs"],
    ["Margin Warnings", summary.margin_warnings || 0, "profit checks"],
    ["Work Packs", summary.work_packs_prepared || 0, "prepared packs"],
  ];

  return (
    <section className="omtp-stack" data-phase="FULL_TOP_PLAYER_FRONTEND">
      <header className="omtp-hero">
        <div>
          <span>Top-player feature stack</span>
          <h2>Churvox now has the front end for the whole advantage.</h2>
          <p>
            Customer Command Links, Growth Loop, AI Assign crew Commander, Margin Guard and Work Packs —
            all built around the same Churvox rule: AI prepares, the owner approves.
          </p>
        </div>

        <aside>
          {overviewCards.slice(0, 3).map(([label, value, small]) => (
            <b key={label}>{value}<small>{small}</small></b>
          ))}
        </aside>
      </header>

      <nav className="omtp-tabs">
        {TABS.map(([key, label]) => (
          <button type="button" key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </nav>

      {message ? <p className="omtp-message">{message}</p> : null}

      {tab === "overview" ? (
        <section className="omtp-overview">
          {overviewCards.map(([label, value, small]) => (
            <article key={label}>
              <span>{small}</span>
              <strong>{value}</strong>
              <p>{label}</p>
            </article>
          ))}

          <div className="omtp-overview-actions">
            <button type="button" onClick={() => setTab("command")}>Open Customer Links</button>
            <button type="button" onClick={() => setTab("growth")}>Open Growth Loop</button>
            <button type="button" onClick={() => setTab("dispatch")}>Open Assign crew</button>
            <button type="button" onClick={() => setTab("margin")}>Open Margin Guard</button>
            <button type="button" onClick={() => setTab("packs")}>Open Work Packs</button>
          </div>
        </section>
      ) : null}

      {tab === "command" ? (
        <section className="omtp-feature">
          <FeatureHeader
            title="Customer Command Links"
            body="Create one secure link customers can use for job proof, quote details, invoice details, messages, book-again, reviews and referrals."
            stat={links.length}
            action="Refresh links"
            busy={busy === "Customer Command Links"}
            onAction={() => run("Customer Command Links", loadLinks)}
          />

          <section className="omtp-two-col">
            <article>
              <span>Make a link from live records</span>
              <div className="omtp-list">
                {commandCandidates.length ? commandCandidates.map((item) => (
                  <button type="button" key={`${item.source_type}-${itemId(item)}`} onClick={() => createCommandLink(item)}>
                    <strong>{itemTitle(item, "Customer")}</strong>
                    <small>{item.source_type} · {itemClient(item)}</small>
                    <em>Create link</em>
                  </button>
                )) : <p className="omtp-empty">Add a client or job first, then create a Customer Command Link.</p>}
              </div>
            </article>

            <article>
              <span>Existing customer links</span>
              <div className="omtp-list">
                {links.length ? links.map((link) => (
                  <div className="omtp-row" key={itemId(link) || link.token}>
                    <strong>{clean(link.title || link.client_name, "Customer Command Link")}</strong>
                    <small>{link.url}</small>
                    <a href={link.url} target="_blank" rel="noreferrer">Open public page</a>
                  </div>
                )) : <p className="omtp-empty">No command links yet.</p>}
              </div>
            </article>
          </section>
        </section>
      ) : null}

      {tab === "growth" ? (
        <section className="omtp-feature">
          <FeatureHeader
            title="Growth Loop"
            body="Prepare review requests, referral requests and book-again messages after completed jobs. Nothing sends without owner approval."
            stat={growthActions.length}
            action="Prepare growth drafts"
            busy={busy === "Prepare Growth Loop"}
            onAction={prepareGrowth}
          />

          <div className="omtp-cards">
            {growthActions.length ? growthActions.map((action) => (
              <article key={itemId(action)}>
                <span>{clean(action.action_type, "growth").replaceAll("_", " ")}</span>
                <strong>{clean(action.title, "Growth action")}</strong>
                <p>{clean(action.message, "Prepared customer message.")}</p>
                <footer>
                  <small>{clean(action.status, "pending")}</small>
                  <button type="button" onClick={() => approveGrowth(action)}>Approve draft</button>
                </footer>
              </article>
            )) : <p className="omtp-empty">No growth actions yet. Click prepare to create review/referral/book-again drafts from completed jobs.</p>}
          </div>
        </section>
      ) : null}

      {tab === "dispatch" ? (
        <section className="omtp-feature">
          <FeatureHeader
            title="AI Assign crew Commander"
            body="See unassigned jobs, recommended worker, score and reason. Owner approves before the worker is assigned."
            stat={dispatchPlan.length}
            action="Rebuild dispatch plan"
            busy={busy === "AI Assign crew Commander"}
            onAction={() => run("AI Assign crew Commander", loadAssign crew)}
          />

          <div className="omtp-cards">
            {dispatchPlan.length ? dispatchPlan.map((row) => {
              const worker = row.recommended_worker || {};
              return (
                <article key={row.job_id}>
                  <span>worker match</span>
                  <strong>{clean(row.title, "Unassigned job")}</strong>
                  <p>{clean(row.client_name, "Client")} · Suggested: {clean(worker.worker_name, "Choose manually")}</p>
                  <div className="omtp-score">
                    <b>{worker.score || 0}/100</b>
                    <small>{Array.isArray(worker.reasons) ? worker.reasons.join(", ") : "best available worker"}</small>
                  </div>
                  <footer>
                    <small>Owner approval required</small>
                    <button type="button" disabled={!worker.worker_id} onClick={() => approveAssign crew(row)}>Approve dispatch</button>
                  </footer>
                </article>
              );
            }) : <p className="omtp-empty">No unassigned jobs waiting for dispatch.</p>}
          </div>
        </section>
      ) : null}

      {tab === "margin" ? (
        <section className="omtp-feature">
          <FeatureHeader
            title="AI Margin Guard"
            body="Find jobs and quotes that may be underpriced, missing materials, missing labour, or sitting below safe margin."
            stat={marginSuggestions.length}
            action="Refresh margin warnings"
            busy={busy === "AI Margin Guard"}
            onAction={() => run("AI Margin Guard", loadMargins)}
          />

          <div className="omtp-two-col">
            <article>
              <span>Warnings</span>
              <div className="omtp-list">
                {marginSuggestions.length ? marginSuggestions.map((row) => (
                  <button type="button" key={`${row.source_type}-${row.source_id}`} onClick={() => analyseMargin(row, row.source_type)}>
                    <strong>{clean(row.title, "Margin warning")}</strong>
                    <small>
                      {money(row.analysis?.price)} · margin {row.analysis?.margin_percent || 0}% · {row.analysis?.warnings?.join(", ")}
                    </small>
                    <em>Open analysis</em>
                  </button>
                )) : <p className="omtp-empty">No margin warnings found yet.</p>}
              </div>
            </article>

            <article>
              <span>Quick check live records</span>
              <div className="omtp-list">
                {[...arrays.jobs.slice(0, 5), ...arrays.quotes.slice(0, 5)].filter((x) => itemId(x)).map((record) => (
                  <button type="button" key={itemId(record)} onClick={() => analyseMargin(record, record.quote_number ? "quote" : "job")}>
                    <strong>{itemTitle(record)}</strong>
                    <small>{money(record.price || record.total || record.amount || record.subtotal) || "No price saved"}</small>
                    <em>Check margin</em>
                  </button>
                ))}
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {tab === "packs" ? (
        <section className="omtp-feature">
          <FeatureHeader
            title="AI Work Packs"
            body="Create smart checklists, proof photo requirements, materials capture and sign-off requirements based on job type."
            stat={Object.keys(templates || {}).length}
            action="Refresh templates"
            busy={busy === "AI Work Packs"}
            onAction={() => run("AI Work Packs", loadTemplates)}
          />

          <section className="omtp-two-col">
            <article>
              <span>Prepare pack for a job</span>
              <div className="omtp-list">
                {arrays.jobs.filter((x) => itemId(x)).slice(0, 12).map((job) => (
                  <button type="button" key={itemId(job)} onClick={() => preparePack(job)}>
                    <strong>{itemTitle(job, "Job")}</strong>
                    <small>{itemClient(job)} · {clean(job.job_type || job.service_type || job.status, "general")}</small>
                    <em>Prepare pack</em>
                  </button>
                ))}
              </div>
            </article>

            <article>
              <span>Templates</span>
              <div className="omtp-template-grid">
                {Object.entries(templates || {}).map(([key, template]) => (
                  <div className="omtp-template" key={key}>
                    <strong>{template.label || key}</strong>
                    <small>{(template.checklist || []).slice(0, 4).join(" · ")}</small>
                    <em>{(template.required_photos || []).length} photo requirements</em>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </section>
      ) : null}

      <ResultBox result={result} />
    </section>
  );
}
