import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";

const bands = [
  ["Capture", "Jobs, clients, quotes, workers, photos and time land in one live work stream.", ["Jobs", "Clients", "Quotes", "Worker app", "Proof photos"]],
  ["Prepare", "Churvox checks the work and prepares admin before the owner has to chase it.", ["Invoice drafts", "Follow-ups", "Crew suggestions", "Missing info fixes", "Payroll review"]],
  ["Approve", "The owner sees one decision slip, then approves, edits, dismisses or opens the source.", ["Decision slip", "Approval queue", "Money desk", "MYOB", "SMS"]],
];

const S = {
  page: { minHeight: "100vh", background: "#eef5ff", color: "#142033", fontFamily: "Inter, system-ui, sans-serif" },
  nav: { minHeight: 78, display: "flex", alignItems: "center", gap: 22, padding: "0 clamp(16px,4vw,72px)", background: "linear-gradient(90deg,#1d2d4a,#2764ff)", boxShadow: "0 18px 48px rgba(39,100,255,.24)" },
  logo: { display: "flex", textDecoration: "none" },
  links: { display: "flex", gap: 8, flex: 1 },
  link: { color: "rgba(255,255,255,.82)", textDecoration: "none", fontWeight: 850, fontSize: 13, padding: "10px 12px", borderRadius: 12 },
  cta: { background: "#fff", color: "#1d2d4a", textDecoration: "none", fontWeight: 950, padding: "12px 16px", borderRadius: 14 },
  hero: { padding: "clamp(54px,8vw,120px) clamp(16px,4vw,72px)", background: "radial-gradient(circle at 85% 18%,rgba(0,167,255,.25),transparent 34%),linear-gradient(135deg,#eef5ff,#ffffff 55%,#dbeafe)" },
  kicker: { margin: 0, color: "#2764ff", textTransform: "uppercase", letterSpacing: ".17em", fontSize: 11, fontWeight: 950 },
  h1: { margin: "12px 0", fontFamily: "Outfit, Inter, sans-serif", fontSize: "clamp(58px,8vw,124px)", lineHeight: .8, letterSpacing: "-.09em", color: "#142033", maxWidth: 1120 },
  lead: { maxWidth: 820, color: "#61708a", fontSize: "clamp(18px,1.7vw,24px)", lineHeight: 1.55 },
  bandWrap: { display: "grid", gap: 18, padding: "0 clamp(16px,4vw,72px) clamp(66px,8vw,120px)" },
  band: { display: "grid", gridTemplateColumns: "minmax(260px,.7fr) minmax(0,1.3fr)", gap: 24, background: "#fff", border: "1px solid #c9d8ef", borderRadius: 30, padding: "clamp(24px,4vw,42px)", boxShadow: "0 22px 70px rgba(35,58,102,.14)" },
  bandNo: { fontFamily: "Outfit, Inter, sans-serif", fontSize: 76, lineHeight: .8, color: "#00a7ff", fontWeight: 950 },
  bandTitle: { margin: "12px 0", fontFamily: "Outfit, Inter, sans-serif", fontSize: "clamp(36px,4.8vw,74px)", lineHeight: .86, letterSpacing: "-.07em", color: "#142033" },
  chips: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 },
  chip: { background: "#eef5ff", color: "#1d2d4a", border: "1px solid #c9d8ef", borderRadius: 999, padding: "10px 13px", fontWeight: 900 },
  slip: { margin: "0 clamp(16px,4vw,72px) clamp(66px,8vw,120px)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, background: "linear-gradient(135deg,#1d2d4a,#2764ff)", borderRadius: 34, padding: "clamp(28px,5vw,56px)", color: "#fff", boxShadow: "0 26px 80px rgba(39,100,255,.25)" },
  slipCard: { background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.24)", borderRadius: 24, padding: 24 },
};

export default function FeaturesPage() {
  return (
    <main style={S.page}>
      <header style={S.nav}>
        <Link to="/" style={S.logo}><ChurvoxLogo /></Link>
        <nav style={S.links}><Link to="/" style={S.link}>Home</Link><Link to="/pricing" style={S.link}>Pricing</Link><Link to="/login" style={S.link}>Log in</Link></nav>
        <Link to="/signup" style={S.cta}>Start free</Link>
      </header>
      <section style={S.hero}>
        <p style={S.kicker}>Features</p>
        <h1 style={S.h1}>The tech control layer behind the trade office.</h1>
        <p style={S.lead}>Churvox is not a list of tools. It is a connected prep system that turns jobs, clients, crew and money into owner decisions.</p>
      </section>
      <section style={S.bandWrap}>
        {bands.map(([title, text, chips], i) => (
          <article key={title} style={S.band}>
            <div><div style={S.bandNo}>0{i + 1}</div><h2 style={S.bandTitle}>{title}</h2></div>
            <div><p style={{ color: "#61708a", fontSize: 18, lineHeight: 1.6 }}>{text}</p><div style={S.chips}>{chips.map((c) => <span key={c} style={S.chip}>{c}</span>)}</div></div>
          </article>
        ))}
      </section>
      <section style={S.slip}>
        <div><p style={{ ...S.kicker, color: "#bfe8ff" }}>Decision Slip</p><h2 style={{ ...S.bandTitle, color: "#fff" }}>One prepared move. One reason. One owner decision.</h2></div>
        <div style={S.slipCard}><strong>Prepared action</strong><p>Send quote follow-up to the client.</p><strong>Why</strong><p>Quote has been waiting 5 days and no customer reply is recorded.</p><strong>Owner can</strong><p>Approve, edit, dismiss or open the quote.</p></div>
      </section>
    </main>
  );
}
