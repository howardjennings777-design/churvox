import React from "react";

const sizeMap = {
  xs: { mark: 28, title: 16 },
  sm: { mark: 36, title: 18 },
  md: { mark: 46, title: 23 },
  lg: { mark: 58, title: 30 },
  xl: { mark: 72, title: 38 },
};

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
  const current = sizeMap[size] || sizeMap.md;
  const textColor = dark ? "#F8FAFC" : "#0F172A";

  return (
    <div
      data-testid={dataTestId}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: markOnly || compact ? 0 : Math.max(10, Math.round(current.mark * 0.18)),
        minWidth: 0,
        whiteSpace: "nowrap",
      }}
    >
      <svg
        width={current.mark}
        height={current.mark}
        viewBox="0 0 120 120"
        fill="none"
        aria-hidden="true"
        className={markClassName}
        style={{ flexShrink: 0, display: "block" }}
      >
        <defs>
          <linearGradient id="churvoxGlobalBg" x1="8" y1="8" x2="112" y2="112" gradientUnits="userSpaceOnUse">
            <stop stopColor="#020617" />
            <stop offset="0.52" stopColor="#2563EB" />
            <stop offset="1" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="108" height="108" rx="31" fill="url(#churvoxGlobalBg)" />
        <path
          d="M78 34a34 34 0 1 0 0 52"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M42 60h42"
          stroke="#7DD3FC"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M68 42l20 18-20 18"
          fill="none"
          stroke="#22C55E"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {!markOnly && (
        <strong
          className={wordmarkClassName}
          style={{
            color: textColor,
            fontSize: current.title,
            fontWeight: 950,
            letterSpacing: "-0.055em",
            lineHeight: 1,
            display: "block",
            whiteSpace: "nowrap",
          }}
        >
          Churvox
        </strong>
      )}
    </div>
  );
}

export default ChurvoxLogo;
