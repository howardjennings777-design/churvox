// CHURVOX_LAUNCH_ROUTE_ALIASES_20260601
// Keeps advanced/unclear launch URLs folded into the simple core owner flow.
// Pages are not deleted; this just keeps the navigation experience clean.

const aliases = {
  "/command": "/dashboard",
  "/command-floor": "/dashboard",
  "/ai-operator": "/dashboard",
  "/ai-operator/approvals": "/dashboard",
  "/message-approvals": "/dashboard",
  "/notifications": "/dashboard",
  "/money": "/invoices",
  "/money-desk": "/invoices",
  "/crew": "/team",
  "/crew-ops": "/team",
  "/reports": "/dashboard",
  "/automation": "/settings",
  "/automation/runs": "/settings",
  "/integrations": "/settings",
  "/operator-tools": "/settings",
  "/trade-presets": "/settings",
  "/tools": "/settings",
  "/billing-confidence": "/plans",
};

if (typeof window !== "undefined") {
  const pathname = window.location.pathname;
  const target = aliases[pathname];
  if (target) {
    const next = `${target}${window.location.search || ""}${window.location.hash || ""}`;
    window.history.replaceState({}, "", next);
  }
}
