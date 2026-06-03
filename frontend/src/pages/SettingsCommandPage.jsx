import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { businessSettingsCompletion, loadBusinessSettings, saveBusinessSettings } from "../lib/businessSettings";
import API_BASE from "../lib/apiBase";
import CommandSlipEverything from "../components/CommandSlipEverything";

const navGroups = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Assign Jobs", "/dispatch", "DP"], ["Crew Map", "/crew-map", "MP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"], ["Team", "/team", "TM"]] },
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
    title: "Invoice & quote identity",
    tag: "Brand",
    hint: "This appears on invoice and quote PDFs.",
    fields: [
      ["business_name", "Business name", "text"],
      ["trading_name", "Trading name", "text"],
      ["logo_base64", "Upload logo", "file"],
      ["logo_url", "Logo URL optional", "text"],
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
      ["payment_url", "Payment link", "text"],
      ["bank_account_name", "Bank account name", "text"],
      ["bank_account_number", "Bank account number", "text"],
      ["payment_instructions", "Payment instructions", "textarea"],
      ["invoice_footer", "Invoice footer note", "textarea"],
      ["invoice_prefix", "Invoice prefix", "text"],
      ["quote_prefix", "Quote prefix", "text"],
      ["default_gst_rate", "GST rate", "number"],
      ["default_invoice_due_days", "Invoice due days", "number"],
      ["default_quote_expiry_days", "Quote expiry days", "number"],
    ],
  },
  {
    title: "Business details for AI and documents",
    tag: "AI",
    hint: "This helps Churvox prepare better approval slips, invoice wording and customer messages.",
    fields: [
      ["trade_industry_type", "Trade / industry type", "text"],
      ["service_area_region", "Service area / region", "text"],
      ["working_hours", "Working hours", "text"],
      ["default_job_types", "Default job types", "tags"],
      ["default_customer_message_tone", "Customer message tone", "textarea"],
    ],
  },
];

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
}

function cleanText(value) {
  return String(value || "").trim();
}

function isFakePaymentUrl(value) {
  const raw = cleanText(value).toLowerCase();
  return !raw || raw.includes("your-payment-link.com") || raw.includes("example.com/pay") || raw.includes("dummy") || raw.includes("test-payment");
}

function isFakeBankNumber(value) {
  const raw = cleanText(value).toLowerCase();
  const digits = raw.replace(/\D/g, "");
  return !raw || raw.includes("igyg") || raw.includes("iygg") || raw.includes("test") || raw.includes("dummy") || digits.length < 6;
}

function sanitizeSettings(input = {}) {
  const next = { ...input };

  if (isFakePaymentUrl(next.payment_url)) next.payment_url = "";
  if (isFakeBankNumber(next.bank_account_number)) next.bank_account_number = "";
  if (cleanText(next.bank_account_name).toLowerCase().includes("test")) next.bank_account_name = "";

  if (Array.isArray(next.default_job_types)) {
    next.default_job_types = next.default_job_types.filter(Boolean);
  }

  return next;
}

function mergeSettings(user, backendSettings = {}) {
  const local = loadBusinessSettings(user) || {};
  return sanitizeSettings({
    ...defaults,
    ...local,
    ...(backendSettings || {}),
    business_name: backendSettings.business_name || local.business_name || user?.business_name || user?.company_name || "",
    email: backendSettings.email || local.email || user?.email || "",
  });
}

async function uploadLogoFile(file) {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE || ""}/api/business/logo-upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) throw new Error(data?.detail || data?.error || "Logo upload failed");
  return data;
}

async function removeUploadedLogo() {
  const token = getToken();
  const res = await fetch(`${API_BASE || ""}/api/business/logo-upload`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) throw new Error(data?.detail || data?.error || "Logo remove failed");
  return data;
}

function activePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/settings") return pathname === "/settings" || pathname.startsWith("/settings/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="hidden w-[292px] shrink-0 overflow-y-auto border-r border-slate-800 bg-[#0f1722] p-4 text-white lg:block">
      <div className="mb-6 flex items-center gap-3 px-1">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500 text-lg font-black text-slate-950">C</div>
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
                  <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-300/20" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
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

