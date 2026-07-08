import React from "react";

const SIZE_MAP = {
  xs: "h-6",
  sm: "h-7",
  md: "h-8",
  lg: "h-10",
  xl: "h-12",
  hero: "h-14 sm:h-16 lg:h-20",
};

function LogoDefs({ id = "cvxBrand" }) {
  return (
    <defs>
      <linearGradient id={`${id}-bg`} x1="54" y1="38" x2="458" y2="474" gradientUnits="userSpaceOnUse">
        <stop stopColor="#17211b" />
        <stop offset="0.52" stopColor="#0f172a" />
        <stop offset="1" stopColor="#050706" />
      </linearGradient>
      <linearGradient id={`${id}-orange`} x1="112" y1="84" x2="420" y2="416" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffb35c" />
        <stop offset="0.46" stopColor="#f97316" />
        <stop offset="1" stopColor="#c2410c" />
      </linearGradient>
      <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#000000" floodOpacity="0.48" />
      </filter>
      <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#f97316" floodOpacity="0.34" />
      </filter>
    </defs>
  );
}

function ChurvoxMark({ id = "cvxBrand" }) {
  return (
    <>
      <rect x="32" y="32" width="448" height="448" rx="112" fill={`url(#${id}-bg)`} />
      <rect x="43" y="43" width="426" height="426" rx="103" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="5" />
      <path d="M92 132C152 84 235 68 308 91C381 114 431 170 445 240" fill="none" stroke={`url(#${id}-orange)`} strokeWidth="18" strokeLinecap="round" opacity="0.92" />
      <path d="M420 386C354 434 262 446 187 412C121 382 78 327 67 262" fill="none" stroke={`url(#${id}-orange)`} strokeWidth="18" strokeLinecap="round" opacity="0.62" />
      <g filter={`url(#${id}-shadow)`}>
        <path d="M301 152H213C166 152 128 190 128 237V275C128 322 166 360 213 360H301" fill="none" stroke="#f8fafc" strokeWidth="44" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M207 152L265 360" fill="none" stroke="#f8fafc" strokeWidth="44" strokeLinecap="round" />
        <path d="M265 360L385 152" fill="none" stroke="#f8fafc" strokeWidth="44" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g filter={`url(#${id}-glow)`}>
        <path d="M211 152C165 152 128 190 128 237V275C128 322 165 360 211 360" fill="none" stroke={`url(#${id}-orange)`} strokeWidth="17" strokeLinecap="round" opacity="0.98" />
        <path d="M265 360L385 152" fill="none" stroke={`url(#${id}-orange)`} strokeWidth="17" strokeLinecap="round" opacity="0.98" />
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
  const id = `cvxBrand-${variant}-${size}`;
  const wordFill = tone === "light" ? "#fffaf3" : "#111827";
  const subFill = tone === "light" ? "#ffbd72" : "#f97316";

  if (variant === "mark") {
    return (
      <svg viewBox="0 0 512 512" role="img" aria-label="Churvox" className={`${heightCls} w-auto block ${className}`.trim()} data-testid={dataTestId} data-logo-size={size} data-logo-variant="mark">
        <LogoDefs id={id} />
        <ChurvoxMark id={id} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 1240 512" role="img" aria-label="Churvox" className={`${heightCls} w-auto block ${className}`.trim()} data-testid={dataTestId} data-logo-size={size} data-logo-variant="wordmark">
      <LogoDefs id={id} />
      <ChurvoxMark id={id} />
      <text x="560" y="275" fontFamily="Outfit, Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif" fontWeight="950" fontSize="142" fill={wordFill} letterSpacing="-8">CHURVOX</text>
      <text x="568" y="352" fontFamily="Inter, system-ui, sans-serif" fontWeight="900" fontSize="36" fill={subFill} letterSpacing="5.2">DOES THE ADMIN</text>
    </svg>
  );
}

export default ChurvoxLogo;
