// CHURVOX_STABLE_COMMAND_BOTTOM_NAV_WITH_SEARCH_20260531
// Stabilises the Command Floor bottom nav into one slim set of links plus the search pill.
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

const SEARCH_TARGETS = [
  ["job", "/jobs"],
  ["jobs", "/jobs"],
  ["crew", "/team"],
  ["worker", "/team"],
  ["workers", "/team"],
  ["team", "/team"],
  ["client", "/clients"],
  ["clients", "/clients"],
  ["customer", "/clients"],
  ["customers", "/clients"],
  ["invoice", "/invoices"],
  ["invoices", "/invoices"],
  ["money", "/invoices"],
  ["plan", "/plans"],
  ["plans", "/plans"],
  ["price", "/plans"],
  ["pricing", "/plans"],
  ["quote", "/quotes"],
  ["quotes", "/quotes"],
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

function resolveSearchTarget(value) {
  const query = String(value || "").trim().toLowerCase();
  if (!query) return null;
  const direct = SEARCH_TARGETS.find(([key]) => query === key || query.includes(key));
  return direct?.[1] || "/dashboard";
}

function makeSearchPill() {
  const label = document.createElement("label");
  label.setAttribute("data-churvox-stable-nav-search", "true");
  label.setAttribute("aria-label", "Search Churvox");

  const icon = document.createElement("span");
  icon.textContent = "⌕";

  const input = document.createElement("input");
  input.type = "search";
  input.placeholder = "Search anything...";
  input.setAttribute("aria-label", "Search Churvox");

  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const target = resolveSearchTarget(input.value);
    if (!target) return;
    event.preventDefault();
    window.location.assign(target);
  });

  label.appendChild(icon);
  label.appendChild(input);
  return label;
}

function rebuildNav(nav) {
  if (!nav) return;

  const stableLinks = Array.from(nav.querySelectorAll("a[data-churvox-stable-nav-link='true']"));
  const hasSearch = Boolean(nav.querySelector("[data-churvox-stable-nav-search='true'] input"));
  const hasOldClutter = Boolean(nav.querySelector("button,b"));
  const alreadyClean =
    nav.getAttribute("data-churvox-stable-command-nav") === "true" &&
    stableLinks.length === COMMAND_NAV_LINKS.length &&
    hasSearch &&
    !hasOldClutter;

  if (!alreadyClean) {
    nav.innerHTML = "";
    COMMAND_NAV_LINKS.forEach(([href, label]) => nav.appendChild(makeNavLink(href, label)));
    nav.appendChild(makeSearchPill());
    nav.setAttribute("data-churvox-stable-command-nav", "true");
  } else {
    stableLinks.forEach((link) => {
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
