import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";

const plans = [
  { name: "Start", price: "$39", note: "For owner-operators getting work into one clean system.", points: ["Jobs and clients", "Quotes and invoices", "Basic approval flow", "Start simple"] },
  { name: "Crew", price: "$89", note: "For small teams that need field work and admin moving together.", points: ["Team and worker app", "Proof photos", "Time tracking", "Crew scheduling"] },
  { name: "Operator", price: "$149", main: true, note: "Where Churvox starts preparing the admin before you touch it.", points: ["AI prep queue", "Decision slips", "Invoice draft prep", "Quote follow-ups", "MYOB add-on $39"] },
  { name: "Command", price: "$299", note: "For businesses that want the full office control layer.", points: ["MYOB included", "Payroll workspace", "Advanced roles", "Command Growth Pack $99"] },
];

const S = {
  page: { minHeight: "100vh", background: "#eef5ff", color: "#142033", fontFamily: "Inter, system-ui, sans-serif" },
  nav: { minHeight: 78, display: "flex", alignItems: "center", gap: 22, padding: "0 clamp(16px,4vw,72px)", background: "linear-gradient(90deg,#1d2d4a,#2764ff)", boxShadow: "0 18px 48px rgba(39,100,255,.24)" },
  logo: { display: "flex", textDecoration: "none" },
  links: { display: "flex", gap: 8, flex: 1 },
  link: { color: "rgba(255,255,255,.82)", textDecoration: "none", fontWeight: 850, fontSize: 13, padding: "10px 12px", borderRadius: 12 },
  cta: { background: "#fff", color: "#1d2d4a", textDecoration: "none", fontWeight: 950, padding: "12px 16px", borderRadius: 14 },
  hero: { padding: "clamp(54px,8vw,116px) clamp(16px,4vw,72px) 34px", background: "radial-gradient(circle at 84% 12%,rgba(0,167,255,.25),transparent 32%),linear-gradient(135deg,#eef5ff,#fff 55%,#dbeafe)" },
  kicker: { margin: 0, color: "#2764ff", textTransform: "uppercase", letterSpacing: ".17em", fontSize: 11, fontWeight: 950 },
  h1: { margin: "12px 0", fontFamily: "Outfit, Inter, sans-serif", fontSize: "clamp(58px,8vw,124px)", lineHeight: .8, letterSpacing: "-.09em", color: "#142033", maxWidth: 1100 },
  lead: { maxWidth: 790, color: "#61708a", fontSize: "clamp(18px,1.7vw,24px)", lineHeight: 1.55 },
  grid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, padding: "28px clamp(16px,4vw,72px) clamp(60px,8vw,112px)" },
  plan: { background: "#fff", border: "1px solid #c9d8ef", borderRadius: 28, padding: 24, boxShadow: "0 20px 58px rgba(35,58,102,.13)", display: "flex", flexDirection: "column", minHeight: 460 },
  mainPlan: { background: "linear-gradient(160deg,#1d2d4a,#2764ff)", color: "#fff", border: "1px solid #8ccfff", borderRadius: 28, padding: 24, boxShadow: "0 28px 90px rgba(39,100,255,.3)", transform: "translateY(-18px)", display: "flex", flexDirection: "column", minHeight: 490 },
  price: { fontFamily: "Outfit, Inter, sans-serif", fontSize: 64, lineHeight: .85, letterSpacing: "-.06em", margin: "16px 0 6px" },
  button: { display: "inline-flex", justifyContent: "center", textDecoration: "none", background: "linear-gradient(135deg,#2764ff,#00a7ff)", color: "#fff", padding: "14px 16px", borderRadius: 16, fontWeight: 950, marginTop: "auto" },
  buttonLight: { display: "inline-flex", justifyContent: "center", textDecoration: "none", background: "#fff", color: "#1d2d4a", padding: "14px 16px", borderRadius: 16, fontWeight: 950, marginTop: "auto" },
  addOns: { margin: "0 clamp(16px,4vw,72px) clamp(60px,8vw,100px)", background: "#fff", border: "1px solid #c9d8ef", borderRadius: 28, padding: "clamp(24px,4vw,42px)", boxShadow: "0 20px 58px rgba(35,58,102,.13)" },
};

export default function PricingPage() {
  return (
    <main style={S.page}>
      <header style={S.nav}>
        <Link to="/" style={S.logo}><ChurvoxLogo /></Link>
        <nav style={S.links}><Link to="/" style={S.link}>Home</Link><Link to="/features" style={S.link}>Features</Link><Link to="/login" style={S.link}>Log in</Link></nav>
        <Link to="/signup" style={S.cta}>Start free</Link>
      </header>
      <section style={S.hero}>
        <p style={S.kicker}>Pricing</p>
        <h1 style={S.h1}>Choose how hard Churvox runs the office.</h1>
        <p style={S.lead}>Start with core job control. Upgrade when you want Churvox preparing invoices, follow-ups, worker moves and owner decision slips before you touch the admin.</p>
      </section>
      <section style={S.grid}>
        {plans.map((plan) => {
          const card = plan.main ? S.mainPlan : S.plan;
          const muted = plan.main ? "rgba(255,255,255,.76)" : "#61708a";
          return <article key={plan.name} style={card}>
            {plan.main && <p style={{ ...S.kicker, color: "#bfe8ff" }}>Most popular</p>}
            <h2 style={{ fontSize: 34, margin: 0, color: plan.main ? "#fff" : "#142033" }}>{plan.name}</h2>
            <div style={S.price}>{plan.price}</div>
            <p style={{ color: muted, marginTop: 0 }}>per month + GST</p>
            <p style={{ color: muted, lineHeight: 1.5 }}>{plan.note}</p>
            <ul style={{ paddingLeft: 18, color: muted, lineHeight: 1.8 }}>{plan.points.map((p) => <li key={p}>{p}</li>)}</ul>
            <Link to="/signup" style={plan.main ? S.buttonLight : S.button}>Choose {plan.name}</Link>
          </article>;
        })}
      </section>
      <section style={S.addOns}>
        <p style={S.kicker}>Add-ons</p>
        <h2 style={{ ...S.h1, fontSize: "clamp(38px,5vw,78px)" }}>Scale the machine when the business grows.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {[["MYOB add-on", "$39 on Operator, included in Command"], ["Command Growth Pack", "$99/month + GST for more crew and capacity"], ["SMS credits", "Separate credit packs from $10"]].map(([a,b]) => <article key={a} style={{ background: "#eef5ff", border: "1px solid #c9d8ef", borderRadius: 20, padding: 20 }}><h3>{a}</h3><p style={{ color: "#61708a" }}>{b}</p></article>)}
        </div>
      </section>
    </main>
  );
}
