import React from "react";

/**
 * New CHURVOX orange industrial logo.
 * No COMMAND wording. Works across sidebar, auth, headers and app branding.
 */
const SIZE_MAP = {
  sm: "h-7",
  md: "h-8",
  lg: "h-10",
  xl: "h-12",
  hero: "h-14 sm:h-16 lg:h-20",
};

function LogoDefs({ id = "cvxNew" }) {
  return (
    <defs>
      <linearGradient id={`${id}-orange`} x1="18" y1="24" x2="178" y2="166" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffb15f" />
        <stop offset="0.38" stopColor="#ff7900" />
        <stop offset="1" stopColor="#f05a00" />
      </linearGradient>
      <linearGradient id={`${id}-dark`} x1="36" y1="48" x2="158" y2="138" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2a3038" />
        <stop offset="1" stopColor="#070b10" />
      </linearGradient>
      <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#020617" floodOpacity="0.22" />
      </filter>
    </defs>
  );
}

function ChurvoxMark({ id = "cvxNew" }) {
  return (
    <g filter={`url(#${id}-shadow)`}>
      <path d="M122 18H54L18 52v76l36 34h68l24-24h-58l-18 18-36-34V58l36-34h58l18 18 24-24h-48Z" fill={`url(#${id}-orange)`} />
      <path d="M53 54h31v25H53V54Zm47 0h31v25h-31V54ZM53 101h31v25H53v-25Zm47 0h31v25h-31v-25Z" fill={`url(#${id}-dark)`} />
      <path d="M84 79h16v22H84V79Zm-31 0h31v22H53V79Zm47 0h31v22h-31V79Z" fill="#f8fafc" />
      <path d="M78 72h28l16 18-16 18H78L62 90l16-18Z" fill="#ff7900" />
    </g>
  );
}

export function ChurvoxLogo({
  size = "md",
  className = "",
  dataTestId = "churvox-logo",
  variant = "wordmark",
  tone = "auto",
}) {
  const heightCls = SIZE_MAP[size] || SIZE_MAP.md;
  const id = `cvxNew-${variant}-${size}`;
  const wordFill = tone === "light" ? "#f8fafc" : "#111820";

  if (variant === "mark") {
    return (
      <svg viewBox="0 0 188 180" role="img" aria-label="CHURVOX" className={`${heightCls} w-auto block ${className}`.trim()} data-testid={dataTestId} data-logo-size={size} data-logo-variant="mark">
        <LogoDefs id={id} />
        <ChurvoxMark id={id} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 980 180" role="img" aria-label="CHURVOX" className={`${heightCls} w-auto block ${className}`.trim()} data-testid={dataTestId} data-logo-size={size} data-logo-variant="wordmark">
      <LogoDefs id={id} />
      <ChurvoxMark id={id} />
      <text x="250" y="113" fontFamily="Outfit, Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif" fontWeight="950" fontSize="78" fill={wordFill} letterSpacing="-3.5">CHURVOX</text>
      <path d="M914 55h32l-61 71h-32l61-71Z" fill="#ff7900" />
    </svg>
  );
}

export default ChurvoxLogo;
