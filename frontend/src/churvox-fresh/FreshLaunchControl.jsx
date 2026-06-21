import React from "react";
import { useApi } from "../hooks/useApi";
import { loadBusinessSettings } from "../lib/businessSettings";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";
const MANUAL_KEY = "churvox:launch-control-manual:v3";

const endpoints = {
  clients: ["/clients", "clients"],
  workers: ["/team/workers", "workers"],
  jobs: ["/jobs", "jobs"],
  quotes: ["/quotes", "quotes"],
  invoices: ["/invoices", "invoices"],
  requests: ["/customer-requests", "requests"],
  shifts: ["/worker/shift-records", "records"],
  reviewItems: ["/ai-review-items", "items"],
  xero: ["/xero/status", "status"],
};

function asArray(payload, key) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function lower(value) {
  return String(value || "").trim().toLowerCase();
}

function pick(record, ...keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function idText(value) {
  if (!value) return "";
  if (typeof value === "object") return idText(value.$oid || value.id || value._id || "");
  return String(value);
}

function recordId(record, ...keys) {
  for (const key of keys) {
    const id = idText(record?.[key]);
    if (id) return id;
  }
  return idText(record?.id || record?._id || "");
}

function readManual() {
  try {
    const raw = window.localStorage.getItem(MANUAL_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveManual(data) {
  try {
    window.localStorage.setItem(MANUAL_KEY, JSON.stringify(data));
  } catch {}
}

function readLocalCommand() {
  try {
    const raw = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function businessDone(settings = {}) {
  return Boolean(
    pick(settings, "business_name", "trading_name") &&
    pick(settings, "email", "phone") &&
    pick(settings, "invoice_prefix")
  );
}

function isCompletedJob(job) {
  return ["completed", "complete", "done", "finished"].includes(lower(job?.status || job?.job_status));
}

function isPaid(invoice) {
  return ["paid", "complete", "completed", "closed"].includes(lower(invoice?.status || invoice?.payment_status));
}

function invoiceJobId(invoice) {
  return recordId(invoice, "job_id", "linked_job_id", "jobId", "linkedJobId", "source_job_id", "sourceJobId");
}

function jobHasInvoice(job, invoiceJobIds) {
  const direct = Boolean(job?.invoice_id || job?.linked_invoice_id || job?.invoiceId || job?.draft_invoice_id || job?.invoiced || job?.invoice_number);
  const id = recordId(job, "id", "_id", "job_id");
  return direct || Boolean(id && invoiceJobIds.has(id));
}

function statusRank(status) {
  if (status === "Blocked") return 0;
  if (status === "Needs attention") return 1;
  if (status === "Needs check") return 2;
  return 3;
}

function autoStatus(ok, testNeeded = false) {
  return ok ? (testNeeded ? "Needs check" : "Ready") : "Needs attention";
}

function buildChecks(data, settings, manual) {
  const clients = data.clients || [];
  const workers = data.workers || [];
  const jobs = data.jobs || [];
  const quotes = data.quotes || [];
  const invoices = data.invoices || [];
  const requests = data.requests || [];
  const shifts = data.shifts || [];
  const reviewItems = data.reviewItems || [];
  const localCommand = readLocalCommand();
  const invoiceJobIds = new Set(invoices.map(invoiceJobId).filter(Boolean));
  const completedJobs = jobs.filter(isCompletedJob);
  const completedWithoutInvoice = completedJobs.filter((job) => !jobHasInvoice(job, invoiceJobIds));
  const paidInvoices = invoices.filter(isPaid);
  const xero = data.xero || {};
  const publicRequestUrl = "/request";

  const rows = [
    {
      id: "setup",
      group: "Foundation",
      area: "Business setup",
      check: "Business name, contact details and invoice defaults are saved.",
      status: autoStatus(businessDone(settings)),
      page: "settings",
      proof: businessDone(settings) ? "Business setup looks ready." : "Set business name, contact and invoice defaults first.",
    },
    {
      id: "public-request",
      group: "Customer entry",
      area: "Public request form",
      check: "Customers can request a quote without login. Requests go to owner review only.",
      status: "Needs check",
      page: "leads",
      proof: `${requests.length} customer requests found. Public form: ${publicRequestUrl}`,
    },
    {
      id: "clients",
      group: "Customer entry",
      area: "Clients / imports",
      check: "At least one real client is loaded or imported.",
      status: autoStatus(clients.length > 0, true),
      page: clients.length ? "clients" : "imports",
      proof: `${clients.length} client records.`,
    },
    {
      id: "team",
      group: "Team",
      area: "Team / workers",
      check: "At least one worker exists for assignment and field testing.",
      status: autoStatus(workers.length > 0, true),
      page: "team",
      proof: `${workers.length} worker records.`,
    },
    {
      id: "worker-time",
      group: "Team",
      area: "Worker clock-in/out",
      check: "Worker can clock in, clock out, and send time to Time Sheets.",
      status: shifts.length > 0 ? "Needs check" : "Needs attention",
      page: "time",
      proof: `${shifts.length} worker shift rows captured.`,
    },
    {
      id: "jobs",
      group: "Work",
      area: "Job workflow",
      check: "Create, assign, complete and view a real job.",
      status: autoStatus(jobs.length > 0, true),
      page: "jobs",
      proof: `${jobs.length} jobs. ${completedJobs.length} completed.`,
    },
    {
      id: "quote-flow",
      group: "Money",
      area: "Quote workflow",
      check: "Create a quote from a request/client and test the public quote link.",
      status: autoStatus(quotes.length > 0, true),
      page: "quotes",
      proof: `${quotes.length} quotes available.`,
    },
    {
      id: "invoice-flow",
      group: "Money",
      area: "Invoice / payment workflow",
      check: "Invoice page, public invoice link and payment status flow are checked.",
      status: autoStatus(invoices.length > 0, true),
      page: "invoices",
      proof: `${invoices.length} invoices, ${paidInvoices.length} paid.`,
    },
    {
      id: "invoicegap",
      group: "Money",
      area: "Completed jobs invoiced",
      check: "Completed jobs should not sit forgotten without invoices.",
      status: completedWithoutInvoice.length ? "Needs attention" : jobs.length ? "Ready" : "Needs check",
      page: "jobs",
      proof: `${completedWithoutInvoice.length} completed jobs may still need invoices.`,
    },
    {
      id: "payroll",
      group: "Team",
      area: "Payroll review",
      check: "Worker time and pay rates can calculate gross pay for owner review.",
      status: autoStatus(workers.length > 0 && shifts.length > 0, true),
      page: "payroll",
      proof: `${workers.length} workers and ${shifts.length} shift rows available.`,
    },
    {
      id: "command",
      group: "Owner control",
      area: "Command",
      check: "Command can surface owner approval work and launch decisions.",
      status: "Needs check",
      page: "command",
      proof: `${reviewItems.length} backend review items, ${localCommand.length} workflow slips.`,
    },
    {
      id: "xero",
      group: "Accounting",
      area: "Xero / accounting sync",
      check: "Accounting sync is safe, owner-approved and clearly blocked if not connected.",
      status: xero.connected ? "Needs check" : "Needs attention",
      page: "xero",
      proof: xero.connected ? `Connected to ${xero.connection?.tenant_name || "Xero"}.` : "Not connected yet.",
    },
    {
      id: "support",
      group: "Trust",
      area: "Support / trust",
      check: "Support, trust and safety wording are visible before launch.",
      status: "Ready",
      page: "support",
      proof: "Support and trust centre are available.",
    },
    {
      id: "mobile",
      group: "Final QA",
      area: "Mobile QA",
      check: "Phone/tablet hard refresh, tap checks, text visibility and core workflows pass.",
      status: manual.mobile || "Needs check",
      page: "today",
      proof: "Manual device test still matters before paid launch.",
    },
    {
      id: "billing",
      group: "Final QA",
      area: "Plans / billing",
      check: "Trial, GST wording, Stripe return and current plan display are checked.",
      status: manual.billing || "Needs check",
      page: "plans",
      proof: "Needs real checkout/return check before public paid launch.",
    },
  ];

  return rows.map((row) => ({ ...row, status: manual[row.id] || row.status })).sort((a, b) => statusRank(a.status) - statusRank(b.status));
}

function sendLaunchControlToCommand(items, onNavigate) {
  const blocked = items.filter((item) => item.status === "Blocked");
  const attention = items.filter((item) => item.status === "Needs attention");
  const needs = items.filter((item) => item.status === "Needs check");

  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];
    const slip = {
      id: `launch-control-${Date.now()}`,
      group: "Launch Readiness",
      area: "Launch Readiness",
      page: "launchcontrol",
      title: blocked.length ? "Launch blocked" : attention.length ? "Launch needs fixes" : needs.length ? "Launch needs final tests" : "Launch looks ready",
      info: `${blocked.length} blocked · ${attention.length} attention · ${needs.length} tests`,
      urgency: blocked.length ? "High" : attention.length ? "Medium" : needs.length ? "Medium" : "Low",
      found: [...blocked, ...attention].length ? [...blocked, ...attention].map((item) => `${item.area}: ${item.proof}`).join(" | ") : "No hard launch blockers marked.",
      prepared: needs.length ? `Check next: ${needs.map((item) => item.area).join(", ")}` : "Controlled beta can start when owner is comfortable.",
      why: "Launch should be decided from core workflow readiness, not page count.",
      owner: "Fix blockers, test needs, then approve a controlled beta.",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 70)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "launch-control" } }));
  } catch {}

  onNavigate?.("command");
}

