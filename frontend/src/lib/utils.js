import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount || 0);
}

export function formatDate(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function formatTime(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
}

export function formatApiErrorDetail(detail) {
  if (!detail) return null;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (typeof d === "string" ? d : d?.msg || d?.message || "Validation error"))
      .join(", ");
  }
  if (typeof detail === "object") {
    return detail.message || detail.error || detail.detail || "Request failed";
  }
  return String(detail);
}

export const JOB_STATUSES = [
  { value: "assigned", label: "Assigned", color: "bg-slate-100 text-slate-700 border border-slate-200" },
  { value: "acknowledged", label: "Acknowledged", color: "bg-amber-50 text-amber-700 border border-amber-200" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-50 text-blue-700 border border-blue-200" },
  { value: "paused", label: "Paused", color: "bg-amber-50 text-amber-700 border border-amber-200" },
  { value: "completed", label: "Completed", color: "bg-green-50 text-green-700 border border-green-200" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-50 text-red-700 border border-red-200" },
];

export const JOB_STATUS_MAP = Object.fromEntries(JOB_STATUSES.map((s) => [s.value, s]));

export const QUOTE_STATUSES = [
  { value: "draft", label: "Draft", color: "bg-slate-100 text-slate-700 border border-slate-200" },
  { value: "sent", label: "Sent", color: "bg-blue-50 text-blue-700 border border-blue-200" },
  { value: "accepted", label: "Accepted", color: "bg-green-50 text-green-700 border border-green-200" },
  { value: "declined", label: "Declined", color: "bg-red-50 text-red-700 border border-red-200" },
];

export const INVOICE_STATUSES = [
  { value: "draft", label: "Draft", color: "bg-slate-100 text-slate-700 border border-slate-200" },
  { value: "sent", label: "Sent", color: "bg-blue-50 text-blue-700 border border-blue-200" },
  { value: "paid", label: "Paid", color: "bg-green-50 text-green-700 border border-green-200" },
  { value: "unpaid", label: "Unpaid", color: "bg-amber-50 text-amber-700 border border-amber-200" },
  { value: "overdue", label: "Overdue", color: "bg-red-50 text-red-700 border border-red-200" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-50 text-red-700 border border-red-200" },
];

export const MYOB_SYNC_STATUSES = {
  not_synced: { label: "Not Synced", color: "text-churvox-muted", bg: "bg-slate-500/20" },
  syncing: { label: "Syncing", color: "text-yellow-400", bg: "bg-yellow-500/20" },
  synced: { label: "Synced", color: "text-green-400", bg: "bg-green-500/20" },
  sync_failed: { label: "Sync Failed", color: "text-red-400", bg: "bg-red-500/20" },
};

export const JOB_TYPES_BY_CATEGORY = {
  "Lawn & Garden": [
    { value: "lawn_mowing", label: "Lawn Mowing" },
    { value: "hedge_trimming", label: "Hedge Trimming" },
    { value: "garden_maintenance", label: "Garden Maintenance" },
    { value: "landscaping", label: "Landscaping" },
    { value: "tree_services", label: "Tree Services" },
    { value: "gardening", label: "Gardening" },
  ],
  Cleaning: [
    { value: "cleaning", label: "General Cleaning" },
    { value: "window_cleaning", label: "Window Cleaning" },
    { value: "pressure_washing", label: "Pressure Washing" },
  ],
  Trades: [
    { value: "handyman", label: "Handyman" },
    { value: "plumbing", label: "Plumbing" },
    { value: "electrical", label: "Electrical" },
    { value: "painting", label: "Painting" },
    { value: "carpentry", label: "Carpentry" },
    { value: "hvac", label: "HVAC" },
    { value: "roofing", label: "Roofing" },
  ],
  "Other Services": [
    { value: "pest_control", label: "Pest Control" },
    { value: "pool_maintenance", label: "Pool Maintenance" },
    { value: "other", label: "Other" },
  ],
};

export const TRADE_TYPES = [
  { value: "lawn_care", label: "Lawn Care" },
  { value: "landscaping", label: "Landscaping" },
  { value: "cleaning", label: "Cleaning" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "painting", label: "Painting" },
  { value: "carpentry", label: "Carpentry" },
  { value: "handyman", label: "Handyman" },
  { value: "pest_control", label: "Pest Control" },
  { value: "gardening", label: "Gardening" },
  { value: "hvac", label: "HVAC" },
  { value: "roofing", label: "Roofing" },
  { value: "other", label: "Other" },
];
