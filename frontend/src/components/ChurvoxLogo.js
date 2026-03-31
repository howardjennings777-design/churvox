import React from "react";

// Single source of truth for the Churvox logo.
// To swap the logo, change this one URL.
export const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_phase1-launch/artifacts/j84zpsqt_1000049586.png";

/**
 * Shared Churvox logo component.
 * @param {"sm"|"md"|"lg"|"xl"} size  – predefined size preset
 * @param {string}  className         – extra Tailwind classes
 * @param {string}  dataTestId        – data-testid override
 */
const SIZE_MAP = {
  sm: "h-8",
  md: "h-10",
  lg: "h-14",
  xl: "h-20",
};

export function ChurvoxLogo({ size = "md", className = "", dataTestId = "churvox-logo" }) {
  return (
    <img
      src={LOGO_URL}
      alt="Churvox"
      className={`w-auto object-contain churvox-logo ${SIZE_MAP[size] || SIZE_MAP.md} ${className}`}
      data-testid={dataTestId}
    />
  );
}
