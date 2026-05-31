// CHURVOX_TEAM_WORKSPACE_STABLE_WIRING_20260601
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { useApi } from "../hooks/useApi";
import { BriefcaseBusiness, MailPlus, RefreshCw, Save, ShieldCheck, Trash2, UsersRound } from "lucide-react";

const ROLE_OPTIONS = [
  ["worker", "Worker"],
  ["manager", "Manager"],
  ["office_admin", "Office Admin"],
  ["payroll", "Payroll"],
];

const COUNTRY_OPTIONS = ["New Zealand", "Australia"];
const REGION_OPTIONS = {
  "New Zealand": ["Northland", "Auckland", "Waikato", "Bay of Plenty", "Gisborne", "Hawke's Bay", "Taranaki", "Manawatu-Whanganui", "Wellington", "Tasman", "Nelson", "Marlborough", "West Coast", "Canterbury", "Otago", "Southland"],
  "Australia": ["New South Wales", "Victoria", "Queensland", "Western Australia", "South Australia", "Tasmania", "Northern Territory", "Australian Capital Territory"],
};

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.workers)) return value.workers;
  if (Array.isArray(value?.team)) return value.team;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function idOf(value) { return String(value?.id || value?._id || value?.worker_id || value?.user_id || ""); }
function workerName(worker) { return worker?.name || worker?.display_name || worker?.full_name || worker?.email || "Worker"; }
function workerEmail(worker) { return worker?.email || worker?.user_email || worker?.invite_email || ""; }
function workerRole(worker) { return String(worker?.role || worker?.team_role || "worker").toLowerCase(); }
function workerRegion(worker) { return worker?.region || worker?.state || worker?.area || "No region"; }
function workerStatus(worker) { return worker?.status || worker?.invite_status || worker?.employment_status || "active"; }
function jobWorkerId(job) { return String(job?.assigned_worker_id || job?.worker_id || job?.assigned_to || ""); }
function jobWorkerName(job) { return String(job?.assigned_worker_name || job?.worker_name || "").toLowerCase(); }
function jobTitle(job) { return job?.title || job?.job_name || job?.customer_name || job?.client_name || "Job"; }
function isOpenJob(job) {
  const s = String(job?.status || job?.job_status || "").toLowerCase();
  return !["completed", "complete", "done", "cancelled", "canceled", "paid"].includes(s);
}
function jobsForWorker(worker, jobs) {
  const id = idOf(worker);
  const name = workerName(worker).toLowerCase();
  return jobs.filter((job) => {
    const assignedId = jobWorkerId(job);
    if (id && assignedId && assignedId === id) return true;
    return name && jobWorkerName(job) && jobWorkerName(job) === name;
  });
}

function emptyInvite() {
  return { name: "", email: "", phone: "", role: "worker", country: "New Zealand", region: "", notes: "" };
}

