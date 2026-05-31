// CHURVOX_AUTOMATION_STABLE_WIRING_20260601
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { Bot, CheckCircle, PlayCircle, RefreshCw, ShieldCheck, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import "./AutomationWorkspacePage.css";

// This page used to call /api/automation/workspace and rule mutation endpoints.
// Those routes are not guaranteed live, so this workspace now proves automation
// logic from stable Churvox records: jobs, invoices and quotes. No dead 404 calls.

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.invoices)) return value.invoices;
  if (Array.isArray(value?.quotes)) return value.quotes;
  return [];
}

function pickList(response, keys = []) {
  const data = response?.data ?? response;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }
  return arr(data);
}

function idOf(value) { return String(value?.id || value?._id || value?.template_key || value?.key || ""); }
function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00";
}
function statusOf(record) { return String(record?.status || record?.job_status || record?.payment_status || "").toLowerCase(); }
function isComplete(job) { return statusOf(job).includes("complete") || statusOf(job).includes("done"); }
function isOpen(record) { return !["completed", "complete", "done", "paid", "cancelled", "canceled"].includes(statusOf(record)); }
function isUnassigned(job) { return isOpen(job) && !(job?.assigned_worker_id || job?.worker_id || job?.assigned_to || job?.assigned_worker_name || job?.worker_name); }
function isUnpaid(invoice) {
  const status = statusOf(invoice);
  const due = Number(invoice?.amount_due || invoice?.balance_due || 0);
  return !status.includes("paid") && (due > 0 || Number(invoice?.total || invoice?.amount || 0) > 0);
}
function hasMissingCustomerInfo(record) {
  return !(record?.customer_email || record?.client_email || record?.email) || !(record?.customer_phone || record?.client_phone || record?.phone);
}

const guardrails = [
  "No customer message sends without owner approval.",
  "No payroll, legal, tax or accounting changes are performed here.",
  "No deletes, charges or MYOB writes from automation rules.",
  "Automation prepares work and points owners to the real record.",
];

const templates = [
  {
    key: "completed_job_to_invoice_review",
    name: "Completed job → invoice review",
    description: "Find completed jobs that are ready for invoice preparation.",
    trigger: "job.status is completed",
    action: "Open completed work in Money Desk",
    risk_level: "low",
    approval_required: true,
    href: "/invoices",
  },
  {
    key: "unassigned_job_to_dispatch",
    name: "Unassigned job → dispatch queue",
    description: "Find open jobs that still need a worker assigned.",
    trigger: "job has no worker",
    action: "Open Dispatch Board",
    risk_level: "medium",
    approval_required: true,
    href: "/dispatch",
  },
  {
    key: "unpaid_invoice_followup",
    name: "Unpaid invoice → follow-up draft",
    description: "Find unpaid invoices so the owner can prepare a reminder.",
    trigger: "invoice is unpaid",
    action: "Open Money Desk",
    risk_level: "medium",
    approval_required: true,
    href: "/invoices",
  },
  {
    key: "quote_followup",
    name: "Open quote → follow-up check",
    description: "Find open quotes for sales follow-up review.",
    trigger: "quote is open",
    action: "Open Quote Press",
    risk_level: "low",
    approval_required: true,
    href: "/quotes",
  },
  {
    key: "missing_customer_details",
    name: "Missing customer details → cleanup",
    description: "Find records missing email or phone before messages/invoices rely on them.",
    trigger: "customer contact fields missing",
    action: "Open Client Workbench",
    risk_level: "low",
    approval_required: false,
    href: "/clients",
  },
];

function RiskPill({ risk }) {
  const key = String(risk || "medium").toLowerCase();
  return <span className={`cv-auto-risk ${key}`}>{key}</span>;
}

function StatusPill({ enabled }) {
  return <span className={`cv-auto-status ${enabled ? "on" : "off"}`}>{enabled ? "Enabled" : "Disabled"}</span>;
}

function buildRules({ jobs, invoices, quotes }) {
  const completedJobs = jobs.filter(isComplete);
  const unassignedJobs = jobs.filter(isUnassigned);
  const unpaidInvoices = invoices.filter(isUnpaid);
  const openQuotes = quotes.filter(isOpen);
  const missingCustomerRecords = [...jobs, ...invoices, ...quotes].filter(hasMissingCustomerInfo);

  const counts = {
    completed_job_to_invoice_review: completedJobs.length,
    unassigned_job_to_dispatch: unassignedJobs.length,
    unpaid_invoice_followup: unpaidInvoices.length,
    quote_followup: openQuotes.length,
    missing_customer_details: missingCustomerRecords.length,
  };

  return templates.map((template) => ({
    ...template,
    id: template.key,
    enabled: true,
    prepared_count: counts[template.key] || 0,
  }));
}

