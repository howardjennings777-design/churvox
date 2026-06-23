const DEMO_RECORD_RE = /\b(final smoke|playwright|full audit|qa client|qa flow|timer proof|worker timer proof|worker app test|live worker view proof|do not bill|test street|test customer|test worker|boss to worker test|worker to boss test|worker message job|worker finished full audit)\b/i;
const PLACEHOLDER_RECORD_RE = /\b(ai prepared job|address needed|customer name came from the instruction)\b/i;
const GENERIC_NAMES = new Set(["customer", "client", "unnamed client", "for", "unknown", "n/a", "na"]);

function textOf(record) {
  try {
    return JSON.stringify(record || {}).toLowerCase();
  } catch {
    return "";
  }
}

function pick(record, ...keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

function isPlaceholderClientRecord(record) {
  const name = pick(record, "name", "client_name", "customer_name", "contact_name", "business_name").toLowerCase();
  if (!GENERIC_NAMES.has(name)) return false;

  const email = pick(record, "email", "client_email", "customer_email", "billing_email");
  const phone = pick(record, "phone", "mobile", "client_phone", "customer_phone");
  const address = pick(record, "address", "site_address", "service_address", "customer_address");
  const notes = pick(record, "notes", "internal_notes", "client_notes");
  const status = pick(record, "status", "client_status", "customer_status").toLowerCase();

  return !email && !phone && !address && !notes && (!status || /setup|missing|draft|incomplete/.test(status));
}

function isPlaceholderPreparedRecord(record, text) {
  const title = pick(record, "title", "job_name", "job_title", "name", "summary").toLowerCase();
  const client = pick(record, "client_name", "customer_name", "client", "customer").toLowerCase();
  const address = pick(record, "address", "site_address", "service_address", "job_address").toLowerCase();

  if (title === "ai prepared job" && (!client || GENERIC_NAMES.has(client))) return true;
  if (title === "ai prepared job" && (!address || address === "address needed")) return true;
  return PLACEHOLDER_RECORD_RE.test(text) && /\b(customer|for|address needed|no worker|no invoice yet)\b/.test(text);
}

export function isDemoRecord(record) {
  try {
    if (typeof window !== "undefined" && window.localStorage.getItem("churvox:show-demo-records") === "1") {
      return false;
    }
  } catch {
    // Keep normal view clean if local storage is unavailable.
  }

  const text = textOf(record);
  if (!text) return false;
  return DEMO_RECORD_RE.test(text) || isPlaceholderClientRecord(record) || isPlaceholderPreparedRecord(record, text);
}

export function hideDemoRecords(list) {
  return Array.isArray(list) ? list.filter((item) => !isDemoRecord(item)) : [];
}
