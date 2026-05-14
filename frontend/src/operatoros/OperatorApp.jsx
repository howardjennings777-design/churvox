import { useEffect, useMemo, useState } from "react";
import "./pages/PublicSite.css";
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
import { clearChurvoxAuth } from "./logout";
import CreateModal from "./components/CreateModal";
import SmartHubOptionB from "./pages/SmartHubOptionB";
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
  hub: SmartHubOptionB,
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
  try {
    document.documentElement.dataset.churvoxPublicTheme = CHURVOX_OPTION_B_PUBLIC_BUILD;
  } catch {}

  const exactLegacyPaths = new Set([
    "/forgot-password",
    "/reset-password",
    "/admin",
  ]);

  if (exactLegacyPaths.has(path)) return true;

  return (
    path.startsWith("/public") ||
    path.startsWith("/client-portal") ||
    path.startsWith("/v3") ||
    path.startsWith("/v4")
  );
}

function keyFromPath() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/dashboard";
  return pathToKey[path] || "hub";
}

function pathForKey(key, role = "owner") {
  if (role === "worker" && key === "jobs") return "/worker/jobs";
  return baseNav.find((item) => item.key === key)?.path || "/dashboard";
}

function loginRedirectUrl() {
  const currentPath = `${window.location.pathname}${window.location.search || ""}`;
  const returnTo = encodeURIComponent(currentPath || "/dashboard");
  return `/login?return_to=${returnTo}`;
}

function hasPrivateAuth() {
  if (readToken()) return true;

  try {
    const rawUser = localStorage.getItem("churvox_user") || localStorage.getItem("user");
    if (!rawUser) return false;

    const parsed = JSON.parse(rawUser);
    const user = parsed?.user || parsed?.profile || parsed;

    return Boolean(user?.email && (user?.id || user?._id || user?.business_id));
  } catch {
    return false;
  }
}

const CHURVOX_OPTION_B_PUBLIC_BUILD = "option-b-clean-teal-live";

export default function OperatorApp() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  try {
    document.documentElement.dataset.churvoxPublicTheme = CHURVOX_OPTION_B_PUBLIC_BUILD;
  } catch {}

  if (path === "/logout" || path === "/signout" || path === "/log-out") {
    clearChurvoxAuth();
    try {
      localStorage.setItem("churvox_force_login", "true");
      localStorage.setItem("churvox_logged_out", String(Date.now()));
    } catch {}
    window.location.replace("/login?logged_out=1");
    return null;
  }

  const optionBPublicRoutes = new Set(["/", "/features", "/how-it-works", "/trades"]);
  if (optionBPublicRoutes.has(path)) return <PublicLandingPage />;
  if (path === "/pricing" || path === "/plans-public") return <PublicPricingPage />;
  if (path === "/demo" || path === "/try-demo") return <PublicDemoPage />;
  if (path === "/contact" || path === "/email") return <PublicContactPage />;
  if (path === "/signup" || path === "/register") return <PublicSignupPage />;
  if (path === "/login" || path === "/admin/login" || path === "/owner/login") {
    return <ForcedLoginPage />;
  }

  if (shouldUseLegacyApp()) return <FreshChurvoxApp />;

  if (!hasPrivateAuth()) {
    try {
      localStorage.setItem("churvox_force_login", "true");
    } catch {}

    window.location.replace(loginRedirectUrl());
    return null;
  }

  return <OperatorOSCore />;
}

function OperatorOSCore() {
  try {
    document.documentElement.dataset.churvoxDashboardTheme = "option-b-smart-hub-live";
  } catch {}
  const data = useOperatorData();
  const allowRoleSwitch = canSwitchRoleForTesting();
  const path = window.location.pathname.replace(/\/+$/, "") || "/dashboard";
  const pathRole = path.startsWith("/worker") ? "worker" : "";
  const [role, setRoleRaw] = useState(() => pathRole || normalizeRole(currentUserRole()) || "owner");
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
    const nextPath = pathForKey(safeKey, role);

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

  const Page = pages[current] || SmartHubOptionB;

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
