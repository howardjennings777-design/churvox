import React from "react";

const TEAM_STORAGE_KEY = "churvox:fresh-team:v1";

const seedTeam = [
  {
    id: "team-1",
    name: "Matiu Rangi",
    role: "Worker",
    status: "Active",
    phone: "027 410 1111",
    email: "matiu@example.co.nz",
    payRate: "$28/hr",
    availability: "Mon, Tue, Wed, Thu",
    currentJob: "Lawn service",
    notes: "Reliable on lawn runs. Needs photo reminder sometimes.",
  },
  {
    id: "team-2",
    name: "Ana Williams",
    role: "Lead worker",
    status: "Active",
    phone: "027 410 2222",
    email: "ana@example.co.nz",
    payRate: "$34/hr",
    availability: "Mon to Fri",
    currentJob: "Garden tidy",
    notes: "Can lead bigger garden jobs and check quality.",
  },
  {
    id: "team-3",
    name: "Tama Smith",
    role: "Worker",
    status: "Invite sent",
    phone: "027 410 3333",
    email: "tama@example.co.nz",
    payRate: "$27/hr",
    availability: "Fri, Sat",
    currentJob: "Not assigned",
    notes: "Invite sent. Needs to accept worker access.",
  },
  {
    id: "team-4",
    name: "Jess Brown",
    role: "Subcontractor",
    status: "Paused",
    phone: "027 410 4444",
    email: "jess@example.co.nz",
    payRate: "$45/hr",
    availability: "As needed",
    currentJob: "Not assigned",
    notes: "Use only for overflow work.",
  },
];

const filters = ["All", "Active", "Invite sent", "Paused"];

function loadTeam() {
  try {
    if (typeof window === "undefined") return seedTeam;

    const saved = window.localStorage.getItem(TEAM_STORAGE_KEY);
    if (!saved) return seedTeam;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : seedTeam;
  } catch {
    return seedTeam;
  }
}

export default function FreshTeam({ onNavigate }) {
  const [team, setTeam] = React.useState(loadTeam);
  const [selectedId, setSelectedId] = React.useState(team[0]?.id || "");
  const [filter, setFilter] = React.useState("All");

  const selected = team.find((member) => member.id === selectedId) || team[0];
  const visibleTeam = filter === "All" ? team : team.filter((member) => member.status === filter);

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
      }
    } catch {
      // Fresh preview keeps working without local storage.
    }
  }, [team]);

  function updateSelectedMember(patch) {
    if (!selected) return;

    setTeam((current) =>
      current.map((member) =>
        member.id === selected.id
          ? { ...member, ...patch }
          : member
      )
    );
  }

  function resetTeam() {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(TEAM_STORAGE_KEY);
      }
    } catch {
      // Ignore preview storage errors.
    }

    setTeam(seedTeam);
    setSelectedId(seedTeam[0].id);
    setFilter("All");
  }

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Team</span>
        <h1>Team</h1>
        <p>Manage workers, invites, roles, availability and reassignment from Dispatch.</p>
      </header>

      <section className="freshCommandPulse">
        <aside className="freshCard">
          <h2>{team.filter((member) => member.status === "Active").length}</h2>
          <p>Active workers</p>
        </aside>
        <aside className="freshCard">
          <h2>{team.filter((member) => member.status === "Invite sent").length}</h2>
          <p>Invites pending</p>
        </aside>
        <aside className="freshCard">
          <h2>{team.length}</h2>
          <p>Total people</p>
        </aside>
      </section>

      <section className="freshCommandFilterBar">
        {filters.map((item) => (
          <button
            type="button"
            key={item}
            className={filter === item ? "active" : ""}
            onClick={() => setFilter(item)}
          >
            <span>{item}</span>
            <b>{item === "All" ? team.length : team.filter((member) => member.status === item).length}</b>
          </button>
        ))}
      </section>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Team list</h2>

          {visibleTeam.map((member) => (
            <button
              type="button"
              className={`freshItem ${selected?.id === member.id ? "active" : ""} ${member.status === "Invite sent" ? "need" : ""}`}
              key={member.id}
              onClick={() => setSelectedId(member.id)}
            >
              <b>{member.name}</b>
              <span>{member.role} · {member.status} · {member.currentJob}</span>
            </button>
          ))}

          {visibleTeam.length === 0 && (
            <div className="freshItem">
              <b>No team members</b>
              <span>Change filter or reset preview team.</span>
            </div>
          )}
        </aside>

        <section className="freshCard">
          <h2>{selected?.name || "Select person"}</h2>

          {selected && (
            <>
              <div className="freshMiniGrid">
                <div>
                  <span>Status</span>
                  <b>{selected.status}</b>
                </div>
                <div>
                  <span>Role</span>
                  <b>{selected.role}</b>
                </div>
                <div>
                  <span>Pay</span>
                  <b>{selected.payRate}</b>
                </div>
                <div>
                  <span>Current job</span>
                  <b>{selected.currentJob}</b>
                </div>
              </div>

              <label className="freshField">
                <span>Name</span>
                <input
                  value={selected.name}
                  onChange={(event) => updateSelectedMember({ name: event.target.value })}
                />
              </label>

              <label className="freshField">
                <span>Role</span>
                <select
                  value={selected.role}
                  onChange={(event) => updateSelectedMember({ role: event.target.value })}
                >
                  <option>Worker</option>
                  <option>Lead worker</option>
                  <option>Subcontractor</option>
                  <option>Payroll only</option>
                  <option>Manager</option>
                </select>
              </label>

              <label className="freshField">
                <span>Email</span>
                <input
                  value={selected.email}
                  onChange={(event) => updateSelectedMember({ email: event.target.value })}
                />
              </label>

              <label className="freshField">
                <span>Phone</span>
                <input
                  value={selected.phone}
                  onChange={(event) => updateSelectedMember({ phone: event.target.value })}
                />
              </label>

              <label className="freshField">
                <span>Pay rate</span>
                <input
                  value={selected.payRate}
                  onChange={(event) => updateSelectedMember({ payRate: event.target.value })}
                />
              </label>

              <label className="freshField">
                <span>Availability</span>
                <input
                  value={selected.availability}
                  onChange={(event) => updateSelectedMember({ availability: event.target.value })}
                />
              </label>

              <label className="freshField">
                <span>Team notes</span>
                <textarea
                  value={selected.notes}
                  onChange={(event) => updateSelectedMember({ notes: event.target.value })}
                />
              </label>
            </>
          )}
        </section>

        <aside className="freshCard">
          <h2>Owner actions</h2>

          <div className="freshActions">
            <button className="freshPrimary" onClick={() => updateSelectedMember({ status: "Active" })}>
              Mark active
            </button>
            <button className="freshOrange" onClick={() => updateSelectedMember({ status: "Invite sent" })}>
              Send invite
            </button>
            <button className="freshDark" onClick={() => updateSelectedMember({ status: "Paused", currentJob: "Not assigned" })}>
              Pause access
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("dispatch")}>
              Back to Dispatch
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("payroll")}>
              Open payroll
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("command")}>
              Send issue to Command
            </button>
            <button className="freshGhost" onClick={resetTeam}>
              Reset team
            </button>
          </div>
        </aside>
      </section>
    </section>
  );
}
