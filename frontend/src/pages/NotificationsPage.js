import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useApi } from "@/hooks/useApi";
import { Bell, CheckCheck, Inbox, ChevronRight } from "lucide-react";
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton } from "@/components/premium";
import { formatLocalDateTime, formatRelativeTime } from "@/lib/time";

function humanType(t) {
  if (!t) return "";
  return String(t).replace(/_/g, " ");
}

export default function NotificationsPage() {
  const { get, post, patch } = useApi();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const nav = useNavigate();
  const [, setNowTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await get("/notifications?limit=50");
    if (r?.success) setItems(Array.isArray(r.data) ? r.data : []);
    setLoading(false);
  }, [get]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick((v) => v + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

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
      <PremiumPage maxWidth={900}>
        <PremiumHero
          eyebrow="Updates"
          title="Notifications"
          subtitle="Jobs, quotes, invoices, team activity and automation events — all in one place."
          icon={<Bell className="h-6 w-6" />}
          actions={
            unreadCount > 0 && (
              <PremiumButton variant="secondary" onClick={markAll} dataTestId="notifications-mark-all">
                <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
              </PremiumButton>
            )
          }
        />

        <div className="flex items-center gap-1 bg-white border border-[#e6eef9] rounded-full w-fit p-1 shadow-sm">
          <TabBtn active={tab === "all"} onClick={() => setTab("all")} label={`All ${items.length > 0 ? `(${items.length})` : ""}`} />
          <TabBtn active={tab === "unread"} onClick={() => setTab("unread")} label={`Unread ${unreadCount > 0 ? `(${unreadCount})` : ""}`} />
        </div>

        <PremiumCard noBody>
          {loading ? (
            <div className="p-8 text-center text-sm text-[#5b6c87]">Loading...</div>
          ) : visible.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox className="h-10 w-10 text-[#b8c8de] mx-auto mb-3" />
              <p className="text-sm text-[#0d1b34] font-semibold">
                {tab === "unread" ? "Nothing unread. Nice." : "You're all caught up."}
              </p>
              <p className="text-xs text-[#7d8ba3] mt-1">New notifications will appear here automatically.</p>
            </div>
          ) : (
            visible.map((n) => (
              <button
                key={n.id}
                onClick={() => onOpen(n)}
                className={`w-full text-left px-5 py-4 border-b border-[#e6eef9] last:border-b-0 hover:bg-[#eff4ff]/60 transition group ${n.read ? "bg-white" : "bg-[#eff4ff]/40"}`}
                data-testid={`notification-row-${n.id}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${n.read ? "bg-[#b8c8de]" : "bg-[#2563eb]"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`text-sm ${n.read ? "text-[#1a2c4d]" : "font-semibold text-[#0d1b34]"}`}>
                        {n.title || humanType(n.type)}
                      </div>
                      {n.type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#eff4ff] text-[#1d4ed8] font-mono font-semibold">
                          {n.type}
                        </span>
                      )}
                    </div>
                    {n.message && <div className="text-sm text-[#5b6c87] mt-0.5 line-clamp-2">{n.message}</div>}
                    <div className="text-xs text-[#7d8ba3] mt-1">{formatRelativeTime(n.created_at)} · {formatLocalDateTime(n.created_at)}</div>
                  </div>
                  {n.route && <ChevronRight className="h-4 w-4 text-[#b8c8de] mt-1 flex-shrink-0 group-hover:text-[#2563eb]" />}
                </div>
              </button>
            ))
          )}
        </PremiumCard>
      </PremiumPage>
    </Layout>
  );
}

function TabBtn({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 h-8 rounded-full text-sm font-semibold transition-colors ${
        active ? "bg-[#0d1b34] text-white shadow-sm" : "text-[#5b6c87] hover:bg-[#eff4ff]"
      }`}
    >
      {label}
    </button>
  );
}
