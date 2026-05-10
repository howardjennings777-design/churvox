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
  Trash2,
  UserPlus,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { approveAiAction } from "../../lib/aiOperator";
import { get, post, put, patch, del as delRequest } from "../../lib/api";
import V3Shell from "../components/V3Shell";
import V3ChurvoxEdge from "../components/V3ChurvoxEdge";
import "../styles/v3.css";

const PAGE_META = {
  decisions: { title: "Owner Decisions", kicker: "Approve and do it", intro: "AI finds the work, prepares the action, explains why, and waits for owner approval.", icon: Sparkles, action: "prepare_ai", primary: "Prepare decisions" },
  jobs: { title: "AI Run Sheet", kicker: "Field work command", intro: "Churvox checks every job for crew, proof, timing, billing readiness, and the next owner-approved move.", icon: Briefcase, action: "new_job", primary: "Create job" },
  dispatch: { title: "Crew Match", kicker: "AI dispatch brain", intro: "AI reviews area, workload, timing, and job fit so the owner can approve the right worker fast.", icon: Calendar, action: "prepare_ai", primary: "Match crew with AI" },
  clients: { title: "Clients", kicker: "Customer base", intro: "Client records, contact details, missing fields, addresses and follow-up readiness.", icon: Users, action: "new_client", primary: "Add client" },
  quotes: { title: "Quote Desk", kicker: "Win work faster", intro: "Quotes, follow-ups, accepted work, and AI-prepared next steps before jobs are missed.", icon: FileText, action: "new_quote", primary: "Create quote" },
  invoices: { title: "Money Board", kicker: "Proof to paid", intro: "AI watches completed work, draft invoices, unpaid money, reminders, and payment-ready records.", icon: DollarSign, action: "new_invoice", primary: "Create invoice" },
  team: { title: "Crew", kicker: "People and readiness", intro: "Crew records, roles, regions, workload, missing details, and dispatch readiness.", icon: UserPlus, action: "new_worker", primary: "Invite crew" },
  payroll: { title: "Pay Run", kicker: "Time and pay review", intro: "Completed work, worker time, review flags, and payroll handoff without exposing owner-only controls.", icon: CreditCard, action: "prepare_ai", primary: "AI review pay run" },
  rules: { title: "Auto Rules", kicker: "Quiet background engine", intro: "Churvox rules prepare safe admin work while owner approval protects risky actions.", icon: Zap, action: "prepare_ai", primary: "Prepare rules" },
  reports: { title: "Reports", kicker: "Owner numbers", intro: "Completed work, unassigned jobs, quote movement, money to collect and crew load.", icon: ShieldCheck, action: "refresh", primary: "Refresh reports" },
  messages: { title: "AI Messages", kicker: "Draft-first customer comms", intro: "AI prepares quote follow-ups and invoice reminders, but the owner stays in control before sending.", icon: MessageSquare, action: "prepare_ai", primary: "Prepare messages" },
  integrations: { title: "Sync", kicker: "MYOB and integrations", intro: "MYOB readiness, invoice handoff, client data and sync checks.", icon: Plug, action: "prepare_ai", primary: "Check sync" },
  plans: { title: "Billing", kicker: "Plan, SMS and user blocks", intro: "Plan state, SMS credits, team limits and Enterprise 50-user blocks.", icon: CreditCard, action: "billing", primary: "Billing controls" },
  settings: { title: "Settings", kicker: "Business setup", intro: "Business profile, setup quality, AI controls and missing account fields.", icon: Settings, action: "prepare_ai", primary: "Check setup" },
  proof: { title: "Proof-to-Paid", kicker: "Photos, time, invoice ready", intro: "Completed jobs, proof photos, visit evidence, and invoice readiness in one Churvox flow.", icon: CheckCircle2, action: "prepare_ai", primary: "Check proof" },
};

const ORDER = Object.keys(PAGE_META);

const safe = (value) => String(value || "").trim();
const lower = (value) => safe(value).toLowerCase();
const titleCase = (value) => safe(value || "unknown").replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
const actionId = (action) => action?.id || action?.action_id || action?._id || action?.uuid || "";
const recordId = (item, fallback) => item?.id || item?._id || item?.uuid || item?.action_id || fallback;

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

