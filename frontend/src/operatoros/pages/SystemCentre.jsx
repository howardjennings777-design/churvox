import { PLAN_TIERS, SMS_PACKS } from "../dataHooks";

export default function SystemCentre({ data }) {
  const currentPlan = String(data.currentPlan || "none").toLowerCase();
  const planStatus = data.planStatus || "not selected";
  const smsBalance = Number(data.smsBalance || 0);
  const myobConnected = Boolean(data.myobConnected);

  return (
    <main className="op-workspace">
      <section className="op-workspace-head">
        <div>
          <p>SYSTEM CENTRE</p>
          <h1>Plans, billing, SMS, MYOB and user blocks.</h1>
          <span>One calm place for the business setup that keeps Churvox running.</span>
        </div>
      </section>

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
              <button type="button">{currentPlan === plan.id ? "Current plan" : `Choose ${plan.name}`}</button>
            </article>
          ))}
        </div>
      </section>

      <section className="op-two-grid">
        <article className="op-panel">
          <header><div><p>SMS CREDITS</p><h2>{smsBalance} credits</h2></div></header>
          <div className="op-pack-list">
            {SMS_PACKS.map((pack) => (
              <button key={pack.id} type="button"><strong>{pack.credits} credits</strong><span>${pack.price}</span></button>
            ))}
          </div>
          {smsBalance <= 10 ? <section className="op-warning-soft">SMS credits are low. Churvox can still draft reminders, but sending will need credits.</section> : null}
        </article>

        <article className="op-panel">
          <header><div><p>MYOB</p><h2>{myobConnected ? "Connected" : "Not connected"}</h2></div></header>
          <p>Solo and Team do not include MYOB. Pro can use MYOB as an optional add-on. Enterprise includes MYOB by default.</p>
          <section className="op-warning-soft">MYOB sync is approval-first. Churvox must not sync accounting changes without owner approval.</section>
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
