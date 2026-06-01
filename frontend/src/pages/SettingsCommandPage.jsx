import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { businessSettingsCompletion, loadBusinessSettings, saveBusinessSettings } from "../lib/businessSettings";

const navGroups = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"], ["AI Operator", "/ai-operator", "AI"], ["Approvals", "/ai-operator/approvals", "OK"], ["Notifications", "/notifications", "NT"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Dispatch", "/dispatch", "DP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"], ["Money Desk", "/money-desk", "$"]] },
  { title: "Crew & Admin", items: [["Team", "/team", "TM"], ["Crew Ops", "/crew-ops", "CO"], ["Payroll", "/payroll", "PR"], ["Reports", "/reports", "RP"]] },
  { title: "System", items: [["Setup", "/onboarding", "SU"], ["Trade Presets", "/trade-presets", "TP"], ["Automation", "/automation", "AU"], ["Integrations", "/integrations", "IN"], ["Operator Tools", "/operator-tools", "OT"], ["Plans", "/plans", "PL"], ["Billing", "/billing-confidence", "BI"], ["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

const groups = [
  { title: "Business identity", tag: "Identity", hint: "Used on invoices, quotes and customer-facing documents.", fields: [["business_name", "Business name", "text"], ["trading_name", "Trading name", "text"], ["business_address", "Business address", "textarea"], ["phone", "Phone", "text"], ["email", "Email", "email"], ["website", "Website", "text"], ["gst_number", "GST number", "text"], ["nzbn", "NZBN", "text"]] },
  { title: "Money and documents", tag: "Money", hint: "Defaults for invoices, quotes, GST and payment wording.", fields: [["bank_account_name", "Bank account name", "text"], ["bank_account_number", "Bank account number", "text"], ["invoice_prefix", "Invoice prefix", "text"], ["quote_prefix", "Quote prefix", "text"], ["default_gst_rate", "Default GST rate %", "number"], ["default_invoice_due_days", "Invoice due days", "number"], ["default_quote_expiry_days", "Quote expiry days", "number"]] },
  { title: "Operations", tag: "Ops", hint: "Helps Churvox prepare better Work Slips and messages.", fields: [["trade_industry_type", "Trade / industry type", "text"], ["service_area_region", "Service area / region", "text"], ["working_hours", "Working hours", "text"], ["default_job_types", "Default job types", "tags"], ["default_customer_message_tone", "Default customer message tone", "textarea"]] },
];

const cards = [
  ["Business identity", "Name, address, GST, NZBN and customer-facing contact details.", "/settings", "Core"],
  ["Team roles", "Owner, Manager, Worker, Office Admin and Payroll permissions stay separated.", "/team", "Protected"],
  ["Billing and plans", "Plan, billing confidence and account controls stay owner-only.", "/plans", "Owner"],
  ["Integrations", "MYOB, CSV import, email and staged SMS controls.", "/integrations", "Review"],
];

function activePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/money-desk") return pathname === "/money-desk" || pathname === "/money";
  if (href === "/settings") return pathname === "/settings" || pathname.startsWith("/settings/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden w-[292px] shrink-0 overflow-y-auto border-r border-slate-800 bg-[#0f1722] p-4 text-white lg:block">
      <div className="mb-6 flex items-center gap-3 px-1">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500 text-lg font-black text-slate-950">C</div>
        <div><div className="text-sm font-black tracking-[-0.03em]">CHURVOX</div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Command Desk</div></div>
      </div>
      <div className="space-y-5">
        {navGroups.map((group) => <section key={group.title}><div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{group.title}</div><nav className="space-y-1">{group.items.map(([label, href, icon]) => {
          const active = activePath(pathname, href);
          return <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-[10px] font-black ${active ? "bg-slate-950 text-white" : "bg-white/10 text-cyan-200"}`}>{icon}</span><span className="truncate">{label}</span></Link>;
        })}</nav></section>)}
      </div>
    </aside>
  );
}

function Pill({ tone, children }) {
  const classes = tone === "green" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-blue-200 bg-blue-50 text-blue-800";
  return <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${classes}`}>{children}</span>;
}

function SettingsSlip({ item, completion, onClose }) {
  if (!item) return null;
  const missing = completion?.missing_fields || [];
  return (
    <div className="fixed inset-0 z-[2147483647] bg-slate-950/65 p-3 backdrop-blur-sm md:p-7" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full max-w-[700px] flex-col overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.40)]">
        <header className="relative overflow-hidden border-b border-slate-800 bg-slate-950 p-6 text-white md:p-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div><div className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Settings Work Slip</div><h2 className="mt-4 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-5xl">{item[0]}</h2></div>
            <button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">Close</button>
          </div>
          <p className="relative mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-300">{item[1]}</p>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f4f6f8] p-5 md:p-6">
          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Setup health</div>
            <p className="mt-3 text-lg font-black tracking-[-0.035em] text-slate-950">Business setup is {completion?.percent || 0}% complete.</p>
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-950">Settings power invoices, quotes, Work Slips, customer messages, automation and owner approvals.</div>
          </section>
          <section className="mt-4 rounded-[26px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Missing fields</div>
            <div className="mt-4 flex flex-wrap gap-2">{missing.length ? missing.map((key) => <span key={key} className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-black text-amber-900">{completion?.labels?.[key] || key.replaceAll("_", " ")}</span>) : <span className="text-sm font-bold text-amber-950">No core fields missing.</span>}</div>
          </section>
        </main>
        <footer className="flex flex-wrap gap-3 border-t border-slate-200 bg-white p-5"><button type="button" onClick={onClose} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Back to settings</button><Link to={item[2]} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">Open place</Link></footer>
      </div>
    </div>
  );
}

function SettingsCommandContent() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(() => loadBusinessSettings(user));
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeSlip, setActiveSlip] = useState(null);

  useEffect(() => setSettings((current) => ({ ...loadBusinessSettings(user), ...current })), [user]);

  const completion = useMemo(() => businessSettingsCompletion(settings), [settings]);
  const missingCount = completion?.missing_fields?.length || 0;

  const updateField = (key, value) => setSettings((current) => ({ ...current, [key]: value }));

  async function handleSave() {
    setSaving(true);
    setNotice("");
    try {
      saveBusinessSettings(settings, user);
      window.dispatchEvent(new Event("churvox-business-settings-updated"));
      setNotice("Settings saved. Churvox will use these details across documents and Work Slips.");
    } catch (err) {
      setNotice("Could not save settings. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#eef1f4] text-slate-950">
      <div className="flex min-h-screen"><Sidebar />
        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 md:pb-28 xl:p-8 xl:pb-28">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Settings Command</div><div className="text-sm font-bold text-slate-500">Business identity, money defaults, operations, roles and sync controls.</div></div>
            <div className="flex flex-wrap gap-3"><Link to="/team" className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Team roles</Link><button type="button" onClick={handleSave} disabled={saving} className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-60">{saving ? "Saving…" : "Save settings"}</button></div>
          </header>

          <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]"><div className="relative p-6 md:p-8"><div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" /><div className="relative"><span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Settings Command</span><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Set the business once. Use it everywhere.</h1><p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Churvox uses these settings to prepare better invoices, quotes, customer messages, Work Slips and owner decisions.</p></div></div></div>
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Setup health</div><h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">What needs attention</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="text-2xl font-black text-blue-800">{completion?.percent || 0}%</div><div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Setup complete</div></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="text-2xl font-black text-amber-800">{missingCount}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Missing fields</div></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="truncate text-2xl font-black text-emerald-800">{settings.trade_industry_type || "Trade"}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Industry</div></div></div></div>
          </section>

          {notice ? <div className="mt-5 rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-800">{notice}</div> : null}

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Business</div><div className="mt-3 truncate text-2xl font-black tracking-[-0.06em]">{settings.business_name || "Not set"}</div></div>
            <div className="rounded-[22px] border border-blue-200 bg-blue-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Invoice prefix</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-blue-900">{settings.invoice_prefix || "INV"}</div></div>
            <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Due days</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-amber-900">{settings.default_invoice_due_days || 7}</div></div>
            <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">GST</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-emerald-900">{settings.default_gst_rate || 15}%</div></div>
          </section>

          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Settings workspaces</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">Open controls</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-600">Owner controlled</span></div><div className="grid gap-4 xl:grid-cols-2">{cards.map((item) => <article key={item[0]} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Settings</span><h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950">{item[0]}</h3></div><Pill tone={item[3] === "Review" ? "amber" : "green"}>{item[3]}</Pill></div><p className="mt-3 text-sm font-bold leading-6 text-slate-600">{item[1]}</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => setActiveSlip(item)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Open slip</button><Link to={item[2]} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Open place</Link></div></article>)}</div></section>

          <section className="mt-5 grid gap-5 xl:grid-cols-3">
            {groups.map((group) => <div key={group.title} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">{group.tag}</div><h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">{group.title}</h2><p className="mt-2 text-sm font-bold leading-6 text-slate-500">{group.hint}</p><div className="mt-5 space-y-3">{group.fields.map(([key, label, kind]) => <label key={key} className="block"><span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>{kind === "textarea" ? <textarea rows={3} value={settings[key] || ""} onChange={(e) => updateField(key, e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-300" /> : <input type={kind === "number" ? "number" : "text"} value={kind === "tags" && Array.isArray(settings[key]) ? settings[key].join(", ") : settings[key] || ""} onChange={(e) => updateField(key, kind === "tags" ? e.target.value.split(",").map((x) => x.trim()).filter(Boolean) : e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-300" />}</label>)}</div></div>)}
          </section>
        </section>
      </div>
      <SettingsSlip item={activeSlip} onClose={() => setActiveSlip(null)} completion={completion} />
    </main>
  );
}

export default function SettingsCommandPage() {
  if (typeof document === "undefined") return <SettingsCommandContent />;
  return createPortal(<SettingsCommandContent />, document.body);
}
