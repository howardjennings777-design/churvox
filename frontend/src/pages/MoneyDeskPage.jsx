import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { Banknote, Copy, FileText, Receipt, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import "./MoneyDeskPage.css";

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function idOf(value) {
  return String(value?.id || value?._id || "");
}

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00";
}

function titleOf(record, fallback) {
  return record?.invoice_number || record?.title || record?.job_name || record?.customer_name || record?.client_name || fallback;
}

function valueOf(record) {
  return record?.amount_due || record?.balance_due || record?.total || record?.price || record?.job_price || record?.amount || 0;
}

function MoneyRow({ record, openTo, actionLabel, onAction, secondaryLabel, onSecondary }) {
  return (
    <div className="cv-money-row">
      <div>
        <b>{titleOf(record, "Record")}</b>
        <span>{record.status || "open"} · {record.customer_name || record.client_name || record.address || record.customer_email || ""}</span>
      </div>
      <strong>{money(valueOf(record))}</strong>
      <div className="cv-money-actions">
        {openTo ? <Link to={openTo}>Open</Link> : null}
        {onSecondary ? <button type="button" className="secondary" onClick={() => onSecondary(record)}>{secondaryLabel}</button> : null}
        {onAction ? <button type="button" onClick={() => onAction(record)}>{actionLabel}</button> : null}
      </div>
    </div>
  );
}

