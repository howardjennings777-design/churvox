// Paid launch overflow guard.
// Keeps legacy docks out of the owner app. The old launch proof rail is now hidden.

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
    body:has(.churvoxOptionC) .xcf10-dock-launch,
    body:has(.churvoxOptionC) .launchNavProof,
    body:has(.churvoxOptionC) .churvoxOptionC .launchNavProof {
      display: none !important;
      visibility: hidden !important;
      width: 0 !important;
      max-width: 0 !important;
      height: 0 !important;
      max-height: 0 !important;
      overflow: hidden !important;
      padding: 0 !important;
      margin: 0 !important;
      border: 0 !important;
    }

    .churvoxOptionC,
    .churvoxOptionC .cocBar,
    .churvoxOptionC .cocNav,
    .churvoxOptionC .workspace,
    .churvoxOptionC .cocPage,
    .churvoxOptionC .cocPanel {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      overflow-x: hidden !important;
    }

    .churvoxOptionC .cocNav {
      max-width: 100% !important;
      min-width: 0 !important;
      white-space: normal !important;
    }

    .churvoxOptionC .cocNav button {
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

function hideProofLabels() {
  document.querySelectorAll(".churvoxOptionC .launchNavProof, .launchNavProof").forEach((el) => {
    putStyle(el, "display", "none");
    putStyle(el, "visibility", "hidden");
    putStyle(el, "width", "0");
    putStyle(el, "max-width", "0");
    putStyle(el, "min-width", "0");
    putStyle(el, "height", "0");
    putStyle(el, "max-height", "0");
    putStyle(el, "overflow", "hidden");
    putStyle(el, "padding", "0");
    putStyle(el, "margin", "0");
    putStyle(el, "border", "0");
    el.setAttribute("aria-hidden", "true");
  });
}

function clampOwnerShell() {
  if (!hasOwnerShell()) return;
  installCss();
  clampRootScrollWidth();
  hideLegacyDocks();
  hideProofLabels();

  document.querySelectorAll(".churvoxOptionC, .churvoxOptionC *").forEach((el) => {
    putStyle(el, "min-width", "0");
    putStyle(el, "max-width", "100%");
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
