import React from "react";

/**
 * MockFrontDesk — the AI Operator Front Desk hero visual.
 * Pure CSS / text only. No external images. Uses Pass 1 tokens.
 * Shows a Work Slip card + Approval queue rows + Field & crew tile.
 */
export default function MockFrontDesk() {
  return (
    <div
      aria-hidden="true"
      className="cx-mock-frontdesk"
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 560,
        marginInline: "auto",
        padding: 18,
        borderRadius: 28,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(251,248,241,0.96) 100%)",
        border: "1px solid var(--cx-border)",
        boxShadow: "0 38px 90px rgba(14,14,14,0.14), 0 8px 18px rgba(14,14,14,0.06)",
      }}
    >
      {/* Lime glow behind */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "-40px -30px auto auto",
          width: 240,
          height: 240,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(200,255,77,0.55), rgba(200,255,77,0) 70%)",
          filter: "blur(8px)",
          zIndex: -1,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "auto auto -30px -30px",
          width: 200,
          height: 200,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(14,14,14,0.08), rgba(14,14,14,0) 70%)",
          filter: "blur(8px)",
          zIndex: -1,
        }}
      />

      {/* Header strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 6px 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: 999,
              background: "var(--cx-accent)",
              boxShadow: "0 0 0 4px rgba(200,255,77,0.25)",
            }}
          />
          <span
            style={{
              fontFamily: "Outfit, Inter, sans-serif",
              fontWeight: 700,
              fontSize: 13,
              color: "var(--cx-text)",
              letterSpacing: "0.02em",
            }}
          >
            Front Desk — Today
          </span>
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#355C00",
            background: "var(--cx-accent-soft)",
            padding: "4px 9px",
            borderRadius: 999,
            border: "1px solid rgba(200,255,77,0.5)",
          }}
        >
          AI READY
        </div>
      </div>

      {/* Ready to approve — work slip */}
      <div
        style={{
          background: "var(--cx-surface)",
          border: "1px solid var(--cx-border-strong)",
          borderLeft: "4px solid var(--cx-accent-hover)",
          borderRadius: 18,
          padding: "16px 18px",
          boxShadow: "0 4px 12px rgba(14,14,14,0.04)",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#355C00",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Ready to approve
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--cx-muted)" }}>2 min ago</span>
        </div>
        <div
          style={{
            fontFamily: "Outfit, Inter, sans-serif",
            fontWeight: 700,
            fontSize: 16,
            color: "var(--cx-text)",
            marginBottom: 4,
          }}
        >
          Send invoice — Smith Lawns, $480
        </div>
        <div style={{ fontSize: 13, color: "var(--cx-muted)", lineHeight: 1.5 }}>
          Job completed Tue. Photos attached. Description drafted from job notes.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "7px 14px",
              borderRadius: 10,
              background: "var(--cx-accent)",
              color: "var(--cx-accent-ink)",
              boxShadow: "0 4px 10px rgba(200,255,77,0.4)",
              border: "1px solid var(--cx-accent-hover)",
            }}
          >
            Approve & send
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "7px 14px",
              borderRadius: 10,
              background: "var(--cx-surface)",
              color: "var(--cx-text)",
              border: "1px solid var(--cx-border-strong)",
            }}
          >
            Review
          </span>
        </div>
      </div>

      {/* Two-col mini panels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <MiniCard
          tone="warn"
          eyebrow="Needs fixing"
          title="3 quotes missing client phone"
          sub="Tap to fill →"
        />
        <MiniCard
          tone="info"
          eyebrow="Field & crew"
          title="Mike • Site B • On the job"
          sub="Started 9:14"
        />
        <MiniCard
          tone="success"
          eyebrow="Money desk"
          title="$2,310 ready to invoice"
          sub="4 completed jobs"
        />
        <MiniCard
          tone="neutral"
          eyebrow="Audit log"
          title="All actions approved by you"
          sub="12 today"
        />
      </div>
    </div>
  );
}

function MiniCard({ eyebrow, title, sub, tone = "neutral" }) {
  const toneMap = {
    warn: { bg: "#FEF3C7", color: "#A05A04", border: "#F6D98A" },
    info: { bg: "#DBE8F4", color: "#1F4E7A", border: "#B6CFE6" },
    success: { bg: "#DCFCE7", color: "#15803D", border: "#A7E1B6" },
    neutral: { bg: "#F2EDDF", color: "#5A5A5A", border: "#E2D9C2" },
  };
  const t = toneMap[tone] || toneMap.neutral;
  return (
    <div
      style={{
        background: "var(--cx-surface)",
        border: "1px solid var(--cx-border)",
        borderRadius: 14,
        padding: "12px 14px",
      }}
    >
      <span
        style={{
          display: "inline-block",
          fontSize: 10,
          fontWeight: 700,
          color: t.color,
          background: t.bg,
          border: `1px solid ${t.border}`,
          padding: "3px 7px",
          borderRadius: 999,
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {eyebrow}
      </span>
      <div
        style={{
          fontWeight: 700,
          fontSize: 13.5,
          color: "var(--cx-text)",
          lineHeight: 1.35,
          marginBottom: 2,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--cx-muted)" }}>{sub}</div>
    </div>
  );
}
