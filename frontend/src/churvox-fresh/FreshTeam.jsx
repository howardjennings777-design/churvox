import React from "react";
import API_BASE from "../lib/apiBase";
import { useApi } from "../hooks/useApi";
import FreshTeamAddPerson from "./FreshTeamAddPerson";
import FreshCsvImportButton from "./FreshCsvImportButton";

const loadEndpoints = ["/team/workers", "/team", "/workers"];

const modalBackdropStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "grid",
  placeItems: "center",
  padding: 20,
  background: "rgba(15, 23, 42, .56)",
  backdropFilter: "blur(8px)",
};

const modalPanelStyle = {
  width: "min(720px, calc(100vw - 32px))",
  maxHeight: "calc(100vh - 48px)",
  overflow: "auto",
};

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
  if (text.includes("invite") || text.includes("pending") || member?.invite_pending === true || member?.invited === true) return "Invite pending";
  if (text.includes("active") || member?.is_active === true || member?.active === true || member?.email_verified === true) return "Active";
  return member?.email ? "Active" : "Invite pending";
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

function normalizePayRate(member) {
  const raw = member?.pay_rate || member?.payRate || member?.hourly_rate;
  return raw ? `$${raw}/hr` : "Not set";
}

function normalizeMember(member, index) {
  const id = idOf(member, `worker-${index}`);
  const role = roleOf(member?.team_role || member?.worker_role || member?.role);
  const status = statusOf(member);
  const access = role === "Payroll only" ? "Payroll workspace" : status === "Invite pending" ? "Invite pending" : "Worker app";
  return {
    ...member,
    id,
    name: member?.name || member?.full_name || member?.display_name || member?.first_name || "Unnamed person",
    role,
    status,
    phone: member?.phone || member?.mobile || "",
    email: member?.email || "",
    payRate: normalizePayRate(member),
    availability: member?.availability || member?.available_today || "Not set",
    currentJob: member?.current_job || member?.currentJob || member?.current_job_title || "Not assigned",
    access,
    notes: member?.notes || member?.team_notes || "No notes saved",
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

function DetailBox({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <b>{value || "Not set"}</b>
    </div>
  );
}

export default function FreshTeam({ onNavigate }) {
  const api = useApi();
  const { get, post } = api;
  const deleteMethod = api.del || api.delete || null;
  const [team, setTeam] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [actionMessage, setActionMessage] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);

  const selected = team.find((member) => member.id === selectedId) || team[0];
  const workerAccessCount = team.filter((member) => member.access === "Worker app").length;
  const payrollOnlyCount = team.filter((member) => member.role === "Payroll only").length;

  const loadTeam = React.useCallback(async ({ keepMessage = false } = {}) => {
    setLoading(true);
    setError("");
    if (!keepMessage) setActionMessage("");
    let lastError = "Could not load team members";
    for (const endpoint of loadEndpoints) {
      try {
        const res = await get(endpoint);
        if (!res?.success) {
          lastError = res?.error || res?.detail || lastError;
          continue;
        }
        const nextTeam = listFrom(res.data)
          .map(normalizeMember)
          .sort((a, b) => b.sortTime - a.sortTime || String(a.name).localeCompare(String(b.name)));
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
  React.useEffect(() => {
    if (!addOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setAddOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [addOpen]);

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
    loadTeam({ keepMessage: true });
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
    await loadTeam({ keepMessage: true });
  }

  function handlePersonAdded() {
    setAddOpen(false);
    loadTeam();
  }

  return (
    <section>
      <header className="freshHero">
        <span>Team</span>
        <h1>Team</h1>
        <p>People directory, worker app access, and payroll links.</p>
      </header>

      <section className="freshCommandPulse">
        <aside className="freshCard"><h2>{loading && team.length === 0 ? "..." : team.length}</h2><p>People</p></aside>
        <aside className="freshCard"><h2>{loading && team.length === 0 ? "..." : workerAccessCount}</h2><p>Worker access</p></aside>
        <aside className="freshCard"><h2>{loading && team.length === 0 ? "..." : payrollOnlyCount}</h2><p>Payroll only</p></aside>
      </section>

      {error ? <section className="freshCard freshItem need"><b>Team could not load</b><span>{error}</span><button type="button" className="freshPrimary" onClick={() => loadTeam()}>Retry</button></section> : null}
      {actionMessage ? <section className="freshCard freshItem"><b>Done</b><span>{actionMessage}</span></section> : null}

      <section className="freshGrid">
        <aside className="freshCard freshJobsListCard">
          <h2>People</h2>
          {loading && team.length === 0 ? <div className="freshItem"><b>Loading team</b><span>Checking your people list.</span></div> : null}
          {!loading && team.length === 0 ? <div className="freshItem"><b>No people yet</b><span>Add a worker when you are ready.</span></div> : null}
          {team.map((member) => (
            <button type="button" className={`freshItem ${selected?.id === member.id ? "active" : ""}`} key={member.id} onClick={() => setSelectedId(member.id)}>
              <b>{member.name}</b>
              <span>{member.role} - {member.access}</span>
            </button>
          ))}
        </aside>

        <section className="freshCard freshJobsDetailCard">
          <div className="freshJobsDetailHeader">
            <div>
              <span>Person record</span>
              <h2>{selected?.name || "Select person"}</h2>
            </div>
            {selected ? <em>{selected.status}</em> : null}
          </div>

          {selected ? (
            <>
              <div className="freshMiniGrid">
                <DetailBox label="Role" value={selected.role} />
                <DetailBox label="Access" value={selected.access} />
                <DetailBox label="Current job" value={selected.currentJob} />
                <DetailBox label="Pay rate" value={selected.payRate} />
              </div>

              <div className="freshTimelineList">
                <div className="freshTimelineItem"><b>Email</b><span>{selected.email || "Not set"}</span></div>
                <div className="freshTimelineItem"><b>Phone</b><span>{selected.phone || "Not set"}</span></div>
                <div className="freshTimelineItem"><b>Availability</b><span>{selected.availability}</span></div>
                <div className="freshTimelineItem"><b>Notes</b><span>{selected.notes}</span></div>
              </div>
            </>
          ) : (
            <div className="freshItem"><b>No person selected</b><span>Add someone or select a person from the list.</span></div>
          )}
        </section>

        <aside className="freshCard freshJobsActionsCard">
          <h2>Team actions</h2>
          <p className="freshMuted">Use Team for people and access. Job problems, missing setup, and admin follow-up stay in Command.</p>
          <div className="freshActions">
            <button className="freshPrimary" type="button" onClick={() => setAddOpen(true)}>Add person</button>
            <FreshCsvImportButton endpoint="/team/import-csv" label="Import team CSV" onDone={async (data) => { setActionMessage(data?.message || "Team imported from CSV."); await loadTeam({ keepMessage: true }); }} onError={(message) => setError(message || "Could not import team CSV.")} />
            <button className="freshOrange" type="button" disabled={!selected?.id || !selected.email || selected.status === "Active"} onClick={resendInvite}>Resend invite</button>
            <button className="freshDark" type="button" disabled={!selected?.id} onClick={removeSelected}>Remove person</button>
            <button className="freshGhost" type="button" onClick={() => onNavigate?.("workercommand")}>Open worker view</button>
            <button className="freshGhost" type="button" onClick={() => onNavigate?.("time")}>Open time</button>
            <button className="freshGhost" type="button" onClick={() => onNavigate?.("payroll")}>Open payroll</button>
            <button className="freshGhost" type="button" onClick={() => loadTeam()}>Refresh team</button>
          </div>
        </aside>
      </section>

      {addOpen ? (
        <div className="freshPopupBackdrop freshModalBackdrop" style={modalBackdropStyle} role="presentation" onClick={() => setAddOpen(false)}>
          <section className="freshCard freshModalPanel" style={modalPanelStyle} role="dialog" aria-modal="true" aria-label="Add person" onClick={(event) => event.stopPropagation()}>
            <div className="freshJobsDetailHeader">
              <div>
                <span>Team</span>
                <h2>Add person</h2>
              </div>
              <button type="button" className="freshGhost" onClick={() => setAddOpen(false)}>Close</button>
            </div>
            <FreshTeamAddPerson onAdded={handlePersonAdded} onNavigate={onNavigate} />
          </section>
        </div>
      ) : null}
    </section>
  );
}
