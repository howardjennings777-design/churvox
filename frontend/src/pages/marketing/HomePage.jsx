import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import MarketingShell from "../../components/marketing/MarketingShell";
import MockFrontDesk from "../../components/marketing/MockFrontDesk";
import PricingTiers from "../../components/marketing/PricingTiers";
import { CxButton } from "../../components/cx";

function Section({ id, children, style }) {
  return (
    <section
      id={id}
      style={{
        maxWidth: 1240,
        margin: "0 auto",
        padding: "clamp(40px, 6vw, 80px) clamp(16px, 4vw, 28px)",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function SectionHead({ eyebrow, title, sub, align = "left" }) {
  return (
    <div style={{ marginBottom: 36, textAlign: align, maxWidth: align === "center" ? 760 : undefined, marginInline: align === "center" ? "auto" : undefined }}>
      {eyebrow ? (
        <div
          style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 700,
            padding: "5px 11px",
            borderRadius: 999,
            background: "var(--cx-accent-soft)",
            color: "#355C00",
            border: "1px solid rgba(200,255,77,0.5)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          {eyebrow}
        </div>
      ) : null}
      <h2
        style={{
          fontFamily: "Outfit, Inter, sans-serif",
          fontSize: "clamp(28px, 3.6vw, 42px)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "var(--cx-text)",
          margin: 0,
          lineHeight: 1.08,
        }}
      >
        {title}
      </h2>
      {sub ? (
        <p
          style={{
            marginTop: 14,
            fontSize: 17,
            color: "var(--cx-muted)",
            lineHeight: 1.5,
            maxWidth: 660,
            marginInline: align === "center" ? "auto" : undefined,
          }}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}

const WORKFLOW = [
  {
    n: "01",
    title: "Work comes in",
    body: "Calls, messages, jobs in the field — it all lands in your Front Desk in one place.",
  },
  {
    n: "02",
    title: "Churvox checks what\u2019s missing",
    body: "Missing phone, missing address, no description, no photo — flagged before it becomes a problem.",
  },
  {
    n: "03",
    title: "Churvox prepares the admin",
    body: "Invoice descriptions, quote follow-ups, dispatch suggestions, client updates — drafted, never sent.",
  },
  {
    n: "04",
    title: "You approve",
    body: "One tap. Owner-first, approval-first. Nothing goes out, nothing changes payroll or MYOB without you.",
  },
  {
    n: "05",
    title: "Worker gets the right info",
    body: "Crew sees the job, the address, the notes, the photos — nothing else. No pricing, no admin noise.",
  },
  {
    n: "06",
    title: "Client gets clean documents",
    body: "Branded quotes, invoices, and updates. Public Pay Now link. Everything tracked in the audit log.",
  },
];

const FEATURES = [
  { title: "Jobs", body: "Create, dispatch, track. Status colours that mean something." },
  { title: "Clients", body: "One clean record. CSV import. Linked jobs, quotes, invoices." },
  { title: "Quotes", body: "Drafted by AI, approved by you, sent with a public link." },
  { title: "Invoices", body: "Real templates. Pay Now link. Description prefilled from the job." },
  { title: "Team & workers", body: "Owner, manager, worker, office admin, payroll — each sees only what they should." },
  { title: "Dispatch", body: "AI suggests who to send and explains why. You approve." },
  { title: "Photos & proof", body: "Workers upload from the field. Owner reviews in-page. No new tabs." },
  { title: "Time tracking", body: "Simple start/pause/complete. Timesheets feed payroll workspace." },
  { title: "AI Approval queue", body: "Every AI action explained, batched, and approval-first." },
  { title: "MYOB sync", body: "Optional. Approval-first. Never auto-syncs without you." },
  { title: "Payroll workspace", body: "Pay periods, approved hours, exports. Locked-down access." },
  { title: "SMS reminders", body: "Top-up credits, optional. No active sends without owner approval." },
];

const TRADES = [
  "Plumbing",
  "Electrical",
  "Lawn care",
  "Cleaning",
  "Handyman",
  "Painting",
  "Pest control",
  "Landscaping",
  "Property maintenance",
  "Building & renovation",
  "HVAC",
  "Locksmith",
];

export default function HomePage() {
  useEffect(() => {
    document.title = "Churvox — Churvox does the admin. You approve.";
  }, []);

  return (
    <MarketingShell>
      {/* ============================= HERO ============================= */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "clamp(40px, 6vw, 92px) clamp(16px, 4vw, 28px) clamp(48px, 6vw, 88px)",
          background:
            "radial-gradient(900px 600px at 88% 12%, rgba(200,255,77,0.28), transparent 60%)," +
            "radial-gradient(700px 540px at 8% 90%, rgba(14,14,14,0.05), transparent 60%)," +
            "linear-gradient(180deg, #F7F3EA 0%, #FBF8F1 70%, #F7F3EA 100%)",
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 40,
            alignItems: "center",
          }}
          className="cx-hero-grid"
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                borderRadius: 999,
                background: "var(--cx-surface)",
                border: "1px solid var(--cx-border-strong)",
                fontSize: 12.5,
                fontWeight: 700,
                color: "var(--cx-text)",
                boxShadow: "0 4px 12px rgba(14,14,14,0.05)",
                marginBottom: 22,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: "var(--cx-accent)",
                  boxShadow: "0 0 0 3px rgba(200,255,77,0.35)",
                }}
              />
              AI OPERATOR FRONT DESK • APPROVAL-FIRST
            </div>

            <h1
              style={{
                fontFamily: "Outfit, Inter, sans-serif",
                fontSize: "clamp(40px, 6.4vw, 84px)",
                lineHeight: 1.0,
                letterSpacing: "-0.035em",
                fontWeight: 800,
                color: "var(--cx-text)",
                margin: 0,
              }}
            >
              Churvox does the
              <br />
              admin.{" "}
              <span
                style={{
                  background: "var(--cx-accent)",
                  padding: "0 12px",
                  borderRadius: 14,
                  boxShadow: "0 8px 22px rgba(200,255,77,0.45)",
                  display: "inline-block",
                  lineHeight: 1.08,
                }}
              >
                You approve.
              </span>
            </h1>

            <p
              style={{
                marginTop: 22,
                fontSize: "clamp(16px, 1.6vw, 19px)",
                color: "var(--cx-muted)",
                lineHeight: 1.55,
                maxWidth: 560,
              }}
            >
              An AI Operator Front Desk for trade and service businesses. Jobs,
              clients, quotes, invoices, payroll, MYOB — Churvox prepares the
              admin and surfaces what needs doing. You stay in control.
            </p>

            <div style={{ marginTop: 30, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link to="/signup" style={{ textDecoration: "none" }}>
                <CxButton variant="primary" size="lg">
                  Start free trial
                </CxButton>
              </Link>
              <Link to="/pricing" style={{ textDecoration: "none" }}>
                <CxButton variant="secondary" size="lg">
                  See pricing
                </CxButton>
              </Link>
              <Link
                to="/login"
                style={{
                  alignSelf: "center",
                  marginLeft: 4,
                  fontSize: 14.5,
                  fontWeight: 600,
                  color: "var(--cx-text)",
                  textDecoration: "underline",
                  textUnderlineOffset: 4,
                }}
              >
                Log in
              </Link>
            </div>

            <div
              style={{
                marginTop: 28,
                display: "flex",
                gap: 22,
                flexWrap: "wrap",
                fontSize: 13.5,
                color: "var(--cx-muted)",
              }}
            >
              <ChipTick>No card to start</ChipTick>
              <ChipTick>Mobile-first</ChipTick>
              <ChipTick>Approval-first AI</ChipTick>
              <ChipTick>MYOB option</ChipTick>
            </div>
          </div>

          <div className="cx-hero-mock-wrap">
            <MockFrontDesk />
          </div>
        </div>

        <style>{`
          @media (min-width: 980px) {
            .cx-hero-grid { grid-template-columns: 1.05fr 0.95fr !important; gap: 60px !important; }
          }
        `}</style>
      </section>

      {/* ===================== WORKFLOW (6 steps) ===================== */}
      <Section id="workflow">
        <SectionHead
          eyebrow="How it works"
          title="Work comes in. Churvox prepares the admin. You approve."
          sub="A practical six-step loop that runs your trade or service business without losing the owner-in-control feel."
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {WORKFLOW.map((w) => (
            <div
              key={w.n}
              style={{
                background: "var(--cx-surface)",
                border: "1px solid var(--cx-border)",
                borderRadius: 20,
                padding: "22px 22px 24px",
                boxShadow: "0 4px 14px rgba(14,14,14,0.04)",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "var(--cx-accent-soft)",
                  color: "#355C00",
                  fontFamily: "Outfit, Inter, sans-serif",
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: "0.05em",
                  marginBottom: 14,
                  border: "1px solid rgba(200,255,77,0.45)",
                }}
              >
                {w.n}
              </div>
              <div
                style={{
                  fontFamily: "Outfit, Inter, sans-serif",
                  fontWeight: 700,
                  fontSize: 18,
                  color: "var(--cx-text)",
                  marginBottom: 8,
                  letterSpacing: "-0.01em",
                }}
              >
                {w.title}
              </div>
              <p style={{ margin: 0, fontSize: 14.5, color: "var(--cx-muted)", lineHeight: 1.55 }}>
                {w.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ===================== TRADES SUPPORTED ===================== */}
      <Section id="trades" style={{ paddingTop: 0 }}>
        <div
          style={{
            background: "linear-gradient(135deg, #FFFFFF 0%, #FBF8F1 100%)",
            border: "1px solid var(--cx-border)",
            borderRadius: 28,
            padding: "clamp(28px, 4vw, 48px)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 32,
              alignItems: "center",
            }}
            className="cx-trades-grid"
          >
            <div>
              <div
                style={{
                  display: "inline-block",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "5px 11px",
                  borderRadius: 999,
                  background: "var(--cx-accent-soft)",
                  color: "#355C00",
                  border: "1px solid rgba(200,255,77,0.5)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 14,
                }}
              >
                Built for trades & service
              </div>
              <h3
                style={{
                  fontFamily: "Outfit, Inter, sans-serif",
                  fontSize: "clamp(24px, 2.6vw, 32px)",
                  fontWeight: 700,
                  margin: 0,
                  letterSpacing: "-0.015em",
                  color: "var(--cx-text)",
                }}
              >
                Plumbing, lawn care, cleaning, painting, electrical, pest control — if you run jobs and crew, Churvox fits.
              </h3>
              <p style={{ marginTop: 12, color: "var(--cx-muted)", fontSize: 15, lineHeight: 1.55 }}>
                Designed for owner-operators and growing crews. No spreadsheets. No five-tool stack. One Front Desk.
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {TRADES.map((t) => (
                <span
                  key={t}
                  style={{
                    padding: "9px 14px",
                    borderRadius: 999,
                    background: "var(--cx-surface)",
                    border: "1px solid var(--cx-border-strong)",
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "var(--cx-text-soft)",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <style>{`
            @media (min-width: 880px) { .cx-trades-grid { grid-template-columns: 0.95fr 1.05fr !important; gap: 48px !important; } }
          `}</style>
        </div>
      </Section>

      {/* ===================== FEATURES GRID ===================== */}
      <Section id="features">
        <SectionHead
          eyebrow="What you get"
          title="One Front Desk for everything that runs your business."
          sub="Each piece is designed to feel calm, mobile-first, and approval-first — not a noisy SaaS dashboard."
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: "var(--cx-surface)",
                border: "1px solid var(--cx-border)",
                borderRadius: 18,
                padding: "20px 20px 22px",
                boxShadow: "0 2px 8px rgba(14,14,14,0.03)",
                transition: "transform 160ms ease, box-shadow 160ms ease",
              }}
            >
              <div
                style={{
                  fontFamily: "Outfit, Inter, sans-serif",
                  fontWeight: 700,
                  fontSize: 16,
                  marginBottom: 6,
                  color: "var(--cx-text)",
                }}
              >
                {f.title}
              </div>
              <p style={{ margin: 0, fontSize: 13.8, color: "var(--cx-muted)", lineHeight: 1.5 }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 26, textAlign: "center" }}>
          <Link to="/features" style={{ textDecoration: "none" }}>
            <CxButton variant="secondary" size="md">
              See features in detail →
            </CxButton>
          </Link>
        </div>
      </Section>

      {/* ===================== APPROVAL-FIRST PROMISE ===================== */}
      <Section id="approval-first" style={{ paddingTop: 0 }}>
        <div
          style={{
            background:
              "radial-gradient(800px 460px at 88% 0%, rgba(200,255,77,0.25), transparent 60%)," +
              "linear-gradient(135deg, #0E0E0E 0%, #1A1A1A 100%)",
            color: "#FFFFFF",
            borderRadius: 28,
            padding: "clamp(34px, 5vw, 58px)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "inline-block",
              fontSize: 12,
              fontWeight: 700,
              padding: "5px 11px",
              borderRadius: 999,
              background: "var(--cx-accent)",
              color: "var(--cx-accent-ink)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            Approval-first AI
          </div>
          <h3
            style={{
              fontFamily: "Outfit, Inter, sans-serif",
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              maxWidth: 860,
              margin: 0,
              lineHeight: 1.1,
              color: "#FFFFFF",
            }}
          >
            Churvox never auto-sends, auto-charges, auto-syncs MYOB, or changes payroll. Ever.
          </h3>
          <p
            style={{
              marginTop: 16,
              fontSize: 16,
              color: "rgba(255,255,255,0.78)",
              lineHeight: 1.55,
              maxWidth: 760,
            }}
          >
            Every AI action is drafted, batched into an approval queue, and explained.
            You decide what goes out. You decide what gets pushed to your accounting.
            That’s the deal.
          </p>
          <div style={{ marginTop: 26 }}>
            <Link to="/signup" style={{ textDecoration: "none" }}>
              <CxButton variant="primary" size="lg">
                Try the Front Desk
              </CxButton>
            </Link>
          </div>
        </div>
      </Section>

      {/* ===================== PRICING ===================== */}
      <Section id="pricing">
        <SectionHead
          eyebrow="Pricing"
          title="One plan per stage of your business."
          sub="Active team members — not seats. Cancel any time. NZD, ex GST."
          align="center"
        />
        <PricingTiers showAddons />
      </Section>

      {/* ===================== FINAL CTA ===================== */}
      <Section id="cta" style={{ paddingTop: 0, paddingBottom: 70 }}>
        <div
          style={{
            background: "linear-gradient(135deg, #FFFFFF 0%, #FBF8F1 100%)",
            border: "1px solid var(--cx-border)",
            borderRadius: 28,
            padding: "clamp(34px, 5vw, 56px)",
            textAlign: "center",
            boxShadow: "0 14px 40px rgba(14,14,14,0.06)",
          }}
        >
          <h3
            style={{
              fontFamily: "Outfit, Inter, sans-serif",
              fontSize: "clamp(28px, 3.8vw, 44px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: 0,
              color: "var(--cx-text)",
              lineHeight: 1.1,
            }}
          >
            Yep, this runs my business.
          </h3>
          <p
            style={{
              marginTop: 14,
              fontSize: 17,
              color: "var(--cx-muted)",
              maxWidth: 600,
              marginInline: "auto",
              lineHeight: 1.5,
            }}
          >
            Start free, try the Front Desk on a real job, then decide. No card to start.
          </p>
          <div
            style={{
              marginTop: 24,
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link to="/signup" style={{ textDecoration: "none" }}>
              <CxButton variant="primary" size="lg">
                Start free trial
              </CxButton>
            </Link>
            <Link to="/pricing" style={{ textDecoration: "none" }}>
              <CxButton variant="secondary" size="lg">
                See pricing
              </CxButton>
            </Link>
          </div>
        </div>
      </Section>
    </MarketingShell>
  );
}

function ChipTick({ children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          background: "var(--cx-accent-soft)",
          color: "#355C00",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 800,
        }}
        aria-hidden="true"
      >
        ✓
      </span>
      {children}
    </span>
  );
}
