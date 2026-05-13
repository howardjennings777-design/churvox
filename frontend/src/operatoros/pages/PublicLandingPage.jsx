import { useEffect } from "react";
import "./PublicLandingPage.css";

const pains = ["Stop chasing workers", "Stop missing invoices", "Stop losing quote follow-ups", "Stop running from ten places"];
const previews = ["Smart Hub", "AI Work Queue", "Worker Proof", "Proof-to-Paid"];

export default function PublicLandingPage() {
  useEffect(() => {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    const id = path === "/features" ? "features" : path === "/how-it-works" ? "how" : path === "/trades" ? "trades" : "";
    if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 60);
  }, []);

  return (
    <main className="landing">
      <header className="topnav">
        <a href="/" className="brand"><img src="/brand/churvox-holo-c.svg" alt="" />CHURVOX</a>
        <nav><a href="/">Home</a><a href="/how-it-works">How it works</a><a href="/features">Features</a><a href="/pricing">Pricing</a><a href="/demo">Book demo</a><a href="/login">Sign in</a></nav>
      </header>
      <section className="hero">
        <div>
          <p className="kicker">AI COMMAND CENTRE FOR TRADE/SERVICE OWNERS</p>
          <h1>Run jobs, crew and admin from one calm place.</h1>
          <p>Churvox watches jobs, workers, clients, quotes, invoices, proof photos, reminders, and payroll handoff. AI prepares the next move. Owner approves before anything important happens.</p>
          <div className="cta"><a href="/signup" className="primary">Start free trial</a><a href="/demo" className="secondary">Book a demo</a></div>
        </div>
        <aside className="panel"><h3>AI Operator Live</h3><p>Priority actions are prepared, ranked and ready for owner approval-first operations.</p></aside>
      </section>
      <section className="cards" id="how">{pains.map((p) => <article key={p}>{p}</article>)}</section>
      <section className="section" id="features"><h2>Product preview</h2><div className="cards">{previews.map((p) => <article key={p}>{p}</article>)}</div></section>
      <section className="section"><h2>Who it is for</h2><p id="trades">Built for trade crews, field service teams and owners who need proof-backed invoicing and payroll handoff.</p></section>
      <section className="section"><h2>Pricing</h2><p>From Solo to Enterprise plans, including MYOB-ready pathways and AI approval workflows.</p><a href="/pricing" className="primary">View pricing</a></section>
      <section className="section"><h2>Start your launch trial</h2><a href="/signup" className="primary">Start free trial</a></section>
      <footer className="footer">
        <a href="/pricing">Pricing</a><a href="/demo">Book demo</a><a href="/login">Sign in</a><a href="mailto:hello@churvox.com">hello@churvox.com</a>
        <p>Before paid public launch, connect Privacy, Terms and Security pages. MYOB-ready workflows are available (not MYOB certified wording).</p>
      </footer>
    </main>
  );
}
