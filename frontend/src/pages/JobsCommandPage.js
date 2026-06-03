import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import CommandSlipEverything from "../components/CommandSlipEverything";

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
  return job?.client_name || job?.customer_name || job?.client?.name || "No client linked";
}

function workerName(job) {
  return job?.assigned_worker_name || job?.worker_name || job?.worker?.name || "Worker not assigned";
}

function scheduleLabel(job) {
  return job?.scheduled_at || job?.schedule_date || job?.start_time || job?.date || "Unscheduled";
}

function statusOf(job) {
  return String(job?.status || job?.job_status || "unassigned").toLowerCase().replaceAll(" ", "_");
}

function prettyStatus(status) {
  const value = String(status || "unassigned").toLowerCase();
  if (value === "unassigned" || value === "new" || value === "pending") return "Needs assignment";
  if (value === "in_progress" || value === "started" || value === "active") return "In progress";
  if (value === "complete" || value === "done") return "Completed";
  return String(status || "unassigned").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function statusStyle(status) {
  if (["completed", "complete", "done"].includes(status)) return "border-emerald-300/40 bg-emerald-400/15 text-emerald-100";
  if (["in_progress", "started", "active"].includes(status)) return "border-cyan-300/40 bg-cyan-300/15 text-cyan-100";
  if (["assigned"].includes(status)) return "border-blue-300/40 bg-blue-300/15 text-blue-100";
  if (["paused"].includes(status)) return "border-amber-300/40 bg-amber-300/15 text-amber-100";
  if (["unassigned", "new", "pending"].includes(status)) return "border-amber-300/50 bg-amber-300/18 text-amber-100";
  return "border-slate-300/30 bg-white/10 text-slate-100";
}

function actionText(status) {
  if (["unassigned", "new", "pending"].includes(status)) return "Assign this job from Dispatch or open the job record.";
  if (["completed", "complete", "done"].includes(status)) return "Review the completed work and create the invoice if ready.";
  if (["in_progress", "started", "active"].includes(status)) return "Check progress, notes and timing before the job is closed.";
  return "Open the job record to update details, notes, worker, timing or status.";
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
    <article className="rounded-[22px] border border-white/10 bg-white/[0.035] p-4 text-white shadow-[0_14px_38px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/70">{scheduleLabel(job)}</span>
          <h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-white">{jobTitle(job)}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusStyle(status)}`}>{prettyStatus(status)}</span>
      </div>
      <div className="mt-3 space-y-1 text-sm font-bold text-slate-200">
        <div>{clientName(job)}</div>
        <div className="text-slate-300/80">{job?.address || job?.site_address || "No address saved"}</div>
        <div className="text-slate-300/80">{workerName(job)}</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpen(job)} className="rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-sm font-black text-cyan-100 hover:bg-cyan-300/20">Review job</button>
        {id && !id.startsWith("sample-") ? <Link to={`/jobs/${id}`} className="hidden rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200">Open job</Link> : <Link to="/jobs/new" className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200">Create job</Link>}
      </div>
    </article>
  );
}

