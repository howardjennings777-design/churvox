import { useState } from "react";
import { apiFetch, saveOperatorDraft } from "../api";
import { PLAN_TIERS, SMS_PACKS } from "../dataHooks";

export default function SystemCentre({ data }) {
  const currentPlan = String(data.currentPlan || "none").toLowerCase();
  const planStatus = data.planStatus || "not selected";
  const smsBalance = Number(data.smsBalance || 0);
  const myobConnected = Boolean(data.myobConnected);
  const [notice, setNotice] = useState("");

  async function choosePlan(plan) {
    setNotice("");
    try {
      const payload = await apiFetch("/stripe/create-checkout-session", {
        method: "POST",
        body: { plan: plan.id, plan_id: plan.id },
      });

      const url = payload?.url || payload?.checkout_url || payload?.session_url;
      if (url) {
        window.location.href = url;
        return;
      }

      throw new Error("Checkout URL was not returned.");
    } catch (error) {
      saveOperatorDraft({
        type: "billing_plan_request",
        title: `Choose ${plan.name}`,
        fields: { plan: plan.id, price: plan.price },
        status: "owner_needs_billing_review",
        error: error.message,
      });
      setNotice(`Plan change saved for owner review. ${error.message || ""}`);
    }
  }

  async function buySmsPack(pack) {
    setNotice("");
    try {
      const payload = await apiFetch("/sms/buy-credits", {
        method: "POST",
        body: { pack_id: pack.id, credits: pack.credits, amount: pack.price },
      });
      setNotice(payload?.message || `${pack.credits} SMS credit purchase started.`);
      await data.reload?.();
    } catch (error) {
      saveOperatorDraft({
        type: "sms_credit_request",
        title: `Buy ${pack.credits} SMS credits`,
        fields: pack,
        status: "owner_needs_sms_review",
        error: error.message,
      });
      setNotice(`SMS purchase saved for owner review. ${error.message || ""}`);
    }
  }

  function reviewMyob() {
    saveOperatorDraft({
      type: "myob_connection_review",
      title: "Review MYOB connection",
      fields: { currentPlan, myobConnected },
      status: "owner_needs_myob_review",
    });
    setNotice("MYOB review saved. Churvox will not sync accounting changes without owner approval.");
  }

  return (
    <main className="op-workspace">
      <section className="op-workspace-head">
        <div>
          <p>SYSTEM CENTRE</p>
          <h1>Plans, billing, SMS, MYOB and user blocks.</h1>
          <span>One calm place for the business setup that keeps Churvox running.</span>
        </div>
      </section>

      {notice ? <section className="op-notice">{notice}</section> : null}
      {data.notice ? <section className="op-notice">{data.notice}</section> : null}

      <section className="op-system-summary">
        <article><small>Current plan</small><strong>{currentPlan === "none" ? "No plan" : currentPlan.toUpperCase()}</strong><span>{planStatus}</span></article>
        <article><small>SMS credits</small><strong>{smsBalance}</strong><span>{smsBalance <= 10 ? "Low balance" : "Ready"}</span></article>
        <article><small>MYOB</small><strong>{myobConnected ? "Connected" : "Not connected"}</strong><span>Approval-first sync</span></article>
        <article><small>Enterprise blocks</small><strong>$100</strong><span>per extra 50 users</span></article>
      </section>

      <section className="op-system-section">
        <header><div><p>PLANS</p><h2>Choose the right operating level.</h2></div></header>
        <div className="op-plan-grid">
          {PLAN_TIERS.map((plan) => (
            <article key={plan.id} className={currentPlan === plan.id ? "op-plan-card active" : "op-plan-card"}>
              <p>{plan.name}</p>
              <h3>${plan.price}<small>/mo</small></h3>
              <span>Up to {plan.clients} clients</span>
              <span>Up to {plan.users} users</span>
              <span>{plan.myob}</span>
              <span>{plan.blocks}</span>
              <button type="button" disabled={currentPlan === plan.id} onClick={() => choosePlan(plan)}>
                {currentPlan === plan.id ? "Current plan" : `Choose ${plan.name}`}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="op-two-grid">
        <article className="op-panel">
          <header><div><p>SMS CREDITS</p><h2>{smsBalance} credits</h2></div></header>
          <div className="op-pack-list">
            {SMS_PACKS.map((pack) => (
              <button key={pack.id} type="button" onClick={() => buySmsPack(pack)}>
                <strong>{pack.credits} credits</strong><span>${pack.price}</span>
              </button>
            ))}
          </div>
          <section className="op-warning-soft">
            SMS stays owner-controlled. AI can draft reminders, but sending/buying credits requires owner action.
          </section>
        </article>

        <article className="op-panel">
          <header><div><p>MYOB</p><h2>{myobConnected ? "Connected" : "Not connected"}</h2></div></header>
          <p>Solo and Team do not include MYOB. Pro can use MYOB as an optional add-on. Enterprise includes MYOB by default.</p>
          <section className="op-warning-soft">MYOB sync is approval-first. Churvox must not sync accounting changes without owner approval.</section>
          <footer>
            <button type="button" onClick={reviewMyob}>{myobConnected ? "Review MYOB sync" : "Review connection setup"}</button>
          </footer>
        </article>
      </section>

      <section className="op-panel">
        <header><div><p>BILLING GUARDRAILS</p><h2>Owner control stays protected.</h2></div></header>
        <div className="op-check-list">
          <button>AI cannot change plan</button>
          <button>AI cannot buy SMS credits</button>
          <button>AI cannot sync MYOB changes</button>
          <button>AI cannot charge customers</button>
          <button>Owner approval required</button>
        </div>
      </section>
    </main>
  );
}
