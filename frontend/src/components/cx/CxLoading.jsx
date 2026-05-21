import React from "react";

/**
 * Churvox loading state. Either a small inline spinner or a card skeleton.
 */
export default function CxLoading({ label = "Loading\u2026", variant = "inline" }) {
  if (variant === "card") {
    return (
      <div
        style={{
          background: "var(--cx-surface)",
          border: "1px solid var(--cx-border)",
          borderRadius: "var(--cx-radius-lg)",
          padding: 22,
          boxShadow: "var(--cx-shadow)",
          display: "grid",
          gap: 10,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: i === 0 ? 18 : 12,
              width: i === 0 ? "55%" : i === 1 ? "85%" : "70%",
              borderRadius: 8,
              background:
                "linear-gradient(90deg, var(--cx-bg-warm) 0%, #fff 50%, var(--cx-bg-warm) 100%)",
              backgroundSize: "200% 100%",
              animation: "cx-shimmer 1.2s linear infinite",
            }}
          />
        ))}
        <style>{`@keyframes cx-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      </div>
    );
  }
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        color: "var(--cx-muted)",
        fontSize: 14,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          border: "2px solid var(--cx-accent-hover)",
          borderRightColor: "transparent",
          animation: "cx-spin 0.7s linear infinite",
          display: "inline-block",
        }}
      />
      <span>{label}</span>
      <style>{`@keyframes cx-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
