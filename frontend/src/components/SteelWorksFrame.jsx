import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChurvoxLogo } from "./ChurvoxLogo";

const links = [
  ["/dashboard", "Command"],
  ["/jobs", "Jobs"],
  ["/clients", "Clients"],
  ["/quotes", "Quotes"],
  ["/invoices", "Invoices"],
  ["/team", "Team"],
  ["/payroll", "Payroll"],
  ["/automation", "Automation"],
  ["/reports", "Reports"],
  ["/settings", "Settings"],
];

const pageNames = {
  jobs: "Job bay",
  clients: "Client vault",
  quotes: "Quote press",
  invoices: "Invoice forge",
  team: "Crew rack",
  payroll: "Payroll bench",
  automation: "Automation engine",
  reports: "Reports gauge",
  integrations: "Integration ports",
  settings: "Control settings",
  sms: "SMS bay",
  notifications: "Signal log",
  worker: "Worker console",
  plans: "Plan control",
  contact: "Contact bay",
  onboarding: "Setup gantry",
};

const S = {
  shell: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 12% 8%, rgba(103,199,217,.12), transparent 26%), radial-gradient(circle at 88% 10%, rgba(242,169,59,.13), transparent 25%), linear-gradient(135deg,#30363c,#252a2f 52%,#444b52)",
    color: "#f2f4f5",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  top: {
    minHeight: 72,
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "0 clamp(14px,3vw,40px)",
    background: "linear-gradient(90deg,#23282d,#424a52 48%,#2b3035)",
    borderBottom: "1px solid #808a93",
    boxShadow: "0 18px 48px rgba(18,22,25,.36)",
    position: "sticky",
    top: 0,
    zIndex: 40,
  },
  logo: { display: "flex", textDecoration: "none" },
  title: { flex: 1, minWidth: 160 },
  kicker: { margin: 0, color: "#f2a93b", fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: ".16em" },
  name: { margin: "3px 0 0", color: "#f2f4f5", fontFamily: "Outfit, Inter, sans-serif", fontSize: 22, letterSpacing: "-.04em" },
  nav: { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 },
  navLink: { color: "#c8cdd1", textDecoration: "none", fontSize: 13, fontWeight: 850, padding: "9px 10px", borderRadius: 10, whiteSpace: "nowrap" },
  active: { color: "#211b11", background: "linear-gradient(135deg,#f2a93b,#d9782d)", boxShadow: "0 10px 26px rgba(217,120,45,.26)" },
  body: { display: "grid", gridTemplateColumns: "88px minmax(0,1fr)", gap: 16, padding: "clamp(14px,2.6vw,28px) clamp(14px,3vw,40px) 48px" },
  rail: {
    border: "1px solid #808a93",
    borderRadius: 18,
    background: "linear-gradient(45deg,rgba(255,255,255,.055) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.055) 50%,rgba(255,255,255,.055) 75%,transparent 75%,transparent), linear-gradient(180deg,#3e464e,#252a2f)",
    backgroundSize: "24px 24px, auto",
    boxShadow: "0 18px 48px rgba(18,22,25,.28)",
    padding: 10,
    display: "grid",
    alignContent: "start",
    gap: 10,
  },
  railCell: { border: "1px solid #7b858d", borderRadius: 12, minHeight: 52, display: "grid", placeItems: "center", color: "#f2a93b", fontWeight: 950, background: "rgba(0,0,0,.12)" },
  contentWrap: {
    border: "1px solid #808a93",
    borderRadius: 24,
    background: "linear-gradient(145deg,rgba(255,255,255,.13),rgba(255,255,255,.035)), linear-gradient(180deg,#4d5660,#3d454d)",
    boxShadow: "0 18px 48px rgba(18,22,25,.34)",
    padding: "clamp(12px,2vw,20px)",
    minWidth: 0,
  },
  cap: { display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", padding: "0 4px 14px", borderBottom: "1px solid rgba(255,255,255,.16)", marginBottom: 14 },
  capTitle: { margin: 0, color: "#f2f4f5", fontFamily: "Outfit, Inter, sans-serif", fontSize: "clamp(26px,3.4vw,44px)", lineHeight: .9, letterSpacing: "-.055em" },
  badge: { background: "#30363c", border: "1px solid #808a93", color: "#67c7d9", borderRadius: 999, padding: "8px 10px", fontSize: 12, fontWeight: 950, whiteSpace: "nowrap" },
  content: { minWidth: 0 },
};

function getName(pathname) {
  const key = pathname.split("/").filter(Boolean)[0] || "dashboard";
  return pageNames[key] || key.replace(/-/g, " ");
}

export default function SteelWorksFrame({ children }) {
  const location = useLocation();
  const pathname = location.pathname || "/";
  if (pathname === "/dashboard" || pathname === "/overview") return children;

  const currentName = getName(pathname);

  return (
    <div style={S.shell} data-steelworks-frame="true">
      <header style={S.top}>
        <Link to="/dashboard" style={S.logo}><ChurvoxLogo /></Link>
        <div style={S.title}>
          <p style={S.kicker}>SteelWorks console</p>
          <h1 style={S.name}>{currentName}</h1>
        </div>
        <nav style={S.nav}>
          {links.map(([to, label]) => {
            const isActive = pathname === to || pathname.startsWith(`${to}/`);
            return <Link key={to} to={to} style={{ ...S.navLink, ...(isActive ? S.active : {}) }}>{label}</Link>;
          })}
        </nav>
      </header>

      <main style={S.body}>
        <aside style={S.rail} aria-hidden="true">
          <div style={S.railCell}>01</div>
          <div style={S.railCell}>AI</div>
          <div style={S.railCell}>JOB</div>
          <div style={S.railCell}>$$</div>
        </aside>
        <section style={S.contentWrap}>
          <div style={S.cap}>
            <div>
              <p style={S.kicker}>Active work module</p>
              <h2 style={S.capTitle}>{currentName}</h2>
            </div>
            <span style={S.badge}>Industrial mode</span>
          </div>
          <div style={S.content}>{children}</div>
        </section>
      </main>
    </div>
  );
}
