function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function rgbParts(value) {
  const match = String(value || "").match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;
  const parts = match[1].split(",").map((x) => Number(String(x).trim()));
  if (parts.length < 3) return null;
  return {
    r: parts[0],
    g: parts[1],
    b: parts[2],
    a: parts.length >= 4 ? parts[3] : 1,
  };
}

function luminance(rgb) {
  const vals = [rgb.r, rgb.g, rgb.b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return vals[0] * 0.2126 + vals[1] * 0.7152 + vals[2] * 0.0722;
}

function isTransparentOrOverlay(color) {
  const rgba = rgbParts(color);
  return !rgba || rgba.a <= 0.18;
}

function effectiveBackground(el) {
  let node = el;

  while (node && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const bg = style.backgroundColor;
    const rgba = rgbParts(bg);

    if (rgba && rgba.a > 0.18) {
      return bg;
    }

    const bgImage = String(style.backgroundImage || "");
    const cls = String(node.className || "");
    const text = clean(node.textContent || "");

    if (
      /hero|command|dark|launcher|operator|workspace|shell|sidebar|stat|summary|board|modal/i.test(cls) ||
      bgImage !== "none" ||
      /\b(CHURVOX FRESH|OWNER WORKER VIEW|BUSINESS SETUP|PRICING COUNTRY|CURRENT PLAN|CALENDAR|TEAM)\b/i.test(text)
    ) {
      const parentBg = bg;
      if (!isTransparentOrOverlay(parentBg)) return parentBg;
      return "rgb(17, 24, 39)";
    }

    node = node.parentElement;
  }

  return window.getComputedStyle(document.body).backgroundColor || "rgb(247, 243, 234)";
}

function isInsideDarkPanel(el) {
  return Boolean(el.closest(
    ".freshDark, .freshHero, .freshShellSidebar, .freshAskHero, .tellHero, .freshTellLauncherHero, .freshCommandHero, .freshWorkerAppHero, .freshAIHubHero, .freshWorkerAppSummary, .fresh/* DISABLED_CONFLICT_CommandBoard */, .freshCommandBox, [class*='Hero'], [class*='Dark'], [class*='dark']"
  ));
}

function looksLikePill(el) {
  const text = clean(el.innerText || el.textContent || "");
  if (!text || text.length > 80) return false;
  if (/^(CLOCKED IN|CURRENT PLAN)$/i.test(text)) return true;

  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();

  if (rect.width < 8 || rect.height < 6 || rect.width > 430 || rect.height > 92) return false;

  const cls = `${el.className || ""} ${el.parentElement?.className || ""}`;
  const tag = el.tagName.toLowerCase();
  const radius = Number.parseFloat(style.borderRadius || "0");

  if (el.closest(".freshCommandFilterBar")) return true;
  if (/pill|chip|badge|tag|filter|status|label|tab|seg|count|guide|notice|current/i.test(cls)) return true;
  if (tag === "button" && el.matches(".active, .selected, .is-active, [aria-pressed='true'], [aria-current='true']")) return true;
  if (tag === "span" && radius >= 6 && rect.height <= 58 && text.length <= 40) return true;
  if (tag === "small" && text.length <= 42) return true;
  if (tag === "b" && text.length <= 18) return true;
  if (tag === "strong" && text.length <= 32 && radius >= 4) return true;

  const shortCaps = text.length <= 32 && text === text.toUpperCase();
  if (shortCaps && radius >= 4 && rect.height <= 64) return true;

  return false;
}

function readableColorFor(el) {
  if (isInsideDarkPanel(el)) return "#ffffff";

  const bg = rgbParts(effectiveBackground(el));
  if (!bg) return "#111827";

  return luminance(bg) < 0.42 ? "#ffffff" : "#111827";
}

function importantStyle(el, name, value) {
  if (!el || !el.style) return;
  el.style.setProperty(name, value, "important");
}

function applyReadable(el) {
  if (!el || !looksLikePill(el)) return;

  // Command controls are locked by Command CSS. Do not keep re-writing them,
  // because that causes the Pending / Approve / Decline pills to flicker.
  if (el.closest(".freshCommandStablePage")) return;

  const text = clean(el.innerText || el.textContent || "");
  const bg = rgbParts(effectiveBackground(el));
  let color = readableColorFor(el);

  if (el.classList?.contains("freshDarkPanelPill") || /^CURRENT PLAN$/i.test(text)) {
    color = "#ffffff";
  }

  if (/^CLOCKED IN$/i.test(text)) {
    color = "#111827";
    importantStyle(el, "background", "#f7f3ea");
    importantStyle(el, "background-color", "#f7f3ea");
  }

  importantStyle(el, "color", color);
  importantStyle(el, "-webkit-text-fill-color", color);
  importantStyle(el, "opacity", "1");
  importantStyle(el, "mix-blend-mode", "normal");

  if (el.tagName.toLowerCase() === "span" || el.tagName.toLowerCase() === "small") {
    importantStyle(el, "font-weight", "900");
  }

  el.querySelectorAll("span,b,small,em,strong,label").forEach((child) => {
    importantStyle(child, "color", color);
    importantStyle(child, "-webkit-text-fill-color", color);
    importantStyle(child, "opacity", "1");
    importantStyle(child, "mix-blend-mode", "normal");
  });

  if (el.matches("button.active, button.selected, button.is-active, button[aria-pressed='true'], button[aria-current='true']")) {
    importantStyle(el, "color", "#ffffff");
    importantStyle(el, "-webkit-text-fill-color", "#ffffff");

    el.querySelectorAll("span,small,em").forEach((child) => {
      importantStyle(child, "color", "#ffffff");
      importantStyle(child, "-webkit-text-fill-color", "#ffffff");
    });
  }

  if (el.matches(".freshCommandFilterBar button.active, .freshCommandFilterBar button[aria-pressed='true'], .freshCommandFilterBar button[aria-current='true']")) {
    importantStyle(el, "background", "#111827");
    importantStyle(el, "background-color", "#111827");
    importantStyle(el, "border-color", "#111827");

    el.querySelectorAll("b,strong").forEach((child) => {
      importantStyle(child, "background", "#f97316");
      importantStyle(child, "background-color", "#f97316");
      importantStyle(child, "color", "#ffffff");
      importantStyle(child, "-webkit-text-fill-color", "#ffffff");
      importantStyle(child, "border-radius", "999px");
      importantStyle(child, "min-width", "1.5rem");
      importantStyle(child, "text-align", "center");
      importantStyle(child, "opacity", "1");
    });
  }
}


function installHardPillContrastStyleTag() {
  if (typeof document === "undefined") return;

  let style = document.getElementById("churvox-hard-pill-contrast");
  if (!style) {
    style = document.createElement("style");
    style.id = "churvox-hard-pill-contrast";
    document.head.appendChild(style);
  }

  style.textContent = `
    html body .freshCommandPill {
      display: inline-flex !important;
      align-items: center !important;
      background: #111827 !important;
      background-color: #111827 !important;
      border-color: #111827 !important;
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
      opacity: 1 !important;
      font-weight: 900 !important;
    }

    html body .freshCommandFilterBar button.active,
    html body .freshCommandFilterBar button.selected,
    html body .freshCommandFilterBar button.is-active,
    html body .freshCommandFilterBar button[aria-pressed="true"],
    html body .freshCommandFilterBar button[aria-current="true"],
    html body button.active,
    html body button.selected,
    html body button.is-active,
    html body button[aria-pressed="true"],
    html body button[aria-current="true"] {
      background: #111827 !important;
      background-color: #111827 !important;
      border-color: #111827 !important;
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
      opacity: 1 !important;
    }

    html body .freshCommandFilterBar button.active span,
    html body .freshCommandFilterBar button.selected span,
    html body .freshCommandFilterBar button.is-active span,
    html body .freshCommandFilterBar button[aria-pressed="true"] span,
    html body .freshCommandFilterBar button[aria-current="true"] span,
    html body button.active span,
    html body button.selected span,
    html body button.is-active span,
    html body button[aria-pressed="true"] span,
    html body button[aria-current="true"] span,
    html body span.active {
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
      opacity: 1 !important;
    }

    html body .freshCommandFilterBar button.active b,
    html body .freshCommandFilterBar button.selected b,
    html body .freshCommandFilterBar button.is-active b,
    html body .freshCommandFilterBar button[aria-pressed="true"] b,
    html body .freshCommandFilterBar button[aria-current="true"] b {
      background: #f97316 !important;
      background-color: #f97316 !important;
      color: #111827 !important;
      -webkit-text-fill-color: #111827 !important;
      opacity: 1 !important;
      font-weight: 950 !important;
      border-radius: 999px !important;
      min-width: 1.5rem !important;
      text-align: center !important;
    }


    /* Command selected filter runtime lock — do not let global active-pill rules turn it black */
    html body .freshCommandStablePage .freshCommandFilterBar button.active,
    html body .freshCommandStablePage .freshCommandFilterBar button.commandFilterSelected,
    html body .freshCommandStablePage .freshCommandFilterBar button.active.commandFilterSelected,
    html body .freshCommandStablePage .freshCommandFilterBar button[aria-pressed="true"],
    html body .freshCommandStablePage .freshCommandFilterBar button[aria-current="true"] {
      background: #f97316 !important;
      background-color: #f97316 !important;
      border-color: #f97316 !important;
      color: #111827 !important;
      -webkit-text-fill-color: #111827 !important;
      opacity: 1 !important;
      font-weight: 950 !important;
      filter: none !important;
      text-shadow: none !important;
      mix-blend-mode: normal !important;
      transform: none !important;
      transition: none !important;
      animation: none !important;
    }

    html body .freshCommandStablePage .freshCommandFilterBar button.active span,
    html body .freshCommandStablePage .freshCommandFilterBar button.commandFilterSelected span,
    html body .freshCommandStablePage .freshCommandFilterBar button.active.commandFilterSelected span,
    html body .freshCommandStablePage .freshCommandFilterBar button[aria-pressed="true"] span,
    html body .freshCommandStablePage .freshCommandFilterBar button[aria-current="true"] span {
      color: #111827 !important;
      -webkit-text-fill-color: #111827 !important;
      opacity: 1 !important;
      font-weight: 950 !important;
    }

    html body .freshCommandStablePage .freshCommandFilterBar button.active b,
    html body .freshCommandStablePage .freshCommandFilterBar button.commandFilterSelected b,
    html body .freshCommandStablePage .freshCommandFilterBar button.active.commandFilterSelected b,
    html body .freshCommandStablePage .freshCommandFilterBar button[aria-pressed="true"] b,
    html body .freshCommandStablePage .freshCommandFilterBar button[aria-current="true"] b {
      background: #111827 !important;
      background-color: #111827 !important;
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
      opacity: 1 !important;
      font-weight: 950 !important;
      border-radius: 999px !important;
      min-width: 1.5rem !important;
      text-align: center !important;
    }

    html body .freshHero > span,
    html body .freshHero header > span,
    html body .freshHero div > span:first-child,
    html body .freshAskHero span,
    html body .tellHero span,
    html body .freshAskStats small,
    html body .freshAskStats b,
    html body [class*="Hero"] > span,
    html body [class*="Hero"] div > span:first-child {
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
      opacity: 1 !important;
      font-weight: 900 !important;
    }


    html body small.freshDarkPanelPill,
    html body .freshDarkPanelPill,
    html body .freshPricingHero small.freshDarkPanelPill,
    html body .freshPricingHero .freshDarkPanelPill,
    html body .freshCurrentPlanBox small.freshDarkPanelPill,
    html body .freshCurrentPlanBox .freshDarkPanelPill,
    html body .freshPlansPage small.freshDarkPanelPill,
    html body .freshPlansPage .freshDarkPanelPill {
      background: #111827 !important;
      background-color: #111827 !important;
      border-color: #111827 !important;
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
      opacity: 1 !important;
      font-weight: 950 !important;
      filter: none !important;
      text-shadow: none !important;
      mix-blend-mode: normal !important;
    }

    html body small.freshDarkPanelPill *,
    html body .freshDarkPanelPill *,
    html body .freshPricingHero small.freshDarkPanelPill *,
    html body .freshPricingHero .freshDarkPanelPill *,
    html body .freshCurrentPlanBox small.freshDarkPanelPill *,
    html body .freshCurrentPlanBox .freshDarkPanelPill *,
    html body .freshPlansPage small.freshDarkPanelPill *,
    html body .freshPlansPage .freshDarkPanelPill * {
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
      opacity: 1 !important;
    }

    html body .freshWorkerAppSummary span,
    html body .freshWorkerAppSummary small,
    html body .freshWorkerAppSummary b {
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
      opacity: 1 !important;
    }
  `;
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

  installHardPillContrastStyleTag();

  window.churvoxFixPills = fixPillContrastNow;

  let frame = 0;
  const run = () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(fixPillContrastNow);
  };

  run();
  [100, 250, 600, 1000, 1800, 3000, 5000].forEach((ms) => window.setTimeout(run, ms));
  const observer = new MutationObserver(run);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "aria-pressed", "aria-current"],
  });

  window.addEventListener("hashchange", run);
  window.addEventListener("churvox:fresh-data-updated", run);
  window.addEventListener("focus", run);
  window.addEventListener("click", run);

  return () => {
    window.cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener("hashchange", run);
    window.removeEventListener("churvox:fresh-data-updated", run);
    window.removeEventListener("focus", run);
    window.removeEventListener("click", run);
  };
}