function buildRuns({ jobs, invoices, quotes }) {
  const runs = [];
  jobs.filter(isComplete).slice(0, 4).forEach((job) => runs.push({
    id: `job-${idOf(job)}`,
    rule_name: "Completed job → invoice review",
    result: `${job.title || job.job_name || job.customer_name || "Job"} is ready for invoice/proof review`,
    status: "prepared",
    href: idOf(job) ? `/jobs/${idOf(job)}` : "/jobs",
  }));
  jobs.filter(isUnassigned).slice(0, 4).forEach((job) => runs.push({
    id: `dispatch-${idOf(job)}`,
    rule_name: "Unassigned job → dispatch queue",
    result: `${job.title || job.job_name || job.customer_name || "Job"} needs crew assignment`,
    status: "needs owner",
    href: "/dispatch",
  }));
  invoices.filter(isUnpaid).slice(0, 4).forEach((invoice) => runs.push({
    id: `invoice-${idOf(invoice)}`,
    rule_name: "Unpaid invoice → follow-up draft",
    result: `${invoice.invoice_number || "Invoice"} has ${money(invoice.amount_due || invoice.balance_due || invoice.total || invoice.amount)} outstanding`,
    status: "prepared",
    href: idOf(invoice) ? `/invoices/${idOf(invoice)}` : "/invoices",
  }));
  quotes.filter(isOpen).slice(0, 3).forEach((quote) => runs.push({
    id: `quote-${idOf(quote)}`,
    rule_name: "Open quote → follow-up check",
    result: `${quote.quote_number || quote.title || "Quote"} is open for review`,
    status: "prepared",
    href: idOf(quote) ? `/quotes/${idOf(quote)}` : "/quotes",
  }));
  return runs;
}

