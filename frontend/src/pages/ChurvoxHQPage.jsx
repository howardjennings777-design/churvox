import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { Building2, RefreshCw, ShieldCheck, Activity, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import "./ChurvoxHQPage.css";

const arr = (v) => Array.isArray(v) ? v : [];
const money = (v) => Number(v || 0).toLocaleString("en-NZ", { style: "currency", currency: "NZD" });

export default function ChurvoxHQPage() {
  const api = useApi();
  const [hq, setHq] = useState({});
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");

  async function loadHq() {
    setLoading(true);
    const res = await api.get("/platform/hq");
    if (res.success) setHq(res.data?.hq || {});
    else toast.error(res.error || "Could not load Churvox HQ");
    setLoading(false);
  }

  useEffect(() => { loadHq(); }, []);

  async function saveNote() {
    if (!note.trim()) return toast.error("Write a note first");
    const res = await api.post("/platform/hq/activity-note", { note });
    if (res.success) { toast.success("HQ note saved"); setNote(""); loadHq(); }
    else toast.error(res.error || "Could not save note");
  }

  const m = hq.metrics || {};
  const checks = hq.checks || {};

  return (
    <PremiumPage maxWidth={1240}>
      <PremiumHero eyebrow="Churvox HQ" title="Platform control for the business behind the app." subtitle="See platform health, businesses, usage, risk, plans, users and recent activity in one owner-only place." icon={<ShieldCheck className="h-6 w-6" />} actions={<PremiumButton variant="secondary" onClick={loadHq} disabled={loading}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>} />

      <section className="cv-hq-metrics">
        <article><span>Businesses</span><b>{m.businesses || 0}</b></article>
        <article><span>Users</span><b>{m.users || 0}</b></article>
        <article><span>Clients</span><b>{m.clients || 0}</b></article>
        <article><span>Jobs</span><b>{m.jobs || 0}</b></article>
        <article><span>Invoices</span><b>{m.invoices || 0}</b></article>
        <article className="green"><span>Recent paid</span><b>{money(m.recent_paid_total)}</b></article>
        <article className="amber"><span>Recent unpaid</span><b>{money(m.recent_unpaid_total)}</b></article>
        <article className={m.risk_items ? "red" : "green"}><span>Risks</span><b>{m.risk_items || 0}</b></article>
      </section>

      {loading ? <PremiumCard><div className="cv-hq-empty">Loading Churvox HQ…</div></PremiumCard> : (
        <>
          <section className="cv-hq-grid">
            <PremiumCard title="Platform checks" icon={<ShieldCheck className="h-5 w-5" />}>
              {Object.entries(checks).map(([k, v]) => <div className="cv-hq-row" key={k}><b>{k.replaceAll("_", " ")}</b><span>{String(v)}</span></div>)}
            </PremiumCard>

            <PremiumCard title="Risk watch" icon={<AlertTriangle className="h-5 w-5" />}>
              {arr(hq.risk_items).length ? arr(hq.risk_items).map((r) => <div className={`cv-hq-risk ${r.level}`} key={r.title}><b>{r.title}</b><span>{r.detail}</span></div>) : <div className="cv-hq-empty">No major platform risks found in recent records.</div>}
            </PremiumCard>

            <PremiumCard title="Plans">
              {arr(hq.plans).map((p) => <div className="cv-hq-row" key={p.label}><b>{p.label}</b><span>{p.count}</span></div>)}
            </PremiumCard>

            <PremiumCard title="Roles">
              {arr(hq.roles).map((r) => <div className="cv-hq-row" key={r.label}><b>{r.label}</b><span>{r.count}</span></div>)}
            </PremiumCard>
          </section>

          <section className="cv-hq-grid">
            <PremiumCard title="Recent users" icon={<Building2 className="h-5 w-5" />}>
              {arr(hq.recent_users).slice(0, 12).map((u) => <div className="cv-hq-row" key={u.id || u._id || u.email}><b>{u.email || u.name || "User"}</b><span>{u.role || "unknown"} · {u.plan || u.selected_plan || "no plan"}</span></div>)}
            </PremiumCard>

            <PremiumCard title="Recent invoices">
              {arr(hq.recent_invoices).slice(0, 12).map((i) => <div className="cv-hq-row" key={i.id || i._id || i.invoice_number}><b>{i.invoice_number || "Invoice"}</b><span>{i.status || "open"} · {i.customer_name || i.client_name || ""}</span></div>)}
            </PremiumCard>

            <PremiumCard title="Recent activity" icon={<Activity className="h-5 w-5" />}>
              {arr(hq.recent_activity).slice(0, 12).map((a, index) => <div className="cv-hq-row" key={a.id || a._id || index}><b>{a.type || "Activity"}</b><span>{a.note || a.message || a.status || "recorded"}</span></div>)}
            </PremiumCard>

            <PremiumCard title="HQ note">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Record support issue, launch note, customer problem, deploy note..." />
              <button type="button" onClick={saveNote}>Save HQ note</button>
              <Link to="/admin">Open legacy admin</Link>
            </PremiumCard>
          </section>
        </>
      )}
    </PremiumPage>
  );
}
