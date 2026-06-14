import React from "react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";

const SETTINGS_DRAFT_KEY = "churvox:fresh-settings-draft:v1";
const GUIDE_STATUS_KEY = "churvox:ai-guide-status:v1";
const GUIDE_RETURN_KEY = "churvox:ai-guide-return:v1";
const GUIDE_STEP_KEY = "churvox:ai-guide-current-step:v1";
const GUIDE_COMPLETE_KEY = "churvox:ai-guide-complete:v1";

const countryOptions = [["NZ", "New Zealand"], ["AU", "Australia"], ["US", "United States"], ["UK", "United Kingdom"]];
const regionOptions = {
  NZ: ["Northland", "Auckland", "Waikato", "Bay of Plenty", "Gisborne", "Hawke's Bay", "Taranaki", "Manawatū-Whanganui", "Wellington", "Tasman", "Nelson", "Marlborough", "West Coast", "Canterbury", "Otago", "Southland"],
  AU: ["New South Wales", "Victoria", "Queensland", "Western Australia", "South Australia", "Tasmania", "Australian Capital Territory", "Northern Territory"],
  US: ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"],
  UK: ["England", "Scotland", "Wales", "Northern Ireland"],
};
const tradeOptions = [["lawn_mowing", "Lawn care / property services"], ["cleaning", "Cleaning"], ["handyman", "Handyman"], ["painting", "Painting"], ["plumbing", "Plumbing"], ["electrical", "Electrical"], ["landscaping", "Landscaping"], ["pest_control", "Pest control"], ["gardening", "Gardening"], ["other", "Other trade/service"]];
const defaultDraft = { businessName: "", tradingName: "", country: "NZ", region: "Wellington", invoicePrefix: "INV", supportEmail: "", replyEmail: "", phone: "", contactPreference: "Email first", commandRule: "Churvox prepares admin work. You approve before anything is sent to a customer." };

function unwrapApi(result) { return result?.data?.data || result?.data || result || {}; }
function cleanCountry(value) { const code = String(value || "NZ").trim().toUpperCase(); if (["NZL", "NEW ZEALAND"].includes(code)) return "NZ"; if (["AUS", "AUSTRALIA"].includes(code)) return "AU"; if (["USA", "UNITED STATES"].includes(code)) return "US"; if (["GB", "GBR", "UNITED KINGDOM"].includes(code)) return "UK"; return countryOptions.some(([key]) => key === code) ? code : "NZ"; }
function firstRegion(country) { return regionOptions[country]?.[0] || ""; }
function loadDraft() { try { if (typeof window === "undefined") return defaultDraft; const saved = window.localStorage.getItem(SETTINGS_DRAFT_KEY); if (!saved) return defaultDraft; const parsed = JSON.parse(saved); if (!parsed || typeof parsed !== "object") return defaultDraft; const country = cleanCountry(parsed.country || parsed.billingCountry || defaultDraft.country); const region = regionOptions[country]?.includes(parsed.region) ? parsed.region : firstRegion(country); return { ...defaultDraft, ...parsed, country, region }; } catch { return defaultDraft; } }
function tradeLabel(value) { return tradeOptions.find(([key]) => key === value)?.[1] || "Other trade/service"; }
function normalizeProfile(rawProfile, draft) { const profile = unwrapApi(rawProfile); const country = cleanCountry(profile?.billing_country || profile?.country || draft?.country || "NZ"); const ownerEmail = profile?.email || profile?.user?.email || draft?.ownerEmail || draft?.email || ""; const signupBusinessName = profile?.business_name || profile?.businessName || profile?.company_name || profile?.company || ""; const savedBusinessName = draft?.businessName || draft?.business_name || ""; const businessName = savedBusinessName || signupBusinessName || "Your business"; const savedRegion = draft?.region || profile?.service_region || profile?.region || ""; const region = regionOptions[country]?.includes(savedRegion) ? savedRegion : firstRegion(country); const next = { ...draft, id: profile?.id || profile?._id || "", email: ownerEmail, ownerEmail, ownerName: profile?.name || profile?.full_name || "", businessName, country, region, plan: profile?.plan || "solo", gstRate: String(profile?.gst_rate ?? profile?.gstRate ?? "15"), tradeType: profile?.trade_type || profile?.tradeType || "other" }; if (!draft?.supportEmail) next.supportEmail = ownerEmail; if (!draft?.replyEmail) next.replyEmail = ownerEmail; return next; }
function saveDraftLocally(draft) { try { if (typeof window !== "undefined") window.localStorage.setItem(SETTINGS_DRAFT_KEY, JSON.stringify(draft)); } catch {} }
function markAiGuideStepDone(stepId = "business") { try { const saved = JSON.parse(window.localStorage.getItem(GUIDE_STATUS_KEY) || "{}"); const next = { ...(saved || {}), [stepId]: "Done" }; window.localStorage.setItem(GUIDE_STATUS_KEY, JSON.stringify(next)); window.localStorage.removeItem(GUIDE_COMPLETE_KEY); window.localStorage.removeItem(GUIDE_RETURN_KEY); window.localStorage.removeItem(GUIDE_STEP_KEY); window.dispatchEvent(new CustomEvent("churvox:ai-guide-status", { detail: { step: stepId, status: "Done" } })); window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "ai-guide-return" } })); } catch {} }
function shouldReturnToGuide() { try { return window.localStorage.getItem(GUIDE_RETURN_KEY) === "true"; } catch { return false; } }
function currentGuideStep() { try { return window.localStorage.getItem(GUIDE_STEP_KEY) || "business"; } catch { return "business"; } }

