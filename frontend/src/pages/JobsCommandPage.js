import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useApi } from "../hooks/useApi";

const navGroups = [
  {
    title: "Command",
    items: [
      ["Command Board", "/dashboard", "CB"],
      ["Jobs", "/jobs", "JB"],
      ["Crew Map", "/crew-map", "MP"],
    ],
  },
  {
    title: "Work",
    items: [
      ["Clients", "/clients", "CL"],
      ["Quotes", "/quotes", "QT"],
      ["Invoices", "/invoices", "IV"],
      ["Team", "/team", "TM"],
    ],
  },
  {
    title: "Account",
    items: [
      ["Settings", "/settings", "ST"],
      ["Support", "/support", "?"],
    ],
  },
];

const sampleJobs = [
  {
    id: "sample-1",
    title: "Example lawn service",
    client_name: "Example Client",
    address: "1 Test Street",
    status: "unassigned",
    scheduled_at: "No time set",
    assigned_worker_name: "",
  },
];

function activePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
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

function cleanId(raw) {
  if (!raw) return "";
  if (typeof raw === "object" && raw.$oid) return raw.$oid;
  return String(raw);
}

function jobId(job) {
  return cleanId(job?.id || job?._id || job?.job_id);
}

function jobTitle(job) {
  return job?.title || job?.job_name || job?.name || job?.service_type || "Untitled job";
}

function clientName(job) {
  return job?.client_name || job?.customer_name || job?.client?.name || "No client linked";
}

function jobAddress(job) {
  return job?.job_address || job?.address || job?.site_address || "No address";
}

function workerName(job) {
  return job?.assigned_worker_name || job?.worker_name || job?.worker?.name || "Needs assigning";
}

function scheduleLabel(job) {
  return job?.scheduled_at || job?.schedule_date || job?.start_time || job?.date || "No time set";
}

function statusOf(job) {
  return String(job?.status || job?.job_status || "unassigned").toLowerCase().replaceAll(" ", "_");
}

