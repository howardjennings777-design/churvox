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
    height: clamp(90px, 8.8vw, 148px) !important;
    width: auto !important;
    min-width: clamp(250px, 24vw, 410px) !important;
    max-width: none !important;
    object-fit: contain !important;
    display: block !important;
    transform: scale(1.14) !important;
    transform-origin: center !important;
    filter: drop-shadow(0 16px 34px rgba(37, 99, 235, 0.28)) !important;
  }

  div:has(> img[data-testid="churvox-logo"][data-logo-size="hero"]),
  a:has(> img[data-testid="churvox-logo"][data-logo-size="hero"]) {
    background: transparent !important;
    background-image: none !important;
    border-color: transparent !important;
    box-shadow: none !important;
    overflow: visible !important;
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
    padding: 4px 0 !important;
  }

  /* Force the current Smart Hub hero to act like a brand/action panel.
     This hides the repeated white title/welcome block and the Best Next Move panel,
     while keeping the real logo and action buttons visible. */
  .smart-hub-hard-trade-v4 [class*="rounded"]:has(img[data-testid="churvox-logo"][data-logo-size="hero"]):has(button),
  .smart-hub-hard-trade-v4 section:has(img[data-testid="churvox-logo"][data-logo-size="hero"]):has(button),
  .smart-hub-hard-trade-v4 article:has(img[data-testid="churvox-logo"][data-logo-size="hero"]):has(button) {
    display: flex !important;
    flex-direction: column !important;
    gap: 28px !important;
    padding: clamp(28px, 4vw, 52px) !important;
  }

  .smart-hub-hard-trade-v4 [class*="rounded"]:has(img[data-testid="churvox-logo"][data-logo-size="hero"]):has(button) > *:not(:has(img[data-testid="churvox-logo"][data-logo-size="hero"])):not(:has(button)),
  .smart-hub-hard-trade-v4 section:has(img[data-testid="churvox-logo"][data-logo-size="hero"]):has(button) > *:not(:has(img[data-testid="churvox-logo"][data-logo-size="hero"])):not(:has(button)),
  .smart-hub-hard-trade-v4 article:has(img[data-testid="churvox-logo"][data-logo-size="hero"]):has(button) > *:not(:has(img[data-testid="churvox-logo"][data-logo-size="hero"])):not(:has(button)) {
    display: none !important;
  }

  .smart-hub-hard-trade-v4 *:has(> img[data-testid="churvox-logo"][data-logo-size="hero"]) ~ * {
    display: none !important;
  }

  .smart-hub-hard-trade-v4 [class*="rounded"]:has(img[data-testid="churvox-logo"][data-logo-size="hero"]):has(button) > *:has(img[data-testid="churvox-logo"][data-logo-size="hero"]),
  .smart-hub-hard-trade-v4 section:has(img[data-testid="churvox-logo"][data-logo-size="hero"]):has(button) > *:has(img[data-testid="churvox-logo"][data-logo-size="hero"]),
  .smart-hub-hard-trade-v4 article:has(img[data-testid="churvox-logo"][data-logo-size="hero"]):has(button) > *:has(img[data-testid="churvox-logo"][data-logo-size="hero"]) {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
    min-height: 150px !important;
  }

  .smart-hub-hard-trade-v4 [class*="rounded"]:has(img[data-testid="churvox-logo"][data-logo-size="hero"]):has(button) > *:has(button),
  .smart-hub-hard-trade-v4 section:has(img[data-testid="churvox-logo"][data-logo-size="hero"]):has(button) > *:has(button),
  .smart-hub-hard-trade-v4 article:has(img[data-testid="churvox-logo"][data-logo-size="hero"]):has(button) > *:has(button) {
    display: flex !important;
    align-items: center !important;
    flex-wrap: wrap !important;
    gap: 14px !important;
    padding-top: 18px !important;
    border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
  }

  .smart-hub-hard-trade-v4 [class*="rounded"]:has(img[data-testid="churvox-logo"][data-logo-size="hero"]):has(button) h1,
  .smart-hub-hard-trade-v4 [class*="rounded"]:has(img[data-testid="churvox-logo"][data-logo-size="hero"]):has(button) h2,
  .smart-hub-hard-trade-v4 [class*="rounded"]:has(img[data-testid="churvox-logo"][data-logo-size="hero"]):has(button) h3,
  .smart-hub-hard-trade-v4 [class*="rounded"]:has(img[data-testid="churvox-logo"][data-logo-size="hero"]):has(button) p:not(:has(button)),
  .smart-hub-hard-trade-v4 [class*="rounded"]:has(img[data-testid="churvox-logo"][data-logo-size="hero"]):has(button) span:not(:has(button)) {
    display: none !important;
  }

  @media (max-width: 768px) {
    img[data-testid="churvox-logo"][data-logo-size="hero"] {
      height: clamp(78px, 18vw, 116px) !important;
      min-width: clamp(210px, 58vw, 320px) !important;
      transform: scale(1.06) !important;
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
