import React, { useState } from "react";
import "./OfficeTeamPlansScreen.css";

const plans = [
  ["Start", "$39", "Solo or small service operator", ["Basic office queue", "Clients", "Work tracking", "Quotes and invoices"]],
  ["Crew", "$89", "Small team that needs staff updates", ["Everything in Start", "Team / workers", "Timers", "Daily run view"]],
  ["Operator", "$149", "Busy service business with office admin", ["Everything in Crew", "Command queue", "Office Team review", "Follow-ups and reminders"]],
  ["Command", "$299", "Full owner approval desk", ["Everything in Operator", "Advanced Command", "Accounting export/sync approval", "50 active team members"]],
];

const planNotes = {
  Start: "For one-person operators who need the basics tidy.",
  Crew: "For small teams who need staff updates and job visibility.",
  Operator: "Best fit for busy service businesses that need office admin help.",
  Command: "For owners who want the full approval desk and bigger team capacity.",
};

export default function OfficeTeamPlansScreen() {
  const ownerRoute = isOwnerRoute();
  const [selected, setSelected] = useState("Operator");
  const plan = plans.find(([name]) => name === selected) || plans[2];
  return (
    <section className="cvSiteScreen cvPlansScreen">
      <header className="cvPlansHero">
        <div>
          <span>Plans</span>
          <h2>{ownerRoute ? "Your Churvox plan options" : "Pricing is locked. The build is what changes."}</h2>
          <p>{ownerRoute ? "Compare the current plan tiers clearly before any billing step." : "This screen keeps the rebuild honest: the product can improve without quietly moving the price."}</p>
        </div>
        <aside>
          <strong>No hidden price changes</strong>
          <small>Monthly + GST · owner approval model · Command stays the approval desk</small>
        </aside>
      </header>

      <div className="cvPlansGrid">
        {plans.map(([name, price, text, features]) => (
          <button key={name} className={`${selected === name ? "active" : ""} ${name === "Operator" ? "featured" : ""}`} onClick={() => setSelected(name)} type="button">
            <em>{name === "Operator" ? "Most useful" : name === "Command" ? "Owner control" : "Plan"}</em>
            <span>{name}</span>
            <strong>{price}<small>/month + GST</small></strong>
            <p>{text}</p>
            <ul>{features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
          </button>
        ))}
      </div>

      <aside className="cvPlanDetail">
        <div>
          <span>Selected plan</span>
          <h3>{plan[0]}</h3>
          <strong>{plan[1]}/month + GST</strong>
          <p>{plan[2]}</p>
          <small>{planNotes[plan[0]]}</small>
        </div>
        <section>
          <b>What stays fixed</b>
          <ul>
            <li>Current pricing stays visible.</li>
            <li>No competitor copy is used.</li>
            <li>Command remains owner approval only.</li>
            <li>Command Growth Pack remains $99/month + GST for extra capacity.</li>
          </ul>
        </section>
      </aside>
    </section>
  );
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
