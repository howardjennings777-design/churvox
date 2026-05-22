import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import MarketingShell from "../../components/marketing/MarketingShell";
import { CHURVOX_PLANS, CHURVOX_ADDONS, GST_NOTE } from "../../lib/marketingPlans";

const rows = [
  ["AI Operator Front Desk", "Included", "Included", "Advanced", "Full command"],
  ["Worker app", "1 worker", "5 active", "12 active", "25 active"],
  ["Quotes + invoices", "Included", "Included", "AI assisted", "AI assisted"],
  ["Payroll workspace", "—", "Timesheets", "Included", "Advanced roles"],
  ["MYOB", "—", "—", "+$39/mo", "Included"],
];

function PlanCard({ plan }) {
  return (
    <article className={plan.highlight ? "price-card price-card-main" : "price-card"}>
      {plan.badge ? <span className="price-badge">{plan.badge}</span> : null}
      <header>
        <h2>{plan.name}</h2>
        <p>{plan.tagline}</p>
      </header>
      <div className="price-money"><strong>${plan.priceMonthly}</strong><span>/mo</span></div>
      <small>{plan.activeTeam} · ex GST</small>
      <Link to="/signup" className="price-cta">{plan.cta}</Link>
      <ul>
        {plan.features.map((f) => <li key={f}>{f}</li>)}
      </ul>
    </article>
  );
}

