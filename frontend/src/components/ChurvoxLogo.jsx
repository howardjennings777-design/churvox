import React from "react";

export function ChurvoxLogo({ size = "md", markOnly = false, dark = false }) {
  const scale = size === "lg" ? 58 : size === "sm" ? 34 : 42;
  const titleSize = size === "lg" ? 22 : size === "sm" ? 14 : 17;
  const titleColor = dark ? "#ffffff" : "#071326";
  const subColor = dark ? "#93c5fd" : "#2563eb";

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <svg width={scale} height={scale} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="56" height="56" rx="18" fill="#071326" />
        <rect x="8" y="8" width="48" height="48" rx="15" fill="#2563eb" />
        <path d="M43 23.5C40.3 20.6 36.8 19 32.8 19C24.7 19 19 24.6 19 32C19 39.4 24.7 45 32.8 45C36.9 45 40.5 43.4 43.2 40.4L38.2 36C36.8 37.5 35.1 38.3 33 38.3C29.1 38.3 26.4 35.7 26.4 32C26.4 28.3 29.1 25.7 33 25.7C35 25.7 36.7 26.5 38.1 28L43 23.5Z" fill="white" />
        <circle cx="47" cy="17" r="5" fill="#93c5fd" />
      </svg>
      {!markOnly && (
        <span style={{ display: "grid", lineHeight: 1 }}>
          <strong style={{ color: titleColor, fontSize: titleSize, letterSpacing: "-0.055em", fontWeight: 950 }}>Churvox</strong>
          <span style={{ color: subColor, fontSize: Math.max(9, titleSize - 8), fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 3 }}>Command centre</span>
        </span>
      )}
    </div>
  );
}

export default ChurvoxLogo;
