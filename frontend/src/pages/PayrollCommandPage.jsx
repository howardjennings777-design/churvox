import React from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import CommandSlipEverything from "../components/CommandSlipEverything";

const sampleWorkers = [
  { id: "sample-p1", name: "Mike", email: "mike@example.com", role: "worker", approved_hours: 32.5, pending_hours: 2.5, pay_rate: 32, status: "needs_review" },
  { id: "sample-p2", name: "Tane", email: "tane@example.com", role: "manager", approved_hours: 38, pending_hours: 0, pay_rate: 38, status: "ready" },
  { id: "sample-p3", name: "Jo", email: "jo@example.com", role: "worker", approved_hours: 24, pending_hours: 4, pay_rate: 30, status: "needs_review" },
];

const shell = "fixed inset-0 z-[2147483000] overflow-y-auto bg-[radial-gradient(circle_at_8%_0%,rgba(250,204,21,.16),transparent_28%),radial-gradient(circle_at_90%_6%,rgba(34,211,238,.18),transparent_30%),linear-gradient(135deg,#111827_0%,#0b1220_48%,#05070b_100%)] pl-[286px] text-slate-50";
const content = "min-w-0 flex-1 p-4 pb-28 md:p-6 md:pb-28 xl:p-8 xl:pb-28";
const industrialPanel = "border border-amber-300/20 bg-[linear-gradient(135deg,rgba(17,24,39,.96),rgba(11,18,32,.91))] text-slate-50 shadow-[0_22px_70px_rgba(2,6,23,.34),inset_0_1px_0_rgba(255,255,255,.06)]";
const statPanel = `rounded-[22px] ${industrialPanel} p-4`;
const chip = "inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300";
const darkButton = "rounded-2xl border border-amber-300/25 bg-white/10 px-4 py-2 text-sm font-black text-slate-50 hover:bg-white/15";
const actionButton = "rounded-2xl bg-[linear-gradient(135deg,#facc15,#fb923c_52%,#22d3ee)] px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-orange-500/20";

