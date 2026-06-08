import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const CONFIG = {
  clients: {
    title: "Clients",
    singular: "client",
    endpoint: "/clients",
    safe: "/logic/business-records/clients",
    fields: [["name", "Client name"], ["phone", "Phone"], ["email", "Email"], ["service_address", "Service address"], ["billing_email", "Billing email"], ["notes", "Client notes", "textarea"]],
  },
  quotes: {
    title: "Quotes",
    singular: "quote",
    endpoint: "/quotes",
    safe: "/logic/business-records/quotes",
    fields: [["customer_name", "Client"], ["title", "Quote title"], ["total", "Quote value"], ["valid_until", "Valid until"], ["status", "Status"], ["scope", "Scope of work", "textarea"], ["message", "Customer message", "textarea"]],
  },
};

function blank(page) { return Object.fromEntries(page.fields.map(([key]) => [key, ""])); }
function idOf(item) { return String(item?.id || item?._id || item?.client_id || item?.quote_id || ""); }
function first(...x) { return x.find((v) => v !== undefined && v !== null && String(v).trim() !== "") || ""; }
function listFrom(res, key) { const d = res?.data ?? res; if (Array.isArray(d)) return d; if (Array.isArray(d?.items)) return d.items; if (Array.isArray(d?.[key])) return d[key]; if (Array.isArray(d?.data)) return d.data; return []; }

function titleOf(type, item) { return type === "quotes" ? first(item.title, item.customer_name, "Untitled quote") : first(item.name, item.customer_name, "Unnamed client"); }
function subOf(type, item) { return type === "quotes" ? first(item.customer_name, item.status, item.total, idOf(item)) : first(item.email, item.phone, item.service_address, idOf(item)); }

function formFrom(type, page, item) {
  const out = blank(page);
  page.fields.forEach(([key]) => { out[key] = first(item?.[key], key === "name" ? item?.customer_name : ""); });
  return out;
}

function Field({ field, form, setForm }) {
  const [key, label, type] = field;
  const value = form[key] || "";
  const update = (v) => setForm((old) => ({ ...old, [key]: v }));
  return <label className={type === "textarea" ? "srField wide" : "srField"}><span>{label}</span>{type === "textarea" ? <textarea value={value} onChange={(e) => update(e.target.value)} /> : <input value={value} onChange={(e) => update(e.target.value)} />}</label>;
}

function Style() { return <style>{`
  .srRoot,.srRoot *{box-sizing:border-box;color-scheme:light}.srRoot{min-height:100vh;background:#f6f1e7;color:#111827;font-family:Inter,system-ui}.srWrap{max-width:1440px;margin:0 auto;padding:24px 28px 120px}.srHero{background:#0b1018;color:#fff;border-left:8px solid #f97316;border-radius:34px;padding:30px;box-shadow:0 24px 70px rgba(2,6,23,.22)}.srHero small,.srPanel small{display:inline-flex;border-radius:999px;background:#fff7ed;color:#7c2d12;padding:8px 12px;font-size:10px;font-weight:1000;letter-spacing:.14em;text-transform:uppercase}.srHero h1{margin:16px 0 8px;font-size:clamp(42px,5.5vw,76px);line-height:.9;letter-spacing:-.07em;color:#fff}.srHero p{max-width:920px;color:#f8fafc;font-weight:900;line-height:1.5}.srGrid{display:grid;grid-template-columns:330px minmax(0,1fr)320px;gap:18px;margin-top:18px}.srPanel{background:#fffaf0;border:1px solid rgba(15,23,42,.18);border-radius:30px;padding:18px;box-shadow:0 18px 46px rgba(2,6,23,.12)}.srRows{display:grid;gap:10px;margin-top:16px;max-height:560px;overflow:auto}.srRows button{text-align:left;border:2px solid rgba(15,23,42,.14);border-radius:18px;background:#fff;color:#111827;padding:13px;cursor:pointer}.srRows button.active{border-color:#f97316;background:#fff7ed}.srRows b{display:block;color:#111827}.srRows span{display:block;margin-top:5px;color:#475569;font-size:12px;font-weight:900}.srFields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.srField.wide{grid-column:1/-1}.srField span{display:block;color:#431407;text-transform:uppercase;letter-spacing:.11em;font-size:12px;font-weight:1000;margin-bottom:7px}.srField input,.srField textarea{width:100%;border:2px solid #c9a46d!important;border-radius:16px;padding:13px 15px;font-size:16px;font-weight:900;background:#fffdf7!important;color:#020617!important;-webkit-text-fill-color:#020617!important;outline:none!important;box-shadow:inset 0 0 0 9999px #fffdf7!important}.srField textarea{min-height:120px;resize:vertical}.srControls{display:grid;gap:10px;align-self:start;position:sticky;top:18px}.srControls p{background:#14532d;color:#fff;border-radius:16px;padding:12px 14px;font-weight:1000;line-height:1.45}.srControls button{border:0;border-radius:16px;padding:14px;font-size:16px;font-weight:1000;cursor:pointer}.srSave{background:#16a34a;color:#052e16}.srClear{background:#111827;color:#fff}.srRepair{background:#ffedd5;color:#7c2d12;border:2px solid #fed7aa!important}@media(max-width:1100px){.srGrid,.srFields{grid-template-columns:1fr}.srWrap{padding:16px 16px 110px}.srControls{position:static}.srRows{max-height:none}}
`}</style>; }

