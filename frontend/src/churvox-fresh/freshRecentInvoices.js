const RECENT_INVOICES_KEY = "churvox:recent-created-invoices";
const MAX_RECENT_INVOICES = 20;
const MAX_RECENT_AGE_MS = 1000 * 60 * 60 * 24 * 7;

function invoiceKey(invoice, index = 0) {
  const raw = invoice?.id || invoice?._id || invoice?.invoice_id || invoice?.invoice_number || invoice?.number || invoice?.linked_job_id || invoice?.job_id || index;
  if (typeof raw === "object") return String(raw.$oid || raw.id || raw._id || index);
  return String(raw || index);
}

export function readRecentInvoices() {
  try {
    if (typeof window === "undefined") return [];
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_INVOICES_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter((invoice) => invoice && typeof invoice === "object" && now - Number(invoice.__cached_at || now) <= MAX_RECENT_AGE_MS);
  } catch {
    return [];
  }
}

export function storeRecentInvoice(invoice) {
  try {
    if (typeof window === "undefined" || !invoice || typeof invoice !== "object") return;
    const next = { ...invoice, __cached_at: Date.now(), __recent_invoice: true };
    const current = readRecentInvoices();
    const nextKey = invoiceKey(next);
    const merged = [next, ...current.filter((item, index) => invoiceKey(item, index) !== nextKey)].slice(0, MAX_RECENT_INVOICES);
    window.localStorage.setItem(RECENT_INVOICES_KEY, JSON.stringify(merged));
  } catch {}
}

export function mergeRecentInvoices(invoices) {
  const rows = Array.isArray(invoices) ? invoices : [];
  const recent = readRecentInvoices();
  const seen = new Set(rows.map((item, index) => invoiceKey(item, index)));
  const missing = recent.filter((item, index) => {
    const key = invoiceKey(item, index);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...missing, ...rows];
}
