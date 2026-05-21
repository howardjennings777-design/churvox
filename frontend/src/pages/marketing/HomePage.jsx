import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import MarketingShell from "../../components/marketing/MarketingShell";
import MockFrontDesk from "../../components/marketing/MockFrontDesk";
import PricingTiers from "../../components/marketing/PricingTiers";

/* ------------------------------ Atoms ------------------------------------ */

function Container({ children, style, className }) {
  return (
    <div
      className={className}
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "0 clamp(16px, 4vw, 36px)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function PrimaryCTA({ to, children, "data-testid": testId }) {
  return (
    <Link
      to={to}
      data-testid={testId}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "13px 22px",
        background: "var(--cx-accent)",
        color: "var(--cx-accent-ink)",
        borderRadius: 12,
        fontWeight: 800,
        fontSize: 15,
        letterSpacing: "-0.005em",
        textDecoration: "none",
        border: "1px solid var(--cx-accent)",
        boxShadow:
          "0 0 0 1px var(--cx-accent), 0 18px 40px -10px var(--cx-accent-glow), inset 0 1px 0 rgba(255,255,255,0.25)",
        transition: "transform 120ms ease, box-shadow 120ms ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
    >
      {children} <span aria-hidden="true" style={{ fontSize: 17 }}>→</span>
    </Link>
  );
}

function SecondaryCTA({ to, children, "data-testid": testId }) {
  return (
    <Link
      to={to}
      data-testid={testId}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "12px 18px",
        background: "transparent",
        color: "var(--cx-text)",
        border: "1px solid var(--cx-border)",
        borderRadius: 12,
        fontWeight: 700,
        fontSize: 14.5,
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}

function Eyebrow({ children, tone = "lime" }) {
  const map = {
    lime: { c: "#C7FF3D", bg: "rgba(199,255,61,0.10)", b: "rgba(199,255,61,0.36)" },
    dark: { c: "#111318", bg: "rgba(17,19,24,0.06)", b: "rgba(17,19,24,0.18)" },
  }[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        color: map.c,
        background: map.bg,
        border: `1px solid ${map.b}`,
        padding: "5px 11px",
        borderRadius: 6,
      }}
    >
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: map.c }} />
      {children}
    </span>
  );
}

function SectionTitle({ children, dark = false, style }) {
  return (
    <h2
      style={{
        fontFamily: "Outfit, Inter, sans-serif",
        fontSize: "clamp(30px, 4vw, 48px)",
        fontWeight: 800,
        letterSpacing: "-0.028em",
        lineHeight: 1.06,
        margin: 0,
        color: dark ? "#111318" : "var(--cx-text)",
        ...style,
      }}
    >
      {children}
    </h2>
  );
}

function SectionLead({ children, dark = false }) {
  return (
    <p
      style={{
        marginTop: 14,
        marginBottom: 0,
        fontSize: "clamp(15px, 1.4vw, 17px)",
        lineHeight: 1.55,
        color: dark ? "rgba(17,19,24,0.72)" : "var(--cx-muted)",
        maxWidth: 720,
      }}
    >
      {children}
    </p>
  );
}

/* ------------------------------ Hero ------------------------------------- */

