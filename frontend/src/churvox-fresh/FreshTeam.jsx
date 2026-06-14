import React from "react";
import { useApi } from "../hooks/useApi";
import FreshTeamAddPerson from "./FreshTeamAddPerson";

const filters = ["All", "Active", "Invite sent", "Paused"];

function listFrom(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.workers)) return data.workers;
  if (Array.isArray(data?.team)) return data.team;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function idOf(member, fallback) {
  const raw = member?.id || member?._id || member?.worker_id || member?.user_id || fallback;
  if (typeof raw === "object") return raw.$oid || raw.id || raw._id || fallback;
  return String(raw || fallback);
}

function statusOf(value) {
  const text = String(value || "invited").toLowerCase();
  if (text.includes("active")) return "Active";
  if (text.includes("pause") || text.includes("disabled") || text.includes("inactive")) return "Paused";
  return "Invite sent";
}

function roleOf(value) {
  const text = String(value || "worker").toLowerCase();
  if (text.includes("lead")) return "Lead worker";
  if (text.includes("sub")) return "Subcontractor";
  if (text.includes("payroll")) return "Payroll only";
  if (text.includes("manager")) return "Manager";
  return "Worker";
}

function dateScore(member) {
  const raw = member?.created_at || member?.createdAt || member?.updated_at || member?.updatedAt || "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMember(member, index) {
  const id = idOf(member, `worker-${index}`);
  return {
    ...member,
    id,
    name: member?.name || member?.full_name || member?.display_name || "Unnamed person",
    role: roleOf(member?.team_role || member?.worker_role || member?.role),
    status: statusOf(member?.status),
    phone: member?.phone || member?.mobile || "",
    email: member?.email || "",
    payRate: member?.pay_rate || member?.payRate || member?.hourly_rate ? `$${member?.pay_rate || member?.payRate || member?.hourly_rate}/hr` : "Not set",
    availability: member?.availability || "Not set",
    currentJob: member?.current_job || member?.currentJob || "Not assigned",
    notes: member?.notes || "No notes yet",
    sortTime: dateScore(member),
  };
}

