import React from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { industrialAction, industrialChip, industrialContentLane, industrialGhost, industrialPageShell } from "../components/industrialCommandTheme";

const tileStyle = {
  background: "linear-gradient(135deg, #111827, #070d16)",
  color: "#ffffff",
  boxShadow: "0 18px 46px rgba(2,6,23,.26), inset 0 1px 0 rgba(255,255,255,.06)",
};

const roles = [
  ["Owner", "Full business control, billing, settings and approvals.", "Full access"],
  ["Manager", "Day-to-day jobs, crew and customer operations.", "Operations"],
  ["Office Admin", "Clients, quotes, invoices and admin follow-up.", "Admin"],
  ["Worker", "Mobile job list, acknowledge, start, pause, complete and photos.", "Field"],
  ["Payroll", "Payroll workspace, approved hours and exports.", "Payroll"],
];

function first(...values) { return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || ""; }
function listFrom(res) {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of ["workers", "team", "users", "items", "results", "data"]) if (Array.isArray(data?.[key])) return data[key];
  return [];
}
function idOf(member) { const raw = member?.id || member?._id || member?.user_id || member?.worker_id || member?.employee_id || ""; return typeof raw === "object" && raw?.$oid ? raw.$oid : String(raw || ""); }
function nameOf(member) { return first(member?.name, member?.full_name, member?.display_name, member?.email, "Team member"); }
function emailOf(member) { return first(member?.email, member?.email_address, "No email saved"); }
function phoneOf(member) { return first(member?.phone, member?.mobile, member?.phone_number, "No phone saved"); }
function roleOf(member) { return String(first(member?.role, member?.account_type, member?.user_role, "worker")).replaceAll("_", " "); }
function statusOf(member) { return String(first(member?.status, member?.invite_status, member?.employment_status, "active")).replaceAll("_", " "); }
function rawRole(member) { return roleOf(member).toLowerCase(); }
function rawStatus(member) { return statusOf(member).toLowerCase(); }
function isWorker(member) { return rawRole(member).includes("worker") || rawRole(member).includes("field"); }
function isPayroll(member) { return rawRole(member).includes("payroll"); }
function isPending(member) { const status = rawStatus(member); return status.includes("invite") || status.includes("pending"); }
function isActive(member) { const status = rawStatus(member); return !status.includes("inactive") && !status.includes("archive"); }
function statusClass(member) {
  if (!isActive(member)) return "bg-slate-300 text-slate-950";
  if (isPending(member)) return "bg-amber-300 text-slate-950";
  if (isPayroll(member)) return "bg-purple-300 text-slate-950";
  if (isWorker(member)) return "bg-cyan-300 text-slate-950";
  return "bg-emerald-300 text-slate-950";
}
function detailsFor(member) {
  return { Name: nameOf(member), Role: roleOf(member), Status: statusOf(member), Email: emailOf(member), Phone: phoneOf(member), Notes: first(member?.notes, member?.description, "No notes saved") };
}
function Tape({ color = "#22d3ee" }) { return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[26px]" style={{ background: `linear-gradient(180deg, ${color}, #facc15)`, boxShadow: `0 0 18px ${color}66` }} />; }
function Metric({ label, value, text, color }) {
  return <article className="relative overflow-hidden rounded-[28px] border border-white/10 p-5 pl-7 text-white" style={tileStyle}><Tape color={color} /><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{label}</div><div className="mt-3 text-4xl font-black tracking-[-0.07em] text-white">{value}</div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{text}</p></article>;
}
function DetailRow({ label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{label}</div><div className="mt-2 text-sm font-black leading-6 text-white">{String(value || "Not saved")}</div></div>;
}
function TeamSlip({ member, approved, onClose, onApprove }) {
  if (!member) return null;
  const details = detailsFor(member);
  return (
    <div className="fixed inset-0 z-[2147483600] overflow-y-auto bg-slate-950/92 p-3 text-white backdrop-blur-xl md:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl md:min-h-[calc(100vh-48px)]">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7">
          <div><div className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Team slip</div><h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white md:text-6xl">{nameOf(member)}</h2><p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300 md:text-base">{roleOf(member)} · {emailOf(member)} · {statusOf(member)}</p></div>
          <button type="button" onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button>
        </header>
        <div className="grid flex-1 gap-5 p-5 md:grid-cols-[1.15fr_.85fr] md:p-7">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Review this team member</div><div className="mt-4 grid gap-3 md:grid-cols-2">{Object.entries(details).map(([label, value]) => <DetailRow key={label} label={label} value={value} />)}</div></section>
          <aside className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Owner action</div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">Review the person here first. Keep roles simple and only open another page when needed.</p>{approved ? <div className="mt-4 rounded-3xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm font-black text-emerald-100">Approved. This team slip is marked reviewed.</div> : null}<div className="mt-5 grid gap-3"><button type="button" onClick={onApprove} className="rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black text-slate-950">Approve slip</button><Link to="/jobs" onClick={onClose} className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 no-underline">Open jobs</Link><button type="button" onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Back to team</button></div></aside>
        </div>
      </div>
    </div>
  );
}
function TeamRow({ member, onOpen }) {
  const tape = isPayroll(member) ? "#a78bfa" : isWorker(member) ? "#22d3ee" : isPending(member) ? "#facc15" : "#34d399";
  return <button type="button" onClick={() => onOpen(member)} className="relative w-full overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.06] p-4 pl-7 text-left text-white transition hover:border-cyan-300/40 hover:bg-white/[0.09] active:scale-[0.99]"><Tape color={tape} /><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xl font-black tracking-[-0.05em] text-white">{nameOf(member)}</h3><p className="mt-1 line-clamp-1 text-sm font-bold leading-6 text-slate-300">{emailOf(member)} · {phoneOf(member)} · {roleOf(member)}</p></div><span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusClass(member)}`}>{statusOf(member)}</span></div></button>;
}

export default function TeamCommandPage() {
  const { get } = useApi();
  const [members, setMembers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedMember, setSelectedMember] = React.useState(null);
  const [approvedIds, setApprovedIds] = React.useState({});
  React.useEffect(() => { let alive = true; async function loadTeam() { try { setLoading(true); const res = await get("/team/workers"); if (alive) setMembers(listFrom(res)); } catch (error) { console.warn("Team page load failed", error); if (alive) setMembers([]); } finally { if (alive) setLoading(false); } } loadTeam(); return () => { alive = false; }; }, [get]);
  const active = members.filter(isActive);
  const field = members.filter(isWorker);
  const payroll = members.filter(isPayroll);
  const pending = members.filter(isPending);
  const selectedId = selectedMember ? idOf(selectedMember) || nameOf(selectedMember) : "current";
  return (
    <main className={industrialPageShell} data-industrial-simple-page="team" data-command-canvas>
      <section className={`${industrialContentLane} space-y-5`}>
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 p-5 pl-8 text-white md:p-7 md:pl-9" style={tileStyle}><Tape color="#22d3ee" /><span className={industrialChip}>Team</span><h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Crew control, roles, and access in one place.</h1><p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Tap a person to open their full-screen team slip. Keep access clean and role-safe.</p><div className="mt-5 flex flex-wrap gap-3"><Link to="/crew-map" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>Open crew map</Link><Link to="/payroll" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Payroll</Link><Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link></div></section>
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Metric label="Active" value={loading ? "…" : active.length} text="People counted as active." color="#34d399" /><Metric label="Field workers" value={loading ? "…" : field.length} text="Workers connected to jobs." color="#22d3ee" /><Metric label="Payroll" value={loading ? "…" : payroll.length} text="Payroll workspace users." color="#a78bfa" /><Metric label="Invites" value={loading ? "…" : pending.length} text="Pending team access." color="#facc15" /></section>
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)]"><section className="rounded-[30px] border border-white/10 p-5 text-white md:p-6" style={tileStyle}><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Team list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Tap a person to review access</h2></div>{loading ? <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">Loading…</span> : <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">{members.length} people</span>}</div>{members.length ? <div className="grid gap-3">{members.map((member, index) => <TeamRow key={idOf(member) || `${nameOf(member)}-${index}`} member={member} onOpen={setSelectedMember} />)}</div> : <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-5"><h3 className="text-2xl font-black tracking-[-0.05em] text-white">No team members showing yet.</h3><p className="mt-2 text-sm font-bold leading-6 text-slate-300">When workers or staff are invited, they will appear here for review.</p></div>}</section><aside className="rounded-[30px] border border-white/10 p-5 text-white md:p-6" style={tileStyle}><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Role model</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Five clear roles</h2><div className="mt-5 grid gap-3">{roles.map(([role, copy, badge]) => <div key={role} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><div className="flex items-start justify-between gap-3"><b className="text-lg font-black tracking-[-0.04em] text-white">{role}</b><span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200">{badge}</span></div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{copy}</p></div>)}</div></aside></section>
      </section>
      <TeamSlip member={selectedMember} approved={Boolean(approvedIds[selectedId])} onClose={() => setSelectedMember(null)} onApprove={() => setApprovedIds((prev) => ({ ...prev, [selectedId]: true }))} />
    </main>
  );
}