async function tryRequests(requests) {
  let last = null;
  for (const req of requests) {
    try {
      const res = await req();
      last = res;
      if (res?.ok || res?.success) return res;
    } catch (err) {
      last = { ok: false, message: err?.message || "Request failed" };
    }
  }
  return last || { ok: false, message: "No request was attempted." };
}

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
    defaults: { name: "", email: "", phone: "", role: "worker" },
    fields: [["name", "Worker name", "text", true], ["email", "Worker email", "email", true], ["phone", "Phone"]],
    payload: (v) => ({ ...v, role: "worker" }),
  },
};

function makeEntry(kind, item, index) {
  if (kind === "action") {
    return {
      id: actionId(item) || `action-${index}`,
      kind,
      icon: Sparkles,
      title: item.title || item.name || "Churvox prepared action",
      subtitle: item.summary || item.reason || item.description || "Ready for owner review.",
      badge: titleCase(item.module || item.action_type || "AI"),
      fields: [["Type", titleCase(item.action_type || "Action")], ["Risk", titleCase(item.risk_level || "Low")], ["Status", titleCase(item.queue_status || item.status || "Pending")]],
      raw: item,
      isAction: true,
    };
  }

  if (kind === "job") {
    return {
      id: recordId(item, `job-${index}`),
      kind,
      icon: Briefcase,
      title: jobTitle(item),
      subtitle: [item.customer_name || item.client_name || "No client", item.address || item.job_address || "No address"].join(" • "),
      badge: titleCase(item.status || item.job_status || "New"),
      fields: [["Worker", item.assigned_worker_name || item.worker_name || "Unassigned"], ["Scheduled", dateText(item.scheduled_date || item.date || item.created_at)], ["Price", money(item.price || item.total || item.amount)]],
      raw: item,
    };
  }

  if (kind === "client") {
    return {
      id: recordId(item, `client-${index}`),
      kind,
      icon: Users,
      title: clientTitle(item),
      subtitle: [item.email || "No email", item.phone || "No phone"].join(" • "),
      badge: item.ai_review_needed ? "Review" : "Client",
      fields: [["Address", item.address || "Missing"], ["Email", item.email || "Missing"], ["Phone", item.phone || "Missing"]],
      raw: item,
    };
  }

  if (kind === "worker") {
    return {
      id: recordId(item, `worker-${index}`),
      kind,
      icon: Users,
      title: workerTitle(item),
      subtitle: [titleCase(item.role || "Worker"), item.email || "No email"].join(" • "),
      badge: item.active === false ? "Inactive" : titleCase(item.role || "Worker"),
      fields: [["Phone", item.phone || "Missing"], ["Area", item.region || item.area || "Missing"], ["Status", titleCase(item.status || "Active")]],
      raw: item,
    };
  }

  if (kind === "quote") {
    return {
      id: recordId(item, `quote-${index}`),
      kind,
      icon: FileText,
      title: quoteTitle(item),
      subtitle: item.customer_name || item.client_name || item.job_description || "Quote record",
      badge: titleCase(item.status || "Draft"),
      fields: [["Value", money(item.total || item.price || item.amount)], ["Client", item.customer_name || item.client_name || "Missing"], ["Updated", dateText(item.updated_at || item.created_at)]],
      raw: item,
    };
  }

  if (kind === "invoice") {
    return {
      id: recordId(item, `invoice-${index}`),
      kind,
      icon: DollarSign,
      title: invoiceTitle(item),
      subtitle: item.customer_name || item.client_name || item.description || "Invoice record",
      badge: titleCase(item.status || "Draft"),
      fields: [["Total", money(item.total || item.amount || item.subtotal)], ["Client", item.customer_name || item.client_name || "Missing"], ["Updated", dateText(item.updated_at || item.created_at)]],
      raw: item,
    };
  }

  return {
    id: recordId(item, `item-${index}`),
    kind,
    icon: Sparkles,
    title: item.title || item.name || "Item",
    subtitle: item.summary || item.description || "Business record",
    badge: titleCase(item.status || "Open"),
    fields: item.fields || [],
    raw: item,
  };
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
    payroll: [[CreditCard, "Workers", workers.length, "Pay records"], [CheckCircle2, "Completed jobs", completedJobs.length, "Pay source"], [AlertTriangle, "Needs review", completedJobs.filter((j) => !j.payroll_reviewed).length, "AI can flag"], [Clock, "Flagged", completedJobs.filter((j) => j.payroll_review_needed).length, "Payroll ready"]],
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

  const settingItems = [
    { title: "Business profile", summary: "Company details, trade type and setup defaults.", status: "setup", fields: [["Clients", clients.length], ["Workers", workers.length]] },
    { title: "AI Operator", summary: "Approval-first AI controls and auto-run settings.", status: "owner controlled", fields: [["Queue", pendingActions.length], ["Mode", "Safe"]] },
    { title: "Data quality", summary: `${clients.filter((c) => !c.email || !c.phone || !c.address).length} client records need cleanup.`, status: "review", fields: [["Missing data", clients.filter((c) => !c.email || !c.phone || !c.address).length], ["AI can flag", "Yes"]] },
  ];

  const planItems = [
    { title: "Current plan", summary: `${titleCase(billing?.plan || "solo")} plan • ${billing?.plan_status || "active"}`, status: "plan", fields: [["Plan", titleCase(billing?.plan || "solo")], ["Status", titleCase(billing?.plan_status || "active")]] },
    { title: "Team capacity", summary: `${billing?.team_count ?? workers.length} used from ${billing?.max_workers ?? "plan"} allowed.`, status: billing?.can_buy_50_user_blocks ? "50 blocks available" : "plan limit", fields: [["Used", billing?.team_count ?? workers.length], ["Allowed", billing?.max_workers ?? "Plan"], ["Blocks", billing?.extra_50_user_blocks ?? 0]] },
    { title: "SMS credits", summary: `${billing?.sms_credits ?? 0} SMS credits available.`, status: billing?.sms_enabled ? "enabled" : "locked", fields: [["Credits", billing?.sms_credits ?? 0], ["100 pack", "$10"], ["500 pack", "$45"]] },
  ];

  const pageItems = {
    decisions: pendingActions.map((a, i) => makeEntry("action", a, i)),
    jobs: jobs.map((j, i) => makeEntry("job", j, i)),
    dispatch: [...pendingActions.filter((a) => a.action_type === "assign_worker_to_job").map((a, i) => makeEntry("action", a, i)), ...unassignedJobs.map((j, i) => makeEntry("job", j, i))],
    clients: clients.map((c, i) => makeEntry("client", c, i)),
    quotes: quotes.map((q, i) => makeEntry("quote", q, i)),
    invoices: invoices.map((inv, i) => makeEntry("invoice", inv, i)),
    team: workers.map((w, i) => makeEntry("worker", w, i)),
    payroll: completedJobs.map((j, i) => makeEntry("job", j, i)),
    rules: pendingActions.map((a, i) => makeEntry("action", a, i)),
    reports: reportItems.map((item, i) => makeEntry("report", item, i)),
    messages: messageActions.map((a, i) => makeEntry("action", a, i)),
    integrations: integrationItems.map((item, i) => makeEntry("integration", item, i)),
    plans: planItems.map((item, i) => makeEntry("plan", item, i)),
    settings: settingItems.map((item, i) => makeEntry("setting", item, i)),
    proof: [...pendingActions.filter((a) => a.action_type === "create_draft_invoice").map((a, i) => makeEntry("action", a, i)), ...completedJobs.map((j, i) => makeEntry("job", j, i))],
  };

  return {
    stats: statsMap[key] || statsMap.jobs,
    items: pageItems[key] || [],
    secondary: ORDER.filter((section) => section !== key).slice(0, 8),
  };
}

