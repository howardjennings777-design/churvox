import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  MessageSquare,
  Plug,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { approveAiAction } from "../../lib/aiOperator";
import { get, post } from "../../lib/api";
import V3Shell from "../components/V3Shell";
import "../styles/v3.css";

const PAGE_META = {
  decisions: { title: "Owner Decisions", kicker: "AI approval queue", intro: "AI-prepared work waiting for owner approval.", icon: Sparkles, action: "prepare_ai", primary: "Prepare decisions" },
  jobs: { title: "Jobs", kicker: "Live run sheet", intro: "Jobs, clients, addresses, workers, status, schedule, proof and billing readiness.", icon: Briefcase, action: "new_job", primary: "Create job" },
  dispatch: { title: "Dispatch", kicker: "Crew matching", intro: "Unassigned jobs, available workers, crew gaps and AI worker recommendations.", icon: Calendar, action: "prepare_ai", primary: "AI match crew" },
  clients: { title: "Clients", kicker: "Customer base", intro: "Client records, contact details, missing fields, addresses and follow-up readiness.", icon: Users, action: "new_client", primary: "Add client" },
  quotes: { title: "Quotes", kicker: "Sales desk", intro: "Quote pipeline, status, value, client, accepted work and AI follow-ups.", icon: FileText, action: "new_quote", primary: "Create quote" },
  invoices: { title: "Invoices", kicker: "Money board", intro: "Draft, sent, unpaid, overdue and paid invoices with AI reminder support.", icon: DollarSign, action: "new_invoice", primary: "Create invoice" },
  team: { title: "Team", kicker: "Crew control", intro: "Workers, roles, contact details, regions and dispatch readiness.", icon: Users, action: "new_worker", primary: "Invite worker" },
  payroll: { title: "Payroll", kicker: "Pay run", intro: "Completed jobs, worker time, pay review flags and payroll handoff.", icon: CreditCard, action: "prepare_ai", primary: "AI review payroll" },
  rules: { title: "Rules", kicker: "Automation engine", intro: "AI rules, safe actions, approval controls and background checks.", icon: Zap, action: "prepare_ai", primary: "Prepare rules" },
  reports: { title: "Reports", kicker: "Owner numbers", intro: "Completed work, unassigned jobs, quote movement, money to collect and crew load.", icon: ShieldCheck, action: "refresh", primary: "Refresh reports" },
  messages: { title: "Messages", kicker: "Customer comms", intro: "Quote follow-ups, invoice reminders and AI-drafted messages.", icon: MessageSquare, action: "prepare_ai", primary: "Prepare messages" },
  integrations: { title: "Sync", kicker: "MYOB and integrations", intro: "MYOB readiness, invoice handoff, client data and sync checks.", icon: Plug, action: "prepare_ai", primary: "Check sync" },
  plans: { title: "Billing", kicker: "Plan, SMS and user blocks", intro: "Plan state, SMS credits, team limits and Enterprise 50-user blocks.", icon: CreditCard, action: "billing", primary: "Billing controls" },
  settings: { title: "Settings", kicker: "Business setup", intro: "Business profile, setup quality, AI controls and missing account fields.", icon: Settings, action: "prepare_ai", primary: "Check setup" },
  proof: { title: "Job Proof Packs", kicker: "Proof to paid", intro: "Completed jobs, uploaded photos, missing proof and invoice readiness.", icon: CheckCircle2, action: "prepare_ai", primary: "Check proof" },
};

const ORDER = ["decisions", "jobs", "dispatch", "clients", "quotes", "invoices", "team", "payroll", "rules", "reports", "messages", "integrations", "plans", "settings", "proof"];

const safe = (value) => String(value || "").trim();
const lower = (value) => safe(value).toLowerCase();
const titleCase = (value) => safe(value || "unknown").replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
const actionId = (action) => action?.id || action?.action_id || action?._id || action?.uuid || "";
const recordId = (item, fallback) => item?.id || item?._id || item?.uuid || fallback;

const money = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "$0";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

