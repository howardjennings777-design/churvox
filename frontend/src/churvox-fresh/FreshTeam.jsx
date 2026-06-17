import React from "react";
import API_BASE from "../lib/apiBase";
import { useApi } from "../hooks/useApi";
import FreshTeamAddPerson from "./FreshTeamAddPerson";

const filters = ["All", "Active", "Invite sent", "Paused"];
const loadEndpoints = ["/team/workers", "/team", "/workers"];

function listFrom(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.workers)) return data.workers;
  if (Array.isArray(data?.team)) return data.team;
  if (Array.isArray(data?.members)) return data.members;
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

function statusOf(member) {
  const text = String(member?.status || member?.invite_status || member?.worker_status || "").toLowerCase();
  if (text.includes("pause") || text.includes("disabled") || text.includes("inactive") || member?.is_active === false || member?.active === false) return "Paused";
  if (text.includes("invite") || text.includes("pending") || member?.invite_pending === true || member?.invited === true) return "Invite sent";
  if (text.includes("active") || member?.is_active === true || member?.active === true || member?.email_verified === true) return "Active";
  return member?.email ? "Active" : "Invite sent";
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
  const role = roleOf(member?.team_role || member?.worker_role || member?.role);
  const status = statusOf(member);
  return {
    ...member,
    id,
    name: member?.name || member?.full_name || member?.display_name || member?.first_name || "Unnamed person",
    role,
    status,
    phone: member?.phone || member?.mobile || "",
    email: member?.email || "",
    payRate: member?.pay_rate || member?.payRate || member?.hourly_rate ? `$${member?.pay_rate || member?.payRate || member?.hourly_rate}/hr` : "Not set",
    availability: member?.availability || member?.available_today || "Not set",
    currentJob: member?.current_job || member?.currentJob || member?.current_job_title || "Not assigned",
    access: role === "Payroll only" ? "Payroll workspace only" : status === "Invite sent" ? "Invite pending" : "Worker app access",
    notes: member?.notes || member?.team_notes || "No notes yet",
    sortTime: dateScore(member),
  };
}