function StatCard({ icon: Icon, label, value, copy, onClick }) {
  return (
    <button type="button" className="v3-workspace-card" onClick={onClick}>
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

function DetailModal({
  selected,
  workers,
  selectedWorkerId,
  setSelectedWorkerId,
  busyActionId,
  onClose,
  onApprove,
  onAskAi,
  onAssignWorker,
  onCreateInvoice,
  onMarkCompleted,
  onDeleteInvoice,
  onQuoteAccepted,
  onQuoteDeclined,
}) {
  if (!selected) return null;
  const item = selected.raw || {};
  const isAction = selected.isAction || Boolean(item.action_type);
  const id = actionId(item);

  return (
    <div className="v3-modal-backdrop" onClick={onClose}>
      <div className="v3-modal" onClick={(event) => event.stopPropagation()}>
        <div className="v3-modal-head">
          <div>
            <p className="v3-eyebrow">{isAction ? "Prepared by Churvox AI" : "Record details"}</p>
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

          {selected.kind === "job" && (
            <div className="v3-detail-grid">
              <label>
                <small>Assign worker</small>
                <select value={selectedWorkerId} onChange={(event) => setSelectedWorkerId(event.target.value)}>
                  <option value="">Choose worker</option>
                  {workers.map((worker) => (
                    <option key={recordId(worker, worker.email)} value={recordId(worker, "")}>
                      {workerTitle(worker)}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="v3-button dark" onClick={() => onAssignWorker(item)} disabled={!selectedWorkerId || !!busyActionId}>
                Assign selected worker
              </button>
            </div>
          )}

          <div className="v3-actions">
            {isAction && (
              <button type="button" className="v3-button dark" onClick={() => onApprove(item)} disabled={busyActionId === id}>
                {busyActionId === id ? "Doing it…" : "Approve and do it"}
              </button>
            )}

            {selected.kind === "job" && (
              <>
                <button type="button" className="v3-button" onClick={() => onCreateInvoice(item)} disabled={!!busyActionId}>
                  Create draft invoice
                </button>
                <button type="button" className="v3-button secondary" onClick={() => onMarkCompleted(item)} disabled={!!busyActionId}>
                  Mark completed
                </button>
              </>
            )}

            {selected.kind === "invoice" && (
              <button type="button" className="v3-button ghost" onClick={() => onDeleteInvoice(item)} disabled={!!busyActionId}>
                <Trash2 size={16} /> Clear invoice
              </button>
            )}

            {selected.kind === "quote" && (
              <>
                <button type="button" className="v3-button dark" onClick={() => onQuoteAccepted(item)} disabled={!!busyActionId}>
                  Mark accepted
                </button>
                <button type="button" className="v3-button secondary" onClick={() => onQuoteDeclined(item)} disabled={!!busyActionId}>
                  Mark declined
                </button>
              </>
            )}

            {!isAction && (
              <button type="button" className="v3-button" onClick={onAskAi} disabled={!!busyActionId}>
                <Sparkles size={18} /> Ask Churvox AI for next step
              </button>
            )}

            <button type="button" className="v3-button secondary" onClick={onClose}>Close</button>
          </div>

          <details className="v3-empty">
            <summary>Full record data</summary>
            <pre style= whiteSpace: "pre-wrap", fontSize: 12 >{JSON.stringify(item, null, 2)}</pre>
          </details>
        </div>
      </div>
    </div>
  );
}

export default function V3WorkspacePage() {
  const navigate = useNavigate();
  const { section = "jobs" } = useParams();
  const key = PAGE_META[section] ? section : "jobs";
  const meta = PAGE_META[key];
  const Icon = meta.icon;

  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [billing, setBilling] = useState({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(null);
  const [formKey, setFormKey] = useState("");
  const [formValues, setFormValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [busyActionId, setBusyActionId] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState("");

  const currentForm = formKey ? forms[formKey] : null;

  const load = async () => {
    setLoading(true);
    const [queueResult, jobsResult, quotesResult, invoicesResult, clientsResult, workersResult, billingResult] = await Promise.allSettled([
      get("/ai/operator/v3/strong/queue"),
      get("/jobs"),
      get("/quotes"),
      get("/invoices"),
      get("/clients"),
      get("/team/workers"),
      get("/billing/v3/status"),
    ]);

    const queue = dataOf(settled(queueResult));
    setActions(pickArray(queue, ["actions"]));
    setJobs(pickArray(settled(jobsResult), ["jobs"]));
    setQuotes(pickArray(settled(quotesResult), ["quotes"]));
    setInvoices(pickArray(settled(invoicesResult), ["invoices"]));
    setClients(pickArray(settled(clientsResult), ["clients"]));
    setWorkers(pickArray(settled(workersResult), ["workers", "team"]));
    setBilling(dataOf(settled(billingResult))?.billing || dataOf(settled(billingResult)) || {});
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const view = useMemo(() => buildView({ key, actions, jobs, quotes, invoices, clients, workers, billing }), [key, actions, jobs, quotes, invoices, clients, workers, billing]);

  const openForm = (nextKey) => {
    const form = forms[nextKey];
    if (!form) return;
    setNotice("");
    setFormKey(nextKey);
    setFormValues({ ...form.defaults });
  };

  const runPrimaryAction = async () => {
    if (meta.action === "billing") {
      navigate("/v3/plans");
      return;
    }
    if (meta.action === "refresh") {
      await load();
      setNotice("Workspace refreshed.");
      return;
    }
    if (meta.action === "prepare_ai") {
      setSaving(true);
      const res = await post(`/ai/operator/v3/strong/pages/${key}/prepare`, {});
      if (res.ok) {
        setNotice("AI prepared the next owner actions.");
        await load();
      } else {
        setNotice(res.message || "AI could not prepare this workspace.");
      }
      setSaving(false);
      return;
    }
    openForm(meta.action);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    if (!currentForm) return;

    setSaving(true);
    const payload = currentForm.payload(formValues);

    const endpoints = [currentForm.endpoint, ...(currentForm.fallbackEndpoints || [])];
    const result = await tryRequests(endpoints.map((endpoint) => () => post(endpoint, payload)));

    if (result.ok || result.success) {
      setNotice(`${currentForm.title} saved.`);
      setFormKey("");
      setFormValues({});
      await load();
    } else {
      setNotice(result.message || result.error || `${currentForm.title} failed.`);
    }

    setSaving(false);
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

  const askAi = async () => {
    if (!selected) return;
    setBusyActionId("ask");
    const res = await post("/ai/operator/v3/strong/ask", {
      question: `Review this ${selected.kind} and prepare the next best owner-approved action. Record: ${JSON.stringify(selected.raw || {})}`,
    });
    if (res.ok) {
      setNotice(res.data?.answer || res.data?.message || "AI prepared a recommendation.");
      await load();
    } else {
      setNotice(res.message || "AI could not prepare a recommendation.");
    }
    setBusyActionId("");
  };

  const assignWorker = async (job) => {
    const jobId = recordId(job, "");
    if (!jobId || !selectedWorkerId) return;
    setBusyActionId("assign");

    const result = await tryRequests([
      () => post(`/jobs/${jobId}/assign`, { worker_id: selectedWorkerId }),
      () => patch(`/jobs/${jobId}`, { assigned_worker_id: selectedWorkerId }),
      () => put(`/jobs/${jobId}`, { ...job, assigned_worker_id: selectedWorkerId }),
    ]);

    if (result.ok || result.success) {
      setNotice("Worker assigned.");
      setSelected(null);
      await load();
    } else {
      setNotice(result.message || "Worker assignment failed.");
    }

    setBusyActionId("");
  };

  const createInvoiceFromJob = async (job) => {
    setBusyActionId("invoice");
    const subtotal = Number(job.price || job.total || job.amount || 0);
    const description =
      job.ai_invoice_description ||
      job.invoice_description_draft ||
      `${jobTitle(job)} completed for ${job.customer_name || job.client_name || "client"}${job.address ? ` at ${job.address}` : ""}.`;

    const result = await tryRequests([
      () => post(`/jobs/${recordId(job, "")}/create-invoice`, {}),
      () => post("/invoices", {
        job_id: recordId(job, ""),
        customer_name: job.customer_name || job.client_name || "Client",
        customer_email: job.customer_email || job.client_email || "",
        address: job.address || job.job_address || "",
        description,
        subtotal,
      }),
    ]);

    if (result.ok || result.success) {
      setNotice("Draft invoice created.");
      setSelected(null);
      await load();
    } else {
      setNotice(result.message || "Draft invoice could not be created.");
    }

    setBusyActionId("");
  };

  const markCompleted = async (job) => {
    const jobId = recordId(job, "");
    setBusyActionId("complete");

    const result = await tryRequests([
      () => post(`/jobs/${jobId}/complete`, {}),
      () => patch(`/jobs/${jobId}`, { status: "completed", completed: true }),
      () => put(`/jobs/${jobId}`, { ...job, status: "completed", completed: true }),
    ]);

    if (result.ok || result.success) {
      setNotice("Job marked completed.");
      setSelected(null);
      await load();
    } else {
      setNotice(result.message || "Could not mark job completed.");
    }

    setBusyActionId("");
  };

  const deleteInvoice = async (invoice) => {
    const invoiceId = recordId(invoice, "");
    if (!window.confirm("Clear this invoice?")) return;
    setBusyActionId("delete-invoice");

    const result = await tryRequests([
      () => delRequest(`/invoices/${invoiceId}`),
      () => post(`/invoices/${invoiceId}/clear`, {}),
      () => patch(`/invoices/${invoiceId}`, { status: "cancelled", cleared: true }),
    ]);

    if (result.ok || result.success) {
      setNotice("Invoice cleared.");
      setSelected(null);
      await load();
    } else {
      setNotice(result.message || "Invoice could not be cleared.");
    }

    setBusyActionId("");
  };

  const updateQuoteStatus = async (quote, status) => {
    const quoteId = recordId(quote, "");
    setBusyActionId(`quote-${status}`);

    const result = await tryRequests([
      () => post(`/quotes/${quoteId}/${status}`, {}),
      () => patch(`/quotes/${quoteId}`, { status }),
      () => put(`/quotes/${quoteId}`, { ...quote, status }),
    ]);

    if (result.ok || result.success) {
      setNotice(`Quote marked ${status}.`);
      setSelected(null);
      await load();
    } else {
      setNotice(result.message || `Quote could not be marked ${status}.`);
    }

    setBusyActionId("");
  };

  const openEntry = (entry) => {
    setSelected(entry);
    setSelectedWorkerId("");
  };

  return (
    <V3Shell>
      <main className="v3-workspace-detail">
        <section className="v3-workspace-hero">
          <div>
            <p className="v3-eyebrow">{meta.kicker}</p>
            <h1><Icon size={28} /> {meta.title}</h1>
            <p>{meta.intro}</p>
          </div>

          <div className="v3-workspace-actions">
            <button type="button" className="v3-primary-btn" onClick={runPrimaryAction} disabled={saving}>
              <Wand2 size={18} /> {saving ? "Working…" : meta.primary}
            </button>
            <button type="button" className="v3-dark-btn" onClick={load} disabled={loading}>
              <RefreshCw size={18} /> Refresh
            </button>
          </div>
        </section>

        {notice && <div className="v3-notice">{notice}</div>}

        <V3ChurvoxEdge
          section={key}
          stats={view.stats}
          itemCount={view.items.length}
          loading={loading}
          onPrepare={runPrimaryAction}
        />

        <section className="v3-workspace-grid">
          {view.stats.map(([StatIcon, label, value, copy]) => (
            <StatCard key={label} icon={StatIcon} label={label} value={value} copy={copy} onClick={() => setNotice(`${label}: ${value}`)} />
          ))}
        </section>

        <section className="v3-page-specific">
          <article className="v3-page-specific-main">
            <div className="v3-card-head">
              <div>
                <p>{meta.kicker}</p>
                <h2>{meta.title} records</h2>
              </div>
              <strong>{loading ? "…" : view.items.length}</strong>
            </div>

            {loading ? (
              <EmptyState title="Loading workspace" copy="Checking live Churvox data." />
            ) : view.items.length ? (
              <div className="v3-live-list">
                {view.items.map((entry) => (
                  <RealItem key={`${entry.kind}-${entry.id}`} entry={entry} onClick={() => openEntry(entry)} />
                ))}
              </div>
            ) : (
              <EmptyState title="Nothing here yet" copy="Use the main action above or ask AI to prepare the next steps." />
            )}
          </article>

          <aside className="v3-page-specific-side">
            <div className="v3-card-head">
              <div>
                <p>Navigate only here</p>
                <h2>Only these buttons navigate</h2>
              </div>
            </div>

            <div className="v3-mini-nav">
              {view.secondary.map((name) => (
                <button key={name} type="button" onClick={() => navigate(`/v3/${name}`)}>
                  <b>{PAGE_META[name].title}</b>
                  <span>{PAGE_META[name].kicker}</span>
                </button>
              ))}
            </div>
          </aside>
        </section>

        <FormModal
          form={currentForm}
          values={formValues}
          setValues={setFormValues}
          saving={saving}
          onClose={() => setFormKey("")}
          onSubmit={submitForm}
        />

        <DetailModal
          selected={selected}
          workers={workers}
          selectedWorkerId={selectedWorkerId}
          setSelectedWorkerId={setSelectedWorkerId}
          busyActionId={busyActionId}
          onClose={() => setSelected(null)}
          onApprove={approve}
          onAskAi={askAi}
          onAssignWorker={assignWorker}
          onCreateInvoice={createInvoiceFromJob}
          onMarkCompleted={markCompleted}
          onDeleteInvoice={deleteInvoice}
          onQuoteAccepted={(quote) => updateQuoteStatus(quote, "accepted")}
          onQuoteDeclined={(quote) => updateQuoteStatus(quote, "declined")}
        />
      </main>
    </V3Shell>
  );
}
