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

const sampleWorkers = [
  { id: "sample-w1", name: "Mike", email: "mike@example.com", role: "worker", status: "active", region: "North", phone: "021 000 000", skills: ["Lawn care", "Hedges"], assigned_jobs_count: 3 },
  { id: "sample-w2", name: "Tane", email: "tane@example.com", role: "manager", status: "active", region: "South", phone: "021 111 111", skills: ["Dispatch", "Garden tidy"], assigned_jobs_count: 5 },
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

function statusStyle(status) {
  if (["active", "available", "online"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (["busy", "assigned", "working"].includes(status)) return "border-blue-200 bg-blue-50 text-blue-800";
  if (["invited", "pending"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-800";
  if (["inactive", "disabled", "removed"].includes(status)) return "border-red-200 bg-red-50 text-red-800";
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

function WorkerCard({ worker, onOpen }) {
  const status = statusOf(worker);
  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{pretty(workerRole(worker))}</span>
          <h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950">{workerName(worker)}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusStyle(status)}`}>{pretty(status)}</span>
      </div>
      <div className="mt-3 space-y-1 text-sm font-bold text-slate-600">
        <div>{worker?.email || "No email saved"}</div>
        <div className="text-slate-400">{worker?.phone || worker?.mobile || "No phone saved"}</div>
        <div className="text-slate-500">Region: {worker?.region || worker?.area || "Not set"} · Jobs: {jobCount(worker)}</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpen(worker)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Review slip</button>
        <Link to="/dispatch" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Dispatch</Link>
      </div>
    </article>
  );
}

function WorkerSlip({ worker, onClose }) {
  if (!worker) return null;
  const status = statusOf(worker);
  const skills = arr(worker?.skills || worker?.trade_skills || worker?.tags);
  return (
    <div className="fixed inset-0 z-[2147483647] h-[100dvh] w-screen overflow-hidden bg-[#f5f7f1] text-slate-950" role="dialog" aria-modal="true">
      <div className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#f5f7f1]">
        <header className="relative overflow-hidden border-b border-slate-800 bg-slate-950 p-6 text-white md:p-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Crew Work Slip</div>
              <h2 className="mt-4 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-5xl">{workerName(worker)}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">Close</button>
          </div>
          <p className="relative mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-300">{pretty(workerRole(worker))} · {worker?.region || worker?.area || "Region not set"}</p>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f4f6f8] p-5 md:p-6">
          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">What needs attention</div>
            <p className="mt-3 text-lg font-black tracking-[-0.035em] text-slate-950">Status: {pretty(status)}</p>
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-950">Check availability, role, region and workload before assigning more jobs.</div>
          </section>

          <section className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Email</div><div className="mt-1 text-sm font-black text-slate-950">{worker?.email || "No email saved"}</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Phone</div><div className="mt-1 text-sm font-black text-slate-950">{worker?.phone || worker?.mobile || "No phone saved"}</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Role</div><div className="mt-1 text-sm font-black text-slate-950">{pretty(workerRole(worker))}</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Open jobs</div><div className="mt-1 text-sm font-black text-slate-950">{jobCount(worker)}</div></div>
          </section>

          <section className="mt-4 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Skills / notes</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.length ? skills.map((skill) => <span key={String(skill)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">{String(skill)}</span>) : <span className="text-sm font-bold text-slate-500">No skills saved yet.</span>}
            </div>
            {worker?.notes || worker?.internal_notes ? <p className="mt-4 text-sm font-bold leading-6 text-slate-600">{worker.notes || worker.internal_notes}</p> : null}
          </section>
        
              <CommandSlipEverything
                record={worker}
                context="WorkerSlip"
              />
</main>

        <footer className="flex flex-wrap gap-3 border-t border-slate-200 bg-white p-5">
          <Link to="/dispatch" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Open dispatch</Link>
          <Link to="/crew-ops" className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">Crew ops</Link>
        </footer>
      </div>
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

  const list = workers.length ? workers : sampleWorkers;
  const counts = React.useMemo(() => {
    const total = list.length;
    const active = list.filter((worker) => ["active", "available", "online", "busy", "assigned", "working"].includes(statusOf(worker))).length;
    const available = list.filter((worker) => ["active", "available", "online"].includes(statusOf(worker)) && jobCount(worker) <= 2).length;
    const busy = list.filter((worker) => jobCount(worker) >= 4 || ["busy", "working"].includes(statusOf(worker))).length;
    const invited = list.filter((worker) => ["invited", "pending"].includes(statusOf(worker))).length;
    return { total, active, available, busy, invited };
  }, [list]);

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#eef1f4] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 md:pb-28 xl:p-8 xl:pb-28">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Team Command</div><div className="text-sm font-bold text-slate-500">Crew, roles, workload, availability and dispatch decisions.</div></div>
            <div className="flex flex-wrap gap-3"><Link to="/dispatch" className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Dispatch</Link><Link to="/crew-ops" className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400">Crew ops</Link></div>
          </header>

          <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]">
              <div className="relative p-6 md:p-8">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="relative">
                  <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Team Command</span>
                  <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Put the right worker on the right job.</h1>
                  <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Churvox keeps crew roles, workload and dispatch context visible before the owner approves assignment decisions.</p>
                </div>
              </div>
            </div>
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Crew health</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">What needs attention</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-2xl font-black text-emerald-800">{counts.available}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Available</div></div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="text-2xl font-black text-blue-800">{counts.active}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Active crew</div></div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="text-2xl font-black text-amber-800">{counts.busy}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Heavy workload</div></div>
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Team members</div><div className="mt-3 text-3xl font-black tracking-[-0.06em]">{counts.total}</div></div>
            <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Available</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-emerald-900">{counts.available}</div></div>
            <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Busy</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-amber-900">{counts.busy}</div></div>
            <div className="rounded-[22px] border border-blue-200 bg-blue-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Invites</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-blue-900">{counts.invited}</div></div>
          </section>

          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Crew list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">Open team members</h2></div>{loading && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Loading…</span>}{error && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Showing sample layout</span>}</div>
            <div className="grid gap-4 xl:grid-cols-2">
              {list.map((worker) => <WorkerCard key={idOf(worker) || workerName(worker)} worker={worker} onOpen={setActiveWorker} />)}
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
