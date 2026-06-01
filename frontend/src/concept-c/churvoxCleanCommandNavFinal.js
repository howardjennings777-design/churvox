// CHURVOX_CLEAN_COMMAND_NAV_FINAL_20260602
// Fixes the over-styled sidebar shown on dashboard: one dark theme, plain labels, no desktop bottom nav.

const LABELS = {
  "/dashboard": ["CB", "Command Board"],
  "/overview": ["CB", "Command Board"],
  "/jobs": ["JB", "Jobs"],
  "/dispatch": ["DP", "Dispatch"],
  "/dispatch-board": ["DP", "Dispatch"],
  "/crew-map": ["MP", "Crew Map"],
  "/dispatch/map": ["MP", "Crew Map"],
  "/clients": ["CL", "Clients"],
  "/quotes": ["QT", "Quotes"],
  "/invoices": ["IV", "Invoices"],
  "/team": ["TM", "Team"],
  "/plans": ["PL", "Plans"],
  "/settings": ["ST", "Settings"],
  "/support": ["?", "Support"],
};

function cleanHref(href) {
  try {
    const url = new URL(href, window.location.origin);
    return url.pathname;
  } catch {
    return href || "";
  }
}

function injectStyle() {
  if (document.getElementById("churvox-clean-command-nav-final-style")) return;
  const style = document.createElement("style");
  style.id = "churvox-clean-command-nav-final-style";
  style.textContent = `
    @media (min-width: 900px) {
      body:has(aside) [class*="bottom"] nav,
      body:has(aside) [class*="BottomNav"],
      body:has(aside) .fixed.bottom-0,
      body:has(aside) .fixed.bottom-3,
      body:has(aside) .fixed.bottom-4,
      body:has(aside) .fixed.bottom-5,
      body:has(aside) .fixed.bottom-6,
      body:has(aside) .fixed.bottom-8 {
        display: none !important;
      }
    }

    aside[data-sidebar-version],
    aside {
      background: #0f1722 !important;
      border-right: 1px solid rgba(148,163,184,.18) !important;
    }

    aside a[href],
    aside nav a[href] {
      background: transparent !important;
      background-image: none !important;
      border: 0 !important;
      box-shadow: none !important;
      color: #cbd5e1 !important;
      min-height: 40px !important;
      height: auto !important;
      padding: 10px 12px !important;
      border-radius: 14px !important;
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      text-align: left !important;
      justify-content: flex-start !important;
      transform: none !important;
    }

    aside a[href]:hover {
      background: rgba(255,255,255,.08) !important;
      color: #fff !important;
    }

    aside a[href][data-churvox-active="true"],
    aside a[href].bg-white,
    aside a[href][aria-current="page"] {
      background: #22d3ee !important;
      color: #06111f !important;
      box-shadow: none !important;
    }

    aside a[href] span:first-child {
      width: 28px !important;
      height: 28px !important;
      min-width: 28px !important;
      border-radius: 10px !important;
      background: rgba(255,255,255,.10) !important;
      color: #67e8f9 !important;
      display: grid !important;
      place-items: center !important;
      font-size: 10px !important;
      font-weight: 950 !important;
      letter-spacing: 0 !important;
    }

    aside a[href][data-churvox-active="true"] span:first-child,
    aside a[href].bg-white span:first-child,
    aside a[href][aria-current="page"] span:first-child {
      background: rgba(15,23,42,.95) !important;
      color: #fff !important;
    }

    aside a[href] span:last-child,
    aside a[href] span.truncate {
      color: inherit !important;
      font-size: 14px !important;
      line-height: 18px !important;
      font-weight: 850 !important;
      letter-spacing: 0 !important;
      min-width: 0 !important;
      width: auto !important;
      white-space: normal !important;
      opacity: 1 !important;
    }

    aside a[href] span.truncate::after,
    aside a[href] span:last-child::after {
      display: none !important;
      content: none !important;
    }
  `;
  document.head.appendChild(style);
}

function ensureCrewMap(sidebar) {
  if (!sidebar || sidebar.querySelector('a[href="/crew-map"]')) return;
  const dispatch = sidebar.querySelector('a[href="/dispatch"]') || sidebar.querySelector('a[href="/dispatch-board"]');
  if (!dispatch) return;
  const link = dispatch.cloneNode(true);
  link.href = "/crew-map";
  link.setAttribute("href", "/crew-map");
  dispatch.insertAdjacentElement("afterend", link);
}

function cleanSidebar() {
  const current = window.location.pathname;
  document.querySelectorAll("aside").forEach((aside) => {
    ensureCrewMap(aside);
    aside.querySelectorAll("a[href]").forEach((link) => {
      const path = cleanHref(link.getAttribute("href"));
      const entry = LABELS[path];
      if (!entry) return;
      const spans = link.querySelectorAll("span");
      if (spans[0]) spans[0].textContent = entry[0];
      if (spans[1]) spans[1].textContent = entry[1];
      else link.append(document.createTextNode(entry[1]));
      const active = current === path || (path !== "/dashboard" && current.startsWith(`${path}/`));
      link.dataset.churvoxActive = active ? "true" : "false";
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  });
}

function run() {
  injectStyle();
  cleanSidebar();
}

if (typeof window !== "undefined") {
  run();
  window.addEventListener("DOMContentLoaded", run);
  window.addEventListener("load", run);
  window.addEventListener("popstate", run);
  const originalPush = window.history.pushState;
  const originalReplace = window.history.replaceState;
  window.history.pushState = function patchedPushState(...args) { const out = originalPush.apply(this, args); setTimeout(run, 0); return out; };
  window.history.replaceState = function patchedReplaceState(...args) { const out = originalReplace.apply(this, args); setTimeout(run, 0); return out; };
  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export default null;
