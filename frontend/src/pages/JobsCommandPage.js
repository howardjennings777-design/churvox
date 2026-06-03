import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useApi } from "../hooks/useApi";

const navGroups = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"], ["AI Operator", "/ai-operator", "AI"], ["Approvals", "/ai-operator/approvals", "OK"], ["Notifications", "/notifications", "NT"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Dispatch", "/dispatch", "DP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"], ["Money Desk", "/money-desk", "$"]] },
  { title: "Crew & Admin", items: [["Team", "/team", "TM"], ["Crew Ops", "/crew-ops", "CO"], ["Payroll", "/payroll", "PR"], ["Reports", "/reports", "RP"]] },
  { title: "System", items: [["Setup", "/onboarding", "SU"], ["Trade Presets", "/trade-presets", "TP"], ["Automation", "/automation", "AU"], ["Integrations", "/integrations", "IN"], ["Operator Tools", "/operator-tools", "OT"], ["Plans", "/plans", "PL"], ["Billing", "/billing-confidence", "BI"], ["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

const sampleJobs = [
  { id: "sample-1", title: "Rental lawn service", client_name: "Green Street Rentals", address: "24 Smith Street", status: "in_progress", scheduled_at: "Today 8:30", assigned_worker_name: "Mike", priority: "Today" },
  { id: "sample-2", title: "Hedge trim and cleanup", client_name: "Sarah Williams", address: "11 King Road", status: "assigned", scheduled_at: "Today 3:00", assigned_worker_name: "Tane", priority: "Ready" },
  { id: "sample-3", title: "Quote visit", client_name: "ECB Property Maintenance", address: "Rental block", status: "unassigned", scheduled_at: "Tomorrow", assigned_worker_name: "", priority: "Needs worker" },
  { id: "sample-4", title: "Garden tidy", client_name: "Wilson Family", address: "7 Valley Lane", status: "completed", scheduled_at: "Yesterday", assigned_worker_name: "Jo", priority: "Needs invoice" },
];

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/money-desk") return pathname === "/money-desk" || pathname === "/money";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function asArray(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function jobId(job) {
  const raw = job?.id || job?._id || job?.job_id || "";
  if (typeof raw === "object" && raw.$oid) return raw.$oid;
  return String(raw || "");
}

function jobTitle(job) {
  return job?.title || job?.job_name || job?.name || job?.service_type || "Untitled job";
}

function clientName(job) {
  return job?.client_name || job?.customer_name || job?.client?.name || "No client saved";
}

function workerName(job) {
  return job?.assigned_worker_name || job?.worker_name || job?.worker?.name || "Unassigned";
}

function scheduleLabel(job) {
  return job?.scheduled_at || job?.schedule_date || job?.start_time || job?.date || "No time set";
}

function statusOf(job) {
  return String(job?.status || job?.job_status || "unassigned").toLowerCase().replaceAll(" ", "_");
}

function prettyStatus(status) {
  return String(status || "unassigned").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function statusStyle(status) {
  if (["completed", "complete", "done"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (["in_progress", "started", "active"].includes(status)) return "border-blue-200 bg-blue-50 text-blue-800";
  if (["paused"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-800";
  if (["unassigned", "new", "pending"].includes(status)) return "border-orange-200 bg-orange-50 text-orange-800";
  return "border-slate-200 bg-slate-100 text-slate-700";
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
                return (
                  <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-[10px] font-black ${active ? "bg-slate-950 text-white" : "bg-white/10 text-cyan-200"}`}>{icon}</span>
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}
      </div>
    </aside>
  );
}

function JobCard({ job, onOpen }) {
  const status = statusOf(job);
  const id = jobId(job);
  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{scheduleLabel(job)}</span>
          <h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950">{jobTitle(job)}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusStyle(status)}`}>{prettyStatus(status)}</span>
      </div>
      <div className="mt-3 space-y-1 text-sm font-bold text-slate-600">
        <div>{clientName(job)}</div>
        <div className="text-slate-400">{job?.address || job?.site_address || "No address saved"}</div>
        <div className="text-slate-500">Worker: {workerName(job)}</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpen(job)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Review slip</button>
        {id && !id.startsWith("sample-") ? <Link to={`/jobs/${id}`} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700" style={{ display: 'none' }}>Job record</Link> : <Link to="/jobs/new" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Create real job</Link>}
      </div>
    </article>
  );
}

function JobSlip({ job, onClose }) {
  if (!job) return null;
  const id = jobId(job);
  const status = statusOf(job);
  return (
    <div className="fixed inset-0 z-[2147483647] bg-slate-950/65 p-3 backdrop-blur-sm md:p-7" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full max-w-[680px] flex-col overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.40)]">
        <header className="relative overflow-hidden border-b border-slate-800 bg-slate-950 p-6 text-white md:p-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Job Work Slip</div>
              <h2 className="mt-4 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-5xl">{jobTitle(job)}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">Close</button>
          </div>
          <p className="relative mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-300">{clientName(job)} · {job?.address || job?.site_address || "No address saved"}</p>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f4f6f8] p-5 md:p-6">
          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">What needs attention</div>
            <p className="mt-3 text-lg font-black tracking-[-0.035em] text-slate-950">Status: {prettyStatus(status)}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Scheduled</div><div className="mt-1 text-sm font-black text-slate-950">{scheduleLabel(job)}</div></div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Worker</div><div className="mt-1 text-sm font-black text-slate-950">{workerName(job)}</div></div>
            </div>
          </section>
          <section className="mt-4 rounded-[26px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Next best action</div>
            <p className="mt-2 text-sm font-bold leading-6 text-amber-950">{status === "unassigned" ? "Assign this job from Dispatch or open the job record." : status === "completed" ? "Review the completed work and create the invoice if ready." : "Open the job record to update details, notes, worker, timing, or status."}</p>
          </section>
        </main>
        <footer className="flex flex-wrap gap-3 border-t border-slate-200 bg-white p-5">
          {id && !id.startsWith("sample-") ? <Link to={`/jobs/${id}`} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Open job record</Link> : <Link to="/jobs/new" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Create real job</Link>}
          <Link to="/dispatch" className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">Open dispatch</Link>
        </footer>
      </div>
    </div>
  );
}

function JobsCommandContent() {
  const { get } = useApi();
  const [jobs, setJobs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [activeJob, setActiveJob] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    async function loadJobs() {
      setLoading(true);
      const res = await get("/jobs");
      if (!alive) return;
      if (res?.success) {
        setJobs(asArray(res));
        setError("");
      } else {
        setError(res?.error || "Could not load jobs");
        setJobs([]);
      }
      setLoading(false);
    }
    loadJobs();
    return () => { alive = false; };
  }, [get]);

  const list = jobs.length ? jobs : sampleJobs;
  const counts = React.useMemo(() => {
    const total = list.length;
    const unassigned = list.filter((job) => ["unassigned", "new", "pending"].includes(statusOf(job))).length;
    const active = list.filter((job) => ["in_progress", "started", "active", "assigned"].includes(statusOf(job))).length;
    const completed = list.filter((job) => ["completed", "complete", "done"].includes(statusOf(job))).length;
    return { total, unassigned, active, completed };
  }, [list]);

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#eef1f4] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 p-4 md:p-6 xl:p-8">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Jobs Command</div><div className="text-sm font-bold text-slate-500">See what needs assigning, what is moving, and what needs review.</div></div>
            <div className="flex flex-wrap gap-3"><Link to="/dispatch" className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Dispatch</Link><Link to="/jobs/new" className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400">Create job</Link></div>
          </header>

          <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]">
              <div className="relative p-6 md:p-8">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="relative">
                  <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Jobs Command</span>
                  <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Every job needs a clear next move.</h1>
                  <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Unassigned jobs go to dispatch. Active jobs stay visible. Completed jobs move toward review and invoice. No job should feel lost.</p>
                </div>
              </div>
            </div>
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Job health</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">What needs attention</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4"><div className="text-2xl font-black text-orange-800">{counts.unassigned}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-orange-700">Need worker</div></div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="text-2xl font-black text-blue-800">{counts.active}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Assigned or active</div></div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-2xl font-black text-emerald-800">{counts.completed}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Completed</div></div>
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Total jobs</div><div className="mt-3 text-3xl font-black tracking-[-0.06em]">{counts.total}</div></div>
            <div className="rounded-[22px] border border-orange-200 bg-orange-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-700">Needs dispatch</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-orange-900">{counts.unassigned}</div></div>
            <div className="rounded-[22px] border border-blue-200 bg-blue-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">In motion</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-blue-900">{counts.active}</div></div>
            <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Ready to review</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-emerald-900">{counts.completed}</div></div>
          </section>

          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Job list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">Open jobs</h2></div>{loading && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Loading…</span>}{error && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Showing sample layout</span>}</div>
            <div className="grid gap-4 xl:grid-cols-2">
              {list.map((job) => <JobCard key={jobId(job) || jobTitle(job)} job={job} onOpen={setActiveJob} />)}
            </div>
          </section>
        </section>
      </div>
      <JobSlip job={activeJob} onClose={() => setActiveJob(null)} />
    </main>
  );
}

export default function JobsCommandPage() {
  if (typeof document === "undefined") return <JobsCommandContent />;
  return createPortal(<JobsCommandContent />, document.body);
}
