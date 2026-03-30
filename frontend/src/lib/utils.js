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

export function getJobTypeLabel(type) {
  const labels = {
    lawn_mowing: "Lawn Mowing",
    hedge_trimming: "Hedge Trimming",
    garden_maintenance: "Garden Maintenance",
    landscaping: "Landscaping",
    tree_services: "Tree Services",
    cleaning: "Cleaning",
    handyman: "Handyman",
    plumbing: "Plumbing",
    electrical: "Electrical",
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