export default function FreshLaunchControl({ onNavigate }) {
  const { get } = useApi();
  const [data, setData] = React.useState({ clients: [], workers: [], jobs: [], quotes: [], invoices: [], requests: [], shifts: [], reviewItems: [], xero: {} });
  const [manual, setManual] = React.useState(readManual);
  const [settings, setSettings] = React.useState(() => loadBusinessSettings());
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const items = React.useMemo(() => buildChecks(data, settings, manual), [data, settings, manual]);
  const ready = items.filter((item) => item.status === "Ready").length;
  const needs = items.filter((item) => item.status === "Needs check").length;
  const attention = items.filter((item) => item.status === "Needs attention").length;
  const blocked = items.filter((item) => item.status === "Blocked").length;
  const score = Math.round((ready / items.length) * 100);

  async function loadData() {
    setLoading(true);
    setMessage("Checking live launch data...");

    const next = {};
    await Promise.all(Object.entries(endpoints).map(async ([name, [endpoint, key]]) => {
      try {
        const result = await get(endpoint, { timeout: 25000 });
        if (name === "xero") next[name] = result?.success ? (result.data || {}) : {};
        else next[name] = result?.success ? asArray(result.data, key) : [];
      } catch {
        next[name] = name === "xero" ? {} : [];
      }
    }));

    setSettings(loadBusinessSettings());
    setData((current) => ({ ...current, ...next }));
    setLoading(false);
    setMessage("Launch readiness refreshed from live data.");
  }

  React.useEffect(() => {
    loadData();
  }, []);

  function updateStatus(id, status) {
    const next = { ...manual, [id]: status };
    setManual(next);
    saveManual(next);
  }

  function clearManual() {
    setManual({});
    saveManual({});
    setMessage("Manual launch marks cleared.");
  }

  const launchMode = blocked ? "Blocked" : attention ? "Fix first" : needs ? "Beta check" : "Ready";

  return (
    <section className="freshLaunchControlPage">
      <div className="freshLaunchControlHero freshLaunchHeroPolish">
        <div>
          <span>Launch Control</span>
          <h1>Launch from real readiness, not page count.</h1>
          <p>
            Checks the full Churvox loop: customer request, quote, job, worker time,
            payroll review, invoice, payment, accounting handoff, support and mobile QA.
          </p>
        </div>

        <div className="freshLaunchControlStats">
          <div><b>{score}%</b><small>ready score</small></div>
          <div><b>{ready}</b><small>ready</small></div>
          <div><b>{needs}</b><small>needs check</small></div>
          <div><b>{blocked + attention}</b><small>fix/check</small></div>
        </div>
      </div>

      <section className={`freshLaunchDecision ${launchMode.toLowerCase().replace(/\s+/g, "-")}`}>
        <div>
          <span>Current decision</span>
          <h2>{launchMode}</h2>
          <p>
            {launchMode === "Ready"
              ? "No launch blockers marked. Controlled beta can start when you are comfortable."
              : launchMode === "Beta check"
                ? "Core pieces are close. Run the remaining checks before selling hard."
                : launchMode === "Fix first"
                  ? "There are setup or workflow checks needing attention before launch."
                  : "A blocker is marked. Fix it before inviting customers."}
          </p>
        </div>
        <button type="button" onClick={() => sendLaunchControlToCommand(items, onNavigate)}>
          Send decision to Command
        </button>
      </section>

      {message ? (
        <section className="freshCard freshNotice">
          <b>Launch status</b>
          <span>{message}</span>
        </section>
      ) : null}

      <div className="freshLaunchSummaryGrid">
        {["Foundation", "Customer entry", "Work", "Team", "Money", "Accounting", "Owner control", "Trust", "Final QA"].map((group) => {
          const groupItems = items.filter((item) => item.group === group);
          if (!groupItems.length) return null;
          const groupReady = groupItems.filter((item) => item.status === "Ready").length;
          return (
            <article key={group}>
              <b>{group}</b>
              <span>{groupReady}/{groupItems.length} ready</span>
            </article>
          );
        })}
      </div>

      <div className="freshLaunchControlBoard">
        {items.map((item) => (
          <article key={item.id} className={`freshLaunchControlCard ${item.status.toLowerCase().replace(/\s+/g, "-")}`}>
            <header>
              <span>{item.status}</span>
              <small>{item.group}</small>
              <h2>{item.area}</h2>
            </header>

            <p>{item.check}</p>

            <div className="freshItem">
              <b>Proof</b>
              <span>{item.proof}</span>
            </div>

            <div className="freshLaunchControlControls">
              <select value={item.status} onChange={(event) => updateStatus(item.id, event.target.value)}>
                <option>Ready</option>
                <option>Needs check</option>
                <option>Needs attention</option>
                <option>Blocked</option>
              </select>
              <button type="button" onClick={() => onNavigate?.(item.page)}>Open</button>
            </div>
          </article>
        ))}
      </div>

      <div className="freshLaunchControlActions">
        <button type="button" onClick={loadData} disabled={loading}>{loading ? "Checking..." : "Refresh live readiness"}</button>
        <button type="button" onClick={() => sendLaunchControlToCommand(items, onNavigate)}>Send launch decision to Command</button>
        <button type="button" onClick={() => onNavigate?.("exports")}>Open Exports</button>
        <button type="button" onClick={clearManual}>Clear manual marks</button>
      </div>
    </section>
  );
}
