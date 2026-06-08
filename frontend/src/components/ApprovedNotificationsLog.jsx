import React from "react";
import { useApi } from "../hooks/useApi";

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function dateText(value) {
  if (!value) return "No time saved";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-NZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function normalise(res) {
  const data = res?.data || res || {};
  return Array.isArray(data.notifications) ? data.notifications : Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
}

function statusKind(status = "", error = "") {
  const text = String(status || "").toLowerCase();
  const problem = String(error || "").trim();
  if (problem || text.includes("failed") || text.includes("error") || text === "not_sent" || text.includes("not_sent")) return "failed";
  if (text.includes("prepared")) return "prepared";
  if (["sent", "delivered", "queued", "success"].includes(text)) return "sent";
  if (text.includes("sent") && !text.includes("not_sent")) return "sent";
  return "prepared";
}

export default function ApprovedNotificationsLog({ compact = false }) {
  const api = useApi();
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [filter, setFilter] = React.useState("all");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/approved-notifications");
      setItems(res?.success === false ? [] : normalise(res));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  React.useEffect(() => { load(); }, [load]);

  const visible = items.filter((item) => {
    const kind = statusKind(item.status, item.error);
    if (filter === "all") return true;
    if (filter === "email") return String(item.channel).toLowerCase() === "email";
    if (filter === "sms") return String(item.channel).toLowerCase() === "sms";
    if (filter === "sent") return kind === "sent";
    if (filter === "needs") return kind === "failed";
    return true;
  });

  const stats = {
    total: items.length,
    sent: items.filter((item) => statusKind(item.status, item.error) === "sent").length,
    prepared: items.filter((item) => statusKind(item.status, item.error) === "prepared").length,
    failed: items.filter((item) => statusKind(item.status, item.error) === "failed").length,
  };

  return (
    <section className="cnLog">
      <div className="cnHead">
        <div>
          <span>Comms log</span>
          <h2>Approved messages</h2>
          <p>Emails and SMS are listed here after owner approval, including sent, prepared, disabled, or failed messages.</p>
        </div>
        <button type="button" onClick={load}>{loading ? "Loading..." : "Refresh log"}</button>
      </div>

      {!compact ? <div className="cnStats">
        <article><b>Total</b><strong>{stats.total}</strong></article>
        <article><b>Sent</b><strong>{stats.sent}</strong></article>
        <article><b>Prepared</b><strong>{stats.prepared}</strong></article>
        <article><b>Needs check</b><strong>{stats.failed}</strong></article>
      </div> : null}

      <div className="cnFilters">
        {["all", "email", "sms", "sent", "needs"].map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "needs" ? "Needs check" : value}</button>)}
      </div>

      <div className="cnRows">
        {visible.length ? visible.slice(0, compact ? 5 : 40).map((item, index) => (
          <article key={first(item.id, item._id, index)} className={`cnItem ${statusKind(item.status, item.error)}`}>
            <div>
              <b>{String(first(item.channel, "message")).toUpperCase()} · {first(item.status, "prepared")}</b>
              <strong>{first(item.subject, item.title, "Approved message")}</strong>
              <p>{first(item.body, item.detail, "No message body saved")}</p>
              {item.error ? <em>{item.error}</em> : null}
            </div>
            <aside>
              <span>{first(item.to, "No recipient")}</span>
              <small>{first(item.record_type, "record")} · {first(item.record_id, "no ID")}</small>
              <small>{dateText(first(item.created_at, item.createdAt))}</small>
            </aside>
          </article>
        )) : <div className="cnEmpty">No approved messages yet. Once a Command approval sends or prepares an email/SMS, it will show here.</div>}
      </div>
    </section>
  );
}
