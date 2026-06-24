import React from "react";
import { Bell, CheckCheck, X } from "lucide-react";
import { useApi } from "../hooks/useApi";
import "./freshNotificationBell.css";

function listFrom(value) {
  const data = value?.data ?? value;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.notifications)) return data.notifications;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function idOf(item) {
  return String(item?.id || item?._id || item?.notification_id || "");
}

function titleOf(item) {
  return item?.title || item?.subject || item?.type || "Notification";
}

function bodyOf(item) {
  return item?.message || item?.body || item?.text || item?.description || "";
}

function iconOf(item) {
  const type = String(item?.type || item?.event_type || "").toLowerCase();
  if (type.includes("customer") || type.includes("request")) return "RQ";
  if (type.includes("quote")) return "QT";
  if (type.includes("invoice") || type.includes("payment")) return "IV";
  if (type.includes("message") || type.includes("contact")) return "MS";
  if (type.includes("worker") || type.includes("shift") || type.includes("time")) return "WK";
  if (type.includes("xero") || type.includes("myob")) return "XE";
  return "AI";
}

function isMessageItem(item) {
  const haystack = [
    item?.type,
    item?.event_type,
    item?.title,
    item?.subject,
    item?.message,
    item?.body,
    item?.text,
    item?.description,
  ].map((part) => String(part || "").toLowerCase()).join(" ");

  return /message|contact office|worker note|worker update|sent back|reply/.test(haystack);
}

function routeOf(item) {
  if (isMessageItem(item)) return "/dashboard#messages";
  return item?.route || item?.target_route || item?.url || item?.href || "";
}

function isUnread(item) {
  return item?.read !== true && item?.is_read !== true && item?.read_at == null;
}

function validDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function parseBackendDate(value) {
  if (!value) return null;
  if (value instanceof Date) return validDate(value) ? value : null;
  if (typeof value === "object") {
    if (value.$date) return parseBackendDate(value.$date);
    if (value.date) return parseBackendDate(value.date);
  }

  if (typeof value === "number") {
    const millis = value < 10000000000 ? value * 1000 : value;
    const date = new Date(millis);
    return validDate(date) ? date : null;
  }

  let raw = String(value || "").trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) return parseBackendDate(Number(raw));
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw)) raw = raw.replace(" ", "T");

  const looksLikeIsoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw);
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw);

  if (looksLikeIsoDateTime && !hasTimezone) {
    const utcDate = new Date(`${raw}Z`);
    const localDate = new Date(raw);

    if (validDate(utcDate) && validDate(localDate)) {
      const graceMs = 2 * 60 * 1000;
      const utcLooksFuture = utcDate.getTime() - Date.now() > graceMs;
      const localIsReasonable = localDate.getTime() - Date.now() <= graceMs;
      return utcLooksFuture && localIsReasonable ? localDate : utcDate;
    }

    return validDate(utcDate) ? utcDate : null;
  }

  const date = new Date(raw);
  return validDate(date) ? date : null;
}

function absoluteTime(value) {
  const date = parseBackendDate(value);
  if (!date) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function timeAgo(value) {
  const date = parseBackendDate(value);
  if (!date) return "";

  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function createdAtOf(item) {
  return item?.created_at || item?.createdAt || item?.updated_at || item?.updatedAt || item?.sent_at || item?.sentAt || item?.read_at || item?.readAt || "";
}

export default function FreshNotificationBell() {
  const { get, post, patch } = useApi();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const unread = items.filter(isUnread).length;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await get(`/notifications?limit=20&ts=${Date.now()}`);
      if (res?.success) setItems(listFrom(res.data));
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("churvox:fresh-data-updated", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("churvox:fresh-data-updated", onFocus);
    };
  }, [load]);

  async function markRead(item) {
    const id = idOf(item);
    if (!id) return;
    setItems((previous) => previous.map((one) => idOf(one) === id ? { ...one, read: true, is_read: true, read_at: new Date().toISOString() } : one));
    try {
      await patch(`/notifications/${encodeURIComponent(id)}/read`, {});
    } catch {}
  }

  async function markAllRead() {
    setItems((previous) => previous.map((one) => ({ ...one, read: true, is_read: true, read_at: new Date().toISOString() })));
    try {
      await post("/notifications/mark-all-read", {});
    } catch {}
  }

  function openNotification(item) {
    markRead(item);
    const route = routeOf(item);
    if (route && route.startsWith("/")) {
      window.location.href = route;
    }
  }

  return (
    <div className="freshNotifyBell">
      <button type="button" className="freshNotifyButton" onClick={() => { setOpen((value) => !value); load(); }} aria-label="Notifications">
        <Bell size={18} />
        {unread ? <span>{unread > 99 ? "99+" : unread}</span> : null}
      </button>

      {open ? (
        <section className="freshNotifyPanel">
          <header>
            <div>
              <b>Notifications</b>
              <small>{unread ? `${unread} unread` : "All caught up"}</small>
            </div>
            <div>
              <button type="button" onClick={markAllRead} title="Mark all read"><CheckCheck size={16} /></button>
              <button type="button" onClick={() => setOpen(false)} title="Close"><X size={16} /></button>
            </div>
          </header>

          <div className="freshNotifyList">
            {loading && !items.length ? <p>Loading notifications...</p> : null}

            {!loading && !items.length ? (
              <article className="empty">
                <b>No notifications yet</b>
                <span>Alerts show here. Worker conversations live in Messages.</span>
              </article>
            ) : null}

            {items.map((item) => {
              const createdAt = createdAtOf(item);
              const when = timeAgo(createdAt);
              const exactWhen = absoluteTime(createdAt);

              return (
                <button key={idOf(item) || `${titleOf(item)}-${createdAt}`} type="button" className={isUnread(item) ? "unread" : ""} onClick={() => openNotification(item)}>
                  <em>{iconOf(item)}</em>
                  <span>{titleOf(item)}</span>
                  <b>{bodyOf(item) || "Open notification"}</b>
                  <small title={exactWhen}>{when || "New"}</small>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
