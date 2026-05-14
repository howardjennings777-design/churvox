import React, { useEffect, useMemo, useState } from "react";
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

function status(item) {
  return String(item?.status || item?.job_status || item?.payment_status || item?.quote_status || "").toLowerCase();
}

export default function AIActionDock() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(isLoggedIn());
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

  async function runCheck() {
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
  }

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

  const readyCount = counts.unassigned + counts.drafts + counts.followups + counts.overdue || actions.length;

  if (!visible) return null;

  return (
    <>
      <button className="ai-dock-button" type="button" onClick={() => setOpen(true)}>
        <span>AI</span>
        <strong>{readyCount} ready</strong>
      </button>

      {open ? (
        <div className="ai-dock-backdrop" onClick={() => setOpen(false)}>
          <section className="ai-dock-panel" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>AI Operator</span>
                <h2>Prepared actions</h2>
                <p className="ai-dock-check">
                  {checking ? "Checking live workspace..." : lastChecked ? `Last checked ${lastChecked}` : "Live check ready"}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)}>×</button>
            </header>

            <button className="ai-dock-refresh" type="button" onClick={runCheck} disabled={checking}>
              {checking ? "Checking..." : "Refresh AI check"}
            </button>

            {actions.map(([type, title, action, path]) => (
              <article key={`${type}-${title}`}>
                <span>{type}</span>
                <strong>{title}</strong>
                <p>{action}</p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    window.history.pushState({}, "", path);
                    window.dispatchEvent(new PopStateEvent("popstate"));
                  }}
                >
                  Review
                </button>
              </article>
            ))}
          </section>
        </div>
      ) : null}
    </>
  );
}
