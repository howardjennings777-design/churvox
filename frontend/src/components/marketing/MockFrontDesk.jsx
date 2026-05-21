import React from "react";

/**
 * MockFrontDesk — Industrial AI Command Desk product preview.
 *
 * A layered, frame-and-status-bar interface mock that reads as a real Churvox
 * command surface (not a cartoon card). Used in the homepage hero.
 */
export default function MockFrontDesk() {
  return (
    <div
      data-testid="mock-front-desk"
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        isolation: "isolate",
      }}
    >
      {/* Lime glow halo behind the frame */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "-40px -32px -24px -32px",
          background:
            "radial-gradient(60% 50% at 70% 0%, rgba(199,255,61,0.28), transparent 70%)," +
            "radial-gradient(50% 60% at 0% 80%, rgba(111,181,255,0.10), transparent 70%)",
          filter: "blur(6px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* === Offset shadow card (depth) === */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 18,
          right: -18,
          top: 30,
          bottom: -18,
          background: "linear-gradient(180deg, rgba(199,255,61,0.06), rgba(199,255,61,0))",
          border: "1px solid rgba(199,255,61,0.18)",
          borderRadius: 16,
          zIndex: 0,
        }}
      />

      {/* === Main app window frame === */}
      <div
        style={{
          position: "relative",
          background: "linear-gradient(180deg, #0F141A 0%, #11151B 100%)",
          border: "1px solid #283140",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow:
            "0 40px 90px rgba(0,0,0,0.55), 0 16px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
          zIndex: 1,
        }}
      >
        {/* Top status bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 14px",
            borderBottom: "1px solid #1F2632",
            background: "linear-gradient(180deg, #131922 0%, #0F141A 100%)",
          }}
        >
          <div style={{ display: "flex", gap: 6 }} aria-hidden="true">
            <span style={dot("#FF5D5D")} />
            <span style={dot("#FFB547")} />
            <span style={dot("#29D17D")} />
          </div>
          <span
            style={{
              marginLeft: 6,
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#7B8597",
              fontWeight: 700,
            }}
          >
            churvox · operator command
          </span>
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              aria-hidden="true"
              style={{ width: 7, height: 7, borderRadius: 999, background: "#29D17D", boxShadow: "0 0 0 3px rgba(41,209,125,0.22)" }}
            />
            <span style={{ fontSize: 11.5, color: "#A8B0BD", fontWeight: 600 }}>Live</span>
          </span>
        </div>

        {/* Pulse strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 1,
            background: "#1F2632",
          }}
        >
          <Pulse label="Pending" value="4" tone="lime" />
          <Pulse label="Active jobs" value="7" tone="blue" />
          <Pulse label="Open invoices" value="$3,240" tone="green" />
          <Pulse label="Needs fixing" value="2" tone="amber" />
        </div>

        {/* Body: queue + reasoning */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr",
            gap: 1,
            background: "#1F2632",
          }}
        >
          {/* === LEFT: Work queue (4 zones condensed) === */}
          <div style={{ background: "#0F141A", padding: 16, minHeight: 320 }}>
            <Eyebrow tone="lime">Ready to approve</Eyebrow>
            <QueueRow active title="Create draft invoice — Tree pruning" sub="$480 · Acme Lawns" cta="Approve" />
            <QueueRow title="Assign worker — Weekly mow" sub="Front lawn · Mike (free 9–11)" cta="Review" />
            <QueueRow title="Prepare reminder — INV-0142" sub="Overdue 4 days · $2,150" cta="Review" />

            <div style={{ height: 12 }} />
            <Eyebrow tone="amber">Needs fixing</Eyebrow>
            <QueueRow tone="amber" title="Unassigned: Drain inspection" sub="No worker · 14 Brewer St" cta="Assign" />
            <QueueRow tone="amber" title="Missing price — Hedge trim" sub="Quote source not linked" cta="Fix" />
          </div>

          {/* === RIGHT: AI reasoning panel === */}
          <div
            style={{
              background: "linear-gradient(180deg, #11151B 0%, #0F141A 100%)",
              padding: 16,
              borderLeft: "1px solid #1F2632",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <Eyebrow tone="lime">Why Churvox surfaced this</Eyebrow>
            <p
              style={{
                margin: 0,
                fontSize: 12.5,
                lineHeight: 1.55,
                color: "#D6DCE7",
              }}
            >
              Job <strong style={{ color: "#F5F7FA" }}>Tree pruning</strong> is
              completed with worker notes attached. Subtotal $480, GST 15%.
              Reminder drafted using your saved tone.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <Tag>completed</Tag>
              <Tag>price linked</Tag>
              <Tag>photos: 4</Tag>
              <Tag>client verified</Tag>
            </div>
            <div
              style={{
                marginTop: 6,
                padding: "10px 12px",
                background: "rgba(199,255,61,0.06)",
                border: "1px solid rgba(199,255,61,0.20)",
                borderRadius: 10,
                fontSize: 12,
                color: "#E1E5EE",
              }}
            >
              <div style={{ fontWeight: 700, color: "#C7FF3D", marginBottom: 4, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Draft message
              </div>
              "Hi Acme Lawns — invoice for the tree pruning today is ready. Total $552 incl GST. Photos attached. Thanks!"
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
              <Button kind="primary">Approve &amp; send</Button>
              <Button kind="ghost">Reject</Button>
            </div>
          </div>
        </div>

        {/* Bottom dock — Field & crew + Money desk row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 1,
            background: "#1F2632",
            borderTop: "1px solid #1F2632",
          }}
        >
          <div style={{ background: "#0F141A", padding: 14 }}>
            <Eyebrow tone="blue">Field &amp; crew</Eyebrow>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              <CrewRow name="Mike" status="On site · Tree pruning" tone="green" />
              <CrewRow name="Jen" status="Free until 1:30 PM" tone="blue" />
            </div>
          </div>
          <div style={{ background: "#0F141A", padding: 14 }}>
            <Eyebrow tone="green">Money desk</Eyebrow>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              <MoneyRow label="Ready to invoice" value="$1,420" />
              <MoneyRow label="Overdue" value="$2,150" warn />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* === sub-components === */
const dot = (c) => ({ width: 9, height: 9, borderRadius: 999, background: c, boxShadow: `0 0 0 1px rgba(0,0,0,0.4)` });

function Eyebrow({ children, tone = "lime" }) {
  const colorMap = {
    lime: { c: "#C7FF3D", bg: "rgba(199,255,61,0.10)", b: "rgba(199,255,61,0.32)" },
    blue: { c: "#6FB5FF", bg: "rgba(111,181,255,0.10)", b: "rgba(111,181,255,0.32)" },
    green: { c: "#29D17D", bg: "rgba(41,209,125,0.10)", b: "rgba(41,209,125,0.32)" },
    amber: { c: "#FFB547", bg: "rgba(255,181,71,0.10)", b: "rgba(255,181,71,0.32)" },
  }[tone];
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: colorMap.c,
        background: colorMap.bg,
        border: `1px solid ${colorMap.b}`,
        padding: "3px 8px",
        borderRadius: 6,
        marginBottom: 8,
      }}
    >
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: colorMap.c }} />
      {children}
    </div>
  );
}

