// The main usage runtime now recognises the current ProductApp plans layout.
// This small bridge only requests a fresh scan after client-side navigation;
// it must never add legacy layout classes to the current product screen.

let observer = null;
let scanning = false;

function isProductPlansPage() {
  const path = window.location.pathname || "";
  const hash = (window.location.hash || "").replace(/^#/, "");
  return path === "/plans" || (path === "/dashboard" && hash === "plans");
}

async function bridge() {
  if (!isProductPlansPage() || scanning) return;
  if (!document.querySelector(".cv3Product, .freshPricingPage, .cvPlansPage, [data-churvox-page='plans']")) return;
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