function arr(value) {
  const data = value?.data ?? value;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.workers)) return data.workers;
  if (Array.isArray(data?.team)) return data.team;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function idOf(record) {
  const raw = record?.id || record?._id || record?.user_id || record?.worker_id || record?.job_id || "";
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

function statusOf(worker) {
  const pending = Number(worker?.pending_hours || worker?.unapproved_hours || 0);
  const raw = String(worker?.payroll_status || worker?.status || "").toLowerCase().replaceAll(" ", "_");
  if (pending > 0) return "needs_review";
  if (raw) return raw;
  return "ready";
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

function pretty(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function statusStyle(status) {
  if (["ready", "approved", "complete"].includes(status)) return "border-emerald-300/30 bg-emerald-300/10 text-emerald-200";
  if (["needs_review", "pending", "unapproved"].includes(status)) return "border-amber-300/35 bg-amber-300/10 text-amber-200";
  if (["blocked", "error"].includes(status)) return "border-red-300/35 bg-red-300/10 text-red-200";
  return "border-slate-300/20 bg-white/10 text-slate-200";
}

function PayrollCard({ worker, onOpen }) {
  const status = statusOf(worker);
  return (
    <article className={`rounded-[22px] ${industrialPanel} p-4 transition hover:-translate-y-0.5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{worker?.role || "worker"}</span>
          <h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-white">{nameOf(worker)}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusStyle(status)}`}>{pretty(status)}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-sm font-bold text-slate-200">
        <div className="rounded-2xl border border-amber-300/15 bg-black/20 p-3"><span className="block text-[10px] uppercase tracking-[0.14em] text-amber-300">Approved</span><b>{hours(approvedHours(worker))}h</b></div>
        <div className="rounded-2xl border border-amber-300/15 bg-black/20 p-3"><span className="block text-[10px] uppercase tracking-[0.14em] text-amber-300">Pending</span><b>{hours(pendingHours(worker))}h</b></div>
        <div className="rounded-2xl border border-amber-300/15 bg-black/20 p-3"><span className="block text-[10px] uppercase tracking-[0.14em] text-amber-300">Gross</span><b>{money(grossPay(worker))}</b></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpen(worker)} className={darkButton}>Review slip</button>
        <Link to="/reports" className={actionButton}>Reports</Link>
      </div>
    </article>
  );
}

function PayrollSlip({ worker, onClose }) {
  if (!worker) return null;
  const status = statusOf(worker);
  return (
    <div className="fixed inset-0 z-[2147483647] h-[100dvh] w-screen overflow-hidden bg-[#05070b] pl-[286px] text-slate-50" role="dialog" aria-modal="true">
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_8%_0%,rgba(250,204,21,.16),transparent_28%),radial-gradient(circle_at_90%_6%,rgba(34,211,238,.18),transparent_30%),linear-gradient(135deg,#111827_0%,#0b1220_48%,#05070b_100%)]">
        <header className="relative overflow-hidden border-b border-amber-300/20 bg-slate-950/80 p-6 text-white md:p-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className={chip}>Full screen payroll slip</div>
              <h2 className="mt-4 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-5xl">{nameOf(worker)}</h2>
            </div>
            <button type="button" onClick={onClose} className={darkButton}>Close</button>
          </div>
          <p className="relative mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-300">{worker?.email || "No email"} · {pretty(status)}</p>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          <section className={`rounded-[26px] ${industrialPanel} p-5`}>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">What needs attention</div>
            <p className="mt-3 text-lg font-black tracking-[-0.035em] text-white">Status: {pretty(status)}</p>
            <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm font-bold leading-6 text-amber-100">Payroll is review/export only here. No tax, bank payout or compliance decision is made automatically.</div>
          </section>

          <section className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className={`rounded-2xl ${industrialPanel} p-4`}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Approved hours</div><div className="mt-1 text-sm font-black text-white">{hours(approvedHours(worker))}h</div></div>
            <div className={`rounded-2xl ${industrialPanel} p-4`}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Pending hours</div><div className="mt-1 text-sm font-black text-white">{hours(pendingHours(worker))}h</div></div>
            <div className={`rounded-2xl ${industrialPanel} p-4`}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Rate</div><div className="mt-1 text-sm font-black text-white">{payRate(worker) ? money(payRate(worker)) : "Not set"}</div></div>
            <div className={`rounded-2xl ${industrialPanel} p-4`}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Gross estimate</div><div className="mt-1 text-sm font-black text-white">{money(grossPay(worker))}</div></div>
          </section>

          <CommandSlipEverything record={worker} context="PayrollSlip" />
        </main>

        <footer className="flex flex-wrap gap-3 border-t border-amber-300/20 bg-slate-950/80 p-5">
          <Link to="/reports" className={actionButton}>Open reports</Link>
          <Link to="/team" className={darkButton}>Open team</Link>
        </footer>
      </div>
    </div>
  );
}

function PayrollCommandContent() {
  const { get } = useApi();
  const [workers, setWorkers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [activeWorker, setActiveWorker] = React.useState(null);

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
  const counts = React.useMemo(() => {
    const people = list.length;
    const approved = list.reduce((sum, worker) => sum + approvedHours(worker), 0);
    const pending = list.reduce((sum, worker) => sum + pendingHours(worker), 0);
    const gross = list.reduce((sum, worker) => sum + grossPay(worker), 0);
    const review = list.filter((worker) => statusOf(worker) === "needs_review" || pendingHours(worker) > 0).length;
    return { people, approved, pending, gross, review };
  }, [list]);

  return (
    <main className={shell}>
      <section className={content}>
        <header className={`mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] ${industrialPanel} px-5 py-4`}>
          <div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Payroll Command</div><div className="text-sm font-bold text-slate-300">Review approved hours, pending time and payroll handoff summaries.</div></div>
          <div className="flex flex-wrap gap-3"><Link to="/team" className={darkButton}>Team</Link><Link to="/reports" className={actionButton}>Reports</Link></div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
          <div className={`overflow-hidden rounded-[30px] ${industrialPanel}`}>
            <div className="relative p-6 md:p-8">
              <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />
              <div className="relative">
                <span className={chip}>Payroll Command</span>
                <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Approve the hours. Export the summary.</h1>
                <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Payroll stays locked down to review, summaries and handoff. Churvox does not make tax, bank payout or compliance decisions automatically.</p>
              </div>
            </div>
          </div>
          <div className={`rounded-[30px] ${industrialPanel} p-5`}>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Payroll health</div>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-white">What needs attention</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4"><div className="text-2xl font-black text-amber-200">{counts.review}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-amber-300">Need review</div></div>
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4"><div className="text-2xl font-black text-cyan-100">{hours(counts.approved)}h</div><div className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">Approved hours</div></div>
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4"><div className="text-2xl font-black text-emerald-100">{money(counts.gross)}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-200">Gross estimate</div></div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-4">
          <div className={statPanel}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">People</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">{counts.people}</div></div>
          <div className={statPanel}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Approved</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">{hours(counts.approved)}h</div></div>
          <div className={statPanel}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Pending</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">{hours(counts.pending)}h</div></div>
          <div className={statPanel}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Gross</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">{money(counts.gross)}</div></div>
        </section>

        <section className={`mt-5 rounded-[28px] ${industrialPanel} p-5`}>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Payroll review list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Open payroll slips</h2></div>{loading && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">Loading…</span>}{error && <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-200">Showing sample layout</span>}</div>
          <div className="grid gap-4 xl:grid-cols-2">
            {list.map((worker) => <PayrollCard key={idOf(worker) || nameOf(worker)} worker={worker} onOpen={setActiveWorker} />)}
          </div>
        </section>
      </section>
      <PayrollSlip worker={activeWorker} onClose={() => setActiveWorker(null)} />
    </main>
  );
}

export default function PayrollCommandPage() {
  if (typeof document === "undefined") return <PayrollCommandContent />;
  return createPortal(<PayrollCommandContent />, document.body);
}
