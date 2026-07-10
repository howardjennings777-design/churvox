export const OWNER_MAINTENANCE_MODE = false;
export const MAINTENANCE_STARTED_LABEL = "July 2026";

export function isMaintenanceMode() {
  return OWNER_MAINTENANCE_MODE === true;
}

export function isWorkerMaintenanceAccess() {
  if (typeof window === "undefined") return false;
  try {
    const path = window.location.pathname || "";
    const search = new URLSearchParams(window.location.search || "");
    return (
      path.startsWith("/worker") ||
      search.get("worker") === "1" ||
      search.get("staff") === "1" ||
      search.get("field") === "1"
    );
  } catch {
    return false;
  }
}
