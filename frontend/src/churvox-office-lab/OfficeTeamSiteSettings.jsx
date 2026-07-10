import React, { useEffect, useMemo, useState } from "react";
import { useApi } from "../hooks/useApi";
import "./OfficeTeamRealSettings.css";

const PROFILE_FIELDS = [
  ["businessName", "Business name", "text"],
  ["tradingName", "Trading name", "text"],
  ["ownerEmail", "Business email", "email"],
  ["phone", "Business phone", "tel"],
  ["website", "Website", "url"],
  ["businessAddress", "Business address", "textarea"],
  ["gstNumber", "GST number", "text"],
  ["nzbn", "NZBN", "text"],
  ["invoicePrefix", "Invoice prefix", "text"],
  ["quotePrefix", "Quote prefix", "text"],
  ["brandTone", "Customer tone", "text"],
  ["workingHours", "Working hours", "textarea"],
  ["customerMessage", "Default customer message", "textarea"],
  ["documentFooter", "Invoice / quote footer", "textarea"],
];

const FALLBACK_PROFILES = [
  { key: "field_service", name: "Field service / trade", description: "Tradies, maintenance, repairs and on-site work." },
  { key: "lawn_landscape", name: "Lawn care / landscaping", description: "Recurring outdoor work, crews, routes and proof photos." },
  { key: "cleaning", name: "Cleaning / housekeeping", description: "Recurring visits, access notes, checklists and assigned cleaners." },
  { key: "property_maintenance", name: "Property maintenance / handyman", description: "Mixed jobs, materials, photos, quotes and invoices." },
  { key: "appointment_beauty", name: "Hair / barber / beauty", description: "Appointments, services, deposits, reminders and client history." },
  { key: "nails_lashes_brows", name: "Nails / lashes / brows", description: "Appointments, add-ons, preferences, product notes and rebooking." },
  { key: "mobile_beauty_wellness", name: "Mobile beauty / wellness", description: "Appointments with client addresses, travel buffers and reminders." },
  { key: "project_service", name: "Projects / quoted work", description: "Quotes, deposits, stages, variations and progress invoices." },
];

const GUARDRAILS = [
  ["Messages", "Nothing sends until the owner approves the actual send step."],
  ["Invoices", "Approval may create an internal draft; sending remains separate."],
  ["Accounting", "No Xero/MYOB sync or tax filing runs from Settings."],
  ["Money", "No card charge, paid marking, payout or bank file is automatic."],
  ["Client records", "Changes need an explicit owner save or approved draft."],
  ["Staff hours", "Hours review never pays staff or submits tax."],
];

function blankProfile() {
  return Object.fromEntries(PROFILE_FIELDS.map(([key]) => [key, ""]));
}

function body(result) {
  return result?.data ?? result ?? {};
}

