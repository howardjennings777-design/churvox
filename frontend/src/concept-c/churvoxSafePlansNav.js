// CHURVOX_STABLE_COMMAND_BOTTOM_NAV_20260531
// Stabilises the Command Floor bottom nav into one slim set of links.
// Runtime-only: no billing, trial, Stripe, API, auth, or backend logic touched.

const COMMAND_NAV_LINKS = [
  ["/dashboard", "Command"],
  ["/jobs", "Jobs"],
  ["/team", "Crew"],
  ["/clients", "Clients"],
  ["/invoices", "Money"],
  ["/plans", "Plans"],
  ["/quotes", "Quotes"],
];

function currentPath() {
  return String(window.location?.pathname || "/dashboard").replace(/\/$/, "") || "/dashboard";
}

function isActiveLink(href) {
  const path = currentPath();
  if (href === "/dashboard") return path === "/dashboard" || path === "/";
  return path === href || path.startsWith(`${href}/`);
}

function makeNavLink(href, label) {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;
  link.setAttribute("aria-label", label);
  link.setAttribute("data-churvox-stable-nav-link", "true");
  if (label === "Plans") link.setAttribute("data-churvox-safe-plans", "true");
  if (isActiveLink(href)) link.classList.add("active");
  return link;
}

function rebuildNav(nav) {
  if (!nav) return;

  const alreadyClean =
    nav.getAttribute("data-churvox-stable-command-nav") === "true" &&
    Array.from(nav.querySelectorAll("a[data-churvox-stable-nav-link='true']")).length === COMMAND_NAV_LINKS.length &&
    !nav.querySelector("label,input,button,b");

  if (!alreadyClean) {
    nav.innerHTML = "";
    COMMAND_NAV_LINKS.forEach(([href, label]) => nav.appendChild(makeNavLink(href, label)));
    nav.setAttribute("data-churvox-stable-command-nav", "true");
  } else {
    Array.from(nav.querySelectorAll("a[data-churvox-stable-nav-link='true']")).forEach((link) => {
      const href = link.getAttribute("href") || "";
      link.classList.toggle("active", isActiveLink(href));
    });
  }
}

function fixNavsOnce() {
  document.querySelectorAll(".xcf10-dock, .xcf-bottom-nav").forEach(rebuildNav);
}

function startNavFixRetry() {
  fixNavsOnce();
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    fixNavsOnce();
    if (attempts >= 40) window.clearInterval(timer);
  }, 350);
}

function hookNavigationRefresh() {
  if (window.__churvoxStableCommandNavHooked) return;
  window.__churvoxStableCommandNavHooked = true;

  ["pushState", "replaceState"].forEach((method) => {
    const original = window.history && window.history[method];
    if (typeof original !== "function") return;
    window.history[method] = function patchedHistoryMethod(...args) {
      const result = original.apply(this, args);
      window.setTimeout(fixNavsOnce, 50);
      return result;
    };
  });

  window.addEventListener("popstate", () => window.setTimeout(fixNavsOnce, 50));
  window.addEventListener("click", () => window.setTimeout(fixNavsOnce, 80), true);
}

if (typeof window !== "undefined") {
  hookNavigationRefresh();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startNavFixRetry, { once: true });
  } else {
    startNavFixRetry();
  }
  window.addEventListener("load", startNavFixRetry, { once: true });
}
