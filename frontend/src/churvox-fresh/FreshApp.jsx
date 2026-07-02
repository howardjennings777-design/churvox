import React from "react";
import BackendApp from "./FreshAppBackend";
import "../churvox-clean/ChurvoxBackendLayoutFix.css";
import "../churvox-clean/ChurvoxPageSpecificLayouts.css";
import "../churvox-clean/ChurvoxScreenFitLayouts.css";

const pages = ["aiguide", "command", "jobs", "clients", "quotes", "invoices", "team", "payroll", "workers", "xero", "settings", "plans", "support"];
const aliases = {
  dashboard: "aiguide",
  smart: "aiguide",
  hub: "aiguide",
  today: "aiguide",
  guide: "aiguide",
  ai: "aiguide",
  setup: "aiguide",
  commanddesk: "command",
  approvals: "command",
  automation: "command",
  recurring: "jobs",
  schedule: "jobs",
  calendar: "jobs",
  photos: "jobs",
  proof: "jobs",
  customers: "clients",
  documents: "clients",
  payments: "invoices",
  reports: "invoices",
  expenses: "invoices",
  profit: "invoices",
  people: "team",
  staff: "team",
  time: "payroll",
  timesheets: "payroll",
  dispatch: "workers",
  routes: "workers",
  areas: "workers",
  worker: "workers",
  accounting: "xero",
  sync: "xero",
  integrations: "xero",
  security: "settings",
  launchcontrol: "settings",
  businessbranding: "settings",
  billing: "plans",
  help: "support",
};

function currentPage() {
  if (typeof window === "undefined") return "aiguide";
  const hash = String(window.location.hash || "").replace(/^#/, "").toLowerCase();
  const path = String(window.location.pathname || "").replace(/^\/+/, "").split("/")[0].toLowerCase();
  const raw = hash || path || "dashboard";
  return aliases[raw] || (pages.includes(raw) ? raw : "aiguide");
}

function setBodyPage(page) {
  if (typeof document === "undefined") return;
  for (const item of pages) document.body.classList.remove(`cvxBodyPage--${item}`);
  document.body.classList.add(`cvxBodyPage--${page}`);
}

export default function FreshApp() {
  const [page, setPage] = React.useState(currentPage);

  React.useEffect(() => {
    setBodyPage(page);
  }, [page]);

  React.useEffect(() => {
    const refresh = () => setPage(currentPage());
    const clickRefresh = (event) => {
      if (event.target?.closest?.(".cvxCleanNav button")) {
        window.setTimeout(refresh, 0);
        window.setTimeout(refresh, 60);
      }
    };
    const originalReplaceState = window.history.replaceState;
    window.history.replaceState = function replaceStateWithChurvoxRefresh(...args) {
      const result = originalReplaceState.apply(this, args);
      window.setTimeout(refresh, 0);
      return result;
    };
    window.addEventListener("hashchange", refresh);
    window.addEventListener("popstate", refresh);
    document.addEventListener("click", clickRefresh, true);
    window.setTimeout(refresh, 0);
    window.setTimeout(refresh, 250);
    return () => {
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("hashchange", refresh);
      window.removeEventListener("popstate", refresh);
      document.removeEventListener("click", clickRefresh, true);
    };
  }, []);

  return <BackendApp />;
}