function prettyStatus(status) {
  if (["unassigned", "new", "pending"].includes(status)) return "Needs worker";
  if (["in_progress", "started", "active"].includes(status)) return "In progress";
  if (status === "assigned") return "Assigned";
  if (status === "paused") return "Paused";
  if (["completed", "complete", "done"].includes(status)) return "Completed";
  if (["cancelled", "canceled"].includes(status)) return "Cancelled";
  return String(status || "Open").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function statusBadge(status) {
  if (["completed", "complete", "done"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (["in_progress", "started", "active"].includes(status)) return "border-blue-200 bg-blue-50 text-blue-800";
  if (status === "paused") return "border-amber-200 bg-amber-50 text-amber-800";
  if (["unassigned", "new", "pending"].includes(status)) return "border-orange-200 bg-orange-50 text-orange-800";
  if (["cancelled", "canceled"].includes(status)) return "border-red-200 bg-red-50 text-red-800";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="hidden w-[270px] shrink-0 border-r border-slate-800 bg-[#0f1722] p-4 text-white lg:block">
      <div className="mb-7 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-300 text-lg font-black text-slate-950">C</div>
        <div>
          <div className="text-sm font-black">CHURVOX</div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">Command Desk</div>
        </div>
      </div>

      <div className="space-y-6">
        {navGroups.map((group) => (
          <section key={group.title}>
            <div className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{group.title}</div>
            <nav className="space-y-2">
              {group.items.map(([label, href, icon]) => {
                const active = activePath(pathname, href);
                return (
                  <Link
                    key={href}
                    to={href}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black no-underline ${
                      active ? "bg-white text-slate-950" : "text-slate-200 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className={`grid h-7 w-7 place-items-center rounded-xl text-[10px] font-black ${
                      active ? "bg-slate-950 text-white" : "bg-white/10 text-cyan-200"
                    }`}>
                      {icon}
                    </span>
                    {label}
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

function StatCard({ label, value, tone }) {
  const tones = {
    dark: "border-slate-800 bg-[#143658] text-white",
    orange: "border-orange-200 bg-orange-50 text-orange-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };

  return (
    <div className={`rounded-[22px] border p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)] ${tones[tone] || tones.dark}`}>
      <div className="text-[11px] font-black uppercase tracking-[0.16em] opacity-80">{label}</div>
      <div className="mt-3 text-4xl font-black tracking-[-0.06em]">{value}</div>
    </div>
  );
}

function JobCard({ job, onReview }) {
  const status = statusOf(job);
  const id = jobId(job);
  const realJob = id && !id.startsWith("sample-");

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 text-slate-950 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{scheduleLabel(job)}</div>
          <h3 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-slate-950">{jobTitle(job)}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${statusBadge(status)}`}>
          {prettyStatus(status)}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm font-bold text-slate-700">
        <div>Client: {clientName(job)}</div>
        <div>Address: {jobAddress(job)}</div>
        <div>Worker: {workerName(job)}</div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onReview(job)}
          className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-50"
        >
          Review job
        </button>

        {realJob ? (
          <Link
            to={`/jobs/${id}`}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white no-underline hover:bg-blue-700"
          >
            Open job
          </Link>
        ) : (
          <Link
            to="/jobs/new"
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white no-underline hover:bg-blue-700"
          >
            Create job
          </Link>
        )}
      </div>
    </article>
  );
}

function JobModal({ job, onClose }) {
  if (!job) return null;

  const status = statusOf(job);
  const id = jobId(job);
  const realJob = id && !id.startsWith("sample-");

  let next = "Open the job and update the details.";
  if (["unassigned", "new", "pending"].includes(status)) next = "Assign a worker so this job can move forward.";
  if (["completed", "complete", "done"].includes(status)) next = "Review the completed job and prepare the invoice.";
  if (["in_progress", "started", "active"].includes(status)) next = "This job is active. Keep it visible until the worker finishes.";

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-[30px] bg-white shadow-[0_35px_120px_rgba(15,23,42,0.45)]">
        <header className="bg-[#0f1722] p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">Job review</div>
              <h2 className="mt-2 text-4xl font-black leading-tight tracking-[-0.06em]">{jobTitle(job)}</h2>
              <p className="mt-3 text-sm font-bold text-slate-200">{clientName(job)} · {jobAddress(job)}</p>
            </div>
            <button onClick={onClose} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-white">
              Close
            </button>
          </div>
        </header>

        <main className="max-h-[60vh] overflow-y-auto bg-[#f5f7f1] p-5 text-slate-950">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">What needs doing</div>
            <p className="mt-3 text-lg font-black text-slate-950">{next}</p>
          </section>

          <section className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-[20px] border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Status</div>
              <div className="mt-2 text-lg font-black">{prettyStatus(status)}</div>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Worker</div>
              <div className="mt-2 text-lg font-black">{workerName(job)}</div>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Time</div>
              <div className="mt-2 text-lg font-black">{scheduleLabel(job)}</div>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Client</div>
              <div className="mt-2 text-lg font-black">{clientName(job)}</div>
            </div>
          </section>
        </main>

        <footer className="flex flex-wrap gap-3 border-t border-slate-200 bg-white p-5">
          {realJob ? (
            <Link to={`/jobs/${id}`} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white no-underline">
              Open job
            </Link>
          ) : (
            <Link to="/jobs/new" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white no-underline">
              Create job
            </Link>
          )}
          <Link to="/crew-map" className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-950 no-underline">
            Crew Map
          </Link>
        </footer>
      </div>
    </div>
  );
}

export default function JobsCommandPage() {
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
        setJobs([]);
        setError(res?.error || "Could not load jobs");
      }

      setLoading(false);
    }

    loadJobs();

    return () => {
      alive = false;
    };
  }, [get]);

  const list = jobs.length ? jobs : sampleJobs;

  const counts = React.useMemo(() => {
    const total = list.length;
    const needWorker = list.filter((job) => ["unassigned", "new", "pending"].includes(statusOf(job))).length;
    const active = list.filter((job) => ["assigned", "in_progress", "started", "active", "paused"].includes(statusOf(job))).length;
    const completed = list.filter((job) => ["completed", "complete", "done"].includes(statusOf(job))).length;
    return { total, needWorker, active, completed };
  }, [list]);

  return (
    <main className="min-h-screen bg-[#f5f7f1] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="min-w-0 flex-1 p-4 pb-36 md:p-6 xl:p-8">
          <header className="mb-5 rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Jobs</div>
                <h1 className="mt-2 text-4xl font-black tracking-[-0.06em] text-slate-950">Jobs that need action</h1>
                <p className="mt-2 text-sm font-bold text-slate-600">
                  Assign workers, track active jobs, and review completed work.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to="/crew-map" className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-950 no-underline">
                  Crew Map
                </Link>
                <Link to="/jobs/new" className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 no-underline">
                  Create job
                </Link>
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-4">
            <StatCard label="Total jobs" value={counts.total} tone="dark" />
            <StatCard label="Need worker" value={counts.needWorker} tone="orange" />
            <StatCard label="Assigned / active" value={counts.active} tone="blue" />
            <StatCard label="Completed" value={counts.completed} tone="green" />
          </section>

          {error ? (
            <div className="mt-5 rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm font-black text-amber-900">
              {error}. Showing sample layout.
            </div>
          ) : null}

          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Job list</div>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">All jobs</h2>
              </div>
              {loading ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">Loading…</span>
              ) : null}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {list.map((job) => (
                <JobCard key={jobId(job) || jobTitle(job)} job={job} onReview={setActiveJob} />
              ))}
            </div>
          </section>
        </section>
      </div>

      <JobModal job={activeJob} onClose={() => setActiveJob(null)} />
    </main>
  );
}
