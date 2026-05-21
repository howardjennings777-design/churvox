import React from "react";

/**
 * Churvox wordmark — pure inline SVG.
 * Cream / charcoal / lime brand (Pass 1 palette). No external image fetch.
 *
 * Sizes match the legacy `h-*` Tailwind heights so any old layout that relies
 * on them keeps working.
 */
const SIZE_MAP = {
  sm: "h-7",     // 28px
  md: "h-8",     // 32px
  lg: "h-10",    // 40px
  xl: "h-12",    // 48px
  hero: "h-14 sm:h-16 lg:h-20",
};

export function ChurvoxLogo({
  size = "md",
  className = "",
  dataTestId = "churvox-logo",
  // Render mode: "wordmark" (default) or "mark" (square icon — for tight nav slots)
  variant = "wordmark",
  tone = "auto", // "auto" inherits currentColor; "dark" forces charcoal; "light" forces cream
}) {
  const heightCls = SIZE_MAP[size] || SIZE_MAP.md;

  // Tone control
  const textColor =
    tone === "light"
      ? "var(--cx-bg, #F7F3EA)"
      : tone === "dark"
      ? "var(--cx-text, #0E0E0E)"
      : "currentColor";

  if (variant === "mark") {
    // Square icon: charcoal square + cream "C" + lime dot
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
        <rect x="2" y="2" width="60" height="60" rx="12" fill="#0E0E0E" />
        <text
          x="30"
          y="46"
          fontFamily="Outfit, Inter, sans-serif"
          fontWeight="800"
          fontSize="44"
          fill="#F7F3EA"
          textAnchor="middle"
          letterSpacing="-1.5"
        >
          C
        </text>
        <circle cx="49" cy="47" r="5" fill="#C8FF4D" />
      </svg>
    );
  }

  // Wordmark: "Churvox" with a lime accent dot. Single inline SVG, scales perfectly.
  // ViewBox tuned so 1em-height keeps the wordmark legible at small sizes.
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
      {/* Lime accent dot — matches the "You approve." highlight in the hero */}
      <circle cx="206" cy="38" r="6" fill="#C8FF4D" />
    </svg>
  );
}

// Backward-compat default export (some files may have imported default).
export default ChurvoxLogo;
