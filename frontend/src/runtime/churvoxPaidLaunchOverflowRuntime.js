// Paid launch overflow guard.
// Keeps legacy docks out of the owner app while preserving visible launch nav proof labels.

const STYLE_ID = "churvox-paid-launch-overflow-runtime-css";

function hasOwnerShell() {
  return Boolean(document.querySelector(".churvoxOptionC"));
}

function putStyle(el, key, value) {
  try {
    el.style.setProperty(key, value, "important");
  } catch (_) {}
}

function installCss() {
  if (document.getElementById(STYLE_ID)) return;
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

    body:has(.churvoxOptionC) *,
    body:has(.churvoxOptionC) *::before,
    body:has(.churvoxOptionC) *::after {
      box-sizing: border-box !important;
      min-width: 0 !important;
    }

    body:has(.churvoxOptionC) .xcf10-dock,
    body:has(.churvoxOptionC) .xcf10-dock-launch {
      display: none !important;
      visibility: hidden !important;
      width: 0 !important;
      max-width: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
    }

    .churvoxOptionC,
    .churvoxOptionC .cocBar,
    .churvoxOptionC .cocNav,
    .churvoxOptionC .launchNavProof,
    .churvoxOptionC .workspace,
    .churvoxOptionC .cocPage,
    .churvoxOptionC .cocPanel {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      overflow-x: hidden !important;
    }

    .churvoxOptionC .cocNav,
    .churvoxOptionC .launchNavProof {
      display: grid !important;
      grid-template-columns: repeat(auto-fit, minmax(min(88px, 100%), 1fr)) !important;
      gap: 4px !important;
      white-space: normal !important;
    }

    .churvoxOptionC .cocNav button,
    .churvoxOptionC .launchNavProof span {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }
  `;
  document.head.appendChild(style);
}

function clampRootScrollWidth() {
  for (const el of [document.documentElement, document.body, document.getElementById("root")].filter(Boolean)) {
    putStyle(el, "width", "100%");
    putStyle(el, "max-width", "100%");
    putStyle(el, "min-width", "0");
    putStyle(el, "overflow-x", "hidden");
  }
}

function hideLegacyDocks() {
  document.querySelectorAll(".xcf10-dock, .xcf10-dock-launch").forEach((el) => {
    putStyle(el, "display", "none");
    putStyle(el, "visibility", "hidden");
    putStyle(el, "width", "0");
    putStyle(el, "max-width", "0");
    putStyle(el, "height", "0");
    putStyle(el, "overflow", "hidden");
    el.setAttribute("aria-hidden", "true");
  });
}

function showSafeProofLabels() {
  document.querySelectorAll(".churvoxOptionC .launchNavProof").forEach((el) => {
    putStyle(el, "display", "grid");
    putStyle(el, "visibility", "visible");
    putStyle(el, "width", "100%");
    putStyle(el, "max-width", "100%");
    putStyle(el, "min-width", "0");
    putStyle(el, "height", "auto");
    putStyle(el, "max-height", "none");
    putStyle(el, "overflow", "hidden");
    putStyle(el, "grid-template-columns", "repeat(auto-fit, minmax(min(88px, 100%), 1fr))");
    el.removeAttribute("aria-hidden");
  });
}

function clampOwnerShell() {
  if (!hasOwnerShell()) return;
  installCss();
  clampRootScrollWidth();
  hideLegacyDocks();
  showSafeProofLabels();

  document.querySelectorAll(".churvoxOptionC, .churvoxOptionC *").forEach((el) => {
    putStyle(el, "min-width", "0");
    putStyle(el, "max-width", "100%");
  });

  document.querySelectorAll(".churvoxOptionC .cocNav, .churvoxOptionC .launchNavProof").forEach((el) => {
    putStyle(el, "display", "grid");
    putStyle(el, "overflow-x", "hidden");
  });
}

function run() {
  [0, 1, 25, 100, 300, 700, 1300, 2200].forEach((ms) => window.setTimeout(clampOwnerShell, ms));
  window.requestAnimationFrame?.(clampOwnerShell);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", run);
  window.addEventListener("load", run);
  window.addEventListener("resize", run);
  window.addEventListener("hashchange", run);
  window.addEventListener("popstate", run);
  window.addEventListener("churvox:fresh-data-updated", run);
  run();
}
