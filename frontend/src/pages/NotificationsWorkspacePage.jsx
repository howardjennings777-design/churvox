import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { Bell, CheckCircle2, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import "./NotificationsWorkspacePage.css";

const arr = (v) => Array.isArray(v) ? v : [];
const idOf = (v) => String(v?.id || v?._id || "");

export default function NotificationsWorkspacePage() {
  const api = useApi();
  const [data, setData] = useState({});
  const [busy, setBusy] = useState("");

  async function loadNotifications() {
    const res = await api.get("/notifications/workspace");
    if (res.success) setData(res.data?.notifications || {});
    else toast.error(res.error || "Could not load notifications");
  }

  useEffect(() => { loadNotifications(); }, []);

  async function createTest() {
    setBusy("test");
    const res = await api.post("/notifications/test", {});
    setBusy("");
    if (res.success) {
      toast.success("Test notification created");
      await loadNotifications();
    } else toast.error(res.error || "Could not create test notification");
  }

  async function markRead(item) {
    const id = idOf(item);
    if (!id) return;
    setBusy(id);
    const res = await api.post(`/notifications/${id}/read`, {});
    setBusy("");
    if (res.success) {
      toast.success("Marked read");
      await loadNotifications();
    } else toast.error(res.error || "Could not mark read");
  }

  const metrics = data.metrics || {};
  const items = arr(data.items);

  return (
    <PremiumPage maxWidth={1120}>
      <PremiumHero
        eyebrow="Notifications"
        title="Keep the business alive with clear owner alerts."
        subtitle="Worker completions, AI actions, support tickets and urgent issues should appear here and open the right place."
        icon={<Bell className="h-6 w-6" />}
        actions={<PremiumButton variant="secondary" onClick={loadNotifications}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>}
      />

      <section className="cv-notify-metrics">
        <article><span>Total</span><b>{metrics.total || 0}</b></article>
        <article className="amber"><span>Unread</span><b>{metrics.unread || 0}</b></article>
        <article><span>Support open</span><b>{metrics.support_open || 0}</b></article>
        <button type="button" onClick={createTest} disabled={busy === "test"}><Send size={16} /> Create test notification</button>
      </section>

      <section className="cv-notify-list">
        {items.length ? items.map((item) => (
          <PremiumCard key={idOf(item) || item.title}>
            <article className={`cv-notify-item ${item.status === "read" ? "read" : ""}`}>
              <div>
                <span>{item.type || "notification"} · {item.priority || "normal"}</span>
                <h3>{item.title || "Notification"}</h3>
                <p>{item.message || item.note || "No message"}</p>
              </div>
              <footer>
                {item.href ? <Link to={item.href}>Open</Link> : null}
                {item.status !== "read" ? <button type="button" onClick={() => markRead(item)} disabled={busy === idOf(item)}><CheckCircle2 size={15} /> Mark read</button> : <em>Read</em>}
              </footer>
            </article>
          </PremiumCard>
        )) : <PremiumCard><div className="cv-notify-empty">No notifications yet. Create a test notification to prove the flow.</div></PremiumCard>}
      </section>
    </PremiumPage>
  );
}
