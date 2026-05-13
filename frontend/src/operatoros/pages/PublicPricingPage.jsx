import "./PublicPricingPage.css";

const plans = [
  {
    name: "Solo",
    price: "$39",
    blurb: "One-person operators.",
    details: [
      "Jobs, clients, quotes and invoices",
      "Basic Smart Hub and AI suggestions",
      "Self job tracking",
      "No MYOB",
    ],
  },
  {
    name: "Team",
    price: "$89",
    blurb: "Small crews.",
    details: [
      "Worker app and dispatch",
      "Job photos and notes",
      "Proof-to-Paid basics",
      "Basic AI Work Queue",
      "SMS credits separate",
    ],
  },
  {
    name: "Pro",
    price: "$159",
    featured: true,
    blurb: "Most popular for growing operators.",
    details: [
      "Full AI Operator and approval queue",
      "Worker match suggestions",
      "Draft invoice and quote follow-up prep",
      "Payroll handoff and automation rules",
      "MYOB optional add-on ($39/month)",
    ],
  },
  {
    name: "Enterprise",
    price: "$299",
    blurb: "Larger teams.",
    details: [
      "Full AI Operator",
      "Advanced roles and payroll workspace",
      "Higher limits and advanced proof/reporting",
      "MYOB included",
      "Priority setup and support",
    ],
  },
];

const smsPacks = ["100 credits — $10", "500 credits — $45", "1000 credits — $80"];

export default function PublicPricingPage() {
  return (
    <main className="public-pricing-page">
      <header className="public-pricing-hero">
        <a href="/" className="pricing-brand"><img src="/brand/churvox-holo-c.svg" alt="" />CHURVOX</a>
        <h1>Premium plans for AI-led trade operations.</h1>
        <p>All plans are NZD monthly pricing. Founding customer offer: first 3 months are 30% off.</p>
      </header>

      <section className="pricing-grid">
        {plans.map((plan) => (
          <article key={plan.name} className={plan.featured ? "pricing-card featured" : "pricing-card"}>
            <h2>{plan.name}</h2>
            <p className="price">{plan.price}<span>/month NZD</span></p>
            <p className="blurb">{plan.blurb}</p>
            <ul>{plan.details.map((d) => <li key={d}>{d}</li>)}</ul>
            <div className="card-actions">
              <a href="/signup" className="btn-primary">Start trial</a>
              <a href="/demo" className="btn-ghost">Book demo</a>
            </div>
          </article>
        ))}
      </section>

      <section className="pricing-meta">
        <article>
          <h3>SMS credits</h3>
          <ul>{smsPacks.map((p) => <li key={p}>{p}</li>)}</ul>
        </article>
        <article>
          <h3>MYOB pathway</h3>
          <ul>
            <li>Solo: no MYOB</li><li>Team: no MYOB</li><li>Pro: MYOB add-on $39/month</li><li>Enterprise: MYOB included</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
