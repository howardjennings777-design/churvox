import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import V3Shell from "../components/V3Shell";
import "../styles/v3.css";

const AREAS = {
  jobs: ["Jobs", "Live run sheet", "Unassigned jobs, in-progress work, completed jobs, and proof checks."],
  dispatch: ["Dispatch", "Crew coverage", "Worker availability, schedule gaps, conflicts, and suggested job matches."],
  clients: ["Clients", "Customer base", "Customer records, addresses, notes, imports, and recent work."],
  quotes: ["Quotes", "Sales desk", "Draft quotes, sent quotes, follow-ups, and accepted work."],
  invoices: ["Invoices", "Money board", "Draft invoices, overdue invoices, paid invoices, and reminders."],
  team: ["Team", "Crew control", "Workers, invites, roles, availability, and job ownership."],
  payroll: ["Payroll", "Pay run", "Pay periods, approved hours, worker summaries, and payroll exports."],
  rules: ["Rules", "Automation engine", "AI checks, approval-first actions, active rules, and recent runs."],
  automation: ["Rules", "Automation engine", "AI checks, approval-first actions, active rules, and recent runs."],
  reports: ["Reports", "Owner numbers", "Revenue, completed jobs, crew time, and outstanding money."],
  messages: ["Messages", "Customer comms", "Draft replies, reminders, follow-ups, and message history."],
  sms: ["Messages", "Customer comms", "Draft replies, reminders, follow-ups, and message history."],
  integrations: ["Sync", "MYOB and integrations", "MYOB sync, connected services, data checks, and integration status."],
  plans: ["Billing", "Plan and billing", "Plan status, limits, billing checks, and account controls."],
  settings: ["Settings", "Business setup", "Business profile, user settings, preferences, and workspace controls."],
  proof: ["Job Proof Packs", "Proof to paid", "Photos, job proof, completion evidence, and invoice-ready packs."]
};

const ORDER = [
  "jobs",
  "dispatch",
  "clients",
  "quotes",
  "invoices",
  "team",
  "payroll",
  "rules",
  "reports",
  "messages",
  "integrations",
  "plans",
  "settings"
];

export default function V3WorkspacePage({ type }) {
  const navigate = useNavigate();
  const { section } = useParams();

  const key = useMemo(() => {
    const clean = String(section || type || "jobs").toLowerCase().replace(/[^a-z]/g, "");
    return AREAS[clean] ? clean : "jobs";
  }, [section, type]);

  const [title, kicker, intro] = AREAS[key];

  return (
    <V3Shell>
      <main className="v3-workspace-detail">
        <section className="v3-workspace-hero">
          <div>
            <p className="v3-eyebrow">{kicker}</p>
            <h1>{title}</h1>
            <p>{intro}</p>
          </div>

          <div className="v3-workspace-actions">
            <button type="button" className="v3-primary-btn" onClick={() => navigate("/dashboard")}>
              Back to Smart Hub
            </button>
            <button type="button" className="v3-dark-btn">
              Open detail panel
            </button>
          </div>
        </section>

        <section className="v3-workspace-grid">
          {["Ready", "Needs review", "In progress", "Completed"].map((label) => (
            <button type="button" className="v3-workspace-card" key={label}>
              <span>{label}</span>
              <strong>0</strong>
              <small>Live wiring next</small>
            </button>
          ))}
        </section>

        <section className="v3-workspace-switcher">
          <p className="v3-eyebrow">Work areas</p>
          <div>
            {ORDER.map((item) => (
              <button
                type="button"
                key={item}
                className={item === key ? "active" : ""}
                onClick={() => navigate(`/v3/${item}`)}
              >
                {AREAS[item][0]}
              </button>
            ))}
          </div>
        </section>
      </main>
    </V3Shell>
  );
}
