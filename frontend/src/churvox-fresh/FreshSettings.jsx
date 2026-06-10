import React from "react";
import FreshDataControls from "./FreshDataControls";

const SETTINGS_STORAGE_KEY = "churvox:fresh-settings:v1";

const seedSettings = {
  businessName: "Churvox Demo Business",
  tradingName: "Aroha Property Care",
  industry: "Lawn care / property services",
  region: "Lower Hutt / Wellington",
  gstRate: "15",
  invoicePrefix: "INV",
  supportEmail: "hello@churvox.com",
  replyEmail: "hello@churvox.com",
  phone: "027 000 0000",
  brandTone: "Premium tradie SaaS",
  accounting: "Not connected",
  emailService: "Postmark ready",
  automationStatus: "Paused until owner approval",
  dataRegion: "Render Virginia",
  security: "Secure cookies, business isolation, HTTPS",
  commandRule: "Churvox prepares admin. Owner approves before customer action.",
};

function loadSettings() {
  try {
    if (typeof window === "undefined") return seedSettings;

    const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!saved) return seedSettings;

    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === "object" ? { ...seedSettings, ...parsed } : seedSettings;
  } catch {
    return seedSettings;
  }
}

export default function FreshSettings({ onNavigate }) {
  const [settings, setSettings] = React.useState(loadSettings);
  const [savedAt, setSavedAt] = React.useState("Auto-saved locally");

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      }
    } catch {
      // Fresh preview keeps working without local storage.
    }
  }, [settings]);

  function update(field, value) {
    setSettings((current) => ({ ...current, [field]: value }));
    setSavedAt(`Saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  }

  function resetSettings() {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
      }
    } catch {
      // Ignore preview storage errors.
    }

    setSettings(seedSettings);
    setSavedAt("Reset to fresh defaults");
  }

  const checks = [
    ["Business profile", settings.businessName && settings.region ? "Ready" : "Needs setup"],
    ["GST", settings.gstRate ? `${settings.gstRate}%` : "Needs setup"],
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
        <p>Business setup, GST, branding, email, accounting, security and automation safety.</p>
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
            <span>{savedAt}</span>
          </div>
        </aside>

        <section className="freshCard">
          <h2>Business setup</h2>

          <label className="freshField">
            <span>Business name</span>
            <input value={settings.businessName} onChange={(event) => update("businessName", event.target.value)} />
          </label>

          <label className="freshField">
            <span>Trading name</span>
            <input value={settings.tradingName} onChange={(event) => update("tradingName", event.target.value)} />
          </label>

          <label className="freshField">
            <span>Industry</span>
            <select value={settings.industry} onChange={(event) => update("industry", event.target.value)}>
              <option>Lawn care / property services</option>
              <option>Cleaning</option>
              <option>Handyman</option>
              <option>Painting</option>
              <option>Plumbing</option>
              <option>Electrical</option>
              <option>Landscaping</option>
              <option>Other trade/service</option>
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
            <button className="freshPrimary" onClick={() => setSavedAt("Saved settings for fresh preview")}>
              Save settings
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
            <button className="freshGhost" onClick={() => onNavigate?.("plans")}>
              Open plans
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("support")}>
              Open support
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("command")}>
              Send issue to Command
            </button>
            <button className="freshGhost" onClick={resetSettings}>
              Reset settings
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
