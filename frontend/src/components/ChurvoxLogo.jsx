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
  const subColor = dark ? "#18C6A7" : "#0F766E";

  return (
    <div
      data-testid={dataTestId}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact || markOnly ? 0 : 12,
      }}
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
          <linearGradient id="cvxOrbitCore" x1="8" y1="8" x2="72" y2="72" gradientUnits="userSpaceOnUse">
            <stop stopColor="#080A0D" />
            <stop offset="0.56" stopColor="#151A20" />
            <stop offset="1" stopColor="#2A160C" />
          </linearGradient>
          <linearGradient id="cvxCopper" x1="12" y1="12" x2="66" y2="66" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F4A261" />
            <stop offset="0.48" stopColor="#D97724" />
            <stop offset="1" stopColor="#8A4519" />
          </linearGradient>
          <linearGradient id="cvxCream" x1="18" y1="58" x2="54" y2="18" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF7ED" />
            <stop offset="1" stopColor="#E7D6BE" />
          </linearGradient>
          <linearGradient id="cvxTeal" x1="44" y1="18" x2="64" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#18C6A7" />
            <stop offset="1" stopColor="#0F766E" />
          </linearGradient>
          <filter id="cvxSoftShadow" x="0" y="0" width="80" height="80" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#080A0D" floodOpacity="0.28" />
          </filter>
        </defs>

        <circle cx="40" cy="40" r="32" fill="url(#cvxOrbitCore)" filter="url(#cvxSoftShadow)" />

        <path
          d="M58.8 18.2C53.7 14.4 47.2 12.2 40.2 12.2C22.8 12.2 8.8 25.9 8.8 42.8C8.8 49.2 10.8 55.1 14.3 60"
          stroke="url(#cvxCopper)"
          strokeWidth="9"
          strokeLinecap="round"
        />

        <path
          d="M22.4 60.7C27.2 65.1 33.5 67.8 40.4 67.8C47.8 67.8 54.6 64.8 59.5 59.9"
          stroke="url(#cvxCream)"
          strokeWidth="9"
          strokeLinecap="round"
        />

        <path
          d="M25.5 28.4H38.3L55.4 55.2H43.2L25.5 28.4Z"
          fill="url(#cvxCopper)"
        />

        <path
          d="M20.7 52.6L36.8 33.6L44.4 42.1L29.4 60.2H17.8L20.7 52.6Z"
          fill="url(#cvxCream)"
        />

        <path
          d="M50.2 24.2H67.2L55.5 38.9H38.5L50.2 24.2Z"
          fill="url(#cvxTeal)"
        />

        <path d="M18 38.4H30.6" stroke="#FFF7ED" strokeWidth="4" strokeLinecap="round" opacity="0.82" />
        <path d="M49.2 47.5H63.4" stroke="#18C6A7" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
      </svg>

        <span className={wordmarkClassName} style={{ display: "grid", lineHeight: 1 }}>
          <strong
            style={{
              color: titleColor,
              fontSize: titleSize,
              letterSpacing: "-0.07em",
              fontWeight: 950,
            }}
          >
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