function Pulse({ label, value, tone }) {
  const colorMap = {
    lime: "#C7FF3D",
    blue: "#6FB5FF",
    green: "#29D17D",
    amber: "#FFB547",
  };
  return (
    <div style={{ background: "#0F141A", padding: "10px 12px" }}>
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: colorMap[tone],
          marginBottom: 4,
        }}
      >
        <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: 999, background: colorMap[tone], marginRight: 5, verticalAlign: "middle" }} />
        {label}
      </div>
      <div style={{ fontFamily: "Outfit, Inter, sans-serif", fontSize: 19, fontWeight: 800, color: "#F5F7FA", letterSpacing: "-0.02em" }}>
        {value}
      </div>
    </div>
  );
}

function QueueRow({ title, sub, cta, active = false, tone = "lime" }) {
  const accent = tone === "amber" ? "#FFB547" : "#C7FF3D";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 10px",
        marginBottom: 6,
        background: active ? "rgba(199,255,61,0.06)" : "#11161E",
        border: `1px solid ${active ? "rgba(199,255,61,0.32)" : "#1F2632"}`,
        borderRadius: 10,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: accent,
          flexShrink: 0,
          boxShadow: active ? `0 0 0 4px rgba(199,255,61,0.18)` : "none",
        }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12.5, color: "#F5F7FA", fontWeight: 600, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: "#A8B0BD", lineHeight: 1.3 }}>{sub}</div>
      </div>
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: active ? "#0B0D10" : accent,
          background: active ? accent : "transparent",
          border: active ? "none" : `1px solid ${accent}`,
          padding: "4px 9px",
          borderRadius: 999,
          whiteSpace: "nowrap",
        }}
      >
        {cta}
      </span>
    </div>
  );
}

function Tag({ children }) {
  return (
    <span
      style={{
        fontSize: 10,
        color: "#A8B0BD",
        background: "#11161E",
        border: "1px solid #1F2632",
        padding: "3px 7px",
        borderRadius: 6,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

function Button({ children, kind = "primary" }) {
  if (kind === "ghost") {
    return (
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          color: "#A8B0BD",
          padding: "8px 12px",
          border: "1px solid #283140",
          borderRadius: 8,
          background: "transparent",
        }}
      >
        {children}
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 800,
        color: "#0B0D10",
        padding: "8px 12px",
        background: "#C7FF3D",
        borderRadius: 8,
        boxShadow: "0 0 0 1px rgba(199,255,61,0.6), 0 10px 22px -6px rgba(199,255,61,0.45)",
      }}
    >
      {children}
    </span>
  );
}

function CrewRow({ name, status, tone = "green" }) {
  const c = { green: "#29D17D", blue: "#6FB5FF" }[tone];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
      <span
        aria-hidden="true"
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          background: "#11161E",
          border: `1px solid ${c}`,
          color: c,
          fontWeight: 800,
          fontSize: 10,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {name[0]}
      </span>
      <span style={{ color: "#F5F7FA", fontWeight: 600 }}>{name}</span>
      <span style={{ marginLeft: "auto", color: "#A8B0BD" }}>{status}</span>
    </div>
  );
}

function MoneyRow({ label, value, warn = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5 }}>
      <span style={{ color: "#A8B0BD" }}>{label}</span>
      <span
        style={{
          color: warn ? "#FFB547" : "#F5F7FA",
          fontWeight: 800,
          fontFamily: "Outfit, Inter, sans-serif",
        }}
      >
        {value}
      </span>
    </div>
  );
}
