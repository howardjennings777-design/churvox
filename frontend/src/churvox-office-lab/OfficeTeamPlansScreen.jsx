import React, { useState } from "react";
import "./OfficeTeamPlansScreen.css";

const plans = [
  ["Start", "$39", "Solo or small service operator", ["Basic office queue", "Clients", "Work tracking", "Quotes and invoices"]],
  ["Crew", "$89", "Small team that needs staff updates", ["Everything in Start", "Team / workers", "Timers", "Daily run view"]],
  ["Operator", "$149", "Busy service business with office admin", ["Everything in Crew", "Command queue", "Office Team review", "Follow-ups and reminders"]],
  ["Command", "$299", "Full owner approval desk", ["Everything in Operator", "Advanced Command", "Accounting export/sync approval", "50 active team members"]],
];

export default function OfficeTeamPlansScreen() {
  const [selected, setSelected] = useState("Operator");
  const plan = plans.find(([name]) => name === selected) || plans[2];
  return (
    <section className="cvSiteScreen">
      <header className="cvSiteScreenHeader">
        <span>Plans</span>
        <h2>Pricing stays locked while the product is rebuilt</h2>
        <p>This screen keeps the owner app honest: no pricing changes hidden inside the rebuild.</p>
      </header>

      <div className="cvPlansGrid">
        {plans.map(([name, price, text, features]) => (
          <button key={name} className={selected === name ? "active" : ""} onClick={() => setSelected(name)}>
            <span>{name}</span>
            <strong>{price}<small>/month + GST</small></strong>
            <p>{text}</p>
            <ul>{features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
          </button>
        ))}
      </div>

      <aside className="cvPlanDetail">
        <span>Selected plan</span>
        <h3>{plan[0]}</h3>
        <strong>{plan[1]}/month + GST</strong>
        <p>{plan[2]}</p>
        <small>Command Growth Pack remains $99/month + GST for extra capacity.</small>
      </aside>
    </section>
  );
}
