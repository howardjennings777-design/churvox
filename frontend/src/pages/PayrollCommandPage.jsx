import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { industrialAction, industrialChip, industrialContentLane, industrialGhost, industrialPageShell } from "../components/industrialCommandTheme";

const tileStyle = {
  background: "linear-gradient(135deg, #111827, #070d16)",
  color: "#ffffff",
  boxShadow: "0 18px 46px rgba(2,6,23,.26), inset 0 1px 0 rgba(255,255,255,.06)",
};

function first(...values) { return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || ""; }
function listFrom(res) {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of ["workers", "team", "users", "items", "results", "data"]) if (Array.isArray(data?.[key])) return data[key];
  return [];
}
function idOf(worker) { const raw = worker?.id || worker?._id || worker?.user_id || worker?.worker_id || worker?.employee_id || ""; return typeof raw === "object" && raw?.$oid ? raw.$oid : String(raw || ""); }
function nameOf(worker) { return first(worker?.name, worker?.full_name, worker?.display_name, worker?.email, "Team member"); }
function emailOf(worker) { return first(worker?.email, worker?.email_address, "No email saved"); }
function roleOf(worker) { return String(first(worker?.role, worker?.account_type, worker?.user_role, "worker")).replaceAll("_", " "); }
function isPayrollVisible(worker) { const role = roleOf(worker).toLowerCase(); return role.includes("worker") || role.includes("manager") || role.includes("payroll"); }
function approvedHours(worker) { return Number(first(worker?.approved_hours, worker?.hours_approved, worker?.payroll_hours, worker?.total_hours, 0)) || 0; }
function pendingHours(worker) { return Number(first(worker?.pending_hours, worker?.unapproved_hours, worker?.hours_pending, 0)) || 0; }
function payRate(worker) { return Number(first(worker?.pay_rate, worker?.hourly_rate, worker?.rate, 0)) || 0; }
function grossPay(worker) { return approvedHours(worker) * payRate(worker); }
function money(value) { const n = Number(value || 0); return Number.isFinite(n) ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00"; }
function hours(value) { const n = Number(value || 0); return Number.isFinite(n) ? n.toFixed(n % 1 ? 1 : 0) : "0"; }
function statusOf(worker, reviewed) { if (reviewed) return "Reviewed"; if (pendingHours(worker) > 0) return "Needs review"; if (approvedHours(worker) > 0) return "Ready for export"; return "No hours"; }
function statusClass(worker, reviewed) { if (reviewed) return "bg-emerald-300 text-slate-950"; if (pendingHours(worker) > 0) return "bg-amber-300 text-slate-950"; if (approvedHours(worker) > 0) return "bg-cyan-300 text-slate-950"; return "bg-slate-300 text-slate-950"; }
function Tape({ color = "#a78bfa" }) { return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[26px]" style={{ background: `linear-gradient(180deg, ${color}, #facc15)`, boxShadow: `0 0 18px ${color}66` }} />; }
function Metric({ label, value, text, color }) { return <article className="relative overflow-hidden rounded-[28px] border border-white/10 p-5 pl-7 text-white" style={tileStyle}><Tape color={color} /><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{label}</div><div className="mt-3 text-4xl font-black tracking-[-0.07em] text-white">{value}</div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{text}</p></article>; }
function Detail({ label, value }) { return <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{label}</div><div className="mt-2 text-sm font-black leading-6 text-white">{String(value || "Not saved")}</div></div>; }

function exportCsv(rows, reviewedIds = {}) {
  const header = ["Name", "Email", "Role", "Approved Hours", "Pending Hours", "Pay Rate", "Gross Estimate", "Review Status"];
  const body = rows.map((worker) => {
    const key = idOf(worker) || nameOf(worker);
    return [nameOf(worker), emailOf(worker), roleOf(worker), hours(approvedHours(worker)), hours(pendingHours(worker)), payRate(worker), grossPay(worker), reviewedIds[key] ? "Reviewed" : statusOf(worker, false)];
  });
  const csv = [header, ...body].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `churvox-payroll-summary-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function PayrollSlip({ worker, reviewed, onClose, onReview, onExportOne }) {
  if (!worker) return null;
  return (
    <div className="fixed inset-0 z-[2147483600] overflow-y-auto bg-slate-950/92 p-3 text-white backdrop-blur-xl md:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl md:min-h-[calc(100vh-48px)]">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7">
          <div><div className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Payroll review slip</div><h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white md:text-6xl">{nameOf(worker)}</h2><p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300 md:text-base">{roleOf(worker)} · {emailOf(worker)} · {statusOf(worker, reviewed)}</p></div>
          <button type="button" onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button>
        </header>
        <div className="grid flex-1 gap-5 p-5 md:grid-cols-[1.15fr_.85fr] md:p-7">
          <section className="space-y-5">
            <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Review pay summary</div><div className="mt-4 grid gap-3 md:grid-cols-2"><Detail label="Approved hours" value={`${hours(approvedHours(worker))}h`} /><Detail label="Pending hours" value={`${hours(pendingHours(worker))}h`} /><Detail label="Pay rate" value={payRate(worker) ? money(payRate(worker)) : "Not set"} /><Detail label="Gross estimate" value={money(grossPay(worker))} /><Detail label="Role" value={roleOf(worker)} /><Detail label="Email" value={emailOf(worker)} /></div></section>
            <section className="rounded-[28px] border border-amber-300/25 bg-amber-300/10 p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Safety scope</div><p className="mt-2 text-sm font-bold leading-6 text-amber-50">This is a payroll handoff workspace only. Churvox does not submit taxes, create bank payout files, file government returns, or make compliance decisions.</p></section>
          </section>
          <aside className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Payroll action</div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">Marking this reviewed only marks the summary reviewed inside Churvox. It does not process pay.</p>{reviewed ? <div className="mt-4 rounded-3xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm font-black text-emerald-100">Reviewed. Ready for CSV handoff.</div> : null}<div className="mt-5 grid gap-3"><button type="button" onClick={onReview} className="rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black text-slate-950">Mark summary reviewed</button><button type="button" onClick={onExportOne} className="rounded-2xl bg-amber-300 px-5 py-4 text-sm font-black text-slate-950">Export this worker CSV</button><Link to="/reports-board" onClick={onClose} className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 no-underline">Open reports</Link><button type="button" onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Back to payroll</button></div></aside>
        </div>
      </div>
    </div>
  );
}

function PayrollRow({ worker, reviewed, onOpen }) {
  const tape = reviewed ? "#34d399" : pendingHours(worker) > 0 ? "#facc15" : approvedHours(worker) > 0 ? "#22d3ee" : "#a78bfa";
  return <button type="button" onClick={() => onOpen(worker)} className="relative w-full overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.06] p-4 pl-7 text-left text-white transition hover:border-cyan-300/40 hover:bg-white/[0.09] active:scale-[0.99]"><Tape color={tape} /><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xl font-black tracking-[-0.05em] text-white">{nameOf(worker)}</h3><p className="mt-1 line-clamp-1 text-sm font-bold leading-6 text-slate-300">{hours(approvedHours(worker))}h approved · {hours(pendingHours(worker))}h pending · {money(grossPay(worker))}</p></div><span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusClass(worker, reviewed)}`}>{statusOf(worker, reviewed)}</span></div></button>;
}

export default function PayrollCommandPage() {
  const { get } = useApi();
  const [workers, setWorkers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedWorker, setSelectedWorker] = React.useState(null);
  const [reviewedIds, setReviewedIds] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("churvox_payroll_reviewed") || "{}"); } catch { return {}; }
  });

  React.useEffect(() => { let alive = true; async function loadPayroll() { try { setLoading(true); const res = await get("/team/workers"); if (!alive) return; setWorkers(listFrom(res).filter(isPayrollVisible)); } catch (error) { console.warn("Payroll page load failed", error); if (alive) setWorkers([]); } finally { if (alive) setLoading(false); } } loadPayroll(); return () => { alive = false; }; }, [get]);

  function markReviewed(worker) {
    const key = idOf(worker) || nameOf(worker);
    const next = { ...reviewedIds, [key]: true };
    setReviewedIds(next);
    localStorage.setItem("churvox_payroll_reviewed", JSON.stringify(next));
    toast.success("Payroll summary marked reviewed");
  }

  const approved = workers.reduce((sum, worker) => sum + approvedHours(worker), 0);
  const pending = workers.reduce((sum, worker) => sum + pendingHours(worker), 0);
  const gross = workers.reduce((sum, worker) => sum + grossPay(worker), 0);
  const review = workers.filter((worker) => pendingHours(worker) > 0 && !reviewedIds[idOf(worker) || nameOf(worker)]).length;
  const selectedId = selectedWorker ? idOf(selectedWorker) || nameOf(selectedWorker) : "current";

  return (
    <main className={industrialPageShell} data-industrial-simple-page="payroll" data-command-canvas>
      <section className={`${industrialContentLane} space-y-5`}>
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 p-5 pl-8 text-white md:p-7 md:pl-9" style={tileStyle}><Tape color="#a78bfa" /><span className={industrialChip}>Payroll</span><h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Review hours. Mark summaries. Export the handoff.</h1><p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Payroll is locked to review, approved hours, summaries and CSV export. No tax submission, no bank payout files, no automatic compliance decisions.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => exportCsv(workers, reviewedIds)} className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>Export payroll CSV</button><Link to="/team-board" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Team</Link><Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link></div></section>
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Metric label="Need review" value={loading ? "…" : review} text="People with pending hours not reviewed." color="#facc15" /><Metric label="Approved" value={`${hours(approved)}h`} text="Approved hours ready for handoff." color="#34d399" /><Metric label="Pending" value={`${hours(pending)}h`} text="Unapproved hours to check." color="#fb923c" /><Metric label="Gross estimate" value={money(gross)} text="Gross estimate only, before payroll processing." color="#a78bfa" /></section>
        <section className="rounded-[30px] border border-white/10 p-5 text-white md:p-6" style={tileStyle}><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Payroll review list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Tap a person to review pay</h2></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">{loading ? "Loading…" : `${workers.length} people`}</span></div>{workers.length ? <div className="grid gap-3">{workers.map((worker, index) => <PayrollRow key={idOf(worker) || `${nameOf(worker)}-${index}`} worker={worker} reviewed={Boolean(reviewedIds[idOf(worker) || nameOf(worker)])} onOpen={setSelectedWorker} />)}</div> : <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-5"><h3 className="text-2xl font-black tracking-[-0.05em] text-white">No payroll people showing yet.</h3><p className="mt-2 text-sm font-bold leading-6 text-slate-300">Add workers or approved hours and payroll review slips will appear here. No sample payroll data is shown.</p></div>}</section>
      </section>
      <PayrollSlip worker={selectedWorker} reviewed={Boolean(reviewedIds[selectedId])} onClose={() => setSelectedWorker(null)} onReview={() => selectedWorker && markReviewed(selectedWorker)} onExportOne={() => selectedWorker && exportCsv([selectedWorker], reviewedIds)} />
    </main>
  );
}