function JobSlip({ job, onClose }) {
  if (!job) return null;
  const id = jobId(job);
  const status = statusOf(job);
  return (
    <div className="fixed inset-0 z-[2147483647] h-[100dvh] w-screen overflow-hidden bg-[#0f1722] text-slate-950" role="dialog" aria-modal="true">
      <section className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#0f1722]">
        <header className="shrink-0 border-b border-white/10 bg-[#0f1722] px-5 py-5 text-white md:px-9 md:py-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Job review</div>
              <h1 className="mt-3 text-4xl font-black leading-[0.9] tracking-[-0.075em] text-white md:text-6xl">{jobTitle(job)}</h1>
              <p className="mt-3 max-w-5xl text-sm font-bold leading-6 text-slate-300">{clientName(job)} · {job?.address || job?.site_address || "No address saved"}</p>
            </div>
            <button type="button" onClick={onClose} className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/20">Close</button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f5f7f1] p-4 md:p-7">
          <div className="grid min-h-full w-full gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="space-y-5">
              <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600">What needs attention</div>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.06em] text-slate-950">{prettyStatus(status)}</h2>
                <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-black leading-6 text-blue-950">{actionText(status)}</p>
              </section>

              <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Job details</div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Scheduled</div><div className="mt-1 text-sm font-black text-slate-950">{scheduleLabel(job)}</div></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Worker</div><div className="mt-1 text-sm font-black text-slate-950">{workerName(job)}</div></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Status</div><div className="mt-1 text-sm font-black text-slate-950">{prettyStatus(status)}</div></div>
                </div>
              </section>

              <CommandSlipEverything record={job} context="Job review" />
            </div>

            <aside className="rounded-[30px] border border-white/10 bg-[#0f1722] p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.18)] xl:sticky xl:top-0 xl:h-fit">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">Job actions</div>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">Review first.</h2>
              <div className="mt-5 rounded-2xl bg-white/10 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Status</div><div className="mt-2 text-sm font-black text-white">{prettyStatus(status)}</div></div>
              <div className="mt-3 rounded-2xl bg-white/10 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Worker</div><div className="mt-2 text-sm font-black text-white">{workerName(job)}</div></div>
              <div className="mt-5 grid gap-3">
                {id && !id.startsWith("sample-") ? <Link to={`/jobs/${id}`} className="rounded-2xl bg-cyan-300 px-5 py-3 text-center text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200">Open job record</Link> : <Link to="/jobs/new" className="rounded-2xl bg-cyan-300 px-5 py-3 text-center text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200">Create job</Link>}
                <Link to="/dispatch" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-center text-sm font-black text-white hover:bg-white/15">Open dispatch</Link>
                <button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">Back to jobs</button>
              </div>
            </aside>
          </div>
        </main>
      </section>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const styles = {
    dark: "border-white/10 bg-white/[0.045] text-white",
    amber: "border-amber-300/35 bg-amber-300/12 text-amber-100",
    cyan: "border-cyan-300/35 bg-cyan-300/12 text-cyan-100",
    green: "border-emerald-300/35 bg-emerald-300/12 text-emerald-100",
  };

  return (
    <div className={`rounded-[22px] border p-4 shadow-[0_14px_38px_rgba(15,23,42,0.11)] ${styles[tone] || styles.dark}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-75">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-[-0.06em]">{value}</div>
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
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#f5f7f1] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 p-4 md:p-6 xl:p-8">
          <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]">
              <div className="relative p-6 md:p-8">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="relative">
                  <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Jobs</span>
                  <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Every job needs a clear next move.</h1>
                  <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Assign new jobs, keep active work visible, and move completed jobs toward review and invoice. No job should feel lost.</p>
                  <div className="mt-5 flex flex-wrap gap-3"><Link to="/dispatch" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">Open dispatch</Link><Link to="/jobs/new" className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200">Create job</Link></div>
                </div>
              </div>
            </div>
            <div className="rounded-[30px] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Job health</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-white">What needs attention</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <StatCard label="Need assignment" value={counts.unassigned} tone="amber" />
                <StatCard label="Assigned or active" value={counts.active} tone="cyan" />
                <StatCard label="Ready to review" value={counts.completed} tone="green" />
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            <StatCard label="Total jobs" value={counts.total} tone="dark" />
            <StatCard label="Needs assignment" value={counts.unassigned} tone="amber" />
            <StatCard label="In progress" value={counts.active} tone="cyan" />
            <StatCard label="Ready to review" value={counts.completed} tone="green" />
          </section>

          <section className="mt-5 rounded-[28px] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Job list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Open jobs</h2></div>{loading && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-200">Loading…</span>}{error && <span className="rounded-full bg-amber-300/15 px-3 py-1 text-xs font-black text-amber-100">Showing sample layout</span>}</div>
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
