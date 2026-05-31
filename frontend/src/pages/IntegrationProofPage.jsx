import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { PlugZap, RefreshCw } from "lucide-react";
import "./IntegrationProofPage.css";

const arr = (v) => Array.isArray(v) ? v : [];

export default function IntegrationProofPage() {
  const api = useApi();
  const [proof, setProof] = useState({});
  async function load() { const res = await api.get("/launch/integration-proof"); if (res.success) setProof(res.data?.proof || {}); }
  useEffect(() => { load(); }, []);
  const metrics = proof.metrics || {};
  return (
    <PremiumPage maxWidth={1120}>
      <PremiumHero eyebrow="Integration proof" title="Prove every external system is safe." subtitle="Email, Stripe, MYOB, SMS and public invoice links need clear ready/fail states before serious launch." icon={<PlugZap className="h-6 w-6" />} actions={<PremiumButton variant="secondary" onClick={load}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>} />
      <section className="cv-proof-metrics">
        <article><span>Email</span><b>{metrics.email_configured ? "Ready" : "Check"}</b></article>
        <article><span>Stripe</span><b>{metrics.stripe_configured ? "Ready" : "Check"}</b></article>
        <article><span>MYOB</span><b>{metrics.myob_connected ? "Connected" : "Not yet"}</b></article>
        <article><span>SMS credits</span><b>{metrics.sms_credits || 0}</b></article>
      </section>
      <section className="cv-proof-list">
        {arr(proof.checks).map((check) => <PremiumCard key={check.key}><div className={`cv-proof-check ${check.ok ? "ok" : "warn"}`}><b>{check.ok ? "✓" : "!"}</b><div><h3>{check.label}</h3><p>{check.action}</p></div></div></PremiumCard>)}
      </section>
      <PremiumCard title="Quick links"><div className="cv-proof-links"><Link to="/integrations">Integrations</Link><Link to="/plans">Plans</Link><Link to="/invoices">Invoices</Link><Link to="/contact">Support</Link></div></PremiumCard>
    </PremiumPage>
  );
}
