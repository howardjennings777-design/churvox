import { useState } from "react";
import { apiFetch, saveOperatorDraft } from "../api";
import { PLAN_TIERS, SMS_PACKS } from "../dataHooks";

function StatusPill({ children, tone = "info" }) {
  return <span className={`op-clean-pill ${tone}`}>{children}</span>;
}

function SummaryCard({ label, value, note, tone }) {
  return (
    <article className="op-clean-summary-card">
      <small>{label}</small>
      <strong>{value}</strong>
      <StatusPill tone={tone}>{note}</StatusPill>
    </article>
  );
}

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
    <main className="op-workspace op-clean-system-page">
      <section className="op-clean-hero">
        <div>
          <p>SYSTEM CENTRE</p>
          <h1>Plans, billing and integrations.</h1>
          <span>
            Keep business setup calm and clear. Owner approval stays in control of plan changes,
            SMS credits, MYOB connection and user blocks.
          </span>
        </div>

        <aside>
          <small>Current setup</small>
          <strong>{currentPlan === "none" ? "No plan selected" : `${currentPlan.toUpperCase()} plan`}</strong>
          <span>{planStatus}</span>
        </aside>
      </section>

      {notice ? <section className="op-notice">{notice}</section> : null}
      {data.notice ? <section className="op-notice">{data.notice}</section> : null}

      <section className="op-clean-summary-grid">
        <SummaryCard
          label="Current plan"
          value={currentPlan === "none" ? "No plan" : currentPlan.toUpperCase()}
          note={planStatus}
          tone={currentPlan === "none" ? "warn" : "good"}
        />
        <SummaryCard
          label="SMS credits"
          value={smsBalance}
          note={smsBalance <= 10 ? "Low balance" : "Ready"}
          tone={smsBalance <= 10 ? "warn" : "good"}
        />
        <SummaryCard
          label="MYOB"
          value={myobConnected ? "Connected" : "Not connected"}
          note="Approval-first sync"
          tone={myobConnected ? "good" : "info"}
        />
        <SummaryCard
          label="Enterprise blocks"
          value="$100"
          note="per extra 50 users"
          tone="info"
        />
      </section>

      <section className="op-clean-panel">
        <header>
          <div>
            <p>PLANS</p>
            <h2>Choose the right operating level.</h2>
            <span>Simple plan cards. Clear limits. No confusing dark table layout.</span>
          </div>
        </header>

        <div className="op-clean-plan-grid">
          {PLAN_TIERS.map((plan) => {
            const active = currentPlan === plan.id;

            return (
              <article key={plan.id} className={active ? "active" : ""}>
                <div className="op-plan-top">
                  <p>{plan.name}</p>
                  {active ? <StatusPill tone="good">Current</StatusPill> : null}
                </div>

                <h3>${plan.price}<small>/mo</small></h3>

                <ul>
                  <li>Up to {plan.clients} clients</li>
                  <li>Up to {plan.users} users</li>
                  <li>{plan.myob}</li>
                  <li>{plan.blocks}</li>
                </ul>

                <button type="button" disabled={active} onClick={() => choosePlan(plan)}>
                  {active ? "Current plan" : `Choose ${plan.name}`}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="op-clean-two-grid">
        <article className="op-clean-panel">
          <header>
            <div>
              <p>SMS CREDITS</p>
              <h2>{smsBalance} credits</h2>
              <span>Buy packs only when the owner approves.</span>
            </div>
          </header>

          <div className="op-clean-pack-grid">
            {SMS_PACKS.map((pack) => (
              <button key={pack.id} type="button" onClick={() => buySmsPack(pack)}>
                <strong>{pack.credits}</strong>
                <span>SMS credits</span>
                <b>${pack.price}</b>
              </button>
            ))}
          </div>
        </article>

        <article className="op-clean-panel">
          <header>
            <div>
              <p>MYOB</p>
              <h2>{myobConnected ? "Connected" : "Not connected"}</h2>
              <span>Accounting sync stays approval-first.</span>
            </div>
          </header>

          <div className="op-clean-info-card">
            <strong>Plan rule</strong>
            <span>Solo and Team do not include MYOB. Pro can use MYOB as an optional add-on. Enterprise includes MYOB by default.</span>
          </div>

          <button type="button" onClick={reviewMyob}>
            {myobConnected ? "Review MYOB sync" : "Review connection setup"}
          </button>
        </article>
      </section>

      <section className="op-clean-panel">
        <header>
          <div>
            <p>OWNER GUARDRAILS</p>
            <h2>AI can prepare, but not spend or sync without approval.</h2>
          </div>
        </header>

        <div className="op-clean-guard-grid">
          <span>AI cannot change plan</span>
          <span>AI cannot buy SMS credits</span>
          <span>AI cannot sync MYOB changes</span>
          <span>AI cannot charge customers</span>
          <span>Owner approval required</span>
        </div>
      </section>
    </main>
  );
}
