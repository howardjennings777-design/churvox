import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
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
    }
    setOpen(false);
    if (n.route) navigate(n.route);
  };

  const markAllRead = async () => {
    await post("/notifications/mark-all-read");
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-slate-100 text-slate-700"
        aria-label="Notifications"
        data-testid="notifications-bell"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center"
            data-testid="notifications-unread-badge"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[340px] max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50"
             data-testid="notifications-dropdown">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
            <div className="text-sm font-semibold text-slate-900">Notifications</div>
            <div className="flex items-center gap-3 text-xs">
              <button onClick={markAllRead} className="text-blue-600 hover:underline" data-testid="mark-all-read-btn">
                Mark all read
              </button>
              <Link to="/notifications" onClick={() => setOpen(false)} className="text-slate-500 hover:underline">
                View all
              </Link>
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickItem(n)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition ${n.read ? "bg-white" : "bg-blue-50/50"}`}
                  data-testid={`notification-item-${n.id}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${n.read ? "bg-slate-300" : "bg-blue-600"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-900 truncate">{n.title || n.type}</div>
                      {n.message && <div className="text-xs text-slate-500 line-clamp-2">{n.message}</div>}
                      <div className="text-[11px] text-slate-400 mt-1">{timeAgo(n.created_at)}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
