// CHURVOX_LAUNCH_ROUTE_ALIASES_20260528
// Gives the final nav language simple URL aliases.

const aliases = {
  "/command": "/dashboard",
  "/command-floor": "/dashboard",
  "/money": "/invoices",
  "/crew": "/team",
  "/tools": "/operator-tools",
};

if (typeof window !== "undefined") {
  const pathname = window.location.pathname;
  const target = aliases[pathname];
  if (target) {
    const next = `${target}${window.location.search || ""}${window.location.hash || ""}`;
    window.history.replaceState({}, "", next);
  }
}
