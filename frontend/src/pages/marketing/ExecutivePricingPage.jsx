import React from "react";
import { Link } from "react-router-dom";
import { CHURVOX_PLANS, COUNTRY_OPTIONS, addonPriceForCountry, detectCountryCode, getCountryMeta, pricePlanForCountry, pricingNotesForCountry, normalizeCountry } from "../../config/churvoxPlans";
import { PublicNav, PublicFooter } from "./ChurvoxPublicShell";
import "./ChurvoxPremiumScenes.css";

function cleanFeature(item) { return String(item || "").replace(/AI Operator Actions/gi, "prepared admin actions").replace(/AI Operator/gi, "prepared admin").replace(/Customer Follow-Up Brain/gi, "customer follow-up tools"); }
function featuresFor(plan) { const list = plan.features || plan.includes || []; return Array.isArray(list) ? list.slice(0, 8).map(cleanFeature) : []; }
function signupPath(country, plan) { return `/signup?${new URLSearchParams({ country, plan: String(plan?.code || plan?.key || plan?.name || "").toLowerCase() })}`; }

export default function ExecutivePricingPage() {
  const [country, setCountry] = React.useState(() => { try { const params = new URLSearchParams(window.location.search || ""); return normalizeCountry(params.get("country") || detectCountryCode()); } catch { return detectCountryCode(); } });
  const [selected, setSelected] = React.useState(2);
  React.useEffect(() => { try { window.localStorage.setItem("churvox:billing-country", country); } catch {} }, [country]);
  const meta = getCountryMeta(country);
  const plans = React.useMemo(() => CHURVOX_PLANS.map((plan) => pricePlanForCountry(plan, country)), [country]);
  const plan = plans[selected] || plans[2] || plans[0];
  const accounting = addonPriceForCountry("accounting_sync", country);
  const growth = addonPriceForCountry("growth_pack", country);
  const notes = pricingNotesForCountry(country);

  return <main className="cp26Site cpWorld cvPremiumPage" data-room="pricing" data-version="CHURVOX_PLAIN_PRICING_20260726"><PublicNav active="/pricing" />
    <section className="cvSceneHero"><div className="cvSceneHeroCopy"><span className="cvSceneKicker">Pricing</span><h1>Choose the plan that fits <em>how your business works.</em></h1><p>Start with the level you need now. Move up only when more workers, approvals or accounting capacity become useful.</p><div className="cvSceneActions"><Link className="cp26Button" to="/signup?plan=operator">Start 14-day trial</Link><Link className="cp26Button cp26ButtonGhost" to="/demo">View demo</Link></div><div className="cvSceneFacts"><span>14 days</span><span>No card upfront</span><span>Published prices stay visible</span></div></div><aside className="cpPriceSwitchboard"><header><span>Recommended plan</span><b>Owner control on</b></header><div className="cpPressureGauge"><div><small>balanced choice</small><b>03</b><span>Operator</span></div></div><div className="cpSwitchRows"><div><span>Prepared admin</span><b>High</b></div><div><span>Worker coordination</span><b>Connected</b></div><div><span>Owner approvals</span><b>Command</b></div><div><span>Silent sends</span><b>0</b></div></div></aside></section>

    <section className="cvPlanStage"><div className="cvPlanToolbar"><div className="cvSceneIntro"><small>Plans</small><h2>Four levels. Same owner-control model.</h2><p>Showing {meta.currency} pricing for {meta.label}. {notes.join(" ")}</p></div><label className="cvPlanRegion"><b>Pricing region</b><select value={country} onChange={(event) => setCountry(normalizeCountry(event.target.value))}>{COUNTRY_OPTIONS.map((item) => <option key={item.code} value={item.code}>{item.label} · {item.currency}</option>)}</select></label></div>
      <div className="cvPlanConsole"><div className="cvPlanRail"><small>Select a plan</small>{plans.map((item, index) => <button type="button" key={item.name} className={selected === index ? "active" : ""} onClick={() => setSelected(index)}><b>{item.name}</b><span>0{index + 1}</span></button>)}</div><article className="cvPlanDetail" data-index={`0${selected + 1}`} data-plan-card data-plan-name={plan.name}><small>{String(plan.name).toLowerCase() === "operator" ? "Most popular" : "Churvox plan"}</small><h2>{plan.name}</h2><div className="cvPlanPrice">{plan.priceLabel}</div><div className="cvPlanTax">{plan.taxInclusiveLabel || " "}</div><p className="cvPlanSummary">{cleanFeature(plan.summary)}</p><ul className="cvPlanFeatures">{featuresFor(plan).map((feature) => <li key={feature}>{feature}</li>)}</ul><div className="cvPlanBottom"><Link className="cp26Button" to={signupPath(country, plan)} onClick={() => { try { window.localStorage.setItem("churvox:billing-plan", String(plan?.code || plan?.key || plan?.name || "operator").toLowerCase()); } catch {} }}>Start free trial</Link><p>Final monthly amount is shown in Stripe Checkout. No card is required to begin the 14-day trial.</p></div></article></div>
      <div className="cvAddonRails"><article className="cvAddonRail" data-plan-card data-plan-name="Command Growth Pack"><span>01</span><div><h3>Command Growth Pack</h3><p>Extra active-team capacity and additional Command capacity.</p></div><b>{growth.priceLabel}</b></article><article className="cvAddonRail" data-plan-card data-plan-name="Accounting Sync Add-on"><span>02</span><div><h3>Accounting Sync Add-on</h3><p>Optional owner-controlled draft invoice sync where available.</p></div><b>{accounting.priceLabel}</b></article><article className="cvAddonRail"><span>03</span><div><h3>Human help</h3><p>Email the team size and the admin problem that hurts most. No sales call required.</p></div><b>hello@churvox.com</b></article></div>
    </section>

    <section className="cvSceneClose"><div><small>Try it with real work</small><h2>Start with one workday.</h2><p>Use one job, one worker update and one owner decision to see whether Churvox removes admin.</p></div><div><Link className="cp26Button" to={signupPath(country, { code: "operator" })}>Start free trial</Link><Link className="cp26Button cp26ButtonGhost" to="/demo">View demo</Link></div></section><PublicFooter /></main>;
}
