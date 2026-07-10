import React, { useEffect, useMemo, useState } from "react";
import { createBackendCommandSlip } from "./OfficeTeamCommandApi";
import { createOfficeTeamLocalCommand } from "./OfficeTeamLocalCommand";

const STORAGE_KEY = "churvox.officeTeam.roleModes.v2";
const modeCycle = ["Review-only", "Active", "Off"];
const defaultRoles = ["Office Manager", "Receptionist", "Bookkeeper", "Accountant", "Payroll Clerk", "Client Memory", "Quality Checker", "Operations Manager"];

function readSavedModes() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

function saveModes(modes) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(modes || {})); } catch {}
}

export default function OfficeTeamRoleControls({ roles = [] }) {
  const shownRoles = useMemo(() => {
    const preferred = defaultRoles.map((name) => roles.find((role) => role.name === name)).filter(Boolean);
    return preferred.length ? preferred : roles.slice(0, 8);
  }, [roles]);
  const [modes, setModes] = useState(() => {
    const saved = readSavedModes();
    return shownRoles.reduce((acc, role) => ({ ...acc, [role.name]: saved[role.name] || (role.name === "Office Manager" ? "Active" : "Review-only") }), saved);
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => { saveModes(modes); }, [modes]);

  function cycle(roleName) {
    setModes((current) => {
      const currentMode = current[roleName] || "Review-only";
      const next = modeCycle[(modeCycle.indexOf(currentMode) + 1) % modeCycle.length];
      return { ...current, [roleName]: next };
    });
    setNotice("Draft changed. Prepare it for Command when the role modes look right.");
  }

  function reset() {
    const next = shownRoles.reduce((acc, role) => ({ ...acc, [role.name]: role.name === "Office Manager" ? "Active" : "Review-only" }), {});
    setModes(next);
    setNotice("Role mode draft reset. Nothing live changed.");
  }

  async function prepareModes() {
    if (busy) return;
    setBusy(true);
    const rows = shownRoles.map((role) => `${role.name}: ${modes[role.name] || "Review-only"}`);
    const record = ["Office role modes", "Office Team role settings", "Owner approval", rows.join(" · ")];
    try {
      if (isOwnerRoute()) {
        await createBackendCommandSlip({
          area: "operations",
          record,
          action: "Prepare office role mode settings",
          slip: {
            source_type: "operations",
            action_type: "prepare_mimic_role_modes",
            source_id: `office-role-modes-${Date.now()}`,
            title: "Office Team role modes need owner approval",
            found: "The owner changed which office roles should be Active, Review-only or Off.",
            prepared: "Churvox prepared the role-mode settings as an internal operations draft. No office role behaviour changed live yet.",
            why: "Role behaviour should never change silently. Command records exactly which modes the owner approved.",
            urgency: "Owner review",
            payload: {
              office_role: "Office Manager",
              prepared_form: Object.fromEntries(shownRoles.map((role) => [role.name, modes[role.name] || "Review-only"])),
              actions: ["Approve process draft", "Park"],
              will_do: ["Create an internal operations settings draft", "Keep existing role behaviour unchanged until implementation", "Record the owner-approved role modes"],
              prepared_only: true,
              owner_review_only: true,
              no_auto_send: true,
              no_auto_sync: true,
              no_auto_charge: true,
              no_auto_record_change: true,
            },
          },
        });
        setNotice("Office role modes were prepared in Command. No live role behaviour changed yet.");
      } else {
        createOfficeTeamLocalCommand({ area: "operations", record, action: "Prepare office role mode settings" });
        setNotice("Office role modes were prepared in the control queue.");
      }
    } catch (error) {
      setNotice(`Could not prepare role modes. Nothing changed. ${error?.message || ""}`.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cvRoleControls">
      <div className="cvPanelHeader mini">
        <div><span>Role controls</span><h2>Office role modes</h2></div>
        <button className="cvRoleControlReset" type="button" onClick={reset}>Reset draft</button>
      </div>
      <p>Tap a role to choose Active, Review-only or Off. The selection remains a draft until it is prepared and approved in Command.</p>
      <div className="cvRoleControlRows">
        {shownRoles.map((role) => (
          <button key={role.name} type="button" onClick={() => cycle(role.name)}>
            <strong>{role.name}</strong>
            <span data-mode={modes[role.name] || "Review-only"}>{modes[role.name] || "Review-only"}</span>
          </button>
        ))}
      </div>
      <button className="cvRoleControlReset" type="button" disabled={busy} onClick={prepareModes}>{busy ? "Preparing…" : "Prepare role modes in Command"}</button>
      <small>{notice || "Active still means prepared-only. Nothing sends, syncs, charges or changes records without owner approval."}</small>
    </section>
  );
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
