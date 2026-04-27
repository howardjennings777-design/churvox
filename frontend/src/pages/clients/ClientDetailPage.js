import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, FileText, Clock, Briefcase, Receipt, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, JOB_STATUS_MAP } from "../../lib/utils";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function recordId(item) {
  return String(item?.id || item?._id || "");
}

function sameClient(record, client) {
  if (!record || !client) return false;
  const clientId = String(client.id || client._id || "");
  const recordClientId = String(record.client_id || record.customer_id || "");
  const clientName = String(client.name || "").trim().toLowerCase();
  const clientEmail = String(client.email || "").trim().toLowerCase();
  const recordName = String(record.customer_name || record.client_name || record.name || "").trim().toLowerCase();
  const recordEmail = String(record.customer_email || record.client_email || record.email || "").trim().toLowerCase();
  return Boolean(
    (clientId && recordClientId && clientId === recordClientId) ||
    (clientEmail && recordEmail && clientEmail === recordEmail) ||
    (clientName && recordName && clientName === recordName)
  );
}

function StatusPill({ status }) {
  const value = String(status || "draft").toLowerCase();
  const cls = value === "completed" || value === "paid" || value === "accepted"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : value === "overdue" || value === "declined" || value === "cancelled"
      ? "bg-red-50 text-red-700 ring-red-200"
      : value === "in_progress" || value === "sent"
        ? "bg-blue-50 text-blue-700 ring-blue-200"
        : "bg-slate-50 text-slate-700 ring-slate-200";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ${cls}`}>{value.replace(/_/g, " ")}</span>;
}

function MiniStat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
        </div>
        <span className="rounded-xl border border-blue-100 bg-blue-50 p-2 text-blue-700"><Icon className="h-4 w-4" /></span>
      </div>
    </div>
  );
}

function HistoryCard({ item, type, to, title, subtitle, amount, status, date }) {
  return (
    <Link to={to} className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{title || `${type} ${recordId(item).slice(-5)}`}</p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">{subtitle || "No description"}</p>
        </div>
        <StatusPill status={status} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs font-bold text-slate-500">
        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{date ? formatDate(date) : "No date"}</span>
        {Number(amount || 0) > 0 ? <span className="text-blue-700">{formatCurrency(amount)}</span> : null}
      </div>
    </Link>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, del } = useApi();
  const [client, setClient] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [clientRes, jobsRes, quotesRes, invoicesRes] = await Promise.allSettled([
      get(`/clients/${id}`),
      get(`/clients/${id}/jobs`),
      get("/quotes"),
      get("/invoices"),
    ]);

    const clientData = clientRes.status === "fulfilled" && clientRes.value?.success ? clientRes.value.data : null;
    if (clientData) setClient(clientData);
    else navigate("/clients");

    setJobs(safeArray(jobsRes.status === "fulfilled" && jobsRes.value?.success ? jobsRes.value.data : []));
    setQuotes(safeArray(quotesRes.status === "fulfilled" && quotesRes.value?.success ? quotesRes.value.data : []));
    setInvoices(safeArray(invoicesRes.status === "fulfilled" && invoicesRes.value?.success ? invoicesRes.value.data : []));
    setLoading(false);
  }, [get, id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const clientQuotes = useMemo(() => safeArray(quotes).filter((quote) => sameClient(quote, client)), [quotes, client]);
  const clientInvoices = useMemo(() => safeArray(invoices).filter((invoice) => sameClient(invoice, client)), [invoices, client]);
  const paidRevenue = useMemo(() => clientInvoices.filter((invoice) => String(invoice.status || "").toLowerCase() === "paid").reduce((sum, invoice) => sum + Number(invoice.total || invoice.amount || invoice.subtotal || 0), 0), [clientInvoices]);
  const outstanding = useMemo(() => clientInvoices.filter((invoice) => !["paid", "cancelled"].includes(String(invoice.status || "").toLowerCase())).reduce((sum, invoice) => sum + Number(invoice.total || invoice.amount || invoice.subtotal || 0), 0), [clientInvoices]);

  const handleDelete = async () => {
    const confirmed = window.confirm("Delete this client? This cannot be undone.");
    if (!confirmed) return;
    const res = await del(`/clients/${id}`);
    if (res.success) {
      toast.success("Client deleted");
      navigate("/clients");
    }
  };

  if (!client) return <Layout><div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" /></div></Layout>;

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6" data-testid="client-detail-page">
        <section className="overflow-hidden rounded-3xl border border-slate-900/20 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-2xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <button onClick={() => navigate("/clients")} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-cyan-200 hover:text-white" data-testid="back-to-clients">
                <ArrowLeft size={18} /> Back to clients
              </button>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Client command centre</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{client.name}</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-300">Jobs, quotes, invoices, contact details and money history for this customer in one place.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/15" data-testid="edit-client-button">
                <Link to={`/clients/${id}/edit`}><Edit size={14} className="mr-1" /> Edit</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleDelete} className="rounded-full border-red-300/30 bg-red-500/10 text-red-100 hover:bg-red-500/20" data-testid="delete-client-trigger">
                <Trash2 size={14} className="mr-1" /> Delete
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat label="Jobs" value={jobs.length} icon={Briefcase} />
          <MiniStat label="Quotes" value={clientQuotes.length} icon={FileText} />
          <MiniStat label="Invoices" value={clientInvoices.length} icon={Receipt} />
          <MiniStat label="Paid revenue" value={formatCurrency(paidRevenue)} icon={TrendingUp} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <Card className="h-fit border-slate-200 bg-white shadow-sm" data-testid="client-info-card">
            <CardContent className="p-5">
              <h2 className="text-lg font-black text-slate-950">Contact</h2>
              <div className="mt-4 space-y-3">
                {client.email && <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm font-semibold text-slate-700"><Mail size={15} /> {client.email}</div>}
                {client.phone && <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm font-semibold text-slate-700"><Phone size={15} /> {client.phone}</div>}
                {client.address && <div className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm font-semibold text-slate-700"><MapPin size={15} className="mt-0.5 shrink-0" /> {client.address}</div>}
                {client.notes && <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Notes</p><p className="mt-1 text-sm font-semibold text-slate-700">{client.notes}</p></div>}
                {!client.email && !client.phone && !client.address && !client.notes && <p className="text-sm text-slate-500">No contact details saved yet.</p>}
              </div>
              <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                Outstanding balance: <span className="font-black">{formatCurrency(outstanding)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-3">
            <section data-testid="client-job-history">
              <h2 className="mb-3 flex items-center gap-2 text-base font-black text-slate-950"><Briefcase size={16} /> Jobs ({jobs.length})</h2>
              <div className="space-y-3">
                {jobs.length ? jobs.map((job) => {
                  const statusInfo = JOB_STATUS_MAP[job.status];
                  return (
                    <HistoryCard key={recordId(job)} item={job} type="Job" to={`/jobs/${recordId(job)}`} title={job.title || "Untitled job"} subtitle={job.customer_name || job.client_name || job.address} amount={job.price} status={statusInfo?.label || job.status} date={job.scheduled_date || job.created_at} />
                  );
                }) : <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">No jobs for this client yet.</div>}
              </div>
            </section>

            <section data-testid="client-quote-history">
              <h2 className="mb-3 flex items-center gap-2 text-base font-black text-slate-950"><FileText size={16} /> Quotes ({clientQuotes.length})</h2>
              <div className="space-y-3">
                {clientQuotes.length ? clientQuotes.map((quote) => (
                  <HistoryCard key={recordId(quote)} item={quote} type="Quote" to={`/quotes/${recordId(quote)}`} title={quote.quote_number || quote.job_description || "Quote"} subtitle={quote.customer_name || quote.address} amount={quote.price || quote.total} status={quote.status} date={quote.created_at || quote.valid_until} />
                )) : <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">No quotes for this client yet.</div>}
              </div>
            </section>

            <section data-testid="client-invoice-history">
              <h2 className="mb-3 flex items-center gap-2 text-base font-black text-slate-950"><Receipt size={16} /> Invoices ({clientInvoices.length})</h2>
              <div className="space-y-3">
                {clientInvoices.length ? clientInvoices.map((invoice) => (
                  <HistoryCard key={recordId(invoice)} item={invoice} type="Invoice" to={`/invoices/${recordId(invoice)}`} title={invoice.invoice_number || invoice.description || "Invoice"} subtitle={invoice.customer_name || invoice.address} amount={invoice.total || invoice.amount || invoice.subtotal} status={invoice.status} date={invoice.created_at || invoice.due_date} />
                )) : <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">No invoices for this client yet.</div>}
              </div>
            </section>
          </div>
        </div>

        {loading ? <p className="text-center text-xs font-semibold text-slate-400">Refreshing client history…</p> : null}
      </div>
    </Layout>
  );
}