function StatCard({ label, value, tone = "dark" }) {
  const styles = {
    dark: "border-slate-800 bg-[#0f1722] text-white",
    cyan: "border-cyan-400/30 bg-[#102a3a] text-cyan-100",
    amber: "border-amber-400/35 bg-[#2b2115] text-amber-100",
    green: "border-emerald-400/30 bg-[#102d27] text-emerald-100",
  };

  return (
    <div className={`rounded-[22px] border p-4 shadow-[0_14px_38px_rgba(15,23,42,0.14)] ${styles[tone] || styles.dark}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-80">{label}</div>
      <div className="mt-3 truncate text-3xl font-black tracking-[-0.06em]">{value}</div>
    </div>
  );
}

function LogoPreview({ settings }) {
  const logo = settings.logo_base64 || settings.logo_url;

  return (
    <div className="rounded-[30px] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">PDF preview</div>
      <div className="mt-4 rounded-[24px] bg-[#f5f7f1] p-4 text-slate-950">
        <div className="rounded-[22px] bg-[#0f1722] p-5 text-white">
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
          <div className="mt-2 text-sm font-bold">{settings.payment_url ? "Pay online button will show" : "Add a payment link if you take online payments"}</div>
          <div className="mt-2 text-xs font-bold text-slate-300">{settings.bank_account_number ? settings.bank_account_number : "Add real bank account details before sending invoices"}</div>
        </div>
      </div>
    </div>
  );
}

function SettingsSlip({ settings, completion, backendHealth, onClose }) {
  const missing = completion?.missing_fields || [];
  const invoiceReady = backendHealth?.pdf_ready ?? !!(settings.business_name && (settings.logo_base64 || settings.logo_url) && (settings.payment_url || settings.bank_account_number));

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
            <p className="mt-2 text-sm font-bold text-slate-700">{invoiceReady ? "Your logo and payment details are set enough for branded invoice emails and PDFs." : "Add business name, logo and either a real payment link or bank account details."}</p>
          </div>
          <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Missing setup</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {missing.length ? missing.map((key) => (
                <span key={key} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-900">{completion?.labels?.[key] || key.replaceAll("_", " ")}</span>
              )) : <span className="text-sm font-bold text-emerald-700">No core fields missing.</span>}
            </div>
          </div>
          <CommandSlipEverything record={settings} context="Settings health" />
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

    async function handleLogoChange(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type?.startsWith("image/")) return setNotice("Please choose a PNG, JPG or WebP image.");
      if (file.size > 2 * 1024 * 1024) return setNotice("Logo is too large. Use an image under 2MB.");

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
        <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100/80">{label}</span>
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
          {logo ? <img src={logo} alt="Business logo preview" className="mb-3 max-h-28 rounded-xl bg-white object-contain p-2" /> : <div className="mb-3 rounded-xl border border-dashed border-cyan-300/30 bg-white/[0.04] p-4 text-xs font-bold text-slate-300">No logo uploaded yet.</div>}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*" onChange={handleLogoChange} disabled={uploading} className="w-full rounded-xl border border-white/10 bg-slate-950 p-2 text-xs font-bold text-slate-200 disabled:opacity-60" />
          <div className="mt-2 flex flex-wrap gap-2">
            {uploading ? <span className="rounded-xl bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-100">Uploading…</span> : null}
            {logo ? <button type="button" onClick={handleRemoveLogo} disabled={uploading} className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-black text-white disabled:opacity-60">Remove logo</button> : null}
          </div>
          <p className="mt-2 text-[11px] font-bold text-slate-300">Best: PNG or JPG under 2MB. This logo is saved to Churvox and used on invoice PDFs/emails.</p>
        </div>
      </label>
    );
  }

  const placeholderMap = {
    payment_url: "Paste your real payment link, or leave blank",
    bank_account_number: "00-0000-0000000-00",
    bank_account_name: "Your business bank account name",
    logo_url: "Optional image URL, or upload a logo instead",
  };

  const className = "w-full rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-cyan-300";

  if (kind === "textarea") {
    return (
      <label className="block">
        <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100/80">{label}</span>
        <textarea rows={3} value={settings[key] || ""} onChange={(e) => updateField(key, e.target.value)} className={className} placeholder={placeholderMap[key] || ""} />
      </label>
    );
  }

  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100/80">{label}</span>
      <input
        type={kind === "number" ? "number" : kind === "email" ? "email" : "text"}
        value={kind === "tags" && Array.isArray(settings[key]) ? settings[key].join(", ") : settings[key] || ""}
        onChange={(e) => updateField(key, kind === "tags" ? e.target.value.split(",").map((x) => x.trim()).filter(Boolean) : e.target.value)}
        placeholder={placeholderMap[key] || ""}
        className={className}
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
  const [backendHealth, setBackendHealth] = useState(null);

  useEffect(() => {
    let alive = true;

    async function loadBackendSettings() {
      setLoading(true);
      setNotice("");
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE || ""}/api/business/invoice-branding`, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));
        setBackendHealth(data?.health || null);
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
  const invoiceReady = !!(settings.business_name && (settings.logo_base64 || settings.logo_url) && (settings.payment_url || settings.bank_account_number));
  const paymentReady = backendHealth?.payment_ready ?? !!(settings.payment_url || settings.bank_account_number);
  const logoReady = backendHealth?.logo_ready ?? !!(settings.logo_base64 || settings.logo_url);
  const updateField = (key, value) => setSettings((current) => sanitizeSettings({ ...current, [key]: value }));

  function clearPaymentDetails() {
    setSettings((current) => ({ ...current, payment_url: "", bank_account_name: "", bank_account_number: "", payment_instructions: defaults.payment_instructions }));
    setNotice("Payment and bank fields cleared. Add real payment details before sending invoices.");
  }

  async function handleSave() {
    setSaving(true);
    setNotice("");
    try {
      const cleanSettings = sanitizeSettings({ ...defaults, ...settings });
      const saved = saveBusinessSettings(cleanSettings, user);
      const token = getToken();
      const res = await fetch(`${API_BASE || ""}/api/business/invoice-branding`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(saved),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.detail || data?.error || "Backend save failed");

      const backendSettings = data?.settings || saved;
      setSettings(mergeSettings(user, backendSettings));
      setLastSaved(new Date().toLocaleTimeString());
      window.dispatchEvent(new Event("churvox-business-settings-updated"));
      toast.success("Settings saved for invoices, PDFs and emails");
      setNotice("Settings saved. Churvox will use these details on invoice PDFs, quote PDFs, payment links, emails and approval slips.");
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
          <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]">
              <div className="relative p-6 md:p-8">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
                <div className="relative">
                  <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Settings</span>
                  <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Set your business details once.</h1>
                  <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Churvox uses them on invoices, quotes, customer emails and approval slips.</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button type="button" onClick={() => setActiveSlip(true)} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">Check setup</button>
                    <button type="button" onClick={handleSave} disabled={saving || loading} className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200 disabled:opacity-60">{saving ? "Saving…" : "Save settings"}</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Setup health</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-white">What needs attention</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <StatCard label="Invoice PDFs ready" value={invoiceReady ? "Ready" : "Needs setup"} tone={invoiceReady ? "green" : "amber"} />
                <StatCard label="Logo added" value={logoReady ? "Yes" : "No"} tone={logoReady ? "green" : "dark"} />
                <StatCard label="Payment details ready" value={paymentReady ? "Ready" : "Add details"} tone={paymentReady ? "green" : "amber"} />
                <StatCard label="Setup progress" value={`${completion?.percent || 0}%`} tone="cyan" />
              </div>
              {lastSaved ? <div className="mt-4 text-xs font-bold text-slate-300">Last saved: {lastSaved}</div> : null}
            </div>
          </section>

          {notice ? <div className="mt-5 rounded-[22px] border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-black text-cyan-950 md:text-cyan-100">{notice}</div> : null}

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            <StatCard label="Business" value={settings.business_name || "Not set"} tone="dark" />
            <StatCard label="Invoice prefix" value={settings.invoice_prefix || "INV"} tone="cyan" />
            <StatCard label="Invoice due days" value={settings.default_invoice_due_days || 7} tone="amber" />
            <StatCard label="GST" value={`${settings.default_gst_rate || 15}%`} tone="green" />
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="grid gap-5">
              {sections.map((section) => (
                <div key={section.title} className="rounded-[28px] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">{section.tag}</div>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-white">{section.title}</h2>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-300">{section.hint}</p>
                  {section.title === "Payment setup" ? (
                    <button type="button" onClick={clearPaymentDetails} className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-100 hover:bg-amber-300/15">Clear payment/bank details</button>
                  ) : null}
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {section.fields.map((field) => <Field key={field[0]} field={field} settings={settings} updateField={updateField} setNotice={setNotice} />)}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-5">
              <LogoPreview settings={settings} />
              <div className="rounded-[30px] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">What this controls</div>
                <h3 className="mt-2 text-2xl font-black">Used across Churvox</h3>
                <div className="mt-4 space-y-3 text-sm font-bold leading-6 text-slate-300">
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

      {activeSlip ? <SettingsSlip settings={settings} backendHealth={backendHealth} onClose={() => setActiveSlip(false)} completion={completion} /> : null}
    </main>
  );
}

export default function SettingsCommandPage() {
  if (typeof document === "undefined") return <SettingsCommandContent />;
  return createPortal(<SettingsCommandContent />, document.body);
}
