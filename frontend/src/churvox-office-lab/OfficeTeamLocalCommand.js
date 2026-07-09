const STORAGE_KEY = "churvox_office_lab_command_queue_v1";
const EVENT_NAME = "churvox-office-local-command";

export function readOfficeTeamLocalCommandQueue() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch {
    return [];
  }
}

export function createOfficeTeamLocalCommand({ area = "office", record = [], action = "Prepare Command card" } = {}) {
  const item = localCardFromRecord(area, record, action);
  const next = [item, ...readOfficeTeamLocalCommandQueue().filter((existing) => existing.id !== item.id)].slice(0, 10);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { item, queue: next } }));
    } catch {
      // Local lab handoff should never break the hidden screen.
    }
  }
  return item;
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

function slug(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28) || "item";
}
