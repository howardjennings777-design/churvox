import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import MarketingShell from "../../components/marketing/MarketingShell";
import { CxButton } from "../../components/cx";

const SECTIONS = [
  {
    id: "front-desk",
    eyebrow: "AI Operator Front Desk",
    title: "One screen that shows what needs doing.",
    body:
      "Four zones — Ready to approve, Needs fixing, Field & crew, Money desk. Real data, calm cards, no noisy SaaS dashboard. Tap a Work Slip to open it in-page. No new tabs, no losing your spot.",
    bullets: [
      "Real jobs, clients, quotes, invoices, proof",
      "AI explains why each item is surfaced",
      "Approval queue with one-tap actions",
      "Owner-first — nothing auto-sends",
    ],
  },
  {
    id: "jobs",
    eyebrow: "Jobs",
    title: "Schedule, dispatch, and finish jobs cleanly.",
    body:
      "Create a job from a client, assign a worker, track status in real-time. Job conflict warnings stop you double-booking. Status colours mean something.",
    bullets: [
      "Completed • In progress • Paused • Assigned • Cancelled",
      "Photos & proof from the field",
      "Pricing visible to owner/admin only — workers never see it",
      "Open job detail in-page, never lose context",
    ],
  },
  {
    id: "clients",
    eyebrow: "Clients",
    title: "One clean client record per business.",
    body:
      "CSV import. Linked jobs, quotes, invoices. Missing phone or email flagged before it bites you on a follow-up.",
    bullets: [
      "Quick-add and edit in popups",
      "Missing-info badges so AI can prep work",
      "Related history in one panel",
    ],
  },
  {
    id: "quotes",
    eyebrow: "Quotes",
    title: "Drafted by AI, approved by you, sent with a public link.",
    body:
      "AI drafts the quote description from job context. You review and send. Clients accept or decline through a public preview link.",
    bullets: [
      "Draft • Send • Accept / Decline",
      "Public preview link for the client",
      "Follow-up drafting — always owner-approved",
    ],
  },
  {
    id: "invoices",
    eyebrow: "Invoices",
    title: "Real invoice templates with Pay Now built in.",
    body:
      "AI suggests the description from completed job notes and pricing. You approve. The client opens the invoice on a clean public page and pays in one tap.",
    bullets: [
      "Branded invoice template",
      "Public Pay Now link",
      "MYOB push — only on your approval",
      "Audit log of every send and edit",
    ],
  },
  {
    id: "team",
    eyebrow: "Team & workers",
    title: "Roles that mean something.",
    body:
      "Owner, Manager, Worker, Office Admin, Payroll — each role sees only what they should. Workers don\u2019t see pricing. Payroll doesn\u2019t see job editing. Owner sees everything.",
    bullets: [
      "Worker app is simple and locked-down",
      "Payroll workspace separate from owner billing",
      "Invite by email, role on assignment",
    ],
  },
  {
    id: "workers",
    eyebrow: "Worker app",
    title: "The crew app workers will actually use.",
    body:
      "Same Churvox theme, simplified. Workers see their assigned jobs, start/pause/complete, upload photos, add notes. No pricing, no admin noise, no plans page.",
    bullets: [
      "Mobile-first big tap targets",
      "Photos and notes from the field",
      "Time tracking with start/pause/complete",
      "Worker never sees owner-only data",
    ],
  },
  {
    id: "dispatch",
    eyebrow: "Dispatch",
    title: "AI suggests who to send — and explains why.",
    body:
      "Unassigned jobs surface in the dispatch view with worker workload and travel-time hints. Conflict warnings stop double-bookings.",
    bullets: [
      "Owner-approved assignment",
      "Conflict warnings",
      "Worker availability at a glance",
    ],
  },
  {
    id: "proof",
    eyebrow: "Photos & proof",
    title: "Proof that lives in-page — never a new tab.",
    body:
      "Workers upload from the field. Owner reviews in a lightbox right inside the dashboard with the related job and client one tap away.",
    bullets: [
      "In-page lightbox — no new tabs",
      "Linked job and client context",
      "Safe review — no auto-send to client",
    ],
  },
  {
    id: "payroll",
    eyebrow: "Payroll workspace",
    title: "Pay periods, approved hours, exports. No surprises.",
    body:
      "Built for handoff and export to your accountant. Payroll-role access is locked-down and never touches owner billing or MYOB settings.",
    bullets: [
      "Approved hours from time tracking",
      "Pay period summaries",
      "Exports for handoff — no bank automation",
    ],
  },
  {
    id: "approval-queue",
    eyebrow: "AI Approval queue",
    title: "Every AI action explained, batched, approval-first.",
    body:
      "AI never auto-sends customer messages, never charges, never auto-syncs MYOB, never edits payroll. It drafts. You approve. That\u2019s the deal.",
    bullets: [
      "Approval-first by default",
      "Optional auto-send categories (you choose)",
      "Quiet hours and message limits per client",
      "Full audit log",
    ],
  },
  {
    id: "myob",
    eyebrow: "MYOB sync",
    title: "Approval-first MYOB — never auto-syncs.",
    body:
      "Optional add-on on Operator and included on Command. Push approved invoices and contacts to MYOB. Nothing leaves Churvox without your sign-off.",
    bullets: [
      "Per-record push (no silent sync)",
      "Setup-required state until connected",
      "Owner-only configuration",
    ],
  },
  {
    id: "sms",
    eyebrow: "SMS reminders",
    title: "Optional SMS, owner-approved, top up as needed.",
    body:
      "Top-up credits when you need them. Drafts go through the approval queue. No active sends without owner approval.",
    bullets: [
      "Credit packs from $10",
      "Quiet hours and per-client message limits",
      "Setup-required state when not configured",
    ],
  },
  {
    id: "service",
    eyebrow: "Service businesses",
    title: "Not just trades.",
    body:
      "Lawn care, cleaning, property maintenance, pest control — any business that books, dispatches, and invoices. Same Front Desk.",
    bullets: [],
  },
  {
    id: "trades",
    eyebrow: "Trades",
    title: "Built with tradies in mind.",
    body:
      "Plumbing, electrical, painting, handyman, building, HVAC, landscaping. Pricing visible only to owners and admins. Crew app stays simple.",
    bullets: [],
  },
];

