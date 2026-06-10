import React from "react";

const members = [
  {
    id: 1,
    name: "Matiu Rangi",
    role: "Worker",
    status: "Active",
    access: "Worker app only",
    phone: "027 400 1001",
    email: "matiu@example.co.nz",
    note: "Can see assigned jobs, acknowledge work, start timer and upload photos.",
  },
  {
    id: 2,
    name: "Ana Williams",
    role: "Lead worker",
    status: "Active",
    access: "Jobs and Dispatch",
    phone: "027 400 1002",
    email: "ana@example.co.nz",
    note: "Can manage daily route, update jobs and complete work records.",
  },
  {
    id: 3,
    name: "Payroll helper",
    role: "Payroll",
    status: "Limited",
    access: "Payroll only",
    phone: "027 400 1003",
    email: "payroll@example.co.nz",
    note: "Can review hours and export payroll CSV. Cannot see reports or owner settings.",
  },
];

const roles = [
  ["Owner", "Full access to all pages, billing, plans and settings."],
  ["Admin", "Can manage jobs, clients, quotes, invoices and team."],
  ["Worker", "Can only see assigned worker jobs and job actions."],
  ["Payroll", "Can only see payroll hours and payroll export."],
];

export default function FreshTeam() {
  const [selectedId, setSelectedId] = React.useState(1);
  const selected = members.find((member) => member.id === selectedId) || members[0];

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Team</span>
        <h1>Team</h1>
        <p>People, roles and access. Workers get the simple job app. Owners keep control.</p>
      </header>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Team list</h2>
          <p>Active workers, admin users and payroll access.</p>

          {members.map((member) => (
            <button
              type="button"
              key={member.id}
              className={`freshItem ${member.status === "Limited" ? "need" : ""} ${selected.id === member.id ? "active" : ""}`}
              style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
              onClick={() => setSelectedId(member.id)}
            >
              <b>{member.name}</b>
              <span>{member.role} · {member.status}</span>
            </button>
          ))}
        </aside>

        <section className="freshCard">
          <h2>{selected.name}</h2>

          <div className="freshTabs">
            <span className="active">Profile</span>
            <span>Access</span>
            <span>Jobs</span>
            <span>Hours</span>
          </div>

          <label className="freshField">
            <span>Name</span>
            <input value={selected.name} readOnly />
          </label>

          <label className="freshField">
            <span>Role</span>
            <input value={selected.role} readOnly />
          </label>

          <label className="freshField">
            <span>Access</span>
            <input value={selected.access} readOnly />
          </label>

          <label className="freshField">
            <span>Email</span>
            <input value={selected.email} readOnly />
          </label>

          <label className="freshField">
            <span>Phone</span>
            <input value={selected.phone} readOnly />
          </label>

          <label className="freshField">
            <span>Notes</span>
            <textarea value={selected.note} readOnly />
          </label>
        </section>

        <aside className="freshCard">
          <h2>Owner actions</h2>
          <p>Add workers, invite staff, limit access and send problems to Command.</p>

          <div className="freshActions">
            <button className="freshPrimary">Invite worker</button>
            <button className="freshOrange">Change role</button>
            <button className="freshDark">Deactivate</button>
            <button className="freshGhost">Send issue to Command</button>
          </div>

          <div className="freshItem need">
            <b>Launch rule</b>
            <span>Payroll users must not see reports or owner settings.</span>
          </div>
        </aside>
      </section>

      <section className="freshGrid two" style={{ marginTop: 14 }}>
        <section className="freshCard">
          <h2>Role rules</h2>
          {roles.map(([role, detail]) => (
            <div className="freshItem" key={role}>
              <b>{role}</b>
              <span>{detail}</span>
            </div>
          ))}
        </section>

        <aside className="freshCard">
          <h2>Worker app link</h2>
          <div className="freshItem">
            <b>Simple worker view</b>
            <span>Assigned jobs, acknowledge, start timer, complete job, upload photos.</span>
          </div>
          <div className="freshItem need">
            <b>Needs invite email</b>
            <span>New staff should receive invite automatically when added.</span>
          </div>
        </aside>
      </section>
    </section>
  );
}
