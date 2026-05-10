import React from "react";

export function ChurvoxLogo({
  size = "md",
  markOnly = false,
  compact = false,
  dark = false,
  dataTestId,
  className = "",
  markClassName = "",
  wordmarkClassName = "",
}) {
  const scale = size === "lg" ? 72 : size === "sm" ? 40 : 52;
  const titleSize = size === "lg" ? 27 : size === "sm" ? 15 : 20;
  const titleColor = dark ? "#FFF7ED" : "#101418";
  const subColor = dark ? "#F4A261" : "#9A4A16";

  return (
    <div
      data-testid={dataTestId}
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: compact || markOnly ? 0 : 12 }}
    >
      <svg
        width={scale}
        height={scale}
        viewBox="0 0 80 80"
        fill="none"
        aria-hidden="true"
        className={markClassName}
      >
        <defs>
          <linearGradient id="cvxCore" x1="10" y1="8" x2="70" y2="72" gradientUnits="userSpaceOnUse">
            <stop stopColor="#080A0D" />
            <stop offset="0.55" stopColor="#141A20" />
            <stop offset="1" stopColor="#2A160C" />
          </linearGradient>
          <linearGradient id="cvxSpark" x1="18" y1="12" x2="62" y2="68" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF7ED" />
            <stop offset="0.38" stopColor="#F4A261" />
            <stop offset="1" stopColor="#D97724" />
          </linearGradient>
          <linearGradient id="cvxSignal" x1="18" y1="60" x2="68" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#18C6A7" />
            <stop offset="1" stopColor="#F4A261" />
          </linearGradient>
          <filter id="cvxShadow" x="0" y="0" width="80" height="80" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#080A0D" floodOpacity="0.28" />
          </filter>
        </defs>

        <circle cx="40" cy="40" r="31" fill="url(#cvxCore)" filter="url(#cvxShadow)" />
        <circle cx="40" cy="40" r="25.5" stroke="url(#cvxSignal)" strokeWidth="3.2" strokeDasharray="34 12" strokeLinecap="round" />

        <path
          d="M42.5 14L22.5 45.2H36.8L31.5 66L59 31.2H44.8L52 14H42.5Z"
          fill="url(#cvxSpark)"
        />

        <path d="M17.5 27.5H31.5" stroke="#FFF7ED" strokeWidth="4.4" strokeLinecap="round" opacity="0.9" />
        <path d="M14.5 40H29.5" stroke="#FFF7ED" strokeWidth="4.4" strokeLinecap="round" opacity="0.75" />
        <path d="M19.5 52.5H33.5" stroke="#18C6A7" strokeWidth="4.4" strokeLinecap="round" opacity="0.95" />

        <path d="M55.5 25C60.2 28.6 63 33.7 63 40" stroke="#F4A261" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M54.5 34C56.2 35.7 57.2 37.8 57.2 40.3" stroke="#18C6A7" strokeWidth="3.4" strokeLinecap="round" />
      </svg>

      {!markOnly && !compact && (
        <span className={wordmarkClassName} style={{ display: "grid", lineHeight: 1 }}>
          <strong style={{ color: titleColor, fontSize: titleSize, letterSpacing: "-0.07em", fontWeight: 950 }}>
            Churvox
          </strong>
          <span
            style={{
              color: subColor,
              fontSize: Math.max(9, titleSize - 8),
              fontWeight: 950,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              marginTop: 4,
            }}
          >
            AI Trade OS
          </span>
        </span>
      )}
    </div>
  );
}

export default ChurvoxLogo;