export default function OfficeTeamSiteSettings() {
  const api = useApi();
  const [profile, setProfile] = useState(blankProfile);
  const [profiles, setProfiles] = useState(FALLBACK_PROFILES);
  const [industryKey, setIndustryKey] = useState("field_service");
  const [workStyle, setWorkStyle] = useState("auto");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Loading live business settings…");
  const [loadedLive, setLoadedLive] = useState(false);

  const selectedIndustry = useMemo(
    () => profiles.find((item) => item.key === industryKey) || profiles[0] || FALLBACK_PROFILES[0],
    [industryKey, profiles],
  );

  async function loadSettings() {
    setBusy(true);
    const results = await Promise.allSettled([
      api.get("/logic/business-profile", { timeout: 20000 }),
      api.get("/industry/profiles", { timeout: 20000 }),
      api.get("/industry/context", { timeout: 20000 }),
    ]);

    const profileResult = results[0].status === "fulfilled" ? body(results[0].value) : {};
    const profileListResult = results[1].status === "fulfilled" ? body(results[1].value) : {};
    const industryResult = results[2].status === "fulfilled" ? body(results[2].value) : {};
    const liveProfile = profileResult?.profile || profileResult?.data?.profile || {};
    const liveProfiles = Array.isArray(profileListResult?.profiles) ? profileListResult.profiles : [];
    const liveIndustry = industryResult?.industry_profile || industryResult?.industry_key || industryResult?.profile?.key || "";
    const liveWorkStyle = industryResult?.work_style || industryResult?.service_location || "auto";
    const profileWorked = profileResult?.success !== false && (results[0].status === "fulfilled");
    const industryWorked = industryResult?.success !== false && (results[2].status === "fulfilled");

    if (liveProfiles.length) setProfiles(liveProfiles);
    if (liveIndustry) setIndustryKey(liveIndustry);
    if (liveWorkStyle) setWorkStyle(liveWorkStyle);

    if (profileWorked) {
      setProfile({ ...blankProfile(), ...liveProfile });
      setLoadedLive(true);
      setNotice(industryWorked ? "Live business profile and industry loaded." : "Business profile loaded. Industry context needs another check.");
    } else {
      let backup = {};
      try { backup = JSON.parse(localStorage.getItem("churvox_settings_business_profile_backup") || "{}"); } catch {}
      setProfile({ ...blankProfile(), ...backup });
      setLoadedLive(false);
      setNotice("Live settings could not be loaded. Any values shown from this device are not confirmed live.");
    }
    setBusy(false);
  }

  useEffect(() => { loadSettings(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setField(key, value) {
    setProfile((current) => ({ ...current, [key]: value }));
    setNotice("Unsaved changes. Nothing live has changed yet.");
  }

  async function saveSettings() {
    if (busy) return;
    setBusy(true);
    try {
      localStorage.setItem("churvox_settings_business_profile_backup", JSON.stringify(profile));
    } catch {}

    const profileResult = await api.post("/logic/business-profile", profile, { timeout: 25000 });
    const profileBody = body(profileResult);
    if (profileResult?.success === false || profileBody?.success === false) {
      setLoadedLive(false);
      setNotice(`Could not save the business profile live. ${profileResult?.error || profileBody?.error || "Nothing changed on the server."}`);
      setBusy(false);
      return;
    }

    const industryResult = await api.post("/industry/context", { industry_key: industryKey, work_style: workStyle }, { timeout: 25000 });
    const industryBody = body(industryResult);
    const industrySaved = industryResult?.success !== false && industryBody?.success !== false;
    setProfile((current) => ({ ...current, ...(profileBody?.profile || profileBody?.data?.profile || {}) }));
    setLoadedLive(true);
    setNotice(industrySaved
      ? "Business profile and industry saved live. Churvox can now use these details across the app."
      : "Business profile saved live, but the industry selection did not save. Reload and try the industry again.");
    try {
      localStorage.setItem("churvox:industry-mode", industryKey);
      window.dispatchEvent(new CustomEvent("churvox-business-settings-updated", { detail: { ...profile, industry_key: industryKey, work_style: workStyle } }));
    } catch {}
    setBusy(false);
  }

  return (
    <section className="cvSiteScreen">
      <header className="cvSiteScreenHeader">
        <span>Settings</span>
        <h2>Set the business up once</h2>
        <p>The signed-in owner saves these details directly to the business profile. Churvox uses the same real information for documents, wording and industry context.</p>
      </header>

      <div className="cvRealSettingsStatus">
        <div>
          <strong>{loadedLive ? "Live settings loaded" : "Live settings not confirmed"}</strong>
          <small>{notice}</small>
        </div>
        <button type="button" onClick={loadSettings} disabled={busy}>{busy ? "Checking…" : "Reload live settings"}</button>
      </div>

      <div className="cvSiteSettingsGrid">
        <section className="cvSiteSettingsCard wide">
          <span>Business profile</span>
          <h3>Details used across Churvox</h3>
          <div className="cvRealSettingsForm">
            {PROFILE_FIELDS.map(([key, label, type]) => (
              <label key={key} className={type === "textarea" ? "wide" : ""}>
                <span>{label}</span>
                {type === "textarea"
                  ? <textarea value={profile[key] || ""} onChange={(event) => setField(key, event.target.value)} />
                  : <input type={type} value={profile[key] || ""} onChange={(event) => setField(key, event.target.value)} />}
              </label>
            ))}
          </div>
        </section>

        <section className="cvSiteSettingsCard">
          <span>Business type</span>
          <h3>Use the right operating language</h3>
          <div className="cvRealIndustryPicker">
            <span>Industry profile</span>
            <select aria-label="Industry profile" value={industryKey} onChange={(event) => { setIndustryKey(event.target.value); setNotice("Unsaved industry change."); }}>
              {profiles.map((item) => <option key={item.key} value={item.key}>{item.name || item.key}</option>)}
            </select>
            <span>Work style</span>
            <select aria-label="Work style" value={workStyle} onChange={(event) => { setWorkStyle(event.target.value); setNotice("Unsaved work-style change."); }}>
              <option value="auto">Use the profile default</option>
              <option value="onsite">Mostly at customer sites</option>
              <option value="premises">Mostly at my premises</option>
              <option value="mobile">Mobile appointments / visits</option>
              <option value="remote">Remote / online service</option>
            </select>
          </div>
          <div className="cvRealIndustrySummary">
            <strong>{selectedIndustry?.name || "Selected business type"}</strong>
            <p>{selectedIndustry?.description || "Churvox will use the selected profile to choose the right labels and operating context."}</p>
          </div>
        </section>

        <section className="cvSiteSettingsCard">
          <span>Owner control</span>
          <h3>Core safety cannot be weakened here</h3>
          <p>The owner does not need to manage a list of experimental modes. These protections stay fixed across every business.</p>
          <div className="cvFixedGuardrails">
            {GUARDRAILS.map(([title, detail]) => <article key={title}><strong>{title}</strong><small>{detail}</small></article>)}
          </div>
        </section>

        <section className="cvSiteSettingsCard wide">
          <span>Save</span>
          <h3>Apply the owner’s settings</h3>
          <p>Clicking save is the owner’s explicit instruction to update the business profile and industry context. It does not send messages, sync accounting, charge money or change job/client records.</p>
          <div className="cvRealSettingsActions">
            <button type="button" onClick={loadSettings} disabled={busy}>Discard and reload</button>
            <button type="button" className="primary" onClick={saveSettings} disabled={busy}>{busy ? "Saving…" : "Save live business settings"}</button>
          </div>
        </section>
      </div>
    </section>
  );
}
