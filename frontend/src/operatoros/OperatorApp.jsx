import { useEffect, useMemo, useState } from "react";
import "./operatorTheme.css";
import "./operatorDesignFinal.css";
import "./operatorLaptopPolish.css";
import "./operatorSidebarFinal.css";
import FreshChurvoxApp from "../fresh/FreshChurvoxApp";
import ForcedLoginPage from "./pages/ForcedLoginPage";
import PublicContactPage from "./pages/PublicContactPage";
import PublicLandingPage from "./pages/PublicLandingPage";
import PublicSignupPage from "./pages/PublicSignupPage";
import PublicPricingPage from "./pages/PublicPricingPage";
import PublicDemoPage from "./pages/PublicDemoPage";
import OperatorShell from "./OperatorShell";
import { useOperatorData } from "./dataHooks";
import { canSwitchRoleForTesting, currentUserName, currentUserRole, normalizeRole, readToken } from "./api";
import CreateModal from "./components/CreateModal";
import SmartHub from "./pages/SmartHub";
import AIWorkQueue from "./pages/AIWorkQueue";
import JobsWorkspace from "./pages/JobsWorkspace";
import ClientsWorkspace from "./pages/ClientsWorkspace";
import CrewWorkspace from "./pages/CrewWorkspace";
import QuotesWorkspace from "./pages/QuotesWorkspace";
import InvoicesWorkspace from "./pages/InvoicesWorkspace";
import ProofToPaidWorkspace from "./pages/ProofToPaidWorkspace";
import PayrollWorkspace from "./pages/PayrollWorkspace";
import ImportWorkspace from "./pages/ImportWorkspace";
import SystemCentre from "./pages/SystemCentre";
import SettingsWorkspace from "./pages/SettingsWorkspace";
import FirstLoginGuide from "./components/FirstLoginGuide";

const roleNav = {
  owner: ["hub", "queue", "jobs", "clients", "crew", "quotes", "invoices", "proof", "payroll", "import", "system", "settings"],
  manager: ["hub", "queue", "jobs", "clients", "crew", "quotes", "invoices", "proof", "import", "settings"],
  office_admin: ["hub", "queue", "jobs", "clients", "quotes", "invoices", "import", "settings"],
  worker: ["jobs"],
  payroll: ["payroll", "jobs", "settings"],
};

const baseNav = [
  { key: "hub", label: "Smart Hub", path: "/dashboard" },
  { key: "queue", label: "AI Work Queue", mobile: "AI Queue", path: "/ai-approvals" },
  { key: "jobs", label: "Jobs", path: "/jobs" },
  { key: "clients", label: "Clients", path: "/clients" },
  { key: "crew", label: "Crew", path: "/team" },
  { key: "quotes", label: "Quotes", path: "/quotes" },
  { key: "invoices", label: "Invoices", path: "/invoices" },
  { key: "proof", label: "Proof-to-Paid", path: "/proof-to-paid" },
  { key: "payroll", label: "Payroll", path: "/payroll" },
  { key: "import", label: "Import", path: "/import" },
  { key: "system", label: "System Centre", path: "/system-centre" },
  { key: "settings", label: "Settings", path: "/settings" },
];

const pages = {
  hub: SmartHub,
  queue: AIWorkQueue,
  jobs: JobsWorkspace,
  clients: ClientsWorkspace,
  crew: CrewWorkspace,
  quotes: QuotesWorkspace,
  invoices: InvoicesWorkspace,
  proof: ProofToPaidWorkspace,
  payroll: PayrollWorkspace,
  import: ImportWorkspace,
  system: SystemCentre,
  settings: SettingsWorkspace,
};

const pathToKey = {
  "/": "hub",
  "/dashboard": "hub",
  "/smart-hub": "hub",
  "/ai-approvals": "queue",
  "/ai-work-queue": "queue",
  "/jobs": "jobs",
  "/worker": "jobs",
  "/worker/jobs": "jobs",
  "/worker/dashboard": "jobs",
  "/clients": "clients",
  "/team": "crew",
  "/crew": "crew",
  "/quotes": "quotes",
  "/invoices": "invoices",
  "/proof-to-paid": "proof",
  "/payroll": "payroll",
  "/import": "import",
  "/system-centre": "system",
  "/plans": "system",
  "/billing": "system",
  "/settings": "settings",
};


