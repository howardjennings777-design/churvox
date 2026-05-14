import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./AIActionDock.css";

const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

function token() {
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

function isLoggedIn() {
  try {
    return Boolean(token() || localStorage.getItem("churvox_user"));
  } catch {
    return false;
  }
}

async function get(path) {
  const t = token();
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
  });

  const text = await res.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }

  if (!res.ok) return [];
  if (Array.isArray(payload)) return payload;
  return payload.jobs || payload.clients || payload.workers || payload.quotes || payload.invoices || payload.data || payload.items || [];
}

const REVIEWED_KEY = "churvox_ai_dock_reviewed_date";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function wasReviewedToday() {
  try {
    return localStorage.getItem(REVIEWED_KEY) === todayKey();
  } catch {
    return false;
  }
}

function saveReviewedToday() {
  try {
    localStorage.setItem(REVIEWED_KEY, todayKey());
  } catch {
    // ignore
  }
}

function clearReviewedToday() {
  try {
    localStorage.removeItem(REVIEWED_KEY);
  } catch {
    // ignore
  }
}

function status(item) {
  return String(item?.status || item?.job_status || item?.payment_status || item?.quote_status || "").toLowerCase();
}

export default function AIActionDock() {
  const [open, setOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [dismissed, setDismissed] = useState(wasReviewedToday);
  const [visible, setVisible] = useState(isLoggedIn());
  const [activity, setActivity] = useState([]);

  function logActivity(label) {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setActivity((current) => [{ label, time }, ...current].slice(0, 4));
  }

  function openCommand() {
    setOpen(false);
    setCommandOpen(true);
  }

  function routeCommand(path, label) {
    if (typeof logActivity === "function") logActivity(label);
    setCommandOpen(false);
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function go(path, label) {
    logActivity(label);
    setOpen(false);
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  const [counts, setCounts] = useState({
    unassigned: 0,
    drafts: 0,
    followups: 0,
    overdue: 0,
  });
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState("");

  useEffect(() => {
    const check = () => setVisible(isLoggedIn());
    check();
    window.addEventListener("storage", check);
    window.addEventListener("popstate", check);
    return () => {
      window.removeEventListener("storage", check);
      window.removeEventListener("popstate", check);
    };
  }, []);

  const runCheck = useCallback(async function runCheck() {
    if (!visible) return;
    setChecking(true);

    try {
      const [jobs, quotes, invoices] = await Promise.all([
        get("/jobs"),
        get("/quotes"),
        get("/invoices"),
      ]);

      setCounts({
        unassigned: jobs.filter((job) => {
          const s = status(job);
          return !job.assigned_worker_id && !job.assigned_worker && !job.worker_id && !s.includes("complete") && !s.includes("cancel");
        }).length,
        drafts: invoices.filter((invoice) => status(invoice).includes("draft")).length,
        followups: quotes.filter((quote) => /sent|pending|follow|open/.test(status(quote))).length,
        overdue: invoices.filter((invoice) => status(invoice).includes("overdue")).length,
      });

      setLastChecked(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } finally {
      setChecking(false);
    }
  }, [visible]);

  useEffect(() => {
    runCheck();

    const interval = window.setInterval(runCheck, 60000);
    window.addEventListener("focus", runCheck);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", runCheck);
    };
  }, [visible]);

  const actions = useMemo(() => {
    const prepared = [
      ["Dispatch", counts.unassigned ? `${counts.unassigned} unassigned job${counts.unassigned === 1 ? "" : "s"} found` : "Dispatch check ready", "Review worker recommendations", "/jobs"],
      ["Invoice", counts.drafts ? `${counts.drafts} draft invoice${counts.drafts === 1 ? "" : "s"} ready` : "Invoice check ready", "Review invoice drafts", "/invoices"],
      ["Quote", counts.followups ? `${counts.followups} quote follow-up${counts.followups === 1 ? "" : "s"} ready` : "Quote follow-up check ready", "Approve customer follow-up", "/quotes"],
      ["Cashflow", counts.overdue ? `${counts.overdue} overdue invoice${counts.overdue === 1 ? "" : "s"}` : "Cashflow check ready", "Review payment reminders", "/invoices"],
    ];

    return prepared;
  }, [counts]);

  const rawReadyCount = counts.unassigned + counts.drafts + counts.followups + counts.overdue || actions.length;
  const rawUrgentCount = counts.unassigned + counts.overdue;
  const readyCount = dismissed ? 0 : rawReadyCount;
  const urgentCount = dismissed ? 0 : rawUrgentCount;

  const briefing = dismissed
    ? "You marked today’s AI actions reviewed. The operator will stay quiet unless you refresh the check."
    : urgentCount
      ? `AI found ${urgentCount} urgent item${urgentCount === 1 ? "" : "s"} needing owner review first.`
      : readyCount
        ? `AI prepared ${readyCount} action${readyCount === 1 ? "" : "s"} for review. Nothing sends without approval.`
        : "Your workspace is calm. AI is watching for dispatch, invoice, quote, and cashflow work.";

  if (!visible) return null;

  return (
    <>
      <button className={`ai-dock-button ${urgentCount ? "urgent" : ""}`} type="button" onClick={() => setOpen(true)}>
        <span>AI</span>
        <strong>{readyCount} ready</strong>
        {urgentCount ? <em>{urgentCount} urgent</em> : null}
      </button>

      {open ? (
        <div className="ai-dock-backdrop" onClick={() => setOpen(false)}>
          <section className="ai-dock-panel" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>AI Operator</span>
                <h2>Prepared actions</h2>
                {urgentCount ? <p className="ai-dock-urgent-note">{urgentCount} urgent item{urgentCount === 1 ? "" : "s"} need owner review.</p> : null}
                <p className="ai-dock-check">
                  {checking ? "Checking live workspace..." : lastChecked ? `Last checked ${lastChecked}` : "Live check ready"}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)}>×</button>
            </header>

            <button
              className="ai-dock-refresh"
              type="button"
              onClick={() => {
                clearReviewedToday();
                setDismissed(false);
                runCheck();
              }}
              disabled={checking}
            >
              {checking ? "Checking..." : "Refresh AI check"}
            </button>

            <button className="ai-dock-command-open" type="button" onClick={openCommand}>
              Open AI quick-create
            </button>

            <div className="ai-dock-owner-controls">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  window.history.pushState({}, "", "/dashboard");
                  window.dispatchEvent(new PopStateEvent("popstate"));
                }}
              >
                Open Smart Hub
              </button>
              <button
                type="button"
                onClick={() => {
                  saveReviewedToday();
                  setDismissed(true);
                  if (typeof logActivity === "function") logActivity("Marked AI actions reviewed");
                }}
              >
                Mark all reviewed
              </button>
            </div>

            <div className="ai-dock-quick-actions">
              {[
                ["New job", "/jobs"],
                ["Add client", "/clients"],
                ["New quote", "/quotes"],
                ["New invoice", "/invoices"],
              ].map(([label, path]) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => {
                    go(path, `Opened ${label}`);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <section className="ai-dock-briefing">
              <span>AI daily briefing</span>
              <p>{briefing}</p>
            </section>

            <section className="ai-dock-summary">
              <article>
                <span>Dispatch</span>
                <strong>{dismissed ? 0 : counts.unassigned}</strong>
              </article>
              <article>
                <span>Draft invoices</span>
                <strong>{dismissed ? 0 : counts.drafts}</strong>
              </article>
              <article>
                <span>Quote follow-ups</span>
                <strong>{dismissed ? 0 : counts.followups}</strong>
              </article>
              <article>
                <span>Overdue</span>
                <strong>{dismissed ? 0 : counts.overdue}</strong>
              </article>
            </section>

            {activity.length ? (
              <section className="ai-dock-activity">
                <span>Session activity</span>
                {activity.map((item) => (
                  <p key={`${item.time}-${item.label}`}>
                    <strong>{item.time}</strong>
                    {item.label}
                  </p>
                ))}
              </section>
            ) : null}

            {actions.map(([type, title, action, path]) => (
              <article key={`${type}-${title}`}>
                <span>{type}</span>
                <strong>{title}</strong>
                <p>{action}</p>
                <button
                  type="button"
                  onClick={() => {
                    go(path, `Opened ${label}`);
                  }}
                >
                  Review
                </button>
              </article>
            ))}
          </section>
        </div>
      ) : null}

      {commandOpen ? (
        <div className="ai-command-backdrop" onClick={() => setCommandOpen(false)}>
          <section className="ai-command-panel" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>AI quick-create</span>
                <h2>What do you want to start?</h2>
                <p>AI keeps the owner in control. Pick the workspace and approve the real details there.</p>
              </div>
              <button type="button" onClick={() => setCommandOpen(false)}>×</button>
            </header>

            <div className="ai-command-grid">
              {[
                ["New job", "Start or dispatch work", "/jobs"],
                ["Add client", "Create or review customer record", "/clients"],
                ["New quote", "Prepare sales follow-up", "/quotes"],
                ["New invoice", "Review cashflow and drafts", "/invoices"],
                ["Team", "Check crew and assignment fit", "/team"],
                ["Smart Hub", "Return to command centre", "/dashboard"],
              ].map(([title, body, path]) => (
                <button type="button" key={title} onClick={() => routeCommand(path, `Opened ${title}`)}>
                  <strong>{title}</strong>
                  <small>{body}</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
