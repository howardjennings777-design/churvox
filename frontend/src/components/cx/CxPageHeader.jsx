import React from "react";

/**
 * Churvox page header — cream surface, charcoal text, lime accent eyebrow.
 * Replaces the legacy dark .cx-page-hero look in any new pages that import it.
 */
export default function CxPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
  className = "",
}) {
  return (
    <header
      className={className}
      style={{
        background:
          "linear-gradient(135deg, #FFFFFF 0%, #FBF8F1 65%, #F2EDDF 100%)",
        border: "1px solid var(--cx-border)",
        borderRadius: "var(--cx-radius-xl)",
        boxShadow: "var(--cx-shadow)",
        padding: "24px 22px",
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 320px" }}>
          {eyebrow ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 10px",
                borderRadius: 999,
                background: "var(--cx-accent-soft)",
                color: "#355c00",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                marginBottom: 10,
                border: "1px solid rgba(200,255,77,0.45)",
              }}
            >
              {eyebrow}
            </div>
          ) : null}
          {title ? (
            <h1
              style={{
                fontFamily: "Outfit, Inter, sans-serif",
                fontSize: 28,
                fontWeight: 700,
                color: "var(--cx-text)",
                margin: 0,
                letterSpacing: "-0.015em",
                lineHeight: 1.15,
              }}
            >
              {title}
            </h1>
          ) : null}
          {subtitle ? (
            <p
              style={{
                fontSize: 14,
                color: "var(--cx-muted)",
                margin: "8px 0 0",
                maxWidth: 680,
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {actions}
          </div>
        ) : null}
      </div>
      {children ? <div style={{ marginTop: 18 }}>{children}</div> : null}
    </header>
  );
}