function Hero() {
  return (
    <section
      className="cx-hero-dark"
      style={{
        position: "relative",
        overflow: "hidden",
        paddingTop: "clamp(40px, 6vw, 72px)",
        paddingBottom: "clamp(60px, 8vw, 110px)",
      }}
    >
      {/* Background grid */}
      <div
        aria-hidden="true"
        className="cx-grid-bg"
        style={{
          position: "absolute",
          inset: 0,
          maskImage:
            "radial-gradient(80% 60% at 50% 30%, #000 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(80% 60% at 50% 30%, #000 30%, transparent 80%)",
          pointerEvents: "none",
        }}
      />
      <Container style={{ position: "relative" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 36,
            alignItems: "center",
          }}
          className="cx-hero-grid"
        >
          {/* === LEFT: headline & CTAs === */}
          <div>
            <Eyebrow>AI Operator Front Desk</Eyebrow>

            <h1
              style={{
                fontFamily: "Outfit, Inter, sans-serif",
                fontSize: "clamp(40px, 6.4vw, 86px)",
                lineHeight: 1.0,
                letterSpacing: "-0.038em",
                fontWeight: 800,
                color: "var(--cx-text)",
                margin: "18px 0 0",
              }}
            >
              Churvox runs
              <br />
              the admin.{" "}
              <span
                style={{
                  background: "var(--cx-accent)",
                  color: "var(--cx-accent-ink)",
                  padding: "0 14px",
                  borderRadius: 12,
                  display: "inline-block",
                  lineHeight: 1.08,
                  boxShadow:
                    "0 0 0 1px var(--cx-accent), 0 22px 48px -10px var(--cx-accent-glow)",
                }}
              >
                You stay
              </span>
              <br />
              in control.
            </h1>

            <p
              style={{
                marginTop: 24,
                fontSize: "clamp(16px, 1.5vw, 19px)",
                lineHeight: 1.55,
                color: "var(--cx-muted)",
                maxWidth: 560,
              }}
            >
              An AI Operator Front Desk for trade businesses — preparing jobs,
              quotes, invoices, worker actions and follow-ups for owner
              approval.
            </p>

            <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 12 }}>
              <PrimaryCTA to="/signup" data-testid="hero-primary-cta">Start free</PrimaryCTA>
              <SecondaryCTA to="/pricing" data-testid="hero-secondary-cta">See pricing</SecondaryCTA>
            </div>

            {/* Trust / proof strip */}
            <div
              style={{
                marginTop: 36,
                display: "flex",
                gap: 24,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {[
                ["Approval-first", "Nothing auto-sends"],
                ["NZD pricing", "All plans ex GST"],
                ["MYOB & SMS", "Connected scaffolds"],
              ].map(([t, s]) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8, height: 8, borderRadius: 999,
                      background: "var(--cx-accent)",
                      boxShadow: "0 0 0 4px rgba(199,255,61,0.16)",
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--cx-text)" }}>{t}</div>
                    <div style={{ fontSize: 12, color: "var(--cx-muted-2)" }}>{s}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* === RIGHT: Command preview === */}
          <div style={{ position: "relative" }}>
            <MockFrontDesk />
          </div>
        </div>
      </Container>

      <style>{`
        @media (min-width: 1024px) {
          .cx-hero-grid {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr) !important;
            gap: clamp(36px, 5vw, 72px) !important;
          }
        }
      `}</style>
    </section>
  );
}

/* --------------------------- How it works -------------------------------- */

const STEPS = [
  { n: "01", t: "Work comes in", d: "Quote requests, job bookings, photos, worker updates and timesheets land in Churvox." },
  { n: "02", t: "Churvox prepares it", d: "Drafts invoices, follow-ups, assignments, reminders and daily plans from your real data." },
  { n: "03", t: "Surfaces it for approval", d: "Items appear in the Front Desk Work Slip queue with the full reasoning behind each." },
  { n: "04", t: "You approve in one tap", d: "Approve, edit, or reject. Nothing sends to a customer until you say so." },
  { n: "05", t: "Workers execute", d: "Crew sees assigned jobs, status, notes, photos and directions on a rugged mobile view." },
  { n: "06", t: "Money lands", d: "Sent invoices, payments, MYOB sync and reminders — all tracked in the Money Desk." },
];

