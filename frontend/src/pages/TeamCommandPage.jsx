import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const roles = [
  ["Owner", "Full business control, billing, settings, approvals and team management.", "Full access"],
  ["Manager", "Day-to-day jobs, crew and customer operations without owner billing control.", "Operations"],
  ["Office Admin", "Clients, quotes, invoices and admin follow-up support.", "Admin"],
  ["Worker", "Mobile job list, acknowledge, start, pause, complete and upload photos.", "Field"],
  ["Payroll", "Payroll workspace, approved hours and exports only.", "Locked"],
];

const rules = [
  "Invite workers by email so access is tied to the business.",
  "Keep payroll separate from owner billing and broad job editing.",
  "Worker pages must not show job pricing or GPS evidence.",
  "Team details should open in-page or as a slip during the next polish pass.",
  "Every team action must be role-safe before launch.",
];

function nameOf(worker) {
  return worker?.name || worker?.full_name || worker?.email || "Team member";
}

function roleOf(worker) {
  return worker?.role || worker?.account_type || "worker";
}

function statusOf(worker) {
  return String(worker?.status || "active").replaceAll("_", " ");
}

function Card({ children, className = "" }) {
  return (
    <section className={`relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,#111827,#070d16)] p-5 text-white shadow-[0_22px_62px_rgba(2,6,23,.24),inset_0_1px_0_rgba(255,255,255,.06)] ${className}`}>
      <span className="absolute left-0 top-0 h-full w-2.5 rounded-l-[30px] bg-[linear-gradient(180deg,#fb923c,#facc15)] shadow-[0_0_22px_rgba(251,146,60,.45)]" />
      <div className="pl-3">{children}</div>
    </section>
  );
}

export default function TeamCommandPage() {
  const { get } = useApi();
  const [workers, setWorkers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const res = await get("/team/workers");
        const data = res?.data || res;
        const rows = Array.isArray(data) ? data : data?.workers || data?.team || data?.items || [];
        if (alive) setWorkers(Array.isArray(rows) ? rows : []);
      } catch (err) {
        if (alive) setWorkers([]);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [get]);

  const active = workers.filter((w) => !String(w?.status || "").toLowerCase().includes("inactive")).length;
  const field = workers.filter((w) => String(roleOf(w)).toLowerCase().includes("worker")).length;
  const payroll = workers.filter((w) => String(roleOf(w)).toLowerCase().includes("payroll")).length;

  const invite = () => toast.info("Team invite wiring stays tied to business access. Next polish pass will open this as an in-page slip/form.");

  return (
    <main className="min-h-screen bg-[#f7f3ea] p-4 pb-32 text-slate-950 md:p-6 md:pb-28 xl:pl-[320px]">
      <section className="mx-auto max-w-7xl space-y-5">
        <Card className="p-6 md:p-8">
          <div className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Team</div>
          <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">Crew control without the mess.</h1>
          <p className="mt-5 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-base">Manage who can access Churvox, what they can see, and how workers connect to jobs. Keep it simple, role-safe and launch-ready.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={invite} className="rounded-2xl bg-[linear-gradient(135deg,#facc15,#fb923c)] px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-orange-500/20">Invite team member</button>
            <Link to="/crew-map" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white no-underline hover:bg-white/15">Crew Map</Link>
            <Link to="/payroll" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white no-underline hover:bg-white/15">Payroll</Link>
          </div>
        </Card>

        <section className="grid gap-5 md:grid-cols-3">
          <Card><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Active team</div><div className="mt-3 text-5xl font-black tracking-[-.08em] text-white">{loading ? "…" : active}</div><p className="mt-2 text-sm font-bold text-slate-300">People currently counted as active.</p></Card>
          <Card><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Field workers</div><div className="mt-3 text-5xl font-black tracking-[-.08em] text-white">{loading ? "…" : field}</div><p className="mt-2 text-sm font-bold text-slate-300">Workers connected to job flow.</p></Card>
          <Card><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Payroll users</div><div className="mt-3 text-5xl font-black tracking-[-.08em] text-white">{loading ? "…" : payroll}</div><p className="mt-2 text-sm font-bold text-slate-300">Locked-down payroll access.</p></Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
          <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6">
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Team list</div>
            <h2 className="mt-2 text-3xl font-black tracking-[-.06em]">People in the business</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">This list is clean for launch. The next polish pass can make each row open a full-screen team slip.</p>
            <div className="mt-5 grid gap-3">
              {(workers.length ? workers : [{ name: "No team members yet", role: "setup", status: "invite needed", email: "Invite your first worker to test the field app." }]).slice(0, 12).map((worker, index) => (
                <div key={worker?.id || worker?._id || worker?.email || index} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-black tracking-[-.04em] text-slate-950">{nameOf(worker)}</div>
                      <div className="mt-1 text-sm font-bold text-slate-600">{worker?.email || worker?.phone || "No contact saved"}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-white">{roleOf(worker)}</span>
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-orange-800">{statusOf(worker)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="grid gap-5">
            <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6">
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Launch role model</div>
              <h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Five clear roles</h2>
              <div className="mt-5 grid gap-3">
                {roles.map(([role, copy, badge]) => (
                  <div key={role} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3"><b className="text-lg font-black tracking-[-.04em]">{role}</b><span className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-orange-700">{badge}</span></div>
                    <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{copy}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6">
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Launch safety rules</div>
          <h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Team must stay role-safe.</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {rules.map((rule) => (
              <div key={rule} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-orange-100 text-xs font-black text-orange-700">✓</span>
                <span className="text-sm font-black leading-6 text-slate-800">{rule}</span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
