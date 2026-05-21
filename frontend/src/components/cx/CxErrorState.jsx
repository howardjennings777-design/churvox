import React from "react";
import CxButton from "./CxButton";

/**
 * Churvox error state. Calm, helpful, with a retry action.
 */
export default function CxErrorState({
  title = "Something went wrong",
  description = "We couldn\u2019t load this just now. Please try again.",
  onRetry,
  retryLabel = "Try again",
}) {
  return (
    <div
      style={{
        background: "var(--cx-surface)",
        border: "1px solid var(--cx-danger)",
        borderRadius: "var(--cx-radius-lg)",
        padding: "22px 20px",
        boxShadow: "var(--cx-shadow-sm)",
      }}
      role="alert"
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 10px",
          borderRadius: 999,
          background: "var(--cx-danger-soft)",
          color: "var(--cx-danger)",
          fontWeight: 600,
          fontSize: 12,
          marginBottom: 10,
        }}
      >
        Error
      </div>
      <div
        style={{
          fontFamily: "Outfit, Inter, sans-serif",
          fontWeight: 700,
          fontSize: 17,
          color: "var(--cx-text)",
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 14, color: "var(--cx-muted)", marginBottom: 14 }}>
        {description}
      </div>
      {onRetry ? (
        <CxButton variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </CxButton>
      ) : null}
    </div>
  );
}