export default function FeaturesPage() {
  useEffect(() => {
    document.title = "Features — Churvox";
  }, []);

  return (
    <MarketingShell>
      <section
        style={{
          padding: "clamp(40px, 6vw, 80px) clamp(16px, 4vw, 28px) 32px",
          background:
            "radial-gradient(800px 480px at 92% 12%, rgba(200,255,77,0.22), transparent 60%)," +
            "linear-gradient(180deg, var(--cx-bg) 0%, var(--cx-bg-soft) 100%)",
        }}
      >
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
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
            Features
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
            Everything Churvox does, one Front Desk.
          </h1>
          <p
            style={{
              marginTop: 16,
              fontSize: 18,
              color: "var(--cx-muted)",
              lineHeight: 1.5,
              maxWidth: 660,
            }}
          >
            Calm, mobile-first, approval-first. Each surface designed so you — the owner — stay in control while AI does the admin.
          </p>
          <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/signup" style={{ textDecoration: "none" }}>
              <CxButton variant="primary" size="lg">Start free trial</CxButton>
            </Link>
            <Link to="/pricing" style={{ textDecoration: "none" }}>
              <CxButton variant="secondary" size="lg">See pricing</CxButton>
            </Link>
          </div>
        </div>
      </section>

      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "clamp(36px, 5vw, 60px) clamp(16px, 4vw, 28px)",
          display: "grid",
          gap: 20,
        }}
      >
        {SECTIONS.map((s, i) => (
          <article
            key={s.id}
            id={s.id}
            style={{
              background:
                i % 2 === 0 ? "var(--cx-surface)" : "linear-gradient(135deg, var(--cx-surface) 0%, var(--cx-surface-2) 100%)",
              border: "1px solid var(--cx-border)",
              borderRadius: 24,
              padding: "clamp(22px, 3.5vw, 38px)",
              boxShadow: "0 6px 18px rgba(14,14,14,0.04)",
            }}
          >
            <div
              style={{
                display: "inline-block",
                fontSize: 11.5,
                fontWeight: 700,
                padding: "4px 9px",
                borderRadius: 999,
                background: "var(--cx-accent-soft)",
                color: "var(--cx-accent)",
                border: "1px solid rgba(200,255,77,0.45)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              {s.eyebrow}
            </div>
            <h2
              style={{
                fontFamily: "Outfit, Inter, sans-serif",
                fontSize: "clamp(22px, 2.6vw, 30px)",
                fontWeight: 700,
                color: "var(--cx-text)",
                margin: 0,
                letterSpacing: "-0.015em",
                lineHeight: 1.15,
              }}
            >
              {s.title}
            </h2>
            <p
              style={{
                marginTop: 12,
                fontSize: 15.5,
                color: "var(--cx-muted)",
                lineHeight: 1.55,
                maxWidth: 780,
              }}
            >
              {s.body}
            </p>
            {s.bullets && s.bullets.length ? (
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "16px 0 0",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 8,
                }}
              >
                {s.bullets.map((b) => (
                  <li
                    key={b}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      fontSize: 13.5,
                      color: "var(--cx-text-soft)",
                      lineHeight: 1.5,
                    }}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        minWidth: 16,
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
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </section>

      {/* Final CTA */}
      <section
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "0 clamp(16px, 4vw, 28px) clamp(40px, 6vw, 80px)",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, var(--cx-surface) 0%, var(--cx-surface-2) 100%)",
            border: "1px solid var(--cx-border)",
            borderRadius: 28,
            padding: "clamp(30px, 4vw, 48px)",
            textAlign: "center",
          }}
        >
          <h3
            style={{
              fontFamily: "Outfit, Inter, sans-serif",
              fontSize: "clamp(26px, 3.4vw, 38px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: 0,
              color: "var(--cx-text)",
              lineHeight: 1.1,
            }}
          >
            Ready to put the admin on autopilot?
          </h3>
          <p style={{ marginTop: 12, color: "var(--cx-muted)", fontSize: 16, lineHeight: 1.55, maxWidth: 560, marginInline: "auto" }}>
            Try Churvox on a real job. No card to start.
          </p>
          <div style={{ marginTop: 22, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/signup" style={{ textDecoration: "none" }}>
              <CxButton variant="primary" size="lg">Start free trial</CxButton>
            </Link>
            <Link to="/pricing" style={{ textDecoration: "none" }}>
              <CxButton variant="secondary" size="lg">See pricing</CxButton>
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
