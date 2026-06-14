import React from "react";
import { useApi } from "../hooks/useApi";
import "./freshPlans.css";

const PLAN_REQUIRED_KEY = "churvox_plan_choice_required";
const FIRST_SETUP_KEY = "churvox_first_setup_pending";

const regions = {
  NZ: { label: "New Zealand", short: "NZ", currency: "NZD", prefix: "$", tax: "+ GST", taxRate: 0.15, taxIncluded: "incl. GST" },
  AU: { label: "Australia", short: "AU", currency: "AUD", prefix: "A$", tax: "+ GST", taxRate: 0.1, taxIncluded: "incl. GST" },
  US: { label: "United States", short: "US", currency: "USD", prefix: "US$", tax: "+ tax", taxRate: 0, taxIncluded: "tax may apply" },
  UK: { label: "United Kingdom", short: "UK", currency: "GBP", prefix: "£", tax: "+ VAT", taxRate: 0.2, taxIncluded: "incl. VAT" },
};

const plans = [
  { id: "start", backendPlan: "solo", name: "Start", prices: { NZ: 39, AU: 39, US: 29, UK: 25 }, best: false, headline: "Get organised", summary: "For a solo operator who needs jobs, clients, quotes and invoices under control.", limit: "Best for one owner", features: ["Jobs, clients, quotes and invoices", "Smart Hub basics", "Business settings", "Accounting Sync Add-on available", "14-day trial"] },
  { id: "crew", backendPlan: "team", name: "Crew", prices: { NZ: 89, AU: 89, US: 69, UK: 59 }, best: false, headline: "Run the crew", summary: "For a business with workers, daily dispatch, job handover and more client admin.", limit: "Up to 5 workers", features: ["Everything in Start", "Team and worker setup", "Dispatch-ready workflow", "More job and client capacity", "Accounting Sync Add-on available"] },
  { id: "operator", backendPlan: "pro", name: "Operator", prices: { NZ: 149, AU: 149, US: 119, UK: 99 }, best: true, headline: "Admin done for approval", summary: "Where Churvox starts preparing the admin and you approve the work before it goes out.", limit: "Recommended plan", features: ["AI Operator Actions", "Command approval desk", "Quote follow-up watch", "Invoice and job admin prepared for approval", "Accounting Sync Add-on available"] },
  { id: "command", backendPlan: "enterprise", name: "Command", prices: { NZ: 299, AU: 299, US: 239, UK: 199 }, best: false, headline: "Scale with control", summary: "For the bigger business that wants payroll workspace, one accounting sync option and advanced control.", limit: "Up to 50 active team members", features: ["Everything in Operator", "Accounting sync included: Xero or MYOB", "Payroll workspace", "Advanced roles", "Priority support", "Command Growth Pack available"] },
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
  const { get, post, patch } = useApi();
  const [currentPlan, setCurrentPlan] = React.useState("none");
  const [selectedPlan, setSelectedPlan] = React.useState("operator");
  const [selectedRegion, setSelectedRegion] = React.useState("NZ");
  const [growthPacks, setGrowthPacks] = React.useState(0);
  const [includeAccountingSync, setIncludeAccountingSync] = React.useState(false);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [chooseLoading, setChooseLoading] = React.useState(false);
  const [mustChoose, setMustChoose] = React.useState(planRequired);
  const [error, setError] = React.useState("");

  const selected = planByUiId(selectedPlan);
  const region = regions[selectedRegion] || regions.NZ;
  const commandSelected = selected.id === "command";
  const accountingPrice = Number(accountingSyncPrices[selectedRegion] ?? accountingSyncPrices.NZ);
  const growthPrice = Number(growthPackPrices[selectedRegion] ?? growthPackPrices.NZ);
  const monthlyTotal = price(selected, selectedRegion) + (commandSelected ? growthPacks * growthPrice : 0) + (!commandSelected && includeAccountingSync ? accountingPrice : 0);

  const loadPlan = React.useCallback(async () => { setError(""); try { const status = unwrap(await get("/billing/subscription-status")); setCurrentPlan(uiPlanFromBackend(status?.plan)); } catch { setError("We could not load your current plan. Choose a plan to continue."); } }, [get]);
  React.useEffect(() => { loadPlan(); }, [loadPlan]);

  function choosePlan(planId) { setSelectedPlan(planId); if (planId !== "command") setGrowthPacks(0); if (planId === "command") setIncludeAccountingSync(false); setError(""); }

  async function confirmPlanChoice() {
    setChooseLoading(true); setError("");
    try {
      const res = await patch("/user/plan", { plan: selected.backendPlan });
      if (res?.success === false) throw new Error(res.error || "Could not choose this plan.");
      try { window.localStorage.removeItem(PLAN_REQUIRED_KEY); window.localStorage.setItem(FIRST_SETUP_KEY, "true"); window.dispatchEvent(new Event("churvox-auth-refresh")); } catch {}
      setCurrentPlan(selected.id); setMustChoose(false); onNavigate?.("setupassistant"); if (!onNavigate) window.location.href = "/guide?first_setup=1";
    } catch (err) { setError(err?.message || "Could not choose this plan. Please try again."); }
    finally { setChooseLoading(false); }
  }

  async function startCheckout() { setCheckoutLoading(true); setError(""); try { const response = unwrap(await post("/billing/create-checkout-session", { plan: selected.backendPlan, country: selectedRegion })); const checkoutUrl = response?.url || response?.checkout_url; if (!checkoutUrl) throw new Error("Checkout could not start. Please contact support."); window.location.href = checkoutUrl; } catch (err) { setError(err?.message || "Checkout could not start. Please contact support and we will help you activate the plan."); } finally { setCheckoutLoading(false); } }

  const currentPlanLabel = currentPlan === "none" ? "Choose a plan" : planByUiId(currentPlan).name;

  return (
    <section className="freshPricingPage">
      <header className="freshPricingHero"><div><span>{mustChoose ? "Plan required" : "Churvox pricing"}</span><h1>{mustChoose ? "Choose a plan before you enter Churvox." : "Pick the plan that fits how much admin you want Churvox to handle."}</h1><p>Your chosen plan controls what you can use: Start, Crew, Operator or Command.</p><div className="freshPricingHeroActions"><button className="freshPrimary" type="button" onClick={confirmPlanChoice} disabled={chooseLoading}>{chooseLoading ? "Choosing plan..." : `Choose ${selected.name} and continue`}</button><button className="freshGhost" type="button" onClick={() => choosePlan("operator")}>Recommend Operator</button></div></div><aside><small>Selected region</small><strong>{region.currency}</strong><p>{region.label} · checkout confirms the final total.</p></aside></header>
      <section className="freshPlanNotice proper"><b>{mustChoose ? "Choose a plan to continue" : "Launch pricing"}</b><span>{mustChoose ? "Pick the plan you want to use first. You can change plans later." : "Prices are monthly and shown before GST/tax. Checkout confirms the final amount before you pay."}</span></section>
      <section className="freshRegionPicker freshCard"><div><b>Choose pricing region</b><span>Checkout will use this region.</span></div><div className="freshRegionButtons">{Object.entries(regions).map(([code, item]) => <button key={code} type="button" className={selectedRegion === code ? "active" : ""} onClick={() => setSelectedRegion(code)}><b>{item.short}</b><span>{item.currency}</span></button>)}</div></section>
      {error ? <section className="freshCard freshNotice need"><b>Plans need attention</b><span>{error}</span></section> : null}
      <section className="freshPricingCards">{plans.map((plan) => { const displayPrice = price(plan, selectedRegion); return <button type="button" key={plan.id} className={`freshPricingCard ${selectedPlan === plan.id ? "active" : ""} ${plan.best ? "best" : ""}`} onClick={() => choosePlan(plan.id)}>{currentPlan === plan.id ? <span className="freshCurrentBadge">Current</span> : null}<strong>{plan.name}</strong><em>{money(displayPrice, selectedRegion)}<small>/month {region.tax}</small></em><small className="freshPlanLimit">{inclusiveLabel(displayPrice, selectedRegion)}</small><h3>{plan.headline}</h3><p>{plan.summary}</p><small className="freshPlanLimit">{plan.limit}</small><ul>{plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul></button>; })}</section>
      <section className="freshPricingDetail"><section className="freshCard freshSelectedPlanCard"><div className="freshSelectedPlanTop"><div><span>Selected · {region.currency}</span><h2>{selected.name}</h2><p>{selected.summary}</p></div><strong>{money(monthlyTotal, selectedRegion)}<small>/month {region.tax}</small><small>{inclusiveLabel(monthlyTotal, selectedRegion)}</small></strong></div><div className="freshGrowthPack premium"><div><b>Accounting Sync Add-on</b><span>{commandSelected ? "Included with Command: choose Xero or MYOB." : `${money(accountingPrice, selectedRegion)}/month ${region.tax} · ${inclusiveLabel(accountingPrice, selectedRegion)} · Xero or MYOB sync where available.`}</span></div>{!commandSelected ? <div className="freshGrowthControls"><button type="button" onClick={() => setIncludeAccountingSync(false)} className={!includeAccountingSync ? "active" : ""}>No</button><button type="button" onClick={() => setIncludeAccountingSync(true)} className={includeAccountingSync ? "active" : ""}>Add</button></div> : null}</div>{commandSelected ? <div className="freshGrowthPack premium"><div><b>Command Growth Pack</b><span>{money(growthPrice, selectedRegion)}/month {region.tax} · adds 50 active team members plus extra job, AI action, automation and admin capacity.</span></div><div className="freshGrowthControls"><button type="button" onClick={() => setGrowthPacks((c) => Math.max(0, c - 1))}>−</button><strong>{growthPacks}</strong><button type="button" onClick={() => setGrowthPacks((c) => c + 1)}>+</button></div></div> : null}<div className="freshPlanFeatures premium">{selected.features.map((feature) => <div key={feature}><b>✓</b><span>{feature}</span></div>)}</div></section><aside className="freshCard freshCheckoutCard"><h2>{mustChoose ? "Choose plan" : "Checkout"}</h2><p>{mustChoose ? "Choose a plan to open the setup guide." : "Choose your plan, check the total, then start checkout when ready."}</p><div className="freshActions"><button className="freshDark" type="button" onClick={confirmPlanChoice} disabled={chooseLoading}>{chooseLoading ? "Choosing plan..." : `Choose ${selected.name}`}</button><button className="freshOrange" type="button" onClick={() => choosePlan("operator")}>Recommend Operator</button><button className="freshGhost" type="button" onClick={startCheckout} disabled={checkoutLoading}>{checkoutLoading ? "Starting checkout..." : "Start checkout"}</button><button className="freshGhost" type="button" onClick={loadPlan}>Refresh current plan</button></div><div className="freshItem"><b>Current plan</b><span>{currentPlanLabel}</span></div><div className="freshItem"><b>Best default</b><span>Operator is the main plan because AI runs the admin and the owner approves.</span></div><div className="freshItem"><b>Accounting sync</b><span>Start, Crew and Operator can add Xero or MYOB sync. Command includes one accounting sync option.</span></div></aside></section>
    </section>
  );
}
