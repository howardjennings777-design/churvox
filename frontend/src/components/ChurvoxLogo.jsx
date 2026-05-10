import React from "react";

export function ChurvoxLogo({ size = "md", markOnly = false, compact = false, dark = false, dataTestId }) {
  const scale = size === "lg" ? 68 : size === "sm" ? 38 : 48;
  const titleSize = size === "lg" ? 26 : size === "sm" ? 15 : 19;
  const titleColor = dark ? "#FFF7ED" : "#101418";
  const subColor = dark ? "#F4A261" : "#B65A1D";

  return (
    <div data-testid={dataTestId} style={{ display: "inline-flex", alignItems: "center", gap: compact ? 0 : 12 }}>
      <svg width={scale} height={scale} viewBox="0 0 72 72" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="cvxShield" x1="8" y1="6" x2="64" y2="66" gradientUnits="userSpaceOnUse">
            <stop stopColor="#080A0D" />
            <stop offset="0.58" stopColor="#161B22" />
            <stop offset="1" stopColor="#2A1A10" />
          </linearGradient>
          <linearGradient id="cvxSignal" x1="20" y1="16" x2="55" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFE0B2" />
            <stop offset="0.42" stopColor="#D97724" />
            <stop offset="1" stopColor="#18C6A7" />
          </linearGradient>
          <filter id="cvxSoft" x="0" y="0" width="72" height="72" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#080A0D" floodOpacity="0.26" />
          </filter>
        </defs>

        <path
          d="M36 5L61 14V33C61 49.4 50.2 62.1 36 67C21.8 62.1 11 49.4 11 33V14L36 5Z"
          fill="url(#cvxShield)"
          filter="url(#cvxSoft)"
        />
        <path
          d="M36 12L54 18.4V33.2C54 45.1 46.6 54.3 36 58.7C25.4 54.3 18 45.1 18 33.2V18.4L36 12Z"
          stroke="rgba(255,247,237,0.18)"
          strokeWidth="2"
        />

        <path
          d="M25 42.8L34.6 20H47L39.4 36.1H49L35.2 55L39.4 42.8H25Z"
          fill="url(#cvxSignal)"
        />
        <path d="M23 25.5H32.5" stroke="#FFF7ED" strokeWidth="4" strokeLinecap="round" opacity="0.92" />
        <path d="M21 34.7H31" stroke="#FFF7ED" strokeWidth="4" strokeLinecap="round" opacity="0.86" />
        <path d="M46.5 24.5C50.2 26.3 52.8 30.1 52.8 34.5" stroke="#F4A261" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
        <path d="M43.9 29.7C45.6 30.7 46.8 32.5 46.8 34.6" stroke="#18C6A7" strokeWidth="3" strokeLinecap="round" opacity="0.92" />
      </svg>

      {!markOnly && !compact && (
        <span style={{ display: "grid", lineHeight: 1 }}>
          <strong style={{ color: titleColor, fontSize: titleSize, letterSpacing: "-0.065em", fontWeight: 950 }}>
            Churvox
          </strong>
          <span style={{ color: subColor, fontSize: Math.max(9, titleSize - 8), fontWeight: 950, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>
            AI Trade OS
          </span>
        </span>
      )}
    </div>
  );
}

export default ChurvoxLogo;
