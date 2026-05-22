import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";

const plans = [
  ["Start", "$39", "For owner-operators getting work and admin under control.", ["Jobs, clients, quotes and invoices", "Basic AI Operator prep", "Up to launch starter limits"]],
  ["Crew", "$89", "For small crews needing field and office flow.", ["Team workflow", "Worker app basics", "More jobs and clients"]],
  ["Operator", "$149", "Most popular. AI prepares the admin so the owner approves.", ["AI Operator Actions", "Automation workflows", "MYOB add-on available +$39"]],
  ["Command", "$299", "For bigger teams that need the full operating desk.", ["MYOB included", "Payroll workspace", "Advanced roles and higher limits"]],
];

function Nav() {
  return (
    <header className="wh-public-nav">
      <Link to="/"><ChurvoxLogo /></Link>
      <nav className="wh-public-links">
        <Link to="/features">Features</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/login">Log in</Link>
      </nav>
      <Link to="/signup" className="px-btn px-btn--primary">Start free</Link>
    </header>
  );
}

export default function PricingPage() {
  return (
    <main className="wh-public-page">
      <Nav />
      <section className="wh-public-wrap">
        <article className="wh-public-card">
          <p className="px-hero__eyebrow">Workhorse pricing</p>
          <h1 className="wh-public-title">Pay for the admin machine that fits your crew.</h1>
          <p className="wh-public-sub">
            Churvox plans are built around AI Operator capacity, crew size, job volume and money-desk workflows. Prices exclude GST.
          </p>
        </article>

        <section className="wh-price-grid">
          {plans.map(([name, price, desc, items]) => (
            <article key={name} className={`wh-price-card ${name === "Operator" ? "is-main" : ""}`}>
              {name === "Operator" && <span className="wh-price-pill">Most popular</span>}
              <h2 className="wh-price-name">{name}</h2>
              <div className="wh-price">{price}<small>/month + GST</small></div>
              <p className="wh-public-sub" style={{ fontSize: 14 }}>{desc}</p>
              <div className="wh-price-list">
                {items.map((item) => <span key={item}>• {item}</span>)}
              </div>
              <Link to="/signup" className="px-btn px-btn--primary">Choose {name}</Link>
            </article>
          ))}
        </section>

        <section className="wh-public-card" style={{ marginTop: 16 }}>
          <p className="px-hero__eyebrow">Add-ons</p>
          <h2>Command Growth Pack: $99/month + GST</h2>
          <p className="wh-public-sub">
            Command includes up to 50 active team members. Each Growth Pack adds 50 more active team members, extra job capacity, AI Operator Actions, automation runs and admin/payroll capacity. SMS credits are separate.
          </p>
        </section>
      </section>
    </main>
  );
}
