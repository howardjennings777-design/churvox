import React, { useMemo, useState } from "react";

const modeCycle = ["Review-only", "Active", "Off"];
const defaultRoles = ["Office Manager", "Receptionist", "Bookkeeper", "Payroll Clerk", "Client Memory", "Quality Checker"];

export default function OfficeTeamRoleControls({ roles = [] }) {
  const shownRoles = useMemo(() => {
    const preferred = defaultRoles.map((name) => roles.find((role) => role.name === name)).filter(Boolean);
    return preferred.length ? preferred : roles.slice(0, 6);
  }, [roles]);

  const [modes, setModes] = useState(() => shownRoles.reduce((acc, role) => ({ ...acc, [role.name]: role.name === "Office Manager" ? "Active" : "Review-only" }), {}));

  function cycle(roleName) {
    setModes((current) => {
      const now = current[roleName] || "Review-only";
      const next = modeCycle[(modeCycle.indexOf(now) + 1) % modeCycle.length];
      return { ...current, [roleName]: next };
    });
  }

  return (
    <section className="cvRoleControls">
      <div className="cvPanelHeader mini">
        <div><span>Role controls</span><h2>Mimic modes</h2></div>
      </div>
      <p>Preview how owners will control each office role before anything becomes automatic.</p>
      <div className="cvRoleControlRows">
        {shownRoles.map((role) => (
          <button key={role.name} type="button" onClick={() => cycle(role.name)}>
            <strong>{role.name}</strong>
            <span>{modes[role.name] || "Review-only"}</span>
          </button>
        ))}
      </div>
      <small>Active still means prepared-only until the owner approves in Command.</small>
    </section>
  );
}
