import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Inbox, ChevronRight } from "lucide-react";

function humanType(t) {
  if (!t) return "";
  return String(t).replace(/_/g, " ");
}

function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationsPage() {
  const { get, post, patch } = useApi();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const nav = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    const r = await get("/notifications?limit=50");
    if (r?.success) setItems(Array.isArray(r.data) ? r.data : []);
    setLoading(false);
  }, [get]);

  useEffect(() => { load(); }, [load]);

  const onOpen = async (n) => {
    if (!n.read) {
      await patch(`/notifications/${n.id}/read`);
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
    }
    if (n.route) nav(n.route);
  };

  const markAll = async () => {
    await post("/notifications/mark-all-read");
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = items.filter((n) => !n.read).length;

  const visible = useMemo(() => {
    if (tab === "unread") return items.filter((n) => !n.read);
    return items;
  }, [items, tab]);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <Bell className="h-6 w-6 text-blue-600" /> Notifications
            </h1>
            <p className="text-sm text-slate-500">Updates from your jobs, quotes, invoices and team.</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAll} data-testid="notifications-mark-all">
              <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1 border border-slate-200 rounded-full w-fit p-1 bg-white">
          <TabBtn active={tab === "all"} onClick={() => setTab("all")} label={`All ${items.length > 0 ? `(${items.length})` : ""}`} />
          <TabBtn active={tab === "unread"} onClick={() => setTab("unread")} label={`Unread ${unreadCount > 0 ? `(${unreadCount})` : ""}`} />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
          ) : visible.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-600">
                {tab === "unread" ? "Nothing unread. Nice." : "You're all caught up."}
              </p>
              <p className="text-xs text-slate-400 mt-1">New notifications will appear here automatically.</p>
            </div>
          ) : (
            visible.map((n) => (
              <button
                key={n.id}
                onClick={() => onOpen(n)}
                className={`w-full text-left px-5 py-4 border-b border-slate-100 hover:bg-slate-50/70 transition group ${n.read ? "bg-white" : "bg-blue-50/40"}`}
                data-testid={`notification-row-${n.id}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${n.read ? "bg-slate-300" : "bg-blue-600"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`text-sm ${n.read ? "text-slate-700" : "font-semibold text-slate-900"}`}>
                        {n.title || humanType(n.type)}
                      </div>
                      {n.type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                          {n.type}
                        </span>
                      )}
                    </div>
                    {n.message && <div className="text-sm text-slate-600 mt-0.5 line-clamp-2">{n.message}</div>}
                    <div className="text-xs text-slate-400 mt-1">{timeAgo(n.created_at)} · {new Date(n.created_at).toLocaleString()}</div>
                  </div>
                  {n.route && <ChevronRight className="h-4 w-4 text-slate-300 mt-1 flex-shrink-0 group-hover:text-blue-600" />}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}

function TabBtn({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 h-8 rounded-full text-sm font-medium transition-colors ${
        active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}
