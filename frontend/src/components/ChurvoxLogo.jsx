import React from "react";

export function ChurvoxLogo({ size = "md", markOnly = false, compact = false, dark = false, dataTestId }) {
  const scale = size === "lg" ? 72 : size === "sm" ? 40 : 52;
  const titleSize = size === "lg" ? 27 : size === "sm" ? 15 : 20;
  const titleColor = dark ? "#FFF7ED" : "#101418";
  const subColor = dark ? "#F4A261" : "#9A4A16";

  return (
    <div data-testid={dataTestId} style={{ display: "inline-flex", alignItems: "center", gap: compact ? 0 : 12 }}>
      <svg width={scale} height={scale} viewBox="0 0 80 80" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="cvxForgePlate" x1="8" y1="8" x2="72" y2="72" gradientUnits="userSpaceOnUse">
            <stop stopColor="#080A0D" />
            <stop offset="0.48" stopColor="#151A20" />
            <stop offset="1" stopColor="#2A160C" />
          </linearGradient>
          <linearGradient id="cvxForgeEdge" x1="12" y1="10" x2="68" y2="70" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F4A261" />
            <stop offset="0.52" stopColor="#D97724" />
            <stop offset="1" stopColor="#18C6A7" />
          </linearGradient>
          <linearGradient id="cvxForgeBolt" x1="24" y1="18" x2="56" y2="62" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF7ED" />
            <stop offset="0.4" stopColor="#F4A261" />
            <stop offset="1" stopColor="#D97724" />
          </linearGradient>
          <filter id="cvxLogoShadow" x="0" y="0" width="80" height="80" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="9" stdDeviation="7" floodColor="#080A0D" floodOpacity="0.30" />
          </filter>
        </defs>

        <path
          d="M40 5L66 15.2V35.4C66 52.2 55.1 66 40 74C24.9 66 14 52.2 14 35.4V15.2L40 5Z"
          fill="url(#cvxForgePlate)"
          filter="url(#cvxLogoShadow)"
        />
        <path
          d="M40 10.8L60.2 18.7V35.6C60.2 48.9 52 60.1 40 66.9C28 60.1 19.8 48.9 19.8 35.6V18.7L40 10.8Z"
          stroke="url(#cvxForgeEdge)"
          strokeWidth="2.8"
        />

        <path d="M24 29H36.8" stroke="#FFF7ED" strokeWidth="4.4" strokeLinecap="round" opacity="0.92" />
        <path d="M22.2 39H35.8" stroke="#FFF7ED" strokeWidth="4.4" strokeLinecap="round" opacity="0.84" />
        <path d="M29.8 50H39.5" stroke="#18C6A7" strokeWidth="4" strokeLinecap="round" opacity="0.94" />

        <path
          d="M42.8 17.6L28.5 44.2H39.2L34.6 63L54.8 34.3H43.7L50.7 17.6H42.8Z"
          fill="url(#cvxForgeBolt)"
        />
        <path
          d="M48.6 22.8C55.2 25.9 59.6 32.2 59.6 39.6"
          stroke="#F4A261"
          strokeWidth="3.4"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M49.3 30.3C52 32.3 53.8 35.6 53.8 39.3"
          stroke="#18C6A7"
          strokeWidth="3.4"
          strokeLinecap="round"
          opacity="0.94"
        />
      </svg>

      {!markOnly && !compact && (
        <span style={{ display: "grid", lineHeight: 1 }}>
          <strong style={{ color: titleColor, fontSize: titleSize, letterSpacing: "-0.07em", fontWeight: 950 }}>
            Churvox
          </strong>
          <span style={{ color: subColor, fontSize: Math.max(9, titleSize - 8), fontWeight: 950, letterSpacing: "0.13em", textTransform: "uppercase", marginTop: 4 }}>
            AI Trade OS
          </span>
        </span>
      )}
    </div>
  );
}

export default ChurvoxLogo;
