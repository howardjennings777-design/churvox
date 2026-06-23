const DEMO_RECORD_RE = /\b(final smoke|playwright|full audit|qa client|qa flow|timer proof|worker timer proof|worker app test|live worker view proof|do not bill|test street|test customer|test worker|boss to worker test|worker to boss test|worker message job|worker finished full audit)\b/i;
const PLACEHOLDER_RECORD_RE = /\b(ai prepared job|address needed|customer name came from the instruction)\b/i;

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

function isPlaceholderPreparedRecord(record, text) {
  const title = pick(record, "title", "job_name", "job_title", "name", "summary").toLowerCase();
  const client = pick(record, "client_name", "customer_name", "client", "customer").toLowerCase();
  const address = pick(record, "address", "site_address", "service_address", "job_address").toLowerCase();

  if (title === "ai prepared job" && (!client || ["customer", "for", "client"].includes(client))) return true;
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
  return DEMO_RECORD_RE.test(text) || isPlaceholderPreparedRecord(record, text);
}

export function hideDemoRecords(list) {
  return Array.isArray(list) ? list.filter((item) => !isDemoRecord(item)) : [];
}
