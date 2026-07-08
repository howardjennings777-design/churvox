import React, { useState } from "react";

const businessTypes = ["General Service", "Hair / Beauty", "Barber", "Nails", "Cleaning", "Trades"];
const approvalLocks = ["Messages", "Invoices", "Accounting sync", "Money changes", "Client record changes", "Staff hours"];
const ownerModes = ["Owner approves every decision", "Owner approves money only", "Review-only beta mode"];

export default function OfficeTeamSiteSettings() {
  const [businessType, setBusinessType] = useState("General Service");
  const [ownerMode, setOwnerMode] = useState("Owner approves every decision");
  const [locked, setLocked] = useState(() => approvalLocks.reduce((acc, item) => ({ ...acc, [item]: true }), {}));

  function toggleLock(item) {
    setLocked((current) => ({ ...current, [item]: !current[item] }));
  }

  return (
    <section className="cvSiteScreen">
      <header className="cvSiteScreenHeader">
        <span>Settings</span>
        <h2>Owner controls before this becomes live</h2>
        <p>These controls preview how Churvox should be configured per business before mimics touch the real app.</p>
      </header>

      <div className="cvSiteSettingsGrid">
        <section className="cvSiteSettingsCard">
          <span>Business language</span>
          <h3>Pick the playbook</h3>
          <p>The same system should speak differently for cleaners, barbers, hairdressers, nail techs, trades and general services.</p>
          <div className="cvSiteSettingButtons">
            {businessTypes.map((item) => <button key={item} className={businessType === item ? "active" : ""} onClick={() => setBusinessType(item)}>{item}</button>)}
          </div>
          <small>Selected: {businessType}</small>
        </section>

        <section className="cvSiteSettingsCard">
          <span>Approval mode</span>
          <h3>How much control the owner keeps</h3>
          <p>This lab stays review-only. In the real app, owner mode decides how strict Command should be.</p>
          <div className="cvSiteSettingButtons tall">
            {ownerModes.map((item) => <button key={item} className={ownerMode === item ? "active" : ""} onClick={() => setOwnerMode(item)}>{item}</button>)}
          </div>
        </section>

        <section className="cvSiteSettingsCard wide">
          <span>Approval locks</span>
          <h3>What must never happen without owner approval</h3>
          <div className="cvSiteLockGrid">
            {approvalLocks.map((item) => (
              <button key={item} className={locked[item] ? "active" : ""} onClick={() => toggleLock(item)}>
                <strong>{item}</strong>
                <small>{locked[item] ? "Locked" : "Unlocked preview"}</small>
              </button>
            ))}
          </div>
          <p>These are preview controls only. The lab does not send, sync, charge, pay, or change real records.</p>
        </section>
      </div>
    </section>
  );
}
