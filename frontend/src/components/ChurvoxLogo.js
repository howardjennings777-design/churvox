import React from "react";

/**
 * Churvox final logo — C-lane mark + clean wordmark.
 * Pure inline SVG so it works in navs, invoices, auth, plans, and app shells.
 */
const SIZE_MAP = {
  sm: "h-7",
  md: "h-8",
  lg: "h-10",
  xl: "h-12",
  hero: "h-14 sm:h-16 lg:h-20",
};

function MarkDefs({ id = "cvxLogo" }) {
  return (
    <defs>
      <linearGradient id={`${id}-lane`} x1="18" y1="104" x2="112" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#77FFC1" />
        <stop offset="0.42" stopColor="#14D8F4" />
        <stop offset="0.72" stopColor="#245CFF" />
        <stop offset="1" stopColor="#A855F7" />
      </linearGradient>
      <linearGradient id={`${id}-word`} x1="0" y1="16" x2="420" y2="78" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F8FBFF" />
        <stop offset="0.72" stopColor="#F8FBFF" />
        <stop offset="1" stopColor="#62E8F5" />
      </linearGradient>
      <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.4" result="blur" />
        <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.06 0 0 0 0 0.62 0 0 0 0 1 0 0 0 .42 0" />
        <feBlend in="SourceGraphic" />
      </filter>
    </defs>
  );
}

function ChurvoxMark({ id = "cvxLogo" }) {
  return (
    <g filter={`url(#${id}-glow)`}>
      <path d="M95 25H49c-24 0-43 18-43 40h19c0-12 10-22 24-22h46l17-9-17-9Z" fill={`url(#${id}-lane)`} />
      <path d="M103 51H50c-15 0-27 11-27 25s12 25 27 25h54L89 84H51c-5 0-9-4-9-8s4-8 9-8h52l17-8.5L103 51Z" fill={`url(#${id}-lane)`} />
      <path d="M10 68h20" stroke={`url(#${id}-lane)`} strokeWidth="10" strokeLinecap="round" />
      <circle cx="32" cy="68" r="12" fill="#06152C" stroke={`url(#${id}-lane)`} strokeWidth="6" />
      <path d="M66 55 73 67l13 7-13 7-7 13-7-13-13-7 13-7 7-12Z" fill="#62E8F5" />
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
  const id = `cvxLogo-${variant}-${size}`;
  const wordFill = tone === "dark" ? "#06152C" : tone === "light" ? "#F8FBFF" : `url(#${id}-word)`;

  if (variant === "mark") {
    return (
      <svg
        viewBox="0 0 128 128"
        role="img"
        aria-label="Churvox"
        className={`${heightCls} w-auto block ${className}`.trim()}
        data-testid={dataTestId}
        data-logo-size={size}
        data-logo-variant="mark"
      >
        <MarkDefs id={id} />
        <ChurvoxMark id={id} />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 520 128"
      role="img"
      aria-label="Churvox"
      className={`${heightCls} w-auto block ${className}`.trim()}
      data-testid={dataTestId}
      data-logo-size={size}
      data-logo-variant="wordmark"
    >
      <MarkDefs id={id} />
      <ChurvoxMark id={id} />
      <text
        x="146"
        y="82"
        fontFamily="Outfit, Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
        fontWeight="850"
        fontSize="60"
        fill={wordFill}
        letterSpacing="-2.6"
      >
        Churvox
      </text>
    </svg>
  );
}

export default ChurvoxLogo;
