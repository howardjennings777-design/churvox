import React from "react";
import FreshDataControls from "./FreshDataControls";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";

const SETTINGS_DRAFT_KEY = "churvox:fresh-settings-draft:v1";

const countryOptions = [
  ["NZ", "New Zealand"],
  ["AU", "Australia"],
  ["US", "United States"],
  ["UK", "United Kingdom"],
];

const regionOptions = {
  NZ: ["Northland", "Auckland", "Waikato", "Bay of Plenty", "Gisborne", "Hawke's Bay", "Taranaki", "Manawatū-Whanganui", "Wellington", "Tasman", "Nelson", "Marlborough", "West Coast", "Canterbury", "Otago", "Southland"],
  AU: ["New South Wales", "Victoria", "Queensland", "Western Australia", "South Australia", "Tasmania", "Australian Capital Territory", "Northern Territory"],
  US: ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"],
  UK: ["England", "Scotland", "Wales", "Northern Ireland"],
};

const tradeOptions = [
  ["lawn_mowing", "Lawn care / property services"],
  ["cleaning", "Cleaning"],
  ["handyman", "Handyman"],
  ["painting", "Painting"],
  ["plumbing", "Plumbing"],
  ["electrical", "Electrical"],
  ["landscaping", "Landscaping"],
  ["pest_control", "Pest control"],
  ["gardening", "Gardening"],
  ["other", "Other trade/service"],
];

