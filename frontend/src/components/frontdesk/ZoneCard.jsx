import React from "react";
import { CxBadge, CxEmptyState } from "../cx";

const ZONE_STYLES = {
  approve: {
    accent: "var(--cx-accent)",
    accentSoft: "var(--cx-accent-soft)",
    accentInk: "#355C00",
    tone: "accent",
    eyebrow: "Ready to approve",
    sub: "AI prepared. One tap and it goes out.",
  },
  fixing: {
    accent: "var(--cx-warning)",
    accentSoft: "var(--cx-warning-soft)",
    accentInk: "#7C2D12",
    tone: "warning",
    eyebrow: "Needs fixing",
    sub: "Blockers Churvox spotted before they cost you.",
  },
  field: {
    accent: "var(--cx-info)",
    accentSoft: "var(--cx-info-soft)",
    accentInk: "#1F4E7A",
    tone: "info",
    eyebrow: "Field & crew",
    sub: "Who is on a job, who is free, what's running.",
  },
  money: {
    accent: "var(--cx-success)",
    accentSoft: "var(--cx-success-soft)",
    accentInk: "#14532D",
    tone: "success",
    eyebrow: "Money desk",
    sub: "Open invoices, overdue, ready-to-bill.",
  },
};

export default function ZoneCard({
  zone = "approve",
  title,
  count,
  items = [],
  onItemClick,
  emptyText = "All clear",
  loading = false,
  testId,
}) {
  const styles = ZONE_STYLES[zone] || ZONE_STYLES.approve;

  return (
    <section
      data-testid={testId || `zone-${zone}`}
      style={{
        background: "var(--cx-surface)",
        border: "1px solid var(--cx-border)",
        borderRadius: 22,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 6px 18px rgba(14,14,14,0.05)",
        minHeight: 320,
      }}
    >
      {/* zone header */}
      <header
        style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid var(--cx-border-soft)",
          background: "linear-gradient(180deg, var(--cx-surface) 0%, var(--cx-surface-2) 100%)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: styles.accentInk,
              marginBottom: 6,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                background: styles.accent,
                boxShadow: `0 0 0 3px ${styles.accentSoft}`,
              }}
            />
            {styles.eyebrow}
          </div>
          <h3
            style={{
              fontFamily: "Outfit, Inter, sans-serif",
              fontSize: 19,
              fontWeight: 700,
              letterSpacing: "-0.015em",
              margin: 0,
              color: "var(--cx-text)",
              lineHeight: 1.15,
            }}
          >
            {title}
          </h3>
          <div
            style={{
              fontSize: 13,
              color: "var(--cx-muted)",
              marginTop: 4,
              lineHeight: 1.4,
            }}
          >
            {styles.sub}
          </div>
        </div>
        {typeof count === "number" ? (
          <CxBadge tone={styles.tone}>
            {count} {count === 1 ? "item" : "items"}
          </CxBadge>
        ) : null}
      </header>

      {/* items list */}
      <div style={{ padding: 14, flex: 1, minHeight: 0, overflowY: "auto" }}>
        {loading ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "var(--cx-muted)",
              fontSize: 13.5,
            }}
          >
            Loading…
          </div>
        ) : items.length === 0 ? (
          <CxEmptyState title={emptyText} description="Churvox will surface items here as they come in." />
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {items.map((it) => (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => onItemClick && onItemClick(it)}
                  data-testid={`zone-${zone}-item-${it.id}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "var(--cx-surface)",
                    border: "1px solid var(--cx-border)",
                    borderRadius: 14,
                    padding: "12px 14px",
                    cursor: "pointer",
                    transition: "border-color 140ms ease, transform 140ms ease, box-shadow 140ms ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = styles.accent;
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 6px 14px rgba(14,14,14,0.07)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--cx-border)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        color: "var(--cx-text)",
                        fontSize: 14.5,
                        lineHeight: 1.3,
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {it.title}
                    </div>
                    <span
                      style={{
                        fontSize: 12.5,
                        color: styles.accentInk,
                        background: styles.accentSoft,
                        padding: "3px 9px",
                        borderRadius: 999,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {it.cta || "Review"}
                    </span>
                  </div>
                  {it.subtitle ? (
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "var(--cx-muted)",
                        lineHeight: 1.4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {it.subtitle}
                    </div>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