export default function TeamWorkspacePage() {
  const api = useApi();
  const [workers, setWorkers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [invite, setInvite] = useState(emptyInvite);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");

  async function loadTeam() {
    setLoading(true);
    const [workersRes, jobsRes] = await Promise.all([
      api.get("/team/workers"),
      api.get("/jobs"),
    ]);
    if (workersRes.success) setWorkers(arr(workersRes.data));
    else {
      setWorkers([]);
      toast.error(workersRes.error || "Could not load workers");
    }
    if (jobsRes.success) setJobs(arr(jobsRes.data));
    else setJobs([]);
    setLoading(false);
  }

  useEffect(() => { loadTeam(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const workerRows = useMemo(() => workers.map((worker) => {
    const workerJobs = jobsForWorker(worker, jobs);
    const openJobs = workerJobs.filter(isOpenJob);
    return { worker, workerJobs, openJobs };
  }), [workers, jobs]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workerRows.filter(({ worker }) => {
      const haystack = [workerName(worker), workerEmail(worker), workerRole(worker), workerRegion(worker), worker.phone, worker.mobile].join(" ").toLowerCase();
      const searchOk = !q || haystack.includes(q);
      const roleOk = !roleFilter || workerRole(worker) === roleFilter;
      const regionOk = !regionFilter || String(workerRegion(worker)).toLowerCase().includes(regionFilter.toLowerCase());
      return searchOk && roleOk && regionOk;
    });
  }, [workerRows, search, roleFilter, regionFilter]);

  const metrics = useMemo(() => {
    const activeWorkers = workers.filter((worker) => !String(workerStatus(worker)).toLowerCase().includes("inactive")).length;
    const openAssignedJobs = jobs.filter((job) => isOpenJob(job) && (jobWorkerId(job) || jobWorkerName(job))).length;
    const unassignedJobs = jobs.filter((job) => isOpenJob(job) && !jobWorkerId(job) && !jobWorkerName(job)).length;
    const payrollUsers = workers.filter((worker) => workerRole(worker) === "payroll").length;
    return { workers: workers.length, activeWorkers, openAssignedJobs, unassignedJobs, payrollUsers };
  }, [workers, jobs]);

  function updateInvite(key, value) {
    setInvite((current) => ({ ...current, [key]: value }));
  }

  async function submitInvite(event) {
    event.preventDefault();
    if (!invite.email.trim()) return toast.error("Worker email is required");
    setBusy("invite");
    const payload = {
      ...invite,
      name: invite.name.trim() || invite.email.trim(),
      display_name: invite.name.trim() || invite.email.trim(),
      email: invite.email.trim(),
      phone: invite.phone.trim(),
      role: invite.role,
      team_role: invite.role,
      country: invite.country,
      region: invite.region,
      invite_status: "invited",
      status: "active",
      notes: invite.notes,
    };
    const res = await api.post("/team/workers", payload);
    setBusy("");
    if (res.success) {
      toast.success("Team member saved / invited");
      setInvite(emptyInvite());
      await loadTeam();
    } else {
      toast.error(res.error || "Could not invite team member");
    }
  }

  async function updateWorkerRole(worker, role) {
    const id = idOf(worker);
    if (!id) return toast.error("Worker ID missing");
    setBusy(`role-${id}`);
    const res = await api.patch(`/team/workers/${encodeURIComponent(id)}`, { role, team_role: role });
    setBusy("");
    if (res.success) {
      toast.success("Role updated");
      await loadTeam();
    } else {
      toast.error(res.error || "Could not update role");
    }
  }

  async function removeWorker(worker) {
    const id = idOf(worker);
    if (!id) return toast.error("Worker ID missing");
    if (!window.confirm(`Remove ${workerName(worker)} from this team?`)) return;
    setBusy(`remove-${id}`);
    const res = await api.del(`/team/workers/${encodeURIComponent(id)}`);
    setBusy("");
    if (res.success) {
      toast.success("Worker removed");
      await loadTeam();
    } else {
      toast.error(res.error || "Could not remove worker");
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-white";
  const labelClass = "text-sm font-black text-slate-200";

  return (
    <PremiumPage maxWidth={1240}>
      <PremiumHero
        eyebrow="Team workspace"
        title="Invite crew, lock roles and keep jobs assigned cleanly."
        subtitle="Team now connects directly to workers and jobs, so Dispatch and Job creation can use the same worker records."
        icon={<UsersRound className="h-6 w-6" />}
        actions={<PremiumButton variant="secondary" onClick={loadTeam} disabled={loading || Boolean(busy)}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>}
      />

      <section className="mb-5 grid gap-3 md:grid-cols-5">
        <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Team</span><b className="mt-2 block text-3xl text-white">{metrics.workers}</b><small className="text-slate-300">saved workers</small></article>
        <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-lime-300">Active</span><b className="mt-2 block text-3xl text-white">{metrics.activeWorkers}</b><small className="text-slate-300">active members</small></article>
        <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Assigned</span><b className="mt-2 block text-3xl text-white">{metrics.openAssignedJobs}</b><small className="text-slate-300">open jobs</small></article>
        <article className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-amber-200">Unassigned</span><b className="mt-2 block text-3xl text-white">{metrics.unassignedJobs}</b><small className="text-amber-100/80">send to dispatch</small></article>
        <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-purple-300">Payroll</span><b className="mt-2 block text-3xl text-white">{metrics.payrollUsers}</b><small className="text-slate-300">locked role</small></article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <PremiumCard title="Invite / add team member" icon={<MailPlus className="h-5 w-5" />}>
          <form onSubmit={submitInvite} className="grid gap-3" data-version="CHURVOX_TEAM_WORKSPACE_STABLE_WIRING_20260601">
            <label className="grid gap-2"><span className={labelClass}>Name</span><input className={inputClass} value={invite.name} onChange={(e) => updateInvite("name", e.target.value)} placeholder="Worker name" /></label>
            <label className="grid gap-2"><span className={labelClass}>Email *</span><input className={inputClass} type="email" required value={invite.email} onChange={(e) => updateInvite("email", e.target.value)} placeholder="worker@email.com" /></label>
            <label className="grid gap-2"><span className={labelClass}>Phone</span><input className={inputClass} value={invite.phone} onChange={(e) => updateInvite("phone", e.target.value)} placeholder="Optional" /></label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2"><span className={labelClass}>Role</span><select className={inputClass} value={invite.role} onChange={(e) => updateInvite("role", e.target.value)}>{ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="grid gap-2"><span className={labelClass}>Country</span><select className={inputClass} value={invite.country} onChange={(e) => setInvite((current) => ({ ...current, country: e.target.value, region: "" }))}>{COUNTRY_OPTIONS.map((country) => <option key={country} value={country}>{country}</option>)}</select></label>
            </div>
            <label className="grid gap-2"><span className={labelClass}>Region / State</span><select className={inputClass} value={invite.region} onChange={(e) => updateInvite("region", e.target.value)}><option value="">Select region</option>{(REGION_OPTIONS[invite.country] || []).map((region) => <option key={region} value={region}>{region}</option>)}</select></label>
            <label className="grid gap-2"><span className={labelClass}>Notes</span><textarea className={`${inputClass} min-h-[90px]`} value={invite.notes} onChange={(e) => updateInvite("notes", e.target.value)} placeholder="Skills, areas, employment note..." /></label>
            <PremiumButton type="submit" disabled={busy === "invite"} iconLeft={<Save className="h-4 w-4" />}>{busy === "invite" ? "Saving…" : "Save / invite"}</PremiumButton>
            <p className="text-xs font-semibold text-slate-400">Roles are kept simple: Owner, Manager, Worker, Office Admin and Payroll. Payroll stays locked away from owner billing/settings.</p>
          </form>
        </PremiumCard>

        <PremiumCard title="Team list and live job links" icon={<BriefcaseBusiness className="h-5 w-5" />}>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <input className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search worker, email, phone..." />
            <select className={inputClass} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}><option value="">All roles</option>{ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <input className={inputClass} value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} placeholder="Region filter" />
          </div>

          {loading ? <div className="rounded-3xl border border-slate-700 bg-slate-950/50 p-6 text-center font-bold text-slate-300">Loading team…</div> : null}
          {!loading && !filteredRows.length ? <div className="rounded-3xl border border-slate-700 bg-slate-950/50 p-6 text-center font-bold text-slate-300">No team members yet. Add your first worker.</div> : null}

          <div className="grid gap-3">
            {filteredRows.map(({ worker, workerJobs, openJobs }) => {
              const id = idOf(worker);
              return (
                <article key={id || workerEmail(worker)} className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4 shadow-sm">
                  <header className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">{workerRole(worker).replace("_", " ")} · {workerStatus(worker)}</p>
                      <h3 className="mt-1 text-2xl font-black text-white">{workerName(worker)}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-300">{workerEmail(worker) || "No email"} · {workerRegion(worker)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm font-bold text-white" value={workerRole(worker)} onChange={(e) => updateWorkerRole(worker, e.target.value)} disabled={busy === `role-${id}`}>
                        {ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <button type="button" onClick={() => removeWorker(worker)} disabled={busy === `remove-${id}`} className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-black text-red-100"><Trash2 size={14} /> Remove</button>
                    </div>
                  </header>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3"><span className="text-xs font-black uppercase text-slate-400">Open jobs</span><b className="mt-1 block text-xl text-white">{openJobs.length}</b></div>
                    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3"><span className="text-xs font-black uppercase text-slate-400">Total linked</span><b className="mt-1 block text-xl text-white">{workerJobs.length}</b></div>
                    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3"><span className="text-xs font-black uppercase text-slate-400">Access</span><b className="mt-1 flex items-center gap-2 text-xl text-lime-300"><ShieldCheck size={16} /> Role safe</b></div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    {openJobs.slice(0, 4).map((job) => <Link key={job.id || job._id} to={`/jobs/${job.id || job._id}`} className="rounded-2xl border border-slate-700 bg-slate-900/50 p-3 text-sm font-bold text-slate-100 no-underline hover:border-cyan-300/40">{jobTitle(job)} · {job.status || "open"}</Link>)}
                    {!openJobs.length ? <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-3 text-sm font-bold text-slate-400">No open jobs assigned.</div> : null}
                  </div>
                </article>
              );
            })}
          </div>
        </PremiumCard>
      </section>
    </PremiumPage>
  );
}
