import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import { get, post, patch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import "../styles/smartCommandSystem.css";
import "../styles/commandHubReal.css";
import "../styles/commandHubCompact.css";

const OWNER_ROLES = ["owner", "employer", "admin", "manager", "office_admin", "business_owner", "platform_owner"];
const norm = (v) => String(v || "").toLowerCase().trim();
const canUse = (role) => OWNER_ROLES.includes(norm(role));
const idOf = (x) => String(x?.id || x?._id || x?.uuid || "");
const unwrap = (v) => (v?.data !== undefined ? v.data : v);
const money = (v) => Number.isFinite(Number(v)) ? `$${Number(v).toFixed(2)}` : "$0.00";
const today = () => new Date().toISOString().slice(0, 10);
const routeTo = (path) => window.location.assign(path);
const safeGet = async (path) => { try { return await get(path); } catch { return null; } };
const listFrom = (value, keys = []) => {
  const v = unwrap(value);
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  for (const key of keys) if (Array.isArray(v[key])) return v[key];
  if (Array.isArray(v.items)) return v.items;
  if (Array.isArray(v.actions)) return v.actions;
  if (Array.isArray(v.data)) return v.data;
  return [];
};
const isClosed = (job) => ["completed", "complete", "cancelled", "canceled", "archived"].includes(norm(job?.status));
const clientName = (job, clients) => {
  const id = String(job?.client_id || job?.clientId || job?.customer_id || "");
  const client = clients.find((c) => [c?.id, c?._id, c?.client_id].map(String).includes(id));
  return client?.name || client?.business_name || client?.company_name || job?.client_name || job?.customer_name || "Client";
};
const jobTitle = (job, clients) => String(job?.title || job?.name || job?.service_type || job?.job_type || "").trim() || clientName(job, clients) || "Job";
const actionPath = (a) => a.job_id ? `/jobs/${a.job_id}` : a.invoice_id ? `/invoices/${a.invoice_id}` : a.quote_id ? `/quotes/${a.quote_id}` : a.client_id ? `/clients/${a.client_id}` : "/dashboard";
const actionize = (a = {}) => {
  const p = a.payload || {};
  const type = a.type || "review";
  return {
    ...a,
    id: a.id || `${type}-${p.job_id || p.invoice_id || p.quote_id || Math.random().toString(36).slice(2)}`,
    type,
    priority: a.priority || "medium",
    title: a.title || "Review prepared action",
    summary: a.summary || a.message || "AI prepared this for owner review.",
    reason: a.reason || "Found in your business data.",
    next: a.next || "Owner approval is required before Churvox executes.",
    job_id: a.job_id || p.job_id,
    invoice_id: a.invoice_id || p.invoice_id,
    quote_id: a.quote_id || p.quote_id,
    client_id: a.client_id || p.client_id,
    executable: a.executable !== false && ["dispatch", "invoice", "proof", "follow"].includes(type),
  };
};

function buildLocalActions(data, hidden) {
  const actions = [];
  const invoiceJobIds = new Set((data.invoices || []).map((i) => String(i.job_id || i.source_job_id || i.linked_job_id || "")).filter(Boolean));
  const proofJobIds = new Set((data.proofPacks || []).map((p) => String(p.job_id || "")).filter(Boolean));
  (data.jobs || []).forEach((job) => {
    const jobId = idOf(job);
    if (!jobId) return;
    const title = jobTitle(job, data.clients || []);
    const assigned = job.assigned_worker_id || job.worker_id || job.assigned_worker;
    if (!assigned && !isClosed(job)) actions.push(actionize({ id: `dispatch-${jobId}`, type: "dispatch", priority: "high", job_id: jobId, title: `Assign crew to ${title}`, summary: `${clientName(job, data.clients || [])} needs a worker assigned.`, reason: "Unassigned work blocks the day.", next: "Approve AI assignment or pick a worker in the drawer." }));
    if (["completed", "complete"].includes(norm(job.status)) && !invoiceJobIds.has(jobId) && !job.invoice_id && !job.draft_invoice_id) {
      const amount = Number(job.fixed_price ?? job.price ?? job.subtotal ?? job.amount ?? 0);
      actions.push(actionize({ id: `${amount > 0 ? "invoice" : "pricing"}-${jobId}`, type: amount > 0 ? "invoice" : "pricing", executable: amount > 0, priority: amount > 0 ? "medium" : "high", job_id: jobId, title: amount > 0 ? `Create draft invoice for ${title}` : `Add pricing for ${title}`, summary: amount > 0 ? `Suggested amount: ${money(amount)}.` : "Completed job needs pricing before invoicing.", reason: amount > 0 ? "Completed work should move to draft invoice." : "Churvox must not create a zero invoice.", next: amount > 0 ? "Draft only. No send, charge, or MYOB sync." : "Add pricing first." }));
      if (!proofJobIds.has(jobId) && !job.proof_pack_id) actions.push(actionize({ id: `proof-${jobId}`, type: "proof", priority: "medium", job_id: jobId, title: `Prepare proof pack for ${title}`, summary: "Completed work needs proof before payment follow-up.", reason: "Proof-to-Paid makes finished work customer-ready.", next: "Prepare proof for owner review only." }));
    }
  });
  (data.invoices || []).forEach((invoice) => {
    const id = idOf(invoice);
    if (id && ["sent", "open", "overdue", "unpaid", "pending_payment"].includes(norm(invoice.status))) actions.push(actionize({ id: `invoice-follow-${id}`, type: "follow", priority: norm(invoice.status) === "overdue" ? "high" : "medium", invoice_id: id, title: `Prepare invoice reminder ${invoice.invoice_number || id.slice(-6)}`, summary: `${money(invoice.balance_due ?? invoice.balance ?? invoice.amount_due ?? invoice.total ?? invoice.amount)} outstanding.`, reason: "Money is waiting to come in.", next: "Prepare draft only. Owner sends later." }));
  });
  (data.quotes || []).forEach((quote) => {
    const id = idOf(quote);
    if (id && ["sent", "pending", "waiting", "viewed", "draft"].includes(norm(quote.status))) actions.push(actionize({ id: `quote-follow-${id}`, type: "follow", priority: "medium", quote_id: id, title: `Prepare quote follow-up ${quote.quote_number || id.slice(-6)}`, summary: "Quote is waiting for a customer decision.", reason: "Follow-up helps win quoted work.", next: "Prepare draft only. Owner sends later." }));
  });
  [[data.receptionist, "reception", "Review new enquiry"], [data.recurring, "recurring", "Recurring work due"], [data.customerUpdates, "update", "Customer update ready"], [data.quoteDrafts, "quote_builder", "Quote draft ready"], [data.memory, "memory", "Client memory insight"]].forEach(([items, type, title]) => (items || []).forEach((item, i) => actions.push(actionize({ id: `${type}-${idOf(item) || i}`, type, executable: false, title: item.title || item.customer_name || title, summary: item.summary || item.message || item.description || "Needs review.", reason: "AI found this item.", next: "Review inside Command before anything changes.", job_id: item.job_id, client_id: item.client_id, quote_id: item.quote_id, invoice_id: item.invoice_id }))));
  const unique = new Map();
  actions.forEach((a) => { if (a.id && !hidden[a.id] && !unique.has(a.id)) unique.set(a.id, a); });
  return [...unique.values()];
}

function Btn({ children, className = "", ...props }) { return <button className={`command-btn ${className}`} {...props}>{children}</button>; }
function Metric({ label, value, text }) { return <div className="command-mini-metric"><strong>{value}</strong><span>{label}</span><small>{text}</small></div>; }
function Drawer({ drawer, onClose, children }) { return drawer ? <div className="command-drawer-backdrop" onClick={onClose}><aside className="command-drawer" onClick={(e) => e.stopPropagation()}><div className="command-drawer-head"><div><p className="smart-command-kicker">Command drawer</p><h2>{drawer.title}</h2><p>{drawer.subtitle}</p></div><button onClick={onClose}>Close</button></div>{children}</aside></div> : null; }
function NextMove({ title, count, text, tone = "orange", onClick }) { return <button className={`command-next-move ${tone}`} onClick={onClick}><span>{title}</span><strong>{count}</strong><small>{text}</small></button>; }
function ActionCard({ action, onRun, onDismiss, onEdit }) { const canRun = action.executable && ["dispatch", "invoice", "proof", "follow"].includes(action.type); return <article className="command-action-card"><div className="command-card-top"><span className={`command-priority ${action.priority}`}>{action.priority}</span><span>{action.type}</span><span className="ready">approval first</span></div><h3>{action.title}</h3><p>{action.summary}</p><p><b>Why:</b> {action.reason}</p><p><b>Next:</b> {action.next}</p><div className="command-card-actions">{canRun ? <Btn className="green" onClick={() => onRun(action)}>Approve & run</Btn> : null}{action.job_id ? <Btn className="dark" onClick={() => onEdit(action.job_id)}>Edit job here</Btn> : null}<Btn className="light" onClick={() => routeTo(actionPath(action))}>Open record</Btn><Btn className="ghost" onClick={() => onDismiss(action)}>Dismiss</Btn></div></article>; }
