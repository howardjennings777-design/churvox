// Keeps the verified usage panel attached to the current ProductApp plans layout.
// The main usage runtime supports legacy plan roots; this bridge gives the
// current .cv3Product screen the same stable hooks and explicitly runs a scan.

let observer = null;
let scanning = false;

function isProductPlansPage() {
  const path = window.location.pathname || "";
  const hash = (window.location.hash || "").replace(/^#/, "");
  return path === "/plans" || (path === "/dashboard" && hash === "plans");
}

async function bridge() {
  if (!isProductPlansPage() || scanning) return;
  const root = document.querySelector(".cv3Product");
  const hero = root?.querySelector(".cv3Hero.page-plans");
  if (!root || !hero) return;

  scanning = true;
  try {
    root.classList.add("cvPlansPage");
    hero.classList.add("cvPlanPanel");
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
