import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { LifeBuoy, RefreshCw } from "lucide-react";
import "./BackupRecoveryPage.css";

const arr = (v) => Array.isArray(v) ? v : [];

export default function BackupRecoveryPage() {
  const api = useApi();
  const [recovery, setRecovery] = useState({});
  async function load() { const res = await api.get("/launch/backup-recovery"); if (res.success) setRecovery(res.data?.recovery || {}); }
  useEffect(() => { load(); }, []);
  const counts = recovery.counts || {};
  return (
    <PremiumPage maxWidth={1120}>
      <PremiumHero eyebrow="Backup and recovery" title="Know what to do when something breaks." subtitle="A real business app needs export, rollback, incident steps and backup discipline." icon={<LifeBuoy className="h-6 w-6" />} actions={<PremiumButton variant="secondary" onClick={load}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>} />
      <section className="cv-backup-counts">{Object.entries(counts).map(([k,v]) => <article key={k}><span>{k}</span><b>{v}</b></article>)}</section>
      <section className="cv-backup-grid">
        <PremiumCard title="Recovery checklist">{arr(recovery.checklist).map((x) => <Link className={`cv-backup-check ${x.ok ? "ok" : "warn"}`} key={x.label} to={x.href}><b>{x.ok ? "✓" : "!"}</b><span>{x.label}</span></Link>)}</PremiumCard>
        <PremiumCard title="Incident steps">{arr(recovery.incident_steps).map((x, i) => <div className="cv-backup-step" key={x}><b>{i+1}</b><span>{x}</span></div>)}</PremiumCard>
      </section>
    </PremiumPage>
  );
}
