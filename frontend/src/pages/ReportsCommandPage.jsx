import React from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { industrialAction, industrialChip, industrialContentLane, industrialGhost, industrialPageShell } from "../components/industrialCommandTheme";

const tileStyle = {
  background: "linear-gradient(135deg, #111827, #070d16)",
  color: "#ffffff",
  boxShadow: "0 18px 46px rgba(2,6,23,.26), inset 0 1px 0 rgba(255,255,255,.06)",
};

function first(...values) { return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || ""; }
function listFrom(res, keys) { const data = res?.data ?? res; if (Array.isArray(data)) return data; for (const key of keys) if (Array.isArray(data?.[key])) return data[key]; return []; }
function rawStatus(item) { return String(first(item?.status, item?.job_status, item?.invoice_status, item?.quote_status, "")).toLowerCase(); }
function isDone(job) { const s = rawStatus(job); return s.includes("complete") || s.includes("done") || s.includes("finished"); }
function isActive(job) { const s = rawStatus(job); return s.includes("progress") || s.includes("active") || s.includes("start"); }
function isPaid(invoice) { return rawStatus(invoice).includes("paid"); }
function isOverdue(invoice) { return rawStatus(invoice).includes("overdue") || Number(invoice?.days_overdue || 0) > 0; }
function isAccepted(quote) { const s = rawStatus(quote); return s.includes("accept") || s.includes("approved") || s.includes("won"); }
function moneyValue(item) { return Number(first(item?.total, item?.amount_due, item?.balance_due, item?.amount, item?.price, item?.subtotal, item?.invoice_total, item?.quote_total, 0)) || 0; }
function money(value) { const n = Number(value || 0); return Number.isFinite(n) ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00"; }
function percent(part, total) { const n = Number(total || 0); return n > 0 ? `${Math.round((Number(part || 0) / n) * 100)}%` : "0%"; }
function Tape({ color = "#22d3ee" }) { return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[26px]" style={{ background: `linear-gradient(180deg, ${color}, #facc15)`, boxShadow: `0 0 18px ${color}66` }} />; }
function Metric({ label, value, text, color }) { return <article className="relative overflow-hidden rounded-[28px] border border-white/10 p-5 pl-7 text-white" style={tileStyle}><Tape color={color} /><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{label}</div><div className="mt-3 text-4xl font-black tracking-[-0.07em] text-white">{value}</div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{text}</p></article>; }
function Detail({ label, value }) { return <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{label}</div><div className="mt-2 text-sm font-black leading-6 text-white">{String(value || "Not saved")}</div></div>; }

function exportCsv(rows) {
  const header = ["Report", "Value", "Note"];
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `churvox-report-summary-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportSlip({ report, approved, onClose, onApprove }) {
  if (!report) return null;
  return (
    <div className="fixed inset-0 z-[2147483600] overflow-y-auto bg-slate-950/92 p-3 text-white backdrop-blur-xl md:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl md:min-h-[calc(100vh-48px)]">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7"><div><div className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Report slip</div><h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white md:text-6xl">{report.title}</h2><p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300 md:text-base">{report.summary}</p></div><button type="button" onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button></header>
        <div className="grid flex-1 gap-5 p-5 md:grid-cols-[1.15fr_.85fr] md:p-7">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Review report numbers</div><div className="mt-4 grid gap-3 md:grid-cols-2">{report.details.map(([label, value]) => <Detail key={label} label={label} value={value} />)}</div></section>
          <aside className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Owner action</div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">Use this as a review and export view. It is not tax, legal or accounting advice, and it does not submit anything externally.</p>{approved ? <div className="mt-4 rounded-3xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm font-black text-emerald-100">Approved. This report slip is marked reviewed.</div> : null}<div className="mt-5 grid gap-3"><button type="button" onClick={onApprove} className="rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black text-slate-950">Approve slip</button><button type="button" onClick={() => exportCsv(report.details.map(([a, b]) => [a, b, report.title]))} className="rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-950">Export this report</button><button type="button" onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Back to reports</button></div></aside>
        </div>
      </div>
    </div>
  );
}
function ReportRow({ report, onOpen }) {
  return <button type="button" onClick={() => onOpen(report)} className="relative w-full overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.06] p-4 pl-7 text-left text-white transition hover:border-cyan-300/40 hover:bg-white/[0.09] active:scale-[0.99]"><Tape color={report.color} /><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xl font-black tracking-[-0.05em] text-white">{report.title}</h3><p className="mt-1 line-clamp-1 text-sm font-bold leading-6 text-slate-300">{report.summary}</p></div><span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white ring-1 ring-white/10">Review</span></div></button>;
}

export default function ReportsCommandPage() {
  const { get } = useApi();
  const [jobs, setJobs] = React.useState([]);
  const [invoices, setInvoices] = React.useState([]);
  const [quotes, setQuotes] = React.useState([]);
  const [team, setTeam] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedReport, setSelectedReport] = React.useState(null);
  const [approved, setApproved] = React.useState({});

  React.useEffect(() => { let alive = true; async function loadReports() { try { setLoading(true); const [jobRes, invoiceRes, quoteRes, teamRes] = await Promise.allSettled([get("/jobs"), get("/invoices"), get("/quotes"), get("/team/workers")]); if (!alive) return; setJobs(jobRes.status === "fulfilled" ? listFrom(jobRes.value, ["jobs", "items", "results", "data"]) : []); setInvoices(invoiceRes.status === "fulfilled" ? listFrom(invoiceRes.value, ["invoices", "items", "results", "data"]) : []); setQuotes(quoteRes.status === "fulfilled" ? listFrom(quoteRes.value, ["quotes", "items", "results", "data"]) : []); setTeam(teamRes.status === "fulfilled" ? listFrom(teamRes.value, ["workers", "team", "users", "items", "results", "data"]) : []); } finally { if (alive) setLoading(false); } } loadReports(); return () => { alive = false; }; }, [get]);

  const completedJobs = jobs.filter(isDone).length;
  const activeJobs = jobs.filter(isActive).length;
  const paidInvoices = invoices.filter(isPaid).length;
  const overdueInvoices = invoices.filter(isOverdue).length;
  const unpaidTotal = invoices.filter((invoice) => !isPaid(invoice)).reduce((sum, invoice) => sum + moneyValue(invoice), 0);
  const invoiceTotal = invoices.reduce((sum, invoice) => sum + moneyValue(invoice), 0);
  const acceptedQuotes = quotes.filter(isAccepted).length;
  const teamActive = team.filter((member) => !String(first(member?.status, "active")).toLowerCase().includes("inactive")).length;

  const reports = [
    { id: "jobs", title: "Job activity", color: "#22d3ee", summary: `${completedJobs} completed · ${activeJobs} active · ${jobs.length} total jobs`, details: [["Total jobs", jobs.length], ["Completed jobs", completedJobs], ["Active jobs", activeJobs], ["Completion rate", percent(completedJobs, jobs.length)]] },
    { id: "invoices", title: "Invoice health", color: "#34d399", summary: `${paidInvoices} paid · ${overdueInvoices} overdue · ${money(unpaidTotal)} unpaid`, details: [["Total invoices", invoices.length], ["Paid invoices", paidInvoices], ["Overdue invoices", overdueInvoices], ["Invoice total", money(invoiceTotal)], ["Unpaid total", money(unpaidTotal)]] },
    { id: "quotes", title: "Quote performance", color: "#facc15", summary: `${acceptedQuotes} accepted · ${quotes.length} total quotes`, details: [["Total quotes", quotes.length], ["Accepted quotes", acceptedQuotes], ["Acceptance rate", percent(acceptedQuotes, quotes.length)]] },
    { id: "team", title: "Team snapshot", color: "#a78bfa", summary: `${teamActive} active people · ${team.length} total records`, details: [["Total team records", team.length], ["Active people", teamActive], ["Inactive people", Math.max(team.length - teamActive, 0)]] },
  ];

  const selectedId = selectedReport?.id || "current";

  return (
    <main className={industrialPageShell} data-industrial-simple-page="reports" data-command-canvas>
      <section className={`${industrialContentLane} space-y-5`}>
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 p-5 pl-8 text-white md:p-7 md:pl-9" style={tileStyle}><Tape color="#22d3ee" /><span className={industrialChip}>Reports</span><h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Simple business reports you can review and export.</h1><p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Reports should show what happened, what needs attention, and what can be handed off. No fake charts, no tax decisions, no confusing dashboards.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => exportCsv(reports.flatMap((report) => report.details.map(([a, b]) => [a, b, report.title])))} className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>Export reports CSV</button><Link to="/payroll" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Payroll</Link><Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link></div></section>
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Metric label="Jobs" value={loading ? "…" : jobs.length} text="Total jobs in reporting view." color="#22d3ee" /><Metric label="Unpaid" value={loading ? "…" : money(unpaidTotal)} text="Invoice value not marked paid." color="#fb923c" /><Metric label="Quotes" value={loading ? "…" : quotes.length} text="Quote records counted." color="#facc15" /><Metric label="Team" value={loading ? "…" : teamActive} text="Active people in the business." color="#a78bfa" /></section>
        <section className="rounded-[30px] border border-white/10 p-5 text-white md:p-6" style={tileStyle}><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Report list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Tap a report to review it</h2></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">{loading ? "Loading…" : `${reports.length} reports`}</span></div><div className="grid gap-3">{reports.map((report) => <ReportRow key={report.id} report={report} onOpen={setSelectedReport} />)}</div></section>
      </section>
      <ReportSlip report={selectedReport} approved={Boolean(approved[selectedId])} onClose={() => setSelectedReport(null)} onApprove={() => setApproved((prev) => ({ ...prev, [selectedId]: true }))} />
    </main>
  );
}
