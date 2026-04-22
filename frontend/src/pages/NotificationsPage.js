import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";

export default function NotificationsPage() {
  const { get, post, patch } = useApi();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    const r = await get("/notifications?limit=50");
    if (r?.success) setItems(Array.isArray(r.data) ? r.data : []);
    setLoading(false);
  }, [get]);

  useEffect(() => { load(); }, [load]);

  const onOpen = async (n) => {
    if (!n.read) await patch(`/notifications/${n.id}/read`);
    if (n.route) nav(n.route);
  };

  const markAll = async () => {
    await post("/notifications/mark-all-read");
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" /> Notifications
          </h1>
          <Button variant="outline" onClick={markAll} data-testid="notifications-mark-all">
            <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
          </Button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">You're all caught up.</div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => onOpen(n)}
                className={`w-full text-left px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition ${n.read ? "bg-white" : "bg-blue-50/40"}`}
                data-testid={`notification-row-${n.id}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${n.read ? "bg-slate-300" : "bg-blue-600"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{n.title || n.type}</div>
                    {n.message && <div className="text-sm text-slate-600 mt-0.5">{n.message}</div>}
                    <div className="text-xs text-slate-400 mt-1">{n.type} · {new Date(n.created_at).toLocaleString()}</div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
