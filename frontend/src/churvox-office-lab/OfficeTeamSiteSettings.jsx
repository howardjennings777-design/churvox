import React, { useState } from "react";
import { createBackendCommandSlip } from "./OfficeTeamCommandApi";
import { createOfficeTeamLocalCommand } from "./OfficeTeamLocalCommand";

const businessTypes = ["General Service", "Hair / Beauty", "Barber", "Nails", "Cleaning", "Trades"];
const approvalLocks = ["Messages", "Invoices", "Accounting sync", "Money changes", "Client record changes", "Staff hours"];
const ownerModes = ["Owner approves every decision", "Owner approves money and record changes", "Review-only cautious mode"];

export default function OfficeTeamSiteSettings() {
  const ownerRoute = isOwnerRoute();
  const [businessType, setBusinessType] = useState("General Service");
  const [ownerMode, setOwnerMode] = useState("Owner approves every decision");
  const [locked, setLocked] = useState(() => approvalLocks.reduce((acc, item) => ({ ...acc, [item]: true }), {}));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  function toggleLock(item) {
    setLocked((current) => ({ ...current, [item]: !current[item] }));
    setNotice("Settings draft changed. Nothing live has changed yet.");
  }

  async function prepareSettings() {
    if (busy) return;
    setBusy(true);
    const lockSummary = approvalLocks.map((item) => `${item}: ${locked[item] ? "Locked" : "Proposed relaxed review"}`);
    const record = ["Settings", `${businessType} · ${ownerMode}`, "Owner approval", lockSummary.join(" · ")];
    try {
      if (ownerRoute) {
        await createBackendCommandSlip({
          area: "operations",
          record,
          action: "Prepare owner settings",
          slip: {
            source_type: "operations",
            action_type: "prepare_owner_settings",
            source_id: `owner-settings-${Date.now()}`,
            title: "Owner settings change needs approval",
            found: "Business language, approval mode or safety-lock selections were changed in the Settings draft.",
            prepared: "Churvox prepared the settings as an internal operations draft. Current business behaviour remains unchanged.",
            why: "Changing how the office team speaks or which actions need approval can affect every workflow, so the exact draft must be reviewed in Command.",
            urgency: "Owner review",
            payload: {
              office_role: "Operations Manager",
              prepared_form: {
                business_type: businessType,
                owner_approval_mode: ownerMode,
                approval_locks: lockSummary,
              },
              actions: ["Approve process draft", "Park"],
              will_do: ["Create an internal owner-settings draft", "Keep current live settings unchanged", "Record exactly what the owner approved"],
              prepared_only: true,
              owner_review_only: true,
              no_auto_send: true,
              no_auto_sync: true,
              no_auto_charge: true,
              no_auto_record_change: true,
            },
          },
        });
        setNotice("Settings draft prepared in Command. Current settings remain unchanged until the approved draft is implemented.");
      } else {
        createOfficeTeamLocalCommand({ area: "operations", record, action: "Prepare owner settings" });
        setNotice("Settings draft prepared in the control queue.");
      }
    } catch (error) {
      setNotice(`Could not prepare settings. Nothing changed. ${error?.message || ""}`.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cvSiteScreen">
      <header className="cvSiteScreenHeader">
        <span>Settings</span>
        <h2>Business language and owner approval rules</h2>
        <p>Choose how Churvox should speak and which areas stay locked. These controls build a settings draft; they do not silently change live behaviour.</p>
      </header>

      <div className="cvSiteSettingsGrid">
        <section className="cvSiteSettingsCard">
          <span>Business language</span>
          <h3>Pick the playbook</h3>
          <p>The system can use the right words for cleaners, barbers, hairdressers, nail techs, trades and general services.</p>
          <div className="cvSiteSettingButtons">
            {businessTypes.map((item) => <button key={item} type="button" className={businessType === item ? "active" : ""} onClick={() => { setBusinessType(item); setNotice("Business-language draft changed."); }}>{item}</button>)}
          </div>
          <small>Draft selection: {businessType}</small>
        </section>

        <section className="cvSiteSettingsCard">
          <span>Approval mode</span>
          <h3>How much control the owner keeps</h3>
          <p>Even the lighter modes keep sending, syncing, charging, filing and payments locked. The mode only changes which prepared decisions need to enter Command.</p>
          <div className="cvSiteSettingButtons tall">
            {ownerModes.map((item) => <button key={item} type="button" className={ownerMode === item ? "active" : ""} onClick={() => { setOwnerMode(item); setNotice("Approval-mode draft changed."); }}>{item}</button>)}
          </div>
        </section>

        <section className="cvSiteSettingsCard wide">
          <span>Approval locks</span>
          <h3>What must remain owner-controlled</h3>
          <div className="cvSiteLockGrid">
            {approvalLocks.map((item) => (
              <button key={item} type="button" className={locked[item] ? "active" : ""} onClick={() => toggleLock(item)}>
                <strong>{item}</strong>
                <small>{locked[item] ? "Locked in draft" : "Proposed lighter review"}</small>
              </button>
            ))}
          </div>
          <p>No selection here changes production by itself. Prepare the finished settings draft, inspect it in Command, then approve only when it is right.</p>
          <button type="button" disabled={busy} onClick={prepareSettings}>{busy ? "Preparing…" : "Prepare settings in Command"}</button>
          <small>{notice || "Nothing live has changed."}</small>
        </section>
      </div>
    </section>
  );
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
