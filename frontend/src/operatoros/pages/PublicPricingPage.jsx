import "./PublicSite.css";

const plans = [
  ["Solo", "$39/mo", "Core jobs, clients, quotes and invoices."],
  ["Team", "$89/mo", "Crew workflow and worker proof updates."],
  ["Pro", "$159/mo", "AI Operator, approval queue and proof-to-paid."],
  ["Enterprise", "$299/mo", "Advanced roles, higher limits and priority setup."],
];

function Nav() {
  return (
    <header className="cvx-nav">
      <a className="cvx-brand" href="/"><span><img src="/brand/churvox-holo-c.svg" alt="" /></span><div><strong>CHURVOX</strong><small>OPERATOR OS</small></div></a>
      <nav><a href="/">Home</a><a href="/features">Features</a><a href="/pricing">Pricing</a><a href="/demo">Try live demo</a><a href="/contact">Email us</a><a href="/login">Sign in</a></nav>
    </header>
  );
}

export default function PublicPricingPage() {
  return (
    <main className="cvx-site">
      <Nav />
      <section className="cvx-page-hero"><p className="cvx-kicker">PRICING</p><h1>Pricing built around your AI Operator.</h1><p>Simple plans for trade and service businesses that want AI-prepared admin with owner approval.</p></section>
      <section className="cvx-price-grid cvx-price-page">
        {plans.map(([name, price, body]) => <article key={name} className={name === "Pro" ? "featured" : ""}><strong>{name}</strong><b>{price}</b><span>{body}</span><a className="cvx-primary" href={name === "Enterprise" ? "/contact" : "/signup"}>{name === "Enterprise" ? "Email us" : "Start free trial"}</a></article>)}
      </section>
    </main>
  );
}
