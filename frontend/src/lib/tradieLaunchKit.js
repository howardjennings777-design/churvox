// CHURVOX_TRADIE_LAUNCH_KIT_20260611

export const TRADIE_ONBOARDING_STEPS = [
  { id: "business_profile", title: "Business details", why: "Quotes, invoices and public links need correct business info." },
  { id: "gst_settings", title: "GST and invoice settings", why: "Invoice totals and GST must be right before sending." },
  { id: "first_client", title: "Add first client", why: "Every job, quote and invoice needs a customer." },
  { id: "first_job", title: "Create first job", why: "This proves the real work flow." },
  { id: "invite_worker", title: "Invite worker", why: "Workers need mobile job updates, notes and photos." },
  { id: "complete_job", title: "Complete job from worker app", why: "Owner needs proof before invoicing." },
  { id: "approve_work", title: "Owner approves work slip", why: "Nothing important should auto-send without owner approval." },
  { id: "send_invoice_pdf", title: "Send invoice PDF", why: "Customers expect a proper invoice PDF attached." },
];

export const TRADIE_MESSAGE_TEMPLATES = [
  { id: "on_the_way", label: "On the way", body: "Hi {client}, we are on the way to {address}. Thanks, {business}." },
  { id: "running_late", label: "Running late", body: "Hi {client}, we are running a little late today. We will keep you updated. Thanks, {business}." },
  { id: "need_access", label: "Need access", body: "Hi {client}, we are at {address} but need access before we can start. Could you please help? Thanks, {business}." },
  { id: "job_complete", label: "Job complete", body: "Hi {client}, the job at {address} is complete. Thanks, {business}." },
  { id: "quote_follow_up", label: "Quote follow-up", body: "Hi {client}, just checking whether you had any questions about the quote we sent. Thanks, {business}." },
  { id: "invoice_reminder", label: "Invoice reminder", body: "Hi {client}, just a friendly reminder that invoice {invoice_number} is due. Thanks, {business}." },
];

export const CLIENT_MEMORY_FIELDS = [
  "gate_code",
  "dogs_or_pets",
  "parking_notes",
  "access_notes",
  "preferred_day",
  "preferred_contact",
  "billing_notes",
  "site_risks",
];

export const PRICE_MEMORY_FIELDS = [
  "last_price",
  "normal_price",
  "minimum_callout",
  "extras_rate",
  "travel_fee",
  "discount_notes",
  "billing_frequency",
];

export function applyTemplate(templateBody, values = {}) {
  return String(templateBody || "").replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => values[key] ?? "");
}

export function queueOfflineAction(action) {
  if (typeof window === "undefined") return;
  const key = "churvox:offline-action-queue:v1";
  let existing = [];
  try { existing = JSON.parse(window.localStorage.getItem(key) || "[]"); } catch {}
  existing.push({ ...action, queuedAt: new Date().toISOString() });
  window.localStorage.setItem(key, JSON.stringify(existing));
  window.dispatchEvent(new CustomEvent("churvox:offline-action-queued", { detail: action }));
}

export function readOfflineQueue() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem("churvox:offline-action-queue:v1") || "[]"); }
  catch { return []; }
}

export function clearOfflineQueue() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("churvox:offline-action-queue:v1");
}
