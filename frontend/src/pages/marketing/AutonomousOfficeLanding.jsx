import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";

const moves = [
  ["01", "Invoice prepared", "Completed job, proof photos and price found. Draft ready for owner approval."],
  ["02", "Crew move suggested", "Unassigned work matched to the next practical worker."],
  ["03", "Client follow-up written", "Quote or invoice message prepared, not sent until approved."],
  ["04", "Blocker pulled forward", "Missing price, address or client detail raised before it becomes admin debt."],
];

const modules = ["Jobs", "Clients", "Quotes", "Invoices", "Workers", "Proof", "Payroll", "MYOB", "SMS", "AI approvals"];

const S = {
  page: { minHeight: "100vh", background: "#050609", color: "#f6efe3", fontFamily: "Inter, system-ui, sans-serif" },
  nav: { height: 76, display: "flex", alignItems: "center", gap: 22, padding: "0 clamp(16px,4vw,70px)", borderBottom: "1px solid #262c38", background: "rgba(5,6,9,.96)", position: "sticky", top: 0, zIndex: 20 },
  logo: { filter: "invert(1) grayscale(1) brightness(2)", display: "flex", textDecoration: "none" },
  links: { display: "flex", gap: 8, flex: 1 },
  link: { color: "rgba(246,239,227,.68)", textDecoration: "none", fontWeight: 850, fontSize: 13, padding: "10px 12px", borderRadius: 12 },
  primary: { background: "#f6efe3", color: "#050609", textDecoration: "none", borderRadius: 12, padding: "12px 16px", fontWeight: 950 },
  ghost: { color: "#f6efe3", textDecoration: "none", border: "1px solid rgba(246,239,227,.22)", borderRadius: 12, padding: "12px 16px", fontWeight: 950 },
  hero: { minHeight: "calc(100vh - 76px)", display: "grid", gridTemplateColumns: "minmax(0,1.05fr) minmax(460px,.95fr)", gap: 42, alignItems: "center", padding: "clamp(44px,7vw,104px) clamp(16px,4vw,70px)", background: "radial-gradient(circle at 75% 20%, rgba(179,122,42,.30), transparent 30%), linear-gradient(125deg,#050609 0%,#141923 48%,#d9cbb5 48%,#f6efe3 100%)" },
  kicker: { margin: 0, color: "#c9974c", textTransform: "uppercase", letterSpacing: ".18em", fontSize: 11, fontWeight: 950 },
  h1: { margin: "12px 0", fontFamily: "Outfit, Inter, sans-serif", fontSize: "clamp(64px,9vw,138px)", lineHeight: .78, letterSpacing: "-.09em", color: "#f6efe3" },
  lead: { maxWidth: 820, color: "rgba(246,239,227,.74)", fontSize: "clamp(18px,1.7vw,24px)", lineHeight: 1.55 },
  actions: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 30 },
  machine: { background: "#07080a", border: "1px solid #303746", borderRadius: 28, overflow: "hidden", boxShadow: "0 60px 150px rgba(0,0,0,.55)" },
  machineHead: { display: "flex", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid #303746" },
  decision: { padding: 28, background: "linear-gradient(180deg,#1a202c,#090b10)" },
  decisionTitle: { fontFamily: "Outfit, Inter, sans-serif", fontSize: 46, lineHeight: .88, letterSpacing: "-.06em", margin: "12px 0", color: "#f6efe3" },
  approve: { border: 0, borderRadius: 14, background: "#f6efe3", color: "#050609", padding: "14px 18px", fontWeight: 950 },
  feed: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#303746" },
  feedCard: { background: "#11151d", padding: 18 },
  band: { padding: "clamp(66px,8vw,120px) clamp(16px,4vw,70px)", background: "#f6efe3", color: "#111318" },
  bandDark: { padding: "clamp(66px,8vw,120px) clamp(16px,4vw,70px)", background: "#050609", color: "#f6efe3" },
  h2: { fontFamily: "Outfit, Inter, sans-serif", fontSize: "clamp(44px,6vw,96px)", lineHeight: .86, letterSpacing: "-.075em", margin: 0 },
  grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 30 },
  tile: { border: "1px solid #c6b59e", background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 18px 44px rgba(17,19,24,.08)" },
  process: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, background: "#303746", marginTop: 34, border: "1px solid #303746", borderRadius: 22, overflow: "hidden" },
  processStep: { background: "#11151d", padding: 22 },
  final: { display: "flex", justifyContent: "space-between", gap: 24, alignItems: "center", padding: "clamp(54px,6vw,86px) clamp(16px,4vw,70px)", background: "#d9cbb5", color: "#111318" },
};

