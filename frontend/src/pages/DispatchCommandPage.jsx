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
  { id: "sample-d1", title: "Lawn service", client_name: "Green Street Rentals", address: "12 Green St", status: "unassigned", scheduled_time: "8:30", region: "North", assigned_worker_name: "" },
  { id: "sample-d2", title: "Rental cleanup", client_name: "ECB Property Maintenance", address: "44 Main Rd", status: "assigned", scheduled_time: "10:00", region: "Central", assigned_worker_name: "Mike" },
  { id: "sample-d3", title: "Quote visit", client_name: "Sarah Williams", address: "9 Hill Lane", status: "needs_worker", scheduled_time: "1:30", region: "South", assigned_worker_name: "" },
  { id: "sample-d4", title: "Hedge trim", client_name: "Wilson Family", address: "7 King St", status: "in_progress", scheduled_time: "3:00", region: "North", assigned_worker_name: "Tane" },
];

const sampleWorkers = [
  { id: "sample-w1", name: "Mike", region: "Central", status: "available", assigned_jobs_count: 2, skills: ["Cleanup", "Photos"] },
  { id: "sample-w2", name: "Tane", region: "North", status: "busy", assigned_jobs_count: 4, skills: ["Lawn care", "Hedges"] },
  { id: "sample-w3", name: "Jo", region: "South", status: "available", assigned_jobs_count: 1, skills: ["Quotes", "Garden tidy"] },
];

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/money-desk") return pathname === "/money-desk" || pathname === "/money";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function arr(value) {
  const data = value?.data ?? value;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.workers)) return data.workers;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function idOf(record) {
  const raw = record?.id || record?._id || record?.job_id || record?.worker_id || record?.user_id || "";
  if (typeof raw === "object" && raw?.$oid) return raw.$oid;
  return String(raw || "");
}

function jobTitle(job) {
  return job?.title || job?.job_title || job?.service_type || job?.description || "Untitled job";
}

function clientName(job) {
  return job?.client_name || job?.customer_name || job?.client?.name || "No client saved";
}

function workerName(worker) {
  return worker?.name || worker?.full_name || worker?.display_name || worker?.email || "Unnamed worker";
}

function statusOf(record) {
  return String(record?.status || record?.availability || "unassigned").toLowerCase().replaceAll(" ", "_");
}

