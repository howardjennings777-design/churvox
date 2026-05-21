import React from "react";
import { Link } from "react-router-dom";
import { CHURVOX_PLANS, CHURVOX_ADDONS, GST_NOTE } from "../../lib/marketingPlans";
import { CxButton } from "../cx";

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12.5l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PricingTiers({
  showAddons = true,
  ctaTo = "/signup",
  compact = false,
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 18,
      }}
    >
      {CHURVOX_PLANS.map((plan) => (
        <article
          key={plan.id}
          style={{
            position: "relative",
            background: plan.highlight
              ? "linear-gradient(180deg, #FFFFFF 0%, #FBF8F1 100%)"
              : "var(--cx-surface)",
            border: plan.highlight
              ? "2px solid var(--cx-accent-hover)"
              : "1px solid var(--cx-border)",
            borderRadius: 22,
            padding: compact ? 22 : 26,
            boxShadow: plan.highlight
              ? "0 24px 60px rgba(200,255,77,0.20), 0 6px 16px rgba(14,14,14,0.06)"
              : "0 4px 14px rgba(14,14,14,0.04)",
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
                background: "var(--cx-accent)",
                color: "var(--cx-accent-ink)",
                fontSize: 11,
                fontWeight: 700,
                padding: "5px 12px",
                borderRadius: 999,
                border: "1px solid var(--cx-accent-hover)",
                boxShadow: "0 6px 14px rgba(200,255,77,0.4)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {plan.badge}
            </span>
          ) : null}

          <div
            style={{
              fontFamily: "Outfit, Inter, sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: "var(--cx-text)",
              letterSpacing: "-0.015em",
              marginBottom: 4,
            }}
          >
            {plan.name}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--cx-muted)",
              minHeight: 36,
              lineHeight: 1.4,
              marginBottom: 14,
            }}
          >
            {plan.tagline}
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
            <span
              style={{
                fontFamily: "Outfit, Inter, sans-serif",
                fontWeight: 800,
                fontSize: 38,
                color: "var(--cx-text)",
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              ${plan.priceMonthly}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--cx-muted)" }}>
              /mo
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--cx-muted)", marginBottom: 14 }}>
            + GST. {plan.activeTeam}.
          </div>

          <Link
            to={ctaTo}
            style={{ textDecoration: "none", marginBottom: 18 }}
          >
            <CxButton
              variant={plan.highlight ? "primary" : "secondary"}
              size="md"
              style={{ width: "100%", justifyContent: "center" }}
            >
              {plan.cta}
            </CxButton>
          </Link>

          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 9 }}>
            {plan.features.map((f) => (
              <li
                key={f}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontSize: 13.5,
                  color: "var(--cx-text-soft)",
                  lineHeight: 1.45,
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    minWidth: 18,
                    borderRadius: 6,
                    background: "var(--cx-accent-soft)",
                    color: "#355C00",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 1,
                  }}
                  aria-hidden="true"
                >
                  <CheckIcon />
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}

      <div
        style={{
          gridColumn: "1 / -1",
          fontSize: 12.5,
          color: "var(--cx-muted)",
          textAlign: "center",
          marginTop: 2,
        }}
      >
        {GST_NOTE}
      </div>

      {showAddons ? (
        <div
          style={{
            gridColumn: "1 / -1",
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          {CHURVOX_ADDONS.map((a) => (
            <div
              key={a.id}
              style={{
                background: "var(--cx-bg-soft)",
                border: "1px dashed var(--cx-border-strong)",
                borderRadius: 18,
                padding: "18px 20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    fontFamily: "Outfit, Inter, sans-serif",
                    fontWeight: 700,
                    fontSize: 16,
                    color: "var(--cx-text)",
                  }}
                >
                  {a.title}
                </div>
                <div
                  style={{
                    fontFamily: "Outfit, Inter, sans-serif",
                    fontWeight: 700,
                    fontSize: 16,
                    color: "var(--cx-text)",
                  }}
                >
                  {a.priceLabel || `$${a.price}/mo`}
                </div>
              </div>
              <div style={{ fontSize: 13, color: "var(--cx-muted)", lineHeight: 1.5 }}>
                {a.description}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--cx-muted-2)", marginTop: 8 }}>
                Applies to: {a.appliesTo}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
