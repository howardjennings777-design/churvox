import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import XeroConnectionPanel from "../components/XeroConnectionPanel";

const FIELDS = [
  ["businessName", "Business name"],
  ["tradingName", "Trading name"],
  ["ownerEmail", "Business email"],
  ["phone", "Business phone"],
  ["website", "Website"],
  ["businessAddress", "Business address", "textarea"],
  ["gstNumber", "GST number"],
  ["nzbn", "NZBN"],
  ["invoicePrefix", "Invoice prefix"],
  ["quotePrefix", "Quote prefix"],
  ["brandTone", "Customer tone"],
  ["workingHours", "Working hours", "textarea"],
  ["customerMessage", "Default customer message", "textarea"],
  ["documentFooter", "Invoice / quote footer", "textarea"],
];

function blank() {
  return Object.fromEntries(FIELDS.map(([key]) => [key, ""]));
}

function Field({ field, form, setForm }) {
  const [key, label, type] = field;
  return <label className={type === "textarea" ? "slField wide" : "slField"}><span>{label}</span>{type === "textarea" ? <textarea value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /> : <input value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />}</label>;
}

function Style() {
  return <style>{`
    .slRoot,.slRoot *{box-sizing:border-box;color-scheme:light}.slRoot{min-height:100vh;background:#f6f1e7;color:#111827;font-family:Inter,system-ui;padding:24px}.slWrap{max-width:1240px;margin:0 auto}.slHero{background:#0b1018;color:white;border-left:8px solid #f97316;border-radius:34px;padding:34px;box-shadow:0 24px 70px rgba(2,6,23,.24)}.slHero small{display:inline-flex;border-radius:999px;background:#fff7ed;color:#7c2d12;padding:8px 14px;font-size:11px;font-weight:1000;letter-spacing:.14em;text-transform:uppercase}.slHero h1{margin:16px 0 8px;font-size:clamp(42px,6vw,76px);line-height:.9;letter-spacing:-.07em;color:white}.slHero p{max-width:840px;color:#f8fafc;font-weight:900;line-height:1.5}.slGrid{display:grid;grid-template-columns:minmax(0,1fr)360px;gap:18px;margin-top:18px}.slPanel{background:#fffaf0;border:1px solid rgba(15,23,42,.16);border-radius:30px;padding:22px;box-shadow:0 18px 46px rgba(2,6,23,.12)}.slPanel h2{margin:0 0 16px;font-size:34px;line-height:.95;letter-spacing:-.05em}.slFields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.slField.wide{grid-column:1/-1}.slField span{display:block;color:#431407;text-transform:uppercase;letter-spacing:.11em;font-size:12px;font-weight:1000;margin-bottom:7px}.slField input,.slField textarea{width:100%;border:2px solid #c9a46d!important;border-radius:16px;padding:13px 15px;font-size:16px;font-weight:900;background:#fffdf7!important;color:#020617!important;-webkit-text-fill-color:#020617!important;outline:none!important;box-shadow:inset 0 0 0 9999px #fffdf7!important}.slField textarea{min-height:118px;resize:vertical}.slField input:focus,.slField textarea:focus{border-color:#f97316!important;background:#fff!important;box-shadow:0 0 0 4px rgba(249,115,22,.16),inset 0 0 0 9999px #fff!important}.slControls{display:grid;gap:10px;align-content:start;position:sticky;top:18px}.slControls p{background:#14532d;color:white;border-radius:16px;padding:12px 14px;font-weight:1000;line-height:1.45}.slControls button{border:0;border-radius:16px;padding:14px;font-size:16px;font-weight:1000;cursor:pointer}.slSave{background:#16a34a;color:#052e16}.slXero{background:#0b1018;color:white}@media(max-width:1000px){.slGrid,.slFields{grid-template-columns:1fr}.slControls{position:static}.slRoot{padding:16px 16px 110px}}
  `}</style>;
}

export default function SettingsCommandPageLive() {
  const api = useApi();
  const [form, setForm] = React.useState(blank);
  const [message, setMessage] = React.useState("Loading business profile...");
  const [busy, setBusy] = React.useState(false);

  async function loadProfile() {
    try {
      const res = await api.get("/logic/business-profile");
      const profile = res?.data?.profile || res?.profile || {};
      setForm({ ...blank(), ...profile });
      setMessage("Business profile loaded from backend.");
    } catch {
      const saved = localStorage.getItem("churvox_settings_business_profile_backup");
      if (saved) {
        try { setForm({ ...blank(), ...JSON.parse(saved) }); } catch {}
      }
      setMessage("Backend profile not loaded. You can still edit and save.");
    }
  }

  React.useEffect(() => { loadProfile(); }, []);

  async function saveProfile() {
    setBusy(true);
    localStorage.setItem("churvox_settings_business_profile_backup", JSON.stringify(form));
    try {
      const res = await api.post("/logic/business-profile", form, { timeout: 20000 });
      if (res?.success === false || res?.data?.success === false) throw new Error(res?.error || res?.data?.error || "Save failed");
      setMessage("Business profile saved to backend. Invoices and quotes can now use these details.");
      toast.success("Business profile saved");
    } catch (error) {
      setMessage("Backend save failed. Backup saved on this device.");
      toast.error(error?.message || "Could not save business profile");
    } finally {
      setBusy(false);
    }
  }

  return <main className="slRoot"><Style /><section className="slWrap"><article className="slHero"><small>Settings</small><h1>Set the business up once. Keep it clean.</h1><p>Business profile and branding now save to the backend so invoices, quotes and customer messages can use the same real details.</p></article><section className="slGrid"><section className="slPanel"><h2>Business profile</h2><div className="slFields">{FIELDS.map((field) => <Field key={field[0]} field={field} form={form} setForm={setForm} />)}</div></section><aside className="slPanel slControls"><h2>Owner controls</h2><p>{message}</p><button className="slSave" disabled={busy} onClick={saveProfile}>{busy ? "Saving..." : "Save business profile"}</button><button className="slXero" onClick={() => loadProfile()} disabled={busy}>Reload profile</button><section><h2>Xero setup</h2><XeroConnectionPanel /></section></aside></section></section></main>;
}
