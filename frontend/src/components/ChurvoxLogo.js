import React, { useState } from "react";

// Single source of truth for the Churvox logo.
// To swap the logo, replace /public/churvox-logo.png
const LOGO_PATH = "/churvox-logo.png";

const SIZE_MAP = {
  sm: "h-8",
  md: "h-10",
  lg: "h-12",
  xl: "h-16",
  hero: "h-24 sm:h-28 lg:h-32",
};

export function ChurvoxLogo({ size = "md", className = "", dataTestId = "churvox-logo" }) {
  const [loadFailed, setLoadFailed] = useState(false);

  if (loadFailed) {
    return (
      <span
        className={`inline-flex items-center font-semibold tracking-wide text-current ${SIZE_MAP[size] || SIZE_MAP.md} ${className}`}
        data-testid={dataTestId}
        data-logo-size={size}
      >
        Churvox
      </span>
    );
  }

  return (
    <img
      src={LOGO_PATH}
      alt="Churvox"
      className={`w-auto max-w-full object-contain ${SIZE_MAP[size] || SIZE_MAP.md} ${className}`}
      data-testid={dataTestId}
      data-logo-size={size}
      onError={() => setLoadFailed(true)}
      loading="eager"
      decoding="async"
    />
  );
}