function pretty(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function isUnassigned(job) {
  const status = statusOf(job);
  return !job?.assigned_worker_id && !job?.assigned_worker_name && ["unassigned", "needs_worker", "new", "draft", "scheduled"].includes(status);
}

function workerLoad(worker) {
  return Number(worker?.assigned_jobs_count || worker?.jobs_count || worker?.open_jobs || worker?.active_jobs || 0);
}

function statusStyle(status) {
  if (["completed", "ready", "available"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (["assigned", "in_progress", "busy", "working"].includes(status)) return "border-blue-200 bg-blue-50 text-blue-800";
  if (["unassigned", "needs_worker", "pending"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-800";
  if (["cancelled", "blocked", "overdue"].includes(status)) return "border-red-200 bg-red-50 text-red-800";
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

function recommendWorker(job, workers) {
  const region = String(job?.region || job?.area || "").toLowerCase();
  const sorted = [...workers].sort((a, b) => {
    const aRegion = String(a?.region || a?.area || "").toLowerCase() === region ? -2 : 0;
    const bRegion = String(b?.region || b?.area || "").toLowerCase() === region ? -2 : 0;
    return (aRegion + workerLoad(a)) - (bRegion + workerLoad(b));
  });
  return sorted[0] || null;
}

function DispatchCard({ job, workers, onOpen }) {
  const status = statusOf(job);
  const best = recommendWorker(job, workers);
  const id = idOf(job);
  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{job?.scheduled_time || job?.scheduled_date || "No time set"}</span>
          <h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950">{jobTitle(job)}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusStyle(status)}`}>{pretty(status)}</span>
      </div>
      <div className="mt-3 space-y-1 text-sm font-bold text-slate-600">
        <div>{clientName(job)}</div>
        <div className="text-slate-400">{job?.address || job?.job_address || "No address saved"}</div>
        <div className="text-slate-500">Assigned: {job?.assigned_worker_name || "Not assigned"}</div>
        {isUnassigned(job) && best ? <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-blue-900">AI pick: {workerName(best)} · {best?.region || "region not set"}</div> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpen({ job, worker: best })} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Review slip</button>
        {id && !id.startsWith("sample-") ? <Link to={`/jobs/${id}`} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700" style={{ display: 'none' }}>Review slip</Link> : <Link to="/jobs" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Open jobs</Link>}
      </div>
    </article>
  );
}

function DispatchSlip({ active, onClose }) {
  if (!active?.job) return null;
  const { job, worker } = active;
  const id = idOf(job);
  return (
    <div className="fixed inset-0 z-[2147483647] h-[100dvh] w-screen overflow-hidden bg-[#f5f7f1] text-slate-950" role="dialog" aria-modal="true">
      <div className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#f5f7f1]">
        <header className="relative overflow-hidden border-b border-slate-800 bg-slate-950 p-6 text-white md:p-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Dispatch Work Slip</div>
              <h2 className="mt-4 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-5xl">{jobTitle(job)}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">Close</button>
          </div>
          <p className="relative mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-300">{clientName(job)} · {job?.address || job?.job_address || "No address"}</p>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f4f6f8] p-5 md:p-6">
          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">AI dispatch check</div>
            <p className="mt-3 text-lg font-black tracking-[-0.035em] text-slate-950">Recommended: {worker ? workerName(worker) : "No worker match yet"}</p>
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-950">Review worker workload, region and schedule before assigning. This slip does not auto-assign without owner approval.</div>
          </section>
          <section className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Job region</div><div className="mt-1 text-sm font-black text-slate-950">{job?.region || job?.area || "Not set"}</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Worker load</div><div className="mt-1 text-sm font-black text-slate-950">{worker ? `${workerLoad(worker)} open jobs` : "No worker"}</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Current assignment</div><div className="mt-1 text-sm font-black text-slate-950">{job?.assigned_worker_name || "Unassigned"}</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Scheduled</div><div className="mt-1 text-sm font-black text-slate-950">{job?.scheduled_time || job?.scheduled_date || "Not set"}</div></div>
          </section>
        </main>

        <footer className="flex flex-wrap gap-3 border-t border-slate-200 bg-white p-5">
          {id && !id.startsWith("sample-") ? <Link to={`/jobs/${id}`} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Open job record</Link> : <Link to="/jobs" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Open jobs</Link>}
          <Link to="/team" className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">Open team</Link>
        </footer>
      </div>
    </div>
  );
}

function DispatchCommandContent() {
  const { get } = useApi();
  const [jobs, setJobs] = React.useState([]);
  const [workers, setWorkers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [activeSlip, setActiveSlip] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    async function loadDispatch() {
      setLoading(true);
      const [jobsRes, workersRes] = await Promise.all([get("/jobs"), get("/team/workers")]);
      if (!alive) return;
      if (jobsRes?.success) setJobs(arr(jobsRes)); else { setJobs([]); setError(jobsRes?.error || "Could not load dispatch jobs"); }
      if (workersRes?.success) setWorkers(arr(workersRes)); else setWorkers([]);
      setLoading(false);
    }
    loadDispatch();
    return () => { alive = false; };
  }, [get]);

  const jobList = jobs.length ? jobs : sampleJobs;
  const workerList = workers.length ? workers : sampleWorkers;
  const counts = React.useMemo(() => {
    const total = jobList.length;
    const unassigned = jobList.filter(isUnassigned).length;
    const assigned = jobList.filter((job) => job?.assigned_worker_id || job?.assigned_worker_name || statusOf(job) === "assigned").length;
    const inProgress = jobList.filter((job) => ["in_progress", "started", "working"].includes(statusOf(job))).length;
    const available = workerList.filter((worker) => ["active", "available", "online"].includes(statusOf(worker)) && workerLoad(worker) <= 3).length;
    return { total, unassigned, assigned, inProgress, available };
  }, [jobList, workerList]);

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#eef1f4] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 md:pb-28 xl:p-8 xl:pb-28">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Dispatch Command</div><div className="text-sm font-bold text-slate-500">Unassigned jobs, worker matches, schedule risk and dispatch approvals.</div></div>
            <div className="flex flex-wrap gap-3"><Link to="/jobs" className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Jobs</Link><Link to="/team" className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400">Team</Link></div>
          </header>

          <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]">
              <div className="relative p-6 md:p-8">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="relative"><span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Dispatch Command</span><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Assign the right job to the right worker.</h1><p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Churvox surfaces unassigned jobs, recommends crew by workload and region, then keeps the owner in control before assignment.</p></div>
              </div>
            </div>
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Dispatch health</div><h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">What needs attention</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="text-2xl font-black text-amber-800">{counts.unassigned}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Need assignment</div></div><div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="text-2xl font-black text-blue-800">{counts.inProgress}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">In progress</div></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-2xl font-black text-emerald-800">{counts.available}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Available crew</div></div></div>
            </div>
          </section>

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Jobs</div><div className="mt-3 text-3xl font-black tracking-[-0.06em]">{counts.total}</div></div>
            <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Unassigned</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-amber-900">{counts.unassigned}</div></div>
            <div className="rounded-[22px] border border-blue-200 bg-blue-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Assigned</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-blue-900">{counts.assigned}</div></div>
            <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Crew ready</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-emerald-900">{counts.available}</div></div>
          </section>

          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Dispatch queue</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">Jobs to place</h2></div>{loading && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Loading…</span>}{error && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Showing sample layout</span>}</div>
            <div className="grid gap-4 xl:grid-cols-2">{jobList.map((job) => <DispatchCard key={idOf(job) || jobTitle(job)} job={job} workers={workerList} onOpen={setActiveSlip} />)}</div>
          </section>
        </section>
      </div>
      <DispatchSlip active={activeSlip} onClose={() => setActiveSlip(null)} />
    </main>
  );
}

export default function DispatchCommandPage() {
  if (typeof document === "undefined") return <DispatchCommandContent />;
  return createPortal(<DispatchCommandContent />, document.body);
}
