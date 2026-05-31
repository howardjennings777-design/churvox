// CHURVOX_BUSINESS_SETTINGS_STABLE_WIRING_20260601
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { businessSettingsCompletion, loadBusinessSettings, saveBusinessSettings } from "../lib/businessSettings";
import "./BusinessSettingsPage.css";

const fieldGroups = [
  {
    title: "Business identity",
    hint: "This appears on invoices, quotes and customer-facing documents.",
    fields: [
      ["business_name", "Business name", "text"],
      ["trading_name", "Trading name", "text"],
      ["business_address", "Business address", "textarea"],
      ["phone", "Phone", "text"],
      ["email", "Email", "email"],
      ["website", "Website", "text"],
      ["gst_number", "GST number", "text"],
      ["nzbn", "NZBN", "text"],
    ],
  },
  {
    title: "Money and documents",
    hint: "These defaults keep invoices and quotes ready without typing the same details every time.",
    fields: [
      ["bank_account_name", "Bank account name", "text"],
      ["bank_account_number", "Bank account number", "text"],
      ["invoice_prefix", "Invoice prefix", "text"],
      ["quote_prefix", "Quote prefix", "text"],
      ["default_gst_rate", "Default GST rate %", "number"],
      ["default_invoice_due_days", "Invoice due days", "number"],
      ["default_quote_expiry_days", "Quote expiry days", "number"],
    ],
  },
  {
    title: "Operations",
    hint: "Churvox uses this to prepare better Work Slips, messages and invoice wording.",
    fields: [
      ["trade_industry_type", "Trade / industry type", "text"],
      ["service_area_region", "Service area / region", "text"],
      ["working_hours", "Working hours", "text"],
      ["default_job_types", "Default job types", "tags"],
      ["default_customer_message_tone", "Default customer message tone", "textarea"],
    ],
  },
];

export default function BusinessSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(() => loadBusinessSettings(user));
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSettings((current) => ({ ...loadBusinessSettings(user), ...current }));
  }, [user]);

  const completion = useMemo(() => businessSettingsCompletion(settings), [settings]);
  const missingLabels = useMemo(
    () => (completion?.missing_fields || []).map((key) => completion.labels[key] || key.replaceAll("_", " ")),
    [completion]
  );

  function update(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateJobTypes(value) {
    update("default_job_types", value.split(",").map((x) => x.trim()).filter(Boolean));
  }

  async function handleLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("Please choose an image logo file.");
      return;
    }
    if (file.size > 500 * 1024) {
      setNotice("Logo is too large. Use an image under about 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("logo_base64", String(reader.result || ""));
    reader.onerror = () => setNotice("Could not read that logo file.");
    reader.readAsDataURL(file);
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    const next = saveBusinessSettings(settings);
    setSettings(next);
    setNotice("Business setup saved on this device. Churvox can now use these defaults for invoices, quotes and Work Slips without calling missing settings routes.");
    window.dispatchEvent(new Event("churvox-auth-refresh"));
    setSaving(false);
  }

  return (
    <main className="cv-business-setup" data-version="CHURVOX_BUSINESS_SETTINGS_STABLE_WIRING_20260601">
      <section className="cv-business-setup-hero">
        <div>
          <p>Business setup</p>
          <h1>Make Churvox ready to run your admin.</h1>
          <span>Save the details Churvox needs for invoices, quotes, customer messages and owner approval Work Slips. This page no longer depends on a missing backend settings route.</span>
        </div>

        <aside>
          <strong>{completion?.percent ?? 0}%</strong>
          <small>{completion?.is_complete ? "Setup complete" : `${completion?.missing_count || 0} important items missing`}</small>
          <div className="cv-setup-progress"><i style={{ width: `${completion?.percent || 0}%` }} /></div>
        </aside>
      </section>

      {notice ? <section className="cv-setup-notice">{notice}</section> : null}

      <section className="cv-setup-grid">
        <article className="cv-setup-card cv-setup-checklist">
          <header><p>Readiness checklist</p><h2>{completion?.is_complete ? "Ready for live documents" : "Finish these before live invoices"}</h2></header>
          {missingLabels.length ? <ul>{missingLabels.map((label) => <li key={label}>{label}</li>)}</ul> : <div className="cv-setup-complete">All required business setup fields are filled.</div>}
          <div className="cv-setup-mini"><b>Logo</b>{settings.logo_base64 ? <img src={settings.logo_base64} alt="Business logo preview" /> : <span>No logo uploaded yet</span>}</div>
        </article>

        <form className="cv-setup-form" onSubmit={save}>
          <section className="cv-setup-card cv-logo-card">
            <div><p>Business logo</p><h2>Upload a small logo for invoices and quotes.</h2><span>Use PNG/JPG/WebP under about 500KB. It is stored on this browser for now, so it does not need a missing upload route.</span></div>
            <label className="cv-logo-upload"><input type="file" accept="image/*" onChange={handleLogo} />{settings.logo_base64 ? "Change logo" : "Upload logo"}</label>
          </section>

          {fieldGroups.map((group) => <section className="cv-setup-card" key={group.title}><header><p>{group.title}</p><span>{group.hint}</span></header><div className="cv-field-grid">{group.fields.map(([key, label, type]) => <label className={type === "textarea" ? "wide" : ""} key={key}><span>{label}</span>{type === "textarea" ? <textarea value={settings[key] || ""} onChange={(event) => update(key, event.target.value)} rows={3} /> : type === "tags" ? <input value={(settings.default_job_types || []).join(", ")} onChange={(event) => updateJobTypes(event.target.value)} placeholder="Lawn care, cleaning, handyman" /> : <input type={type} value={settings[key] ?? ""} onChange={(event) => update(key, event.target.value)} />}</label>)}</div></section>)}

          <section className="cv-setup-card cv-myob-card"><label><input type="checkbox" checked={Boolean(settings.uses_myob)} onChange={(event) => update("uses_myob", event.target.checked)} /><span><b>This business uses MYOB</b><small>Churvox will use this setup later when invoice sync is enabled for the right plan.</small></span></label></section>
          <div className="cv-setup-actions"><button type="submit" disabled={saving}>{saving ? "Saving setup…" : "Save business setup"}</button></div>
        </form>
      </section>
    </main>
  );
}
