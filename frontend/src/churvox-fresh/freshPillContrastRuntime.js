function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function rgbParts(value) {
  const match = String(value || "").match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;
  const parts = match[1].split(",").map((x) => Number(String(x).trim()));
  if (parts.length < 3) return null;
  const alpha = parts.length >= 4 ? parts[3] : 1;
  return { r: parts[0], g: parts[1], b: parts[2], a: alpha };
}

function luminance(rgb) {
  const vals = [rgb.r, rgb.g, rgb.b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return vals[0] * 0.2126 + vals[1] * 0.7152 + vals[2] * 0.0722;
}

function transparent(color) {
  return !color || color === "transparent" || /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/i.test(color);
}

function effectiveBackground(el) {
  let node = el;
  while (node && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const bg = style.backgroundColor;
    if (!transparent(bg)) return bg;

    // Dark gradient/panel fallback.
    const bgImage = String(style.backgroundImage || "");
    const cls = String(node.className || "");
    if (
      bgImage !== "none" &&
      /hero|command|dark|launcher|operator|workspace|shell/i.test(cls)
    ) {
      return "rgb(17, 24, 39)";
    }

    node = node.parentElement;
  }

  return window.getComputedStyle(document.body).backgroundColor || "rgb(255,255,255)";
}

function isInsideDarkPanel(el) {
  return Boolean(el.closest(
    ".freshDark, .freshShellSidebar, .freshTellLauncherHero, .freshCommandHero, .freshWorkerAppHero, .freshAIHubHero, [class*='Dark'], [class*='dark']"
  ));
}

function looksLikePill(el) {
  const text = clean(el.innerText || el.textContent || "");
  if (!text || text.length > 70) return false;

  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 6 || rect.width > 420 || rect.height > 90) return false;

  const cls = `${el.className || ""} ${el.parentElement?.className || ""}`;
  const tag = el.tagName.toLowerCase();
  const radius = Number.parseFloat(style.borderRadius || "0");

  if (/pill|chip|badge|tag|filter|status|label|tab|seg|count|guide|notice|current/i.test(cls)) return true;
  if (el.closest(".freshCommandFilterBar")) return true;
  if (tag === "button" && radius >= 12 && rect.height <= 72) return true;
  if (tag === "span" && radius >= 8 && rect.height <= 52) return true;
  if (tag === "b" && el.closest("button")) return true;
  if (tag === "small" && el.closest("button")) return true;

  const shortCaps = text.length <= 28 && text === text.toUpperCase();
  if (shortCaps && radius >= 6 && rect.height <= 60) return true;

  return false;
}

function readableColorFor(el) {
  if (isInsideDarkPanel(el)) return "#ffffff";

  const bg = rgbParts(effectiveBackground(el));
  if (!bg || bg.a === 0) return "#111827";

  return luminance(bg) < 0.42 ? "#ffffff" : "#111827";
}

function applyReadable(el) {
  if (!el || !looksLikePill(el)) return;

  const color = readableColorFor(el);
  el.style.color = color;
  el.style.webkitTextFillColor = color;
  el.style.opacity = "1";
  el.style.mixBlendMode = "normal";
  el.style.fontWeight = el.tagName.toLowerCase() === "span" ? "900" : el.style.fontWeight || "";

  // Make child text inherit the fixed colour.
  el.querySelectorAll("span,b,small,em,strong,label").forEach((child) => {
    child.style.color = color;
    child.style.webkitTextFillColor = color;
    child.style.opacity = "1";
    child.style.mixBlendMode = "normal";
  });

  // Count bubbles on active dark filter pills should be bright and readable.
  if (el.matches(".freshCommandFilterBar button.active, .freshCommandFilterBar button[aria-pressed='true']")) {
    el.querySelectorAll("b,strong").forEach((child) => {
      child.style.background = "#f97316";
      child.style.backgroundColor = "#f97316";
      child.style.color = "#ffffff";
      child.style.webkitTextFillColor = "#ffffff";
      child.style.borderRadius = "999px";
      child.style.minWidth = "1.5rem";
      child.style.textAlign = "center";
    });
  }
}

export function fixPillContrastNow() {
  if (typeof document === "undefined") return;

  const selector = [
    "button",
    "span",
    "small",
    "b",
    "em",
    "strong",
    "label",
    "[class*='Pill']",
    "[class*='pill']",
    "[class*='Badge']",
    "[class*='badge']",
    "[class*='Tag']",
    "[class*='tag']",
    "[class*='Chip']",
    "[class*='chip']",
    ".freshCommandFilterBar *",
  ].join(",");

  document.querySelectorAll(selector).forEach(applyReadable);
}

export function installPillContrastRuntime() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};

  let frame = 0;
  const run = () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(fixPillContrastNow);
  };

  run();
  window.setTimeout(run, 250);
  window.setTimeout(run, 900);
  window.setTimeout(run, 1800);

  const observer = new MutationObserver(run);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "aria-pressed", "aria-current"],
  });

  window.addEventListener("hashchange", run);
  window.addEventListener("churvox:fresh-data-updated", run);
  window.addEventListener("focus", run);

  return () => {
    window.cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener("hashchange", run);
    window.removeEventListener("churvox:fresh-data-updated", run);
    window.removeEventListener("focus", run);
  };
}
