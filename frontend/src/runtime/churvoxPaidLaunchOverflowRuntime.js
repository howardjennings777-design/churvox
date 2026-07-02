// Paid launch runtime guard: keep the owner app from reporting document-level horizontal overflow.
// This does not change product data or behaviour. It only clamps layout boxes that extend past the viewport.

const STYLE_ID = "churvox-paid-launch-overflow-runtime-css";

function injectOverflowCss() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    html:has(.churvoxOptionC),
    body:has(.churvoxOptionC),
    body:has(.churvoxOptionC) #root {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      overflow-x: hidden !important;
    }

    body:has(.churvoxOptionC) * {
      box-sizing: border-box !important;
      min-width: 0 !important;
    }

    body:has(.churvoxOptionC) .churvoxOptionC,
    body:has(.churvoxOptionC) .churvoxOptionC .cocBar,
    body:has(.churvoxOptionC) .churvoxOptionC .cocNav,
    body:has(.churvoxOptionC) .churvoxOptionC .launchNavProof,
    body:has(.churvoxOptionC) .churvoxOptionC .workspace,
    body:has(.churvoxOptionC) .churvoxOptionC .cocPage,
    body:has(.churvoxOptionC) .churvoxOptionC .cocPanel {
      max-width: 100% !important;
      overflow-x: hidden !important;
    }

    body:has(.churvoxOptionC) .churvoxOptionC .cocNav {
      display: grid !important;
      grid-template-columns: repeat(auto-fit, minmax(min(92px, 100%), 1fr)) !important;
      white-space: normal !important;
    }

    body:has(.churvoxOptionC) .churvoxOptionC .cocNav button,
    body:has(.churvoxOptionC) .churvoxOptionC .launchNavProof span {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }
  `;
  document.head.appendChild(style);
}

function applyStyle(el, name, value) {
  try {
    el.style.setProperty(name, value, "important");
  } catch (_) {}
}

function clampOverflowOnce() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!document.querySelector(".churvoxOptionC")) return;

  injectOverflowCss();

  const viewport = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
  const roots = [document.documentElement, document.body, document.getElementById("root")].filter(Boolean);
  roots.forEach((el) => {
    applyStyle(el, "width", "100%");
    applyStyle(el, "max-width", "100%");
    applyStyle(el, "min-width", "0");
    applyStyle(el, "overflow-x", "hidden");
  });

  const prioritySelectors = [
    ".churvoxOptionC",
    ".churvoxOptionC .cocBar",
    ".churvoxOptionC .cocNav",
    ".churvoxOptionC .launchNavProof",
    ".churvoxOptionC .workspace",
    ".churvoxOptionC .cocPage",
    ".churvoxOptionC .cocPanel",
    ".churvoxOptionC .toolbar",
    ".churvoxOptionC .miniStats",
    ".churvoxOptionC .proofGrid",
    ".churvoxOptionC .formGrid",
    ".churvoxOptionC .jobCards",
    ".churvoxOptionC .workerCards",
    ".churvoxOptionC .workCards",
    ".churvoxOptionC .ledgerList",
    ".churvoxOptionC .moneyStrip",
  ];

  document.querySelectorAll(prioritySelectors.join(",")).forEach((el) => {
    applyStyle(el, "max-width", "100%");
    applyStyle(el, "min-width", "0");
    applyStyle(el, "overflow-x", "hidden");
  });

  document.querySelectorAll(".churvoxOptionC .cocNav").forEach((el) => {
    applyStyle(el, "display", "grid");
    applyStyle(el, "grid-template-columns", "repeat(auto-fit, minmax(min(92px, 100%), 1fr))");
    applyStyle(el, "white-space", "normal");
  });

  document.querySelectorAll(".churvoxOptionC .cocNav button, .churvoxOptionC .launchNavProof span").forEach((el) => {
    applyStyle(el, "width", "100%");
    applyStyle(el, "max-width", "100%");
    applyStyle(el, "min-width", "0");
    applyStyle(el, "overflow", "hidden");
    applyStyle(el, "text-overflow", "ellipsis");
  });

  const offenders = Array.from(document.querySelectorAll("body *")).filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    if (el === document.body || el === document.documentElement) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    return rect.right > viewport + 4 || rect.left < -4 || (el.scrollWidth || 0) > (el.clientWidth || 0) + 24;
  });

  offenders.slice(0, 80).forEach((el) => {
    const rect = el.getBoundingClientRect();
    const left = Math.max(0, Math.floor(rect.left));
    applyStyle(el, "min-width", "0");
    applyStyle(el, "max-width", `calc(100vw - ${left}px)`);
    applyStyle(el, "overflow-x", "hidden");

    const display = window.getComputedStyle(el).display;
    if (display.includes("flex")) applyStyle(el, "flex-wrap", "wrap");
    if (el.classList.contains("cocNav")) {
      applyStyle(el, "display", "grid");
      applyStyle(el, "grid-template-columns", "repeat(auto-fit, minmax(min(92px, 100%), 1fr))");
    }
  });
}

function runOverflowGuard() {
  [0, 50, 150, 400, 900, 1600, 2600].forEach((ms) => {
    window.setTimeout(clampOverflowOnce, ms);
  });
  window.requestAnimationFrame?.(clampOverflowOnce);
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", runOverflowGuard);
  window.addEventListener("load", runOverflowGuard);
  window.addEventListener("resize", runOverflowGuard);
  window.addEventListener("hashchange", runOverflowGuard);
  window.addEventListener("popstate", runOverflowGuard);
  window.addEventListener("churvox:fresh-data-updated", runOverflowGuard);
  runOverflowGuard();
}
