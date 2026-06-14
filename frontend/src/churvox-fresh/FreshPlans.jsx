import React from "react";
import { useApi } from "../hooks/useApi";
import "./freshPlans.css";

const PLAN_REQUIRED_KEY = "churvox_plan_choice_required";
const regions = {
  NZ: { label: "New Zealand", short: "NZ", currency: "NZD", prefix: "$", tax: "+ GST", taxRate: 0.15, taxIncluded: "incl. GST" },
  AU: { label: "Australia", short: "AU", currency: "AUD", prefix: "A$", tax: "+ GST", taxRate: 0.1, taxIncluded: "incl. GST" },
  US: { label: "United States", short: "US", currency: "USD", prefix: "US$", tax: "+ tax", taxRate: 0, taxIncluded: "tax may apply" },
  UK: { label: "United Kingdom", short: "UK", currency: "GBP", prefix: "£", tax: "+ VAT", taxRate: 0.2, taxIncluded: "incl. VAT" },
};
const plans = [
  { id: "start", backendPlan: "solo", name: "Start", prices: { NZ: 39, AU: 39, US: 29, UK: 25 }, best: false, headline: "Get organised", summary: "For a solo operator who needs jobs, clients, quotes and invoices under control.", limit: "Best for one owner", features: ["Jobs, clients, quotes and invoices", "Smart Hub basics", "Business settings", "Xero Sync Add-on available", "14-day Stripe trial"] },
  { id: "crew", backendPlan: "team", name: "Crew", prices: { NZ: 89, AU: 89, US: 69, UK: 59 }, best: false, headline: "Run the crew", summary: "For a business with workers, daily dispatch, job handover and more client admin.", limit: "Up to 5 workers", features: ["Everything in Start", "Team and worker setup", "Dispatch-ready workflow", "More job and client capacity", "Xero Sync Add-on available"] },
  { id: "operator", backendPlan: "pro", name: "Operator", prices: { NZ: 149, AU: 149, US: 119, UK: 99 }, best: true, headline: "Admin done for approval", summary: "Where Churvox starts preparing the admin and you approve the work before it goes out.", limit: "Recommended plan", features: ["AI Operator Actions", "Command approval desk", "Quote follow-up watch", "Invoice and job admin prepared for approval", "Xero Sync Add-on available"] },
  { id: "command", backendPlan: "enterprise", name: "Command", prices: { NZ: 299, AU: 299, US: 239, UK: 199 }, best: false, headline: "Scale with control", summary: "For the bigger business that wants payroll workspace, Xero sync and advanced control.", limit: "Up to 50 active team members", features: ["Everything in Operator", "Xero sync included", "Payroll workspace", "Advanced roles", "Priority support", "Command Growth Pack available"] },
];
const growthPackPrices = { NZ: 99, AU: 99, US: 79, UK: 69 };
const accountingSyncPrices = { NZ: 39, AU: 39, US: 29, UK: 25 };
const backendToUiPlan = { solo: "start", team: "crew", pro: "operator", enterprise: "command", start: "start", crew: "crew", operator: "operator", command: "command", none: "none" };
function unwrap(result) { return result?.data ?? result; }
function planByUiId(id) { return plans.find((plan) => plan.id === id) || plans[2]; }
function uiPlanFromBackend(value) { return backendToUiPlan[String(value || "none").toLowerCase()] || "none"; }
function price(plan, region) { return Number(plan?.prices?.[region] ?? plan?.prices?.NZ ?? 0); }
function money(value, regionCode, decimals = 0) { const r = regions[regionCode] || regions.NZ; return `${r.prefix}${Number(value || 0).toFixed(decimals)}`; }
function inclusiveLabel(value, regionCode) { const r = regions[regionCode] || regions.NZ; if (!r.taxRate) return r.taxIncluded; return `${money(Number(value || 0) * (1 + r.taxRate), regionCode, 2)}/month ${r.taxIncluded}`; }
function planRequired() { try { const p = new URLSearchParams(window.location.search || ""); return p.get("must_choose_plan") === "1" || window.localStorage.getItem(PLAN_REQUIRED_KEY) === "true"; } catch { return false; } }
export default function FreshPlans({ onNavigate }) {
  const { get, post } = useApi();
  const [currentPlan, setCurrentPlan] = React.useState("none");
  const [selectedPlan, setSelectedPlan] = React.useState("operator");
  const [selectedRegion, setSelectedRegion] = React.useState("NZ");
  const [growthPacks, setGrowthPacks] = React.useState(0);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [mustChoose] = React.useState(planRequired);
  const [error, setError] = React.useState("");
  const selected = planByUiId(selectedPlan);
  const region = regions[selectedRegion] || regions.NZ;
  const commandSelected = selected.id === "command";
  const accountingPrice = Number(accountingSyncPrices[selectedRegion] ?? accountingSyncPrices.NZ);
  const growthPrice = Number(growthPackPrices[selectedRegion] ?? growthPackPrices.NZ);
  const monthlyTotal = price(selected, selectedRegion) + (commandSelected ? growthPacks * growthPrice : 0);
  const loadPlan = React.useCallback(async () => { setError(""); try { const status = unwrap(await get("/billing/subscription-status")); setCurrentPlan(uiPlanFromBackend(status?.plan)); } catch { setError("We could not load your current plan. Choose a plan to continue."); } }, [get]);
  React.useEffect(() => { loadPlan(); }, [loadPlan]);
  function choosePlan(planId) { setSelectedPlan(planId); if (planId !== "command") setGrowthPacks(0); setError(""); }
  async function startCheckout() { setCheckoutLoading(true); setError(""); try { const response = unwrap(await post("/billing/create-checkout-session", { plan: selected.backendPlan, country: selectedRegion })); const checkoutUrl = response?.url || response?.checkout_url; if (!checkoutUrl) throw new Error("Stripe checkout could not start. Please contact support."); window.location.href = checkoutUrl; } catch (err) { setError(err?.message || "Stripe checkout could not start. Please contact support."); } finally { setCheckoutLoading(false); } }
  const currentPlanLabel = currentPlan === "none" ? "Choose a plan" : planByUiId(currentPlan).name;
  return (
    <section className="freshPricingPage">
      <header className="freshPricingHero"><div><span>{mustChoose ? "Plan required" : "Churvox pricing"}</span><h1>{mustChoose ? "Choose a plan in Stripe before you enter Churvox." : "Pick the plan that fits how much admin you want Churvox to handle."}</h1><p>Your selected plan starts a 14-day Stripe trial with card details collected up front. Churvox only keeps access open after the trial when billing is active.</p><div className="freshPricingHeroActions"><button className="freshPrimary" type="button" onClick={startCheckout} disabled={checkoutLoading}>{checkoutLoading ? "Opening Stripe..." : `Start 14-day Stripe trial · ${selected.name}`}</button><button className="freshGhost" type="button" onClick={() => choosePlan("operator")}>Recommend Operator</button></div></div><aside><small>Selected region</small><strong>{region.currency}</strong><p>{region.label} · Stripe confirms the final total.</p></aside></header>
      <section className="freshPlanNotice proper"><b>{mustChoose ? "Stripe trial required" : "Launch pricing"}</b><span>{mustChoose ? "Choose Start, Crew, Operator or Command. Stripe collects card details before opening the trial." : "Prices are monthly and shown before GST/tax. Stripe confirms the final amount before you start."}</span></section>
      <section className="freshRegionPicker freshCard"><div><b>Choose pricing region</b><span>Stripe will use this region.</span></div><div className="freshRegionButtons">{Object.entries(regions).map(([code, item]) => <button key={code} type="button" className={selectedRegion === code ? "active" : ""} onClick={() => setSelectedRegion(code)}><b>{item.short}</b><span>{item.currency}</span></button>)}</div></section>
      {error ? <section className="freshCard freshNotice need"><b>Plans need attention</b><span>{error}</span></section> : null}
      <section className="freshPricingCards">{plans.map((plan) => { const displayPrice = price(plan, selectedRegion); return <button type="button" key={plan.id} className={`freshPricingCard ${selectedPlan === plan.id ? "active" : ""} ${plan.best ? "best" : ""}`} onClick={() => choosePlan(plan.id)}>{currentPlan === plan.id ? <span className="freshCurrentBadge">Current</span> : null}<strong>{plan.name}</strong><em>{money(displayPrice, selectedRegion)}<small>/month {region.tax}</small></em><small className="freshPlanLimit">{inclusiveLabel(displayPrice, selectedRegion)}</small><h3>{plan.headline}</h3><p>{plan.summary}</p><small className="freshPlanLimit">{plan.limit}</small><ul>{plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul></button>; })}</section>
      <section className="freshPricingDetail"><section className="freshCard freshSelectedPlanCard"><div className="freshSelectedPlanTop"><div><span>Selected · {region.currency}</span><h2>{selected.name}</h2><p>{selected.summary}</p></div><strong>{money(monthlyTotal, selectedRegion)}<small>/month {region.tax}</small><small>{inclusiveLabel(monthlyTotal, selectedRegion)}</small></strong></div><div className="freshGrowthPack premium"><div><b>Xero Sync Add-on</b><span>{commandSelected ? "Included with Command." : `${money(accountingPrice, selectedRegion)}/month ${region.tax} · available after plan activation where Xero sync is supported.`}</span></div></div>{commandSelected ? <div className="freshGrowthPack premium"><div><b>Command Growth Pack</b><span>{money(growthPrice, selectedRegion)}/month {region.tax} · adds 50 active team members plus extra job, AI action, automation and admin capacity.</span></div><div className="freshGrowthControls"><button type="button" onClick={() => setGrowthPacks((c) => Math.max(0, c - 1))}>−</button><strong>{growthPacks}</strong><button type="button" onClick={() => setGrowthPacks((c) => c + 1)}>+</button></div></div> : null}<div className="freshPlanFeatures premium">{selected.features.map((feature) => <div key={feature}><b>✓</b><span>{feature}</span></div>)}</div></section><aside className="freshCard freshCheckoutCard"><h2>{mustChoose ? "Start trial" : "Checkout"}</h2><p>{mustChoose ? "Stripe starts the 14-day trial after card details are confirmed and unlocks the setup guide." : "Choose your plan, check the total, then start checkout when ready."}</p><div className="freshActions"><button className="freshDark" type="button" onClick={startCheckout} disabled={checkoutLoading}>{checkoutLoading ? "Opening Stripe..." : `Start trial in Stripe · ${selected.name}`}</button><button className="freshOrange" type="button" onClick={() => choosePlan("operator")}>Recommend Operator</button><button className="freshGhost" type="button" onClick={loadPlan}>Refresh current plan</button></div><div className="freshItem"><b>Current plan</b><span>{currentPlanLabel}</span></div><div className="freshItem"><b>Trial rule</b><span>14 days are handled through Stripe. Card details are collected before the trial opens.</span></div><div className="freshItem"><b>Xero sync</b><span>Start, Crew and Operator can add Xero sync after activation. Command includes Xero sync.</span></div></aside></section>
    </section>
  );
}