export default function FreshTeam({ onNavigate }) {
  const { get, post, del } = useApi();
  const [team, setTeam] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [actionMessage, setActionMessage] = React.useState("");

  const visibleTeam = filter === "All" ? team : team.filter((member) => member.status === filter);
  const selected = team.find((member) => member.id === selectedId) || visibleTeam[0] || team[0];

  const loadTeam = React.useCallback(async () => {
    setLoading(true);
    setError("");
    setActionMessage("");
    const res = await get("/team/workers");
    if (!res.success) {
      setTeam([]);
      setSelectedId("");
      setError(res.error || "Could not load team members");
      setLoading(false);
      return;
    }
    const nextTeam = listFrom(res.data).map(normalizeMember).sort((a, b) => b.sortTime - a.sortTime || String(a.name).localeCompare(String(b.name)));
    setTeam(nextTeam);
    setSelectedId((current) => nextTeam.some((member) => member.id === current) ? current : nextTeam[0]?.id || "");
    setLoading(false);
  }, [get]);

  React.useEffect(() => { loadTeam(); }, [loadTeam]);
  React.useEffect(() => {
    const onFreshDataUpdated = () => loadTeam();
    window.addEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
    return () => window.removeEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
  }, [loadTeam]);

  async function resendInvite() {
    if (!selected?.id) return;
    setActionMessage("");
    setError("");
    const res = await post(`/team/resend-invite/${selected.id}`, {});
    if (!res.success) {
      setError(res.error || "Could not resend invite");
      return;
    }
    setActionMessage("Invite sent again.");
    loadTeam();
  }

  async function removeSelected() {
    if (!selected?.id) return;
    const ok = window.confirm(`Remove ${selected.name} from this team?`);
    if (!ok) return;
    setActionMessage("");
    setError("");
    const res = await del(`/team/workers/${selected.id}`);
    if (!res.success) {
      setError(res.error || "Could not remove person");
      return;
    }
    setActionMessage(`${selected.name} was removed.`);
    setTeam((current) => current.filter((member) => member.id !== selected.id));
    setSelectedId("");
  }

  return (
    <section>
      <header className="freshHero"><span>Team</span><h1>Team</h1><p>Add people, send invites, and keep your crew connected to jobs, time logs and payroll.</p></header>

      <section className="freshCommandPulse"><aside className="freshCard"><h2>{loading && team.length === 0 ? "…" : team.filter((member) => member.status === "Active").length}</h2><p>Active people</p></aside><aside className="freshCard"><h2>{loading && team.length === 0 ? "…" : team.filter((member) => member.status === "Invite sent").length}</h2><p>Invites pending</p></aside><aside className="freshCard"><h2>{loading && team.length === 0 ? "…" : team.length}</h2><p>Total people</p></aside></section>

      {error ? <section className="freshCard freshItem need"><b>Team needs attention</b><span>{error}</span><button type="button" className="freshPrimary" onClick={loadTeam}>Retry</button></section> : null}
      {actionMessage ? <section className="freshCard freshItem"><b>Done</b><span>{actionMessage}</span></section> : null}

      <section className="freshCommandFilterBar">{filters.map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}><span>{item}</span><b>{item === "All" ? team.length : team.filter((member) => member.status === item).length}</b></button>)}</section>

      <section className="freshGrid">
        <aside className="freshCard"><h2>Add person</h2><FreshTeamAddPerson onAdded={loadTeam} onNavigate={onNavigate} /></aside>

        <aside className="freshCard"><h2>Team list</h2>{loading && team.length === 0 ? <div className="freshItem"><b>Loading team…</b><span>Checking your business account.</span></div> : visibleTeam.map((member) => <button type="button" className={`freshItem ${selected?.id === member.id ? "active" : ""} ${member.status === "Invite sent" ? "need" : ""}`} key={member.id} onClick={() => setSelectedId(member.id)}><b>{member.name}</b><span>{member.role} · {member.status} · {member.currentJob}</span></button>)}{loading && team.length > 0 ? <div className="freshItem"><b>Refreshing team…</b><span>Showing saved people while Churvox refreshes.</span></div> : null}{!loading && visibleTeam.length === 0 ? <div className="freshItem"><b>No team members</b><span>Add a person to start the team workflow.</span></div> : null}</aside>

        <section className="freshCard"><h2>{selected?.name || "Select person"}</h2>{selected ? <><div className="freshMiniGrid"><div><span>Status</span><b>{selected.status}</b></div><div><span>Role</span><b>{selected.role}</b></div><div><span>Pay</span><b>{selected.payRate}</b></div><div><span>Current job</span><b>{selected.currentJob}</b></div></div><label className="freshField"><span>Name</span><input value={selected.name} readOnly /></label><label className="freshField"><span>Role</span><input value={selected.role} readOnly /></label><label className="freshField"><span>Email</span><input value={selected.email} readOnly /></label><label className="freshField"><span>Phone</span><input value={selected.phone} readOnly /></label><label className="freshField"><span>Availability</span><input value={selected.availability} readOnly /></label><label className="freshField"><span>Team notes</span><textarea value={selected.notes} readOnly /></label></> : <div className="freshItem"><b>No team member selected</b><span>Add a person to see their connected record.</span></div>}</section>

        <aside className="freshCard"><h2>Owner actions</h2><div className="freshActions"><button className="freshPrimary" type="button" onClick={loadTeam}>Refresh team</button><button className="freshOrange" type="button" disabled={!selected?.id || selected.status !== "Invite sent"} onClick={resendInvite}>Resend invite</button><button className="freshDark" type="button" disabled={!selected?.id} onClick={removeSelected}>Remove person</button><button className="freshGhost" type="button" onClick={() => onNavigate?.("dispatch")}>Open Schedule</button><button className="freshGhost" type="button" onClick={() => onNavigate?.("payroll")}>Open payroll</button></div></aside>
      </section>
    </section>
  );
}
