import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useApi } from "@/hooks/useApi";

function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationsBell() {
  const { get, post, patch } = useApi();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const navigate = useNavigate();
  const panelRef = useRef(null);

  const refreshUnread = useCallback(async () => {
    const r = await get("/notifications/unread-count");
    if (r?.success) setUnread(Number(r.data?.unread || 0));
  }, [get]);

  const loadList = useCallback(async () => {
    const r = await get("/notifications?limit=10");
    if (r?.success) setItems(Array.isArray(r.data) ? r.data : []);
  }, [get]);

  useEffect(() => {
    refreshUnread();
    const t = setInterval(refreshUnread, 30000);
    return () => clearInterval(t);
  }, [refreshUnread]);

  useEffect(() => {
    if (!open) return;
    loadList();
    const onDoc = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, loadList]);

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

  const unreadItems = items.filter((n) => !n.read);
  const readItems = items.filter((n) => n.read);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-slate-100 text-slate-700 transition-colors"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        data-testid="notifications-bell"
      >
        <Bell className={`h-5 w-5 ${unread > 0 ? "text-blue-600" : ""}`} />
        {unread > 0 && (
          <>
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white"
                  data-testid="notifications-unread-badge">
              {unread > 99 ? "99+" : unread}
            </span>
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-blue-600/40 animate-ping" aria-hidden />
          </>
        )}
      </button>

      {open && (
        <div
          className="fixed sm:absolute inset-x-2 top-14 sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-[360px] max-w-[96vw] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50"
          data-testid="notifications-dropdown"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
            <div>
              <div className="text-sm font-semibold text-slate-900">Notifications</div>
              <div className="text-[11px] text-slate-500">{unread > 0 ? `${unread} unread` : "You're all caught up"}</div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              {unread > 0 && (
                <button onClick={markAllRead} className="inline-flex items-center gap-1 text-blue-600 hover:underline" data-testid="mark-all-read-btn">
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
              <Link to="/notifications" onClick={() => setOpen(false)} className="text-slate-500 hover:underline">
                View all
              </Link>
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Inbox className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-600">No notifications yet</p>
                <p className="text-xs text-slate-400 mt-1">We'll ping you here when things happen.</p>
              </div>
            ) : (
              <>
                {unreadItems.length > 0 && (
                  <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50">
                    New
                  </div>
                )}
                {unreadItems.map((n) => (
                  <NotifRow key={n.id} n={n} onClick={() => handleClickItem(n)} />
                ))}
                {readItems.length > 0 && (
                  <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50">
                    Earlier
                  </div>
                )}
                {readItems.map((n) => (
                  <NotifRow key={n.id} n={n} onClick={() => handleClickItem(n)} />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotifRow({ n, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition ${n.read ? "bg-white" : "bg-blue-50/40"}`}
      data-testid={`notification-item-${n.id}`}
    >
      <div className="flex items-start gap-2.5">
        <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${n.read ? "bg-slate-300" : "bg-blue-600"}`} />
        <div className="min-w-0 flex-1">
          <div className={`text-sm truncate ${n.read ? "text-slate-700" : "font-semibold text-slate-900"}`}>
            {n.title || n.type}
          </div>
          {n.message && <div className="text-xs text-slate-500 line-clamp-2 mt-0.5">{n.message}</div>}
          <div className="text-[11px] text-slate-400 mt-1">{timeAgo(n.created_at)}</div>
        </div>
      </div>
    </button>
  );
}
