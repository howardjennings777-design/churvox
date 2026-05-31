import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { Activity, RefreshCw } from "lucide-react";
import "./LaunchOpsPage.css";

const arr = (v) => Array.isArray(v) ? v : [];

export default function LaunchOpsPage() {
  const api = useApi();
  const [ops, setOps] = useState({});
  async function load() { const res = await api.get("/launch/ops"); if (res.success) setOps(res.data?.ops || {}); }
  useEffect(() => { load(); }, []);
  const m = ops.metrics || {};
  return (
    <PremiumPage maxWidth={1120}>
      <PremiumHero eyebrow="Launch operations" title="Run Churvox like a real software business." subtitle="Daily checks for support, notifications, AI actions, overdue invoices, failed syncs and customer issues." icon={<Activity className="h-6 w-6" />} actions={<PremiumButton variant="secondary" onClick={load}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>} />
      <section className="cv-ops-metrics">
        <article><span>Support open</span><b>{m.support_open || 0}</b></article>
        <article><span>Unread alerts</span><b>{m.unread_notifications || 0}</b></article>
        <article><span>AI pending</span><b>{m.ai_pending || 0}</b></article>
        <article><span>Overdue invoices</span><b>{m.overdue_invoices || 0}</b></article>
        <article><span>Failed sync</span><b>{m.failed_sync || 0}</b></article>
      </section>
      <section className="cv-ops-grid">
        <PremiumCard title="Operating routine">{arr(ops.routine).map((r) => <div className="cv-ops-row" key={r.task}><b>{r.cadence}</b><span>{r.task}</span></div>)}</PremiumCard>
        <PremiumCard title="Recent support">{arr(ops.recent_support).length ? arr(ops.recent_support).map((t) => <div className="cv-ops-row" key={t.id || t._id || t.title}><b>{t.title || t.type}</b><span>{t.status || "open"} · {t.message || t.note || ""}</span></div>) : <div className="cv-ops-empty">No recent support tickets.</div>}</PremiumCard>
      </section>
      <PremiumCard title="Quick links"><div className="cv-ops-links"><Link to="/churvox-hq">Churvox HQ</Link><Link to="/notifications">Notifications</Link><Link to="/ai-operator">AI Operator</Link><Link to="/reports">Reports</Link></div></PremiumCard>
    </PremiumPage>
  );
}
