import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function formatCurrency(amount, currency = "NZD") {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

export function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-NZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(time) {
  if (!time) return "";
  return time;
}

export function formatDateTime(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleString("en-NZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusColor(status) {
  const colors = {
    scheduled: "status-scheduled",
    in_progress: "status-in-progress",
    completed: "status-completed",
    cancelled: "status-cancelled",
    draft: "status-draft",
    sent: "status-sent",
    paid: "status-paid",
    overdue: "status-overdue",
    accepted: "status-completed",
    declined: "status-cancelled",
  };
  return colors[status] || "status-draft";
}

// Multi-trade job types
export function getJobTypeLabel(type) {
  const labels = {
    // Lawn & Garden
    lawn_mowing: "Lawn Mowing",
    hedge_trimming: "Hedge Trimming",
    garden_maintenance: "Garden Maintenance",
    landscaping: "Landscaping",
    tree_services: "Tree Services",
    gardening: "Gardening",
    // Cleaning
    cleaning: "Cleaning",
    window_cleaning: "Window Cleaning",
    pressure_washing: "Pressure Washing",
    // Trades
    handyman: "Handyman",
    plumbing: "Plumbing",
    electrical: "Electrical",
    painting: "Painting",
    carpentry: "Carpentry",
    // Other services
    pest_control: "Pest Control",
    pool_maintenance: "Pool Maintenance",
    hvac: "HVAC",
    roofing: "Roofing",
    other: "Other",
  };
  return labels[type] || type;
}

export function getStatusLabel(status) {
  const labels = {
    scheduled: "Scheduled",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    draft: "Draft",
    sent: "Sent",
    paid: "Paid",
    overdue: "Overdue",
    accepted: "Accepted",
    declined: "Declined",
  };
  return labels[status] || status;
}

// Trade types for settings/onboarding
export const TRADE_TYPES = [
  { value: "lawn_care", label: "Lawn Care" },
  { value: "landscaping", label: "Landscaping" },
  { value: "cleaning", label: "Cleaning" },
  { value: "handyman", label: "Handyman" },
  { value: "painting", label: "Painting" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "pest_control", label: "Pest Control" },
  { value: "gardening", label: "Gardening" },
  { value: "other", label: "Other" },
];

// Job types grouped by trade category
export const JOB_TYPES_BY_CATEGORY = {
  "Lawn & Garden": [
    { value: "lawn_mowing", label: "Lawn Mowing" },
    { value: "hedge_trimming", label: "Hedge Trimming" },
    { value: "garden_maintenance", label: "Garden Maintenance" },
    { value: "landscaping", label: "Landscaping" },
    { value: "tree_services", label: "Tree Services" },
    { value: "gardening", label: "Gardening" },
  ],
  "Cleaning": [
    { value: "cleaning", label: "General Cleaning" },
    { value: "window_cleaning", label: "Window Cleaning" },
    { value: "pressure_washing", label: "Pressure Washing" },
  ],
  "Trades": [
    { value: "handyman", label: "Handyman" },
    { value: "plumbing", label: "Plumbing" },
    { value: "electrical", label: "Electrical" },
    { value: "painting", label: "Painting" },
    { value: "carpentry", label: "Carpentry" },
  ],
  "Other Services": [
    { value: "pest_control", label: "Pest Control" },
    { value: "pool_maintenance", label: "Pool Maintenance" },
    { value: "hvac", label: "HVAC" },
    { value: "roofing", label: "Roofing" },
    { value: "other", label: "Other" },
  ],
};
