import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, CheckCheck, Inbox, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useApi } from "@/hooks/useApi";

const HIDDEN_NOTIFICATIONS_KEY = "churvox_hidden_notifications";

function readHiddenIds() {
  try {
    const raw = localStorage.getItem(HIDDEN_NOTIFICATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHiddenIds(ids) {
  try {
    localStorage.setItem(HIDDEN_NOTIFICATIONS_KEY, JSON.stringify(Array.from(new Set(ids)).slice(-500)));
  } catch {
    // ignore storage issues
  }
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const text = String(value);
  let date = new Date(text);
  if (!Number.isNaN(date.getTime())) return date;
  // Some backend timestamps arrive without timezone. Treat them as UTC to avoid stale-looking labels.
  date = new Date(`${text.replace(/Z$/, "")}Z`);
  if (!Number.isNaN(date.getTime())) return date;
  return null;
}

function timeAgo(iso, now = Date.now()) {
  const date = parseDate(iso);
  if (!date) return "just now";
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function sortNewestFirst(list) {
  return [...list].sort((a, b) => {
    const ad = parseDate(a.created_at)?.getTime() || 0;
    const bd = parseDate(b.created_at)?.getTime() || 0;
    return bd - ad;
  });
}

export default function NotificationsBell() {
  const { get, post, patch } = useApi();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [hiddenIds, setHiddenIds] = useState(readHiddenIds);
  const [now, setNow] = useState(Date.now());
  const navigate = useNavigate();
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const [anchor, setAnchor] = useState({ top: 64, left: null, right: 16, width: 360 });

  const visibleItems = useMemo(() => {
    const hidden = new Set(hiddenIds.map(String));
    return sortNewestFirst(items.filter((n) => !hidden.has(String(n.id))));
  }, [items, hiddenIds]);

  const refreshUnread = useCallback(async () => {
    const r = await get("/notifications/unread-count");
    if (r?.success) setUnread(Number(r.data?.unread || 0));
  }, [get]);

  const loadList = useCallback(async () => {
    const r = await get("/notifications?limit=20");
    if (r?.success) setItems(Array.isArray(r.data) ? r.data : []);
  }, [get]);

  useEffect(() => {
    refreshUnread();
    const t = setInterval(refreshUnread, 30000);
    return () => clearInterval(t);
  }, [refreshUnread]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Recompute anchor whenever the panel opens or the viewport changes.
  const computeAnchor = useCallback(() => {
    if (!btnRef.current) return;
    const vw = window.innerWidth;
    const rect = btnRef.current.getBoundingClientRect();
    const GUTTER = 8;
    const isMobile = vw < 640;
    if (isMobile) {
      setAnchor({
        top: Math.round(rect.bottom + 8),
        left: GUTTER,
        right: GUTTER,
        width: null,
      });
      return;
    }
    const PANEL_W = 420;
    let left = Math.round(rect.left);
    if (left + PANEL_W + GUTTER > vw) {
      left = Math.round(vw - PANEL_W - GUTTER);
    }
    if (left < GUTTER) left = GUTTER;
    setAnchor({
      top: Math.round(rect.bottom + 8),
      left,
      right: null,
      width: PANEL_W,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    computeAnchor();
    loadList();
    setNow(Date.now());
    const onResize = () => computeAnchor();
    const onDoc = (e) => {
      const t = e.target;
      if (btnRef.current && btnRef.current.contains(t)) return;
      if (panelRef.current && panelRef.current.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const liveRefresh = setInterval(() => {
      loadList();
      setNow(Date.now());
    }, 30000);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      clearInterval(liveRefresh);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, computeAnchor, loadList]);

  const handleClickItem = async (n) => {
    if (!n.read) {
      await patch(`/notifications/${n.id}/read`);
      refreshUnread();
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
    }
    setOpen(false);
    if (n.route) navigate(n.route);
  };

  const markAllRead = async () => {
    await post("/notifications/mark-all-read");
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  const clearAll = async () => {
    const idsToHide = visibleItems.map((n) => String(n.id)).filter(Boolean);
    const nextHidden = Array.from(new Set([...hiddenIds.map(String), ...idsToHide]));
    setHiddenIds(nextHidden);
    writeHiddenIds(nextHidden);
    setItems((prev) => prev.map((n) => idsToHide.includes(String(n.id)) ? { ...n, read: true } : n));
    setUnread(0);
    await post("/notifications/mark-all-read").catch(() => {});
  };

  const unreadItems = visibleItems.filter((n) => !n.read);
  const readItems = visibleItems.filter((n) => n.read);

  const panelStyle = {
    top: anchor.top,
    ...(anchor.left !== null ? { left: anchor.left } : {}),
    ...(anchor.right !== null ? { right: anchor.right } : {}),
    ...(anchor.width ? { width: anchor.width } : {}),
    maxHeight: "min(76vh, 620px)",
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-slate-100 text-slate-700 transition-colors"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        data-testid="notifications-bell"
      >
        <Bell className={`h-5 w-5 ${unread > 0 ? "text-blue-600" : ""}`} />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white"
            data-testid="notifications-unread-badge"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/20 sm:bg-transparent z-[90]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            ref={panelRef}
            role="menu"
            style={panelStyle}
            className="fixed z-[100] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            data-testid="notifications-dropdown"
          >
            <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex-shrink-0">
              <div className="min-w-0">
                <div className="text-sm font-black text-slate-900">Notifications</div>
                <div className="text-[11px] font-semibold text-slate-500">
                  {unread > 0 ? `${unread} unread` : "You're all caught up"}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 text-xs flex-shrink-0 ml-2">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1.5 font-bold text-blue-700 hover:bg-blue-100"
                    data-testid="mark-all-read-btn"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Read
                  </button>
                )}
                {visibleItems.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1.5 font-bold text-red-700 hover:bg-red-100"
                    data-testid="notifications-clear-all-btn"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Clear all
                  </button>
                )}
                <Link
                  to="/notifications"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-slate-100 px-2.5 py-1.5 font-bold text-slate-700 hover:bg-slate-200"
                  data-testid="notifications-view-all"
                >
                  View all
                </Link>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {visibleItems.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Inbox className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No notifications yet</p>
                  <p className="text-xs text-slate-400 mt-1">New job, quote, invoice, and worker updates will show here.</p>
                </div>
              ) : (
                <>
                  {unreadItems.length > 0 && (
                    <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50 sticky top-0">
                      New
                    </div>
                  )}
                  {unreadItems.map((n) => (
                    <NotifRow key={n.id} n={n} now={now} onClick={() => handleClickItem(n)} />
                  ))}
                  {readItems.length > 0 && (
                    <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50 sticky top-0">
                      Earlier
                    </div>
                  )}
                  {readItems.map((n) => (
                    <NotifRow key={n.id} n={n} now={now} onClick={() => handleClickItem(n)} />
                  ))}
                </>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

function NotifRow({ n, now, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition ${n.read ? "bg-white" : "bg-blue-50/40"}`}
      data-testid={`notification-item-${n.id}`}
    >
      <div className="flex items-start gap-2.5">
        <span className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${n.read ? "bg-slate-300" : "bg-blue-600"}`} />
        <div className="min-w-0 flex-1">
          <div className={`text-sm truncate ${n.read ? "text-slate-700" : "font-black text-slate-900"}`}>
            {n.title || n.type}
          </div>
          {n.message && <div className="text-xs font-semibold text-slate-500 line-clamp-2 mt-0.5">{n.message}</div>}
          <div className="text-[11px] font-bold text-slate-400 mt-1">{timeAgo(n.created_at, now)}</div>
        </div>
      </div>
    </button>
  );
}
