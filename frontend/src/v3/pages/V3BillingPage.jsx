import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, MessageSquare, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { get, post } from "../../lib/api";
import V3Shell from "../components/V3Shell";
import "../styles/v3.css";

const PLANS = [
  { id: "team", name: "Team", price: "$70", subtitle: "Small crew", points: ["Up to 5 workers", "Up to 30 clients", "SMS enabled", "No MYOB"] },
  { id: "pro", name: "Pro", price: "$110", subtitle: "Growing operation", points: ["Up to 20 workers", "Up to 40 clients", "MYOB add-on ready", "AI admin support"] },
  { id: "enterprise", name: "Enterprise", price: "$240", subtitle: "Large crew", points: ["Up to 50 workers", "Up to 50 clients", "MYOB included", "$100 extra 50-user blocks"] },
];

export default function V3BillingPage() {
  const [billing, setBilling] = useState(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  const currentPlan = String(billing?.plan || "solo").toLowerCase();
  const locked = !!billing?.billing_locked;

  const load = async () => {
    const result = await get("/billing/v3/status");
    if (result.ok) {
      setBilling(result.data?.billing || {});
    } else {
      setNotice(result.message || "Billing status could not load.");
    }
  };

  const confirmCheckout = async () => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (!sessionId || !window.location.search.includes("billing_success")) return;

    setBusy("confirm");
    const result = await post("/billing/v3/confirm-checkout", { session_id: sessionId });

    if (result.ok) {
      setBilling(result.data?.billing || {});
      setNotice(result.data?.message || "Checkout confirmed.");
      window.history.replaceState({}, document.title, window.location.pathname);
      window.dispatchEvent(new Event("churvox-auth-refresh"));
    } else {
      setNotice(result.message || "Checkout could not be confirmed yet.");
    }

    setBusy("");
  };

  useEffect(() => {
    load();
    confirmCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upgradePlan = async (plan) => {
    setBusy(plan);
    setNotice("");

    const result = await post("/billing/v3/upgrade-plan", { plan });

    if (result.ok && result.data?.checkout_url) {
      window.location.href = result.data.checkout_url;
      return;
    }

    setNotice(result.message || `Could not start ${plan} checkout.`);
    setBusy("");
  };

  const buySmsPack = async (pack) => {
    setBusy(`sms-${pack}`);
    const result = await post("/billing/v3/sms-pack", { pack });

    if (result.ok && result.data?.checkout_url) {
      window.location.href = result.data.checkout_url;
      return;
    }

    setNotice(result.message || "Could not start SMS checkout.");
    setBusy("");
  };

  const buyExtraBlock = async () => {
    setBusy("block");
    const result = await post("/billing/v3/extra-50-user-block", {});

    if (result.ok && result.data?.checkout_url) {
      window.location.href = result.data.checkout_url;
      return;
    }

    setNotice(result.message || "Could not start 50-user block checkout.");
    setBusy("");
  };

  const stats = useMemo(() => ([
    ["Current plan", currentPlan.toUpperCase(), "Active subscription"],
    ["Team used", billing?.team_count ?? 0, `${billing?.max_workers ?? "Plan"} allowed`],
    ["SMS credits", billing?.sms_credits ?? 0, billing?.sms_enabled ? "Enabled" : "Plan locked"],
    ["50-user blocks", billing?.extra_50_user_blocks ?? 0, billing?.can_buy_50_user_blocks ? "Enterprise enabled" : "Enterprise only"],
  ]), [billing, currentPlan]);

  return (
    <V3Shell>
      <main className="v3-workspace-detail">
        <section className="v3-workspace-hero">
          <div>
            <p className="v3-eyebrow">Billing</p>
            <h1>Plan upgrades that actually work.</h1>
            <p>Upgrade plans, manage SMS credits, and add Enterprise 50-user blocks through secure Stripe checkout.</p>
          </div>

          <div className="v3-workspace-actions">
            <button type="button" className="v3-primary-btn" onClick={load} disabled={!!busy}>
              <RefreshCw size={18} /> Refresh billing
            </button>
          </div>
        </section>

        {notice && <div className="v3-notice">{notice}</div>}

        <section className="v3-workspace-grid">
          {stats.map(([label, value, copy]) => (
            <button type="button" className="v3-workspace-card" key={label}>
              <CreditCard size={18} />
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{copy}</small>
            </button>
          ))}
        </section>

        <section className="v3-billing-grid">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            return (
              <article className={`v3-billing-plan ${isCurrent ? "current" : ""}`} key={plan.id}>
                <div className="v3-card-head">
                  <div>
                    <p>{plan.subtitle}</p>
                    <h2>{plan.name}</h2>
                    <span>{plan.price}/month NZD</span>
                  </div>
                  {isCurrent ? <CheckCircle2 size={24} /> : <CreditCard size={24} />}
                </div>

                <div className="v3-billing-points">
                  {plan.points.map((point) => (
                    <span key={point}><CheckCircle2 size={15} /> {point}</span>
                  ))}
                </div>

                <button
                  type="button"
                  className={isCurrent ? "v3-button secondary" : "v3-button dark"}
                  onClick={() => upgradePlan(plan.id)}
                  disabled={locked || isCurrent || !!busy}
                >
                  {busy === plan.id ? "Opening checkout…" : isCurrent ? "Current plan" : `Upgrade to ${plan.name}`}
                </button>
              </article>
            );
          })}
        </section>

        <section className="v3-billing-grid small">
          <article className="v3-billing-plan">
            <div className="v3-card-head">
              <div>
                <p>SMS credits</p>
                <h2>Buy message packs</h2>
                <span>Current credits: {billing?.sms_credits ?? 0}</span>
              </div>
              <MessageSquare size={24} />
            </div>

            <div className="v3-billing-actions">
              <button type="button" className="v3-button dark" onClick={() => buySmsPack("100")} disabled={locked || !!busy}>100 credits — $10</button>
              <button type="button" className="v3-button dark" onClick={() => buySmsPack("500")} disabled={locked || !!busy}>500 credits — $45</button>
              <button type="button" className="v3-button dark" onClick={() => buySmsPack("1000")} disabled={locked || !!busy}>1000 credits — $80</button>
            </div>
          </article>

          <article className="v3-billing-plan">
            <div className="v3-card-head">
              <div>
                <p>Enterprise add-on</p>
                <h2>50-user block</h2>
                <span>$100 per extra 50 users</span>
              </div>
              <Users size={24} />
            </div>

            <button
              type="button"
              className="v3-button dark"
              onClick={buyExtraBlock}
              disabled={locked || !!busy || !billing?.can_buy_50_user_blocks}
            >
              {billing?.can_buy_50_user_blocks ? "Add 50-user block" : "Enterprise only"}
            </button>
          </article>

          <article className="v3-billing-plan">
            <div className="v3-card-head">
              <div>
                <p>Security</p>
                <h2>Billing lock</h2>
                <span>{locked ? "This account cannot change billing." : "Owner/admin billing access active."}</span>
              </div>
              <ShieldCheck size={24} />
            </div>

            <p className="v3-billing-safe">
              Prices are enforced by the backend. Checkout sessions are verified before plan, SMS credit, or 50-user block changes save.
            </p>
          </article>
        </section>
      </main>
    </V3Shell>
  );
}
