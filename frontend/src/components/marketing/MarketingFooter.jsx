import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../ChurvoxLogo";

export default function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer
      style={{
        borderTop: "1px solid var(--cx-border)",
        background: "var(--cx-bg-soft)",
        padding: "48px clamp(16px, 4vw, 28px) 32px",
        marginTop: 60,
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 36,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <ChurvoxLogo />
          <p style={{ marginTop: 12, color: "var(--cx-muted)", fontSize: 14, lineHeight: 1.6, maxWidth: 280 }}>
            Churvox is an AI Operator Front Desk for trade and service businesses. Churvox does the admin. You approve.
          </p>
        </div>
        <FooterCol
          title="Product"
          links={[
            { to: "/features", label: "Features" },
            { to: "/pricing", label: "Pricing" },
            { to: "/signup", label: "Start free trial" },
            { to: "/login", label: "Log in" },
          ]}
        />
        <FooterCol
          title="For"
          links={[
            { to: "/features#trades", label: "Trades" },
            { to: "/features#service", label: "Service businesses" },
            { to: "/features#workers", label: "Workers" },
            { to: "/features#payroll", label: "Payroll teams" },
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            { to: "/privacy", label: "Privacy" },
            { to: "/terms", label: "Terms" },
            { to: "/account-deletion", label: "Account deletion" },
          ]}
        />
      </div>
      <div
        style={{
          maxWidth: 1240,
          margin: "36px auto 0",
          paddingTop: 20,
          borderTop: "1px solid var(--cx-border-soft)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          color: "var(--cx-muted)",
          fontSize: 13,
        }}
      >
        <div>© {year} Churvox. All rights reserved.</div>
        <div style={{ display: "flex", gap: 14 }}>
          <Link to="/privacy" style={{ color: "var(--cx-muted)", textDecoration: "none" }}>Privacy</Link>
          <Link to="/terms" style={{ color: "var(--cx-muted)", textDecoration: "none" }}>Terms</Link>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "Outfit, Inter, sans-serif",
          fontWeight: 700,
          fontSize: 13,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--cx-text)",
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
        {links.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              style={{
                color: "var(--cx-muted)",
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
