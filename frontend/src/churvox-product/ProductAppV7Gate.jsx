import React from "react";
import { useAuth } from "../context/AuthContext";
import ProductAppV7 from "./ProductAppV7";
import { clean, createAccess } from "./controlBoardData";

const ROUTE_AREA = {
  today: "today",
  jobs: "work",
  schedule: "work",
  recurring: "work",
  clients: "clients",
  money: "money",
  quotes: "money",
  invoices: "money",
  accounting: "accounting",
  crew: "team",
  field: "team",
  timesheets: "payroll",
  access: "team",
  messages: "messages",
  command: "command",
  parked: "command",
  completed: "command",
  settings: "settings",
  plans: "plans",
  support: "help",
};

const ALIASES = {
  dashboard: "today",
  smarthub: "today",
  work: "jobs",
  job: "jobs",
  calendar: "schedule",
  workers: "crew",
  worker: "crew",
  team: "crew",
  payroll: "timesheets",
  xero: "accounting",
  help: "support",
  guide: "support",
  setup: "support",
};

function currentRoute() {
  const path = clean((window.location.pathname || "").split("/")[1]).toLowerCase();
  const hash = clean((window.location.hash || "").replace(/^#/, "").split("?")[0]).toLowerCase();
  return ALIASES[hash] || hash || ALIASES[path] || path || "today";
}

export default function ProductAppV7Gate() {
  const { user } = useAuth();
  const access = React.useMemo(() => createAccess(user), [user]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const enforce = () => {
      const route = currentRoute();
      const feature = ROUTE_AREA[route] || "today";
      if (!access.can(feature)) {
        window.history.replaceState({}, "", "/dashboard#plans");
        window.dispatchEvent(new Event("hashchange"));
      }
      setReady(true);
    };
    enforce();
    window.addEventListener("hashchange", enforce);
    window.addEventListener("popstate", enforce);
    return () => {
      window.removeEventListener("hashchange", enforce);
      window.removeEventListener("popstate", enforce);
    };
  }, [access]);

  if (!ready) return null;
  return <ProductAppV7 />;
}