export default function SafeRecordsWorkbenchPage({ type }) {
  const api = useApi();
  const page = CONFIG[type] || CONFIG.clients;
  const [records, setRecords] = React.useState([]);
  const [form, setForm] = React.useState(() => blank(page));
  const [selectedId, setSelectedId] = React.useState("");
  const [message, setMessage] = React.useState(`Loading ${page.title.toLowerCase()} through safe business route...`);
  const [busy, setBusy] = React.useState(false);

  async function load() {
    setBusy(true);
    try {
      const safe = await api.get(page.safe, { timeout: 15000 });
      if (safe?.success === false || safe?.data?.success === false) throw new Error("Safe route failed");
      setRecords(listFrom(safe, type));
      setMessage(`${page.title} loaded through safe business-record route.`);
    } catch {
      try {
        const old = await api.get(page.endpoint);
        setRecords(listFrom(old, type));
        setMessage(`${page.title} loaded through fallback route. Use Repair business records if anything is missing.`);
      } catch { setRecords([]); setMessage(`Could not load ${page.title.toLowerCase()}.`); }
    } finally { setBusy(false); }
  }

  React.useEffect(() => { setForm(blank(page)); setSelectedId(""); load(); }, [type]);

  function pick(item) { setSelectedId(idOf(item)); setForm(formFrom(type, page, item)); setMessage(`${titleOf(type, item)} loaded.`); }

  async function save() {
    setBusy(true);
    try {
      const res = selectedId ? await api.patch(`${page.endpoint}/${encodeURIComponent(selectedId)}`, form) : await api.post(page.endpoint, form);
      if (res?.success === false || res?.data?.success === false) throw new Error(res?.error || res?.data?.error || "Save failed");
      setMessage(`${page.singular} saved. Run repair if it does not appear in lists.`);
      toast.success(`${page.singular} saved`);
      load();
    } catch (error) { setMessage(error?.message || `Could not save ${page.singular}.`); toast.error(error?.message || "Save failed"); }
    finally { setBusy(false); }
  }

  async function repair() {
    setBusy(true);
    try {
      const res = await api.post("/logic/business-isolation/repair", {}, { timeout: 25000 });
      if (res?.success === false || res?.data?.success === false) throw new Error(res?.error || res?.data?.error || "Repair failed");
      setMessage("Business records repaired. Reloading safe list...");
      toast.success("Business records repaired");
      load();
    } catch (error) { setMessage(error?.message || "Repair failed."); toast.error(error?.message || "Repair failed"); }
    finally { setBusy(false); }
  }

  return <main className="srRoot"><Style /><section className="srWrap"><article className="srHero"><small>{page.title}</small><h1>{page.title} that stay tied to the right business.</h1><p>This page reads through the safe business-record route first, then falls back only if needed.</p></article><section className="srGrid"><aside className="srPanel"><small>Safe list</small><div className="srRows">{records.length ? records.slice(0, 14).map((item) => <button key={idOf(item)} className={selectedId === idOf(item) ? "active" : ""} onClick={() => pick(item)}><b>{titleOf(type, item)}</b><span>{subOf(type, item)}</span></button>) : <p>No records loaded yet.</p>}</div></aside><section className="srPanel"><small>Working form</small><h2>{selectedId ? `Edit ${page.singular}` : `New ${page.singular}`}</h2><div className="srFields">{page.fields.map((field) => <Field key={field[0]} field={field} form={form} setForm={setForm} />)}</div></section><aside className="srPanel srControls"><h2>Owner controls</h2><p>{message}</p><button className="srSave" disabled={busy} onClick={save}>{busy ? "Working..." : `Save ${page.singular}`}</button><button className="srRepair" disabled={busy} onClick={repair}>Repair business records</button><button className="srClear" disabled={busy} onClick={() => { setSelectedId(""); setForm(blank(page)); setMessage(`Ready for a new ${page.singular}.`); }}>Clear / new</button></aside></section></section></main>;
}
