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

function first(...values) { return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || ""; }
function listFrom(res, keys = []) { const data = res?.data ?? res; if (Array.isArray(data)) return data; for (const key of [...keys, "clients", "customers", "jobs", "invoices", "quotes", "workers", "team", "users", "items", "results", "data"]) if (Array.isArray(data?.[key])) return data[key]; return []; }
function normId(value) { if (!value) return ""; if (typeof value === "object") return String(value.$oid || value.oid || value.id || value._id || ""); const text = String(value || ""); return text === "[object Object]" ? "" : text; }
function idOf(item) { return normId(item?.id || item?._id || item?.client_id || item?.job_id || item?.quote_id || item?.invoice_id || item?.user_id || item?.worker_id || ""); }
function rawStatus(item) { return String(first(item?.status, item?.job_status, item?.invoice_status, item?.quote_status, "")).toLowerCase(); }
function isDone(job) { const s = rawStatus(job); return s.includes("complete") || s.includes("done") || s.includes("finished") || Boolean(job?.completed_at); }
function isActive(job) { const s = rawStatus(job); return s.includes("progress") || s.includes("active") || s.includes("start") || job?.timer_running === true; }
function isCancelled(item) { return rawStatus(item).includes("cancel"); }
function isPaid(invoice) { return rawStatus(invoice) === "paid" || rawStatus(invoice).includes("paid"); }
function isOverdue(invoice) { if (isPaid(invoice) || isCancelled(invoice)) return false; if (rawStatus(invoice).includes("overdue") || Number(invoice?.days_overdue || 0) > 0) return true; const due = first(invoice?.due_date, invoice?.date_due, invoice?.payment_due); if (!due) return false; const date = new Date(due); return !Number.isNaN(date.getTime()) && date.getTime() < Date.now(); }
function isAccepted(quote) { const s = rawStatus(quote); return s === "accepted" || s.includes("accept"); }
function isSent(quote) { return rawStatus(quote) === "sent"; }
function isDraft(item) { return rawStatus(item) === "draft" || !rawStatus(item); }
function moneyValue(item) { return Number(first(item?.total, item?.amount_due, item?.balance_due, item?.amount, item?.price, item?.subtotal, item?.invoice_total, item?.quote_total, 0)) || 0; }
function money(value) { const n = Number(value || 0); return Number.isFinite(n) ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00"; }
function percent(part, total) { const n = Number(total || 0); return n > 0 ? `${Math.round((Number(part || 0) / n) * 100)}%` : "0%"; }
function formatDate(value) { if (!value) return "Not set"; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" }); }
function clientName(client) { return first(client?.name, client?.client_name, client?.customer_name, client?.company_name, "Unnamed client"); }
function jobTitle(job) { return first(job?.title, job?.job_title, job?.job_name, job?.service_type, "Untitled job"); }
function quoteTitle(quote) { return first(quote?.quote_number, quote?.title, quote?.job_description, "Quote"); }
function invoiceTitle(invoice) { return first(invoice?.invoice_number, invoice?.number, invoice?.title, "Invoice"); }
function workerName(worker) { return first(worker?.name, worker?.full_name, worker?.display_name, worker?.email, "Team member"); }
function emailOf(item) { return first(item?.email, item?.customer_email, item?.client_email, item?.email_address, ""); }
function phoneOf(item) { return first(item?.phone, item?.mobile, item?.customer_phone, ""); }
function addressOf(item) { return first(item?.address, item?.site_address, item?.billing_address, ""); }
function assignedWorker(job) { return first(job?.assigned_worker_name, job?.worker_name, job?.assignee_name, job?.assigned_to_name, job?.assigned_to, "Unassigned"); }
function timeSeconds(job) { return Number(first(job?.net_time_seconds, job?.worked_time_seconds, job?.total_worked_seconds, job?.total_time_seconds, job?.duration_seconds, 0)) || 0; }
function timeHours(job) { const seconds = timeSeconds(job); return seconds > 0 ? seconds / 3600 : Number(first(job?.hours, job?.time_hours, 0)) || 0; }
function openJob(job) { return !isDone(job) && !isCancelled(job); }
function Tape({ color = "#22d3ee" }) { return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[26px]" style={{ background: `linear-gradient(180deg, ${color}, #facc15)`, boxShadow: `0 0 18px ${color}66` }} />; }
function Metric({ label, value, text, color }) { return <article className="relative overflow-hidden rounded-[28px] border border-white/10 p-5 pl-7 text-white" style={tileStyle}><Tape color={color} /><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{label}</div><div className="mt-3 text-4xl font-black tracking-[-0.07em] text-white">{value}</div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{text}</p></article>; }
function Detail({ label, value }) { return <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{label}</div><div className="mt-2 break-words text-sm font-black leading-6 text-white">{String(value || "Not saved")}</div></div>; }

function csvDownload(rows, filename) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
function exportSummaryCsv(reports) { csvDownload([["Report", "Metric", "Value", "Note"], ...reports.flatMap((report) => report.details.map(([metric, value]) => [report.title, metric, value, report.summary]))], "churvox-reports-summary"); }
function exportReportCsv(report) { csvDownload([report.columns, ...report.records], `churvox-${report.id}-report`); }
function recordLink(report, record) {
  if (!record?.id) return null;
  if (report.id === "jobs") return `/jobs/${record.id}`;
  if (report.id === "invoices") return `/invoices/${record.id}`;
  if (report.id === "quotes") return `/quotes/${record.id}`;
  if (report.id === "clients") return `/clients/${record.id}`;
  if (report.id === "team") return `/team-board`;
  return null;
}

function ReportSlip({ report, reviewed, onClose, onReview }) {
  if (!report) return null;
  return <div className="fixed inset-0 z-[2147483600] overflow-y-auto bg-slate-950/92 p-3 text-white backdrop-blur-xl md:p-6" role="dialog" aria-modal="true"><div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl md:min-h-[calc(100vh-48px)]"><header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7"><div><div className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Report action slip</div><h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white md:text-6xl">{report.title}</h2><p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300 md:text-base">{report.summary}</p></div><button type="button" onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button></header><div className="grid flex-1 gap-5 p-5 md:grid-cols-[1.15fr_.85fr] md:p-7"><section className="space-y-5"><section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Review report numbers</div><div className="mt-4 grid gap-3 md:grid-cols-2">{report.details.map(([label, value]) => <Detail key={label} label={label} value={value} />)}</div></section><section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Report records</div><div className="mt-4 grid gap-2">{report.preview.length ? report.preview.map((record, index) => { const href = recordLink(report, record); const card = <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm"><b className="block text-white">{record.title}</b><div className="mt-1 text-slate-300">{record.meta}</div></div>; return href ? <Link key={`${record.id || index}`} to={href} onClick={onClose} className="no-underline">{card}</Link> : <div key={`${record.id || index}`}>{card}</div>; }) : <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm font-black text-slate-300">No records found for this report yet.</div>}</div></section></section><aside className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Report actions</div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">Review and export only. Churvox does not submit tax, legal, accounting, or payroll filings from Reports.</p>{reviewed ? <div className="mt-4 rounded-3xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm font-black text-emerald-100">Reviewed. This report is ready for handoff/export.</div> : null}<div className="mt-5 grid gap-3"><button type="button" onClick={onReview} className="rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black text-slate-950">Mark report reviewed</button><button type="button" onClick={() => exportReportCsv(report)} className="rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-950">Export detailed CSV</button>{report.href ? <Link to={report.href} onClick={onClose} className="rounded-2xl bg-cyan-300 px-5 py-4 text-center text-sm font-black text-slate-950 no-underline">Open source workspace</Link> : null}<button type="button" onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Back to reports</button></div></aside></div></div></div>;
}
function ReportRow({ report, reviewed, onOpen }) { return <button type="button" onClick={() => onOpen(report)} className="relative w-full overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.06] p-4 pl-7 text-left text-white transition hover:border-cyan-300/40 hover:bg-white/[0.09] active:scale-[0.99]"><Tape color={reviewed ? "#34d399" : report.color} /><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xl font-black tracking-[-0.05em] text-white">{report.title}</h3><p className="mt-1 line-clamp-1 text-sm font-bold leading-6 text-slate-300">{report.summary}</p></div><span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${reviewed ? "bg-emerald-300 text-slate-950" : "bg-white/10 text-white ring-1 ring-white/10"}`}>{reviewed ? "Reviewed" : "Review"}</span></div></button>; }

export default function ReportsCommandPage() {
  const { get } = useApi();
  const [jobs, setJobs] = React.useState([]);
  const [invoices, setInvoices] = React.useState([]);
  const [quotes, setQuotes] = React.useState([]);
  const [team, setTeam] = React.useState([]);
  const [clients, setClients] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedReport, setSelectedReport] = React.useState(null);
  const [reviewed, setReviewed] = React.useState(() => { try { return JSON.parse(localStorage.getItem("churvox_reports_reviewed") || "{}"); } catch { return {}; } });

  const loadReports = React.useCallback(async () => {
    setLoading(true);
    try {
      const [jobRes, invoiceRes, quoteRes, teamRes, clientRes] = await Promise.allSettled([get("/jobs"), get("/invoices"), get("/quotes"), get("/team/workers"), get("/clients")]);
      setJobs(jobRes.status === "fulfilled" ? listFrom(jobRes.value, ["jobs"]) : []);
      setInvoices(invoiceRes.status === "fulfilled" ? listFrom(invoiceRes.value, ["invoices"]) : []);
      setQuotes(quoteRes.status === "fulfilled" ? listFrom(quoteRes.value, ["quotes"]) : []);
      setTeam(teamRes.status === "fulfilled" ? listFrom(teamRes.value, ["workers", "team", "users"]) : []);
      setClients(clientRes.status === "fulfilled" ? listFrom(clientRes.value, ["clients", "customers"]) : []);
    } finally { setLoading(false); }
  }, [get]);

  React.useEffect(() => { loadReports(); }, [loadReports]);
  function markReviewed(report) { const next = { ...reviewed, [report.id]: true }; setReviewed(next); localStorage.setItem("churvox_reports_reviewed", JSON.stringify(next)); toast.success("Report marked reviewed"); }

  const completedJobs = jobs.filter(isDone);
  const activeJobs = jobs.filter(isActive);
  const openJobs = jobs.filter(openJob);
  const paidInvoices = invoices.filter(isPaid);
  const overdueInvoices = invoices.filter(isOverdue);
  const unpaidInvoices = invoices.filter((invoice) => !isPaid(invoice) && !isCancelled(invoice));
  const unpaidTotal = unpaidInvoices.reduce((sum, invoice) => sum + moneyValue(invoice), 0);
  const invoiceTotal = invoices.reduce((sum, invoice) => sum + moneyValue(invoice), 0);
  const acceptedQuotes = quotes.filter(isAccepted);
  const sentQuotes = quotes.filter(isSent);
  const draftQuotes = quotes.filter(isDraft);
  const teamActive = team.filter((member) => !String(first(member?.status, "active")).toLowerCase().includes("inactive"));
  const missingClientContact = clients.filter((client) => !emailOf(client) || !phoneOf(client));
  const missingClientAddress = clients.filter((client) => !addressOf(client));
  const jobHours = jobs.reduce((sum, job) => sum + timeHours(job), 0);

  const reports = [
    { id: "jobs", title: "Job activity", href: "/jobs-board", color: "#22d3ee", summary: `${completedJobs.length} completed · ${activeJobs.length} active · ${openJobs.length} open`, details: [["Total jobs", jobs.length], ["Completed jobs", completedJobs.length], ["Open jobs", openJobs.length], ["Active jobs", activeJobs.length], ["Logged hours", `${Math.round(jobHours * 10) / 10}h`], ["Completion rate", percent(completedJobs.length, jobs.length)]], columns: ["Job", "Client", "Worker", "Status", "Scheduled", "Completed", "Hours", "Amount"], records: jobs.map((job) => [jobTitle(job), first(job.client_name, job.customer_name), assignedWorker(job), rawStatus(job), formatDate(first(job.scheduled_date, job.scheduled_at, job.created_at)), formatDate(job.completed_at), Math.round(timeHours(job) * 100) / 100, moneyValue(job)]), preview: openJobs.slice(0, 8).map((job) => ({ id: idOf(job), title: jobTitle(job), meta: `${first(job.client_name, job.customer_name, "No client")} · ${assignedWorker(job)} · ${rawStatus(job) || "ready"}` })) },
    { id: "invoices", title: "Invoice health", href: "/invoices-board", color: "#34d399", summary: `${paidInvoices.length} paid · ${overdueInvoices.length} overdue · ${money(unpaidTotal)} unpaid`, details: [["Total invoices", invoices.length], ["Paid invoices", paidInvoices.length], ["Overdue invoices", overdueInvoices.length], ["Invoice total", money(invoiceTotal)], ["Unpaid total", money(unpaidTotal)], ["Paid rate", percent(paidInvoices.length, invoices.length)]], columns: ["Invoice", "Customer", "Status", "Due", "Total", "Amount due", "Linked job"], records: invoices.map((invoice) => [invoiceTitle(invoice), first(invoice.customer_name, invoice.client_name), rawStatus(invoice), formatDate(invoice.due_date), moneyValue(invoice), Number(first(invoice.amount_due, invoice.balance_due, moneyValue(invoice))) || 0, normId(first(invoice.job_id, invoice.linked_job_id))]), preview: unpaidInvoices.slice(0, 8).map((invoice) => ({ id: idOf(invoice), title: invoiceTitle(invoice), meta: `${first(invoice.customer_name, invoice.client_name, "No customer")} · ${rawStatus(invoice)} · ${money(first(invoice.amount_due, invoice.balance_due, moneyValue(invoice)))}` })) },
    { id: "quotes", title: "Quote performance", href: "/quotes-board", color: "#facc15", summary: `${acceptedQuotes.length} accepted · ${sentQuotes.length} sent · ${quotes.length} total`, details: [["Total quotes", quotes.length], ["Accepted quotes", acceptedQuotes.length], ["Sent quotes", sentQuotes.length], ["Draft quotes", draftQuotes.length], ["Acceptance rate", percent(acceptedQuotes.length, quotes.length)], ["Quote value", money(quotes.reduce((sum, quote) => sum + moneyValue(quote), 0))]], columns: ["Quote", "Customer", "Status", "Value", "Valid until", "Linked job"], records: quotes.map((quote) => [quoteTitle(quote), first(quote.customer_name, quote.client_name), rawStatus(quote), moneyValue(quote), formatDate(quote.valid_until), normId(first(quote.converted_job_id, quote.job_id, quote.linked_job_id))]), preview: [...sentQuotes, ...draftQuotes].slice(0, 8).map((quote) => ({ id: idOf(quote), title: quoteTitle(quote), meta: `${first(quote.customer_name, quote.client_name, "No customer")} · ${rawStatus(quote)} · ${money(moneyValue(quote))}` })) },
    { id: "clients", title: "Client coverage", href: "/clients-board", color: "#fb923c", summary: `${clients.length} clients · ${missingClientContact.length} need contact · ${missingClientAddress.length} need address`, details: [["Total clients", clients.length], ["Need contact", missingClientContact.length], ["Need address", missingClientAddress.length], ["Contact coverage", percent(clients.length - missingClientContact.length, clients.length)], ["Address coverage", percent(clients.length - missingClientAddress.length, clients.length)]], columns: ["Client", "Email", "Phone", "Address", "Status"], records: clients.map((client) => [clientName(client), emailOf(client), phoneOf(client), addressOf(client), first(client.status, "active")]), preview: [...missingClientContact, ...missingClientAddress].slice(0, 8).map((client) => ({ id: idOf(client), title: clientName(client), meta: `${emailOf(client) || "No email"} · ${phoneOf(client) || "No phone"} · ${addressOf(client) || "No address"}` })) },
    { id: "team", title: "Team snapshot", href: "/team-board", color: "#a78bfa", summary: `${teamActive.length} active people · ${team.length} total records`, details: [["Total team records", team.length], ["Active people", teamActive.length], ["Inactive people", Math.max(team.length - teamActive.length, 0)], ["Team activity", `${openJobs.length} open jobs`]], columns: ["Name", "Email", "Role", "Status", "Phone"], records: team.map((member) => [workerName(member), emailOf(member), first(member.role, member.account_type, "worker"), first(member.status, "active"), phoneOf(member)]), preview: team.slice(0, 8).map((member) => ({ id: idOf(member), title: workerName(member), meta: `${first(member.role, "worker")} · ${first(member.status, "active")} · ${emailOf(member)}` })) },
  ];
  const selectedId = selectedReport?.id || "current";

  return <main className={industrialPageShell} data-industrial-simple-page="reports" data-command-canvas><section className={`${industrialContentLane} space-y-5`}><section className="relative overflow-hidden rounded-[30px] border border-white/10 p-5 pl-8 text-white md:p-7 md:pl-9" style={tileStyle}><Tape color="#22d3ee" /><span className={industrialChip}>Reports</span><h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Business reports you can review and export.</h1><p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Reports pull live jobs, invoices, quotes, clients and team data into exportable handoff summaries. No fake charts, no tax decisions, no confusing dashboards.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => exportSummaryCsv(reports)} className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>Export summary CSV</button><button type="button" onClick={loadReports} className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Refresh reports</button><Link to="/payroll-board" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Payroll</Link><Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link></div></section><section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Metric label="Jobs" value={loading ? "…" : jobs.length} text="Total job records in reporting view." color="#22d3ee" /><Metric label="Unpaid" value={loading ? "…" : money(unpaidTotal)} text="Invoice value not marked paid." color="#fb923c" /><Metric label="Quotes" value={loading ? "…" : quotes.length} text="Quote records counted." color="#facc15" /><Metric label="Clients" value={loading ? "…" : clients.length} text="Client records in reporting view." color="#34d399" /></section><section className="rounded-[30px] border border-white/10 p-5 text-white md:p-6" style={tileStyle}><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Report list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Tap a report to review it</h2></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">{loading ? "Loading…" : `${reports.length} reports`}</span></div><div className="grid gap-3">{reports.map((report) => <ReportRow key={report.id} report={report} reviewed={Boolean(reviewed[report.id])} onOpen={setSelectedReport} />)}</div></section></section><ReportSlip report={selectedReport} reviewed={Boolean(reviewed[selectedId])} onClose={() => setSelectedReport(null)} onReview={() => selectedReport && markReviewed(selectedReport)} /></main>;
}
