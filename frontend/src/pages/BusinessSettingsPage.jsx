import React, { useEffect, useMemo, useState } from "react";
import { useApi } from "../hooks/useApi";
import "./BusinessSettingsPage.css";

const blankSettings = {
  business_name: "",
  trading_name: "",
  logo_base64: "",
  business_address: "",
  phone: "",
  email: "",
  website: "",
  gst_number: "",
  nzbn: "",
  bank_account_name: "",
  bank_account_number: "",
  invoice_prefix: "INV",
  quote_prefix: "QUO",
  default_gst_rate: 15,
  default_invoice_due_days: 7,
  default_quote_expiry_days: 14,
  trade_industry_type: "",
  service_area_region: "",
  working_hours: "",
  default_job_types: [],
  uses_myob: false,
  default_customer_message_tone: "Friendly, clear and professional",
};

const requiredLabels = {
  business_name: "Business name",
  business_address: "Business address",
  phone: "Phone",
  email: "Email",
  gst_number: "GST number",
  bank_account_name: "Bank account name",
  bank_account_number: "Bank account number",
  invoice_prefix: "Invoice prefix",
  quote_prefix: "Quote prefix",
  default_gst_rate: "Default GST rate",
  default_invoice_due_days: "Invoice due days",
  default_quote_expiry_days: "Quote expiry days",
  trade_industry_type: "Trade / industry",
};

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

function normaliseSettings(settings = {}) {
  return {
    ...blankSettings,
    ...settings,
    default_job_types: Array.isArray(settings.default_job_types)
      ? settings.default_job_types
      : String(settings.default_job_types || "").split(",").map((x) => x.trim()).filter(Boolean),
  };
}

function completionFallback(settings) {
  const missing = Object.keys(requiredLabels).filter((key) => {
    const value = settings[key];
    return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
  });
  const total = Object.keys(requiredLabels).length;
  const complete = total - missing.length;
  return {
    percent: total ? Math.round((complete / total) * 100) : 100,
    missing_fields: missing,
    missing_count: missing.length,
    is_complete: missing.length === 0,
  };
}

export default function BusinessSettingsPage() {
  const api = useApi();
  const [settings, setSettings] = useState(blankSettings);
  const [completion, setCompletion] = useState(completionFallback(blankSettings));
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const missingLabels = useMemo(
    () => (completion?.missing_fields || []).map((key) => requiredLabels[key] || key.replaceAll("_", " ")),
    [completion]
  );

  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      setLoadingSettings(true);
      const res = await api.get("/business/settings");
      if (!mounted) return;
      if (res.success) {
        const next = normaliseSettings(res.data?.settings || {});
        setSettings(next);
        setCompletion(res.data?.completion || completionFallback(next));
      } else {
        setNotice(`Could not load setup yet: ${res.error}`);
      }
      setLoadingSettings(false);
    }
    loadSettings();
    return () => { mounted = false; };
  }, []);

  function update(key, value) {
    setSettings((current) => {
      const next = { ...current, [key]: value };
      setCompletion(completionFallback(next));
      return next;
    });
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
    const payload = {
      ...settings,
      default_gst_rate: Number(settings.default_gst_rate || 15),
      default_invoice_due_days: Number(settings.default_invoice_due_days || 7),
      default_quote_expiry_days: Number(settings.default_quote_expiry_days || 14),
      uses_myob: Boolean(settings.uses_myob),
    };
    const res = await api.put("/business/settings", payload);
    if (res.success) {
      const next = normaliseSettings(res.data?.settings || payload);
      setSettings(next);
      setCompletion(res.data?.completion || completionFallback(next));
      setNotice("Business setup saved. Churvox can now use these details for invoices, quotes and Work Slips.");
    } else {
      setNotice(`Save failed: ${res.error}`);
    }
    setSaving(false);
  }

  return (
    <main className="cv-business-setup">
      <section className="cv-business-setup-hero">
        <div>
          <p>Business setup</p>
          <h1>Make Churvox ready to run your admin.</h1>
          <span>
            Save the details Churvox needs for invoices, quotes, customer messages and owner approval Work Slips.
          </span>
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
          <header>
            <p>Readiness checklist</p>
            <h2>{completion?.is_complete ? "Ready for live documents" : "Finish these before live invoices"}</h2>
          </header>

          {loadingSettings ? (
            <div className="cv-setup-empty">Loading setup…</div>
          ) : missingLabels.length ? (
            <ul>
              {missingLabels.map((label) => <li key={label}>{label}</li>)}
            </ul>
          ) : (
            <div className="cv-setup-complete">All required business setup fields are filled.</div>
          )}

          <div className="cv-setup-mini">
            <b>Logo</b>
            {settings.logo_base64 ? <img src={settings.logo_base64} alt="Business logo preview" /> : <span>No logo uploaded yet</span>}
          </div>
        </article>

        <form className="cv-setup-form" onSubmit={save}>
          <section className="cv-setup-card cv-logo-card">
            <div>
              <p>Business logo</p>
              <h2>Upload a small logo for invoices and quotes.</h2>
              <span>Use PNG/JPG/WebP under about 500KB. It is stored as Base64 for now so Render does not need extra file storage.</span>
            </div>
            <label className="cv-logo-upload">
              <input type="file" accept="image/*" onChange={handleLogo} />
              {settings.logo_base64 ? "Change logo" : "Upload logo"}
            </label>
          </section>

          {fieldGroups.map((group) => (
            <section className="cv-setup-card" key={group.title}>
              <header>
                <p>{group.title}</p>
                <span>{group.hint}</span>
              </header>

              <div className="cv-field-grid">
                {group.fields.map(([key, label, type]) => (
                  <label className={type === "textarea" ? "wide" : ""} key={key}>
                    <span>{label}</span>
                    {type === "textarea" ? (
                      <textarea value={settings[key] || ""} onChange={(event) => update(key, event.target.value)} rows={3} />
                    ) : type === "tags" ? (
                      <input value={(settings.default_job_types || []).join(", ")} onChange={(event) => updateJobTypes(event.target.value)} placeholder="Lawn care, cleaning, handyman" />
                    ) : (
                      <input type={type} value={settings[key] ?? ""} onChange={(event) => update(key, event.target.value)} />
                    )}
                  </label>
                ))}
              </div>
            </section>
          ))}

          <section className="cv-setup-card cv-myob-card">
            <label>
              <input type="checkbox" checked={Boolean(settings.uses_myob)} onChange={(event) => update("uses_myob", event.target.checked)} />
              <span>
                <b>This business uses MYOB</b>
                <small>Churvox will use this setup later when invoice sync is enabled for the right plan.</small>
              </span>
            </label>
          </section>

          <div className="cv-setup-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Saving setup…" : "Save business setup"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
