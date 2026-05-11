function safeJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getStoredRole() {
  if (typeof window === "undefined") return "";

  const keys = [
    "role",
    "userRole",
    "churvox_role",
    "user",
    "authUser",
    "currentUser",
    "profile",
    "churvox_user",
    "churvoxUser",
  ];

  for (const key of keys) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    const lower = String(raw).toLowerCase();
    if (lower === "worker" || lower.includes('"role":"worker"') || lower.includes('"user_role":"worker"')) {
      return "worker";
    }

    const parsed = safeJson(raw);
    const role =
      parsed?.role ||
      parsed?.user_role ||
      parsed?.user?.role ||
      parsed?.user?.user_role ||
      parsed?.profile?.role ||
      "";

    if (String(role).toLowerCase() === "worker") return "worker";
  }

  return "";
}

function isWorkerPath(pathname) {
  const path = String(pathname || "").toLowerCase();

  return (
    path.includes("/worker") ||
    path.includes("/my-jobs") ||
    path.includes("/assigned-jobs") ||
    path.includes("/worker-jobs")
  );
}

function updateWorkerRouteClass() {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const path = window.location.pathname || "";
  const role = getStoredRole();

  const isWorker =
    isWorkerPath(path) ||
    (role === "worker" && (path === "/" || path === "/dashboard" || path.startsWith("/dashboard")));

  document.body.classList.toggle("chx-worker-route", isWorker);
  document.body.classList.toggle("chx-owner-route", !isWorker);
}

function patchHistoryOnce() {
  if (typeof window === "undefined") return;
  if (window.__CHURVOX_WORKER_ROUTE_CLASS_PATCHED__) return;

  window.__CHURVOX_WORKER_ROUTE_CLASS_PATCHED__ = true;

  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function patchedPushState(...args) {
    const result = originalPushState.apply(this, args);
    window.setTimeout(updateWorkerRouteClass, 0);
    return result;
  };

  window.history.replaceState = function patchedReplaceState(...args) {
    const result = originalReplaceState.apply(this, args);
    window.setTimeout(updateWorkerRouteClass, 0);
    return result;
  };

  window.addEventListener("popstate", updateWorkerRouteClass);
  window.addEventListener("storage", updateWorkerRouteClass);
  window.addEventListener("load", updateWorkerRouteClass);
}

patchHistoryOnce();
updateWorkerRouteClass();

export default updateWorkerRouteClass;
