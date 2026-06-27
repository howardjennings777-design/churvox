import React from "react";
import { useAuth } from "../context/AuthContext";
import FreshShell from "./FreshShell";
import FreshPlanGate from "./FreshPlanGate";
import {
  ProductClients,
  ProductCommand,
  ProductHelp,
  ProductInvoices,
  ProductJobs,
  ProductPlans,
  ProductQuotes,
  ProductSettings,
  ProductSmartHub,
  ProductTeam,
  ProductWorkers,
} from "./FreshProductPages";

const PLAN_DAY_ALIASES = [
  "today",
  "todayswork",
  "todays-work",
  "worktoday",
  "smart",
  "hub",
  "dashboard",
  "home",
  "calendar",
  "schedule",
  "dispatch",
  "routes",
];

const COMMAND_ALIASES = [
  "askchurvox",
  "ask-churvox",
  "aioperatorstudio",
  "ai-operator-studio",
  "quickcreateai",
  "quick-create-ai",
  "followupwriter",
  "follow-up-writer",
  "followups",
  "follow-ups",
  "quoteai",
  "invoicecheck",
  "workerbrief",
  "automation",
];

const MESSAGE_ALIASES = [
  "messages",
  "inbox",
  "workermessages",
  "worker-messages",
  "workerinbox",
  "worker-inbox",
];

const WORKER_ALIASES = [
  "worker",
  "workers",
  "workerview",
  "worker-view",
  "workercommand",
  "worker-command",
  "field",
  "fieldview",
  "field-view",
  "time",
  "timelogs",
  "time-logs",
  "payroll",
];

const JOB_ALIASES = [
  "jobsboard",
  "jobs-board",
  "topstatus",
  "top-status",
  "documents",
  "photos",
  "inventory",
  "recurring",
  "services",
  "quality",
  "safety",
  "warranties",
  "materialsreminder",
  "materials-reminder",
  "materialsai",
  "materials-ai",
  "extras",
];

const CLIENT_ALIASES = ["feedback", "reviews", "reviewbooster", "review-booster"];
const QUOTE_ALIASES = ["variations"];
const INVOICE_ALIASES = ["payments", "expenses", "xero", "accounting", "sync"];
const TEAM_ALIASES = ["contractors", "subcontractors"];
const SUPPORT_ALIASES = [
  "help",
  "helpdesk",
  "help-desk",
  "supportdesk",
  "support-desk",
  "contact",
  "contactsupport",
  "trust",
  "launchcontrol",
  "launch-control",
  "setupassistant",
  "setup-assistant",
  "setup",
  "guide",
  "imports",
  "exports",
  "reports",
  "roadmap",
  "nz",
  "portal",
];

const pages = {
  planday: ProductSmartHub,
  command: ProductCommand,
  messages: ProductCommand,
  jobs: ProductJobs,
  clients: ProductClients,
  quotes: ProductQuotes,
  invoices: ProductInvoices,
  team: ProductTeam,
  workercommand: ProductWorkers,
  settings: ProductSettings,
  plans: ProductPlans,
  support: ProductHelp,
};

function cleanPage(value) {
  return String(value || "")
    .trim()
    .replace(/^#/, "")
    .replace(/^\//, "")
    .toLowerCase();
}

function canonicalPage(value, fallback = "planday") {
  const key = cleanPage(value);
  if (!key) return fallback;
  if (key === "planday") return "planday";
  if (key === "command") return "command";
  if (key === "jobs") return "jobs";
  if (key === "clients") return "clients";
  if (key === "quotes") return "quotes";
  if (key === "invoices") return "invoices";
  if (key === "team") return "team";
  if (key === "settings") return "settings";
  if (key === "plans") return "plans";
  if (key === "support") return "support";
  if (PLAN_DAY_ALIASES.includes(key)) return "planday";
  if (COMMAND_ALIASES.includes(key)) return "command";
  if (MESSAGE_ALIASES.includes(key)) return "messages";
  if (WORKER_ALIASES.includes(key)) return "workercommand";
  if (JOB_ALIASES.includes(key)) return "jobs";
  if (CLIENT_ALIASES.includes(key)) return "clients";
  if (QUOTE_ALIASES.includes(key)) return "quotes";
  if (INVOICE_ALIASES.includes(key)) return "invoices";
  if (TEAM_ALIASES.includes(key)) return "team";
  if (SUPPORT_ALIASES.includes(key)) return "support";
  return fallback;
}

function hashForPage(page) {
  if (page === "planday") return "dashboard";
  if (page === "workercommand") return "workers";
  return page;
}

function syncPageHash(page) {
  if (typeof window === "undefined") return;
  const nextHash = hashForPage(page);
  const currentHash = cleanPage(window.location.hash);
  if (currentHash === nextHash) return;
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${nextHash}`);
}

function getInitialPage() {
  if (typeof window === "undefined") return "planday";
  const hashPage = cleanPage(window.location.hash);
  if (hashPage) return canonicalPage(hashPage);

  const params = new URLSearchParams(window.location.search || "");
  const queryPage = params.get("page") || params.get("section") || params.get("first_setup");
  if (queryPage && queryPage !== "1" && queryPage !== "true") return canonicalPage(queryPage);

  const storedPage = window.localStorage?.getItem("churvox.activePage");
  return canonicalPage(storedPage, "planday");
}

export default function FreshApp() {
  const { user } = useAuth();
  const [page, setPage] = React.useState(getInitialPage);
  const [planGateRefresh, setPlanGateRefresh] = React.useState(0);
  const Page = pages[page] || ProductSmartHub;

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const refresh = () => setPlanGateRefresh((value) => value + 1);
    window.addEventListener("churvox:plan-refresh", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("churvox:plan-refresh", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onHashChange = () => setPage(canonicalPage(window.location.hash, "planday"));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage?.setItem("churvox.activePage", page);
    syncPageHash(page);
  }, [page]);

  const navigate = React.useCallback((next) => {
    const target = canonicalPage(next, "planday");
    setPage(target);
    syncPageHash(target);
  }, []);

  return (
    <FreshShell active={page} onNavigate={navigate}>
      <FreshPlanGate key={`${page}-${planGateRefresh}`} page={page} user={user} onNavigate={navigate}>
        <Page page={page} onNavigate={navigate} />
      </FreshPlanGate>
    </FreshShell>
  );
}
