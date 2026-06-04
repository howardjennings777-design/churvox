import React from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import {
  industrialAction,
  industrialChip,
  industrialContentLane,
  industrialGhost,
  industrialPageShell,
  industrialPanel,
} from "../components/industrialCommandTheme";

const sampleWorkers = [
  { id: "sample-p1", name: "Mike", email: "mike@example.com", role: "worker", approved_hours: 32.5, pending_hours: 2.5, pay_rate: 32, status: "needs_review" },
  { id: "sample-p2", name: "Tane", email: "tane@example.com", role: "manager", approved_hours: 38, pending_hours: 0, pay_rate: 38, status: "ready" },
  { id: "sample-p3", name: "Jo", email: "jo@example.com", role: "worker", approved_hours: 24, pending_hours: 4, pay_rate: 30, status: "needs_review" },
];

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

function idOf(record) {
  const raw = record?.id || record?._id || record?.user_id || record?.worker_id || "";
  if (typeof raw === "object" && raw?.$oid) return raw.$oid;
  return String(raw || "");
}

function nameOf(worker) {
  return worker?.name || worker?.full_name || worker?.display_name || worker?.email || "Unnamed worker";
}

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00";
}

function hours(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(n % 1 ? 1 : 0) : "0";
}

function approvedHours(worker) {
  return Number(worker?.approved_hours || worker?.hours_approved || worker?.payroll_hours || worker?.total_hours || 0);
}

function pendingHours(worker) {
  return Number(worker?.pending_hours || worker?.unapproved_hours || worker?.hours_pending || 0);
}

function payRate(worker) {
  return Number(worker?.pay_rate || worker?.hourly_rate || worker?.rate || 0);
}

function grossPay(worker) {
  return approvedHours(worker) * payRate(worker);
}

function PayrollCard({ worker }) {
  return (
    <article className={`rounded-[22px] ${industrialPanel} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{worker?.role || "worker"}</div>
          <h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-white">{nameOf(worker)}</h3>
          <p className="mt-1 text-sm font-bold text-slate-300">{worker?.email || "No email saved"}</p>
        </div>
        <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">Payroll</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-sm font-bold">
        <div className="rounded-2xl border border-amber-300/15 bg-black/20 p-3"><span className="block text-[10px] uppercase tracking-[0.14em] text-amber-300">Approved</span><b>{hours(approvedHours(worker))}h</b></div>
        <div className="rounded-2xl border border-amber-300/15 bg-black/20 p-3"><span className="block text-[10px] uppercase tracking-[0.14em] text-amber-300">Pending</span><b>{hours(pendingHours(worker))}h</b></div>
        <div className="rounded-2xl border border-amber-300/15 bg-black/20 p-3"><span className="block text-[10px] uppercase tracking-[0.14em] text-amber-300">Gross</span><b>{money(grossPay(worker))}</b></div>
      </div>
    </article>
  );
}

function StatCard({ label, value }) {
  return <div className={`rounded-[22px] ${industrialPanel} p-4`}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">{label}</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">{value}</div></div>;
}

export default function PayrollCommandPage() {
  const { get } = useApi();
  const [workers, setWorkers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    async function loadPayroll() {
      setLoading(true);
      const res = await get("/team/workers");
      if (!alive) return;
      if (res?.success) {
        setWorkers(arr(res));
        setError("");
      } else {
        setWorkers([]);
        setError(res?.error || "Could not load payroll data");
      }
      setLoading(false);
    }
    loadPayroll();
    return () => { alive = false; };
  }, [get]);

  const list = workers.length ? workers : sampleWorkers;
  const approved = list.reduce((sum, worker) => sum + approvedHours(worker), 0);
  const pending = list.reduce((sum, worker) => sum + pendingHours(worker), 0);
  const gross = list.reduce((sum, worker) => sum + grossPay(worker), 0);
  const review = list.filter((worker) => pendingHours(worker) > 0).length;

  return (
    <main className={industrialPageShell} data-industrial-command-page="payroll">
      <section className={industrialContentLane}>
        <header className={`mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] ${industrialPanel} px-5 py-4`}>
          <div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Payroll Command</div><div className="text-sm font-bold text-slate-300">Review approved hours, pending time and payroll handoff summaries.</div></div>
          <div className="flex flex-wrap gap-3"><Link to="/team" className={`rounded-2xl px-4 py-2 text-sm font-black ${industrialGhost}`}>Team</Link><Link to="/reports" className={`rounded-2xl px-4 py-2 text-sm font-black ${industrialAction}`}>Reports</Link></div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
          <div className={`rounded-[30px] ${industrialPanel} p-6 md:p-8`}>
            <span className={industrialChip}>Payroll Command</span>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Approve the hours. Export the summary.</h1>
            <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Payroll stays locked down to review, summaries and handoff. Churvox does not make tax, bank payout or compliance decisions automatically.</p>
          </div>
          <div className={`rounded-[30px] ${industrialPanel} p-5`}>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Payroll health</div>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-white">What needs attention</h2>
            <div className="mt-5 grid gap-3"><StatCard label="Need review" value={review} /><StatCard label="Approved hours" value={`${hours(approved)}h`} /><StatCard label="Gross estimate" value={money(gross)} /></div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-4"><StatCard label="People" value={list.length} /><StatCard label="Approved" value={`${hours(approved)}h`} /><StatCard label="Pending" value={`${hours(pending)}h`} /><StatCard label="Gross" value={money(gross)} /></section>

        <section className={`mt-5 rounded-[28px] ${industrialPanel} p-5`}>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Payroll review list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Open payroll slips</h2></div>{loading && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">Loading…</span>}{error && <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-200">Showing sample layout</span>}</div>
          <div className="grid gap-4 xl:grid-cols-2">{list.map((worker) => <PayrollCard key={idOf(worker) || nameOf(worker)} worker={worker} />)}</div>
        </section>
      </section>
    </main>
  );
}