async function deleteFallback(endpoint) {
  const token = window.localStorage.getItem("token") || "";
  const response = await fetch(`${API_BASE}/api${endpoint}`, {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const data = await response.json().catch(() => ({}));
  return response.ok ? { success: true, data } : { success: false, error: data.detail || data.message || data.error || "Delete failed" };
}

export default function FreshTeam({ onNavigate }) {
  const api = useApi();
  const { get, post } = api;
  const deleteMethod = api.del || api.delete || null;
  const [team, setTeam] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [actionMessage, setActionMessage] = React.useState("");

  const visibleTeam = filter === "All" ? team : team.filter((member) => member.status === filter);
  const selected = team.find((member) => member.id === selectedId) || visibleTeam[0] || team[0];
  const activeCount = team.filter((member) => member.status === "Active").length;
  const inviteCount = team.filter((member) => member.status === "Invite sent").length;
  const pausedCount = team.filter((member) => member.status === "Paused").length;

  const loadTeam = React.useCallback(async () => {
    setLoading(true);
    setError("");
    setActionMessage("");
    let lastError = "Could not load team members";
    for (const endpoint of loadEndpoints) {
      try {
        const res = await get(endpoint);
        if (!res?.success) {
          lastError = res?.error || res?.detail || lastError;
          continue;
        }
        const nextTeam = listFrom(res.data).map(normalizeMember).sort((a, b) => b.sortTime - a.sortTime || String(a.name).localeCompare(String(b.name)));
        setTeam(nextTeam);
        setSelectedId((current) => nextTeam.some((member) => member.id === current) ? current : nextTeam[0]?.id || "");
        setLoading(false);
        return;
      } catch (err) {
        lastError = err?.message || lastError;
      }
    }
    setTeam([]);
    setSelectedId("");
    setError(lastError);
    setLoading(false);
  }, [get]);

  React.useEffect(() => { loadTeam(); }, [loadTeam]);
  React.useEffect(() => {
    const onFreshDataUpdated = () => loadTeam();
    window.addEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
    return () => window.removeEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
  }, [loadTeam]);

  async function tryPost(endpoints, body) {
    let last = "Action failed";
    for (const endpoint of endpoints) {
      try {
        const res = await post(endpoint, body || {});
        if (res?.success) return res;
        last = res?.error || res?.detail || last;
      } catch (err) {
        last = err?.message || last;
      }
    }
    return { success: false, error: last };
  }

  async function tryDelete(endpoints) {
    let last = "Could not remove person";
    for (const endpoint of endpoints) {
      try {
        const res = deleteMethod ? await deleteMethod(endpoint) : await deleteFallback(endpoint);
        if (res?.success) return res;
        last = res?.error || res?.detail || last;
      } catch (err) {
        last = err?.message || last;
      }
    }
    return { success: false, error: last };
  }

  async function resendInvite() {
    if (!selected?.id || !selected.email) return;
    setActionMessage("");
    setError("");
    const res = await tryPost([
      `/team/resend-invite/${selected.id}`,
      `/team/workers/${selected.id}/resend-invite`,
      `/workers/${selected.id}/resend-invite`,
    ], {});
    if (!res.success) {
      setError(res.error || "Could not resend invite");
      return;
    }
    setActionMessage(`Invite sent again to ${selected.email}.`);
    loadTeam();
  }

  async function removeSelected() {
    if (!selected?.id) return;
    const ok = window.confirm(`Remove ${selected.name} from this team?`);
    if (!ok) return;
    setActionMessage("");
    setError("");
    const res = await tryDelete([`/team/workers/${selected.id}`, `/workers/${selected.id}`, `/team/${selected.id}`]);
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
      <header className="freshHero"><span>Team</span><h1>Team access</h1><p>Team is your people directory: add workers, send invites, check access, and open the connected worker, schedule, time and payroll areas.</p></header>

      <section className="freshCommandPulse"><aside className="freshCard"><h2>{loading && team.length === 0 ? "…" : activeCount}</h2><p>Active people</p></aside><aside className="freshCard"><h2>{loading && team.length === 0 ? "…" : inviteCount}</h2><p>Invites pending</p></aside><aside className="freshCard"><h2>{loading && team.length === 0 ? "…" : pausedCount}</h2><p>Paused</p></aside></section>

      {error ? <section className="freshCard freshItem need"><b>Team needs attention</b><span>{error}</span><button type="button" className="freshPrimary" onClick={loadTeam}>Retry</button></section> : null}
      {actionMessage ? <section className="freshCard freshItem"><b>Done</b><span>{actionMessage}</span></section> : null}

      <section className="freshCommandFilterBar">{filters.map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}><span>{item}</span><b>{item === "All" ? team.length : team.filter((member) => member.status === item).length}</b></button>)}</section>

      <section className="freshGrid">
        <aside className="freshCard"><h2>Add person</h2><p className="freshMuted">Adding someone creates their team record and prepares worker access. Payroll-only users stay out of reports and owner tools.</p><FreshTeamAddPerson onAdded={loadTeam} onNavigate={onNavigate} /></aside>

        <aside className="freshCard"><h2>People</h2>{loading && team.length === 0 ? <div className="freshItem"><b>Loading team…</b><span>Checking your business account.</span></div> : visibleTeam.map((member) => <button type="button" className={`freshItem ${selected?.id === member.id ? "active" : ""} ${member.status === "Invite sent" ? "need" : ""}`} key={member.id} onClick={() => setSelectedId(member.id)}><b>{member.name}</b><span>{member.role} · {member.status} · {member.access}</span></button>)}{loading && team.length > 0 ? <div className="freshItem"><b>Refreshing team…</b><span>Showing saved people while Churvox refreshes.</span></div> : null}{!loading && visibleTeam.length === 0 ? <div className="freshItem"><b>No people here</b><span>Change the filter or add a person.</span></div> : null}</aside>

        <section className="freshCard"><h2>{selected?.name || "Select person"}</h2>{selected ? <><div className="freshMiniGrid"><div><span>Status</span><b>{selected.status}</b></div><div><span>Role</span><b>{selected.role}</b></div><div><span>Access</span><b>{selected.access}</b></div><div><span>Current job</span><b>{selected.currentJob}</b></div></div><label className="freshField"><span>Name</span><input value={selected.name} readOnly /></label><label className="freshField"><span>Email</span><input value={selected.email || "Not set"} readOnly /></label><label className="freshField"><span>Phone</span><input value={selected.phone || "Not set"} readOnly /></label><label className="freshField"><span>Pay rate</span><input value={selected.payRate} readOnly /></label><label className="freshField"><span>Availability</span><input value={selected.availability} readOnly /></label><label className="freshField"><span>Team notes</span><textarea value={selected.notes} readOnly /></label></> : <div className="freshItem"><b>No team member selected</b><span>Add a person to see their connected record.</span></div>}</section>

        <aside className="freshCard"><h2>Owner actions</h2><p className="freshMuted">Team does not run payroll or dispatch by itself. It opens the right connected area.</p><div className="freshActions"><button className="freshPrimary" type="button" onClick={loadTeam}>Refresh team</button><button className="freshOrange" type="button" disabled={!selected?.id || !selected.email || selected.status === "Active"} onClick={resendInvite}>Resend invite</button><button className="freshDark" type="button" disabled={!selected?.id} onClick={removeSelected}>Remove person</button><button className="freshGhost" type="button" onClick={() => onNavigate?.("workercommand")}>Open worker command</button><button className="freshGhost" type="button" onClick={() => onNavigate?.("time")}>Open time logs</button><button className="freshGhost" type="button" onClick={() => onNavigate?.("dispatch")}>Open Schedule</button><button className="freshGhost" type="button" onClick={() => onNavigate?.("payroll")}>Open Payroll</button></div></aside>
      </section>
    </section>
  );
}
