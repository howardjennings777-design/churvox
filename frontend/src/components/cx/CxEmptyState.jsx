import React from "react";

/**
 * Churvox empty state — calm cream block with optional icon, title, body, action.
 */
export default function CxEmptyState({
  icon = null,
  title = "Nothing here yet",
  description = "",
  action = null,
  className = "",
}) {
  return (
    <div
      className={className}
      style={{
        background: "var(--cx-surface)",
        border: "1px dashed var(--cx-border-strong)",
        borderRadius: "var(--cx-radius-lg)",
        padding: "36px 24px",
        textAlign: "center",
        color: "var(--cx-muted)",
      }}
    >
      {icon ? (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "var(--cx-accent-soft)",
            color: "#355c00",
            marginBottom: 14,
          }}
        >
          {icon}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: "Outfit, Inter, sans-serif",
          fontWeight: 700,
          fontSize: 17,
          color: "var(--cx-text)",
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {description ? (
        <div style={{ fontSize: 14, color: "var(--cx-muted)", maxWidth: 460, margin: "0 auto" }}>
          {description}
        </div>
      ) : null}
      {action ? <div style={{ marginTop: 18 }}>{action}</div> : null}
    </div>
  );
}