export default function FreshSettings({ onNavigate }) {
  const { get, patch } = useApi();
  const { user } = useAuth();
  const [draft, setDraft] = React.useState(loadDraft);
  const [settings, setSettings] = React.useState(() => normalizeProfile(user || {}, loadDraft()));
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [savedAt, setSavedAt] = React.useState("Loading business setup");

  const loadSettings = React.useCallback(async () => {
    setLoading(true); setError("");
    try { const profileResult = await get("/auth/me"); const profile = profileResult?.success ? unwrapApi(profileResult) : (user || {}); const currentDraft = loadDraft(); const nextSettings = normalizeProfile({ ...(user || {}), ...(profile || {}) }, currentDraft); setDraft(currentDraft); setSettings(nextSettings); setSavedAt(nextSettings.email ? "Loaded from business account" : "Owner email needs attention"); }
    catch (err) { const currentDraft = loadDraft(); const nextSettings = normalizeProfile(user || {}, currentDraft); setDraft(currentDraft); setSettings(nextSettings); setError(err?.message || "Settings could not load."); setSavedAt(nextSettings.email ? "Loaded from logged-in owner" : "Settings need attention"); }
    finally { setLoading(false); }
  }, [get, user]);

  React.useEffect(() => { loadSettings(); }, [loadSettings]);
  React.useEffect(() => { const draftToSave = { ...draft }; delete draftToSave.email; delete draftToSave.ownerEmail; saveDraftLocally(draftToSave); }, [draft]);

  function update(field, value) {
    if (field === "country") { const country = cleanCountry(value); const region = firstRegion(country); const patchDraft = { country, region }; setDraft((current) => ({ ...current, ...patchDraft })); setSettings((current) => ({ ...current, ...patchDraft })); setSavedAt("Country changed — choose region and save"); return; }
    if (["businessName", "region", "tradingName", "invoicePrefix", "supportEmail", "replyEmail", "phone", "contactPreference", "commandRule"].includes(field)) { setDraft((current) => ({ ...current, [field]: value })); setSettings((current) => ({ ...current, [field]: value })); setSavedAt(`Draft saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`); return; }
    setSettings((current) => ({ ...current, [field]: value })); setSavedAt("Unsaved change");
  }

  async function saveSettings() {
    setSaving(true); setError("");
    try {
      const gst = Number(settings.gstRate); if (!Number.isFinite(gst) || gst < 0 || gst > 100) throw new Error("GST rate must be a number between 0 and 100.");
      const draftToSave = { ...draft, businessName: settings.businessName, country: settings.country, region: settings.region, tradingName: settings.tradingName, invoicePrefix: settings.invoicePrefix, supportEmail: settings.supportEmail, replyEmail: settings.replyEmail, phone: settings.phone, contactPreference: settings.contactPreference, commandRule: settings.commandRule };
      saveDraftLocally(draftToSave); setDraft(draftToSave);
      await patch("/user/gst", { gst_rate: gst });
      await patch("/user/trade", { trade_type: settings.tradeType || "other" });
      const profileSave = await patch("/user/business-profile", { business_name: settings.businessName, trading_name: settings.tradingName, billing_country: settings.country, service_region: settings.region, phone: settings.phone, invoice_prefix: settings.invoicePrefix, support_email: settings.supportEmail, reply_email: settings.replyEmail });
      const returning = shouldReturnToGuide();
      if (returning) { markAiGuideStepDone(currentGuideStep()); setSavedAt("Saved — returning to AI Guide"); window.setTimeout(() => onNavigate?.("setupassistant"), 350); }
      else setSavedAt(profileSave?.success === false ? "Saved locally. Business profile will sync when available." : "Saved to business account");
    } catch (err) { setError(err?.message || "Settings could not save."); setSavedAt("Save failed"); }
    finally { setSaving(false); }
  }

  const checks = [["Business profile", settings.businessName && settings.email && settings.region ? "Ready" : "Needs setup"], ["GST", settings.gstRate ? `${settings.gstRate}%` : "Needs setup"], ["Trade", tradeLabel(settings.tradeType)], ["Country", countryOptions.find(([key]) => key === settings.country)?.[1] || "Needs setup"], ["Region", settings.region || "Needs setup"], ["Customer email", settings.supportEmail || "Needs setup"]];
  const availableRegions = regionOptions[settings.country] || regionOptions.NZ;

  return (
    <section>
      <header className="freshHero"><span>Business setup</span><h1>Settings</h1><p>Manage your business profile, country, region, GST, customer contact details and approval rules.</p></header>
      <section className="freshCommandPulse"><aside className="freshCard"><h2>{checks.filter(([, status]) => status !== "Needs setup").length}</h2><p>Setup checks ready</p></aside><aside className="freshCard"><h2>{settings.gstRate}%</h2><p>GST rate</p></aside><aside className="freshCard"><h2>{settings.country}</h2><p>Country</p></aside></section>
      {error && <section className="freshCard freshNotice need"><b>Settings need attention</b><span>{error}</span></section>}
      <section className="freshGrid">
        <aside className="freshCard"><h2>Setup checks</h2><div className="freshSettingsChecks">{checks.map(([label, status]) => <div className={status === "Needs setup" ? "freshCheck need" : "freshCheck"} key={label}><b>{label}</b><span>{status}</span></div>)}</div><div className="freshItem"><b>Save status</b><span>{loading ? "Loading business setup" : savedAt}</span></div></aside>
        <section className="freshCard"><h2>Business setup</h2><label className="freshField"><span>Business name</span><input value={settings.businessName} onChange={(event) => update("businessName", event.target.value)} placeholder="Business name" /></label><label className="freshField"><span>Owner email</span><input value={settings.email || user?.email || ""} readOnly /></label><label className="freshField"><span>Trading name</span><input value={settings.tradingName} onChange={(event) => update("tradingName", event.target.value)} placeholder="Optional trading name" /></label><label className="freshField"><span>Country</span><select value={settings.country} onChange={(event) => update("country", event.target.value)}>{countryOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="freshField"><span>Region</span><select value={settings.region} onChange={(event) => update("region", event.target.value)}>{availableRegions.map((region) => <option value={region} key={region}>{region}</option>)}</select></label><label className="freshField"><span>Industry</span><select value={settings.tradeType} onChange={(event) => update("tradeType", event.target.value)}>{tradeOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="freshField"><span>Phone</span><input value={settings.phone} onChange={(event) => update("phone", event.target.value)} placeholder="Business phone" /></label><label className="freshField"><span>GST / tax rate</span><input value={settings.gstRate} onChange={(event) => update("gstRate", event.target.value)} /></label><label className="freshField"><span>Invoice prefix</span><input value={settings.invoicePrefix} onChange={(event) => update("invoicePrefix", event.target.value)} /></label></section>
        <aside className="freshCard"><h2>Owner controls</h2><div className="freshActions"><button className="freshPrimary" onClick={saveSettings} disabled={saving}>{saving ? "Saving..." : shouldReturnToGuide() ? "Save and return to AI Guide" : "Save settings"}</button><button className="freshGhost" onClick={loadSettings}>Reload saved details</button><button className="freshGhost" onClick={() => onNavigate?.("plans")}>Open plans</button><button className="freshGhost" onClick={() => onNavigate?.("support")}>Open support</button></div></aside>
      </section>
      <section className="freshGrid two" style={{ marginTop: 14 }}><section className="freshCard"><h2>Customer contact</h2><label className="freshField"><span>Support email</span><input value={settings.supportEmail} onChange={(event) => update("supportEmail", event.target.value)} /></label><label className="freshField"><span>Reply email</span><input value={settings.replyEmail} onChange={(event) => update("replyEmail", event.target.value)} /></label><label className="freshField"><span>Preferred customer contact</span><select value={settings.contactPreference} onChange={(event) => update("contactPreference", event.target.value)}><option>Email first</option><option>Phone first</option><option>Email and phone</option></select></label><label className="freshField"><span>Approval rule</span><textarea value={settings.commandRule} onChange={(event) => update("commandRule", event.target.value)} /></label></section><aside className="freshCard"><h2>Account protection</h2><div className="freshSettingsSecurity"><div><span>Security</span><b>Your account uses secure login and business data separation.</b></div><div><span>Data hosting</span><b>Churvox data is hosted securely for your account.</b></div><div><span>Owner approval</span><b>Churvox prepares admin work. You approve before customer action.</b></div></div></aside></section>
    </section>
  );
}
