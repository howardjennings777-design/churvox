// CHURVOX_BUSINESS_SETTINGS_STABLE_HELPER_20260601
// Safe local business setup used until the backend settings endpoint is proven live.
// Prevents the settings page and document forms from calling missing routes.

export const BUSINESS_SETTINGS_KEY = "churvox_business_settings_v1";

export const defaultBusinessSettings = {
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

export function normaliseBusinessSettings(settings = {}) {
  const next = { ...defaultBusinessSettings, ...(settings || {}) };
  next.default_gst_rate = Number(next.default_gst_rate || 15);
  next.default_invoice_due_days = Number(next.default_invoice_due_days || 7);
  next.default_quote_expiry_days = Number(next.default_quote_expiry_days || 14);
  next.uses_myob = Boolean(next.uses_myob);
  next.default_job_types = Array.isArray(next.default_job_types)
    ? next.default_job_types
    : String(next.default_job_types || "").split(",").map((x) => x.trim()).filter(Boolean);
  return next;
}

export function loadBusinessSettings(user = null) {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(BUSINESS_SETTINGS_KEY) || "{}");
  } catch {
    saved = {};
  }
  return normaliseBusinessSettings({
    business_name: user?.business_name || user?.company_name || "",
    email: user?.email || "",
    trade_industry_type: user?.trade_type || "",
    default_gst_rate: user?.gst_rate || 15,
    ...saved,
  });
}

export function saveBusinessSettings(settings) {
  const next = normaliseBusinessSettings(settings);
  try {
    localStorage.setItem(BUSINESS_SETTINGS_KEY, JSON.stringify(next));
  } catch {}
  window.dispatchEvent(new CustomEvent("churvox-business-settings-updated", { detail: next }));
  return next;
}

export function businessSettingsCompletion(settings = {}) {
  const labels = {
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
  const missing = Object.keys(labels).filter((key) => {
    const value = settings[key];
    return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
  });
  const total = Object.keys(labels).length;
  return {
    labels,
    percent: total ? Math.round(((total - missing.length) / total) * 100) : 100,
    missing_fields: missing,
    missing_count: missing.length,
    is_complete: missing.length === 0,
  };
}

export function addDaysIso(days = 7) {
  const d = new Date();
  d.setDate(d.getDate() + Number(days || 7));
  return d.toISOString().slice(0, 10);
}
