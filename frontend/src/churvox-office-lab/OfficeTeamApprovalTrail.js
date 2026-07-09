const APPROVAL_TRAIL_KEY = "churvox_office_team_approval_trail_v1";
const OWNER_APPROVAL_TRAIL_KEY = "churvox_office_owner_approval_trail_v1";
const APPROVAL_TRAIL_EVENT = "churvox-office-approval-trail";

export function readOfficeTeamApprovalTrail() {
  if (typeof window === "undefined") return [];
  try {
    const raw = storage().getItem(approvalTrailKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 18) : [];
  } catch {
    return [];
  }
}

export function recordOfficeTeamApprovalTrail(decision = {}, action = "Review", status = "Recorded") {
  const entry = {
    id: `${Date.now()}-${slug(action)}-${slug(decision.title || decision.id)}`,
    status,
    action,
    title: decision.title || "Command decision",
    tray: decision.tray || "Command",
    roleName: decision.roleName || "Office Team",
    level: decision.level || "Owner review",
    need: decision.need || "Owner decision recorded.",
    safety: "Owner approval recorded. Nothing was sent, synced, charged or changed automatically.",
    preparedOnly: decision?.raw?.prepared_only !== false,
    ownerReviewOnly: decision?.raw?.owner_review_only !== false,
    localOnly: Boolean(decision?.raw?.local_only || String(decision?.id || "").startsWith("demo-") || String(decision?.id || "").startsWith("brain-")),
    at: new Date().toISOString(),
  };
  const next = [entry, ...readOfficeTeamApprovalTrail()].slice(0, 18);
  writeApprovalTrail(next, entry);
  return next;
}

export function subscribeOfficeTeamApprovalTrail(callback) {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback(readOfficeTeamApprovalTrail());
  window.addEventListener(APPROVAL_TRAIL_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(APPROVAL_TRAIL_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function writeApprovalTrail(trail, entry) {
  if (typeof window === "undefined") return;
  try {
    storage().setItem(approvalTrailKey(), JSON.stringify(trail));
    window.dispatchEvent(new CustomEvent(APPROVAL_TRAIL_EVENT, { detail: { entry, trail } }));
  } catch {
    // Approval audit should never break the owner screen.
  }
}

function approvalTrailKey() {
  return isOwnerRoute() ? OWNER_APPROVAL_TRAIL_KEY : APPROVAL_TRAIL_KEY;
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
    .slice(0, 28) || "approval";
}
