
import "./PublicPricingPage.css";
const plans = [
  ["Solo", "$39", "One-person operators", ["Jobs, clients, quotes and invoices", "Basic Smart Hub", "Basic AI suggestions", "Self job tracking", "No MYOB"]],
  ["Team", "$89", "Small crews", ["Worker app and dispatch", "Job assignment", "Photos, notes and completion proof", "Basic AI Work Queue", "SMS credits separate"]],
  ["Pro", "$159", "Growing trade businesses", ["Full AI Operator", "AI approval queue", "Worker match suggestions", "Draft invoice prep", "Quote follow-up prep", "Payroll handoff", "MYOB add-on $39/mo"]],
  ["Enterprise", "$299", "Larger teams", ["Full AI Operator + higher limits", "Advanced roles and payroll workspace", "MYOB included", "Priority setup support", "Advanced proof and reporting"]],
];
export default function PublicPricingPage() {
  return (
    <main className="pricepub">
      <header><a href="/" className="pricepub-brand"><img src="/brand/churvox-holo-c.svg" alt="" /><strong>CHURVOX</strong></a><nav><a href="/">Home</a><a href="/demo">Try live demo</a><a href="/signup">Start trial</a><a href="/login">Sign in</a></nav></header>
      <section className="pricepub-hero"><p>CHURVOX PRICING</p><h1>Pricing built around the AI Operator engine.</h1><span>Churvox is not just job management. It prepares admin, dispatch decisions, invoice actions and follow-ups for owner approval.</span><div><a href="/signup">Start free trial</a><a href="/demo">Try live demo</a></div></section>
      <section className="pricepub-grid">{plans.map(([name, price, caption, features]) => <article key={name} className={name === "Pro" ? "hot" : ""}><small>{name === "Pro" ? "MOST POPULAR" : name === "Enterprise" ? "MYOB INCLUDED" : "CHURVOX"}</small><h2>{name}</h2><p>{caption}</p><strong>{price}<span>/month NZD</span></strong><a href={name === "Enterprise" ? "/contact" : "/signup"}>{name === "Enterprise" ? "Email us" : "Start trial"}</a><ul>{features.map((feature) => <li key={feature}>{feature}</li>)}</ul></article>)}</section>
      <section className="pricepub-extra"><article><p>MYOB</p><h2>MYOB is treated as a high-value workflow.</h2><span>Solo and Team do not include MYOB. Pro can add MYOB for $39/month. Enterprise includes MYOB by default.</span></article><article><p>SMS CREDITS</p><h2>SMS stays separate so costs stay controlled.</h2><div><span>100 credits <b>$10</b></span><span>500 credits <b>$45</b></span><span>1000 credits <b>$80</b></span></div></article></section>
      <section className="pricepub-offer"><p>FOUNDING CUSTOMER OFFER</p><h2>First 3 months 30% off.</h2><span>Early customers get a launch offer without permanently making Churvox feel cheap.</span></section>
    </main>
  );
}
