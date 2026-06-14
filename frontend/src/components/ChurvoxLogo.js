import React from "react";

/**
 * CHURVOX orange app logo.
 * Matches the website/app icon: dark command tile, orange C/workflow motion, approval check.
 */
const SIZE_MAP = {
  sm: "h-7",
  md: "h-8",
  lg: "h-10",
  xl: "h-12",
  hero: "h-14 sm:h-16 lg:h-20",
};

function LogoDefs({ id = "cvxApp" }) {
  return (
    <defs>
      <linearGradient id={`${id}-bg`} x1="30" y1="14" x2="226" y2="242" gradientUnits="userSpaceOnUse">
        <stop stopColor="#242932" />
        <stop offset="0.52" stopColor="#111820" />
        <stop offset="1" stopColor="#05070b" />
      </linearGradient>
      <linearGradient id={`${id}-orange`} x1="54" y1="46" x2="210" y2="207" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffb15f" />
        <stop offset="0.36" stopColor="#ff7a00" />
        <stop offset="1" stopColor="#f05a00" />
      </linearGradient>
      <linearGradient id={`${id}-silver`} x1="74" y1="92" x2="211" y2="159" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffffff" />
        <stop offset="1" stopColor="#d8dde6" />
      </linearGradient>
      <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#000000" floodOpacity="0.36" />
      </filter>
      <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#000000" floodOpacity="0.28" />
      </filter>
    </defs>
  );
}

function ChurvoxMark({ id = "cvxApp" }) {
  return (
    <>
      <rect x="12" y="12" width="232" height="232" rx="52" fill={`url(#${id}-bg)`} />
      <rect x="13.5" y="13.5" width="229" height="229" rx="50" fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="3" />
      <g filter={`url(#${id}-shadow)`}>
        <path d="M190 63A82 82 0 0 0 71 66" fill="none" stroke={`url(#${id}-orange)`} strokeWidth="28" strokeLinecap="round" />
        <path d="M64 181A82 82 0 0 0 195 181" fill="none" stroke={`url(#${id}-orange)`} strokeWidth="28" strokeLinecap="round" />
        <path d="M43 105h50" fill="none" stroke={`url(#${id}-orange)`} strokeWidth="12" strokeLinecap="round" />
        <path d="M33 132h59" fill="none" stroke={`url(#${id}-orange)`} strokeWidth="12" strokeLinecap="round" />
        <path d="M53 159h52" fill="none" stroke={`url(#${id}-orange)`} strokeWidth="12" strokeLinecap="round" />
        <circle cx="27" cy="132" r="7" fill="#ff7a00" />
      </g>
      <g filter={`url(#${id}-soft)`}>
        <path d="M73 137L112 122L145 151L207 92" fill="none" stroke={`url(#${id}-silver)`} strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="73" cy="137" r="15" fill="#f8fafc" stroke="#d8dde6" strokeWidth="5" />
        <circle cx="112" cy="122" r="14" fill="#f8fafc" stroke="#d8dde6" strokeWidth="5" />
        <circle cx="207" cy="92" r="14" fill="#f8fafc" stroke="#d8dde6" strokeWidth="5" />
        <circle cx="73" cy="137" r="5" fill="#111820" />
        <circle cx="112" cy="122" r="5" fill="#111820" />
        <circle cx="207" cy="92" r="5" fill="#111820" />
      </g>
    </>
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
  const id = `cvxApp-${variant}-${size}`;
  const wordFill = tone === "light" ? "#f8fafc" : "#111820";

  if (variant === "mark") {
    return (
      <svg viewBox="0 0 256 256" role="img" aria-label="CHURVOX" className={`${heightCls} w-auto block ${className}`.trim()} data-testid={dataTestId} data-logo-size={size} data-logo-variant="mark">
        <LogoDefs id={id} />
        <ChurvoxMark id={id} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 920 256" role="img" aria-label="CHURVOX" className={`${heightCls} w-auto block ${className}`.trim()} data-testid={dataTestId} data-logo-size={size} data-logo-variant="wordmark">
      <LogoDefs id={id} />
      <ChurvoxMark id={id} />
      <text x="292" y="151" fontFamily="Outfit, Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif" fontWeight="950" fontSize="78" fill={wordFill} letterSpacing="-3.5">CHURVOX</text>
      <path d="M848 92h32l-64 73h-32l64-73Z" fill="#ff7a00" />
    </svg>
  );
}

export default ChurvoxLogo;
