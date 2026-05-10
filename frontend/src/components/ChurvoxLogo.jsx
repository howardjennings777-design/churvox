import React from "react";

export function ChurvoxLogo({ size = "md", markOnly = false, dark = false }) {
  const scale = size === "lg" ? 62 : size === "sm" ? 36 : 46;
  const titleSize = size === "lg" ? 24 : size === "sm" ? 15 : 18;
  const titleColor = dark ? "#fff7ed" : "#171717";
  const subColor = dark ? "#f97316" : "#ea580c";

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 11 }}>
      <svg width={scale} height={scale} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="56" height="56" rx="16" fill="#171717" />
        <path d="M13 43L31 13H44L26 43H13Z" fill="#f97316" />
        <path d="M28 51L47 20H56L37 51H28Z" fill="#84cc16" />
        <path d="M21 45H38" stroke="#fff7ed" strokeWidth="5" strokeLinecap="round" />
        <path d="M19 37H33" stroke="#fff7ed" strokeWidth="5" strokeLinecap="round" />
        <path d="M24 29H38" stroke="#fff7ed" strokeWidth="5" strokeLinecap="round" />
      </svg>
      {!markOnly && (
        <span style={{ display: "grid", lineHeight: 1 }}>
          <strong style={{ color: titleColor, fontSize: titleSize, letterSpacing: "-0.06em", fontWeight: 950 }}>Churvox</strong>
          <span style={{ color: subColor, fontSize: Math.max(9, titleSize - 8), fontWeight: 950, letterSpacing: "0.09em", textTransform: "uppercase", marginTop: 4 }}>Trade OS</span>
        </span>
      )}
    </div>
  );
}

export default ChurvoxLogo;
