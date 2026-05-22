import React from "react";
import { Link } from "react-router-dom";
import { CHURVOX_PLANS, CHURVOX_ADDONS, GST_NOTE } from "../../lib/marketingPlans";
import { CxButton } from "../cx";

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PricingTiers({ showAddons = true, ctaTo = "/signup", compact = false }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
      {CHURVOX_PLANS.map((plan) => (
        <article
          key={plan.id}
          style={{
            position: "relative",
            background: plan.highlight ? "#101114" : "#fbf8f1",
            color: plan.highlight ? "#fbf8f1" : "#101114",
            border: plan.highlight ? "1px solid #101114" : "1px solid #cdc3b3",
            borderRadius: 12,
            padding: compact ? 22 : 26,
            boxShadow: plan.highlight ? "0 34px 86px rgba(16,17,20,0.28)" : "0 14px 36px rgba(16,17,20,0.08)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {plan.badge ? (
            <span
              style={{
                position: "absolute",
                top: -12,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#c58a2b",
                color: "#101114",
                fontSize: 11,
                fontWeight: 900,
                padding: "5px 12px",
                borderRadius: 999,
                border: "1px solid #8a5a1f",
                boxShadow: "0 10px 22px rgba(16,17,20,0.18)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {plan.badge}
            </span>
          ) : null}

          <div style={{ fontFamily: "Outfit, Inter, sans-serif", fontSize: 22, fontWeight: 800, color: plan.highlight ? "#fbf8f1" : "#101114", letterSpacing: "-0.015em", marginBottom: 4 }}>
            {plan.name}
          </div>
          <div style={{ fontSize: 13, color: plan.highlight ? "rgba(251,248,241,0.72)" : "#5f6670", minHeight: 36, lineHeight: 1.4, marginBottom: 14 }}>
            {plan.tagline}
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
            <span style={{ fontFamily: "Outfit, Inter, sans-serif", fontWeight: 900, fontSize: 38, color: plan.highlight ? "#fbf8f1" : "#101114", lineHeight: 1, letterSpacing: "-0.02em" }}>
              ${plan.priceMonthly}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: plan.highlight ? "rgba(251,248,241,0.58)" : "#5f6670" }}>/mo</span>
          </div>
          <div style={{ fontSize: 11.5, color: plan.highlight ? "rgba(251,248,241,0.58)" : "#5f6670", marginBottom: 14 }}>
            + GST. {plan.activeTeam}.
          </div>

          <Link to={ctaTo} style={{ textDecoration: "none", marginBottom: 18 }}>
            <CxButton variant={plan.highlight ? "primary" : "secondary"} size="md" style={{ width: "100%", justifyContent: "center" }}>
              {plan.cta}
            </CxButton>
          </Link>

          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 9 }}>
            {plan.features.map((f) => (
              <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13.5, color: plan.highlight ? "rgba(251,248,241,0.76)" : "#242830", lineHeight: 1.45 }}>
                <span style={{ width: 18, height: 18, minWidth: 18, borderRadius: 5, background: plan.highlight ? "rgba(251,248,241,0.12)" : "rgba(16,17,20,0.07)", color: plan.highlight ? "#caa46d" : "#8a5a1f", display: "inline-flex", alignItems: "center", justifyContent: "center", marginTop: 1 }} aria-hidden="true">
                  <CheckIcon />
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}

      <div style={{ gridColumn: "1 / -1", fontSize: 12.5, color: "#5f6670", textAlign: "center", marginTop: 2 }}>{GST_NOTE}</div>

      {showAddons ? (
        <div style={{ gridColumn: "1 / -1", marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {CHURVOX_ADDONS.map((a) => (
            <div key={a.id} style={{ background: "#f3eee5", border: "1px dashed #a89b88", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                <div style={{ fontFamily: "Outfit, Inter, sans-serif", fontWeight: 800, fontSize: 16, color: "#101114" }}>{a.title}</div>
                <div style={{ fontFamily: "Outfit, Inter, sans-serif", fontWeight: 800, fontSize: 16, color: "#101114" }}>{a.priceLabel || `$${a.price}/mo`}</div>
              </div>
              <div style={{ fontSize: 13, color: "#5f6670", lineHeight: 1.5 }}>{a.description}</div>
              <div style={{ fontSize: 11.5, color: "#78808a", marginTop: 8 }}>Applies to: {a.appliesTo}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
