import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import MarketingShell from "../../components/marketing/MarketingShell";
import PricingTiers from "../../components/marketing/PricingTiers";
import { CxButton } from "../../components/cx";

const FAQS = [
  {
    q: "Do I need a credit card to start?",
    a: "No. Start your free trial with just an email. Add payment details when you\u2019re ready to keep going.",
  },
  {
    q: "What counts as an active team member?",
    a: "Anyone who logs into the worker app or owner/admin app in a given month. Inactive users don\u2019t count toward your plan limits.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes. Move up or down any time. The upgrade applies immediately and we prorate the difference.",
  },
  {
    q: "Do I have to use MYOB?",
    a: "No. MYOB is optional on Operator and included on Command. Don\u2019t want MYOB? Stay on Start or Crew.",
  },
  {
    q: "How does SMS billing work?",
    a: "SMS credits are separate. Top up any time. You\u2019ll always see your balance and remaining sends.",
  },
  {
    q: "What\u2019s the Command Growth Pack?",
    a: "An add-on for Command customers who need more active team members or larger AI Operator volume. Pay only if you need it.",
  },
];

export default function PricingPage() {
  useEffect(() => {
    document.title = "Pricing — Churvox";
  }, []);

  return (
    <MarketingShell>
      <section
        style={{
          padding: "clamp(40px, 6vw, 80px) clamp(16px, 4vw, 28px) 24px",
          background:
            "radial-gradient(700px 460px at 90% 10%, rgba(200,255,77,0.20), transparent 60%)," +
            "linear-gradient(180deg, var(--cx-bg) 0%, var(--cx-bg-soft) 100%)",
        }}
      >
        <div
          style={{
            maxWidth: 920,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-block",
              fontSize: 12,
              fontWeight: 700,
              padding: "5px 11px",
              borderRadius: 999,
              background: "var(--cx-accent-soft)",
              color: "var(--cx-accent)",
              border: "1px solid rgba(200,255,77,0.5)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            Pricing
          </div>
          <h1
            style={{
              fontFamily: "Outfit, Inter, sans-serif",
              fontSize: "clamp(36px, 5.4vw, 64px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--cx-text)",
              margin: 0,
              lineHeight: 1.05,
            }}
          >
            Honest pricing. One Front Desk.
          </h1>
          <p
            style={{
              marginTop: 16,
              fontSize: 18,
              color: "var(--cx-muted)",
              lineHeight: 1.5,
              maxWidth: 660,
              marginInline: "auto",
            }}
          >
            Pay for active team members — not seats. NZD, ex GST. Cancel any time.
          </p>
        </div>
      </section>

      <section
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "24px clamp(16px, 4vw, 28px) clamp(40px, 6vw, 64px)",
        }}
      >
        <PricingTiers showAddons />
      </section>

      {/* Comparison strip */}
      <section
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "0 clamp(16px, 4vw, 28px) clamp(40px, 6vw, 64px)",
        }}
      >
        <div
          style={{
            background: "var(--cx-surface)",
            border: "1px solid var(--cx-border)",
            borderRadius: 24,
            padding: "clamp(22px, 3vw, 32px)",
            boxShadow: "0 6px 20px rgba(14,14,14,0.04)",
          }}
        >
          <h2
            style={{
              fontFamily: "Outfit, Inter, sans-serif",
              fontSize: 22,
              fontWeight: 700,
              margin: 0,
              color: "var(--cx-text)",
              marginBottom: 14,
            }}
          >
            What’s in every plan
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {[
              "Approval-first AI — nothing auto-sends",
              "Mobile worker app with role guards",
              "Public quote and invoice links",
              "Photos & proof from the field",
              "Audit log of every AI action",
              "Owner notification controls",
            ].map((line) => (
              <div
                key={line}
                style={{
                  fontSize: 14,
                  color: "var(--cx-text-soft)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 16,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 5,
                    background: "var(--cx-accent-soft)",
                    color: "var(--cx-accent)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 2,
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  ✓
                </span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "0 clamp(16px, 4vw, 28px) clamp(40px, 6vw, 64px)",
        }}
      >
        <h2
          style={{
            fontFamily: "Outfit, Inter, sans-serif",
            fontSize: "clamp(24px, 2.8vw, 32px)",
            fontWeight: 700,
            color: "var(--cx-text)",
            margin: 0,
            letterSpacing: "-0.02em",
            marginBottom: 22,
          }}
        >
          Pricing FAQs
        </h2>
        <div style={{ display: "grid", gap: 12 }}>
          {FAQS.map((f) => (
            <details
              key={f.q}
              style={{
                background: "var(--cx-surface)",
                border: "1px solid var(--cx-border)",
                borderRadius: 16,
                padding: "14px 18px",
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontFamily: "Outfit, Inter, sans-serif",
                  fontWeight: 700,
                  fontSize: 16,
                  color: "var(--cx-text)",
                  listStyle: "none",
                }}
              >
                {f.q}
              </summary>
              <p style={{ marginTop: 8, color: "var(--cx-muted)", fontSize: 14.5, lineHeight: 1.55 }}>
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "0 clamp(16px, 4vw, 28px) clamp(40px, 6vw, 80px)",
        }}
      >
        <div
          style={{
            background:
              "radial-gradient(700px 360px at 92% 0%, rgba(200,255,77,0.28), transparent 60%)," +
              "linear-gradient(135deg, var(--cx-surface) 0%, var(--cx-surface-2) 100%)",
            color: "var(--cx-text)",
            borderRadius: 28,
            padding: "clamp(28px, 4vw, 44px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <h3
            style={{
              fontFamily: "Outfit, Inter, sans-serif",
              fontSize: "clamp(24px, 3.2vw, 34px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: 0,
              maxWidth: 700,
              lineHeight: 1.15,
            }}
          >
            Pick a plan when you’re ready. Start free today.
          </h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/signup" style={{ textDecoration: "none" }}>
              <CxButton variant="primary" size="lg">Start free trial</CxButton>
            </Link>
            <Link to="/login" style={{ textDecoration: "none" }}>
              <CxButton variant="secondary" size="lg">Log in</CxButton>
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
