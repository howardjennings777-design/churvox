import React from "react";
import { Building2, Download, Inbox, RefreshCw, Search, Users, X } from "lucide-react";
import API_BASE from "../../lib/apiBase";
import "./TesterApplicationsInbox.css";

const ENDPOINT = "/api/admin/owner/tester-applications";

function authHeaders() {
  let token = "";
  try { token = localStorage.getItem("token") || ""; } catch {}
  return { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function text(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return fallback;
  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function dateText(value) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "Date unavailable";
  return parsed.toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short" });
}

function sourceText(item) {
  const source = text(item?.utm_source || item?.source, "Direct");
  const medium = text(item?.utm_medium);
  const campaign = text(item?.utm_campaign);
  return [source, medium, campaign].filter(Boolean).join(" · ");
}

function idOf(item, index) {
  return text(item?.id || item?._id || item?.email || item?.created_at, `application-${index}`);
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCsv(rows) {
  if (!rows.length) return;
  const columns = [
    ["name", (row) => row.name],
    ["business", (row) => row.business_name],
    ["trade", (row) => row.trade],
    ["team_size", (row) => row.team_size],
    ["email", (row) => row.email],
    ["status", (row) => row.status],
    ["source", (row) => row.source],
    ["utm_source", (row) => row.utm_source],
    ["utm_medium", (row) => row.utm_medium],
    ["utm_campaign", (row) => row.utm_campaign],
    ["utm_content", (row) => row.utm_content],
    ["landing_path", (row) => row.landing_path],
    ["locale", (row) => row.locale],
    ["created_at", (row) => row.created_at],
  ];
  const lines = [
    columns.map(([name]) => csvCell(name)).join(","),
    ...rows.map((row) => columns.map(([, read]) => csvCell(read(row))).join(",")),
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `churvox-tester-applications-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function TesterApplicationsInbox() {
  const [open, setOpen] = React.useState(false);
  const [applications, setApplications] = React.useState([]);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}${ENDPOINT}`, {
        credentials: "include",
        headers: authHeaders(),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.message || `Request failed ${response.status}`);
      setApplications(Array.isArray(body?.applications) ? body.applications : []);
    } catch (loadError) {
      setError(loadError?.message || "Tester applications could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    const timer = window.setInterval(load, 60000);
    return () => window.clearInterval(timer);
  }, [load]);

  React.useEffect(() => {
    if (!open) return undefined;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const close = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", close);
    return () => {
      document.documentElement.style.overflow = previous;
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = React.useMemo(() => applications.filter((item) => {
    if (!normalizedQuery) return true;
    return JSON.stringify(item).toLowerCase().includes(normalizedQuery);
  }), [applications, normalizedQuery]);

  const newCount = applications.filter((item) => text(item?.status, "new").toLowerCase() === "new").length;
  const uniqueSources = new Set(applications.map((item) => text(item?.utm_source || item?.source)).filter(Boolean)).size;

  return (
    <>
      <button
        type="button"
        className="cvTesterInboxLauncher"
        onClick={() => setOpen(true)}
        aria-label={`Open tester applications${newCount ? `, ${newCount} new` : ""}`}
      >
        <Inbox size={18} />
        <span>Applications</span>
        <b>{loading ? "…" : applications.length}</b>
      </button>

      {open ? (
        <div className="cvTesterInboxBackdrop" role="dialog" aria-modal="true" aria-label="Tester application inbox">
          <section className="cvTesterInboxPanel">
            <header className="cvTesterInboxHeader">
              <div>
                <small>Churvox HQ · view only</small>
                <h2>Tester applications</h2>
                <p>Applications from the website are listed here. Nothing is sent and no access is granted from this inbox.</p>
              </div>
              <button type="button" className="cvTesterInboxClose" onClick={() => setOpen(false)} aria-label="Close tester applications"><X size={22} /></button>
            </header>

            <div className="cvTesterInboxMetrics">
              <article><Inbox size={18} /><div><span>Total applications</span><strong>{applications.length}</strong></div></article>
              <article><Users size={18} /><div><span>New</span><strong>{newCount}</strong></div></article>
              <article><Building2 size={18} /><div><span>Sources tracked</span><strong>{uniqueSources}</strong></div></article>
            </div>

            <div className="cvTesterInboxTools">
              <label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search business, trade, email or source…" /></label>
              <button type="button" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""} />Refresh</button>
              <button type="button" onClick={() => downloadCsv(filtered)} disabled={!filtered.length}><Download size={16} />Export CSV</button>
            </div>

            {error ? <div className="cvTesterInboxNotice error">{error}</div> : null}
            {!error && loading && !applications.length ? <div className="cvTesterInboxNotice">Loading live applications…</div> : null}
            {!loading && !error && !filtered.length ? <div className="cvTesterInboxNotice">No matching tester applications are saved yet.</div> : null}

            {filtered.length ? (
              <div className="cvTesterInboxTableWrap">
                <table>
                  <thead><tr><th>Business</th><th>Trade / team</th><th>Source</th><th>Status</th><th>Received</th></tr></thead>
                  <tbody>
                    {filtered.map((item, index) => (
                      <tr key={idOf(item, index)}>
                        <td><strong>{text(item?.business_name, "Business not supplied")}</strong><span>{text(item?.name, "Name not supplied")}</span><span>{text(item?.email, "Email unavailable")}</span></td>
                        <td><strong>{text(item?.trade, "Trade unavailable")}</strong><span>{text(item?.team_size, "Team size unavailable")}</span></td>
                        <td><strong>{sourceText(item)}</strong><span>{text(item?.utm_content || item?.landing_path, "No campaign detail")}</span></td>
                        <td><span className={`cvTesterInboxStatus ${text(item?.status, "new").toLowerCase()}`}>{text(item?.status, "new")}</span></td>
                        <td><strong>{dateText(item?.created_at || item?.updated_at)}</strong><span>{text(item?.locale, "Locale unavailable")}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
