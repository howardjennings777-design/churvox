import React from "react";
import FreshDataControls from "./FreshDataControls";
import { useApi } from "../hooks/useApi";

const SETTINGS_DRAFT_KEY = "churvox:fresh-settings-draft:v1";

const tradeOptions = [
  ["lawn_mowing", "Lawn care / property services"],
  ["cleaning", "Cleaning"],
  ["handyman", "Handyman"],
  ["painting", "Painting"],
  ["plumbing", "Plumbing"],
  ["electrical", "Electrical"],
  ["landscaping", "Landscaping"],
  ["other", "Other trade/service"],
];

const defaultDraft = {
  tradingName: "",
  region: "",
  invoicePrefix: "INV",
  supportEmail: "hello@churvox.com",
  replyEmail: "hello@churvox.com",
  phone: "",
  brandTone: "Premium tradie SaaS",
  accounting: "Not connected",
  emailService: "Postmark ready",
  automationStatus: "Paused until owner approval",
  dataRegion: "Render Virginia",
  security: "Secure cookies, business isolation, HTTPS",
  commandRule: "Churvox prepares admin. Owner approves before customer action.",
};

function loadDraft() {
  try {
    if (typeof window === "undefined") return defaultDraft;
    const saved = window.localStorage.getItem(SETTINGS_DRAFT_KEY);
    if (!saved) return defaultDraft;
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === "object" ? { ...defaultDraft, ...parsed } : defaultDraft;
  } catch {
    return defaultDraft;
  }
}

function tradeLabel(value) {
  const found = tradeOptions.find(([key]) => key === value);
  return found?.[1] || "Other trade/service";
}

function normalizeProfile(profile, draft) {
  return {
    id: profile?.id || "",
    email: profile?.email || "",
    ownerName: profile?.name || "",
    businessName: profile?.business_name || profile?.businessName || "Your business",
    plan: profile?.plan || "solo",
    gstRate: String(profile?.gst_rate ?? profile?.gstRate ?? "15"),
    tradeType: profile?.trade_type || profile?.tradeType || "other",
    ...draft,
  };
}