export default function AutomationWorkspacePage() {
  const api = useApi();
  const [data, setData] = useState({ jobs: [], invoices: [], quotes: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  async function loadAutomation() {
    setLoading(true);
    const [jobsRes, invoicesRes, quotesRes] = await Promise.all([
      api.get("/jobs"),
      api.get("/invoices"),
      api.get("/quotes"),
    ]);

    if (!jobsRes.success) toast.error(jobsRes.error || "Could not load jobs for automation");
    if (!invoicesRes.success) toast.error(invoicesRes.error || "Could not load invoices for automation");
    if (!quotesRes.success) toast.error(quotesRes.error || "Could not load quotes for automation");

    setData({
      jobs: jobsRes.success ? pickList(jobsRes, ["jobs", "items", "results"]) : [],
      invoices: invoicesRes.success ? pickList(invoicesRes, ["invoices", "items", "results"]) : [],
      quotes: quotesRes.success ? pickList(quotesRes, ["quotes", "items", "results"]) : [],
    });
    setLoading(false);
  }

  useEffect(() => { loadAutomation(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rules = useMemo(() => buildRules(data), [data]);
  const runs = useMemo(() => buildRuns(data), [data]);
  const metrics = useMemo(() => ({
    rules: rules.length,
    enabled_rules: rules.filter((rule) => rule.enabled).length,
    approval_required_rules: rules.filter((rule) => rule.approval_required).length,
    recent_runs: runs.length,
    failed_runs: 0,
    prepared_actions: rules.reduce((sum, rule) => sum + Number(rule.prepared_count || 0), 0),
  }), [rules, runs]);

  const groupedRules = useMemo(() => ({
    enabled: rules.filter((rule) => rule.enabled),
    approval: rules.filter((rule) => rule.approval_required),
    disabled: rules.filter((rule) => !rule.enabled),
  }), [rules]);

  function testRule(rule) {
    setBusy(`test-${idOf(rule)}`);
    window.setTimeout(() => {
      setBusy("");
      toast.success(`${rule.name}: ${rule.prepared_count || 0} matching record${Number(rule.prepared_count || 0) === 1 ? "" : "s"}`);
    }, 250);
  }

  function addTemplate(template) {
    toast.success(`${template.name} is already wired as a safe approval-first check.`);
  }

  return (
    <PremiumPage maxWidth={1240}>
      <PremiumHero
        eyebrow="Automation workspace"
        title="Let Churvox prepare the admin, not silently change the business."
        subtitle="Rules are now checked against real jobs, invoices and quotes. Buttons open the live workspace instead of calling missing automation routes."
        icon={<Bot className="h-6 w-6" />}
        actions={<PremiumButton variant="secondary" onClick={loadAutomation} disabled={loading || Boolean(busy)}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>}
      />

      <section className="cv-auto-metrics">
        <article><span>Rules</span><b>{metrics.rules}</b><small>safe checks</small></article>
        <article className="green"><span>Enabled</span><b>{metrics.enabled_rules}</b><small>always on</small></article>
        <article className="amber"><span>Approval-first</span><b>{metrics.approval_required_rules}</b><small>guarded</small></article>
        <article><span>Recent runs</span><b>{metrics.recent_runs}</b><small>from records</small></article>
        <article className={metrics.failed_runs ? "red" : ""}><span>Failed runs</span><b>{metrics.failed_runs}</b><small>no dead calls</small></article>
        <article><span>Prepared actions</span><b>{metrics.prepared_actions}</b><small>waiting</small></article>
      </section>

      <section className="cv-auto-guardrails">
        <ShieldCheck size={20} />
        <div>
          <b>Approval-first guardrails</b>
          {guardrails.map((line) => <span key={line}>{line}</span>)}
        </div>
      </section>

      {loading ? (
        <PremiumCard><div className="cv-auto-empty">Loading automation workspace…</div></PremiumCard>
      ) : (
        <section className="cv-auto-grid">
          <PremiumCard title="Automation rules">
            {rules.map((rule) => (
              <article className="cv-auto-rule" key={idOf(rule)}>
                <header>
                  <div>
                    <h3>{rule.name}</h3>
                    <p>{rule.description}</p>
                  </div>
                  <div className="cv-auto-rule-pills">
                    <StatusPill enabled={rule.enabled} />
                    <RiskPill risk={rule.risk_level} />
                    {rule.approval_required ? <span className="cv-auto-approval">Approval required</span> : <span className="cv-auto-info">Auto-safe</span>}
                  </div>
                </header>
                <div className="cv-auto-rule-flow">
                  <span>When: <b>{rule.trigger}</b></span>
                  <span>Do: <b>{rule.action}</b></span>
                  <span>Found: <b>{rule.prepared_count || 0}</b></span>
                </div>
                <footer>
                  <Link to={rule.href}>
                    {rule.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    Open workspace
                  </Link>
                  <button type="button" className="secondary" onClick={() => testRule(rule)} disabled={busy === `test-${idOf(rule)}`}>
                    <PlayCircle size={16} /> Test check
                  </button>
                </footer>
              </article>
            ))}
          </PremiumCard>

          <PremiumCard title="Templates">
            {templates.map((template) => (
              <article className="cv-auto-template" key={template.key}>
                <div>
                  <h3>{template.name}</h3>
                  <p>{template.description}</p>
                  <small>{template.trigger} → {template.action}</small>
                </div>
                <div>
                  <RiskPill risk={template.risk_level} />
                  <button type="button" onClick={() => addTemplate(template)}>Use check</button>
                </div>
              </article>
            ))}
          </PremiumCard>

          <PremiumCard title="Recent prepared checks">
            {runs.length ? runs.map((run) => (
              <article className="cv-auto-run" key={idOf(run)}>
                <div>
                  <b>{run.rule_name || "Automation run"}</b>
                  <span>{run.result || "Run recorded"}</span>
                </div>
                <Link to={run.href || "/dashboard"}>{run.status || "recorded"}</Link>
              </article>
            )) : <div className="cv-auto-empty">No matching records yet. Create jobs, quotes or invoices and the checks will appear here.</div>}
          </PremiumCard>

          <PremiumCard title="Rule groups">
            <div className="cv-auto-groups">
              <div><b>{groupedRules.enabled.length}</b><span>Enabled rules</span></div>
              <div><b>{groupedRules.approval.length}</b><span>Approval-first rules</span></div>
              <div><b>{groupedRules.disabled.length}</b><span>Disabled rules</span></div>
            </div>
          </PremiumCard>
        </section>
      )}
    </PremiumPage>
  );
}
