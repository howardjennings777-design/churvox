import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import CommandSlipEverything from "../components/CommandSlipEverything";

const navGroups = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"], ["AI Operator", "/ai-operator", "AI"], ["Approvals", "/ai-operator/approvals", "OK"], ["Notifications", "/notifications", "NT"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Assign Jobs", "/dispatch", "DP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"], ["Money Desk", "/money-desk", "$"]] },
  { title: "Crew & Admin", items: [["Team", "/team", "TM"], ["Crew Ops", "/crew-ops", "CO"], ["Payroll", "/payroll", "PR"], ["Reports", "/reports", "RP"]] },
  { title: "System", items: [["Setup", "/onboarding", "SU"], ["Trade Presets", "/trade-presets", "TP"], ["Automation", "/automation", "AU"], ["Integrations", "/integrations", "IN"], ["Operator Tools", "/operator-tools", "OT"], ["Plans", "/plans", "PL"], ["Billing", "/billing-confidence", "BI"], ["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

const sampleWorkers = [
  { id: "sample-w1", name: "Mike", email: "mike@example.com", role: "worker", status: "active", region: "North", phone: "021 000 000", skills: ["Lawn care", "Hedges"], assigned_jobs_count: 3 },
  { id: "sample-w2", name: "Tane", email: "tane@example.com", role: "manager", status: "active", region: "South", phone: "021 111 111", skills: ["Assigning work", "Garden tidy"], assigned_jobs_count: 5 },
  { id: "sample-w3", name: "Jo", email: "jo@example.com", role: "worker", status: "available", region: "Central", phone: "021 222 222", skills: ["Cleanup", "Photos"], assigned_jobs_count: 1 },
  { id: "sample-w4", name: "Payroll Admin", email: "payroll@example.com", role: "payroll", status: "limited", region: "Office", phone: "", skills: ["Timesheets", "Payroll"], assigned_jobs_count: 0 },
];

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/money-desk") return pathname === "/money-desk" || pathname === "/money";
  if (href === "/team") return pathname === "/team" || pathname.startsWith("/team/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function arr(value) {
  const data = value?.data ?? value;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.workers)) return data.workers;
  if (Array.isArray(data?.team)) return data.team;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function idOf(worker) {
  const raw = worker?.id || worker?._id || worker?.user_id || worker?.worker_id || "";
  if (typeof raw === "object" && raw?.$oid) return raw.$oid;
  return String(raw || "");
}

function workerName(worker) {
  return worker?.name || worker?.full_name || worker?.display_name || worker?.email || "Unnamed team member";
}

function workerRole(worker) {
  return String(worker?.role || worker?.user_role || worker?.permission_role || "worker").replaceAll("_", " ");
}

function statusOf(worker) {
  return String(worker?.status || worker?.availability || worker?.invite_status || "active").toLowerCase().replaceAll(" ", "_");
}

function pretty(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function jobCount(worker) {
  return Number(worker?.assigned_jobs_count || worker?.jobs_count || worker?.open_jobs || worker?.active_jobs || 0);
}

function regionText(worker) {
  const region = worker?.region || worker?.area;
  return region ? `Region: ${region} · Jobs assigned: ${jobCount(worker)}` : `Region not set · Jobs assigned: ${jobCount(worker)}`;
}


function workerBlob(worker) {
  try {
    return JSON.stringify(worker || {});
  } catch {
    return `${worker?.name || ""} ${worker?.email || ""} ${worker?.phone || ""}`;
  }
}

function isLaunchAuditWorker(worker) {
  const blob = workerBlob(worker);
  return [
    /PW Worker/i,
    /PW E2E/i,
    /Playwright/i,
    /TEST Phase/i,
    /Deep Audit/i,
    /worker-2026/i,
    /pw-worker-/i,
    /example\.com/i,
    /2026\d{8,}/i,
  ].some((pattern) => pattern.test(blob));
}

function cleanWorkerName(worker) {
  const name = workerName(worker);
  if (/PW Worker|PW E2E|Playwright|TEST Phase|Deep Audit/i.test(name)) return "Team member";
  return String(name || "Team member").replace(/\s+2026\d{8,}/gi, "").trim() || "Team member";
}

function cleanWorkerEmail(worker) {
  const email = worker?.email || "";
  if (/pw-worker-|worker-2026|example\.com/i.test(String(email))) return "No email saved";
  return email || "No email saved";
}

function cleanRegionText(worker) {
  return regionText(worker).replace("Jobs assigned:", "Jobs assigned:").replace(/\s+2026\d{8,}/gi, "");
}


function statusLabel(status) {
  if (["invited", "pending"].includes(status)) return "Invited";
  if (["active", "available", "online"].includes(status)) return "Active";
  if (["busy", "assigned", "working"].includes(status)) return "Busy";
  if (["limited"].includes(status)) return "Limited";
  if (["inactive", "disabled", "removed"].includes(status)) return "Inactive";
  return pretty(status);
}

function statusStyle(status) {
  if (["active", "available", "online"].includes(status)) return "border-emerald-300/40 bg-emerald-400/15 text-emerald-100";
  if (["busy", "assigned", "working"].includes(status)) return "border-cyan-300/40 bg-cyan-300/15 text-cyan-100";
  if (["invited", "pending"].includes(status)) return "border-amber-300/50 bg-amber-300/18 text-amber-100";
  if (["inactive", "disabled", "removed"].includes(status)) return "border-red-300/40 bg-red-400/15 text-red-100";
  return "border-slate-300/30 bg-white/10 text-slate-100";
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
                  <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-300/20" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
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

function WorkerCard({ worker, onOpen }) {
  const status = statusOf(worker);
  return (
    <article className="rounded-[22px] border border-white/10 bg-white/[0.035] p-4 text-white shadow-[0_14px_38px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/70">{pretty(workerRole(worker))}</span>
          <h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-white">{cleanWorkerName(worker)}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusStyle(status)}`}>{statusLabel(status)}</span>
      </div>
      <div className="mt-3 space-y-1 text-sm font-bold text-slate-200">
        <div>{cleanWorkerEmail(worker)}</div>
        <div className="text-slate-300/80">{worker?.phone || worker?.mobile || "No phone saved"}</div>
        <div className="text-slate-300/80">{cleanRegionText(worker)}</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpen(worker)} className="rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-sm font-black text-cyan-100 hover:bg-cyan-300/20">Review member</button>
        <Link to="/dispatch" className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200">Assign job</Link>
      </div>
    </article>
  );
}

function WorkerSlip({ worker, onClose }) {
  if (!worker) return null;
  const status = statusOf(worker);
  const skills = arr(worker?.skills || worker?.trade_skills || worker?.tags);
  return (
    <div className="fixed inset-0 z-[2147483647] h-[100dvh] w-screen overflow-hidden bg-[#0f1722] text-slate-950" role="dialog" aria-modal="true">
      <section className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#0f1722]">
        <header className="shrink-0 border-b border-white/10 bg-[#0f1722] px-5 py-5 text-white md:px-9 md:py-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Team member review</div>
              <h2 className="mt-3 text-4xl font-black leading-[0.9] tracking-[-0.075em] text-white md:text-6xl">{cleanWorkerName(worker)}</h2>
              <p className="mt-3 max-w-5xl text-sm font-bold leading-6 text-slate-300">{pretty(workerRole(worker))} · {worker?.region || worker?.area || "Region not set"}</p>
            </div>
            <button type="button" onClick={onClose} className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/20">Close</button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f5f7f1] p-4 md:p-7">
          <div className="grid min-h-full w-full gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="space-y-5">
              <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600">What needs attention</div>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.06em] text-slate-950">{statusLabel(status)}</h2>
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-black leading-6 text-blue-950">Check availability, role, region and workload before assigning more jobs.</div>
              </section>

              <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Member details</div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Email</div><div className="mt-1 text-sm font-black text-slate-950">{worker?.email || "No email saved"}</div></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Phone</div><div className="mt-1 text-sm font-black text-slate-950">{worker?.phone || worker?.mobile || "No phone saved"}</div></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Role</div><div className="mt-1 text-sm font-black text-slate-950">{pretty(workerRole(worker))}</div></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Jobs assigned</div><div className="mt-1 text-sm font-black text-slate-950">{jobCount(worker)}</div></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Region</div><div className="mt-1 text-sm font-black text-slate-950">{worker?.region || worker?.area || "Region not set"}</div></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Status</div><div className="mt-1 text-sm font-black text-slate-950">{statusLabel(status)}</div></div>
                </div>
              </section>

              <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Skills / notes</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {skills.length ? skills.map((skill) => <span key={String(skill)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">{String(skill)}</span>) : <span className="text-sm font-bold text-slate-500">No skills saved yet.</span>}
                </div>
                {worker?.notes || worker?.internal_notes ? <p className="mt-4 text-sm font-bold leading-6 text-slate-600">{worker.notes || worker.internal_notes}</p> : null}
              </section>

              <CommandSlipEverything
                record={worker}
                context="Team member review"
              />
            </div>

            <aside className="rounded-[30px] border border-white/10 bg-[#0f1722] p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.18)] xl:sticky xl:top-0 xl:h-fit">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">Member actions</div>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">Review first.</h2>
              <div className="mt-5 rounded-2xl bg-white/10 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Status</div><div className="mt-2 text-sm font-black text-white">{statusLabel(status)}</div></div>
              <div className="mt-3 rounded-2xl bg-white/10 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Jobs assigned</div><div className="mt-2 text-sm font-black text-white">{jobCount(worker)}</div></div>
              <div className="mt-5 grid gap-3">
                <Link to="/dispatch" className="rounded-2xl bg-cyan-300 px-5 py-3 text-center text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200">Assign job</Link>
                <Link to="/crew-ops" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-center text-sm font-black text-white hover:bg-white/15">Add team member</Link>
                <button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">Back to team</button>
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
    dark: "border-slate-800 bg-[#0f1722] text-white",
    amber: "border-amber-400/35 bg-[#2b2115] text-amber-100",
    cyan: "border-cyan-400/30 bg-[#102a3a] text-cyan-100",
    green: "border-emerald-400/30 bg-[#102d27] text-emerald-100",
  };

  return (
    <div className={`rounded-[22px] border p-4 shadow-[0_14px_38px_rgba(15,23,42,0.14)] ${styles[tone] || styles.dark}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-80">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-[-0.06em]">{value}</div>
    </div>
  );
}

function TeamCommandContent() {
  const { get } = useApi();
  const [workers, setWorkers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [activeWorker, setActiveWorker] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    async function loadWorkers() {
      setLoading(true);
      const res = await get("/team/workers");
      if (!alive) return;
      if (res?.success) {
        setWorkers(arr(res));
        setError("");
      } else {
        setWorkers([]);
        setError(res?.error || "Could not load team");
      }
      setLoading(false);
    }
    loadWorkers();
    return () => { alive = false; };
  }, [get]);

  const visibleWorkers = workers.filter((worker) => !isLaunchAuditWorker(worker));
  const list = visibleWorkers.length ? visibleWorkers : sampleWorkers;
  const counts = React.useMemo(() => {
    const total = list.length;
    const active = list.filter((worker) => ["active", "available", "online", "busy", "assigned", "working"].includes(statusOf(worker))).length;
    const available = list.filter((worker) => ["active", "available", "online"].includes(statusOf(worker)) && jobCount(worker) <= 2).length;
    const busy = list.filter((worker) => jobCount(worker) >= 4 || ["busy", "working"].includes(statusOf(worker))).length;
    const invited = list.filter((worker) => ["invited", "pending"].includes(statusOf(worker))).length;
    return { total, active, available, busy, invited };
  }, [list]);

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#f5f7f1] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 md:pb-28 xl:p-8 xl:pb-28">
          <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]">
              <div className="relative p-6 md:p-8">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="relative">
                  <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Team</span>
                  <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Keep your crew organised and ready for work.</h1>
                  <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">See who is available, who is busy, and who needs to be invited or assigned before work starts.</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link to="/dispatch" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">Assign jobs</Link>
                    <Link to="/team/new" className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200">Add team member</Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-[30px] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Crew health</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-white">What needs attention</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <StatCard label="Available crew" value={counts.available} tone="green" />
                <StatCard label="Working now" value={counts.active} tone="cyan" />
                <StatCard label="High workload" value={counts.busy} tone="amber" />
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            <StatCard label="Team members" value={counts.total} tone="dark" />
            <StatCard label="Available crew" value={counts.available} tone="green" />
            <StatCard label="Busy now" value={counts.busy} tone="amber" />
            <StatCard label="Pending invites" value={counts.invited} tone="cyan" />
          </section>

          <section className="mt-5 rounded-[28px] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Crew list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Team members</h2></div>{loading && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-200">Loading…</span>}{error && <span className="rounded-full bg-amber-300/15 px-3 py-1 text-xs font-black text-amber-100">Showing sample layout</span>}</div>
            <div className="grid gap-4 xl:grid-cols-2">
              {list.map((worker) => <WorkerCard key={idOf(worker) || cleanWorkerName(worker)} worker={worker} onOpen={setActiveWorker} />)}
            </div>
          </section>
        </section>
      </div>
      <WorkerSlip worker={activeWorker} onClose={() => setActiveWorker(null)} />
    </main>
  );
}

export default function TeamCommandPage() {
  if (typeof document === "undefined") return <TeamCommandContent />;
  return createPortal(<TeamCommandContent />, document.body);
}
