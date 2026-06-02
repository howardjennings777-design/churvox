import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { businessSettingsCompletion, loadBusinessSettings, saveBusinessSettings } from "../lib/businessSettings";
import API_BASE from "../lib/apiBase";

const navGroups = [
  { title: "Main", items: [["Command Board", "/dashboard", "CB"], ["Jobs", "/jobs", "JB"], ["Crew Map", "/crew-map", "MP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"], ["Team", "/team", "TM"]] },
  { title: "Account", items: [["Plans", "/plans", "PL"], ["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

const defaults = {
  business_name: "",
  trading_name: "",
  logo_base64: "",
  logo_url: "",
  business_address: "",
  phone: "",
  email: "",
  website: "",
  gst_number: "",
  nzbn: "",
  bank_account_name: "",
  bank_account_number: "",
  payment_url: "",
  payment_instructions: "Please use the invoice number as the payment reference.",
  invoice_footer: "Thanks for choosing us. We appreciate your business.",
  invoice_prefix: "INV",
  quote_prefix: "QT",
  default_gst_rate: 15,
  default_invoice_due_days: 7,
  default_quote_expiry_days: 14,
  trade_industry_type: "",
  service_area_region: "",
  working_hours: "",
  default_job_types: [],
  default_customer_message_tone: "Friendly, clear and professional.",
};

const sections = [
  {
    title: "Invoice identity",
    tag: "Brand",
    hint: "This appears on invoice and quote PDFs.",
    fields: [
      ["business_name", "Business name", "text"],
      ["trading_name", "Trading name", "text"],
      ["logo_base64", "Upload logo", "file"],
      ["logo_url", "Logo image URL", "text"],
      ["business_address", "Business address", "textarea"],
      ["phone", "Phone", "text"],
      ["email", "Email", "email"],
      ["website", "Website", "text"],
      ["gst_number", "GST number", "text"],
      ["nzbn", "NZBN", "text"],
    ],
  },
  {
    title: "Payment setup",
    tag: "Pay",
    hint: "This appears inside invoice PDFs and invoice emails.",
    fields: [
      ["payment_url", "Online payment link", "text"],
      ["bank_account_name", "Bank account name", "text"],
      ["bank_account_number", "Bank account number", "text"],
      ["payment_instructions", "Payment instructions", "textarea"],
      ["invoice_footer", "Invoice footer note", "textarea"],
      ["invoice_prefix", "Invoice prefix", "text"],
      ["quote_prefix", "Quote prefix", "text"],
      ["default_gst_rate", "Default GST rate %", "number"],
      ["default_invoice_due_days", "Invoice due days", "number"],
      ["default_quote_expiry_days", "Quote expiry days", "number"],
    ],
  },
  {
    title: "Business context",
    tag: "AI",
    hint: "This helps Churvox prepare better slips, invoice wording and customer messages.",
    fields: [
      ["trade_industry_type", "Trade / industry type", "text"],
      ["service_area_region", "Service area / region", "text"],
      ["working_hours", "Working hours", "text"],
      ["default_job_types", "Default job types", "tags"],
      ["default_customer_message_tone", "Default customer message tone", "textarea"],
    ],
  },
];

function activePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/settings") return pathname === "/settings" || pathname.startsWith("/settings/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden w-[292px] shrink-0 overflow-y-auto border-r border-slate-800 bg-[#0f1722] p-4 text-white lg:block">
      <div className="mb-6 flex items-center gap-3 px-1">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-400 text-lg font-black text-slate-950">C</div>
        <div>
          <div className="text-sm font-black tracking-[-0.03em]">CHURVOX</div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Command Desk</div>
        </div>
      </div>
      <div className="space-y-5">
        {navGroups.map((group) => (
          <section key={group.title}>
            <div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{group.title}</div>
            <nav className="space-y-1">
              {group.items.map(([label, href, icon]) => {
                const active = activePath(pathname, href);
                return (
                  <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-[10px] font-black ${active ? "bg-slate-950 text-white" : "bg-white/10 text-cyan-200"}`}>{icon}</span>
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}
      </div>
    </aside>
  );
}

function mergeSettings(user, backendSettings = {}) {
  const local = loadBusinessSettings(user);
  return {
    ...defaults,
    ...local,
    ...(backendSettings || {}),
    business_name: backendSettings.business_name || local.business_name || user?.business_name || user?.company_name || "",
    email: backendSettings.email || local.email || user?.email || "",
  };
}


async function uploadLogoFile(file) {
  const token = getToken();
  const base = API_BASE || "";
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${base}/api/business/logo-upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.detail || data?.error || "Logo upload failed");
  }
  return data;
}

async function removeUploadedLogo() {
  const token = getToken();
  const base = API_BASE || "";
  const res = await fetch(`${base}/api/business/logo-upload`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.detail || data?.error || "Logo remove failed");
  }
  return data;
}


function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
}

function LogoPreview({ settings }) {
  const logo = settings.logo_base64 || settings.logo_url;
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">PDF preview</div>
      <div className="mt-4 rounded-[24px] bg-[#f5f7f1] p-4">
        <div className="rounded-[22px] bg-slate-950 p-5 text-white">
          {logo ? <img src={logo} alt="Business logo" className="mb-4 max-h-16 rounded-xl bg-white object-contain p-2" /> : <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-cyan-300 font-black text-slate-950">C</div>}
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Invoice</div>
          <div className="mt-1 text-2xl font-black">{settings.invoice_prefix || "INV"}-0001</div>
          <div className="mt-2 text-sm font-bold text-slate-300">{settings.trading_name || settings.business_name || "Your business"}</div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Bill to</div>
            <div className="mt-2 text-sm font-black">Example Customer</div>
            <div className="text-xs font-bold text-slate-500">customer@email.com</div>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Total</div>
            <div className="mt-2 text-2xl font-black">$250.00</div>
            <div className="text-xs font-bold text-slate-500">GST {settings.default_gst_rate || 15}%</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-[#143658] p-4 text-white">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Payment</div>
          <div className="mt-2 text-sm font-bold">{settings.payment_url ? "Pay online button will show" : "Add payment link for Pay online button"}</div>
          <div className="mt-2 text-xs font-bold text-slate-300">{settings.bank_account_number || "Add bank account details"}</div>
        </div>
      </div>
    </div>
  );
}

function SettingsSlip({ settings, completion, onClose }) {
  const missing = completion?.missing_fields || [];
  const invoiceReady = !!(settings.business_name && (settings.logo_base64 || settings.logo_url) && (settings.payment_url || settings.bank_account_number));
  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-[34px] border border-white/40 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.40)]">
        <header className="relative bg-slate-950 p-6 text-white">
          <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-2xl border border-white/15 bg-white/10 text-lg font-black hover:bg-white/20">×</button>
          <div className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Settings health</div>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.07em]">Invoice setup check</h2>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-300">This tells you whether invoices, PDFs, emails and payment details have enough setup to look professional.</p>
        </header>
        <main className="max-h-[60vh] overflow-y-auto bg-[#f5f7f1] p-5">
          <div className={`rounded-[24px] border p-5 ${invoiceReady ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="text-2xl font-black">{invoiceReady ? "Invoice setup looks ready" : "Invoice setup needs details"}</div>
            <p className="mt-2 text-sm font-bold text-slate-700">
              {invoiceReady ? "Your logo/payment details are set enough for branded invoice emails and PDFs." : "Add business name, logo and either payment link or bank account details."}
            </p>
          </div>
          <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Missing general setup</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {missing.length ? missing.map((key) => (
                <span key={key} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-900">{completion?.labels?.[key] || key.replaceAll("_", " ")}</span>
              )) : <span className="text-sm font-bold text-emerald-700">No core fields missing.</span>}
            </div>
          </div>
        </main>
        <footer className="flex justify-end gap-3 border-t border-slate-200 bg-white p-5">
          <button type="button" onClick={onClose} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Back to settings</button>
        </footer>
      </div>
    </div>
  );
}

function Field({ field, settings, updateField, setNotice }) {
  const [key, label, kind] = field;
  const [uploading, setUploading] = useState(false);

  if (kind === "file") {
    const logo = settings[key] || settings.logo_url;

    async function handleLogoChange(e) {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type?.startsWith("image/")) {
        setNotice("Please choose a PNG, JPG or WebP image.");
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setNotice("Logo is too large. Use an image under 2MB.");
        return;
      }

      setUploading(true);
      setNotice("");

      try {
        const data = await uploadLogoFile(file);
        const uploaded = data?.logo_base64 || data?.settings?.logo_base64 || "";
        updateField("logo_base64", uploaded);
        updateField("logo_url", "");
        setNotice("Logo uploaded and saved. It will now be used on invoice PDFs and emails.");
        toast.success("Logo uploaded");
      } catch (err) {
        setNotice(`Logo upload failed: ${err?.message || "try again"}`);
        toast.error("Logo upload failed");
      } finally {
        setUploading(false);
      }
    }

    async function handleRemoveLogo() {
      setUploading(true);
      setNotice("");

      try {
        await removeUploadedLogo();
        updateField("logo_base64", "");
        updateField("logo_url", "");
        setNotice("Logo removed.");
        toast.success("Logo removed");
      } catch (err) {
        setNotice(`Could not remove logo: ${err?.message || "try again"}`);
        toast.error("Could not remove logo");
      } finally {
        setUploading(false);
      }
    }

    return (
      <label className="block">
        <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          {logo ? (
            <img src={logo} alt="Business logo preview" className="mb-3 max-h-28 rounded-xl bg-white object-contain p-2" />
          ) : (
            <div className="mb-3 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-xs font-bold text-slate-500">No logo uploaded yet.</div>
          )}

          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*"
            onChange={handleLogoChange}
            disabled={uploading}
            className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-700 disabled:opacity-60"
          />

          <div className="mt-2 flex flex-wrap gap-2">
            {uploading ? <span className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">Uploading…</span> : null}
            {logo ? <button type="button" onClick={handleRemoveLogo} disabled={uploading} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-60">Remove logo</button> : null}
          </div>

          <p className="mt-2 text-[11px] font-bold text-slate-500">Best: PNG or JPG under 2MB. This logo is saved to Churvox and used on invoice PDFs/emails.</p>
        </div>
      </label>
    );
  }

  if (kind === "textarea") {
    return (
      <label className="block">
        <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
        <textarea rows={3} value={settings[key] || ""} onChange={(e) => updateField(key, e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-300" />
      </label>
    );
  }

  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <input
        type={kind === "number" ? "number" : kind === "email" ? "email" : "text"}
        value={kind === "tags" && Array.isArray(settings[key]) ? settings[key].join(", ") : settings[key] || ""}
        onChange={(e) => updateField(key, kind === "tags" ? e.target.value.split(",").map((x) => x.trim()).filter(Boolean) : e.target.value)}
        placeholder={key === "payment_url" ? "https://your-payment-link.com/pay?ref={invoice_number}" : ""}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-300"
      />
    </label>
  );
}

function SettingsCommandContent() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(() => mergeSettings(user));
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSlip, setActiveSlip] = useState(false);
  const [lastSaved, setLastSaved] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadBackendSettings() {
      setLoading(true);
      setNotice("");
      try {
        const token = getToken();
        const base = API_BASE || "";
        const res = await fetch(`${base}/api/business/invoice-branding`, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));
        const backendSettings = data?.settings || data?.data || {};
        if (alive) setSettings(mergeSettings(user, backendSettings));
      } catch (err) {
        if (alive) {
          setSettings(mergeSettings(user));
          setNotice("Could not load backend invoice settings yet. Local settings are shown.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadBackendSettings();
    return () => { alive = false; };
  }, [user]);

  const completion = useMemo(() => businessSettingsCompletion(settings), [settings]);
  const missingCount = completion?.missing_fields?.length || 0;

  const invoiceReady = !!(settings.business_name && (settings.logo_base64 || settings.logo_url) && (settings.payment_url || settings.bank_account_number));
  const paymentReady = !!(settings.payment_url || settings.bank_account_number);
  const logoReady = !!(settings.logo_base64 || settings.logo_url);

  const updateField = (key, value) => setSettings((current) => ({ ...current, [key]: value }));

  async function handleSave() {
    setSaving(true);
    setNotice("");
    try {
      const saved = saveBusinessSettings({ ...defaults, ...settings }, user);
      const token = getToken();
      const base = API_BASE || "";

      const res = await fetch(`${base}/api/business/invoice-branding`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(saved),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.detail || data?.error || "Backend save failed");
      }

      const backendSettings = data?.settings || saved;
      setSettings(mergeSettings(user, backendSettings));
      setLastSaved(new Date().toLocaleTimeString());
      window.dispatchEvent(new Event("churvox-business-settings-updated"));
      toast.success("Settings saved for invoices, PDFs and emails");
      setNotice("Settings saved. Churvox will use these details on invoice PDFs, quote PDFs, emails and approval slips.");
    } catch (err) {
      toast.error("Settings saved locally, but backend branding save failed");
      setNotice(`Saved locally, but backend branding save failed: ${err?.message || "check API"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#f5f7f1] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 md:pb-28 xl:p-8 xl:pb-28">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Settings Command</div>
              <div className="text-sm font-bold text-slate-500">Logo, invoice PDF, payment details, business identity and AI context.</div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setActiveSlip(true)} className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Check setup</button>
              <button type="button" onClick={handleSave} disabled={saving || loading} className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-60">{saving ? "Saving…" : "Save settings"}</button>
            </div>
          </header>

          <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]">
              <div className="relative p-6 md:p-8">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
                <div className="relative">
                  <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Invoice engine</span>
                  <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Set your business once. Churvox uses it everywhere.</h1>
                  <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">These settings feed branded invoice PDFs, quote PDFs, emails, payment buttons and approval slips.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Setup health</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">What needs attention</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className={`rounded-2xl border p-4 ${invoiceReady ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><div className="text-2xl font-black">{invoiceReady ? "Ready" : "Needs setup"}</div><div className="text-xs font-black uppercase tracking-[0.14em]">Invoice PDFs</div></div>
                <div className={`rounded-2xl border p-4 ${logoReady ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}><div className="text-2xl font-black">{logoReady ? "Logo set" : "No logo"}</div><div className="text-xs font-black uppercase tracking-[0.14em]">Branding</div></div>
                <div className={`rounded-2xl border p-4 ${paymentReady ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><div className="text-2xl font-black">{paymentReady ? "Payment set" : "Missing pay"}</div><div className="text-xs font-black uppercase tracking-[0.14em]">Pay details</div></div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="text-2xl font-black text-blue-800">{completion?.percent || 0}%</div><div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">General setup</div></div>
              </div>
              {lastSaved ? <div className="mt-4 text-xs font-bold text-slate-500">Last saved: {lastSaved}</div> : null}
            </div>
          </section>

          {notice ? <div className="mt-5 rounded-[22px] border border-blue-200 bg-blue-50 p-4 text-sm font-black text-blue-900">{notice}</div> : null}

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Business</div><div className="mt-3 truncate text-2xl font-black tracking-[-0.06em]">{settings.business_name || "Not set"}</div></div>
            <div className="rounded-[22px] border border-blue-200 bg-blue-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Invoice prefix</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-blue-900">{settings.invoice_prefix || "INV"}</div></div>
            <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Due days</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-amber-900">{settings.default_invoice_due_days || 7}</div></div>
            <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">GST</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-emerald-900">{settings.default_gst_rate || 15}%</div></div>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="grid gap-5">
              {sections.map((section) => (
                <div key={section.title} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">{section.tag}</div>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">{section.title}</h2>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-500">{section.hint}</p>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {section.fields.map((field) => <Field key={field[0]} field={field} settings={settings} updateField={updateField} setNotice={setNotice} />)}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-5">
              <LogoPreview settings={settings} />
              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Logic</div>
                <h3 className="mt-2 text-2xl font-black">What this controls</h3>
                <div className="mt-4 space-y-3 text-sm font-bold leading-6 text-slate-600">
                  <p>Logo and business details go onto invoice and quote PDFs.</p>
                  <p>Payment link creates the Pay online button in invoice emails and PDFs.</p>
                  <p>Bank details and payment instructions show in the payment section.</p>
                  <p>Business context helps Churvox write better approval slips and invoice descriptions.</p>
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>

      {activeSlip ? <SettingsSlip settings={settings} onClose={() => setActiveSlip(false)} completion={completion} /> : null}
    </main>
  );
}

export default function SettingsCommandPage() {
  if (typeof document === "undefined") return <SettingsCommandContent />;
  return createPortal(<SettingsCommandContent />, document.body);
}