function shouldUseLegacyApp() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  // PREMIUM_TRADE_INTELLIGENCE_PUBLIC_FLOW
  const isLoginPath = path === "/login" || path === "/admin/login" || path === "/owner/login";
  const loggedIn = Boolean(readToken());
  if (isLoginPath) return <ForcedLoginPage />;

  if (path === "/demo" || path === "/try-demo") {
    return <PublicDemoPage />;
  }


  const exactLegacyPaths = new Set([
    "/login",
    "/signup",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/admin",
    "/admin/login",
    "/owner/login",
  ]);

  if (exactLegacyPaths.has(path)) return true;

  return (
    path.startsWith("/public") ||
    path.startsWith("/client-portal") ||
    path.startsWith("/worker") ||
    path.startsWith("/v3") ||
    path.startsWith("/v4")
  );
}

function keyFromPath() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/demo" || path === "/try-demo") {
    return <PublicDemoPage />;
  }

  return pathToKey[path] || "hub";
}

function pathForKey(key) {
  return baseNav.find((item) => item.key === key)?.path || "/dashboard";
}

export default function OperatorApp() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const loggedIn = Boolean(readToken());

  if (path === "/logout" || path === "/signout" || path === "/log-out") {
    clearChurvoxAuth();
    try {
      localStorage.setItem("churvox_force_login", "true");
      localStorage.setItem("churvox_logged_out", String(Date.now()));
    } catch {}
    window.location.replace("/login?logged_out=1");
    return null;
  }

  if (path === "/login" || path === "/admin/login" || path === "/owner/login") {
    return <ForcedLoginPage />;
  }

  if (["/", "/features", "/how-it-works", "/trades"].includes(path)) return <PublicLandingPage />;
  if (path === "/pricing") return <PublicPricingPage />;
  if (path === "/demo" || path === "/try-demo") return <PublicDemoPage />;
  if (path === "/contact" || path === "/email") return <PublicContactPage />;
  if (path === "/signup" || path === "/register") return <PublicSignupPage />;

  return shouldUseLegacyApp() ? <FreshChurvoxApp /> : <OperatorOSCore />;
}

function OperatorOSCore() {
  const data = useOperatorData();
  const allowRoleSwitch = canSwitchRoleForTesting();
  const [role, setRoleRaw] = useState(() => normalizeRole(currentUserRole()) || "owner");
  const userName = currentUserName();
  const [current, setCurrentRaw] = useState(keyFromPath);
  const [createType, setCreateType] = useState("");

  function setRole(nextRole) {
    if (!allowRoleSwitch) return;
    setRoleRaw(normalizeRole(nextRole) || "owner");
  }

  const nav = useMemo(
    () => baseNav.filter((item) => (roleNav[role] || roleNav.owner).includes(item.key)),
    [role]
  );

  useEffect(() => {
    function handlePopState() {
      setCurrentRaw(keyFromPath());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function setCurrent(key) {
    const allowed = (roleNav[role] || roleNav.owner).includes(key);
    const safeKey = allowed ? key : nav[0]?.key || "jobs";
    const nextPath = pathForKey(safeKey);

    setCurrentRaw(safeKey);

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
  }

  useEffect(() => {
    if (!(roleNav[role] || roleNav.owner).includes(current)) {
      setCurrent(nav[0]?.key || "jobs");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const Page = pages[current] || SmartHub;

  return (
    <OperatorShell
      nav={nav}
      current={current}
      setCurrent={setCurrent}
      role={role}
      setRole={setRole}
      allowRoleSwitch={allowRoleSwitch}
      userName={userName}
      data={data}
      onCreate={setCreateType}
    >
      <Page data={data} role={role} onNav={setCurrent} onCreate={setCreateType} />

      {createType ? (
        <CreateModal
          type={createType}
          onClose={() => setCreateType("")}
          onSaved={data.reload}
        />
      ) : null}

      <FirstLoginGuide onNav={setCurrent} onCreate={setCreateType} />
    </OperatorShell>
  );
}
