import React from "react";
import { useApi } from "../hooks/useApi";
import { hideDemoRecords } from "./freshDemoRecords";
import { sendFreshSlipToCommand } from "./commandBridge";

const fallbackInvoices = [
  {
    id: "inv-check-1",
    invoice: "Example invoice",
    client: "Real invoices will appear here",
    job: "Completed job proof check",
    currentTotal: 0,
    suggestedExtra: 0,
    issue: "No real invoices loaded yet.",
    prepared: "Create or load invoices to run the checker against real job notes, photos and status.",
    status: "Needs owner review",
    source: "fallback",
  },
];

function asArray(payload, key = "") {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data?.[key])) return data[key];
  for (const name of ["invoices", "jobs", "items", "records", "results", "data"]) {
    if (Array.isArray(data?.[name])) return data[name];
  }
  return [];
}

function idOf(value, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") return idOf(value.$oid || value.oid || value.id || value._id || value.job_id || value.invoice_id, fallback);
  return fallback;
}

function pick(record, ...keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function lower(value) {
  return String(value || "").trim().toLowerCase();
}

function moneyNumber(value) {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusOf(record, fallback = "draft") {
  return String(record?.status || record?.payment_status || fallback).trim() || fallback;
}

function invoiceLabel(invoice, index) {
  return pick(invoice, "invoice_number", "number", "invoiceNumber", "title") || idOf(invoice?.id || invoice?._id || invoice?.invoice_id, `invoice-${index + 1}`);
}

function clientName(record) {
  return pick(record, "client_name", "customer_name", "client", "customer", "name", "business_name") || "No client linked";
}

function jobTitle(record) {
  return pick(record, "job_title", "job", "title", "job_name", "description", "job_description") || "Invoice";
}

function recordJobId(record) {
  return idOf(record?.job_id || record?.linked_job_id || record?.source_job_id || record?.jobId || "");
}

function photoCount(record) {
  if (Array.isArray(record?.photos)) return record.photos.length;
  if (Array.isArray(record?.photo_urls)) return record.photo_urls.length;
  return Number(record?.photo_count || record?.photos_count || 0) || 0;
}

function lineText(invoice) {
  const lines = Array.isArray(invoice?.line_items) ? invoice.line_items : Array.isArray(invoice?.lines) ? invoice.lines : [];
  return lower(lines.map((line) => typeof line === "string" ? line : `${line?.description || ""} ${line?.name || ""}`).join(" "));
}

function findLinkedJob(invoice, jobs) {
  const invoiceJobId = recordJobId(invoice);
  if (invoiceJobId) {
    const byId = jobs.find((job) => idOf(job?.id || job?._id || job?.job_id) === invoiceJobId);
    if (byId) return byId;
  }
  const invClient = lower(clientName(invoice));
  const invJob = lower(jobTitle(invoice));
  return jobs.find((job) => {
    const jobClient = lower(clientName(job));
    const title = lower(jobTitle(job));
    return Boolean(invClient && jobClient && invClient === jobClient) || Boolean(invJob && title && (invJob.includes(title) || title.includes(invJob)));
  }) || null;
}

function buildCheck(invoice, jobs, index) {
  const linkedJob = findLinkedJob(invoice, jobs);
  const status = statusOf(invoice, "draft");
  const amount = moneyNumber(invoice?.total ?? invoice?.amount ?? invoice?.subtotal ?? 0);
  const gst = moneyNumber(invoice?.gst_amount ?? invoice?.tax_amount ?? invoice?.tax_total ?? 0);
  const notes = `${pick(invoice, "notes", "description", "memo")} ${pick(linkedJob, "worker_notes", "notes", "description", "job_notes")}`;
  const lines = lineText(invoice);
  const jobStatus = lower(statusOf(linkedJob, ""));
  const photos = photoCount(linkedJob);
  const possibleExtra = /extra|variation|materials|material|green waste|hedge|tip|dump|after hours/i.test(notes) && !/extra|variation|materials|green waste|hedge|tip|dump/i.test(lines);
  const blockers = [];

  if (!amount) blockers.push("Invoice total missing");
  if (!clientName(invoice) || clientName(invoice) === "No client linked") blockers.push("Client missing");
  if (!linkedJob) blockers.push("No linked job found");
  if (linkedJob && !/complete|done|finish/i.test(jobStatus)) blockers.push("Linked job not completed");
  if (linkedJob && photos === 0) blockers.push("No proof photos on linked job");
  if (possibleExtra) blockers.push("Possible unbilled extra/materials in notes");
  if (/overdue/i.test(status)) blockers.push("Overdue - owner-approved follow-up needed");

  const suggestedExtra = possibleExtra ? 35 : 0;
  const ready = blockers.length === 0;
  return {
    id: idOf(invoice?.id || invoice?._id || invoice?.invoice_id, `invoice-${index}`),
    invoice: invoiceLabel(invoice, index),
    client: clientName(invoice),
    job: linkedJob ? jobTitle(linkedJob) : jobTitle(invoice),
    currentTotal: amount,
    suggestedExtra,
    gst,
    issue: ready ? "Invoice looks ready for owner review." : blockers.join(". "),
    prepared: ready ? "Owner can review and send/sync as the next controlled step." : `Fix before sending: ${blockers.join("; ")}.`,
    status: ready ? "Ready" : "Needs owner review",
    blockers,
    source: "real",
    linkedJob,
    invoice,
  };
}

function sendToCommand(item, onNavigate) {
  sendFreshSlipToCommand({
    id: `invoice-check-${item.id}-${Date.now()}`,
    group: "Invoice Checker",
    title: item.status === "Ready" ? "Invoice looks ready" : "Invoice needs owner review",
    info: `${item.invoice} - ${item.client} - ${money(item.currentTotal)}${item.suggestedExtra ? ` + ${money(item.suggestedExtra)} possible extra` : ""}`,
    urgency: item.status === "Ready" ? "Medium" : "High",
    found: item.issue,
    prepared: item.prepared,
    why: item.suggestedExtra ? "Churvox may have found unbilled work before the invoice is sent." : "Invoices should be checked before customer send, accounting sync, or payment follow-up.",
    owner: "Review invoice, edit lines, approve, ignore, or open the source record. Do not auto-send or mark paid.",
    area: "Invoice Checker",
    page: "invoicecheck",
    sourceType: "invoice",
    actionType: item.suggestedExtra ? "approve_invoice_extra" : "review_invoice",
  }, { type: "invoice-check" });
  onNavigate?.("command");
}

export default function FreshInvoiceChecker({ onNavigate }) {
  const { get } = useApi();
  const [checks, setChecks] = React.useState(fallbackInvoices);
  const [selectedId, setSelectedId] = React.useState(fallbackInvoices[0].id);
  const [approved, setApproved] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const selected = checks.find((item) => item.id === selectedId) || checks[0];
  const risk = checks.reduce((sum, item) => sum + item.suggestedExtra, 0);
  const review = checks.filter((item) => item.status === "Needs owner review").length;

  const loadChecks = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [invoiceRes, jobRes] = await Promise.all([get("/invoices", { timeout: 25000 }), get("/jobs", { timeout: 25000 })]);
      const invoices = invoiceRes?.success ? hideDemoRecords(asArray(invoiceRes.data, "invoices")) : [];
      const jobs = jobRes?.success ? hideDemoRecords(asArray(jobRes.data, "jobs")) : [];
      const next = invoices.map((invoice, index) => buildCheck(invoice, jobs, index));
      const rows = next.length ? next : fallbackInvoices;
      setChecks(rows);
      setSelectedId((current) => rows.some((item) => item.id === current) ? current : rows[0]?.id || "");
      if (!invoiceRes?.success) setError(invoiceRes?.error || "Could not load invoices for checker.");
    } catch (err) {
      setChecks(fallbackInvoices);
      setSelectedId(fallbackInvoices[0].id);
      setError(err?.message || "Could not load invoice checker.");
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => { loadChecks(); }, [loadChecks]);

  return (
    <section className="freshInvoiceCheckPage">
      <div className="freshInvoiceCheckHero">
        <div>
          <span>AI Invoice Checker</span>
          <h1>Catch missing money before invoices go out</h1>
          <p>Churvox checks real invoices against job notes, proof photos, status and possible extras before the owner sends or syncs anything.</p>
        </div>

        <div className="freshInvoiceCheckStats">
          <div><b>{loading ? "..." : checks.length}</b><small>checked</small></div>
          <div><b>{review}</b><small>review</small></div>
          <div><b>{money(risk)}</b><small>possible extras</small></div>
          <div><b>Approve</b><small>owner control</small></div>
        </div>
      </div>

      {error ? <section className="freshCard freshItem need"><b>Invoice checker needs attention</b><span>{error}</span><button type="button" className="freshPrimary" onClick={loadChecks}>Retry</button></section> : null}

      <div className="freshInvoiceCheckLayout">
        <aside className="freshInvoiceCheckList">
          <header>
            <b>Invoices scanned</b>
            <span>{review} need review</span>
          </header>

          {checks.map((item) => (
            <button key={item.id} type="button" className={selected.id === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}>
              <b>{item.invoice}</b>
              <span>{item.client}</span>
              <small>{item.status} - {money(item.suggestedExtra)} extra</small>
            </button>
          ))}
        </aside>

        <article className="freshInvoiceCheckDetail">
          <header>
            <span>{selected.status}</span>
            <h2>{selected.invoice}</h2>
            <p>{selected.client} - {selected.job}</p>
          </header>

          <div className="freshInvoiceCheckCards">
            <section><b>Current invoice</b><p>{money(selected.currentTotal)}</p></section>
            <section><b>Possible extra</b><p>{money(selected.suggestedExtra)}</p></section>
            <section><b>New total</b><p>{money(selected.currentTotal + selected.suggestedExtra)}</p></section>
          </div>

          <div className="freshInvoiceCheckFinding">
            <b>Churvox found</b>
            <p>{selected.issue}</p>
            <b>Churvox prepared</b>
            <p>{selected.prepared}</p>
          </div>

          <div className="freshInvoiceCheckButtons">
            <button type="button" disabled={selected.source === "fallback"} onClick={() => setApproved({ ...approved, [selected.id]: true })}>
              {approved[selected.id] ? "Approved" : "Approve check"}
            </button>
            <button type="button" onClick={() => sendToCommand(selected, onNavigate)}>Send to Command</button>
            <button type="button" onClick={() => onNavigate?.("invoices")}>Open Invoices</button>
            <button type="button" onClick={() => onNavigate?.("jobs")}>Open Job Story</button>
            <button type="button" onClick={loadChecks}>Refresh</button>
          </div>
        </article>
      </div>
    </section>
  );
}