function A({ to, children, primary }) {
  return <Link to={to} style={primary ? S.primary : S.ghost}>{children}</Link>;
}

export default function AutonomousOfficeLanding() {
  useEffect(() => { document.title = "Churvox — AI office autopilot for trade businesses"; }, []);

  return (
    <main style={S.page}>
      <header style={S.nav}>
        <Link to="/" style={S.logo}><ChurvoxLogo /></Link>
        <nav style={S.links}>
          <Link to="/features" style={S.link}>How it works</Link>
          <Link to="/pricing" style={S.link}>Pricing</Link>
          <Link to="/login" style={S.link}>Log in</Link>
        </nav>
        <Link to="/signup" style={S.primary}>Start free</Link>
      </header>

      <section style={S.hero}>
        <div>
          <p style={S.kicker}>AI office autopilot</p>
          <h1 style={S.h1}>The admin is already done.</h1>
          <p style={S.lead}>Churvox watches the work, prepares the next business move, and brings the owner one clean decision at a time. Invoices, follow-ups, crew moves, blockers and money — prepared before you touch it.</p>
          <div style={S.actions}>
            <A to="/signup" primary>Start free</A>
            <A to="/login">Log in</A>
            <A to="/features">See the machine</A>
          </div>
        </div>

        <aside style={S.machine}>
          <div style={S.machineHead}><strong>Churvox Autopilot</strong><span style={{ color: "#c9974c", fontWeight: 950 }}>LIVE OFFICE</span></div>
          <div style={S.decision}>
            <p style={S.kicker}>Owner decision</p>
            <h2 style={S.decisionTitle}>Approve invoice prepared from finished work</h2>
            <p style={{ color: "rgba(246,239,227,.68)", lineHeight: 1.5 }}>Churvox found a completed job, proof photos, notes and saved price. The invoice is ready. Review, edit or approve.</p>
            <button style={S.approve}>Review decision slip</button>
          </div>
          <div style={S.feed}>
            {moves.map(([n, title, text]) => <article key={title} style={S.feedCard}><span style={{ color: "#c9974c", fontWeight: 950 }}>{n}</span><b style={{ display: "block", marginTop: 8 }}>{title}</b><p style={{ color: "rgba(246,239,227,.56)", fontSize: 13 }}>{text}</p></article>)}
          </div>
        </aside>
      </section>

      <section style={S.band}>
        <p style={S.kicker}>What Churvox is</p>
        <h2 style={S.h2}>Not a dashboard. An office autopilot.</h2>
        <p style={{ color: "#625d55", fontSize: 18, lineHeight: 1.6, maxWidth: 820 }}>Most apps make you open five pages and work out what needs doing. Churvox pulls the next move forward and explains why it matters.</p>
        <div style={S.grid}>{moves.map(([n, title, text]) => <article key={title} style={S.tile}><span style={{ color: "#b37a2a", fontFamily: "Outfit", fontSize: 42, fontWeight: 950 }}>{n}</span><h3>{title}</h3><p style={{ color: "#625d55" }}>{text}</p></article>)}</div>
      </section>

      <section style={S.bandDark}>
        <p style={S.kicker}>How it runs</p>
        <h2 style={S.h2}>Work comes in. Churvox prepares. Owner approves.</h2>
        <div style={S.process}>{["Capture work", "Check what is missing", "Prepare the admin", "Show decision slip", "Move the business"].map((x, i) => <article key={x} style={S.processStep}><span style={{ color: "#c9974c", fontWeight: 950 }}>0{i + 1}</span><h3>{x}</h3></article>)}</div>
      </section>

      <section style={S.band}>
        <p style={S.kicker}>Connected machine</p>
        <h2 style={S.h2}>One system running behind the owner.</h2>
        <div style={S.grid}>{modules.map((m) => <article key={m} style={S.tile}><h3>{m}</h3><p style={{ color: "#625d55" }}>Connected to the same decision-first workflow.</p></article>)}</div>
      </section>

      <section style={S.final}>
        <div><p style={S.kicker}>The point</p><h2 style={{ ...S.h2, color: "#111318" }}>Churvox prepares it. You approve it.</h2></div>
        <Link to="/signup" style={{ ...S.primary, background: "#07080a", color: "#f6efe3" }}>Start free</Link>
      </section>
    </main>
  );
}
