import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "churvox.officeTeam.roleModes.v1";
const modeCycle = ["Review-only", "Active", "Off"];
const defaultRoles = ["Office Manager", "Receptionist", "Bookkeeper", "Payroll Clerk", "Client Memory", "Quality Checker"];

function readSavedModes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveModes(modes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modes || {}));
  } catch {}
}

export default function OfficeTeamRoleControls({ roles = [] }) {
  const shownRoles = useMemo(() => {
    const preferred = defaultRoles.map((name) => roles.find((role) => role.name === name)).filter(Boolean);
    return preferred.length ? preferred : roles.slice(0, 6);
  }, [roles]);

  const [modes, setModes] = useState(() => {
    const saved = readSavedModes();
    return shownRoles.reduce((acc, role) => ({ ...acc, [role.name]: saved[role.name] || (role.name === "Office Manager" ? "Active" : "Review-only") }), saved);
  });

  useEffect(() => {
    saveModes(modes);
  }, [modes]);

  function cycle(roleName) {
    setModes((current) => {
      const now = current[roleName] || "Review-only";
      const next = modeCycle[(modeCycle.indexOf(now) + 1) % modeCycle.length];
      return { ...current, [roleName]: next };
    });
  }

  function reset() {
    const next = shownRoles.reduce((acc, role) => ({ ...acc, [role.name]: role.name === "Office Manager" ? "Active" : "Review-only" }), {});
    setModes(next);
  }

  return (
    <section className="cvRoleControls">
      <div className="cvPanelHeader mini">
        <div><span>Role controls</span><h2>Mimic modes</h2></div>
        <button className="cvRoleControlReset" type="button" onClick={reset}>Reset</button>
      </div>
      <p>Preview how owners will control each office role before anything becomes automatic.</p>
      <div className="cvRoleControlRows">
        {shownRoles.map((role) => (
          <button key={role.name} type="button" onClick={() => cycle(role.name)}>
            <strong>{role.name}</strong>
            <span data-mode={modes[role.name] || "Review-only"}>{modes[role.name] || "Review-only"}</span>
          </button>
        ))}
      </div>
      <small>Active still means prepared-only until the owner approves in Command.</small>
    </section>
  );
}
