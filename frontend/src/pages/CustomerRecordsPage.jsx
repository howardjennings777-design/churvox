import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { industrialAction, industrialChip, industrialContentLane, industrialGhost, industrialPageShell } from "../components/industrialCommandTheme";

const tileStyle = {
  background: "linear-gradient(135deg, #111827, #070d16)",
  color: "#ffffff",
  boxShadow: "0 18px 46px rgba(2,6,23,.26), inset 0 1px 0 rgba(255,255,255,.06)",
};

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function listFrom(res, keys = []) {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of [...keys, "clients", "customers", "jobs", "quotes", "invoices", "items", "results", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function idOf(item) {
  const raw = item?.id || item?._id || item?.client_id || item?.customer_id || item?.job_id || item?.quote_id || item?.invoice_id || "";
  return typeof raw === "object" && raw?.$oid ? raw.$oid : String(raw || "");
}

function nameOf(client) {
  return first(client?.name, client?.full_name, client?.client_name, client?.customer_name, client?.company_name, client?.business_name, "Unnamed client");
}
function emailOf(client) { return first(client?.email, client?.email_address, client?.contact_email, ""); }
function phoneOf(client) { return first(client?.phone, client?.mobile, client?.phone_number, client?.contact_phone, ""); }
function addressOf(client) { return first(client?.address, client?.site_address, client?.street_address, client?.billing_address, client?.property_address, ""); }
function notesOf(client) { return first(client?.notes, client?.description, client?.customer_notes, ""); }
function statusOf(client) { return String(first(client?.status, client?.client_status, client?.type, "ready")).replaceAll("_", " "); }
function rawStatus(client) { return String(first(client?.status, client?.client_status, client?.type, "ready")).toLowerCase(); }

function money(value) {
  const num = Number(String(value || 0).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) && num > 0 ? num.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00";
}
function numberValue(value) {
  const num = Number(String(value || 0).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : 0;
}
function hasReal(value) { return Boolean(String(value || "").trim()); }
function matchClient(item, client) {
  const clientId = idOf(client);
  const itemClientId = String(first(item?.client_id, item?.customer_id, ""));
  if (clientId && itemClientId === clientId) return true;
  const clientName = nameOf(client).toLowerCase();
  return clientName && [item?.client_name, item?.customer_name, item?.name].some((v) => String(v || "").toLowerCase() === clientName);
}
function rawItemStatus(item) { return String(first(item?.status, item?.job_status, item?.invoice_status, item?.quote_status, "")).toLowerCase(); }
function isOpenJob(job) { const s = rawItemStatus(job); return !s.includes("complete") && !s.includes("cancel"); }
function isOverdue(invoice) { const s = rawItemStatus(invoice); if (s.includes("paid")) return false; if (s.includes("overdue")) return true; const due = first(invoice?.due_date, invoice?.due_at); if (!due) return false; const d = new Date(due); return !Number.isNaN(d.getTime()) && d.getTime() < Date.now(); }

function detailsFor(client) {
  return { Name: nameOf(client), Email: emailOf(client) || "No email saved", Phone: phoneOf(client) || "No phone saved", Address: addressOf(client) || "No address saved", Status: statusOf(client), Notes: notesOf(client) || "No notes saved" };
}
function statusClass(client) {
  const status = rawStatus(client);
  if (status.includes("inactive") || status.includes("archiv")) return "bg-slate-300 text-slate-950";
  if (status.includes("overdue") || status.includes("problem")) return "bg-red-300 text-slate-950";
  if (status.includes("vip") || status.includes("priority")) return "bg-amber-300 text-slate-950";
  return "bg-emerald-300 text-slate-950";
}
function SecurityTape({ color = "#22d3ee" }) {
  return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[26px]" style={{ background: `repeating-linear-gradient(135deg, ${color} 0 10px, rgba(255,255,255,.30) 10px 15px, ${color} 15px 25px)`, boxShadow: `0 0 18px ${color}66` }} />;
}
function MetricCard({ label, value, text, color }) {
  return <article className="relative overflow-hidden rounded-[28px] border border-white/10 p-5 pl-7 text-white" style={tileStyle}><SecurityTape color={color} /><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{label}</div><div className="mt-3 text-4xl font-black tracking-[-0.07em] text-white">{value}</div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{text}</p></article>;
}
function DetailRow({ label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{label}</div><div className="mt-2 text-sm font-black leading-6 text-white">{String(value || "Not saved")}</div></div>;
}
function Field({ label, value, onChange, type = "text" }) {
  return <label className="grid gap-2 rounded-2xl border border-white/10 bg-slate-950/45 p-4"><span className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{label}</span><input type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm font-bold text-white outline-none focus:border-amber-300" /></label>;
}
function MiniList({ title, items, empty, render }) {
  return <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"><div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-200">{title}</div><div className="mt-3 grid gap-2">{items.length ? items.slice(0, 5).map(render) : <div className="rounded-2xl bg-slate-950/45 p-3 text-sm font-black text-slate-300">{empty}</div>}</div></section>;
}

function ClientSlip({ client, related, busy, onClose, onRefresh, api }) {
  const [form, setForm] = React.useState({ name: "", email: "", phone: "", address: "", notes: "", job_title: "", job_price: "", quote_description: "", quote_price: "", invoice_description: "", invoice_amount: "" });
  const details = React.useMemo(() => detailsFor(client || {}), [client]);
  const clientId = idOf(client || {});
  React.useEffect(() => {
    if (!client) return;
    setForm({
      name: nameOf(client), email: emailOf(client), phone: phoneOf(client), address: addressOf(client), notes: notesOf(client),
      job_title: `Job for ${nameOf(client)}`, job_price: "", quote_description: `Work for ${nameOf(client)}`, quote_price: "", invoice_description: `Work completed for ${nameOf(client)}`, invoice_amount: "",
    });
  }, [client]);
  if (!client) return null;

  async function run(label, fn) {
    try {
      const res = await fn();
      if (res?.success === false) throw new Error(res?.error || `${label} failed`);
      toast.success(label);
      await onRefresh();
      onClose();
    } catch (error) { toast.error(error?.message || `${label} failed`); }
  }

  const openJobs = related.jobs.filter(isOpenJob);
  const overdueInvoices = related.invoices.filter(isOverdue);
  const sentQuotes = related.quotes.filter((quote) => rawItemStatus(quote).includes("sent"));
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return <div className="fixed inset-0 z-[2147483600] overflow-y-auto bg-slate-950/92 p-3 text-white backdrop-blur-xl md:p-6" role="dialog" aria-modal="true"><div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl md:min-h-[calc(100vh-48px)]"><header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7"><div><div className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Client slip</div><h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white md:text-6xl">{nameOf(client)}</h2><p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300 md:text-base">{phoneOf(client) || "No phone"} · {emailOf(client) || "No email"} · {statusOf(client)}</p></div><button type="button" onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button></header><div className="grid flex-1 gap-5 p-5 md:grid-cols-[1.15fr_.85fr] md:p-7"><section className="space-y-5"><section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Client timeline</div><div className="mt-4 grid gap-3 md:grid-cols-2">{Object.entries(details).map(([label, value]) => <DetailRow key={label} label={label} value={value} />)}</div></section><div className="grid gap-4 md:grid-cols-3"><MiniList title="Jobs" items={related.jobs} empty="No jobs found" render={(job) => <Link key={idOf(job)} to={`/jobs/${idOf(job)}`} className="rounded-2xl bg-slate-950/45 p-3 text-sm font-black text-white no-underline">{first(job.title, job.job_title, "Job")}<div className="mt-1 text-xs text-slate-300">{first(job.status, "ready")}</div></Link>} /><MiniList title="Quotes" items={related.quotes} empty="No quotes found" render={(quote) => <Link key={idOf(quote)} to={`/quotes/${idOf(quote)}`} className="rounded-2xl bg-slate-950/45 p-3 text-sm font-black text-white no-underline">{first(quote.quote_number, "Quote")}<div className="mt-1 text-xs text-slate-300">{money(first(quote.price, quote.total))}</div></Link>} /><MiniList title="Invoices" items={related.invoices} empty="No invoices found" render={(invoice) => <Link key={idOf(invoice)} to={`/invoices/${idOf(invoice)}`} className="rounded-2xl bg-slate-950/45 p-3 text-sm font-black text-white no-underline">{first(invoice.invoice_number, "Invoice")}<div className="mt-1 text-xs text-slate-300">{money(first(invoice.total, invoice.amount_due, invoice.subtotal))}</div></Link>} /></div><section className="grid gap-3 md:grid-cols-2"><Field label="Name" value={form.name} onChange={(value) => setForm((p) => ({ ...p, name: value }))} /><Field label="Email" value={form.email} onChange={(value) => setForm((p) => ({ ...p, email: value }))} /><Field label="Phone" value={form.phone} onChange={(value) => setForm((p) => ({ ...p, phone: value }))} /><Field label="Address" value={form.address} onChange={(value) => setForm((p) => ({ ...p, address: value }))} /><Field label="Notes" value={form.notes} onChange={(value) => setForm((p) => ({ ...p, notes: value }))} /></section></section><aside className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Real client actions</div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">Review client work here. Save details or prepare the next job, quote, or draft invoice using real endpoints.</p><div className="mt-4 grid gap-2 rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm font-black text-slate-200"><div>{openJobs.length} open jobs</div><div>{sentQuotes.length} sent quotes</div><div>{overdueInvoices.length} overdue invoices</div></div><div className="mt-5 grid gap-3"><button type="button" disabled={busy || !clientId || !form.name} onClick={() => run("Client saved", () => api.patch(`/clients/${clientId}`, { name: form.name, email: form.email || null, phone: form.phone || null, address: form.address || null, notes: form.notes || null }))} className="rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">Save client details</button><button type="button" disabled={busy || !clientId} onClick={() => run("Quick job created", () => api.post("/jobs", { title: form.job_title || `Job for ${nameOf(client)}`, job_type: "other", client_id: clientId, customer_name: form.name || nameOf(client), address: form.address || addressOf(client) || "Address to confirm", scheduled_date: tomorrow, estimated_duration: 60, price: numberValue(form.job_price), pricing_type: "fixed", notes: form.notes || "Created from client slip" }))} className="rounded-2xl bg-cyan-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">Create quick job</button><div className="grid gap-2"><Field label="Quote description" value={form.quote_description} onChange={(value) => setForm((p) => ({ ...p, quote_description: value }))} /><Field label="Quote price" value={form.quote_price} onChange={(value) => setForm((p) => ({ ...p, quote_price: value }))} /></div><button type="button" disabled={busy || !clientId || !numberValue(form.quote_price)} onClick={() => run("Draft quote created", () => api.post("/quotes", { client_id: clientId, customer_name: form.name || nameOf(client), customer_email: form.email || undefined, address: form.address || addressOf(client) || "Address to confirm", job_description: form.quote_description || `Work for ${nameOf(client)}`, job_type: "other", price: numberValue(form.quote_price), pricing_type: "fixed", notes: "Created from client slip" }))} className="rounded-2xl bg-amber-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">Create draft quote</button><div className="grid gap-2"><Field label="Invoice description" value={form.invoice_description} onChange={(value) => setForm((p) => ({ ...p, invoice_description: value }))} /><Field label="Invoice amount" value={form.invoice_amount} onChange={(value) => setForm((p) => ({ ...p, invoice_amount: value }))} /></div><button type="button" disabled={busy || !clientId || !numberValue(form.invoice_amount)} onClick={() => run("Draft invoice created", () => api.post("/invoices", { client_id: clientId, customer_name: form.name || nameOf(client), customer_email: form.email || undefined, address: form.address || addressOf(client) || "", description: form.invoice_description || `Work completed for ${nameOf(client)}`, subtotal: numberValue(form.invoice_amount), notes: "Created from client slip" }))} className="rounded-2xl bg-orange-400 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">Create draft invoice</button>{clientId ? <Link to={`/clients/${clientId}`} onClick={onClose} className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 no-underline">Open full client page</Link> : null}<button type="button" onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Back to clients</button></div></aside></div></div></div>;
}

function ClientRow({ client, onOpen }) {
  const missingContact = !emailOf(client) || !phoneOf(client);
  return <button type="button" onClick={() => onOpen(client)} className="relative w-full overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.06] p-4 pl-7 text-left text-white transition hover:border-cyan-300/40 hover:bg-white/[0.09] active:scale-[0.99]"><SecurityTape color={missingContact ? "#fb923c" : "#22d3ee"} /><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xl font-black tracking-[-0.05em] text-white">{nameOf(client)}</h3><p className="mt-1 line-clamp-1 text-sm font-bold leading-6 text-slate-300">{phoneOf(client) || "No phone"} · {emailOf(client) || "No email"} · {addressOf(client) || "No address"}</p></div><span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusClass(client)}`}>{missingContact ? "Needs contact" : statusOf(client)}</span></div></button>;
}

export default function CustomerRecordsPage() {
  const api = useApi();
  const { get } = api;
  const [clients, setClients] = React.useState([]);
  const [jobs, setJobs] = React.useState([]);
  const [quotes, setQuotes] = React.useState([]);
  const [invoices, setInvoices] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [clientsRes, jobsRes, quotesRes, invoicesRes] = await Promise.allSettled([get("/clients"), get("/jobs"), get("/quotes"), get("/invoices")]);
      setClients(clientsRes.status === "fulfilled" ? listFrom(clientsRes.value, ["clients", "customers"]) : []);
      setJobs(jobsRes.status === "fulfilled" ? listFrom(jobsRes.value, ["jobs"]) : []);
      setQuotes(quotesRes.status === "fulfilled" ? listFrom(quotesRes.value, ["quotes"]) : []);
      setInvoices(invoicesRes.status === "fulfilled" ? listFrom(invoicesRes.value, ["invoices"]) : []);
    } catch (error) {
      console.warn("Clients page load failed", error);
    } finally { setLoading(false); }
  }, [get]);
  React.useEffect(() => { load(); }, [load]);

  async function refreshFromSlip() { setBusy(true); try { await load(); } finally { setBusy(false); } }

  const needsContact = clients.filter((client) => !emailOf(client) || !phoneOf(client));
  const missingAddress = clients.filter((client) => !addressOf(client));
  const archived = clients.filter((client) => rawStatus(client).includes("archiv") || rawStatus(client).includes("inactive"));
  const selectedRelated = selectedClient ? { jobs: jobs.filter((item) => matchClient(item, selectedClient)), quotes: quotes.filter((item) => matchClient(item, selectedClient)), invoices: invoices.filter((item) => matchClient(item, selectedClient)) } : { jobs: [], quotes: [], invoices: [] };

  return <main className={industrialPageShell} data-industrial-simple-page="clients" data-command-canvas><section className={`${industrialContentLane} space-y-5`}><section className="relative overflow-hidden rounded-[30px] border border-white/10 p-5 pl-8 text-white md:p-7 md:pl-9" style={tileStyle}><SecurityTape color="#22d3ee" /><span className={industrialChip}>Clients</span><h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Client timeline, jobs, quotes and invoices in one slip.</h1><p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Tap a client to review their details and prepare the next job, quote, or invoice without leaving the board.</p><div className="mt-5 flex flex-wrap gap-3"><Link to="/clients/new" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>Add client</Link><button type="button" onClick={load} className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Refresh clients</button><Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link></div></section><section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total clients" value={clients.length} text="All client records in this business." color="#22d3ee" /><MetricCard label="Needs contact" value={needsContact.length} text="Missing phone or email details." color="#fb923c" /><MetricCard label="Needs address" value={missingAddress.length} text="Missing site or billing address." color="#facc15" /><MetricCard label="Inactive" value={archived.length} text="Archived or inactive client records." color="#a78bfa" /></section><section className="rounded-[30px] border border-white/10 p-5 text-white md:p-6" style={tileStyle}><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Client list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Tap a client to review it</h2></div>{loading ? <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">Loading…</span> : <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">{clients.length} clients</span>}</div>{clients.length ? <div className="grid gap-3">{clients.map((client, index) => <ClientRow key={idOf(client) || `${nameOf(client)}-${index}`} client={client} onOpen={setSelectedClient} />)}</div> : <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-5"><h3 className="text-2xl font-black tracking-[-0.05em] text-white">No clients showing yet.</h3><p className="mt-2 text-sm font-bold leading-6 text-slate-300">Add the first client and Churvox will keep their contact details, jobs, quotes and invoices easier to review.</p><Link to="/clients/new" className={`mt-4 inline-flex rounded-2xl px-5 py-3 text-sm font-black no-underline ${industrialAction}`}>Add client</Link></div>}</section></section><ClientSlip client={selectedClient} related={selectedRelated} busy={busy} onClose={() => setSelectedClient(null)} onRefresh={refreshFromSlip} api={api} /></main>;
}
