import React from "react";

/**
 * Orange CHURVOX logo — this is the correct generated orange CHURVOX mark,
 * not the wrong COMMAND logo. Shared by sidebar, auth, headers and brand spots.
 */
const SIZE_MAP = {
  sm: "h-7",
  md: "h-8",
  lg: "h-10",
  xl: "h-12",
  hero: "h-14 sm:h-16 lg:h-20",
};

function MarkDefs({ id = "cvxOrangeLogo" }) {
  return (
    <defs>
      <linearGradient id={`${id}-orange`} x1="9" y1="10" x2="119" y2="119" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffb15f" />
        <stop offset="0.42" stopColor="#ff7a1a" />
        <stop offset="1" stopColor="#f97316" />
      </linearGradient>
      <linearGradient id={`${id}-word`} x1="146" y1="40" x2="510" y2="96" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fff7ed" />
        <stop offset="0.58" stopColor="#ffedd5" />
        <stop offset="1" stopColor="#ff7a1a" />
      </linearGradient>
      <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#000000" floodOpacity="0.28" />
      </filter>
    </defs>
  );
}

function ChurvoxMark({ id = "cvxOrangeLogo" }) {
  return (
    <g filter={`url(#${id}-shadow)`}>
      <rect x="7" y="7" width="114" height="114" rx="31" fill={`url(#${id}-orange)`} />
      <path d="M91 31H49c-23 0-41 17-41 38s18 38 41 38h43l-12 20H49c-35 0-62-26-62-58s27-58 62-58h55L91 31Z" fill="#05070a" transform="translate(13 0)" />
      <path d="M48 55h58L93 75H35l13-20Z" fill="#fff7ed" />
      <path d="M40 82h42L70 101H28l12-19Z" fill="#fff7ed" opacity="0.92" />
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
  const id = `cvxOrangeLogo-${variant}-${size}`;
  const wordFill = tone === "dark" ? "#111827" : tone === "light" ? "#fff7ed" : `url(#${id}-word)`;

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
      viewBox="0 0 560 128"
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
        x="148"
        y="82"
        fontFamily="Outfit, Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
        fontWeight="950"
        fontSize="62"
        fill={wordFill}
        letterSpacing="-3.2"
      >
        CHURVOX
      </text>
    </svg>
  );
}

export default ChurvoxLogo;