export default function PricingPage() {
  useEffect(() => { document.title = "Pricing — Churvox"; }, []);

  return (
    <MarketingShell>
      <main className="pricing-page">
        <section className="pricing-hero">
          <div className="pricing-copy">
            <p className="site-kicker">Pricing</p>
            <h1>Pick the front desk your business needs today.</h1>
            <p>Simple NZD pricing, ex GST. Start with the essentials, then move into the AI Operator plan when you want Churvox preparing more of the admin.</p>
            <div className="pricing-actions"><Link to="/signup">Start free</Link><Link to="/features">See features</Link></div>
          </div>
          <aside className="pricing-note">
            <b>Most owners choose Operator</b>
            <p>It unlocks the real Churvox value: AI invoice, quote, follow-up and dispatch preparation — with owner approval before anything important happens.</p>
          </aside>
        </section>

        <section className="pricing-grid">
          {CHURVOX_PLANS.map((plan) => <PlanCard plan={plan} key={plan.id} />)}
        </section>

        <section className="pricing-compare">
          <div className="pricing-section-head"><p className="site-kicker">Compare</p><h2>Clear differences. No seat-count tricks.</h2><p>{GST_NOTE}</p></div>
          <div className="compare-table">
            <div className="compare-row compare-head"><span>Capability</span><b>Start</b><b>Crew</b><b>Operator</b><b>Command</b></div>
            {rows.map((r) => <div className="compare-row" key={r[0]}>{r.map((x, i) => i === 0 ? <span key={x}>{x}</span> : <b key={i}>{x}</b>)}</div>)}
          </div>
        </section>

        <section className="pricing-addons">
          <div className="pricing-section-head"><p className="site-kicker">Add-ons</p><h2>Only add what the business actually uses.</h2></div>
          <div className="addon-grid">
            {CHURVOX_ADDONS.map((a) => <article key={a.id}><h3>{a.title}</h3><strong>{a.priceLabel || `$${a.price}/mo`}</strong><p>{a.description}</p><small>{a.appliesTo}</small></article>)}
          </div>
        </section>

        <section className="pricing-final"><div><p className="site-kicker">Start properly</p><h2>Use Churvox on real work before you decide.</h2><p>No card to start. Add clients, create jobs, invite workers and see the operator queue fill up.</p></div><Link to="/signup">Start free</Link></section>
      </main>

      <style>{`
        .pricing-page{background:#e8e2d6;color:#101114}.site-kicker{text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:900;color:#9b8059;margin:0 0 14px}.pricing-hero{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(360px,.65fr);gap:28px;align-items:stretch;padding:clamp(48px,7vw,96px) clamp(18px,4vw,64px);background:linear-gradient(135deg,#101114 0%,#242830 52%,#e8e2d6 52%,#f3eee5 100%)}.pricing-copy{color:#fbf8f1;max-width:880px}.pricing-copy h1,.pricing-section-head h2,.pricing-final h2{font-family:Outfit,Inter,sans-serif;font-size:clamp(42px,6vw,82px);line-height:.94;letter-spacing:-.065em;margin:0}.pricing-copy h1{color:#fbf8f1}.pricing-copy p{max-width:660px;color:rgba(251,248,241,.76);font-size:18px;line-height:1.55}.pricing-actions{display:flex;gap:12px;margin-top:28px}.pricing-actions a,.pricing-final>a{display:inline-flex;text-decoration:none;background:#fbf8f1;color:#101114;border:1px solid #fbf8f1;border-radius:8px;padding:13px 18px;font-weight:900}.pricing-actions a+ a{background:rgba(251,248,241,.06);color:#fbf8f1;border-color:rgba(251,248,241,.28)}.pricing-note{background:#fbf8f1;border:1px solid #cdc3b3;border-radius:14px;padding:28px;align-self:end;box-shadow:0 28px 80px rgba(16,17,20,.18)}.pricing-note b{font-family:Outfit,Inter,sans-serif;font-size:30px;line-height:1;display:block}.pricing-note p{color:#5f6670;line-height:1.55}.pricing-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:clamp(34px,5vw,64px) clamp(18px,4vw,64px)}.price-card{background:#fbf8f1;border:1px solid #cdc3b3;border-radius:12px;padding:24px;position:relative;box-shadow:0 14px 36px rgba(16,17,20,.08);display:flex;flex-direction:column}.price-card-main{background:#101114;color:#fbf8f1;border-color:#101114;transform:translateY(-12px);box-shadow:0 36px 90px rgba(16,17,20,.28)}.price-badge{position:absolute;top:14px;right:14px;background:#c58a2b;color:#101114;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:900;text-transform:uppercase}.price-card h2{font-family:Outfit,Inter,sans-serif;font-size:30px;margin:0 0 8px}.price-card p{color:#5f6670;line-height:1.45;min-height:48px}.price-card-main p,.price-card-main small,.price-card-main li{color:rgba(251,248,241,.72)}.price-money{display:flex;align-items:flex-end;gap:6px;margin-top:8px}.price-money strong{font-family:Outfit,Inter,sans-serif;font-size:54px;line-height:.9}.price-money span{color:#5f6670;font-weight:800}.price-card small{color:#5f6670;margin-top:8px}.price-cta{display:block;text-align:center;text-decoration:none;background:#101114;color:#fbf8f1;border-radius:8px;padding:12px 14px;font-weight:900;margin:18px 0}.price-card-main .price-cta{background:#fbf8f1;color:#101114}.price-card ul{list-style:none;padding:0;margin:0;display:grid;gap:10px}.price-card li{font-size:13.5px;color:#242830;line-height:1.4}.pricing-compare,.pricing-addons{padding:clamp(34px,5vw,70px) clamp(18px,4vw,64px)}.pricing-compare{background:#f3eee5}.pricing-section-head{max-width:900px;margin-bottom:28px}.pricing-section-head h2{font-size:clamp(34px,4.8vw,64px)}.pricing-section-head p{color:#5f6670;line-height:1.55}.compare-table{background:#fbf8f1;border:1px solid #cdc3b3;border-radius:12px;overflow:hidden;box-shadow:0 16px 44px rgba(16,17,20,.08)}.compare-row{display:grid;grid-template-columns:1.35fr repeat(4,1fr);gap:1px;border-bottom:1px solid #ded4c4}.compare-row>*{padding:16px}.compare-head{background:#101114;color:#fbf8f1;font-size:13px;text-transform:uppercase;letter-spacing:.08em}.compare-row b{font-size:13px}.addon-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.addon-grid article{background:#fbf8f1;border:1px solid #cdc3b3;border-radius:12px;padding:24px;box-shadow:0 14px 36px rgba(16,17,20,.07)}.addon-grid h3{font-family:Outfit,Inter,sans-serif;font-size:24px;margin:0 0 8px}.addon-grid strong{font-size:26px}.addon-grid p,.addon-grid small{display:block;color:#5f6670;line-height:1.5}.pricing-final{display:flex;justify-content:space-between;align-items:center;gap:24px;background:#101114;color:#fbf8f1;margin:0 clamp(18px,4vw,64px) clamp(40px,6vw,80px);border-radius:14px;padding:clamp(28px,4vw,46px)}.pricing-final h2{font-size:clamp(34px,4.8vw,64px);color:#fbf8f1}.pricing-final p{color:rgba(251,248,241,.72);max-width:680px}@media(max-width:1100px){.pricing-hero,.pricing-grid{grid-template-columns:1fr 1fr}.price-card-main{transform:none}.addon-grid{grid-template-columns:1fr}.compare-row{grid-template-columns:1fr}.compare-row>*{border-bottom:1px solid #ded4c4}.pricing-final{display:block}.pricing-final>a{margin-top:18px}}@media(max-width:700px){.pricing-hero,.pricing-grid{grid-template-columns:1fr}.pricing-hero{background:linear-gradient(180deg,#101114 0%,#242830 58%,#e8e2d6 58%,#f3eee5 100%);padding-left:14px;padding-right:14px}.pricing-grid,.pricing-compare,.pricing-addons{padding-left:14px;padding-right:14px}.pricing-copy h1{font-size:48px}.pricing-final{margin-left:14px;margin-right:14px}}
      `}</style>
    </MarketingShell>
  );
}
