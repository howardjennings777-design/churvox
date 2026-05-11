import { useMemo, useState } from "react";
import "./operatorTheme.css";
import OperatorShell from "./OperatorShell";
import { useOperatorData } from "./dataHooks";
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

const roleNav = {
  owner: ["hub", "queue", "jobs", "clients", "crew", "quotes", "invoices", "proof", "payroll", "import", "system", "settings"],
  manager: ["hub", "queue", "jobs", "clients", "crew", "quotes", "invoices", "proof", "import", "settings"],
  office_admin: ["hub", "queue", "jobs", "clients", "quotes", "invoices", "import", "settings"],
  worker: ["jobs"],
  payroll: ["payroll", "jobs", "settings"],
};

const baseNav = [
  { key: "hub", label: "Smart Hub" },
  { key: "queue", label: "AI Work Queue", mobile: "AI Queue" },
  { key: "jobs", label: "Jobs" },
  { key: "clients", label: "Clients" },
  { key: "crew", label: "Crew" },
  { key: "quotes", label: "Quotes" },
  { key: "invoices", label: "Invoices" },
  { key: "proof", label: "Proof-to-Paid" },
  { key: "payroll", label: "Payroll" },
  { key: "import", label: "Import" },
  { key: "system", label: "System Centre" },
  { key: "settings", label: "Settings" },
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

export default function OperatorApp() {
  const data = useOperatorData();
  const [role, setRole] = useState("owner");
  const [current, setCurrent] = useState("hub");
  const [createType, setCreateType] = useState("");

  const nav = useMemo(
    () => baseNav.filter((item) => (roleNav[role] || roleNav.owner).includes(item.key)),
    [role]
  );

  const Page = pages[current] || SmartHub;

  return (
    <OperatorShell
      nav={nav}
      current={current}
      setCurrent={setCurrent}
      role={role}
      setRole={setRole}
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
    </OperatorShell>
  );
}