export default function FreshSettings({ onNavigate }) {
  const { get, patch } = useApi();
  const [draft, setDraft] = React.useState(loadDraft);
  const [settings, setSettings] = React.useState(() => normalizeProfile({}, loadDraft()));
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [savedAt, setSavedAt] = React.useState("Loading real settings");

  const loadSettings = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const profile = await get("/auth/me");
      const currentDraft = loadDraft();
      setDraft(currentDraft);
      setSettings(normalizeProfile(profile, currentDraft));
      setSavedAt("Loaded from business account");
    } catch (err) {
      setError(err?.message || "Settings could not load.");
      setSavedAt("Settings need attention");
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SETTINGS_DRAFT_KEY, JSON.stringify(draft));
      }
    } catch {
      // Draft settings keep working without local storage.
    }
  }, [draft]);

  function update(field, value) {
    if (["businessName", "gstRate", "tradeType"].includes(field)) {
      setSettings((current) => ({ ...current, [field]: value }));
      setSavedAt("Unsaved backend change");
      return;
    }

    setDraft((current) => ({ ...current, [field]: value }));
    setSettings((current) => ({ ...current, [field]: value }));
    setSavedAt(`Draft saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  }

  async function saveSettings() {
    setSaving(true);
    setError("");

    try {
      const gst = Number(settings.gstRate);
      if (!Number.isFinite(gst) || gst < 0 || gst > 100) {
        throw new Error("GST rate must be a number between 0 and 100.");
      }

      await patch("/user/gst", { gst_rate: gst });
      await patch("/user/trade", { trade_type: settings.tradeType || "other" });
      await loadSettings();
      setSavedAt("Saved to business account");
    } catch (err) {
      setError(err?.message || "Settings could not save.");
      setSavedAt("Save failed");
    } finally {
      setSaving(false);
    }
  }

  function resetDraftSettings() {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(SETTINGS_DRAFT_KEY);
      }
    } catch {
      // Ignore draft reset errors.
    }

    setDraft(defaultDraft);
    setSettings((current) => ({ ...current, ...defaultDraft }));
    setSavedAt("Draft settings reset");
  }

  const checks = [
    ["Business profile", settings.businessName && settings.email ? "Ready" : "Needs setup"],
    ["GST", settings.gstRate ? `${settings.gstRate}%` : "Needs setup"],
    ["Trade", tradeLabel(settings.tradeType)],
    ["Email", settings.emailService],
    ["Accounting", settings.accounting],
    ["Automation", settings.automationStatus],
    ["Security", "Ready"],
  ];

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Settings</span>
        <h1>Settings</h1>
        <p>Real business setup, GST, trade type, branding, email, accounting, security and automation safety.</p>
      </header>

      <section className="freshCommandPulse">
        <aside className="freshCard">
          <h2>{checks.filter(([, status]) => status !== "Needs setup").length}</h2>
          <p>Setup checks ready</p>
        </aside>
        <aside className="freshCard">
          <h2>{settings.gstRate}%</h2>
          <p>GST rate</p>
        </aside>
        <aside className="freshCard">
          <h2>{settings.accounting === "Connected" ? "On" : "Off"}</h2>
          <p>Accounting sync</p>
        </aside>
      </section>

      {error && (
        <section className="freshCard freshNotice need">
          <b>Settings need attention</b>
          <span>{error}</span>
        </section>
      )}

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Setup checks</h2>

          <div className="freshSettingsChecks">
            {checks.map(([label, status]) => (
              <div className={status === "Needs setup" ? "freshCheck need" : "freshCheck"} key={label}>
                <b>{label}</b>
                <span>{status}</span>
              </div>
            ))}
          </div>

          <div className="freshItem">
            <b>Save status</b>
            <span>{loading ? "Loading real settings" : savedAt}</span>
          </div>
        </aside>

        <section className="freshCard">
          <h2>Business setup</h2>

          <label className="freshField">
            <span>Business name</span>
            <input value={settings.businessName} readOnly />
          </label>

          <label className="freshField">
            <span>Owner email</span>
            <input value={settings.email} readOnly />
          </label>

          <label className="freshField">
            <span>Trading name</span>
            <input value={settings.tradingName} onChange={(event) => update("tradingName", event.target.value)} />
          </label>

          <label className="freshField">
            <span>Industry</span>
            <select value={settings.tradeType} onChange={(event) => update("tradeType", event.target.value)}>
              {tradeOptions.map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="freshField">
            <span>Region</span>
            <input value={settings.region} onChange={(event) => update("region", event.target.value)} />
          </label>

          <label className="freshField">
            <span>GST rate</span>
            <input value={settings.gstRate} onChange={(event) => update("gstRate", event.target.value)} />
          </label>

          <label className="freshField">
            <span>Invoice prefix</span>
            <input value={settings.invoicePrefix} onChange={(event) => update("invoicePrefix", event.target.value)} />
          </label>
        </section>

        <aside className="freshCard">
          <h2>Owner controls</h2>

          <div className="freshActions">
            <button className="freshPrimary" onClick={saveSettings} disabled={saving}>
              {saving ? "Saving..." : "Save settings"}
            </button>
            <button className="freshOrange" onClick={() => update("accounting", "Connected")}> 
              Mark accounting connected
            </button>
            <button className="freshDark" onClick={() => update("automationStatus", "Ready, owner approval required")}> 
              Enable safe automation
            </button>
            <button className="freshGhost" onClick={() => update("automationStatus", "Paused until owner approval")}> 
              Pause automation
            </button>
            <button className="freshGhost" onClick={loadSettings}>
              Reload from backend
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("plans")}> 
              Open plans
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("support")}> 
              Open support
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("command")}> 
              Send issue to Command
            </button>
            <button className="freshGhost" onClick={resetDraftSettings}>
              Reset draft fields
            </button>
          </div>
        </aside>
      </section>

      <section className="freshGrid two" style={{ marginTop: 14 }}>
        <section className="freshCard">
          <h2>Email and automation</h2>

          <label className="freshField">
            <span>Support email</span>
            <input value={settings.supportEmail} onChange={(event) => update("supportEmail", event.target.value)} />
          </label>

          <label className="freshField">
            <span>Reply email</span>
            <input value={settings.replyEmail} onChange={(event) => update("replyEmail", event.target.value)} />
          </label>

          <label className="freshField">
            <span>Email service</span>
            <input value={settings.emailService} onChange={(event) => update("emailService", event.target.value)} />
          </label>

          <label className="freshField">
            <span>Command approval rule</span>
            <textarea value={settings.commandRule} onChange={(event) => update("commandRule", event.target.value)} />
          </label>
        </section>

        <aside className="freshCard">
          <h2>Security and data</h2>

          <div className="freshSettingsSecurity">
            <div>
              <span>Data region</span>
              <b>{settings.dataRegion}</b>
            </div>
            <div>
              <span>Security</span>
              <b>{settings.security}</b>
            </div>
            <div>
              <span>Automation</span>
              <b>{settings.automationStatus}</b>
            </div>
          </div>

          <label className="freshField">
            <span>Brand tone</span>
            <input value={settings.brandTone} onChange={(event) => update("brandTone", event.target.value)} />
          </label>
        </aside>
      </section>
      <FreshDataControls onNavigate={onNavigate} />
    </section>
  );
}