export default function MoneyDeskPage() {
  const api = useApi();
  const navigate = useNavigate();
  const [desk, setDesk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  async function loadDesk() {
    setLoading(true);
    const res = await api.get("/money-desk");
    if (res.success) setDesk(res.data?.money_desk || {});
    else toast.error(res.error || "Could not load Money Desk");
    setLoading(false);
  }

  useEffect(() => { loadDesk(); }, []);

  const metrics = desk?.metrics || {};
  const completedJobs = arr(desk?.completed_jobs_not_invoiced);
  const drafts = arr(desk?.draft_invoices);
  const sent = arr(desk?.sent_invoices);
  const overdue = arr(desk?.overdue_invoices);
  const partial = arr(desk?.partially_paid_invoices);
  const paid = arr(desk?.paid_invoices);

  const cards = useMemo(() => [
    ["Ready to invoice", money(metrics.total_ready_to_invoice), `${completedJobs.length} completed jobs`, "green"],
    ["Draft value", money(metrics.total_draft), `${drafts.length} drafts`, "amber"],
    ["Unpaid", money(metrics.total_unpaid), `${sent.length + partial.length} open invoices`, "blue"],
    ["Overdue", money(metrics.total_overdue), `${overdue.length} overdue`, "red"],
    ["Paid this week", money(metrics.paid_this_week), "recent cash in", "green"],
    ["Invoiced this month", money(metrics.invoiced_this_month), "month total", "blue"],
  ], [metrics, completedJobs.length, drafts.length, sent.length, partial.length, overdue.length]);

  async function run(label, fn) {
    setBusy(label);
    const res = await fn();
    setBusy("");
    if (res.success) {
      toast.success("Money Desk updated");
      await loadDesk();
      return res;
    }
    toast.error(res.error || "Action failed");
    return res;
  }

  async function createInvoice(job) {
    const res = await run("invoice", () => api.post(`/jobs/${idOf(job)}/create-invoice-draft`, {}));
    const invoiceId = res?.data?.invoice_id || res?.data?.invoice?.id || res?.data?.invoice?._id;
    if (invoiceId) navigate(`/invoices/${invoiceId}`);
  }

  async function approveInvoice(invoice) {
    await run("approve", () => api.post(`/invoices/${idOf(invoice)}/approve`));
  }

  async function markPaid(invoice) {
    await run("paid", () => api.post(`/invoices/${idOf(invoice)}/mark-paid-pipeline`));
  }

  async function prepareReminder(invoice) {
    const res = await run("reminder", () => api.post(`/money-desk/invoices/${idOf(invoice)}/prepare-reminder`, {}));
    const message = res?.data?.message || res?.data?.reminder?.message;
    if (message) {
      try {
        await navigator.clipboard.writeText(message);
        toast.success("Reminder draft copied");
      } catch {
        toast.success("Reminder draft prepared");
      }
    }
  }

  async function copyPublicLink(invoice) {
    const link = invoice.public_invoice_url || (invoice.public_token ? `${window.location.origin}/public/invoice/${invoice.public_token}` : "");
    if (!link) return toast.error("No public link available yet");
    await navigator.clipboard.writeText(link);
    toast.success("Public invoice link copied");
  }

  return (
    <PremiumPage maxWidth={1220}>
      <PremiumHero
        eyebrow="Money Desk"
        title="See what needs invoicing, chasing and marking paid."
        subtitle="This is the owner money view: completed work not invoiced, draft invoices, sent invoices, overdue balances and paid work."
        icon={<Banknote className="h-6 w-6" />}
        actions={<PremiumButton variant="secondary" onClick={loadDesk} disabled={loading || Boolean(busy)}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>}
      />

      <section className="cv-money-cards">
        {cards.map(([label, value, note, tone]) => (
          <article key={label} className={`cv-money-card ${tone}`}>
            <span>{label}</span>
            <b>{value}</b>
            <small>{note}</small>
          </article>
        ))}
      </section>

      {loading ? (
        <PremiumCard><div className="cv-money-empty">Loading Money Desk…</div></PremiumCard>
      ) : (
        <section className="cv-money-grid">
          <PremiumCard title="Completed jobs not invoiced" icon={<FileText className="h-5 w-5" />}>
            {completedJobs.length ? completedJobs.map((job) => (
              <MoneyRow key={idOf(job)} record={job} openTo={`/jobs/${idOf(job)}`} actionLabel="Prepare invoice" onAction={createInvoice} />
            )) : <div className="cv-money-empty">No completed jobs waiting for invoices.</div>}
          </PremiumCard>

          <PremiumCard title="Draft invoices waiting approval" icon={<Receipt className="h-5 w-5" />}>
            {drafts.length ? drafts.map((invoice) => (
              <MoneyRow key={idOf(invoice)} record={invoice} openTo={`/invoices/${idOf(invoice)}`} actionLabel="Approve" onAction={approveInvoice} secondaryLabel="Copy link" onSecondary={copyPublicLink} />
            )) : <div className="cv-money-empty">No draft invoices waiting.</div>}
          </PremiumCard>

          <PremiumCard title="Sent / partially paid invoices" icon={<Send className="h-5 w-5" />}>
            {[...partial, ...sent].length ? [...partial, ...sent].map((invoice) => (
              <MoneyRow key={idOf(invoice)} record={invoice} openTo={`/invoices/${idOf(invoice)}`} actionLabel="Mark paid" onAction={markPaid} secondaryLabel="Copy link" onSecondary={copyPublicLink} />
            )) : <div className="cv-money-empty">No open invoices waiting.</div>}
          </PremiumCard>

          <PremiumCard title="Overdue invoices to chase" icon={<Banknote className="h-5 w-5" />}>
            {overdue.length ? overdue.map((invoice) => (
              <MoneyRow key={idOf(invoice)} record={invoice} openTo={`/invoices/${idOf(invoice)}`} actionLabel="Prepare reminder" onAction={prepareReminder} secondaryLabel="Mark paid" onSecondary={markPaid} />
            )) : <div className="cv-money-empty">No overdue invoices.</div>}
          </PremiumCard>

          <PremiumCard title="Recently paid" icon={<Banknote className="h-5 w-5" />}>
            {paid.length ? paid.slice(0, 10).map((invoice) => (
              <MoneyRow key={idOf(invoice)} record={invoice} openTo={`/invoices/${idOf(invoice)}`} />
            )) : <div className="cv-money-empty">No paid invoices yet.</div>}
          </PremiumCard>
        </section>
      )}
    </PremiumPage>
  );
}
