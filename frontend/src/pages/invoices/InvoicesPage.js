import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, Loader2, DollarSign, Send,
  Filter, CheckCircle, ReceiptText, Clock3, SlidersHorizontal, FileCheck2,
  AlertTriangle, Link2, Sparkles, Receipt, Zap, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, MYOB_SYNC_STATUSES } from "@/lib/utils";
import Layout from "@/components/Layout";
import {
  PremiumPage, PremiumHero, PremiumCard, PremiumStatCard, PremiumButton, PremiumEmptyState, PremiumStatusBadge, PremiumBadge
} from "@/components/premium";
import EntityDetailModal from "@/components/EntityDetailModal";

const safeArray = (v) => (Array.isArray(v) ? v : []);
const safeNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const safeText = (v, f = "—") => { if (v == null) return f; const t = String(v).trim(); return t || f; };

const getPaymentLabel = (invoice) => {
  const status = String(invoice?.status || "").toLowerCase();
  if (status === "paid") return "Paid";
  if (status === "overdue") return "Payment overdue";
  if (["sent", "unpaid", "pending"].includes(status)) return "Awaiting payment";
  if (status === "draft") return "Draft (not sent)";
  return safeText(status, "Pending");
};

const isCollectable = (invoice) => ["sent", "unpaid", "pending", "overdue"].includes(String(invoice.status || "").toLowerCase());

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { get, del, post, loading } = useApi();
  const [invoices, setInvoices] = useState([]);
  const [accounting, setAccounting] = useState(null);
  const [automationStatus, setAutomationStatus] = useState(null);
  const [automationBusy, setAutomationBusy] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [deleteId, setDeleteId] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [activeInvoice, setActiveInvoice] = useState(null);

  useEffect(() => { loadInvoices(); }, []);

  const loadInvoices = async () => {
    const [result, accountingRes, automationRes] = await Promise.all([
      get("/invoices"),
      get("/accounting/settings"),
      get("/invoices/automation/status"),
    ]);
    if (result.success) setInvoices(safeArray(result.data));
    if (accountingRes?.success) setAccounting(accountingRes.data || null);
    if (automationRes?.success || automationRes?.ok) setAutomationStatus(automationRes.data?.status || automationRes.status || automationRes.data || null);
  };

  const runInvoiceAutomation = async (mode = "run") => {
    setAutomationBusy(true);
    const endpoint = mode === "drafts" ? "/invoices/automation/create-drafts" : mode === "reminders" ? "/invoices/automation/prepare-reminders" : "/invoices/automation/run";
    const r = await post(endpoint, {});
    if (r.success || r.ok) {
      const data = r.data || r;
      toast.success(data.message || "Invoice automation complete");
      await loadInvoices();
    } else {
      toast.error(r.error || r.message || "Invoice automation failed");
    }
    setAutomationBusy(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await del(`/invoices/${deleteId}`);
    if (result.success) {
      toast.success("Invoice deleted");
      setInvoices((prev) => prev.filter((i) => i.id !== deleteId));
    } else { toast.error(result.error); }
    setDeleteId(null);
  };

  const handleSendInvoice = async (id) => {
    const r = await post(`/invoices/${id}/send`);
    r.success ? (toast.success("Invoice marked as sent"), loadInvoices()) : toast.error(r.error);
  };
  const handleMarkPaid = async (id) => {
    const r = await post(`/invoices/${id}/mark-paid`);
    r.success ? (toast.success("Invoice marked as paid"), loadInvoices()) : toast.error(r.error);
  };
  const handleSyncMyob = async (id, retry = false) => {
    const ep = retry ? `/invoices/${id}/myob-retry` : `/invoices/${id}/myob-sync`;
    const r = await post(ep);
    r?.success ? toast.success("MYOB sync updated") : toast.error(r?.message || r?.error || "MYOB sync needs setup");
    loadInvoices();
  };
  const handlePrepareSingleReminder = async (invoice) => {
    const id = invoice?.id;
    if (!id) return;
    const r = await post(`/invoices/automation/${id}/prepare-reminder`, {});
    if (r.success || r.ok) toast.success(r.data?.message || r.message || "Reminder draft prepared");
    else toast.error(r.error || r.message || "Could not prepare reminder");
  };

  const m = useMemo(() => {
    const arr = safeArray(invoices);
    const now = new Date();
    const outstandingList = arr.filter(isCollectable);
    const draftList = arr.filter((i) => String(i.status || "").toLowerCase() === "draft");
    return {
      total: arr.length,
      draft: draftList.length,
      sentUnpaid: arr.filter((i) => ["sent", "unpaid", "pending"].includes(String(i.status || "").toLowerCase())).length,
      paid: arr.filter((i) => String(i.status || "").toLowerCase() === "paid").length,
      overdue: arr.filter((i) => String(i.status || "").toLowerCase() === "overdue").length,
      outstanding: outstandingList.reduce((s, i) => s + safeNumber(i.total), 0),
      draftValue: draftList.reduce((s, i) => s + safeNumber(i.total), 0),
      paidThisMonth: arr.filter((i) => {
        if (String(i.status || "").toLowerCase() !== "paid") return false;
        const d = new Date(i.paid_at || i.updated_at || i.created_at || 0);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).reduce((s, i) => s + safeNumber(i.total), 0),
      myobIssues: arr.filter((i) => {
        const s = String(i.myob_sync_status || "not_synced").toLowerCase();
        return ["failed", "error", "sync_error", "sync_failed"].includes(s) || Boolean(i.myob_error);
      }).length,
      collectableCount: outstandingList.length,
    };
  }, [invoices]);

  const priorityInvoices = useMemo(() => {
    return safeArray(invoices)
      .filter((i) => isCollectable(i) || String(i.status || "").toLowerCase() === "draft")
      .sort((a, b) => safeNumber(b.total) - safeNumber(a.total))
      .slice(0, 3);
  }, [invoices]);

  const missingJobInvoices = safeNumber(automationStatus?.completed_jobs_missing_invoice);
  const collectionHealth = missingJobInvoices > 0 ? "Ready to draft" : m.collectableCount === 0 ? "Clear" : m.overdue > 0 ? "Needs chase" : "Ready to collect";

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return safeArray(invoices)
      .filter((inv) => {
        const pool = [inv.customer_name, inv.invoice_number, inv.description, inv.status, inv.total, inv.job_title, inv.job_name]
          .map((x) => String(x || "")).join(" ").toLowerCase();
        const ms = !q || pool.includes(q);
        const mst = statusFilter === "all" || String(inv.status || "").toLowerCase() === statusFilter;
        return ms && mst;
      })
      .sort((a, b) => {
        if (sortBy === "oldest") return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        if (sortBy === "highest") return safeNumber(b.total) - safeNumber(a.total);
        if (sortBy === "overdue_first") {
          const ao = String(a.status || "").toLowerCase() === "overdue" ? 1 : 0;
          const bo = String(b.status || "").toLowerCase() === "overdue" ? 1 : 0;
          if (ao !== bo) return bo - ao;
        }
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
  }, [invoices, searchTerm, statusFilter, sortBy]);

  const mode = accounting?.invoice_mode || "churvox_only";
  const myobConnected = Boolean(accounting?.myob_connected);

  return (
    <Layout>
      <PremiumPage>
        <PremiumHero
          icon={<Receipt className="h-7 w-7" />}
          eyebrow={<><Receipt className="h-3 w-3" /> Cashflow control</>}
          title="Invoice Command Centre"
          subtitle="Job completed → AI draft invoice → owner review → send/share/pay link → reminders → paid/MYOB status. This page is now wired to run the full invoice automation loop."
          actions={
            <>
              {mode === "myob_external" ? (
                <PremiumButton variant="secondary" disabled iconLeft={<Plus className="h-4 w-4" />}>Create in MYOB</PremiumButton>
              ) : (
                <PremiumButton onClick={() => navigate("/invoices/new")} iconLeft={<Plus className="h-4 w-4" />} dataTestId="add-invoice-button">New invoice</PremiumButton>
              )}
              <PremiumButton onClick={() => runInvoiceAutomation("run")} disabled={automationBusy} iconLeft={automationBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}>Run invoice automation</PremiumButton>
              <PremiumButton variant="secondary" onClick={() => { setStatusFilter("overdue"); setSortBy("overdue_first"); runInvoiceAutomation("reminders"); }} iconLeft={<AlertTriangle className="h-4 w-4" />}>Chase overdue</PremiumButton>
            </>
          }
        />

        <section className="invoice-command-strip">
          <div className="invoice-command-main">
            <span><Sparkles className="h-4 w-4" /> AI money operator</span>
            <h2>{collectionHealth}</h2>
            <p>{missingJobInvoices ? `${missingJobInvoices} completed job${missingJobInvoices === 1 ? "" : "s"} can become draft invoices. ${m.collectableCount} invoices can be chased or cleared. ${formatCurrency(m.outstanding)} is waiting.` : m.collectableCount ? `${m.collectableCount} invoices can be chased or cleared. ${formatCurrency(m.outstanding)} is waiting.` : "No unpaid invoices need chasing right now."}</p>
          </div>
          <div className="invoice-command-actions">
            <button onClick={() => runInvoiceAutomation("drafts")} disabled={automationBusy}><ReceiptText className="h-4 w-4" /> Create missing drafts</button>
            <button onClick={() => runInvoiceAutomation("reminders")} disabled={automationBusy}><DollarSign className="h-4 w-4" /> Prepare reminders</button>
            <button onClick={() => navigate("/integrations")}><Zap className="h-4 w-4" /> MYOB status</button>
          </div>
          <div className="invoice-priority-stack">
            <b>Top money moves</b>
            {priorityInvoices.length ? priorityInvoices.map((invoice) => (
              <button key={invoice.id} onClick={() => setActiveInvoice(invoice)}>
                <span>{safeText(invoice.customer_name, "Unknown client")}</span>
                <strong>{formatCurrency(invoice.total)}</strong>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )) : <small>No priority invoices found.</small>}
          </div>
        </section>

        <div className="px-grid px-grid--4 invoice-stat-grid">
          <PremiumStatCard label="Total" value={m.total} icon={<ReceiptText className="h-4 w-4" />} onClick={() => setStatusFilter("all")} />
          <PremiumStatCard label="Draft" value={m.draft} icon={<Clock3 className="h-4 w-4" />} tone="amber" onClick={() => setStatusFilter("draft")} />
          <PremiumStatCard label="Sent / unpaid" value={m.sentUnpaid} icon={<Send className="h-4 w-4" />} tone="sky" onClick={() => setStatusFilter("sent")} />
          <PremiumStatCard label="Paid" value={m.paid} icon={<FileCheck2 className="h-4 w-4" />} tone="teal" onClick={() => setStatusFilter("paid")} />
          <PremiumStatCard label="Overdue" value={m.overdue} icon={<AlertTriangle className="h-4 w-4" />} tone="red" onClick={() => setStatusFilter("overdue")} />
          <PremiumStatCard label="Outstanding" value={formatCurrency(m.outstanding)} icon={<DollarSign className="h-4 w-4" />} />
          <PremiumStatCard label="Jobs to invoice" value={missingJobInvoices} icon={<ReceiptText className="h-4 w-4" />} tone="amber" onClick={() => runInvoiceAutomation("drafts")} />
          <PremiumStatCard label="MYOB issues" value={m.myobIssues} icon={<AlertTriangle className="h-4 w-4" />} tone={m.myobIssues ? "red" : "blue"} onClick={() => navigate("/integrations")} />
        </div>

        <PremiumCard noBody>
          <div className="px-card__body grid grid-cols-1 md:grid-cols-3 gap-3 invoice-filter-bar">
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7d8ba3]" />
              <input placeholder="Search invoice, client, job, status, amount…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="px-input pl-10" data-testid="invoice-search-input" />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7d8ba3] pointer-events-none" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-select pl-9" data-testid="invoice-status-filter">
                <option value="all">All status</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="unpaid">Unpaid</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="overdue">Overdue</option>
              </select>
            </div>
            <div className="relative">
              <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7d8ba3] pointer-events-none" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-select pl-9">
                <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest amount</option><option value="overdue_first">Overdue first</option>
              </select>
            </div>
          </div>
        </PremiumCard>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-[#1d4ed8]" /></div>
        ) : filtered.length === 0 ? (
          <PremiumEmptyState
            icon={<ReceiptText className="h-6 w-6" />}
            title="No invoices match these filters"
            subtitle="Job completed → Draft invoice → Send → Paid. Create your first invoice to start the cycle."
            action={<div className="flex gap-2 justify-center flex-wrap"><PremiumButton onClick={() => navigate("/invoices/new")} iconLeft={<Plus className="h-4 w-4" />} dataTestId="add-first-invoice-button">New invoice</PremiumButton><PremiumButton variant="secondary" onClick={() => navigate("/jobs")}>View jobs</PremiumButton><PremiumButton onClick={() => runInvoiceAutomation("run")} disabled={automationBusy}>Run automation</PremiumButton></div>}
          />
        ) : (
          <div className="space-y-3 invoice-record-list">
            {filtered.map((invoice) => {
              const jobTitle = invoice.job_title || invoice.job_name || invoice.job_description;
              const paymentLink = invoice.public_invoice_url || invoice.public_url || invoice.payment_link || invoice.stripe_payment_link;
              const status = String(invoice.status || "draft").toLowerCase();
              const myobBadge = (() => {
                if (mode !== "myob_sync" && mode !== "myob_external") return null;
                const syncKey = mode === "myob_external" ? "external" : String(invoice.myob_sync_status || "not_synced");
                const info = MYOB_SYNC_STATUSES[syncKey] || MYOB_SYNC_STATUSES.not_synced;
                return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${info.bg} ${info.color}`} data-testid={`myob-badge-${invoice.id}`}>MYOB {info.label}</span>;
              })();

              return (
                <div key={invoice.id} className={`px-card px-card--hover invoice-row invoice-row--${status}`} data-testid={`invoice-card-${invoice.id}`}>
                  <div className="px-card__body">
                    <div className="invoice-row-layout">
                      <button type="button" onClick={() => setActiveInvoice(invoice)} className="invoice-row-main group text-left">
                        <div className="invoice-row-topline">
                          <span className="invoice-number" data-testid={`invoice-number-${invoice.id}`}>{safeText(invoice.invoice_number, "Draft invoice")}</span>
                          <PremiumStatusBadge status={invoice.status} />
                          <PremiumBadge tone="slate">{getPaymentLabel(invoice)}</PremiumBadge>
                          {myobBadge}
                        </div>
                        <p className="invoice-client">{safeText(invoice.customer_name, "Unknown client")}</p>
                        {jobTitle && <p className="invoice-description">{safeText(jobTitle)}</p>}
                        <div className="invoice-meta"><span>Created {formatDate(invoice.created_at) || "—"}</span><span>Due {formatDate(invoice.due_date) || "—"}</span>{invoice.myob_invoice_number && <span>MYOB #{invoice.myob_invoice_number}</span>}</div>
                        {invoice.myob_error && (mode === "myob_sync" || mode === "myob_external") && <p className="invoice-error">{safeText(invoice.myob_error)}</p>}
                      </button>

                      <div className="invoice-row-money">
                        <span>{formatCurrency(invoice.total)}</span>
                        <small>{getPaymentLabel(invoice)}</small>
                      </div>

                      <div className="invoice-row-actions" onClick={(e) => e.stopPropagation()}>
                        <PremiumButton size="sm" variant="secondary" onClick={() => setActiveInvoice(invoice)}>Open</PremiumButton>
                        {invoice.status === "draft" && <PremiumButton size="sm" onClick={() => handleSendInvoice(invoice.id)} iconLeft={<Send className="h-3.5 w-3.5" />} dataTestId={`send-invoice-${invoice.id}`}>Send</PremiumButton>}
                        {invoice.status === "sent" && <PremiumButton size="sm" variant="success" onClick={() => handleMarkPaid(invoice.id)} iconLeft={<CheckCircle className="h-3.5 w-3.5" />} dataTestId={`mark-paid-${invoice.id}`}>Mark paid</PremiumButton>}
                        {isCollectable(invoice) && <PremiumButton size="sm" variant="secondary" onClick={() => handlePrepareSingleReminder(invoice)}>Draft reminder</PremiumButton>}
                        {paymentLink && <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="px-btn px-btn--secondary px-btn--sm"><Link2 className="h-3.5 w-3.5" /> Pay link</a>}
                        {(mode === "myob_sync" || mode === "myob_external") && <PremiumButton size="sm" variant="secondary" disabled={!myobConnected} onClick={() => handleSyncMyob(invoice.id, String(invoice.myob_sync_status) === "failed")}>{myobConnected ? (String(invoice.myob_sync_status) === "failed" ? "Retry sync" : "Sync MYOB") : "Setup MYOB"}</PremiumButton>}
                        <div className="relative">
                          <button className="px-btn px-btn--ghost px-btn--sm" onClick={() => setOpenMenu(openMenu === invoice.id ? null : invoice.id)} data-testid={`invoice-menu-${invoice.id}`}><MoreHorizontal className="h-4 w-4" /></button>
                          {openMenu === invoice.id && <><div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} /><div className="absolute right-0 mt-1 w-44 bg-white border border-[#d8e3f3] rounded-xl shadow-lg z-20 overflow-hidden"><button className="block w-full text-left px-3 py-2 text-[13px] text-[#0d1b34] hover:bg-[#eff4ff]" onClick={() => { setOpenMenu(null); setActiveInvoice(invoice); }}>View details</button><Link to={`/invoices/${invoice.id}/edit`} className="block px-3 py-2 text-[13px] text-[#0d1b34] hover:bg-[#eff4ff]" data-testid={`edit-invoice-${invoice.id}`}><Pencil className="h-3.5 w-3.5 inline mr-1.5" />Edit</Link><button onClick={() => { setOpenMenu(null); setDeleteId(invoice.id); }} className="block w-full text-left px-3 py-2 text-[13px] text-[#dc2626] hover:bg-[#fff5f5]" data-testid={`delete-invoice-${invoice.id}`}><Trash2 className="h-3.5 w-3.5 inline mr-1.5" />Delete</button></div></>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!!deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="delete-invoice-dialog">
            <div className="absolute inset-0 bg-[#0d1b34]/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
            <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-[#d8e3f3] bg-white p-6 shadow-2xl">
              <h2 className="font-heading text-lg font-bold text-[#0d1b34]">Delete invoice</h2>
              <p className="mt-2 text-[13.5px] text-[#5b6c87]">Are you sure you want to delete this invoice? This cannot be undone.</p>
              <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2"><PremiumButton variant="secondary" onClick={() => setDeleteId(null)}>Cancel</PremiumButton><PremiumButton variant="danger" onClick={handleDelete} disabled={loading} dataTestId="confirm-delete-invoice">{loading ? "Deleting…" : "Delete"}</PremiumButton></div>
            </div>
          </div>
        )}
        <EntityDetailModal open={Boolean(activeInvoice)} onClose={() => setActiveInvoice(null)} title={activeInvoice ? `Invoice details · ${activeInvoice.invoice_number || activeInvoice.id}` : "Invoice details"} entityType="invoice" item={activeInvoice} />
      </PremiumPage>
    </Layout>
  );
}
