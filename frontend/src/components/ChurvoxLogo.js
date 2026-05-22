import React from "react";

/**
 * Churvox wordmark — pure inline SVG.
 * Executive graphite / stone / copper brand. No external image fetch.
 */
const SIZE_MAP = {
  sm: "h-7",
  md: "h-8",
  lg: "h-10",
  xl: "h-12",
  hero: "h-14 sm:h-16 lg:h-20",
};

const ACCENT = "#C58A2B";

export function ChurvoxLogo({
  size = "md",
  className = "",
  dataTestId = "churvox-logo",
  variant = "wordmark",
  tone = "auto",
}) {
  const heightCls = SIZE_MAP[size] || SIZE_MAP.md;
  const textColor =
    tone === "light"
      ? "var(--cx-bg, #F7F3EA)"
      : tone === "dark"
      ? "var(--cx-text, #0E0E0E)"
      : "currentColor";

  if (variant === "mark") {
    return (
      <svg
        viewBox="0 0 64 64"
        role="img"
        aria-label="Churvox"
        className={`${heightCls} w-auto block ${className}`.trim()}
        data-testid={dataTestId}
        data-logo-size={size}
        data-logo-variant="mark"
      >
        <rect x="2" y="2" width="60" height="60" rx="12" fill="#101114" />
        <text
          x="30"
          y="46"
          fontFamily="Outfit, Inter, sans-serif"
          fontWeight="800"
          fontSize="44"
          fill="#FBF8F1"
          textAnchor="middle"
          letterSpacing="-1.5"
        >
          C
        </text>
        <circle cx="49" cy="47" r="5" fill={ACCENT} />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 220 56"
      role="img"
      aria-label="Churvox"
      className={`${heightCls} w-auto block ${className}`.trim()}
      data-testid={dataTestId}
      data-logo-size={size}
      data-logo-variant="wordmark"
    >
      <text
        x="0"
        y="42"
        fontFamily="Outfit, Inter, system-ui, sans-serif"
        fontWeight="800"
        fontSize="44"
        fill={textColor}
        letterSpacing="-1.6"
      >
        Churvox
      </text>
      <circle cx="206" cy="38" r="6" fill={ACCENT} />
    </svg>
  );
}

export default ChurvoxLogo;
