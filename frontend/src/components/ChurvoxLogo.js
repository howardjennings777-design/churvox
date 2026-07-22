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
      <linearGradient id={`${id}-shell`} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
        <stop stopColor="#17211c" />
        <stop offset="0.55" stopColor="#0b100e" />
        <stop offset="1" stopColor="#050606" />
      </linearGradient>
      <linearGradient id={`${id}-heat`} x1="14" y1="10" x2="52" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffc06f" />
        <stop offset="0.42" stopColor="#f97316" />
        <stop offset="1" stopColor="#de4519" />
      </linearGradient>
      <linearGradient id={`${id}-steel`} x1="20" y1="21" x2="47" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffffff" />
        <stop offset="1" stopColor="#d7dee8" />
      </linearGradient>
      <filter id={`${id}-lift`} x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#000000" floodOpacity="0.35" />
      </filter>
    </defs>
  );
}

function ChurvoxMark({ id = "cvxBrand" }) {
  return (
    <g transform="scale(8)">
      <rect x="5" y="5" width="54" height="54" rx="17" fill={`url(#${id}-shell)`} />
      <path d="M14 18h36M14 46h36" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="5" strokeLinecap="round" />
      <path d="M50 11c6 13 4 29-4 40-9 11-22 16-37 13" fill="none" stroke="#f97316" strokeOpacity="0.13" strokeWidth="11" strokeLinecap="round" />
      <g filter={`url(#${id}-lift)`}>
        <path d="M44.2 19.7C40.9 15.9 36.1 14 30.9 14 21.2 14 13.4 21.8 13.4 31.6S21.2 49.2 31 49.2c6.1 0 11.4-3 14.7-7.7" fill="none" stroke={`url(#${id}-heat)`} strokeWidth="8.5" strokeLinecap="round" />
        <path d="M22.5 33.4l7 6.8 14.7-17" fill="none" stroke={`url(#${id}-steel)`} strokeWidth="6.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <circle cx="47.5" cy="19" r="4.4" fill="#f97316" />
      <circle cx="47.5" cy="19" r="1.7" fill="#111827" />
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
  const reactId = React.useId().replace(/:/g, "");
  const id = `cvxBrand-${variant}-${size}-${reactId}`;
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
