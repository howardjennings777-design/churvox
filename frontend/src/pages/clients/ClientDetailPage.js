// CHURVOX_CLIENT_DETAIL_COMMAND_ROUTES_20260608
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import { ArrowLeft, Briefcase, Clock, Edit, FileSignature, Mail, MapPin, Phone, Plus, Receipt, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, JOB_STATUS_MAP } from "../../lib/utils";
import { PremiumButton, PremiumCard, PremiumEmptyState, PremiumHero, PremiumPage } from "../../components/premium";

function arr(value) {
  const data = value?.data ?? value;
  if (Array.isArray(data)) return data;
  for (const key of ["clients", "jobs", "quotes", "invoices", "items", "results", "data"]) if (Array.isArray(data?.[key])) return data[key];
  return [];
}
function readRecord(payload, key) {
  const data = payload?.data ?? payload;
  return data?.[key] || data?.item || data?.record || data || {};
}
function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "object") return String(value.$oid || value.oid || value.id || value._id || "");
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
  return Boolean(name && recordClientName(record) === name);
}
function statusOf(record) { return String(record?.status || record?.job_status || record?.payment_status || "draft").toLowerCase(); }
function totalOf(record) { return Number(record?.total || record?.amount || record?.price || record?.amount_due || 0); }
function openRecords(items) { return items.filter((item) => !["paid", "complete", "completed", "done", "cancelled", "canceled", "declined"].includes(statusOf(item))); }
function dateValue(value) { return value ? formatDate(value) : "Not set"; }
function money(value) { return formatCurrency(Number(value || 0)); }
function titleOf(record, fallback) { return record?.title || record?.job_name || record?.quote_number || record?.invoice_number || record?.description || fallback; }

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get } = useApi();
  const [client, setClient] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [clientRes, jobsRes, quotesRes, invoicesRes] = await Promise.all([get(`/clients/${encodeURIComponent(id)}`), get("/jobs"), get("/quotes"), get("/invoices")]);
    if (!clientRes?.success) {
      toast.error(clientRes?.error || "Client not found");
      navigate("/clients-board");
      return;
    }
    const nextClient = readRecord(clientRes, "client");
    setClient(nextClient);
    setJobs((jobsRes?.success ? arr(jobsRes.data) : []).filter((job) => sameClient(job, nextClient)));
    setQuotes((quotesRes?.success ? arr(quotesRes.data) : []).filter((quote) => sameClient(quote, nextClient)));
    setInvoices((invoicesRes?.success ? arr(invoicesRes.data) : []).filter((invoice) => sameClient(invoice, nextClient)));
    setLoading(false);
  }, [get, id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const metrics = useMemo(() => ({
    openJobs: openRecords(jobs).length,
    openQuotes: openRecords(quotes).length,
    openInvoices: openRecords(invoices).length,
    totalInvoiced: invoices.reduce((sum, invoice) => sum + totalOf(invoice), 0),
  }), [jobs, quotes, invoices]);

  if (loading || !client) return <Layout><PremiumPage maxWidth={980}><PremiumCard><div className="p-8 text-center font-bold text-slate-300">Loading client…</div></PremiumCard></PremiumPage></Layout>;

  const clientId = idOf(client) || id;
  const name = clientName(client);
  const lastJob = [...jobs].sort((a, b) => new Date(b.completed_at || b.scheduled_date || b.created_at || 0) - new Date(a.completed_at || a.scheduled_date || a.created_at || 0))[0];

  return <Layout><PremiumPage maxWidth={1120}>
    <button onClick={() => navigate("/clients-board")} className="mb-3 flex items-center gap-2 text-slate-300 hover:text-white text-sm font-black" data-testid="back-to-clients"><ArrowLeft size={16} /> Back to Clients board</button>
    <PremiumHero eyebrow="Client record" title={name} subtitle={client.email || client.phone || "Client profile"} icon={<UserCircle2 className="h-6 w-6" />} actions={<PremiumButton variant="secondary" size="sm" onClick={() => navigate(`/clients/${clientId}/edit`)} dataTestId="edit-client-button"><Edit size={14} className="mr-1" /> Edit</PremiumButton>} />

    <section className="mb-5 grid gap-3 md:grid-cols-4">
      <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Open jobs</span><b className="mt-2 block text-3xl text-white">{metrics.openJobs}</b></article>
      <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-purple-300">Open quotes</span><b className="mt-2 block text-3xl text-white">{metrics.openQuotes}</b></article>
      <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">Open invoices</span><b className="mt-2 block text-3xl text-white">{metrics.openInvoices}</b></article>
      <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-lime-300">Invoiced</span><b className="mt-2 block text-3xl text-white">{money(metrics.totalInvoiced)}</b></article>
    </section>

    <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="grid gap-5">
        <PremiumCard title="Contact details" icon={<UserCircle2 className="h-5 w-5" />} data-testid="client-info-card">
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            {client.email ? <div className="flex items-center gap-2 text-slate-200"><Mail size={14} className="text-cyan-300" /> {client.email}</div> : null}
            {client.phone ? <div className="flex items-center gap-2 text-slate-200"><Phone size={14} className="text-cyan-300" /> {client.phone}</div> : null}
            {client.address ? <div className="flex items-center gap-2 text-slate-200 md:col-span-2"><MapPin size={14} className="text-cyan-300" /> {client.address}</div> : null}
          </div>
          {client.notes ? <div className="mt-4 border-t border-slate-700 pt-4"><p className="mb-1 text-xs text-slate-400">Notes</p><p className="whitespace-pre-wrap text-sm text-slate-200">{client.notes}</p></div> : null}
        </PremiumCard>

        <PremiumCard title="Client memory" icon={<Clock className="h-5 w-5" />} data-testid="client-memory-card">
          <div className="space-y-2 text-sm text-slate-200">
            <p><span className="font-black text-white">Last job:</span> {lastJob ? titleOf(lastJob, "Job") : "—"}</p>
            <p><span className="font-black text-white">Last service date:</span> {dateValue(lastJob?.completed_at || lastJob?.scheduled_date || lastJob?.created_at)}</p>
            <p><span className="font-black text-white">Payment pattern:</span> {invoices.length ? `${invoices.filter((invoice) => statusOf(invoice) === "paid").length}/${invoices.length} invoices paid` : "No invoice history yet"}</p>
            <p className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3"><span className="font-black text-white">Summary:</span> {name} has {jobs.length} job{jobs.length === 1 ? "" : "s"}, {quotes.length} quote{quotes.length === 1 ? "" : "s"}, and {money(metrics.totalInvoiced)} in invoice history.</p>
          </div>
        </PremiumCard>

        <PremiumCard title={`Job history (${jobs.length})`} icon={<Briefcase className="h-5 w-5" />} data-testid="client-job-history">
          {jobs.length === 0 ? <PremiumEmptyState icon={<Briefcase className="h-10 w-10" />} title="No jobs yet" subtitle="Jobs you create for this client will appear here." /> : <div className="space-y-2">{jobs.map((job) => { const jid = normalizeId(job.id || job._id); const statusInfo = JOB_STATUS_MAP[job.status]; return <Link key={jid} to={`/jobs/${jid}`} className="block rounded-xl border border-slate-700 bg-slate-950/50 p-4 transition-all hover:border-cyan-300/50"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-white">{titleOf(job, "Job")}</p><div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-300"><span>{dateValue(job.scheduled_date)}</span>{Number(job.price || job.fixed_price || 0) > 0 ? <span className="font-semibold text-lime-300">{money(job.price || job.fixed_price)}</span> : null}</div></div><span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white ${statusInfo?.color || "bg-slate-500"}`}>{statusInfo?.label || job.status}</span></div></Link>; })}</div>}
        </PremiumCard>
      </div>

      
    </section>
  </PremiumPage></Layout>;
}
