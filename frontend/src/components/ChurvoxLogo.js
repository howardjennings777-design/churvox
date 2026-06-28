import React from "react";

/**
 * Churvox premium app logo.
 * Industrial black/orange command mark with a clean approval path.
 */
const SIZE_MAP = {
  xs: "h-6",
  sm: "h-7",
  md: "h-8",
  lg: "h-10",
  xl: "h-12",
  hero: "h-14 sm:h-16 lg:h-20",
};

function LogoDefs({ id = "cvxApp" }) {
  return (
    <defs>
      <linearGradient id={`${id}-bg`} x1="20" y1="12" x2="232" y2="244" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2b3038" />
        <stop offset="0.52" stopColor="#111820" />
        <stop offset="1" stopColor="#05070b" />
      </linearGradient>
      <linearGradient id={`${id}-orange`} x1="45" y1="36" x2="218" y2="218" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffbd72" />
        <stop offset="0.42" stopColor="#ff7a22" />
        <stop offset="1" stopColor="#ef5b1d" />
      </linearGradient>
      <linearGradient id={`${id}-line`} x1="66" y1="92" x2="213" y2="158" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffffff" />
        <stop offset="1" stopColor="#d9dee7" />
      </linearGradient>
      <radialGradient id={`${id}-glow`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(184 58) rotate(126) scale(170)">
        <stop stopColor="#ff8a2a" stopOpacity="0.38" />
        <stop offset="1" stopColor="#ff8a2a" stopOpacity="0" />
      </radialGradient>
      <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#000000" floodOpacity="0.38" />
      </filter>
      <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000000" floodOpacity="0.30" />
      </filter>
    </defs>
  );
}

function ChurvoxMark({ id = "cvxApp" }) {
  return (
    <>
      <rect x="10" y="10" width="236" height="236" rx="56" fill={`url(#${id}-bg)`} />
      <rect x="10" y="10" width="236" height="236" rx="56" fill={`url(#${id}-glow)`} />
      <rect x="15" y="15" width="226" height="226" rx="51" fill="none" stroke="#ffffff" strokeOpacity="0.10" strokeWidth="3" />
      <path d="M56 70h132" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="10" strokeLinecap="round" />
      <path d="M68 195h116" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="10" strokeLinecap="round" />
      <g filter={`url(#${id}-shadow)`}>
        <path d="M190 63A82 82 0 0 0 71 66" fill="none" stroke={`url(#${id}-orange)`} strokeWidth="28" strokeLinecap="round" />
        <path d="M64 181A82 82 0 0 0 195 181" fill="none" stroke={`url(#${id}-orange)`} strokeWidth="28" strokeLinecap="round" />
        <path d="M43 105h50" fill="none" stroke={`url(#${id}-orange)`} strokeWidth="12" strokeLinecap="round" />
        <path d="M33 132h59" fill="none" stroke={`url(#${id}-orange)`} strokeWidth="12" strokeLinecap="round" />
        <path d="M53 159h52" fill="none" stroke={`url(#${id}-orange)`} strokeWidth="12" strokeLinecap="round" />
      </g>
      <g filter={`url(#${id}-soft)`}>
        <path d="M73 137L112 122L145 151L207 92" fill="none" stroke={`url(#${id}-line)`} strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
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
  const wordFill = tone === "light" ? "#fffaf3" : "#111820";
  const subFill = tone === "light" ? "#ffbd72" : "#f06423";

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
      <text x="292" y="142" fontFamily="Outfit, Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif" fontWeight="950" fontSize="78" fill={wordFill} letterSpacing="-3.6">CHURVOX</text>
      <text x="298" y="184" fontFamily="Inter, system-ui, sans-serif" fontWeight="900" fontSize="22" fill={subFill} letterSpacing="2.8">DOES THE ADMIN</text>
      <path d="M850 84h33l-66 76h-33l66-76Z" fill="#ff7a22" />
    </svg>
  );
}

export default ChurvoxLogo;