function HowItWorks() {
  return (
    <section
      className="cx-section"
      style={{
        background: "linear-gradient(180deg, #0B0D10 0%, #0F141A 100%)",
        paddingTop: "clamp(60px, 7vw, 110px)",
        paddingBottom: "clamp(60px, 7vw, 110px)",
        position: "relative",
      }}
    >
      <Container>
        <div style={{ display: "grid", gap: 36, gridTemplateColumns: "1fr", maxWidth: 920, marginBottom: 48 }}>
          <Eyebrow>How Churvox works</Eyebrow>
          <SectionTitle>
            Six steps. The admin shrinks.{" "}
            <span style={{ color: "var(--cx-accent)" }}>You stay in control.</span>
          </SectionTitle>
          <SectionLead>
            Churvox watches the entire run of work — from the first quote
            request through to a paid invoice — and prepares everything that
            normally eats your evening.
          </SectionLead>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 0,
            background: "#1F2632",
            border: "1px solid var(--cx-border)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {STEPS.map((s) => (
            <div
              key={s.n}
              style={{
                background: "linear-gradient(180deg, #11151B 0%, #0F141A 100%)",
                padding: "26px 24px",
                position: "relative",
              }}
            >
              <span
                style={{
                  fontFamily: "Outfit, Inter, sans-serif",
                  fontSize: 36,
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  color: "rgba(199,255,61,0.85)",
                }}
              >
                {s.n}
              </span>
              <h3
                style={{
                  margin: "12px 0 8px",
                  fontFamily: "Outfit, Inter, sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "-0.015em",
                  color: "var(--cx-text)",
                }}
              >
                {s.t}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  color: "var(--cx-muted)",
                }}
              >
                {s.d}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* --------------------- What Churvox prepares ----------------------------- */

const PREP_GROUPS = [
  {
    eyebrow: "Job admin",
    items: ["Draft invoice from completed job", "Invoice description from worker notes, photos & service type", "Convert quote → job → invoice in one approval"],
  },
  {
    eyebrow: "Worker actions",
    items: ["Suggest worker for unassigned jobs (workload, region, skill, schedule)", "Flag schedule conflicts before they cost you", "Daily run sheet per worker"],
  },
  {
    eyebrow: "Customer follow-ups",
    items: ["Quote follow-up message draft", "Invoice reminder message draft", "Customer status update drafts in your tone"],
  },
  {
    eyebrow: "Money & admin",
    items: ["Today's plan: jobs, money ready, overdue, follow-ups", "Payroll/time review summary before each pay run", "Missing data flags (price, client phone, address)"],
  },
];

