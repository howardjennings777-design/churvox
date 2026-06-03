// CHURVOX_CLIENT_DETAIL_STABLE_LINKED_RECORDS_20260601
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import { ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, FileText, Clock, DollarSign, UserCircle2, Briefcase, Receipt, FileSignature, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, JOB_STATUS_MAP } from "../../lib/utils";
import { confirmDialog } from "../../lib/confirmDialog";
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton, PremiumEmptyState } from "../../components/premium";

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.clients)) return value.clients;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.quotes)) return value.quotes;
  if (Array.isArray(value?.invoices)) return value.invoices;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}
function readClient(payload) { const data = payload?.data ?? payload; return data?.client || data?.customer || data?.item || data?.record || data || {}; }
function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") return normalizeId(value.$oid || value.oid || value.id || value._id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}
function idOf(value) { return normalizeId(value?.id || value?._id || value?.client_id || value?.customer_id || ""); }
function clientName(client) { return client?.name || client?.client_name || client?.customer_name || client?.contact_name || "Client"; }
function recordClientId(record) { return normalizeId(record?.client_id || record?.customer_id || record?.clientId || record?.customerId || ""); }
function recordClientName(record) { return String(record?.client_name || record?.customer_name || record?.name || "").toLowerCase(); }
function sameClient(record, client) {
  const cid = idOf(client);
  const rid = recordClientId(record);
  if (cid && rid && cid === rid) return true;
  const name = clientName(client).toLowerCase();
  return Boolean(name && recordClientName(record) && recordClientName(record) === name);
}
function jobTitle(job) { return job?.title || job?.job_name || job?.description || "Job"; }
function quoteTitle(quote) { return quote?.quote_number || quote?.title || quote?.job_description || "Quote"; }
function invoiceTitle(invoice) { return invoice?.invoice_number || invoice?.number || "Invoice"; }
function money(value) { return formatCurrency(Number(value || 0)); }
function dateValue(value) { return value ? formatDate(value) : "Not set"; }
function totalOf(record) { return record?.total || record?.amount || record?.price || record?.amount_due || 0; }
function statusOf(record) { return String(record?.status || record?.job_status || record?.payment_status || "draft").toLowerCase(); }
function openRecords(items) { return items.filter((item) => !["paid", "complete", "completed", "done", "cancelled", "canceled", "void", "declined"].includes(statusOf(item))); }
function buildMemory(client, jobs, quotes, invoices) {
  const lastJob = [...jobs].sort((a, b) => new Date(b.completed_at || b.scheduled_date || b.created_at || 0) - new Date(a.completed_at || a.scheduled_date || a.created_at || 0))[0];
  const paidInvoices = invoices.filter((invoice) => statusOf(invoice) === "paid");
  const openInvoices = openRecords(invoices);
  const totalInvoiced = invoices.reduce((sum, invoice) => sum + Number(totalOf(invoice) || 0), 0);
  const commonService = lastJob?.title || lastJob?.job_name || quotes[0]?.job_description || quotes[0]?.description || "Not enough history yet";
  return {
    last_job: lastJob,
    last_service_date: lastJob?.completed_at || lastJob?.scheduled_date || lastJob?.created_at,
    common_service_type: commonService,
    payment_pattern: invoices.length ? `${paidInvoices.length}/${invoices.length} invoices paid` : "No invoice history yet",
    suggested_next_action: !jobs.length ? "Create the first job for this client." : openInvoices.length ? "Follow up unpaid invoice." : "Review next service or quote opportunity.",
    ai_summary: `${clientName(client)} has ${jobs.length} job${jobs.length === 1 ? "" : "s"}, ${quotes.length} quote${quotes.length === 1 ? "" : "s"}, and ${money(totalInvoiced)} in invoice history.`,
  };
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
    try {
      const [clientRes, jobsRes, quotesRes, invoicesRes] = await Promise.all([
        get(`/clients/${encodeURIComponent(id)}`),
        get("/jobs"),
        get("/quotes"),
        get("/invoices"),
      ]);
      if (clientRes.success) {
        const nextClient = readClient(clientRes);
        setClient(nextClient);
        const allJobs = jobsRes.success ? arr(jobsRes.data) : [];
        const allQuotes = quotesRes.success ? arr(quotesRes.data) : [];
        const allInvoices = invoicesRes.success ? arr(invoicesRes.data) : [];
        setJobs(allJobs.filter((job) => sameClient(job, nextClient)));
        setQuotes(allQuotes.filter((quote) => sameClient(quote, nextClient)));
        setInvoices(allInvoices.filter((invoice) => sameClient(invoice, nextClient)));
      } else {
        toast.error(clientRes.error || "Client not found");
        navigate("/clients");
      }
    } finally {
      setLoading(false);
    }
  }, [get, id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const memory = useMemo(() => client ? buildMemory(client, jobs, quotes, invoices) : null, [client, jobs, quotes, invoices]);
  const metrics = useMemo(() => ({
    openJobs: openRecords(jobs).length,
    openQuotes: openRecords(quotes).length,
    openInvoices: openRecords(invoices).length,
    totalInvoiced: invoices.reduce((sum, invoice) => sum + Number(totalOf(invoice) || 0), 0),
  }), [jobs, quotes, invoices]);

  const handleDelete = async () => {
    const confirmed = await confirmDialog({
      title: "Delete this client?",
      message: "This cannot be undone. Linked jobs/quotes/invoices stay but the client record is removed.",
      danger: true,
      confirmLabel: "Delete",
    });
    if (!confirmed) return;
    const res = await del(`/clients/${encodeURIComponent(id)}`);
    if (res.success) {
      toast.success("Client deleted");
      navigate("/clients");
    } else toast.error(res.error || "Could not delete client");
  };

  if (loading || !client) {
    return <Layout><PremiumPage maxWidth={980}><PremiumCard><div className="p-8 text-center font-bold text-slate-300">Loading client…</div></PremiumCard></PremiumPage></Layout>;
  }

  const name = clientName(client);
  const clientId = idOf(client) || id;

  return (
    <Layout>
      <PremiumPage maxWidth={1120}>
        <button onClick={() => navigate("/clients")} className="mb-3 flex items-center gap-2 text-slate-300 hover:text-white text-sm font-black" data-testid="back-to-clients">
          <ArrowLeft size={16} /> Back to clients
        </button>

        <PremiumHero
          eyebrow="CLIENT RECORD"
          title={name}
          subtitle={client.email || client.phone || "Client profile"}
          icon={<UserCircle2 className="h-6 w-6" />}
          actions={<div className="flex flex-wrap items-center gap-2"><PremiumButton variant="secondary" size="sm" onClick={() => navigate(`/clients/${id}/edit`)} dataTestId="edit-client-button"><Edit size={14} className="mr-1" /> Edit</PremiumButton><PremiumButton variant="danger" size="sm" onClick={handleDelete} dataTestId="delete-client-trigger"><Trash2 size={14} /></PremiumButton></div>}
        />

        <section className="mb-5 grid gap-3 md:grid-cols-4">
          <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Open jobs</span><b className="mt-2 block text-3xl text-white">{metrics.openJobs}</b></article>
          <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-purple-300">Open quotes</span><b className="mt-2 block text-3xl text-white">{metrics.openQuotes}</b></article>
          <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">Open invoices</span><b className="mt-2 block text-3xl text-white">{metrics.openInvoices}</b></article>
          <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-lime-300">Invoiced</span><b className="mt-2 block text-3xl text-white">{money(metrics.totalInvoiced)}</b></article>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-5">
            <PremiumCard title="Contact details" icon={<UserCircle2 className="h-5 w-5" />} data-testid="client-info-card">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {client.email ? <div className="flex items-center gap-2 text-slate-200"><Mail size={14} className="text-cyan-300" /> {client.email}</div> : null}
                {client.phone ? <div className="flex items-center gap-2 text-slate-200"><Phone size={14} className="text-cyan-300" /> {client.phone}</div> : null}
                {client.address ? <div className="flex items-center gap-2 text-slate-200 md:col-span-2"><MapPin size={14} className="text-cyan-300" /> {client.address}</div> : null}
              </div>
              {client.notes ? <div className="mt-4 pt-4 border-t border-slate-700"><p className="text-xs text-slate-400 mb-1">Notes</p><p className="text-sm text-slate-200 whitespace-pre-wrap">{client.notes}</p></div> : null}
            </PremiumCard>

            <PremiumCard title="Client memory" icon={<Clock className="h-5 w-5" />} data-testid="client-memory-card">
              <div className="space-y-2 text-sm text-slate-200">
                <p><span className="font-black text-white">Last job:</span> {memory?.last_job?.title || memory?.last_job?.job_name || "—"}</p>
                <p><span className="font-black text-white">Last service date:</span> {dateValue(memory?.last_service_date)}</p>
                <p><span className="font-black text-white">Common service:</span> {memory?.common_service_type || "—"}</p>
                <p><span className="font-black text-white">Payment pattern:</span> {memory?.payment_pattern || "—"}</p>
                <p className="rounded-2xl bg-slate-950/60 border border-slate-700 p-3"><span className="font-black text-white">AI-style summary:</span> {memory?.ai_summary || "—"}</p>
                <p><span className="font-black text-white">Suggested next action:</span> {memory?.suggested_next_action || "—"}</p>
              </div>
            </PremiumCard>

            <PremiumCard title={`Job history (${jobs.length})`} icon={<Briefcase className="h-5 w-5" />} data-testid="client-job-history">
              {jobs.length === 0 ? <PremiumEmptyState icon={<FileText className="h-10 w-10" />} title="No jobs yet" subtitle="Jobs you create for this client will appear here." /> : <div className="space-y-2">{jobs.map((job) => { const statusInfo = JOB_STATUS_MAP[job.status]; const jid = normalizeId(job.id || job._id); return <Link key={jid} to={`/jobs/${jid}`} data-testid={`client-job-${jid}`} className="block bg-slate-950/50 border border-slate-700 rounded-xl p-4 hover:border-cyan-300/50 transition-all"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-white font-semibold truncate">{jobTitle(job)}</p><div className="flex items-center gap-3 mt-1 text-xs text-slate-300 flex-wrap"><span className="flex items-center gap-1"><Clock size={11} /> {dateValue(job.scheduled_date)}</span>{Number(job.price || job.fixed_price || 0) > 0 ? <span className="text-lime-300 font-semibold flex items-center gap-0.5"><DollarSign size={11} />{money(job.price || job.fixed_price)}</span> : null}</div></div><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase text-white flex-shrink-0 ${statusInfo?.color || "bg-slate-500"}`}>{statusInfo?.label || job.status}</span></div></Link>; })}</div>}
            </PremiumCard>
          </div>

          <aside className="space-y-4">
            <PremiumCard title="Create from this client">
              <div className="grid gap-3">
                <Link to={`/jobs/new?client_id=${encodeURIComponent(clientId)}`}><PremiumButton className="w-full" iconLeft={<Plus className="h-4 w-4" />}>Create job</PremiumButton></Link>
                <Link to={`/quotes/new?client_id=${encodeURIComponent(clientId)}`}><PremiumButton variant="secondary" className="w-full" iconLeft={<FileSignature className="h-4 w-4" />}>Create quote</PremiumButton></Link>
                <Link to={`/invoices/new?client_id=${encodeURIComponent(clientId)}`}><PremiumButton variant="secondary" className="w-full" iconLeft={<Receipt className="h-4 w-4" />}>Create invoice</PremiumButton></Link>
              </div>
            </PremiumCard>

            <PremiumCard title={`Quotes (${quotes.length})`} icon={<FileSignature className="h-5 w-5" />}>
              {quotes.length ? <div className="grid gap-2">{quotes.slice(0, 8).map((quote) => { const qid = normalizeId(quote.id || quote._id); return <Link key={qid} to={`/quotes/${qid}`} className="rounded-2xl border border-slate-700 bg-slate-950/50 p-3 text-sm no-underline"><b className="block text-white">{quoteTitle(quote)}</b><span className="text-slate-300">{statusOf(quote)} · {money(totalOf(quote))}</span></Link>; })}</div> : <p className="text-sm font-semibold text-slate-300">No quotes yet.</p>}
            </PremiumCard>

            <PremiumCard title={`Invoices (${invoices.length})`} icon={<Receipt className="h-5 w-5" />}>
              {invoices.length ? <div className="grid gap-2">{invoices.slice(0, 8).map((invoice) => { const iid = normalizeId(invoice.id || invoice._id); return <Link key={iid} to={`/invoices/${iid}`} className="rounded-2xl border border-slate-700 bg-slate-950/50 p-3 text-sm no-underline"><b className="block text-white">{invoiceTitle(invoice)}</b><span className="text-slate-300">{statusOf(invoice)} · {money(totalOf(invoice))}</span></Link>; })}</div> : <p className="text-sm font-semibold text-slate-300">No invoices yet.</p>}
            </PremiumCard>
          </aside>
        </section>
      </PremiumPage>
    </Layout>
  );
}
