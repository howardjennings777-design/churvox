import "./PublicSite.css";

const features = ["Smart Hub", "AI Work Queue", "Jobs + dispatch", "Worker proof photos", "Quotes", "Invoices", "Proof-to-paid", "Payroll handoff", "Client history", "CSV import"];
const trades = ["Lawn care", "Property maintenance", "Cleaning", "Landscaping", "Handyman", "Painting", "Plumbing", "Electrical", "Pest control", "Gardening"];
const steps = [["01", "AI watches the business", "Jobs, workers, clients, quotes, invoices, proof photos and follow-ups stay visible."], ["02", "AI prepares the admin", "Dispatch, invoice drafts, reminders and proof review are prepared for approval."], ["03", "Owner approves", "Nothing important is assigned, sent, charged, deleted or synced without approval."]];

function Nav() {
  return <header className="cvx-nav"><a className="cvx-brand" href="/"><span><img src="/brand/churvox-holo-c.svg" alt="" /></span><div><strong>CHURVOX</strong><small>OPERATOR OS</small></div></a><nav><a href="/">Home</a><a href="/how-it-works">How it works</a><a href="/features">Features</a><a href="/pricing">Pricing</a><a href="/demo">Try live demo</a><a href="/contact">Email us</a><a href="/login">Sign in</a></nav></header>;
}

export default function PublicLandingPage() {
  return (
    <main className="cvx-site">
      <Nav />
      <section className="cvx-hero">
        <div>
          <p className="cvx-kicker">PREMIUM TRADE INTELLIGENCE</p>
          <h1>AI prepares the admin.<span>You approve the work.</span></h1>
          <p className="cvx-lede">Churvox gives trade and service owners one calm command centre for jobs, crew, clients, quotes, invoices, proof photos and follow-ups. The AI finds what needs doing, prepares the next move, and waits for owner approval.</p>
          <div className="cvx-actions"><a className="cvx-primary" href="/signup">Start free trial</a><a className="cvx-secondary" href="/demo">Try live demo</a></div>
          <div className="cvx-proofbar"><span>Approval-first AI</span><span>Built for mobile crews</span><span>No auto-send without approval</span></div>
        </div>
        <aside className="cvx-operator">
          <div className="cvx-orb-stage"><div className="cvx-radar" /><div className="cvx-orb"><img src="/brand/churvox-holo-c.svg" alt="Churvox" /></div></div>
          <section className="cvx-live-card"><small>LIVE AI OPERATOR</small><h2>Your next business moves are ready.</h2><p>No digging through messages, worker notes, invoices or proof updates.</p></section>
          <div className="cvx-metrics"><article><strong>3</strong><span>jobs need crew</span></article><article><strong>5</strong><span>invoice actions</span></article><article><strong>2</strong><span>follow-ups ready</span></article></div>
          <section className="cvx-nextmove"><small>NEXT BEST MOVE</small><h3>Assign Sam to 14 King Street</h3><p>Best fit by area, workload and job type. Churvox only applies the move after owner approval.</p><button type="button">Approve move</button></section>
        </aside>
      </section>
      <section className="cvx-strip"><article>Jobs stay visible</article><article>Crew gets matched</article><article>Proof moves to paid</article><article>Owner stays in control</article></section>
      <section className="cvx-section" id="how-it-works"><p className="cvx-kicker">HOW IT WORKS</p><h2>One simple flow from field work to admin done.</h2><div className="cvx-step-grid">{steps.map(([n,t,b]) => <article key={t}><b>{n}</b><strong>{t}</strong><span>{b}</span></article>)}</div></section>
      <section className="cvx-section" id="features"><p className="cvx-kicker">WHAT CHURVOX RUNS</p><h2>The daily control room for field-service admin.</h2><p className="cvx-section-copy">Churvox prepares real business actions, explains why they matter, and gives owners a clean approval queue.</p><div className="cvx-cloud">{features.map((x) => <span key={x}>{x}</span>)}</div></section>
      <section className="cvx-section" id="trades"><p className="cvx-kicker">BUILT FOR FIELD SERVICE</p><h2>For owners running crews, sites, customers and proof-based billing.</h2><div className="cvx-cloud">{trades.map((x) => <span key={x}>{x}</span>)}</div></section>
      <section className="cvx-final"><p className="cvx-kicker">READY TO SEE IT WORK?</p><h2>Try the live demo, then start your free trial.</h2><div><a className="cvx-primary" href="/demo">Try live demo</a><a className="cvx-secondary" href="/signup">Start free trial</a></div></section>
      <footer className="cvx-footer"><div><strong>CHURVOX</strong><span>AI command centre for trade and service businesses.</span></div><nav><a href="/pricing">Pricing</a><a href="/demo">Try live demo</a><a href="/contact">Email us</a><a href="/login">Sign in</a></nav></footer>
    </main>
  );
}