function WhatChurvoxPrepares() {
  return (
    <section
      className="cx-editorial"
      style={{
        paddingTop: "clamp(60px, 8vw, 120px)",
        paddingBottom: "clamp(60px, 8vw, 120px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Container>
        <div style={{ maxWidth: 900, marginBottom: 56 }}>
          <Eyebrow tone="dark">What Churvox prepares</Eyebrow>
          <SectionTitle dark style={{ marginTop: 18 }}>
            Drafts, decisions, and follow-ups — ready before you ask.
          </SectionTitle>
          <SectionLead dark>
            Every action in the queue comes with the full reasoning behind it.
            One tap to approve. Nothing ships until you say so.
          </SectionLead>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          {PREP_GROUPS.map((g) => (
            <div
              key={g.eyebrow}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2DCCB",
                borderRadius: 14,
                padding: "26px 24px",
                boxShadow: "0 1px 0 rgba(0,0,0,0.04), 0 18px 48px -24px rgba(17,19,24,0.18)",
              }}
            >
              <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "#111318", background: "rgba(17,19,24,0.06)", padding: "4px 10px", borderRadius: 6, marginBottom: 14 }}>
                {g.eyebrow}
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
                {g.items.map((it) => (
                  <li key={it} style={{ display: "flex", gap: 10, fontSize: 14, color: "#111318", lineHeight: 1.5 }}>
                    <span aria-hidden="true" style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 6, background: "#C7FF3D", color: "#111318", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11, marginTop: 1, boxShadow: "0 1px 0 rgba(0,0,0,0.06)" }}>✓</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ----------------------- Owner approves section -------------------------- */

function OwnerApproves() {
  return (
    <section
      className="cx-section"
      style={{
        paddingTop: "clamp(70px, 9vw, 130px)",
        paddingBottom: "clamp(70px, 9vw, 130px)",
        background:
          "radial-gradient(900px 500px at 80% 20%, rgba(199,255,61,0.10), transparent 60%)," +
          "radial-gradient(700px 400px at 10% 90%, rgba(111,181,255,0.06), transparent 60%)," +
          "#0B0D10",
        position: "relative",
      }}
    >
      <Container>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 30,
            alignItems: "center",
          }}
          className="cx-owner-grid"
        >
          <div>
            <Eyebrow>Owner approves. Churvox executes.</Eyebrow>
            <SectionTitle style={{ marginTop: 18 }}>
              The AI does the admin.
              <br />
              <span style={{ color: "var(--cx-accent)" }}>The owner stays in command.</span>
            </SectionTitle>
            <SectionLead>
              Churvox never auto-sends customer messages. Never charges. Never
              touches MYOB without your tap. Workers see only what they need —
              no pricing, no invoices, no payroll. You stay sovereign over the
              business.
            </SectionLead>

            <ul style={{ marginTop: 28, padding: 0, listStyle: "none", display: "grid", gap: 12, maxWidth: 560 }}>
              {[
                "Approval-first AI — every action is a draft until you tap Approve",
                "Worker app strips pricing, invoices, quotes and payroll",
                "Full audit of approvals, edits and rejects",
                "MYOB & SMS connect when you're ready, not before",
              ].map((line) => (
                <li key={line} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 14.5, color: "var(--cx-text-soft)", lineHeight: 1.5 }}>
                  <span aria-hidden="true" style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 999, border: "1px solid rgba(199,255,61,0.45)", background: "rgba(199,255,61,0.10)", color: "var(--cx-accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>✓</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: secondary command panel */}
          <div
            style={{
              background: "linear-gradient(180deg, #11151B 0%, #0F141A 100%)",
              border: "1px solid var(--cx-border)",
              borderRadius: 14,
              padding: 22,
              boxShadow: "0 30px 80px rgba(0,0,0,0.45), 0 6px 12px rgba(0,0,0,0.35)",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "#C7FF3D", boxShadow: "0 0 0 3px rgba(199,255,61,0.22)" }} aria-hidden="true" />
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cx-accent)" }}>Work Slip · Ready to approve</span>
            </div>
            <h3 style={{ margin: 0, fontFamily: "Outfit, Inter, sans-serif", fontSize: 20, color: "var(--cx-text)", fontWeight: 700, letterSpacing: "-0.018em" }}>
              Draft invoice — Tree pruning
            </h3>
            <p style={{ margin: "6px 0 16px", fontSize: 13.5, color: "var(--cx-muted)" }}>
              $480 + 15% GST · Acme Lawns Co · 12 Mason St
            </p>

            <div style={{ background: "rgba(199,255,61,0.06)", border: "1px solid rgba(199,255,61,0.24)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--cx-accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                Why Churvox surfaced this
              </div>
              <div style={{ fontSize: 13, color: "var(--cx-text-soft)", lineHeight: 1.5 }}>
                Job completed with worker notes attached. Subtotal pulled from
                quoted price. GST applied per business setting.
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 16 }}>
              {[
                ["Customer", "Acme Lawns Co"],
                ["Job", "Tree pruning"],
                ["Time on site", "3.5h"],
                ["Photos", "4 attached"],
              ].map(([k, v]) => (
                <div key={k} style={{ background: "#0F141A", border: "1px solid #1F2632", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: "var(--cx-muted-2)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>{k}</div>
                  <div style={{ fontSize: 13, color: "var(--cx-text)", fontWeight: 600, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ flex: 1, textAlign: "center", padding: "11px 14px", background: "var(--cx-accent)", color: "var(--cx-accent-ink)", borderRadius: 10, fontWeight: 800, fontSize: 13.5, boxShadow: "0 0 0 1px var(--cx-accent), 0 14px 30px -10px rgba(199,255,61,0.4)" }}>
                Approve &amp; send
              </span>
              <span style={{ padding: "11px 14px", border: "1px solid var(--cx-border)", borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: "var(--cx-muted)" }}>
                Reject
              </span>
            </div>
          </div>
        </div>
      </Container>

      <style>{`
        @media (min-width: 980px) {
          .cx-owner-grid { grid-template-columns: 1.1fr 1fr !important; gap: clamp(36px, 5vw, 64px) !important; }
        }
      `}</style>
    </section>
  );
}

/* ---------------------------- Pricing preview ---------------------------- */

function PricingSection() {
  return (
    <section
      className="cx-section"
      id="pricing"
      style={{
        paddingTop: "clamp(70px, 9vw, 130px)",
        paddingBottom: "clamp(70px, 9vw, 130px)",
        background:
          "radial-gradient(700px 460px at 50% 0%, rgba(199,255,61,0.06), transparent 60%), #0B0D10",
        position: "relative",
      }}
    >
      <Container>
        <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 48px" }}>
          <div style={{ display: "inline-flex", marginBottom: 18 }}><Eyebrow>Pricing · NZD ex GST</Eyebrow></div>
          <SectionTitle style={{ textAlign: "center" }}>
            Honest pricing for serious operators.
          </SectionTitle>
          <SectionLead>
            <span style={{ display: "block", textAlign: "center", marginInline: "auto" }}>
              Plans scale with your crew. Most owners start on Operator.
              MYOB included on Command.
            </span>
          </SectionLead>
        </div>
        <PricingTiers />
      </Container>
    </section>
  );
}

/* -------------------------- Final CTA section ---------------------------- */

function FinalCTA() {
  return (
    <section
      style={{
        paddingTop: "clamp(60px, 8vw, 120px)",
        paddingBottom: "clamp(60px, 8vw, 120px)",
        background: "#0B0D10",
      }}
    >
      <Container>
        <div
          style={{
            background:
              "radial-gradient(700px 360px at 90% 0%, rgba(199,255,61,0.16), transparent 60%)," +
              "linear-gradient(135deg, #0F141A 0%, #11151B 100%)",
            border: "1px solid var(--cx-border)",
            borderRadius: 18,
            padding: "clamp(40px, 5vw, 72px)",
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 24,
            alignItems: "center",
            boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          }}
          className="cx-final-grid"
        >
          <div>
            <Eyebrow>Start today</Eyebrow>
            <h2
              style={{
                margin: "16px 0 12px",
                fontFamily: "Outfit, Inter, sans-serif",
                fontSize: "clamp(32px, 4.4vw, 56px)",
                fontWeight: 800,
                letterSpacing: "-0.028em",
                color: "var(--cx-text)",
                lineHeight: 1.05,
              }}
            >
              Hand the admin to Churvox.{" "}
              <span style={{ color: "var(--cx-accent)" }}>Keep the control.</span>
            </h2>
            <p style={{ margin: 0, fontSize: 16, color: "var(--cx-muted)", maxWidth: 520, lineHeight: 1.55 }}>
              Start free. Add your business in minutes. Approve your first AI-prepared invoice the same day.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <PrimaryCTA to="/signup" data-testid="final-cta-primary">Start free</PrimaryCTA>
            <SecondaryCTA to="/login" data-testid="final-cta-secondary">Sign in</SecondaryCTA>
          </div>
        </div>
      </Container>

      <style>{`
        @media (min-width: 920px) {
          .cx-final-grid { grid-template-columns: 1.4fr 1fr !important; }
        }
      `}</style>
    </section>
  );
}

/* ------------------------------ Page ------------------------------------- */

export default function HomePage() {
  useEffect(() => {
    document.title = "Churvox — AI Operator Front Desk";
  }, []);
  return (
    <MarketingShell>
      <Hero />
      <HowItWorks />
      <WhatChurvoxPrepares />
      <OwnerApproves />
      <PricingSection />
      <FinalCTA />
    </MarketingShell>
  );
}
