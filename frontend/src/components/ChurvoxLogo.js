import React from "react";

// Single source of truth for the Churvox logo.
// To swap the logo, replace /public/churvox-logo.png
const LOGO_PATH = "/churvox-logo.png";

const SIZE_MAP = {
  sm: "h-10",
  md: "h-14",
  lg: "h-20",
  xl: "h-28",
};

export function ChurvoxLogo({ size = "md", className = "", dataTestId = "churvox-logo" }) {
  return (
    <img
      src={LOGO_PATH}
      alt="Churvox"
      className={`w-auto object-contain ${SIZE_MAP[size] || SIZE_MAP.md} ${className}`}
      data-testid={dataTestId}
    />
  );
}
