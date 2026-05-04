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

const SMART_HUB_LOGO_FIX_CSS = `
  img[data-testid="churvox-logo"][data-logo-size="hero"] {
    height: clamp(86px, 8.5vw, 138px) !important;
    width: auto !important;
    min-width: clamp(230px, 22vw, 380px) !important;
    max-width: none !important;
    object-fit: contain !important;
    display: block !important;
    transform: scale(1.18) !important;
    transform-origin: center !important;
    filter: drop-shadow(0 16px 34px rgba(37, 99, 235, 0.28)) !important;
  }

  div:has(> img[data-testid="churvox-logo"][data-logo-size="hero"]),
  a:has(> img[data-testid="churvox-logo"][data-logo-size="hero"]) {
    background: #070b14 !important;
    background-image: linear-gradient(135deg, #070b14 0%, #0b1220 100%) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
    box-shadow: none !important;
    overflow: visible !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 16px 22px !important;
  }

  @media (max-width: 768px) {
    img[data-testid="churvox-logo"][data-logo-size="hero"] {
      height: clamp(74px, 18vw, 110px) !important;
      min-width: clamp(190px, 56vw, 300px) !important;
      transform: scale(1.08) !important;
    }
  }
`;

export function ChurvoxLogo({ size = "md", className = "", dataTestId = "churvox-logo" }) {
  const [loadFailed, setLoadFailed] = useState(false);

  if (loadFailed) {
    return (
      <>
        {size === "hero" && <style>{SMART_HUB_LOGO_FIX_CSS}</style>}
        <span
          className={`inline-flex items-center font-semibold tracking-wide text-current ${SIZE_MAP[size] || SIZE_MAP.md} ${className}`}
          data-testid={dataTestId}
          data-logo-size={size}
        >
          Churvox
        </span>
      </>
    );
  }

  return (
    <>
      {size === "hero" && <style>{SMART_HUB_LOGO_FIX_CSS}</style>}
      <img
        src={LOGO_PATH}
        alt="Churvox"
        className={`block w-auto max-w-full object-contain ${SIZE_MAP[size] || SIZE_MAP.md} ${className}`}
        data-testid={dataTestId}
        data-logo-size={size}
        onError={() => setLoadFailed(true)}
        loading="eager"
        decoding="async"
      />
    </>
  );
}