const dateText = (value) => {
  if (!value) return "Not set";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Not set" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

const todayInput = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const pickArray = (payload, keys = []) => {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const settled = (result) => (result.status === "fulfilled" ? result.value : null);
const dataOf = (result) => result?.data || result || {};

const jobStatus = (job) => lower(job?.status || job?.job_status || job?.workflow_status);
const quoteStatus = (quote) => lower(quote?.status || quote?.quote_status);
const invoiceStatus = (invoice) => lower(invoice?.status || invoice?.invoice_status);

const hasWorker = (job) => Boolean(job?.assigned_worker_id || job?.worker_id || job?.assigned_to || job?.assigned_worker_name || job?.worker_name);
const isCompletedJob = (job) => ["completed", "done", "finished"].includes(jobStatus(job)) || job?.completed === true || Boolean(job?.completed_at);
const hasProof = (job) => ["photos", "photo_urls", "proof_photos", "job_photos", "completion_photos", "worker_photos"].some((key) => {
  const value = job?.[key];
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
});

const jobTitle = (job) => job?.title || job?.job_title || job?.name || job?.customer_name || job?.client_name || job?.address || "Job";
const clientTitle = (client) => client?.name || client?.client_name || client?.business_name || client?.email || "Client";
const workerTitle = (worker) => worker?.name || worker?.full_name || worker?.worker_name || worker?.email || "Worker";
const quoteTitle = (quote) => quote?.quote_number || quote?.number || quote?.title || quote?.customer_name || quote?.client_name || "Quote";
const invoiceTitle = (invoice) => invoice?.invoice_number || invoice?.number || invoice?.title || invoice?.customer_name || invoice?.client_name || "Invoice";

const forms = {
  new_job: {
    title: "Create job",
    submit: "Create job",
    endpoint: "/jobs",
    defaults: { title: "", customer_name: "", address: "", scheduled_date: todayInput(), job_type: "other", price: "", notes: "" },
    fields: [
      ["title", "Job title", "text", true],
      ["customer_name", "Customer name"],
      ["address", "Job address", "text", true],
      ["scheduled_date", "Scheduled date", "datetime-local", true],
      ["job_type", "Job type"],
      ["price", "Price", "number"],
      ["notes", "Notes", "textarea"],
    ],
    payload: (v) => ({
      title: v.title,
      customer_name: v.customer_name,
      address: v.address,
      scheduled_date: v.scheduled_date,
      job_type: v.job_type || "other",
      price: Number(v.price || 0),
      pricing_type: "fixed",
      notes: v.notes || "",
    }),
  },
  new_client: {
    title: "Add client",
    submit: "Add client",
    endpoint: "/clients",
    defaults: { name: "", email: "", phone: "", address: "", notes: "" },
    fields: [["name", "Client name", "text", true], ["email", "Email", "email"], ["phone", "Phone"], ["address", "Address"], ["notes", "Notes", "textarea"]],
    payload: (v) => v,
  },
  new_quote: {
    title: "Create quote",
    submit: "Create quote",
    endpoint: "/quotes",
    defaults: { customer_name: "", customer_email: "", address: "", job_description: "", price: "" },
    fields: [["customer_name", "Customer name", "text", true], ["customer_email", "Customer email", "email"], ["address", "Address", "text", true], ["job_description", "Job description", "textarea", true], ["price", "Quote price", "number", true]],
    payload: (v) => ({ ...v, price: Number(v.price || 0), job_type: "other", pricing_type: "fixed" }),
  },
  new_invoice: {
    title: "Create invoice",
    submit: "Create invoice",
    endpoint: "/invoices",
    defaults: { customer_name: "", customer_email: "", address: "", description: "", subtotal: "" },
    fields: [["customer_name", "Customer name", "text", true], ["customer_email", "Customer email", "email"], ["address", "Address"], ["description", "Invoice description", "textarea", true], ["subtotal", "Subtotal", "number", true]],
    payload: (v) => ({ ...v, subtotal: Number(v.subtotal || 0) }),
  },
  new_worker: {
    title: "Invite worker",
    submit: "Invite worker",
    endpoint: "/team/workers",
    fallbackEndpoints: ["/team/invite", "/workers"],
    defaults: { name: "", email: "", phone: "" },
    fields: [["name", "Worker name", "text", true], ["email", "Worker email", "email", true], ["phone", "Phone"]],
    payload: (v) => ({ ...v, role: "worker" }),
  },
};

function buildActionItem(action, index) {
  return {
    id: actionId(action) || `action-${index}`,
    icon: Sparkles,
    title: action.title || "AI prepared action",
    subtitle: action.summary || action.reason || "Ready for owner review.",
    badge: titleCase(action.module || action.action_type || "AI"),
    fields: [["Type", titleCase(action.action_type || "Action")], ["Risk", titleCase(action.risk_level || "Low")], ["Status", titleCase(action.queue_status || action.status || "Pending")]],
    raw: action,
    isAction: true,
  };
}

function buildJobItem(job, index) {
  return {
    id: recordId(job, `job-${index}`),
    icon: Briefcase,
    title: jobTitle(job),
    subtitle: [job.customer_name || job.client_name || "No client", job.address || job.job_address || "No address"].join(" • "),
    badge: titleCase(job.status || job.job_status || "New"),
    fields: [["Worker", job.assigned_worker_name || job.worker_name || "Unassigned"], ["Scheduled", dateText(job.scheduled_date || job.date || job.created_at)], ["Price", money(job.price || job.total || job.amount)]],
    raw: job,
  };
}

function buildClientItem(client, index) {
  return {
    id: recordId(client, `client-${index}`),
    icon: Users,
    title: clientTitle(client),
    subtitle: [client.email || "No email", client.phone || "No phone"].join(" • "),
    badge: client.ai_review_needed ? "Review" : "Client",
    fields: [["Address", client.address || "Missing"], ["Email", client.email || "Missing"], ["Phone", client.phone || "Missing"]],
    raw: client,
  };
}

function buildWorkerItem(worker, index) {
  return {
    id: recordId(worker, `worker-${index}`),
    icon: Users,
    title: workerTitle(worker),
    subtitle: [titleCase(worker.role || "Worker"), worker.email || "No email"].join(" • "),
    badge: worker.active === false ? "Inactive" : titleCase(worker.role || "Worker"),
    fields: [["Phone", worker.phone || "Missing"], ["Area", worker.region || worker.area || "Missing"], ["Status", titleCase(worker.status || "Active")]],
    raw: worker,
  };
}

function buildQuoteItem(quote, index) {
  return {
    id: recordId(quote, `quote-${index}`),
    icon: FileText,
    title: quoteTitle(quote),
    subtitle: quote.customer_name || quote.client_name || quote.job_description || "Quote record",
    badge: titleCase(quote.status || "Draft"),
    fields: [["Value", money(quote.total || quote.price || quote.amount)], ["Client", quote.customer_name || quote.client_name || "Missing"], ["Updated", dateText(quote.updated_at || quote.created_at)]],
    raw: quote,
  };
}

function buildInvoiceItem(invoice, index) {
  return {
    id: recordId(invoice, `invoice-${index}`),
    icon: DollarSign,
    title: invoiceTitle(invoice),
    subtitle: invoice.customer_name || invoice.client_name || invoice.description || "Invoice record",
    badge: titleCase(invoice.status || "Draft"),
    fields: [["Total", money(invoice.total || invoice.amount || invoice.subtotal)], ["Client", invoice.customer_name || invoice.client_name || "Missing"], ["Updated", dateText(invoice.updated_at || invoice.created_at)]],
    raw: invoice,
  };
}

function buildSimpleItem(item, index, icon = Sparkles) {
  return {
    id: recordId(item, `simple-${index}`),
    icon,
    title: item.title || item.name || "Item",
    subtitle: item.summary || item.copy || item.description || "Live business item",
    badge: titleCase(item.status || "Open"),
    fields: item.fields || [],
    raw: item,
  };
}

function StatCard({ icon: Icon, label, value, copy }) {
  return (
    <button type="button" className="v3-workspace-card">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{copy}</small>
    </button>
  );
}

function RealItem({ entry, onClick }) {
  const Icon = entry.icon || Sparkles;
  return (
    <button type="button" className="v3-real-item" onClick={onClick}>
      <div className="v3-live-icon"><Icon size={18} /></div>
      <div className="v3-real-item-body">
        <div className="v3-real-item-head">
          <div>
            <b>{entry.title}</b>
            <span>{entry.subtitle}</span>
          </div>
          <small>{entry.badge}</small>
        </div>
        <div className="v3-real-fields">
          {(entry.fields || []).map(([label, value]) => (
            <div key={label}>
              <small>{label}</small>
              <b>{value || "—"}</b>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
}

function EmptyState({ title, copy }) {
  return (
    <div className="v3-empty">
      <b>{title}</b>
      <span>{copy}</span>
    </div>
  );
}

function FormModal({ form, values, setValues, saving, onClose, onSubmit }) {
  if (!form) return null;
  const set = (key, value) => setValues((current) => ({ ...current, [key]: value }));

  return (
    <div className="v3-modal-backdrop" onClick={onClose}>
      <div className="v3-modal" onClick={(event) => event.stopPropagation()}>
        <div className="v3-modal-head">
          <div>
            <p className="v3-eyebrow">Quick action</p>
            <h2>{form.title}</h2>
          </div>
          <button type="button" className="v3-icon-button" onClick={onClose}><X size={18} /></button>
        </div>

        <form className="v3-action-form" onSubmit={onSubmit}>
          {form.fields.map(([name, label, type = "text", required = false]) => (
            <label key={name}>
              <span>{label}</span>
              {type === "textarea" ? (
                <textarea value={values[name] || ""} onChange={(event) => set(name, event.target.value)} required={required} />
              ) : (
                <input type={type} value={values[name] || ""} onChange={(event) => set(name, event.target.value)} required={required} step={type === "number" ? "0.01" : undefined} />
              )}
            </label>
          ))}

          <div className="v3-actions">
            <button type="submit" className="v3-button dark" disabled={saving}>{saving ? "Saving…" : form.submit}</button>
            <button type="button" className="v3-button secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetailModal({ selected, onClose, onApprove, busyActionId, onAskAi }) {
  if (!selected) return null;
  const item = selected.raw || {};
  const isAction = selected.isAction || Boolean(item.action_type);
  const id = actionId(item);

  return (
    <div className="v3-modal-backdrop" onClick={onClose}>
      <div className="v3-modal" onClick={(event) => event.stopPropagation()}>
        <div className="v3-modal-head">
          <div>
            <p className="v3-eyebrow">{isAction ? "AI prepared this" : "Record details"}</p>
            <h2>{selected.title}</h2>
          </div>
          <button type="button" className="v3-icon-button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="v3-modal-body">
          <p>{selected.subtitle}</p>

          <div className="v3-detail-grid">
            {(selected.fields || []).map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <b>{value || "—"}</b>
              </div>
            ))}
          </div>

          {isAction ? (
            <div className="v3-actions">
              <button type="button" className="v3-button dark" onClick={() => onApprove(item)} disabled={busyActionId === id}>
                {busyActionId === id ? "Doing it…" : "Approve and do it"}
              </button>
              <button type="button" className="v3-button secondary" onClick={onClose}>Not now</button>
            </div>
          ) : (
            <div className="v3-actions">
              <button type="button" className="v3-button" onClick={onAskAi}>
                <Sparkles size={18} /> Ask AI to handle next step
              </button>
              <button type="button" className="v3-button secondary" onClick={onClose}>Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildView({ key, actions, jobs, quotes, invoices, clients, workers, billing }) {
  const pendingActions = actions.filter((a) => ["pending", "edited", "needs_review", ""].includes(lower(a.status || a.queue_status)));
  const unassignedJobs = jobs.filter((job) => !hasWorker(job) && !isCompletedJob(job));
  const activeJobs = jobs.filter((job) => ["assigned", "acknowledged", "in_progress", "started", "active", "paused"].includes(jobStatus(job)));
  const completedJobs = jobs.filter(isCompletedJob);
  const proofNeededJobs = completedJobs.filter((job) => !hasProof(job) || job.ai_proof_review_needed);
  const proofReadyJobs = completedJobs.filter(hasProof);
  const openQuotes = quotes.filter((quote) => ["draft", "sent", "pending"].includes(quoteStatus(quote)));
  const acceptedQuotes = quotes.filter((quote) => ["accepted", "approved"].includes(quoteStatus(quote)));
  const moneyItems = invoices.filter((invoice) => ["draft", "sent", "overdue", "unpaid", "pending"].includes(invoiceStatus(invoice)));
  const paidInvoices = invoices.filter((invoice) => ["paid", "complete", "completed"].includes(invoiceStatus(invoice)));
  const messageActions = pendingActions.filter((a) => ["prepare_quote_follow_up", "prepare_invoice_reminder"].includes(a.action_type));

  const statsMap = {
    decisions: [[Sparkles, "AI actions", pendingActions.length, "Waiting for owner"], [Calendar, "Dispatch", pendingActions.filter((a) => a.module === "dispatch").length, "Crew actions"], [DollarSign, "Money", pendingActions.filter((a) => a.module === "invoices").length, "Invoice actions"], [MessageSquare, "Messages", messageActions.length, "Draft comms"]],
    jobs: [[Briefcase, "All jobs", jobs.length, "Live jobs"], [AlertTriangle, "Unassigned", unassignedJobs.length, "Needs worker"], [Clock, "Active", activeJobs.length, "In field"], [CheckCircle2, "Completed", completedJobs.length, "Proof/pay ready"]],
    dispatch: [[AlertTriangle, "Needs crew", unassignedJobs.length, "Unassigned jobs"], [Users, "Workers", workers.length, "Crew records"], [Clock, "Active jobs", activeJobs.length, "In field"], [Sparkles, "AI matches", pendingActions.filter((a) => a.action_type === "assign_worker_to_job").length, "Ready"]],
    clients: [[Users, "Clients", clients.length, "Records"], [AlertTriangle, "Missing email", clients.filter((c) => !c.email).length, "Cleanup"], [AlertTriangle, "Missing phone", clients.filter((c) => !c.phone).length, "Cleanup"], [AlertTriangle, "Missing address", clients.filter((c) => !c.address).length, "Cleanup"]],
    quotes: [[FileText, "Quotes", quotes.length, "Total"], [Clock, "Open", openQuotes.length, "Need movement"], [CheckCircle2, "Accepted", acceptedQuotes.length, "Won work"], [Sparkles, "Follow-ups", messageActions.filter((a) => a.action_type === "prepare_quote_follow_up").length, "AI drafts"]],
    invoices: [[DollarSign, "Invoices", invoices.length, "Total"], [AlertTriangle, "Money items", moneyItems.length, "Need attention"], [CheckCircle2, "Paid", paidInvoices.length, "Collected"], [Sparkles, "Reminders", messageActions.filter((a) => a.action_type === "prepare_invoice_reminder").length, "AI drafts"]],
    team: [[Users, "Workers", workers.length, "Crew"], [AlertTriangle, "Missing email", workers.filter((w) => !w.email).length, "Cleanup"], [AlertTriangle, "Missing phone", workers.filter((w) => !w.phone).length, "Cleanup"], [Calendar, "Crew gaps", unassignedJobs.length, "Jobs need worker"]],
    payroll: [[CreditCard, "Workers", workers.length, "Pay records"], [CheckCircle2, "Completed jobs", completedJobs.length, "Pay source"], [AlertTriangle, "Needs review", completedJobs.filter((j) => !j.payroll_reviewed && !j.payroll_review_needed).length, "AI can flag"], [Clock, "Flagged", completedJobs.filter((j) => j.payroll_review_needed).length, "Payroll ready"]],
    rules: [[Zap, "AI actions", pendingActions.length, "Prepared"], [Calendar, "Dispatch rules", pendingActions.filter((a) => a.module === "dispatch").length, "Crew"], [DollarSign, "Money rules", pendingActions.filter((a) => a.module === "invoices").length, "Billing"], [MessageSquare, "Message rules", messageActions.length, "Comms"]],
    reports: [[CheckCircle2, "Completed", completedJobs.length, "Jobs finished"], [AlertTriangle, "Unassigned", unassignedJobs.length, "Needs action"], [FileText, "Open quotes", openQuotes.length, "Pipeline"], [DollarSign, "Money items", moneyItems.length, "Cashflow"]],
    messages: [[MessageSquare, "Drafts", messageActions.length, "AI prepared"], [FileText, "Quote follow-ups", messageActions.filter((a) => a.action_type === "prepare_quote_follow_up").length, "Sales"], [DollarSign, "Invoice reminders", messageActions.filter((a) => a.action_type === "prepare_invoice_reminder").length, "Money"], [ShieldCheck, "Auto-send", billing?.auto_send_customer_messages ? "On" : "Off", "Owner controlled"]],
    integrations: [[Plug, "MYOB", billing?.myob_enabled ? "On" : "Off", "Plan access"], [DollarSign, "Invoices", invoices.length, "Sync candidates"], [Users, "Clients", clients.length, "Customer data"], [AlertTriangle, "Missing data", clients.filter((c) => !c.email || !c.phone || !c.address).length, "Cleanup"]],
    plans: [[CreditCard, "Plan", titleCase(billing?.plan || "Solo"), "Current"], [Users, "Team used", billing?.team_count ?? workers.length, "Workers"], [MessageSquare, "SMS credits", billing?.sms_credits ?? 0, "Available"], [Users, "50 blocks", billing?.extra_50_user_blocks ?? 0, "Enterprise add-ons"]],
    settings: [[Settings, "Clients", clients.length, "Setup data"], [Users, "Workers", workers.length, "Team setup"], [Sparkles, "AI actions", pendingActions.length, "Automation"], [AlertTriangle, "Missing data", clients.filter((c) => !c.email || !c.phone || !c.address).length, "Cleanup"]],
    proof: [[CheckCircle2, "Completed", completedJobs.length, "Finished"], [AlertTriangle, "Needs proof", proofNeededJobs.length, "Missing proof"], [CheckCircle2, "Proof ready", proofReadyJobs.length, "Photos saved"], [DollarSign, "Invoice drafts", pendingActions.filter((a) => a.action_type === "create_draft_invoice").length, "AI ready"]],
  };

  const reportItems = [
    { title: "Jobs completed", summary: `${completedJobs.length} jobs completed`, status: "live", fields: [["Count", completedJobs.length], ["Next", "Proof + invoice"]] },
    { title: "Unassigned jobs", summary: `${unassignedJobs.length} jobs need a worker`, status: unassignedJobs.length ? "needs action" : "clear", fields: [["Count", unassignedJobs.length], ["Next", "Dispatch"]] },
    { title: "Open quotes", summary: `${openQuotes.length} quotes need movement`, status: openQuotes.length ? "active" : "clear", fields: [["Count", openQuotes.length], ["Next", "Follow-up"]] },
    { title: "Money to collect", summary: `${moneyItems.length} invoices need attention`, status: moneyItems.length ? "active" : "clear", fields: [["Count", moneyItems.length], ["Next", "Reminder"]] },
  ];

  const integrationItems = [
    { title: "MYOB sync readiness", summary: "Check invoice/customer readiness before accounting handoff.", status: billing?.myob_enabled ? "enabled" : "locked", fields: [["Invoices", invoices.length], ["Clients", clients.length], ["MYOB", billing?.myob_enabled ? "Enabled" : "Plan locked"]] },
    { title: "Invoice handoff", summary: `${moneyItems.length} invoice items may need sync or reminder review.`, status: "ready", fields: [["Money items", moneyItems.length], ["Paid", paidInvoices.length]] },
    { title: "Data cleanup", summary: "Missing client fields can block clean sync.", status: "review", fields: [["Missing email", clients.filter((c) => !c.email).length], ["Missing phone", clients.filter((c) => !c.phone).length]] },
  ];

  const planItems = [
    { title: "Current plan", summary: `${titleCase(billing?.plan || "solo")} plan • ${billing?.plan_status || "active"}`, status: "plan", fields: [["Plan", titleCase(billing?.plan || "solo")], ["Status", titleCase(billing?.plan_status || "active")]] },
    { title: "Team capacity", summary: `${billing?.team_count ?? workers.length} used from ${billing?.max_workers ?? "plan"} allowed.`, status: billing?.can_buy_50_user_blocks ? "50 blocks available" : "plan limit", fields: [["Used", billing?.team_count ?? workers.length], ["Allowed", billing?.max_workers ?? "Plan"], ["Blocks", billing?.extra_50_user_blocks ?? 0]] },
    { title: "SMS credits", summary: `${billing?.sms_credits ?? 0} SMS credits available.`, status: billing?.sms_enabled ? "enabled" : "locked", fields: [["Credits", billing?.sms_credits ?? 0], ["100 pack", "$10"], ["500 pack", "$45"]] },
    { title: "50-user blocks", summary: billing?.can_buy_50_user_blocks ? "Enterprise can add $100 / 50-user blocks." : "50-user blocks are Enterprise-only.", status: billing?.can_buy_50_user_blocks ? "available" : "locked", fields: [["Block size", "50"], ["Price", "$100"], ["Owned", billing?.extra_50_user_blocks ?? 0]] },
  ];

  const settingItems = [
    { title: "Business profile", summary: "Company details, trade type and setup defaults.", status: "setup", fields: [["Clients", clients.length], ["Workers", workers.length]] },
    { title: "AI Operator", summary: "Approval-first AI controls and auto-run settings.", status: "owner controlled", fields: [["Queue", pendingActions.length], ["Mode", "Safe"]] },
    { title: "Data quality", summary: `${clients.filter((c) => !c.email || !c.phone || !c.address).length} client records need cleanup.`, status: "review", fields: [["Missing data", clients.filter((c) => !c.email || !c.phone || !c.address).length], ["AI can flag", "Yes"]] },
  ];

  const messageItems = [
    ...messageActions.map(buildActionItem),
    ...invoices.filter((i) => i.ai_reminder_draft).map((invoice, i) => buildSimpleItem({
      title: `Invoice reminder for ${invoice.customer_name || invoice.client_name || "client"}`,
      summary: invoice.ai_reminder_draft,
      status: "draft",
      fields: [["Invoice", invoiceTitle(invoice)], ["Total", money(invoice.total || invoice.subtotal)]],
    }, `invoice-message-${i}`, MessageSquare)),
    ...quotes.filter((q) => q.ai_follow_up_draft).map((quote, i) => buildSimpleItem({
      title: `Quote follow-up for ${quote.customer_name || quote.client_name || "client"}`,
      summary: quote.ai_follow_up_draft,
      status: "draft",
      fields: [["Quote", quoteTitle(quote)], ["Value", money(quote.total || quote.price)]],
    }, `quote-message-${i}`, MessageSquare)),
  ];

  const viewMap = {
    decisions: { mainTitle: "Owner approval queue", mainCopy: "Approve, reject or open AI Operator HQ to edit/delete.", mainItems: pendingActions.map(buildActionItem), sideTitle: "Decision groups", sideItems: [
      { title: "Dispatch decisions", summary: `${pendingActions.filter((a) => a.module === "dispatch").length} crew actions`, status: "crew" },
      { title: "Invoice decisions", summary: `${pendingActions.filter((a) => a.module === "invoices").length} money actions`, status: "money" },
      { title: "Proof decisions", summary: `${pendingActions.filter((a) => a.module === "proof").length} proof actions`, status: "proof" },
    ].map((i, idx) => buildSimpleItem(i, idx, Sparkles)), emptyTitle: "No AI decisions waiting", emptyCopy: "Run AI to prepare owner work." },
    jobs: { mainTitle: "All jobs", mainCopy: "Real jobs with client, address, worker, schedule and price.", mainItems: jobs.map(buildJobItem), sideTitle: "Needs attention", sideItems: [...unassignedJobs.map(buildJobItem), ...completedJobs.slice(0, 6).map(buildJobItem)], emptyTitle: "No jobs found", emptyCopy: "Create a job and AI will help dispatch/proof/invoice it." },
    dispatch: { mainTitle: "Unassigned jobs", mainCopy: "Jobs that need worker assignment.", mainItems: unassignedJobs.map(buildJobItem), sideTitle: "Crew available", sideItems: workers.map(buildWorkerItem), emptyTitle: "No jobs need dispatch", emptyCopy: "Dispatch is clear." },
    clients: { mainTitle: "Client records", mainCopy: "Customer contact details, address and missing data.", mainItems: clients.map(buildClientItem), sideTitle: "Needs cleanup", sideItems: clients.filter((c) => !c.email || !c.phone || !c.address).map(buildClientItem), emptyTitle: "No clients found", emptyCopy: "Add or import clients." },
    quotes: { mainTitle: "Quote pipeline", mainCopy: "Draft, sent, pending and accepted quotes.", mainItems: quotes.map(buildQuoteItem), sideTitle: "Needs follow-up", sideItems: openQuotes.map(buildQuoteItem), emptyTitle: "No quotes found", emptyCopy: "Create quotes and AI will follow them up." },
    invoices: { mainTitle: "Invoice money board", mainCopy: "Draft, sent, unpaid, overdue and paid invoices.", mainItems: invoices.map(buildInvoiceItem), sideTitle: "Needs money action", sideItems: moneyItems.map(buildInvoiceItem), emptyTitle: "No invoices found", emptyCopy: "Create invoices or let AI draft from completed jobs." },
    team: { mainTitle: "Team and workers", mainCopy: "Crew records, roles, region, contact and dispatch readiness.", mainItems: workers.map(buildWorkerItem), sideTitle: "Profile cleanup", sideItems: workers.filter((w) => !w.email || !w.phone || (!w.region && !w.area)).map(buildWorkerItem), emptyTitle: "No team members found", emptyCopy: "Invite workers so AI can dispatch jobs." },
    payroll: { mainTitle: "Payroll review", mainCopy: "Completed jobs and workers feeding pay review.", mainItems: completedJobs.map(buildJobItem), sideTitle: "Workers", sideItems: workers.map(buildWorkerItem), emptyTitle: "No payroll data ready", emptyCopy: "Completed jobs and worker time will appear here." },
    rules: { mainTitle: "Automation rules/actions", mainCopy: "AI-prepared business rules and background checks.", mainItems: pendingActions.map(buildActionItem), sideTitle: "Rule groups", sideItems: [
      { title: "Dispatch automation", summary: "Assign and review unassigned jobs.", status: "crew" },
      { title: "Money automation", summary: "Draft invoices and reminders.", status: "cashflow" },
      { title: "Proof automation", summary: "Flag missing proof photos.", status: "proof" },
    ].map((i, idx) => buildSimpleItem(i, idx, Zap)), emptyTitle: "No automation actions waiting", emptyCopy: "Run AI Operator to prepare actions." },
    reports: { mainTitle: "Owner numbers", mainCopy: "Real operational metrics from jobs, quotes, invoices and crew.", mainItems: reportItems.map((i, idx) => buildSimpleItem(i, idx, ShieldCheck)), sideTitle: "Actionable numbers", sideItems: reportItems.filter((i) => i.status !== "clear").map((i, idx) => buildSimpleItem(i, idx, ShieldCheck)), emptyTitle: "No report data yet", emptyCopy: "Reports fill as work is added." },
    messages: { mainTitle: "Drafted customer messages", mainCopy: "AI-prepared quote follow-ups and invoice reminders.", mainItems: messageItems, sideTitle: "Message sources", sideItems: [
      { title: "Quote follow-ups", summary: `${messageActions.filter((a) => a.action_type === "prepare_quote_follow_up").length} waiting`, status: "quotes" },
      { title: "Invoice reminders", summary: `${messageActions.filter((a) => a.action_type === "prepare_invoice_reminder").length} waiting`, status: "invoices" },
    ].map((i, idx) => buildSimpleItem(i, idx, MessageSquare)), emptyTitle: "No message drafts waiting", emptyCopy: "AI will prepare reminders and follow-ups here." },
    integrations: { mainTitle: "Integration readiness", mainCopy: "MYOB, invoice handoff and sync data quality.", mainItems: integrationItems.map((i, idx) => buildSimpleItem(i, idx, Plug)), sideTitle: "Sync candidates", sideItems: moneyItems.map(buildInvoiceItem), emptyTitle: "No sync items waiting", emptyCopy: "Connect MYOB/sync when ready." },
    plans: { mainTitle: "Billing, SMS and user blocks", mainCopy: "Secure billing status, SMS credits and 50-user Enterprise blocks.", mainItems: planItems.map((i, idx) => buildSimpleItem(i, idx, CreditCard)), sideTitle: "Billing actions", sideItems: planItems.slice(1).map((i, idx) => buildSimpleItem(i, idx, CreditCard)), emptyTitle: "Billing data not loaded", emptyCopy: "Billing should load from secure backend endpoints." },
    settings: { mainTitle: "Business setup", mainCopy: "Business setup, AI controls and data quality.", mainItems: settingItems.map((i, idx) => buildSimpleItem(i, idx, Settings)), sideTitle: "Setup cleanup", sideItems: clients.filter((c) => !c.email || !c.phone || !c.address).slice(0, 8).map(buildClientItem), emptyTitle: "No settings actions waiting", emptyCopy: "Setup controls and AI checks live here." },
    proof: { mainTitle: "Proof packs", mainCopy: "Completed jobs needing proof or invoice readiness.", mainItems: proofNeededJobs.map(buildJobItem), sideTitle: "Proof ready", sideItems: proofReadyJobs.map(buildJobItem), emptyTitle: "No proof packs waiting", emptyCopy: "Completed jobs missing proof will show here." },
  };

  return {
    ...(viewMap[key] || viewMap.jobs),
    stats: (statsMap[key] || statsMap.jobs).map(([icon, label, value, copy]) => ({ icon, label, value, copy })),
  };
}

export default function V3WorkspacePage({ type }) {
  const navigate = useNavigate();
  const { section } = useParams();

  const key = useMemo(() => {
    const clean = safe(section || type || "jobs").toLowerCase().replace(/[^a-z]/g, "");
    if (clean === "automation") return "rules";
    if (clean === "sms") return "messages";
    if (clean === "sync") return "integrations";
    if (clean === "billing") return "plans";
    return PAGE_META[clean] ? clean : "jobs";
  }, [section, type]);

  const meta = PAGE_META[key] || PAGE_META.jobs;

  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiRunning, setAiRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyActionId, setBusyActionId] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(null);
  const [activeFormKey, setActiveFormKey] = useState("");
  const [formValues, setFormValues] = useState({});

  const loadAiQueue = async () => {
    const pageResult = await get(`/ai/operator/v3/pages/${key}/queue`);
    if (pageResult.ok) return pageResult;
    return get("/ai/operator/v3/queue");
  };

  const load = async () => {
    setLoading(true);
    setNotice("");

    const results = await Promise.allSettled([
      loadAiQueue(),
      get("/jobs"),
      get("/quotes"),
      get("/invoices"),
      get("/clients"),
      get("/team/workers"),
      get("/billing/v3/status"),
    ]);

    setActions(dataOf(settled(results[0]))?.actions || []);
    setJobs(pickArray(settled(results[1]), ["jobs"]));
    setQuotes(pickArray(settled(results[2]), ["quotes"]));
    setInvoices(pickArray(settled(results[3]), ["invoices"]));
    setClients(pickArray(settled(results[4]), ["clients"]));
    setWorkers(pickArray(settled(results[5]), ["workers", "team"]));
    setBilling(dataOf(settled(results[6]))?.billing || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const view = useMemo(
    () => buildView({ key, actions, jobs, quotes, invoices, clients, workers, billing }),
    [key, actions, jobs, quotes, invoices, clients, workers, billing]
  );

  const prepareAi = async () => {
    setAiRunning(true);
    setNotice(`AI is checking ${meta.title}…`);

    let result = await post(`/ai/operator/v3/pages/${key}/prepare`, {});
    if (!result.ok) result = await post("/ai/operator/v3/prepare-today", {});

    if (result.ok) {
      setActions(result.data?.actions || []);
      setNotice(result.data?.message || `AI prepared ${meta.title} actions.`);
    } else {
      setNotice(result.message || "AI could not prepare actions.");
    }

    await load();
    setAiRunning(false);
  };

  const approve = async (action) => {
    const id = actionId(action);
    if (!id) {
      setNotice("This AI action is missing an id, so it cannot be approved yet.");
      return;
    }

    setBusyActionId(id);
    const result = await approveAiAction(action);

    if (result.ok) {
      setNotice(result.data?.message || "Approved. AI completed the action.");
      setSelected(null);
      await load();
    } else {
      setNotice(result.message || "Approval failed.");
    }

    setBusyActionId("");
  };

  const openForm = (formKey) => {
    const form = forms[formKey];
    if (!form) return;
    setActiveFormKey(formKey);
    setFormValues(form.defaults || {});
  };

  const primaryAction = () => {
    if (forms[meta.action]) return openForm(meta.action);
    if (meta.action === "refresh") return load();
    if (meta.action === "billing") {
      setNotice("Billing controls are shown below. SMS and 50-user blocks use secure checkout.");
      return;
    }
    return prepareAi();
  };

  const submitForm = async (event) => {
    event.preventDefault();
    const form = forms[activeFormKey];
    if (!form) return;

    setSaving(true);
    const payload = form.payload(formValues);
    const endpoints = [form.endpoint, ...(form.fallbackEndpoints || [])];

    let result = null;
    for (const endpoint of endpoints) {
      result = await post(endpoint, payload);
      if (result.ok || result.success) break;
    }

    if (result?.ok || result?.success) {
      const savedForm = activeFormKey;
      setNotice(`${form.title} saved.`);
      setActiveFormKey("");
      setFormValues({});
      await load();

      if (["new_job", "new_worker", "new_quote", "new_invoice"].includes(savedForm)) {
        await prepareAi();
      }
    } else {
      setNotice(result?.message || result?.error || `${form.title} could not be saved.`);
    }

    setSaving(false);
  };

  const buySmsPack = async (pack) => {
    setSaving(true);
    const result = await post("/billing/v3/sms-pack", { pack });
    if (result.ok && result.data?.checkout_url) {
      window.location.href = result.data.checkout_url;
      return;
    }
    setNotice(result.message || "Could not start SMS checkout.");
    setSaving(false);
  };

  const buyExtraBlock = async () => {
    setSaving(true);
    const result = await post("/billing/v3/extra-50-user-block", {});
    if (result.ok && result.data?.checkout_url) {
      window.location.href = result.data.checkout_url;
      return;
    }
    setNotice(result.message || "Could not start 50-user block checkout.");
    setSaving(false);
  };

  const upgradePlan = async (plan) => {
    setSaving(true);
    const result = await post("/billing/v3/upgrade-plan", { plan });
    if (result.ok && result.data?.checkout_url) {
      window.location.href = result.data.checkout_url;
      return;
    }
    setNotice(result.message || `Could not start ${plan} upgrade checkout.`);
    setSaving(false);
  };

  const confirmBillingFromUrl = async () => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId || !window.location.search.includes("billing_success")) return;

    setSaving(true);
    const result = await post("/billing/v3/confirm-checkout", { session_id: sessionId });
    if (result.ok) {
      setNotice(result.data?.message || "Billing checkout confirmed.");
      window.history.replaceState({}, document.title, window.location.pathname);
      await load();
    } else {
      setNotice(result.message || "Could not confirm checkout yet.");
    }
    setSaving(false);
  };

  useEffect(() => {
    if (key === "plans") confirmBillingFromUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <V3Shell>
      <main className="v3-workspace-detail">
        <section className="v3-workspace-hero">
          <div>
            <p className="v3-eyebrow">{meta.kicker}</p>
            <h1>{meta.title}</h1>
            <p>{meta.intro}</p>
          </div>

          <div className="v3-workspace-actions">
            <button type="button" className="v3-primary-btn" onClick={primaryAction} disabled={aiRunning || saving}>
              <Wand2 size={18} /> {aiRunning ? "Preparing…" : meta.primary}
            </button>
            <button type="button" className="v3-dark-btn" onClick={prepareAi} disabled={aiRunning || saving}>
              <RefreshCw size={18} /> AI check this page
            </button>
          </div>
        </section>

        {notice && <div className="v3-notice">{notice}</div>}

        <section className="v3-workspace-grid">
          {view.stats.map((stat) => (
            <StatCard key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} copy={stat.copy} />
          ))}
        </section>

        <section className="v3-real-page-layout">
          <article className="v3-real-main">
            <div className="v3-card-head">
              <div>
                <p>{meta.kicker}</p>
                <h2>{view.mainTitle}</h2>
                <span>{view.mainCopy}</span>
              </div>
              <strong>{loading ? "…" : view.mainItems.length}</strong>
            </div>

            {loading ? (
              <EmptyState title={`Loading ${meta.title}`} copy="Checking real records and AI actions." />
            ) : view.mainItems.length ? (
              <div className="v3-real-list">
                {view.mainItems.slice(0, 30).map((entry) => (
                  <RealItem key={entry.id} entry={entry} onClick={() => setSelected(entry)} />
                ))}
              </div>
            ) : (
              <EmptyState title={view.emptyTitle} copy={view.emptyCopy} />
            )}
          </article>

          <aside className="v3-real-side">
            <div className="v3-card-head">
              <div>
                <p>Focus panel</p>
                <h2>{view.sideTitle}</h2>
              </div>
              <strong>{loading ? "…" : view.sideItems.length}</strong>
            </div>

            {loading ? (
              <EmptyState title="Loading focus panel" copy="Checking related records." />
            ) : view.sideItems.length ? (
              <div className="v3-real-list compact">
                {view.sideItems.slice(0, 12).map((entry) => (
                  <RealItem key={entry.id} entry={entry} onClick={() => setSelected(entry)} />
                ))}
              </div>
            ) : (
              <EmptyState title="Nothing urgent" copy="AI will surface real items here when needed." />
            )}

            <div className="v3-ai-stack">
              <button type="button" onClick={prepareAi} disabled={aiRunning}>
                <Sparkles size={18} />
                <span>
                  <b>AI check this page</b>
                  <small>Prepare the right actions for this workspace.</small>
                </span>
              </button>

              <button type="button" onClick={() => navigate("/v3/decisions")}>
                <CheckCircle2 size={18} />
                <span>
                  <b>Open owner queue</b>
                  <small>Approve AI-prepared actions.</small>
                </span>
              </button>

              {key === "plans" && (
                <>
                  <button type="button" onClick={() => upgradePlan("team")} disabled={saving || billing?.billing_locked || billing?.plan === "team"}>
                    <CreditCard size={18} />
                    <span>
                      <b>Upgrade to Team</b>
                      <small>$70/month secure checkout. Owner/admin only.</small>
                    </span>
                  </button>

                  <button type="button" onClick={() => upgradePlan("pro")} disabled={saving || billing?.billing_locked || billing?.plan === "pro"}>
                    <CreditCard size={18} />
                    <span>
                      <b>Upgrade to Pro</b>
                      <small>$110/month secure checkout. Owner/admin only.</small>
                    </span>
                  </button>

                  <button type="button" onClick={() => upgradePlan("enterprise")} disabled={saving || billing?.billing_locked || billing?.plan === "enterprise"}>
                    <CreditCard size={18} />
                    <span>
                      <b>Upgrade to Enterprise</b>
                      <small>$240/month secure checkout. Unlocks 50-user blocks.</small>
                    </span>
                  </button>

                  <button type="button" onClick={() => buySmsPack("100")} disabled={saving || billing?.billing_locked}>
                    <MessageSquare size={18} />
                    <span>
                      <b>Buy 100 SMS credits</b>
                      <small>$10 secure checkout. Owner/admin only.</small>
                    </span>
                  </button>

                  <button type="button" onClick={() => buySmsPack("500")} disabled={saving || billing?.billing_locked}>
                    <MessageSquare size={18} />
                    <span>
                      <b>Buy 500 SMS credits</b>
                      <small>$45 secure checkout. Owner/admin only.</small>
                    </span>
                  </button>

                  <button type="button" onClick={buyExtraBlock} disabled={saving || billing?.billing_locked || !billing?.can_buy_50_user_blocks}>
                    <Users size={18} />
                    <span>
                      <b>Add 50-user block</b>
                      <small>$100 Enterprise add-on. Locked for non-Enterprise.</small>
                    </span>
                  </button>
                </>
              )}
            </div>
          </aside>
        </section>

        <section className="v3-workspace-switcher">
          <p className="v3-eyebrow">Work areas</p>
          <div>
            {ORDER.map((item) => (
              <button type="button" key={item} className={item === key ? "active" : ""} onClick={() => navigate(`/v3/${item}`)}>
                {PAGE_META[item]?.title || item}
              </button>
            ))}
          </div>
        </section>

        <DetailModal selected={selected} busyActionId={busyActionId} onClose={() => setSelected(null)} onApprove={approve} onAskAi={prepareAi} />
        <FormModal form={forms[activeFormKey]} values={formValues} setValues={setFormValues} saving={saving} onClose={() => setActiveFormKey("")} onSubmit={submitForm} />
      </main>
    </V3Shell>
  );
}
