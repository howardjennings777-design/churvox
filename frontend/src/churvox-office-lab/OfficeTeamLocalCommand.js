const STORAGE_KEY = "churvox_office_lab_command_queue_v1";
const ACTIVITY_KEY = "churvox_office_lab_activity_v1";
const OWNER_STORAGE_KEY = "churvox_office_owner_command_queue_v1";
const OWNER_ACTIVITY_KEY = "churvox_office_owner_activity_v1";
const EVENT_NAME = "churvox-office-local-command";
const ACTIVITY_EVENT = "churvox-office-local-activity";

export function readOfficeTeamLocalCommandQueue() {
  if (typeof window === "undefined") return [];
  try {
    const raw = storage().getItem(commandKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch {
    return [];
  }
}

export function readOfficeTeamLocalActivityLog() {
  if (typeof window === "undefined") return [];
  try {
    const raw = storage().getItem(activityKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 14) : [];
  } catch {
    return [];
  }
}

export function createOfficeTeamLocalCommand({ area = "office", record = [], action = "Prepare Command card" } = {}) {
  const item = localCardFromRecord(area, record, action);
  const next = [item, ...readOfficeTeamLocalCommandQueue().filter((existing) => existing.id !== item.id)].slice(0, 10);
  writeQueue(next, item);
  recordOfficeTeamLocalActivity("Prepared", item, action);
  return item;
}

export function removeOfficeTeamLocalCommand(id) {
  if (!id) return readOfficeTeamLocalCommandQueue();
  const next = readOfficeTeamLocalCommandQueue().filter((item) => item.id !== id);
  writeQueue(next, null);
  return next;
}

export function recordOfficeTeamLocalActivity(status, item = {}, action = "Updated") {
  const entry = {
    id: `${Date.now()}-${slug(status)}-${slug(item.title || item.id)}`,
    status,
    action,
    title: item.title || "Local Command item",
    tray: item.tray || "Command",
    roleName: item.roleName || "Office Team",
    note: status === "Cleared"
      ? `${action} cleared locally. Nothing was sent, synced, charged or changed.`
      : `${action} prepared a local Command card. Owner approval still required.`,
    at: new Date().toISOString(),
  };
  const next = [entry, ...readOfficeTeamLocalActivityLog()].slice(0, 14);
  writeActivity(next, entry);
  return next;
}

export function subscribeOfficeTeamLocalCommand(callback) {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback(readOfficeTeamLocalCommandQueue());
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener("storage", handler);
  };
}

export function subscribeOfficeTeamLocalActivity(callback) {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback(readOfficeTeamLocalActivityLog());
  window.addEventListener(ACTIVITY_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(ACTIVITY_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function writeQueue(queue, item) {
  if (typeof window === "undefined") return;
  try {
    storage().setItem(commandKey(), JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { item, queue } }));
  } catch {
    // Local lab handoff should never break the hidden screen.
  }
}

function writeActivity(activity, item) {
  if (typeof window === "undefined") return;
  try {
    storage().setItem(activityKey(), JSON.stringify(activity));
    window.dispatchEvent(new CustomEvent(ACTIVITY_EVENT, { detail: { item, activity } }));
  } catch {
    // Local activity should never break the hidden screen.
  }
}

function localCardFromRecord(area, record, action) {
  const title = record?.[1] || record?.[0] || "Selected record";
  const status = record?.[2] || "Prepared-only";
  const detail = record?.[3] || "Prepared locally inside the hidden lab.";
  const mapped = mapArea(area);
  return {
    id: `local-command-${Date.now()}-${slug(area)}-${slug(title)}`,
    tray: mapped.tray,
    roleName: mapped.roleName,
    level: mapped.level,
    title: `${mapped.label}: ${title}`,
    happened: `${status}. ${detail}`,
    checked: ["local prepared-only handoff", "no backend write", area].filter(Boolean),
    prepared: `${action} prepared this as a local Command card. Nothing was sent, synced, charged or changed.`,
    need: mapped.need,
    actions: mapped.actions,
    raw: {
      source: "office_team_local_command",
      area,
      record,
      prepared_only: true,
      owner_review_only: true,
      local_only: true,
    },
  };
}

function mapArea(area = "office") {
  const key = String(area || "office").toLowerCase();
  if (["growth", "rebooking", "capacity", "follow-up"].includes(key)) {
    return { label: "Growth", tray: "Growth", roleName: "Growth Coordinator", level: "Top opportunity", need: "Review the evidence, edit the prepared step, approve it or park it?", actions: ["Approve prepared action", "Edit", "Park"] };
  }
  if (["money", "quotes", "invoices", "integrations"].includes(key)) {
    return { label: "Money", tray: "Money", roleName: "Bookkeeper", level: "Needs check", need: "Review, edit, park or leave this money item?", actions: ["Review", "Edit", "Park"] };
  }
  if (["work", "schedule"].includes(key)) {
    return { label: "Work", tray: "Bookings", roleName: "Receptionist", level: "Needs check", need: "Review, ask staff, park or leave this work item?", actions: ["Review", "Ask staff", "Park"] };
  }
  if (["clients", "messages"].includes(key)) {
    return { label: "Client", tray: "Clients", roleName: "Client Memory", level: "Low risk", need: "Review, edit, ignore or park this client item?", actions: ["Review", "Edit", "Park"] };
  }
  if (["staff", "worker", "payroll"].includes(key)) {
    return { label: "Staff", tray: "Staff", roleName: "Payroll Clerk", level: "Needs check", need: "Review, ask worker, park or leave this staff item?", actions: ["Review", "Ask worker", "Park"] };
  }
  if (["automation", "branding"].includes(key)) {
    return { label: "Operations", tray: "Operations", roleName: "Operations Manager", level: "Needs check", need: "Review, adjust, park or leave this office item?", actions: ["Review", "Adjust", "Park"] };
  }
  return { label: "Office", tray: "Command", roleName: "Office Manager", level: "Needs check", need: "Review, edit, park or leave this item?", actions: ["Review", "Edit", "Park"] };
}

function commandKey() {
  return isOwnerRoute() ? OWNER_STORAGE_KEY : STORAGE_KEY;
}

function activityKey() {
  return isOwnerRoute() ? OWNER_ACTIVITY_KEY : ACTIVITY_KEY;
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}

function storage() {
  try {
    return window.localStorage || window.sessionStorage;
  } catch {
    return window.sessionStorage;
  }
}

function slug(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28) || "item";
}
