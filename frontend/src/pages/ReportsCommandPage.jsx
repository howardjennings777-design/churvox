import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const navGroups = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"], ["AI Operator", "/ai-operator", "AI"], ["Approvals", "/ai-operator/approvals", "OK"], ["Notifications", "/notifications", "NT"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Dispatch", "/dispatch", "DP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"], ["Money Desk", "/money-desk", "$"]] },
  { title: "Crew & Admin", items: [["Team", "/team", "TM"], ["Crew Ops", "/crew-ops", "CO"], ["Payroll", "/payroll", "PR"], ["Reports", "/reports", "RP"]] },
  { title: "System", items: [["Setup", "/onboarding", "SU"], ["Trade Presets", "/trade-presets", "TP"], ["Automation", "/automation", "AU"], ["Integrations", "/integrations", "IN"], ["Operator Tools", "/operator-tools", "OT"], ["Plans", "/plans", "PL"], ["Billing", "/billing-confidence", "BI"], ["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

const sampleReports = [
  { key: "money", title: "Money report", type: "financial", status: "ready", summary: "Invoices, paid work, overdue money and quote value for the selected period.", href: "/money-desk" },
  { key: "jobs", title: "Job performance", type: "operations", status: "ready", summary: "Completed jobs, active work, unassigned jobs and service activity.", href: "/jobs" },
  { key: "crew", title: "Crew report", type: "team", status: "ready", summary: "Worker workload, job counts, payroll review signals and team activity.", href: "/team" },
  { key: "security", title: "Security and admin", type: "trust", status: "watching", summary: "Role access, data safety notes and owner-level visibility for business records.", href: "/settings" },
];

function today(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/money-desk") return pathname === "/money-desk" || pathname === "/money";
  if (href === "/reports") return pathname === "/reports" || pathname.startsWith("/reports/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.quotes)) return value.quotes;
  if (Array.isArray(value?.invoices)) return value.invoices;
  if (Array.isArray(value?.clients)) return value.clients;
  return [];
}

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00";
}

function statusOf(record) {
  return String(record?.status || record?.payment_status || record?.job_status || "").toLowerCase().replaceAll(" ", "_");
}

function isPaid(invoice) {
  return statusOf(invoice).includes("paid") || (Number(invoice?.amount_due || invoice?.balance_due || 0) <= 0 && Number(invoice?.amount_paid || 0) > 0);
}

function valueOf(record) {
  return Number(record?.total || record?.amount || record?.amount_due || record?.balance_due || record?.price || record?.job_price || 0);
}

function pretty(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function reportStyle(status) {
  if (["ready", "active", "complete"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (["watching", "review", "draft"].includes(status)) return "border-blue-200 bg-blue-50 text-blue-800";
  if (["attention", "warning"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-800";
  if (["blocked", "failed"].includes(status)) return "border-red-200 bg-red-50 text-red-800";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function downloadText(filename, content, type = "text/plain") {
  const blob = new Blob([content || ""], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden w-[292px] shrink-0 overflow-y-auto border-r border-slate-800 bg-[#0f1722] p-4 text-white lg:block">
      <div className="mb-6 flex items-center gap-3 px-1">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500 text-lg font-black text-slate-950">C</div>
        <div><div className="text-sm font-black tracking-[-0.03em]">CHURVOX</div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Command Desk</div></div>
      </div>
      <div className="space-y-5">
        {navGroups.map((group) => (
          <section key={group.title}>
            <div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{group.title}</div>
            <nav className="space-y-1">
              {group.items.map(([label, href, icon]) => {
                const active = isActivePath(pathname, href);
                return <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-[10px] font-black ${active ? "bg-slate-950 text-white" : "bg-white/10 text-cyan-200"}`}>{icon}</span><span className="truncate">{label}</span></Link>;
              })}
            </nav>
          </section>
        ))}
      </div>
    </aside>
  );
}

function ReportCard({ item, onOpen }) {
  const status = String(item.status || "ready").toLowerCase();
  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div><span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{pretty(item.type)}</span><h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950">{item.title}</h3></div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${reportStyle(status)}`}>{pretty(status)}</span>
      </div>
      <p className="mt-3 text-sm font-bold leading-6 text-slate-600">{item.summary}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpen(item)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Review slip</button>
        <Link to={item.href} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Open place</Link>
      </div>
    </article>
  );
}

function ReportSlip({ item, onClose, metrics, onExport }) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-[2147483647] h-[100dvh] w-screen overflow-hidden bg-[#f5f7f1] text-slate-950" role="dialog" aria-modal="true">
      <div className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#f5f7f1]">
        <header className="relative overflow-hidden border-b border-slate-800 bg-slate-950 p-6 text-white md:p-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4"><div><div className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">FULL SCREEN REPORT SLIP</div><h2 className="mt-4 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-5xl">{item.title}</h2></div><button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">Close</button></div>
          <p className="relative mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-300">{pretty(item.type)} · owner-visible summary</p>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f4f6f8] p-5 md:p-6">
          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">What this shows</div><p className="mt-3 text-lg font-black tracking-[-0.035em] text-slate-950">{item.summary}</p><div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-950">Reports are for review and handoff. They do not make tax, legal, accounting or payroll compliance decisions.</div></section>
          <section className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Paid value</div><div className="mt-1 text-sm font-black text-slate-950">{money(metrics.paidValue)}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Outstanding</div><div className="mt-1 text-sm font-black text-slate-950">{money(metrics.outstanding)}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Jobs</div><div className="mt-1 text-sm font-black text-slate-950">{metrics.jobs}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Clients</div><div className="mt-1 text-sm font-black text-slate-950">{metrics.clients}</div></div></section>
        </main>
        <footer className="flex flex-wrap gap-3 border-t border-slate-200 bg-white p-5"><button type="button" onClick={onExport} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Download summary</button><Link to={item.href} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">Open place</Link></footer>
      </div>
    </div>
  );
}

function ReportsCommandContent() {
  const api = useApi();
  const [from, setFrom] = React.useState(today(-30));
  const [to, setTo] = React.useState(today(1));
  const [reports, setReports] = React.useState({});
  const [fallbackData, setFallbackData] = React.useState({ jobs: [], invoices: [], quotes: [], clients: [] });
  const [loading, setLoading] = React.useState(true);
  const [activeReport, setActiveReport] = React.useState(null);

  async function loadReports() {
    setLoading(true);
    const res = await api.get(`/reports/workspace?date_from=${from}&date_to=${to}`);
    if (res?.success) setReports(res.data?.reports || res.data || {});
    else {
      const [jobsRes, invoicesRes, quotesRes, clientsRes] = await Promise.all([api.get("/jobs"), api.get("/invoices"), api.get("/quotes"), api.get("/clients")]);
      setFallbackData({ jobs: arr(jobsRes?.data || jobsRes), invoices: arr(invoicesRes?.data || invoicesRes), quotes: arr(quotesRes?.data || quotesRes), clients: arr(clientsRes?.data || clientsRes) });
      toast.error(res?.error || "Reports workspace unavailable, showing live record summary");
    }
    setLoading(false);
  }

  React.useEffect(() => { loadReports(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const metrics = React.useMemo(() => {
    const jobs = arr(reports.jobs || fallbackData.jobs);
    const invoices = arr(reports.invoices || fallbackData.invoices);
    const quotes = arr(reports.quotes || fallbackData.quotes);
    const clients = arr(reports.clients || fallbackData.clients);
    const paidValue = invoices.filter(isPaid).reduce((sum, invoice) => sum + valueOf(invoice), 0);
    const outstanding = invoices.filter((invoice) => !isPaid(invoice)).reduce((sum, invoice) => sum + valueOf(invoice), 0);
    const completedJobs = jobs.filter((job) => statusOf(job).includes("complete") || statusOf(job).includes("done")).length;
    const openQuotes = quotes.filter((quote) => !["accepted", "approved", "declined", "lost"].includes(statusOf(quote))).length;
    return { jobs: jobs.length, invoices: invoices.length, quotes: quotes.length, clients: clients.length, paidValue, outstanding, completedJobs, openQuotes };
  }, [reports, fallbackData]);

  function exportSummary() {
    const lines = [
      "Churvox report summary",
      `Date range: ${from} to ${to}`,
      `Clients: ${metrics.clients}`,
      `Jobs: ${metrics.jobs}`,
      `Completed jobs: ${metrics.completedJobs}`,
      `Quotes: ${metrics.quotes}`,
      `Open quotes: ${metrics.openQuotes}`,
      `Invoices: ${metrics.invoices}`,
      `Paid value: ${money(metrics.paidValue)}`,
      `Outstanding: ${money(metrics.outstanding)}`,
    ];
    downloadText(`churvox-report-${from}-to-${to}.txt`, lines.join("\n"));
  }

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#eef1f4] text-slate-950">
      <div className="flex min-h-screen"><Sidebar />
        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 md:pb-28 xl:p-8 xl:pb-28">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Reports Command</div><div className="text-sm font-bold text-slate-500">Business summaries, export handoff and owner visibility.</div></div><div className="flex flex-wrap gap-3"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-800" /><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-800" /><button type="button" onClick={loadReports} className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Refresh</button><button type="button" onClick={exportSummary} className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400">Export</button></div></header>
          <section className="grid gap-5 xl:grid-cols-[1fr_430px]"><div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]"><div className="relative p-6 md:p-8"><div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" /><div className="relative"><span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Reports Command</span><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">See the business without digging.</h1><p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Churvox turns jobs, invoices, quotes, clients and crew signals into simple reports owners can review or hand off.</p></div></div></div><div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Report health</div><h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">What needs attention</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-2xl font-black text-emerald-800">{money(metrics.paidValue)}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Paid value</div></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="text-2xl font-black text-amber-800">{money(metrics.outstanding)}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Outstanding</div></div><div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="text-2xl font-black text-blue-800">{metrics.completedJobs}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Completed jobs</div></div></div></div></section>
          <section className="mt-5 grid gap-4 md:grid-cols-4"><div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Clients</div><div className="mt-3 text-3xl font-black tracking-[-0.06em]">{metrics.clients}</div></div><div className="rounded-[22px] border border-blue-200 bg-blue-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Jobs</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-blue-900">{metrics.jobs}</div></div><div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Quotes</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-amber-900">{metrics.quotes}</div></div><div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Invoices</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-emerald-900">{metrics.invoices}</div></div></section>
          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Report list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">Open reports</h2></div>{loading && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Loading…</span>}</div><div className="grid gap-4 xl:grid-cols-2">{sampleReports.map((item) => <ReportCard key={item.key} item={item} onOpen={setActiveReport} />)}</div></section>
        </section>
      </div>
      <ReportSlip item={activeReport} onClose={() => setActiveReport(null)} metrics={metrics} onExport={exportSummary} />
    </main>
  );
}

export default function ReportsCommandPage() {
  if (typeof document === "undefined") return <ReportsCommandContent />;
  return createPortal(<ReportsCommandContent />, document.body);
}