const defaultDraft = {
  tradingName: "",
  country: "NZ",
  region: "Wellington",
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

function unwrapApi(result) {
  return result?.data?.data || result?.data || result || {};
}

function cleanCountry(value) {
  const code = String(value || "NZ").trim().toUpperCase();
  if (["NZL", "NEW ZEALAND"].includes(code)) return "NZ";
  if (["AUS", "AUSTRALIA"].includes(code)) return "AU";
  if (["USA", "UNITED STATES"].includes(code)) return "US";
  if (["GB", "GBR", "UNITED KINGDOM"].includes(code)) return "UK";
  return countryOptions.some(([key]) => key === code) ? code : "NZ";
}

function firstRegion(country) {
  return regionOptions[country]?.[0] || "";
}

function loadDraft() {
  try {
    if (typeof window === "undefined") return defaultDraft;
    const saved = window.localStorage.getItem(SETTINGS_DRAFT_KEY);
    if (!saved) return defaultDraft;
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object") return defaultDraft;
    const country = cleanCountry(parsed.country || parsed.billingCountry || defaultDraft.country);
    const region = regionOptions[country]?.includes(parsed.region) ? parsed.region : firstRegion(country);
    return { ...defaultDraft, ...parsed, country, region };
  } catch {
    return defaultDraft;
  }
}

function tradeLabel(value) {
  const found = tradeOptions.find(([key]) => key === value);
  return found?.[1] || "Other trade/service";
}

function normalizeProfile(rawProfile, draft) {
  const profile = unwrapApi(rawProfile);
  const country = cleanCountry(profile?.billing_country || profile?.country || draft?.country || "NZ");
  const ownerEmail = profile?.email || profile?.user?.email || draft?.ownerEmail || draft?.email || "";
  const signupBusinessName = profile?.business_name || profile?.businessName || profile?.company_name || profile?.company || "";
  const savedBusinessName = draft?.businessName || draft?.business_name || "";
  const businessName = savedBusinessName || signupBusinessName || "Your business";
  const savedRegion = draft?.region || profile?.service_region || profile?.region || "";
  const region = regionOptions[country]?.includes(savedRegion) ? savedRegion : firstRegion(country);
  const next = {
    ...draft,
    id: profile?.id || profile?._id || "",
    email: ownerEmail,
    ownerEmail,
    ownerName: profile?.name || profile?.full_name || "",
    businessName,
    country,
    region,
    plan: profile?.plan || "solo",
    gstRate: String(profile?.gst_rate ?? profile?.gstRate ?? "15"),
    tradeType: profile?.trade_type || profile?.tradeType || "other",
  };

  if (!draft?.supportEmail || draft.supportEmail === defaultDraft.supportEmail) next.supportEmail = ownerEmail || defaultDraft.supportEmail;
  if (!draft?.replyEmail || draft.replyEmail === defaultDraft.replyEmail) next.replyEmail = ownerEmail || defaultDraft.replyEmail;
  return next;
}

export default function FreshSettings({ onNavigate }) {
  const { get, patch } = useApi();
  const { user } = useAuth();
  const [draft, setDraft] = React.useState(loadDraft);
  const [settings, setSettings] = React.useState(() => normalizeProfile(user || {}, loadDraft()));
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [savedAt, setSavedAt] = React.useState("Loading real settings");

  const loadSettings = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const profileResult = await get("/auth/me");
      const profile = profileResult?.success ? unwrapApi(profileResult) : (user || {});
      const currentDraft = loadDraft();
      const nextSettings = normalizeProfile({ ...(user || {}), ...(profile || {}) }, currentDraft);
      setDraft(currentDraft);
      setSettings(nextSettings);
      setSavedAt(nextSettings.email ? "Loaded from business account" : "Owner email needs attention");
    } catch (err) {
      const currentDraft = loadDraft();
      const nextSettings = normalizeProfile(user || {}, currentDraft);
      setDraft(currentDraft);
      setSettings(nextSettings);
      setError(err?.message || "Settings could not load.");
      setSavedAt(nextSettings.email ? "Loaded from logged-in owner" : "Settings need attention");
    } finally {
      setLoading(false);
    }
  }, [get, user]);

  React.useEffect(() => { loadSettings(); }, [loadSettings]);

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const draftToSave = { ...draft };
        delete draftToSave.email;
        delete draftToSave.ownerEmail;
        window.localStorage.setItem(SETTINGS_DRAFT_KEY, JSON.stringify(draftToSave));
      }
    } catch {}
  }, [draft]);

  function update(field, value) {
    if (field === "country") {
      const country = cleanCountry(value);
      const region = firstRegion(country);
      const patchDraft = { country, region };
      setDraft((current) => ({ ...current, ...patchDraft }));
      setSettings((current) => ({ ...current, ...patchDraft }));
      setSavedAt("Country changed — choose region and save");
      return;
    }
    if (["businessName", "region", "tradingName", "invoicePrefix", "supportEmail", "replyEmail", "phone", "brandTone", "accounting", "automationStatus", "emailService", "commandRule"].includes(field)) {
      setDraft((current) => ({ ...current, [field]: value }));
      setSettings((current) => ({ ...current, [field]: value }));
      setSavedAt(`Draft saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
      return;
    }
    setSettings((current) => ({ ...current, [field]: value }));
    setSavedAt("Unsaved backend change");
  }

  async function saveSettings() {
    setSaving(true);
    setError("");
    try {
      const gst = Number(settings.gstRate);
      if (!Number.isFinite(gst) || gst < 0 || gst > 100) throw new Error("GST rate must be a number between 0 and 100.");
      const draftToSave = {
        ...draft,
        businessName: settings.businessName,
        country: settings.country,
        region: settings.region,
        tradingName: settings.tradingName,
        invoicePrefix: settings.invoicePrefix,
        supportEmail: settings.supportEmail,
        replyEmail: settings.replyEmail,
        phone: settings.phone,
        brandTone: settings.brandTone,
        accounting: settings.accounting,
        automationStatus: settings.automationStatus,
        emailService: settings.emailService,
        commandRule: settings.commandRule,
      };
      try {
        window.localStorage.setItem(SETTINGS_DRAFT_KEY, JSON.stringify(draftToSave));
      } catch {}
      setDraft(draftToSave);
      await patch("/user/gst", { gst_rate: gst });
      await patch("/user/trade", { trade_type: settings.tradeType || "other" });
      const profileSave = await patch("/user/business-profile", {
        business_name: settings.businessName,
        trading_name: settings.tradingName,
        billing_country: settings.country,
        service_region: settings.region,
        phone: settings.phone,
        invoice_prefix: settings.invoicePrefix,
        support_email: settings.supportEmail,
        reply_email: settings.replyEmail,
      });
      if (profileSave?.success === false) {
        setSavedAt("Saved locally. Business profile backend will sync when available.");
      } else {
        setSavedAt("Saved to business account");
      }
    } catch (err) {
      setError(err?.message || "Settings could not save.");
      setSavedAt("Save failed");
    } finally {
      setSaving(false);
    }
  }

  function resetDraftSettings() {
    try { if (typeof window !== "undefined") window.localStorage.removeItem(SETTINGS_DRAFT_KEY); } catch {}
    const freshDraft = defaultDraft;
    const nextSettings = normalizeProfile(user || {}, freshDraft);
    setDraft(freshDraft);
    setSettings(nextSettings);
    setSavedAt("Draft settings reset");
  }

  const checks = [
    ["Business profile", settings.businessName && settings.email && settings.region ? "Ready" : "Needs setup"],
    ["GST", settings.gstRate ? `${settings.gstRate}%` : "Needs setup"],
    ["Trade", tradeLabel(settings.tradeType)],
    ["Country", countryOptions.find(([key]) => key === settings.country)?.[1] || "Needs setup"],
    ["Region", settings.region || "Needs setup"],
    ["Email", settings.emailService],
    ["Accounting", settings.accounting],
    ["Automation", settings.automationStatus],
    ["Security", "Ready"],
  ];

  const availableRegions = regionOptions[settings.country] || regionOptions.NZ;

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Settings</span>
        <h1>Settings</h1>
        <p>Real business setup, GST, trade type, branding, email, accounting, security and automation safety.</p>
      </header>

      <section className="freshCommandPulse">
        <aside className="freshCard"><h2>{checks.filter(([, status]) => status !== "Needs setup").length}</h2><p>Setup checks ready</p></aside>
        <aside className="freshCard"><h2>{settings.gstRate}%</h2><p>GST rate</p></aside>
        <aside className="freshCard"><h2>{settings.accounting === "Connected" ? "On" : "Off"}</h2><p>Accounting sync</p></aside>
      </section>

      {error && <section className="freshCard freshNotice need"><b>Settings need attention</b><span>{error}</span></section>}

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Setup checks</h2>
          <div className="freshSettingsChecks">{checks.map(([label, status]) => <div className={status === "Needs setup" ? "freshCheck need" : "freshCheck"} key={label}><b>{label}</b><span>{status}</span></div>)}</div>
          <div className="freshItem"><b>Save status</b><span>{loading ? "Loading real settings" : savedAt}</span></div>
        </aside>

        <section className="freshCard">
          <h2>Business setup</h2>
          <label className="freshField"><span>Business name</span><input value={settings.businessName} onChange={(event) => update("businessName", event.target.value)} placeholder="Business name" /></label>
          <label className="freshField"><span>Owner email</span><input value={settings.email || user?.email || ""} readOnly /></label>
          <label className="freshField"><span>Trading name</span><input value={settings.tradingName} onChange={(event) => update("tradingName", event.target.value)} placeholder="Optional trading name" /></label>
          <label className="freshField"><span>Country</span><select value={settings.country} onChange={(event) => update("country", event.target.value)}>{countryOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="freshField"><span>Region</span><select value={settings.region} onChange={(event) => update("region", event.target.value)}>{availableRegions.map((region) => <option value={region} key={region}>{region}</option>)}</select></label>
          <label className="freshField"><span>Industry</span><select value={settings.tradeType} onChange={(event) => update("tradeType", event.target.value)}>{tradeOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="freshField"><span>Phone</span><input value={settings.phone} onChange={(event) => update("phone", event.target.value)} placeholder="Business phone" /></label>
          <label className="freshField"><span>GST rate</span><input value={settings.gstRate} onChange={(event) => update("gstRate", event.target.value)} /></label>
          <label className="freshField"><span>Invoice prefix</span><input value={settings.invoicePrefix} onChange={(event) => update("invoicePrefix", event.target.value)} /></label>
        </section>

        <aside className="freshCard">
          <h2>Owner controls</h2>
          <div className="freshActions">
            <button className="freshPrimary" onClick={saveSettings} disabled={saving}>{saving ? "Saving..." : "Save settings"}</button>
            <button className="freshOrange" onClick={() => update("accounting", "Connected")}>Mark accounting connected</button>
            <button className="freshDark" onClick={() => update("automationStatus", "Ready, owner approval required")}>Enable safe automation</button>
            <button className="freshGhost" onClick={() => update("automationStatus", "Paused until owner approval")}>Pause automation</button>
            <button className="freshGhost" onClick={loadSettings}>Reload from backend</button>
            <button className="freshGhost" onClick={() => onNavigate?.("plans")}>Open plans</button>
            <button className="freshGhost" onClick={() => onNavigate?.("support")}>Open support</button>
            <button className="freshGhost" onClick={() => onNavigate?.("command")}>Send issue to Command</button>
            <button className="freshGhost" onClick={resetDraftSettings}>Reset draft fields</button>
          </div>
        </aside>
      </section>

      <section className="freshGrid two" style={{ marginTop: 14 }}>
        <section className="freshCard">
          <h2>Email and automation</h2>
          <label className="freshField"><span>Support email</span><input value={settings.supportEmail} onChange={(event) => update("supportEmail", event.target.value)} /></label>
          <label className="freshField"><span>Reply email</span><input value={settings.replyEmail} onChange={(event) => update("replyEmail", event.target.value)} /></label>
          <label className="freshField"><span>Email service</span><input value={settings.emailService} onChange={(event) => update("emailService", event.target.value)} /></label>
          <label className="freshField"><span>Command approval rule</span><textarea value={settings.commandRule} onChange={(event) => update("commandRule", event.target.value)} /></label>
        </section>

        <aside className="freshCard">
          <h2>Security and data</h2>
          <div className="freshSettingsSecurity"><div><span>Data region</span><b>{settings.dataRegion}</b></div><div><span>Security</span><b>{settings.security}</b></div><div><span>Automation</span><b>{settings.automationStatus}</b></div></div>
          <label className="freshField"><span>Brand tone</span><input value={settings.brandTone} onChange={(event) => update("brandTone", event.target.value)} /></label>
        </aside>
      </section>
      <FreshDataControls onNavigate={onNavigate} />
    </section>
  );
}
