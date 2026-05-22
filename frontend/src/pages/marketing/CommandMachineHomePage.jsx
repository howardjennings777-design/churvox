import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";

const moves = [
  ["Invoice draft", "Finished job, proof and pricing turned into a reviewable invoice."],
  ["Crew suggestion", "Unassigned work matched to the best available worker."],
  ["Customer follow-up", "Quote and invoice messages prepared before you chase them."],
  ["Blocked work", "Missing price, address or client detail pulled forward."],
];

const modules = ["Jobs", "Clients", "Quotes", "Invoices", "Team", "Worker app", "Proof photos", "Payroll", "MYOB", "SMS"];

const S = {
  page: { minHeight: "100vh", background: "#eef5ff", color: "#142033", fontFamily: "Inter, system-ui, sans-serif" },
  nav: { minHeight: 78, display: "flex", alignItems: "center", gap: 22, padding: "0 clamp(16px,4vw,72px)", background: "linear-gradient(90deg,#1d2d4a,#2764ff)", boxShadow: "0 18px 48px rgba(39,100,255,.24)", position: "sticky", top: 0, zIndex: 10 },
  logo: { display: "flex", textDecoration: "none" },
  links: { display: "flex", gap: 8, flex: 1 },
  link: { color: "rgba(255,255,255,.82)", textDecoration: "none", fontWeight: 850, fontSize: 13, padding: "10px 12px", borderRadius: 12 },
  cta: { background: "#fff", color: "#1d2d4a", textDecoration: "none", fontWeight: 950, padding: "12px 16px", borderRadius: 14, boxShadow: "0 14px 34px rgba(20,32,51,.14)" },
  ghost: { color: "#fff", textDecoration: "none", fontWeight: 950, padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,.28)" },
  hero: { minHeight: "calc(100vh - 78px)", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(460px,.92fr)", gap: 42, alignItems: "center", padding: "clamp(44px,7vw,104px) clamp(16px,4vw,72px)", background: "radial-gradient(circle at 82% 20%,rgba(0,167,255,.26),transparent 30%),linear-gradient(132deg,#eef5ff 0%,#ffffff 52%,#dbeafe 52%,#bfe8ff 100%)" },
  kicker: { margin: 0, color: "#2764ff", textTransform: "uppercase", letterSpacing: ".17em", fontSize: 11, fontWeight: 950 },
  h1: { margin: "12px 0", fontFamily: "Outfit, Inter, sans-serif", fontSize: "clamp(64px,9vw,136px)", lineHeight: .78, letterSpacing: "-.09em", color: "#142033" },
  lead: { maxWidth: 820, color: "#61708a", fontSize: "clamp(18px,1.7vw,24px)", lineHeight: 1.55 },
  actions: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 30 },
  primary: { background: "linear-gradient(135deg,#2764ff,#00a7ff)", color: "#fff", textDecoration: "none", fontWeight: 950, padding: "14px 18px", borderRadius: 16, boxShadow: "0 18px 42px rgba(39,100,255,.28)" },
  secondary: { background: "#fff", color: "#1d2d4a", textDecoration: "none", fontWeight: 950, padding: "14px 18px", borderRadius: 16, border: "1px solid #c9d8ef" },
  machine: { background: "rgba(255,255,255,.92)", border: "1px solid #c9d8ef", borderRadius: 30, overflow: "hidden", boxShadow: "0 38px 110px rgba(35,58,102,.22)", backdropFilter: "blur(14px)" },
  machineHead: { display: "flex", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid #dce8f7", background: "linear-gradient(90deg,#f7fbff,#ffffff)" },
  decision: { padding: 30, background: "linear-gradient(135deg,#ffffff,#f0f8ff)" },
  h2Panel: { margin: "12px 0", fontFamily: "Outfit, Inter, sans-serif", fontSize: "clamp(36px,4.4vw,60px)", lineHeight: .86, letterSpacing: "-.07em", color: "#142033" },
  approve: { border: 0, borderRadius: 16, background: "linear-gradient(135deg,#2764ff,#00a7ff)", color: "#fff", padding: "14px 18px", fontWeight: 950, boxShadow: "0 18px 42px rgba(39,100,255,.26)" },
  feed: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#dce8f7" },
  feedCard: { background: "#fff", padding: 20 },
  band: { padding: "clamp(66px,8vw,118px) clamp(16px,4vw,72px)", background: "#ffffff", color: "#142033" },
  bandBlue: { padding: "clamp(66px,8vw,118px) clamp(16px,4vw,72px)", background: "linear-gradient(135deg,#1d2d4a,#2764ff)", color: "#fff" },
  h2: { margin: 0, fontFamily: "Outfit, Inter, sans-serif", fontSize: "clamp(44px,6vw,96px)", lineHeight: .86, letterSpacing: "-.075em" },
  grid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginTop: 30 },
  tile: { background: "#fff", border: "1px solid #c9d8ef", borderRadius: 22, padding: 24, boxShadow: "0 18px 50px rgba(35,58,102,.12)" },
  final: { display: "flex", justifyContent: "space-between", gap: 24, alignItems: "center", padding: "clamp(54px,6vw,88px) clamp(16px,4vw,72px)", background: "#eef5ff", borderTop: "1px solid #c9d8ef" },
};

function A({ to, children, primary }) {
  return <Link to={to} style={primary ? S.primary : S.secondary}>{children}</Link>;
}

export default function CommandMachineHomePage() {
  return (
    <main style={S.page}>
      <header style={S.nav}>
        <Link to="/" style={S.logo}><ChurvoxLogo /></Link>
        <nav style={S.links}>
          <Link to="/features" style={S.link}>Features</Link>
          <Link to="/pricing" style={S.link}>Pricing</Link>
          <Link to="/login" style={S.link}>Log in</Link>
        </nav>
        <Link to="/signup" style={S.cta}>Start free</Link>
      </header>

      <section style={S.hero}>
        <div>
          <p style={S.kicker}>Tech office autopilot</p>
          <h1 style={S.h1}>Your admin runs before you touch it.</h1>
          <p style={S.lead}>Churvox checks jobs, clients, quotes, invoices, crew and money, then prepares the next move for owner approval. One decision at a time. No messy dashboard wall.</p>
          <div style={S.actions}>
            <A to="/signup" primary>Start free</A>
            <A to="/login">Log in</A>
            <A to="/features">See how it works</A>
          </div>
        </div>

        <aside style={S.machine}>
          <div style={S.machineHead}><strong>Churvox Control Feed</strong><span style={{ color: "#ff8a3d", fontWeight: 950 }}>LIVE PREP</span></div>
          <div style={S.decision}>
            <p style={S.kicker}>Next owner move</p>
            <h2 style={S.h2Panel}>Approve invoice prepared from finished work</h2>
            <p style={{ color: "#61708a", lineHeight: 1.55 }}>Job complete. Proof photos attached. Price found. Customer document prepared. Owner can review, edit or approve.</p>
            <button style={S.approve}>Open decision slip</button>
          </div>
          <div style={S.feed}>
            {moves.map(([title, text]) => <article key={title} style={S.feedCard}><b>{title}</b><p style={{ color: "#61708a", fontSize: 13, lineHeight: 1.45 }}>{text}</p></article>)}
          </div>
        </aside>
      </section>

      <section style={S.band}>
        <p style={S.kicker}>Different from job software</p>
        <h2 style={S.h2}>Not a dashboard. A business control system.</h2>
        <p style={{ color: "#61708a", fontSize: 18, lineHeight: 1.6, maxWidth: 860 }}>Most systems store work. Churvox prepares the admin: invoice drafts, quote follow-ups, missing information fixes, crew suggestions and money reminders.</p>
        <div style={S.grid}>{moves.map(([title, text]) => <article key={title} style={S.tile}><h3>{title}</h3><p style={{ color: "#61708a" }}>{text}</p></article>)}</div>
      </section>

      <section style={S.bandBlue}>
        <p style={{ ...S.kicker, color: "#bfe8ff" }}>The flow</p>
        <h2 style={{ ...S.h2, color: "#fff" }}>Work comes in. Churvox prepares. Owner approves.</h2>
        <div style={S.grid}>{["Capture work", "Check gaps", "Prepare admin", "Show decision slip", "Move field/money"].map((step, index) => <article key={step} style={{ ...S.tile, background: "rgba(255,255,255,.12)", borderColor: "rgba(255,255,255,.22)", color: "#fff" }}><span style={{ color: "#bfe8ff", fontWeight: 950 }}>0{index + 1}</span><h3 style={{ color: "#fff" }}>{step}</h3></article>)}</div>
      </section>

      <section style={S.band}>
        <p style={S.kicker}>Connected modules</p>
        <h2 style={S.h2}>One tech system behind the owner.</h2>
        <div style={S.grid}>{modules.map((m) => <article key={m} style={S.tile}><h3>{m}</h3><p style={{ color: "#61708a" }}>Connected to the same approval-first control flow.</p></article>)}</div>
      </section>

      <section style={S.final}>
        <div><p style={S.kicker}>The point</p><h2 style={S.h2}>Churvox prepares it. You approve it.</h2></div>
        <Link to="/signup" style={S.primary}>Start free</Link>
      </section>
    </main>
  );
}
