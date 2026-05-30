// CHURVOX_FORCE_COMPACT_COMMAND_BOTTOM_NAV_20260531
// Forces the bottom nav to stay compact on laptop/mobile.
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

function resolveSearchTarget(value) {
  const query = String(value || "").trim().toLowerCase();
  if (!query) return null;
  const direct = SEARCH_TARGETS.find(([key]) => query === key || query.includes(key));
  return direct?.[1] || "/dashboard";
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

function makeSearchPill(value = "") {
  const label = document.createElement("label");
  label.setAttribute("data-churvox-stable-nav-search", "true");
  label.setAttribute("aria-label", "Search Churvox");

  const icon = document.createElement("span");
  icon.textContent = "⌕";

  const input = document.createElement("input");
  input.type = "search";
  input.placeholder = "Search";
  input.value = value || "";
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

function installCompactNavStyle() {
  if (document.getElementById("churvox-force-compact-command-bottom-nav-style")) return;
  const style = document.createElement("style");
  style.id = "churvox-force-compact-command-bottom-nav-style";
  style.textContent = `
    .xcf10-dock,
    .xcf-bottom-nav {
      left: 50% !important;
      right: auto !important;
      bottom: max(10px, env(safe-area-inset-bottom)) !important;
      transform: translateX(-50%) !important;
      width: min(760px, calc(100vw - 18px)) !important;
      max-width: calc(100vw - 18px) !important;
      min-height: 48px !important;
      height: 48px !important;
      display: grid !important;
      grid-template-columns: repeat(7, minmax(46px, auto)) minmax(96px, 150px) !important;
      align-items: center !important;
      gap: 5px !important;
      padding: 5px !important;
      border-radius: 18px !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
      z-index: 99999 !important;
    }

    .xcf10-dock a,
    .xcf-bottom-nav a {
      min-width: 0 !important;
      min-height: 38px !important;
      height: 38px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      border-radius: 13px !important;
      padding: 0 9px !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      font-size: 11px !important;
      line-height: 1 !important;
      font-weight: 900 !important;
    }

    .xcf10-dock label[data-churvox-stable-nav-search="true"],
    .xcf-bottom-nav label[data-churvox-stable-nav-search="true"] {
      min-width: 0 !important;
      width: 100% !important;
      min-height: 38px !important;
      height: 38px !important;
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
      border-radius: 13px !important;
      padding: 0 8px !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
    }

    .xcf10-dock label[data-churvox-stable-nav-search="true"] span,
    .xcf-bottom-nav label[data-churvox-stable-nav-search="true"] span {
      flex: 0 0 auto !important;
      font-size: 11px !important;
    }

    .xcf10-dock label[data-churvox-stable-nav-search="true"] input,
    .xcf-bottom-nav label[data-churvox-stable-nav-search="true"] input {
      min-width: 0 !important;
      width: 100% !important;
      border: 0 !important;
      outline: 0 !important;
      background: transparent !important;
      color: inherit !important;
      font-size: 11px !important;
      font-weight: 800 !important;
    }

    .xcf10-dock button,
    .xcf10-dock b,
    .xcf-bottom-nav button,
    .xcf-bottom-nav b { display: none !important; }

    @media (max-width: 700px) {
      .xcf10-dock,
      .xcf-bottom-nav {
        width: calc(100vw - 10px) !important;
        max-width: calc(100vw - 10px) !important;
        grid-template-columns: repeat(7, minmax(38px, 1fr)) !important;
        height: 50px !important;
        min-height: 50px !important;
        gap: 3px !important;
        padding: 4px !important;
      }
      .xcf10-dock label[data-churvox-stable-nav-search="true"],
      .xcf-bottom-nav label[data-churvox-stable-nav-search="true"] { display: none !important; }
      .xcf10-dock a,
      .xcf-bottom-nav a {
        min-height: 40px !important;
        height: 40px !important;
        padding: 0 4px !important;
        font-size: 10px !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function rebuildNav(nav) {
  if (!nav) return;
  installCompactNavStyle();

  const focused = nav.querySelector("input:focus");
  const searchValue = nav.querySelector("[data-churvox-stable-nav-search='true'] input")?.value || "";
  const desired = COMMAND_NAV_LINKS.map(([href, label]) => `${href}|${label}`).join(";");
  const current = Array.from(nav.querySelectorAll("a[data-churvox-stable-nav-link='true']"))
    .map((link) => `${link.getAttribute("href") || ""}|${String(link.textContent || "").trim()}`)
    .join(";");

  const needsRebuild =
    nav.getAttribute("data-churvox-stable-command-nav") !== "true" ||
    current !== desired ||
    !nav.querySelector("[data-churvox-stable-nav-search='true'] input") ||
    nav.querySelector("button,b") ||
    /Client Workbench|Plan Command|Quote Press|Command Floor/i.test(nav.textContent || "");

  if (needsRebuild && !focused) {
    nav.innerHTML = "";
    COMMAND_NAV_LINKS.forEach(([href, label]) => nav.appendChild(makeNavLink(href, label)));
    nav.appendChild(makeSearchPill(searchValue));
    nav.setAttribute("data-churvox-stable-command-nav", "true");
  }

  const links = Array.from(nav.querySelectorAll("a[data-churvox-stable-nav-link='true']"));
  COMMAND_NAV_LINKS.forEach(([href, label], index) => {
    const link = links[index];
    if (!link) return;
    if (link.getAttribute("href") !== href) link.setAttribute("href", href);
    if (String(link.textContent || "").trim() !== label) link.textContent = label;
    link.setAttribute("aria-label", label);
    link.classList.toggle("active", isActiveLink(href));
  });
}

function fixNavsOnce() {
  installCompactNavStyle();
  document.querySelectorAll(".xcf10-dock, .xcf-bottom-nav").forEach(rebuildNav);
}

function startNavFixRetry() {
  fixNavsOnce();
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    fixNavsOnce();
    if (attempts >= 120) window.clearInterval(timer);
  }, 250);
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
