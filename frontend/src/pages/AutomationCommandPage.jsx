import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useApi } from "../hooks/useApi";

const navGroups = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"], ["AI Operator", "/ai-operator", "AI"], ["Notifications", "/notifications", "NT"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Dispatch", "/dispatch", "DP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"], ["Money Desk", "/money-desk", "$"]] },
  { title: "Crew & Admin", items: [["Team", "/team", "TM"], ["Crew Ops", "/crew-ops", "CO"], ["Payroll", "/payroll", "PR"], ["Reports", "/reports", "RP"]] },
  { title: "System", items: [["Setup", "/onboarding", "SU"], ["Trade Presets", "/trade-presets", "TP"], ["Automation", "/automation", "AU"], ["Integrations", "/integrations", "IN"], ["Operator Tools", "/operator-tools", "OT"], ["Plans", "/plans", "PL"], ["Billing", "/billing-confidence", "BI"], ["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

const guardrails = [
  "No customer message sends without owner approval.",
  "No payroll, tax, legal or accounting changes are performed automatically.",
  "No deletes, customer charges or MYOB writes without explicit owner action.",
  "Automation prepares work and sends owners to the real record.",
];

const sampleRules = [
  { key: "completed-job-invoice", title: "Completed job → draft invoice", type: "invoice", status: "ready", summary: "When a job is completed, Churvox prepares invoice wording and sends it to approval." },
  { key: "quote-follow-up", title: "Quiet quote → follow-up draft", type: "quote", status: "ready", summary: "When a quote has no reply, Churvox prepares a polite follow-up message." },
  { key: "overdue-invoice", title: "Overdue invoice → reminder draft", type: "money", status: "ready", summary: "When money is overdue, Churvox prepares a reminder for owner approval." },
  { key: "unassigned-job", title: "Unassigned job → worker match", type: "dispatch", status: "ready", summary: "When a job has no worker, Churvox suggests the best available crew member." },
];

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/money-desk") return pathname === "/money-desk" || pathname === "/money";
  if (href === "/automation") return pathname === "/automation" || pathname.startsWith("/automation/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function arr(value) {
  const data = value?.data ?? value;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.quotes)) return data.quotes;
  if (Array.isArray(data?.invoices)) return data.invoices;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function statusOf(record) {
  return String(record?.status || record?.job_status || record?.payment_status || "").toLowerCase().replaceAll(" ", "_");
}

function isComplete(job) {
  const status = statusOf(job);
  return status.includes("complete") || status.includes("done");
}

function isOpen(record) {
  return !["completed", "complete", "done", "paid", "cancelled", "canceled"].includes(statusOf(record));
}

function isUnassigned(job) {
  return isOpen(job) && !(job?.assigned_worker_id || job?.worker_id || job?.assigned_to || job?.assigned_worker_name || job?.worker_name);
}

function isUnpaid(invoice) {
  const status = statusOf(invoice);
  const due = Number(invoice?.amount_due || invoice?.balance_due || invoice?.outstanding || 0);
  return !status.includes("paid") && (due > 0 || Number(invoice?.total || invoice?.amount || 0) > 0);
}

function pretty(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function ruleStyle(rule) {
  const status = String(rule?.status || "ready").toLowerCase();
  if (["active", "ready", "enabled"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (["draft", "paused", "review"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-800";
  if (["blocked", "error"].includes(status)) return "border-red-200 bg-red-50 text-red-800";
  return "border-blue-200 bg-blue-50 text-blue-800";
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

function RuleCard({ rule, onOpen }) {
  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{pretty(rule.type || "automation")}</span>
          <h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950">{rule.title}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${ruleStyle(rule)}`}>{pretty(rule.status || "ready")}</span>
      </div>
      <p className="mt-3 text-sm font-bold leading-6 text-slate-600">{rule.summary}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpen(rule)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Open slip</button>
        <Link to="/ai-operator" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Approval queue</Link>
      </div>
    </article>
  );
}

function AutomationSlip({ rule, onClose }) {
  if (!rule) return null;
  return (
    <div className="fixed inset-0 z-[2147483647] bg-slate-950/65 p-3 backdrop-blur-sm md:p-7" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full max-w-[700px] flex-col overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.40)]">
        <header className="relative overflow-hidden border-b border-slate-800 bg-slate-950 p-6 text-white md:p-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Automation Work Slip</div>
              <h2 className="mt-4 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-5xl">{rule.title}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">Close</button>
          </div>
          <p className="relative mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-300">{pretty(rule.type || "automation")} · {pretty(rule.status || "ready")}</p>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f4f6f8] p-5 md:p-6">
          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">What Churvox prepares</div>
            <p className="mt-3 text-lg font-black tracking-[-0.035em] text-slate-950">{rule.summary}</p>
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-950">Automation prepares admin work and points the owner to approval. It does not secretly send, charge, delete, pay, or alter accounting records.</div>
          </section>
          <section className="mt-4 rounded-[26px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Guardrails</div>
            <div className="mt-4 space-y-3">{guardrails.map((item) => <div key={item} className="rounded-2xl border border-amber-200 bg-white/70 px-4 py-3 text-sm font-bold text-amber-950">{item}</div>)}</div>
          </section>
        </main>

        <footer className="flex flex-wrap gap-3 border-t border-slate-200 bg-white p-5">
          <Link to="/ai-operator" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Open approval queue</Link>
          <Link to="/dashboard" className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">Command Board</Link>
        </footer>
      </div>
    </div>
  );
}

function AutomationCommandContent() {
  const { get } = useApi();
  const [records, setRecords] = React.useState({ jobs: [], quotes: [], invoices: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [activeRule, setActiveRule] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      const [jobsRes, quotesRes, invoicesRes] = await Promise.all([get("/jobs"), get("/quotes"), get("/invoices")]);
      if (!alive) return;
      setRecords({ jobs: jobsRes?.success ? arr(jobsRes) : [], quotes: quotesRes?.success ? arr(quotesRes) : [], invoices: invoicesRes?.success ? arr(invoicesRes) : [] });
      if (!jobsRes?.success && !quotesRes?.success && !invoicesRes?.success) setError("Could not load automation data");
      else setError("");
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [get]);

  const counts = React.useMemo(() => {
    const completedJobs = records.jobs.filter(isComplete).length;
    const unassignedJobs = records.jobs.filter(isUnassigned).length;
    const unpaidInvoices = records.invoices.filter(isUnpaid).length;
    const acceptedQuotes = records.quotes.filter((quote) => ["accepted", "approved", "won"].includes(statusOf(quote))).length;
    return { completedJobs, unassignedJobs, unpaidInvoices, acceptedQuotes, ready: completedJobs + unassignedJobs + unpaidInvoices + acceptedQuotes };
  }, [records]);

  const rules = sampleRules.map((rule) => ({
    ...rule,
    status: rule.key === "completed-job-invoice" && counts.completedJobs ? "ready" : rule.key === "unassigned-job" && counts.unassignedJobs ? "ready" : rule.key === "overdue-invoice" && counts.unpaidInvoices ? "ready" : rule.key === "quote-follow-up" && counts.acceptedQuotes ? "ready" : "watching",
  }));

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#eef1f4] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 md:pb-28 xl:p-8 xl:pb-28">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Automation Command</div><div className="text-sm font-bold text-slate-500">Rules that prepare admin work and send it to approval.</div></div>
            <div className="flex flex-wrap gap-3"><Link to="/ai-operator" className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Approval queue</Link><Link to="/operator-tools" className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400">Operator tools</Link></div>
          </header>

          <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]">
              <div className="relative p-6 md:p-8"><div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" /><div className="relative"><span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Automation Command</span><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Automate the prep, not the risky decision.</h1><p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Churvox watches jobs, quotes and invoices, prepares the admin, then waits for owner approval before action.</p></div></div>
            </div>
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Automation health</div><h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">What needs attention</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="text-2xl font-black text-amber-800">{counts.ready}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Prepared opportunities</div></div><div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="text-2xl font-black text-blue-800">{counts.unassignedJobs}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Dispatch chances</div></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-2xl font-black text-emerald-800">{counts.completedJobs}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Invoice chances</div></div></div>
            </div>
          </section>

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Rules</div><div className="mt-3 text-3xl font-black tracking-[-0.06em]">{rules.length}</div></div>
            <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Completed jobs</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-emerald-900">{counts.completedJobs}</div></div>
            <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Unpaid</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-amber-900">{counts.unpaidInvoices}</div></div>
            <div className="rounded-[22px] border border-blue-200 bg-blue-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Quotes</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-blue-900">{counts.acceptedQuotes}</div></div>
          </section>

          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Automation rules</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">Owner-safe rules</h2></div>{loading && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Loading…</span>}{error && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Showing layout</span>}</div>
            <div className="grid gap-4 xl:grid-cols-2">{rules.map((rule) => <RuleCard key={rule.key} rule={rule} onOpen={setActiveRule} />)}</div>
          </section>
        </section>
      </div>
      <AutomationSlip rule={activeRule} onClose={() => setActiveRule(null)} />
    </main>
  );
}

export default function AutomationCommandPage() {
  if (typeof document === "undefined") return <AutomationCommandContent />;
  return createPortal(<AutomationCommandContent />, document.body);
}
