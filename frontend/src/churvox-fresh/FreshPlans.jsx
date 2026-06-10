import React from "react";

const plans = [
  {
    id: "start",
    name: "Start",
    price: "$39",
    tag: "For one-person operators",
    best: false,
    features: [
      "Jobs, clients, quotes and invoices",
      "Basic Command boxes",
      "14-day free trial",
      "No card required",
    ],
  },
  {
    id: "crew",
    name: "Crew",
    price: "$89",
    tag: "For small teams",
    best: false,
    features: [
      "Team and worker access",
      "Dispatch board",
      "More jobs and clients",
      "Basic payroll workspace",
    ],
  },
  {
    id: "operator",
    name: "Operator",
    price: "$149",
    tag: "Most Popular",
    best: true,
    features: [
      "AI Operator Actions",
      "Command approval desk",
      "Quotes, invoices and follow-ups",
      "Churvox does the admin. You approve.",
    ],
  },
  {
    id: "command",
    name: "Command",
    price: "$299",
    tag: "For growing businesses",
    best: false,
    features: [
      "Advanced Command",
      "MYOB included",
      "Payroll workspace",
      "Up to 50 active team members",
    ],
  },
];

const growth = [
  ["Command Growth Pack", "$99 / month + GST"],
  ["Adds", "50 more active team members"],
  ["Includes", "Extra job, AI action, automation and payroll capacity"],
  ["Billing rule", "Inactive/old staff do not count as billable active team members"],
];

export default function FreshPlans({ onNavigate }) {
  const [selected, setSelected] = React.useState("operator");
  const plan = plans.find((item) => item.id === selected) || plans[2];

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Plans</span>
        <h1>Plans</h1>
        <p>Simple pricing built around Command. Churvox does the admin. You approve.</p>
      </header>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Choose plan</h2>
          <p>14-day free trial. No card required.</p>

          {plans.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`freshItem ${item.best ? "need" : ""} ${selected === item.id ? "active" : ""}`}
              style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
              onClick={() => setSelected(item.id)}
            >
              <b>{item.name} · {item.price}</b>
              <span>{item.tag} · + GST</span>
            </button>
          ))}
        </aside>

        <section className="freshCard">
          <h2>{plan.name}</h2>

          <div className="freshTabs">
            <span className="active">Plan</span>
            <span>Limits</span>
            <span>Billing</span>
            <span>Upgrade</span>
          </div>

          <label className="freshField">
            <span>Monthly price</span>
            <input value={`${plan.price} / month + GST`} readOnly />
          </label>

          <label className="freshField">
            <span>Position</span>
            <input value={plan.tag} readOnly />
          </label>

          <label className="freshField">
            <span>Trial</span>
            <input value="14-day free trial · no card required" readOnly />
          </label>

          <label className="freshField">
            <span>Main promise</span>
            <textarea value="Churvox does the admin. You approve." readOnly />
          </label>

          {plan.features.map((feature) => (
            <div className="freshItem" key={feature}>
              <b>{feature}</b>
              <span>Included in {plan.name}</span>
            </div>
          ))}
        </section>

        <aside className="freshCard">
          <h2>Owner actions</h2>
          <p>Plans should feel clear, not confusing.</p>

          <div className="freshActions">
            <button className="freshPrimary">Start trial</button>
            <button className="freshOrange">Choose {plan.name}</button>
            <button className="freshDark">Compare plans</button>
            <button className="freshGhost" onClick={() => onNavigate?.("support")}>Ask support</button>
          </div>

          <div className="freshItem need">
            <b>Recommended</b>
            <span>Operator is the main plan where AI runs the admin.</span>
          </div>
        </aside>
      </section>

      <section className="freshGrid two" style={{ marginTop: 14 }}>
        <section className="freshCard">
          <h2>Command Growth Pack</h2>
          {growth.map(([name, detail]) => (
            <div className="freshItem" key={name}>
              <b>{name}</b>
              <span>{detail}</span>
            </div>
          ))}
        </section>

        <aside className="freshCard">
          <h2>Pricing rules</h2>
          <div className="freshItem">
            <b>All prices + GST</b>
            <span>Keep this clear across the site.</span>
          </div>
          <div className="freshItem">
            <b>No done-for-you add-on</b>
            <span>Do not advertise that for now.</span>
          </div>
          <div className="freshItem need">
            <b>Command includes MYOB</b>
            <span>Operator can have sync as an add-on later.</span>
          </div>
        </aside>
      </section>
    </section>
  );
}
