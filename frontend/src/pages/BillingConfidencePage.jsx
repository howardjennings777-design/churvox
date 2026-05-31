import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { CreditCard, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import "./BillingConfidencePage.css";

const arr = (v) => Array.isArray(v) ? v : [];

export default function BillingConfidencePage() {
  const api = useApi();
  const [billing, setBilling] = useState({});

  async function loadBilling() {
    const res = await api.get("/billing/confidence");
    if (res.success) setBilling(res.data?.billing || {});
    else toast.error(res.error || "Could not load billing confidence");
  }

  useEffect(() => { loadBilling(); }, []);

  return (
    <PremiumPage maxWidth={1050}>
      <PremiumHero
        eyebrow="Billing confidence"
        title="Make plans, GST, trial and support boring-clear."
        subtitle="Owners should always know their current plan, billing state, support path and what happens if payment fails."
        icon={<CreditCard className="h-6 w-6" />}
        actions={<PremiumButton variant="secondary" onClick={loadBilling}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>}
      />

      <section className="cv-billing-summary">
        <article><span>Current plan</span><b>{billing.plan || "Unknown"}</b></article>
        <article><span>Status</span><b>{billing.plan_status || "Unknown"}</b></article>
        <article><span>Trial ends</span><b>{billing.trial_ends_at || "Not shown"}</b></article>
        <article className={billing.stripe_configured ? "green" : "amber"}><span>Stripe</span><b>{billing.stripe_configured ? "Configured" : "Needs check"}</b></article>
      </section>

      <section className="cv-billing-grid">
        <PremiumCard title="Plain-English billing notes">
          <div className="cv-billing-notes">
            <p><b>Currency:</b> {billing.currency || "NZD"}</p>
            <p><b>GST:</b> {billing.gst_note}</p>
            <p><b>Cancel/support:</b> {billing.cancel_note}</p>
            <p><b>Failed payment:</b> {billing.failed_payment_note}</p>
          </div>
        </PremiumCard>

        <PremiumCard title="Billing checks" icon={<ShieldCheck className="h-5 w-5" />}>
          {arr(billing.checks).map((check) => (
            <div className={`cv-billing-check ${check.ok ? "ok" : "warn"}`} key={check.label}>
              <b>{check.ok ? "✓" : "!"}</b>
              <span>{check.label}</span>
            </div>
          ))}
        </PremiumCard>

        <PremiumCard title="Quick links">
          <div className="cv-billing-links">
            {arr(billing.links).map((link) => <Link key={link.href} to={link.href}>{link.label}</Link>)}
            <Link to="/pricing">Public pricing</Link>
          </div>
        </PremiumCard>
      </section>
    </PremiumPage>
  );
}
