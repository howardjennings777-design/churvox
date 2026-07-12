// The main usage runtime recognises the current ProductApp plans layout.
// This bridge requests scans after client-side navigation and owns only the
// small grid compatibility rule needed for DOM-injected plan sections.

const STYLE_ID = "churvox-product-plans-usage-grid-style";
let observer = null;
let scanning = false;

function ensureGridStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `#churvox-plan-live-usage{grid-column:1/-1;width:100%;min-width:0;box-sizing:border-box}`;
  document.head.appendChild(style);
}

function isProductPlansPage() {
  const path = window.location.pathname || "";
  const hash = (window.location.hash || "").replace(/^#/, "");
  return path === "/plans" || (path === "/dashboard" && hash === "plans");
}

async function bridge() {
  if (!isProductPlansPage() || scanning) return;
  if (!document.querySelector(".cv3Product, .freshPricingPage, .cvPlansPage, [data-churvox-page='plans']")) return;
  ensureGridStyle();
  scanning = true;
  try {
    const runtime = await import("./churvoxPlansUsageTruthRuntime");
    runtime.scan?.();
  } finally {
    scanning = false;
  }
}

function start() {
  if (observer) return;
  observer = new MutationObserver(() => window.requestAnimationFrame(bridge));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", bridge);
  window.addEventListener("hashchange", bridge);
  window.addEventListener("churvox-auth-refresh", bridge);
  bridge();
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}

export { bridge };
